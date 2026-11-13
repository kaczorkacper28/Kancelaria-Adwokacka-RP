"use strict";
require("dotenv").config();
require("./panel");
const {Client,GatewayIntentBits,REST,Routes,SlashCommandBuilder,PermissionFlagsBits}=require("discord.js");
const fs=require("node:fs"),path=require("node:path");
const dir=path.join(__dirname,"data"),file=path.join(dir,"database.json");
fs.mkdirSync(dir,{recursive:true});
function read(){try{return JSON.parse(fs.readFileSync(file,"utf8"))}catch{return{cases:[],staff:[],documents:[],decisions:[]}}}
function save(d){fs.writeFileSync(file,JSON.stringify(d,null,2))}
const commands=[
new SlashCommandBuilder().setName("sprawa").setDescription("Zarejestruj nową sprawę").addStringOption(o=>o.setName("tytul").setDescription("Nazwa sprawy").setRequired(true)).addStringOption(o=>o.setName("klient").setDescription("Nick klienta").setRequired(true)).addStringOption(o=>o.setName("rodzaj").setDescription("Rodzaj sprawy").setRequired(true).addChoices({name:"Karne",value:"Karne"},{name:"Cywilne",value:"Cywilne"},{name:"Administracyjne",value:"Administracyjne"},{name:"Gospodarcze",value:"Gospodarcze"},{name:"Inne",value:"Inne"})),
new SlashCommandBuilder().setName("moje-sprawy").setDescription("Pokaż ostatnie sprawy kancelarii"),
new SlashCommandBuilder().setName("status-sprawy").setDescription("Zmień status sprawy").addStringOption(o=>o.setName("numer").setDescription("Numer sprawy").setRequired(true)).addStringOption(o=>o.setName("status").setDescription("Nowy status").setRequired(true).addChoices({name:"Nowa",value:"Nowa"},{name:"W toku",value:"W toku"},{name:"Oczekuje",value:"Oczekuje"},{name:"Zakończona",value:"Zakończona"})),
new SlashCommandBuilder().setName("pracownik").setDescription("Dodaj pracownika").addStringOption(o=>o.setName("osoba").setDescription("Imię i nazwisko lub nick").setRequired(true)).addStringOption(o=>o.setName("stanowisko").setDescription("Stanowisko").setRequired(true))
].map(x=>x.toJSON());
function staff(m){const ids=[process.env.PRESIDENT_ROLE_ID,process.env.STAFF_ROLE_ID].filter(Boolean);return m.permissions.has(PermissionFlagsBits.Administrator)||ids.some(id=>m.roles.cache.has(id))}
const client=new Client({intents:[GatewayIntentBits.Guilds]});
client.once("ready",async()=>{console.log("Bot zalogowany: "+client.user.tag);if(!process.env.CLIENT_ID||!process.env.GUILD_ID)return;try{const rest=new REST({version:"10"}).setToken(process.env.DISCORD_TOKEN);await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID,process.env.GUILD_ID),{body:commands});console.log("Komendy serwera zarejestrowane.")}catch(e){console.error("Błąd rejestracji komend:",e.message)}});
client.on("interactionCreate",async i=>{if(!i.isChatInputCommand())return;const n=i.commandName;if(["sprawa","status-sprawy","pracownik"].includes(n)&&!staff(i.member))return i.reply({content:"Komenda dostępna tylko dla personelu kancelarii.",ephemeral:true});const d=read();
if(n==="sprawa"){const x={id:"KA-"+new Date().getFullYear()+"-"+String(Date.now()).slice(-6),title:i.options.getString("tytul"),client:i.options.getString("klient"),type:i.options.getString("rodzaj"),lawyer:i.user.tag,status:"Nowa",notes:"",createdAt:new Date().toISOString()};d.cases.unshift(x);save(d);if(process.env.CASES_CHANNEL_ID){const ch=await client.channels.fetch(process.env.CASES_CHANNEL_ID).catch(()=>null);if(ch)await ch.send("**Nowa sprawa "+x.id+"**\n"+x.title+" · "+x.type+"\nKlient: "+x.client)}return i.reply({content:"Zarejestrowano sprawę **"+x.id+"**.",ephemeral:true})}
if(n==="moje-sprawy"){const rows=d.cases.slice(0,10);return i.reply({content:rows.length?rows.map(x=>"**"+x.id+"** — "+x.title+" · "+x.status).join("\n"):"Brak spraw.",ephemeral:true})}
if(n==="status-sprawy"){const x=d.cases.find(x=>x.id.toLowerCase()===i.options.getString("numer").toLowerCase());if(!x)return i.reply({content:"Nie znaleziono sprawy.",ephemeral:true});x.status=i.options.getString("status");save(d);return i.reply({content:"Status sprawy "+x.id+": **"+x.status+"**.",ephemeral:true})}
if(n==="pracownik"){const x={id:"PR-"+Date.now().toString().slice(-7),name:i.options.getString("osoba"),role:i.options.getString("stanowisko"),discord:i.user.tag,active:true,createdAt:new Date().toISOString()};d.staff.unshift(x);save(d);return i.reply({content:"Dodano: **"+x.name+"** — "+x.role,ephemeral:true})}
});
if(process.env.DISCORD_TOKEN)client.login(process.env.DISCORD_TOKEN).catch(e=>console.error("Błąd logowania bota:",e.message));else console.log("Brak DISCORD_TOKEN — działa sam panel.");