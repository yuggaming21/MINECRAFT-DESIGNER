const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const GeminiApiKey = require('../../models/ai/GeminiApiKey');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const checkPermissions = require('../../utils/checkPermissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-ai')
        .setDescription('Manage  API keys for AI-powered detection')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
        
        .addSubcommand(subcommand =>
            subcommand.setName('add')
                .setDescription('Add a new  API key')
                .addStringOption(option =>
                    option.setName('key')
                        .setDescription(' API key')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Friendly name for this key')
                        .setRequired(true)))
        
        .addSubcommand(subcommand =>
            subcommand.setName('remove')
                .setDescription('Remove a  API key')
                .addStringOption(option =>
                    option.setName('key-id')
                        .setDescription('Key ID to remove')
                        .setRequired(true)))
        
        .addSubcommand(subcommand =>
            subcommand.setName('list')
                .setDescription('List all  API keys'))
        
        .addSubcommand(subcommand =>
            subcommand.setName('enable')
                .setDescription('Enable a  API key')
                .addStringOption(option =>
                    option.setName('key-id')
                        .setDescription('Key ID to enable')
                        .setRequired(true)))
        
        .addSubcommand(subcommand =>
            subcommand.setName('disable')
                .setDescription('Disable a  API key')
                .addStringOption(option =>
                    option.setName('key-id')
                        .setDescription('Key ID to disable')
                        .setRequired(true)))
        
        .addSubcommand(subcommand =>
            subcommand.setName('test')
                .setDescription('Test a  API key')
                .addStringOption(option =>
                    option.setName('key-id')
                        .setDescription('Key ID to test (optional - tests all if empty)')
                        .setRequired(false)))
        
        .addSubcommand(subcommand =>
            subcommand.setName('stats')
                .setDescription('View API key usage statistics'))
        
        .addSubcommand(subcommand =>
            subcommand.setName('unblock')
                .setDescription('Manually unblock a  API key')
                .addStringOption(option =>
                    option.setName('key-id')
                        .setDescription('Key ID to unblock')
                        .setRequired(true))),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
              if (!await checkPermissions(interaction)) return;
        const subcommand = interaction.options.getSubcommand();
        
        try {
            switch (subcommand) {
                case 'add':
                    await this.handleAdd(interaction);
                    break;
                case 'remove':
                    await this.handleRemove(interaction);
                    break;
                case 'list':
                    await this.handleList(interaction);
                    break;
                case 'enable':
                    await this.handleEnable(interaction);
                    break;
                case 'disable':
                    await this.handleDisable(interaction);
                    break;
                case 'test':
                    await this.handleTest(interaction);
                    break;
                case 'stats':
                    await this.handleStats(interaction);
                    break;
                case 'unblock':
                    await this.handleUnblock(interaction);
                    break;
            }
        } catch (error) {
            console.error('Gemini setup command error:', error);
            return interaction.editReply({ content: '❌ An error occurred while managing API keys.' });
        }
    },

    async handleAdd(interaction) {
        const apiKey = interaction.options.getString('key').trim();
        const name = interaction.options.getString('name').trim();
        
        // Check if key already exists
        const existingKey = await GeminiApiKey.findOne({ apiKey });
        if (existingKey) {
            return interaction.editReply({ content: '❌ This API key is already registered.' });
        }
        
        // Generate unique key ID
        const keyId = `GEMINI_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        
        // Test the key before adding
        const testResult = await this.testApiKey(apiKey);
        
        if (!testResult.success) {
            return interaction.editReply({ 
                content: `❌ API key test failed: ${testResult.error}\nKey was not added.` 
            });
        }
        
        // Save to database
        const newKey = new GeminiApiKey({
            keyId,
            apiKey,
            name,
            addedBy: interaction.user.id,
            avgResponseTime: testResult.responseTime || 0
        });
        
        await newKey.save();
        
        const embed = new EmbedBuilder()
            .setTitle('✅ Gemini API Key Added')
            .setColor('#00ff00')
            .addFields(
                { name: 'Key ID', value: keyId, inline: true },
                { name: 'Name', value: name, inline: true },
                { name: 'Status', value: '🟢 Active', inline: true },
                { name: 'Test Result', value: `✅ Success (${testResult.responseTime}ms)`, inline: false }
            )
            .setTimestamp();
        
        return interaction.editReply({ embeds: [embed] });
    },

    async handleRemove(interaction) {
        const keyId = interaction.options.getString('key-id');
        
        const deleted = await GeminiApiKey.deleteOne({ keyId });
        
        if (deleted.deletedCount === 0) {
            return interaction.editReply({ content: '❌ API key not found.' });
        }
        
        return interaction.editReply({ content: `✅ Removed API key: \`${keyId}\`` });
    },

    async handleList(interaction) {
        const keys = await GeminiApiKey.find().sort({ addedAt: -1 });
        
        if (keys.length === 0) {
            return interaction.editReply({ content: '❌ No Gemini API keys found. Add one with `/setup-gemini add`' });
        }
        
        const embed = new EmbedBuilder()
            .setTitle('🤖 Gemini API Keys')
            .setColor('#0099ff')
            .setDescription(`Total keys: ${keys.length} | Active: ${keys.filter(k => k.isActive && !k.isBlocked).length}`)
            .setTimestamp();
        
        for (const key of keys.slice(0, 10)) { // Limit to 10 keys for display
            const status = key.isBlocked ? '🔴 Blocked' : key.isActive ? '🟢 Active' : '⚪ Disabled';
            const successRate = key.totalRequests > 0 ? 
                `${Math.round((key.successfulRequests / key.totalRequests) * 100)}%` : 'N/A';
            
            embed.addFields({
                name: `${key.name} (${key.keyId})`,
                value: `Status: ${status}\nRequests: ${key.totalRequests}\nSuccess Rate: ${successRate}\nLast Used: ${key.lastUsedAt ? key.lastUsedAt.toLocaleDateString() : 'Never'}`,
                inline: true
            });
        }
        
        if (keys.length > 10) {
            embed.setFooter({ text: `Showing 10 of ${keys.length} keys` });
        }
        
        return interaction.editReply({ embeds: [embed] });
    },

    async handleEnable(interaction) {
        const keyId = interaction.options.getString('key-id');
        
        const key = await GeminiApiKey.findOne({ keyId });
        if (!key) {
            return interaction.editReply({ content: '❌ API key not found.' });
        }
        
        key.isActive = true;
        key.lastModifiedAt = new Date();
        await key.save();
        
        return interaction.editReply({ content: `✅ Enabled API key: \`${key.name}\`` });
    },

    async handleDisable(interaction) {
        const keyId = interaction.options.getString('key-id');
        
        const key = await GeminiApiKey.findOne({ keyId });
        if (!key) {
            return interaction.editReply({ content: '❌ API key not found.' });
        }
        
        key.isActive = false;
        key.lastModifiedAt = new Date();
        await key.save();
        
        return interaction.editReply({ content: `✅ Disabled API key: \`${key.name}\`` });
    },

    async handleTest(interaction) {
        const keyId = interaction.options.getString('key-id');
        
        let keysToTest;
        if (keyId) {
            const key = await GeminiApiKey.findOne({ keyId });
            if (!key) {
                return interaction.editReply({ content: '❌ API key not found.' });
            }
            keysToTest = [key];
        } else {
            keysToTest = await GeminiApiKey.find({ isActive: true, isBlocked: false });
            if (keysToTest.length === 0) {
                return interaction.editReply({ content: '❌ No active API keys found to test.' });
            }
        }
        
        const embed = new EmbedBuilder()
            .setTitle('🔧 API Key Test Results')
            .setColor('#ffff00')
            .setTimestamp();
        
        for (const key of keysToTest.slice(0, 5)) { // Test max 5 keys
            const result = await this.testApiKey(key.apiKey);
            
            const status = result.success ? '✅ Success' : '❌ Failed';
            const details = result.success ? 
                `Response time: ${result.responseTime}ms` : 
                `Error: ${result.error}`;
            
            embed.addFields({
                name: `${key.name} (${key.keyId})`,
                value: `${status}\n${details}`,
                inline: true
            });
            
            // Update key stats
            if (result.success) {
                key.lastUsedAt = new Date();
                key.avgResponseTime = Math.round((key.avgResponseTime + result.responseTime) / 2);
            } else {
                key.lastErrorAt = new Date();
                key.lastErrorMessage = result.error;
            }
            await key.save();
        }
        
        return interaction.editReply({ embeds: [embed] });
    },

    async handleStats(interaction) {
        const keys = await GeminiApiKey.find();
        
        if (keys.length === 0) {
            return interaction.editReply({ content: '❌ No API keys found.' });
        }
        
        const totalRequests = keys.reduce((sum, key) => sum + key.totalRequests, 0);
        const totalSuccessful = keys.reduce((sum, key) => sum + key.successfulRequests, 0);
        const activeKeys = keys.filter(k => k.isActive && !k.isBlocked).length;
        const blockedKeys = keys.filter(k => k.isBlocked).length;
        
        const successRate = totalRequests > 0 ? 
            Math.round((totalSuccessful / totalRequests) * 100) : 0;
        
        const embed = new EmbedBuilder()
            .setTitle('📊 Gemini API Statistics')
            .setColor('#0099ff')
            .addFields(
                { name: 'Total Keys', value: keys.length.toString(), inline: true },
                { name: 'Active Keys', value: activeKeys.toString(), inline: true },
                { name: 'Blocked Keys', value: blockedKeys.toString(), inline: true },
                { name: 'Total Requests', value: totalRequests.toLocaleString(), inline: true },
                { name: 'Successful Requests', value: totalSuccessful.toLocaleString(), inline: true },
                { name: 'Success Rate', value: `${successRate}%`, inline: true }
            )
            .setTimestamp();
        
        return interaction.editReply({ embeds: [embed] });
    },

    async handleUnblock(interaction) {
        const keyId = interaction.options.getString('key-id');
        
        const key = await GeminiApiKey.findOne({ keyId });
        if (!key) {
            return interaction.editReply({ content: '❌ API key not found.' });
        }
        
        key.isBlocked = false;
        key.blockedUntil = null;
        key.blockedReason = null;
        key.lastModifiedAt = new Date();
        await key.save();
        
        return interaction.editReply({ content: `✅ Unblocked API key: \`${key.name}\`` });
    },

    async testApiKey(apiKey) {
        try {
            const startTime = Date.now();
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

            
            const result = await Promise.race([
                model.generateContent("Test message: respond with 'OK'"),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout')), 10000)
                )
            ]);
            
            const responseTime = Date.now() - startTime;
            const response = await result.response;
            
            return {
                success: true,
                responseTime,
                response: response.text()
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
};
