const {
  SlashCommandBuilder,
  AttachmentBuilder,
} = require("discord.js");
const QRCode = require("qrcode");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("qr")
    .setDescription("Create a QR code")
    .addStringOption(option =>
      option
        .setName("text")
        .setDescription("Text or link for the QR code")
        .setRequired(true)
    ),

  async execute(interaction) {
    const text = interaction.options.getString("text");

    try {
      const buffer = await QRCode.toBuffer(text, {
        width: 500,
        margin: 2,
      });

      const attachment = new AttachmentBuilder(buffer, {
        name: "qr-code.png",
      });

      await interaction.reply({
        content: `✅ QR Code generated!\n**Content:** ${text}`,
        files: [attachment],
      });
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "❌ QR code generate nahi ho saka.",
        ephemeral: true,
      });
    }
  },
};
