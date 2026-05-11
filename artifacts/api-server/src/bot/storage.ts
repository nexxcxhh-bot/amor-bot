import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const DATA_DIR = join(process.cwd(), "data");
const DATA_FILE = join(DATA_DIR, "bot-data.json");

export interface RaidProtectionConfig {
  enabled: boolean;
  joinThreshold: number;
  timeWindowSeconds: number;
  action: "kick" | "ban" | "lockdown";
}

export interface NukeProtectionConfig {
  enabled: boolean;
  channelDeleteThreshold: number;
  roleDeleteThreshold: number;
  banThreshold: number;
  action: "kick" | "ban";
}

export interface ToxicFilterConfig {
  enabled: boolean;
  timeoutMinutes: number;
  customWords: string[];
}

export interface WelcomeConfig {
  enabled: boolean;
  channelId?: string;
  message?: string;
  dmUser: boolean;
}

export interface VerifyConfig {
  enabled: boolean;
  roleId?: string;
  channelId?: string;
}

export interface RulesConfig {
  enabled: boolean;
  acceptRoleId?: string;
  channelId?: string;
  rules: string[];
}

export interface GuildConfig {
  ticketCategoryId?: string;
  ticketLogChannelId?: string;
  ticketSupportRoleId?: string;
  feedbackChannelId?: string;
  statsCategoryId?: string;
  memberCountChannelId?: string;
  botCountChannelId?: string;
  ticketCountChannelId?: string;
  raidProtection: RaidProtectionConfig;
  nukeProtection: NukeProtectionConfig;
  toxicFilter: ToxicFilterConfig;
  welcome: WelcomeConfig;
  verify: VerifyConfig;
  rules: RulesConfig;
}

export interface TicketData {
  channelId: string;
  userId: string;
  guildId: string;
  createdAt: number;
  status: "open" | "closed";
  topic?: string;
  ticketNumber: number;
}

export interface PendingFeedback {
  ticketChannelId: string;
  guildId: string;
  userId: string;
  topic?: string;
  ticketNumber: number;
}

export interface GiveawayData {
  messageId: string;
  channelId: string;
  guildId: string;
  prize: string;
  winners: number;
  endsAt: number;
  hostId: string;
  ended: boolean;
  winnerIds: string[];
}

interface StorageData {
  guilds: Record<string, GuildConfig>;
  tickets: Record<string, TicketData>;
  ticketCounters: Record<string, number>;
  pendingFeedback: Record<string, PendingFeedback>;
  giveaways: Record<string, GiveawayData>;
  giveawayEntries: Record<string, string[]>;
}

function defaultGuildConfig(): GuildConfig {
  return {
    raidProtection: {
      enabled: false,
      joinThreshold: 10,
      timeWindowSeconds: 10,
      action: "kick",
    },
    nukeProtection: {
      enabled: false,
      channelDeleteThreshold: 3,
      roleDeleteThreshold: 2,
      banThreshold: 5,
      action: "kick",
    },
    toxicFilter: {
      enabled: true,
      timeoutMinutes: 10,
      customWords: [],
    },
    welcome: {
      enabled: true,
      dmUser: true,
      message: undefined,
    },
    verify: {
      enabled: true,
    },
    rules: {
      enabled: true,
      rules: [
        "**Respekt & Verhalten** — Behandle alle Mitglieder respektvoll. Keine Beleidigungen, Provokationen oder Diskriminierung (Rassismus, Sexismus etc.).",
        "**Chat Regeln** — Kein Spam, keine Capslock-Nachrichten und bleib im richtigen Channel beim Thema.",
        "**Werbung** — Werbung ist nur mit Erlaubnis erlaubt. Kein DM-Werben an andere Mitglieder.",
        "**Inhalte** — Keine NSFW-, Gewalt- oder illegalen Inhalte. Keine beleidigenden Bilder oder Videos.",
        "**Voice Chat** — Respektvoll sprechen. Kein Schreien, kein Soundboard-Spam, andere nicht absichtlich stören.",
        "**Support** — Support nur in dafür vorgesehenen Channels oder über das Ticket-System.",
        "**Konsequenzen** — Regelverstöße können zu einem Mute, Kick oder permanenten Bann führen.",
      ],
    },
  };
}

function loadData(): StorageData {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  const empty: StorageData = { guilds: {}, tickets: {}, ticketCounters: {}, pendingFeedback: {}, giveaways: {}, giveawayEntries: {} };
  if (!existsSync(DATA_FILE)) return empty;
  try {
    return JSON.parse(readFileSync(DATA_FILE, "utf-8")) as StorageData;
  } catch {
    return empty;
  }
}

function saveData(data: StorageData): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export function getGuildConfig(guildId: string): GuildConfig {
  const data = loadData();
  const defaults = defaultGuildConfig();
  const existing = data.guilds[guildId];
  if (!existing) {
    data.guilds[guildId] = defaults;
    saveData(data);
    return defaults;
  }
  return {
    ...defaults,
    ...existing,
    raidProtection: { ...defaults.raidProtection, ...existing.raidProtection },
    nukeProtection: { ...defaults.nukeProtection, ...existing.nukeProtection },
    toxicFilter: { ...defaults.toxicFilter, ...existing.toxicFilter },
  };
}

export function setGuildConfig(
  guildId: string,
  config: Partial<GuildConfig>,
): void {
  const data = loadData();
  const existing = data.guilds[guildId] ?? defaultGuildConfig();
  data.guilds[guildId] = { ...existing, ...config };
  saveData(data);
}

export function getTicket(channelId: string): TicketData | undefined {
  return loadData().tickets[channelId];
}

export function setTicket(channelId: string, ticket: TicketData): void {
  const data = loadData();
  data.tickets[channelId] = ticket;
  saveData(data);
}

export function deleteTicket(channelId: string): void {
  const data = loadData();
  delete data.tickets[channelId];
  saveData(data);
}

export function incrementTicketCounter(guildId: string): number {
  const data = loadData();
  const count = (data.ticketCounters[guildId] ?? 0) + 1;
  data.ticketCounters[guildId] = count;
  saveData(data);
  return count;
}

export function setPendingFeedback(
  userId: string,
  feedback: PendingFeedback,
): void {
  const data = loadData();
  data.pendingFeedback[userId] = feedback;
  saveData(data);
}

export function getPendingFeedback(userId: string): PendingFeedback | undefined {
  return loadData().pendingFeedback[userId];
}

export function deletePendingFeedback(userId: string): void {
  const data = loadData();
  delete data.pendingFeedback[userId];
  saveData(data);
}

export function getOpenTicketCount(guildId: string): number {
  const data = loadData();
  return Object.values(data.tickets).filter(
    (t) => t.guildId === guildId && t.status === "open",
  ).length;
}
