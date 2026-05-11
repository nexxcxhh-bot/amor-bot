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
import { getGuildConfig } from "../storage.js";
import { successEmbed, errorEmbed } from "../utils/embeds.js";

export const rulesCommand = new SlashCommandBuilder()
  .setName("rules")
  .setDescription("Rules system commands")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) =>
    sub
      .setName("panel")
      .setDescription("Post the rules panel with an accept button")
      .addChannelOption((opt) =>
        opt
          .setName("channel")
          .setDescription("Channel to post the rules in")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("add")
      .setDescription("Add a rule to the rules list")
      .addStringOption((opt) =>
        opt
          .setName("rule")
          .setDescription("The rule text to add")
          .setRequired(true)
          .setMaxLength(512),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("remove")
      .setDescription("Remove a rule by its number")
      .addIntegerOption((opt) =>
        opt
          .setName("number")
          .setDescription("Rule number to remove")
          .setMinValue(1)
          .setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub.setName("list").setDescription("List all current rules"),
  );

export async function handleRulesCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.guild) return;

  const sub = interaction.options.getSubcommand();
  const { getGuildConfig: getConfig, setGuildConfig } = await import(
    "../storage.js"
  );
  const config = getConfig(interaction.guild.id);

  if (sub === "add") {
    const rule = interaction.options.getString("rule", true);
    const rules = [...config.rules.rules, rule];
    setGuildConfig(interaction.guild.id, { rules: { ...config.rules, rules } });

    await interaction.reply({
      embeds: [
        successEmbed(
          `Rule **#${rules.length}** added:\n> ${rule}`,
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (sub === "remove") {
    const num = interaction.options.getInteger("number", true);
    const rules = [...config.rules.rules];
    if (num < 1 || num > rules.length) {
      await interaction.reply({
        embeds: [errorEmbed(`Rule #${num} does not exist. You have ${rules.length} rules.`)],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const removed = rules.splice(num - 1, 1)[0];
    setGuildConfig(interaction.guild.id, { rules: { ...config.rules, rules } });

    await interaction.reply({
      embeds: [successEmbed(`Rule **#${num}** removed:\n> ${removed}`)],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (sub === "list") {
    const rules = config.rules.rules;
    if (rules.length === 0) {
      await interaction.reply({
        embeds: [errorEmbed("No rules added yet. Use `/rules add` to add rules.")],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("📜  Current Rules")
      .setDescription(
        rules.map((r, i) => `**${i + 1}.** ${r}`).join("\n\n"),
      )
      .setFooter({ text: `${rules.length} rule(s) total` });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    return;
  }

  if (sub === "panel") {
    const channelOption = interaction.options.getChannel("channel", true);
    const rules = config.rules.rules;

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

    const rulesText =
      rules.length > 0
        ? rules.map((r, i) => `**${i + 1}.** ${r}`).join("\n\n")
        : "*No rules have been added yet. Use `/rules add` to add rules.*";

    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("⚖️  Server Rules")
      .setDescription(
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${rulesText}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      )
      .addFields({
        name: "📌  By clicking the button below you agree to follow all rules",
        value:
          "Breaking these rules may result in a mute, kick, or permanent ban from the server.",
      })
      .setFooter({
        text: `${interaction.guild.name} • Rules`,
        iconURL: interaction.guild.iconURL() ?? undefined,
      })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("rules_accept")
        .setLabel("✅  I Accept the Rules")
        .setStyle(ButtonStyle.Success),
    );

    try {
      await targetChannel.send({ embeds: [embed], components: [row] });
      await interaction.reply({
        embeds: [successEmbed(`Rules panel posted in <#${channelOption.id}>!`)],
        flags: MessageFlags.Ephemeral,
      });
    } catch {
      await interaction.reply({
        embeds: [errorEmbed("Failed to post the rules panel. Check my permissions.")],
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
