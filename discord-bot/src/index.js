import "dotenv/config";
import { ActionRowBuilder, ActivityType, Client, GatewayIntentBits, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import { lookupPlayer } from "./backend-client.js";
import { formatHelpResponse, formatLimitText, formatLookupErrorResponse, formatProfileResponse, formatQuotaText, siteText } from "./format.js";
import { handleModuleButton, handleModuleMessage, postModulePanelsOnce } from "./modules.js";
import { consumeQuota, getCachedLookup, getQuota, refundQuota, setCachedLookup } from "./storage.js";

const token = requiredEnv("DISCORD_BOT_TOKEN");
const dailyLimit = numberEnv("DAILY_LOOKUP_LIMIT", 20);
const windowMs = numberEnv("LOOKUP_WINDOW_HOURS", 24) * 60 * 60 * 1000;
const cacheTtlMs = numberEnv("LOOKUP_CACHE_HOURS", 72) * 60 * 60 * 1000;
const searchStateTtlMs = numberEnv("SEARCH_STATE_MINUTES", 10) * 60 * 1000;
const searchChannelId = process.env.DISCORD_SEARCH_CHANNEL_ID?.trim() || process.env.DISCORD_COMMAND_CHANNEL_ID?.trim() || process.env.DISCORD_WELCOME_CHANNEL_ID?.trim() || "";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("clientReady", async () => {
  client.user?.setPresence({
    activities: [
      {
        name: "les profils Astral4Gamer",
        type: ActivityType.Watching
      }
    ],
    status: "online"
  });

  console.log(`Astral4Gamer Discord bot connecté: ${client.user?.tag}`);
  await postWelcomePanelOnce();
  await postModulePanelsOnce(client, {
    get: (key) => getCachedLookup(key, 365 * 24 * 60 * 60 * 1000),
    set: (key, value) => setCachedLookup(key, value)
  });
});

client.on("interactionCreate", async (interaction) => {
  if (await handleSearchGameSelect(interaction)) {
    return;
  }

  if (await handleModuleButton(interaction)) {
    return;
  }

  if (!interaction.isChatInputCommand()) {
    return;
  }

  if (interaction.commandName === "site") {
    await interaction.reply({ content: siteText(), ephemeral: true });
    return;
  }

  if (interaction.commandName === "quota") {
    await interaction.reply({
      content: formatQuotaText(getQuota(interaction.user.id, dailyLimit, windowMs)),
      ephemeral: true
    });
    return;
  }

  if (interaction.commandName === "aide") {
    await interaction.reply({ ...formatHelpResponse(), ephemeral: true });
    return;
  }

  if (interaction.commandName !== "profil") {
    return;
  }

  if (!isAllowedSearchChannel(interaction)) {
    await interaction.reply({
      content: searchChannelId
        ? `Les recherches de joueurs se font uniquement dans <#${searchChannelId}>.`
        : "Le salon de recherche AstralTracker n’est pas encore configuré.",
      ephemeral: true
    });
    return;
  }

  const game = interaction.options.getString("jeu", true);
  const identifier = interaction.options.getString("identifiant", true).trim();
  const region = interaction.options.getString("region") || "sg";
  const platform = interaction.options.getString("plateforme") || "steam";

  if (!identifier) {
    await interaction.reply({ content: "Entre un identifiant joueur valide.", ephemeral: true });
    return;
  }

  await interaction.deferReply();
  await runProfileLookup({
    userId: interaction.user.id,
    game,
    identifier,
    region,
    platform,
    respond: (payload) => interaction.editReply(payload),
    deny: (content) => interaction.editReply({ content })
  });
});

client.on("messageCreate", async (message) => {
  if (await handleSearchMessage(message)) {
    return;
  }

  await handleModuleMessage(message);
});

await client.login(token);

async function postWelcomePanelOnce() {
  const channelId = process.env.DISCORD_WELCOME_CHANNEL_ID?.trim();

  if (!channelId) {
    return;
  }

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel || !("send" in channel)) {
      return;
    }

    const marker = `astral_welcome_sent_${channelId}`;
    const { getCachedLookup, setCachedLookup } = await import("./storage.js");

    if (getCachedLookup(marker, 365 * 24 * 60 * 60 * 1000)) {
      return;
    }

    await channel.send(formatHelpResponse());
    setCachedLookup(marker, { sent: true });
  } catch (error) {
    console.warn("Panneau d'aide non envoyé:", error instanceof Error ? error.message : error);
  }
}

function isAllowedSearchChannel(interaction) {
  if (!searchChannelId) {
    return true;
  }

  return interaction.channelId === searchChannelId;
}

async function handleSearchMessage(message) {
  if (!message.guild || message.author.bot || !searchChannelId || message.channelId !== searchChannelId) {
    return false;
  }

  const content = message.content.trim();

  if (!content || content.startsWith("/")) {
    return false;
  }

  const state = getCachedLookup(searchStateKey(message.author.id), searchStateTtlMs);

  if (!state?.game) {
    await message.reply(searchGamePrompt(message.author.id));
    return true;
  }

  const pending = await message.reply("Recherche en cours...");
  const identifier = normalizeIdentifier(content, state.game);

  setCachedLookup(searchStateKey(message.author.id), null);

  await runProfileLookup({
    userId: message.author.id,
    game: state.game,
    identifier,
    region: state.region || "sg",
    platform: state.platform || "steam",
    respond: (payload) => pending.edit(payload),
    deny: (content) => pending.edit({ content })
  });

  return true;
}

async function handleSearchGameSelect(interaction) {
  if (!interaction.isStringSelectMenu() || !interaction.customId.startsWith("astral:search:game:")) {
    return false;
  }

  const ownerId = interaction.customId.split(":").at(-1);

  if (ownerId !== interaction.user.id) {
    await interaction.reply({ content: "Ce choix appartient a une autre recherche. Envoie ton propre message dans le salon pour commencer.", ephemeral: true });
    return true;
  }

  const game = interaction.values[0];
  setCachedLookup(searchStateKey(interaction.user.id), {
    game,
    region: "sg",
    platform: "steam"
  });

  await interaction.update({
    content: instructionForGame(game),
    components: []
  });

  return true;
}

async function runProfileLookup({ userId, game, identifier, region = "sg", platform = "steam", respond, deny }) {
  const quota = consumeQuota(userId, dailyLimit, windowMs);

  if (!quota.allowed) {
    await deny(formatLimitText(quota));
    return;
  }

  try {
    const cacheKey = [game, identifier.toLowerCase(), game === "free_fire" ? region : platform].join(":");
    const cached = getCachedLookup(cacheKey, cacheTtlMs);
    const payload = cached ?? await lookupPlayer({ game, identifier, region, platform });

    if (!cached) {
      setCachedLookup(cacheKey, payload);
    }

    await respond(await formatProfileResponse(game, identifier, payload, quota));
  } catch (error) {
    if (error?.retryable) {
      refundQuota(userId);
      quota.remaining = Math.min(quota.remaining + 1, quota.limit);
    }

    console.warn("Recherche joueur échouée:", {
      code: error?.code || "UNKNOWN",
      status: error?.status || null,
      backendMessage: error?.backendMessage || null,
      endpoint: error?.endpoint || null,
      game,
      identifier
    });

    await respond(formatLookupErrorResponse(error, { game, identifier, quota }));
  }
}

function searchGamePrompt(userId) {
  return {
    content: "Choisis le jeu du profil que tu veux rechercher, puis je te demanderai l'ID joueur.",
    components: [
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`astral:search:game:${userId}`)
          .setPlaceholder("Selectionne un jeu")
          .addOptions(
            new StringSelectMenuOptionBuilder()
              .setLabel("Free Fire")
              .setDescription("Recherche avec UID joueur")
              .setValue("free_fire"),
            new StringSelectMenuOptionBuilder()
              .setLabel("PUBG")
              .setDescription("Recherche avec pseudo ou ID PUBG")
              .setValue("pubg"),
            new StringSelectMenuOptionBuilder()
              .setLabel("Fortnite")
              .setDescription("Recherche avec ID de compte Fortnite")
              .setValue("fortnite")
          )
      )
    ]
  };
}

function instructionForGame(game) {
  const labels = {
    free_fire: "Free Fire",
    pubg: "PUBG",
    fortnite: "Fortnite"
  };
  const hints = {
    free_fire: "Envoie maintenant ton UID Free Fire. Exemple: `521710963`.",
    pubg: "Envoie maintenant ton pseudo ou ID PUBG. Exemple: `PlayerName`.",
    fortnite: "Envoie maintenant ton ID de compte Fortnite."
  };

  return `Jeu selectionne: **${labels[game] || "Astral4Gamer"}**.\n${hints[game] || "Envoie maintenant l'identifiant joueur."}`;
}

function normalizeIdentifier(content, game) {
  if (game === "free_fire") {
    return content.match(/\b\d{6,15}\b/)?.[0] || content.trim();
  }

  return content.trim();
}

function searchStateKey(userId) {
  return `astral_search_state_${userId}`;
}

function requiredEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Configuration manquante: ${name}`);
  }

  return value;
}

function numberEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
