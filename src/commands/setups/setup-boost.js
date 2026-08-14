// commands/boost/setup-boost.js
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const BoostSettings = require('../../models/boost/BoostSettings');
const checkPermissions = require('../../utils/checkPermissions');
const cmdIcons = require('../../UI/icons/commandicons');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-boost')
        .setDescription('Set or view boost notification settings for this server')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels)

        .addSubcommand(sub =>
            sub.setName('setchannel')
                .setDescription('Enable/Disable boost notifications in a channel')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Select the boost notification channel')
                        .setRequired(true))
                .addBooleanOption(option =>
                    option.setName('status')
                        .setDescription('Enable or disable boost notifications')
                        .setRequired(true))
        )

        .addSubcommand(sub =>
            sub.setName('setmessage')
                .setDescription('Set custom boost messages')
                .addStringOption(option =>
                    option.setName('boost_message')
                        .setDescription('Message when someone boosts (use {username}, {servername}, {boostlevel}, {boostcount})')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('remove_message')
                        .setDescription('Message when someone removes boost')
                        .setRequired(false))
        )

        .addSubcommand(sub =>
            sub.setName('view')
                .setDescription('View current boost settings')
        ),

    async execute(interaction) {
        if (!interaction.isCommand()) {
            const embed = new EmbedBuilder()
                .setColor('#3498db')
                .setAuthor({ 
                    name: "Alert!", 
                    iconURL: cmdIcons.dotIcon,
                    url: "https://discord.gg/xQF9f9yUEM"
                })
                .setDescription('- This command can only be used through slash commands!\n- Please use `/setup-boost`')
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

        const guild = interaction.guild;
        const serverID = guild.id;
        if (!await checkPermissions(interaction)) return;

        const subcommand = interaction.options.getSubcommand();

        try {
            if (subcommand === 'setchannel') {
                const channel = interaction.options.getChannel('channel');
                const status = interaction.options.getBoolean('status');

                await BoostSettings.findOneAndUpdate(
                    { serverId: serverID },
                    {
                        serverId: serverID,
                        boostChannelId: channel.id,
                        boostStatus: status,
                        ownerId: guild.ownerId
                    },
                    { 
                        upsert: true, 
                        new: true,
                        setDefaultsOnInsert: true
                    }
                );

                return interaction.reply({
                    content: `🚀 Boost notifications have been **${status ? 'enabled' : 'disabled'}** for <#${channel.id}>.`,
                    ephemeral: true
                });

            } else if (subcommand === 'setmessage') {
                const boostMessage = interaction.options.getString('boost_message');
                const removeMessage = interaction.options.getString('remove_message');

                const updateData = { 
                    serverId: serverID, 
                    ownerId: guild.ownerId 
                };

                if (boostMessage) updateData.boostMessage = boostMessage;
                if (removeMessage) updateData.removeMessage = removeMessage;

                await BoostSettings.findOneAndUpdate(
                    { serverId: serverID },
                    updateData,
                    { 
                        upsert: true, 
                        new: true,
                        setDefaultsOnInsert: true
                    }
                );

                return interaction.reply({
                    content: '✅ Boost messages have been updated!',
                    ephemeral: true
                });

            } else if (subcommand === 'view') {
                const config = await BoostSettings.findOne({ serverId: serverID });

                if (!config) {
                    return interaction.reply({
                        content: '⚠ No boost configuration found for this server.',
                        ephemeral: true
                    });
                }

                const embed = new EmbedBuilder()
                    .setColor('#f47fff')
                    .setTitle('🚀 Boost Settings')
                    .addFields(
                        { name: 'Server ID', value: config.serverId, inline: true },
                        { name: 'Channel', value: config.boostChannelId ? `<#${config.boostChannelId}>` : 'Not set', inline: true },
                        { name: 'Status', value: config.boostStatus ? '✅ Enabled' : '❌ Disabled', inline: true },
                        { name: 'Boost Message', value: config.boostMessage || 'Default', inline: false },
                        { name: 'Remove Message', value: config.removeMessage || 'Default', inline: false }
                    )
                    .setTimestamp();

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

        } catch (error) {
            console.error('❌ Error in setup-boost command:', error);
            
            if (error.code === 11000) {
                return interaction.reply({
                    content: '❌ Database conflict detected. Please try the command again or contact support.',
                    ephemeral: true
                });
            }
            
            return interaction.reply({
                content: '❌ An error occurred while updating the boost settings.',
                ephemeral: true
            });
        }
    }
};
