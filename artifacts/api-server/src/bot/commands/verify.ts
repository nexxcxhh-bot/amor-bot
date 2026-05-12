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
  .setDescription("Verifizierungs-System")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
  .addSubcommand((sub) =>
    sub
      .setName("panel")
      .setDescription("Verifizierungs-Panel posten")
      .addChannelOption((opt) =>
        opt
          .setName("channel")
          .setDescription("Channel (Standard: aktueller Channel)")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(false),
      ),
  );

export async function sendVerifyPanel(targetChannel: TextChannel, guildName: string, iconURL: string | undefined): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setAuthor({ name: guildName, iconURL })
    .setThumbnail(iconURL ?? null)
    .setTitle("🛡️  Server-Verifizierung")
    .setDescription(
      `Um Zugang zum gesamten Server zu erhalten, musst du dich verifizieren.\n` +
      `Klicke auf den Button unten und folge den Anweisungen.\n\n` +
      `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\u200b`,
    )
    .addFields(
      {
        name: "〢 ✅  Was bekommst du?",
        value:
          "╰ Zugang zu allen öffentlichen Channels\n" +
          "╰ Volle Teilnahme am Server\n" +
          "╰ Chat, Voice & Reaktionen freischalten",
        inline: true,
      },
      {
        name: "〢 🔒  Warum verifizieren?",
        value:
          "╰ Schutz vor Bots & Raids\n" +
          "╰ Sichere, aktive Community\n" +
          "╰ Spam & Trolls fernhalten",
        inline: true,
      },
      {
        name: "\u200b",
        value:
          `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n` +
          `📋  Lies zuerst die **Serverregeln** durch.\nMit der Verifizierung stimmst du diesen zu.`,
        inline: false,
      },
    )
    .setFooter({ text: `${guildName} • Einmalige Verifizierung`, iconURL })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("verify_click")
      .setLabel("✅  Jetzt verifizieren")
      .setStyle(ButtonStyle.Success),
  );

  await targetChannel.send({ embeds: [embed], components: [row] });
}

export async function handleVerifyCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
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
    await sendVerifyPanel(targetChannel, interaction.guild.name, iconURL);
    await interaction.editReply({ embeds: [successEmbed(`Verifizierungs-Panel in <#${targetId}> gepostet!`)] });
  } catch {
    await interaction.editReply({ embeds: [errorEmbed("Fehler beim Posten. Überprüfe meine Berechtigungen.")] });
  }
}
