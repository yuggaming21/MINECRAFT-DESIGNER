// commands/modmail/setup-modmail.js
const {
    SlashCommandBuilder,
    PermissionsBitField,
    ChannelType,
    EmbedBuilder
} = require('discord.js');
const ModMailConfig = require('../../models/modmail/ModMailConfig');
const checkPermissions = require('../../utils/checkPermissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-modmail')
        .setDescription('Manage the advanced mod mail system configuration')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
        .addSubcommand(sub =>
            sub.setName('configure')
                .setDescription('Set up or update mod mail configuration')
                .addChannelOption(opt =>
                    opt.setName('log_channel')
                        .setDescription('Channel for modmail threads')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
                .addRoleOption(opt =>
                    opt.setName('admin_role')
                        .setDescription('Role for managing modmail')
                        .setRequired(true))
                .addBooleanOption(opt =>
                    opt.setName('status')
                        .setDescription('Enable or disable modmail')
                        .setRequired(true))
                .addChannelOption(opt =>
                    opt.setName('category')
                        .setDescription('Category for modmail threads (optional)')
                        .addChannelTypes(ChannelType.GuildCategory)
                        .setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('settings')
                .setDescription('Configure advanced modmail settings')
                .addIntegerOption(opt =>
                    opt.setName('max_tickets')
                        .setDescription('Maximum open tickets per user (1-10)')
                        .setMinValue(1)
                        .setMaxValue(10)
                        .setRequired(false))
                .addIntegerOption(opt =>
                    opt.setName('cooldown')
                        .setDescription('Cooldown between tickets in minutes (1-60)')
                        .setMinValue(1)
                        .setMaxValue(60)
                        .setRequired(false))
                .addBooleanOption(opt =>
                    opt.setName('auto_response')
                        .setDescription('Send automatic welcome message')
                        .setRequired(false))
                .addBooleanOption(opt =>
                    opt.setName('allow_attachments')
                        .setDescription('Allow file attachments in modmail')
                        .setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('welcome')
                .setDescription('Set custom welcome message')
                .addStringOption(opt =>
                    opt.setName('message')
                        .setDescription('Welcome message (max 1000 characters)')
                        .setMaxLength(1000)
                        .setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('view')
                .setDescription('View current modmail configuration')
        )
        .addSubcommand(sub =>
            sub.setName('stats')
                .setDescription('View modmail statistics')
        ),

    async execute(interaction) {
        if (!interaction.isChatInputCommand()) {
            const embed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setTitle('❌ Command Error')
                .setDescription('This command can only be used as a slash command!')
                .setFooter({ text: 'Use /setup-modmail instead' })
                .setTimestamp();

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (!await checkPermissions(interaction)) return;

        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        try {
            switch (subcommand) {
                case 'configure':
                    await handleConfigure(interaction, guildId);
                    break;
                case 'settings':
                    await handleSettings(interaction, guildId);
                    break;
                case 'welcome':
                    await handleWelcome(interaction, guildId);
                    break;
                case 'view':
                    await handleView(interaction, guildId);
                    break;
                case 'stats':
                    await handleStats(interaction, guildId);
                    break;
            }
        } catch (error) {
            console.error('Setup modmail error:', error);

            const errorEmbed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setTitle('❌ Error')
                .setDescription('An error occurred while processing your request. Please try again.')
                .setTimestamp();

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    }
};

async function handleConfigure(interaction, guildId) {
    const logChannel = interaction.options.getChannel('log_channel');
    const adminRole = interaction.options.getRole('admin_role');
    const category = interaction.options.getChannel('category');
    const status = interaction.options.getBoolean('status');

    // Validate permissions
    const botMember = interaction.guild.members.me;
    if (!logChannel.permissionsFor(botMember).has([
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.CreatePublicThreads,
        PermissionsBitField.Flags.ManageThreads
    ])) {
        const embed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle('❌ Permission Error')
            .setDescription(`I need the following permissions in ${logChannel}:\n• View Channel\n• Send Messages\n• Create Public Threads\n• Manage Threads`)
            .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const config = await ModMailConfig.findOneAndUpdate(
        { guildId },
        {
            guildId,
            logChannelId: logChannel.id,
            adminRoleId: adminRole.id,
            categoryId: category?.id || null,
            status,
            ownerId: interaction.guild.ownerId,
            updatedAt: new Date()
        },
        { upsert: true, new: true }
    );

    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ ModMail Configured')
        .setDescription('ModMail system has been successfully configured!')
        .addFields(
            { name: '📬 Status', value: status ? '🟢 Enabled' : '🔴 Disabled', inline: true },
            { name: '📨 Log Channel', value: `${logChannel}`, inline: true },
            { name: '👮 Admin Role', value: `${adminRole}`, inline: true }
        )
        .setFooter({ text: 'Users can now DM the bot to create modmail tickets' })
        .setTimestamp();

    if (category) {
        embed.addFields({ name: '📁 Category', value: `${category.name}`, inline: true });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleSettings(interaction, guildId) {
    const config = await ModMailConfig.findOne({ guildId });
    if (!config) {
        const embed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle('❌ Configuration Not Found')
            .setDescription('Please run `/setup-modmail configure` first.')
            .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const updates = {};
    const maxTickets = interaction.options.getInteger('max_tickets');
    const cooldown = interaction.options.getInteger('cooldown');
    const autoResponse = interaction.options.getBoolean('auto_response');
    const allowAttachments = interaction.options.getBoolean('allow_attachments');

    if (maxTickets !== null) updates.maxOpenTickets = maxTickets;
    if (cooldown !== null) updates.cooldownTime = cooldown * 60000; // Convert to ms
    if (autoResponse !== null) updates.autoResponse = autoResponse;
    if (allowAttachments !== null) updates.allowAttachments = allowAttachments;

    if (Object.keys(updates).length === 0) {
        return interaction.reply({
            content: '❌ Please provide at least one setting to update.',
            ephemeral: true
        });
    }

    updates.updatedAt = new Date();
    await ModMailConfig.findOneAndUpdate({ guildId }, updates);

    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Settings Updated')
        .setDescription('ModMail settings have been successfully updated!')
        .setTimestamp();

    const fields = [];
    if (maxTickets !== null) fields.push({ name: 'Max Tickets', value: `${maxTickets}`, inline: true });
    if (cooldown !== null) fields.push({ name: 'Cooldown', value: `${cooldown} minutes`, inline: true });
    if (autoResponse !== null) fields.push({ name: 'Auto Response', value: autoResponse ? '✅ Enabled' : '❌ Disabled', inline: true });
    if (allowAttachments !== null) fields.push({ name: 'Attachments', value: allowAttachments ? '✅ Allowed' : '❌ Disabled', inline: true });

    embed.addFields(fields);

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleWelcome(interaction, guildId) {
    const message = interaction.options.getString('message');

    const config = await ModMailConfig.findOne({ guildId });
    if (!config) {
        const embed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle('❌ Configuration Not Found')
            .setDescription('Please run `/setup-modmail configure` first.')
            .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    await ModMailConfig.findOneAndUpdate(
        { guildId },
        { welcomeMessage: message, updatedAt: new Date() }
    );

    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Welcome Message Updated')
        .setDescription('The welcome message has been successfully updated!')
        .addFields({ name: 'New Message', value: message.substring(0, 1024), inline: false })
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleView(interaction, guildId) {
    const config = await ModMailConfig.findOne({ guildId });
    if (!config) {
        const embed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle('❌ Configuration Not Found')
            .setDescription('ModMail has not been configured for this server yet.')
            .setFooter({ text: 'Use /setup-modmail configure to get started' })
            .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const logChannel = interaction.guild.channels.cache.get(config.logChannelId);
    const adminRole = interaction.guild.roles.cache.get(config.adminRoleId);
    const category = config.categoryId ? interaction.guild.channels.cache.get(config.categoryId) : null;

    const embed = new EmbedBuilder()
        .setColor('#5865f2')
        .setTitle('📬 ModMail Configuration')
        .addFields(
            { name: '📊 Status', value: config.status ? '🟢 Enabled' : '🔴 Disabled', inline: true },
            { name: '📨 Log Channel', value: logChannel ? `${logChannel}` : '⚠️ Channel Not Found', inline: true },
            { name: '👮 Admin Role', value: adminRole ? `${adminRole}` : '⚠️ Role Not Found', inline: true },
            { name: '📁 Category', value: category ? category.name : 'Not Set', inline: true },
            { name: '🎫 Max Tickets', value: `${config.maxOpenTickets}`, inline: true },
            { name: '⏱️ Cooldown', value: `${config.cooldownTime / 60000} minutes`, inline: true },
            { name: '🤖 Auto Response', value: config.autoResponse ? '✅ Enabled' : '❌ Disabled', inline: true },
            { name: '📎 Attachments', value: config.allowAttachments ? '✅ Allowed' : '❌ Disabled', inline: true },
            { name: '💬 Welcome Message', value: config.welcomeMessage.substring(0, 1024), inline: false }
        )
        .setFooter({ text: `Last updated: ${config.updatedAt.toDateString()}` })
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleStats(interaction, guildId) {
    const ModMailStats = require('../../models/modmail/ModMailStats');
    const ModMailThread = require('../../models/modmail/ModMailThread');

    const stats = await ModMailStats.findOne({ guildId });
    const openThreads = await ModMailThread.countDocuments({ guildId, status: 'open' });
    const closedToday = await ModMailThread.countDocuments({
        guildId,
        status: 'closed',
        closedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    const embed = new EmbedBuilder()
        .setColor('#5865f2')
        .setTitle('📊 ModMail Statistics')
        .addFields(
            { name: '📈 Total Threads', value: `${stats?.totalThreads || 0}`, inline: true },
            { name: '🟢 Currently Open', value: `${openThreads}`, inline: true },
            { name: '✅ Closed Total', value: `${stats?.closedThreads || 0}`, inline: true },
            { name: '📅 Closed Today', value: `${closedToday}`, inline: true },
            { name: '💬 Total Messages', value: `${stats?.totalMessages || 0}`, inline: true },
            { name: '⚡ Avg Response', value: `${stats?.averageResponseTime || 0} min`, inline: true }
        )
        .setFooter({ text: 'Statistics are updated in real-time' })
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}
