import {
  Client,
  GatewayIntentBits,
  Events,
  REST,
  Routes,
  Partials,
  GuildChannel,
} from "discord.js";
import { setupCommand, handleSetupCommand } from "./commands/setup.js";
import { ticketCommand, handleTicketCommand } from "./commands/ticket.js";
import { panelCommand, handlePanelCommand } from "./commands/panel.js";
import { verifyCommand, handleVerifyCommand } from "./commands/verify.js";
import { rulesCommand, handleRulesCommand } from "./commands/rules.js";
import {
  handleCreateTicket,
  handleCloseTicket,
  handleFeedbackSubmit,
} from "./features/ticket-system.js";
import { handleRaidMemberAdd } from "./features/raid-protection.js";
import {
  handleChannelDelete,
  handleRoleDelete,
  handleGuildBan,
} from "./features/nuke-protection.js";
import { handleToxicMessage } from "./features/toxic-filter.js";
import { startStatsUpdater } from "./features/server-stats.js";
import { handleMemberWelcome } from "./features/welcome.js";
import { handleVerifyButton } from "./features/verify.js";
import { handleRulesAccept } from "./features/rules.js";

const commands = [
  setupCommand.toJSON(),
  ticketCommand.toJSON(),
  panelCommand.toJSON(),
  verifyCommand.toJSON(),
  rulesCommand.toJSON(),
];

export async function startBot(): Promise<void> {
  const token = process.env["DISCORD_TOKEN"];
  const clientId = process.env["DISCORD_CLIENT_ID"];

  if (!token || !clientId) {
    console.warn(
      "[Bot] DISCORD_TOKEN or DISCORD_CLIENT_ID not set — bot will not start.",
    );
    return;
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildModeration,
      GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel, Partials.Message],
  });

  const rest = new REST().setToken(token);

  client.once(Events.ClientReady, async (readyClient) => {
    console.log(`[Bot] Logged in as ${readyClient.user.tag}`);

    const guildId = process.env["DISCORD_GUILD_ID"];

    try {
      if (guildId) {
        await rest.put(
          Routes.applicationGuildCommands(clientId, guildId),
          { body: commands },
        );
        console.log(`[Bot] ${commands.length} commands registered instantly to guild ${guildId}.`);
      } else {
        await rest.put(Routes.applicationCommands(clientId), { body: commands });
        console.log("[Bot] Commands registered globally (up to 1h delay).");
      }
    } catch (err) {
      console.error("[Bot] Failed to register commands:", err);
    }

    startStatsUpdater(readyClient);
    console.log("[Bot] Ready.");
  });

  // ─── Interactions ────────────────────────────────────────────────────────────
  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        const { commandName } = interaction;
        if (commandName === "setup") await handleSetupCommand(interaction);
        else if (commandName === "ticket") await handleTicketCommand(interaction);
        else if (commandName === "panel") await handlePanelCommand(interaction);
        else if (commandName === "verify") await handleVerifyCommand(interaction);
        else if (commandName === "rules") await handleRulesCommand(interaction);
        return;
      }

      if (interaction.isButton()) {
        const { customId } = interaction;
        if (customId === "ticket_create") await handleCreateTicket(interaction);
        else if (customId === "ticket_close") await handleCloseTicket(interaction);
        else if (customId === "verify_click") await handleVerifyButton(interaction);
        else if (customId === "rules_accept") await handleRulesAccept(interaction);
        else if (customId.startsWith("feedback_")) {
          const rating = parseInt(customId.split("_")[1] ?? "0", 10);
          if (rating >= 1 && rating <= 5) await handleFeedbackSubmit(interaction, rating);
        }
      }
    } catch (err) {
      console.error("[Bot] Interaction error:", err);
    }
  });

  // ─── Member join: welcome + raid protection ──────────────────────────────────
  client.on(Events.GuildMemberAdd, async (member) => {
    await Promise.allSettled([
      handleMemberWelcome(member),
      handleRaidMemberAdd(member),
    ]);
  });

  // ─── Messages: toxic filter ──────────────────────────────────────────────────
  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;
    await handleToxicMessage(message).catch(() => null);
  });

  // ─── Channel delete: nuke protection ────────────────────────────────────────
  client.on(Events.ChannelDelete, async (channel) => {
    if (channel instanceof GuildChannel) {
      await handleChannelDelete(channel).catch(() => null);
    }
  });

  // ─── Role delete: nuke protection ───────────────────────────────────────────
  client.on(Events.GuildRoleDelete, async (role) => {
    await handleRoleDelete(role).catch(() => null);
  });

  // ─── Mass ban: nuke protection ───────────────────────────────────────────────
  client.on(Events.GuildBanAdd, async (ban) => {
    await handleGuildBan(ban.guild).catch(() => null);
  });

  try {
    await client.login(token);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("disallowed intents")) {
      console.error(
        "[Bot] ❌  PRIVILEGED INTENTS NOT ENABLED.\n" +
          "       Go to: https://discord.com/developers/applications\n" +
          "       → Bot → Privileged Gateway Intents\n" +
          "       → Enable: 'Server Members Intent' AND 'Message Content Intent'",
      );
    } else if (msg.includes("TOKEN_INVALID") || msg.includes("An invalid token")) {
      console.error("[Bot] ❌  Invalid DISCORD_TOKEN.");
    } else {
      throw err;
    }
  }
}
