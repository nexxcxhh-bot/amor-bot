import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
  TextChannel,
} from "discord.js";
import {
  buildGiveawayEmbed,
  scheduleGiveaway,
  endGiveaway,
  getGiveaway,
  setGiveaway,
  getEntries,
  setEntries,
  parseDuration,
} from "../features/giveaway.js";
import { successEmbed, errorEmbed } from "../utils/embeds.js";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";

export const giveawayCommand = new SlashCommandBuilder()
  .setName("giveaway")
  .setDescription("Giveaway system")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) =>
    sub
      .setName("start")
      .setDescription("Start a new giveaway")
      .addStringOption((opt) =>
        opt.setName("prize").setDescription("What are you giving away?").setRequired(true).setMaxLength(200),
      )
      .addStringOption((opt) =>
        opt.setName("duration").setDescription("Duration e.g. 30m, 1h, 1d, 7d").setRequired(true),
      )
      .addIntegerOption((opt) =>
        opt.setName("winners").setDescription("Number of winners").setMinValue(1).setMaxValue(20).setRequired(false),
      )
      .addChannelOption((opt) =>
        opt.setName("channel").setDescription("Channel to post the giveaway in").addChannelTypes(ChannelType.GuildText).setRequired(false),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("end")
      .setDescription("End a giveaway early and pick winners now")
      .addStringOption((opt) =>
        opt.setName("message-id").setDescription("Message ID of the giveaway").setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("reroll")
      .setDescription("Reroll a new winner for an ended giveaway")
      .addStringOption((opt) =>
        opt.setName("message-id").setDescription("Message ID of the ended giveaway").setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub.setName("list").setDescription("List all active giveaways in this server"),
  );

export async function handleGiveawayCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.guild) return;
  const sub = interaction.options.getSubcommand();

  // ─── START ───────────────────────────────────────────────────────────────────
  if (sub === "start") {
    const prize = interaction.options.getString("prize", true);
    const durationStr = interaction.options.getString("duration", true);
    const winners = interaction.options.getInteger("winners") ?? 1;
    const channelOpt = interaction.options.getChannel("channel");

    const durationMs = parseDuration(durationStr);
    if (!durationMs || durationMs < 10_000) {
      await interaction.reply({
        embeds: [errorEmbed("Invalid duration. Use format like `30m`, `1h`, `2d`. Minimum 10 seconds.")],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const targetChannelId = channelOpt?.id ?? interaction.channelId;
    const targetChannel = interaction.guild.channels.cache.get(targetChannelId) as TextChannel | undefined;
    if (!targetChannel || !("send" in targetChannel)) {
      await interaction.reply({
        embeds: [errorEmbed("Could not find that channel.")],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const endsAt = Date.now() + durationMs;
    const giveawayData = {
      messageId: "", // filled after send
      channelId: targetChannel.id,
      guildId: interaction.guild.id,
      prize,
      winners,
      endsAt,
      hostId: interaction.user.id,
      ended: false,
      winnerIds: [],
    };

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("giveaway_enter")
        .setLabel("🎉 Enter  (0)")
        .setStyle(ButtonStyle.Primary),
    );

    const msg = await targetChannel.send({
      embeds: [buildGiveawayEmbed(giveawayData, 0)],
      components: [row],
    });

    giveawayData.messageId = msg.id;
    setGiveaway(msg.id, giveawayData);
    setEntries(msg.id, []);
    scheduleGiveaway(giveawayData, interaction.client);

    await interaction.editReply({
      embeds: [successEmbed(`Giveaway started in <#${targetChannel.id}>!\nPrize: **${prize}** · Ends: <t:${Math.floor(endsAt / 1000)}:R>`)],
    });
    return;
  }

  // ─── END ─────────────────────────────────────────────────────────────────────
  if (sub === "end") {
    const messageId = interaction.options.getString("message-id", true);
    const giveaway = getGiveaway(messageId);

    if (!giveaway || giveaway.guildId !== interaction.guild.id) {
      await interaction.reply({ embeds: [errorEmbed("Giveaway not found.")], flags: MessageFlags.Ephemeral });
      return;
    }
    if (giveaway.ended) {
      await interaction.reply({ embeds: [errorEmbed("That giveaway has already ended.")], flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await endGiveaway(giveaway, interaction.client);
    await interaction.editReply({ embeds: [successEmbed("Giveaway ended and winner(s) selected!")] });
    return;
  }

  // ─── REROLL ──────────────────────────────────────────────────────────────────
  if (sub === "reroll") {
    const messageId = interaction.options.getString("message-id", true);
    const giveaway = getGiveaway(messageId);

    if (!giveaway || giveaway.guildId !== interaction.guild.id) {
      await interaction.reply({ embeds: [errorEmbed("Giveaway not found.")], flags: MessageFlags.Ephemeral });
      return;
    }
    if (!giveaway.ended) {
      await interaction.reply({ embeds: [errorEmbed("The giveaway hasn't ended yet. Use `/giveaway end` first.")], flags: MessageFlags.Ephemeral });
      return;
    }

    const entries = getEntries(messageId).filter((id) => !giveaway.winnerIds.includes(id));
    if (entries.length === 0) {
      await interaction.reply({ embeds: [errorEmbed("No remaining entries to reroll from.")], flags: MessageFlags.Ephemeral });
      return;
    }

    const newWinner = entries[Math.floor(Math.random() * entries.length)]!;
    const channel = interaction.guild.channels.cache.get(giveaway.channelId) as TextChannel | undefined;

    await interaction.reply({
      embeds: [successEmbed(`🎉 Reroll winner: <@${newWinner}>! Congratulations!`)],
    });

    if (channel) {
      await channel.send({
        content: `🎉  **Reroll!** Congratulations <@${newWinner}>! You won the **${giveaway.prize}** giveaway!`,
      });
    }
    return;
  }

  // ─── LIST ────────────────────────────────────────────────────────────────────
  if (sub === "list") {
    const { getActiveGiveaways } = await import("../features/giveaway.js");
    const active = getActiveGiveaways().filter((g) => g.guildId === interaction.guild!.id);

    if (active.length === 0) {
      await interaction.reply({
        embeds: [errorEmbed("No active giveaways in this server.")],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const { EmbedBuilder } = await import("discord.js");
    const embed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle("🎉  Active Giveaways")
      .setDescription(
        active
          .map(
            (g, i) =>
              `**${i + 1}.** ${g.prize}\n` +
              `└ Ends <t:${Math.floor(g.endsAt / 1000)}:R> · ${g.winners} winner(s) · [Jump](https://discord.com/channels/${g.guildId}/${g.channelId}/${g.messageId})`,
          )
          .join("\n\n"),
      )
      .setFooter({ text: `${active.length} active giveaway(s)` });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
}
