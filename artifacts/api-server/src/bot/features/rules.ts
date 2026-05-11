import {
  ButtonInteraction,
  GuildMember,
  EmbedBuilder,
} from "discord.js";
import { getGuildConfig } from "../storage.js";

export async function handleRulesAccept(
  interaction: ButtonInteraction,
): Promise<void> {
  const guild = interaction.guild;
  if (!guild) return;

  const config = getGuildConfig(guild.id);
  if (!config.rules.acceptRoleId) {
    await interaction.reply({
      content: "❌  Rules acceptance is not configured. Ask an admin to set it up.",
      ephemeral: true,
    });
    return;
  }

  const member = interaction.member as GuildMember;
  if (member.roles.cache.has(config.rules.acceptRoleId)) {
    await interaction.reply({
      content: "✅  You have already accepted the rules!",
      ephemeral: true,
    });
    return;
  }

  try {
    await member.roles.add(config.rules.acceptRoleId, "Accepted rules via button");
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle("✅  Rules Accepted!")
          .setDescription(
            "Thank you for reading and accepting the rules!\n\n" +
            "You now have full access to the server. Enjoy your stay! 🎉",
          )
          .setFooter({ text: guild.name })
          .setTimestamp(),
      ],
      ephemeral: true,
    });
  } catch {
    await interaction.reply({
      content: "❌  Failed to give you the member role. Please contact an admin.",
      ephemeral: true,
    });
  }
}
