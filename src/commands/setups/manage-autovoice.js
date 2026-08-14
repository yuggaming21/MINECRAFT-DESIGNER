/*
 ██████╗ ██╗      █████╗  ██████╗███████╗██╗   ██╗████████╗
██╔════╝ ██║     ██╔══██╗██╔════╝██╔════╝╚██╗ ██╔╝╚══██╔══╝
██║  ███╗██║     ███████║██║     █████╗   ╚████╔╝    ██║   
██║   ██║██║     ██╔══██║██║     ██╔══╝    ╚██╔╝     ██║   
╚██████╔╝███████╗██║  ██║╚██████╗███████╗   ██║      ██║   
 ╚═════╝ ╚══════╝╚═╝  ╚═╝ ╚═════╝╚══════╝   ╚═╝      ╚═╝   

-------------------------------------
📡 Discord : https://discord.gg/xQF9f9yUEM
🌐 Website : https://glaceyt.com
🎥 YouTube : https://youtube.com/@GlaceYT
✅ Verified | 🧩 Tested | ⚙️ Stable
-------------------------------------
> © 2025 GlaceYT.com | All rights reserved.
*/
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { VoiceChannelModel, ServerConfigModel } = require('../../models/autoVoice/schema');
const { loadConfig, sendOrUpdateCentralizedEmbed } = require('../../events/voiceChannelHandler');
const checkPermissions = require('../../utils/checkPermissions');
const cmdIcons = require('../../UI/icons/commandicons');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('manage-autovoice')
    .setDescription('Manage auto voice channel settings')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels)
    .addSubcommand(sub =>
      sub.setName('add-role')
        .setDescription('Add a role that can create voice channels')
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('The role to add')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('remove-role')
        .setDescription('Remove a role from being able to create voice channels')
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('The role to remove')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('list-roles')
        .setDescription('List all roles that can create voice channels'))
    .addSubcommand(sub =>
      sub.setName('clear-roles')
        .setDescription('Clear all required roles (allows everyone to create channels)')),

  async execute(interaction) {
    if (interaction.isCommand && interaction.isCommand()) {
    const guild = interaction.guild;
    const serverID = interaction.guild.id;
    
   
    if (!await checkPermissions(interaction)) return;
    
   
    const config = await VoiceChannelModel.findOne({ serverId: serverID });
    if (!config) {
      return interaction.reply({
        content: '❌ No auto voice configuration found for this server. Please use `/setup-autovoice set` first.',
        ephemeral: true
      });
    }
    
    const subcommand = interaction.options.getSubcommand();
    
    switch (subcommand) {
      case 'add-role': {
        const role = interaction.options.getRole('role');
        const allowedRoleIds = config.allowedRoleIds || [];
        
        if (allowedRoleIds.includes(role.id)) {
          return interaction.reply({
            content: `Role ${role.name} is already allowed to create voice channels.`,
            ephemeral: true
          });
        }
        
        allowedRoleIds.push(role.id);
        
        await VoiceChannelModel.updateOne(
          { serverId: serverID },
          { $set: { allowedRoleIds: allowedRoleIds } }
        );
        
        await loadConfig();
        
        return interaction.reply({
          content: `✅ Role ${role.name} can now create voice channels.`,
          ephemeral: true
        });
      }
      
      case 'remove-role': {
        const role = interaction.options.getRole('role');
        const allowedRoleIds = config.allowedRoleIds || [];
        
        if (!allowedRoleIds.includes(role.id)) {
          return interaction.reply({
            content: `Role ${role.name} is not in the allowed roles list.`,
            ephemeral: true
          });
        }
        
        const updatedRoles = allowedRoleIds.filter(id => id !== role.id);
        
        await VoiceChannelModel.updateOne(
          { serverId: serverID },
          { $set: { allowedRoleIds: updatedRoles } }
        );
        
        await loadConfig();
        
        return interaction.reply({
          content: `✅ Role ${role.name} removed from allowed roles list.`,
          ephemeral: true
        });
      }
      
      case 'list-roles': {
        const allowedRoleIds = config.allowedRoleIds || [];
        
        if (allowedRoleIds.length === 0) {
          return interaction.reply({
            content: 'No specific roles are required - any member can create voice channels.',
            ephemeral: true
          });
        }
        
        const rolesList = allowedRoleIds.map(roleId => {
          const role = guild.roles.cache.get(roleId);
          return role ? `- ${role.name}` : `- Unknown Role (${roleId})`;
        }).join('\n');
        
        const embed = new EmbedBuilder()
          .setColor('#3498db')
          .setTitle('Roles That Can Create Voice Channels')
          .setDescription(rolesList)
          .setTimestamp();
        
        return interaction.reply({
          embeds: [embed],
          ephemeral: true
        });
      }
      
      case 'clear-roles': {
        await VoiceChannelModel.updateOne(
          { serverId: serverID },
          { $set: { allowedRoleIds: [] } }
        );
        
        await loadConfig();
        
        return interaction.reply({
          content: '✅ All role requirements have been removed. Anyone can now create voice channels.',
          ephemeral: true
        });
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
        .setDescription('- This command can only be used through slash commands!\n- Please use `/manage-autovoice`')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}
  }
};

/*
 ██████╗ ██╗      █████╗  ██████╗███████╗██╗   ██╗████████╗
██╔════╝ ██║     ██╔══██╗██╔════╝██╔════╝╚██╗ ██╔╝╚══██╔══╝
██║  ███╗██║     ███████║██║     █████╗   ╚████╔╝    ██║   
██║   ██║██║     ██╔══██║██║     ██╔══╝    ╚██╔╝     ██║   
╚██████╔╝███████╗██║  ██║╚██████╗███████╗   ██║      ██║   
 ╚═════╝ ╚══════╝╚═╝  ╚═╝ ╚═════╝╚══════╝   ╚═╝      ╚═╝   

-------------------------------------
📡 Discord : https://discord.gg/xQF9f9yUEM
🌐 Website : https://glaceyt.com
🎥 YouTube : https://youtube.com/@GlaceYT
✅ Verified | 🧩 Tested | ⚙️ Stable
-------------------------------------
> © 2025 GlaceYT.com | All rights reserved.
*/