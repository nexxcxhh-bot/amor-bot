import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  StringSelectMenuInteraction,
  ButtonInteraction,
  ModalSubmitInteraction,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ComponentType,
} from "discord.js";
import { getGuildConfig, setGuildConfig } from "../storage.js";
import { handleMemberWelcome } from "../features/welcome.js";

export const adminCommand = new SlashCommandBuilder()
  .setName("admin")
  .setDescription("🎛️ Open the unified admin control panel");

// ─── Shared helpers ────────────────────────────────────────────────────────────

const SECTIONS = [
  { value: "welcome", label: "👋  Welcome Messages", description: "Auto-greet new members" },
  { value: "verify", label: "✅  Verification", description: "One-click server access" },
  { value: "rules", label: "📜  Rules System", description: "Rules & accept button" },
  { value: "tickets", label: "🎫  Ticket System", description: "Support tickets & feedback" },
  { value: "giveaway", label: "🎉  Giveaways", description: "Start & manage giveaways" },
  { value: "raid", label: "🛡️  Raid Protection", description: "Anti-raid settings" },
  { value: "nuke", label: "💣  Nuke Protection", description: "Anti-nuke settings" },
  { value: "toxic", label: "🤬  Toxic Filter", description: "Auto-timeout toxic users" },
  { value: "stats", label: "📊  Server Stats", description: "Live stat channels" },
] as const;

type Section = (typeof SECTIONS)[number]["value"];

const icon = (v: boolean) => (v ? "🟢" : "🔴");
const ch = (id?: string) => (id ? `<#${id}>` : "`—`");
const role = (id?: string) => (id ? `<@&${id}>` : "`—`");

function buildNavRow() {
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("admin_nav")
      .setPlaceholder("📂  Select a section to configure...")
      .addOptions(SECTIONS.map((s) => new StringSelectMenuOptionBuilder().setLabel(s.label).setValue(s.value).setDescription(s.description))),
  );
}

function backRow() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("admin_back").setLabel("← Overview").setStyle(ButtonStyle.Secondary),
  );
}

// ─── Overview embed ───────────────────────────────────────────────────────────

function buildOverview(guildName: string, iconURL: string | null, config: ReturnType<typeof getGuildConfig>): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setAuthor({ name: `${guildName} — Admin Control Panel`, iconURL: iconURL ?? undefined })
    .setTitle("⚙️  Bot Configuration Overview")
    .setDescription("Select a section from the menu below to configure it.\n\u200b")
    .addFields(
      { name: `${icon(config.welcome.enabled)}  Welcome`, value: config.welcome.channelId ? ch(config.welcome.channelId) : "`Not set`", inline: true },
      { name: `${icon(config.verify.enabled)}  Verify`, value: config.verify.roleId ? role(config.verify.roleId) : "`Not set`", inline: true },
      { name: `${icon(config.rules.enabled)}  Rules`, value: `${config.rules.rules.length} rule(s)`, inline: true },
      { name: "🎫  Tickets", value: config.ticketSupportRoleId ? role(config.ticketSupportRoleId) : "`Not set`", inline: true },
      { name: `${icon(config.raidProtection.enabled)}  Raid`, value: config.raidProtection.enabled ? `**${config.raidProtection.action}**` : "`off`", inline: true },
      { name: `${icon(config.nukeProtection.enabled)}  Nuke`, value: config.nukeProtection.enabled ? `**${config.nukeProtection.action}**` : "`off`", inline: true },
      { name: `${icon(config.toxicFilter.enabled)}  Toxic Filter`, value: config.toxicFilter.enabled ? `${config.toxicFilter.timeoutMinutes}min` : "`off`", inline: true },
      { name: "📊  Stats", value: config.statsCategoryId ? "Active" : "`Not set`", inline: true },
      { name: "🎉  Giveaways", value: "Use `/giveaway start`", inline: true },
    )
    .setFooter({ text: "Tip: all changes take effect immediately", iconURL: iconURL ?? undefined })
    .setTimestamp();
}

// ─── Section embeds ───────────────────────────────────────────────────────────

function buildSectionEmbed(section: Section, config: ReturnType<typeof getGuildConfig>): EmbedBuilder {
  const e = new EmbedBuilder().setTimestamp();

  switch (section) {
    case "welcome":
      return e.setColor(0x5865f2).setTitle("👋  Welcome Messages").addFields(
        { name: "Status", value: icon(config.welcome.enabled) + (config.welcome.enabled ? " Enabled" : " Disabled"), inline: true },
        { name: "Channel", value: ch(config.welcome.channelId), inline: true },
        { name: "DM on join", value: config.welcome.dmUser ? "Yes" : "No", inline: true },
        { name: "Custom DM text", value: config.welcome.message ? `\`${config.welcome.message.slice(0, 80)}…\`` : "`Default`", inline: false },
      ).setFooter({ text: "Click Edit to change settings • Click Test to preview" });

    case "verify":
      return e.setColor(0x57f287).setTitle("✅  Verification System").addFields(
        { name: "Status", value: icon(config.verify.enabled) + (config.verify.enabled ? " Enabled" : " Disabled"), inline: true },
        { name: "Verified Role", value: role(config.verify.roleId), inline: true },
        { name: "How to use", value: "After configuring, run `/verify panel #channel` to post the verify button.", inline: false },
      ).setFooter({ text: "Click Edit to change settings" });

    case "rules":
      return e.setColor(0xed4245).setTitle("📜  Rules System").addFields(
        { name: "Status", value: icon(config.rules.enabled) + (config.rules.enabled ? " Enabled" : " Disabled"), inline: true },
        { name: "Accept Role", value: role(config.rules.acceptRoleId), inline: true },
        { name: "Rules count", value: `**${config.rules.rules.length}** rule(s)`, inline: true },
        { name: "Current rules", value: config.rules.rules.length ? config.rules.rules.slice(0, 5).map((r, i) => `**${i + 1}.** ${r}`).join("\n") + (config.rules.rules.length > 5 ? "\n*…and more*" : "") : "*None yet — use `/rules add`*", inline: false },
        { name: "How to use", value: "Run `/rules panel #channel` to post the rules embed.", inline: false },
      ).setFooter({ text: "Click Edit to change settings" });

    case "tickets":
      return e.setColor(0x5865f2).setTitle("🎫  Ticket System").addFields(
        { name: "Support Role", value: role(config.ticketSupportRoleId), inline: true },
        { name: "Log Channel", value: ch(config.ticketLogChannelId), inline: true },
        { name: "Feedback Channel", value: ch(config.feedbackChannelId), inline: true },
        { name: "How to use", value: "Run `/ticket panel #channel` to post the ticket button.", inline: false },
      ).setFooter({ text: "Click Edit to change settings" });

    case "giveaway":
      return e.setColor(0xfee75c).setTitle("🎉  Giveaway System").setDescription(
        "Use the `/giveaway` command to manage giveaways.\n\n" +
        "**Commands:**\n" +
        "`/giveaway start prize: duration: winners: channel:` — Start a giveaway\n" +
        "`/giveaway end message-id:` — End early\n" +
        "`/giveaway reroll message-id:` — Reroll winner\n" +
        "`/giveaway list` — List active giveaways\n\n" +
        "**Duration format:** `10m`, `1h`, `1d`, `7d`",
      ).setFooter({ text: "Giveaways are managed via /giveaway commands" });

    case "raid":
      return e.setColor(0xed4245).setTitle("🛡️  Raid Protection").addFields(
        { name: "Status", value: icon(config.raidProtection.enabled) + (config.raidProtection.enabled ? " Enabled" : " Disabled"), inline: true },
        { name: "Join threshold", value: `**${config.raidProtection.joinThreshold}** joins`, inline: true },
        { name: "Time window", value: `**${config.raidProtection.timeWindowSeconds}s**`, inline: true },
        { name: "Action", value: `**${config.raidProtection.action}**`, inline: true },
      ).setFooter({ text: "Click Edit to change settings" });

    case "nuke":
      return e.setColor(0xed4245).setTitle("💣  Nuke Protection").addFields(
        { name: "Status", value: icon(config.nukeProtection.enabled) + (config.nukeProtection.enabled ? " Enabled" : " Disabled"), inline: true },
        { name: "Channel deletes", value: `**${config.nukeProtection.channelDeleteThreshold}** in 10s`, inline: true },
        { name: "Role deletes", value: `**${config.nukeProtection.roleDeleteThreshold}** in 10s`, inline: true },
        { name: "Mass bans", value: `**${config.nukeProtection.banThreshold}** in 10s`, inline: true },
        { name: "Action", value: `**${config.nukeProtection.action}**`, inline: true },
      ).setFooter({ text: "Click Edit to change settings" });

    case "toxic":
      return e.setColor(0xfee75c).setTitle("🤬  Toxic Filter").addFields(
        { name: "Status", value: icon(config.toxicFilter.enabled) + (config.toxicFilter.enabled ? " Enabled" : " Disabled"), inline: true },
        { name: "Timeout duration", value: `**${config.toxicFilter.timeoutMinutes} minutes**`, inline: true },
        { name: "Custom blocked words", value: config.toxicFilter.customWords.length ? config.toxicFilter.customWords.map((w) => `\`${w}\``).join(", ") : "*None*", inline: false },
      ).setFooter({ text: "Click Edit to change settings" });

    case "stats":
      return e.setColor(0x5865f2).setTitle("📊  Server Stats").addFields(
        { name: "Category", value: ch(config.statsCategoryId), inline: true },
        { name: "Members channel", value: ch(config.memberCountChannelId), inline: true },
        { name: "Bots channel", value: ch(config.botCountChannelId), inline: true },
        { name: "Tickets channel", value: ch(config.ticketCountChannelId), inline: true },
        { name: "Update interval", value: "Every **5 minutes** automatically", inline: false },
      ).setFooter({ text: "Click Create/Recreate to set up stats channels" });

    default:
      return e.setTitle("Section").setDescription("Unknown section");
  }
}

function buildSectionButtons(section: Section): ActionRowBuilder<ButtonBuilder> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("admin_back").setLabel("← Back").setStyle(ButtonStyle.Secondary),
  );

  if (section === "stats") {
    row.addComponents(
      new ButtonBuilder().setCustomId("admin_create_stats").setLabel("🔧 Create/Recreate Stats").setStyle(ButtonStyle.Primary),
    );
  } else if (section === "welcome") {
    row.addComponents(
      new ButtonBuilder().setCustomId(`admin_edit_${section}`).setLabel("✏️ Edit").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("admin_test_welcome").setLabel("📨 Send Test Welcome").setStyle(ButtonStyle.Success),
    );
  } else if (section === "giveaway") {
    // no edit button — managed via /giveaway
  } else {
    row.addComponents(
      new ButtonBuilder().setCustomId(`admin_edit_${section}`).setLabel("✏️ Edit").setStyle(ButtonStyle.Primary),
    );
  }

  return row;
}

// ─── Modals ────────────────────────────────────────────────────────────────────

function buildModal(section: Section, config: ReturnType<typeof getGuildConfig>): ModalBuilder {
  const modal = new ModalBuilder().setCustomId(`admin_modal_${section}`);

  switch (section) {
    case "welcome": {
      modal.setTitle("Configure Welcome Messages");
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId("enabled").setLabel("Enable? (yes / no)").setStyle(TextInputStyle.Short).setValue(config.welcome.enabled ? "yes" : "no").setRequired(true),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId("channel_id").setLabel("Welcome Channel ID").setStyle(TextInputStyle.Short).setValue(config.welcome.channelId ?? "").setRequired(false).setPlaceholder("Right-click channel → Copy ID"),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId("dm_user").setLabel("Also DM new members? (yes / no)").setStyle(TextInputStyle.Short).setValue(config.welcome.dmUser ? "yes" : "no").setRequired(true),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId("message").setLabel("Custom DM text (leave blank for default)").setStyle(TextInputStyle.Paragraph).setValue(config.welcome.message ?? "").setRequired(false).setPlaceholder("Use {user}, {server}, {membercount}"),
        ),
      );
      break;
    }
    case "verify": {
      modal.setTitle("Configure Verification");
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId("enabled").setLabel("Enable? (yes / no)").setStyle(TextInputStyle.Short).setValue(config.verify.enabled ? "yes" : "no").setRequired(true),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId("role_id").setLabel("Verified Role ID").setStyle(TextInputStyle.Short).setValue(config.verify.roleId ?? "").setRequired(false).setPlaceholder("Right-click role → Copy ID"),
        ),
      );
      break;
    }
    case "rules": {
      modal.setTitle("Configure Rules System");
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId("enabled").setLabel("Enable? (yes / no)").setStyle(TextInputStyle.Short).setValue(config.rules.enabled ? "yes" : "no").setRequired(true),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId("accept_role_id").setLabel("Accept Role ID").setStyle(TextInputStyle.Short).setValue(config.rules.acceptRoleId ?? "").setRequired(false).setPlaceholder("Right-click role → Copy ID"),
        ),
      );
      break;
    }
    case "tickets": {
      modal.setTitle("Configure Ticket System");
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId("support_role_id").setLabel("Support Role ID").setStyle(TextInputStyle.Short).setValue(config.ticketSupportRoleId ?? "").setRequired(false).setPlaceholder("Right-click role → Copy ID"),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId("log_channel_id").setLabel("Log Channel ID").setStyle(TextInputStyle.Short).setValue(config.ticketLogChannelId ?? "").setRequired(false),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId("feedback_channel_id").setLabel("Feedback Channel ID").setStyle(TextInputStyle.Short).setValue(config.feedbackChannelId ?? "").setRequired(false),
        ),
      );
      break;
    }
    case "raid": {
      modal.setTitle("Configure Raid Protection");
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId("enabled").setLabel("Enable? (yes / no)").setStyle(TextInputStyle.Short).setValue(config.raidProtection.enabled ? "yes" : "no").setRequired(true),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId("threshold").setLabel("Join threshold (number)").setStyle(TextInputStyle.Short).setValue(String(config.raidProtection.joinThreshold)).setRequired(true),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId("window").setLabel("Time window in seconds").setStyle(TextInputStyle.Short).setValue(String(config.raidProtection.timeWindowSeconds)).setRequired(true),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId("action").setLabel("Action (kick / ban / lockdown)").setStyle(TextInputStyle.Short).setValue(config.raidProtection.action).setRequired(true),
        ),
      );
      break;
    }
    case "nuke": {
      modal.setTitle("Configure Nuke Protection");
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId("enabled").setLabel("Enable? (yes / no)").setStyle(TextInputStyle.Short).setValue(config.nukeProtection.enabled ? "yes" : "no").setRequired(true),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId("channel_threshold").setLabel("Channel delete threshold").setStyle(TextInputStyle.Short).setValue(String(config.nukeProtection.channelDeleteThreshold)).setRequired(true),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId("role_threshold").setLabel("Role delete threshold").setStyle(TextInputStyle.Short).setValue(String(config.nukeProtection.roleDeleteThreshold)).setRequired(true),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId("ban_threshold").setLabel("Mass ban threshold").setStyle(TextInputStyle.Short).setValue(String(config.nukeProtection.banThreshold)).setRequired(true),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId("action").setLabel("Action (kick / ban)").setStyle(TextInputStyle.Short).setValue(config.nukeProtection.action).setRequired(true),
        ),
      );
      break;
    }
    case "toxic": {
      modal.setTitle("Configure Toxic Filter");
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId("enabled").setLabel("Enable? (yes / no)").setStyle(TextInputStyle.Short).setValue(config.toxicFilter.enabled ? "yes" : "no").setRequired(true),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId("timeout").setLabel("Timeout in minutes").setStyle(TextInputStyle.Short).setValue(String(config.toxicFilter.timeoutMinutes)).setRequired(true),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId("add_word").setLabel("Add blocked word (leave blank to skip)").setStyle(TextInputStyle.Short).setRequired(false).setValue(""),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId("remove_word").setLabel("Remove blocked word (leave blank to skip)").setStyle(TextInputStyle.Short).setRequired(false).setValue(""),
        ),
      );
      break;
    }
  }

  return modal;
}

// ─── Handle modal submissions ─────────────────────────────────────────────────

async function handleModalSubmit(interaction: ModalSubmitInteraction): Promise<void> {
  const guildId = interaction.guildId;
  if (!guildId || !interaction.guild) return;

  const config = getGuildConfig(guildId);
  const section = interaction.customId.replace("admin_modal_", "") as Section;
  const yes = (v: string) => v.trim().toLowerCase() === "yes";
  const num = (v: string, fallback: number) => {
    const n = parseInt(v.trim(), 10);
    return isNaN(n) ? fallback : n;
  };
  const orUndef = (v: string) => v.trim() || undefined;

  try {
    switch (section) {
      case "welcome":
        setGuildConfig(guildId, {
          welcome: {
            enabled: yes(interaction.fields.getTextInputValue("enabled")),
            channelId: orUndef(interaction.fields.getTextInputValue("channel_id")),
            dmUser: yes(interaction.fields.getTextInputValue("dm_user")),
            message: orUndef(interaction.fields.getTextInputValue("message")),
          },
        });
        break;
      case "verify":
        setGuildConfig(guildId, {
          verify: {
            enabled: yes(interaction.fields.getTextInputValue("enabled")),
            roleId: orUndef(interaction.fields.getTextInputValue("role_id")),
          },
        });
        break;
      case "rules":
        setGuildConfig(guildId, {
          rules: {
            ...config.rules,
            enabled: yes(interaction.fields.getTextInputValue("enabled")),
            acceptRoleId: orUndef(interaction.fields.getTextInputValue("accept_role_id")),
          },
        });
        break;
      case "tickets":
        setGuildConfig(guildId, {
          ticketSupportRoleId: orUndef(interaction.fields.getTextInputValue("support_role_id")),
          ticketLogChannelId: orUndef(interaction.fields.getTextInputValue("log_channel_id")),
          feedbackChannelId: orUndef(interaction.fields.getTextInputValue("feedback_channel_id")),
        });
        break;
      case "raid": {
        const action = interaction.fields.getTextInputValue("action").trim().toLowerCase() as "kick" | "ban" | "lockdown";
        setGuildConfig(guildId, {
          raidProtection: {
            enabled: yes(interaction.fields.getTextInputValue("enabled")),
            joinThreshold: num(interaction.fields.getTextInputValue("threshold"), 10),
            timeWindowSeconds: num(interaction.fields.getTextInputValue("window"), 10),
            action: ["kick", "ban", "lockdown"].includes(action) ? action : "kick",
          },
        });
        break;
      }
      case "nuke": {
        const action = interaction.fields.getTextInputValue("action").trim().toLowerCase() as "kick" | "ban";
        setGuildConfig(guildId, {
          nukeProtection: {
            enabled: yes(interaction.fields.getTextInputValue("enabled")),
            channelDeleteThreshold: num(interaction.fields.getTextInputValue("channel_threshold"), 3),
            roleDeleteThreshold: num(interaction.fields.getTextInputValue("role_threshold"), 2),
            banThreshold: num(interaction.fields.getTextInputValue("ban_threshold"), 5),
            action: ["kick", "ban"].includes(action) ? action : "kick",
          },
        });
        break;
      }
      case "toxic": {
        const customWords = [...config.toxicFilter.customWords];
        const addW = interaction.fields.getTextInputValue("add_word").trim().toLowerCase();
        const remW = interaction.fields.getTextInputValue("remove_word").trim().toLowerCase();
        if (addW && !customWords.includes(addW)) customWords.push(addW);
        if (remW) {
          const idx = customWords.indexOf(remW);
          if (idx !== -1) customWords.splice(idx, 1);
        }
        setGuildConfig(guildId, {
          toxicFilter: {
            enabled: yes(interaction.fields.getTextInputValue("enabled")),
            timeoutMinutes: num(interaction.fields.getTextInputValue("timeout"), 10),
            customWords,
          },
        });
        break;
      }
    }
  } catch {
    await interaction.reply({ content: "❌ Failed to save. Check your inputs.", ephemeral: true });
    return;
  }

  const updated = getGuildConfig(guildId);
  await interaction.reply({
    embeds: [
      buildSectionEmbed(section, updated)
        .setDescription("✅  **Saved successfully!** Your changes are now active.\n\u200b"),
    ],
    components: [buildSectionButtons(section), buildNavRow()],
    flags: MessageFlags.Ephemeral,
  });
}

// ─── Main handler export ──────────────────────────────────────────────────────

export async function handleAdminCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.guild) return;
  const config = getGuildConfig(interaction.guild.id);

  await interaction.reply({
    embeds: [buildOverview(interaction.guild.name, interaction.guild.iconURL(), config)],
    components: [buildNavRow()],
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleAdminInteraction(
  interaction: StringSelectMenuInteraction | ButtonInteraction | ModalSubmitInteraction,
): Promise<void> {
  if (!interaction.guild || !interaction.guildId) return;

  // Modal submit
  if (interaction.isModalSubmit()) {
    await handleModalSubmit(interaction);
    return;
  }

  const config = getGuildConfig(interaction.guildId);

  // Select menu navigation
  if (interaction.isStringSelectMenu() && interaction.customId === "admin_nav") {
    const section = interaction.values[0] as Section;
    await interaction.update({
      embeds: [buildSectionEmbed(section, config)],
      components: [buildSectionButtons(section), buildNavRow()],
    });
    return;
  }

  if (!interaction.isButton()) return;
  const { customId } = interaction;

  // Back to overview
  if (customId === "admin_back") {
    await interaction.update({
      embeds: [buildOverview(interaction.guild.name, interaction.guild.iconURL(), config)],
      components: [buildNavRow()],
    });
    return;
  }

  // Create stats
  if (customId === "admin_create_stats") {
    await interaction.deferUpdate();
    try {
      const { createStatsChannels } = await import("../features/server-stats.js");
      await createStatsChannels(interaction.guild);
      const updated = getGuildConfig(interaction.guildId);
      await interaction.editReply({
        embeds: [buildSectionEmbed("stats", updated).setDescription("✅  **Stats channels created!** They update every 5 minutes.\n\u200b")],
        components: [buildSectionButtons("stats"), buildNavRow()],
      });
    } catch {
      await interaction.editReply({
        embeds: [buildSectionEmbed("stats", config).setDescription("❌  Failed — make sure I have **Manage Channels** permission.\n\u200b")],
        components: [buildSectionButtons("stats"), buildNavRow()],
      });
    }
    return;
  }

  // Test welcome
  if (customId === "admin_test_welcome") {
    await interaction.deferUpdate();
    const member = interaction.member;
    if (member && "joinedTimestamp" in member) {
      await handleMemberWelcome(member as any);
    }
    const updated = getGuildConfig(interaction.guildId);
    await interaction.editReply({
      embeds: [buildSectionEmbed("welcome", updated).setDescription("📨  **Test welcome sent!** Check your welcome channel.\n\u200b")],
      components: [buildSectionButtons("welcome"), buildNavRow()],
    });
    return;
  }

  // Edit button → open modal
  if (customId.startsWith("admin_edit_")) {
    const section = customId.replace("admin_edit_", "") as Section;
    const modal = buildModal(section, config);
    await interaction.showModal(modal);
  }
}
