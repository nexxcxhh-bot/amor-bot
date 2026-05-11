import { Client, Guild, ChannelType, PermissionFlagsBits } from "discord.js";
import { getGuildConfig, setGuildConfig, getOpenTicketCount } from "../storage.js";

async function updateGuildStats(guild: Guild): Promise<void> {
  const config = getGuildConfig(guild.id);
  if (!config.statsCategoryId) return;

  try {
    const members = await guild.members.fetch();
    const totalMembers = members.filter((m) => !m.user.bot).size;
    const botCount = members.filter((m) => m.user.bot).size;
    const openTickets = getOpenTicketCount(guild.id);

    const updates: Array<[string | undefined, string]> = [
      [config.memberCountChannelId, `👥 Members: ${totalMembers}`],
      [config.botCountChannelId, `🤖 Bots: ${botCount}`],
      [config.ticketCountChannelId, `🎫 Tickets: ${openTickets}`],
    ];

    for (const [channelId, newName] of updates) {
      if (!channelId) continue;
      const channel = guild.channels.cache.get(channelId);
      if (channel && channel.name !== newName) {
        await channel.setName(newName).catch(() => null);
      }
    }
  } catch {
    /* ignore */
  }
}

export function startStatsUpdater(client: Client): void {
  const update = async () => {
    for (const [, guild] of client.guilds.cache) {
      await updateGuildStats(guild).catch(() => null);
    }
  };

  update();
  setInterval(update, 5 * 60 * 1000);
}

export async function createStatsChannels(guild: Guild): Promise<void> {
  await guild.members.fetch();

  const totalMembers = guild.members.cache.filter((m) => !m.user.bot).size;
  const botCount = guild.members.cache.filter((m) => m.user.bot).size;
  const openTickets = getOpenTicketCount(guild.id);

  const noConnect = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.Connect],
    },
  ];

  const category = await guild.channels.create({
    name: "📊 Server Stats",
    type: ChannelType.GuildCategory,
  });

  const memberChannel = await guild.channels.create({
    name: `👥 Members: ${totalMembers}`,
    type: ChannelType.GuildVoice,
    parent: category.id,
    permissionOverwrites: noConnect,
  });

  const botChannel = await guild.channels.create({
    name: `🤖 Bots: ${botCount}`,
    type: ChannelType.GuildVoice,
    parent: category.id,
    permissionOverwrites: noConnect,
  });

  const ticketChannel = await guild.channels.create({
    name: `🎫 Tickets: ${openTickets}`,
    type: ChannelType.GuildVoice,
    parent: category.id,
    permissionOverwrites: noConnect,
  });

  setGuildConfig(guild.id, {
    statsCategoryId: category.id,
    memberCountChannelId: memberChannel.id,
    botCountChannelId: botChannel.id,
    ticketCountChannelId: ticketChannel.id,
  });
}
