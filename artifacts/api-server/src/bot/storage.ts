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

export interface InviteData {
  regular: number;
  left: number;
  fake: number;
  bonus: number;
  joinedMembers?: Array<{ userId: string; joinedAt: number; left: boolean }>;
}

interface StorageData {
  guilds: Record<string, GuildConfig>;
  tickets: Record<string, TicketData>;
  ticketCounters: Record<string, number>;
  pendingFeedback: Record<string, PendingFeedback>;
  giveaways: Record<string, GiveawayData>;
  giveawayEntries: Record<string, string[]>;
  invites: Record<string, Record<string, InviteData>>;
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
        "**Respekt & Verhalten** — Behandle alle Mitglieder mit Respekt und auf Augenhöhe. Beleidigungen, Provokationen, Diskriminierung (Rassismus, Sexismus, Homophobie etc.) sowie Mobbing sind strengstens verboten.",
        "**Sprache & Kommunikation** — Kommuniziere respektvoll und verständlich. Übermäßige Beleidigungen, Hatespeech oder absichtlich verletzende Aussagen werden nicht toleriert.",
        "**Chat Regeln & Spam** — Kein Spam, kein Flooding, keine sinnlosen Nachrichten. Keine Capslock-Nachrichten (Schreien). Bleib stets beim Thema des jeweiligen Channels.",
        "**Werbung & Eigenwerbung** — Werbung für andere Server, Produkte oder Dienste ist nur mit ausdrücklicher Genehmigung erlaubt. Kein DM-Spammen an andere Mitglieder. Eigenwerbung nur im dafür vorgesehenen Channel.",
        "**NSFW & Illegale Inhalte** — Keine pornografischen, expliziten oder sexuellen Inhalte. Keine Gewaltdarstellungen, Tierquälerei oder anderweitig illegale Inhalte. Verstöße werden direkt gebannt.",
        "**Bilder & Medien** — Keine beleidigenden, rassistischen oder anstößigen Bilder, GIFs oder Videos. Kein Doxxing (Veröffentlichen privater Daten anderer Personen).",
        "**Voice Chat** — Respektvoller Umgang im Voice. Kein Schreien, kein Soundboard-Spam, andere nicht absichtlich stören oder übertönen. Keine beleidigenden Sounds oder Musik ohne Erlaubnis.",
        "**Profilbild & Nutzername** — Kein anstößiges Profilbild oder beleidigender Nutzername. Admins behalten sich vor, Nutzer mit unangemessenen Profilen zu kicken.",
        "**Account-Regeln** — Keine Bots oder Alt-Accounts ohne Erlaubnis. Kein Account-Sharing. Jeder ist für sein eigenes Konto verantwortlich.",
        "**Moderatoren & Admins** — Entscheidungen des Moderationsteams sind zu respektieren. Diskussionen über Maßnahmen bitte nur per Ticket — kein öffentliches Drama.",
        "**Support & Tickets** — Fragen und Probleme bitte ausschließlich über das Ticket-System oder den Support-Channel. Kein direktes Anschreiben von Teammitgliedern wegen Support.",
        "**Konsequenzen** — Regelverstöße werden je nach Schwere mit einem Verwarnungs-Timeout (10–60 Min.), Kick oder permanentem Bann geahndet. Das Team entscheidet nach eigenem Ermessen.",
      ],
    },
  };
}

function loadData(): StorageData {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  const empty: StorageData = { guilds: {}, tickets: {}, ticketCounters: {}, pendingFeedback: {}, giveaways: {}, giveawayEntries: {}, invites: {} };
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

const defaultInviteData = (): InviteData => ({
  regular: 0,
  left: 0,
  fake: 0,
  bonus: 0,
  joinedMembers: [],
});

export function getInviteData(guildId: string, userId: string): InviteData {
  const data = loadData();
  return data.invites?.[guildId]?.[userId] ?? defaultInviteData();
}

export function setInviteData(guildId: string, userId: string, invite: InviteData): void {
  const data = loadData();
  if (!data.invites) data.invites = {};
  if (!data.invites[guildId]) data.invites[guildId] = {};
  data.invites[guildId]![userId] = invite;
  saveData(data);
}

export function loadAllInviteData(guildId: string): Record<string, InviteData> {
  const data = loadData();
  return data.invites?.[guildId] ?? {};
}

export function updateInviteStats(
  guildId: string,
  userId: string,
  delta: { regular: number; left: number; fake: number; bonus: number },
): void {
  const data = loadData();
  if (!data.invites) data.invites = {};
  if (!data.invites[guildId]) data.invites[guildId] = {};
  const existing = data.invites[guildId]![userId] ?? defaultInviteData();
  data.invites[guildId]![userId] = {
    ...existing,
    regular: existing.regular + delta.regular,
    left: existing.left + delta.left,
    fake: existing.fake + delta.fake,
    bonus: existing.bonus + delta.bonus,
  };
  saveData(data);
}
