import { SlashCommandBuilder } from "discord.js";

export const commands = [
  new SlashCommandBuilder()
    .setName("profil")
    .setDescription("Recherche un profil joueur via Astral4Gamer.")
    .addStringOption((option) =>
      option
        .setName("jeu")
        .setDescription("Jeu du joueur")
        .setRequired(true)
        .addChoices(
          { name: "Free Fire", value: "free_fire" },
          { name: "PUBG", value: "pubg" },
          { name: "Fortnite", value: "fortnite" }
        )
    )
    .addStringOption((option) =>
      option
        .setName("identifiant")
        .setDescription("ID joueur, pseudo PUBG ou ID de compte Fortnite")
        .setRequired(true)
        .setMaxLength(120)
    )
    .addStringOption((option) =>
      option
        .setName("region")
        .setDescription("Région Free Fire")
        .setRequired(false)
        .addChoices(
          { name: "ME", value: "me" },
          { name: "SG", value: "sg" },
          { name: "IND", value: "ind" },
          { name: "BR", value: "br" },
          { name: "US", value: "us" },
          { name: "BD", value: "bd" },
          { name: "PK", value: "pk" },
          { name: "ID", value: "id" }
        )
    )
    .addStringOption((option) =>
      option
        .setName("plateforme")
        .setDescription("Plateforme PUBG")
        .setRequired(false)
        .addChoices(
          { name: "Steam", value: "steam" },
          { name: "Kakao", value: "kakao" },
          { name: "Xbox", value: "xbox" },
          { name: "PlayStation", value: "psn" },
          { name: "Stadia", value: "stadia" }
        )
    ),
  new SlashCommandBuilder()
    .setName("quota")
    .setDescription("Affiche ton quota de recherches Discord."),
  new SlashCommandBuilder()
    .setName("aide")
    .setDescription("Explique comment utiliser Astral Scout."),
  new SlashCommandBuilder()
    .setName("site")
    .setDescription("Affiche le lien de la recherche officielle Astral4Gamer."),
  new SlashCommandBuilder()
    .setName("partenariat")
    .setDescription("Ouvre le formulaire officiel de demande partenaire Astral4Gamer.")
].map((command) => command.toJSON());
