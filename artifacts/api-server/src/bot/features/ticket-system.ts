import {
  ButtonInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  OverwriteType,
  TextChannel,
  GuildMember,
} from "discord.js";
import {
  getGuildConfig,
  setGuildConfig,
  getTicket,
  setTicket,
  deleteTicket,
  incrementTicketCounter,
  setPendingFeedback,
  getPendingFeedback,
  deletePendingFeedback,
} from "../storage.js";
import {
  ticketOpenedEmbed,
  ticketClosedEmbed,
  feedbackEmbed,
  feedbackReceivedEmbed,
  successEmbed,
  errorEmbed,
} from "../utils/embeds.js";

export async function handleCreateTicket(
  interaction: ButtonInteraction,
): Promise<void> {
  const guild = interaction.guild;
  if (!guild) return;

  await interaction.deferReply({ ephemeral: true });

  const config = getGuildConfig(guild.id);
  const user = interaction.user;

  const existingTicket = guild.channels.cache.find((c) => {
    if (!c.name.startsWith("ticket-")) return false;
    const topic = "topic" in c ? (c.topic as string | null) : null;
    return topic?.includes(user.id) && topic.includes("open");
  });
  if (existingTicket) {
    await interaction.editReply({
      embeds: [
        errorEmbed(`You already have an open ticket: <#${existingTicket.id}>`),
      ],
    });
    return;
  }

  let categoryId = config.ticketCategoryId;
  if (!categoryId) {
    const category = await guild.channels.create({
      name: "🎫 Support Tickets",
      type: ChannelType.GuildCategory,
    });
    categoryId = category.id;
    setGuildConfig(guild.id, { ticketCategoryId: category.id });
  }

  const ticketNumber = incrementTicketCounter(guild.id);
  const channelName = `ticket-${String(ticketNumber).padStart(4, "0")}`;

  const permissionOverwrites: {
    id: string;
    type: OverwriteType;
    allow?: bigint[];
    deny?: bigint[];
  }[] = [
    {
      id: guild.roles.everyone.id,
      type: OverwriteType.Role,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: user.id,
      type: OverwriteType.Member,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
      ],
    },
  ];

  if (config.ticketSupportRoleId) {
    permissionOverwrites.push({
      id: config.ticketSupportRoleId,
      type: OverwriteType.Role,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageMessages,
      ],
    });
  }

  if (guild.members.me) {
    permissionOverwrites.push({
      id: guild.members.me.id,
      type: OverwriteType.Member,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    });
  }

  const ticketChannel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: categoryId,
    permissionOverwrites,
    topic: `open | user:${user.id} | Ticket #${String(ticketNumber).padStart(4, "0")} | Created by ${user.tag}`,
  });

  setTicket(ticketChannel.id, {
    channelId: ticketChannel.id,
    userId: user.id,
    guildId: guild.id,
    createdAt: Date.now(),
    status: "open",
    ticketNumber,
  });

  const closeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_close")
      .setLabel("🔒  Close Ticket")
      .setStyle(ButtonStyle.Danger),
  );

  await ticketChannel.send({
    content:
      `<@${user.id}>` +
      (config.ticketSupportRoleId ? ` <@&${config.ticketSupportRoleId}>` : ""),
    embeds: [ticketOpenedEmbed(`<@${user.id}>`, ticketNumber)],
    components: [closeRow],
  });

  await interaction.editReply({
    embeds: [
      successEmbed(`Ticket created! Head over to <#${ticketChannel.id}>`),
    ],
  });
}

export async function handleCloseTicket(
  interaction: ButtonInteraction,
): Promise<void> {
  const guild = interaction.guild;
  if (!guild || !interaction.channel) return;

  const ticket = getTicket(interaction.channel.id);
  if (!ticket) {
    await interaction.reply({
      embeds: [errorEmbed("This is not a ticket channel.")],
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply();

  ticket.status = "closed";
  setTicket(interaction.channel.id, ticket);

  await interaction.editReply({
    embeds: [ticketClosedEmbed(`<@${interaction.user.id}>`)],
  });

  try {
    const ticketUser = await guild.client.users.fetch(ticket.userId);
    const feedbackRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("feedback_1")
        .setLabel("⭐")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("feedback_2")
        .setLabel("⭐⭐")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("feedback_3")
        .setLabel("⭐⭐⭐")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("feedback_4")
        .setLabel("⭐⭐⭐⭐")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("feedback_5")
        .setLabel("⭐⭐⭐⭐⭐")
        .setStyle(ButtonStyle.Secondary),
    );

    setPendingFeedback(ticket.userId, {
      ticketChannelId: interaction.channel.id,
      guildId: guild.id,
      userId: ticket.userId,
      topic: ticket.topic,
      ticketNumber: ticket.ticketNumber,
    });

    await ticketUser.send({
      embeds: [feedbackEmbed()],
      components: [feedbackRow],
    });
  } catch {
    /* user has DMs closed */
  }

  setTimeout(async () => {
    try {
      deleteTicket(interaction.channel!.id);
      await (interaction.channel as TextChannel).delete(
        "Ticket closed",
      );
    } catch {
      /* ignore */
    }
  }, 5_000);
}

export async function handleFeedbackSubmit(
  interaction: ButtonInteraction,
  rating: number,
): Promise<void> {
  const pending = getPendingFeedback(interaction.user.id);
  if (!pending) {
    await interaction.reply({
      content: "No pending feedback found. This rating may have already been submitted.",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferUpdate();
  deletePendingFeedback(interaction.user.id);

  try {
    const guild = await interaction.client.guilds.fetch(pending.guildId);
    const config = getGuildConfig(guild.id);

    if (config.feedbackChannelId) {
      const feedbackChannel = guild.channels.cache.get(
        config.feedbackChannelId,
      ) as TextChannel | undefined;
      if (feedbackChannel) {
        await feedbackChannel.send({
          embeds: [
            feedbackReceivedEmbed(
              interaction.user.id,
              rating,
              pending.ticketNumber,
            ),
          ],
        });
      }
    }
  } catch {
    /* ignore */
  }

  const stars = "⭐".repeat(rating);
  const labels = ["", "Very Bad", "Bad", "Okay", "Good", "Excellent"];
  await interaction.editReply({
    content: `Thank you for your feedback! You rated us **${stars} — ${labels[rating]}** (${rating}/5).`,
    embeds: [],
    components: [],
  });
}
