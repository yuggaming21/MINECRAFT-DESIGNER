const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const StickyMessage = require('../../models/stickymessage/Schema');
const cmdIcons = require('../../UI/icons/commandicons');
const checkPermissions = require('../../utils/checkPermissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-stickymessage')
        .setDescription('Advanced sticky message management system.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels)

        // Create new sticky message
        .addSubcommand(sub =>
            sub.setName('create')
                .setDescription('Create a new sticky message with advanced customization.')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Select the channel for the sticky message')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Message type')
                        .addChoices(
                            { name: '📝 Text Only', value: 'text' },
                            { name: '📋 Embed Only', value: 'embed' },
                            { name: '📝📋 Both Text & Embed', value: 'both' }
                        )
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('timer-mode')
                        .setDescription('How should the sticky message be triggered?')
                        .addChoices(
                            { name: '💬 After X Messages', value: 'message' },
                            { name: '⏰ Every X Minutes', value: 'time' }
                        )
                        .setRequired(true))
        )

        // Configure text content
        .addSubcommand(sub =>
            sub.setName('config-text')
                .setDescription('Configure text content for sticky message.')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Select the channel')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('content')
                        .setDescription('The text content of the sticky message')
                        .setRequired(true))
        )

        // Advanced embed configuration
        .addSubcommand(sub =>
            sub.setName('config-embed')
                .setDescription('Configure advanced embed customization.')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Select the channel')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('title')
                        .setDescription('Embed title')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Embed description')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('color')
                        .setDescription('Embed color (hex code like #ff0000)')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('author-name')
                        .setDescription('Author name')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('author-icon')
                        .setDescription('Author icon URL')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('author-url')
                        .setDescription('Author clickable URL')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('footer-text')
                        .setDescription('Footer text')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('footer-icon')
                        .setDescription('Footer icon URL')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('image')
                        .setDescription('Large image URL')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('thumbnail')
                        .setDescription('Thumbnail image URL')
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('timestamp')
                        .setDescription('Show timestamp?')
                        .setRequired(false))
        )

        // Dynamic field management
        .addSubcommand(sub =>
            sub.setName('config-fields')
                .setDescription('Add/manage embed fields (up to 3 fields per command).')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Select the channel')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Action to perform')
                        .addChoices(
                            { name: 'Add Fields', value: 'add' },
                            { name: 'Clear All Fields', value: 'clear' }
                        )
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('field1-name')
                        .setDescription('Field 1 name')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('field1-value')
                        .setDescription('Field 1 value')
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('field1-inline')
                        .setDescription('Field 1 inline?')
                        .setRequired(false))
        )

        // Smart timing configuration
        .addSubcommand(sub =>
            sub.setName('config-timing')
                .setDescription('Configure smart timing settings.')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Select the channel')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('message-count')
                        .setDescription('Send sticky after X messages (1-50)')
                        .setMinValue(1)
                        .setMaxValue(50)
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName('timer-minutes')
                        .setDescription('Send sticky every X minutes (1-1440)')
                        .setMinValue(1)
                        .setMaxValue(1440)
                        .setRequired(false))
        )

        // Preview system
        .addSubcommand(sub =>
            sub.setName('preview')
                .setDescription('Preview how your sticky message will look.')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Select the channel')
                        .setRequired(true))
        )

        // Toggle activation
        .addSubcommand(sub =>
            sub.setName('toggle')
                .setDescription('Enable/disable sticky message.')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Select the channel')
                        .setRequired(true))
                .addBooleanOption(option =>
                    option.setName('active')
                        .setDescription('Activate the sticky message?')
                        .setRequired(true))
        )

        // List all stickies
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('View all sticky messages for this server.')
        )

        // Delete sticky
        .addSubcommand(sub =>
            sub.setName('delete')
                .setDescription('Delete a sticky message.')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Select the channel')
                        .setRequired(true))
        ),

   async execute(interaction) {
    if (!await checkPermissions(interaction)) return;

    const serverId = interaction.guild.id;
    const subcommand = interaction.options.getSubcommand();
    const channel = interaction.options.getChannel('channel');

    try {
        switch (subcommand) {
            case 'create':
                await handleCreate(interaction, serverId, channel);
                break;
            case 'config-text':
                await handleConfigText(interaction, serverId, channel);
                break;
            case 'config-embed':
                await handleConfigEmbed(interaction, serverId, channel);
                break;
            case 'config-fields':
                await handleConfigFields(interaction, serverId, channel);
                break;
            case 'config-timing':
                await handleConfigTiming(interaction, serverId, channel);
                break;
            case 'preview':
                await handlePreview(interaction, serverId, channel);
                break;
            case 'list':
                await handleList(interaction, serverId);
                break;
            case 'toggle':
                await handleToggle(interaction, serverId, channel);
                break;
            case 'delete':
                await handleDelete(interaction, serverId, channel);
                break;
            default:
                await interaction.reply({
                    content: '❌ Unknown subcommand!',
                    flags: 64
                });
        }
    } catch (error) {
        console.error('Sticky message command error:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Error')
            .setDescription('An error occurred while processing your request.')
            .setTimestamp();
        
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ embeds: [errorEmbed] });
        } else {
            await interaction.reply({ embeds: [errorEmbed], flags: 64 });
        }
    }
}

};

// Handler functions (add these to the same file)
async function handleCreate(interaction, serverId, channel) {
    const type = interaction.options.getString('type');
    const timerMode = interaction.options.getString('timer-mode');

    const existing = await StickyMessage.findOne({ serverId, channelId: channel.id });
    if (existing) {
        return interaction.reply({
            content: `❌ Sticky message already exists for <#${channel.id}>. Use \`/setup-stickymessage delete\` first.`,
            flags: 64
        });
    }

    const stickyMessage = new StickyMessage({
        serverId,
        channelId: channel.id,
        messageType: type,
        timerMode,
        createdBy: interaction.user.id,
        active: false
    });

    await stickyMessage.save();

    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Advanced Sticky Message Created')
        .setDescription(
            `Sticky message created for <#${channel.id}>!\n\n` +
            `**Type:** ${type}\n` +
            `**Timer Mode:** ${timerMode}\n\n` +
            `**Next Steps:**\n` +
            `• Configure your message content\n` +
            `• Set up timing if needed\n` +
            `• Use \`/setup-stickymessage toggle\` to activate`
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: 64 });
}

async function handleList(interaction, serverId) {
    const stickyMessages = await StickyMessage.find({ serverId });

    if (stickyMessages.length === 0) {
        return interaction.reply({ 
            content: 'ℹ️ No sticky messages configured for this server.', 
            flags: 64 
        });
    }

    const embed = new EmbedBuilder()
        .setTitle('📌 Advanced Sticky Messages')
        .setColor('#00e5ff')
        .setDescription(
            stickyMessages.map((msg, index) => {
                const status = msg.active ? '🟢 Active' : '🔴 Inactive';
                const type = msg.messageType.toUpperCase();
                const timer = msg.timerMode === 'message' ? 
                    `After ${msg.messageCount} msg(s)` : 
                    `Every ${Math.floor(msg.timerInterval / 60)}min`;
                
                return `**${index + 1}.** <#${msg.channelId}> - ${status}\n` +
                       `└ Type: ${type} | Timer: ${timer}`;
            }).join('\n\n')
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: 64 });
}
// Add ALL these handler functions to your setup-stickymessage.js file

async function handleConfigText(interaction, serverId, channel) {
    const content = interaction.options.getString('content');

    const updated = await StickyMessage.findOneAndUpdate(
        { serverId, channelId: channel.id },
        { textContent: content },
        { new: true }
    );

    if (!updated) {
        return interaction.reply({
            content: `❌ No sticky message found for <#${channel.id}>. Create one first!`,
            flags: 64
        });
    }

    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Text Content Updated')
        .setDescription(`Text content updated for <#${channel.id}>`)
        .addFields({ name: 'Content', value: content.substring(0, 1000) + (content.length > 1000 ? '...' : '') })
        .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: 64 });
}

async function handleConfigEmbed(interaction, serverId, channel) {
    const updates = {};
    
    // Collect all embed options
    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description');
    const color = interaction.options.getString('color');
    const authorName = interaction.options.getString('author-name');
    const authorIcon = interaction.options.getString('author-icon');
    const authorUrl = interaction.options.getString('author-url');
    const footerText = interaction.options.getString('footer-text');
    const footerIcon = interaction.options.getString('footer-icon');
    const image = interaction.options.getString('image');
    const thumbnail = interaction.options.getString('thumbnail');
    const timestamp = interaction.options.getBoolean('timestamp');
    
    // Build embed update object
    if (title !== null) updates['embed.title'] = title;
    if (description !== null) updates['embed.description'] = description;
    if (color !== null) {
        // Validate hex color
        const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        if (hexRegex.test(color)) {
            updates['embed.color'] = color;
        } else {
            return interaction.reply({
                content: '❌ Invalid color format. Please use hex format like #ff0000',
                flags: 64
            });
        }
    }
    
    if (authorName !== null) updates['embed.author.name'] = authorName;
    if (authorIcon !== null) updates['embed.author.iconURL'] = authorIcon;
    if (authorUrl !== null) updates['embed.author.url'] = authorUrl;
    if (footerText !== null) updates['embed.footer.text'] = footerText;
    if (footerIcon !== null) updates['embed.footer.iconURL'] = footerIcon;
    if (image !== null) updates['embed.image'] = image;
    if (thumbnail !== null) updates['embed.thumbnail'] = thumbnail;
    if (timestamp !== null) updates['embed.timestamp'] = timestamp;
    
    const updated = await StickyMessage.findOneAndUpdate(
        { serverId, channelId: channel.id },
        { $set: updates },
        { new: true }
    );
    
    if (!updated) {
        return interaction.reply({
            content: `❌ No sticky message found for <#${channel.id}>. Create one first!`,
            flags: 64
        });
    }
    
    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Embed Configuration Updated')
        .setDescription(`Embed settings updated for <#${channel.id}>`)
        .addFields(
            Object.entries(updates).slice(0, 5).map(([key, value]) => ({
                name: key.replace('embed.', '').replace('.', ' '),
                value: String(value).substring(0, 100) + (String(value).length > 100 ? '...' : ''),
                inline: true
            }))
        )
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed], flags: 64 });
}

async function handleConfigFields(interaction, serverId, channel) {
    const action = interaction.options.getString('action');
    
    if (action === 'clear') {
        const updated = await StickyMessage.findOneAndUpdate(
            { serverId, channelId: channel.id },
            { $set: { 'embed.fields': [] } },
            { new: true }
        );
        
        if (!updated) {
            return interaction.reply({
                content: `❌ No sticky message found for <#${channel.id}>. Create one first!`,
                flags: 64
            });
        }
        
        return interaction.reply({
            content: `✅ All embed fields cleared for <#${channel.id}>`,
            flags: 64
        });
    }
    
    // Add fields
    const fields = [];
    const name = interaction.options.getString('field1-name');
    const value = interaction.options.getString('field1-value');
    const inline = interaction.options.getBoolean('field1-inline') || false;
    
    if (name && value) {
        fields.push({ name, value, inline });
    }
    
    if (fields.length === 0) {
        return interaction.reply({
            content: '❌ Please provide at least one field with both name and value.',
            flags: 64
        });
    }
    
    const updated = await StickyMessage.findOneAndUpdate(
        { serverId, channelId: channel.id },
        { $push: { 'embed.fields': { $each: fields } } },
        { new: true }
    );
    
    if (!updated) {
        return interaction.reply({
            content: `❌ No sticky message found for <#${channel.id}>. Create one first!`,
            flags: 64
        });
    }
    
    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Fields Added')
        .setDescription(`${fields.length} field(s) added to <#${channel.id}>`)
        .addFields(fields)
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed], flags: 64 });
}

async function handleConfigTiming(interaction, serverId, channel) {
    const messageCount = interaction.options.getInteger('message-count');
    const timerMinutes = interaction.options.getInteger('timer-minutes');
    
    const updates = {};
    
    if (messageCount !== null) {
        updates.messageCount = messageCount;
        updates.currentMessageCount = 0; // Reset counter
    }
    
    if (timerMinutes !== null) {
        updates.timerInterval = timerMinutes * 60; // Convert to seconds
        updates.lastSent = new Date(); // Reset timer
    }
    
    if (Object.keys(updates).length === 0) {
        return interaction.reply({
            content: '❌ Please specify either message count or timer minutes.',
            flags: 64
        });
    }
    
    const updated = await StickyMessage.findOneAndUpdate(
        { serverId, channelId: channel.id },
        { $set: updates },
        { new: true }
    );
    
    if (!updated) {
        return interaction.reply({
            content: `❌ No sticky message found for <#${channel.id}>. Create one first!`,
            flags: 64
        });
    }
    
    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('⏰ Timing Configuration Updated')
        .setDescription(`Timing settings updated for <#${channel.id}>`)
        .addFields([
            {
                name: 'Current Mode',
                value: updated.timerMode === 'message' ? 'Message-based' : 'Time-based',
                inline: true
            },
            {
                name: 'Message Count',
                value: updated.messageCount.toString(),
                inline: true
            },
            {
                name: 'Timer Interval',
                value: `${Math.floor(updated.timerInterval / 60)} minutes`,
                inline: true
            }
        ])
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed], flags: 64 });
}

async function handlePreview(interaction, serverId, channel) {
    const stickyMessage = await StickyMessage.findOne({ serverId, channelId: channel.id });
    
    if (!stickyMessage) {
        return interaction.reply({
            content: `❌ No sticky message found for <#${channel.id}>. Create one first!`,
            flags: 64
        });
    }
    
    const messagePayload = { content: '📋 **Preview of your sticky message:**\n' };
    
    // Add text content
    if (stickyMessage.messageType === 'text' || stickyMessage.messageType === 'both') {
        if (stickyMessage.textContent) {
            messagePayload.content += '\n**Text:**\n' + stickyMessage.textContent;
        }
    }
    
    // Add embed preview
    if (stickyMessage.messageType === 'embed' || stickyMessage.messageType === 'both') {
        const embed = buildPreviewEmbed(stickyMessage);
        if (embed) {
            messagePayload.embeds = [embed];
        }
    }
    
    // Add configuration info
    const configEmbed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('⚙️ Configuration')
        .addFields([
            {
                name: 'Status',
                value: stickyMessage.active ? '🟢 Active' : '🔴 Inactive',
                inline: true
            },
            {
                name: 'Type',
                value: stickyMessage.messageType.toUpperCase(),
                inline: true
            },
            {
                name: 'Timer Mode',
                value: stickyMessage.timerMode === 'message' ? 
                    `After ${stickyMessage.messageCount} messages` : 
                    `Every ${Math.floor(stickyMessage.timerInterval / 60)} minutes`,
                inline: false
            }
        ])
        .setTimestamp();
    
    if (!messagePayload.embeds) messagePayload.embeds = [];
    messagePayload.embeds.push(configEmbed);
    
    await interaction.reply({ ...messagePayload, flags: 64 });
}

function buildPreviewEmbed(stickyMessage) {
    try {
        const embedData = stickyMessage.embed;
        const embed = new EmbedBuilder();
        
        if (embedData.title) embed.setTitle(embedData.title);
        if (embedData.description) embed.setDescription(embedData.description);
        if (embedData.color) embed.setColor(embedData.color);
        
        // Advanced author configuration
        if (embedData.author?.name) {
            const authorData = { name: embedData.author.name };
            if (embedData.author.iconURL) authorData.iconURL = embedData.author.iconURL;
            if (embedData.author.url) authorData.url = embedData.author.url;
            embed.setAuthor(authorData);
        }
        
        // Advanced footer configuration
        if (embedData.footer?.text) {
            const footerData = { text: embedData.footer.text };
            if (embedData.footer.iconURL) footerData.iconURL = embedData.footer.iconURL;
            embed.setFooter(footerData);
        }
        
        if (embedData.image) embed.setImage(embedData.image);
        if (embedData.thumbnail) embed.setThumbnail(embedData.thumbnail);
        
        // Dynamic fields support
        if (embedData.fields && embedData.fields.length > 0) {
            const validFields = embedData.fields.filter(field => field.name && field.value);
            if (validFields.length > 0) embed.addFields(validFields);
        }
        
        if (embedData.timestamp) embed.setTimestamp();
        
        return embed;
    } catch (error) {
        console.error('Error building preview embed:', error);
        return null;
    }
}

async function handleToggle(interaction, serverId, channel) {
    const active = interaction.options.getBoolean('active');
    
    const updated = await StickyMessage.findOneAndUpdate(
        { serverId, channelId: channel.id },
        { $set: { active } },
        { new: true }
    );
    
    if (!updated) {
        return interaction.reply({
            content: `❌ No sticky message found for <#${channel.id}>. Create one first!`,
            flags: 64
        });
    }
    
    const embed = new EmbedBuilder()
        .setColor(active ? '#00ff00' : '#ff9900')
        .setTitle(active ? '✅ Sticky Message Activated' : '⏸️ Sticky Message Deactivated')
        .setDescription(`Sticky message ${active ? 'activated' : 'deactivated'} for <#${channel.id}>`)
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed], flags: 64 });
}

async function handleDelete(interaction, serverId, channel) {
    const deleted = await StickyMessage.findOneAndDelete({ serverId, channelId: channel.id });
    
    if (!deleted) {
        return interaction.reply({
            content: `❌ No sticky message found for <#${channel.id}>.`,
            flags: 64
        });
    }
    
    // Delete the last sticky message if it exists
    if (deleted.lastMessageId) {
        try {
            const message = await channel.messages.fetch(deleted.lastMessageId);
            if (message) await message.delete();
        } catch (err) {
            console.warn('Could not delete last sticky message:', err.message);
        }
    }
    
    const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('🗑️ Sticky Message Deleted')
        .setDescription(`Sticky message deleted for <#${channel.id}>`)
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed], flags: 64 });
}
