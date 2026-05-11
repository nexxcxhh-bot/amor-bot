import { ButtonInteraction, GuildMember, EmbedBuilder } from "discord.js";
import { getGuildConfig } from "../storage.js";

export async function handleRulesAccept(interaction: ButtonInteraction): Promise<void> {
  const guild = interaction.guild;
  if (!guild) return;

  const config = getGuildConfig(guild.id);
  if (!config.rules.acceptRoleId) {
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("❌  Nicht konfiguriert")
          .setDescription("Das Regelwerk wurde noch nicht vollständig eingerichtet.\nBitte wende dich an einen Admin."),
      ],
      ephemeral: true,
    });
    return;
  }

  const member = interaction.member as GuildMember;
  if (member.roles.cache.has(config.rules.acceptRoleId)) {
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle("✅  Bereits akzeptiert")
          .setDescription("Du hast die Regeln bereits akzeptiert!"),
      ],
      ephemeral: true,
    });
    return;
  }

  try {
    await member.roles.add(config.rules.acceptRoleId, "Regeln akzeptiert via Button");
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57f287)
          .setAuthor({ name: guild.name, iconURL: guild.iconURL() ?? undefined })
          .setTitle("✅  Regeln akzeptiert!")
          .setDescription(
            `Danke, dass du die Regeln gelesen und akzeptiert hast!\n\n` +
            `Du hast jetzt vollen Zugang zum Server. **Viel Spaß!** 🎉`,
          )
          .setFooter({ text: guild.name, iconURL: guild.iconURL() ?? undefined })
          .setTimestamp(),
      ],
      ephemeral: true,
    });
  } catch {
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("❌  Fehler")
          .setDescription("Die Rolle konnte nicht vergeben werden. Bitte wende dich an einen Admin."),
      ],
      ephemeral: true,
    });
  }
}
