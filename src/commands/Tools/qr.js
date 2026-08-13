import { SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    data: new SlashCommandBuilder()
        .setName('qr')
        .setDescription('Show the QR code'),

    async execute(interaction) {
        const qrPath = path.join(__dirname, '../../../assets/qr.png');

        const qr = new AttachmentBuilder(qrPath, {
            name: 'qr.png',
        });

        await interaction.reply({
            content: '📱 **Scan this QR code:**',
            files: [qr],
        });
    },
};
