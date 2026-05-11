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
import { getGuildConfig, setGuildConfig } from "../storage.js";
import { successEmbed, errorEmbed } from "../utils/embeds.js";

const RULE_ICONS = ["◆", "◈", "◉", "◎", "◇", "◆", "◈", "◉", "◎", "◇"];

export const rulesCommand = new SlashCommandBuilder()
  .setName("rules")
  .setDescription("Regelwerk-System")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) =>
    sub
      .setName("panel")
      .setDescription("Regelwerk-Panel mit Akzeptieren-Button posten")
      .addChannelOption((opt) =>
        opt
          .setName("channel")
          .setDescription("Channel (Standard: aktueller Channel)")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(false),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("add")
      .setDescription("Eine Regel zur Regelliste hinzufügen")
      .addStringOption((opt) =>
        opt.setName("regel").setDescription("Der Regeltext").setRequired(true).setMaxLength(512),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("remove")
      .setDescription("Eine Regel anhand ihrer Nummer entfernen")
      .addIntegerOption((opt) =>
        opt.setName("nummer").setDescription("Regelnummer").setMinValue(1).setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub.setName("list").setDescription("Alle aktuellen Regeln anzeigen"),
  );

export async function handleRulesCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.guild) return;

  const sub = interaction.options.getSubcommand();
  const config = getGuildConfig(interaction.guild.id);

  // ─── Add ─────────────────────────────────────────────────────────────────────
  if (sub === "add") {
    const rule = interaction.options.getString("regel", true);
    const rules = [...config.rules.rules, rule];
    setGuildConfig(interaction.guild.id, { rules: { ...config.rules, rules } });

    await interaction.reply({
      embeds: [successEmbed(`Regel **#${rules.length}** hinzugefügt:\n> ${rule}`)],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // ─── Remove ───────────────────────────────────────────────────────────────────
  if (sub === "remove") {
    const num = interaction.options.getInteger("nummer", true);
    const rules = [...config.rules.rules];
    if (num < 1 || num > rules.length) {
      await interaction.reply({
        embeds: [errorEmbed(`Regel #${num} existiert nicht. Du hast ${rules.length} Regeln.`)],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const removed = rules.splice(num - 1, 1)[0];
    setGuildConfig(interaction.guild.id, { rules: { ...config.rules, rules } });

    await interaction.reply({
      embeds: [successEmbed(`Regel **#${num}** entfernt:\n> ${removed}`)],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // ─── List ─────────────────────────────────────────────────────────────────────
  if (sub === "list") {
    const rules = config.rules.rules;
    if (rules.length === 0) {
      await interaction.reply({
        embeds: [errorEmbed("Noch keine Regeln hinzugefügt. Nutze `/rules add`.")],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("📜  Regelwerk")
      .setDescription(rules.map((r, i) => `**${i + 1}.** ${r}`).join("\n\n"))
      .setFooter({ text: `${rules.length} Regel(n) insgesamt` });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    return;
  }

  // ─── Panel ────────────────────────────────────────────────────────────────────
  if (sub === "panel") {
    const channelOption = interaction.options.getChannel("channel");
    const targetChannelId = channelOption?.id ?? interaction.channelId;
    const rules = config.rules.rules;

    const targetChannel = interaction.guild.channels.cache.get(targetChannelId) as TextChannel | undefined;
    if (!targetChannel || !("send" in targetChannel)) {
      await interaction.reply({
        embeds: [errorEmbed("Channel nicht gefunden oder keine Schreibrechte.")],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const iconURL = interaction.guild.iconURL() ?? undefined;

    // Build beautiful rules text — split into sections if many rules
    let rulesText: string;
    if (rules.length === 0) {
      rulesText = "*Noch keine Regeln festgelegt. Nutze `/rules add` um Regeln hinzuzufügen.*";
    } else {
      rulesText = rules
        .map((r, i) => `${RULE_ICONS[i % RULE_ICONS.length] ?? "◆"}  ${r}`)
        .join("\n\n────────────────────────────────────────\n\n");
    }

    // Discord embed description limit is 4096 chars — split into multiple embeds if needed
    const chunks: string[] = [];
    if (rulesText.length <= 3800) {
      chunks.push(rulesText);
    } else {
      const ruleLines = rules.map(
        (r, i) => `${RULE_ICONS[i % RULE_ICONS.length] ?? "◆"}  ${r}`,
      );
      let current = "";
      for (const line of ruleLines) {
        if ((current + "\n\n────\n\n" + line).length > 3800) {
          chunks.push(current);
          current = line;
        } else {
          current = current ? current + "\n\n────────────────────────────────────────\n\n" + line : line;
        }
      }
      if (current) chunks.push(current);
    }

    const embeds = chunks.map((chunk, idx) =>
      new EmbedBuilder()
        .setColor(0x2b2d31)
        .setTitle(idx === 0 ? "📜  Server-Regelwerk" : null)
        .setAuthor(
          idx === 0
            ? { name: `${interaction.guild!.name} • Regelwerk`, iconURL }
            : null,
        )
        .setDescription(
          idx === 0
            ? `Bitte lies alle Regeln sorgfältig durch und halte dich daran.\n\n${chunk}`
            : chunk,
        )
        .setFooter(
          idx === chunks.length - 1
            ? {
                text: `${interaction.guild!.name} • Mit dem Klick auf den Button stimmst du allen Regeln zu.`,
                iconURL,
              }
            : null,
        )
        .setTimestamp(idx === chunks.length - 1 ? new Date() : null),
    );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("rules_accept")
        .setLabel("✅  Regeln akzeptieren")
        .setStyle(ButtonStyle.Success),
    );

    try {
      // Send all embeds, button only on last
      for (let i = 0; i < embeds.length; i++) {
        const isLast = i === embeds.length - 1;
        await targetChannel.send({
          embeds: [embeds[i]!],
          components: isLast ? [row] : [],
        });
      }

      await interaction.reply({
        embeds: [successEmbed(`Regelwerk-Panel in <#${targetChannelId}> gepostet!`)],
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
