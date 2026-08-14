
const { SlashCommandBuilder, PermissionsBitField, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const TruthOrDareConfig = require('../../models/truthordare/TruthOrDareConfig');
const checkPermissions = require('../../utils/checkPermissions');
const cmdIcons = require('../../UI/icons/commandicons');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-truthordare')
        .setDescription('Configure the Truth or Dare channel and view settings')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels)
        .addSubcommand(sub =>
            sub.setName('set')
                .setDescription('Set the Truth or Dare interaction channel')
                .addChannelOption(opt =>
                    opt.setName('channel')
                        .setDescription('Channel where the Truth or Dare embed will be sent')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('view')
                .setDescription('View the current Truth or Dare configuration')
        ),

    async execute(interaction) {
        if (interaction.isCommand && interaction.isCommand()) {
        if (!await checkPermissions(interaction)) return;
        const { options, guild, user } = interaction;
        const sub = options.getSubcommand();
        const serverId = guild.id;

        if (sub === 'set') {
            const targetChannel = options.getChannel('channel');

            await TruthOrDareConfig.findOneAndUpdate(
                { serverId },
                { serverId, channelId: targetChannel.id },
                { upsert: true }
            );

            const embed = new EmbedBuilder()
                .setTitle('🎭 Truth or Dare')
                .setDescription('Click a button below to receive a **Truth**, **Dare**, or let fate decide with **Random**! 🎲')
                .setColor('#ff66cc')
                .setFooter({ text: 'Game time!' })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('tod_truth').setLabel('Truth').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('tod_dare').setLabel('Dare').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('tod_random').setLabel('Random').setStyle(ButtonStyle.Secondary)
            );

            await targetChannel.send({ embeds: [embed], components: [row] });

            return interaction.reply({
                content: `✅ Truth or Dare system is now active in ${targetChannel}.`,
                ephemeral: true
            });
        }

        if (sub === 'view') {
            const config = await TruthOrDareConfig.findOne({ serverId });
            if (!config) {
                return interaction.reply({ content: '❌ No Truth or Dare channel has been set yet.', ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setTitle('📋 Truth or Dare Configuration')
                .addFields({ name: 'Channel', value: `<#${config.channelId}>` })
                .setColor('#3498db')
                .setFooter({ text: 'Truth or Dare Settings' })
                .setTimestamp();

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
    } else {
        const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setAuthor({ 
                name: "Alert!", 
                iconURL: cmdIcons.dotIcon,
                url: "https://discord.gg/xQF9f9yUEM"
            })
            .setDescription('- This command can only be used through slash commands!\n- Please use `/setup-truthordare`')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
    }
};
