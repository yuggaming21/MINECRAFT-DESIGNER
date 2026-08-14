import { SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getQrFile() {
  const qrPath = path.join(__dirname, '../../../assets/qr.png');

  return new AttachmentBuilder(qrPath, {
    name: 'qr.png'
  });
}

export default {
  data: new SlashCommandBuilder()
    .setName('qr')
    .setDescription('Show the QR code'),

  supportsPrefixExecution: true,

  async execute(interaction) {
    await interaction.reply({
      content: '📱 **Scan this QR code:**',
      files: [getQrFile()]
    });
  },

  async executePrefix(message) {
    await message.reply({
      content: '📱 **Scan this QR code:**',
      files: [getQrFile()]
    });
  }
};
