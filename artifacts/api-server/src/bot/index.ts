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

const commands = [
  setupCommand.toJSON(),
  ticketCommand.toJSON(),
  panelCommand.toJSON(),
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

    try {
      await rest.put(Routes.applicationCommands(clientId), {
        body: commands,
      });
      console.log("[Bot] Slash commands registered globally.");
    } catch (err) {
      console.error("[Bot] Failed to register slash commands:", err);
    }

    startStatsUpdater(readyClient);
    console.log("[Bot] Stats updater started.");
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        const { commandName } = interaction;
        if (commandName === "setup") await handleSetupCommand(interaction);
        else if (commandName === "ticket") await handleTicketCommand(interaction);
        else if (commandName === "panel") await handlePanelCommand(interaction);
        return;
      }

      if (interaction.isButton()) {
        const { customId } = interaction;
        if (customId === "ticket_create") {
          await handleCreateTicket(interaction);
        } else if (customId === "ticket_close") {
          await handleCloseTicket(interaction);
        } else if (customId.startsWith("feedback_")) {
          const rating = parseInt(customId.split("_")[1] ?? "0", 10);
          if (rating >= 1 && rating <= 5) {
            await handleFeedbackSubmit(interaction, rating);
          }
        }
      }
    } catch (err) {
      console.error("[Bot] Unhandled interaction error:", err);
    }
  });

  client.on(Events.GuildMemberAdd, async (member) => {
    await handleRaidMemberAdd(member).catch((err) =>
      console.error("[Bot] Raid protection error:", err),
    );
  });

  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;
    await handleToxicMessage(message).catch((err) =>
      console.error("[Bot] Toxic filter error:", err),
    );
  });

  client.on(Events.ChannelDelete, async (channel) => {
    if (channel instanceof GuildChannel) {
      await handleChannelDelete(channel).catch((err) =>
        console.error("[Bot] Nuke protection (channel) error:", err),
      );
    }
  });

  client.on(Events.GuildRoleDelete, async (role) => {
    await handleRoleDelete(role).catch((err) =>
      console.error("[Bot] Nuke protection (role) error:", err),
    );
  });

  client.on(Events.GuildBanAdd, async (ban) => {
    await handleGuildBan(ban.guild).catch((err) =>
      console.error("[Bot] Nuke protection (ban) error:", err),
    );
  });

  try {
    await client.login(token);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("disallowed intents")) {
      console.error(
        "[Bot] ❌  PRIVILEGED INTENTS NOT ENABLED.\n" +
          "       Go to: https://discord.com/developers/applications\n" +
          "       → Select your application → Bot → Privileged Gateway Intents\n" +
          "       → Enable: 'Server Members Intent' AND 'Message Content Intent'\n" +
          "       → Save Changes, then restart the server.",
      );
    } else if (msg.includes("TOKEN_INVALID") || msg.includes("An invalid token")) {
      console.error("[Bot] ❌  Invalid DISCORD_TOKEN. Check your bot token in the Developer Portal.");
    } else {
      throw err;
    }
  }
}
