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
const { SlashCommandBuilder } = require('@discordjs/builders');
const {
    TextDisplayBuilder,
    ContainerBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags
} = require('discord.js');
const config = require('../../config.js');
const checkPermissions = require('../../utils/checkPermissions');
const restartConfirmations = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('manage-bot')
        .setDescription('Bot customization and management (Owner Only)')
        .addSubcommand(sub => sub
            .setName('pfp')
            .setDescription('Change bot profile picture')
            .addStringOption(option =>
                option.setName('url')
                    .setDescription('Direct image URL for new profile picture')
                    .setRequired(true)))
        .addSubcommand(sub => sub
            .setName('banner')
            .setDescription('Update bot profile banner')
            .addStringOption(option =>
                option.setName('url')
                    .setDescription('Direct image URL for new banner')
                    .setRequired(true)))
        .addSubcommand(sub => sub
            .setName('username')
            .setDescription('Change bot username')
            .addStringOption(option =>
                option.setName('name')
                    .setDescription('New username for the bot')
                    .setRequired(true)))
        .addSubcommand(sub => sub
            .setName('restart')
            .setDescription('Restart bot processes (WARNING: Causes downtime)')),

    async execute(interaction) {
        if (!await checkPermissions(interaction)) return;
        try {
            let sender = interaction.user;
            let subcommand;
            let isSlashCommand = false;

            if (interaction.isChatInputCommand && interaction.isChatInputCommand()) {
                isSlashCommand = true;
                await interaction.deferReply();
                subcommand = interaction.options.getSubcommand();
            } else {
                const message = interaction;
                sender = message.author;
                const args = message.content.split(' ');
                args.shift();
                subcommand = args[0] || 'help';
            }


            const ownerId = config.ownerId;
            if (sender.id !== ownerId) {
                const unauthorizedContainer = new ContainerBuilder()
                    .setAccentColor(0xff4757);

                unauthorizedContainer.addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent('# 🚫 Access Denied\n## Owner Authorization Required\n\n> This command is restricted to the bot owner only\n> Contact the bot administrator for access')
                );

                const components = [unauthorizedContainer];
                const messageData = { components: components, flags: MessageFlags.IsComponentsV2 };
                return isSlashCommand ? interaction.editReply(messageData) : interaction.reply(messageData);
            }

            const client = isSlashCommand ? interaction.client : interaction.client;

            const sendReply = async (components) => {
                const messageData = { components: components, flags: MessageFlags.IsComponentsV2 };
                return isSlashCommand ? interaction.editReply(messageData) : interaction.reply(messageData);
            };


            if (subcommand === 'pfp') {
                const imageUrl = isSlashCommand ? interaction.options.getString('url') : interaction.content.split(' ')[2];

                if (!imageUrl) {
                    const errorContainer = new ContainerBuilder()
                        .setAccentColor(0xff4757);

                    errorContainer.addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent('# ❌ Missing Image URL\n## Profile Picture Update Failed\n\n> Please provide a valid direct image URL\n> Supported formats: PNG, JPG, JPEG, GIF\n> Maximum size: 8MB\n\n**Usage Examples:**\n`/manage-bot pfp https://example.com/image.png`\n`!manage-bot pfp https://example.com/image.png`')
                    );

                    return sendReply([errorContainer]);
                }

                try {
                    await client.user.setAvatar(imageUrl);

                    const components = [];
                    const successContainer = new ContainerBuilder().setAccentColor(0x00ff88);

                    successContainer.addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder()
                                    .setContent('# ✅ Profile Picture Updated\n## Avatar Change Successful\n\n> Bot profile picture has been successfully updated across all platforms\n> Changes will be visible globally within 5-10 minutes')
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder()
                                    .setURL(imageUrl)
                                    .setDescription('New Bot Avatar')
                            )
                    );

                    components.push(successContainer);
                    components.push(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));

                    const detailsContainer = new ContainerBuilder().setAccentColor(0x10B981);
                    detailsContainer.addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(`## 🖼️ **Update Details**\n\n**New Avatar URL**\n${imageUrl}\n\n**Global Application**\nAll Discord servers | Direct messages | Bot profile | Command responses\n\n**Cache Refresh**\nDiscord CDN updating | Profile propagation initiated | Avatar optimization complete`)
                    );

                    components.push(detailsContainer);
                    return sendReply(components);

                } catch (error) {
                    const errorContainer = new ContainerBuilder().setAccentColor(0xE74C3C);
                    errorContainer.addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(`# ❌ Avatar Update Failed\n## Profile Picture Error\n\n> Failed to update bot profile picture\n> Error: ${error.message}\n\n**Common Issues:**\n• Invalid or broken image URL\n• Image exceeds 8MB size limit\n• Unsupported image format\n• Network connectivity problems\n• Rate limit restrictions`)
                    );

                    return sendReply([errorContainer]);
                }
            }


            if (subcommand === 'banner') {
                const imageUrl = isSlashCommand ? interaction.options.getString('url') : interaction.content.split(' ')[2];

                if (!imageUrl) {
                    const errorContainer = new ContainerBuilder().setAccentColor(0xff4757);
                    errorContainer.addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent('# ❌ Missing Image URL\n## Banner Update Failed\n\n> Please provide a valid direct image URL for banner\n> Recommended dimensions: 600x240 pixels\n> Supported formats: PNG, JPG, JPEG, GIF')
                    );
                    return sendReply([errorContainer]);
                }

                try {
                    await client.user.setBanner(imageUrl);

                    const components = [];
                    const successContainer = new ContainerBuilder().setAccentColor(0x7c3aed);
                    successContainer.addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent('# ✅ Banner Updated\n## Profile Banner Change Successful\n\n> Bot profile banner has been successfully updated\n> Enhanced visual presence across Discord platform')
                    );

                    components.push(successContainer);
                    components.push(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));

                    const detailsContainer = new ContainerBuilder().setAccentColor(0x8B5CF6);
                    detailsContainer.addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(`## 🎨 **Banner Configuration**\n\n**New Banner URL**\n${imageUrl}\n\n**Display Locations**\nBot profile page | User information modal | About bot section`)
                    );

                    components.push(detailsContainer);
                    return sendReply(components);

                } catch (error) {
                    const errorContainer = new ContainerBuilder().setAccentColor(0xE74C3C);
                    errorContainer.addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(`# ❌ Banner Update Failed\n## Profile Banner Error\n\n> Failed to update bot profile banner\n> Error: ${error.message}`)
                    );
                    return sendReply([errorContainer]);
                }
            }


            if (subcommand === 'username') {
                const newUsername = isSlashCommand ? interaction.options.getString('name') : interaction.content.split(' ').slice(2).join(' ');

                if (!newUsername) {
                    const errorContainer = new ContainerBuilder().setAccentColor(0xff4757);
                    errorContainer.addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent('# ❌ Missing Username\n## Username Update Failed\n\n> Please provide a new username for the bot\n> Username requirements: 2-32 characters')
                    );
                    return sendReply([errorContainer]);
                }

                try {
                    const oldUsername = client.user.username;
                    await client.user.setUsername(newUsername);

                    const components = [];
                    const successContainer = new ContainerBuilder().setAccentColor(0x3498db);
                    successContainer.addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent('# ✅ Username Updated\n## Bot Identity Change Successful\n\n> Bot username has been successfully changed\n> New identity will be visible across all servers')
                    );

                    components.push(successContainer);
                    components.push(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));

                    const changeContainer = new ContainerBuilder().setAccentColor(0x2196F3);
                    changeContainer.addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(`## 🏷️ **Username Transition**\n\n**Previous Username**\n${oldUsername}\n\n**New Username**\n${newUsername}\n\n**Change Impact**\nAll server member lists | Command responses | Bot mentions | Profile displays`)
                    );

                    components.push(changeContainer);
                    return sendReply(components);

                } catch (error) {
                    const errorContainer = new ContainerBuilder().setAccentColor(0xE74C3C);
                    errorContainer.addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(`# ❌ Username Update Failed\n## Identity Change Error\n\n> Failed to change bot username\n> Error: ${error.message}\n\n**Possible Causes:**\n• Username already taken\n• Recent username change (2 changes per hour limit)`)
                    );
                    return sendReply([errorContainer]);
                }
            }

            if (subcommand === 'restart') {
                const userId = sender.id;
                const now = Date.now();


                if (restartConfirmations.has(userId)) {
                    const confirmTime = restartConfirmations.get(userId);


                    if (now - confirmTime <= 30000) {

                        restartConfirmations.delete(userId);

                        const components = [];
                        const restartingContainer = new ContainerBuilder().setAccentColor(0xe74c3c);
                        restartingContainer.addTextDisplayComponents(
                            new TextDisplayBuilder()
                                .setContent('# 🔄 RESTARTING BOT\n## System Shutdown Initiated\n\n> Bot restart confirmed and initiated\n> All services are shutting down now\n> Expected downtime: 30-60 seconds\n\n**Status:** Shutting down...\n**Reconnection:** Automatic\n**ETA:** 1 minute maximum')
                        );

                        components.push(restartingContainer);
                        await sendReply(components);


                        setTimeout(() => {
                            console.log('🔄 Bot restart initiated by owner:', sender.tag);
                            process.exit(0);
                        }, 2000);

                        return;
                    } else {

                        restartConfirmations.delete(userId);
                    }
                }


                restartConfirmations.set(userId, now);


                setTimeout(() => {
                    restartConfirmations.delete(userId);
                }, 30000);

                const components = [];
                const warningContainer = new ContainerBuilder().setAccentColor(0xe74c3c);
                warningContainer.addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent('# ⚠️ System Restart Warning\n## Critical Operation Confirmation\n\n> This action will restart the entire bot process\n> All active connections will be terminated\n> Downtime expected: 30-60 seconds\n\n**Impact:**\n• Music playback will stop\n• Temporary commands will be lost\n• Active interactions may fail\n• Brief service interruption\n\n**Recommendation:**\nUse this command only when necessary\nConsider maintenance mode for scheduled restarts')
                );

                components.push(warningContainer);
                components.push(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));

                const confirmContainer = new ContainerBuilder().setAccentColor(0xf39c12);
                confirmContainer.addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent('## ⏰ **Confirmation Required**\n\n> To confirm restart, run this command again within 30 seconds\n> Restart process will begin automatically after confirmation\n\n**Time Remaining:** 30 seconds\n**Action:** Run `/manage-bot restart` or `!manage-bot restart` again')
                );

                components.push(confirmContainer);
                return sendReply(components);
            }


            const components = [];
            const helpContainer = new ContainerBuilder().setAccentColor(0x667eea);
            helpContainer.addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent('# 🛠️ Bot Customization Commands\n## Available Management Options\n\n**Profile Commands:**\n`pfp <url>` - Update profile picture\n`banner <url>` - Change profile banner\n`username <name>` - Modify bot username\n`description <text>` - Update about me section\n\n**System Commands:**\n`restart` - Restart bot process (requires confirmation)\n\n**Usage Examples:**\n`/manage-bot pfp https://example.com/image.png`\n`!manage-bot username "My New Bot Name"`')
            );

            return sendReply([helpContainer]);

        } catch (error) {
            console.error('Error in manage-bot command:', error);

            const errorContainer = new ContainerBuilder().setAccentColor(0xE74C3C);
            errorContainer.addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent('# ❌ System Error\n## Bot Management Error\n\n> An error occurred while processing the bot management command\n> Please try again or contact support')
            );

            const components = [errorContainer];
            const messageData = { components: components, flags: MessageFlags.IsComponentsV2 };
            return isSlashCommand ? interaction.editReply(messageData) : interaction.reply(messageData);
        }
    },
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
