// commands/leveling/setup.js
const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    ChannelType,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags
} = require('discord.js');
const GuildLevel = require('../../models/leveling/guildLevelSchema');
const checkPermissions = require('../../utils/checkPermissions');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-leveling')
        .setDescription('Complete leveling system management')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommandGroup(group =>
            group.setName('setup')
                .setDescription('Initial setup and basic configuration')
                .addSubcommand(sub =>
                    sub.setName('enable')
                        .setDescription('Enable the leveling system')
                        .addChannelOption(option =>
                            option.setName('log_channel')
                                .setDescription('Channel for level up notifications')
                                .addChannelTypes(ChannelType.GuildText)
                                .setRequired(false))
                        .addStringOption(option =>
                            option.setName('level_message')
                                .setDescription('Custom level up message (use {user}, {level}, {xp})')
                                .setMaxLength(500)
                                .setRequired(false)))
                .addSubcommand(sub =>
                    sub.setName('disable')
                        .setDescription('Disable the leveling system'))
                .addSubcommand(sub =>
                    sub.setName('quick')
                        .setDescription('Quick setup with recommended settings')
                        .addChannelOption(option =>
                            option.setName('log_channel')
                                .setDescription('Channel for level up notifications')
                                .addChannelTypes(ChannelType.GuildText)
                                .setRequired(true)))
        )
        .addSubcommandGroup(group =>
            group.setName('config')
                .setDescription('Advanced configuration options')
                .addSubcommand(sub =>
                    sub.setName('xp')
                        .setDescription('Configure XP settings')
                        .addIntegerOption(option =>
                            option.setName('min_xp')
                                .setDescription('Minimum XP per message (1-50)')
                                .setMinValue(1)
                                .setMaxValue(50))
                        .addIntegerOption(option =>
                            option.setName('max_xp')
                                .setDescription('Maximum XP per message (1-100)')
                                .setMinValue(1)
                                .setMaxValue(100))
                        .addIntegerOption(option =>
                            option.setName('cooldown')
                                .setDescription('XP cooldown in seconds (5-300)')
                                .setMinValue(5)
                                .setMaxValue(300)))
                .addSubcommand(sub =>
                    sub.setName('multipliers')
                        .setDescription('Set XP multipliers')
                        .addNumberOption(option =>
                            option.setName('text')
                                .setDescription('Text message multiplier (0.1-5.0)')
                                .setMinValue(0.1)
                                .setMaxValue(5.0))
                        .addNumberOption(option =>
                            option.setName('voice')
                                .setDescription('Voice activity multiplier (0.1-5.0)')
                                .setMinValue(0.1)
                                .setMaxValue(5.0))
                        .addNumberOption(option =>
                            option.setName('weekend')
                                .setDescription('Weekend bonus multiplier (0.1-5.0)')
                                .setMinValue(0.1)
                                .setMaxValue(5.0))
                        .addNumberOption(option =>
                            option.setName('boost')
                                .setDescription('Server boost multiplier (0.1-5.0)')
                                .setMinValue(0.1)
                                .setMaxValue(5.0)))
                .addSubcommand(sub =>
                    sub.setName('voice')
                        .setDescription('Configure voice XP settings')
                        .addBooleanOption(option =>
                            option.setName('enabled')
                                .setDescription('Enable voice XP')
                                .setRequired(true))
                        .addNumberOption(option =>
                            option.setName('xp_per_minute')
                                .setDescription('XP per minute in voice (0.1-10)')
                                .setMinValue(0.1)
                                .setMaxValue(10))
                        .addBooleanOption(option =>
                            option.setName('solo_xp')
                                .setDescription('Award XP when alone in channel'))
                        .addBooleanOption(option =>
                            option.setName('afk_xp')
                                .setDescription('Award XP in AFK channel')))
                .addSubcommand(sub =>
                    sub.setName('restrictions')
                        .setDescription('Set channel and role restrictions')
                        .addStringOption(option =>
                            option.setName('action')
                                .setDescription('Restriction action')
                                .addChoices(
                                    { name: 'Add Ignored Channel', value: 'ignore_channel' },
                                    { name: 'Remove Ignored Channel', value: 'unignore_channel' },
                                    { name: 'Add Ignored Role', value: 'ignore_role' },
                                    { name: 'Remove Ignored Role', value: 'unignore_role' },
                                    { name: 'Set Allowed Channels Only', value: 'allow_channels' },
                                    { name: 'Clear Restrictions', value: 'clear' }
                                )
                                .setRequired(true))
                        .addChannelOption(option =>
                            option.setName('channel')
                                .setDescription('Channel for restriction'))
                        .addRoleOption(option =>
                            option.setName('role')
                                .setDescription('Role for restriction')))
        )
        .addSubcommandGroup(group =>
            group.setName('roles')
                .setDescription('Level role management')
                .addSubcommand(sub =>
                    sub.setName('add')
                        .setDescription('Add a level role reward')
                        .addIntegerOption(option =>
                            option.setName('level')
                                .setDescription('Level requirement (1-1000)')
                                .setRequired(true)
                                .setMinValue(1)
                                .setMaxValue(1000))
                        .addRoleOption(option =>
                            option.setName('role')
                                .setDescription('Role to assign')
                                .setRequired(true))
                        .addStringOption(option =>
                            option.setName('action')
                                .setDescription('How to handle the role')
                                .addChoices(
                                    { name: 'Add Role (Keep Previous)', value: 'add' },
                                    { name: 'Replace Previous Level Roles', value: 'replace' }
                                ))
                        .addIntegerOption(option =>
                            option.setName('xp_bonus')
                                .setDescription('XP bonus percentage for having this role (0-100)')
                                .setMinValue(0)
                                .setMaxValue(100)))
                .addSubcommand(sub =>
                    sub.setName('remove')
                        .setDescription('Remove a level role')
                        .addIntegerOption(option =>
                            option.setName('level')
                                .setDescription('Level to remove role from')
                                .setRequired(true)
                                .setMinValue(1)))
                .addSubcommand(sub =>
                    sub.setName('list')
                        .setDescription('List all level roles'))
        )
        .addSubcommand(sub =>
            sub.setName('status')
                .setDescription('View current leveling system status')),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            const permissionContainer = new ContainerBuilder()
                .setAccentColor(0xFF0000)
                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent('# ❌ Permission Denied\nYou need `Manage Server` permission to use this command.')
                );

            return interaction.reply({
                components: [permissionContainer],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }
        if (!await checkPermissions(interaction)) return;
        const group = interaction.options.getSubcommandGroup();
        const subcommand = interaction.options.getSubcommand();

        try {
            if (group === 'setup') {
                await this.handleSetup(interaction, subcommand);
            } else if (group === 'config') {
                await this.handleConfig(interaction, subcommand);
            } else if (group === 'roles') {
                await this.handleRoles(interaction, subcommand);
            } else if (subcommand === 'status') {
                await this.handleStatus(interaction);
            }
        } catch (error) {
            console.error('Leveling setup error:', error);
            
            const errorContainer = new ContainerBuilder()
                .setAccentColor(0xFF0000)
                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent('# ❌ System Error\nAn error occurred while processing your request.')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder()
                        .setSpacing(SeparatorSpacingSize.Small)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(`**Error Details:** \`${error.message}\``)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder()
                        .setSpacing(SeparatorSpacingSize.Small)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(`*Error reported • ${new Date().toLocaleString()}*`)
                );

            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ 
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2 
                });
            } else {
                await interaction.reply({ 
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2,
                    ephemeral: true 
                });
            }
        }
    },

    async handleSetup(interaction, subcommand) {
        const guildId = interaction.guild.id;
        await interaction.deferReply();

        switch (subcommand) {
            case 'enable': {
                const logChannel = interaction.options.getChannel('log_channel');
                const customMessage = interaction.options.getString('level_message');

                let config = await GuildLevel.findOne({ guildId });
                if (!config) {
                    config = new GuildLevel({
                        guildId,
                        enabled: true,
                        settings: {
                            logChannel: logChannel?.id || null,
                            levelUpMessage: customMessage || '🎉 {user} leveled up to **Level {level}**!',
                            xpCooldown: 60000,
                            xpRange: { min: 15, max: 25 },
                            multipliers: {
                                text: 1.0,
                                voice: 1.2,
                                attachment: 1.5,
                                weekend: 1.25,
                                boost: 2.0
                            },
                            restrictions: {
                                ignoredChannels: [],
                                ignoredRoles: [],
                                allowedChannels: [],
                                botMessages: false
                            }
                        },
                        voiceSettings: {
                            enabled: true,
                            xpPerMinute: 2,
                            afkChannelXp: false,
                            soloChannelXp: false,
                            minSessionLength: 60000,
                            maxSessionXp: 500,
                            multipliers: {
                                streaming: 1.5,
                                camera: 1.3,
                                screenshare: 1.4,
                                multipleUsers: 1.2
                            },
                            ignoredChannels: [],
                            bonusChannels: []
                        }
                    });
                } else {
                    config.enabled = true;
                    if (logChannel) config.settings.logChannel = logChannel.id;
                    if (customMessage) config.settings.levelUpMessage = customMessage;
                }

                await config.save();

                const enableContainer = new ContainerBuilder()
                    .setAccentColor(0x00FF88)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent('# ✅ Leveling System Enabled!\nThe advanced leveling system has been successfully activated.')
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.Small)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(`**📊 Status:** 🟢 Active\n**📢 Log Channel:** ${logChannel ? `<#${logChannel.id}>` : '*Not Set*'}\n**💬 Text XP:** ${config.settings.xpRange.min}-${config.settings.xpRange.max} per message\n**🎤 Voice XP:** ${config.voiceSettings.xpPerMinute}/min\n**⏱️ Cooldown:** ${config.settings.xpCooldown / 1000}s`)
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.Small)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent('**🎯 Next Steps**\n• Add level roles with `/setup-leveling roles add`\n• Configure restrictions with `/setup-leveling config restrictions`\n• View status with `/setup-leveling status`')
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.Small)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(`*Setup completed for ${interaction.guild.name} • ${new Date().toLocaleString()}*`)
                    );

                await interaction.editReply({ 
                    components: [enableContainer],
                    flags: MessageFlags.IsComponentsV2 
                });
                break;
            }

            case 'disable': {
                const config = await GuildLevel.findOne({ guildId });
                if (config) {
                    config.enabled = false;
                    await config.save();
                }

                const disableContainer = new ContainerBuilder()
                    .setAccentColor(0xFF6B6B)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent('# ❌ Leveling System Disabled\nThe leveling system has been deactivated for this server.')
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.Small)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent('**📊 Status:** 🔴 Inactive\n**💾 Data Preservation:** All user data has been preserved\n**🔄 Re-enabling:** Use `/setup-leveling setup enable` to reactivate')
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.Small)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(`*System disabled • ${new Date().toLocaleString()}*`)
                    );

                await interaction.editReply({ 
                    components: [disableContainer],
                    flags: MessageFlags.IsComponentsV2 
                });
                break;
            }

            case 'quick': {
                const logChannel = interaction.options.getChannel('log_channel');

                const config = new GuildLevel({
                    guildId,
                    enabled: true,
                    settings: {
                        logChannel: logChannel.id,
                        levelUpMessage: '🎉 Congratulations {user}! You reached **Level {level}**! 🚀',
                        xpCooldown: 60000,
                        xpRange: { min: 15, max: 25 },
                        multipliers: {
                            text: 1.0,
                            voice: 1.2,
                            attachment: 1.5,
                            weekend: 1.5,
                            boost: 2.0
                        },
                        restrictions: {
                            ignoredChannels: [],
                            ignoredRoles: [],
                            allowedChannels: [],
                            botMessages: false
                        }
                    },
                    voiceSettings: {
                        enabled: true,
                        xpPerMinute: 3,
                        afkChannelXp: false,
                        soloChannelXp: true,
                        minSessionLength: 60000,
                        maxSessionXp: 1000,
                        multipliers: {
                            streaming: 2.0,
                            camera: 1.5,
                            screenshare: 1.5,
                            multipleUsers: 1.5
                        },
                        ignoredChannels: [],
                        bonusChannels: []
                    },
                    levelRoles: []
                });

                await config.save();

                const quickContainer = new ContainerBuilder()
                    .setAccentColor(0x9B59B6)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent('# 🚀 Quick Setup Complete!\nYour leveling system is ready with optimized settings!')
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.Small)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent('**📊 Configuration Applied**\n✅ Enhanced XP rates\n✅ Weekend bonuses\n✅ Voice activity rewards\n✅ Boost member perks')
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.Small)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(`**📢 Log Channel:** <#${logChannel.id}>\n**💬 Text XP:** 15-25 per message\n**🎤 Voice XP:** 3 per minute`)
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.Small)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent('**🎯 Recommended Next Steps**\n• Add level roles for rewards\n• Set up channel restrictions if needed\n• Announce the new system to your members!')
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.Small)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(`*Quick setup completed • ${new Date().toLocaleString()}*`)
                    );

                await interaction.editReply({ 
                    components: [quickContainer],
                    flags: MessageFlags.IsComponentsV2 
                });
                break;
            }
        }
    },

    async handleConfig(interaction, subcommand) {
        const guildId = interaction.guild.id;
        await interaction.deferReply();

        let config = await GuildLevel.findOne({ guildId });
        if (!config) {
            config = new GuildLevel({ guildId });
        }

        switch (subcommand) {
            case 'xp': {
                const minXp = interaction.options.getInteger('min_xp');
                const maxXp = interaction.options.getInteger('max_xp');
                const cooldown = interaction.options.getInteger('cooldown');

                if (minXp !== null) {
                    if (maxXp !== null && minXp > maxXp) {
                        const errorContainer = new ContainerBuilder()
                            .setAccentColor(0xFF0000)
                            .addTextDisplayComponents(
                                new TextDisplayBuilder()
                                    .setContent('# ❌ Invalid Configuration\nMinimum XP cannot be greater than maximum XP.')
                            );

                        return interaction.editReply({
                            components: [errorContainer],
                            flags: MessageFlags.IsComponentsV2
                        });
                    }
                    config.settings.xpRange.min = minXp;
                }

                if (maxXp !== null) {
                    if (minXp !== null && maxXp < minXp) {
                        const errorContainer = new ContainerBuilder()
                            .setAccentColor(0xFF0000)
                            .addTextDisplayComponents(
                                new TextDisplayBuilder()
                                    .setContent('# ❌ Invalid Configuration\nMaximum XP cannot be less than minimum XP.')
                            );

                        return interaction.editReply({
                            components: [errorContainer],
                            flags: MessageFlags.IsComponentsV2
                        });
                    }
                    config.settings.xpRange.max = maxXp;
                }

                if (cooldown !== null) {
                    config.settings.xpCooldown = cooldown * 1000;
                }

                await config.save();

                const xpContainer = new ContainerBuilder()
                    .setAccentColor(0x3498DB)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent('# ⚙️ XP Settings Updated\nXP configuration has been successfully modified.')
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.Small)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(`**💬 XP Range:** ${config.settings.xpRange.min} - ${config.settings.xpRange.max}\n**⏱️ Cooldown:** ${config.settings.xpCooldown / 1000}s\n**📊 Status:** ${config.enabled ? '🟢 Active' : '🔴 Inactive'}`)
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.Small)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(`*Configuration updated • ${new Date().toLocaleString()}*`)
                    );

                await interaction.editReply({ 
                    components: [xpContainer],
                    flags: MessageFlags.IsComponentsV2 
                });
                break;
            }

            case 'multipliers': {
                const text = interaction.options.getNumber('text');
                const voice = interaction.options.getNumber('voice');
                const weekend = interaction.options.getNumber('weekend');
                const boost = interaction.options.getNumber('boost');

                if (text !== null) config.settings.multipliers.text = text;
                if (voice !== null) config.settings.multipliers.voice = voice;
                if (weekend !== null) config.settings.multipliers.weekend = weekend;
                if (boost !== null) config.settings.multipliers.boost = boost;

                await config.save();

                const multiplierContainer = new ContainerBuilder()
                    .setAccentColor(0xE67E22)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent('# 🔥 Multipliers Updated\nXP multiplier settings have been configured.')
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.Small)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(`**💬 Text Messages:** ${config.settings.multipliers.text}x\n**🎤 Voice Activity:** ${config.settings.multipliers.voice}x\n**📅 Weekend Bonus:** ${config.settings.multipliers.weekend}x`)
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.Small)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(`**💎 Server Boost:** ${config.settings.multipliers.boost}x\n**📎 Attachments:** ${config.settings.multipliers.attachment}x\n**📊 Status:** ${config.enabled ? '🟢 Active' : '🔴 Inactive'}`)
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.Small)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(`*Multipliers updated • ${new Date().toLocaleString()}*`)
                    );

                await interaction.editReply({ 
                    components: [multiplierContainer],
                    flags: MessageFlags.IsComponentsV2 
                });
                break;
            }

            case 'voice': {
                const enabled = interaction.options.getBoolean('enabled');
                const xpPerMinute = interaction.options.getNumber('xp_per_minute');
                const soloXp = interaction.options.getBoolean('solo_xp');
                const afkXp = interaction.options.getBoolean('afk_xp');

                if (enabled !== null) config.voiceSettings.enabled = enabled;
                if (xpPerMinute !== null) config.voiceSettings.xpPerMinute = xpPerMinute;
                if (soloXp !== null) config.voiceSettings.soloChannelXp = soloXp;
                if (afkXp !== null) config.voiceSettings.afkChannelXp = afkXp;

                await config.save();

                const voiceContainer = new ContainerBuilder()
                    .setAccentColor(0x9B59B6)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent('# 🎤 Voice Settings Updated\nVoice XP configuration has been modified.')
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.Small)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(`**🔊 Voice XP:** ${config.voiceSettings.enabled ? '🟢 Enabled' : '🔴 Disabled'}\n**⏱️ XP per Minute:** ${config.voiceSettings.xpPerMinute}\n**👤 Solo Channel XP:** ${config.voiceSettings.soloChannelXp ? '✅ Yes' : '❌ No'}`)
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.Small)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(`**💤 AFK Channel XP:** ${config.voiceSettings.afkChannelXp ? '✅ Yes' : '❌ No'}\n**⏰ Min Session:** ${config.voiceSettings.minSessionLength / 1000}s\n**🎯 Max Session XP:** ${config.voiceSettings.maxSessionXp}`)
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.Small)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(`*Voice settings updated • ${new Date().toLocaleString()}*`)
                    );

                await interaction.editReply({ 
                    components: [voiceContainer],
                    flags: MessageFlags.IsComponentsV2 
                });
                break;
            }

            case 'restrictions': {
                const action = interaction.options.getString('action');
                const channel = interaction.options.getChannel('channel');
                const role = interaction.options.getRole('role');

                switch (action) {
                    case 'ignore_channel':
                        if (!channel) {
                            const errorContainer = new ContainerBuilder()
                                .setAccentColor(0xFF0000)
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder()
                                        .setContent('# ❌ Missing Channel\nPlease specify a channel to ignore.')
                                );

                            return interaction.editReply({
                                components: [errorContainer],
                                flags: MessageFlags.IsComponentsV2
                            });
                        }
                        if (!config.settings.restrictions.ignoredChannels.includes(channel.id)) {
                            config.settings.restrictions.ignoredChannels.push(channel.id);
                        }
                        break;

                    case 'unignore_channel':
                        if (!channel) {
                            const errorContainer = new ContainerBuilder()
                                .setAccentColor(0xFF0000)
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder()
                                        .setContent('# ❌ Missing Channel\nPlease specify a channel to unignore.')
                                );

                            return interaction.editReply({
                                components: [errorContainer],
                                flags: MessageFlags.IsComponentsV2
                            });
                        }
                        config.settings.restrictions.ignoredChannels = config.settings.restrictions.ignoredChannels.filter(id => id !== channel.id);
                        break;

                    case 'ignore_role':
                        if (!role) {
                            const errorContainer = new ContainerBuilder()
                                .setAccentColor(0xFF0000)
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder()
                                        .setContent('# ❌ Missing Role\nPlease specify a role to ignore.')
                                );

                            return interaction.editReply({
                                components: [errorContainer],
                                flags: MessageFlags.IsComponentsV2
                            });
                        }
                        if (!config.settings.restrictions.ignoredRoles.includes(role.id)) {
                            config.settings.restrictions.ignoredRoles.push(role.id);
                        }
                        break;

                    case 'unignore_role':
                        if (!role) {
                            const errorContainer = new ContainerBuilder()
                                .setAccentColor(0xFF0000)
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder()
                                        .setContent('# ❌ Missing Role\nPlease specify a role to unignore.')
                                );

                            return interaction.editReply({
                                components: [errorContainer],
                                flags: MessageFlags.IsComponentsV2
                            });
                        }
                        config.settings.restrictions.ignoredRoles = config.settings.restrictions.ignoredRoles.filter(id => id !== role.id);
                        break;

                    case 'clear':
                        config.settings.restrictions.ignoredChannels = [];
                        config.settings.restrictions.ignoredRoles = [];
                        config.settings.restrictions.allowedChannels = [];
                        break;
                }

                await config.save();

                const restrictionContainer = new ContainerBuilder()
                    .setAccentColor(0x95A5A6)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent('# 🛡️ Restrictions Updated\nChannel and role restrictions have been modified.')
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.Small)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(`**🚫 Ignored Channels**\n${config.settings.restrictions.ignoredChannels.length > 0 ? config.settings.restrictions.ignoredChannels.map(id => `<#${id}>`).join(', ') : '*None*'}`)
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.Small)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(`**🚫 Ignored Roles**\n${config.settings.restrictions.ignoredRoles.length > 0 ? config.settings.restrictions.ignoredRoles.map(id => `<@&${id}>`).join(', ') : '*None*'}`)
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.Small)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(`*Restrictions updated • ${new Date().toLocaleString()}*`)
                    );

                await interaction.editReply({ 
                    components: [restrictionContainer],
                    flags: MessageFlags.IsComponentsV2 
                });
                break;
            }
        }
    },

    async handleRoles(interaction, subcommand) {
        const guildId = interaction.guild.id;
        await interaction.deferReply();

        let config = await GuildLevel.findOne({ guildId });
        if (!config) {
            config = new GuildLevel({ guildId });
        }

        switch (subcommand) {
            case 'add': {
                const level = interaction.options.getInteger('level');
                const role = interaction.options.getRole('role');
                const action = interaction.options.getString('action') || 'add';
                const xpBonus = interaction.options.getInteger('xp_bonus') || 0;

                // Check if role is manageable
                if (role.position >= interaction.guild.members.me.roles.highest.position) {
                    const errorContainer = new ContainerBuilder()
                        .setAccentColor(0xFF0000)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder()
                                .setContent(`# ❌ Role Permission Error\nI cannot manage the role ${role} because it's higher than my highest role.`)
                        );

                    return interaction.editReply({
                        components: [errorContainer],
                        flags: MessageFlags.IsComponentsV2
                    });
                }

                // Remove existing role for this level
                config.levelRoles = config.levelRoles.filter(lr => lr.level !== level);

                // Add new role
                config.levelRoles.push({
                    level,
                    roleId: role.id,
                    action,
                    stackable: action === 'add',
                    rewards: {
                        xpBonus,
                        announcement: null
                    }
                });

                // Sort by level
                config.levelRoles.sort((a, b) => a.level - b.level);

                await config.save();

                const roleAddContainer = new ContainerBuilder()
                    .setAccentColor(0xE67E22)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent('# 🎭 Level Role Added\nLevel reward has been successfully configured.')
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.Small)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(`**📊 Level Requirement:** ${level}\n**🎭 Role:** <@&${role.id}>\n**⚙️ Action:** ${action === 'add' ? 'Add Role' : 'Replace Previous'}`)
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.Small)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(`**💰 XP Bonus:** ${xpBonus > 0 ? `+${xpBonus}%` : 'None'}\n**📋 Total Level Roles:** ${config.levelRoles.length}`)
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.Small)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(`*Level role configured • ${new Date().toLocaleString()}*`)
                    );

                await interaction.editReply({ 
                    components: [roleAddContainer],
                    flags: MessageFlags.IsComponentsV2 
                });
                break;
            }

            case 'remove': {
                const level = interaction.options.getInteger('level');
                const removedRoles = config.levelRoles.filter(lr => lr.level === level);
                
                config.levelRoles = config.levelRoles.filter(lr => lr.level !== level);
                await config.save();

                const roleRemoveContainer = new ContainerBuilder()
                    .setAccentColor(0xE74C3C)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent('# 🗑️ Level Role Removed\nLevel reward has been successfully deleted.')
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.Small)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(removedRoles.length > 0 
                                ? `Removed role reward for level ${level}: <@&${removedRoles[0].roleId}>`
                                : `No role reward found for level ${level}`)
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.Small)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(`**📋 Remaining Level Roles:** ${config.levelRoles.length}`)
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.Small)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(`*Level role removed • ${new Date().toLocaleString()}*`)
                    );

                await interaction.editReply({ 
                    components: [roleRemoveContainer],
                    flags: MessageFlags.IsComponentsV2 
                });
                break;
            }

            case 'list': {
                const roles = config.levelRoles.sort((a, b) => a.level - b.level);

                if (roles.length === 0) {
                    const noRolesContainer = new ContainerBuilder()
                        .setAccentColor(0x95A5A6)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder()
                                .setContent('# 📋 Level Roles\nNo level roles configured yet.')
                        )
                        .addSeparatorComponents(
                            new SeparatorBuilder()
                                .setSpacing(SeparatorSpacingSize.Small)
                        )
                        .addTextDisplayComponents(
                            new TextDisplayBuilder()
                                .setContent('**🎯 Getting Started**\nUse `/setup-leveling roles add` to create your first level role!')
                        )
                        .addSeparatorComponents(
                            new SeparatorBuilder()
                                .setSpacing(SeparatorSpacingSize.Small)
                        )
                        .addTextDisplayComponents(
                            new TextDisplayBuilder()
                                .setContent(`*No roles configured • ${new Date().toLocaleString()}*`)
                        );

                    return await interaction.editReply({ 
                        components: [noRolesContainer],
                        flags: MessageFlags.IsComponentsV2 
                    });
                }

                // Group roles into pages of 10
                const pages = [];
                for (let i = 0; i < roles.length; i += 10) {
                    pages.push(roles.slice(i, i + 10));
                }

                const roleListContainer = new ContainerBuilder()
                    .setAccentColor(0x3498DB)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent('# 📋 Level Roles Configuration\nLevel-based role rewards system overview')
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.Small)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(pages[0].map(lr => {
                                const xpBonus = lr.rewards?.xpBonus > 0 ? ` (+${lr.rewards.xpBonus}% XP)` : '';
                                const actionIcon = lr.action === 'replace' ? '🔄' : '➕';
                                return `${actionIcon} **Level ${lr.level}:** <@&${lr.roleId}>${xpBonus}`;
                            }).join('\n'))
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.Small)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(`**📊 Total Roles:** ${roles.length}\n**🎯 Highest Level:** ${Math.max(...roles.map(r => r.level))}`)
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder()
                            .setSpacing(SeparatorSpacingSize.Small)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(`*${pages.length > 1 ? `Page 1 of ${pages.length}` : `${roles.length} level roles configured`} • ${new Date().toLocaleString()}*`)
                    );

                await interaction.editReply({ 
                    components: [roleListContainer],
                    flags: MessageFlags.IsComponentsV2 
                });
                break;
            }
        }
    },

    async handleStatus(interaction) {
        const guildId = interaction.guild.id;
        await interaction.deferReply();

        const config = await GuildLevel.findOne({ guildId });
        
        if (!config) {
            const noConfigContainer = new ContainerBuilder()
                .setAccentColor(0x95A5A6)
                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent('# 📊 Leveling System Status\nThe leveling system is not configured for this server.')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder()
                        .setSpacing(SeparatorSpacingSize.Small)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent('**🎯 Getting Started**\nUse `/setup-leveling setup enable` to set up the leveling system!')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder()
                        .setSpacing(SeparatorSpacingSize.Small)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(`*Not configured • ${new Date().toLocaleString()}*`)
                );

            return await interaction.editReply({ 
                components: [noConfigContainer],
                flags: MessageFlags.IsComponentsV2 
            });
        }

        // Get user count
        const UserLevel = require('../../models/leveling/userLevelSchema');
        const userCount = await UserLevel.countDocuments({ guildId });
        const activeThisWeek = await UserLevel.countDocuments({ 
            guildId, 
            weeklyXp: { $gt: 0 } 
        });

        const statusContainer = new ContainerBuilder()
            .setAccentColor(config.enabled ? 0x00FF88 : 0xFF6B6B)
            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent('# 📊 Leveling System Status\nComprehensive system overview and statistics')
            )
            .addSeparatorComponents(
                new SeparatorBuilder()
                    .setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(`**🔧 System Status:** ${config.enabled ? '🟢 Enabled' : '🔴 Disabled'}\n**📢 Log Channel:** ${config.settings.logChannel ? `<#${config.settings.logChannel}>` : '*Not Set*'}\n**👥 Total Users:** ${userCount.toLocaleString()}\n**📈 Active This Week:** ${activeThisWeek.toLocaleString()}`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder()
                    .setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(`**🎭 Level Roles:** ${config.levelRoles.length}\n**📊 Text XP Range:** ${config.settings.xpRange.min}-${config.settings.xpRange.max}\n**🎤 Voice XP:** ${config.voiceSettings.enabled ? `${config.voiceSettings.xpPerMinute}/min` : 'Disabled'}\n**⏱️ XP Cooldown:** ${config.settings.xpCooldown / 1000}s`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder()
                    .setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(`**🔥 Multipliers**\nWeekend: ${config.settings.multipliers.weekend}x\nBoost: ${config.settings.multipliers.boost}x\nVoice: ${config.settings.multipliers.voice}x`)
            );

        if (config.settings.restrictions.ignoredChannels.length > 0 || config.settings.restrictions.ignoredRoles.length > 0) {
            statusContainer.addSeparatorComponents(
                new SeparatorBuilder()
                    .setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(`**🛡️ Restrictions**\n${config.settings.restrictions.ignoredChannels.length} ignored channels\n${config.settings.restrictions.ignoredRoles.length} ignored roles`)
            );
        }

        statusContainer.addSeparatorComponents(
            new SeparatorBuilder()
                .setSpacing(SeparatorSpacingSize.Small)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent(`*Configuration for ${interaction.guild.name} • ${new Date().toLocaleString()}*`)
        );

        await interaction.editReply({ 
            components: [statusContainer],
            flags: MessageFlags.IsComponentsV2 
        });
    }
};
