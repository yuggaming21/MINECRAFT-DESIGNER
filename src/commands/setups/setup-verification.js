const {
    SlashCommandBuilder,
    PermissionsBitField,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const VerificationConfig = require('../../models/gateVerification/verificationConfig');
const checkPermissions = require('../../utils/checkPermissions');
const cmdIcons = require('../../UI/icons/commandicons');
const { verificationBanner } = require('../../UI/banners/SetupBanners');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-verification')
        .setDescription('Setup or manage the verification system.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
        .addSubcommand(sub =>
            sub.setName('enable')
                .setDescription('Enable the verification system.')
                .addRoleOption(opt =>
                    opt.setName('unverified_role')
                        .setDescription('Use an existing unverified role')
                        .setRequired(false))
                .addRoleOption(opt =>
                    opt.setName('verified_role')
                        .setDescription('Use an existing verified role')
                        .setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('disable')
                .setDescription('Disable the verification system and remove the verification channel.')
        )
        .addSubcommand(sub =>
            sub.setName('view')
                .setDescription('View the current verification system configuration.')
        ),

    async execute(interaction) {
        if (interaction.isCommand && interaction.isCommand()) {
        await interaction.deferReply({ ephemeral: true });
        if (!await checkPermissions(interaction)) return;
        const { guild } = interaction;
        const guildId = guild.id;
        const sub = interaction.options.getSubcommand();
        let config = await VerificationConfig.findOne({ guildId });
        if (sub === 'enable') {
            // Reuse existing config or init new
            if (config?.verificationEnabled) {
                const existingChannel = guild.channels.cache.get(config.verificationChannelId);
        
                // If channel exists, stop setup
                if (existingChannel) {
                    return interaction.editReply({ content: '⚠️ Verification system is already enabled for this server.' });
                }
        
                // Channel is missing — auto-cleanup
                console.log(`[ Verification ] Channel missing for guild ${guild.name}, reinitializing...`);
                config.verificationEnabled = false;
                config.verificationChannelId = null;
                await config.save();
            }
        
            const unverifiedRole = interaction.options.getRole('unverified_role') ||
                guild.roles.cache.get(config?.unverifiedRoleId) ||
                await guild.roles.create({ name: 'Unverified', color: '#ff0000', permissions: [] });
        
            const verifiedRole = interaction.options.getRole('verified_role') ||
                guild.roles.cache.get(config?.verifiedRoleId) ||
                await guild.roles.create({ name: 'Verified', color: '#00ff00', permissions: [] });
        
            // Fix: Check if channel is a text/guild channel before updating permissions
            for (const channel of guild.channels.cache.values()) {
                try {
                    // Only update permissions for channels that support permission overwrites
                    if (channel.permissionOverwrites && typeof channel.permissionOverwrites.edit === 'function') {
                        await channel.permissionOverwrites.edit(unverifiedRole, { ViewChannel: false });
                    }
                } catch (error) {
                    console.error(`Failed to update permissions for channel: ${channel.name}`, error);
                    // Continue with other channels if one fails
                }
            }
        
            const verificationChannel = await guild.channels.create({
                name: 'verify-here',
                type: 0,
                permissionOverwrites: [
                    { id: guild.id, deny: ['ViewChannel'] },
                    { id: unverifiedRole.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] }
                ]
            });
        
            const embed = new EmbedBuilder()
                .setTitle('Verification System')
                .setDescription('- Click the button below to verify yourself.\n- Dont forget to check your DMs for the verification message!')
                .setImage(verificationBanner)
                .setColor('#0099ff');
        
            const button = new ButtonBuilder()
                .setCustomId('verify_button')
                .setLabel('Verify')
                .setStyle(ButtonStyle.Primary);
        
            const row = new ActionRowBuilder().addComponents(button);
            await verificationChannel.send({ embeds: [embed], components: [row] });
        
            await VerificationConfig.findOneAndUpdate(
                { guildId },
                {
                    guildId,
                    verificationEnabled: true,
                    unverifiedRoleId: unverifiedRole.id,
                    verifiedRoleId: verifiedRole.id,
                    verificationChannelId: verificationChannel.id
                },
                { upsert: true }
            );
        
            return interaction.editReply({ content: '✅ Verification system enabled successfully!' });
        }
        

        if (sub === 'disable') {
            if (!config?.verificationEnabled) {
                return interaction.editReply({ content: '⚠️ Verification system is not currently enabled.' });
            }

            const channel = guild.channels.cache.get(config.verificationChannelId);
            if (channel) await channel.delete().catch(() => {});

            config.verificationEnabled = false;
            config.verificationChannelId = null;
            await config.save();

            return interaction.editReply({ content: '✅ Verification system disabled. Channel removed, roles preserved.' });
        }

        if (sub === 'view') {
            if (!config?.verificationEnabled) {
                return interaction.editReply({ content: 'ℹ️ The verification system is currently disabled.' });
            }

            const embed = new EmbedBuilder()
                .setTitle('🔍 Verification Configuration')
                .setColor('#0099ff')
                .addFields(
                    { name: 'Status', value: '✅ Enabled', inline: true },
                    { name: 'Verified Role', value: `<@&${config.verifiedRoleId}>`, inline: true },
                    { name: 'Unverified Role', value: `<@&${config.unverifiedRoleId}>`, inline: true },
                    { name: 'Verification Channel', value: `<#${config.verificationChannelId}>`, inline: false }
                )
                .setFooter({ text: 'Use /setup-verification disable to reset settings.' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }
    } else {
        const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setAuthor({ 
                name: "Alert!", 
                iconURL: cmdIcons.dotIcon,
                url: "https://discord.gg/xQF9f9yUEM"
            })
            .setDescription('- This command can only be used through slash commands!\n- Please use `/setup-verification`')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }

    }
};