import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  MessageFlags,
  TextChannel,
  EmbedBuilder,
} from "discord.js";
import { successEmbed, errorEmbed } from "../utils/embeds.js";

export const verifyCommand = new SlashCommandBuilder()
  .setName("verify")
  .setDescription("Verification system commands")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
  .addSubcommand((sub) =>
    sub
      .setName("panel")
      .setDescription("Post the verification panel in a channel")
      .addChannelOption((opt) =>
        opt
          .setName("channel")
          .setDescription("Channel to post the verify panel in")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true),
      )
      .addStringOption((opt) =>
        opt
          .setName("title")
          .setDescription("Panel title")
          .setMaxLength(256)
          .setRequired(false),
      )
      .addStringOption((opt) =>
        opt
          .setName("description")
          .setDescription("Panel description")
          .setMaxLength(2000)
          .setRequired(false),
      ),
  );

export async function handleVerifyCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.guild) return;

  const sub = interaction.options.getSubcommand();

  if (sub === "panel") {
    const channelOption = interaction.options.getChannel("channel", true);
    const title = interaction.options.getString("title") ?? "Verification Required";
    const description =
      interaction.options.getString("description") ??
      "To gain access to the server you must verify yourself.\n\n" +
      "Click the button below to confirm you're human and unlock all channels.";

    const targetChannel = interaction.guild.channels.cache.get(
      channelOption.id,
    ) as TextChannel | undefined;

    if (!targetChannel || !("send" in targetChannel)) {
      await interaction.reply({
        embeds: [errorEmbed("Could not find or send to that channel.")],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`🔒  ${title}`)
      .setDescription(
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${description}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      )
      .addFields({
        name: "Why do I need to verify?",
        value:
          "Verification helps us keep the server safe from bots and raiders. It only takes one click!",
      })
      .setFooter({
        text: `${interaction.guild.name} • Verification`,
        iconURL: interaction.guild.iconURL() ?? undefined,
      })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("verify_click")
        .setLabel("✅  Verify Me")
        .setStyle(ButtonStyle.Success),
    );

    try {
      await targetChannel.send({ embeds: [embed], components: [row] });
      await interaction.reply({
        embeds: [successEmbed(`Verification panel posted in <#${channelOption.id}>!`)],
        flags: MessageFlags.Ephemeral,
      });
    } catch {
      await interaction.reply({
        embeds: [errorEmbed("Failed to post the panel. Check my permissions.")],
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
