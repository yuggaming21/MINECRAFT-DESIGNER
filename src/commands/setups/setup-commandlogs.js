const checkPermissions = require('../../utils/checkPermissions');
const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const CommandLogsConfig = require('../../models/commandLogs/commandlogs'); // Adjust path as needed
const cmdIcons = require('../../UI/icons/commandicons');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-commandlogs')
    .setDescription('Manage command logging configuration.')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
    // Subcommand: set
    .addSubcommand(subcommand =>
      subcommand
        .setName('set')
        .setDescription('Enable or disable command logging.')
        .addBooleanOption(option =>
          option
            .setName('enabled')
            .setDescription('Set to true to enable logging, false to disable.')
            .setRequired(true)
        )
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('The channel to send command execution logs (required when enabling).')
            .setRequired(false)
        )
    )
    // Subcommand: view
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View the current command logging configuration.')
    ),
  async execute(interaction) {

    if (interaction.isCommand && interaction.isCommand()) {
      
      const subcommand = interaction.options.getSubcommand();
      const { guild } = interaction;
      if (!guild) {
        return interaction.reply({ content: 'This command can only be used in a server.', flags: 64 });
      }
      const guildId = guild.id;
      if (!await checkPermissions(interaction)) return;

      if (subcommand === 'set') {
        if (!await checkPermissions(interaction)) return;
        
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
          const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setDescription('You do not have permission to use this command.');
          return interaction.reply({ embeds: [embed], flags: 64 });
        }

        const enabled = interaction.options.getBoolean('enabled');
        const channel = interaction.options.getChannel('channel');

        try {
          if (enabled) {
            if (!channel) {
              return interaction.reply({ content: 'Please provide a channel when enabling command logging.', flags: 64 });
            }
          
            if (!channel.isTextBased()) {
              return interaction.reply({ content: 'Please select a text-based channel.', flags: 64 });
            }

            // Use Mongoose findOneAndUpdate with upsert
            await CommandLogsConfig.findOneAndUpdate(
              { guildId },
              { 
                guildId,
                channelId: channel.id, 
                enabled: true
              },
              { 
                upsert: true, 
                new: true,
                setDefaultsOnInsert: true
              }
            );

            return interaction.reply({
              content: `Command execution logs have been **enabled** and will now be sent to <#${channel.id}>.`,
              flags: 64,
            });
          } else {
            // Disable logging
            await CommandLogsConfig.findOneAndUpdate(
              { guildId },
              { 
                guildId,
                enabled: false
              },
              { 
                upsert: true, 
                new: true,
                setDefaultsOnInsert: true
              }
            );

            return interaction.reply({
              content: 'Command execution logging has been **disabled** for this server.',
              flags: 64,
            });
          }
        } catch (error) {
          console.error('Error updating command logs configuration:', error);
          const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setDescription('An error occurred while updating the configuration.');
          return interaction.reply({ embeds: [embed], flags: 64 });
        }
      }

      else if (subcommand === 'view') {
        if (!await checkPermissions(interaction)) return;
        
        try {
          const config = await CommandLogsConfig.findOne({ guildId });
          const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('Command Logging Configuration')
            .setTimestamp();

          if (!config || config.enabled === false) {
            embed.setDescription('Command logging is currently **disabled** for this server.');
          } else {
            embed.setDescription('Command logging is **enabled** for this server.')
              .addFields(
                { name: 'Log Channel', value: `<#${config.channelId}>`, inline: true },
                { name: 'Status', value: 'Enabled', inline: true }
              );
          }

          return interaction.reply({ embeds: [embed], flags: 64 });
        } catch (error) {
          console.error('Error fetching command logs configuration:', error);
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
          .setDescription('- This command can only be used through slash commands!\n- Please use `/setup-commandlogs`')
          .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }
  },
};