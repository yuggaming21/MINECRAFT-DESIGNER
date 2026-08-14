const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const WelcomeSettings = require('../../models/welcome/WelcomeSettings');
const checkPermissions = require('../../utils/checkPermissions');
const cmdIcons = require('../../UI/icons/commandicons');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-welcome')
        .setDescription('Set or view welcome message and DM settings for this server')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels)

        .addSubcommand(sub =>
            sub.setName('setchannel')
                .setDescription('Enable/Disable welcome messages in a channel')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Select the welcome channel')
                        .setRequired(true))
                .addBooleanOption(option =>
                    option.setName('status')
                        .setDescription('Enable or disable channel welcome messages')
                        .setRequired(true))
        )

        .addSubcommand(sub =>
            sub.setName('setdm')
                .setDescription('Enable/Disable welcome DMs')
                .addBooleanOption(option =>
                    option.setName('status')
                        .setDescription('Enable or disable welcome DMs')
                        .setRequired(true))
        )

        .addSubcommand(sub =>
            sub.setName('embed-channel')
                .setDescription('Setup custom embed for channel welcome messages')
                .addStringOption(option =>
                    option.setName('title')
                        .setDescription('Embed title (use {membercount}, {suffix}, {member} placeholders)')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Embed description (use placeholders: {member}, {membercount}, {suffix})')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('color')
                        .setDescription('Embed color (hex format: #00e5ff)')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('author_name')
                        .setDescription('Author name (use {username} placeholder)')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('author_url')
                        .setDescription('Author URL')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('footer_text')
                        .setDescription('Footer text')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('footer_url')
                        .setDescription('Footer icon URL')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('thumbnail')
                        .setDescription('Thumbnail type')
                        .addChoices(
                            { name: 'User Avatar', value: 'userimage' },
                            { name: 'Server Icon', value: 'serverimage' },
                            { name: 'None', value: 'none' }
                        )
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('use_wcard')
                        .setDescription('Use Wcard generator for image (default: true)')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('custom_image')
                        .setDescription('Custom image URL (only if use_wcard is false)')
                        .setRequired(false))
        )

        .addSubcommand(sub =>
            sub.setName('embed-dm')
                .setDescription('Setup custom embed for DM welcome messages')
                .addStringOption(option =>
                    option.setName('title')
                        .setDescription('Embed title (use {username}, {servername} placeholders)')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Embed description (use placeholders: {username}, {servername})')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('color')
                        .setDescription('Embed color (hex format: #00e5ff)')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('footer_text')
                        .setDescription('Footer text')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('footer_url')
                        .setDescription('Footer icon URL')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('thumbnail')
                        .setDescription('Thumbnail type')
                        .addChoices(
                            { name: 'User Avatar', value: 'userimage' },
                            { name: 'Server Icon', value: 'serverimage' },
                            { name: 'None', value: 'none' }
                        )
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('use_wcard')
                        .setDescription('Use Wcard generator for image (default: false for DM)')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('custom_image')
                        .setDescription('Custom image URL (only if use_wcard is false)')
                        .setRequired(false))
        )

        .addSubcommand(sub =>
            sub.setName('fields')
                .setDescription('Setup the 3 fields for channel welcome embed')
                .addStringOption(option =>
                    option.setName('field1_name')
                        .setDescription('First field name')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('field1_value')
                        .setDescription('First field value type')
                        .addChoices(
                            { name: 'Username', value: 'username' },
                            { name: 'User ID', value: 'userid' },
                            { name: 'Join Date', value: 'joindate' },
                            { name: 'Account Created', value: 'accountcreated' },
                            { name: 'Member Count', value: 'membercount' },
                            { name: 'Server Name', value: 'servername' },
                            { name: 'None', value: 'none' }
                        )
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('field1_inline')
                        .setDescription('First field inline (default: true)')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('field2_name')
                        .setDescription('Second field name')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('field2_value')
                        .setDescription('Second field value type')
                        .addChoices(
                            { name: 'Username', value: 'username' },
                            { name: 'User ID', value: 'userid' },
                            { name: 'Join Date', value: 'joindate' },
                            { name: 'Account Created', value: 'accountcreated' },
                            { name: 'Member Count', value: 'membercount' },
                            { name: 'Server Name', value: 'servername' },
                            { name: 'None', value: 'none' }
                        )
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('field2_inline')
                        .setDescription('Second field inline (default: true)')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('field3_name')
                        .setDescription('Third field name')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('field3_value')
                        .setDescription('Third field value type')
                        .addChoices(
                            { name: 'Username', value: 'username' },
                            { name: 'User ID', value: 'userid' },
                            { name: 'Join Date', value: 'joindate' },
                            { name: 'Account Created', value: 'accountcreated' },
                            { name: 'Member Count', value: 'membercount' },
                            { name: 'Server Name', value: 'servername' },
                            { name: 'None', value: 'none' }
                        )
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('field3_inline')
                        .setDescription('Third field inline (default: true)')
                        .setRequired(false))
        )

        .addSubcommand(sub =>
            sub.setName('view')
                .setDescription('View current welcome setup')
        ),

    async execute(interaction) {
        if (!interaction.isCommand()) {
            const embed = new EmbedBuilder()
                .setColor('#3498db')
                .setAuthor({ 
                    name: "Alert!", 
                    iconURL: cmdIcons.dotIcon,
                    url: "https://discord.gg/xQF9f9yUEM"
                })
                .setDescription('- This command can only be used through slash commands!\n- Please use `/setup-welcome`')
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

        const guild = interaction.guild;
        const serverID = guild.id;
        if (!await checkPermissions(interaction)) return;

        const subcommand = interaction.options.getSubcommand();

        try {
            if (subcommand === 'setchannel') {
                const channel = interaction.options.getChannel('channel');
                const status = interaction.options.getBoolean('status');

                // Use findOneAndUpdate with upsert to handle creation/update properly
                await WelcomeSettings.findOneAndUpdate(
                    { serverId: serverID },
                    {
                        serverId: serverID,
                        welcomeChannelId: channel.id,
                        channelStatus: status,
                        ownerId: guild.ownerId
                    },
                    { 
                        upsert: true, 
                        new: true,
                        setDefaultsOnInsert: true
                    }
                );

                return interaction.reply({
                    content: `📢 Welcome messages in channel have been **${status ? 'enabled' : 'disabled'}** for <#${channel.id}>.`,
                    ephemeral: true
                });

            } else if (subcommand === 'setdm') {
                const status = interaction.options.getBoolean('status');

                await WelcomeSettings.findOneAndUpdate(
                    { serverId: serverID },
                    {
                        serverId: serverID,
                        dmStatus: status,
                        ownerId: guild.ownerId
                    },
                    { 
                        upsert: true, 
                        new: true,
                        setDefaultsOnInsert: true
                    }
                );

                return interaction.reply({
                    content: `📩 Welcome DM has been **${status ? 'enabled' : 'disabled'}**.`,
                    ephemeral: true
                });

            } else if (subcommand === 'embed-channel') {
                const updateData = { 
                    serverId: serverID, 
                    ownerId: guild.ownerId 
                };
                
                const title = interaction.options.getString('title');
                const description = interaction.options.getString('description');
                const color = interaction.options.getString('color');
                const authorName = interaction.options.getString('author_name');
                const authorUrl = interaction.options.getString('author_url');
                const footerText = interaction.options.getString('footer_text');
                const footerUrl = interaction.options.getString('footer_url');
                const thumbnail = interaction.options.getString('thumbnail');
                const useWcard = interaction.options.getBoolean('use_wcard');
                const customImage = interaction.options.getString('custom_image');

                if (title) updateData['channelEmbed.title'] = title;
                if (description) updateData['channelEmbed.description'] = description;
                if (color) updateData['channelEmbed.color'] = color;
                if (authorName) updateData['channelEmbed.author.name'] = authorName;
                if (authorUrl) updateData['channelEmbed.author.url'] = authorUrl;
                if (footerText) updateData['channelEmbed.footer.text'] = footerText;
                if (footerUrl) updateData['channelEmbed.footer.iconURL'] = footerUrl;
                if (thumbnail) updateData['channelEmbed.thumbnail.type'] = thumbnail;
                if (useWcard !== null) updateData['channelEmbed.image.useWcard'] = useWcard;
                if (customImage) updateData['channelEmbed.image.customURL'] = customImage;

                await WelcomeSettings.findOneAndUpdate(
                    { serverId: serverID },
                    updateData,
                    { 
                        upsert: true, 
                        new: true,
                        setDefaultsOnInsert: true
                    }
                );

                return interaction.reply({
                    content: '✅ Channel welcome embed settings have been updated!',
                    ephemeral: true
                });

            } else if (subcommand === 'embed-dm') {
                const updateData = { 
                    serverId: serverID, 
                    ownerId: guild.ownerId 
                };
                
                const title = interaction.options.getString('title');
                const description = interaction.options.getString('description');
                const color = interaction.options.getString('color');
                const footerText = interaction.options.getString('footer_text');
                const footerUrl = interaction.options.getString('footer_url');
                const thumbnail = interaction.options.getString('thumbnail');
                const useWcard = interaction.options.getBoolean('use_wcard');
                const customImage = interaction.options.getString('custom_image');

                if (title) updateData['dmEmbed.title'] = title;
                if (description) updateData['dmEmbed.description'] = description;
                if (color) updateData['dmEmbed.color'] = color;
                if (footerText) updateData['dmEmbed.footer.text'] = footerText;
                if (footerUrl) updateData['dmEmbed.footer.iconURL'] = footerUrl;
                if (thumbnail) updateData['dmEmbed.thumbnail.type'] = thumbnail;
                if (useWcard !== null) updateData['dmEmbed.image.useWcard'] = useWcard;
                if (customImage) updateData['dmEmbed.image.customURL'] = customImage;

                await WelcomeSettings.findOneAndUpdate(
                    { serverId: serverID },
                    updateData,
                    { 
                        upsert: true, 
                        new: true,
                        setDefaultsOnInsert: true
                    }
                );

                return interaction.reply({
                    content: '✅ DM welcome embed settings have been updated!',
                    ephemeral: true
                });

            } else if (subcommand === 'fields') {
                const updateData = { 
                    serverId: serverID, 
                    ownerId: guild.ownerId 
                };
                
                // Field 1
                const field1Name = interaction.options.getString('field1_name');
                const field1Value = interaction.options.getString('field1_value');
                const field1Inline = interaction.options.getBoolean('field1_inline');
                
                if (field1Name) updateData['channelEmbed.fields.0.name'] = field1Name;
                if (field1Value) updateData['channelEmbed.fields.0.value'] = field1Value;
                if (field1Inline !== null) updateData['channelEmbed.fields.0.inline'] = field1Inline;

                // Field 2
                const field2Name = interaction.options.getString('field2_name');
                const field2Value = interaction.options.getString('field2_value');
                const field2Inline = interaction.options.getBoolean('field2_inline');
                
                if (field2Name) updateData['channelEmbed.fields.1.name'] = field2Name;
                if (field2Value) updateData['channelEmbed.fields.1.value'] = field2Value;
                if (field2Inline !== null) updateData['channelEmbed.fields.1.inline'] = field2Inline;

                // Field 3
                const field3Name = interaction.options.getString('field3_name');
                const field3Value = interaction.options.getString('field3_value');
                const field3Inline = interaction.options.getBoolean('field3_inline');
                
                if (field3Name) updateData['channelEmbed.fields.2.name'] = field3Name;
                if (field3Value) updateData['channelEmbed.fields.2.value'] = field3Value;
                if (field3Inline !== null) updateData['channelEmbed.fields.2.inline'] = field3Inline;

                await WelcomeSettings.findOneAndUpdate(
                    { serverId: serverID },
                    updateData,
                    { 
                        upsert: true, 
                        new: true,
                        setDefaultsOnInsert: true
                    }
                );

                return interaction.reply({
                    content: '✅ Welcome embed fields have been updated!',
                    ephemeral: true
                });

            } else if (subcommand === 'view') {
                const config = await WelcomeSettings.findOne({ serverId: serverID });

                if (!config) {
                    return interaction.reply({
                        content: '⚠ No welcome configuration found for this server.',
                        ephemeral: true
                    });
                }

                const embed = new EmbedBuilder()
                    .setColor('#3498db')
                    .setTitle('📋 Welcome Settings')
                    .addFields(
                        { name: 'Server ID', value: config.serverId, inline: true },
                        { name: 'Channel', value: config.welcomeChannelId ? `<#${config.welcomeChannelId}>` : 'Not set', inline: true },
                        { name: 'Channel Status', value: config.channelStatus ? '✅ Enabled' : '❌ Disabled', inline: true },
                        { name: 'Welcome DM', value: config.dmStatus ? '✅ Enabled' : '❌ Disabled', inline: true }
                    )
                    .setTimestamp();

                // Add channel embed info
                if (config.channelEmbed) {
                    const channelEmbed = config.channelEmbed;
                    embed.addFields(
                        { name: '\n📢 Channel Embed Settings', value: '━━━━━━━━━━━━━━━━━━━━━━━━━━', inline: false },
                        { name: 'Title', value: channelEmbed.title || 'Default', inline: true },
                        { name: 'Color', value: channelEmbed.color || 'Default', inline: true },
                        { name: 'Thumbnail', value: channelEmbed.thumbnail?.type || 'serverimage', inline: true },
                        { name: 'Use Wcard', value: channelEmbed.image?.useWcard ? '✅ Yes' : '❌ No', inline: true }
                    );

                    // Show field information
                    if (channelEmbed.fields && channelEmbed.fields.length > 0) {
                        const fieldInfo = channelEmbed.fields.map((field, index) => 
                            `Field ${index + 1}: ${field.name || 'Not set'} (${field.value || 'none'})`
                        ).join('\n');
                        embed.addFields({ name: 'Fields', value: fieldInfo || 'No fields configured', inline: false });
                    }
                }

                // Add DM embed info
                if (config.dmEmbed) {
                    const dmEmbed = config.dmEmbed;
                    embed.addFields(
                        { name: '\n📩 DM Embed Settings', value: '━━━━━━━━━━━━━━━━━━━━━━━━━━', inline: false },
                        { name: 'Title', value: dmEmbed.title || 'Default', inline: true },
                        { name: 'Color', value: dmEmbed.color || 'Default', inline: true },
                        { name: 'Thumbnail', value: dmEmbed.thumbnail?.type || 'userimage', inline: true },
                        { name: 'Use Wcard', value: dmEmbed.image?.useWcard ? '✅ Yes' : '❌ No', inline: true }
                    );
                }

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

        } catch (error) {
            console.error('❌ Error in setup-welcome command:', error);
            
            // Check if it's a duplicate key error
            if (error.code === 11000) {
                return interaction.reply({
                    content: '❌ Database conflict detected. Please try the command again or contact support.',
                    ephemeral: true
                });
            }
            
            return interaction.reply({
                content: '❌ An error occurred while updating the welcome settings.',
                ephemeral: true
            });
        }
    }
};