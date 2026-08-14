// commands/admin/setup-anti.js
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const AntiConfig = require('../../models/antiSystem/AntiConfig');
const QuarantineConfig = require('../../models/qurantine/quarantineConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-antimodules')
        .setDescription('Configure advanced anti-system protection')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
        
        // Initial Setup
        .addSubcommand(subcommand =>
            subcommand.setName('init')
                .setDescription('Initialize anti-system for this server')
                .addChannelOption(option =>
                    option.setName('log-channel')
                        .setDescription('Channel for anti-system logs')
                        .setRequired(true))
                .addChannelOption(option =>
                    option.setName('alert-channel')
                        .setDescription('Channel for critical alerts')
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('ai-enabled')
                        .setDescription('Enable AI-powered detection')
                        .setRequired(false)))
        
        // General Settings
        .addSubcommand(subcommand =>
            subcommand.setName('general')
                .setDescription('Configure general anti-system settings')
                .addBooleanOption(option =>
                    option.setName('enabled')
                        .setDescription('Enable/disable entire anti-system'))
                .addStringOption(option =>
                    option.setName('ai-sensitivity')
                        .setDescription('AI detection sensitivity')
                        .addChoices(
                            { name: 'Low - Less sensitive', value: 'low' },
                            { name: 'Medium - Balanced', value: 'medium' },
                            { name: 'High - More sensitive', value: 'high' }
                        ))
                .addNumberOption(option =>
                    option.setName('ai-threshold')
                        .setDescription('AI confidence threshold (0.1-1.0)')
                        .setMinValue(0.1)
                        .setMaxValue(1.0))
                .addBooleanOption(option =>
                    option.setName('use-quarantine')
                        .setDescription('Use quarantine system for punishments')))
        
        // Whitelist Management
        .addSubcommandGroup(group =>
            group.setName('whitelist')
                .setDescription('Manage whitelist settings')
                .addSubcommand(subcommand =>
                    subcommand.setName('add')
                        .setDescription('Add to whitelist')
                        .addStringOption(option =>
                            option.setName('type')
                                .setDescription('Type to whitelist')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Member', value: 'member' },
                                    { name: 'Channel', value: 'channel' },
                                    { name: 'Role', value: 'role' }
                                ))
                        .addStringOption(option =>
                            option.setName('id')
                                .setDescription('ID to whitelist')
                                .setRequired(true)))
                .addSubcommand(subcommand =>
                    subcommand.setName('remove')
                        .setDescription('Remove from whitelist')
                        .addStringOption(option =>
                            option.setName('type')
                                .setDescription('Type to remove')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Member', value: 'member' },
                                    { name: 'Channel', value: 'channel' },
                                    { name: 'Role', value: 'role' }
                                ))
                        .addStringOption(option =>
                            option.setName('id')
                                .setDescription('ID to remove')
                                .setRequired(true)))
                .addSubcommand(subcommand =>
                    subcommand.setName('view')
                        .setDescription('View whitelist settings'))
                .addSubcommand(subcommand =>
                    subcommand.setName('toggle-admin-bypass')
                        .setDescription('Toggle admin bypass for whitelisting')))
        
        // Anti-Spam Configuration
        .addSubcommandGroup(group =>
            group.setName('spam')
                .setDescription('Configure anti-spam settings')
                .addSubcommand(subcommand =>
                    subcommand.setName('config')
                        .setDescription('Configure spam detection')
                        .addBooleanOption(option =>
                            option.setName('enabled')
                                .setDescription('Enable anti-spam'))
                        .addIntegerOption(option =>
                            option.setName('message-limit')
                                .setDescription('Max messages in time window')
                                .setMinValue(1)
                                .setMaxValue(20))
                        .addIntegerOption(option =>
                            option.setName('time-window')
                                .setDescription('Time window in seconds')
                                .setMinValue(1)
                                .setMaxValue(60))
                        .addIntegerOption(option =>
                            option.setName('mention-limit')
                                .setDescription('Max mentions per message')
                                .setMinValue(1)
                                .setMaxValue(20))
                        .addIntegerOption(option =>
                            option.setName('emoji-limit')
                                .setDescription('Max emojis per message')
                                .setMinValue(1)
                                .setMaxValue(20))
                        .addIntegerOption(option =>
                            option.setName('duplicate-threshold')
                                .setDescription('Duplicate message threshold')
                                .setMinValue(1)
                                .setMaxValue(10)))
                .addSubcommand(subcommand =>
                    subcommand.setName('caps')
                        .setDescription('Configure caps lock detection')
                        .addBooleanOption(option =>
                            option.setName('enabled')
                                .setDescription('Enable caps punishment'))
                        .addIntegerOption(option =>
                            option.setName('percentage')
                                .setDescription('Caps percentage threshold')
                                .setMinValue(10)
                                .setMaxValue(100)))
                .addSubcommand(subcommand =>
                    subcommand.setName('words')
                        .setDescription('Manage blocked words')
                        .addStringOption(option =>
                            option.setName('action')
                                .setDescription('Action to perform')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Add Words', value: 'add' },
                                    { name: 'Remove Words', value: 'remove' },
                                    { name: 'View List', value: 'view' },
                                    { name: 'Clear All', value: 'clear' }
                                ))
                        .addStringOption(option =>
                            option.setName('words')
                                .setDescription('Comma-separated words (for add/remove)')))
                .addSubcommand(subcommand =>
                    subcommand.setName('channels')
                        .setDescription('Manage spam whitelist channels')
                        .addStringOption(option =>
                            option.setName('action')
                                .setDescription('Action to perform')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Add Channel', value: 'add' },
                                    { name: 'Remove Channel', value: 'remove' },
                                    { name: 'View List', value: 'view' },
                                    { name: 'Clear All', value: 'clear' }
                                ))
                        .addChannelOption(option =>
                            option.setName('channel')
                                .setDescription('Channel to add/remove'))))
        
        // Anti-Link Configuration
        .addSubcommandGroup(group =>
            group.setName('link')
                .setDescription('Configure anti-link settings')
                .addSubcommand(subcommand =>
                    subcommand.setName('config')
                        .setDescription('Configure link detection')
                        .addBooleanOption(option =>
                            option.setName('enabled')
                                .setDescription('Enable anti-link'))
                        .addStringOption(option =>
                            option.setName('mode')
                                .setDescription('Detection mode')
                                .addChoices(
                                    { name: 'Strict - Block all links', value: 'strict' },
                                    { name: 'Moderate - Block suspicious', value: 'moderate' },
                                    { name: 'Custom - Use whitelist', value: 'custom' }
                                ))
                        .addBooleanOption(option =>
                            option.setName('shortener-protection')
                                .setDescription('Block URL shorteners'))
                        .addBooleanOption(option =>
                            option.setName('ip-protection')
                                .setDescription('Block IP-based links')))
                .addSubcommand(subcommand =>
                    subcommand.setName('domains')
                        .setDescription('Manage allowed/blocked domains')
                        .addStringOption(option =>
                            option.setName('type')
                                .setDescription('Domain list type')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Allowed Domains', value: 'allowed' },
                                    { name: 'Blocked Domains', value: 'blocked' }
                                ))
                        .addStringOption(option =>
                            option.setName('action')
                                .setDescription('Action to perform')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Add Domains', value: 'add' },
                                    { name: 'Remove Domains', value: 'remove' },
                                    { name: 'View List', value: 'view' },
                                    { name: 'Clear All', value: 'clear' }
                                ))
                        .addStringOption(option =>
                            option.setName('domains')
                                .setDescription('Comma-separated domains (for add/remove)')))
                .addSubcommand(subcommand =>
                    subcommand.setName('channels')
                        .setDescription('Manage link whitelist channels')
                        .addStringOption(option =>
                            option.setName('action')
                                .setDescription('Action to perform')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Add Channel', value: 'add' },
                                    { name: 'Remove Channel', value: 'remove' },
                                    { name: 'View List', value: 'view' },
                                    { name: 'Clear All', value: 'clear' }
                                ))
                        .addChannelOption(option =>
                            option.setName('channel')
                                .setDescription('Channel to add/remove'))))
        
        // Anti-Nuke Configuration
        .addSubcommandGroup(group =>
            group.setName('nuke')
                .setDescription('Configure anti-nuke settings')
                .addSubcommand(subcommand =>
                    subcommand.setName('config')
                        .setDescription('Configure nuke protection')
                        .addBooleanOption(option =>
                            option.setName('enabled')
                                .setDescription('Enable anti-nuke'))
                        .addIntegerOption(option =>
                            option.setName('channel-delete-limit')
                                .setDescription('Max channel deletions allowed')
                                .setMinValue(1)
                                .setMaxValue(5))
                        .addIntegerOption(option =>
                            option.setName('channel-create-limit')
                                .setDescription('Max channel creations allowed')
                                .setMinValue(1)
                                .setMaxValue(10))
                        .addIntegerOption(option =>
                            option.setName('role-delete-limit')
                                .setDescription('Max role deletions allowed')
                                .setMinValue(1)
                                .setMaxValue(5))
                        .addIntegerOption(option =>
                            option.setName('role-create-limit')
                                .setDescription('Max role creations allowed')
                                .setMinValue(1)
                                .setMaxValue(10))
                        .addIntegerOption(option =>
                            option.setName('member-kick-limit')
                                .setDescription('Max member kicks allowed')
                                .setMinValue(1)
                                .setMaxValue(5))
                        .addIntegerOption(option =>
                            option.setName('member-ban-limit')
                                .setDescription('Max member bans allowed')
                                .setMinValue(1)
                                .setMaxValue(5))
                        .addIntegerOption(option =>
                            option.setName('time-window')
                                .setDescription('Time window in seconds')
                                .setMinValue(5)
                                .setMaxValue(60))
                        .addBooleanOption(option =>
                            option.setName('lockdown-on-detection')
                                .setDescription('Lock server on nuke detection'))))
        
        // Anti-Raid Configuration
        .addSubcommandGroup(group =>
            group.setName('raid')
                .setDescription('Configure anti-raid settings')
                .addSubcommand(subcommand =>
                    subcommand.setName('config')
                        .setDescription('Configure raid protection')
                        .addBooleanOption(option =>
                            option.setName('enabled')
                                .setDescription('Enable anti-raid'))
                        .addIntegerOption(option =>
                            option.setName('join-limit')
                                .setDescription('Max joins in time window')
                                .setMinValue(1)
                                .setMaxValue(20))
                        .addIntegerOption(option =>
                            option.setName('time-window')
                                .setDescription('Time window in seconds')
                                .setMinValue(10)
                                .setMaxValue(300))
                        .addBooleanOption(option =>
                            option.setName('account-age-check')
                                .setDescription('Check account age'))
                        .addIntegerOption(option =>
                            option.setName('min-account-age')
                                .setDescription('Minimum account age in days')
                                .setMinValue(1)
                                .setMaxValue(365))
                        .addBooleanOption(option =>
                            option.setName('avatar-check')
                                .setDescription('Check for default avatars'))
                        .addIntegerOption(option =>
                            option.setName('lockdown-duration')
                                .setDescription('Lockdown duration in minutes')
                                .setMinValue(1)
                                .setMaxValue(60))
                        .addStringOption(option =>
                            option.setName('action')
                                .setDescription('Action for raiders')
                                .addChoices(
                                    { name: 'Kick', value: 'kick' },
                                    { name: 'Ban', value: 'ban' },
                                    { name: 'Quarantine', value: 'quarantine' }
                                ))))
        
        // Status and Info
        .addSubcommand(subcommand =>
            subcommand.setName('status')
                .setDescription('View anti-system status and configuration'))
        
        .addSubcommand(subcommand =>
            subcommand.setName('reset')
                .setDescription('Reset anti-system to default settings')
                .addBooleanOption(option =>
                    option.setName('confirm')
                        .setDescription('Confirm reset (required)')
                        .setRequired(true))),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        const guildId = interaction.guild.id;
        const subcommandGroup = interaction.options.getSubcommandGroup();
        const subcommand = interaction.options.getSubcommand();
        
        try {
            let config = await AntiConfig.findOne({ guildId }) || new AntiConfig({ guildId });
            
            // ========== INITIAL SETUP ==========
            if (subcommand === 'init') {
                const logChannel = interaction.options.getChannel('log-channel');
                const alertChannel = interaction.options.getChannel('alert-channel');
                const aiEnabled = interaction.options.getBoolean('ai-enabled') ?? true;
                
                // Validate channels
                if (!logChannel.isTextBased()) {
                    return interaction.editReply({ content: '❌ Log channel must be a text channel.' });
                }
                
                const guild = interaction.guild;
                const owner = await guild.fetchOwner();
                
                config.logChannelId = logChannel.id;
                config.alertChannelId = alertChannel?.id || logChannel.id;
                config.aiEnabled = aiEnabled;
                config.whitelist.owners = [owner.id];
                config.enabled = true;
                
                await config.save();
                
                const quarantineConfig = await QuarantineConfig.findOne({ guildId });
                
                const embed = new EmbedBuilder()
                    .setTitle('🛡️ Advanced Anti-System Initialized')
                    .setColor('#00ff00')
                    .addFields(
                        { name: 'Log Channel', value: `<#${logChannel.id}>`, inline: true },
                        { name: 'Alert Channel', value: `<#${alertChannel?.id || logChannel.id}>`, inline: true },
                        { name: 'AI Detection', value: aiEnabled ? '✅ Enabled' : '❌ Disabled', inline: true },
                        { name: 'Quarantine Integration', value: quarantineConfig ? '✅ Available' : '⚠️ Setup quarantine system for full protection', inline: false },
                        { name: 'Active Modules', value: '🛡️ Anti-Spam\n🔗 Anti-Link\n💣 Anti-Nuke\n🚫 Anti-Raid', inline: true },
                        { name: 'Protection Level', value: '🔥 **MAXIMUM**', inline: true }
                    )
                    .setDescription('**Advanced anti-system is now active!** All modules are enabled with intelligent defaults. Use `/setup-anti status` to view full configuration.')
                    .setTimestamp();
                
                return interaction.editReply({ embeds: [embed] });
            }
            
            // ========== GENERAL SETTINGS ==========
            if (subcommand === 'general') {
                const enabled = interaction.options.getBoolean('enabled');
                const aiSensitivity = interaction.options.getString('ai-sensitivity');
                const aiThreshold = interaction.options.getNumber('ai-threshold');
                const useQuarantine = interaction.options.getBoolean('use-quarantine');
                
                if (enabled !== null) config.enabled = enabled;
                if (aiSensitivity) config.aiSensitivity = aiSensitivity;
                if (aiThreshold) config.aiConfidenceThreshold = aiThreshold;
                if (useQuarantine !== null) config.punishmentSystem.useQuarantine = useQuarantine;
                
                await config.save();
                
                const embed = new EmbedBuilder()
                    .setTitle('🛡️ General Settings Updated')
                    .setColor('#00ff00')
                    .addFields(
                        { name: 'System Status', value: config.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
                        { name: 'AI Sensitivity', value: config.aiSensitivity.toUpperCase(), inline: true },
                        { name: 'AI Threshold', value: config.aiConfidenceThreshold.toString(), inline: true },
                        { name: 'Use Quarantine', value: config.punishmentSystem.useQuarantine ? '✅ Yes' : '❌ No', inline: true }
                    );
                
                return interaction.editReply({ embeds: [embed] });
            }
            
            // ========== WHITELIST MANAGEMENT ==========
            if (subcommandGroup === 'whitelist') {
                if (subcommand === 'add') {
                    const type = interaction.options.getString('type');
                    const id = interaction.options.getString('id');
                    
                    // Validate ID format
                    if (!/^\d{17,19}$/.test(id)) {
                        return interaction.editReply({ content: '❌ Invalid ID format. Please provide a valid Discord ID.' });
                    }
                    
                    let added = false;
                    if (type === 'member') {
                        if (!config.whitelist.customMembers.includes(id)) {
                            config.whitelist.customMembers.push(id);
                            added = true;
                        }
                    } else if (type === 'channel') {
                        if (!config.whitelist.customChannels.includes(id)) {
                            config.whitelist.customChannels.push(id);
                            added = true;
                        }
                    } else if (type === 'role') {
                        if (!config.whitelist.customRoles.includes(id)) {
                            config.whitelist.customRoles.push(id);
                            added = true;
                        }
                    }
                    
                    if (!added) {
                        return interaction.editReply({ content: `⚠️ ${type.charAt(0).toUpperCase() + type.slice(1)} \`${id}\` is already whitelisted.` });
                    }
                    
                    await config.save();
                    return interaction.editReply({ content: `✅ Added ${type} to whitelist: \`${id}\`` });
                }
                
                if (subcommand === 'remove') {
                    const type = interaction.options.getString('type');
                    const id = interaction.options.getString('id');
                    
                    let removed = false;
                    if (type === 'member') {
                        const originalLength = config.whitelist.customMembers.length;
                        config.whitelist.customMembers = config.whitelist.customMembers.filter(m => m !== id);
                        removed = config.whitelist.customMembers.length < originalLength;
                    } else if (type === 'channel') {
                        const originalLength = config.whitelist.customChannels.length;
                        config.whitelist.customChannels = config.whitelist.customChannels.filter(c => c !== id);
                        removed = config.whitelist.customChannels.length < originalLength;
                    } else if (type === 'role') {
                        const originalLength = config.whitelist.customRoles.length;
                        config.whitelist.customRoles = config.whitelist.customRoles.filter(r => r !== id);
                        removed = config.whitelist.customRoles.length < originalLength;
                    }
                    
                    if (!removed) {
                        return interaction.editReply({ content: `⚠️ ${type.charAt(0).toUpperCase() + type.slice(1)} \`${id}\` was not found in whitelist.` });
                    }
                    
                    await config.save();
                    return interaction.editReply({ content: `✅ Removed ${type} from whitelist: \`${id}\`` });
                }
                
                if (subcommand === 'view') {
                    const embed = new EmbedBuilder()
                        .setTitle('🛡️ Whitelist Settings')
                        .setColor('#0099ff')
                        .addFields(
                            { name: 'Owners', value: config.whitelist.owners.map(id => `<@${id}>`).join('\n') || 'None', inline: true },
                            { name: 'Custom Members', value: config.whitelist.customMembers.map(id => `<@${id}>`).join('\n') || 'None', inline: true },
                            { name: 'Custom Channels', value: config.whitelist.customChannels.map(id => `<#${id}>`).join('\n') || 'None', inline: true },
                            { name: 'Custom Roles', value: config.whitelist.customRoles.map(id => `<@&${id}>`).join('\n') || 'None', inline: true },
                            { name: 'Bypass Admins', value: config.whitelist.bypassAdmins ? '✅ Yes' : '❌ No', inline: true }
                        )
                        .setFooter({ text: 'Use /setup-anti whitelist add/remove to modify lists' });
                    
                    return interaction.editReply({ embeds: [embed] });
                }
                
                if (subcommand === 'toggle-admin-bypass') {
                    config.whitelist.bypassAdmins = !config.whitelist.bypassAdmins;
                    await config.save();
                    
                    return interaction.editReply({ 
                        content: `✅ Admin bypass is now **${config.whitelist.bypassAdmins ? 'ENABLED' : 'DISABLED'}**` 
                    });
                }
            }
            
            // ========== ANTI-SPAM CONFIGURATION ==========
            if (subcommandGroup === 'spam') {
                if (subcommand === 'config') {
                    const enabled = interaction.options.getBoolean('enabled');
                    const messageLimit = interaction.options.getInteger('message-limit');
                    const timeWindow = interaction.options.getInteger('time-window');
                    const mentionLimit = interaction.options.getInteger('mention-limit');
                    const emojiLimit = interaction.options.getInteger('emoji-limit');
                    const duplicateThreshold = interaction.options.getInteger('duplicate-threshold');
                    
                    if (enabled !== null) config.antiSpam.enabled = enabled;
                    if (messageLimit !== null) config.antiSpam.messageLimit = messageLimit;
                    if (timeWindow !== null) config.antiSpam.timeWindow = timeWindow * 1000;
                    if (mentionLimit !== null) config.antiSpam.mentionLimit = mentionLimit;
                    if (emojiLimit !== null) config.antiSpam.emojiLimit = emojiLimit;
                    if (duplicateThreshold !== null) config.antiSpam.duplicateThreshold = duplicateThreshold;
                    
                    await config.save();
                    
                    const embed = new EmbedBuilder()
                        .setTitle('🛡️ Anti-Spam Configuration Updated')
                        .setColor('#00ff00')
                        .addFields(
                            { name: 'Status', value: config.antiSpam.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
                            { name: 'Message Limit', value: config.antiSpam.messageLimit.toString(), inline: true },
                            { name: 'Time Window', value: `${config.antiSpam.timeWindow / 1000}s`, inline: true },
                            { name: 'Mention Limit', value: config.antiSpam.mentionLimit.toString(), inline: true },
                            { name: 'Emoji Limit', value: config.antiSpam.emojiLimit.toString(), inline: true },
                            { name: 'Duplicate Threshold', value: config.antiSpam.duplicateThreshold.toString(), inline: true }
                        );
                    
                    return interaction.editReply({ embeds: [embed] });
                }
                
                if (subcommand === 'caps') {
                    const enabled = interaction.options.getBoolean('enabled');
                    const percentage = interaction.options.getInteger('percentage');
                    
                    if (enabled !== null) config.antiSpam.capsPunishment = enabled;
                    if (percentage !== null) config.antiSpam.capsPercentage = percentage;
                    
                    await config.save();
                    
                    const embed = new EmbedBuilder()
                        .setTitle('🛡️ Caps Lock Settings Updated')
                        .setColor('#00ff00')
                        .addFields(
                            { name: 'Caps Detection', value: config.antiSpam.capsPunishment ? '✅ Enabled' : '❌ Disabled', inline: true },
                            { name: 'Threshold', value: `${config.antiSpam.capsPercentage}%`, inline: true }
                        );
                    
                    return interaction.editReply({ embeds: [embed] });
                }
                
                if (subcommand === 'words') {
                    const action = interaction.options.getString('action');
                    const wordsInput = interaction.options.getString('words');
                    
                    switch (action) {
                        case 'add':
                            if (!wordsInput) {
                                return interaction.editReply({ content: '❌ Please provide words to add.' });
                            }
                            const wordsToAdd = wordsInput.split(',').map(w => w.trim()).filter(w => w.length > 0);
                            const newWords = wordsToAdd.filter(word => !config.antiSpam.blockedWords.includes(word));
                            config.antiSpam.blockedWords.push(...newWords);
                            await config.save();
                            return interaction.editReply({ 
                                content: `✅ Added ${newWords.length} new blocked words. Total: ${config.antiSpam.blockedWords.length}` 
                            });
                            
                        case 'remove':
                            if (!wordsInput) {
                                return interaction.editReply({ content: '❌ Please provide words to remove.' });
                            }
                            const wordsToRemove = wordsInput.split(',').map(w => w.trim());
                            const originalCount = config.antiSpam.blockedWords.length;
                            config.antiSpam.blockedWords = config.antiSpam.blockedWords.filter(
                                word => !wordsToRemove.includes(word)
                            );
                            const removedCount = originalCount - config.antiSpam.blockedWords.length;
                            await config.save();
                            return interaction.editReply({ 
                                content: `✅ Removed ${removedCount} blocked words. Total: ${config.antiSpam.blockedWords.length}` 
                            });
                            
                        case 'view':
                            const wordList = config.antiSpam.blockedWords.join(', ') || 'None';
                            const embed = new EmbedBuilder()
                                .setTitle('🛡️ Blocked Words List')
                                .setColor('#0099ff')
                                .setDescription(wordList.length > 2000 ? wordList.slice(0, 2000) + '...' : wordList)
                                .addFields({ name: 'Total Words', value: config.antiSpam.blockedWords.length.toString(), inline: true });
                            return interaction.editReply({ embeds: [embed] });
                            
                        case 'clear':
                            const count = config.antiSpam.blockedWords.length;
                            config.antiSpam.blockedWords = [];
                            await config.save();
                            return interaction.editReply({ content: `✅ Cleared ${count} blocked words.` });
                    }
                }
                
                if (subcommand === 'channels') {
                    return await this.handleChannelManagement(interaction, config, 'antiSpam', 'whitelistedChannels');
                }
            }
            
            // ========== ANTI-LINK CONFIGURATION ==========
            if (subcommandGroup === 'link') {
                if (subcommand === 'config') {
                    const enabled = interaction.options.getBoolean('enabled');
                    const mode = interaction.options.getString('mode');
                    const shortenerProtection = interaction.options.getBoolean('shortener-protection');
                    const ipProtection = interaction.options.getBoolean('ip-protection');
                    
                    if (enabled !== null) config.antiLink.enabled = enabled;
                    if (mode) config.antiLink.mode = mode;
                    if (shortenerProtection !== null) config.antiLink.shortenerProtection = shortenerProtection;
                    if (ipProtection !== null) config.antiLink.ipLinkProtection = ipProtection;
                    
                    await config.save();
                    
                    const embed = new EmbedBuilder()
                        .setTitle('🛡️ Anti-Link Configuration Updated')
                        .setColor('#00ff00')
                        .addFields(
                            { name: 'Status', value: config.antiLink.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
                            { name: 'Detection Mode', value: config.antiLink.mode.toUpperCase(), inline: true },
                            { name: 'Shortener Protection', value: config.antiLink.shortenerProtection ? '✅ On' : '❌ Off', inline: true },
                            { name: 'IP Link Protection', value: config.antiLink.ipLinkProtection ? '✅ On' : '❌ Off', inline: true },
                            { name: 'Allowed Domains', value: config.antiLink.allowedDomains.length.toString(), inline: true },
                            { name: 'Blocked Domains', value: config.antiLink.blockedDomains.length.toString(), inline: true }
                        );
                    
                    return interaction.editReply({ embeds: [embed] });
                }
                
                if (subcommand === 'domains') {
                    const type = interaction.options.getString('type'); // 'allowed' or 'blocked'
                    const action = interaction.options.getString('action');
                    const domainsInput = interaction.options.getString('domains');
                    
                    const domainArray = type === 'allowed' ? config.antiLink.allowedDomains : config.antiLink.blockedDomains;
                    
                    switch (action) {
                        case 'add':
                            if (!domainsInput) {
                                return interaction.editReply({ content: '❌ Please provide domains to add.' });
                            }
                            const domainsToAdd = domainsInput.split(',').map(d => d.trim().toLowerCase()).filter(d => d.length > 0);
                            const newDomains = domainsToAdd.filter(domain => !domainArray.includes(domain));
                            domainArray.push(...newDomains);
                            await config.save();
                            return interaction.editReply({ 
                                content: `✅ Added ${newDomains.length} new ${type} domains. Total: ${domainArray.length}` 
                            });
                            
                        case 'remove':
                            if (!domainsInput) {
                                return interaction.editReply({ content: '❌ Please provide domains to remove.' });
                            }
                            const domainsToRemove = domainsInput.split(',').map(d => d.trim().toLowerCase());
                            const originalCount = domainArray.length;
                            if (type === 'allowed') {
                                config.antiLink.allowedDomains = config.antiLink.allowedDomains.filter(
                                    domain => !domainsToRemove.includes(domain)
                                );
                            } else {
                                config.antiLink.blockedDomains = config.antiLink.blockedDomains.filter(
                                    domain => !domainsToRemove.includes(domain)
                                );
                            }
                            const removedCount = originalCount - domainArray.length;
                            await config.save();
                            return interaction.editReply({ 
                                content: `✅ Removed ${removedCount} ${type} domains. Total: ${domainArray.length}` 
                            });
                            
                        case 'view':
                            const domainList = domainArray.join(', ') || 'None';
                            const embed = new EmbedBuilder()
                                .setTitle(`🛡️ ${type.charAt(0).toUpperCase() + type.slice(1)} Domains List`)
                                .setColor('#0099ff')
                                .setDescription(domainList.length > 2000 ? domainList.slice(0, 2000) + '...' : domainList)
                                .addFields({ name: 'Total Domains', value: domainArray.length.toString(), inline: true });
                            return interaction.editReply({ embeds: [embed] });
                            
                        case 'clear':
                            const count = domainArray.length;
                            if (type === 'allowed') {
                                config.antiLink.allowedDomains = [];
                            } else {
                                config.antiLink.blockedDomains = [];
                            }
                            await config.save();
                            return interaction.editReply({ content: `✅ Cleared ${count} ${type} domains.` });
                    }
                }
                
                if (subcommand === 'channels') {
                    return await this.handleChannelManagement(interaction, config, 'antiLink', 'whitelistedChannels');
                }
            }
            
            // ========== ANTI-NUKE CONFIGURATION ==========
            if (subcommandGroup === 'nuke' && subcommand === 'config') {
                const enabled = interaction.options.getBoolean('enabled');
                const channelDeleteLimit = interaction.options.getInteger('channel-delete-limit');
                const channelCreateLimit = interaction.options.getInteger('channel-create-limit');
                const roleDeleteLimit = interaction.options.getInteger('role-delete-limit');
                const roleCreateLimit = interaction.options.getInteger('role-create-limit');
                const memberKickLimit = interaction.options.getInteger('member-kick-limit');
                const memberBanLimit = interaction.options.getInteger('member-ban-limit');
                const timeWindow = interaction.options.getInteger('time-window');
                const lockdownOnDetection = interaction.options.getBoolean('lockdown-on-detection');
                
                if (enabled !== null) config.antiNuke.enabled = enabled;
                if (channelDeleteLimit !== null) config.antiNuke.channelDeleteLimit = channelDeleteLimit;
                if (channelCreateLimit !== null) config.antiNuke.channelCreateLimit = channelCreateLimit;
                if (roleDeleteLimit !== null) config.antiNuke.roleDeleteLimit = roleDeleteLimit;
                if (roleCreateLimit !== null) config.antiNuke.roleCreateLimit = roleCreateLimit;
                if (memberKickLimit !== null) config.antiNuke.memberKickLimit = memberKickLimit;
                if (memberBanLimit !== null) config.antiNuke.memberBanLimit = memberBanLimit;
                if (timeWindow !== null) config.antiNuke.timeWindow = timeWindow * 1000;
                if (lockdownOnDetection !== null) config.antiNuke.lockdownOnDetection = lockdownOnDetection;
                
                await config.save();
                
                const embed = new EmbedBuilder()
                    .setTitle('🛡️ Anti-Nuke Configuration Updated')
                    .setColor('#00ff00')
                    .addFields(
                        { name: 'Status', value: config.antiNuke.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
                        { name: 'Channel Delete Limit', value: config.antiNuke.channelDeleteLimit.toString(), inline: true },
                        { name: 'Channel Create Limit', value: config.antiNuke.channelCreateLimit.toString(), inline: true },
                        { name: 'Role Delete Limit', value: config.antiNuke.roleDeleteLimit.toString(), inline: true },
                        { name: 'Role Create Limit', value: config.antiNuke.roleCreateLimit.toString(), inline: true },
                        { name: 'Member Ban Limit', value: config.antiNuke.memberBanLimit.toString(), inline: true },
                        { name: 'Time Window', value: `${config.antiNuke.timeWindow / 1000}s`, inline: true },
                        { name: 'Auto Lockdown', value: config.antiNuke.lockdownOnDetection ? '✅ On' : '❌ Off', inline: true }
                    );
                
                return interaction.editReply({ embeds: [embed] });
            }
            
            // ========== ANTI-RAID CONFIGURATION ==========
            if (subcommandGroup === 'raid' && subcommand === 'config') {
                const enabled = interaction.options.getBoolean('enabled');
                const joinLimit = interaction.options.getInteger('join-limit');
                const timeWindow = interaction.options.getInteger('time-window');
                const accountAgeCheck = interaction.options.getBoolean('account-age-check');
                const minAccountAge = interaction.options.getInteger('min-account-age');
                const avatarCheck = interaction.options.getBoolean('avatar-check');
                const lockdownDuration = interaction.options.getInteger('lockdown-duration');
                const action = interaction.options.getString('action');
                
                if (enabled !== null) config.antiRaid.enabled = enabled;
                if (joinLimit !== null) config.antiRaid.joinLimit = joinLimit;
                if (timeWindow !== null) config.antiRaid.timeWindow = timeWindow * 1000;
                if (accountAgeCheck !== null) config.antiRaid.accountAgeCheck = accountAgeCheck;
                if (minAccountAge !== null) config.antiRaid.minAccountAge = minAccountAge * 24 * 60 * 60 * 1000; // Convert days to ms
                if (avatarCheck !== null) config.antiRaid.avatarCheck = avatarCheck;
                if (lockdownDuration !== null) config.antiRaid.lockdownDuration = lockdownDuration * 60 * 1000; // Convert minutes to ms
                if (action) config.antiRaid.action = action;
                
                await config.save();
                
                const embed = new EmbedBuilder()
                    .setTitle('🛡️ Anti-Raid Configuration Updated')
                    .setColor('#00ff00')
                    .addFields(
                        { name: 'Status', value: config.antiRaid.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
                        { name: 'Join Limit', value: config.antiRaid.joinLimit.toString(), inline: true },
                        { name: 'Time Window', value: `${config.antiRaid.timeWindow / 1000}s`, inline: true },
                        { name: 'Account Age Check', value: config.antiRaid.accountAgeCheck ? '✅ On' : '❌ Off', inline: true },
                        { name: 'Min Account Age', value: `${config.antiRaid.minAccountAge / (24 * 60 * 60 * 1000)} days`, inline: true },
                        { name: 'Avatar Check', value: config.antiRaid.avatarCheck ? '✅ On' : '❌ Off', inline: true },
                        { name: 'Lockdown Duration', value: `${config.antiRaid.lockdownDuration / (60 * 1000)} min`, inline: true },
                        { name: 'Action', value: config.antiRaid.action.toUpperCase(), inline: true }
                    );
                
                return interaction.editReply({ embeds: [embed] });
            }
            
            // ========== STATUS COMMAND ==========
            if (subcommand === 'status') {
                const quarantineConfig = await QuarantineConfig.findOne({ guildId });
                
                const embed = new EmbedBuilder()
                    .setTitle('🛡️ Anti-System Status Dashboard')
                    .setColor(config.enabled ? '#00ff00' : '#ff0000')
                    .setDescription(config.enabled ? '🟢 **SYSTEM ACTIVE** - Full protection enabled' : '🔴 **SYSTEM DISABLED**')
                    .addFields(
                        { name: '🛡️ Anti-Spam', value: config.antiSpam.enabled ? '✅ Active' : '❌ Disabled', inline: true },
                        { name: '🔗 Anti-Link', value: config.antiLink.enabled ? '✅ Active' : '❌ Disabled', inline: true },
                        { name: '💣 Anti-Nuke', value: config.antiNuke.enabled ? '✅ Active' : '❌ Disabled', inline: true },
                        { name: '🚫 Anti-Raid', value: config.antiRaid.enabled ? '✅ Active' : '❌ Disabled', inline: true },
                        { name: '🤖 AI Detection', value: config.aiEnabled ? `✅ ${config.aiSensitivity.toUpperCase()}` : '❌ Disabled', inline: true },
                        { name: '🏺 Quarantine', value: quarantineConfig?.quarantineEnabled ? '✅ Integrated' : '⚠️ Not Setup', inline: true },
                        { name: '📊 Log Channel', value: `<#${config.logChannelId}>`, inline: true },
                        { name: '🚨 Alert Channel', value: `<#${config.alertChannelId}>`, inline: true },
                        { name: '🛡️ Whitelist Count', value: `${config.whitelist.customMembers.length + config.whitelist.customChannels.length + config.whitelist.customRoles.length}`, inline: true }
                    )
                    .setTimestamp();
                
                return interaction.editReply({ embeds: [embed] });
            }
            
            // ========== RESET COMMAND ==========
            if (subcommand === 'reset') {
                const confirm = interaction.options.getBoolean('confirm');
                
                if (!confirm) {
                    return interaction.editReply({ content: '❌ You must confirm the reset by setting confirm to `true`.' });
                }
                
                // Reset to defaults but keep log channels and owners
                const logChannelId = config.logChannelId;
                const alertChannelId = config.alertChannelId;
                const owners = config.whitelist.owners;
                
                await AntiConfig.deleteOne({ guildId });
                
                const newConfig = new AntiConfig({ 
                    guildId,
                    logChannelId,
                    alertChannelId,
                    whitelist: { owners }
                });
                
                await newConfig.save();
                
                return interaction.editReply({ 
                    content: '✅ **Anti-system has been reset to default settings.** All modules are re-enabled with smart defaults.' 
                });
            }
            
        } catch (error) {
            console.error('Setup command error:', error);
            return interaction.editReply({ content: '❌ An error occurred while updating the configuration. Please try again.' });
        }
    },

    // Helper method for channel management
    async handleChannelManagement(interaction, config, module, field) {
        const action = interaction.options.getString('action');
        const channel = interaction.options.getChannel('channel');
        
        const channelArray = config[module][field];
        
        switch (action) {
            case 'add':
                if (!channel) {
                    return interaction.editReply({ content: '❌ Please provide a channel to add.' });
                }
                if (!channelArray.includes(channel.id)) {
                    channelArray.push(channel.id);
                    await config.save();
                    return interaction.editReply({ content: `✅ Added <#${channel.id}> to whitelist.` });
                } else {
                    return interaction.editReply({ content: '⚠️ Channel is already whitelisted.' });
                }
                
            case 'remove':
                if (!channel) {
                    return interaction.editReply({ content: '❌ Please provide a channel to remove.' });
                }
                const index = channelArray.indexOf(channel.id);
                if (index > -1) {
                    channelArray.splice(index, 1);
                    await config.save();
                    return interaction.editReply({ content: `✅ Removed <#${channel.id}> from whitelist.` });
                } else {
                    return interaction.editReply({ content: '⚠️ Channel was not found in whitelist.' });
                }
                
            case 'view':
                const channelList = channelArray.map(id => `<#${id}>`).join('\n') || 'None';
                const embed = new EmbedBuilder()
                    .setTitle('🛡️ Whitelisted Channels')
                    .setColor('#0099ff')
                    .setDescription(channelList)
                    .addFields({ name: 'Total Channels', value: channelArray.length.toString(), inline: true });
                return interaction.editReply({ embeds: [embed] });
                
            case 'clear':
                const count = channelArray.length;
                channelArray.length = 0;
                await config.save();
                return interaction.editReply({ content: `✅ Cleared ${count} whitelisted channels.` });
        }
    }
};
