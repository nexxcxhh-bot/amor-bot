import { EmbedBuilder } from "discord.js";
import type { GuildConfig } from "../storage.js";

export const COLORS = {
  primary:  0x5865f2,
  success:  0x57f287,
  warning:  0xfee75c,
  danger:   0xed4245,
  neutral:  0x2b2d31,
  dark:     0x23272a,
  pink:     0xeb459e,
  gold:     0xffd700,
} as const;

const LINE = "─────────────────────────────────";

// ─── Ticket Panels ─────────────────────────────────────────────────────────────

export function ticketOpenedEmbed(userMention: string, ticketNumber: number): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle(`🎫  Ticket #${String(ticketNumber).padStart(4, "0")}`)
    .setDescription(
      `Willkommen ${userMention}!\n\n` +
      `> Ein Teammitglied wird sich **so schnell wie möglich** um dich kümmern.\n` +
      `> Bitte schildere dein Anliegen **so detailliert wie möglich**.\n\n` +
      `\`${LINE}\`\n` +
      `Zum Schließen → **🔒 Ticket schließen**`,
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
      `> **Dieser Channel wird in 5 Sekunden gelöscht.**`,
    )
    .setFooter({ text: "Ticket System" })
    .setTimestamp();
}

export function feedbackEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.gold)
    .setTitle("⭐  Wie war dein Support-Erlebnis?")
    .setDescription(
      `Dein Ticket wurde geschlossen.\n` +
      `Wir würden uns sehr über dein **Feedback** freuen!\n\n` +
      `> ⭐ — Sehr schlecht\n` +
      `> ⭐⭐ — Schlecht\n` +
      `> ⭐⭐⭐ — In Ordnung\n` +
      `> ⭐⭐⭐⭐ — Gut\n` +
      `> ⭐⭐⭐⭐⭐ — Ausgezeichnet`,
    )
    .setFooter({ text: "Dein Feedback hilft uns zu wachsen" });
}

export function feedbackReceivedEmbed(userId: string, rating: number, ticketNumber: number): EmbedBuilder {
  const stars = "⭐".repeat(rating);
  const labels = ["", "Sehr schlecht", "Schlecht", "In Ordnung", "Gut", "Ausgezeichnet"];
  const label = labels[rating] ?? "Unbekannt";
  const color = rating >= 4 ? COLORS.success : rating >= 3 ? COLORS.warning : COLORS.danger;

  return new EmbedBuilder()
    .setColor(color)
    .setTitle("📬  Neues Feedback erhalten")
    .addFields(
      { name: "👤  Nutzer", value: `<@${userId}>`, inline: true },
      { name: "🎫  Ticket", value: `#${String(ticketNumber).padStart(4, "0")}`, inline: true },
      { name: "⭐  Bewertung", value: `${stars}  **(${label})**`, inline: false },
    )
    .setFooter({ text: "Ticket Feedback System" })
    .setTimestamp();
}

// ─── Admin Panel ────────────────────────────────────────────────────────────────

export function settingsEmbed(guildName: string, config: GuildConfig): EmbedBuilder {
  const bool = (v: boolean) => (v ? "🟢 Aktiv" : "🔴 Inaktiv");
  const ch = (id?: string) => (id ? `<#${id}>` : "`—`");
  const role = (id?: string) => (id ? `<@&${id}>` : "`—`");

  return new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle(`⚙️  Konfiguration — ${guildName}`)
    .addFields(
      { name: "🎫  Ticket System", value: [`Kategorie: ${ch(config.ticketCategoryId)}`, `Log: ${ch(config.ticketLogChannelId)}`, `Rolle: ${role(config.ticketSupportRoleId)}`].join("\n"), inline: true },
      { name: "🛡️  Schutz-Systeme", value: [`Raid: ${bool(config.raidProtection.enabled)}`, `Nuke: ${bool(config.nukeProtection.enabled)}`, `Toxic: ${bool(config.toxicFilter.enabled)}`].join("\n"), inline: true },
    )
    .setFooter({ text: "Nutze /admin um alles zu konfigurieren" })
    .setTimestamp();
}

// ─── Utility Embeds ────────────────────────────────────────────────────────────

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
    .setTitle("⚠️  Raid erkannt!")
    .setDescription(
      `**${joinCount}** Accounts sind in sehr kurzer Zeit beigetreten.\n` +
      `> Ergriffene Maßnahme: **${action}**`,
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
      `> Aktion gegen den Ausführenden: **${action}**`,
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
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}
