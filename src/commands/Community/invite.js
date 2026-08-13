const {
  EmbedBuilder,
  PermissionsBitField,
} = require("discord.js");

const fs = require("fs");
const path = require("path");

// ===============================
// INVITE SYSTEM CONFIG
// ===============================

const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "invites.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({}, null, 2));
}

// ===============================
// DATABASE
// ===============================

function loadData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function getGuildData(data, guildId) {
  if (!data[guildId]) {
    data[guildId] = {
      channelId: null,
      users: {},
    };
  }

  return data[guildId];
}

function getUserData(guildData, userId) {
  if (!guildData.users[userId]) {
    guildData.users[userId] = {
      invites: 0,
      joined: 0,
      left: 0,
      inviterId: null,
    };
  }

  return guildData.users[userId];
}

// ===============================
// FIND MEMBER
// ===============================

function findMember(message, input) {
  if (!input) return null;

  return (
    message.mentions.members.first() ||
    message.guild.members.cache.get(input) ||
    message.guild.members.cache.find(
      (member) =>
        member.user.username.toLowerCase() === input.toLowerCase()
    )
  );
}

// ===============================
// PERMISSION
// ===============================

function isAdmin(message) {
  return message.member.permissions.has(
    PermissionsBitField.Flags.ManageGuild
  );
}

// ===============================
// INVITE SYSTEM
// ===============================

module.exports = {
  name: "invite-system",

  async init(client) {
    // Invite cache
    client.inviteCache = new Map();

    // ===========================
    // READY
    // ===========================

    client.once("ready", async () => {
      console.log("✅ Invite System Loaded");

      for (const guild of client.guilds.cache.values()) {
        try {
          const invites = await guild.invites.fetch();

          const cache = new Map();

          invites.forEach((invite) => {
            cache.set(invite.code, invite.uses || 0);
          });

          client.inviteCache.set(guild.id, cache);
        } catch (error) {
          console.log(
            `❌ Invite cache failed for ${guild.name}: ${error.message}`
          );
        }
      }
    });

    // ===========================
    // INVITE CREATE
    // ===========================

    client.on("inviteCreate", async (invite) => {
      try {
        const invites = await invite.guild.invites.fetch();

        const cache = new Map();

        invites.forEach((inv) => {
          cache.set(inv.code, inv.uses || 0);
        });

        client.inviteCache.set(invite.guild.id, cache);
      } catch {}
    });

    // ===========================
    // MEMBER JOIN
    // ===========================

    client.on("guildMemberAdd", async (member) => {
      let inviter = null;

      try {
        const oldCache =
          client.inviteCache.get(member.guild.id) || new Map();

        const newInvites = await member.guild.invites.fetch();

        const usedInvite = newInvites.find((invite) => {
          const oldUses = oldCache.get(invite.code) || 0;

          return (invite.uses || 0) > oldUses;
        });

        const newCache = new Map();

        newInvites.forEach((invite) => {
          newCache.set(invite.code, invite.uses || 0);
        });

        client.inviteCache.set(member.guild.id, newCache);

        if (usedInvite?.inviter) {
          inviter = usedInvite.inviter;
        }
      } catch (error) {
        console.log(
          `Invite detect error: ${error.message}`
        );
      }

      const data = loadData();
      const guildData = getGuildData(data, member.guild.id);

      // =========================
      // ADD INVITE
      // =========================

      if (inviter && inviter.id !== member.id) {
        const inviterData = getUserData(
          guildData,
          inviter.id
        );

        inviterData.invites += 1;
        inviterData.joined += 1;

        const joinedUserData = getUserData(
          guildData,
          member.id
        );

        joinedUserData.inviterId = inviter.id;

        saveData(data);
      }

      // =========================
      // LOG CHANNEL
      // =========================

      if (guildData.channelId) {
        const channel = member.guild.channels.cache.get(
          guildData.channelId
        );

        if (channel) {
          const embed = new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle("📥 Member Joined")
            .setDescription(
              `${member} joined the server.`
            )
            .addFields(
              {
                name: "Member",
                value: member.user.tag,
                inline: true,
              },
              {
                name: "Inviter",
                value: inviter
                  ? `${inviter}`
                  : "Unknown / Vanity",
                inline: true,
              },
              {
                name: "Invite Added",
                value: inviter ? "+1" : "0",
                inline: true,
              }
            )
            .setTimestamp();

          channel.send({
            embeds: [embed],
          }).catch(() => {});
        }
      }
    });

    // ===========================
    // MEMBER LEAVE
    // ===========================

    client.on("guildMemberRemove", async (member) => {
      const data = loadData();

      const guildData = getGuildData(
        data,
        member.guild.id
      );

      const memberData = guildData.users[member.id];

      if (
        memberData &&
        memberData.inviterId &&
        guildData.users[memberData.inviterId]
      ) {
        const inviterData =
          guildData.users[memberData.inviterId];

        inviterData.invites = Math.max(
          0,
          inviterData.invites - 1
        );

        inviterData.left += 1;

        saveData(data);
      }

      // =========================
      // LEAVE LOG
      // =========================

      if (guildData.channelId) {
        const channel = member.guild.channels.cache.get(
          guildData.channelId
        );

        if (channel) {
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle("📤 Member Left")
            .setDescription(
              `${member.user.tag} left the server.`
            )
            .setTimestamp();

          channel.send({
            embeds: [embed],
          }).catch(() => {});
        }
      }
    });

    // ===========================
    // PREFIX COMMANDS
    // ===========================

    client.on("messageCreate", async (message) => {
      if (message.author.bot) return;
      if (!message.guild) return;

      const prefix = "-";

      if (!message.content.startsWith(prefix)) return;

      const args = message.content
        .slice(prefix.length)
        .trim()
        .split(/\s+/);

      const command = args
        .shift()
        .toLowerCase();

      const commands = [
        "i",
        "rmi",
        "invites",
        "inviteinfo",
        "inviter",
        "invitetop",
        "inviteleaders",
        "inviterank",
        "inviteset",
        "invitechannel",
        "invitereset",
        "invitesync",
        "inviterewards",
        "invitehelp",
      ];

      if (!commands.includes(command)) return;

      const data = loadData();

      const guildData = getGuildData(
        data,
        message.guild.id
      );

      // ===========================
      // ADMIN COMMANDS
      // ===========================

      const adminCommands = [
        "i",
        "rmi",
        "inviteset",
        "invitechannel",
        "invitereset",
        "invitesync",
      ];

      if (
        adminCommands.includes(command) &&
        !isAdmin(message)
      ) {
        return message.reply(
          "❌ You need **Manage Server** permission."
        );
      }

      // ===========================
      // -i
      // ===========================

      if (command === "i") {
        const member = findMember(
          message,
          args[0]
        );

        if (!member) {
          return message.reply(
            "❌ Usage: `-i @user`"
          );
        }

        const userData = getUserData(
          guildData,
          member.id
        );

        userData.invites += 1;

        saveData(data);

        return message.reply(
          `✅ Added **+1 invite** to ${member}.\n` +
          `📊 Total Invites: **${userData.invites}**`
        );
      }

      // ===========================
      // -rmi
      // ===========================

      if (command === "rmi") {
        const member = findMember(
          message,
          args[0]
        );

        if (!member) {
          return message.reply(
            "❌ Usage: `-rmi @user`"
          );
        }

        const userData = getUserData(
          guildData,
          member.id
        );

        userData.invites = Math.max(
          0,
          userData.invites - 1
        );

        saveData(data);

        return message.reply(
          `✅ Removed **1 invite** from ${member}.\n` +
          `📊 Total Invites: **${userData.invites}**`
        );
      }

      // ===========================
      // -invites
      // ===========================

      if (command === "invites") {
        const member =
          findMember(message, args[0]) ||
          message.member;

        const userData = getUserData(
          guildData,
          member.id
        );

        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x5865f2)
              .setTitle("🔗 Invite Stats")
              .setThumbnail(
                member.displayAvatarURL()
              )
              .addFields(
                {
                  name: "👥 Invites",
                  value: `${userData.invites}`,
                  inline: true,
                },
                {
                  name: "📥 Joined",
                  value: `${userData.joined}`,
                  inline: true,
                },
                {
                  name: "📤 Left",
                  value: `${userData.left}`,
                  inline: true,
                }
              )
              .setFooter({
                text: message.guild.name,
              }),
          ],
        });
      }

      // ===========================
      // -inviteinfo
      // ===========================

      if (command === "inviteinfo") {
        const member =
          findMember(message, args[0]) ||
          message.member;

        const userData = getUserData(
          guildData,
          member.id
        );

        const inviter = userData.inviterId
          ? message.guild.members.cache.get(
              userData.inviterId
            )
          : null;

        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x5865f2)
              .setTitle(
                `🔗 ${member.user.username}`
              )
              .setThumbnail(
                member.displayAvatarURL()
              )
              .addFields(
                {
                  name: "Invites",
                  value: `${userData.invites}`,
                  inline: true,
                },
                {
                  name: "Joined",
                  value: `${userData.joined}`,
                  inline: true,
                },
                {
                  name: "Left",
                  value: `${userData.left}`,
                  inline: true,
                },
                {
                  name: "Inviter",
                  value: inviter
                    ? `${inviter}`
                    : "Unknown",
                }
              ),
          ],
        });
      }

      // ===========================
      // -inviter
      // ===========================

      if (command === "inviter") {
        const member =
          findMember(message, args[0]) ||
          message.member;

        const userData = getUserData(
          guildData,
          member.id
        );

        const inviter = userData.inviterId
          ? message.guild.members.cache.get(
              userData.inviterId
            )
          : null;

        return message.reply(
          `👤 ${member} was invited by ${
            inviter
              ? inviter
              : "Unknown / Vanity"
          }`
        );
      }

      // ===========================
      // LEADERBOARD
      // ===========================

      if (
        command === "invitetop" ||
        command === "inviteleaders"
      ) {
        const users = Object.entries(
          guildData.users
        )
          .sort(
            (a, b) =>
              b[1].invites - a[1].invites
          )
          .slice(0, 10);

        if (!users.length) {
          return message.reply(
            "❌ No invite data available."
          );
        }

        const leaderboard = users
          .map(([id, user], index) => {
            const member =
              message.guild.members.cache.get(id);

            return (
              `**${index + 1}.** ` +
              `${member ? member.user.tag : `<@${id}>`} ` +
              `— **${user.invites} invites**`
            );
          })
          .join("\n");

        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xfee75c)
              .setTitle("🏆 Invite Leaderboard")
              .setDescription(leaderboard),
          ],
        });
      }

      // ===========================
      // -inviterank
      // ===========================

      if (command === "inviterank") {
        const member =
          findMember(message, args[0]) ||
          message.member;

        const userData = getUserData(
          guildData,
          member.id
        );

        const sorted = Object.entries(
          guildData.users
        ).sort(
          (a, b) =>
            b[1].invites - a[1].invites
        );

        const rank =
          sorted.findIndex(
            ([id]) => id === member.id
          ) + 1;

        return message.reply(
          `🏆 ${member} is **#${rank}** with **${userData.invites} invites**.`
        );
      }

      // ===========================
      // -inviteset
      // ===========================

      if (command === "inviteset") {
        const channel =
          message.mentions.channels.first();

        if (!channel) {
          return message.reply(
            "❌ Usage: `-inviteset #channel`"
          );
        }

        guildData.channelId = channel.id;

        saveData(data);

        return message.reply(
          `✅ Invite log channel set to ${channel}.`
        );
      }

      // ===========================
      // -invitechannel
      // ===========================

      if (command === "invitechannel") {
        if (
          args[0] &&
          args[0].toLowerCase() === "off"
        ) {
          guildData.channelId = null;

          saveData(data);

          return message.reply(
            "✅ Invite logs disabled."
          );
        }

        if (!guildData.channelId) {
          return message.reply(
            "❌ Invite log channel is not set."
          );
        }

        const channel =
          message.guild.channels.cache.get(
            guildData.channelId
          );

        return message.reply(
          `📢 Invite channel: ${
            channel
              ? channel
              : `#${guildData.channelId}`
          }`
        );
      }

      // ===========================
      // -invitereset
      // ===========================

      if (command === "invitereset") {
        const member = findMember(
          message,
          args[0]
        );

        if (!member) {
          return message.reply(
            "❌ Usage: `-invitereset @user`"
          );
        }

        guildData.users[member.id] = {
          invites: 0,
          joined: 0,
          left: 0,
          inviterId: null,
        };

        saveData(data);

        return message.reply(
          `✅ Invite stats reset for ${member}.`
        );
      }

      // ===========================
      // -invitesync
      // ===========================

      if (command === "invitesync") {
        try {
          const invites =
            await message.guild.invites.fetch();

          const cache = new Map();

          invites.forEach((invite) => {
            cache.set(
              invite.code,
              invite.uses || 0
            );
          });

          client.inviteCache.set(
            message.guild.id,
            cache
          );

          return message.reply(
            "✅ Invite cache synced successfully."
          );
        } catch {
          return message.reply(
            "❌ I can't fetch invites. Make sure the bot has **Manage Server** permission."
          );
        }
      }

      // ===========================
      // -inviterewards
      // ===========================

      if (command === "inviterewards") {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x57f287)
              .setTitle("🎁 Invite Rewards")
              .setDescription(
                "Invite rewards system is ready.\n\n" +
                "You can connect roles/rewards to invite milestones."
              ),
          ],
        });
      }

      // ===========================
      // -invitehelp
      // ===========================

      if (command === "invitehelp") {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x5865f2)
              .setTitle("🔗 Invite System Commands")
              .setDescription(
                [
                  "`-i @user` — Add invite",
                  "`-rmi @user` — Remove invite",
                  "`-invites [@user]` — Invite stats",
                  "`-inviteinfo [@user]` — Full info",
                  "`-inviter [@user]` — Show inviter",
                  "`-invitetop` — Leaderboard",
                  "`-inviteleaders` — Leaderboard",
                  "`-inviterank [@user]` — Invite rank",
                  "`-inviteset #channel` — Set log channel",
                  "`-invitechannel` — Show log channel",
                  "`-invitechannel off` — Disable logs",
                  "`-invitereset @user` — Reset invites",
                  "`-invitesync` — Sync invite cache",
                  "`-inviterewards` — Rewards",
                  "`-invitehelp` — Help",
                ].join("\n")
              ),
          ],
        });
      }
    });
  },
};
