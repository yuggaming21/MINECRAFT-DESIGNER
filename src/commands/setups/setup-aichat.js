const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const AiChat = require('../../models/aichat/aiModel');
const cmdIcons = require('../../UI/icons/commandicons');
const checkPermissions = require('../../utils/checkPermissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-aichat')
        .setDescription('Configure AI chat features for your server')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Set a channel for AI chat and toggle it on/off')
                .addChannelOption(option => 
                    option.setName('channel')
                        .setDescription('The channel to use for AI chat')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('status')
                        .setDescription('Enable or disable AI chat')
                        .setRequired(true)
                        .addChoices(
                            { name: 'On', value: 'on' },
                            { name: 'Off', value: 'off' }
                        ))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View current AI chat settings')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Disable AI chat for your server')
        ),

    async execute(interaction) {
        if (interaction.isCommand && interaction.isCommand()) {
            const guild = interaction.guild;
            const serverId = interaction.guild.id;
        
            
            const subcommand = interaction.options.getSubcommand();
            const guildId = interaction.guild.id;
            if (!await checkPermissions(interaction)) return;
            if (subcommand === 'set') {
                const channel = interaction.options.getChannel('channel');
                const status = interaction.options.getString('status');
                const isEnabled = status === 'on';

                try {
                 
                    const existingConfig = await AiChat.getConfig(guildId);
                    
                 
                    await AiChat.setConfig(guildId, channel.id, isEnabled, interaction.user.id);
                    
                    let updateMessage;
                    if (existingConfig) {
                        updateMessage = existingConfig.channelId !== channel.id ? 
                            `✅ AI Chat has been ${isEnabled ? 'enabled' : 'disabled'} and moved to ${channel}.` :
                            `✅ AI Chat has been ${isEnabled ? 'enabled' : 'disabled'} in ${channel}.`;
                    } else {
                        updateMessage = `✅ AI Chat has been ${isEnabled ? 'enabled' : 'disabled'} in ${channel}.`;
                    }
                    
                    await interaction.reply({
                        content: updateMessage,
                        ephemeral: true
                    });
                } catch (error) {
                    console.error(`Error setting up AI chat for guild ${guildId}:`, error);
                    await interaction.reply({
                        content: '❌ There was an error saving your settings. Please try again later.',
                        ephemeral: true
                    });
                }
            } else if (subcommand === 'view') {
                try {
                    // Use model method to get config
                    const config = await AiChat.getConfig(guildId);
                    
                    if (!config) {
                        await interaction.reply({
                            content: '❓ AI Chat has not been set up for this server yet.',
                            ephemeral: true
                        });
                        return;
                    }

                    const channel = interaction.guild.channels.cache.get(config.channelId) || 'Unknown channel';
                    
                    await interaction.reply({
                        content: `**AI Chat Configuration**\n` +
                            `**Channel:** ${channel}\n` +
                            `**Status:** ${config.isEnabled ? '✅ Enabled' : '❌ Disabled'}\n` +
                            `**Last Updated:** ${config.updatedAt?.toLocaleString() || 'Unknown'}\n`,
                        ephemeral: true
                    });
                } catch (error) {
                    console.error(`Error fetching AI chat config for guild ${guildId}:`, error);
                    await interaction.reply({
                        content: '❌ There was an error retrieving your settings. Please try again later.',
                        ephemeral: true
                    });
                }
            } else if (subcommand === 'disable') {
                try {
              
                    const config = await AiChat.getConfig(guildId);
                    
                    if (!config) {
                        await interaction.reply({
                            content: '❓ AI Chat has not been set up for this server yet.',
                            ephemeral: true
                        });
                        return;
                    }
                    
                    await AiChat.disableChat(guildId, interaction.user.id);
                    
                    await interaction.reply({
                        content: `✅ AI Chat has been disabled for this server.`,
                        ephemeral: true
                    });
                } catch (error) {
                    console.error(`Error disabling AI chat for guild ${guildId}:`, error);
                    await interaction.reply({
                        content: '❌ There was an error updating your settings. Please try again later.',
                        ephemeral: true
                    });
                }
            }
        } else {
            const embed = new EmbedBuilder()
                .setColor('#3498db')
                .setAuthor({ 
                    name: "Alert!", 
                    iconURL: cmdIcons.dotIcon,
                    url: "https://discord.gg/xQF9f9yUEM"
                })
                .setDescription('- This command can only be used through slash commands!\n- Please use `/setup-aichat`')
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        }
    }
};