/*

☆.。.:*・°☆.。.:*・°☆.。.:*・°☆.。.:*・°☆
                                                 
  _________ ___ ___ ._______   _________    
 /   _____//   |   \|   \   \ /   /  _  \   
 \_____  \/    ~    \   |\   Y   /  /_\  \  
 /        \    Y    /   | \     /    |    \ 
/_______  /\___|_  /|___|  \___/\____|__  / 
        \/       \/                     \/  
                    
DISCORD :  https://discord.com/invite/xQF9f9yUEM                   
YouTube : https://www.youtube.com/@GlaceYT                         

Command Verified : ✓  
Website        : ssrr.tech  
Test Passed    : ✓

☆.。.:*・°☆.。.:*・°☆.。.:*・°☆.。.:*・°☆
*/
const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const { notificationsCollection } = require('../../mongodb');
const cmdIcons = require('../../UI/icons/commandicons');
const checkPermissions = require('../../utils/checkPermissions');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-notifications')
        .setDescription('Manage notifications for YouTube, Twitch, Facebook, and Instagram.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels)
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Set up notifications for a platform.')
                .addStringOption(option =>
                    option.setName('platform')
                        .setDescription('The platform to set up notifications for.')
                        .setRequired(true)
                        .addChoices(
                            { name: 'YouTube', value: 'youtube' },
                            { name: 'Twitch', value: 'twitch' },
                            { name: 'Facebook', value: 'facebook' },
                            { name: 'Instagram', value: 'instagram' },
                        ))
                .addStringOption(option =>
                    option.setName('platform_id')
                        .setDescription('YouTube Channel ID, Twitch Channel ID, Facebook Channel ID, or Instagram Account ID.')
                        .setRequired(true))
                .addChannelOption(option =>
                    option.setName('discord_channel')
                        .setDescription('The Discord channel for notifications.')
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('mention_role')
                        .setDescription('The primary role to mention for notifications.')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('additional_roles')
                        .setDescription('Comma-separated list of additional roles to mention (IDs).')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View all current notification setups for a platform.')
                .addStringOption(option =>
                    option.setName('platform')
                        .setDescription('The platform to view notifications for.')
                        .setRequired(true)
                        .addChoices(
                            { name: 'YouTube', value: 'youtube' },
                            { name: 'Twitch', value: 'twitch' },
                            { name: 'Facebook', value: 'facebook' },
                            { name: 'Instagram', value: 'instagram' },
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Delete a notification setup for a platform.')
                .addStringOption(option =>
                    option.setName('platform')
                        .setDescription('The platform to delete notifications for.')
                        .setRequired(true)
                        .addChoices(
                            { name: 'YouTube', value: 'youtube' },
                            { name: 'Twitch', value: 'twitch' },
                            { name: 'Facebook', value: 'facebook' },
                            { name: 'Instagram', value: 'instagram' },
                        ))
                .addStringOption(option =>
                    option.setName('platform_id')
                        .setDescription('The platform ID of the notification to delete.')
                        .setRequired(true))),
    async execute(interaction) {
        if (interaction.isCommand && interaction.isCommand()) {
            const guild = interaction.guild;
            const serverId = interaction.guild.id;
            if (!await checkPermissions(interaction)) return;
        const subcommand = interaction.options.getSubcommand();
        const platform = interaction.options.getString('platform');
        const guildId = interaction.guild.id;

        if (subcommand === 'setup') {
            const platformId = interaction.options.getString('platform_id');
            const discordChannel = interaction.options.getChannel('discord_channel');
            const mentionRole = interaction.options.getRole('mention_role');
            const additionalRoles = interaction.options.getString('additional_roles');

            if (!discordChannel.isTextBased()) {
                return interaction.reply({
                    content: 'Please select a text-based channel for notifications.',
                    flags: 64,
                });
            }

         
            const additionalRoleIds = additionalRoles
                ? additionalRoles.split(',').map(role => role.trim()).filter(roleId => interaction.guild.roles.cache.has(roleId))
                : [];

        
            const mentionRoles = mentionRole ? [mentionRole.id, ...additionalRoleIds] : additionalRoleIds;

            try {
                await notificationsCollection.updateOne(
                    { guildId, type: platform, platformId },
                    {
                        $set: {
                            discordChannelId: discordChannel.id,
                            mentionRoles,
                            lastNotifiedId: null, 
                        },
                    },
                    { upsert: true }
                );

                const embed = new EmbedBuilder()
                    .setTitle(`${platform.charAt(0).toUpperCase() + platform.slice(1)} Notifications Setup`)
                    .setDescription(`Successfully set up ${platform} notifications!`)
                    .addFields(
                        { name: `${platform.charAt(0).toUpperCase() + platform.slice(1)} ID`, value: platformId },
                        { name: 'Discord Channel', value: `<#${discordChannel.id}>` },
                        { name: 'Mention Roles', value: mentionRoles.length > 0 ? mentionRoles.map(role => `<@&${role}>`).join(', ') : 'None' }
                    )
                    .setColor('#00FF00');

                return interaction.reply({ embeds: [embed], flags: 64 });
            } catch (error) {
                console.error('Error setting up notifications:', error);
                return interaction.reply({
                    content: 'An error occurred while setting up notifications. Please try again later.',
                    flags: 64,
                });
            }
        }

        if (subcommand === 'view') {
            try {
                const configs = await notificationsCollection.find({ guildId, type: platform }).toArray();

                if (configs.length === 0) {
                    return interaction.reply({
                        content: `No ${platform} notifications have been set up for this server.`,
                        flags: 64,
                    });
                }

                const embed = new EmbedBuilder()
                    .setTitle(`${platform.charAt(0).toUpperCase() + platform.slice(1)} Notifications`)
                    .setDescription(`Here are the current ${platform} notification setups:`)
                    .setColor('#00FFFF');

                configs.forEach(config => {
                    embed.addFields({
                        name: `Platform ID: ${config.platformId}`,
                        value: `Channel: <#${config.discordChannelId}>\nRoles: ${
                            config.mentionRoles && config.mentionRoles.length > 0
                                ? config.mentionRoles.map(role => `<@&${role}>`).join(', ')
                                : 'None'
                        }`,
                    });
                });

                return interaction.reply({ embeds: [embed], flags: 64 });
            } catch (error) {
                console.error('Error fetching notifications:', error);
                return interaction.reply({
                    content: 'An error occurred while fetching notifications. Please try again later.',
                    flags: 64,
                });
            }
        }

        if (subcommand === 'delete') {
            const platformId = interaction.options.getString('platform_id');

            try {
                // Check if the configuration exists before attempting to delete
                const existingConfig = await notificationsCollection.findOne({ 
                    guildId, 
                    type: platform, 
                    platformId 
                });

                if (!existingConfig) {
                    return interaction.reply({
                        content: `No ${platform} notification setup found for platform ID: ${platformId}`,
                        flags: 64,
                    });
                }

                // Delete the notification configuration
                const result = await notificationsCollection.deleteOne({ 
                    guildId, 
                    type: platform, 
                    platformId 
                });

                if (result.deletedCount === 1) {
                    const embed = new EmbedBuilder()
                        .setTitle(`${platform.charAt(0).toUpperCase() + platform.slice(1)} Notification Deleted`)
                        .setDescription(`Successfully deleted the ${platform} notification setup for platform ID: ${platformId}`)
                        .setColor('#FF0000');

                    return interaction.reply({ embeds: [embed], flags: 64 });
                } else {
                    return interaction.reply({
                        content: `Failed to delete the ${platform} notification setup. Please try again.`,
                        flags: 64,
                    });
                }
            } catch (error) {
                console.error('Error deleting notification setup:', error);
                return interaction.reply({
                    content: 'An error occurred while deleting the notification setup. Please try again later.',
                    flags: 64,
                });
            }
        }

        else {
            const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setAuthor({ 
                name: "Alert!", 
                iconURL: cmdIcons.dotIcon ,
                url: "https://discord.gg/xQF9f9yUEM"
            })
            .setDescription('- This command can only be used through slash command!\n- Please use `/setup-notifications`')
            .setTimestamp();
        
            await interaction.reply({ embeds: [embed] });
        
            }  
        }
    },
};

/*

☆.。.:*・°☆.。.:*・°☆.。.:*・°☆.。.:*・°☆
                                                 
  _________ ___ ___ ._______   _________    
 /   _____//   |   \|   \   \ /   /  _  \   
 \_____  \/    ~    \   |\   Y   /  /_\  \  
 /        \    Y    /   | \     /    |    \ 
/_______  /\___|_  /|___|  \___/\____|__  / 
        \/       \/                     \/  
                    
DISCORD :  https://discord.com/invite/xQF9f9yUEM                   
YouTube : https://www.youtube.com/@GlaceYT                         

Command Verified : ✓  
Website        : ssrr.tech  
Test Passed    : ✓

☆.。.:*・°☆.。.:*・°☆.。.:*・°☆.。.:*・°☆
*/
