const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const SuggestionConfig = require('../../models/suggestions/SuggestionConfig');
const checkPermissions = require('../../utils/checkPermissions');
const cmdIcons = require('../../UI/icons/commandicons');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-suggestions')
        .setDescription('Set up the suggestion system for your server.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel where suggestions will be sent.')
                .setRequired(true)
        )
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Only members with this role can use the /suggestion command (optional).')
        ),

    async execute(interaction) {
        if (interaction.isCommand && interaction.isCommand()) {
        const guildId = interaction.guild.id;
        if (!await checkPermissions(interaction)) return;
        const channel = interaction.options.getChannel('channel');
        const role = interaction.options.getRole('role');

        await SuggestionConfig.findOneAndUpdate(
            { guildId },
            {
                guildId,
                suggestionChannelId: channel.id,
                allowedRoleId: role?.id || null
            },
            { upsert: true }
        );

        return interaction.reply({
            content: `✅ Suggestions configured.\nChannel: <#${channel.id}>\nAllowed Role: ${role ? `<@&${role.id}>` : 'Everyone'}`,
            ephemeral: true
        });
    } else {
        const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setAuthor({ 
                name: "Alert!", 
                iconURL: cmdIcons.dotIcon,
                url: "https://discord.gg/xQF9f9yUEM"
            })
            .setDescription('- This command can only be used through slash commands!\n- Please use `/setup-suggestions`')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
    }
};
