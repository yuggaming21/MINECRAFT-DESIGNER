const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const ruleEmbeds = require("../../data/rules/rulesEmbed");
const checkPermissions = require('../../utils/checkPermissions');
const cmdIcons = require('../../UI/icons/commandicons');
module.exports = {
    data: new SlashCommandBuilder()
        .setName("setup-rules")
        .setDescription("Set a rules channel and send specific rules.")
        .addChannelOption(option =>
            option.setName("channel")
                .setDescription("Select the channel to send rules")
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("category")
                .setDescription("Select a rule category or 'all' for all rules")
                .setRequired(true)
                .addChoices(
                    { name: "All Rules", value: "all" },
                    { name: "Spam", value: "spam" },
                    { name: "NSFW", value: "nsfw" },
                    { name: "Discord Terms", value: "discord_terms" },
                    { name: "Harassment", value: "harassment" },
                    { name: "Links", value: "links" },
                    { name: "Images", value: "images" },
                    { name: "Hacking", value: "hacking" },
                    { name: "Mic Spam", value: "mic_spam" },
                    { name: "Bot Usage", value: "bot_usage" },
                    { name: "Trading & Selling", value: "trading_selling" },
                    { name: "Language", value: "language" },
                    { name: "Spoilers", value: "spoilers" },
                    { name: "Self-Promotion", value: "self_promotion" },
                    { name: "Moderation", value: "moderation" }
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        if (interaction.isCommand && interaction.isCommand()) {
        await interaction.deferReply({  flags: 64  });
        if (!await checkPermissions(interaction)) return;
        const channel = interaction.options.getChannel("channel");
        const category = interaction.options.getString("category");

        try {
            if (category === "all") {
                const allEmbeds = Object.values(ruleEmbeds);

                for (let i = 0; i < allEmbeds.length; i += 10) {
                    await channel.send({ embeds: allEmbeds.slice(i, i + 10) }); 
                }

                await interaction.editReply(`✅ All rules have been sent in ${channel}.`);
                return;
            }

            if (ruleEmbeds[category]) {
                await channel.send({ embeds: [ruleEmbeds[category]] });
                await interaction.editReply(`✅ ${category} rules have been sent in ${channel}.`);
                return;
            }

            await interaction.editReply("❌ Invalid rule category selected.");
        } catch (error) {
            console.error("❌ Error sending rules:", error);
            await interaction.editReply("❌ Failed to send rules. Please check my permissions.");
        }
        

       } else {
        const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setAuthor({ 
                name: "Alert!", 
                iconURL: cmdIcons.dotIcon,
                url: "https://discord.gg/xQF9f9yUEM"
            })
            .setDescription('- This command can only be used through slash commands!\n- Please use `/setup-rules`')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
    }
};
