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
  .setDescription("Ticket system commands")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
  .addSubcommand((sub) =>
    sub
      .setName("panel")
      .setDescription("Post the ticket creation panel in a channel")
      .addChannelOption((opt) =>
        opt
          .setName("channel")
          .setDescription("Channel to post the panel in")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true),
      )
      .addStringOption((opt) =>
        opt
          .setName("title")
          .setDescription("Panel title (default: Support Tickets)")
          .setMaxLength(256)
          .setRequired(false),
      )
      .addStringOption((opt) =>
        opt
          .setName("description")
          .setDescription("Panel description text")
          .setMaxLength(2000)
          .setRequired(false),
      ),
  );

export async function handleTicketCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.guild) return;

  const sub = interaction.options.getSubcommand();

  if (sub === "panel") {
    const channelOption = interaction.options.getChannel("channel", true);
    const title =
      interaction.options.getString("title") ?? "Support Tickets";
    const description =
      interaction.options.getString("description") ??
      "Need help or have a question? Our support team is ready to assist you!\n\nClick the button below to open a private support ticket.";

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

    const openButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("ticket_create")
        .setLabel("🎫  Open a Ticket")
        .setStyle(ButtonStyle.Primary),
    );

    try {
      await targetChannel.send({
        embeds: [ticketPanelEmbed(title, description)],
        components: [openButton],
      });

      await interaction.reply({
        embeds: [successEmbed(`Ticket panel posted in <#${channelOption.id}>!`)],
        flags: MessageFlags.Ephemeral,
      });
    } catch {
      await interaction.reply({
        embeds: [
          errorEmbed(
            "Failed to post the ticket panel. Check that I have **Send Messages** and **Embed Links** permissions in that channel.",
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
