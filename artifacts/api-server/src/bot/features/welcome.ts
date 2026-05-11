import { GuildMember, EmbedBuilder, TextChannel } from "discord.js";
import { getGuildConfig } from "../storage.js";

function buildWelcomeEmbed(member: GuildMember): EmbedBuilder {
  const guild = member.guild;
  const memberNumber = guild.memberCount;
  const accountAgeDays = Math.floor((Date.now() - member.user.createdTimestamp) / 86_400_000);
  const accountStr =
    accountAgeDays === 0
      ? "Heute erstellt"
      : accountAgeDays === 1
      ? "vor 1 Tag erstellt"
      : `vor ${accountAgeDays} Tagen erstellt`;

  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setAuthor({
      name: guild.name,
      iconURL: guild.iconURL() ?? undefined,
    })
    .setTitle(`✦  Willkommen auf ${guild.name}`)
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setDescription(
      `Schön, dass du hier bist – wir freuen uns, dich in unserer Community zu haben.\n` +
      `Hier kannst du dich mit anderen austauschen, neue Leute kennenlernen und einfach eine gute Zeit haben.\n\n` +
      `Achte bitte auf einen respektvollen Umgang miteinander und hab Spaß beim Mitmachen!\n\n` +
      `Wenn du Fragen hast, steht dir das Team jederzeit zur Verfügung.`,
    )
    .addFields(
      {
        name: "🎉  Mitglied",
        value: `Du bist unser **${memberNumber.toLocaleString("de-DE")}. Mitglied!**`,
        inline: true,
      },
      {
        name: "🗓️  Account",
        value: accountStr,
        inline: true,
      },
      {
        name: "🚀  Erste Schritte",
        value:
          "→ Lies die **Serverregeln** durch\n" +
          "→ Verifiziere dich um Zugang zu erhalten\n" +
          "→ Stell dich gerne kurz vor!",
        inline: false,
      },
    )
    .setFooter({
      text: `${guild.name} • Willkommen in unserer Community!`,
      iconURL: guild.iconURL() ?? undefined,
    })
    .setTimestamp();
}

function buildWelcomeDmEmbed(member: GuildMember, customMessage?: string): EmbedBuilder {
  const guild = member.guild;
  const memberNumber = guild.memberCount;
  const accountAgeDays = Math.floor((Date.now() - member.user.createdTimestamp) / 86_400_000);
  const accountStr = accountAgeDays === 0 ? "Heute erstellt" : `vor ${accountAgeDays} Tag(en) erstellt`;

  if (customMessage) {
    return new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`Willkommen auf ${guild.name}!`)
      .setThumbnail(guild.iconURL({ size: 256 }) ?? null)
      .setDescription(
        customMessage
          .replace("{user}", `<@${member.id}>`)
          .replace("{username}", member.user.username)
          .replace("{server}", guild.name)
          .replace("{membercount}", memberNumber.toLocaleString("de-DE")),
      )
      .setFooter({ text: guild.name, iconURL: guild.iconURL() ?? undefined })
      .setTimestamp();
  }

  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setAuthor({ name: guild.name, iconURL: guild.iconURL() ?? undefined })
    .setTitle(`Willkommen auf ${guild.name}`)
    .setThumbnail(guild.iconURL({ size: 256 }) ?? null)
    .setDescription(
      `Schön, dass du hier bist – wir freuen uns, dich in unserer Community zu haben. ` +
      `Hier kannst du dich mit anderen austauschen, neue Leute kennenlernen und einfach eine gute Zeit haben.\n\n` +
      `Achte bitte auf einen respektvollen Umgang miteinander und hab Spaß beim Mitmachen!\n\n` +
      `Wenn du Fragen hast, steht dir das Team jederzeit zur Verfügung.`,
    )
    .addFields(
      { name: "🎉  Mitglied", value: `Du bist unser **${memberNumber.toLocaleString("de-DE")}. Mitglied!**`, inline: true },
      { name: "🗓️  Account", value: accountStr, inline: true },
      {
        name: "🚀  Erste Schritte",
        value: "→ Lies die Serverregeln durch\n→ Verifiziere dich um Zugang zu erhalten",
        inline: false,
      },
    )
    .setFooter({ text: `${guild.name} • Willkommen in unserer Community!`, iconURL: guild.iconURL() ?? undefined })
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
      await channel.send({ content: `<@${member.id}>`, embeds: [buildWelcomeEmbed(member)] }).catch(() => null);
    }
  }
}
