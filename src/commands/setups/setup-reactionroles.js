// commands/setup-reactionroles.js
const { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  MessageFlags
} = require('discord.js');
const ReactionRole = require('../../models/reactionroles/schema');
const { v4: uuidv4 } = require('uuid');
const checkPermissions = require('../../utils/checkPermissions');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-reactionroles')
    .setDescription('Manage reaction role systems')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand(subcommand =>
      subcommand
        .setName('create')
        .setDescription('Create a new reaction role setup')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('Channel to send the reaction role message')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all reaction role setups in this server')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('delete')
        .setDescription('Delete a reaction role setup')
        .addStringOption(option =>
          option.setName('setup_id')
            .setDescription('The setup ID to delete')
            .setRequired(true)
            .setAutocomplete(true)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
        if (!await checkPermissions(interaction)) return;
    switch (subcommand) {
      case 'create':
        await this.handleCreate(interaction);
        break;
      case 'list':
        await this.handleList(interaction);
        break;
      case 'delete':
        await this.handleDelete(interaction);
        break;
    }
  },

  async handleCreate(interaction) {
    const channel = interaction.options.getChannel('channel');
    
    if (!channel.isTextBased()) {
      return interaction.reply({
        content: '❌ Please select a text channel.',
        flags: MessageFlags.Ephemeral
      });
    }

    // Create setup in database
    const setupId = uuidv4();
    const setup = new ReactionRole({
      setupId,
      guildId: interaction.guild.id,
      channelId: channel.id,
      messageId: '', // Will be set after message is sent
      title: '',
      description: '',
      color: '#6366f1',
      type: '',
      menuConfig: {
        placeholder: 'Select your roles...',
        minValues: 1,
        maxValues: 1
      },
      roles: [],
      createdBy: interaction.user.id,
      updatedBy: interaction.user.id
    });

    // Create initial embed
    const embed = new EmbedBuilder()
      .setTitle('🔧 Reaction Role Setup')
      .setDescription('**Step-by-step setup:**\n\n1️⃣ Set title and color\n2️⃣ Set description\n3️⃣ Choose type (buttons/menu)\n4️⃣ Add roles (up to 5)\n5️⃣ Finish setup')
      .setColor('#6366f1')
      .setFooter({
        text: `Setup ID: ${setupId} • Click buttons below to configure`,
        iconURL: interaction.guild.iconURL()
      })
      .setTimestamp();

    // Create setup management buttons
    const setupButtons = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`rr_setup_title_${setupId}`)
          .setLabel('1. Title & Color')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('📝'),
        new ButtonBuilder()
          .setCustomId(`rr_setup_description_${setupId}`)
          .setLabel('2. Description')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('📄'),
        new ButtonBuilder()
          .setCustomId(`rr_setup_type_${setupId}`)
          .setLabel('3. Type')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('⚙️'),
        new ButtonBuilder()
          .setCustomId(`rr_setup_addrole_${setupId}`)
          .setLabel('4. Add Role')
          .setStyle(ButtonStyle.Success)
          .setEmoji('➕')
      );

    const actionButtons = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`rr_setup_finish_${setupId}`)
          .setLabel('5. Finish Setup')
          .setStyle(ButtonStyle.Success)
          .setEmoji('✅')
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId(`rr_setup_cancel_${setupId}`)
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('❌')
      );

    const message = await channel.send({
      embeds: [embed],
      components: [setupButtons, actionButtons]
    });

    setup.messageId = message.id;
    await setup.save();

    await interaction.reply({
      content: `✅ Reaction role setup started in ${channel}!\n\n**Setup ID:** \`${setupId}\`\n\nFollow the steps on the message to configure your reaction roles.`,
      flags: MessageFlags.Ephemeral
    });
  },

  async handleList(interaction) {
    const setups = await ReactionRole.find({ guildId: interaction.guild.id });

    if (setups.length === 0) {
      return interaction.reply({
        content: '❌ No reaction role setups found in this server.',
        flags: MessageFlags.Ephemeral
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('📋 Reaction Role Setups')
      .setColor('#3b82f6')
      .setTimestamp();

    const setupsList = setups.map(setup => {
      const channel = interaction.guild.channels.cache.get(setup.channelId);
      const channelText = channel ? `<#${channel.id}>` : 'Unknown Channel';
      
      return `**${setup.title || 'Untitled Setup'}**\n` +
             `ID: \`${setup.setupId}\`\n` +
             `Channel: ${channelText}\n` +
             `Roles: ${setup.roles.length}/5\n` +
             `Type: ${setup.type || 'Not set'}\n` +
             `Stats: ${setup.stats.totalInteractions} interactions`;
    }).join('\n\n');

    embed.setDescription(setupsList);

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral
    });
  },

  async handleDelete(interaction) {
    const setupId = interaction.options.getString('setup_id');
    const setup = await ReactionRole.findOne({
      setupId,
      guildId: interaction.guild.id
    });

    if (!setup) {
      return interaction.reply({
        content: '❌ Setup not found.',
        flags: MessageFlags.Ephemeral
      });
    }

    // Delete the message if it exists
    const channel = interaction.guild.channels.cache.get(setup.channelId);
    if (channel) {
      const message = await channel.messages.fetch(setup.messageId).catch(() => null);
      if (message) {
        await message.delete().catch(() => {});
      }
    }

    // Delete from database
    await ReactionRole.deleteOne({ _id: setup._id });

    await interaction.reply({
      content: `✅ Reaction role setup **${setup.title || 'Untitled'}** has been deleted.`,
      flags: MessageFlags.Ephemeral
    });
  },

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused();
    const setups = await ReactionRole.find({
      guildId: interaction.guild.id
    }).limit(25);

    const filtered = setups.filter(setup =>
      (setup.title && setup.title.toLowerCase().includes(focusedValue.toLowerCase())) ||
      setup.setupId.toLowerCase().includes(focusedValue.toLowerCase())
    );

    await interaction.respond(
      filtered.map(setup => ({
        name: `${setup.title || 'Untitled'} (${setup.roles.length} roles)`,
        value: setup.setupId
      }))
    );
  }
};
