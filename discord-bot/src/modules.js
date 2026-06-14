import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, PermissionFlagsBits } from "discord.js";

const siteBaseUrl = (process.env.ASTRAL_SITE_BASE_URL || "https://astral4gamer.com").replace(/\/$/, "");
const profileUrl = process.env.ASTRAL_SITE_URL || `${siteBaseUrl}/profil-public`;
const moduleColor = 0xe52b2f;

const modules = [
  {
    key: "tournament",
    channelId: env("DISCORD_TOURNAMENT_CHANNEL_ID"),
    title: "AstralTournament",
    heading: "Tournois Astral4Gamer",
    description: "Ce salon sert aux annonces, inscriptions, rappels, resultats et classements. Les discussions se font dans les salons d'equipe ou de support.",
    prompt: "Ici tu peux consulter les tournois, t'inscrire, voir les resultats ou ouvrir un ticket tournoi.",
    buttons: [
      linkButton("Voir les tournois", `${siteBaseUrl}/tournois`),
      linkButton("Creer une equipe", `${siteBaseUrl}/tournois/creer-equipe`),
      button("Ticket tournoi", "astral:support:tournament", ButtonStyle.Secondary)
    ],
    readOnly: boolEnv("DISCORD_TOURNAMENT_READONLY", true)
  },
  {
    key: "shop",
    channelId: env("DISCORD_SHOP_CHANNEL_ID"),
    title: "AstralShop",
    heading: "Boutique et commandes",
    description: "Ecris ton numero de commande, le nom d'un produit, ou explique ton probleme d'achat. Le bot te guidera vers le bon suivi.",
    prompt: "Envoie ton numero de commande, par exemple `AG-1024` ou `1024`, ou clique sur un bouton.",
    buttons: [
      linkButton("Boutique", siteBaseUrl),
      button("Suivre une commande", "astral:shop:order", ButtonStyle.Primary),
      button("Support achat", "astral:support:order", ButtonStyle.Secondary)
    ]
  },
  {
    key: "live",
    channelId: env("DISCORD_LIVE_CHANNEL_ID"),
    title: "AstralLive",
    heading: "Lives, replays et videos",
    description: "Ce salon annonce les lives, les replays et les highlights. Ecris `live`, `replay` ou `video` pour recevoir le bon lien.",
    prompt: "Dis-moi si tu veux voir le live actuel, les replays, ou les dernieres videos.",
    buttons: [
      linkButton("Voir le live", `${siteBaseUrl}/live`),
      linkButton("Replays", `${siteBaseUrl}/live/passe`),
      linkButton("Blog videos", `${siteBaseUrl}/blog`)
    ]
  },
  {
    key: "support",
    channelId: env("DISCORD_SUPPORT_CHANNEL_ID"),
    title: "AstralSupport",
    heading: "Support prive",
    description: "Explique ton probleme ou choisis une categorie. Le bot ouvrira un fil de support pour garder ton dossier propre.",
    prompt: "Choisis une categorie: commande, paiement, tournoi, compte joueur ou partenariat.",
    buttons: [
      button("Commande", "astral:support:order", ButtonStyle.Primary),
      button("Paiement", "astral:support:payment", ButtonStyle.Primary),
      button("Tournoi", "astral:support:tournament", ButtonStyle.Secondary),
      button("Compte", "astral:support:account", ButtonStyle.Secondary),
      button("Partenariat", "astral:support:partner", ButtonStyle.Secondary)
    ]
  },
  {
    key: "community",
    channelId: env("DISCORD_COMMUNITY_CHANNEL_ID"),
    title: "AstralCommunity",
    heading: "Communaute Astral4Gamer",
    description: "Roles par jeu, regles, sondages, giveaways et evenements communautaires. Ecris ce que tu veux faire et le bot t'oriente.",
    prompt: "Tu peux demander les roles, les regles, les giveaways, les evenements ou les salons utiles.",
    buttons: [
      button("Roles jeux", "astral:community:roles", ButtonStyle.Primary),
      button("Regles", "astral:community:rules", ButtonStyle.Secondary),
      button("Giveaways", "astral:community:giveaways", ButtonStyle.Secondary)
    ]
  },
  {
    key: "partner",
    channelId: env("DISCORD_PARTNER_CHANNEL_ID"),
    title: "AstralPartner",
    heading: "Partenariats et sponsors",
    description: "Pour les createurs, marques, sponsors et organisateurs. Ecris ton projet ou ouvre une demande partenaire.",
    prompt: "Presente ton projet: nom, audience, pays, lien reseau social et ce que tu veux faire avec Astral4Gamer.",
    buttons: [
      linkButton("Page partenariat", `${siteBaseUrl}/partenariat`),
      button("Demande partenaire", "astral:support:partner", ButtonStyle.Primary)
    ]
  }
].filter((module) => module.channelId);

export async function postModulePanelsOnce(client, cache) {
  for (const module of modules) {
    const marker = `astral_module_panel_${module.key}_${module.channelId}`;

    if (cache.get(marker)) {
      continue;
    }

    try {
      const channel = await client.channels.fetch(module.channelId);
      if (!channel || !("send" in channel)) {
        continue;
      }

      const sent = await channel.send(modulePanel(module));
      await addDefaultReactions(module, sent);
      cache.set(marker, { sent: true, messageId: sent.id });
    } catch (error) {
      console.warn(`Panneau ${module.key} non envoye:`, error instanceof Error ? error.message : error);
    }
  }
}

export async function handleModuleMessage(message) {
  if (!message.guild || message.author.bot) {
    return false;
  }

  const module = modules.find((item) => item.channelId === message.channelId);
  if (!module) {
    return false;
  }

  if (module.readOnly) {
    await handleReadOnlyMessage(message, module);
    return true;
  }

  await message.reply(moduleTextResponse(module, message.content));
  return true;
}

export async function handleModuleButton(interaction) {
  if (!interaction.isButton() || !interaction.customId.startsWith("astral:")) {
    return false;
  }

  const [, area, action] = interaction.customId.split(":");

  if (area === "support") {
    await createSupportThread(interaction, action);
    return true;
  }

  if (area === "shop" && action === "order") {
    await interaction.reply({
      content: "Envoie ton numero de commande dans ce salon. Exemple: `AG-1024` ou `1024`.",
      ephemeral: true
    });
    return true;
  }

  if (area === "community") {
    await interaction.reply({ ...communityAction(action), ephemeral: true });
    return true;
  }

  return false;
}

function modulePanel(module) {
  return {
    embeds: [
      new EmbedBuilder()
        .setColor(moduleColor)
        .setTitle(module.heading)
        .setDescription(module.description)
        .addFields({ name: "Comment utiliser ce salon", value: module.prompt })
        .setFooter({ text: `${module.title} · Astral4Gamer` })
        .setTimestamp(new Date())
    ],
    components: rows(module.buttons)
  };
}

function moduleTextResponse(module, content) {
  const normalized = content.toLowerCase();
  const orderNumber = content.match(/\b(?:ag[-_ ]?)?\d{3,}\b/i)?.[0];

  if (module.key === "shop" && orderNumber) {
    return {
      embeds: [basicEmbed("Suivi de commande", `J'ai detecte la commande \`${orderNumber}\`.\n\nPour l'instant, ouvre le suivi officiel ou un ticket achat si le statut n'est pas clair.`)],
      components: rows([
        linkButton("Suivi officiel", `${siteBaseUrl}/profil`),
        button("Support achat", "astral:support:order", ButtonStyle.Primary)
      ])
    };
  }

  if (module.key === "live" && (normalized.includes("replay") || normalized.includes("video"))) {
    return {
      embeds: [basicEmbed("Replays Astral4Gamer", "Voici les replays et videos disponibles.")],
      components: rows([linkButton("Voir les replays", `${siteBaseUrl}/live/passe`), linkButton("Blog", `${siteBaseUrl}/blog`)])
    };
  }

  if (module.key === "community") {
    return communityAction(
      normalized.includes("role") ? "roles" : normalized.includes("regle") || normalized.includes("règle") ? "rules" : "giveaways"
    );
  }

  return {
    embeds: [basicEmbed(module.heading, module.prompt)],
    components: rows(module.buttons)
  };
}

async function handleReadOnlyMessage(message, module) {
  const response = {
    content: `${message.author}, ce salon est reserve aux annonces ${module.title}. Utilise les boutons du panneau ou ouvre un ticket.`,
    components: rows(module.buttons)
  };

  try {
    if (message.deletable && message.guild.members.me?.permissionsIn(message.channel).has(PermissionFlagsBits.ManageMessages)) {
      await message.delete();
    }
  } catch {
    // If deletion fails, keep the guidance reply below.
  }

  await message.channel.send(response);
}

async function createSupportThread(interaction, action) {
  const labels = {
    order: "commande",
    payment: "paiement",
    tournament: "tournoi",
    account: "compte",
    partner: "partenariat"
  };
  const label = labels[action] || "support";
  const channel = interaction.channel;

  if (!channel || !("threads" in channel)) {
    await interaction.reply({ content: "Impossible d'ouvrir un fil ici. Utilise le salon support.", ephemeral: true });
    return;
  }

  try {
    const thread = await channel.threads.create({
      name: `support-${label}-${interaction.user.username}`.slice(0, 90),
      autoArchiveDuration: 1440,
      type: ChannelType.PublicThread,
      reason: `Ticket ${label} Astral4Gamer`
    });

    await thread.send([
      `${interaction.user}, ticket **${label}** ouvert.`,
      "Explique le probleme avec les infos utiles:",
      "- numero de commande si achat",
      "- pseudo/UID si compte joueur",
      "- nom du tournoi si tournoi",
      "- lien reseau social si partenariat"
    ].join("\n"));

    await interaction.reply({ content: `Ticket ouvert: ${thread}`, ephemeral: true });
  } catch (error) {
    console.warn("Ticket non cree:", error instanceof Error ? error.message : error);
    await interaction.reply({ content: "Je n'ai pas pu ouvrir le fil. Verifie mes permissions: voir le salon, envoyer messages, creer des fils publics.", ephemeral: true });
  }
}

function communityAction(action) {
  if (action === "roles") {
    return {
      embeds: [basicEmbed("Roles par jeu", "Les roles servent a recevoir les annonces du bon jeu: Free Fire, PUBG, Fortnite, tournois, boutique et lives.")],
      components: rows([linkButton("Profil Astral4Gamer", `${siteBaseUrl}/profil`)])
    };
  }

  if (action === "rules") {
    return {
      embeds: [basicEmbed("Regles de la communaute", "Respect, pas de spam, pas d'arnaque, pas de partage de donnees sensibles. Les tickets servent aux problemes prives.")],
      components: []
    };
  }

  return {
    embeds: [basicEmbed("Giveaways et evenements", "Les giveaways et evenements seront annonces ici avec les conditions de participation.")],
    components: rows([linkButton("Voir les tournois", `${siteBaseUrl}/tournois`)])
  };
}

async function addDefaultReactions(module, message) {
  if (module.key !== "tournament") {
    return;
  }

  for (const reaction of ["✅", "🏆", "🔥"]) {
    try {
      await message.react(reaction);
    } catch {
      // Reactions are nice-to-have only.
    }
  }
}

function basicEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(moduleColor)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp(new Date());
}

function rows(buttons) {
  const chunks = [];

  for (let index = 0; index < buttons.length; index += 5) {
    chunks.push(new ActionRowBuilder().addComponents(buttons.slice(index, index + 5)));
  }

  return chunks;
}

function button(label, customId, style) {
  return new ButtonBuilder().setCustomId(customId).setStyle(style).setLabel(label);
}

function linkButton(label, url) {
  return new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel(label).setURL(url);
}

function env(name) {
  return process.env[name]?.trim() || "";
}

function boolEnv(name, fallback) {
  const value = process.env[name]?.trim().toLowerCase();

  if (!value) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value);
}
