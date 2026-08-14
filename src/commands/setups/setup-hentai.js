const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const HentaiConfig = require('../../models/hentai/hentaiSchema'); // Adjust path as needed
const cmdIcons = require('../../UI/icons/commandicons');
const checkPermissions = require('../../utils/checkPermissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-hentai')
        .setDescription('Configure or view hentai commands configuration')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels)
        // Subcommand to set (enable/disable) hentai commands.
        .addSubcommand(sub =>
            sub
                .setName('set')
                .setDescription('Enable or disable hentai commands')
                .addBooleanOption(option =>
                    option.setName('status')
                        .setDescription('Enable (true) or disable (false) hentai commands')
                        .setRequired(true))
        )
        // Subcommand to view the current configuration.
        .addSubcommand(sub =>
            sub
                .setName('view')
                .setDescription('View the current hentai commands configuration')
        ),

    async execute(interaction) {
        if (interaction.isCommand && interaction.isCommand()) {
            const subcommand = interaction.options.getSubcommand();
            const serverId = interaction.guild.id;
            const guild = interaction.guild;
            
            if (!await checkPermissions(interaction)) return;
            
            if (subcommand === 'set') {
                // Permission check
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                    const embed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setDescription('You do not have permission to use this command.');
                    return interaction.reply({ embeds: [embed], flags: 64 });
                }
                
                const status = interaction.options.getBoolean('status');
                if (status === null) {
                    return interaction.reply({
                        content: 'Invalid input. Please provide a valid status.',
                        flags: 64
                    });
                }
                
                const serverOwnerId = guild.ownerId;
                
                try {
                    // Use findOneAndUpdate with upsert option for Mongoose
                    await HentaiConfig.findOneAndUpdate(
                        { serverId },
                        { 
                            serverId, 
                            status, 
                            ownerId: serverOwnerId 
                        },
                        { 
                            upsert: true, 
                            new: true,
                            setDefaultsOnInsert: true
                        }
                    );
                    
                    return interaction.reply({
                        content: `Hentai commands have been ${status ? '**enabled**' : '**disabled**'} for server ID ${serverId}.`,
                        flags: 64
                    });
                } catch (error) {
                    console.error('Error updating hentai configuration:', error);
                    const embed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setDescription('An error occurred while updating the configuration.');
                    return interaction.reply({ embeds: [embed], flags: 64 });
                }
                
            } else if (subcommand === 'view') {
                try {
                    const configData = await HentaiConfig.findOne({ serverId });
                    let description;
                    
                    if (configData) {
                        description = `**Status:** ${configData.status ? 'Enabled' : 'Disabled'}\n**Owner ID:** ${configData.ownerId}`;
                    } else {
                        description = 'No configuration found. Please set up hentai commands using `/setup-hentai set`.';
                    }
                    
                    const embed = new EmbedBuilder()
                        .setColor('#3498db')
                        .setTitle('Hentai Commands Configuration')
                        .setDescription(description)
                        .setTimestamp();
                        
                    return interaction.reply({ embeds: [embed], flags: 64 });
                } catch (error) {
                    console.error('Error fetching hentai configuration:', error);
                    const embed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setDescription('An error occurred while fetching the configuration.');
                    return interaction.reply({ embeds: [embed], flags: 64 });
                }
            }
        } else {
            const embed = new EmbedBuilder()
                .setColor('#3498db')
                .setAuthor({ 
                    name: "Alert!", 
                    iconURL: cmdIcons.dotIcon,
                    url: "https://discord.gg/xQF9f9yUEM"
                })
                .setDescription('- This command can only be used through slash commands!\n- Please use `/setup-hentai`')
                .setTimestamp();
    
            await interaction.reply({ embeds: [embed] });
        }
    }
};