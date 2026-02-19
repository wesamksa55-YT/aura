// ========================================
// ULTIMATE STAFF SYSTEM V4
// Tickets + Jail + Warn + Points + Mute + Timeout
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

// ===== WEB SERVICE =====
const app = express();
app.get("/", (req, res) => res.send("Bot Running"));
app.listen(3000);

// ===== BOT =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ===== SETTINGS =====
const STAFF_ROLE_ID = "1418006369491222689";
const TICKET_CATEGORY_ID = "1407559493587308586";
const LOG_CHANNEL_ID = "1418898978233258077";
const JAIL_ROLE_ID = "1419307980377034995";

const ADMIN_ROLES_TO_REMOVE = [
"1418150851758788698",
"1418006972996780042",
"1417974548514607205",
"1407559491553329205",
"1407559491389620257",
"1418007259329335347",
"1407559491389620258",
"1466034993116479705",
"1417973252650831913"
];

const MAX_TICKETS = 2;

// ===== DATABASE =====
let points = fs.existsSync("./points.json") ? JSON.parse(fs.readFileSync("./points.json")) : {};
let warnings = fs.existsSync("./warnings.json") ? JSON.parse(fs.readFileSync("./warnings.json")) : {};
let jailStorage = {};

function savePoints(){ fs.writeFileSync("./points.json", JSON.stringify(points,null,2)); }
function saveWarnings(){ fs.writeFileSync("./warnings.json", JSON.stringify(warnings,null,2)); }

function isStaff(member){ return member.roles.cache.has(STAFF_ROLE_ID); }

function embed(t,d){
  return new EmbedBuilder().setTitle(t).setDescription(d).setColor(0x2b2d31).setTimestamp();
}

function parseDuration(str){
  const m = str.match(/^(\d+)(s|m|h|d)$/);
  if(!m) return null;
  const v = parseInt(m[1]);
  const map = {s:1000,m:60000,h:3600000,d:86400000};
  return v * map[m[2]];
}

// ===== READY =====
client.once(Events.ClientReady, async ()=>{
  console.log(`Logged in as ${client.user.tag}`);

  const commands = [

    new SlashCommandBuilder().setName("panel").setDescription("Send ticket panel"),

    new SlashCommandBuilder()
      .setName("warn")
      .setDescription("Warn member")
      .addUserOption(o=>o.setName("user").setDescription("Member").setRequired(true))
      .addStringOption(o=>o.setName("reason").setDescription("Reason").setRequired(true)),

    new SlashCommandBuilder()
      .setName("warnlist")
      .setDescription("Show warnings")
      .addUserOption(o=>o.setName("user").setDescription("Optional")),

    new SlashCommandBuilder()
      .setName("mute")
      .setDescription("Mute member")
      .addUserOption(o=>o.setName("user").setDescription("Member").setRequired(true))
      .addStringOption(o=>o.setName("duration").setDescription("1s 5m 2h 3d").setRequired(true)),

    new SlashCommandBuilder()
      .setName("timeout")
      .setDescription("Timeout member")
      .addUserOption(o=>o.setName("user").setDescription("Member").setRequired(true))
      .addStringOption(o=>o.setName("duration").setDescription("1s 5m 2h 3d").setRequired(true)),

    new SlashCommandBuilder()
      .setName("punishment")
      .setDescription("Jail admin")
      .addUserOption(o=>o.setName("user").setDescription("Admin").setRequired(true))
      .addStringOption(o=>o.setName("duration").setDescription("1s 5m 2h 3d").setRequired(true))
      .addStringOption(o=>o.setName("reason").setDescription("Optional reason")),

    new SlashCommandBuilder()
      .setName("unjail")
      .setDescription("Remove jail")
      .addUserOption(o=>o.setName("user").setDescription("User").setRequired(true)),

    new SlashCommandBuilder().setName("points").setDescription("Show your points"),
    new SlashCommandBuilder().setName("leaderboard").setDescription("Leaderboard"),

    new SlashCommandBuilder()
      .setName("setpoints")
      .setDescription("Set points")
      .addUserOption(o=>o.setName("user").setDescription("User").setRequired(true))
      .addIntegerOption(o=>o.setName("amount").setDescription("Amount").setRequired(true)),

    new SlashCommandBuilder().setName("reset").setDescription("Reset points"),

    new SlashCommandBuilder()
      .setName("broadcast")
      .setDescription("Broadcast message")
      .addStringOption(o=>o.setName("message").setDescription("Text").setRequired(true)),

    new SlashCommandBuilder()
      .setName("say")
      .setDescription("Bot says message")
      .addStringOption(o=>o.setName("message").setDescription("Text").setRequired(true)),

    new SlashCommandBuilder()
      .setName("adduser")
      .setDescription("Add user to ticket")
      .addUserOption(o=>o.setName("user").setDescription("User").setRequired(true)),

    new SlashCommandBuilder()
      .setName("removeuser")
      .setDescription("Remove user from ticket")
      .addUserOption(o=>o.setName("user").setDescription("User").setRequired(true)),
  ];

  await client.application.commands.set(commands);
});

// ==================
// باقي النظام (تكت + كل الأنظمة)
// ==================
// ⚠️ بسبب طول الكود جداً هنا في الرد
// أكمل لك الجزء الثاني مباشرة في الرد اللي بعده
// =======================
//        CONFIG
// =======================

const TOKEN = "PUT_TOKEN_HERE";

const STAFF_ROLE_ID = "1407559493587308586";
const TICKET_LOG_CHANNEL = "1418898978233258077";
const JAIL_ROLE_ID = "1419307980377034995";

const ADMIN_ROLES_TO_REMOVE = [
"1418150851758788698",
"1418006972996780042",
"1417974548514607205",
"1407559491553329205",
"1407559491389620257",
"1418007259329335347",
"1407559491389620258",
"1466034993116479705",
"1417973252650831913",
"1407559491389620259"
];

// =======================
//      IMPORTS
// =======================

const {
Client,
GatewayIntentBits,
PermissionsBitField,
EmbedBuilder,
ChannelType,
ActionRowBuilder,
ButtonBuilder,
ButtonStyle,
SlashCommandBuilder,
Collection
} = require("discord.js");

const client = new Client({
intents: [
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMessages,
GatewayIntentBits.GuildMembers,
GatewayIntentBits.MessageContent
]
});

// =======================
//      DATABASE
// =======================

let points = {};
let warns = {};
let ticketsCount = {};
let ticketOwners = {};
let ticketClaimedBy = {};
let jailDB = {};

// =======================
//   TIME PARSER
// =======================

function parseDuration(input){
if(!input) return null;
const match = input.match(/^(\d+)(s|m|h|d)$/);
if(!match) return null;

const value = parseInt(match[1]);
const unit = match[2];

switch(unit){
case "s": return value * 1000;
case "m": return value * 60 * 1000;
case "h": return value * 60 * 60 * 1000;
case "d": return value * 24 * 60 * 60 * 1000;
}
}

// =======================
// READY
// =======================

client.once("ready", async () => {

const commands = [

new SlashCommandBuilder().setName("points").setDescription("عرض نقاطك"),
new SlashCommandBuilder().setName("leaderboard").setDescription("عرض الترتيب"),

new SlashCommandBuilder()
.setName("setpoints")
.setDescription("تحديد نقاط")
.addUserOption(o=>o.setName("user").setRequired(true))
.addIntegerOption(o=>o.setName("amount").setRequired(true)),

new SlashCommandBuilder()
.setName("warn")
.setDescription("تحذير عضو")
.addUserOption(o=>o.setName("user").setRequired(true))
.addStringOption(o=>o.setName("reason").setRequired(true)),

new SlashCommandBuilder()
.setName("warnlist")
.setDescription("قائمة التحذيرات")
.addUserOption(o=>o.setName("user")),

new SlashCommandBuilder().setName("reset").setDescription("تصفير النقاط"),

new SlashCommandBuilder()
.setName("mute")
.setDescription("ميوت عضو")
.addUserOption(o=>o.setName("user").setRequired(true))
.addStringOption(o=>o.setName("time").setRequired(true)),

new SlashCommandBuilder()
.setName("timeout")
.setDescription("تايم اوت")
.addUserOption(o=>o.setName("user").setRequired(true))
.addStringOption(o=>o.setName("time").setRequired(true)),

new SlashCommandBuilder()
.setName("broadcast")
.setDescription("بث رسالة")
.addStringOption(o=>o.setName("message").setRequired(true)),

new SlashCommandBuilder()
.setName("say")
.setDescription("رسالة مخفية")
.addStringOption(o=>o.setName("message").setRequired(true)),

new SlashCommandBuilder().setName("panel").setDescription("انشاء بانل تكت"),

new SlashCommandBuilder()
.setName("add")
.setDescription("إضافة عضو للتكت")
.addUserOption(o=>o.setName("user").setRequired(true)),

new SlashCommandBuilder()
.setName("remove")
.setDescription("إزالة عضو من التكت")
.addUserOption(o=>o.setName("user").setRequired(true)),

new SlashCommandBuilder()
.setName("punishment")
.setDescription("سجن اداري")
.addUserOption(o=>o.setName("user").setRequired(true))
.addStringOption(o=>o.setName("time").setRequired(true))
.addStringOption(o=>o.setName("reason")),

new SlashCommandBuilder()
.setName("unjail")
.setDescription("فك سجن")
.addUserOption(o=>o.setName("user").setRequired(true))

];

await client.application.commands.set(commands);
console.log("Bot Ready");
});

// =======================
// BUTTONS
// =======================

client.on("interactionCreate", async interaction => {

if(interaction.isButton()){

// CREATE TICKET
if(interaction.customId==="create_ticket"){

const user = interaction.user;

if(!ticketsCount[user.id]) ticketsCount[user.id]=0;
if(ticketsCount[user.id] >=2)
return interaction.reply({content:"لديك الحد الأقصى",ephemeral:true});

ticketsCount[user.id]++;
points[user.id]=(points[user.id]||0)+1;

const channel = await interaction.guild.channels.create({
name:user.username,
type:ChannelType.GuildText,
permissionOverwrites:[
{ id:interaction.guild.id, deny:[PermissionsBitField.Flags.ViewChannel]},
{ id:user.id, allow:[PermissionsBitField.Flags.ViewChannel,PermissionsBitField.Flags.SendMessages]},
{ id:STAFF_ROLE_ID, allow:[PermissionsBitField.Flags.ViewChannel,PermissionsBitField.Flags.SendMessages]}
]
});

ticketOwners[channel.id]=user.id;

const row = new ActionRowBuilder().addComponents(
new ButtonBuilder().setCustomId("claim_ticket").setLabel("استلام").setStyle(ButtonStyle.Primary),
new ButtonBuilder().setCustomId("close_ticket").setLabel("إغلاق").setStyle(ButtonStyle.Danger)
);

await channel.send({
content:`<@&${STAFF_ROLE_ID}> <@${user.id}>`,
embeds:[new EmbedBuilder().setTitle("تذكرة دعم").setColor("Blue")],
components:[row]
});

return interaction.reply({content:"تم فتح التكت",ephemeral:true});
}

// CLAIM
if(interaction.customId==="claim_ticket"){

if(!interaction.member.roles.cache.has(STAFF_ROLE_ID))
return interaction.reply({content:"لا تملك صلاحية",ephemeral:true});

if(ticketClaimedBy[interaction.channel.id])
return interaction.reply({content:"تم استلام التذكرة مسبقاً",ephemeral:true});

ticketClaimedBy[interaction.channel.id]=interaction.user.id;
points[interaction.user.id]=(points[interaction.user.id]||0)+1;

// منع باقي الستاف
await interaction.channel.permissionOverwrites.edit(STAFF_ROLE_ID,{
SendMessages:false
});

// السماح للمستلم
await interaction.channel.permissionOverwrites.edit(interaction.user.id,{
SendMessages:true,
ViewChannel:true
});

return interaction.reply({
embeds:[new EmbedBuilder()
.setTitle("تم استلام التذكرة")
.setDescription(`<@${interaction.user.id}> هو المسؤول الآن`)
.setColor("Green")]
});
}

// CLOSE
if(interaction.customId==="close_ticket"){

const owner = ticketOwners[interaction.channel.id];
const claimer = ticketClaimedBy[interaction.channel.id];

if(
interaction.user.id!==owner &&
interaction.user.id!==claimer &&
!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)
)
return interaction.reply({content:"لا تملك صلاحية",ephemeral:true});

const log = interaction.guild.channels.cache.get(TICKET_LOG_CHANNEL);

if(log){
log.send({
embeds:[
new EmbedBuilder()
.setTitle("إغلاق تذكرة")
.setDescription(`التذكرة: ${interaction.channel.name}\nالمغلق: <@${interaction.user.id}>`)
.setColor("Red")
]
});
}

await interaction.channel.delete();
}

}

// =======================
// SLASH COMMANDS
// =======================

if(!interaction.isChatInputCommand()) return;

const {commandName}=interaction;

// PANEL
if(commandName==="panel"){

if(!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator))
return interaction.reply({content:"لا تملك صلاحية",ephemeral:true});

const row = new ActionRowBuilder().addComponents(
new ButtonBuilder().setCustomId("create_ticket").setLabel("فتح تذكرة").setStyle(ButtonStyle.Success)
);

await interaction.channel.send({
embeds:[
new EmbedBuilder()
.setTitle("نظام الدعم الفني")
.setDescription("اضغط لفتح تذكرة")
.setColor("Blue")
],
components:[row]
});

return interaction.reply({content:"تم",ephemeral:true});
}

});
 
client.login(TOKEN);

});

// =======================

client.login(TOKEN);
