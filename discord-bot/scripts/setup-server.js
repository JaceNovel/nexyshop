import "dotenv/config";
import { ChannelType, Client, GatewayIntentBits, PermissionsBitField } from "discord.js";

const guildId = requiredEnv("DISCORD_GUILD_ID");
const token = requiredEnv("DISCORD_BOT_TOKEN");
const trackerChannelId = process.env.DISCORD_WELCOME_CHANNEL_ID?.trim();

const layout = [
  {
    name: "ACCUEIL",
    text: ["annonces", "reglement", "guide-du-serveur", "liens-officiels", "aide-et-support"]
  },
  {
    name: "ASTRALTRACKER",
    text: ["astraltracker-bot", "aide-bot", "statut-du-bot"]
  },
  {
    name: "COMMUNAUTE",
    text: ["presentations", "partage-profils", "recherche-team", "clips-et-screens"]
  },
  {
    name: "JEUX",
    text: ["free-fire", "pubg", "fortnite", "autres-jeux"]
  },
  {
    name: "TOURNOIS",
    text: ["annonces-tournois", "inscriptions-tournois", "resultats-tournois", "planning-tournois", "reclamations-tournois"]
  },
  {
    name: "EVENEMENTS",
    text: ["evenements", "lives", "giveaways", "calendrier"]
  },
  {
    name: "BOUTIQUE",
    text: ["promotions", "game-credits", "gift-cards", "preuves-et-avis", "support-commandes"]
  },
  {
    name: "PARTENARIATS",
    text: ["demandes-partenariat", "createurs", "sponsors"]
  },
  {
    name: "STAFF PRIVE",
    private: true,
    text: ["staff-chat", "moderation", "logs-bot", "logs-serveur", "planning-staff", "idees-et-ameliorations", "signalements"]
  },
  {
    name: "VOCAL",
    voice: ["General", "Free Fire", "PUBG", "Fortnite", "Tournois", "Staff prive"]
  }
];

const roles = [
  { name: "Fondateur", color: 0xe52b2f },
  { name: "Admin", color: 0xff4757 },
  { name: "Staff", color: 0x5865f2 },
  { name: "Modérateur", color: 0x57f287 },
  { name: "Support", color: 0xfee75c },
  { name: "Organisateur Tournoi", color: 0xeb459e },
  { name: "Partenaire", color: 0x00d4ff },
  { name: "Créateur", color: 0x9b59b6 },
  { name: "VIP", color: 0xf1c40f },
  { name: "Membre", color: 0x95a5a6 },
  { name: "Free Fire", color: 0xe52b2f },
  { name: "PUBG", color: 0xf59e0b },
  { name: "Fortnite", color: 0x7c3aed },
  { name: "Bot", color: 0x2b2d31 }
];

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("clientReady", async () => {
  try {
    const guild = await client.guilds.fetch(guildId);
    await guild.channels.fetch();
    await guild.roles.fetch();

    console.log(`Configuration du serveur: ${guild.name}`);
    await ensureRoles(guild);
    await ensureLayout(guild);
    console.log("Serveur prêt.");
  } finally {
    client.destroy();
  }
});

await client.login(token);

async function ensureRoles(guild) {
  for (const role of roles) {
    const exists = guild.roles.cache.find((item) => item.name.toLowerCase() === role.name.toLowerCase());
    if (exists) {
      console.log(`role ok: ${role.name}`);
      continue;
    }

    await guild.roles.create({
      name: role.name,
      color: role.color,
      reason: "Initialisation serveur Astral4Gamer"
    });
    console.log(`role créé: ${role.name}`);
  }
}

async function ensureLayout(guild) {
  const staffRole = guild.roles.cache.find((role) => role.name === "Staff");
  const adminRole = guild.roles.cache.find((role) => role.name === "Admin");

  for (const category of layout) {
    const parent = await ensureCategory(guild, category.name, category.private, staffRole, adminRole);

    for (const name of category.text ?? []) {
      await ensureChannel(guild, name, ChannelType.GuildText, parent, category.private, staffRole, adminRole);
    }

    for (const name of category.voice ?? []) {
      await ensureChannel(guild, name, ChannelType.GuildVoice, parent, category.private || name.toLowerCase().includes("staff"), staffRole, adminRole);
    }
  }

  if (trackerChannelId) {
    const tracker = guild.channels.cache.get(trackerChannelId);
    const trackerParent = guild.channels.cache.find((channel) => channel.type === ChannelType.GuildCategory && channel.name === "ASTRALTRACKER");
    if (tracker && trackerParent && tracker.parentId !== trackerParent.id) {
      await tracker.setParent(trackerParent.id, { lockPermissions: false });
      console.log("astraltracker-bot rangé dans ASTRALTRACKER");
    }
  }
}

async function ensureCategory(guild, name, isPrivate, staffRole, adminRole) {
  const existing = guild.channels.cache.find((channel) => channel.type === ChannelType.GuildCategory && channel.name === name);
  if (existing) {
    console.log(`catégorie ok: ${name}`);
    return existing;
  }

  const category = await guild.channels.create({
    name,
    type: ChannelType.GuildCategory,
    permissionOverwrites: privateOverwrites(guild, isPrivate, staffRole, adminRole),
    reason: "Initialisation serveur Astral4Gamer"
  });
  console.log(`catégorie créée: ${name}`);
  return category;
}

async function ensureChannel(guild, name, type, parent, isPrivate, staffRole, adminRole) {
  const existing = guild.channels.cache.find((channel) => channel.name === name && channel.type === type);
  if (existing) {
    if (parent && existing.parentId !== parent.id) {
      await existing.setParent(parent.id, { lockPermissions: false });
    }
    console.log(`salon ok: ${name}`);
    return existing;
  }

  const channel = await guild.channels.create({
    name,
    type,
    parent: parent?.id,
    permissionOverwrites: privateOverwrites(guild, isPrivate, staffRole, adminRole),
    reason: "Initialisation serveur Astral4Gamer"
  });
  console.log(`salon créé: ${name}`);
  return channel;
}

function privateOverwrites(guild, isPrivate, staffRole, adminRole) {
  if (!isPrivate) {
    return [];
  }

  const allow = [
    PermissionsBitField.Flags.ViewChannel,
    PermissionsBitField.Flags.SendMessages,
    PermissionsBitField.Flags.ReadMessageHistory
  ];

  return [
    { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
    staffRole ? { id: staffRole.id, allow } : null,
    adminRole ? { id: adminRole.id, allow } : null
  ].filter(Boolean);
}

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Configuration manquante: ${name}`);
  return value;
}
