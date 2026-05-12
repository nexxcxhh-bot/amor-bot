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

// Category icons that cycle for each rule
const CAT_ICONS = ["◈", "◆", "◉", "◎", "◇", "◈", "◆", "◉", "◎", "◇", "◈", "◆", "◉"];

export const rulesCommand = new SlashCommandBuilder()
  .setName("rules")
  .setDescription("Regelwerk-System")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) =>
    sub
      .setName("panel")
      .setDescription("Regelwerk-Panel posten")
      .addChannelOption((opt) =>
        opt.setName("channel").setDescription("Channel (Standard: aktueller Channel)").addChannelTypes(ChannelType.GuildText).setRequired(false),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("add")
      .setDescription("Eine Regel hinzufügen")
      .addStringOption((opt) => opt.setName("regel").setDescription("Regeltext").setRequired(true).setMaxLength(512)),
  )
  .addSubcommand((sub) =>
    sub
      .setName("remove")
      .setDescription("Eine Regel entfernen")
      .addIntegerOption((opt) => opt.setName("nummer").setDescription("Regelnummer").setMinValue(1).setRequired(true)),
  )
  .addSubcommand((sub) => sub.setName("list").setDescription("Alle Regeln anzeigen"));

export async function handleRulesCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) return;
  const sub = interaction.options.getSubcommand();
  const config = getGuildConfig(interaction.guild.id);

  if (sub === "add") {
    const rule = interaction.options.getString("regel", true);
    const rules = [...config.rules.rules, rule];
    setGuildConfig(interaction.guild.id, { rules: { ...config.rules, rules } });
    await interaction.reply({ embeds: [successEmbed(`Regel **#${rules.length}** hinzugefügt:\n> ${rule}`)], flags: MessageFlags.Ephemeral });
    return;
  }

  if (sub === "remove") {
    const num = interaction.options.getInteger("nummer", true);
    const rules = [...config.rules.rules];
    if (num < 1 || num > rules.length) {
      await interaction.reply({ embeds: [errorEmbed(`Regel #${num} existiert nicht. Du hast ${rules.length} Regeln.`)], flags: MessageFlags.Ephemeral });
      return;
    }
    const removed = rules.splice(num - 1, 1)[0];
    setGuildConfig(interaction.guild.id, { rules: { ...config.rules, rules } });
    await interaction.reply({ embeds: [successEmbed(`Regel **#${num}** entfernt:\n> ${removed}`)], flags: MessageFlags.Ephemeral });
    return;
  }

  if (sub === "list") {
    const rules = config.rules.rules;
    if (!rules.length) {
      await interaction.reply({ embeds: [errorEmbed("Noch keine Regeln. Nutze `/rules add`.")], flags: MessageFlags.Ephemeral });
      return;
    }
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("📜  Aktuelles Regelwerk")
      .setDescription(rules.map((r, i) => `**${i + 1}.** ${r}`).join("\n\n"))
      .setFooter({ text: `${rules.length} Regel(n) gesamt` });
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    return;
  }

  if (sub === "panel") {
    const channelOpt = interaction.options.getChannel("channel");
    const targetId = channelOpt?.id ?? interaction.channelId;
    const targetChannel = interaction.guild.channels.cache.get(targetId) as TextChannel | undefined;

    if (!targetChannel || !("send" in targetChannel)) {
      await interaction.reply({ embeds: [errorEmbed("Channel nicht gefunden.")], flags: MessageFlags.Ephemeral });
      return;
    }

    const rules = config.rules.rules;
    const iconURL = interaction.guild.iconURL({ size: 256 }) ?? undefined;
    const name = interaction.guild.name;

    // Build rule blocks — each formatted with icon, bold title, indented details
    const buildRuleText = (rules: string[]): string => {
      return rules
        .map((r, i) => {
          const icon = CAT_ICONS[i % CAT_ICONS.length] ?? "◆";
          // Bold part is before " — ", rest is description
          const parts = r.split(" — ");
          if (parts.length >= 2) {
            return `${icon}  **${i + 1} · ${parts[0]!.replace(/\*\*/g, "")}**\n┃ ${parts.slice(1).join(" — ")}`;
          }
          return `${icon}  **${i + 1} ·** ${r}`;
        })
        .join("\n\n");
    };

    // Split into chunks of max 6 rules per embed to stay within limits
    const CHUNK_SIZE = 6;
    const chunks: string[][] = [];
    for (let i = 0; i < rules.length; i += CHUNK_SIZE) {
      chunks.push(rules.slice(i, i + CHUNK_SIZE));
    }

    // If no rules, show placeholder
    if (chunks.length === 0) chunks.push([]);

    const DIV = "▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬";

    const embeds = chunks.map((chunk, idx) => {
      const isFirst = idx === 0;
      const isLast = idx === chunks.length - 1;

      const ruleText =
        chunk.length > 0
          ? buildRuleText(chunk.map((r, i) => r))
          : "*Noch keine Regeln. Nutze `/rules add`.*";

      const e = new EmbedBuilder().setColor(0x2b2d31);

      if (isFirst) {
        e.setAuthor({ name: `${name} · Server-Regelwerk`, iconURL })
          .setTitle("📜  Regelwerk")
          .setDescription(
            `Bitte lies alle Regeln sorgfältig durch und halte dich daran.\n\n${DIV}\n\n${ruleText}`,
          );
      } else {
        e.setDescription(`${ruleText}`);
      }

      if (isLast) {
        e.addFields({
          name: "\u200b",
          value:
            `${DIV}\n` +
            `📌  **Durch Klicken auf den Button bestätigst du, dass du alle Regeln gelesen hast und ihnen zustimmst.**\n` +
            `Bei Verstößen behält sich das Team Maßnahmen bis zum permanenten Bann vor.`,
        })
          .setFooter({ text: `${name} • Mit dem Klicken des Buttons stimmst du allen Regeln zu.`, iconURL })
          .setTimestamp();
      }

      return e;
    });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("rules_accept")
        .setLabel("✅  Regeln akzeptieren")
        .setStyle(ButtonStyle.Success),
    );

    try {
      for (let i = 0; i < embeds.length; i++) {
        await targetChannel.send({
          embeds: [embeds[i]!],
          components: i === embeds.length - 1 ? [row] : [],
        });
      }
      await interaction.reply({ embeds: [successEmbed(`Regelwerk-Panel in <#${targetId}> gepostet!`)], flags: MessageFlags.Ephemeral });
    } catch {
      await interaction.reply({ embeds: [errorEmbed("Fehler beim Posten. Überprüfe meine Berechtigungen.")], flags: MessageFlags.Ephemeral });
    }
  }
}
