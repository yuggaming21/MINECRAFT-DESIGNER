const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const InviteSettings = require("../../models/inviteTracker/inviteSettings");
const checkPermissions = require('../../utils/checkPermissions');
const cmdIcons = require('../../UI/icons/commandicons');
module.exports = {
    data: new SlashCommandBuilder()
        .setName("setup-invitetracker")
        .setDescription("Configure or view invite tracking logs.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        // Set subcommand
        .addSubcommand(sub =>
            sub.setName("set")
                .setDescription("Set the invite tracking log channel and status.")
                .addChannelOption(option =>
                    option.setName("channel")
                        .setDescription("Channel for invite logs")
                        .setRequired(true)
                )
                .addBooleanOption(option =>
                    option.setName("status")
                        .setDescription("Enable or disable invite logging")
                        .setRequired(true)
                )
        )

        // View subcommand
        .addSubcommand(sub =>
            sub.setName("view")
                .setDescription("View the current invite tracker configuration.")
        ),

    async execute(interaction) {
        if (interaction.isCommand && interaction.isCommand()) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;
        if (!await checkPermissions(interaction)) return;
        if (subcommand === "set") {
            const channel = interaction.options.getChannel("channel");
            const status = interaction.options.getBoolean("status");

            await InviteSettings.findOneAndUpdate(
                { guildId },
                {
                    inviteLogChannelId: channel.id,
                    status
                },
                { upsert: true }
            );

            return interaction.reply(`📩 Invite tracking is now **${status ? 'enabled' : 'disabled'}** in ${channel}.`);
        }

        if (subcommand === "view") {
            const config = await InviteSettings.findOne({ guildId });

            if (!config) {
                return interaction.reply({
                    content: '⚠ No invite tracker configuration found for this server.',
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setColor("#3498db")
                .setTitle("📋 Invite Tracker Configuration")
                .addFields(
                    { name: "Server ID", value: config.guildId, inline: true },
                    { name: "Log Channel", value: config.inviteLogChannelId ? `<#${config.inviteLogChannelId}>` : "Not Set", inline: true },
                    { name: "Status", value: config.status ? "✅ Enabled" : "❌ Disabled", inline: true }
                )
                .setTimestamp();

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
    } else {
        const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setAuthor({ 
                name: "Alert!", 
                iconURL: cmdIcons.dotIcon,
                url: "https://discord.gg/xQF9f9yUEM"
            })
            .setDescription('- This command can only be used through slash commands!\n- Please use `/setup-invitetracker`')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
    }
};
