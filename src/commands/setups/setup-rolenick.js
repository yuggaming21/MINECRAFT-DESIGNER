const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const RoleNickConfig = require('../../models/rolenick/RoleNickConfig');
const checkPermissions = require('../../utils/checkPermissions');
const cmdIcons = require('../../UI/icons/commandicons');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-rolenick')
        .setDescription('Configure nickname formats based on roles.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('Add a role with a nickname format')
                .addRoleOption(opt => opt.setName('role').setDescription('Target role').setRequired(true))
                .addStringOption(opt => opt.setName('format').setDescription('Nickname format').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('view')
                .setDescription('View all nickname role configurations')
        )
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Remove a specific role from nickname config')
                .addRoleOption(opt => opt.setName('role').setDescription('Role to remove').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('clear')
                .setDescription('Delete all nickname configurations')
        ),

    async execute(interaction) {
        if (interaction.isCommand && interaction.isCommand()) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;
        if (!await checkPermissions(interaction)) return;
        const role = interaction.options.getRole('role');
        const format = interaction.options.getString('format') || '[{ROLE}] {USERNAME}';

        const config = await RoleNickConfig.findOne({ guildId });

        if (subcommand === 'add') {
            if (config) {
                const existing = config.roles.find(r => r.roleId === role.id);
                if (existing) {
                    existing.nicknameFormat = format;
                } else {
                    config.roles.push({ roleId: role.id, nicknameFormat: format });
                }
                await config.save();
            } else {
                await RoleNickConfig.create({
                    guildId,
                    roles: [{ roleId: role.id, nicknameFormat: format }]
                });
            }

            return interaction.reply({
                content: `✅ Nickname format for **${role.name}** set to \`${format}\``,
                ephemeral: true
            });
        }

        if (subcommand === 'view') {
            if (!config || config.roles.length === 0) {
                return interaction.reply({ content: '⚠️ No role-nickname configurations set.', ephemeral: true });
            }

            const display = config.roles.map(r => {
                const guildRole = interaction.guild.roles.cache.get(r.roleId);
                return `• ${guildRole?.name || 'Unknown Role'}: \`${r.nicknameFormat}\``;
            }).join('\n');

            return interaction.reply({
                content: `📋 Role-Nickname Configurations:\n${display}`,
                ephemeral: true
            });
        }

        if (subcommand === 'remove') {
            if (!config) {
                return interaction.reply({ content: '⚠️ No configuration exists.', ephemeral: true });
            }

            config.roles = config.roles.filter(r => r.roleId !== role.id);
            await config.save();

            return interaction.reply({ content: `🗑️ Removed configuration for **${role.name}**.`, ephemeral: true });
        }

        if (subcommand === 'clear') {
            if (!config) return interaction.reply({ content: '⚠️ No configuration to clear.', ephemeral: true });

            config.roles = [];
            await config.save();

            return interaction.reply({ content: '🧹 All nickname configurations cleared.', ephemeral: true });
        }
        

       } else {
        const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setAuthor({ 
                name: "Alert!", 
                iconURL: cmdIcons.dotIcon,
                url: "https://discord.gg/xQF9f9yUEM"
            })
            .setDescription('- This command can only be used through slash commands!\n- Please use `/setup-rolenick`')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
    }
};
