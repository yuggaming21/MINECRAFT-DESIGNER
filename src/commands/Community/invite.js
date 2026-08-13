import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const inviteData = new Map();

function getGuildData(guildId) {
    if (!inviteData.has(guildId)) {
        inviteData.set(guildId, {
            channelId: null,
            users: new Map(),
        });
    }

    return inviteData.get(guildId);
}

function getUserData(guildId, userId) {
    const guild = getGuildData(guildId);

    if (!guild.users.has(userId)) {
        guild.users.set(userId, {
            invites: 0,
            joined: 0,
            left: 0,
            inviterId: null,
        });
    }

    return guild.users.get(userId);
}

function getMember(interaction, value) {
    return (
        interaction.mentions?.members?.first?.() ||
        interaction.guild?.members?.cache?.get(value)
    );
}

function isAdmin(interaction) {
    return interaction.memberPermissions?.has(
        PermissionFlagsBits.ManageGuild
    );
}

export default {
    data: new SlashCommandBuilder()
        .setName('invite')
        .setDescription('Manage server invites')
        .addSubcommand(sub =>
            sub
                .setName('stats')
                .setDescription('Show invite statistics')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('User to check')
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('leaderboard')
                .setDescription('Show the invite leaderboard')
        )
        .addSubcommand(sub =>
            sub
                .setName('add')
                .setDescription('Add one invite to a user')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('User')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('remove')
                .setDescription('Remove one invite from a user')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('User')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('channel')
                .setDescription('Set the invite log channel')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Invite log channel')
                        .setRequired(true)
                )
        ),

    async prefixExecute(interaction) {
        try {
            const args = interaction.content
                ? interaction.content.trim().split(/\s+/)
                : [];

            const command = args[0]?.toLowerCase();
            const guildId = interaction.guildId;

            if (!guildId) return;

            const guild = getGuildData(guildId);

            // -i @user
            if (command === '-i') {
                if (!isAdmin(interaction)) {
                    return interaction.channel.send(
                        '❌ You need **Manage Server** permission.'
                    );
                }

                const userId =
                    interaction.mentions?.users?.first()?.id ||
                    args[1]?.replace(/[<@!>]/g, '');

                if (!userId) {
                    return interaction.channel.send(
                        '❌ Usage: `-i @user`'
                    );
                }

                const user = getUserData(guildId, userId);
                user.invites += 1;

                return interaction.channel.send(
                    `✅ Added **+1 invite** to <@${userId}>.\n` +
                    `📊 Total: **${user.invites}**`
                );
            }

            // -rmi @user
            if (command === '-rmi') {
                if (!isAdmin(interaction)) {
                    return interaction.channel.send(
                        '❌ You need **Manage Server** permission.'
                    );
                }

                const userId =
                    interaction.mentions?.users?.first()?.id ||
                    args[1]?.replace(/[<@!>]/g, '');

                if (!userId) {
                    return interaction.channel.send(
                        '❌ Usage: `-rmi @user`'
                    );
                }

                const user = getUserData(guildId, userId);
                user.invites = Math.max(0, user.invites - 1);

                return interaction.channel.send(
                    `✅ Removed **1 invite** from <@${userId}>.\n` +
                    `📊 Total: **${user.invites}**`
                );
            }

            // -invites
            if (command === '-invites') {
                const userId =
                    interaction.mentions?.users?.first()?.id ||
                    interaction.author?.id;

                if (!userId) return;

                const user = getUserData(guildId, userId);

                return interaction.channel.send({
                    embeds: [
                        createEmbed({
                            title: '🔗 Invite Statistics',
                            description:
                                `<@${userId}> has **${user.invites} invites**.`,
                        }).addFields(
                            {
                                name: '📥 Joined',
                                value: `${user.joined}`,
                                inline: true,
                            },
                            {
                                name: '📤 Left',
                                value: `${user.left}`,
                                inline: true,
                            }
                        ),
                    ],
                });
            }

            // -invitetop / -inviteleaderboard
            if (
                command === '-invitetop' ||
                command === '-inviteleaderboard'
            ) {
                const users = [...guild.users.entries()]
                    .sort((a, b) => b[1].invites - a[1].invites)
                    .slice(0, 10);

                if (!users.length) {
                    return interaction.channel.send(
                        '❌ No invite data yet.'
                    );
                }

                const leaderboard = users
                    .map(
                        ([userId, data], index) =>
                            `**${index + 1}.** <@${userId}> — **${data.invites}** invites`
                    )
                    .join('\n');

                return interaction.channel.send({
                    embeds: [
                        createEmbed({
                            title: '🏆 Invite Leaderboard',
                            description: leaderboard,
                        }),
                    ],
                });
            }

            // -inviteset #channel
            if (
                command === '-inviteset' ||
                command === '-invitechannel'
            ) {
                if (!isAdmin(interaction)) {
                    return interaction.channel.send(
                        '❌ You need **Manage Server** permission.'
                    );
                }

                const channel =
                    interaction.mentions?.channels?.first();

                if (!channel) {
                    return interaction.channel.send(
                        '❌ Usage: `-inviteset #invite-logs`'
                    );
                }

                guild.channelId = channel.id;

                return interaction.channel.send(
                    `✅ Invite log channel set to ${channel}.`
                );
            }

            // -invitehelp
            if (command === '-invitehelp') {
                return interaction.channel.send({
                    embeds: [
                        createEmbed({
                            title: '🔗 Invite Commands',
                            description: [
                                '`-i @user` — Add invite',
                                '`-rmi @user` — Remove invite',
                                '`-invites [@user]` — Show invites',
                                '`-invitetop` — Invite leaderboard',
                                '`-inviteleaderboard` — Invite leaderboard',
                                '`-inviteset #channel` — Set invite log channel',
                                '`-invitechannel #channel` — Set invite log channel',
                                '`/invite stats` — Invite statistics',
                                '`/invite leaderboard` — Leaderboard',
                                '`/invite add` — Add invite',
                                '`/invite remove` — Remove invite',
                                '`/invite channel` — Set log channel',
                            ].join('\n'),
                        }),
                    ],
                });
            }
        } catch (error) {
            logger.error('Invite prefix command error:', error);

            return interaction.channel?.send(
                '❌ An error occurred while processing the invite command.'
            ).catch(() => {});
        }
    },

    async execute(interaction) {
        const deferSuccess =
            await InteractionHelper.safeDefer(interaction);

        if (!deferSuccess) return;

        try {
            const guildId = interaction.guildId;
            const subcommand = interaction.options.getSubcommand();

            if (!guildId) {
                return InteractionHelper.safeEditReply(interaction, {
                    content: '❌ This command can only be used in a server.',
                });
            }

            const guild = getGuildData(guildId);

            // /invite stats
            if (subcommand === 'stats') {
                const target =
                    interaction.options.getUser('user') ||
                    interaction.user;

                const user = getUserData(
                    guildId,
                    target.id
                );

                return InteractionHelper.safeEditReply(interaction, {
                    embeds: [
                        createEmbed({
                            title: '🔗 Invite Statistics',
                            description: `${target} has **${user.invites} invites**.`,
                        }).addFields(
                            {
                                name: '📥 Joined',
                                value: `${user.joined}`,
                                inline: true,
                            },
                            {
                                name: '📤 Left',
                                value: `${user.left}`,
                                inline: true,
                            }
                        ),
                    ],
                });
            }

            // /invite leaderboard
            if (subcommand === 'leaderboard') {
                const users = [...guild.users.entries()]
                    .sort((a, b) => b[1].invites - a[1].invites)
                    .slice(0, 10);

                const description = users.length
                    ? users
                          .map(
                              ([userId, data], index) =>
                                  `**${index + 1}.** <@${userId}> — **${data.invites}** invites`
                          )
                          .join('\n')
                    : 'No invite data yet.';

                return InteractionHelper.safeEditReply(interaction, {
                    embeds: [
                        createEmbed({
                            title: '🏆 Invite Leaderboard',
                            description,
                        }),
                    ],
                });
            }

            // /invite add
            if (subcommand === 'add') {
                if (!interaction.memberPermissions.has(
                    PermissionFlagsBits.ManageGuild
                )) {
                    return InteractionHelper.safeEditReply(interaction, {
                        content:
                            '❌ You need **Manage Server** permission.',
                    });
                }

                const target =
                    interaction.options.getUser('user');

                const user = getUserData(
                    guildId,
                    target.id
                );

                user.invites += 1;

                return InteractionHelper.safeEditReply(interaction, {
                    content:
                        `✅ Added **+1 invite** to ${target}.\n` +
                        `📊 Total: **${user.invites}**`,
                });
            }

            // /invite remove
            if (subcommand === 'remove') {
                if (!interaction.memberPermissions.has(
                    PermissionFlagsBits.ManageGuild
                )) {
                    return InteractionHelper.safeEditReply(interaction, {
                        content:
                            '❌ You need **Manage Server** permission.',
                    });
                }

                const target =
                    interaction.options.getUser('user');

                const user = getUserData(
                    guildId,
                    target.id
                );

                user.invites = Math.max(
                    0,
                    user.invites - 1
                );

                return InteractionHelper.safeEditReply(interaction, {
                    content:
                        `✅ Removed **1 invite** from ${target}.\n` +
                        `📊 Total: **${user.invites}**`,
                });
            }

            // /invite channel
            if (subcommand === 'channel') {
                if (!interaction.memberPermissions.has(
                    PermissionFlagsBits.ManageGuild
                )) {
                    return InteractionHelper.safeEditReply(interaction, {
                        content:
                            '❌ You need **Manage Server** permission.',
                    });
                }

                const channel =
                    interaction.options.getChannel('channel');

                guild.channelId = channel.id;

                return InteractionHelper.safeEditReply(interaction, {
                    content:
                        `✅ Invite log channel set to ${channel}.`,
                });
            }
        } catch (error) {
            logger.error('Invite command error:', error);

            return InteractionHelper.safeEditReply(interaction, {
                embeds: [
                    createEmbed({
                        title: 'System Error',
                        description:
                            'Could not process the invite command.',
                        color: 'error',
                    }),
                ],
            }).catch(() => {});
        }
    },
};
