import { EmbedBuilder } from "discord.js";
import type { GuildConfig } from "../storage.js";

const COLORS = {
  primary: 0x5865f2,
  success: 0x57f287,
  warning: 0xfee75c,
  danger: 0xed4245,
  neutral: 0x2b2d31,
} as const;

export function ticketPanelEmbed(
  title: string,
  description: string,
): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle(`🎫  ${title}`)
    .setDescription(description)
    .setFooter({ text: "Click the button below to open a ticket" })
    .setTimestamp();
}

export function ticketOpenedEmbed(
  userMention: string,
  ticketNumber: number,
): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle(`Ticket #${String(ticketNumber).padStart(4, "0")}`)
    .setDescription(
      `Welcome ${userMention}! A staff member will be with you shortly.\n\n` +
        `Please describe your issue in detail and we will assist you as fast as possible.\n\n` +
        `To close this ticket, click the **Close Ticket** button below.`,
    )
    .setFooter({ text: "Support Ticket System" })
    .setTimestamp();
}

export function ticketClosedEmbed(closedByMention: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.danger)
    .setTitle("🔒  Ticket Closed")
    .setDescription(
      `This ticket was closed by ${closedByMention}.\n\nThis channel will be deleted in **5 seconds**.`,
    )
    .setFooter({ text: "Ticket System" })
    .setTimestamp();
}

export function feedbackEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle("📝  How was your support experience?")
    .setDescription(
      "Your ticket has been closed. We would love your feedback!\n\n" +
        "**⭐** — Very bad\n" +
        "**⭐⭐** — Bad\n" +
        "**⭐⭐⭐** — Okay\n" +
        "**⭐⭐⭐⭐** — Good\n" +
        "**⭐⭐⭐⭐⭐** — Excellent\n\n" +
        "*Click a rating below:*",
    )
    .setFooter({ text: "Your feedback helps us improve" });
}

export function feedbackReceivedEmbed(
  userId: string,
  rating: number,
  ticketNumber: number,
): EmbedBuilder {
  const stars = "⭐".repeat(rating);
  const labels = ["", "Very Bad", "Bad", "Okay", "Good", "Excellent"];
  const label = labels[rating] ?? "Unknown";
  const color =
    rating >= 4 ? COLORS.success : rating >= 3 ? COLORS.warning : COLORS.danger;

  return new EmbedBuilder()
    .setColor(color)
    .setTitle("📬  New Support Feedback")
    .addFields(
      { name: "User", value: `<@${userId}>`, inline: true },
      { name: "Ticket", value: `#${String(ticketNumber).padStart(4, "0")}`, inline: true },
      { name: "Rating", value: `${stars}  (${label})`, inline: true },
      { name: "Score", value: `${rating} / 5`, inline: true },
    )
    .setFooter({ text: "Ticket Feedback System" })
    .setTimestamp();
}

export function settingsEmbed(
  guildName: string,
  config: GuildConfig,
): EmbedBuilder {
  const bool = (v: boolean) => (v ? "✅ Enabled" : "❌ Disabled");
  const ch = (id?: string) => (id ? `<#${id}>` : "*Not set*");
  const role = (id?: string) => (id ? `<@&${id}>` : "*Not set*");

  return new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle(`⚙️  Bot Configuration — ${guildName}`)
    .addFields(
      {
        name: "🎫  Ticket System",
        value: [
          `Category: ${ch(config.ticketCategoryId)}`,
          `Log Channel: ${ch(config.ticketLogChannelId)}`,
          `Support Role: ${role(config.ticketSupportRoleId)}`,
          `Feedback Channel: ${ch(config.feedbackChannelId)}`,
        ].join("\n"),
        inline: false,
      },
      {
        name: "📊  Server Stats",
        value: [
          `Category: ${ch(config.statsCategoryId)}`,
          `Member Count: ${ch(config.memberCountChannelId)}`,
          `Bot Count: ${ch(config.botCountChannelId)}`,
          `Ticket Count: ${ch(config.ticketCountChannelId)}`,
        ].join("\n"),
        inline: false,
      },
      {
        name: "🛡️  Raid Protection",
        value: [
          `Status: ${bool(config.raidProtection.enabled)}`,
          `Threshold: ${config.raidProtection.joinThreshold} joins / ${config.raidProtection.timeWindowSeconds}s`,
          `Action: **${config.raidProtection.action}**`,
        ].join("\n"),
        inline: true,
      },
      {
        name: "💣  Nuke Protection",
        value: [
          `Status: ${bool(config.nukeProtection.enabled)}`,
          `Chan. deletes: ${config.nukeProtection.channelDeleteThreshold}`,
          `Role deletes: ${config.nukeProtection.roleDeleteThreshold}`,
          `Mass bans: ${config.nukeProtection.banThreshold}`,
          `Action: **${config.nukeProtection.action}**`,
        ].join("\n"),
        inline: true,
      },
      {
        name: "🤬  Toxic Filter",
        value: [
          `Status: ${bool(config.toxicFilter.enabled)}`,
          `Timeout: ${config.toxicFilter.timeoutMinutes} minutes`,
          `Custom words: ${config.toxicFilter.customWords.length}`,
        ].join("\n"),
        inline: true,
      },
    )
    .setFooter({ text: "Use /setup <section> to configure each feature" })
    .setTimestamp();
}

export function successEmbed(description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.success)
    .setDescription(`✅  ${description}`);
}

export function errorEmbed(description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.danger)
    .setDescription(`❌  ${description}`);
}

export function raidAlertEmbed(joinCount: number, action: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.danger)
    .setTitle("⚠️  Raid Detected!")
    .setDescription(
      `**${joinCount}** accounts joined in a very short period.\n` +
        `Action taken: **${action}**`,
    )
    .setFooter({ text: "Raid Protection System" })
    .setTimestamp();
}

export function nukeAlertEmbed(
  type: string,
  count: number,
  action: string,
): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.danger)
    .setTitle("💣  Nuke Attempt Detected!")
    .setDescription(
      `Detected **${count}** rapid ${type}(s).\n` +
        `Action taken against executor: **${action}**`,
    )
    .setFooter({ text: "Nuke Protection System" })
    .setTimestamp();
}

export function toxicAlertEmbed(
  username: string,
  timeoutMinutes: number,
): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.warning)
    .setTitle("🤬  Toxic Behavior Detected")
    .setDescription(
      `**${username}** has been timed out for **${timeoutMinutes} minutes** for violating community guidelines.`,
    )
    .setFooter({ text: "Toxic Filter" })
    .setTimestamp();
}

export function customPanelEmbed(
  title: string,
  description: string,
  color: number,
): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}
