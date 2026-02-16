// index.js

const {
  Client,
  GatewayIntentBits,
  Partials,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Events,
  SlashCommandBuilder,
  PermissionsBitField,
} = require("discord.js");

const fs = require("fs");
const express = require("express");


// ================================
// 🌍 Web Service (Render Ready)
// ================================
const app = express();

app.get("/", (req, res) => {
  res.send("Bot is running ✅");
});

app.listen(3000, () => {
  console.log("🌍 Web Service running on port 3000");
});


// ================================
// 🤖 Discord Bot Setup
// ================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});


// ================================
// 📌 Database (points.json)
// ================================
let data = {};
const DATA_FILE = "./points.json";

if (fs.existsSync(DATA_FILE)) {
  data = JSON.parse(fs.readFileSync(DATA_FILE));
}

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}


// ================================
// ⚙️ SETTINGS
// ================================
const TICKET_CATEGORY_ID = "1407559493587308586";


// ================================
// ✅ Ready Event
// ================================
client.once(Events.ClientReady, async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);

  const guild = client.guilds.cache.first();

  // Slash Commands
  await guild.commands.set([
    new SlashCommandBuilder()
      .setName("panel")
      .setDescription("إرسال لوحة فتح التكت (Administrator فقط)")
      .toJSON(),

    new SlashCommandBuilder()
      .setName("points")
      .setDescription("عرض نقاطك (Administrator فقط)")
      .toJSON(),

    new SlashCommandBuilder()
      .setName("leaderboard")
      .setDescription("عرض ترتيب النقاط (Administrator فقط)")
      .toJSON(),
  ]);

  console.log("✅ Slash Commands Registered");
});


// ================================
// 🎫 /panel Command
// ================================
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "panel") {
    if (
      !interaction.member.permissions.has(
        PermissionsBitField.Flags.Administrator
      )
    ) {
      return interaction.reply({
        content: "🚫 فقط الأدمنستريتر يستطيع إرسال Panel",
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle("🎫 نظام التكت الاحترافي")
      .setDescription(
        "اضغط الزر أدناه لفتح تكت خاص بك.\n\nبعد استلام التكت، فقط صاحب التكت والمستلم يمكنهم الكتابة."
      )
      .setColor(0x1e90ff)
      .setFooter({ text: "Ticket System • Professional" });

    const openBtn = new ButtonBuilder()
      .setCustomId("open_ticket")
      .setLabel("فتح تكت")
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(openBtn);

    await interaction.channel.send({
      embeds: [embed],
      components: [row],
    });

    return interaction.reply({
      content: "✅ تم إرسال Panel بنجاح",
      ephemeral: true,
    });
  }
});


// ================================
// 🎫 Open Ticket Button
// ================================
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId === "open_ticket") {
    const member = interaction.member;
    const guild = interaction.guild;

    const ticketChannel = await guild.channels.create({
      name: `ticket-${member.user.username}`,
      type: 0,
      parent: TICKET_CATEGORY_ID,

      permissionOverwrites: [
        {
          id: guild.id,
          deny: ["ViewChannel"],
        },
        {
          id: member.id,
          allow: ["ViewChannel", "SendMessages"],
        },
      ],
    });

    const embed = new EmbedBuilder()
      .setTitle("🎫 تكت جديد")
      .setDescription("اضغط الزر لاستلام التكت والحصول على نقطة.")
      .setColor(0x1e90ff);

    const claimBtn = new ButtonBuilder()
      .setCustomId("claim_ticket")
      .setLabel("استلام التكت")
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(claimBtn);

    await ticketChannel.send({
      content: `<@${member.id}>`,
      embeds: [embed],
      components: [row],
    });

    return interaction.reply({
      content: `✅ تم فتح تكتك: ${ticketChannel}`,
      ephemeral: true,
    });
  }
});


// ================================
// ✅ Claim Ticket Button
// ================================
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId === "claim_ticket") {
    const channel = interaction.channel;
    const member = interaction.member;

    if (
      !member.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      return interaction.reply({
        content: "🚫 فقط الأدمنستريتر يستطيع استلام التكت",
        ephemeral: true,
      });
    }

    if (channel.topic) {
      return interaction.reply({
        content: "⚠️ التكت تم استلامه مسبقًا",
        ephemeral: true,
      });
    }

    channel.setTopic(member.id);

    data[member.id] = (data[member.id] || 0) + 1;
    saveData();

    // Lock channel: only owner + claimer
    await channel.permissionOverwrites.edit(channel.guild.id, {
      ViewChannel: false,
    });

    await channel.permissionOverwrites.edit(member.id, {
      ViewChannel: true,
      SendMessages: true,
    });

    interaction.reply({
      content: `✅ تم استلام التكت! نقاطك الآن: ${data[member.id]}`,
      ephemeral: true,
    });

    // Disable button
    const disabledRow = new ActionRowBuilder().addComponents(
      interaction.component.setDisabled(true)
    );

    await interaction.message.edit({ components: [disabledRow] });
  }
});


// ================================
// ⭐ /points Command
// ================================
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "points") {
    if (
      !interaction.member.permissions.has(
        PermissionsBitField.Flags.Administrator
      )
    ) {
      return interaction.reply({
        content: "🚫 فقط الأدمنستريتر يستطيع رؤية النقاط",
        ephemeral: true,
      });
    }

    const points = data[interaction.user.id] || 0;

    return interaction.reply({
      content: `⭐ نقاطك الحالية: **${points}**`,
      ephemeral: true,
    });
  }
});


// ================================
// 🏆 /leaderboard Command
// ================================
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "leaderboard") {
    if (
      !interaction.member.permissions.has(
        PermissionsBitField.Flags.Administrator
      )
    ) {
      return interaction.reply({
        content: "🚫 فقط الأدمنستريتر يستطيع رؤية الترتيب",
        ephemeral: true,
      });
    }

    let sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);

    let desc =
      sorted
        .slice(0, 10)
        .map(
          ([id, pts], i) => `**${i + 1}.** <@${id}> → **${pts}** نقطة`
        )
        .join("\n") || "لا يوجد نقاط حتى الآن.";

    const embed = new EmbedBuilder()
      .setTitle("🏆 Leaderboard")
      .setDescription(desc)
      .setColor(0x00ff00);

    return interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  }
});


// ================================
// 🔑 Login
// ================================
client.login(process.env.TOKEN);
