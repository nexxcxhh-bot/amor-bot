import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
  TextChannel,
} from "discord.js";
import { customPanelEmbed, successEmbed, errorEmbed } from "../utils/embeds.js";

const COLOR_OPTIONS = [
  { name: "Blurple (Discord)", value: "5865F2" },
  { name: "Green", value: "57F287" },
  { name: "Yellow", value: "FEE75C" },
  { name: "Red", value: "ED4245" },
  { name: "Pink", value: "EB459E" },
  { name: "Dark", value: "2B2D31" },
  { name: "Gold", value: "FFD700" },
  { name: "Cyan", value: "00CED1" },
  { name: "Orange", value: "FF8C00" },
  { name: "White", value: "FFFFFF" },
];

export const panelCommand = new SlashCommandBuilder()
  .setName("panel")
  .setDescription("Create a custom information panel in any channel")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
  .addStringOption((opt) =>
    opt
      .setName("title")
      .setDescription("Panel title")
      .setRequired(true)
      .setMaxLength(256),
  )
  .addStringOption((opt) =>
    opt
      .setName("description")
      .setDescription("Panel text content (supports markdown)")
      .setRequired(true)
      .setMaxLength(4000),
  )
  .addChannelOption((opt) =>
    opt
      .setName("channel")
      .setDescription("Channel to post in (defaults to current channel)")
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(false),
  )
  .addStringOption((opt) =>
    opt
      .setName("color")
      .setDescription("Embed accent colour (default: Blurple)")
      .addChoices(...COLOR_OPTIONS)
      .setRequired(false),
  );

export async function handlePanelCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.guild) return;

  const title = interaction.options.getString("title", true);
  const description = interaction.options.getString("description", true);
  const channelOption = interaction.options.getChannel("channel");
  const colorHex = interaction.options.getString("color") ?? "5865F2";
  const color = parseInt(colorHex, 16);

  const targetChannelId = channelOption?.id ?? interaction.channelId;
  const targetChannel = interaction.guild.channels.cache.get(
    targetChannelId,
  ) as TextChannel | undefined;

  if (!targetChannel || !("send" in targetChannel)) {
    await interaction.reply({
      embeds: [errorEmbed("Could not find or send to that channel.")],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    await targetChannel.send({
      embeds: [customPanelEmbed(title, description, color)],
    });

    await interaction.reply({
      embeds: [successEmbed(`Panel posted in <#${targetChannelId}>!`)],
      flags: MessageFlags.Ephemeral,
    });
  } catch {
    await interaction.reply({
      embeds: [
        errorEmbed(
          "Failed to post the panel. Check that I have **Send Messages** and **Embed Links** in that channel.",
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }
}
