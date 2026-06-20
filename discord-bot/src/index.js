import "dotenv/config";
import path from "node:path";
import {
  ActionRowBuilder,
  ActivityType,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle
} from "discord.js";
import { fetchApprovedPartnerships, fetchCatalogProduct, lookupPlayer, markPartnershipNotified, submitPartnershipRequest } from "./backend-client.js";
import { formatHelpResponse, formatLimitText, formatLookupErrorResponse, formatProfileResponse, formatQuotaText, siteText } from "./format.js";
import { handleModuleButton, handleModuleMessage, postModulePanelsOnce } from "./modules.js";
import { consumeQuota, getCachedLookup, getQuota, refundQuota, setCachedLookup } from "./storage.js";

const token = requiredEnv("DISCORD_BOT_TOKEN");
const dailyLimit = numberEnv("DAILY_LOOKUP_LIMIT", 20);
const windowMs = numberEnv("LOOKUP_WINDOW_HOURS", 24) * 60 * 60 * 1000;
const cacheTtlMs = numberEnv("LOOKUP_CACHE_HOURS", 72) * 60 * 60 * 1000;
const searchStateTtlMs = numberEnv("SEARCH_STATE_MINUTES", 10) * 60 * 1000;
const searchChannelId = process.env.DISCORD_SEARCH_CHANNEL_ID?.trim() || process.env.DISCORD_COMMAND_CHANNEL_ID?.trim() || process.env.DISCORD_WELCOME_CHANNEL_ID?.trim() || "";
const approvalPollMs = numberEnv("PARTNERSHIP_APPROVAL_POLL_SECONDS", 45) * 1000;
const siteBaseUrl = (process.env.ASTRAL_SITE_BASE_URL || "https://astral4gamer.com").replace(/\/+$/, "");
const codmChannelId = process.env.DISCORD_CODM_CHANNEL_ID?.trim() || "";
const codmAnnouncementChannelId = process.env.DISCORD_CODM_ANNOUNCEMENT_CHANNEL_ID?.trim() || process.env.DISCORD_WELCOME_CHANNEL_ID?.trim() || "";
const codmProductId = process.env.DISCORD_CODM_PRODUCT_ID?.trim() || "codm";
const codmAnnouncementImageUrl = process.env.ASTRAL_CODM_ANNOUNCEMENT_IMAGE_URL?.trim() || "";
const codmAnnouncementImagePath = process.env.ASTRAL_CODM_ANNOUNCEMENT_IMAGE_PATH?.trim() || "";
const codmArrowEmoji = process.env.DISCORD_CODM_ARROW_EMOJI?.trim() || "➡️";
const codmServers = [
  { label: "Global", value: "global", description: "Compte mondial / international" },
  { label: "Garena", value: "garena", description: "Compte Garena" },
  { label: "Vietnam", value: "vietnam", description: "Compte Vietnam" },
  { label: "Taiwan / Korea", value: "taiwan-korea", description: "Compte TW / KR" }
];

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
  await postCodmAnnouncementOnce();
  await postModulePanelsOnce(client, {
    get: (key) => getCachedLookup(key, 365 * 24 * 60 * 60 * 1000),
    set: (key, value) => setCachedLookup(key, value)
  });
  startPartnershipApprovalPolling();
});

client.on("interactionCreate", async (interaction) => {
  if (await handlePartnershipInteraction(interaction)) {
    return;
  }

  if (await handleCodmRechargeInteraction(interaction)) {
    return;
  }

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

  if (interaction.commandName === "partenariat") {
    await interaction.showModal(partnershipModal());
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
  if (await handleCodmRechargeMessage(message)) {
    return;
  }

  if (await handleSearchMessage(message)) {
    return;
  }

  await handleModuleMessage(message);
});

await client.login(token);

async function handleCodmRechargeMessage(message) {
  if (!message.guild || message.author.bot) {
    return false;
  }

  if (!isCodmTrigger(message.content) || !isAllowedCodmChannel(message.channelId)) {
    return false;
  }

  try {
    const productPayload = await fetchCatalogProduct(codmProductId);
    const dmChannel = await message.author.createDM();

    await dmChannel.send(buildCodmServerMessage(productPayload.data));
    await message.reply(`${message.author}, je t'ai envoyé un message privé pour choisir ton serveur CODM, voir les packs disponibles et ouvrir l'achat sur le site.`);
  } catch (error) {
    await message.reply(`${message.author}, impossible de lancer l'assistant CODM en privé pour le moment. Vérifie que tes messages privés sont ouverts puis réessaie.`);
    console.warn("Assistant CODM non démarré:", error instanceof Error ? error.message : error);
  }

  return true;
}

async function handleCodmRechargeInteraction(interaction) {
  if (interaction.isButton() && interaction.customId === "astral:codm:start") {
    try {
      const productPayload = await fetchCatalogProduct(codmProductId);
      const dmChannel = await interaction.user.createDM();
      await dmChannel.send(buildCodmServerMessage(productPayload.data));
      await interaction.reply({ content: "Je t'ai envoyé un message privé pour choisir le serveur, voir les packs CODM et ouvrir le bon lien d'achat.", ephemeral: true });
    } catch (error) {
      await interaction.reply({ content: "Impossible d'ouvrir le guide CODM en privé. Vérifie que tes messages privés sont ouverts.", ephemeral: true });
      console.warn("Assistant CODM via bouton non démarré:", error instanceof Error ? error.message : error);
    }

    return true;
  }

  if (!interaction.isStringSelectMenu() || !interaction.customId.startsWith("astral:codm:")) {
    return false;
  }

  const [, , , action, serverFromId = ""] = interaction.customId.split(":");
  const productPayload = await fetchCatalogProduct(codmProductId);
  const product = productPayload.data;

  if (action === "server") {
    const server = interaction.values[0] || codmServers[0].value;
    await interaction.update(buildCodmPackMessage(product, server));
    return true;
  }

  if (action === "pack") {
    const server = serverFromId || codmServers[0].value;
    const variationId = interaction.values[0] || "";
    await interaction.update(buildCodmCheckoutMessage(product, server, variationId));
    return true;
  }

  return false;
}

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

async function postCodmAnnouncementOnce() {
  const channelId = codmAnnouncementChannelId;

  if (!channelId) {
    return;
  }

  try {
    const productPayload = await fetchCatalogProduct(codmProductId);
    const channel = await client.channels.fetch(channelId);

    if (!channel || !("send" in channel)) {
      return;
    }

    const marker = `astral_codm_announcement_${channelId}`;
    const { getCachedLookup, setCachedLookup } = await import("./storage.js");

    if (getCachedLookup(marker, 365 * 24 * 60 * 60 * 1000)) {
      return;
    }

    await channel.send(buildCodmAnnouncementMessage(productPayload.data));
    setCachedLookup(marker, { sent: true });
  } catch (error) {
    console.warn("Annonce CODM non envoyée:", error instanceof Error ? error.message : error);
  }
}

async function handlePartnershipInteraction(interaction) {
  if (interaction.isButton() && (interaction.customId === "astral:partner:request" || interaction.customId === "astral:support:partner")) {
    await interaction.showModal(partnershipModal());
    return true;
  }

  if (!interaction.isModalSubmit() || interaction.customId !== "astral:partner:modal") {
    return false;
  }

  await interaction.deferReply({ ephemeral: true });

  const companyName = interaction.fields.getTextInputValue("company_name").trim();
  const email = interaction.fields.getTextInputValue("email").trim();
  const countryAudience = interaction.fields.getTextInputValue("country_audience").trim();
  const networkUrl = interaction.fields.getTextInputValue("network_url").trim();
  const message = interaction.fields.getTextInputValue("message").trim();
  const [country = "", audience = ""] = countryAudience.split("|").map((value) => value.trim());

  try {
    const response = await submitPartnershipRequest({
      name: interaction.user.globalName || interaction.user.username,
      company_name: companyName,
      email,
      discord: interaction.user.tag,
      discord_user_id: interaction.user.id,
      discord_username: interaction.user.tag,
      country,
      type: "Revendeur API Free Fire",
      audience,
      network_url: networkUrl,
      expected_earning: "30 000 à 1 000 000+ FCFA / mois",
      message
    });

    await interaction.editReply({
      content: `Demande reçue: **${response.reference}**.\nL'équipe Astral4Gamer va analyser ton dossier. Si c'est approuvé, je t'enverrai tes accès reseller en message privé.`
    });
  } catch (error) {
    await interaction.editReply({
      content: `Impossible d'envoyer la demande pour le moment: ${error?.backendMessage || error?.message || "erreur inconnue"}.`
    });
  }

  return true;
}

function partnershipModal() {
  return new ModalBuilder()
    .setCustomId("astral:partner:modal")
    .setTitle("Demande partenaire Astral4Gamer")
    .addComponents(
      modalRow("company_name", "Nom société / boutique", TextInputStyle.Short, true, "Ex: Nova Gaming Store"),
      modalRow("email", "Email souhaité", TextInputStyle.Short, true, "contact@boutique.com"),
      modalRow("country_audience", "Pays | volume estimé", TextInputStyle.Short, true, "Togo | 100 commandes/mois"),
      modalRow("network_url", "Site web / réseau social", TextInputStyle.Short, false, "https://..."),
      modalRow("message", "Décris ton projet reseller", TextInputStyle.Paragraph, true, "Explique ton activité, tes clients et ce que tu veux vendre.")
    );
}

function modalRow(customId, label, style, required, placeholder) {
  return new ActionRowBuilder().addComponents(
    new TextInputBuilder()
      .setCustomId(customId)
      .setLabel(label)
      .setStyle(style)
      .setRequired(required)
      .setPlaceholder(placeholder)
      .setMaxLength(style === TextInputStyle.Paragraph ? 1200 : 160)
  );
}

function startPartnershipApprovalPolling() {
  if (!process.env.ASTRAL_BOT_BACKEND_TOKEN?.trim()) {
    console.warn("Polling partenariat désactivé: ASTRAL_BOT_BACKEND_TOKEN manquant.");
    return;
  }

  const poll = async () => {
    try {
      const approvals = await fetchApprovedPartnerships();

      for (const approval of approvals ?? []) {
        await sendPartnershipApprovalDm(approval);
      }
    } catch (error) {
      console.warn("Polling approbations partenariat échoué:", error?.message || error);
    }
  };

  void poll();
  setInterval(() => void poll(), approvalPollMs);
}

async function sendPartnershipApprovalDm(approval) {
  const credentials = approval.credentials;
  if (!credentials?.email || !credentials?.password || !credentials?.api_key) {
    return;
  }

  const user = await client.users.fetch(approval.discord_user_id);
  await user.send([
    `Ton partenariat Astral4Gamer est approuvé.`,
    ``,
    `Panel: ${credentials.panel_url}`,
    `Email: ${credentials.email}`,
    `Mot de passe temporaire: ${credentials.password}`,
    `API key: ${credentials.api_key}`,
    ``,
    `Recharge minimum: 10 USD. Garde ta clé API privée et ne la partage pas publiquement.`
  ].join("\n"));

  await markPartnershipNotified(approval.id);
  console.log(`Accès reseller envoyés à ${approval.discord_user_id} (${approval.reference}).`);
}

function isAllowedSearchChannel(interaction) {
  if (!searchChannelId) {
    return true;
  }

  return interaction.channelId === searchChannelId;
}

function isAllowedCodmChannel(channelId) {
  if (!codmChannelId) {
    return true;
  }

  return channelId === codmChannelId;
}

function isCodmTrigger(content) {
  return /^recharge\s+codm$/i.test(content.trim());
}

function buildCodmServerMessage(product) {
  return {
    embeds: [codmEmbed(product, {
      title: "Recharge CODM privée",
      description: "Choisis d'abord ton serveur. Je te montrerai ensuite tous les packs disponibles avec leurs prix puis je t'enverrai le lien exact du site pour acheter.",
      server: null,
      variationId: null
    })],
    components: [codmServerRow()]
  };
}

function buildCodmAnnouncementMessage(product) {
  const imageAttachmentName = codmAnnouncementImagePath ? path.basename(codmAnnouncementImagePath) : "";

  return {
    content: [
      "🔥 **DOMINATE THE BATTLEFIELD WITH CODM CP!** 🔥",
      "",
      "Ready to upgrade your **Call of Duty: Mobile** experience? Grab your **CP (Global)** instantly and unlock Battle Passes, Legendary Draws, Mythic Weapons, Operators, Skins, and exclusive in-game content.",
      "",
      `${animatedArrow()} Click **Open CODM Assistant** to receive the guided purchase flow in private.`,
      `${animatedArrow()} Or go directly to the Astral4Gamer store with the button below.`,
      "",
      "#CODMobile #CODM #CallOfDutyMobile #CP #TopUp #Astral4Gamer #Gaming #MobileGaming"
    ].join("\n"),
    embeds: [codmAnnouncementEmbed(product)],
    files: codmAnnouncementImagePath ? [new AttachmentBuilder(codmAnnouncementImagePath, { name: imageAttachmentName })] : [],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("astral:codm:start")
          .setStyle(ButtonStyle.Primary)
          .setLabel("Open CODM Assistant"),
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setLabel("Order on Astral4Gamer")
          .setURL(`${siteBaseUrl}/product/codm`)
      )
    ]
  };
}

function buildCodmPackMessage(product, server) {
  return {
    embeds: [codmEmbed(product, {
      title: `Serveur sélectionné: ${codmServerLabel(server)}`,
      description: "Choisis maintenant le pack CODM que tu veux acheter.",
      server,
      variationId: null
    })],
    components: [codmServerRow(server), codmPackRow(product, server)]
  };
}

function buildCodmCheckoutMessage(product, server, variationId) {
  const variation = (product.variations ?? []).find((item) => String(item.variation_id ?? "") === variationId) ?? (product.variations ?? [])[0] ?? null;
  const buyUrl = codmBuyUrl(variation?.variation_id, server);
  const summary = variation
    ? `Serveur: **${codmServerLabel(server)}**\nPack choisi: **${variation.name}**\nPrix: **${formatCurrency(variation.price, variation.currency || product.currency)}**\n\nClique sur le bouton ci-dessous pour finaliser l'achat sur le site.`
    : `Serveur: **${codmServerLabel(server)}**\n\nClique sur le bouton ci-dessous pour ouvrir la page CODM sur le site.`;

  return {
    embeds: [codmEmbed(product, {
      title: "Lien d'achat CODM prêt",
      description: summary,
      server,
      variationId: variation?.variation_id ?? null
    })],
    components: [
      codmServerRow(server),
      codmPackRow(product, server, variation?.variation_id ?? null),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setLabel(variation ? `Acheter ${variation.name} sur le site` : "Ouvrir CODM sur le site")
          .setURL(buyUrl)
      )
    ]
  };
}

function codmEmbed(product, { title, description, server, variationId }) {
  const selectedVariation = (product.variations ?? []).find((item) => String(item.variation_id ?? "") === String(variationId ?? "")) ?? null;
  const priceLines = (product.variations ?? [])
    .slice(0, 25)
    .map((variation) => {
      const prefix = selectedVariation && String(selectedVariation.variation_id ?? "") === String(variation.variation_id ?? "") ? "• " : "";
      return `${prefix}${variation.name} - ${formatCurrency(variation.price, variation.currency || product.currency)}`;
    })
    .join("\n");

  const embed = new EmbedBuilder()
    .setColor(0xe52b2f)
    .setTitle(title)
    .setDescription(description)
    .addFields(
      {
        name: "Produit",
        value: `${product.name}\n${product.description || "Recharge manuelle CODM via Astral4Gamer."}`.slice(0, 1024),
        inline: false
      },
      {
        name: "Packs disponibles",
        value: priceLines || "Aucun pack disponible pour le moment.",
        inline: false
      },
      {
        name: "Serveur",
        value: server ? codmServerLabel(server) : "À choisir",
        inline: true
      },
      {
        name: "Lien site",
        value: `${siteBaseUrl}/product/codm`,
        inline: true
      }
    )
    .setFooter({ text: "Astral4Gamer · Recharge CODM assistée" });

  if (product.image_url) {
    embed.setThumbnail(product.image_url);
  }

  return embed;
}

function codmAnnouncementEmbed(product) {
  const priceLines = (product.variations ?? [])
    .slice(0, 25)
    .map((variation) => `• ${variation.name} ${animatedArrow()} **${formatCurrency(variation.price, variation.currency || product.currency)}**`)
    .join("\n");

  const embed = new EmbedBuilder()
    .setColor(0x0b55d9)
    .setTitle("CODM MOBILE (GLOBAL) · PRICE LIST")
    .setDescription([
      "⚡ **Why choose Astral4Gamer?**",
      "✅ Fast Manual Delivery (1-15 min)",
      "✅ 100% Secure Payments",
      "✅ Trusted Service",
      "✅ 24/7 Customer Support",
      "✅ Best Prices Guaranteed"
    ].join("\n"))
    .addFields(
      {
        name: "💎 CODM Global CP Price List",
        value: priceLines || "No CODM pack available right now.",
        inline: false
      },
      {
        name: "🌍 Order now",
        value: `${siteBaseUrl}/product/codm`,
        inline: false
      },
      {
        name: "📩 Private help",
        value: "Click **Open CODM Assistant** and the bot will reply in private with server selection, available packs and the correct purchase link.",
        inline: false
      }
    )
    .setFooter({ text: "Astral4Gamer · Recharge rapide & sécurisée" })
    .setTimestamp(new Date());

  const imageUrl = codmAnnouncementImagePath
    ? `attachment://${path.basename(codmAnnouncementImagePath)}`
    : (codmAnnouncementImageUrl || product.image_url || "");

  if (imageUrl) {
    embed.setImage(imageUrl);
  }

  return embed;
}

function codmServerRow(selectedServer = null) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("astral:codm:server")
      .setPlaceholder("Choisir le serveur CODM")
      .addOptions(codmServers.map((server) => new StringSelectMenuOptionBuilder()
        .setLabel(server.label)
        .setValue(server.value)
        .setDescription(server.description)
        .setDefault(server.value === selectedServer)
      ))
  );
}

function codmPackRow(product, server, selectedVariationId = null) {
  const variations = (product.variations ?? []).slice(0, 25);

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`astral:codm:pack:${server}`)
      .setPlaceholder("Choisir le pack CODM")
      .addOptions(variations.map((variation) => new StringSelectMenuOptionBuilder()
        .setLabel(String(variation.name).slice(0, 100))
        .setValue(String(variation.variation_id ?? variation.name))
        .setDescription(formatCurrency(variation.price, variation.currency || product.currency).slice(0, 100))
        .setDefault(String(variation.variation_id ?? "") === String(selectedVariationId ?? ""))
      ))
  );
}

function codmServerLabel(value) {
  return codmServers.find((server) => server.value === value)?.label || "Global";
}

function codmBuyUrl(variationId, server) {
  const query = new URLSearchParams();

  if (variationId) {
    query.set("variation", String(variationId));
    query.set("checkout", "1");
  }

  if (server) {
    query.set("server", String(server));
  }

  const suffix = query.toString();

  return `${siteBaseUrl}/product/codm${suffix ? `?${suffix}` : ""}`;
}

function animatedArrow() {
  return codmArrowEmoji || "➡️";
}

function formatCurrency(amount, currency) {
  const normalizedCurrency = String(currency || "USD").toUpperCase();
  const locale = normalizedCurrency === "USD" ? "en-US" : normalizedCurrency === "EUR" ? "fr-FR" : "en-US";

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: normalizedCurrency,
      minimumFractionDigits: normalizedCurrency === "XOF" || normalizedCurrency === "XAF" ? 0 : 2,
      maximumFractionDigits: normalizedCurrency === "XOF" || normalizedCurrency === "XAF" ? 0 : 2
    }).format(Number(amount || 0));
  } catch {
    return `${Number(amount || 0).toFixed(2)} ${normalizedCurrency}`;
  }
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
