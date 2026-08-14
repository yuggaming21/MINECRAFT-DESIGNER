const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ChannelSelectMenuBuilder, ChannelType, RoleSelectMenuBuilder } = require('discord.js');
const { VoiceChannelModel} = require('../../models/autoVoice/schema');
const { sendOrUpdateCentralizedEmbed, loadConfig } = require('../../events/voiceChannelHandler');
const checkPermissions = require('../../utils/checkPermissions');
const cmdIcons = require('../../UI/icons/commandicons');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('setup-autovoice')
    .setDescription('Set up or manage auto voice channels')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels)
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Set up auto voice channels')
        .addChannelOption(option =>
          option.setName('voice_channel')
            .setDescription('The main voice channel users will join to create their own channel')
            .addChannelTypes(ChannelType.GuildVoice)
            .setRequired(true))
        .addChannelOption(option =>
          option.setName('manager_channel')
            .setDescription('The text channel where management controls will be displayed')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true))
        .addBooleanOption(option =>
          option.setName('status')
            .setDescription('Enable or disable auto voice channels')
            .setRequired(true))
        .addRoleOption(option =>
          option.setName('required_role')
            .setDescription('Role required to create voice channels (leave empty for everyone)')
            .setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('view')
        .setDescription('View current auto voice channel settings')),


  async execute(interaction) {
    if (interaction.isCommand && interaction.isCommand()) {
    const guild = interaction.guild;
    const serverID = guild.id;

    if (!await checkPermissions(interaction)) return;
    const subcommand = interaction.options.getSubcommand();
    
    if (subcommand === 'set') {
      const voiceChannel = interaction.options.getChannel('voice_channel');
      const managerChannel = interaction.options.getChannel('manager_channel');
      const requiredRole = interaction.options.getRole('required_role');
      const status = interaction.options.getBoolean('status');
      
      const allowedRoleIds = requiredRole ? [requiredRole.id] : [];
      
      // Update or create the configuration
      await VoiceChannelModel.findOneAndUpdate(
        { serverId: serverID },
        {
          serverId: serverID,
          voiceChannelId: voiceChannel.id,
          managerChannelId: managerChannel.id,
          allowedRoleIds: allowedRoleIds,
          status: status,
          ownerId: guild.ownerId
        },
        { upsert: true, new: true }
      );
      
      // Reload config and update the embeds
      await loadConfig();
      await sendOrUpdateCentralizedEmbed(interaction.client, guild);
      
      const roleText = requiredRole ? `Required role: ${requiredRole.name}` : 'No required role (all members can create channels)';
      
      return interaction.reply({
        content: `✅ Auto voice channels have been ${status ? 'enabled' : 'disabled'}!\n\nMain channel: ${voiceChannel.name}\nManager channel: ${managerChannel.name}\n${roleText}`,
        ephemeral: true
      });
    } else if (subcommand === 'view') {
      const config = await VoiceChannelModel.findOne({ serverId: serverID });
      
      if (!config) {
        return interaction.reply({
          content: 'No auto voice configuration found for this server.',
          ephemeral: true
        });
      }
      
      const voiceChannel = guild.channels.cache.get(config.voiceChannelId) || 'Channel not found';
      const managerChannel = guild.channels.cache.get(config.managerChannelId) || 'Channel not found';
      
      let roleText = 'None (all members can create channels)';
      if (config.allowedRoleIds && config.allowedRoleIds.length > 0) {
        const roles = config.allowedRoleIds.map(roleId => {
          const role = guild.roles.cache.get(roleId);
          return role ? role.name : 'Unknown role';
        }).join(', ');
        roleText = roles;
      }
      
      const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('Auto Voice Channel Configuration')
        .addFields(
          { name: 'Status', value: config.status ? '✅ Enabled' : '❌ Disabled', inline: true },
          { name: 'Main Voice Channel', value: typeof voiceChannel === 'string' ? voiceChannel : voiceChannel.name, inline: true },
          { name: 'Manager Channel', value: typeof managerChannel === 'string' ? managerChannel : managerChannel.name, inline: true },
          { name: 'Required Role(s)', value: roleText, inline: false }
        )
        .setTimestamp();
      
      return interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
    }
  } else {
    const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setAuthor({ 
            name: "Alert!", 
            iconURL: cmdIcons.dotIcon,
            url: "https://discord.gg/xQF9f9yUEM"
        })
        .setDescription('- This command can only be used through slash commands!\n- Please use `/setup-autovoice`')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}
  }
};