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
  ChannelType,
  TextChannel,
} from "discord.js";
import { getGuildConfig, setGuildConfig } from "../storage.js";
import { handleMemberWelcome } from "../features/welcome.js";
import { COLORS } from "../utils/embeds.js";

export const adminCommand = new SlashCommandBuilder()
  .setName("admin")
  .setDescription("🎛️ Admin-Kontrollpanel öffnen")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const SECTIONS = [
  { value: "welcome",  label: "👋  Welcome",       description: "Begrüßungsnachrichten" },
  { value: "verify",   label: "✅  Verifizierung",  description: "Server-Zugang sichern" },
  { value: "rules",    label: "📜  Regelwerk",      description: "Regeln & Akzeptieren-Button" },
  { value: "tickets",  label: "🎫  Tickets",        description: "Support-Ticket System" },
  { value: "giveaway", label: "🎉  Giveaways",      description: "Giveaways verwalten" },
  { value: "raid",     label: "🛡️  Raid-Schutz",    description: "Anti-Raid konfigurieren" },
  { value: "nuke",     label: "💣  Nuke-Schutz",    description: "Anti-Nuke konfigurieren" },
  { value: "toxic",    label: "🤬  Toxic-Filter",   description: "Auto-Timeout für toxische Nutzer" },
  { value: "stats",    label: "📊  Server-Stats",   description: "Live-Statistik Channels" },
] as const;

type Section = (typeof SECTIONS)[number]["value"];

const on  = (v: boolean) => v ? "🟢" : "🔴";
const ch  = (id?: string) => id ? `<#${id}>` : "`nicht gesetzt`";
const rol = (id?: string) => id ? `<@&${id}>` : "`nicht gesetzt`";

function navRow() {
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("admin_nav")
      .setPlaceholder("📂  Bereich auswählen...")
      .addOptions(SECTIONS.map((s) =>
        new StringSelectMenuOptionBuilder().setLabel(s.label).setValue(s.value).setDescription(s.description),
      )),
  );
}

function backRow() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("admin_back").setLabel("← Zurück").setStyle(ButtonStyle.Secondary),
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────────

function overviewEmbed(guildName: string, iconURL: string | null, cfg: ReturnType<typeof getGuildConfig>): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.primary)
    .setAuthor({ name: `${guildName} — Kontrollpanel`, iconURL: iconURL ?? undefined })
    .setTitle("⚙️  Admin Dashboard")
    .setDescription(
      `Wähle unten einen Bereich aus dem Menü, um ihn zu konfigurieren.\n\n` +
      `**System-Status**`,
    )
    .addFields(
      { name: `${on(cfg.welcome.enabled)}  Welcome`,      value: cfg.welcome.channelId   ? ch(cfg.welcome.channelId)        : "`—`", inline: true },
      { name: `${on(cfg.verify.enabled)}  Verifizierung`, value: cfg.verify.roleId       ? rol(cfg.verify.roleId)           : "`—`", inline: true },
      { name: `${on(cfg.rules.enabled)}  Regeln`,         value: `${cfg.rules.rules.length} Regel(n)`,                              inline: true },
      { name: `🎫  Tickets`,                               value: cfg.ticketSupportRoleId ? rol(cfg.ticketSupportRoleId)     : "`—`", inline: true },
      { name: `${on(cfg.raidProtection.enabled)}  Raid`,  value: cfg.raidProtection.enabled ? `\`${cfg.raidProtection.action}\`` : "`aus`", inline: true },
      { name: `${on(cfg.nukeProtection.enabled)}  Nuke`,  value: cfg.nukeProtection.enabled ? `\`${cfg.nukeProtection.action}\`` : "`aus`", inline: true },
      { name: `${on(cfg.toxicFilter.enabled)}  Toxic`,    value: cfg.toxicFilter.enabled ? `${cfg.toxicFilter.timeoutMinutes}min` : "`aus`", inline: true },
      { name: `📊  Stats`,                                 value: cfg.statsCategoryId    ? "`Aktiv`"                        : "`—`", inline: true },
      { name: `🎉  Giveaways`,                             value: "`/giveaway start`",                                               inline: true },
    )
    .setFooter({ text: "Änderungen werden sofort aktiv  •  /admin" })
    .setTimestamp();
}

// ─── Section embeds ───────────────────────────────────────────────────────────

function sectionEmbed(section: Section, cfg: ReturnType<typeof getGuildConfig>): EmbedBuilder {
  const e = new EmbedBuilder().setTimestamp();

  switch (section) {
    case "welcome":
      return e.setColor(COLORS.success).setTitle("👋  Welcome Messages").setDescription(
        `**Status:** ${on(cfg.welcome.enabled)} ${cfg.welcome.enabled ? "Aktiviert" : "Deaktiviert"}\n` +
        `**Channel:** ${ch(cfg.welcome.channelId)}\n` +
        `**DM bei Beitritt:** ${cfg.welcome.dmUser ? "Ja" : "Nein"}\n` +
        `**Eigener Text:** ${cfg.welcome.message ? `\`${cfg.welcome.message.slice(0, 60)}…\`` : "Standard"}`,
      ).setFooter({ text: "✏️ Bearbeiten  •  📨 Test-Welcome senden" });

    case "verify":
      return e.setColor(COLORS.success).setTitle("✅  Verifizierungs-System").setDescription(
        `**Status:** ${on(cfg.verify.enabled)} ${cfg.verify.enabled ? "Aktiviert" : "Deaktiviert"}\n` +
        `**Verifiziert-Rolle:** ${rol(cfg.verify.roleId)}\n\n` +
        `> Mit **Panel senden** kannst du das Verifizierungs-Panel posten.`,
      ).setFooter({ text: "✏️ Bearbeiten  •  📤 Panel senden" });

    case "rules":
      return e.setColor(COLORS.danger).setTitle("📜  Regelwerk").setDescription(
        `**Status:** ${on(cfg.rules.enabled)} ${cfg.rules.enabled ? "Aktiviert" : "Deaktiviert"}\n` +
        `**Akzeptieren-Rolle:** ${rol(cfg.rules.acceptRoleId)}\n` +
        `**Regelanzahl:** ${cfg.rules.rules.length} Regel(n)\n\n` +
        (cfg.rules.rules.length
          ? cfg.rules.rules.slice(0, 3).map((r, i) => `> **${i + 1}.** ${r.slice(0, 60)}${r.length > 60 ? "…" : ""}`).join("\n") + (cfg.rules.rules.length > 3 ? "\n> *…und mehr*" : "")
          : "> *Keine Regeln — nutze \`/rules add\`*"),
      ).setFooter({ text: "✏️ Bearbeiten  •  📤 Panel senden" });

    case "tickets":
      return e.setColor(COLORS.primary).setTitle("🎫  Ticket-System").setDescription(
        `**Support-Rolle:** ${rol(cfg.ticketSupportRoleId)}\n` +
        `**Log-Channel:** ${ch(cfg.ticketLogChannelId)}\n` +
        `**Feedback-Channel:** ${ch(cfg.feedbackChannelId)}\n\n` +
        `> Mit **Panel senden** kannst du das Ticket-Panel in einen Channel posten.`,
      ).setFooter({ text: "✏️ Bearbeiten  •  📤 Panel senden" });

    case "giveaway":
      return e.setColor(COLORS.warning).setTitle("🎉  Giveaway-System").setDescription(
        `Verwalte Giveaways mit dem \`/giveaway\` Befehl.\n\n` +
        `\`\`\`\n/giveaway start  — Giveaway starten\n/giveaway end    — Vorzeitig beenden\n/giveaway reroll — Neu auslosen\n/giveaway list   — Aktive anzeigen\`\`\`\n` +
        `> **Dauerformat:** \`10m\`, \`1h\`, \`1d\`, \`7d\``,
      ).setFooter({ text: "Giveaways werden über /giveaway verwaltet" });

    case "raid":
      return e.setColor(COLORS.danger).setTitle("🛡️  Raid-Schutz").setDescription(
        `**Status:** ${on(cfg.raidProtection.enabled)} ${cfg.raidProtection.enabled ? "Aktiviert" : "Deaktiviert"}\n` +
        `**Schwellwert:** ${cfg.raidProtection.joinThreshold} Beitritte in ${cfg.raidProtection.timeWindowSeconds}s\n` +
        `**Aktion:** \`${cfg.raidProtection.action}\``,
      ).setFooter({ text: "✏️ Bearbeiten" });

    case "nuke":
      return e.setColor(COLORS.danger).setTitle("💣  Nuke-Schutz").setDescription(
        `**Status:** ${on(cfg.nukeProtection.enabled)} ${cfg.nukeProtection.enabled ? "Aktiviert" : "Deaktiviert"}\n` +
        `**Channel-Löschungen:** max. ${cfg.nukeProtection.channelDeleteThreshold} in 10s\n` +
        `**Rollen-Löschungen:** max. ${cfg.nukeProtection.roleDeleteThreshold} in 10s\n` +
        `**Massen-Bans:** max. ${cfg.nukeProtection.banThreshold} in 10s\n` +
        `**Aktion:** \`${cfg.nukeProtection.action}\``,
      ).setFooter({ text: "✏️ Bearbeiten" });

    case "toxic":
      return e.setColor(COLORS.warning).setTitle("🤬  Toxic-Filter").setDescription(
        `**Status:** ${on(cfg.toxicFilter.enabled)} ${cfg.toxicFilter.enabled ? "Aktiviert" : "Deaktiviert"}\n` +
        `**Timeout:** ${cfg.toxicFilter.timeoutMinutes} Minuten\n` +
        `**Gesperrte Wörter:** ${cfg.toxicFilter.customWords.length ? cfg.toxicFilter.customWords.map((w) => `\`${w}\``).join(", ") : "*keine*"}`,
      ).setFooter({ text: "✏️ Bearbeiten" });

    case "stats":
      return e.setColor(COLORS.primary).setTitle("📊  Server-Stats").setDescription(
        `**Kategorie:** ${ch(cfg.statsCategoryId)}\n` +
        `**Mitglieder:** ${ch(cfg.memberCountChannelId)}\n` +
        `**Bots:** ${ch(cfg.botCountChannelId)}\n` +
        `**Tickets:** ${ch(cfg.ticketCountChannelId)}\n\n` +
        `> Update-Intervall: alle **5 Minuten**`,
      ).setFooter({ text: "🔧 Stats erstellen zum Einrichten" });

    default:
      return e.setTitle("Bereich").setDescription("Unbekannter Bereich");
  }
}

function sectionButtons(section: Section): ActionRowBuilder<ButtonBuilder> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("admin_back").setLabel("← Zurück").setStyle(ButtonStyle.Secondary),
  );

  if (section === "stats") {
    row.addComponents(
      new ButtonBuilder().setCustomId("admin_create_stats").setLabel("Stats erstellen").setEmoji("🔧").setStyle(ButtonStyle.Primary),
    );
  } else if (section === "welcome") {
    row.addComponents(
      new ButtonBuilder().setCustomId(`admin_edit_${section}`).setLabel("Bearbeiten").setEmoji("✏️").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("admin_test_welcome").setLabel("Test senden").setEmoji("📨").setStyle(ButtonStyle.Success),
    );
  } else if (section === "giveaway") {
    // no buttons
  } else if (section === "verify" || section === "rules" || section === "tickets") {
    row.addComponents(
      new ButtonBuilder().setCustomId(`admin_edit_${section}`).setLabel("Bearbeiten").setEmoji("✏️").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`admin_sendpanel_${section}`).setLabel("Panel senden").setEmoji("📤").setStyle(ButtonStyle.Success),
    );
  } else {
    row.addComponents(
      new ButtonBuilder().setCustomId(`admin_edit_${section}`).setLabel("Bearbeiten").setEmoji("✏️").setStyle(ButtonStyle.Primary),
    );
  }

  return row;
}

// ─── Modals ────────────────────────────────────────────────────────────────────

function buildModal(section: Section, cfg: ReturnType<typeof getGuildConfig>): ModalBuilder {
  const modal = new ModalBuilder().setCustomId(`admin_modal_${section}`);

  switch (section) {
    case "welcome":
      modal.setTitle("Welcome konfigurieren").addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("enabled").setLabel("Aktiviert? (ja / nein)").setStyle(TextInputStyle.Short).setValue(cfg.welcome.enabled ? "ja" : "nein").setRequired(true)),
        new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("channel_id").setLabel("Welcome-Channel ID").setStyle(TextInputStyle.Short).setValue(cfg.welcome.channelId ?? "").setRequired(false).setPlaceholder("Rechtsklick auf Channel → ID kopieren")),
        new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("dm_user").setLabel("Neue Mitglieder per DM? (ja / nein)").setStyle(TextInputStyle.Short).setValue(cfg.welcome.dmUser ? "ja" : "nein").setRequired(true)),
        new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("message").setLabel("DM-Text (leer = Standard)").setStyle(TextInputStyle.Paragraph).setValue(cfg.welcome.message ?? "").setRequired(false).setPlaceholder("{user}, {server}, {membercount}")),
      );
      break;
    case "verify":
      modal.setTitle("Verifizierung konfigurieren").addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("enabled").setLabel("Aktiviert? (ja / nein)").setStyle(TextInputStyle.Short).setValue(cfg.verify.enabled ? "ja" : "nein").setRequired(true)),
        new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("role_id").setLabel("Verifiziert-Rolle ID").setStyle(TextInputStyle.Short).setValue(cfg.verify.roleId ?? "").setRequired(false).setPlaceholder("Rechtsklick auf Rolle → ID kopieren")),
      );
      break;
    case "rules":
      modal.setTitle("Regelwerk konfigurieren").addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("enabled").setLabel("Aktiviert? (ja / nein)").setStyle(TextInputStyle.Short).setValue(cfg.rules.enabled ? "ja" : "nein").setRequired(true)),
        new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("accept_role_id").setLabel("Akzeptieren-Rolle ID").setStyle(TextInputStyle.Short).setValue(cfg.rules.acceptRoleId ?? "").setRequired(false).setPlaceholder("Rechtsklick auf Rolle → ID kopieren")),
      );
      break;
    case "tickets":
      modal.setTitle("Ticket-System konfigurieren").addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("support_role_id").setLabel("Support-Rolle ID").setStyle(TextInputStyle.Short).setValue(cfg.ticketSupportRoleId ?? "").setRequired(false).setPlaceholder("Rechtsklick auf Rolle → ID kopieren")),
        new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("log_channel_id").setLabel("Log-Channel ID").setStyle(TextInputStyle.Short).setValue(cfg.ticketLogChannelId ?? "").setRequired(false).setPlaceholder("Rechtsklick auf Channel → ID kopieren")),
        new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("feedback_channel_id").setLabel("Feedback-Channel ID").setStyle(TextInputStyle.Short).setValue(cfg.feedbackChannelId ?? "").setRequired(false).setPlaceholder("Rechtsklick auf Channel → ID kopieren")),
      );
      break;
    case "raid":
      modal.setTitle("Raid-Schutz konfigurieren").addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("enabled").setLabel("Aktiviert? (ja / nein)").setStyle(TextInputStyle.Short).setValue(cfg.raidProtection.enabled ? "ja" : "nein").setRequired(true)),
        new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("threshold").setLabel("Beitritte bis Alarm (Zahl)").setStyle(TextInputStyle.Short).setValue(String(cfg.raidProtection.joinThreshold)).setRequired(true)),
        new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("window").setLabel("Zeitfenster in Sekunden").setStyle(TextInputStyle.Short).setValue(String(cfg.raidProtection.timeWindowSeconds)).setRequired(true)),
        new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("action").setLabel("Aktion (kick / ban / lockdown)").setStyle(TextInputStyle.Short).setValue(cfg.raidProtection.action).setRequired(true)),
      );
      break;
    case "nuke":
      modal.setTitle("Nuke-Schutz konfigurieren").addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("enabled").setLabel("Aktiviert? (ja / nein)").setStyle(TextInputStyle.Short).setValue(cfg.nukeProtection.enabled ? "ja" : "nein").setRequired(true)),
        new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("channel_threshold").setLabel("Max. Channel-Löschungen in 10s").setStyle(TextInputStyle.Short).setValue(String(cfg.nukeProtection.channelDeleteThreshold)).setRequired(true)),
        new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("role_threshold").setLabel("Max. Rollen-Löschungen in 10s").setStyle(TextInputStyle.Short).setValue(String(cfg.nukeProtection.roleDeleteThreshold)).setRequired(true)),
        new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("ban_threshold").setLabel("Max. Bans in 10s").setStyle(TextInputStyle.Short).setValue(String(cfg.nukeProtection.banThreshold)).setRequired(true)),
        new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("action").setLabel("Aktion (kick / ban)").setStyle(TextInputStyle.Short).setValue(cfg.nukeProtection.action).setRequired(true)),
      );
      break;
    case "toxic":
      modal.setTitle("Toxic-Filter konfigurieren").addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("enabled").setLabel("Aktiviert? (ja / nein)").setStyle(TextInputStyle.Short).setValue(cfg.toxicFilter.enabled ? "ja" : "nein").setRequired(true)),
        new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("timeout").setLabel("Timeout in Minuten").setStyle(TextInputStyle.Short).setValue(String(cfg.toxicFilter.timeoutMinutes)).setRequired(true)),
        new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("add_word").setLabel("Wort hinzufügen (leer = überspringen)").setStyle(TextInputStyle.Short).setRequired(false).setValue("")),
        new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("remove_word").setLabel("Wort entfernen (leer = überspringen)").setStyle(TextInputStyle.Short).setRequired(false).setValue("")),
      );
      break;
  }

  return modal;
}

function buildSendPanelModal(section: "verify" | "rules" | "tickets"): ModalBuilder {
  const labels: Record<string, string> = { verify: "Verifizierungs-Panel senden", rules: "Regelwerk-Panel senden", tickets: "Ticket-Panel senden" };
  return new ModalBuilder()
    .setCustomId(`admin_sendpanel_modal_${section}`)
    .setTitle(labels[section] ?? "Panel senden")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder().setCustomId("channel_id").setLabel("Ziel-Channel ID").setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder("Rechtsklick auf Channel → ID kopieren"),
      ),
    );
}

// ─── Modal handler ─────────────────────────────────────────────────────────────

async function handleModalSubmit(interaction: ModalSubmitInteraction): Promise<void> {
  const guildId = interaction.guildId;
  if (!guildId || !interaction.guild) return;

  if (interaction.customId.startsWith("admin_sendpanel_modal_")) {
    const section = interaction.customId.replace("admin_sendpanel_modal_", "") as "verify" | "rules" | "tickets";
    const channelId = interaction.fields.getTextInputValue("channel_id").trim();

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    let targetChannel: TextChannel | null = null;
    try {
      const fetched = await interaction.guild.channels.fetch(channelId);
      if (fetched?.type === ChannelType.GuildText) targetChannel = fetched as TextChannel;
    } catch { /* not found */ }

    if (!targetChannel) {
      await interaction.editReply({ content: `❌ Channel \`${channelId}\` nicht gefunden.` });
      return;
    }

    const iconURL = interaction.guild.iconURL({ size: 256 }) ?? undefined;
    const guildName = interaction.guild.name;

    try {
      if (section === "verify") {
        const { sendVerifyPanel } = await import("./verify.js");
        await sendVerifyPanel(targetChannel, guildName, iconURL);
      } else if (section === "rules") {
        const config = getGuildConfig(guildId);
        const { sendRulesPanel } = await import("./rules.js");
        await sendRulesPanel(targetChannel, config.rules.rules, guildName, iconURL);
      } else if (section === "tickets") {
        const { sendTicketPanel } = await import("./ticket.js");
        await sendTicketPanel(targetChannel, guildName, iconURL);
      }
      await interaction.editReply({ content: `✅ Panel erfolgreich in <#${channelId}> gepostet!` });
    } catch {
      await interaction.editReply({ content: "❌ Fehler. Überprüfe meine Berechtigungen im Ziel-Channel." });
    }
    return;
  }

  const config = getGuildConfig(guildId);
  const section = interaction.customId.replace("admin_modal_", "") as Section;
  const yes = (v: string) => ["ja", "yes", "1", "true"].includes(v.trim().toLowerCase());
  const num = (v: string, fallback: number) => { const n = parseInt(v.trim(), 10); return isNaN(n) ? fallback : n; };
  const orUndef = (v: string) => v.trim() || undefined;

  try {
    switch (section) {
      case "welcome":
        setGuildConfig(guildId, { welcome: { enabled: yes(interaction.fields.getTextInputValue("enabled")), channelId: orUndef(interaction.fields.getTextInputValue("channel_id")), dmUser: yes(interaction.fields.getTextInputValue("dm_user")), message: orUndef(interaction.fields.getTextInputValue("message")) } });
        break;
      case "verify":
        setGuildConfig(guildId, { verify: { enabled: yes(interaction.fields.getTextInputValue("enabled")), roleId: orUndef(interaction.fields.getTextInputValue("role_id")) } });
        break;
      case "rules":
        setGuildConfig(guildId, { rules: { ...config.rules, enabled: yes(interaction.fields.getTextInputValue("enabled")), acceptRoleId: orUndef(interaction.fields.getTextInputValue("accept_role_id")) } });
        break;
      case "tickets":
        setGuildConfig(guildId, { ticketSupportRoleId: orUndef(interaction.fields.getTextInputValue("support_role_id")), ticketLogChannelId: orUndef(interaction.fields.getTextInputValue("log_channel_id")), feedbackChannelId: orUndef(interaction.fields.getTextInputValue("feedback_channel_id")) });
        break;
      case "raid":
        setGuildConfig(guildId, { raidProtection: { enabled: yes(interaction.fields.getTextInputValue("enabled")), joinThreshold: num(interaction.fields.getTextInputValue("threshold"), 10), timeWindowSeconds: num(interaction.fields.getTextInputValue("window"), 10), action: (interaction.fields.getTextInputValue("action").trim() as "kick" | "ban" | "lockdown") || "kick" } });
        break;
      case "nuke":
        setGuildConfig(guildId, { nukeProtection: { enabled: yes(interaction.fields.getTextInputValue("enabled")), channelDeleteThreshold: num(interaction.fields.getTextInputValue("channel_threshold"), 3), roleDeleteThreshold: num(interaction.fields.getTextInputValue("role_threshold"), 2), banThreshold: num(interaction.fields.getTextInputValue("ban_threshold"), 5), action: (interaction.fields.getTextInputValue("action").trim() as "kick" | "ban") || "kick" } });
        break;
      case "toxic": {
        const addWord = interaction.fields.getTextInputValue("add_word").trim();
        const removeWord = interaction.fields.getTextInputValue("remove_word").trim();
        const words = [...config.toxicFilter.customWords];
        if (addWord && !words.includes(addWord)) words.push(addWord);
        if (removeWord) words.splice(words.indexOf(removeWord), 1);
        setGuildConfig(guildId, { toxicFilter: { enabled: yes(interaction.fields.getTextInputValue("enabled")), timeoutMinutes: num(interaction.fields.getTextInputValue("timeout"), 10), customWords: words } });
        break;
      }
    }

    const updatedConfig = getGuildConfig(guildId);
    const iconURL = interaction.guild.iconURL({ size: 256 });
    await interaction.reply({
      embeds: [sectionEmbed(section, updatedConfig).setFooter({ text: "✅ Gespeichert!" })],
      components: [sectionButtons(section)],
      flags: MessageFlags.Ephemeral,
    });
  } catch (err) {
    console.error("[Admin] Modal error:", err);
    await interaction.reply({ content: "❌ Fehler beim Speichern.", flags: MessageFlags.Ephemeral });
  }
}

// ─── Main handler ──────────────────────────────────────────────────────────────

export async function handleAdminCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) return;

  const member = interaction.member;
  const hasAdmin = member && typeof member.permissions !== "string" && member.permissions.has(PermissionFlagsBits.Administrator);
  if (!hasAdmin) {
    await interaction.reply({ content: "❌ Du benötigst Administrator-Rechte.", flags: MessageFlags.Ephemeral });
    return;
  }

  const config = getGuildConfig(interaction.guild.id);
  const iconURL = interaction.guild.iconURL({ size: 256 });

  await interaction.reply({
    embeds: [overviewEmbed(interaction.guild.name, iconURL, config)],
    components: [navRow()],
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

  // Back button
  if (interaction.isButton() && interaction.customId === "admin_back") {
    const config = getGuildConfig(interaction.guildId);
    const iconURL = interaction.guild.iconURL({ size: 256 });
    await interaction.update({
      embeds: [overviewEmbed(interaction.guild.name, iconURL, config)],
      components: [navRow()],
    });
    return;
  }

  // Create stats button
  if (interaction.isButton() && interaction.customId === "admin_create_stats") {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      const { createStatsChannels } = await import("../features/server-stats.js");
      await createStatsChannels(interaction.guild);
      await interaction.editReply({ content: "✅ Stats-Channels wurden erstellt!" });
    } catch {
      await interaction.editReply({ content: "❌ Fehler beim Erstellen der Stats-Channels." });
    }
    return;
  }

  // Test welcome
  if (interaction.isButton() && interaction.customId === "admin_test_welcome") {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      const member = await interaction.guild.members.fetch(interaction.user.id);
      await handleMemberWelcome(member);
      await interaction.editReply({ content: "✅ Test-Welcome gesendet!" });
    } catch {
      await interaction.editReply({ content: "❌ Fehler beim Senden der Test-Welcome." });
    }
    return;
  }

  // Send panel button
  if (interaction.isButton() && interaction.customId.startsWith("admin_sendpanel_")) {
    const section = interaction.customId.replace("admin_sendpanel_", "") as "verify" | "rules" | "tickets";
    await interaction.showModal(buildSendPanelModal(section));
    return;
  }

  // Edit button
  if (interaction.isButton() && interaction.customId.startsWith("admin_edit_")) {
    const section = interaction.customId.replace("admin_edit_", "") as Section;
    const config = getGuildConfig(interaction.guildId);
    await interaction.showModal(buildModal(section, config));
    return;
  }

  // Nav select menu
  if (interaction.isStringSelectMenu() && interaction.customId === "admin_nav") {
    const section = interaction.values[0] as Section;
    const config = getGuildConfig(interaction.guildId);
    await interaction.update({
      embeds: [sectionEmbed(section, config)],
      components: [sectionButtons(section), backRow()],
    });
    return;
  }
}
