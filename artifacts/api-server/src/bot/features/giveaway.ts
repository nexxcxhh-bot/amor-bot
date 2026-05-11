import {
  Client,
  TextChannel,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
} from "discord.js";
import type { GiveawayData } from "../storage.js";

let _client: Client | null = null;
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function loadStorage(): { giveaways: Record<string, GiveawayData>; giveawayEntries: Record<string, string[]> } {
  const { readFileSync, existsSync } = require("node:fs");
  const { join } = require("node:path");
  const DATA_FILE = join(process.cwd(), "data", "bot-data.json");
  const empty = { giveaways: {} as Record<string, GiveawayData>, giveawayEntries: {} as Record<string, string[]> };
  if (!existsSync(DATA_FILE)) return empty;
  try {
    const parsed = JSON.parse(readFileSync(DATA_FILE, "utf-8")) as Record<string, unknown>;
    return {
      giveaways: (parsed["giveaways"] as Record<string, GiveawayData>) ?? {},
      giveawayEntries: (parsed["giveawayEntries"] as Record<string, string[]>) ?? {},
    };
  } catch {
    return empty;
  }
}

function saveStorage(
  giveaways: Record<string, GiveawayData>,
  giveawayEntries: Record<string, string[]>,
) {
  const { readFileSync, writeFileSync, existsSync, mkdirSync } = require("node:fs");
  const { join } = require("node:path");
  const DATA_DIR = join(process.cwd(), "data");
  const DATA_FILE = join(DATA_DIR, "bot-data.json");
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

  let existing: Record<string, unknown> = {};
  if (existsSync(DATA_FILE)) {
    try {
      existing = JSON.parse(readFileSync(DATA_FILE, "utf-8"));
    } catch {}
  }
  writeFileSync(DATA_FILE, JSON.stringify({ ...existing, giveaways, giveawayEntries }, null, 2));
}

export function getGiveaway(messageId: string): GiveawayData | undefined {
  return loadStorage().giveaways[messageId];
}

export function setGiveaway(messageId: string, data: GiveawayData) {
  const s = loadStorage();
  s.giveaways[messageId] = data;
  saveStorage(s.giveaways, s.giveawayEntries);
}

export function getEntries(messageId: string): string[] {
  return loadStorage().giveawayEntries[messageId] ?? [];
}

export function setEntries(messageId: string, entries: string[]) {
  const s = loadStorage();
  s.giveawayEntries[messageId] = entries;
  saveStorage(s.giveaways, s.giveawayEntries);
}

export function getActiveGiveaways(): GiveawayData[] {
  const s = loadStorage();
  return Object.values(s.giveaways).filter((g) => !g.ended);
}

// ─── Embed builders ────────────────────────────────────────────────────────────

export function buildGiveawayEmbed(g: GiveawayData, entryCount: number): EmbedBuilder {
  const ended = g.ended || Date.now() > g.endsAt;
  const timeStr = ended
    ? "**Ended**"
    : `<t:${Math.floor(g.endsAt / 1000)}:R>`;

  return new EmbedBuilder()
    .setColor(ended ? 0x2b2d31 : 0xfee75c)
    .setTitle(`🎉  ${g.prize}`)
    .setDescription(
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      (ended && g.winnerIds.length > 0
        ? `🏆  **Winner(s):** ${g.winnerIds.map((id) => `<@${id}>`).join(", ")}\n\n`
        : ended
        ? `❌  No valid entries.\n\n`
        : `> Click **🎉 Enter** to participate!\n\n`) +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    )
    .addFields(
      { name: "⏰  Ends", value: timeStr, inline: true },
      { name: "🏆  Winners", value: `**${g.winners}**`, inline: true },
      { name: "🎟️  Entries", value: `**${entryCount}**`, inline: true },
      { name: "👤  Hosted by", value: `<@${g.hostId}>`, inline: true },
    )
    .setFooter({ text: ended ? "Giveaway ended" : "Giveaway • Click to enter" })
    .setTimestamp(new Date(g.endsAt));
}

function buildGiveawayRow(ended: boolean, entryCount: number): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("giveaway_enter")
      .setLabel(ended ? "Giveaway Ended" : `🎉 Enter  (${entryCount})`)
      .setStyle(ended ? ButtonStyle.Secondary : ButtonStyle.Primary)
      .setDisabled(ended),
  );
}

// ─── Handle enter/leave ────────────────────────────────────────────────────────

export async function handleGiveawayEnter(interaction: ButtonInteraction): Promise<void> {
  const giveaway = getGiveaway(interaction.message.id);
  if (!giveaway || giveaway.ended || Date.now() > giveaway.endsAt) {
    await interaction.reply({ content: "This giveaway has already ended.", ephemeral: true });
    return;
  }

  const entries = getEntries(interaction.message.id);
  const userId = interaction.user.id;
  const idx = entries.indexOf(userId);

  if (idx === -1) {
    entries.push(userId);
    setEntries(interaction.message.id, entries);
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57f287)
          .setDescription(`✅  You have entered the **${giveaway.prize}** giveaway! Good luck! 🍀`),
      ],
      ephemeral: true,
    });
  } else {
    entries.splice(idx, 1);
    setEntries(interaction.message.id, entries);
    await interaction.reply({
      content: "❌  You have left the giveaway.",
      ephemeral: true,
    });
  }

  // Update embed with new count
  await interaction.message
    .edit({
      embeds: [buildGiveawayEmbed(giveaway, entries.length)],
      components: [buildGiveawayRow(false, entries.length)],
    })
    .catch(() => null);
}

// ─── End giveaway ─────────────────────────────────────────────────────────────

export async function endGiveaway(
  giveaway: GiveawayData,
  client: Client,
): Promise<void> {
  if (giveaway.ended) return;

  const entries = getEntries(giveaway.messageId);
  const shuffled = [...entries].sort(() => Math.random() - 0.5);
  const winnerIds = shuffled.slice(0, Math.min(giveaway.winners, shuffled.length));

  giveaway.ended = true;
  giveaway.winnerIds = winnerIds;
  setGiveaway(giveaway.messageId, giveaway);

  try {
    const guild = await client.guilds.fetch(giveaway.guildId);
    const channel = guild.channels.cache.get(giveaway.channelId) as TextChannel | undefined;
    if (!channel) return;

    const message = await channel.messages.fetch(giveaway.messageId);
    await message.edit({
      embeds: [buildGiveawayEmbed(giveaway, entries.length)],
      components: [buildGiveawayRow(true, entries.length)],
    });

    if (winnerIds.length > 0) {
      await channel.send({
        content:
          `🎉  Congratulations ${winnerIds.map((id) => `<@${id}>`).join(", ")}! ` +
          `You won the **${giveaway.prize}** giveaway!`,
      });
    } else {
      await channel.send({
        content: `😔  No one entered the **${giveaway.prize}** giveaway. No winner selected.`,
      });
    }
  } catch {
    /* ignore */
  }
}

// ─── Schedule & restore ───────────────────────────────────────────────────────

export function scheduleGiveaway(giveaway: GiveawayData, client: Client): void {
  const delay = giveaway.endsAt - Date.now();
  if (delay <= 0) {
    endGiveaway(giveaway, client);
    return;
  }
  const timer = setTimeout(() => endGiveaway(giveaway, client), delay);
  timers.set(giveaway.messageId, timer);
}

export function restoreGiveaways(client: Client): void {
  _client = client;
  const active = getActiveGiveaways();
  for (const g of active) {
    scheduleGiveaway(g, client);
  }
  if (active.length > 0) {
    console.log(`[Bot] Restored ${active.length} active giveaway(s).`);
  }
}

export function parseDuration(input: string): number | null {
  const match = input.trim().match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return null;
  const val = parseInt(match[1]!, 10);
  const unit = match[2]!.toLowerCase();
  const multipliers: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return val * (multipliers[unit] ?? 0);
}
