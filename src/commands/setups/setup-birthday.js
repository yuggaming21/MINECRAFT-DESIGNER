const { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const GuildBirthdaySettings = require('../../models/birthday/setup');
const checkPermissions = require('../../utils/checkPermissions');
module.exports = {
    data:new SlashCommandBuilder()
        .setName('setup-birthday')
        .setDescription('🔧 Configure birthday system for your server')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('channel')
                .setDescription('Set the birthday announcement channel')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel for birthday announcements')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('Toggle birthday system features')
                .addStringOption(option =>
                    option.setName('feature')
                        .setDescription('Feature to toggle')
                        .setRequired(true)
                        .addChoices(
                            { name: '📅 Daily Announcements', value: 'daily' },
                            { name: '📝 Weekly Reminders', value: 'weekly' },
                            { name: '📊 Monthly Statistics', value: 'monthly' }
                        ))
                .addBooleanOption(option =>
                    option.setName('enabled')
                        .setDescription('Enable or disable the feature')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('time')
                .setDescription('Set announcement time')
                .addStringOption(option =>
                    option.setName('time')
                        .setDescription('Time in HH:MM format (24-hour)')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('role')
                .setDescription('Set mention role for birthday announcements')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('Role to mention in birthday announcements')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('message')
                .setDescription('Set custom birthday announcement message')
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('Custom message (use {user} for username, {age} for age)')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('timezone')
                .setDescription('Set server timezone')
                .addStringOption(option =>
                    option.setName('timezone')
                        .setDescription('Timezone (e.g., America/New_York, Europe/London)')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('View current birthday system configuration'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Reset birthday system to default settings')),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Permission Denied')
                    .setDescription('You need Administrator permissions to configure the birthday system.')],
                ephemeral: true
            });
        }

        await interaction.deferReply();
          if (!await checkPermissions(interaction)) return;
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        try {
            switch (subcommand) {
                case 'channel':
                    await this.handleChannelSetup(interaction, guildId);
                    break;
                case 'toggle':
                    await this.handleFeatureToggle(interaction, guildId);
                    break;
                case 'time':
                    await this.handleTimeSetup(interaction, guildId);
                    break;
                case 'role':
                    await this.handleRoleSetup(interaction, guildId);
                    break;
                case 'message':
                    await this.handleMessageSetup(interaction, guildId);
                    break;
                case 'timezone':
                    await this.handleTimezoneSetup(interaction, guildId);
                    break;
                case 'status':
                    await this.handleStatus(interaction, guildId);
                    break;
                case 'reset':
                    await this.handleReset(interaction, guildId);
                    break;
            }
        } catch (error) {
            console.error('Birthday setup error:', error);
            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Setup Error')
                    .setDescription('An error occurred while configuring the birthday system.')]
            });
        }
    },

    async handleChannelSetup(interaction, guildId) {
        const channel = interaction.options.getChannel('channel');
        
        // Check if bot has necessary permissions in the channel
        const permissions = channel.permissionsFor(interaction.guild.members.me);
        if (!permissions.has(['SendMessages', 'EmbedLinks', 'ViewChannel'])) {
            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Permission Error')
                    .setDescription(`I don't have the necessary permissions in ${channel}. Please ensure I can:\n• View Channel\n• Send Messages\n• Embed Links`)]
            });
        }

        await GuildBirthdaySettings.findOneAndUpdate(
            { guildId },
            { 
                $set: { 'settings.announcementChannelId': channel.id },
                $setOnInsert: { guildId }
            },
            { upsert: true }
        );

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Channel Set')
            .setDescription(`Birthday announcements will now be sent to ${channel}`)
            .setFooter({ text: 'Use /birthday-setup status to view all settings' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

        // Send test message to the channel
        try {
            const testEmbed = new EmbedBuilder()
                .setColor('#4A90E2')
                .setTitle('🎉 Birthday System Configured!')
                .setDescription('This channel has been set for birthday announcements.')
                .setFooter({ text: 'Birthday system is now active' })
                .setTimestamp();

            await channel.send({ embeds: [testEmbed] });
        } catch (error) {
            console.error('Error sending test message:', error);
        }
    },

    async handleFeatureToggle(interaction, guildId) {
        const feature = interaction.options.getString('feature');
        const enabled = interaction.options.getBoolean('enabled');

        const updatePath = {
            'daily': 'settings.enableDailyAnnouncements',
            'weekly': 'settings.enableWeeklyReminders',
            'monthly': 'settings.enableMonthlyStats'
        };

        await GuildBirthdaySettings.findOneAndUpdate(
            { guildId },
            { 
                $set: { [updatePath[feature]]: enabled },
                $setOnInsert: { guildId }
            },
            { upsert: true }
        );

        const featureNames = {
            'daily': '📅 Daily Announcements',
            'weekly': '📝 Weekly Reminders',
            'monthly': '📊 Monthly Statistics'
        };

        const embed = new EmbedBuilder()
            .setColor(enabled ? '#00FF00' : '#FFA500')
            .setTitle(`${enabled ? '✅ Enabled' : '⚠️ Disabled'}: ${featureNames[feature]}`)
            .setDescription(`${featureNames[feature]} ${enabled ? 'enabled' : 'disabled'} successfully.`)
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    async handleTimeSetup(interaction, guildId) {
        const timeString = interaction.options.getString('time');
        
        // Validate time format (HH:MM)
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(timeString)) {
            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Invalid Time Format')
                    .setDescription('Please use HH:MM format (24-hour). Examples: 09:00, 14:30, 23:45')]
            });
        }

        await GuildBirthdaySettings.findOneAndUpdate(
            { guildId },
            { 
                $set: { 'settings.announcementTime': timeString },
                $setOnInsert: { guildId }
            },
            { upsert: true }
        );

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('⏰ Announcement Time Updated')
            .setDescription(`Birthday announcements will be sent at **${timeString}** server time.`)
            .setFooter({ text: 'Note: Time changes may take up to 24 hours to take effect' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    async handleRoleSetup(interaction, guildId) {
        const role = interaction.options.getRole('role');

        await GuildBirthdaySettings.findOneAndUpdate(
            { guildId },
            { 
                $set: { 'settings.mentionRole': role?.id || null },
                $setOnInsert: { guildId }
            },
            { upsert: true }
        );

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🏷️ Mention Role Updated')
            .setDescription(role ? 
                `${role} will be mentioned in birthday announcements.` : 
                'Mention role has been removed.')
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    async handleMessageSetup(interaction, guildId) {
        const customMessage = interaction.options.getString('message');

        // Validate message length
        if (customMessage.length > 500) {
            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Message Too Long')
                    .setDescription('Custom message must be 500 characters or less.')]
            });
        }

        await GuildBirthdaySettings.findOneAndUpdate(
            { guildId },
            { 
                $set: { 'settings.customMessage': customMessage },
                $setOnInsert: { guildId }
            },
            { upsert: true }
        );

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('💬 Custom Message Set')
            .setDescription('Custom birthday message updated successfully!')
            .addFields({
                name: '📝 Your Message',
                value: customMessage,
                inline: false
            })
            .addFields({
                name: '🔧 Available Variables',
                value: '• `{user}` - User mention\n• `{username}` - Username\n• `{age}` - User\'s age\n• `{server}` - Server name',
                inline: false
            })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    async handleTimezoneSetup(interaction, guildId) {
        const timezone = interaction.options.getString('timezone');

        // Basic timezone validation (you might want to use a proper timezone library)
        const timezoneRegex = /^[A-Za-z]+\/[A-Za-z_]+$/;
        if (!timezoneRegex.test(timezone)) {
            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Invalid Timezone')
                    .setDescription('Please use a valid timezone format like:\n• `America/New_York`\n• `Europe/London`\n• `Asia/Tokyo`')]
            });
        }

        await GuildBirthdaySettings.findOneAndUpdate(
            { guildId },
            { 
                $set: { 'settings.timezone': timezone },
                $setOnInsert: { guildId }
            },
            { upsert: true }
        );

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🌍 Timezone Updated')
            .setDescription(`Server timezone set to **${timezone}**.`)
            .setFooter({ text: 'This affects announcement timing and date calculations' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    async handleStatus(interaction, guildId) {
        const settings = await GuildBirthdaySettings.findOne({ guildId });
        
        if (!settings) {
            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle('⚠️ Not Configured')
                    .setDescription('Birthday system is not configured for this server.\nUse `/birthday-setup channel` to get started!')]
            });
        }

        const channel = settings.settings.announcementChannelId ? 
            interaction.guild.channels.cache.get(settings.settings.announcementChannelId) : null;
        const role = settings.settings.mentionRole ?
            interaction.guild.roles.cache.get(settings.settings.mentionRole) : null;

        const embed = new EmbedBuilder()
            .setColor('#4A90E2')
            .setTitle('🔧 Birthday System Configuration')
            .addFields(
                {
                    name: '📢 Announcement Channel',
                    value: channel ? `${channel}` : '❌ Not set',
                    inline: true
                },
                {
                    name: '⏰ Announcement Time',
                    value: settings.settings.announcementTime,
                    inline: true
                },
                {
                    name: '🌍 Timezone',
                    value: settings.settings.timezone,
                    inline: true
                },
                {
                    name: '🏷️ Mention Role',
                    value: role ? `${role}` : '❌ None',
                    inline: true
                },
                {
                    name: '📅 Daily Announcements',
                    value: settings.settings.enableDailyAnnouncements ? '✅ Enabled' : '❌ Disabled',
                    inline: true
                },
                {
                    name: '📝 Weekly Reminders',
                    value: settings.settings.enableWeeklyReminders ? '✅ Enabled' : '❌ Disabled',
                    inline: true
                },
                {
                    name: '📊 Monthly Statistics',
                    value: settings.settings.enableMonthlyStats ? '✅ Enabled' : '❌ Disabled',
                    inline: true
                }
            )
            .setTimestamp();

        if (settings.settings.customMessage) {
            embed.addFields({
                name: '💬 Custom Message',
                value: settings.settings.customMessage,
                inline: false
            });
        }

        await interaction.editReply({ embeds: [embed] });
    },

    async handleReset(interaction, guildId) {
        await GuildBirthdaySettings.findOneAndDelete({ guildId });

        const embed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('🔄 Settings Reset')
            .setDescription('Birthday system configuration has been reset to default settings.')
            .addFields({
                name: '🚀 Next Steps',
                value: 'Use `/birthday-setup channel` to reconfigure the birthday system.',
                inline: false
            })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
};
