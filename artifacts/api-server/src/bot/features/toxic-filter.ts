import { Message, PermissionFlagsBits } from "discord.js";
import { getGuildConfig } from "../storage.js";
import { toxicAlertEmbed } from "../utils/embeds.js";

const BASE_TOXIC_PATTERNS = [
  "kys",
  "kill yourself",
  "kill ur self",
  "kms",
  "rope yourself",
  "hang yourself",
  "go die",
  "i will kill you",
  "i will murder you",
  "bomb threat",
  "shoot you",
  "shoot up",
  "faggot",
  "retard",
  "retarded",
  "nigger",
  "nigga",
  "spic",
  "chink",
  "kike",
  "wetback",
  "cunt",
  "whore",
  "slut",
  "die bitch",
  "stfu bitch",
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[àáâãäå]/g, "a")
    .replace(/[èéêë]/g, "e")
    .replace(/[ìíîï]/g, "i")
    .replace(/[òóôõö]/g, "o")
    .replace(/[ùúûü]/g, "u")
    .replace(/[@4]/g, "a")
    .replace(/[3]/g, "e")
    .replace(/[1!|]/g, "i")
    .replace(/[0]/g, "o")
    .replace(/[5$]/g, "s")
    .replace(/[7]/g, "t")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isToxic(content: string, customWords: string[]): boolean {
  const normalized = normalize(content);

  for (const pattern of BASE_TOXIC_PATTERNS) {
    if (normalized.includes(pattern)) return true;
  }

  for (const word of customWords) {
    if (normalized.includes(normalize(word))) return true;
  }

  return false;
}

export async function handleToxicMessage(message: Message): Promise<void> {
  if (!message.guild || message.author.bot) return;

  const config = getGuildConfig(message.guild.id);
  if (!config.toxicFilter.enabled) return;

  const member = message.member;
  if (!member) return;

  if (member.permissions.has(PermissionFlagsBits.ManageMessages)) return;

  if (!isToxic(message.content, config.toxicFilter.customWords)) return;

  try {
    await message.delete().catch(() => null);

    const timeoutMs = config.toxicFilter.timeoutMinutes * 60 * 1000;
    await member.timeout(timeoutMs, "Toxic behavior detected by auto-filter");

    if (!("send" in message.channel)) return;
    const warning = await message.channel.send({
      embeds: [
        toxicAlertEmbed(message.author.username, config.toxicFilter.timeoutMinutes),
      ],
    });

    setTimeout(() => warning.delete().catch(() => null), 8_000);
  } catch {
    /* insufficient permissions */
  }
}
