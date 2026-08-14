const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const { nicknameConfigs } = require('../../mongodb');
const cmdIcons = require('../../UI/icons/commandicons');
const checkPermissions = require('../../utils/checkPermissions');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-autonickname')
        .setDescription('Configure or view the auto nickname changer.')
        // "set" subcommand to update the configuration
        .addSubcommand(sub =>
            sub
                .setName('set')
                .setDescription('Set the auto nickname changer configuration.')
                .addStringOption(option =>
                    option.setName('prefix')
                        .setDescription('The prefix to add to nicknames.')
                        .setRequired(true))
                .addBooleanOption(option =>
                    option.setName('status')
                        .setDescription('Enable or disable the auto nickname changer.')
                        .setRequired(false))
        )
        // "view" subcommand to view the current configuration
        .addSubcommand(sub =>
            sub
                .setName('view')
                .setDescription('View the current auto nickname changer configuration.')
        ),

    async execute(interaction) {
        if (interaction.isCommand && interaction.isCommand()) {
            const subcommand = interaction.options.getSubcommand();
            const guildId = interaction.guild.id;

            const guild = interaction.guild;
            const serverId = interaction.guild.id;
            if (!await checkPermissions(interaction)) return;
            
            if (subcommand === 'set') {
                // Check for ManageChannels permission before allowing configuration changes.
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                    const embed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setDescription('You do not have permission to use this command.');
                    return interaction.reply({ embeds: [embed], flags: 64 });
                }

                const prefix = interaction.options.getString('prefix');
                const status = interaction.options.getBoolean('status') ?? true;

                await nicknameConfigs.updateOne(
                    { guildId },
                    { $set: { nicknamePrefix: prefix, status } },
                    { upsert: true }
                );

                return interaction.reply({
                    content: `Auto nickname changer has been ${status ? '**enabled**' : '**disabled**'} with prefix: **${prefix}**.`,
                    flags: 64,
                });
            } else if (subcommand === 'view') {
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                    const embed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setDescription('You do not have permission to use this command.');
                    return interaction.reply({ embeds: [embed], flags: 64 });
                }

                const configData = await nicknameConfigs.findOne({ guildId });
                let description;
                if (configData) {
                    description = `**Status:** ${configData.status ? 'Enabled' : 'Disabled'}\n**Prefix:** ${configData.nicknamePrefix}`;
                } else {
                    description = 'No configuration found. Please set up the auto nickname changer using `/setautonickname set`.';
                }

                const embed = new EmbedBuilder()
                    .setColor('#3498db')
                    .setTitle('Auto Nickname Changer Configuration')
                    .setDescription(description)
                    .setTimestamp();

                return interaction.reply({ embeds: [embed], flags: 64 });
            }
        } else {
            const embed = new EmbedBuilder()
                .setColor('#3498db')
                .setAuthor({ 
                    name: "Alert!", 
                    iconURL: cmdIcons.dotIcon,
                    url: "https://discord.gg/xQF9f9yUEM"
                })
                .setDescription('- This command can only be used through slash commands!\n- Please use `/setup-autonickname`')
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        }
    },
};
