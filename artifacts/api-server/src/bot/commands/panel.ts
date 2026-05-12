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
  .setDescription("Eigenes Info-Panel in einem Channel posten")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
  .addStringOption((opt) =>
    opt.setName("titel").setDescription("Panel-Titel").setRequired(true).setMaxLength(256),
  )
  .addStringOption((opt) =>
    opt.setName("inhalt").setDescription("Panel-Text (Markdown unterstützt)").setRequired(true).setMaxLength(4000),
  )
  .addChannelOption((opt) =>
    opt
      .setName("channel")
      .setDescription("Ziel-Channel (Standard: aktueller Channel)")
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(false),
  )
  .addStringOption((opt) =>
    opt
      .setName("farbe")
      .setDescription("Embed-Farbe (Standard: Blurple)")
      .addChoices(...COLOR_OPTIONS)
      .setRequired(false),
  );

export async function handlePanelCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.guild) return;

  const title = interaction.options.getString("titel", true);
  const description = interaction.options.getString("inhalt", true);
  const channelOption = interaction.options.getChannel("channel");
  const colorHex = interaction.options.getString("farbe") ?? "5865F2";
  const color = parseInt(colorHex, 16);

  const targetChannelId = channelOption?.id ?? interaction.channelId;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  let targetChannel: TextChannel | null = null;
  try {
    const fetched = await interaction.guild.channels.fetch(targetChannelId);
    if (fetched && fetched.type === ChannelType.GuildText) {
      targetChannel = fetched as TextChannel;
    }
  } catch {
    // not found
  }

  if (!targetChannel) {
    await interaction.editReply({ embeds: [errorEmbed("Channel nicht gefunden oder kein Text-Channel.")] });
    return;
  }

  try {
    await targetChannel.send({ embeds: [customPanelEmbed(title, description, color)] });
    await interaction.editReply({ embeds: [successEmbed(`Panel in <#${targetChannelId}> gepostet!`)] });
  } catch {
    await interaction.editReply({
      embeds: [errorEmbed("Fehler beim Posten. Überprüfe meine **Nachrichten senden** und **Embeds** Berechtigungen.")],
    });
  }
}
