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
const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionsBitField,
    ChannelType, AttachmentBuilder
} = require('discord.js');
const TicketConfig = require('../../models/ticket/TicketConfig');
const TicketUserData = require('../../models/ticket/TicketUserData');
const ticketIcons = require('../../UI/icons/ticketicons');
const generateTranscript = require('../../utils/generateTranscript');
const setupBanners = require('../../UI/banners/SetupBanners');
const cmdIcons = require('../../UI/icons/commandicons');
const checkPermissions = require('../../utils/checkPermissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('manage-ticket')
        .setDescription('Manage the ticket system')
        .addSubcommand(sub =>
            sub.setName('create')
                .setDescription('Create a new ticket manually')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Type of ticket to create')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Support', value: 'support' },
                            { name: 'Suggestion', value: 'suggestion' },
                            { name: 'Feedback', value: 'feedback' },
                            { name: 'Report', value: 'report' }
                        ))
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to create the ticket for (mod only)')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Initial reason for the ticket')
                        .setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('close')
                .setDescription('Close a ticket')
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for closing the ticket')
                        .setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('refresh')
                .setDescription('Refresh the ticket creation message in the ticket channel')
        ),

    async execute(interaction, client) {
        if (interaction.isCommand && interaction.isCommand()) {
              if (!await checkPermissions(interaction)) return;
        const { options, guild, user, channel, member } = interaction;
        const subCommand = options.getSubcommand();
        
       
        const config = await TicketConfig.findOne({ serverId: guild.id });
        if (!config) {
            return interaction.reply({
                content: '❌ Ticket system is not configured for this server. Use `/setup-ticket` first.',
                ephemeral: true
            });
        }

        
        if (!config.status) {
            return interaction.reply({
                content: '❌ Ticket system is currently disabled in this server.',
                ephemeral: true
            });
        }

      
        if (subCommand === 'refresh') {
          
            const hasPermission = member.permissions.has(PermissionsBitField.Flags.ManageChannels) || 
                                 config.ownerId === user.id || 
                                 member.roles.cache.has(config.adminRoleId);
            
            if (!hasPermission) {
                return interaction.reply({
                    content: '❌ You do not have permission to refresh the ticket message.',
                    ephemeral: true
                });
            }

            const ticketChannel = guild.channels.cache.get(config.ticketChannelId);
            if (!ticketChannel) {
                return interaction.reply({
                    content: '❌ Configured ticket channel not found. Please check settings.',
                    ephemeral: true
                });
            }

         
            await sendTicketEmbed(ticketChannel);
            
            return interaction.reply({
                content: '✅ Ticket creation message has been refreshed.',
                ephemeral: true
            });
        }

     
        if (subCommand === 'create') {
            const ticketType = options.getString('type');
            const targetUser = options.getUser('user') || user;
            const reason = options.getString('reason');
            
        
            if (targetUser.id !== user.id) {
                const hasPermission = member.permissions.has(PermissionsBitField.Flags.ManageChannels) || 
                                    config.ownerId === user.id || 
                                    member.roles.cache.has(config.adminRoleId);
                
                if (!hasPermission) {
                    return interaction.reply({
                        content: '❌ You do not have permission to create tickets for other users.',
                        ephemeral: true
                    });
                }
            }
            
      
            const existingTicket = await TicketUserData.findOne({ 
                userId: targetUser.id, 
                guildId: guild.id 
            });
            
            if (existingTicket) {
                const existingChannel = guild.channels.cache.get(existingTicket.ticketChannelId);
                if (existingChannel) {
                    return interaction.reply({
                        content: `❌ ${targetUser} already has an open ticket: ${existingChannel}`,
                        ephemeral: true
                    });
                } else {
                 
                    await TicketUserData.deleteOne({ 
                        userId: targetUser.id, 
                        guildId: guild.id 
                    });
                }
            }
            
            await interaction.deferReply({ ephemeral: true });
         
            const ticketChannel = await guild.channels.create({
                name: `${targetUser.username}-${ticketType}`,
                type: ChannelType.GuildText,
                parent: config.categoryId || null,
                permissionOverwrites: [
                    { 
                        id: guild.roles.everyone, 
                        deny: [PermissionsBitField.Flags.ViewChannel] 
                    },
                    { 
                        id: targetUser.id, 
                        allow: [
                            PermissionsBitField.Flags.ViewChannel, 
                            PermissionsBitField.Flags.SendMessages, 
                            PermissionsBitField.Flags.ReadMessageHistory
                        ] 
                    },
                    { 
                        id: config.adminRoleId, 
                        allow: [
                            PermissionsBitField.Flags.ViewChannel, 
                            PermissionsBitField.Flags.SendMessages, 
                            PermissionsBitField.Flags.ReadMessageHistory
                        ] 
                    }
                ]
            });
            
    
            await TicketUserData.create({
                userId: targetUser.id,
                guildId: guild.id,
                ticketChannelId: ticketChannel.id
            });
            
          
            await sendTicketWelcomeMessage(ticketChannel, targetUser, reason, ticketType);
            
            return interaction.followUp({
                content: `✅ Ticket created successfully in ${ticketChannel}`,
                ephemeral: true
            });
        }
        
       
        if (subCommand === 'close') {
        
            const ticketData = await TicketUserData.findOne({ 
                ticketChannelId: channel.id,
                guildId: guild.id
            });
            
            if (!ticketData) {
                return interaction.reply({
                    content: '❌ This command can only be used in ticket channels.',
                    ephemeral: true
                });
            }
            
          
            if (ticketData.userId !== user.id) {
                const hasPermission = member.permissions.has(PermissionsBitField.Flags.ManageChannels) || 
                                    config.ownerId === user.id || 
                                    member.roles.cache.has(config.adminRoleId);
                
                if (!hasPermission) {
                    return interaction.reply({
                        content: '❌ You do not have permission to close other users\' tickets.',
                        ephemeral: true
                    });
                }
            }
            
            await interaction.deferReply({ ephemeral: true });
            
            const reason = options.getString('reason') || 'No reason provided';
            const ticketOwner = await client.users.fetch(ticketData.userId).catch(() => null);
         
            const transcriptAttachment = await generateTranscript(channel, client);
            
           
            if (ticketOwner) {
                const closeEmbed = new EmbedBuilder()
                    .setColor('#FF5555')
                    .setAuthor({ name: "Ticket Closed", iconURL: ticketIcons.correctIcon })
                    .setDescription(`Your ticket in **${guild.name}** has been closed.`)
                    .addFields({ name: 'Close Reason', value: reason })
                    .setFooter({ text: 'Thanks for using our support system!', iconURL: ticketIcons.modIcon })
                    .setTimestamp();
                
                await ticketOwner.send({
                    content: 'Here is your ticket transcript:',
                    embeds: [closeEmbed],
                    files: [transcriptAttachment]
                }).catch(err => {
                    console.warn(`Could not DM user ${ticketOwner.tag}:`, err.message);
                });
            }
            
            // Send transcript to log channel
            if (config.transcriptChannelId) {
                const logChannel = guild.channels.cache.get(config.transcriptChannelId);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor('#5865F2')
                        .setTitle('Ticket Closed')
                        .addFields(
                            { name: 'Ticket', value: channel.name, inline: true },
                            { name: 'Closed By', value: user.tag, inline: true },
                            { name: 'Reason', value: reason }
                        )
                        .setTimestamp();
                    
                    await logChannel.send({ 
                        content: `📩 Transcript from ticket ${channel.name}`,
                        embeds: [logEmbed],
                        files: [transcriptAttachment] 
                    });
                }
            }
            
            await interaction.followUp({
                content: '✅ Ticket closing in 5 seconds...',
                ephemeral: true
            });
            
            // Delete channel and clean up database
            setTimeout(async () => {
                try {
                    await channel.delete();
                    await TicketUserData.deleteOne({ _id: ticketData._id });
                } catch (err) {
                    console.error("Error deleting ticket channel:", err);
                }
            }, 5000);
        }
    } else {
        const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setAuthor({ 
                name: "Alert!", 
                iconURL: cmdIcons.dotIcon,
                url: "https://discord.gg/xQF9f9yUEM"
            })
            .setDescription('- This command can only be used through slash commands!\n- Please use `/manage-ticket`')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
    }
};


async function sendTicketEmbed(channel) {

    const embed = new EmbedBuilder()
        .setAuthor({ name: "Welcome to Ticket Support", iconURL: ticketIcons.mainIcon })
        .setDescription(
            '- Please click below menu to create a new ticket.\n\n' +
            '**Ticket Guidelines:**\n' +
            '- Empty tickets are not permitted.\n' +
            '- Please be patient while waiting for a response from our support team.'
        )
        .setFooter({ text: 'We are here to Help!', iconURL: ticketIcons.modIcon })
        .setColor('#00FF00')
        .setImage(setupBanners.ticketBanner)
        .setTimestamp();

    const { StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
    
    const menu = new StringSelectMenuBuilder()
        .setCustomId('select_ticket_type')
        .setPlaceholder('Choose ticket type')
        .addOptions([
            { label: '🆘 Support', value: 'support' },
            { label: '📂 Suggestion', value: 'suggestion' },
            { label: '💜 Feedback', value: 'feedback' },
            { label: '⚠️ Report', value: 'report' }
        ]);

    const row = new ActionRowBuilder().addComponents(menu);

    try {
      
        const messages = await channel.messages.fetch({ limit: 10 });
        const botMessages = messages.filter(m => 
            m.author.bot && 
            m.embeds.length > 0 && 
            m.embeds[0].data.author?.name === "Welcome to Ticket Support"
        );
        
        if (botMessages.size > 0) {

            await botMessages.first().edit({ embeds: [embed], components: [row] });
        } else {

            await channel.send({ embeds: [embed], components: [row] });
        }
        return true;
    } catch (err) {
        console.error("Error sending ticket menu:", err);
        return false;
    }
}


async function sendTicketWelcomeMessage(channel, user, reason, ticketType) {
    const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
    
    const ticketId = `${user.id}-${channel.id}`;
    const ticketEmbed = new EmbedBuilder()
        .setAuthor({ name: `${ticketType.charAt(0).toUpperCase() + ticketType.slice(1)} Ticket`, iconURL: ticketIcons.modIcon })
        .setDescription(`Hello ${user}, welcome to our support!\n${reason ? `**Reason:** ${reason}\n\n` : ''}Please describe your issue in detail.`)
        .setFooter({ text: 'Your satisfaction is our priority', iconURL: ticketIcons.heartIcon })
        .setColor('#00FF00')
        .setTimestamp();

    const closeButton = new ButtonBuilder()
        .setCustomId(`close_ticket_${ticketId}`)
        .setLabel('Close Ticket')
        .setStyle(ButtonStyle.Danger);

    const pingButton = new ButtonBuilder()
        .setCustomId(`ping_staff_${ticketId}`)
        .setLabel('Ping Staff')
        .setStyle(ButtonStyle.Primary);

    const actionRow = new ActionRowBuilder().addComponents(closeButton, pingButton);

    await channel.send({ 
        content: `${user}`,
        embeds: [ticketEmbed], 
        components: [actionRow] 
    });
    

    const confirmEmbed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setAuthor({ name: "Ticket Created!", iconURL: ticketIcons.correctIcon })
        .setDescription(`Your **${ticketType}** ticket has been created.`)
        .addFields({ name: 'Ticket Channel', value: `${channel.url}` })
        .setFooter({ text: 'Thank you for reaching out!', iconURL: ticketIcons.modIcon })
        .setTimestamp();

    try {
        await user.send({ embeds: [confirmEmbed] });
    } catch (e) {
        console.log("Could not send DM to user");
    }
}

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