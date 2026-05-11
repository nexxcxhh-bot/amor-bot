import { GuildMember, EmbedBuilder, TextChannel } from "discord.js";
import { getGuildConfig } from "../storage.js";

function buildWelcomeEmbed(member: GuildMember): EmbedBuilder {
  const guild = member.guild;
  const memberNumber = guild.memberCount;
  const accountAge = Math.floor(
    (Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24),
  );

  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setAuthor({
      name: `Welcome to ${guild.name}!`,
      iconURL: guild.iconURL() ?? undefined,
    })
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setTitle(`✦  ${member.user.username} just joined the server`)
    .setDescription(
      `> Hey <@${member.id}>, welcome aboard! We're glad to have you here.\n` +
      `> Please read the rules and verify yourself to gain access.\n\u200b`,
    )
    .addFields(
      {
        name: "╔  Member Info",
        value:
          `┣ 📅 Joined Discord: **${accountAge} days ago**\n` +
          `┗ 🎉 You are member **#${memberNumber.toLocaleString()}**`,
        inline: false,
      },
      {
        name: "╔  Get Started",
        value:
          `┣ 📜 Read the rules and accept them\n` +
          `┣ ✅ Verify yourself to unlock the server\n` +
          `┗ 🎫 Open a ticket if you need help`,
        inline: false,
      },
    )
    .setImage(
      guild.bannerURL({ size: 1024 }) ?? null,
    )
    .setFooter({
      text: `${guild.name} • Member #${memberNumber.toLocaleString()}`,
      iconURL: guild.iconURL() ?? undefined,
    })
    .setTimestamp();
}

function buildWelcomeDmEmbed(member: GuildMember, customMessage?: string): EmbedBuilder {
  const guild = member.guild;

  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`✦  Welcome to ${guild.name}!`)
    .setThumbnail(guild.iconURL({ size: 256 }) ?? null)
    .setDescription(
      customMessage
        ? customMessage
            .replace("{user}", `<@${member.id}>`)
            .replace("{username}", member.user.username)
            .replace("{server}", guild.name)
            .replace("{membercount}", guild.memberCount.toLocaleString())
        : `Hey **${member.user.username}**! Welcome to **${guild.name}**.\n\nMake sure to read the rules and enjoy your stay! 🎉`,
    )
    .setFooter({ text: guild.name, iconURL: guild.iconURL() ?? undefined })
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
    const channel = member.guild.channels.cache.get(
      config.welcome.channelId,
    ) as TextChannel | undefined;
    if (channel) {
      await channel
        .send({ embeds: [buildWelcomeEmbed(member)] })
        .catch(() => null);
    }
  }
}
