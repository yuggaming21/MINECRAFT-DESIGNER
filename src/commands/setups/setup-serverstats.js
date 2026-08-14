const { SlashCommandBuilder, PermissionsBitField, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const ServerStats = require('../../models/serverstats/Schema'); // Adjust path
const ServerStatsService = require('../../services/serverStatsService'); // Adjust path
const checkPermissions = require('../../utils/checkPermissions'); // Adjust path
const cmdIcons = require('../../UI/icons/commandicons'); // Adjust path

const STAT_TYPES = ['members', 'bots', 'textChannels', 'voiceChannels', 'categories', 'roles', 'date', 'all'];

const STAT_DESCRIPTIONS = {
  members: 'Human members count',
  bots: 'Bot members count',
  textChannels: 'Text channels count',
  voiceChannels: 'Voice channels count',
  categories: 'Categories count',
  roles: 'Roles count (excluding @everyone)',
  date: 'Current date',
  all: 'Total members (humans + bots)'
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-serverstats')
    .setDescription('Manage server statistics channels')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels)
    
    .addSubcommand(sub => 
      sub.setName('setup')
        .setDescription('Setup server stats channels')
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Select which stat to track')
            .setRequired(true)
            .addChoices(
              { name: 'All Stats', value: 'all_types' },
              ...STAT_TYPES.map(type => ({ 
                name: `${type.charAt(0).toUpperCase() + type.slice(1)} - ${STAT_DESCRIPTIONS[type]}`, 
                value: type 
              }))
            )
        )
        .addBooleanOption(option => 
          option.setName('active')
            .setDescription('Enable or disable this stat')
            .setRequired(true)
        )
        .addChannelOption(option => 
          option.setName('category')
            .setDescription('Category to place the stats channels in')
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(false)
        )
        .addStringOption(option => 
          option.setName('format')
            .setDescription('Custom name format (use {count} for the value)')
            .setRequired(false)
        )
    )

    .addSubcommand(sub =>
      sub.setName('view')
        .setDescription('View current server stats configuration')
    )

    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove a specific server stat channel')
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Type of stat to remove')
            .setRequired(true)
            .addChoices(...STAT_TYPES.map(type => ({ name: type, value: type })))
        )
    )

    .addSubcommand(sub =>
      sub.setName('clear')
        .setDescription('Remove all server stats channels')
    )

    .addSubcommand(sub =>
      sub.setName('update')
        .setDescription('Force update all server stats channels')
    )

    .addSubcommand(sub =>
      sub.setName('settings')
        .setDescription('Configure server stats settings')
        .addIntegerOption(option =>
          option.setName('interval')
            .setDescription('Update interval in minutes (1-60)')
            .setMinValue(1)
            .setMaxValue(60)
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option.setName('autoupdate')
            .setDescription('Enable/disable automatic updates')
            .setRequired(false)
        )
        .addStringOption(option =>
          option.setName('timezone')
            .setDescription('Timezone for date formatting (e.g., America/New_York)')
            .setRequired(false)
        )
    ),

  async execute(interaction) {
    // Initialize service
    const statsService = new ServerStatsService(interaction.client);
    
    if (!interaction.isChatInputCommand()) {
      const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setAuthor({ 
          name: "Command Usage Error", 
          iconURL: cmdIcons?.dotIcon,
          url: "https://discord.gg/xQF9f9yUEM"
        })
        .setDescription('This command can only be used as a slash command!\nUse `/serverstats` instead.')
        .setTimestamp();

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    const subcommand = interaction.options.getSubcommand();

    // Check permissions
    if (!await checkPermissions(interaction)) return;

    // Check bot permissions
    if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return interaction.editReply({ 
        content: '❌ I need the `Manage Channels` permission to create and update stats channels!' 
      });
    }

    try {
      switch (subcommand) {
        case 'setup':
          await handleSetupCommand(interaction, statsService);
          break;
        case 'view':
          await handleViewCommand(interaction, statsService);
          break;
        case 'remove':
          await handleRemoveCommand(interaction, statsService);
          break;
        case 'clear':
          await handleClearCommand(interaction, statsService);
          break;
        case 'update':
          await handleUpdateCommand(interaction, statsService);
          break;
        case 'settings':
          await handleSettingsCommand(interaction, statsService);
          break;
        default:
          await interaction.editReply({ content: '❌ Unknown subcommand.' });
      }
    } catch (error) {
      console.error(`[ServerStatsController] Error in ${subcommand}:`, error);
      await interaction.editReply({ 
        content: `❌ An error occurred while executing the command: ${error.message}` 
      }).catch(console.error);
    }
  }
};

async function handleSetupCommand(interaction, statsService) {
  const type = interaction.options.getString('type');
  const active = interaction.options.getBoolean('active');
  const category = interaction.options.getChannel('category');
  const customFormat = interaction.options.getString('format');

  const statsTypes = type === 'all_types' ? STAT_TYPES : [type];
  const customFormats = {};
  
  if (customFormat && type !== 'all_types') {
    customFormats[type] = customFormat;
  }

  try {
    const results = await statsService.setupStatsChannels(
      interaction.guild,
      statsTypes,
      {
        categoryId: category?.id,
        customFormats,
        active
      }
    );

    // Build response embed
    const embed = new EmbedBuilder()
      .setTitle('📊 Server Stats Setup')
      .setColor(active ? '#00ff00' : '#ff0000')
      .setDescription(`**${type === 'all_types' ? 'All Stats' : type}** ${active ? 'enabled' : 'disabled'} successfully!`)
      .setFooter({ text: `Guild: ${interaction.guild.name}` })
      .setTimestamp();

    if (results.created.length > 0) {
      embed.addFields({
        name: '✅ Created Channels',
        value: results.created.map(t => `• ${t}`).join('\n'),
        inline: true
      });
    }

    if (results.updated.length > 0) {
      embed.addFields({
        name: '🔄 Updated Channels',
        value: results.updated.map(t => `• ${t}`).join('\n'),
        inline: true
      });
    }

    if (results.errors.length > 0) {
      embed.addFields({
        name: '❌ Errors',
        value: results.errors.map(e => `• ${e.type}: ${e.error}`).slice(0, 5).join('\n'),
        inline: false
      });
    }

    if (category) {
      embed.addFields({
        name: '📁 Category',
        value: `<#${category.id}>`,
        inline: true
      });
    }

    // Trigger immediate update
    setTimeout(() => {
      statsService.updateGuildStats(interaction.guild);
    }, 2000);

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    throw new Error(`Failed to setup stats channels: ${error.message}`);
  }
}

async function handleViewCommand(interaction, statsService) {
  try {
    const dashboardData = await statsService.getDashboardData(interaction.guild.id);
    
    if (!dashboardData || !dashboardData.statsChannels.length) {
      return interaction.editReply({ 
        content: '📊 No server stats channels are currently configured.\nUse `/serverstats setup` to get started!' 
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('📊 Server Stats Configuration')
      .setColor('#3498db')
      .setDescription(`Statistics tracking for **${dashboardData.guild.name}**`)
      .setThumbnail(dashboardData.guild.icon)
      .setFooter({ text: `Last updated: ${dashboardData.lastUpdate?.toLocaleString() || 'Never'}` })
      .setTimestamp();

    // Add active channels
    const activeChannels = dashboardData.statsChannels.filter(ch => ch.active);
    if (activeChannels.length > 0) {
      const channelsList = activeChannels.map((channel, index) => {
        const emoji = channel.nameFormat.match(/^(\p{Emoji})/u)?.[1] || '📊';
        return `${emoji} **${channel.type}**: <#${channel.channelId}>\n` +
               `   Format: \`${channel.nameFormat}\`\n` +
               `   Current: ${channel.currentValue}\n` +
               `   Updated: <t:${Math.floor(new Date(channel.lastUpdatedAt).getTime() / 1000)}:R>`;
      }).join('\n\n');

      embed.addFields({
        name: `✅ Active Stats (${activeChannels.length})`,
        value: channelsList,
        inline: false
      });
    }

    // Add inactive channels
    const inactiveChannels = dashboardData.statsChannels.filter(ch => !ch.active);
    if (inactiveChannels.length > 0) {
      embed.addFields({
        name: `❌ Inactive Stats (${inactiveChannels.length})`,
        value: inactiveChannels.map(ch => `• ${ch.type}`).join('\n'),
        inline: true
      });
    }

    // Add settings
    embed.addFields({
      name: '⚙️ Settings',
      value: [
        `Auto Update: ${dashboardData.settings.autoUpdate ? '✅' : '❌'}`,
        `Update Interval: ${Math.floor(dashboardData.settings.updateInterval / 60000)}min`,
        `Total Updates: ${dashboardData.statistics.totalUpdates}`,
        `Failed Updates: ${dashboardData.statistics.failedUpdates}`
      ].join('\n'),
      inline: true
    });

    // Add action buttons
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('stats_force_update')
          .setLabel('Force Update')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🔄'),
        new ButtonBuilder()
          .setCustomId('stats_settings')
          .setLabel('Settings')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('⚙️')
      );

    await interaction.editReply({ embeds: [embed], components: [row] });
  } catch (error) {
    throw new Error(`Failed to fetch stats configuration: ${error.message}`);
  }
}

async function handleRemoveCommand(interaction, statsService) {
  const type = interaction.options.getString('type');

  try {
    const serverStats = await ServerStats.findByGuildId(interaction.guild.id);
    if (!serverStats) {
      return interaction.editReply({ content: '❌ No server stats configuration found.' });
    }

    const channelToRemove = serverStats.statsChannels.find(ch => ch.type === type);
    if (!channelToRemove) {
      return interaction.editReply({ content: `❌ No stats channel found for type: **${type}**` });
    }

    // Delete Discord channel
    const discordChannel = interaction.guild.channels.cache.get(channelToRemove.channelId);
    if (discordChannel) {
      await discordChannel.delete(`Server stats channel removed by ${interaction.user.tag}`);
    }

    // Remove from database
    await serverStats.removeStatsChannel(channelToRemove.channelId);

    const embed = new EmbedBuilder()
      .setTitle('🗑️ Stats Channel Removed')
      .setColor('#ff0000')
      .setDescription(`Successfully removed **${type}** stats channel.`)
      .addFields({
        name: 'Removed Channel',
        value: `Type: ${type}\nChannel: ${discordChannel ? `#${discordChannel.name}` : 'Already deleted'}`,
        inline: false
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    throw new Error(`Failed to remove stats channel: ${error.message}`);
  }
}

async function handleClearCommand(interaction, statsService) {
  try {
    const serverStats = await ServerStats.findByGuildId(interaction.guild.id);
    if (!serverStats || !serverStats.statsChannels.length) {
      return interaction.editReply({ content: '❌ No server stats channels to remove.' });
    }

    // Confirmation embed
    const confirmEmbed = new EmbedBuilder()
      .setTitle('⚠️ Confirm Clear All Stats')
      .setColor('#ffaa00')
      .setDescription(
        `This will **permanently delete** all ${serverStats.statsChannels.length} stats channels and configuration.\n\n` +
        '**This action cannot be undone!**'
      )
      .addFields({
        name: 'Channels to be deleted',
        value: serverStats.statsChannels.map(ch => `• ${ch.type} (<#${ch.channelId}>)`).join('\n'),
        inline: false
      })
      .setTimestamp();

    const confirmRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('confirm_clear_stats')
          .setLabel('Yes, Delete All')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🗑️'),
        new ButtonBuilder()
          .setCustomId('cancel_clear_stats')
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('❌')
      );

    const response = await interaction.editReply({ 
      embeds: [confirmEmbed], 
      components: [confirmRow] 
    });

    // Handle button interaction
    const filter = (i) => i.user.id === interaction.user.id;
    const collector = response.createMessageComponentCollector({ filter, time: 30000 });

    collector.on('collect', async (buttonInteraction) => {
      await buttonInteraction.deferUpdate();

      if (buttonInteraction.customId === 'confirm_clear_stats') {
        let deletedCount = 0;
        let failedCount = 0;

        // Delete all Discord channels
        for (const statsChannel of serverStats.statsChannels) {
          try {
            const discordChannel = interaction.guild.channels.cache.get(statsChannel.channelId);
            if (discordChannel) {
              await discordChannel.delete(`All stats channels cleared by ${interaction.user.tag}`);
              deletedCount++;
            }
          } catch (error) {
            console.error(`Failed to delete channel ${statsChannel.channelId}:`, error);
            failedCount++;
          }
        }

        // Clear database configuration
        await ServerStats.findOneAndDelete({ guildId: interaction.guild.id });

        const resultEmbed = new EmbedBuilder()
          .setTitle('✅ Stats Channels Cleared')
          .setColor('#00ff00')
          .setDescription('All server stats channels and configuration have been removed.')
          .addFields({
            name: 'Results',
            value: [
              `✅ Deleted: ${deletedCount} channels`,
              failedCount > 0 ? `❌ Failed: ${failedCount} channels` : '',
              '🗑️ Database configuration cleared'
            ].filter(Boolean).join('\n'),
            inline: false
          })
          .setTimestamp();

        await interaction.editReply({ embeds: [resultEmbed], components: [] });
      } else {
        await interaction.editReply({ 
          content: '❌ Clear operation cancelled.', 
          embeds: [], 
          components: [] 
        });
      }
    });

    collector.on('end', async () => {
      try {
        await interaction.editReply({ components: [] });
      } catch (error) {
        // Ignore if message was already deleted
      }
    });

  } catch (error) {
    throw new Error(`Failed to clear stats channels: ${error.message}`);
  }
}

async function handleUpdateCommand(interaction, statsService) {
  try {
    const embed = new EmbedBuilder()
      .setTitle('🔄 Updating Server Stats')
      .setColor('#ffaa00')
      .setDescription('Forcing update of all server statistics channels...')
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    // Force update
    const results = await statsService.updateGuildStats(interaction.guild);

    const resultEmbed = new EmbedBuilder()
      .setTitle('✅ Server Stats Updated')
      .setColor('#00ff00')
      .setDescription('Server statistics update completed!')
      .addFields({
        name: 'Update Results',
        value: [
          `✅ Updated: ${results.updated} channels`,
          `❌ Failed: ${results.failed} channels`,
          `📊 Total: ${results.total} channels`
        ].join('\n'),
        inline: false
      })
      .setFooter({ text: 'Note: Changes may take a few moments to appear due to Discord rate limits' })
      .setTimestamp();

    await interaction.editReply({ embeds: [resultEmbed] });
  } catch (error) {
    throw new Error(`Failed to update stats: ${error.message}`);
  }
}

async function handleSettingsCommand(interaction, statsService) {
  const interval = interaction.options.getInteger('interval');
  const autoUpdate = interaction.options.getBoolean('autoupdate');
  const timezone = interaction.options.getString('timezone');

  try {
    let serverStats = await ServerStats.findByGuildId(interaction.guild.id);
    if (!serverStats) {
      serverStats = new ServerStats({
        guildId: interaction.guild.id,
        guildName: interaction.guild.name,
        statsChannels: []
      });
    }

    const changes = [];

    if (interval !== null) {
      serverStats.settings.updateInterval = interval * 60000; // Convert to milliseconds
      changes.push(`Update interval: ${interval} minutes`);
    }

    if (autoUpdate !== null) {
      serverStats.settings.autoUpdate = autoUpdate;
      changes.push(`Auto update: ${autoUpdate ? 'Enabled' : 'Disabled'}`);
    }

    if (timezone !== null) {
      // Basic timezone validation
      try {
        Intl.DateTimeFormat(undefined, { timeZone: timezone });
        serverStats.settings.timezone = timezone;
        changes.push(`Timezone: ${timezone}`);
      } catch (error) {
        return interaction.editReply({ 
          content: `❌ Invalid timezone: **${timezone}**\nPlease use a valid timezone like \`America/New_York\` or \`Europe/London\`` 
        });
      }
    }

    if (changes.length === 0) {
      return interaction.editReply({ content: '❌ No settings were provided to update.' });
    }

    await serverStats.save();

    const embed = new EmbedBuilder()
      .setTitle('⚙️ Settings Updated')
      .setColor('#00ff00')
      .setDescription('Server stats settings have been updated successfully!')
      .addFields({
        name: 'Changes Made',
        value: changes.map(change => `• ${change}`).join('\n'),
        inline: false
      })
      .addFields({
        name: 'Current Settings',
        value: [
          `Auto Update: ${serverStats.settings.autoUpdate ? '✅' : '❌'}`,
          `Update Interval: ${Math.floor(serverStats.settings.updateInterval / 60000)} minutes`,
          `Timezone: ${serverStats.settings.timezone}`,
          `Locale: ${serverStats.settings.locale}`
        ].join('\n'),
        inline: false
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    throw new Error(`Failed to update settings: ${error.message}`);
  }
}