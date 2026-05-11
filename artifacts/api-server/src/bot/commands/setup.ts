import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
} from "discord.js";
import { getGuildConfig, setGuildConfig } from "../storage.js";
import {
  settingsEmbed,
  successEmbed,
  errorEmbed,
} from "../utils/embeds.js";
import { createStatsChannels } from "../features/server-stats.js";

export const setupCommand = new SlashCommandBuilder()
  .setName("setup")
  .setDescription("Configure the bot for this server")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((sub) =>
    sub.setName("view").setDescription("View the current bot configuration"),
  )
  .addSubcommand((sub) =>
    sub
      .setName("tickets")
      .setDescription("Configure the ticket system")
      .addRoleOption((opt) =>
        opt
          .setName("support-role")
          .setDescription("Role that can see and manage all tickets")
          .setRequired(false),
      )
      .addChannelOption((opt) =>
        opt
          .setName("log-channel")
          .setDescription("Channel for ticket activity logs")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(false),
      )
      .addChannelOption((opt) =>
        opt
          .setName("feedback-channel")
          .setDescription("Channel where star ratings are publicly posted")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(false),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("raid")
      .setDescription("Configure raid protection")
      .addBooleanOption((opt) =>
        opt
          .setName("enable")
          .setDescription("Enable or disable raid protection")
          .setRequired(true),
      )
      .addIntegerOption((opt) =>
        opt
          .setName("threshold")
          .setDescription("Max joins allowed within the time window")
          .setMinValue(2)
          .setMaxValue(100),
      )
      .addIntegerOption((opt) =>
        opt
          .setName("window")
          .setDescription("Time window in seconds to watch for joins")
          .setMinValue(5)
          .setMaxValue(60),
      )
      .addStringOption((opt) =>
        opt
          .setName("action")
          .setDescription("Action to take against raiders")
          .addChoices(
            { name: "Kick", value: "kick" },
            { name: "Ban", value: "ban" },
            { name: "Lockdown all channels", value: "lockdown" },
          ),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("nuke")
      .setDescription("Configure nuke protection")
      .addBooleanOption((opt) =>
        opt
          .setName("enable")
          .setDescription("Enable or disable nuke protection")
          .setRequired(true),
      )
      .addIntegerOption((opt) =>
        opt
          .setName("channel-threshold")
          .setDescription("Channel deletions in 10s to trigger protection")
          .setMinValue(2)
          .setMaxValue(20),
      )
      .addIntegerOption((opt) =>
        opt
          .setName("role-threshold")
          .setDescription("Role deletions in 10s to trigger protection")
          .setMinValue(2)
          .setMaxValue(10),
      )
      .addIntegerOption((opt) =>
        opt
          .setName("ban-threshold")
          .setDescription("Mass bans in 10s to trigger protection")
          .setMinValue(2)
          .setMaxValue(20),
      )
      .addStringOption((opt) =>
        opt
          .setName("action")
          .setDescription("Action taken against the person causing the nuke")
          .addChoices(
            { name: "Kick", value: "kick" },
            { name: "Ban", value: "ban" },
          ),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("toxic")
      .setDescription("Configure the toxic behaviour auto-filter")
      .addBooleanOption((opt) =>
        opt
          .setName("enable")
          .setDescription("Enable or disable the toxic filter")
          .setRequired(true),
      )
      .addIntegerOption((opt) =>
        opt
          .setName("timeout")
          .setDescription("Timeout duration in minutes")
          .setMinValue(1)
          .setMaxValue(1440),
      )
      .addStringOption((opt) =>
        opt
          .setName("add-word")
          .setDescription("Add a custom word to the filter list"),
      )
      .addStringOption((opt) =>
        opt
          .setName("remove-word")
          .setDescription("Remove a custom word from the filter list"),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("stats")
      .setDescription(
        "Auto-create a Server Stats category with live-updating voice channels",
      ),
  );

export async function handleSetupCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.guild) return;

  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guild.id;
  const config = getGuildConfig(guildId);

  if (sub === "view") {
    await interaction.reply({
      embeds: [settingsEmbed(interaction.guild.name, config)],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (sub === "tickets") {
    const supportRole = interaction.options.getRole("support-role");
    const logChannel = interaction.options.getChannel("log-channel");
    const feedbackChannel = interaction.options.getChannel("feedback-channel");

    const updates: Partial<typeof config> = {};
    if (supportRole) updates.ticketSupportRoleId = supportRole.id;
    if (logChannel) updates.ticketLogChannelId = logChannel.id;
    if (feedbackChannel) updates.feedbackChannelId = feedbackChannel.id;

    setGuildConfig(guildId, updates);

    const lines = [
      supportRole ? `Support Role → <@&${supportRole.id}>` : null,
      logChannel ? `Log Channel → <#${logChannel.id}>` : null,
      feedbackChannel ? `Feedback Channel → <#${feedbackChannel.id}>` : null,
    ].filter(Boolean);

    await interaction.reply({
      embeds: [
        successEmbed(
          lines.length
            ? `Ticket system updated:\n${lines.join("\n")}`
            : "No changes made. Provide at least one option.",
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (sub === "raid") {
    const enable = interaction.options.getBoolean("enable", true);
    const threshold =
      interaction.options.getInteger("threshold") ??
      config.raidProtection.joinThreshold;
    const window =
      interaction.options.getInteger("window") ??
      config.raidProtection.timeWindowSeconds;
    const action = (interaction.options.getString("action") ??
      config.raidProtection.action) as "kick" | "ban" | "lockdown";

    setGuildConfig(guildId, {
      raidProtection: {
        enabled: enable,
        joinThreshold: threshold,
        timeWindowSeconds: window,
        action,
      },
    });

    await interaction.reply({
      embeds: [
        successEmbed(
          `Raid protection **${enable ? "enabled" : "disabled"}**\n` +
            `Threshold: **${threshold}** joins in **${window}s** → **${action}**`,
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (sub === "nuke") {
    const enable = interaction.options.getBoolean("enable", true);
    const channelThreshold =
      interaction.options.getInteger("channel-threshold") ??
      config.nukeProtection.channelDeleteThreshold;
    const roleThreshold =
      interaction.options.getInteger("role-threshold") ??
      config.nukeProtection.roleDeleteThreshold;
    const banThreshold =
      interaction.options.getInteger("ban-threshold") ??
      config.nukeProtection.banThreshold;
    const action = (interaction.options.getString("action") ??
      config.nukeProtection.action) as "kick" | "ban";

    setGuildConfig(guildId, {
      nukeProtection: {
        enabled: enable,
        channelDeleteThreshold: channelThreshold,
        roleDeleteThreshold: roleThreshold,
        banThreshold,
        action,
      },
    });

    await interaction.reply({
      embeds: [
        successEmbed(
          `Nuke protection **${enable ? "enabled" : "disabled"}**\n` +
            `Channel deletes: **${channelThreshold}**, Role deletes: **${roleThreshold}**, Bans: **${banThreshold}** → **${action}**`,
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (sub === "toxic") {
    const enable = interaction.options.getBoolean("enable", true);
    const timeout =
      interaction.options.getInteger("timeout") ??
      config.toxicFilter.timeoutMinutes;
    const addWord = interaction.options.getString("add-word");
    const removeWord = interaction.options.getString("remove-word");

    const customWords = [...config.toxicFilter.customWords];
    if (addWord) {
      const w = addWord.toLowerCase().trim();
      if (!customWords.includes(w)) customWords.push(w);
    }
    if (removeWord) {
      const idx = customWords.indexOf(removeWord.toLowerCase().trim());
      if (idx !== -1) customWords.splice(idx, 1);
    }

    setGuildConfig(guildId, {
      toxicFilter: { enabled: enable, timeoutMinutes: timeout, customWords },
    });

    await interaction.reply({
      embeds: [
        successEmbed(
          `Toxic filter **${enable ? "enabled" : "disabled"}**\n` +
            `Timeout: **${timeout} minutes**, Custom words: **${customWords.length}**` +
            (addWord ? `\nAdded: \`${addWord}\`` : "") +
            (removeWord ? `\nRemoved: \`${removeWord}\`` : ""),
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (sub === "stats") {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      await createStatsChannels(interaction.guild);
      await interaction.editReply({
        embeds: [
          successEmbed(
            "Server stats category created!\nChannels update automatically every **5 minutes**.",
          ),
        ],
      });
    } catch {
      await interaction.editReply({
        embeds: [
          errorEmbed(
            "Failed to create stats channels. Make sure I have the **Manage Channels** permission.",
          ),
        ],
      });
    }
  }
}
