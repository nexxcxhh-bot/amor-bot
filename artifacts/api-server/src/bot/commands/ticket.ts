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

export const ticketCommand = new SlashCommandBuilder()
  .setName("ticket")
  .setDescription("Ticket-System")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
  .addSubcommand((sub) =>
    sub
      .setName("panel")
      .setDescription("Ticket-Panel posten")
      .addChannelOption((opt) =>
        opt.setName("channel").setDescription("Channel (Standard: aktueller Channel)").addChannelTypes(ChannelType.GuildText).setRequired(false),
      ),
  );

export async function sendTicketPanel(targetChannel: TextChannel, guildName: string, iconURL: string | undefined): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setAuthor({ name: guildName, iconURL })
    .setTitle("🎫  Support Ticket")
    .setDescription(
      `Brauchst du **Hilfe** oder hast ein **Anliegen**?\n` +
      `Unser Team steht dir zur Verfügung – klicke einfach auf den Button.\n\n` +
      `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\u200b`,
    )
    .addFields(
      {
        name: "〢 📋  Wie funktioniert es?",
        value:
          "╰ **①** Klicke auf **Ticket erstellen**\n" +
          "╰ **②** Ein privater Channel wird geöffnet\n" +
          "╰ **③** Beschreibe dein Anliegen\n" +
          "╰ **④** Das Team meldet sich schnellstmöglich",
        inline: true,
      },
      {
        name: "〢 ℹ️  Wichtig",
        value:
          "╰ Nur **ein** Ticket gleichzeitig\n" +
          "╰ Kein Spam oder sinnlose Tickets\n" +
          "╰ Beschreibe dein Problem genau\n" +
          "╰ Sei geduldig — wir helfen dir",
        inline: true,
      },
      {
        name: "\u200b",
        value: "▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬",
        inline: false,
      },
    )
    .setFooter({ text: `${guildName} • Support-System`, iconURL })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_create")
      .setLabel("🎫  Ticket erstellen")
      .setStyle(ButtonStyle.Primary),
  );

  await targetChannel.send({ embeds: [embed], components: [row] });
}

export async function handleTicketCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) return;
  if (interaction.options.getSubcommand() !== "panel") return;

  const channelOpt = interaction.options.getChannel("channel");
  const targetId = channelOpt?.id ?? interaction.channelId;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  let targetChannel: TextChannel | null = null;
  try {
    const fetched = await interaction.guild.channels.fetch(targetId);
    if (fetched && fetched.type === ChannelType.GuildText) {
      targetChannel = fetched as TextChannel;
    }
  } catch {
    // channel not found
  }

  if (!targetChannel) {
    await interaction.editReply({ embeds: [errorEmbed("Channel nicht gefunden oder kein Text-Channel.")] });
    return;
  }

  const iconURL = interaction.guild.iconURL({ size: 256 }) ?? undefined;

  try {
    await sendTicketPanel(targetChannel, interaction.guild.name, iconURL);
    await interaction.editReply({ embeds: [successEmbed(`Ticket-Panel in <#${targetId}> gepostet!`)] });
  } catch {
    await interaction.editReply({ embeds: [errorEmbed("Fehler beim Posten. Überprüfe meine Berechtigungen.")] });
  }
}
