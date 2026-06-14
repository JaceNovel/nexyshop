import path from "node:path";
import { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";

const siteUrl = process.env.ASTRAL_SITE_URL || "https://astral4gamer.com/profil-public";
const brandImageName = "astral-profile.png";
const brandImagePath = process.env.ASTRAL_BRAND_IMAGE_PATH || path.resolve(process.cwd(), "../frontend/public/unnamed.png");
const brandIconUrl = `attachment://${brandImageName}`;
const pubgImageName = "astral-pubg.jpg";
const pubgImagePath = process.env.ASTRAL_PUBG_IMAGE_PATH || path.resolve(process.cwd(), "../frontend/public/pubg-1920x1080-wallpaper-md5gr1zzjd6ic2va.jpg");
const pubgImageUrl = `attachment://${pubgImageName}`;
const fortniteImageName = "astral-fortnite.jpg";
const fortniteImagePath = process.env.ASTRAL_FORTNITE_IMAGE_PATH || path.resolve(process.cwd(), "../frontend/public/the-death-star-sabotage-event-for-fortnite-begins-on-july-7-cover684382a44e794.jpg");
const fortniteImageUrl = `attachment://${fortniteImageName}`;
const gameColors = {
  free_fire: 0xe52b2f,
  pubg: 0x2b2d31,
  fortnite: 0x2b2d31
};

export async function formatProfileResponse(game, identifier, payload, quota) {
  const components = [profileActions(game, identifier)];
  const files = [new AttachmentBuilder(brandImagePath, { name: brandImageName }), ...gameFiles(game)];
  const embed = formatProfileEmbed(game, identifier, payload, quota);

  return { embeds: [embed], components, files };
}

export function formatHelpResponse() {
  const embed = new EmbedBuilder()
    .setColor(0xe52b2f)
    .setAuthor({ name: "ASTRAL4GAMER · AIDE", iconURL: brandIconUrl })
    .setTitle("Comment utiliser Astral Scout")
    .setDescription([
      "Dans le salon de recherche, envoie un message pour commencer.",
      "",
      "**Parcours guide**",
      "1. Tu ecris un message dans le salon.",
      "2. Le bot te demande de choisir le jeu.",
      "3. Tu selectionnes Free Fire, PUBG ou Fortnite.",
      "4. Le bot te demande l'ID du joueur.",
      "5. Tu envoies l'ID, le bot affiche le profil.",
      "",
      "**Commandes optionnelles**",
      "`/quota` affiche tes recherches restantes.",
      "`/site` ouvre la recherche officielle Astral4Gamer.",
      "",
      `Chaque membre a **20 recherches par 24h**. Pour continuer sans limite Discord: ${siteUrl}`
    ].join("\n"))
    .setThumbnail(brandIconUrl)
    .setFooter({ text: "PLAY · COMPETE · WIN" });

  return {
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Recherche officielle").setURL(siteUrl)
    )],
    files: [new AttachmentBuilder(brandImagePath, { name: brandImageName })]
  };
}

function formatProfileEmbed(game, identifier, payload, quota) {
  if (game === "free_fire") {
    return freeFireEmbed(identifier, payload, quota);
  }

  if (game === "pubg") {
    return pubgEmbed(identifier, payload, quota);
  }

  if (game === "fortnite") {
    return fortniteEmbed(identifier, payload, quota);
  }

  return baseEmbed("Profil indisponible", "Ce jeu n’est pas encore disponible.", quota);
}

export function formatQuotaText(quota) {
  return `Il te reste **${quota.remaining}/${quota.limit}** recherches. Réinitialisation ${discordTimestamp(quota.resetAt, "R")}.`;
}

export function formatLimitText(quota) {
  return [
    `Tu as utilisé tes **${quota.limit} recherches Discord**.`,
    `Le quota se réinitialise ${discordTimestamp(quota.resetAt, "R")}.`,
    `Pour continuer maintenant, utilise le site officiel: ${siteUrl}`
  ].join("\n");
}

export function formatLookupErrorResponse(error, { game, identifier, quota }) {
  const code = error?.code || "LOOKUP_FAILED";
  const copy = errorCopy(code, game);
  const url = new URL(siteUrl);
  url.searchParams.set("game", game);
  url.searchParams.set("id", identifier);

  const embed = new EmbedBuilder()
    .setColor(0xe52b2f)
    .setAuthor({ name: "ASTRAL4GAMER · RECHERCHE", iconURL: brandIconUrl })
    .setTitle(copy.title)
    .setDescription(copy.description)
    .addFields(
      { name: "Jeu", value: gameLabel(game), inline: true },
      { name: "Identifiant", value: `\`${identifier}\``, inline: true },
      { name: "Quota", value: `${quota.remaining}/${quota.limit} restantes`, inline: true }
    )
    .setFooter({ text: "Aucune donnee technique sensible n'est affichee dans Discord." })
    .setTimestamp(new Date());

  return {
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Réessayer sur Astral4Gamer").setURL(url.toString()),
      new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Recherche officielle").setURL(siteUrl)
    )],
    files: [new AttachmentBuilder(brandImagePath, { name: brandImageName })]
  };
}

export function siteText() {
  return `Recherche officielle Astral4Gamer: ${siteUrl}`;
}

function freeFireEmbed(identifier, profile, quota) {
  const account = record(profile.account);
  const info = record(account.AccountInfo);
  const guild = record(profile.guild);
  const rank = record(profile.rank);
  const name = string(profile.nickname || info.AccountName, `Free Fire ${identifier}`);
  const region = string(profile.region, "ME").toUpperCase();
  const level = string(profile.level || info.AccountLevel);
  const likes = compactNumber(profile.likes || info.AccountLikes);
  const brPoints = compactNumber(profile.br_rank_points);
  const csPoints = compactNumber(profile.cs_rank_points);
  const brRank = string(rank.br || info.BrMaxRank);
  const csRank = string(rank.cs || info.CsMaxRank);
  const guildName = string(guild.GuildName || guild.guildName);
  const embed = baseEmbed("FREE FIRE PLAYER CARD", cardDescription({
    name,
    subtitle: `UID ${string(profile.uid, identifier)} · ${region}`,
    tag: "PROFIL PUBLIC",
    lines: [
      `Niveau ${level}`,
      `${likes} likes`,
      guildName !== "—" ? `Guilde ${guildName}` : null
    ]
  }), quota, "free_fire")
    .setThumbnail(brandIconUrl)
    .addFields(
      statField("IDENTITÉ", [
        ["Pseudo", name],
        ["UID", string(profile.uid, identifier)],
        ["Région", region],
        ["Niveau", level]
      ], true),
      statField("PERFORMANCE", [
        ["Likes", likes],
        ["BR", `${brRank} · ${brPoints} pts`],
        ["CS", `${csRank} · ${csPoints} pts`]
      ], true),
      statField("COMMUNAUTÉ", [
        ["Guilde", guildName],
        ["Source", "Astral4Gamer"],
        ["Statut", "Données publiques"]
      ], false)
    );

  return embed;
}

function pubgEmbed(identifier, profile, quota) {
  const highlights = record(profile.highlights);
  const rank = record(profile.rank);
  const name = string(profile.name, identifier);
  const matches = compactNumber(highlights.matches);
  const wins = compactNumber(highlights.wins);
  const kills = compactNumber(highlights.kills);
  const top10s = compactNumber(highlights.top10s);
  const damage = compactNumber(Math.round(number(highlights.damage)));

  return baseEmbed("PUBG PLAYER CARD", cardDescription({
    name,
    subtitle: `${string(profile.platform, "steam").toUpperCase()} · ${string(profile.shard_id)}`,
    tag: `${string(rank.label)} · ${string(rank.score)} pts`,
    lines: [
      `${matches} matchs`,
      `${wins} victoires`,
      `${kills} kills`
    ]
  }), quota, "pubg")
    .setThumbnail(pubgImageUrl)
    .addFields(
      statField("IDENTITÉ", [
        ["Compte", string(profile.account_id)],
        ["Plateforme", string(profile.platform, "steam").toUpperCase()],
        ["Shard", string(profile.shard_id)]
      ], false),
      statField("RANG ASTRAL", [
        ["Rang", string(rank.label)],
        ["Score", `${string(rank.score)} pts`],
        ["Progression", `${Math.round(number(rank.progress))}%`]
      ], true),
      statField("STATS", [
        ["Matchs", matches],
        ["Top 10", top10s],
        ["Dégâts", damage]
      ], true)
    );
}

function fortniteEmbed(identifier, profile, quota) {
  const name = string(profile.name, identifier);
  const winRate = profile.win_rate !== null && profile.win_rate !== undefined ? `${profile.win_rate}%` : "—";

  return baseEmbed("FORTNITE PLAYER CARD", cardDescription({
    name,
    subtitle: `${string(profile.account_type, "epic").toUpperCase()} · ID ${string(profile.account_id, identifier)}`,
    tag: `Niveau ${string(profile.level)}`,
    lines: [
      `${compactNumber(profile.matches)} matchs`,
      `${compactNumber(profile.wins)} victoires`,
      `${compactNumber(profile.kills)} kills`
    ]
  }), quota, "fortnite")
    .setThumbnail(fortniteImageUrl)
    .addFields(
      statField("IDENTITÉ", [
        ["Compte", string(profile.account_id)],
        ["Type", string(profile.account_type, "epic").toUpperCase()],
        ["Niveau", string(profile.level)]
      ], false),
      statField("PERFORMANCE", [
        ["Score", compactNumber(profile.score)],
        ["K/D", string(profile.kd)],
        ["Win rate", winRate]
      ], true),
      statField("CLASSEMENTS", [
        ["Top 3", compactNumber(profile.top3)],
        ["Top 10", compactNumber(profile.top10)],
        ["Top 25", compactNumber(profile.top25)]
      ], true)
    );
}

function baseEmbed(title, description, quota, game = "free_fire") {
  return new EmbedBuilder()
    .setColor(gameColors[game] ?? 0xe52b2f)
    .setAuthor({ name: "ASTRAL4GAMER · PLAYER INTEL", iconURL: brandIconUrl })
    .setTitle(title)
    .setDescription(description)
    .setFooter({ text: `PLAY · COMPETE · WIN · ${quota.remaining}/${quota.limit} recherches restantes` })
    .setTimestamp(new Date());
}

function profileActions(game, identifier) {
  const url = new URL(siteUrl);
  url.searchParams.set("game", game);
  url.searchParams.set("id", identifier);

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel("Voir sur Astral4Gamer")
      .setURL(url.toString()),
    new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel("Rechercher un autre joueur")
      .setURL(siteUrl)
  );
}

function gameFiles(game) {
  if (game === "pubg") {
    return [new AttachmentBuilder(pubgImagePath, { name: pubgImageName })];
  }

  if (game === "fortnite") {
    return [new AttachmentBuilder(fortniteImagePath, { name: fortniteImageName })];
  }

  return [];
}

function cardDescription({ name, subtitle, tag, lines }) {
  const cleanLines = lines.filter(Boolean);

  return [
    `# ${name.toUpperCase()}`,
    `**${tag}**`,
    subtitle,
    "",
    cleanLines.map((line) => `• ${line}`).join("\n"),
    "",
    "```ASTRAL4GAMER · PROFIL PUBLIC · STATS JOUEUR```"
  ].join("\n");
}

function errorCopy(code, game) {
  if (code === "PLAYER_NOT_FOUND") {
    return {
      title: "Aucun joueur trouvé",
      description: `Aucun profil ${gameLabel(game)} n’a été trouvé pour cet identifiant. Vérifie l’ID, la région ou la plateforme, puis réessaie.`
    };
  }

  if (code === "RATE_LIMITED") {
    return {
      title: "Recherche temporairement limitée",
      description: "Le fournisseur du jeu limite les demandes pour le moment. Réessaie dans quelques minutes."
    };
  }

  if (code === "BACKEND_TIMEOUT" || code === "PROVIDER_UNAVAILABLE") {
    return {
      title: "Recherche trop lente",
      description: "Le fournisseur du jeu ne répond pas assez vite. Ton quota Discord est conservé, tu peux réessayer plus tard."
    };
  }

  if (code === "BACKEND_UNAVAILABLE") {
    return {
      title: "Service indisponible",
      description: "AstralTracker n’arrive pas à joindre le backend pour le moment. Réessaie dans quelques instants."
    };
  }

  return {
    title: "Recherche indisponible",
    description: "La recherche n’a pas pu aboutir pour le moment. Réessaie plus tard ou passe par le site officiel."
  };
}

function gameLabel(game) {
  return {
    free_fire: "Free Fire",
    pubg: "PUBG",
    fortnite: "Fortnite"
  }[game] || "Astral4Gamer";
}

function statField(name, rows, inline = false) {
  return {
    name,
    value: rows.map(([label, value]) => `**${label}**\n${string(value)}`).join("\n\n"),
    inline
  };
}

function string(value, fallback = "—") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  return String(value);
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function compactNumber(value) {
  const parsed = number(value);
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(parsed);
}

function record(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function validImageUrl(value) {
  if (!value || typeof value !== "string") {
    return null;
  }

  return /^https?:\/\//i.test(value) ? value : null;
}

function discordTimestamp(ms, style = "R") {
  return `<t:${Math.floor(ms / 1000)}:${style}>`;
}
