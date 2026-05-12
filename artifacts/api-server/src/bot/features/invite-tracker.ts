import {
  Guild,
  GuildMember,
  Invite,
  Collection,
  EmbedBuilder,
} from "discord.js";
import {
  getInviteData,
  setInviteData,
  loadAllInviteData,
  updateInviteStats,
} from "../storage.js";
import { COLORS } from "../utils/embeds.js";

const cachedInvites = new Map<string, Collection<string, Invite>>();

export async function cacheGuildInvites(guild: Guild): Promise<void> {
  try {
    const invites = await guild.invites.fetch();
    cachedInvites.set(guild.id, invites);
  } catch {
    // Bot may not have MANAGE_GUILD permission
  }
}

export async function handleInviteCreate(invite: Invite): Promise<void> {
  if (!invite.guild) return;
  const guildId = invite.guild.id;
  const cached = cachedInvites.get(guildId) ?? new Collection<string, Invite>();
  cached.set(invite.code, invite);
  cachedInvites.set(guildId, cached);
}

export async function handleInviteDelete(invite: Invite): Promise<void> {
  if (!invite.guild) return;
  const cached = cachedInvites.get(invite.guild.id);
  if (cached) cached.delete(invite.code);
}

export async function handleInviteMemberAdd(member: GuildMember): Promise<void> {
  const guild = member.guild;
  const guildId = guild.id;

  const oldInvites = cachedInvites.get(guildId) ?? new Collection<string, Invite>();

  let newInvites: Collection<string, Invite>;
  try {
    newInvites = await guild.invites.fetch();
  } catch {
    return;
  }
  cachedInvites.set(guildId, newInvites);

  const usedInvite = newInvites.find((inv) => {
    const old = oldInvites.get(inv.code);
    return (inv.uses ?? 0) > (old?.uses ?? 0);
  });

  const inviterId = usedInvite?.inviter?.id;
  if (!inviterId) return;

  updateInviteStats(guildId, inviterId, {
    regular: 1,
    left: 0,
    fake: 0,
    bonus: 0,
  });

  const data = getInviteData(guildId, inviterId);
  const joinedMembers = data.joinedMembers ?? [];
  joinedMembers.push({ userId: member.id, joinedAt: Date.now(), left: false });
  setInviteData(guildId, inviterId, { ...data, joinedMembers });
}

export async function handleInviteMemberRemove(member: GuildMember): Promise<void> {
  const guildId = member.guild.id;
  const allData = loadAllInviteData(guildId);

  for (const [inviterId, invData] of Object.entries(allData)) {
    const joined = invData.joinedMembers ?? [];
    const entry = joined.find((j) => j.userId === member.id && !j.left);
    if (entry) {
      entry.left = true;
      setInviteData(guildId, inviterId, invData);
      updateInviteStats(guildId, inviterId, {
        regular: 0,
        left: 1,
        fake: 0,
        bonus: 0,
      });
      break;
    }
  }
}

export function inviteLeaderboardEmbed(
  guildName: string,
  entries: Array<{ userId: string; total: number; regular: number; left: number; bonus: number }>,
): EmbedBuilder {
  const medals = ["🥇", "🥈", "🥉"];

  const description =
    entries.length === 0
      ? "*Noch keine Einladungen vorhanden.*"
      : entries
          .slice(0, 10)
          .map((e, i) => {
            const medal = medals[i] ?? `**${i + 1}.**`;
            const net = e.regular + e.bonus - e.left;
            return (
              `${medal} <@${e.userId}> — **${net}** Einladungen\n` +
              `╰ ✅ ${e.regular} regulär  •  ❌ ${e.left} verlassen  •  🎁 ${e.bonus} Bonus`
            );
          })
          .join("\n\n");

  return new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle(`📨  Invite Leaderboard — ${guildName}`)
    .setDescription(description)
    .setFooter({ text: "Invite Tracker • Top 10" })
    .setTimestamp();
}

export function inviteStatsEmbed(
  userId: string,
  stats: { regular: number; left: number; fake: number; bonus: number },
  rank: number,
): EmbedBuilder {
  const net = stats.regular + stats.bonus - stats.left - stats.fake;

  return new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle("📨  Deine Einladungen")
    .setDescription(
      `<@${userId}> hat insgesamt **${net} aktive** Einladungen.\n\n` +
      `> ✅ **${stats.regular}** reguläre Einladungen\n` +
      `> ❌ **${stats.left}** Mitglieder verlassen\n` +
      `> 🚫 **${stats.fake}** gefälschte Einladungen\n` +
      `> 🎁 **${stats.bonus}** Bonus-Einladungen\n\n` +
      `📊 Rang: **#${rank}**`,
    )
    .setFooter({ text: "Invite Tracker" })
    .setTimestamp();
}
