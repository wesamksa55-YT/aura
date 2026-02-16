// ========================================
// FULL PROFESSIONAL STAFF TICKET BOT
// Discord.js v14 + Render Web Service
// Includes: Ticket System + Points + Warns + Mute/Timeout + Say + Broadcast + Reset
// ========================================

const { Client, GatewayIntentBits, Partials, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, SlashCommandBuilder, Events, ChannelType } = require("discord.js");
const fs = require("fs");
const express = require("express");

// =======================
// Web Service
// =======================
const app = express();
app.get("/", (req, res) => res.send("Bot Running"));
app.listen(3000);

// =======================
// Bot Setup
// =======================
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages],
  partials: [Partials.Channel],
});

// =======================
// SETTINGS
// =======================
const STAFF_ROLE_ID = "1418006369491222689";
const TICKET_CATEGORY_ID = "1407559493587308586";
const MAX_TICKETS_PER_USER = 2;

// =======================
// DATABASES
// =======================
let points = fs.existsSync("./points.json") ? JSON.parse(fs.readFileSync("./points.json")) : {};
let warnings = fs.existsSync("./warnings.json") ? JSON.parse(fs.readFileSync("./warnings.json")) : {};

function savePoints() { fs.writeFileSync("./points.json", JSON.stringify(points, null, 2)); }
function saveWarnings() { fs.writeFileSync("./warnings.json", JSON.stringify(warnings, null, 2)); }

// =======================
// HELPERS
// =======================
function isStaff(member) { return member.roles.cache.has(STAFF_ROLE_ID); }
function E(title, text) { return new EmbedBuilder().setTitle(title).setDescription(text).setColor(0x2b2d31); }

// =======================
// READY + REGISTER COMMANDS
// =======================
client.once(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user.tag}`);
  
  const commands = [
    new SlashCommandBuilder().setName("panel").setDescription("Send ticket panel (Admin)"),
    new SlashCommandBuilder().setName("points").setDescription("Show your points (Staff)"),
    new SlashCommandBuilder().setName("leaderboard").setDescription("Show leaderboard (Staff)"),
    new SlashCommandBuilder().setName("warn")
      .setDescription("Warn member (Staff)")
      .addUserOption(o => o.setName("user").setDescription("Member").setRequired(true))
      .addStringOption(o => o.setName("reason").setDescription("Reason").setRequired(true)),
    new SlashCommandBuilder().setName("warnlist")
      .setDescription("Show warnings list (Staff)")
      .addUserOption(o => o.setName("user").setDescription("Optional member")),
    new SlashCommandBuilder().setName("mute")
      .setDescription("Mute member (Staff)")
      .addUserOption(o => o.setName("user").setDescription("Member").setRequired(true))
      .addIntegerOption(o => o.setName("minutes").setDescription("Minutes").setRequired(true)),
    new SlashCommandBuilder().setName("timeout")
      .setDescription("Timeout member (Staff)")
      .addUserOption(o => o.setName("user").setDescription("Member").setRequired(true))
      .addIntegerOption(o => o.setName("minutes").setDescription("Minutes").setRequired(true)),
    new SlashCommandBuilder().setName("setpoints")
      .setDescription("Set member points (Admin)")
      .addUserOption(o => o.setName("user").setDescription("Member").setRequired(true))
      .addIntegerOption(o => o.setName("amount").setDescription("Points").setRequired(true)),
    new SlashCommandBuilder().setName("reset")
      .setDescription("Reset all points (Admin)"),
    new SlashCommandBuilder().setName("broadcast")
      .setDescription("Send message to all (Admin)")
      .addStringOption(o => o.setName("message").setDescription("Message").setRequired(true)),
    new SlashCommandBuilder().setName("say")
      .setDescription("Bot repeats your message (Hidden)")
      .addStringOption(o => o.setName("message").setDescription("Text").setRequired(true)),
  ];

  await client.application.commands.set(commands);
  console.log("Commands registered");
});

// =======================
// SLASH COMMAND HANDLER
// =======================
client.on("interactionCreate", async interaction => {
  if (interaction.isChatInputCommand()) {
    const cmd = interaction.commandName;

    // PANEL
    if (cmd === "panel") {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator))
        return interaction.reply({ embeds: [E("Denied", "Admin only.")], ephemeral: true });

      const embed = E("Support Tickets", "Press the button below to open a private ticket.");
      const btn = new ButtonBuilder().setCustomId("open_ticket").setLabel("Open Ticket").setStyle(ButtonStyle.Primary);

      await interaction.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(btn)] });
      return interaction.reply({ embeds: [E("Done", "Panel sent.")], ephemeral: true });
    }

    // POINTS
    if (cmd === "points") {
      if (!isStaff(interaction.member)) return interaction.reply({ embeds: [E("Denied", "Staff only.")], ephemeral: true });
      const p = points[interaction.user.id] || 0;
      return interaction.reply({ embeds: [E("Your Points", `Points: **${p}**`)], ephemeral: true });
    }

    // LEADERBOARD
    if (cmd === "leaderboard") {
      if (!isStaff(interaction.member)) return interaction.reply({ embeds: [E("Denied", "Staff only.")], ephemeral: true });
      let sorted = Object.entries(points).sort((a,b)=>b[1]-a[1]);
      let msg = sorted.map(([id,pts],i)=>`#${i+1} → <@${id}>: ${pts} pts`).join("\n") || "No data yet.";
      return interaction.reply({ embeds: [E("Leaderboard", msg)], ephemeral: true });
    }

    // WARN
    if (cmd === "warn") {
      if (!isStaff(interaction.member)) return interaction.reply({ embeds: [E("Denied","Staff only.")], ephemeral:true });
      const user = interaction.options.getUser("user");
      const reason = interaction.options.getString("reason");
      if (!warnings[user.id]) warnings[user.id]=[];
      warnings[user.id].push({ reason, date: new Date().toLocaleString() });
      saveWarnings();
      return interaction.reply({ embeds: [E("Warning Added", `Warned **${user.tag}**`)], ephemeral:true });
    }

    // WARNLIST
    if (cmd==="warnlist"){
      if(!isStaff(interaction.member)) return interaction.reply({embeds:[E("Denied","Staff only.")],ephemeral:true});
      const user=interaction.options.getUser("user");
      if(user){
        const list=warnings[user.id]||[];
        if(!list.length) return interaction.reply({embeds:[E("Warnings","No warnings.")],ephemeral:true});
        let msg=list.map((w,i)=>`${i+1}. ${w.reason}`).join("\n");
        return interaction.reply({embeds:[E("Warnings List",msg)],ephemeral:true});
      }
      return interaction.reply({embeds:[E("Warnings","Use /warnlist @user")],ephemeral:true});
    }

    // MUTE
    if(cmd==="mute"){
      if(!isStaff(interaction.member)) return interaction.reply({embeds:[E("Denied","Staff only.")],ephemeral:true});
      const user=interaction.options.getUser("user");
      const minutes=interaction.options.getInteger("minutes");
      const member=await interaction.guild.members.fetch(user.id);
      let muteRole=interaction.guild.roles.cache.find(r=>r.name==="Muted");
      if(!muteRole) muteRole=await interaction.guild.roles.create({name:"Muted",permissions:[]});
      await member.roles.add(muteRole);
      setTimeout(()=>{member.roles.remove(muteRole)},minutes*60*1000);
      return interaction.reply({embeds:[E("Muted",`Member muted for ${minutes} minutes.`)],ephemeral:true});
    }

    // TIMEOUT
    if(cmd==="timeout"){
      if(!isStaff(interaction.member)) return interaction.reply({embeds:[E("Denied","Staff only.")],ephemeral:true});
      const user=interaction.options.getUser("user");
      const minutes=interaction.options.getInteger("minutes");
      const member=await interaction.guild.members.fetch(user.id);
      await member.timeout(minutes*60*1000);
      return interaction.reply({embeds:[E("Timeout",`Member timed out for ${minutes} minutes.`)],ephemeral:true});
    }

    // SETPOINTS
    if(cmd==="setpoints"){
      if(!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({embeds:[E("Denied","Admin only.")],ephemeral:true});
      const user=interaction.options.getUser("user");
      const amount=interaction.options.getInteger("amount");
      points[user.id]=amount;
      savePoints();
      return interaction.reply({embeds:[E("Points Set",`Points for ${user.tag} set to ${amount}.`)],ephemeral:true});
    }

    // RESET
    if(cmd==="reset"){
      if(!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({embeds:[E("Denied","Admin only.")],ephemeral:true});
      points={};
      savePoints();
      return interaction.reply({embeds:[E("Reset","All points reset.")],ephemeral:true});
    }

    // BROADCAST
    if(cmd==="broadcast"){
      if(!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({embeds:[E("Denied","Admin only.")],ephemeral:true});
      const msg=interaction.options.getString("message");
      interaction.guild.members.cache.filter(m=>!m.user.bot).forEach(m=>{
        m.send(msg).catch(()=>{});
      });
      return interaction.reply({embeds:[E("Broadcast Sent","Message sent to all members.")],ephemeral:true});
    }

    // SAY
    if(cmd==="say"){
      const msg=interaction.options.getString("message");
      await interaction.reply({content:"Sent.",ephemeral:true});
      return interaction.channel.send({embeds:[E("Message",msg)]});
    }
  }

  // BUTTONS
  if(interaction.isButton()){
    if(interaction.customId==="open_ticket"){
      await interaction.deferReply({ephemeral:true});
      const guild=interaction.guild;
      const user=interaction.user;
      const existing=guild.channels.cache.filter(c=>c.parentId===TICKET_CATEGORY_ID && c.name.includes(user.id));
      if(existing.size>=MAX_TICKETS_PER_USER) return interaction.editReply({embeds:[E("Limit","Max 2 tickets allowed.")]});

      // Create Channel
      const channel=await guild.channels.create({
        name:`ticket-${user.id}-${existing.size+1}`,
        type:ChannelType.GuildText,
        parent:TICKET_CATEGORY_ID,
        permissionOverwrites:[
          {id:guild.id,deny:[PermissionsBitField.Flags.ViewChannel]},
          {id:user.id,allow:[PermissionsBitField.Flags.ViewChannel,PermissionsBitField.Flags.SendMessages]},
          {id:STAFF_ROLE_ID,allow:[PermissionsBitField.Flags.ViewChannel]}
        ]
      });

      // Add point for opening ticket
      points[user.id]=(points[user.id]||0)+1;
      savePoints();

      // Ticket message
      const claimBtn=new ButtonBuilder().setCustomId("claim_ticket").setLabel("Claim Ticket").setStyle(ButtonStyle.Success);
      await channel.send({
        content:`<@${user.id}> <@&${STAFF_ROLE_ID}>`,
        allowedMentions:{parse:[]},
        embeds:[E("Ticket Opened",`Ticket created.\nPoints: **${points[user.id]}**`)],
        components:[new ActionRowBuilder().addComponents(claimBtn)]
      });

      return interaction.editReply({embeds:[E("Created",`Ticket: ${channel}`)]});
    }

    if(interaction.customId==="claim_ticket"){
      if(!isStaff(interaction.member)) return interaction.reply({embeds:[E("Denied","Only staff can claim tickets.")],ephemeral:true});
      const channel=interaction.channel;
      if(channel.topic) return interaction.reply({embeds:[E("Already Claimed","Ticket already claimed.")],ephemeral:true});
      await channel.setTopic(`Claimed by ${interaction.user.id}`);
      // Lock channel for owner + claimer
      const openerId=channel.name.split("-")[1];
      await channel.permissionOverwrites.set([
        {id:channel.guild.id,deny:[PermissionsBitField.Flags.ViewChannel]},
        {id:openerId,allow:[PermissionsBitField.Flags.ViewChannel,PermissionsBitField.Flags.SendMessages]},
        {id:interaction.user.id,allow:[PermissionsBitField.Flags.ViewChannel,PermissionsBitField.Flags.SendMessages]}
      ]);
      points[interaction.user.id]=(points[interaction.user.id]||0)+1;
      savePoints();
      return interaction.reply({embeds:[E("Ticket Claimed",`Claimed by <@${interaction.user.id}>.\nPoints: **${points[interaction.user.id]}**`)],allowedMentions:{parse:[]}});
    }
  }
});

// =======================
// LOGIN
// =======================
client.login(process.env.TOKEN);
