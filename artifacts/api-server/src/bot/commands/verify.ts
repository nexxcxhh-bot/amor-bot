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
      .setDescription("Verifizierungs-Panel in einem Channel posten")
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

    const iconURL = interaction.guild.iconURL() ?? undefined;

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setAuthor({ name: interaction.guild.name, iconURL })
      .setTitle("🛡️  Server-Verifizierung")
      .setThumbnail(iconURL ?? null)
      .setDescription(
        "Um Zugang zum gesamten Server zu erhalten, musst du dich verifizieren. " +
        "Klicke auf den Button unten und folge den Anweisungen.\n\u200b",
      )
      .addFields(
        {
          name: "✅  Was passiert danach?",
          value: "Nach der Verifizierung erhältst du Zugang zu allen öffentlichen Channels und kannst aktiv am Server teilnehmen.",
          inline: false,
        },
        {
          name: "🔒  Warum verifizieren?",
          value: "Die Verifizierung dient dazu, Bots und Spam von unserem Server fernzuhalten und eine sichere Community zu gewährleisten.",
          inline: false,
        },
        {
          name: "📋  Hinweis",
          value: "Lies bitte vorher die Serverregeln durch. Mit der Verifizierung stimmst du unseren Regeln zu.",
          inline: false,
        },
      )
      .setFooter({
        text: `${interaction.guild.name} • Einmalige Verifizierung`,
        iconURL,
      })
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
        embeds: [successEmbed(`Verifizierungs-Panel in <#${targetChannelId}> gepostet!`)],
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
