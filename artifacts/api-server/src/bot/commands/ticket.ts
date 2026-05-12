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

export async function handleTicketCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) return;
  if (interaction.options.getSubcommand() !== "panel") return;

  const channelOpt = interaction.options.getChannel("channel");
  const targetId = channelOpt?.id ?? interaction.channelId;
  const targetChannel = interaction.guild.channels.cache.get(targetId) as TextChannel | undefined;

  if (!targetChannel || !("send" in targetChannel)) {
    await interaction.reply({ embeds: [errorEmbed("Channel nicht gefunden.")], flags: MessageFlags.Ephemeral });
    return;
  }

  const iconURL = interaction.guild.iconURL({ size: 256 }) ?? undefined;
  const name = interaction.guild.name;

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setAuthor({ name, iconURL })
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
    .setFooter({ text: `${name} • Support-System`, iconURL })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_create")
      .setLabel("🎫  Ticket erstellen")
      .setStyle(ButtonStyle.Primary),
  );

  try {
    await targetChannel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ embeds: [successEmbed(`Ticket-Panel in <#${targetId}> gepostet!`)], flags: MessageFlags.Ephemeral });
  } catch {
    await interaction.reply({ embeds: [errorEmbed("Fehler beim Posten. Überprüfe meine Berechtigungen.")], flags: MessageFlags.Ephemeral });
  }
}
