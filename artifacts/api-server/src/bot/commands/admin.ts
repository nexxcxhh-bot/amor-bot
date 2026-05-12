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
  ChannelType,
  TextChannel,
} from "discord.js";
import { getGuildConfig, setGuildConfig } from "../storage.js";
import { handleMemberWelcome } from "../features/welcome.js";

export const adminCommand = new SlashCommandBuilder()
  .setName("admin")
  .setDescription("🎛️ Einheitliches Admin-Kontrollpanel öffnen");

// ─── Shared helpers ────────────────────────────────────────────────────────────

const SECTIONS = [
  { value: "welcome", label: "👋  Welcome Messages", description: "Neue Mitglieder begrüßen" },
  { value: "verify", label: "✅  Verifizierung", description: "Einmaliger Server-Zugang" },
  { value: "rules", label: "📜  Regelwerk", description: "Regeln & Akzeptieren-Button" },
  { value: "tickets", label: "🎫  Ticket-System", description: "Support-Tickets & Feedback" },
  { value: "giveaway", label: "🎉  Giveaways", description: "Giveaways starten & verwalten" },
  { value: "raid", label: "🛡️  Raid-Schutz", description: "Anti-Raid Einstellungen" },
  { value: "nuke", label: "💣  Nuke-Schutz", description: "Anti-Nuke Einstellungen" },
  { value: "toxic", label: "🤬  Toxic-Filter", description: "Toxische Nutzer auto-timeout" },
  { value: "stats", label: "📊  Server-Stats", description: "Live-Statistik Channels" },
] as const;

type Section = (typeof SECTIONS)[number]["value"];

const icon = (v: boolean) => (v ? "🟢" : "🔴");
const ch = (id?: string) => (id ? `<#${id}>` : "`—`");
const role = (id?: string) => (id ? `<@&${id}>` : "`—`");

function buildNavRow() {
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("admin_nav")
      .setPlaceholder("📂  Bereich auswählen...")
      .addOptions(SECTIONS.map((s) => new StringSelectMenuOptionBuilder().setLabel(s.label).setValue(s.value).setDescription(s.description))),
  );
}

function backRow() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("admin_back").setLabel("← Übersicht").setStyle(ButtonStyle.Secondary),
  );
}

// ─── Overview embed ───────────────────────────────────────────────────────────

function buildOverview(guildName: string, iconURL: string | null, config: ReturnType<typeof getGuildConfig>): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setAuthor({ name: `${guildName} — Admin Kontrollpanel`, iconURL: iconURL ?? undefined })
    .setTitle("⚙️  Bot-Konfiguration Übersicht")
    .setDescription("Wähle einen Bereich aus dem Menü unten, um ihn zu konfigurieren.\n\u200b")
    .addFields(
      { name: `${icon(config.welcome.enabled)}  Welcome`, value: config.welcome.channelId ? ch(config.welcome.channelId) : "`Nicht gesetzt`", inline: true },
      { name: `${icon(config.verify.enabled)}  Verify`, value: config.verify.roleId ? role(config.verify.roleId) : "`Nicht gesetzt`", inline: true },
      { name: `${icon(config.rules.enabled)}  Regeln`, value: `${config.rules.rules.length} Regel(n)`, inline: true },
      { name: "🎫  Tickets", value: config.ticketSupportRoleId ? role(config.ticketSupportRoleId) : "`Nicht gesetzt`", inline: true },
      { name: `${icon(config.raidProtection.enabled)}  Raid`, value: config.raidProtection.enabled ? `**${config.raidProtection.action}**` : "`aus`", inline: true },
      { name: `${icon(config.nukeProtection.enabled)}  Nuke`, value: config.nukeProtection.enabled ? `**${config.nukeProtection.action}**` : "`aus`", inline: true },
      { name: `${icon(config.toxicFilter.enabled)}  Toxic Filter`, value: config.toxicFilter.enabled ? `${config.toxicFilter.timeoutMinutes}min` : "`aus`", inline: true },
      { name: "📊  Stats", value: config.statsCategoryId ? "Aktiv" : "`Nicht gesetzt`", inline: true },
      { name: "🎉  Giveaways", value: "Nutze `/giveaway start`", inline: true },
    )
    .setFooter({ text: "Tipp: Alle Änderungen werden sofort aktiv", iconURL: iconURL ?? undefined })
    .setTimestamp();
}

// ─── Section embeds ───────────────────────────────────────────────────────────

function buildSectionEmbed(section: Section, config: ReturnType<typeof getGuildConfig>): EmbedBuilder {
  const e = new EmbedBuilder().setTimestamp();

  switch (section) {
    case "welcome":
      return e.setColor(0x5865f2).setTitle("👋  Welcome Messages").addFields(
        { name: "Status", value: icon(config.welcome.enabled) + (config.welcome.enabled ? " Aktiviert" : " Deaktiviert"), inline: true },
        { name: "Channel", value: ch(config.welcome.channelId), inline: true },
        { name: "DM bei Beitritt", value: config.welcome.dmUser ? "Ja" : "Nein", inline: true },
        { name: "Eigener DM-Text", value: config.welcome.message ? `\`${config.welcome.message.slice(0, 80)}…\`` : "`Standard`", inline: false },
      ).setFooter({ text: "Bearbeiten zum Ändern • Test zum Vorschauen" });

    case "verify":
      return e.setColor(0x57f287).setTitle("✅  Verifizierungs-System").addFields(
        { name: "Status", value: icon(config.verify.enabled) + (config.verify.enabled ? " Aktiviert" : " Deaktiviert"), inline: true },
        { name: "Verifiziert-Rolle", value: role(config.verify.roleId), inline: true },
        { name: "Hinweis", value: "Klicke **Panel senden** um das Verifizierungs-Panel in einen Channel zu posten.", inline: false },
      ).setFooter({ text: "Bearbeiten zum Ändern • Panel senden zum Posten" });

    case "rules":
      return e.setColor(0xed4245).setTitle("📜  Regelwerk").addFields(
        { name: "Status", value: icon(config.rules.enabled) + (config.rules.enabled ? " Aktiviert" : " Deaktiviert"), inline: true },
        { name: "Akzeptieren-Rolle", value: role(config.rules.acceptRoleId), inline: true },
        { name: "Regelanzahl", value: `**${config.rules.rules.length}** Regel(n)`, inline: true },
        { name: "Aktuelle Regeln", value: config.rules.rules.length ? config.rules.rules.slice(0, 5).map((r, i) => `**${i + 1}.** ${r}`).join("\n") + (config.rules.rules.length > 5 ? "\n*…und mehr*" : "") : "*Keine — nutze `/rules add`*", inline: false },
        { name: "Hinweis", value: "Klicke **Panel senden** um das Regelwerk in einen Channel zu posten.", inline: false },
      ).setFooter({ text: "Bearbeiten zum Ändern • Panel senden zum Posten" });

    case "tickets":
      return e.setColor(0x5865f2).setTitle("🎫  Ticket-System").addFields(
        { name: "Support-Rolle", value: role(config.ticketSupportRoleId), inline: true },
        { name: "Log-Channel", value: ch(config.ticketLogChannelId), inline: true },
        { name: "Feedback-Channel", value: ch(config.feedbackChannelId), inline: true },
        { name: "Hinweis", value: "Klicke **Panel senden** um das Ticket-Panel in einen Channel zu posten.", inline: false },
      ).setFooter({ text: "Bearbeiten zum Ändern • Panel senden zum Posten" });

    case "giveaway":
      return e.setColor(0xfee75c).setTitle("🎉  Giveaway-System").setDescription(
        "Nutze den `/giveaway` Befehl zum Verwalten.\n\n" +
        "**Befehle:**\n" +
        "`/giveaway start preis: dauer: gewinner: channel:` — Giveaway starten\n" +
        "`/giveaway end nachrichten-id:` — Vorzeitig beenden\n" +
        "`/giveaway reroll nachrichten-id:` — Gewinner neu auslosen\n" +
        "`/giveaway list` — Aktive Giveaways anzeigen\n\n" +
        "**Dauerformat:** `10m`, `1h`, `1d`, `7d`",
      ).setFooter({ text: "Giveaways werden über /giveaway verwaltet" });

    case "raid":
      return e.setColor(0xed4245).setTitle("🛡️  Raid-Schutz").addFields(
        { name: "Status", value: icon(config.raidProtection.enabled) + (config.raidProtection.enabled ? " Aktiviert" : " Deaktiviert"), inline: true },
        { name: "Beitritts-Schwellwert", value: `**${config.raidProtection.joinThreshold}** Beitritte`, inline: true },
        { name: "Zeitfenster", value: `**${config.raidProtection.timeWindowSeconds}s**`, inline: true },
        { name: "Aktion", value: `**${config.raidProtection.action}**`, inline: true },
      ).setFooter({ text: "Bearbeiten zum Ändern" });

    case "nuke":
      return e.setColor(0xed4245).setTitle("💣  Nuke-Schutz").addFields(
        { name: "Status", value: icon(config.nukeProtection.enabled) + (config.nukeProtection.enabled ? " Aktiviert" : " Deaktiviert"), inline: true },
        { name: "Channel-Löschungen", value: `**${config.nukeProtection.channelDeleteThreshold}** in 10s`, inline: true },
        { name: "Rollen-Löschungen", value: `**${config.nukeProtection.roleDeleteThreshold}** in 10s`, inline: true },
        { name: "Massen-Bans", value: `**${config.nukeProtection.banThreshold}** in 10s`, inline: true },
        { name: "Aktion", value: `**${config.nukeProtection.action}**`, inline: true },
      ).setFooter({ text: "Bearbeiten zum Ändern" });

    case "toxic":
      return e.setColor(0xfee75c).setTitle("🤬  Toxic-Filter").addFields(
        { name: "Status", value: icon(config.toxicFilter.enabled) + (config.toxicFilter.enabled ? " Aktiviert" : " Deaktiviert"), inline: true },
        { name: "Timeout-Dauer", value: `**${config.toxicFilter.timeoutMinutes} Minuten**`, inline: true },
        { name: "Eigene gesperrte Wörter", value: config.toxicFilter.customWords.length ? config.toxicFilter.customWords.map((w) => `\`${w}\``).join(", ") : "*Keine*", inline: false },
      ).setFooter({ text: "Bearbeiten zum Ändern" });

    case "stats":
      return e.setColor(0x5865f2).setTitle("📊  Server-Stats").addFields(
        { name: "Kategorie", value: ch(config.statsCategoryId), inline: true },
        { name: "Mitglieder-Channel", value: ch(config.memberCountChannelId), inline: true },
        { name: "Bot-Channel", value: ch(config.botCountChannelId), inline: true },
        { name: "Ticket-Channel", value: ch(config.ticketCountChannelId), inline: true },
        { name: "Update-Intervall", value: "Alle **5 Minuten** automatisch", inline: false },
      ).setFooter({ text: "Erstellen/Neuerstellen zum Einrichten der Stats-Channels" });

    default:
      return e.setTitle("Bereich").setDescription("Unbekannter Bereich");
  }
}

function buildSectionButtons(section: Section): ActionRowBuilder<ButtonBuilder> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("admin_back").setLabel("← Zurück").setStyle(ButtonStyle.Secondary),
  );

  if (section === "stats") {
    row.addComponents(
      new ButtonBuilder().setCustomId("admin_create_stats").setLabel("🔧 Stats erstellen").setStyle(ButtonStyle.Primary),
    );
  } else if (section === "welcome") {
    row.addComponents(
      new ButtonBuilder().setCustomId(`admin_edit_${section}`).setLabel("✏️ Bearbeiten").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("admin_test_welcome").setLabel("📨 Test-Welcome senden").setStyle(ButtonStyle.Success),
    );
  } else if (section === "giveaway") {
    // no edit button
  } else if (section === "verify" || section === "rules" || section === "tickets") {
    row.addComponents(
      new ButtonBuilder().setCustomId(`admin_edit_${section}`).setLabel("✏️ Bearbeiten").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`admin_sendpanel_${section}`).setLabel("📤 Panel senden").setStyle(ButtonStyle.Success),
    );
  } else {
    row.addComponents(
      new ButtonBuilder().setCustomId(`admin_edit_${section}`).setLabel("✏️ Bearbeiten").setStyle(ButtonStyle.Primary),
    );
  }

  return row;
}

// ─── Modals ────────────────────────────────────────────────────────────────────

function buildModal(section: Section, config: ReturnType<typeof getGuildConfig>): ModalBuilder {
  const modal = new ModalBuilder().setCustomId(`admin_modal_${section}`);

  switch (section) {
    case "welcome": {
      modal.setTitle("Welcome Messages konfigurieren");
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId("enabled").setLabel("Aktivieren? (ja / nein)").setStyle(TextInputStyle.Short).setValue(config.welcome.enabled ? "ja" : "nein").setRequired(true),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId("channel_id").setLabel("Welcome-Channel ID").setStyle(TextInputStyle.Short).setValue(config.welcome.channelId ?? "").setRequired(false).setPlaceholder("Rechtsklick auf Channel → ID kopieren"),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId("dm_user").setLabel("Neue Mitglieder per DM begrüßen? (ja / nein)").setStyle(TextInputStyle.Short).setValue(config.welcome.dmUser ? "ja" : "nein").setRequired(true),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId("message").setLabel("Eigener DM-Text (leer = Standard)").setStyle(TextInputStyle.Paragraph).setValue(config.welcome.message ?? "").setRequired(false).setPlaceholder("Nutze {user}, {server}, {membercount}"),
        ),
      );
      break;
    }
    case "verify": {
      modal.setTitle("Verifizierung konfigurieren");
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId("enabled").setLabel("Aktivieren? (ja / nein)").setStyle(TextInputStyle.Short).setValue(config.verify.enabled ? "ja" : "nein").setRequired(true),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId("role_id").setLabel("Verifiziert-Rolle ID").setStyle(TextInputStyle.Short).setValue(config.verify.roleId ?? "").setRequired(false).setPlaceholder("Rechtsklick auf Rolle → ID kopieren"),
        ),
      );
      break;
    }
    case "rules": {
      modal.setTitle("Regelwerk konfigurieren");
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId("enabled").setLabel("Aktivieren? (ja / nein)").setStyle(TextInputStyle.Short).setValue(config.rules.enabled ? "ja" : "nein").setRequired(true),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId("accept_role_id").setLabel("Akzeptieren-Rolle ID").setStyle(TextInputStyle.Short).setValue(config.rules.acceptRoleId ?? "").setRequired(false).setPlaceholder("Rechtsklick auf Rolle → ID kopieren"),
        ),
      );
      break;
    }
    case "tickets": {
      modal.setTitle("Ticket-System konfigurieren");
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId("support_role_id").setLabel("Support-Rolle ID").setStyle(TextInputStyle.Short).setValue(config.ticketSupportRoleId ?? "").setRequired(false).setPlaceholder("Rechtsklick auf Rolle → ID kopieren"),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId("log_channel_id").setLabel("Log-Channel ID").setStyle(TextInputStyle.Short).setValue(config.ticketLogChannelId ?? "").setRequired(false),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId("feedback_channel_id").setLabel("Feedback-Channel ID").setStyle(TextInputStyle.Short).setValue(config.feedbackChannelId ?? "").setRequired(false),
        ),
      );
      break;
    }
    case "raid": {
      modal.setTitle("Raid-Schutz konfigurieren");
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId("enabled").setLabel("Aktivieren? (ja / nein)").setStyle(TextInputStyle.Short).setValue(config.raidProtection.enabled ? "ja" : "nein").setRequired(true),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId("threshold").setLabel("Beitritts-Schwellwert (Zahl)").setStyle(TextInputStyle.Short).setValue(String(config.raidProtection.joinThreshold)).setRequired(true),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId("window").setLabel("Zeitfenster in Sekunden").setStyle(TextInputStyle.Short).setValue(String(config.raidProtection.timeWindowSeconds)).setRequired(true),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId("action").setLabel("Aktion (kick / ban / lockdown)").setStyle(TextInputStyle.Short).setValue(config.raidProtection.action).setRequired(true),
        ),
      );
      break;
    }
    case "nuke": {
      modal.setTitle("Nuke-Schutz konfigurieren");
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId("enabled").setLabel("Aktivieren? (ja / nein)").setStyle(TextInputStyle.Short).setValue(config.nukeProtection.enabled ? "ja" : "nein").setRequired(true),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId("channel_threshold").setLabel("Channel-Lösch-Schwellwert").setStyle(TextInputStyle.Short).setValue(String(config.nukeProtection.channelDeleteThreshold)).setRequired(true),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId("role_threshold").setLabel("Rollen-Lösch-Schwellwert").setStyle(TextInputStyle.Short).setValue(String(config.nukeProtection.roleDeleteThreshold)).setRequired(true),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId("ban_threshold").setLabel("Massen-Ban-Schwellwert").setStyle(TextInputStyle.Short).setValue(String(config.nukeProtection.banThreshold)).setRequired(true),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId("action").setLabel("Aktion (kick / ban)").setStyle(TextInputStyle.Short).setValue(config.nukeProtection.action).setRequired(true),
        ),
      );
      break;
    }
    case "toxic": {
      modal.setTitle("Toxic-Filter konfigurieren");
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId("enabled").setLabel("Aktivieren? (ja / nein)").setStyle(TextInputStyle.Short).setValue(config.toxicFilter.enabled ? "ja" : "nein").setRequired(true),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId("timeout").setLabel("Timeout in Minuten").setStyle(TextInputStyle.Short).setValue(String(config.toxicFilter.timeoutMinutes)).setRequired(true),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId("add_word").setLabel("Wort hinzufügen (leer = überspringen)").setStyle(TextInputStyle.Short).setRequired(false).setValue(""),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId("remove_word").setLabel("Wort entfernen (leer = überspringen)").setStyle(TextInputStyle.Short).setRequired(false).setValue(""),
        ),
      );
      break;
    }
  }

  return modal;
}

function buildSendPanelModal(section: "verify" | "rules" | "tickets"): ModalBuilder {
  const labels: Record<string, string> = {
    verify: "Verifizierungs-Panel senden",
    rules: "Regelwerk-Panel senden",
    tickets: "Ticket-Panel senden",
  };
  const modal = new ModalBuilder()
    .setCustomId(`admin_sendpanel_modal_${section}`)
    .setTitle(labels[section] ?? "Panel senden");

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId("channel_id")
        .setLabel("Ziel-Channel ID")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder("Rechtsklick auf Channel → ID kopieren"),
    ),
  );

  return modal;
}

// ─── Handle modal submissions ─────────────────────────────────────────────────

async function handleModalSubmit(interaction: ModalSubmitInteraction): Promise<void> {
  const guildId = interaction.guildId;
  if (!guildId || !interaction.guild) return;

  // Handle "send panel" modals
  if (interaction.customId.startsWith("admin_sendpanel_modal_")) {
    const section = interaction.customId.replace("admin_sendpanel_modal_", "") as "verify" | "rules" | "tickets";
    const channelId = interaction.fields.getTextInputValue("channel_id").trim();

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    let targetChannel: TextChannel | null = null;
    try {
      const fetched = await interaction.guild.channels.fetch(channelId);
      if (fetched && fetched.type === ChannelType.GuildText) {
        targetChannel = fetched as TextChannel;
      }
    } catch {
      // not found
    }

    if (!targetChannel) {
      await interaction.editReply({ content: `❌ Channel \`${channelId}\` nicht gefunden. Bitte prüfe die ID.` });
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
      await interaction.editReply({ content: "❌ Fehler beim Posten. Überprüfe meine Berechtigungen in dem Channel." });
    }
    return;
  }

  // Handle config modals
  const config = getGuildConfig(guildId);
  const section = interaction.customId.replace("admin_modal_", "") as Section;
  const yes = (v: string) => ["ja", "yes", "1", "true"].includes(v.trim().toLowerCase());
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
    await interaction.reply({ content: "❌ Speichern fehlgeschlagen. Überprüfe deine Eingaben.", flags: MessageFlags.Ephemeral });
    return;
  }

  const updated = getGuildConfig(guildId);
  await interaction.reply({
    embeds: [
      buildSectionEmbed(section, updated)
        .setDescription("✅  **Erfolgreich gespeichert!** Deine Änderungen sind jetzt aktiv.\n\u200b"),
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

  if (interaction.isModalSubmit()) {
    await handleModalSubmit(interaction);
    return;
  }

  const config = getGuildConfig(interaction.guildId);

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

  if (customId === "admin_back") {
    await interaction.update({
      embeds: [buildOverview(interaction.guild.name, interaction.guild.iconURL(), config)],
      components: [buildNavRow()],
    });
    return;
  }

  if (customId === "admin_create_stats") {
    await interaction.deferUpdate();
    try {
      const { createStatsChannels } = await import("../features/server-stats.js");
      await createStatsChannels(interaction.guild);
      const updated = getGuildConfig(interaction.guildId);
      await interaction.editReply({
        embeds: [buildSectionEmbed("stats", updated).setDescription("✅  **Stats-Channels erstellt!** Sie aktualisieren sich alle 5 Minuten.\n\u200b")],
        components: [buildSectionButtons("stats"), buildNavRow()],
      });
    } catch {
      await interaction.editReply({
        embeds: [buildSectionEmbed("stats", config).setDescription("❌  Fehlgeschlagen — stelle sicher dass ich **Channels verwalten** Berechtigung habe.\n\u200b")],
        components: [buildSectionButtons("stats"), buildNavRow()],
      });
    }
    return;
  }

  if (customId === "admin_test_welcome") {
    await interaction.deferUpdate();
    const member = interaction.member;
    if (member && "joinedTimestamp" in member) {
      await handleMemberWelcome(member as any);
    }
    const updated = getGuildConfig(interaction.guildId);
    await interaction.editReply({
      embeds: [buildSectionEmbed("welcome", updated).setDescription("📨  **Test-Welcome gesendet!** Überprüfe deinen Welcome-Channel.\n\u200b")],
      components: [buildSectionButtons("welcome"), buildNavRow()],
    });
    return;
  }

  // Panel senden buttons
  if (customId.startsWith("admin_sendpanel_")) {
    const section = customId.replace("admin_sendpanel_", "") as "verify" | "rules" | "tickets";
    const modal = buildSendPanelModal(section);
    await interaction.showModal(modal);
    return;
  }

  // Edit button → open modal
  if (customId.startsWith("admin_edit_")) {
    const section = customId.replace("admin_edit_", "") as Section;
    const modal = buildModal(section, config);
    await interaction.showModal(modal);
  }
}
