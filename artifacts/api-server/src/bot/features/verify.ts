import { ButtonInteraction, GuildMember, EmbedBuilder } from "discord.js";
import { getGuildConfig } from "../storage.js";

export async function handleVerifyButton(interaction: ButtonInteraction): Promise<void> {
  const guild = interaction.guild;
  if (!guild) return;

  const config = getGuildConfig(guild.id);
  if (!config.verify.roleId) {
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("❌  Nicht konfiguriert")
          .setDescription("Die Verifizierung wurde noch nicht vollständig eingerichtet.\nBitte wende dich an einen Admin."),
      ],
      ephemeral: true,
    });
    return;
  }

  const member = interaction.member as GuildMember;
  if (member.roles.cache.has(config.verify.roleId)) {
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle("✅  Bereits verifiziert")
          .setDescription("Du bist bereits verifiziert und hast Zugang zum Server!"),
      ],
      ephemeral: true,
    });
    return;
  }

  try {
    await member.roles.add(config.verify.roleId, "Verifiziert via Button");
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57f287)
          .setAuthor({ name: guild.name, iconURL: guild.iconURL() ?? undefined })
          .setTitle("✅  Erfolgreich verifiziert!")
          .setDescription(
            `Du hast die Verifizierung abgeschlossen und hast jetzt Zugang zu allen öffentlichen Channels.\n\n` +
            `**Viel Spaß auf ${guild.name}!** 🎉`,
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
