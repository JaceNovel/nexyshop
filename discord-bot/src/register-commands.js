import "dotenv/config";
import { REST, Routes } from "discord.js";
import { commands } from "./commands.js";

const token = requiredEnv("DISCORD_BOT_TOKEN");
const clientId = requiredEnv("DISCORD_CLIENT_ID");
const guildId = process.env.DISCORD_GUILD_ID?.trim();
const rest = new REST({ version: "10" }).setToken(token);

const route = guildId
  ? Routes.applicationGuildCommands(clientId, guildId)
  : Routes.applicationCommands(clientId);

await rest.put(route, { body: commands });

console.log(guildId
  ? `Commandes enregistrées sur le serveur ${guildId}.`
  : "Commandes globales enregistrées.");

function requiredEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Configuration manquante: ${name}`);
  }

  return value;
}
