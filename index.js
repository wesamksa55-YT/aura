// ========================================
// FINAL FULL STAFF SYSTEM BOT
// Tickets + Points + Warn + Mute + Timeout
// ========================================

const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
  Events,
  ChannelType,
} = require("discord.js");

const fs = require("fs");
const express = require("express");

// ============ WEB SERVICE ============
const app = express();
app.get("/", (req, res) => res.send("Bot Running"));
app.listen(3000);

// ============ BOT ============
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
  ],
});

// ============ SETTINGS ============
const STAFF_ROLE_ID = "1418006369491222689";
const TICKET_CATEGORY_ID = "1407559493587308586";
const MAX_TICKETS = 2;

// ============ DATABASE ============
let points = fs.existsSync("./points.json")
  ? JSON.parse(fs.readFileSync("./points.json"))
  : {};

let warnings = fs.existsSync("./warnings.json")
  ? JSON.parse(fs.readFileSync("./warnings.json"))
  : {};

function savePoints() {
  fs.writeFileSync("./points.json", JSON.stringify(points, null, 2));
}
function saveWarnings() {
  fs.writeFileSync("./warnings.json", JSON.stringify(warnings, null, 2));
}

function isStaff(member) {
  return member.roles.cache.has(STAFF_ROLE_ID);
}

function embed(title, desc) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(desc)
    .setColor(0x2b2d31)
    .setTimestamp();
}

// ============ READY ============
client.once(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder().setName("panel").setDescription("Send ticket panel"),
    new SlashCommandBuilder().setName("points").setDescription("Show your points"),
    new SlashCommandBuilder().setName("leaderboard").setDescription("Show leaderboard"),
    new SlashCommandBuilder()
      .setName("warn")
      .setDescription("Warn member")
      .addUserOption(o => o.setName("user").setDescription("Member").setRequired(true))
      .addStringOption(o => o.setName("reason").setDescription("Reason").setRequired(true)),
    new SlashCommandBuilder()
      .setName("warnlist")
      .setDescription("Show warnings")
      .addUserOption(o => o.setName("user").setDescription("Optional member")),
    new SlashCommandBuilder()
      .setName("mute")
      .setDescription("Mute member")
      .addUserOption(o => o.setName("user").setDescription("Member").setRequired(true))
      .addIntegerOption(o => o.setName("minutes").setDescription("Minutes").setRequired(true)),
    new SlashCommandBuilder()
      .setName("timeout")
      .setDescription("Timeout member")
      .addUserOption(o => o.setName("user").setDescription("Member").setRequired(true))
      .addIntegerOption(o => o.setName("minutes").setDescription("Minutes").setRequired(true)),
    new SlashCommandBuilder()
      .setName("setpoints")
      .setDescription("Set points (Admin)")
      .addUserOption(o => o.setName("user").setDescription("Member").setRequired(true))
      .addIntegerOption(o => o.setName("amount").setDescription("Points").setRequired(true)),
    new SlashCommandBuilder().setName("reset").setDescription("Reset all points"),
    new SlashCommandBuilder()
      .setName("broadcast")
      .setDescription("Broadcast message")
      .addStringOption(o => o.setName("message").setDescription("Text").setRequired(true)),
    new SlashCommandBuilder()
      .setName("say")
      .setDescription("Bot says something")
      .addStringOption(o => o.setName("message").setDescription("Text").setRequired(true)),
  ];

  await client.application.commands.set(commands);
});

// ============ COMMAND HANDLER ============
client.on("interactionCreate", async interaction => {

  // ============ SLASH ============
  if (interaction.isChatInputCommand()) {

    const cmd = interaction.commandName;

    // PANEL
    if (cmd === "panel") {
      if (!isStaff(interaction.member))
        return interaction.reply({ embeds: [embed("Denied", "Staff only")] });

      const btn = new ButtonBuilder()
        .setCustomId("open_ticket")
        .setLabel("Open Ticket")
        .setStyle(ButtonStyle.Primary);

      await interaction.channel.send({
        embeds: [embed("Support System", "Press to open a private ticket.")],
        components: [new ActionRowBuilder().addComponents(btn)],
      });

      return interaction.reply({ embeds: [embed("Done", "Panel sent")] });
    }

    // POINTS
    if (cmd === "points") {
      return interaction.reply({
        embeds: [embed("Points", `You have ${points[interaction.user.id] || 0} points`)],
      });
    }

    // LEADERBOARD
    if (cmd === "leaderboard") {
      let sorted = Object.entries(points).sort((a,b)=>b[1]-a[1]);
      let msg = sorted.map(([id,p],i)=>`#${i+1} <@${id}> → ${p}`).join("\n") || "No data";
      return interaction.reply({ embeds: [embed("Leaderboard", msg)] });
    }

    // WARN
    if (cmd === "warn") {
      if (!isStaff(interaction.member))
        return interaction.reply({ embeds: [embed("Denied","Staff only")] });

      const user = interaction.options.getUser("user");
      const reason = interaction.options.getString("reason");

      if (!warnings[user.id]) warnings[user.id] = [];
      warnings[user.id].push({
        reason,
        moderator: interaction.user.tag,
        date: new Date().toLocaleString(),
      });

      saveWarnings();

      return interaction.reply({
        embeds: [embed("Warning Added", `Warned ${user.tag}\nReason: ${reason}`)],
      });
    }

    // WARNLIST
    if (cmd === "warnlist") {
      const user = interaction.options.getUser("user");

      if (user) {
        const list = warnings[user.id] || [];
        if (!list.length)
          return interaction.reply({ embeds: [embed("Warnings","No warnings")] });

        let msg = list.map((w,i)=>`**#${i+1}**\nDate: ${w.date}\nBy: ${w.moderator}\nReason: ${w.reason}\n`).join("\n");

        return interaction.reply({
          embeds: [embed(`${list.length} Warnings`, msg)],
        });
      }

      // All server warnings
      let all = Object.entries(warnings);
      if (!all.length)
        return interaction.reply({ embeds: [embed("Warnings","No warnings in server")] });

      let text = all.map(([id,warns])=>`<@${id}> → ${warns.length}`).join("\n");

      return interaction.reply({
        embeds: [embed("Server Warnings", text)],
      });
    }

    // MUTE
    if (cmd === "mute") {
      if (!isStaff(interaction.member))
        return interaction.reply({ embeds: [embed("Denied","Staff only")] });

      const user = interaction.options.getUser("user");
      const minutes = interaction.options.getInteger("minutes");
      const member = await interaction.guild.members.fetch(user.id);

      let role = interaction.guild.roles.cache.find(r=>r.name==="Muted");
      if (!role) {
        role = await interaction.guild.roles.create({ name:"Muted", permissions:[] });
        interaction.guild.channels.cache.forEach(c=>{
          c.permissionOverwrites.edit(role, {
            SendMessages:false,
            AddReactions:false,
          });
        });
      }

      await member.roles.add(role);
      setTimeout(()=>member.roles.remove(role), minutes*60000);

      return interaction.reply({
        embeds:[embed("Muted",`${user.tag} muted for ${minutes} minutes`)],
      });
    }

    // TIMEOUT
    if (cmd === "timeout") {
      const user = interaction.options.getUser("user");
      const minutes = interaction.options.getInteger("minutes");
      const member = await interaction.guild.members.fetch(user.id);

      await member.timeout(minutes*60000);

      return interaction.reply({
        embeds:[embed("Timeout",`${user.tag} timed out for ${minutes} minutes`)],
      });
    }

    // SETPOINTS
    if (cmd === "setpoints") {
      if (!isStaff(interaction.member))
        return interaction.reply({ embeds: [embed("Denied","Staff only")] });

      const user = interaction.options.getUser("user");
      const amount = interaction.options.getInteger("amount");

      points[user.id] = amount;
      savePoints();

      return interaction.reply({
        embeds:[embed("Points Set",`${user.tag} → ${amount}`)],
      });
    }

    // RESET
    if (cmd === "reset") {
      points = {};
      savePoints();
      return interaction.reply({ embeds:[embed("Reset","All points cleared")] });
    }

    // BROADCAST
    if (cmd === "broadcast") {
      const msg = interaction.options.getString("message");
      interaction.guild.members.cache.forEach(m=>{
        if(!m.user.bot) m.send(msg).catch(()=>{});
      });
      return interaction.reply({ embeds:[embed("Broadcast","Sent to members")] });
    }

    // SAY
    if (cmd === "say") {
      const msg = interaction.options.getString("message");
      await interaction.reply({ content:"Sent" });
      return interaction.channel.send({ embeds:[embed("Message",msg)] });
    }
  }

  // ============ BUTTONS ============
  if (interaction.isButton()) {

    // OPEN TICKET
    if (interaction.customId === "open_ticket") {

      const user = interaction.user;
      const guild = interaction.guild;

      const existing = guild.channels.cache.filter(
        c => c.parentId === TICKET_CATEGORY_ID && c.name === `ticket-${user.username}`
      );

      if (existing.size >= MAX_TICKETS)
        return interaction.reply({ embeds:[embed("Limit","Max 2 tickets")] });

      const channel = await guild.channels.create({
        name: `ticket-${user.username}`,
        type: ChannelType.GuildText,
        parent: TICKET_CATEGORY_ID,
        permissionOverwrites: [
          { id: guild.id, deny:[PermissionsBitField.Flags.ViewChannel] },
          { id: user.id, allow:[PermissionsBitField.Flags.ViewChannel,PermissionsBitField.Flags.SendMessages] },
          { id: STAFF_ROLE_ID, allow:[PermissionsBitField.Flags.ViewChannel] },
        ],
      });

      points[user.id] = (points[user.id]||0)+1;
      savePoints();

      const claimBtn = new ButtonBuilder()
        .setCustomId("claim_ticket")
        .setLabel("Claim")
        .setStyle(ButtonStyle.Success);

      await channel.send({
        content:`<@${user.id}> <@&${STAFF_ROLE_ID}>`,
        embeds:[embed("Ticket Opened","Support will assist you shortly.")],
        components:[new ActionRowBuilder().addComponents(claimBtn)],
      });

      return interaction.reply({ embeds:[embed("Created",`${channel}`)] });
    }

    // CLAIM
    if (interaction.customId === "claim_ticket") {

      if (!isStaff(interaction.member))
        return interaction.reply({ embeds:[embed("Denied","Staff only")] });

      const channel = interaction.channel;
      const openerId = channel.permissionOverwrites.cache.find(p=>p.allow.has("SendMessages"))?.id;

      points[interaction.user.id] = (points[interaction.user.id]||0)+1;
      savePoints();

      await channel.permissionOverwrites.set([
        { id: channel.guild.id, deny:[PermissionsBitField.Flags.ViewChannel] },
        { id: openerId, allow:[PermissionsBitField.Flags.ViewChannel,PermissionsBitField.Flags.SendMessages] },
        { id: interaction.user.id, allow:[PermissionsBitField.Flags.ViewChannel,PermissionsBitField.Flags.SendMessages] },
      ]);

      return interaction.reply({
        embeds:[embed("Ticket Claimed",`Claimed by ${interaction.user.tag}`)],
      });
    }
  }

});

// ============ LOGIN ============
client.login(process.env.TOKEN);
