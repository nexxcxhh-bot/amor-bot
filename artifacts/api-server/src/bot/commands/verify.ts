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

export async function handleVerifyCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
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
    .setFooter({ text: `${name} • Einmalige Verifizierung`, iconURL })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("verify_click")
      .setLabel("✅  Jetzt verifizieren")
      .setStyle(ButtonStyle.Success),
  );

  try {
    await targetChannel.send({ embeds: [embed], components: [row] });
    await interaction.reply({
      embeds: [successEmbed(`Verifizierungs-Panel in <#${targetId}> gepostet!`)],
      flags: MessageFlags.Ephemeral,
    });
  } catch {
    await interaction.reply({
      embeds: [errorEmbed("Fehler beim Posten. Überprüfe meine Berechtigungen.")],
      flags: MessageFlags.Ephemeral,
    });
  }
}
