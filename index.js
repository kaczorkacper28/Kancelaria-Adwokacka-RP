"use strict";
require("dotenv").config();
const {Client,GatewayIntentBits,REST,Routes,SlashCommandBuilder,PermissionFlagsBits,ActionRowBuilder,ButtonBuilder,ButtonStyle,AttachmentBuilder}=require("discord.js");
const fs=require("node:fs"),path=require("node:path");
const dir=path.join(__dirname,"data"),file=path.join(dir,"database.json");
fs.mkdirSync(dir,{recursive:true});
function read(){try{return JSON.parse(fs.readFileSync(file,"utf8"))}catch{return{cases:[],staff:[],documents:[],decisions:[]}}}
function save(d){fs.writeFileSync(file,JSON.stringify(d,null,2))}
const commands=[
new SlashCommandBuilder().setName("sprawa").setDescription("Zarejestruj nową sprawę").addStringOption(o=>o.setName("tytul").setDescription("Nazwa sprawy").setRequired(true)).addStringOption(o=>o.setName("klient").setDescription("Nick klienta").setRequired(true)).addStringOption(o=>o.setName("rodzaj").setDescription("Rodzaj sprawy").setRequired(true).addChoices({name:"Karne",value:"Karne"},{name:"Cywilne",value:"Cywilne"},{name:"Administracyjne",value:"Administracyjne"},{name:"Gospodarcze",value:"Gospodarcze"},{name:"Inne",value:"Inne"})),
new SlashCommandBuilder().setName("moje-sprawy").setDescription("Pokaż ostatnie sprawy kancelarii"),
new SlashCommandBuilder().setName("status-sprawy").setDescription("Zmień status sprawy").addStringOption(o=>o.setName("numer").setDescription("Numer sprawy").setRequired(true)).addStringOption(o=>o.setName("status").setDescription("Nowy status").setRequired(true).addChoices({name:"Nowa",value:"Nowa"},{name:"W toku",value:"W toku"},{name:"Oczekuje",value:"Oczekuje"},{name:"Zakończona",value:"Zakończona"})),
new SlashCommandBuilder().setName("pracownik").setDescription("Dodaj pracownika").addStringOption(o=>o.setName("osoba").setDescription("Imię i nazwisko lub nick").setRequired(true)).addStringOption(o=>o.setName("stanowisko").setDescription("Stanowisko").setRequired(true)),
new SlashCommandBuilder().setName("konfiguruj-serwer").setDescription("Utwórz role, kategorie i kanały kancelarii").setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(x=>x.toJSON());
function staff(m){const ids=[process.env.PRESIDENT_ROLE_ID,process.env.STAFF_ROLE_ID].filter(Boolean);return m.permissions.has(PermissionFlagsBits.Administrator)||ids.some(id=>m.roles.cache.has(id))}
const client=new Client({intents:[GatewayIntentBits.Guilds]});
client.once("ready",async()=>{console.log("Bot zalogowany: "+client.user.tag);if(!process.env.GUILD_ID)return;try{const appId=client.application.id;console.log("ID aplikacji zalogowanego bota: "+appId);const rest=new REST({version:"10"}).setToken(process.env.DISCORD_TOKEN);await rest.put(Routes.applicationGuildCommands(appId,process.env.GUILD_ID),{body:commands});console.log("Komendy serwera zarejestrowane.")}catch(e){console.error("Błąd rejestracji komend:",e.message)}});
async function configureGuild(guild){
const roleNames=["Prezes","Wiceprezes","Dyrektor Zarządzający","Kierownik Departamentu","Adwokat","Aplikant Adwokacki","Asystent Prawny","Sekretariat","Klient"];
const roleMap={};let madeRoles=0;
for(const name of roleNames){let role=guild.roles.cache.find(r=>r.name===name);if(!role){role=await guild.roles.create({name,reason:"Konfiguracja kancelarii RP"});madeRoles++;}roleMap[name]=role;}
await guild.roles.fetch();
const everyone=guild.roles.everyone;
const staffRoles=["Prezes","Wiceprezes","Dyrektor Zarządzający","Kierownik Departamentu","Adwokat","Aplikant Adwokacki","Asystent Prawny","Sekretariat"].map(n=>roleMap[n].id);
const allStaff={id:everyone.id,deny:[PermissionFlagsBits.ViewChannel]};
const staffAllow=staffRoles.map(id=>({id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.ReadMessageHistory,PermissionFlagsBits.SendMessages]}));
const publicOverwrites=[{id:everyone.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.ReadMessageHistory]}];
const sections=[
{name:"📌 INFORMACJE",public:true,channels:["ogłoszenia","regulamin","struktura-kancelarii","lista-adwokatów"]},
{name:"⚖️ ZARZĄD",channels:["gabinet-prezesa","decyzje-zarządu","raporty","posiedzenia"]},
{name:"👥 KADRA",channels:["czat-kadry","rekrutacja","grafik-i-obecności"]},
{name:"🌐 STREFA OBYWATELA",public:true,channels:["ogłoszenia-dla-obywateli","jak-uzyskać-adwokata","wnioski-o-adwokata","kontakt-z-kancelarią","opinie-o-kancelarii"]},
{name:"📂 REJESTR SPRAW",channels:["rejestr-spraw","sprawy-karne","sprawy-cywilne","sprawy-administracyjne","sprawy-gospodarcze"]},
{name:"📑 DOKUMENTY",channels:["wzory-dokumentów","dokumenty-do-opracowania","decyzje-i-postanowienia"]},
{name:"🗄️ ARCHIWUM",channels:["zakończone-sprawy","archiwum-dokumentów"]}
];
sections.push({name:"🎫 TICKETY",channels:[]},{name:"🗄️ ARCHIWUM TICKETÓW",channels:["archiwum-ticketów"]});
const existingCategories=guild.channels.cache.filter(c=>c.type===4);
const existingChannels=guild.channels.cache;
let madeCategories=0,madeChannels=0;
for(const section of sections){
let category=existingCategories.find(c=>c.name===section.name);
if(!category){category=await guild.channels.create({name:section.name,type:4,permissionOverwrites:section.public?publicOverwrites:[allStaff,...staffAllow]});madeCategories++;}
for(const name of section.channels){
if(existingChannels.some(c=>c.name===name&&c.parentId===category.id))continue;
await guild.channels.create({name,type:0,parent:category.id,permissionOverwrites:section.public?publicOverwrites:[allStaff,...staffAllow],reason:"Konfiguracja kancelarii RP"});
madeChannels++;
}
}
const ticketCategory=guild.channels.cache.find(c=>c.type===4&&c.name==="🎫 TICKETY");
const panelChannel=guild.channels.cache.find(c=>c.type===0&&c.name==="kontakt-z-kancelarią");
if(panelChannel){
 const recent=await panelChannel.messages.fetch({limit:50}).catch(()=>null);
 const hasPanel=recent?.some(m=>m.author.id===client.user.id&&m.components.some(row=>row.components.some(b=>b.customId==="ticket_open")));
 if(!hasPanel){
  const row=new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("ticket_open").setLabel("Otwórz ticket").setEmoji("🎫").setStyle(ButtonStyle.Primary));
  await panelChannel.send({content:"**📞 Kontakt z Kancelarią Adwokacką RP**\\nAby skontaktować się z kancelarią, kliknij przycisk poniżej. Otrzymasz prywatny kanał, widoczny dla Ciebie i upoważnionych pracowników.",components:[row]});
 }
}
return {madeRoles,madeCategories,madeChannels};
}
client.on("interactionCreate",async i=>{
if(i.isButton()){
 const guild=i.guild;
 if(!guild)return;
 const staffRoleNames=["Prezes","Wiceprezes","Dyrektor Zarządzający","Kierownik Departamentu","Adwokat","Aplikant Adwokacki","Asystent Prawny","Sekretariat"];
 const isStaff= i.memberPermissions?.has(PermissionFlagsBits.Administrator)||staffRoleNames.some(name=>i.member?.roles?.cache?.some(r=>r.name===name));
 if(i.customId==="ticket_open"){
  const old=guild.channels.cache.find(c=>c.type===0&&c.parent?.name==="🎫 TICKETY"&&c.topic===("ticket-owner:"+i.user.id));
  if(old)return i.reply({content:"Masz już otwarty ticket: "+old,ephemeral:true});
  const category=guild.channels.cache.find(c=>c.type===4&&c.name==="🎫 TICKETY");
  if(!category)return i.reply({content:"Brakuje kategorii ticketów. Administrator musi ponownie uruchomić /konfiguruj-serwer.",ephemeral:true});
  const staffRoles=guild.roles.cache.filter(r=>staffRoleNames.includes(r.name)).map(r=>({id:r.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory]}));
  const ch=await guild.channels.create({name:"ticket-"+i.user.username.toLowerCase().replace(/[^a-z0-9-]/g,"").slice(0,18),type:0,parent:category.id,topic:"ticket-owner:"+i.user.id,permissionOverwrites:[{id:guild.roles.everyone.id,deny:[PermissionFlagsBits.ViewChannel]},{id:i.user.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory,PermissionFlagsBits.AttachFiles]},...staffRoles],reason:"Nowy ticket obywatela"});
  const row=new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("ticket_claim").setLabel("Przejmij ticket").setStyle(ButtonStyle.Success),new ButtonBuilder().setCustomId("ticket_close").setLabel("Zamknij ticket").setStyle(ButtonStyle.Danger));
  await ch.send({content:"Witaj "+i.user+"! Opisz, w jakiej sprawie potrzebujesz pomocy. Pracownik kancelarii odpowie tutaj.\\n**Obsługa ticketu:**",components:[row]});
  return i.reply({content:"Utworzono Twój prywatny ticket: "+ch,ephemeral:true});
 }
 if(i.customId==="ticket_claim"){
  if(!isStaff)return i.reply({content:"Tylko pracownik kancelarii może przejąć ticket.",ephemeral:true});
  await i.channel.send("📌 Ticket został przejęty przez "+i.user+".");
  return i.reply({content:"Przejęto ticket.",ephemeral:true});
 }
 if(i.customId==="ticket_close"){
  const ownerId=i.channel?.topic?.startsWith("ticket-owner:")?i.channel.topic.slice("ticket-owner:".length):null;
  if(i.user.id!==ownerId&&!isStaff)return i.reply({content:"Ticket może zamknąć jego autor lub pracownik kancelarii.",ephemeral:true});
  await i.deferReply({ephemeral:true});
  const messages=await i.channel.messages.fetch({limit:100}).catch(()=>null);
  const transcript=messages?[...messages.values()].sort((a,b)=>a.createdTimestamp-b.createdTimestamp).map(m=>`[${new Date(m.createdTimestamp).toISOString()}] ${m.author.tag}: ${m.content}`).join("\\n"):"Nie udało się pobrać wiadomości.";
  const archive=guild.channels.cache.find(c=>c.type===0&&c.name==="archiwum-ticketów");
  if(archive)await archive.send({content:"**Zamknięty ticket:** "+i.channel.name+"\\n**Autor:** <@"+(ownerId||"0")+">",files:[new AttachmentBuilder(Buffer.from(transcript,"utf8"),{name:i.channel.name+"-transkrypcja.txt"})]}).catch(e=>console.error("Błąd archiwizacji ticketu:",e));
  await i.editReply(archive?"Ticket zamknięty, a transkrypcja zapisana w archiwum.":"Ticket zamknięty. Nie znaleziono kanału archiwum.");
  await i.channel.delete("Ticket zamknięty").catch(()=>{});
  return;
 }
 return;
}
if(!i.isChatInputCommand())return;const n=i.commandName;
if(n==="konfiguruj-serwer"){if(!i.guild||!i.memberPermissions?.has(PermissionFlagsBits.Administrator))return i.reply({content:"Tylko administrator serwera może uruchomić konfigurację.",ephemeral:true});if(!i.guild.members.me.permissions.has([PermissionFlagsBits.ManageRoles,PermissionFlagsBits.ManageChannels]))return i.reply({content:"Bot potrzebuje uprawnień Zarządzanie rolami i Zarządzanie kanałami. Nadaj je botowi i spróbuj ponownie.",ephemeral:true});await i.deferReply({ephemeral:true});try{const result=await configureGuild(i.guild);return i.editReply("Konfiguracja zakończona. Utworzono role: "+result.madeRoles+", kategorie: "+result.madeCategories+", kanały: "+result.madeChannels+". Istniejące elementy pozostawiono bez zmian.");}catch(e){console.error("Błąd konfiguracji serwera:",e);return i.editReply("Nie udało się dokończyć konfiguracji: "+e.message);}}
if(["sprawa","status-sprawy","pracownik"].includes(n)&&!staff(i.member))return i.reply({content:"Komenda dostępna tylko dla personelu kancelarii.",ephemeral:true});const d=read();
if(n==="sprawa"){const x={id:"KA-"+new Date().getFullYear()+"-"+String(Date.now()).slice(-6),title:i.options.getString("tytul"),client:i.options.getString("klient"),type:i.options.getString("rodzaj"),lawyer:i.user.tag,status:"Nowa",notes:"",createdAt:new Date().toISOString()};d.cases.unshift(x);save(d);if(process.env.CASES_CHANNEL_ID){const ch=await client.channels.fetch(process.env.CASES_CHANNEL_ID).catch(()=>null);if(ch)await ch.send("**Nowa sprawa "+x.id+"**\n"+x.title+" · "+x.type+"\nKlient: "+x.client)}return i.reply({content:"Zarejestrowano sprawę **"+x.id+"**.",ephemeral:true})}
if(n==="moje-sprawy"){const rows=d.cases.slice(0,10);return i.reply({content:rows.length?rows.map(x=>"**"+x.id+"** — "+x.title+" · "+x.status).join("\n"):"Brak spraw.",ephemeral:true})}
if(n==="status-sprawy"){const x=d.cases.find(x=>x.id.toLowerCase()===i.options.getString("numer").toLowerCase());if(!x)return i.reply({content:"Nie znaleziono sprawy.",ephemeral:true});x.status=i.options.getString("status");save(d);return i.reply({content:"Status sprawy "+x.id+": **"+x.status+"**.",ephemeral:true})}
if(n==="pracownik"){const x={id:"PR-"+Date.now().toString().slice(-7),name:i.options.getString("osoba"),role:i.options.getString("stanowisko"),discord:i.user.tag,active:true,createdAt:new Date().toISOString()};d.staff.unshift(x);save(d);return i.reply({content:"Dodano: **"+x.name+"** — "+x.role,ephemeral:true})}
});
if(process.env.DISCORD_TOKEN)client.login(process.env.DISCORD_TOKEN).catch(e=>console.error("Błąd logowania bota:",e.message));else console.log("Brak DISCORD_TOKEN — bot Discord nie został uruchomiony.");