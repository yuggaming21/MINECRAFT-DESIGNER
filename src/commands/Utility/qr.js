import { SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
import QRCode from 'qrcode';

export default {
  data: new SlashCommandBuilder()
    .setName('qr')
    .setDescription('Generate a QR code')
    .addStringOption(option =>
      option
        .setName('text')
        .setDescription('Text or URL')
        .setRequired(true)
    ),

  async execute(interaction) {
    const text = interaction.options.getString('text');

    const buffer = await QRCode.toBuffer(text, {
      width: 600,
      margin: 2,
      errorCorrectionLevel: 'H'
    });

    const file = new AttachmentBuilder(buffer, {
      name: 'qr-code.png'
    });

    await interaction.reply({
      content: '✅ QR Code Generated!',
      files: [file]
    });
  }
};
