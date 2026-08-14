const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const LogConfig = require('../../models/serverLogs/LogConfig'); 
const cmdIcons = require('../../UI/icons/commandicons');
const checkPermissions = require('../../utils/checkPermissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-logs')
        .setDescription('Configure server logging channels for specific or all events.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('event')
                .setDescription('Set a logging channel for a specific event.')
                .addStringOption(option =>
                    option.setName('event')
                        .setDescription('The event to log.')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Message Deleted', value: 'messageDelete' },
                            { name: 'Message Updated', value: 'messageUpdate' },
                            { name: 'Member Joined', value: 'memberJoin' },
                            { name: 'Member Left', value: 'memberLeave' },
                            { name: 'Role Created', value: 'roleCreate' },
                            { name: 'Role Deleted', value: 'roleDelete' },
                            { name: 'Member Banned', value: 'memberBan' },
                            { name: 'Member Unbanned', value: 'memberUnban' },
                            { name: 'Voice Channel Joined', value: 'voiceJoin' },
                            { name: 'Voice Channel Left', value: 'voiceLeave' },
                            { name: 'Channel Created', value: 'channelCreate' },
                            { name: 'Channel Deleted', value: 'channelDelete' },
                            { name: 'Role Assigned to User', value: 'roleAssigned' },
                            { name: 'Role Removed from User', value: 'roleRemoved' },
                            { name: 'Nickname Changed', value: 'nicknameChange' },
                            { name: 'Moderation Logs', value: 'moderationLogs' },
                        ))
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The channel to log the event in.')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('all')
                .setDescription('Set a logging channel for all events.')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The channel to log all events in.')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View all configured logging channels.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear-event')
                .setDescription('Clear the logging channel for a specific event.')
                .addStringOption(option =>
                    option.setName('event')
                        .setDescription('The event to clear logs for.')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Message Deleted', value: 'messageDelete' },
                            { name: 'Message Updated', value: 'messageUpdate' },
                            { name: 'Member Joined', value: 'memberJoin' },
                            { name: 'Member Left', value: 'memberLeave' },
                            { name: 'Role Created', value: 'roleCreate' },
                            { name: 'Role Deleted', value: 'roleDelete' },
                            { name: 'Member Banned', value: 'memberBan' },
                            { name: 'Member Unbanned', value: 'memberUnban' },
                            { name: 'Voice Channel Joined', value: 'voiceJoin' },
                            { name: 'Voice Channel Left', value: 'voiceLeave' },
                            { name: 'Channel Created', value: 'channelCreate' },
                            { name: 'Channel Deleted', value: 'channelDelete' },
                            { name: 'Role Assigned to User', value: 'roleAssigned' },
                            { name: 'Role Removed from User', value: 'roleRemoved' },
                            { name: 'Nickname Changed', value: 'nicknameChange' },
                            { name: 'Moderation Logs', value: 'moderationLogs' },
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear-all')
                .setDescription('Clear all logging channels for this server.')),

    async execute(interaction) {
        if (!interaction.isCommand || !interaction.isCommand()) {
            const embed = new EmbedBuilder()
                .setColor('#3498db')
                .setAuthor({
                    name: "Alert!",
                    iconURL: cmdIcons.dotIcon,
                    url: "https://discord.gg/xQF9f9yUEM"
                })
                .setDescription('- This command can only be used through slash command!\n- Please use `/setup-logs`')
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setDescription('You do not have permission to use this command.');
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        if (!await checkPermissions(interaction)) return;

        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (subcommand === 'event') {
            const eventType = interaction.options.getString('event');
            const channel = interaction.options.getChannel('channel');

            if (!channel.isTextBased()) {
                return interaction.reply({ content: 'Please select a text-based channel.', flags: 64 });
            }

            await LogConfig.findOneAndUpdate(
                { guildId, eventType },
                { channelId: channel.id },
                { upsert: true, new: true }
            );

            return interaction.reply({
                content: `Logs for **${eventType}** will now be sent to <#${channel.id}>.`,
                flags: 64
            });
        }

        if (subcommand === 'all') {
            const channel = interaction.options.getChannel('channel');

            if (!channel.isTextBased()) {
                return interaction.reply({ content: 'Please select a text-based channel.', flags: 64 });
            }

            const eventTypes = [
                'messageDelete', 'messageUpdate', 'memberJoin', 'memberLeave',
                'roleCreate', 'roleDelete', 'memberBan', 'memberUnban',
                'voiceJoin', 'voiceLeave', 'channelCreate', 'channelDelete',
                'roleAssigned', 'roleRemoved', 'nicknameChange', 'moderationLogs',
            ];

            await Promise.all(eventTypes.map(eventType =>
                LogConfig.findOneAndUpdate(
                    { guildId, eventType },
                    { channelId: channel.id },
                    { upsert: true, new: true }
                )
            ));

            return interaction.reply({
                content: `Logs for all events will now be sent to <#${channel.id}>.`,
                flags: 64
            });
        }

        if (subcommand === 'view') {
            const configs = await LogConfig.find({ guildId });

            if (configs.length === 0) {
                return interaction.reply({ content: 'No logging channels have been configured yet.', flags: 64 });
            }

            const embed = new EmbedBuilder()
                .setTitle('Configured Logging Channels')
                .setColor('#00FFFF');

            configs.forEach(config => {
                embed.addFields({
                    name: config.eventType,
                    value: `<#${config.channelId}>`,
                    inline: true,
                });
            });

            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        if (subcommand === 'clear-event') {
            const eventType = interaction.options.getString('event');

            const deleted = await LogConfig.deleteOne({ guildId, eventType });

            if (deleted.deletedCount === 0) {
                return interaction.reply({
                    content: `No logging channel was set for event **${eventType}**.`,
                    flags: 64
                });
            }

            return interaction.reply({
                content: `Logging channel for event **${eventType}** has been cleared.`,
                flags: 64
            });
        }

        if (subcommand === 'clear-all') {
            const deleted = await LogConfig.deleteMany({ guildId });

            if (deleted.deletedCount === 0) {
                return interaction.reply({
                    content: 'No logging channels were set up to clear.',
                    flags: 64
                });
            }

            return interaction.reply({
                content: 'All logging channels for this server have been cleared.',
                flags: 64
            });
        }
    }
};
