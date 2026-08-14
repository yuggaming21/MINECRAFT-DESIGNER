const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const NqnConfig = require('../../models/nqn/nqnSchema'); // Import the schema
const ServerConfig = require('../../models/serverConfig/schema'); // Assuming you have this schema too
const cmdIcons = require('../../UI/icons/commandicons');
const checkPermissions = require('../../utils/checkPermissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-nqn')
        .setDescription('Configure or view NQN status for a server')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels)
        // Subcommand for setting the NQN status
        .addSubcommand(sub =>
            sub
                .setName('set')
                .setDescription('Enable or disable NQN')
                .addBooleanOption(option =>
                    option.setName('status')
                        .setDescription('Enable or disable NQN')
                        .setRequired(true))
        )
        // Subcommand for viewing the current NQN status
        .addSubcommand(sub =>
            sub
                .setName('view')
                .setDescription('View the current NQN status')
        ),

    async execute(interaction) {
        if (interaction.isCommand && interaction.isCommand()) {
            const guild = interaction.guild;
            const serverId = interaction.guild.id;
            
            if (!await checkPermissions(interaction)) return;
            
            const subcommand = interaction.options.getSubcommand();

            if (subcommand === 'set') {
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                    const embed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setDescription('You do not have permission to use this command.');
                    return interaction.reply({ embeds: [embed], flags: 64 });
                }

                const status = interaction.options.getBoolean('status');
                const serverOwnerId = guild.ownerId;

                try {
                    // Use findOneAndUpdate with upsert option
                    const updatedConfig = await NqnConfig.findOneAndUpdate(
                        { serverId: serverId },
                        { 
                            serverId: serverId, 
                            status, 
                            ownerId: serverOwnerId 
                        },
                        { 
                            upsert: true, 
                            new: true,
                            runValidators: true 
                        }
                    );

                    const statusText = status ? 'enabled' : 'disabled';
                    return interaction.reply({
                        content: `✅ NQN has been **${statusText}** for this server.`,
                        flags: 64
                    });
                } catch (error) {
                    console.error('Error updating NQN config:', error);
                    return interaction.reply({
                        content: '❌ An error occurred while updating the NQN configuration.',
                        flags: 64
                    });
                }

            } else if (subcommand === 'view') {
                try {
                    // Get server config for bot managers check
                    const configManagerData = await ServerConfig.findOne({ serverId });
                    const botManagers = configManagerData ? configManagerData.botManagers || [] : [];
              
                    if (!botManagers.includes(interaction.user.id) && interaction.user.id !== guild.ownerId) {
                        return interaction.reply({ 
                            content: '❌ Only the **server owner** or **bot managers** can use this command.', 
                            flags: 64
                        });
                    }

                    // Get NQN configuration
                    const configData = await NqnConfig.findOne({ serverId: serverId });
                    
                    let description;
                    if (configData) {
                        const statusEmoji = configData.status ? '🟢' : '🔴';
                        const statusText = configData.status ? 'Enabled' : 'Disabled';
                        description = `${statusEmoji} **Status:** ${statusText}\n👑 **Owner ID:** ${configData.ownerId}\n⏰ **Last Updated:** <t:${Math.floor(configData.updatedAt.getTime() / 1000)}:R>`;
                    } else {
                        description = '⚠️ No configuration found for NQN. Please set it up using `/setup-nqn set`.';
                    }

                    const embed = new EmbedBuilder()
                        .setColor(configData && configData.status ? '#00ff00' : '#ff0000')
                        .setTitle('🛠️ NQN Status Configuration')
                        .setDescription(description)
                        .setFooter({ text: `Server ID: ${serverId}` })
                        .setTimestamp();

                    return interaction.reply({ embeds: [embed], flags: 64 });
                } catch (error) {
                    console.error('Error retrieving NQN config:', error);
                    return interaction.reply({
                        content: '❌ An error occurred while retrieving the NQN configuration.',
                        flags: 64
                    });
                }
            }
        } else {
            // If not used as a slash command, send an alert embed.
            const embed = new EmbedBuilder()
                .setColor('#3498db')
                .setAuthor({
                    name: "Alert!",
                    iconURL: cmdIcons.dotIcon,
                    url: "https://discord.gg/xQF9f9yUEM"
                })
                .setDescription('- This command can only be used through slash commands!\n- Please use `/setup-nqn`')
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        }
    }
};