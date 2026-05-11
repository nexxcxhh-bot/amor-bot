import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
  EmbedBuilder,
} from "discord.js";
import { getGuildConfig, setGuildConfig } from "../storage.js";
import { successEmbed, errorEmbed } from "../utils/embeds.js";
import { createStatsChannels } from "../features/server-stats.js";

export const setupCommand = new SlashCommandBuilder()
  .setName("setup")
  .setDescription("Admin control panel — configure every bot feature")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((sub) =>
    sub.setName("overview").setDescription("Show the full admin overview of all settings"),
  )
  .addSubcommand((sub) =>
    sub
      .setName("tickets")
      .setDescription("Configure the ticket system")
      .addRoleOption((opt) =>
        opt.setName("support-role").setDescription("Role that can view all tickets").setRequired(false),
      )
      .addChannelOption((opt) =>
        opt.setName("log-channel").setDescription("Channel for ticket logs").addChannelTypes(ChannelType.GuildText).setRequired(false),
      )
      .addChannelOption((opt) =>
        opt.setName("feedback-channel").setDescription("Channel where star ratings are publicly posted").addChannelTypes(ChannelType.GuildText).setRequired(false),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("welcome")
      .setDescription("Configure welcome messages for new members")
      .addBooleanOption((opt) =>
        opt.setName("enable").setDescription("Enable or disable welcome messages").setRequired(true),
      )
      .addChannelOption((opt) =>
        opt.setName("channel").setDescription("Channel to send welcome messages in").addChannelTypes(ChannelType.GuildText).setRequired(false),
      )
      .addBooleanOption((opt) =>
        opt.setName("dm").setDescription("Also send a DM to new members?").setRequired(false),
      )
      .addStringOption((opt) =>
        opt
          .setName("message")
          .setDescription("Custom DM message. Use {user}, {server}, {membercount}")
          .setMaxLength(1000)
          .setRequired(false),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("verify")
      .setDescription("Configure the verification system")
      .addBooleanOption((opt) =>
        opt.setName("enable").setDescription("Enable or disable verification").setRequired(true),
      )
      .addRoleOption((opt) =>
        opt.setName("role").setDescription("Role to give after verification").setRequired(false),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("rules")
      .setDescription("Configure the rules acceptance system")
      .addBooleanOption((opt) =>
        opt.setName("enable").setDescription("Enable or disable rules acceptance").setRequired(true),
      )
      .addRoleOption((opt) =>
        opt.setName("accept-role").setDescription("Role to give when rules are accepted").setRequired(false),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("raid")
      .setDescription("Configure raid protection")
      .addBooleanOption((opt) =>
        opt.setName("enable").setDescription("Enable or disable raid protection").setRequired(true),
      )
      .addIntegerOption((opt) =>
        opt.setName("threshold").setDescription("Max joins allowed within the time window").setMinValue(2).setMaxValue(100),
      )
      .addIntegerOption((opt) =>
        opt.setName("window").setDescription("Time window in seconds").setMinValue(5).setMaxValue(60),
      )
      .addStringOption((opt) =>
        opt.setName("action").setDescription("Action to take against raiders").addChoices(
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
        opt.setName("enable").setDescription("Enable or disable nuke protection").setRequired(true),
      )
      .addIntegerOption((opt) =>
        opt.setName("channel-threshold").setDescription("Channel deletions in 10s to trigger").setMinValue(2).setMaxValue(20),
      )
      .addIntegerOption((opt) =>
        opt.setName("role-threshold").setDescription("Role deletions in 10s to trigger").setMinValue(2).setMaxValue(10),
      )
      .addIntegerOption((opt) =>
        opt.setName("ban-threshold").setDescription("Mass bans in 10s to trigger").setMinValue(2).setMaxValue(20),
      )
      .addStringOption((opt) =>
        opt.setName("action").setDescription("Action taken against the nuke executor").addChoices(
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
        opt.setName("enable").setDescription("Enable or disable the toxic filter").setRequired(true),
      )
      .addIntegerOption((opt) =>
        opt.setName("timeout").setDescription("Timeout duration in minutes").setMinValue(1).setMaxValue(1440),
      )
      .addStringOption((opt) =>
        opt.setName("add-word").setDescription("Add a custom word to the block list"),
      )
      .addStringOption((opt) =>
        opt.setName("remove-word").setDescription("Remove a custom word from the block list"),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("stats")
      .setDescription("Auto-create a live-updating server stats category"),
  );

function statusIcon(v: boolean) {
  return v ? "🟢" : "🔴";
}
function ch(id?: string) {
  return id ? `<#${id}>` : "`Not set`";
}
function role(id?: string) {
  return id ? `<@&${id}>` : "`Not set`";
}

export async function handleSetupCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.guild) return;

  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guild.id;
  const config = getGuildConfig(guildId);

  // ─── OVERVIEW ───────────────────────────────────────────────────────────────
  if (sub === "overview") {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setAuthor({
        name: `${interaction.guild.name} — Admin Control Panel`,
        iconURL: interaction.guild.iconURL() ?? undefined,
      })
      .setTitle("⚙️  Bot Configuration Overview")
      .setDescription(
        "Below is the complete configuration of every feature.\nUse `/setup <feature>` to update any section.\n\u200b",
      )
      .addFields(
        {
          name: `${statusIcon(config.welcome.enabled)}  Welcome Messages`,
          value:
            `Channel: ${ch(config.welcome.channelId)}\n` +
            `DM on join: **${config.welcome.dmUser ? "Yes" : "No"}**\n` +
            `Custom message: **${config.welcome.message ? "Set" : "Default"}**`,
          inline: true,
        },
        {
          name: `${statusIcon(config.verify.enabled)}  Verification`,
          value:
            `Verified Role: ${role(config.verify.roleId)}\n` +
            `Post \`/verify panel\` to create the panel`,
          inline: true,
        },
        {
          name: `${statusIcon(config.rules.enabled)}  Rules System`,
          value:
            `Accept Role: ${role(config.rules.acceptRoleId)}\n` +
            `Rules: **${config.rules.rules.length}** rule(s)\n` +
            `Post \`/rules panel\` to create the panel`,
          inline: true,
        },
        {
          name: "🎫  Ticket System",
          value:
            `Support Role: ${role(config.ticketSupportRoleId)}\n` +
            `Log Channel: ${ch(config.ticketLogChannelId)}\n` +
            `Feedback Channel: ${ch(config.feedbackChannelId)}\n` +
            `Post \`/ticket panel\` to create the panel`,
          inline: true,
        },
        {
          name: "📊  Server Stats",
          value:
            `Category: ${ch(config.statsCategoryId)}\n` +
            `Members: ${ch(config.memberCountChannelId)}\n` +
            `Bots: ${ch(config.botCountChannelId)}\n` +
            `Run \`/setup stats\` to (re)create`,
          inline: true,
        },
        {
          name: "\u200b",
          value: "\u200b",
          inline: true,
        },
        {
          name: `${statusIcon(config.raidProtection.enabled)}  Raid Protection`,
          value:
            `Threshold: **${config.raidProtection.joinThreshold}** joins / **${config.raidProtection.timeWindowSeconds}s**\n` +
            `Action: **${config.raidProtection.action}**`,
          inline: true,
        },
        {
          name: `${statusIcon(config.nukeProtection.enabled)}  Nuke Protection`,
          value:
            `Chan. deletes: **${config.nukeProtection.channelDeleteThreshold}**\n` +
            `Role deletes: **${config.nukeProtection.roleDeleteThreshold}**\n` +
            `Mass bans: **${config.nukeProtection.banThreshold}** → **${config.nukeProtection.action}**`,
          inline: true,
        },
        {
          name: `${statusIcon(config.toxicFilter.enabled)}  Toxic Filter`,
          value:
            `Timeout: **${config.toxicFilter.timeoutMinutes} min**\n` +
            `Custom words: **${config.toxicFilter.customWords.length}**`,
          inline: true,
        },
      )
      .setFooter({
        text: `Use /setup <feature> to configure • ${interaction.guild.name}`,
        iconURL: interaction.guild.iconURL() ?? undefined,
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    return;
  }

  // ─── WELCOME ─────────────────────────────────────────────────────────────────
  if (sub === "welcome") {
    const enable = interaction.options.getBoolean("enable", true);
    const channel = interaction.options.getChannel("channel");
    const dm = interaction.options.getBoolean("dm") ?? config.welcome.dmUser;
    const message = interaction.options.getString("message") ?? config.welcome.message;

    setGuildConfig(guildId, {
      welcome: {
        enabled: enable,
        channelId: channel?.id ?? config.welcome.channelId,
        dmUser: dm,
        message: message ?? undefined,
      },
    });

    await interaction.reply({
      embeds: [
        successEmbed(
          `Welcome messages **${enable ? "enabled" : "disabled"}**!\n` +
            (channel ? `Channel: <#${channel.id}>\n` : "") +
            `DM on join: **${dm ? "Yes" : "No"}**`,
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // ─── VERIFY ──────────────────────────────────────────────────────────────────
  if (sub === "verify") {
    const enable = interaction.options.getBoolean("enable", true);
    const verifyRole = interaction.options.getRole("role");

    setGuildConfig(guildId, {
      verify: {
        enabled: enable,
        roleId: verifyRole?.id ?? config.verify.roleId,
        channelId: config.verify.channelId,
      },
    });

    await interaction.reply({
      embeds: [
        successEmbed(
          `Verification **${enable ? "enabled" : "disabled"}**!\n` +
            (verifyRole ? `Verified Role: <@&${verifyRole.id}>\n` : "") +
            `Now post the panel with \`/verify panel #channel\``,
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // ─── RULES ───────────────────────────────────────────────────────────────────
  if (sub === "rules") {
    const enable = interaction.options.getBoolean("enable", true);
    const acceptRole = interaction.options.getRole("accept-role");

    setGuildConfig(guildId, {
      rules: {
        enabled: enable,
        acceptRoleId: acceptRole?.id ?? config.rules.acceptRoleId,
        channelId: config.rules.channelId,
        rules: config.rules.rules,
      },
    });

    await interaction.reply({
      embeds: [
        successEmbed(
          `Rules system **${enable ? "enabled" : "disabled"}**!\n` +
            (acceptRole ? `Accept Role: <@&${acceptRole.id}>\n` : "") +
            `Add rules with \`/rules add\` then post with \`/rules panel #channel\``,
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // ─── TICKETS ─────────────────────────────────────────────────────────────────
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

  // ─── RAID ────────────────────────────────────────────────────────────────────
  if (sub === "raid") {
    const enable = interaction.options.getBoolean("enable", true);
    const threshold = interaction.options.getInteger("threshold") ?? config.raidProtection.joinThreshold;
    const window = interaction.options.getInteger("window") ?? config.raidProtection.timeWindowSeconds;
    const action = (interaction.options.getString("action") ?? config.raidProtection.action) as "kick" | "ban" | "lockdown";

    setGuildConfig(guildId, {
      raidProtection: { enabled: enable, joinThreshold: threshold, timeWindowSeconds: window, action },
    });

    await interaction.reply({
      embeds: [
        successEmbed(
          `Raid protection **${enable ? "enabled" : "disabled"}**\n` +
            `Threshold: **${threshold}** joins / **${window}s** → **${action}**`,
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // ─── NUKE ────────────────────────────────────────────────────────────────────
  if (sub === "nuke") {
    const enable = interaction.options.getBoolean("enable", true);
    const channelThreshold = interaction.options.getInteger("channel-threshold") ?? config.nukeProtection.channelDeleteThreshold;
    const roleThreshold = interaction.options.getInteger("role-threshold") ?? config.nukeProtection.roleDeleteThreshold;
    const banThreshold = interaction.options.getInteger("ban-threshold") ?? config.nukeProtection.banThreshold;
    const action = (interaction.options.getString("action") ?? config.nukeProtection.action) as "kick" | "ban";

    setGuildConfig(guildId, {
      nukeProtection: { enabled: enable, channelDeleteThreshold: channelThreshold, roleDeleteThreshold: roleThreshold, banThreshold, action },
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

  // ─── TOXIC ───────────────────────────────────────────────────────────────────
  if (sub === "toxic") {
    const enable = interaction.options.getBoolean("enable", true);
    const timeout = interaction.options.getInteger("timeout") ?? config.toxicFilter.timeoutMinutes;
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
            `Timeout: **${timeout} min** · Custom words: **${customWords.length}**` +
            (addWord ? `\nAdded: \`${addWord}\`` : "") +
            (removeWord ? `\nRemoved: \`${removeWord}\`` : ""),
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // ─── STATS ───────────────────────────────────────────────────────────────────
  if (sub === "stats") {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      await createStatsChannels(interaction.guild);
      await interaction.editReply({
        embeds: [successEmbed("Server stats category created! Channels update every **5 minutes** automatically.")],
      });
    } catch {
      await interaction.editReply({
        embeds: [errorEmbed("Failed to create stats channels. Make sure I have the **Manage Channels** permission.")],
      });
    }
  }
}
