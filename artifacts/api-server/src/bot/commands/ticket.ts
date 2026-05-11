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
} from "discord.js";
import { ticketPanelEmbed, successEmbed, errorEmbed } from "../utils/embeds.js";

export const ticketCommand = new SlashCommandBuilder()
  .setName("ticket")
  .setDescription("Ticket-System")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
  .addSubcommand((sub) =>
    sub
      .setName("panel")
      .setDescription("Ticket-Panel in einem Channel posten")
      .addChannelOption((opt) =>
        opt
          .setName("channel")
          .setDescription("Channel (Standard: aktueller Channel)")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(false),
      ),
  );

export async function handleTicketCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.guild) return;

  const sub = interaction.options.getSubcommand();

  if (sub === "panel") {
    const channelOption = interaction.options.getChannel("channel");
    const targetChannelId = channelOption?.id ?? interaction.channelId;
    const targetChannel = interaction.guild.channels.cache.get(targetChannelId) as TextChannel | undefined;

    if (!targetChannel || !("send" in targetChannel)) {
      await interaction.reply({
        embeds: [errorEmbed("Channel nicht gefunden oder keine Schreibrechte.")],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const openButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("ticket_create")
        .setLabel("🎫  Ticket erstellen")
        .setStyle(ButtonStyle.Primary),
    );

    try {
      await targetChannel.send({
        embeds: [ticketPanelEmbed(interaction.guild.name, interaction.guild.iconURL())],
        components: [openButton],
      });

      await interaction.reply({
        embeds: [successEmbed(`Ticket-Panel in <#${targetChannelId}> gepostet!`)],
        flags: MessageFlags.Ephemeral,
      });
    } catch {
      await interaction.reply({
        embeds: [errorEmbed("Fehler beim Posten. Überprüfe meine Berechtigungen in dem Channel.")],
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
