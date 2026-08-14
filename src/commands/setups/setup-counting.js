const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const CountingConfig = require('../../models/counting/Schema');
const cmdIcons = require('../../UI/icons/commandicons');
const checkPermissions = require('../../utils/checkPermissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-counting')
        .setDescription('Manage the advanced counting game for your server.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels)

        .addSubcommand(sub =>
            sub.setName('channel')
                .setDescription('Set up counting channel with advanced options.')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Select the channel for the counting game.')
                        .setRequired(true))
                .addBooleanOption(option =>
                    option.setName('status')
                        .setDescription('Enable or disable counting.')
                        .setRequired(true))
                .addBooleanOption(option =>
                    option.setName('allow-same-user')
                        .setDescription('Allow same user to count consecutively.')
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('delete-wrong')
                        .setDescription('Delete incorrect counting messages.')
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('show-errors')
                        .setDescription('Show error messages for wrong counts.')
                        .setRequired(false))
        )

        .addSubcommand(sub =>
            sub.setName('view')
                .setDescription('View detailed counting statistics.')
        )

        .addSubcommand(sub =>
            sub.setName('leaderboard')
                .setDescription('View the counting leaderboard.')
        )

        .addSubcommand(sub =>
            sub.setName('milestones')
                .setDescription('View counting milestones.')
        )

        .addSubcommand(sub =>
            sub.setName('edit')
                .setDescription('Edit counting settings.')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Select a new counting channel.')
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('allow-same-user')
                        .setDescription('Allow same user to count consecutively.')
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('delete-wrong')
                        .setDescription('Delete incorrect counting messages.')
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('show-errors')
                        .setDescription('Show error messages for wrong counts.')
                        .setRequired(false))
        )

        .addSubcommand(sub =>
            sub.setName('reset')
                .setDescription('Reset the current count to 0.')
        )

        .addSubcommand(sub =>
            sub.setName('update')
                .setDescription('Manually update the current count.')
                .addIntegerOption(option =>
                    option.setName('count')
                        .setDescription('Set the current count.')
                        .setRequired(true)
                        .setMinValue(0))
        ),

    async execute(interaction) {
        if (interaction.isCommand && interaction.isCommand()) {
            if (!await checkPermissions(interaction)) return;

            const serverId = interaction.guild.id;
            const subcommand = interaction.options.getSubcommand();

            try {
                switch (subcommand) {
                    case 'channel':
                        await this.handleChannelSetup(interaction, serverId);
                        break;
                    case 'view':
                        await this.handleView(interaction, serverId);
                        break;
                    case 'leaderboard':
                        await this.handleLeaderboard(interaction, serverId);
                        break;
                    case 'milestones':
                        await this.handleMilestones(interaction, serverId);
                        break;
                    case 'edit':
                        await this.handleEdit(interaction, serverId);
                        break;
                    case 'reset':
                        await this.handleReset(interaction, serverId);
                        break;
                    case 'update':
                        await this.handleUpdate(interaction, serverId);
                        break;
                }
            } catch (error) {
                console.error('Counting command error:', error);
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Error')
                    .setDescription('An error occurred while processing your request.')
                    .setTimestamp();

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
                } else {
                    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
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
                .setDescription('- This command can only be used through slash commands!\n- Please use `/setup-counting`')
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        }
    },

    async handleChannelSetup(interaction, serverId) {
        const channel = interaction.options.getChannel('channel');
        const status = interaction.options.getBoolean('status');
        const allowSameUser = interaction.options.getBoolean('allow-same-user') ?? false;
        const deleteWrong = interaction.options.getBoolean('delete-wrong') ?? true;
        const showErrors = interaction.options.getBoolean('show-errors') ?? true;

        const countingData = await CountingConfig.findOneAndUpdate(
            { serverId },
            {
                serverId,
                channelId: channel.id,
                status,
                allowSameUser,
                deleteWrongMessages: deleteWrong,
                showErrorMessages: showErrors,
                currentCount: 0,
                lastUserId: null
            },
            { upsert: true, new: true }
        );

        const embed = new EmbedBuilder()
            .setColor(status ? '#00ff00' : '#ff0000')
            .setTitle('🔢 Counting Game Setup')
            .setDescription(`Counting game is now **${status ? 'enabled' : 'disabled'}** in <#${channel.id}>`)
            .addFields(
                { name: '📊 Current Count', value: `${countingData.currentCount}`, inline: true },
                { name: '👥 Same User Consecutive', value: allowSameUser ? '✅ Allowed' : '❌ Not Allowed', inline: true },
                { name: '🗑️ Delete Wrong Messages', value: deleteWrong ? '✅ Yes' : '❌ No', inline: true },
                { name: '⚠️ Show Error Messages', value: showErrors ? '✅ Yes' : '❌ No', inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },

    async handleView(interaction, serverId) {
        const countingData = await CountingConfig.findByServerId(serverId);

        if (!countingData || !countingData.status) {
            const embed = new EmbedBuilder()
                .setColor('#ff9900')
                .setTitle('ℹ️ Counting Game Not Set Up')
                .setDescription('Counting game is not configured for this server.\nUse `/setup-counting channel` to get started!')
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

        const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('🔢 Counting Game Statistics')
            .setDescription(`**Channel:** <#${countingData.channelId}>`)
            .addFields(
                { name: '📊 Current Count', value: `${countingData.currentCount}`, inline: true },
                { name: '🏆 Highest Count', value: `${countingData.highestCount}`, inline: true },
                { name: '📝 Total Messages', value: `${countingData.totalMessages}`, inline: true },
                { name: '🔄 Reset Count', value: `${countingData.resetCount}`, inline: true },
                { name: '👥 Same User Rule', value: countingData.allowSameUser ? '✅ Allowed' : '❌ Not Allowed', inline: true },
                { name: '🗑️ Delete Wrong Messages', value: countingData.deleteWrongMessages ? '✅ Yes' : '❌ No', inline: true }
            )
            .setFooter({ text: `Last updated` })
            .setTimestamp(countingData.updatedAt);

        await interaction.reply({ embeds: [embed] });
    },

    async handleLeaderboard(interaction, serverId) {
        const countingData = await CountingConfig.findByServerId(serverId);

        if (!countingData || countingData.leaderboard.length === 0) {
            const embed = new EmbedBuilder()
                .setColor('#ff9900')
                .setTitle('📊 Counting Leaderboard')
                .setDescription('No counting data available yet!')
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

        const leaderboardText = countingData.leaderboard
            .slice(0, 10)
            .map((entry, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                return `${medal} <@${entry.userId}> - **${entry.count}** counts`;
            })
            .join('\n') || 'No data available';

        const embed = new EmbedBuilder()
            .setColor('#ffd700')
            .setTitle('🏆 Counting Leaderboard')
            .setDescription(leaderboardText)
            .setFooter({ text: `Total counts: ${countingData.totalMessages}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },

    async handleMilestones(interaction, serverId) {
        const countingData = await CountingConfig.findByServerId(serverId);

        if (!countingData || countingData.milestones.length === 0) {
            const embed = new EmbedBuilder()
                .setColor('#ff9900')
                .setTitle('🎯 Counting Milestones')
                .setDescription('No milestones achieved yet!')
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

        const milestonesText = countingData.milestones
            .slice(0, 10)
            .map(milestone => {
                const date = new Date(milestone.achievedAt).toLocaleDateString();
                return `🎯 **${milestone.count}** - <@${milestone.achievedBy}> (${date})`;
            })
            .join('\n') || 'No milestones available';

        const embed = new EmbedBuilder()
            .setColor('#9b59b6')
            .setTitle('🎯 Counting Milestones')
            .setDescription(milestonesText)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },

    async handleEdit(interaction, serverId) {
        const countingData = await CountingConfig.findByServerId(serverId);
        if (!countingData) {
            return interaction.reply('❌ No counting game set up. Use `/setup-counting channel` first.');
        }

        const updates = {};
        const channel = interaction.options.getChannel('channel');
        const allowSameUser = interaction.options.getBoolean('allow-same-user');
        const deleteWrong = interaction.options.getBoolean('delete-wrong');
        const showErrors = interaction.options.getBoolean('show-errors');

        if (channel) updates.channelId = channel.id;
        if (allowSameUser !== null) updates.allowSameUser = allowSameUser;
        if (deleteWrong !== null) updates.deleteWrongMessages = deleteWrong;
        if (showErrors !== null) updates.showErrorMessages = showErrors;

        if (Object.keys(updates).length === 0) {
            return interaction.reply('❌ Please specify at least one setting to update.');
        }

        await CountingConfig.findOneAndUpdate({ serverId }, updates);

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Settings Updated')
            .setDescription('Counting game settings have been successfully updated!')
            .setTimestamp();

        if (channel) embed.addFields({ name: 'New Channel', value: `<#${channel.id}>`, inline: true });

        await interaction.reply({ embeds: [embed] });
    },

    async handleReset(interaction, serverId) {
        const countingData = await CountingConfig.findByServerId(serverId);
        if (!countingData) {
            return interaction.reply('❌ No counting game set up. Use `/setup-counting channel` first.');
        }

        await countingData.resetCounting(interaction.user.id);

        const embed = new EmbedBuilder()
            .setColor('#ff9900')
            .setTitle('🔄 Count Reset')
            .setDescription('The counting game has been reset to **0**!')
            .addFields({ name: 'Reset by', value: `<@${interaction.user.id}>`, inline: true })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },

    async handleUpdate(interaction, serverId) {
        const newCount = interaction.options.getInteger('count');
        const countingData = await CountingConfig.findByServerId(serverId);

        if (!countingData) {
            return interaction.reply('❌ No counting game set up. Use `/setup-counting channel` first.');
        }

        countingData.currentCount = newCount;
        countingData.lastUserId = null;
        await countingData.save();

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Count Updated')
            .setDescription(`Count has been manually updated to **${newCount}**!`)
            .addFields({ name: 'Updated by', value: `<@${interaction.user.id}>`, inline: true })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};