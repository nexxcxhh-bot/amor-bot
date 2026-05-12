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
import { errorEmbed, successEmbed, COLORS } from "../utils/embeds.js";

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
    .setColor(COLORS.primary)
    .setAuthor({ name: `${guildName} • Support`, iconURL })
    .setTitle("🎫  Support Ticket System")
    .setDescription(
      `> Benötigst du **Hilfe** oder hast ein **Anliegen**?\n` +
      `> Unser Team ist für dich da — erstelle einfach ein Ticket!\n\n` +
      `\`\`\`\n① Klicke auf „Ticket erstellen"\n② Ein privater Channel wird geöffnet\n③ Schildere dein Anliegen\n④ Wir melden uns schnellstmöglich\`\`\``,
    )
    .addFields(
      {
        name: "⏱️  Reaktionszeit",
        value: "So schnell wie möglich",
        inline: true,
      },
      {
        name: "🔒  Privatsphäre",
        value: "Nur du & das Team",
        inline: true,
      },
      {
        name: "📋  Regeln",
        value: "Nur ein Ticket gleichzeitig",
        inline: true,
      },
    )
    .setImage("https://i.imgur.com/transparent.png")
    .setFooter({ text: `${guildName} • Support System`, iconURL })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_create")
      .setLabel("Ticket erstellen")
      .setEmoji("🎫")
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
