import {
  GuildMember,
  Guild,
  TextChannel,
  PermissionFlagsBits,
} from "discord.js";
import { getGuildConfig } from "../storage.js";
import { raidAlertEmbed } from "../utils/embeds.js";

const joinTracker = new Map<string, number[]>();

export async function handleRaidMemberAdd(member: GuildMember): Promise<void> {
  if (!member.guild) return;
  const config = getGuildConfig(member.guild.id);
  if (!config.raidProtection.enabled) return;

  const { joinThreshold, timeWindowSeconds, action } = config.raidProtection;
  const guildId = member.guild.id;
  const now = Date.now();

  if (!joinTracker.has(guildId)) joinTracker.set(guildId, []);
  const timestamps = joinTracker.get(guildId)!;
  timestamps.push(now);

  const cutoff = now - timeWindowSeconds * 1000;
  const recent = timestamps.filter((t) => t > cutoff);
  joinTracker.set(guildId, recent);

  if (recent.length >= joinThreshold) {
    joinTracker.delete(guildId);
    await handleRaidDetected(member.guild, recent.length, action);
  }
}

async function handleRaidDetected(
  guild: Guild,
  joinCount: number,
  action: string,
): Promise<void> {
  try {
    const members = await guild.members.fetch();
    const now = Date.now();
    const recentJoins = members.filter(
      (m) =>
        !m.user.bot &&
        m.joinedTimestamp != null &&
        now - m.joinedTimestamp < 30_000,
    );

    for (const [, member] of recentJoins) {
      try {
        if (
          action === "kick" &&
          guild.members.me?.permissions.has(PermissionFlagsBits.KickMembers)
        ) {
          await member.kick("Raid protection triggered");
        } else if (
          action === "ban" &&
          guild.members.me?.permissions.has(PermissionFlagsBits.BanMembers)
        ) {
          await member.ban({
            reason: "Raid protection triggered",
            deleteMessageSeconds: 86400,
          });
        }
      } catch {
        /* individual errors */
      }
    }

    if (action === "lockdown") {
      const textChannels = guild.channels.cache.filter((c) => c.isTextBased());
      for (const [, ch] of textChannels) {
        try {
          if ("permissionOverwrites" in ch) {
            await ch.permissionOverwrites.edit(guild.roles.everyone, {
              SendMessages: false,
            });
          }
        } catch {
          /* ignore */
        }
      }
    }

    const logChannel =
      guild.systemChannel ??
      (guild.channels.cache.find((c) => c.isTextBased()) as
        | TextChannel
        | undefined);
    if (logChannel && "send" in logChannel) {
      await logChannel.send({ embeds: [raidAlertEmbed(joinCount, action)] });
    }
  } catch {
    /* ignore */
  }
}
