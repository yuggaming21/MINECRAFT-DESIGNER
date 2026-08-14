const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { botStatusCollection } = require('../../mongodb');
const { ActivityType } = require('discord.js');
const config = require('../../config');
const cmdIcons = require('../../UI/icons/commandicons');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-status')
        .setDescription('View or change the bot\'s presence')
        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('Add a custom status to rotation')
                .addStringOption(opt =>
                    opt.setName('status')
                        .setDescription('Bot status')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Online', value: 'online' },
                            { name: 'Idle', value: 'idle' },
                            { name: 'Do Not Disturb', value: 'dnd' },
                        ))
                .addStringOption(opt =>
                    opt.setName('activity')
                        .setDescription('Activity text (use placeholders like {members}, {servers}, {channels})')
                        .setRequired(true))
                .addStringOption(opt =>
                    opt.setName('type')
                        .setDescription('Activity type')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Playing', value: 'Playing' },
                            { name: 'Watching', value: 'Watching' },
                            { name: 'Listening', value: 'Listening' },
                            { name: 'Streaming', value: 'Streaming' },
                        ))
                .addStringOption(opt =>
                    opt.setName('streamurl')
                        .setDescription('Twitch Stream URL (only for Streaming activity)')
                        .setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('view')
                .setDescription('View all custom statuses in rotation')
        )
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Remove a custom status from rotation')
                .addIntegerOption(opt =>
                    opt.setName('index')
                        .setDescription('Index of the status to remove (use /setup-status view to see indices)')
                        .setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('interval')
                .setDescription('Set the interval for status rotation')
                .addIntegerOption(opt =>
                    opt.setName('seconds')
                        .setDescription('Interval in seconds (default: 10)')
                        .setRequired(true)
                        .setMinValue(5)
                        .setMaxValue(300))
        )
        .addSubcommand(sub =>
            sub.setName('toggle')
                .setDescription('Toggle between default rotation and custom rotation')
                .addBooleanOption(opt =>
                    opt.setName('use_custom')
                        .setDescription('Use custom rotation instead of default')
                        .setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('reset')
                .setDescription('Reset to default rotating activities')
        ),

    async execute(interaction) {
        if (interaction.isCommand && interaction.isCommand()) {
            await interaction.deferReply({ ephemeral: true });
            const subcommand = interaction.options.getSubcommand();
            const client = interaction.client;
            
            if (interaction.user.id !== config.ownerId) {
                return interaction.editReply({
                    content: '❌ Only the **bot owner** can use this command.',
                    ephemeral: true
                });
            }
            
            if (subcommand === 'add') {
                const status = interaction.options.getString('status');
                const activityRaw = interaction.options.getString('activity');
                const type = interaction.options.getString('type');
                const streamurl = interaction.options.getString('streamurl') || null;

                if (type === 'Streaming' && (!streamurl || !streamurl.startsWith('https://www.twitch.tv/'))) {
                    return interaction.editReply('❌ You must provide a valid Twitch stream URL for streaming activities.');
                }

                // Create status object
                const statusObj = {
                    status,
                    activity: activityRaw,
                    type,
                    url: streamurl || null,
                };

                // Get current document or create new one
                let statusDoc = await botStatusCollection.findOne({}) || { 
                    useCustom: false, 
                    customRotation: [],
                    interval: 10
                };
                
                if (!statusDoc.customRotation) {
                    statusDoc.customRotation = [];
                }
                
                // Limit to 3 custom rotations
                if (statusDoc.customRotation.length >= 3) {
                    return interaction.editReply('❌ You can only have 3 custom statuses in rotation. Remove one first with `/setup-status remove`.');
                }
                
                // Add the new status to the rotation
                statusDoc.customRotation.push(statusObj);
                
                // Save to database
                await botStatusCollection.updateOne({}, { $set: statusDoc }, { upsert: true });
                
                return interaction.editReply(`✅ Added custom status to rotation: **${status}**, activity: **${type} ${activityRaw}**`);

            } else if (subcommand === 'view') {
                const statusDoc = await botStatusCollection.findOne({});
                if (!statusDoc || !statusDoc.customRotation || statusDoc.customRotation.length === 0) {
                    return interaction.editReply('ℹ️ No custom rotation statuses set. Add some with `/setup-status add`.');
                }

                const rotationList = statusDoc.customRotation.map((status, index) => {
                    const urlPart = status.url ? ` (URL: ${status.url})` : '';
                    return `**${index + 1}.** ${status.status} - ${status.type} **${status.activity}**${urlPart}`;
                }).join('\n');

                const activeMode = statusDoc.useCustom ? 'Custom rotation' : 'Default rotation';
                const intervalMsg = `Interval: **${statusDoc.interval || 10}** seconds`;

                return interaction.editReply(`📋 **Custom Status Rotation (${statusDoc.customRotation.length}/3)**\n\n${rotationList}\n\n${intervalMsg}\n**Active Mode:** ${activeMode}`);

            } else if (subcommand === 'remove') {
                const index = interaction.options.getInteger('index') - 1;  // Convert to zero-based
                
                const statusDoc = await botStatusCollection.findOne({});
                if (!statusDoc || !statusDoc.customRotation || !statusDoc.customRotation[index]) {
                    return interaction.editReply('❌ Invalid index or no custom rotation found.');
                }
                
                const removed = statusDoc.customRotation.splice(index, 1)[0];
                await botStatusCollection.updateOne({}, { $set: { customRotation: statusDoc.customRotation } });
                
                return interaction.editReply(`✅ Removed status: **${removed.status}** - ${removed.type} **${removed.activity}**`);

            } else if (subcommand === 'interval') {
                const seconds = interaction.options.getInteger('seconds');
                
                await botStatusCollection.updateOne({}, { $set: { interval: seconds } }, { upsert: true });
                
                return interaction.editReply(`⏱️ Status rotation interval set to **${seconds}** seconds.`);

            } else if (subcommand === 'toggle') {
                const useCustom = interaction.options.getBoolean('use_custom');
                
                // Get current document or create new one
                let statusDoc = await botStatusCollection.findOne({}) || { 
                    customRotation: [],
                    interval: 10
                };
                
                if (useCustom && (!statusDoc.customRotation || statusDoc.customRotation.length === 0)) {
                    return interaction.editReply('❌ No custom statuses added yet. Add some with `/setup-status add` first.');
                }
                
                await botStatusCollection.updateOne({}, { $set: { useCustom } }, { upsert: true });
                
                const mode = useCustom ? 'custom rotation' : 'default rotation';
                return interaction.editReply(`🔄 Status rotation mode set to **${mode}**.`);

            } else if (subcommand === 'reset') {
                await botStatusCollection.deleteOne({});
                return interaction.editReply('♻️ Reset to default rotating activities. Will take effect on next cycle.');
            }
        } else {
            const embed = new EmbedBuilder()
                .setColor('#3498db')
                .setAuthor({ 
                    name: "Alert!", 
                    iconURL: cmdIcons.dotIcon,
                    url: "https://discord.gg/xQF9f9yUEM"
                })
                .setDescription('- This command can only be used through slash commands!\n- Please use `/setup-status`')
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        }
    }
};