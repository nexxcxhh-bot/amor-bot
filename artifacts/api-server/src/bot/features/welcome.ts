import { GuildMember, EmbedBuilder, TextChannel } from "discord.js";
import { getGuildConfig } from "../storage.js";

const DIV = "▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬";

function ordinal(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(".", ",")}k`;
  return n.toLocaleString("de-DE");
}

function accountAge(createdAt: number): string {
  const days = Math.floor((Date.now() - createdAt) / 86_400_000);
  if (days === 0) return "Heute erstellt";
  if (days === 1) return "vor 1 Tag erstellt";
  if (days < 30) return `vor ${days} Tagen erstellt`;
  const months = Math.floor(days / 30);
  if (months === 1) return "vor 1 Monat erstellt";
  if (months < 12) return `vor ${months} Monaten erstellt`;
  const years = Math.floor(days / 365);
  return `vor ${years} Jahr${years > 1 ? "en" : ""} erstellt`;
}

function buildWelcomeEmbed(member: GuildMember): EmbedBuilder {
  const guild = member.guild;
  const count = guild.memberCount;
  const iconURL = guild.iconURL({ size: 256 }) ?? undefined;

  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setAuthor({ name: guild.name, iconURL })
    .setTitle(`✦  Willkommen auf ${guild.name}!`)
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setDescription(
      `Hey <@${member.id}>, schön dass du hier bist! 👋\n\n` +
      `Wir freuen uns, dich in unserer Community zu haben.\n` +
      `Hier kannst du neue Leute kennenlernen, dich austauschen\n` +
      `und einfach eine gute Zeit haben.\n\n` +
      `${DIV}\n\u200b`,
    )
    .addFields(
      {
        name: "🎉  Mitglied",
        value: `Du bist unser **${ordinal(count)}. Mitglied!**`,
        inline: true,
      },
      {
        name: "🗓️  Account",
        value: accountAge(member.user.createdTimestamp),
        inline: true,
      },
      {
        name: "\u200b",
        value: "\u200b",
        inline: true,
      },
      {
        name: "〢 🚀  Erste Schritte",
        value:
          "╰ Lies die **Serverregeln** und akzeptiere sie\n" +
          "╰ Verifiziere dich um Zugang zu erhalten\n" +
          "╰ Stell dich gerne kurz vor!\n" +
          "╰ Bei Fragen → Ticket öffnen",
        inline: false,
      },
    )
    .setFooter({ text: `${guild.name} • Willkommen in unserer Community!`, iconURL })
    .setTimestamp();
}

function buildWelcomeDmEmbed(member: GuildMember, customMessage?: string): EmbedBuilder {
  const guild = member.guild;
  const count = guild.memberCount;
  const iconURL = guild.iconURL({ size: 256 }) ?? undefined;

  if (customMessage) {
    return new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`Willkommen auf ${guild.name}!`)
      .setThumbnail(iconURL ?? null)
      .setDescription(
        customMessage
          .replace("{user}", `<@${member.id}>`)
          .replace("{username}", member.user.username)
          .replace("{server}", guild.name)
          .replace("{membercount}", ordinal(count)),
      )
      .setFooter({ text: guild.name, iconURL })
      .setTimestamp();
  }

  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setAuthor({ name: guild.name, iconURL })
    .setTitle(`Willkommen auf ${guild.name}`)
    .setThumbnail(iconURL ?? null)
    .setDescription(
      `Schön, dass du hier bist – wir freuen uns, dich in unserer Community zu haben.\n` +
      `Hier kannst du dich mit anderen austauschen, neue Leute kennenlernen und einfach eine gute Zeit haben.\n\n` +
      `Achte bitte auf einen respektvollen Umgang miteinander und hab Spaß beim Mitmachen!\n\n` +
      `Wenn du Fragen hast, steht dir das Team jederzeit zur Verfügung.\n\n` +
      `${DIV}`,
    )
    .addFields(
      { name: "🎉  Mitglied", value: `Du bist unser **${ordinal(count)}. Mitglied!**`, inline: true },
      { name: "🗓️  Account", value: accountAge(member.user.createdTimestamp), inline: true },
      {
        name: "〢 🚀  Erste Schritte",
        value:
          "╰ Lies die Serverregeln durch\n" +
          "╰ Verifiziere dich für Zugang\n" +
          "╰ Viel Spaß auf dem Server!",
        inline: false,
      },
    )
    .setFooter({ text: `${guild.name} • Willkommen in unserer Community!`, iconURL })
    .setTimestamp();
}

export async function handleMemberWelcome(member: GuildMember): Promise<void> {
  const config = getGuildConfig(member.guild.id);
  if (!config.welcome.enabled) return;

  if (config.welcome.dmUser) {
    try {
      await member.user.send({
        embeds: [buildWelcomeDmEmbed(member, config.welcome.message)],
      });
    } catch {
      /* DMs closed */
    }
  }

  if (config.welcome.channelId) {
    const channel = member.guild.channels.cache.get(config.welcome.channelId) as TextChannel | undefined;
    if (channel) {
      await channel
        .send({ content: `<@${member.id}>`, embeds: [buildWelcomeEmbed(member)] })
        .catch(() => null);
    }
  }
}
