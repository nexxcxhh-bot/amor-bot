import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from "discord.js";
import {
  getInviteData,
  setInviteData,
  loadAllInviteData,
  updateInviteStats,
} from "../storage.js";
import {
  inviteLeaderboardEmbed,
  inviteStatsEmbed,
} from "../features/invite-tracker.js";
import { successEmbed, errorEmbed } from "../utils/embeds.js";

export const invitesCommand = new SlashCommandBuilder()
  .setName("invites")
  .setDescription("Invite Tracker Befehle")
  .addSubcommand((sub) =>
    sub.setName("leaderboard").setDescription("Zeigt das Invite Leaderboard"),
  )
  .addSubcommand((sub) =>
    sub
      .setName("check")
      .setDescription("Zeigt die Einladungen eines Nutzers")
      .addUserOption((opt) =>
        opt
          .setName("user")
          .setDescription("Nutzer (leer = du selbst)")
          .setRequired(false),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("add")
      .setDescription("Fügt Bonus-Einladungen hinzu (Admin)")
      .addUserOption((opt) =>
        opt.setName("user").setDescription("Nutzer").setRequired(true),
      )
      .addIntegerOption((opt) =>
        opt
          .setName("amount")
          .setDescription("Anzahl der Bonus-Einladungen")
          .setRequired(true)
          .setMinValue(1),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("remove")
      .setDescription("Entfernt Einladungen (Admin)")
      .addUserOption((opt) =>
        opt.setName("user").setDescription("Nutzer").setRequired(true),
      )
      .addIntegerOption((opt) =>
        opt
          .setName("amount")
          .setDescription("Anzahl zu entfernender Einladungen")
          .setRequired(true)
          .setMinValue(1),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("reset")
      .setDescription("Setzt die Einladungen eines Nutzers zurück (Admin)")
      .addUserOption((opt) =>
        opt.setName("user").setDescription("Nutzer").setRequired(true),
      ),
  );

export async function handleInvitesCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const guild = interaction.guild;
  if (!guild) return;

  const sub = interaction.options.getSubcommand();

  if (sub === "leaderboard") {
    await interaction.deferReply();

    const allData = loadAllInviteData(guild.id);
    const entries = Object.entries(allData)
      .map(([userId, data]) => ({
        userId,
        regular: data.regular,
        left: data.left,
        fake: data.fake,
        bonus: data.bonus,
        total: data.regular + data.bonus,
      }))
      .sort((a, b) => b.total - b.left - (a.total - a.left))
      .slice(0, 10);

    await interaction.editReply({
      embeds: [inviteLeaderboardEmbed(guild.name, entries)],
    });
    return;
  }

  if (sub === "check") {
    await interaction.deferReply();
    const target = interaction.options.getUser("user") ?? interaction.user;
    const stats = getInviteData(guild.id, target.id);

    const allData = loadAllInviteData(guild.id);
    const sorted = Object.entries(allData)
      .map(([uid, d]) => ({ uid, net: d.regular + d.bonus - d.left - d.fake }))
      .sort((a, b) => b.net - a.net);

    const rank = sorted.findIndex((e) => e.uid === target.id) + 1;

    await interaction.editReply({
      embeds: [inviteStatsEmbed(target.id, stats, rank === 0 ? sorted.length + 1 : rank)],
    });
    return;
  }

  // Admin-only below
  const member = interaction.member;
  const hasAdmin =
    member &&
    typeof member.permissions !== "string" &&
    member.permissions.has(PermissionFlagsBits.Administrator);

  if (!hasAdmin) {
    await interaction.reply({
      embeds: [errorEmbed("Du brauchst Administrator-Rechte für diesen Befehl.")],
      ephemeral: true,
    });
    return;
  }

  if (sub === "add") {
    const target = interaction.options.getUser("user", true);
    const amount = interaction.options.getInteger("amount", true);
    updateInviteStats(guild.id, target.id, { regular: 0, left: 0, fake: 0, bonus: amount });
    await interaction.reply({
      embeds: [successEmbed(`**${amount}** Bonus-Einladungen zu <@${target.id}> hinzugefügt.`)],
      ephemeral: true,
    });
    return;
  }

  if (sub === "remove") {
    const target = interaction.options.getUser("user", true);
    const amount = interaction.options.getInteger("amount", true);
    const data = getInviteData(guild.id, target.id);
    data.bonus = Math.max(0, (data.bonus ?? 0) - amount);
    data.regular = Math.max(0, (data.regular ?? 0) - Math.max(0, amount - (data.bonus ?? 0)));
    setInviteData(guild.id, target.id, data);
    await interaction.reply({
      embeds: [successEmbed(`**${amount}** Einladungen von <@${target.id}> entfernt.`)],
      ephemeral: true,
    });
    return;
  }

  if (sub === "reset") {
    const target = interaction.options.getUser("user", true);
    setInviteData(guild.id, target.id, {
      regular: 0,
      left: 0,
      fake: 0,
      bonus: 0,
      joinedMembers: [],
    });
    await interaction.reply({
      embeds: [successEmbed(`Einladungen von <@${target.id}> wurden zurückgesetzt.`)],
      ephemeral: true,
    });
    return;
  }
}
