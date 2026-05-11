import {
  GuildChannel,
  Role,
  Guild,
  TextChannel,
  PermissionFlagsBits,
  AuditLogEvent,
} from "discord.js";
import { getGuildConfig } from "../storage.js";
import { nukeAlertEmbed } from "../utils/embeds.js";

interface Tracker {
  channelDeletes: number[];
  roleDeletes: number[];
  bans: number[];
}

const actionTracker = new Map<string, Tracker>();
const TIME_WINDOW = 10_000;

function getTracker(guildId: string): Tracker {
  if (!actionTracker.has(guildId)) {
    actionTracker.set(guildId, {
      channelDeletes: [],
      roleDeletes: [],
      bans: [],
    });
  }
  return actionTracker.get(guildId)!;
}

function pushAndCheck(arr: number[], threshold: number): boolean {
  const now = Date.now();
  const recent = arr.filter((t) => now - t < TIME_WINDOW);
  recent.push(now);
  arr.length = 0;
  arr.push(...recent);
  return recent.length >= threshold;
}

async function punishExecutor(
  guild: Guild,
  executorId: string,
  action: "kick" | "ban",
  type: string,
  count: number,
): Promise<void> {
  try {
    if (
      executorId === guild.members.me?.id ||
      executorId === guild.ownerId
    )
      return;

    const member =
      guild.members.cache.get(executorId) ??
      (await guild.members.fetch(executorId).catch(() => null));
    if (!member) return;

    if (
      action === "kick" &&
      guild.members.me?.permissions.has(PermissionFlagsBits.KickMembers)
    ) {
      await member.kick(`Nuke protection: rapid ${type}`);
    } else if (
      action === "ban" &&
      guild.members.me?.permissions.has(PermissionFlagsBits.BanMembers)
    ) {
      await member.ban({ reason: `Nuke protection: rapid ${type}` });
    }

    const logChannel =
      guild.systemChannel ??
      (guild.channels.cache.find((c) => c.isTextBased()) as
        | TextChannel
        | undefined);
    if (logChannel && "send" in logChannel) {
      await logChannel.send({
        embeds: [nukeAlertEmbed(type, count, action)],
      });
    }
  } catch {
    /* ignore */
  }
}

export async function handleChannelDelete(
  channel: GuildChannel,
): Promise<void> {
  const config = getGuildConfig(channel.guild.id);
  if (!config.nukeProtection.enabled) return;

  const tracker = getTracker(channel.guild.id);
  if (!pushAndCheck(tracker.channelDeletes, config.nukeProtection.channelDeleteThreshold))
    return;

  tracker.channelDeletes.length = 0;

  try {
    const logs = await channel.guild.fetchAuditLogs({
      type: AuditLogEvent.ChannelDelete,
      limit: 1,
    });
    const executor = logs.entries.first()?.executor;
    if (executor) {
      await punishExecutor(
        channel.guild,
        executor.id,
        config.nukeProtection.action,
        "channel-delete",
        config.nukeProtection.channelDeleteThreshold,
      );
    }
  } catch {
    /* ignore */
  }
}

export async function handleRoleDelete(role: Role): Promise<void> {
  if (!role.guild) return;
  const config = getGuildConfig(role.guild.id);
  if (!config.nukeProtection.enabled) return;

  const tracker = getTracker(role.guild.id);
  if (!pushAndCheck(tracker.roleDeletes, config.nukeProtection.roleDeleteThreshold))
    return;

  tracker.roleDeletes.length = 0;

  try {
    const logs = await role.guild.fetchAuditLogs({
      type: AuditLogEvent.RoleDelete,
      limit: 1,
    });
    const executor = logs.entries.first()?.executor;
    if (executor) {
      await punishExecutor(
        role.guild,
        executor.id,
        config.nukeProtection.action,
        "role-delete",
        config.nukeProtection.roleDeleteThreshold,
      );
    }
  } catch {
    /* ignore */
  }
}

export async function handleGuildBan(guild: Guild): Promise<void> {
  const config = getGuildConfig(guild.id);
  if (!config.nukeProtection.enabled) return;

  const tracker = getTracker(guild.id);
  if (!pushAndCheck(tracker.bans, config.nukeProtection.banThreshold)) return;

  tracker.bans.length = 0;

  try {
    const logs = await guild.fetchAuditLogs({
      type: AuditLogEvent.MemberBanAdd,
      limit: 1,
    });
    const executor = logs.entries.first()?.executor;
    if (executor) {
      await punishExecutor(
        guild,
        executor.id,
        config.nukeProtection.action,
        "mass-ban",
        config.nukeProtection.banThreshold,
      );
    }
  } catch {
    /* ignore */
  }
}
