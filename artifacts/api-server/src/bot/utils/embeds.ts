import { EmbedBuilder } from "discord.js";
import type { GuildConfig } from "../storage.js";

export const COLORS = {
  primary: 0x5865f2,
  success: 0x57f287,
  warning: 0xfee75c,
  danger: 0xed4245,
  neutral: 0x2b2d31,
  dark: 0x23272a,
} as const;

const DIV = "▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬";

// ─── Ticket Panels ─────────────────────────────────────────────────────────────

export function ticketPanelEmbed(guildName: string, iconURL?: string | null): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.primary)
    .setAuthor({ name: guildName, iconURL: iconURL ?? undefined })
    .setTitle("🎫  Support Ticket")
    .setDescription(
      `Brauchst du **Hilfe** oder hast ein **Anliegen**?\n` +
      `Unser Team steht dir zur Verfügung – klicke einfach auf den Button.\n\n${DIV}\n\u200b`,
    )
    .addFields(
      {
        name: "〢 📋  Wie funktioniert es?",
        value:
          "╰ **①** Klicke auf **Ticket erstellen**\n" +
          "╰ **②** Ein privater Channel wird geöffnet\n" +
          "╰ **③** Beschreibe dein Anliegen\n" +
          "╰ **④** Das Team meldet sich schnellstmöglich",
        inline: true,
      },
      {
        name: "〢 ℹ️  Wichtig",
        value:
          "╰ Nur **ein** Ticket gleichzeitig\n" +
          "╰ Kein Spam oder sinnlose Tickets\n" +
          "╰ Beschreibe dein Problem genau\n" +
          "╰ Sei geduldig — wir helfen dir",
        inline: true,
      },
      { name: "\u200b", value: DIV },
    )
    .setFooter({ text: `${guildName} • Support-System`, iconURL: iconURL ?? undefined })
    .setTimestamp();
}

export function ticketOpenedEmbed(userMention: string, ticketNumber: number): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle(`🎫  Ticket #${String(ticketNumber).padStart(4, "0")}`)
    .setDescription(
      `Willkommen ${userMention}!\n\n` +
      `Ein Teammitglied wird sich so schnell wie möglich um dich kümmern.\n` +
      `Bitte beschreibe dein Anliegen so **detailliert wie möglich**.\n\n` +
      `${DIV}\n` +
      `> Zum Schließen des Tickets → **🔒 Ticket schließen**`,
    )
    .setFooter({ text: "Support Ticket System" })
    .setTimestamp();
}

export function ticketClosedEmbed(closedByMention: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.danger)
    .setTitle("🔒  Ticket geschlossen")
    .setDescription(
      `Dieses Ticket wurde von ${closedByMention} geschlossen.\n\n` +
      `**Dieser Channel wird in 5 Sekunden gelöscht.**`,
    )
    .setFooter({ text: "Ticket System" })
    .setTimestamp();
}

export function feedbackEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle("⭐  Wie war dein Support-Erlebnis?")
    .setDescription(
      `Dein Ticket wurde geschlossen.\nWir würden uns über dein Feedback freuen!\n\n` +
      `${DIV}\n\n` +
      `> ⭐ — Sehr schlecht\n` +
      `> ⭐⭐ — Schlecht\n` +
      `> ⭐⭐⭐ — In Ordnung\n` +
      `> ⭐⭐⭐⭐ — Gut\n` +
      `> ⭐⭐⭐⭐⭐ — Ausgezeichnet\n\n` +
      `*Klicke auf eine Bewertung:*`,
    )
    .setFooter({ text: "Dein Feedback hilft uns, uns zu verbessern." });
}

export function feedbackReceivedEmbed(userId: string, rating: number, ticketNumber: number): EmbedBuilder {
  const stars = "⭐".repeat(rating);
  const labels = ["", "Sehr schlecht", "Schlecht", "In Ordnung", "Gut", "Ausgezeichnet"];
  const label = labels[rating] ?? "Unbekannt";
  const color = rating >= 4 ? COLORS.success : rating >= 3 ? COLORS.warning : COLORS.danger;

  return new EmbedBuilder()
    .setColor(color)
    .setTitle("📬  Neues Support-Feedback")
    .addFields(
      { name: "Nutzer", value: `<@${userId}>`, inline: true },
      { name: "Ticket", value: `#${String(ticketNumber).padStart(4, "0")}`, inline: true },
      { name: "Bewertung", value: `${stars}  **(${label})**`, inline: false },
    )
    .setFooter({ text: "Ticket Feedback System" })
    .setTimestamp();
}

// ─── Settings / Config ─────────────────────────────────────────────────────────

export function settingsEmbed(guildName: string, config: GuildConfig): EmbedBuilder {
  const bool = (v: boolean) => (v ? "🟢 Aktiv" : "🔴 Inaktiv");
  const ch = (id?: string) => (id ? `<#${id}>` : "`—`");
  const role = (id?: string) => (id ? `<@&${id}>` : "`—`");

  return new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle(`⚙️  Bot Konfiguration — ${guildName}`)
    .addFields(
      {
        name: "🎫  Ticket System",
        value: [
          `Kategorie: ${ch(config.ticketCategoryId)}`,
          `Log: ${ch(config.ticketLogChannelId)}`,
          `Rolle: ${role(config.ticketSupportRoleId)}`,
        ].join("\n"),
        inline: true,
      },
      {
        name: "🛡️  Schutz",
        value: [
          `Raid: ${bool(config.raidProtection.enabled)}`,
          `Nuke: ${bool(config.nukeProtection.enabled)}`,
          `Toxic: ${bool(config.toxicFilter.enabled)}`,
        ].join("\n"),
        inline: true,
      },
    )
    .setFooter({ text: "Nutze /admin um alles zu konfigurieren" })
    .setTimestamp();
}

// ─── Utility Embeds ────────────────────────────────────────────────────────────

export function successEmbed(description: string): EmbedBuilder {
  return new EmbedBuilder().setColor(COLORS.success).setDescription(`✅  ${description}`);
}

export function errorEmbed(description: string): EmbedBuilder {
  return new EmbedBuilder().setColor(COLORS.danger).setDescription(`❌  ${description}`);
}

export function raidAlertEmbed(joinCount: number, action: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.danger)
    .setTitle("⚠️  Raid erkannt!")
    .setDescription(
      `**${joinCount}** Accounts sind in sehr kurzer Zeit beigetreten.\n` +
      `Ergriffene Maßnahme: **${action}**`,
    )
    .setFooter({ text: "Raid Protection System" })
    .setTimestamp();
}

export function nukeAlertEmbed(type: string, count: number, action: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.danger)
    .setTitle("💣  Nuke-Versuch erkannt!")
    .setDescription(
      `Es wurden **${count}** schnelle ${type}(s) erkannt.\n` +
      `Aktion gegen den Ausführenden: **${action}**`,
    )
    .setFooter({ text: "Nuke Protection System" })
    .setTimestamp();
}

export function toxicAlertEmbed(username: string, timeoutMinutes: number): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.warning)
    .setTitle("🤬  Regelverstoß erkannt")
    .setDescription(
      `**${username}** wurde für **${timeoutMinutes} Minuten** stummgeschaltet,\n` +
      `da er/sie gegen die Community-Richtlinien verstoßen hat.`,
    )
    .setFooter({ text: "Toxic Filter" })
    .setTimestamp();
}

export function customPanelEmbed(title: string, description: string, color: number): EmbedBuilder {
  return new EmbedBuilder().setColor(color).setTitle(title).setDescription(description).setTimestamp();
}
