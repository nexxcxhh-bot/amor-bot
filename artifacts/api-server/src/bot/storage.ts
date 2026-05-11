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

interface StorageData {
  guilds: Record<string, GuildConfig>;
  tickets: Record<string, TicketData>;
  ticketCounters: Record<string, number>;
  pendingFeedback: Record<string, PendingFeedback>;
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
      enabled: false,
      timeoutMinutes: 10,
      customWords: [],
    },
  };
}

function loadData(): StorageData {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(DATA_FILE))
    return { guilds: {}, tickets: {}, ticketCounters: {}, pendingFeedback: {} };
  try {
    return JSON.parse(readFileSync(DATA_FILE, "utf-8")) as StorageData;
  } catch {
    return { guilds: {}, tickets: {}, ticketCounters: {}, pendingFeedback: {} };
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
