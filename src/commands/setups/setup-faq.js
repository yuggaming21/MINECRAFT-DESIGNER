
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const FaqConfig = require('../../models/faq/faqModel');
const checkPermissions = require('../../utils/checkPermissions');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('faq-setup')
        .setDescription('Configure FAQ system for this server')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('enable')
                .setDescription('Enable/disable FAQ system')
                .addBooleanOption(option =>
                    option.setName('enabled')
                        .setDescription('Enable or disable FAQ')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('channels')
                .setDescription('Set FAQ channels')
                .addStringOption(option =>
                    option.setName('channels')
                        .setDescription('Use "ALL" for all channels or comma-separated channel IDs')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('context')
                .setDescription('Set server context for AI responses')
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Detailed server description (max 5000 chars)')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('language')
                        .setDescription('Response language')
                        .setRequired(false)
                        .addChoices(
                            { name: 'English', value: 'en' },
                            { name: 'Spanish', value: 'es' },
                            { name: 'French', value: 'fr' },
                            { name: 'German', value: 'de' },
                            { name: 'Hindi', value: 'hi' },
                            { name: 'Japanese', value: 'ja' },
                            { name: 'Korean', value: 'ko' },
                            { name: 'Chinese', value: 'zh' },
                            { name: 'Arabic', value: 'ar' },
                            { name: 'Portuguese', value: 'pt' },
                            { name: 'Russian', value: 'ru' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('addlink')
                .setDescription('Add a server link')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Link type')
                        .setRequired(true)
                        .addChoices(
                            { name: 'YouTube', value: 'youtube' },
                            { name: 'Website', value: 'website' },
                            { name: 'Discord', value: 'discord' },
                            { name: 'Social Media', value: 'social' },
                            { name: 'Documentation', value: 'documentation' },
                            { name: 'Guide', value: 'guide' },
                            { name: 'Other', value: 'other' }
                        ))
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Link name/title')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('url')
                        .setDescription('URL')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Link description')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('apikeys')
                .setDescription('Add Gemini API keys for load balancing')
                .addStringOption(option =>
                    option.setName('keys')
                        .setDescription('Comma-separated API keys')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Show current FAQ configuration')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;
        if (!await checkPermissions(interaction)) return;
        try {
            switch (subcommand) {
                case 'enable':
                    const enabled = interaction.options.getBoolean('enabled');
                    await FaqConfig.createOrUpdate(guildId, { enabled });
                    
                    const embed = new EmbedBuilder()
                        .setTitle('FAQ System Updated')
                        .setDescription(`FAQ system has been **${enabled ? 'enabled' : 'disabled'}** for this server.`)
                        .setColor(enabled ? 0x00ff00 : 0xff0000);
                    
                    await interaction.reply({ embeds: [embed] });
                    break;

                case 'channels':
                    const channels = interaction.options.getString('channels');
                    await FaqConfig.createOrUpdate(guildId, { channels });
                    
                    const channelEmbed = new EmbedBuilder()
                        .setTitle('FAQ Channels Updated')
                        .setDescription(`FAQ system will respond in: **${channels}**`)
                        .setColor(0x0099ff);
                    
                    await interaction.reply({ embeds: [channelEmbed] });
                    break;

                    case 'context':
                        const description = interaction.options.getString('description');
                        const language = interaction.options.getString('language') || 'en';
                        
                        if (description.length > 5000) {
                            return await interaction.reply({ 
                                content: 'Context description is too long! Maximum 5000 characters.', 
                                ephemeral: true 
                            });
                        }
                        
                        try {
                            await FaqConfig.createOrUpdate(guildId, {
                                'context.serverDescription': description,
                                'context.language': language
                            });
                            
                            // Update server metadata using instance method
                            try {
                                const contextConfig = await FaqConfig.findByGuild(guildId);
                                if (contextConfig) {
                                    await contextConfig.updateServerMetadata(interaction.guild);
                                }
                            } catch (metadataError) {
                                console.error('Error updating server metadata:', metadataError);
                                // Continue execution even if metadata update fails
                            }
                            
                            const contextEmbed = new EmbedBuilder()
                                .setTitle('Server Context Updated')
                                .setDescription(`Context saved (${description.length} characters) in **${language}**`)
                                .setColor(0x00ff00);
                            
                            await interaction.reply({ embeds: [contextEmbed] });
                        } catch (error) {
                            console.error('Error updating context:', error);
                            await interaction.reply({ 
                                content: 'Error updating context. Please try again.', 
                                ephemeral: true 
                            });
                        }
                        break;
                case 'addlink':
                    const linkType = interaction.options.getString('type');
                    const linkName = interaction.options.getString('name');
                    const linkUrl = interaction.options.getString('url');
                    const linkDesc = interaction.options.getString('description') || '';
                    
                    if (!/^https?:\/\/.+/.test(linkUrl)) {
                        return await interaction.reply({ 
                            content: 'Invalid URL format! Please use http:// or https://', 
                            ephemeral: true 
                        });
                    }
                    
                    let linkConfig = await FaqConfig.findByGuild(guildId);
                    if (!linkConfig) {
                        linkConfig = await FaqConfig.createOrUpdate(guildId, {});
                    }
                    
                    await linkConfig.addLink({
                        type: linkType,
                        name: linkName,
                        url: linkUrl,
                        description: linkDesc
                    });
                    
                    const linkEmbed = new EmbedBuilder()
                        .setTitle('Link Added')
                        .setDescription(`Added **${linkName}** (${linkType})`)
                        .addFields({ name: 'URL', value: linkUrl })
                        .setColor(0x00ff00);
                    
                    await interaction.reply({ embeds: [linkEmbed] });
                    break;

                case 'apikeys':
                    const keysString = interaction.options.getString('keys');
                    const keys = keysString.split(',').map(key => key.trim());
                    
                    const geminiKeys = keys.map(key => ({
                        key,
                        active: true,
                        dailyUsage: 0,
                        lastReset: new Date()
                    }));
                    
                    await FaqConfig.createOrUpdate(guildId, {
                        'apiConfig.geminiKeys': geminiKeys,
                        'apiConfig.currentKeyIndex': 0
                    });
                    
                    const keyEmbed = new EmbedBuilder()
                        .setTitle('API Keys Updated')
                        .setDescription(`Added ${keys.length} Gemini API keys for load balancing`)
                        .setColor(0x00ff00);
                    
                    await interaction.reply({ embeds: [keyEmbed], ephemeral: true });
                    break;

                case 'status':
                    const statusConfig = await FaqConfig.findByGuild(guildId);
                    
                    if (!statusConfig) {
                        return await interaction.reply('FAQ system is not configured for this server.');
                    }
                    
                    const statusEmbed = new EmbedBuilder()
                        .setTitle('FAQ System Status')
                        .addFields(
                            { name: 'Enabled', value: statusConfig.enabled ? '✅ Yes' : '❌ No', inline: true },
                            { name: 'Channels', value: statusConfig.channels, inline: true },
                            { name: 'Language', value: statusConfig.context?.language || 'en', inline: true },
                            { name: 'Context Length', value: `${statusConfig.context?.serverDescription?.length || 0} chars`, inline: true },
                            { name: 'Links', value: `${statusConfig.links?.length || 0} links`, inline: true },
                            { name: 'API Keys', value: `${statusConfig.apiConfig?.geminiKeys?.length || 0} keys`, inline: true },
                            { name: 'Total Queries', value: statusConfig.usage?.totalQueries || 0, inline: true },
                            { name: 'Daily Queries', value: statusConfig.usage?.dailyQueries || 0, inline: true }
                        )
                        .setColor(0x0099ff);
                    
                    await interaction.reply({ embeds: [statusEmbed] });
                    break;
            }
        } catch (error) {
            console.error('Error in FAQ setup:', error);
            await interaction.reply({ 
                content: 'An error occurred while configuring the FAQ system.', 
                ephemeral: true 
            });
        }
    },
};
