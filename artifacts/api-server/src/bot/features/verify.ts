import {
  ButtonInteraction,
  GuildMember,
  EmbedBuilder,
} from "discord.js";
import { getGuildConfig } from "../storage.js";

export async function handleVerifyButton(
  interaction: ButtonInteraction,
): Promise<void> {
  const guild = interaction.guild;
  if (!guild) return;

  const config = getGuildConfig(guild.id);
  if (!config.verify.roleId) {
    await interaction.reply({
      content: "❌  Verification is not fully configured. Please ask an admin to set a verified role.",
      ephemeral: true,
    });
    return;
  }

  const member = interaction.member as GuildMember;
  if (member.roles.cache.has(config.verify.roleId)) {
    await interaction.reply({
      content: "✅  You are already verified!",
      ephemeral: true,
    });
    return;
  }

  try {
    await member.roles.add(config.verify.roleId, "Verified via button");
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle("✅  Verification Successful!")
          .setDescription(
            "You have been verified and now have access to the server.\n\n" +
            "Welcome to the community! 🎉",
          )
          .setFooter({ text: guild.name })
          .setTimestamp(),
      ],
      ephemeral: true,
    });
  } catch {
    await interaction.reply({
      content: "❌  Failed to give you the verified role. Please contact an admin.",
      ephemeral: true,
    });
  }
}
