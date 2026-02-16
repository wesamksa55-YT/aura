// ================================
// 🤖 Ticket Bot Full System
// Web Service + Tickets + Points + Staff Tools
// ================================

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
  res.send("Bot Running Successfully ✅");
});

app.listen(3000, () => {
  console.log("🌍 Web Service Running on Port 3000");
});


// ================================
// 🤖 Discord Client
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
// ⚙️ SETTINGS
// ================================
const STAFF_ROLE_ID = "1418006369491222689"; // ستاف رول
const TICKET_CATEGORY_ID = "PUT_CATEGORY_ID_HERE"; // كاتيجوري التكت


// ================================
// 📌 DATABASE (Points + Warnings)
// ================================

// Points
let points = {};
if (fs.existsSync("./points.json")) {
  points = JSON.parse(fs.readFileSync("./points.json"));
}
function savePoints() {
  fs.writeFileSync("./points.json", JSON.stringify(points, null, 2));
}

// Warnings
let warnings = {};
if (fs.existsSync("./warnings.json")) {
  warnings = JSON.parse(fs.readFileSync("./warnings.json"));
}
function saveWarnings() {
  fs.writeFileSync("./warnings.json", JSON.stringify(warnings, null, 2));
}


// ================================
// ✅ STAFF CHECK
// ================================
function isStaff(member) {
  return member.roles.cache.has(STAFF_ROLE_ID);
}


// ================================
// ✅ READY EVENT
// ================================
client.once(Events.ClientReady, async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);

  // Slash Commands Register
  const commands = [

    // Panel
    new SlashCommandBuilder()
      .setName("panel")
      .setDescription("إرسال لوحة فتح التكت (Admin فقط)"),

    // Points
    new SlashCommandBuilder()
      .setName("points")
      .setDescription("عرض نقاطك (Staff)"),

    new SlashCommandBuilder()
      .setName("leaderboard")
      .setDescription("عرض ترتيب النقاط (Staff)"),

    // Warnings
    new SlashCommandBuilder()
      .setName("warn")
      .setDescription("تحذير عضو (Staff)")
      .addUserOption(opt =>
        opt.setName("user").setDescription("العضو").setRequired(true))
      .addStringOption(opt =>
        opt.setName("reason").setDescription("السبب").setRequired(true)),

    new SlashCommandBuilder()
      .setName("warnlist")
      .setDescription("عرض التحذيرات (عضو أو السيرفر كامل)")
      .addUserOption(opt =>
        opt.setName("user").setDescription("عضو معين").setRequired(false)),

    // Timeout
    new SlashCommandBuilder()
      .setName("timeout")
      .setDescription("تايم آوت عضو (Staff)")
      .addUserOption(opt =>
        opt.setName("user").setDescription("العضو").setRequired(true))
      .addIntegerOption(opt =>
        opt.setName("minutes").setDescription("بالدقائق").setRequired(true)),

    // Mute
    new SlashCommandBuilder()
      .setName("mute")
      .setDescription("ميوت مؤقت (Staff)")
      .addUserOption(opt =>
        opt.setName("user").setDescription("العضو").setRequired(true))
      .addIntegerOption(opt =>
        opt.setName("minutes").setDescription("بالدقائق").setRequired(true)),

    // Admin Only
    new SlashCommandBuilder()
      .setName("setpoints")
      .setDescription("تحديد نقاط عضو (Admin فقط)")
      .addUserOption(opt =>
        opt.setName("user").setDescription("العضو").setRequired(true))
      .addIntegerOption(opt =>
        opt.setName("amount").setDescription("عدد النقاط").setRequired(true)),

    new SlashCommandBuilder()
      .setName("broadcast")
      .setDescription("إرسال رسالة للجميع (Admin فقط)")
      .addStringOption(opt =>
        opt.setName("message").setDescription("الرسالة").setRequired(true)),

    new SlashCommandBuilder()
      .setName("reset")
      .setDescription("تصفير جميع النقاط (Admin فقط)"),
  ];

  await client.application.commands.set(commands);
  console.log("✅ All Commands Registered Successfully!");
});


// ================================
// 🎮 COMMANDS HANDLER
// ================================
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const cmd = interaction.commandName;

  // ========================
  // /panel (Admin Only)
  // ========================
  if (cmd === "panel") {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return interaction.reply("🚫 هذا الأمر للأدمن فقط");

    const embed = new EmbedBuilder()
      .setTitle("🎫 نظام التكتات الرسمي")
      .setDescription("اضغط الزر لفتح تكت خاص بك بعد الاستلام فقط المستلم وصاحب التكت يكتبون.")
      .setColor(0x1e90ff);

    const btn = new ButtonBuilder()
      .setCustomId("open_ticket")
      .setLabel("فتح تكت")
      .setStyle(ButtonStyle.Primary);

    interaction.channel.send({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(btn)],
    });

    return interaction.reply("✅ تم إرسال Panel بنجاح");
  }

  // ========================
  // /points (Staff)
  // ========================
  if (cmd === "points") {
    if (!isStaff(interaction.member))
      return interaction.reply("🚫 هذا الأمر للستاف فقط");

    const p = points[interaction.user.id] || 0;
    return interaction.reply(`⭐ نقاطك الحالية: **${p}**`);
  }

  // ========================
  // /leaderboard (Staff)
  // ========================
  if (cmd === "leaderboard") {
    if (!isStaff(interaction.member))
      return interaction.reply("🚫 هذا الأمر للستاف فقط");

    let sorted = Object.entries(points).sort((a, b) => b[1] - a[1]);

    let msg = sorted.slice(0, 10)
      .map(([id, pts], i) => `**${i + 1}.** <@${id}> → ${pts}`)
      .join("\n");

    return interaction.reply(`🏆 Leaderboard:\n\n${msg || "لا يوجد نقاط"}`);
  }

  // ========================
  // /setpoints (Admin Only)
  // ========================
  if (cmd === "setpoints") {
    if (!interaction.member.permissions.has("Administrator"))
      return interaction.reply("🚫 للأدمن فقط");

    const user = interaction.options.getUser("user");
    const amount = interaction.options.getInteger("amount");

    points[user.id] = amount;
    savePoints();

    return interaction.reply(`✅ تم ضبط نقاط ${user} إلى **${amount}**`);
  }

  // ========================
  // /reset (Admin Only)
  // ========================
  if (cmd === "reset") {
    if (!interaction.member.permissions.has("Administrator"))
      return interaction.reply("🚫 للأدمن فقط");

    points = {};
    savePoints();

    return interaction.reply("♻️ تم تصفير جميع النقاط");
  }

  // ========================
  // /broadcast (Admin Only)
  // ========================
  if (cmd === "broadcast") {
    if (!interaction.member.permissions.has("Administrator"))
      return interaction.reply("🚫 للأدمن فقط");

    const message = interaction.options.getString("message");

    interaction.guild.members.fetch().then(members => {
      members.forEach(m => {
        if (!m.user.bot) {
          m.send(message).catch(() => {});
        }
      });
    });

    return interaction.reply("📢 تم إرسال الرسالة للجميع");
  }

  // ========================
  // /warn (Staff)
  // ========================
  if (cmd === "warn") {
    if (!isStaff(interaction.member))
      return interaction.reply("🚫 ستاف فقط");

    const user = interaction.options.getUser("user");
    const reason = interaction.options.getString("reason");

    if (!warnings[user.id]) warnings[user.id] = [];
    warnings[user.id].push({
      reason,
      staff: interaction.user.username,
      date: new Date().toLocaleString(),
    });

    saveWarnings();

    return interaction.reply(`⚠️ تم تحذير ${user}\n📌 السبب: ${reason}`);
  }

  // ========================
  // /warnlist (Staff)
  // ========================
  if (cmd === "warnlist") {
    if (!isStaff(interaction.member))
      return interaction.reply("🚫 ستاف فقط");

    const user = interaction.options.getUser("user");

    if (user) {
      const list = warnings[user.id] || [];
      if (list.length === 0) return interaction.reply("✅ لا يوجد تحذيرات");

      let msg = list.map((w, i) =>
        `**${i + 1}.** ${w.reason} — (${w.date})`
      ).join("\n");

      return interaction.reply(`⚠️ تحذيرات ${user}:\n\n${msg}`);
    }

    let all = Object.entries(warnings);
    if (all.length === 0) return interaction.reply("✅ لا يوجد تحذيرات بالسيرفر");

    let msg = all.slice(0, 15)
      .map(([id, list]) => `<@${id}> → ${list.length} تحذير`)
      .join("\n");

    return interaction.reply(`📋 تحذيرات السيرفر:\n\n${msg}`);
  }

  // ========================
  // /timeout (Staff)
  // ========================
  if (cmd === "timeout") {
    if (!isStaff(interaction.member))
      return interaction.reply("🚫 ستاف فقط");

    const user = interaction.options.getUser("user");
    const minutes = interaction.options.getInteger("minutes");

    const member = await interaction.guild.members.fetch(user.id);
    await member.timeout(minutes * 60 * 1000);

    return interaction.reply(`⏳ تم تايم آوت ${user} لمدة ${minutes} دقيقة`);
  }

});


// ================================
// 🎫 BUTTONS HANDLER
// ================================
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  // Open Ticket
  if (interaction.customId === "open_ticket") {
    const member = interaction.member;
    const guild = interaction.guild;

    const channel = await guild.channels.create({
      name: `ticket-${member.user.username}`,
      type: 0,
      parent: TICKET_CATEGORY_ID,
      permissionOverwrites: [
        { id: guild.id, deny: ["ViewChannel"] },
        { id: member.id, allow: ["ViewChannel", "SendMessages"] },
        { id: STAFF_ROLE_ID, allow: ["ViewChannel"] },
      ],
    });

    const embed = new EmbedBuilder()
      .setTitle("🎫 تكت جديد")
      .setDescription("اضغط الزر لاستلام التكت والحصول على نقطة.")
      .setColor(0x1e90ff);

    const claim = new ButtonBuilder()
      .setCustomId("claim_ticket")
      .setLabel("استلام التكت")
      .setStyle(ButtonStyle.Success);

    channel.send({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(claim)],
    });

    return interaction.reply(`✅ تم فتح التكت: ${channel}`);
  }

  // Claim Ticket
  if (interaction.customId === "claim_ticket") {
    if (!isStaff(interaction.member))
      return interaction.reply("🚫 فقط الستاف يستطيع استلام التكت");

    const channel = interaction.channel;

    if (channel.topic)
      return interaction.reply("⚠️ التكت مستلم مسبقًا");

    channel.setTopic(interaction.user.id);

    // Add Point
    points[interaction.user.id] = (points[interaction.user.id] || 0) + 1;
    savePoints();

    // Lock Ticket
    await channel.permissionOverwrites.set([
      { id: channel.guild.id, deny: ["ViewChannel"] },
      { id: interaction.user.id, allow: ["ViewChannel", "SendMessages"] },
    ]);

    return interaction.reply(`✅ تم استلام التكت! نقاطك الآن: ${points[interaction.user.id]}`);
  }
});


// ================================
// 🔑 BOT LOGIN
// ================================
client.login(process.env.TOKEN);
