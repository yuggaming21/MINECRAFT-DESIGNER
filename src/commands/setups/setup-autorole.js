const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const Autorole = require('../../models/autorole/autorole'); // Import the schema
const cmdIcons = require('../../UI/icons/commandicons');
const checkPermissions = require('../../utils/checkPermissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-autorole')
        .setDescription('Set or view the auto-role for a server')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels)
        // Subcommand for setting the auto-role configuration
        .addSubcommand(sub =>
            sub
                .setName('set')
                .setDescription('Configure the auto-role for the server')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The role to be assigned to new members')
                        .setRequired(true))
                .addBooleanOption(option =>
                    option.setName('status')
                        .setDescription('Enable or disable the auto-role')
                        .setRequired(true))
        )
        // Subcommand for viewing the auto-role configuration
        .addSubcommand(sub =>
            sub
                .setName('view')
                .setDescription('View the auto-role configuration for the server')
        ),

    async execute(interaction) {
        if (interaction.isCommand && interaction.isCommand()) {
            const subcommand = interaction.options.getSubcommand();
            const guild = interaction.guild;
            const serverId = guild.id;
            
            if (!await checkPermissions(interaction)) return;

            if (subcommand === 'set') {
                // Check if the user has permission to manage channels
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                    const embed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setDescription('You do not have permission to use this command.');
                    return interaction.reply({ embeds: [embed], flags: 64 });
                }

                const role = interaction.options.getRole('role');
                const status = interaction.options.getBoolean('status');

                // Retrieve the server owner ID
                const serverOwnerId = guild.ownerId;
                const memberId = interaction.user.id;
                
                try {
                    const storedConfig = await Autorole.findOne({ serverId });
                    const designatedOwnerId = storedConfig?.ownerId;

                    // Only allow the server owner or designated owner to configure
                    if (memberId !== serverOwnerId && memberId !== designatedOwnerId) {
                        return interaction.reply({
                            content: 'Only the server owner or specified owners can use this command.',
                            flags: 64
                        });
                    }

                    // Check if the role is valid and can be assigned by the bot
                    if (role.position >= guild.members.me.roles.highest.position) {
                        return interaction.reply({
                            content: 'I cannot assign this role as it is higher than or equal to my highest role.',
                            flags: 64
                        });
                    }

                    // Update or create the autorole configuration
                    await Autorole.findOneAndUpdate(
                        { serverId },
                        {
                            serverId,
                            roleId: role.id,
                            status,
                            ownerId: serverOwnerId
                        },
                        { upsert: true, new: true }
                    );

                    const embed = new EmbedBuilder()
                        .setColor('#00ff00')
                        .setTitle('Auto-Role Updated')
                        .setDescription(`Auto-role has been ${status ? 'enabled' : 'disabled'} for ${role}`)
                        .addFields(
                            { name: 'Role', value: `${role}`, inline: true },
                            { name: 'Status', value: status ? 'Enabled' : 'Disabled', inline: true }
                        )
                        .setTimestamp();

                    return interaction.reply({ embeds: [embed], flags: 64 });

                } catch (error) {
                    console.error('Error updating autorole configuration:', error);
                    return interaction.reply({
                        content: 'An error occurred while updating the auto-role configuration.',
                        flags: 64
                    });
                }

            } else if (subcommand === 'view') {
                try {
                    // View the current auto-role configuration
                    const configData = await Autorole.findOne({ serverId });
                    
                    let embed;
                    if (configData) {
                        const role = guild.roles.cache.get(configData.roleId);
                        const roleDisplay = role ? `${role}` : `\`${configData.roleId}\` (Role not found)`;
                        
                        embed = new EmbedBuilder()
                            .setColor('#3498db')
                            .setTitle('Auto-Role Configuration')
                            .addFields(
                                { name: 'Status', value: configData.status ? '✅ Enabled' : '❌ Disabled', inline: true },
                                { name: 'Role', value: roleDisplay, inline: true },
                                { name: 'Owner', value: `<@${configData.ownerId}>`, inline: true }
                            )
                            .setTimestamp();
                    } else {
                        embed = new EmbedBuilder()
                            .setColor('#ff9900')
                            .setTitle('Auto-Role Configuration')
                            .setDescription('No auto-role configuration found for this server.\nPlease set it up using `/setup-autorole set`.')
                            .setTimestamp();
                    }

                    return interaction.reply({ embeds: [embed], flags: 64 });

                } catch (error) {
                    console.error('Error fetching autorole configuration:', error);
                    return interaction.reply({
                        content: 'An error occurred while fetching the auto-role configuration.',
                        flags: 64
                    });
                }
            }
        } else {
            // If not used as a slash command, alert the user
            const embed = new EmbedBuilder()
                .setColor('#3498db')
                .setAuthor({ 
                    name: "Alert!", 
                    iconURL: cmdIcons.dotIcon,
                    url: "https://discord.gg/xQF9f9yUEM"
                })
                .setDescription('- This command can only be used through slash commands!\n- Please use `/setup-autorole`')
                .setTimestamp();
    
            await interaction.reply({ embeds: [embed] });
        }
    }
};