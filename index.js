"use strict";
require("dotenv").config();
const {Client,GatewayIntentBits,REST,Routes,SlashCommandBuilder,PermissionFlagsBits,MessageFlags,ActionRowBuilder,ButtonBuilder,ButtonStyle,AttachmentBuilder,EmbedBuilder,StringSelectMenuBuilder,ModalBuilder,TextInputBuilder,TextInputStyle}=require("discord.js");
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
const client=new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMessages,GatewayIntentBits.MessageContent]});
client.once("clientReady",async()=>{console.log("Bot zalogowany: "+client.user.tag);if(!process.env.GUILD_ID)return;try{const appId=client.application.id;console.log("ID aplikacji zalogowanego bota: "+appId);const rest=new REST({version:"10"}).setToken(process.env.DISCORD_TOKEN);await rest.put(Routes.applicationGuildCommands(appId,process.env.GUILD_ID),{body:commands});console.log("Komendy serwera zarejestrowane.")}catch(e){console.error("Błąd rejestracji komend:",e.message)}});
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
const panelChannel=guild.channels.cache.find(c=>c.type===0&&c.name==="kontakt-z-kancelarią"&&c.parent?.name==="🌐 STREFA OBYWATELA");
if(panelChannel){
 const recent=await panelChannel.messages.fetch({limit:50}).catch(()=>null);
 const oldPanel=recent?.find(m=>m.author.id===client.user.id&&m.components.some(row=>row.components.some(b=>["ticket_open","ticket_category"].includes(b.customId))));
 const embed=new EmbedBuilder().setColor(0x1f4e79).setTitle("⚖️ BIURO OBSŁUGI KLIENTA — KANCELARIA ADWOKACKA RP").setDescription("Witamy w systemie zgłoszeń Kancelarii Adwokackiej RP.\\n\\nAby rozpocząć kontakt z kancelarią, wybierz kategorię zgłoszenia z listy poniżej. Następnie wypełnij formularz. Na jego podstawie zostanie utworzony prywatny kanał rozmowy z upoważnionym personelem.").addFields({name:"📋 Dostępne zgłoszenia",value:"• Pomoc prawna\\n• Sprawa karna\\n• Sprawa cywilna\\n• Sprawa administracyjna\\n• Sprawa gospodarcza\\n• Skarga lub odwołanie\\n• Inne"},{name:"🔒 Poufność",value:"Treść zgłoszenia będzie widoczna wyłącznie dla Ciebie oraz upoważnionych pracowników kancelarii."}).setFooter({text:"Kancelaria Adwokacka RP • Elektroniczny system obsługi zgłoszeń"});
 const menu=new StringSelectMenuBuilder().setCustomId("ticket_category").setPlaceholder("Wybierz kategorię zgłoszenia").addOptions({label:"Pomoc prawna",value:"Pomoc prawna",emoji:"⚖️",description:"Ogólne zapytanie i konsultacja"},{label:"Sprawa karna",value:"Sprawa karna",emoji:"🔎",description:"Postępowanie lub problem karny"},{label:"Sprawa cywilna",value:"Sprawa cywilna",emoji:"📄",description:"Spór cywilny lub roszczenie"},{label:"Sprawa administracyjna",value:"Sprawa administracyjna",emoji:"🏛️",description:"Sprawa przed organem administracji"},{label:"Sprawa gospodarcza",value:"Sprawa gospodarcza",emoji:"💼",description:"Sprawy firmowe i gospodarcze"},{label:"Skarga lub odwołanie",value:"Skarga lub odwołanie",emoji:"📝",description:"Skarga na działanie lub odwołanie"},{label:"Inne",value:"Inne",emoji:"📬",description:"Pozostałe sprawy"});
 const panelPayload={embeds:[embed],components:[new ActionRowBuilder().addComponents(menu)]};
 if(oldPanel)await oldPanel.edit(panelPayload);
 else await panelChannel.send(panelPayload);
 }
}
return {madeRoles,madeCategories,madeChannels};
}
client.on("interactionCreate",async i=>{
try{
if(i.isStringSelectMenu()&&i.customId==="ticket_category"){
 const modal=new ModalBuilder().setCustomId("ticket_form:"+i.values[0]).setTitle("Formularz zgłoszenia — Kancelaria");
 const name=new TextInputBuilder().setCustomId("client_name").setLabel("Imię i nazwisko / nick RP").setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(80);
 const subject=new TextInputBuilder().setCustomId("subject").setLabel("Temat zgłoszenia").setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(100);
 const details=new TextInputBuilder().setCustomId("details").setLabel("Opisz sprawę i czego oczekujesz").setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(1500);
 modal.addComponents(new ActionRowBuilder().addComponents(name),new ActionRowBuilder().addComponents(subject),new ActionRowBuilder().addComponents(details));
 return i.showModal(modal);
}
if(i.isModalSubmit()&&i.customId.startsWith("ticket_form:")){
 await i.deferReply({flags:MessageFlags.Ephemeral});
 const guild=i.guild;
 const category=guild?.channels.cache.find(c=>c.type===4&&c.name==="🎫 TICKETY");
 if(!category)return i.editReply("Brakuje kategorii 🎫 TICKETY. Administrator musi uruchomić /konfiguruj-serwer.");
 const old=guild.channels.cache.find(c=>c.type===0&&c.parentId===category.id&&c.topic?.startsWith("ticket-owner:"+i.user.id+"|"));
 if(old)return i.editReply("Masz już otwarte zgłoszenie: "+old);
 const staffRoleNames=["Prezes","Wiceprezes","Dyrektor Zarządzający","Kierownik Departamentu","Adwokat","Aplikant Adwokacki","Asystent Prawny","Sekretariat"];
 const staffRoles=guild.roles.cache.filter(r=>staffRoleNames.includes(r.name)).map(r=>({id:r.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory]}));
 const categoryName=i.customId.slice("ticket_form:".length);
 const serial=String(Date.now()).slice(-6);
 const safeName=i.user.username.toLowerCase().replace(/[^a-z0-9-]/g,"").slice(0,12)||"klient";
 const ch=await guild.channels.create({name:"zgl-"+serial+"-"+safeName,type:0,parent:category.id,topic:"ticket-owner:"+i.user.id+"|category:"+categoryName+"|status:nowe",permissionOverwrites:[{id:guild.roles.everyone.id,deny:[PermissionFlagsBits.ViewChannel]},{id:i.user.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory,PermissionFlagsBits.AttachFiles]},...staffRoles],reason:"Nowe zgłoszenie do Kancelarii Adwokackiej RP"});
 const embed=new EmbedBuilder().setColor(0x1f4e79).setTitle("📂 NOWE ZGŁOSZENIE — "+serial).setDescription("Zgłoszenie zostało przyjęte do systemu Kancelarii Adwokackiej RP. Prosimy o oczekiwanie na pracownika kancelarii.").addFields({name:"Numer zgłoszenia",value:"KA-T-"+serial,inline:true},{name:"Status",value:"🟡 Oczekuje na przyjęcie",inline:true},{name:"Kategoria",value:categoryName,inline:true},{name:"Dane zgłaszającego",value:i.fields.getTextInputValue("client_name")},{name:"Temat",value:i.fields.getTextInputValue("subject")},{name:"Opis sprawy",value:i.fields.getTextInputValue("details")}).setFooter({text:"Kancelaria Adwokacka RP • Zgłoszenie poufne"}).setTimestamp();
 const row=new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("ticket_claim").setLabel("Przyjmij zgłoszenie").setEmoji("📌").setStyle(ButtonStyle.Success),new ButtonBuilder().setCustomId("ticket_reject").setLabel("Odrzuć zgłoszenie").setEmoji("⛔").setStyle(ButtonStyle.Secondary),new ButtonBuilder().setCustomId("ticket_close").setLabel("Zamknij zgłoszenie").setEmoji("🔒").setStyle(ButtonStyle.Danger));
 await ch.send({content:i.user.toString()+" • **Nowe zgłoszenie oczekuje na obsługę.**",embeds:[embed],components:[row]});
 return i.editReply("Zgłoszenie **KA-T-"+serial+"** zostało utworzone: "+ch);
}
if(i.isButton()){
 const guild=i.guild;
 if(!guild)return;
 const staffRoleNames=["Prezes","Wiceprezes","Dyrektor Zarządzający","Kierownik Departamentu","Adwokat","Aplikant Adwokacki","Asystent Prawny","Sekretariat"];
 const isStaff= i.memberPermissions?.has(PermissionFlagsBits.Administrator)||staffRoleNames.some(name=>i.member?.roles?.cache?.some(r=>r.name===name));
 if(i.customId==="ticket_open"){
  await i.deferReply({flags:MessageFlags.Ephemeral});
  const old=guild.channels.cache.find(c=>c.type===0&&c.parent?.name==="🎫 TICKETY"&&c.topic?.startsWith("ticket-owner:"+i.user.id+"|"));
  if(old)return i.editReply({content:"Masz już otwarty ticket: "+old});
  const category=guild.channels.cache.find(c=>c.type===4&&c.name==="🎫 TICKETY");
  if(!category)return i.editReply({content:"Brakuje kategorii ticketów. Administrator musi ponownie uruchomić /konfiguruj-serwer."});
  const staffRoles=guild.roles.cache.filter(r=>staffRoleNames.includes(r.name)).map(r=>({id:r.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory]}));
  const ch=await guild.channels.create({name:"ticket-"+i.user.username.toLowerCase().replace(/[^a-z0-9-]/g,"").slice(0,18),type:0,parent:category.id,topic:"ticket-owner:"+i.user.id,permissionOverwrites:[{id:guild.roles.everyone.id,deny:[PermissionFlagsBits.ViewChannel]},{id:i.user.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory,PermissionFlagsBits.AttachFiles]},...staffRoles],reason:"Nowy ticket obywatela"});
  const row=new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("ticket_claim").setLabel("Przejmij ticket").setStyle(ButtonStyle.Success),new ButtonBuilder().setCustomId("ticket_close").setLabel("Zamknij ticket").setStyle(ButtonStyle.Danger));
  await ch.send({content:"Witaj "+i.user+"! Opisz, w jakiej sprawie potrzebujesz pomocy. Pracownik kancelarii odpowie tutaj.\\n**Obsługa ticketu:**",components:[row]});
  return i.editReply({content:"Utworzono Twój prywatny ticket: "+ch});
 }
 if(i.customId==="ticket_claim"){
  if(!isStaff)return i.reply({content:"Tylko pracownik kancelarii może przejąć ticket.",flags:MessageFlags.Ephemeral});
  const oldTopic=i.channel.topic||"";
  if(oldTopic.includes("|status:przyjete"))return i.reply({content:"To zgłoszenie zostało już przejęte.",flags:MessageFlags.Ephemeral});
  await i.channel.setTopic(oldTopic.replace("|status:nowe","|status:przyjete")+"|pracownik:"+i.user.id);
  const msg=new EmbedBuilder().setColor(0x238636).setTitle("📌 ZGŁOSZENIE PRZEJĘTE").setDescription("Zgłoszenie zostało przejęte do obsługi przez "+i.user+".");
  await i.channel.send({embeds:[msg]});
  return i.reply({content:"Przejęto zgłoszenie.",flags:MessageFlags.Ephemeral});
 }
 if(i.customId==="ticket_reject"){
  if(!isStaff)return i.reply({content:"Tylko pracownik kancelarii może odrzucić zgłoszenie.",flags:MessageFlags.Ephemeral});
  const topic=i.channel.topic||"";
  if(topic.includes("|status:odrzucone"))return i.reply({content:"To zgłoszenie zostało już odrzucone.",flags:MessageFlags.Ephemeral});
  await i.channel.setTopic(topic.replace("|status:nowe","|status:odrzucone").replace("|status:przyjete","|status:odrzucone"));
  await i.channel.send({embeds:[new EmbedBuilder().setColor(0xb42318).setTitle("⛔ ZGŁOSZENIE ODRZUCONE").setDescription("Zgłoszenie zostało oznaczone jako odrzucone przez "+i.user+". W razie pytań skontaktuj się z personelem kancelarii.").setTimestamp()]});
  return i.reply({content:"Oznaczono zgłoszenie jako odrzucone.",flags:MessageFlags.Ephemeral});
 }
 if(i.customId==="ticket_close"){
  const ownerId=i.channel?.topic?.startsWith("ticket-owner:")?i.channel.topic.slice("ticket-owner:".length).split("|")[0]:null;
  if(i.user.id!==ownerId&&!isStaff)return i.reply({content:"Ticket może zamknąć jego autor lub pracownik kancelarii.",flags:MessageFlags.Ephemeral});
  await i.deferReply({flags:MessageFlags.Ephemeral});
  const messages=await i.channel.messages.fetch({limit:100}).catch(()=>null);
  const transcript=messages?[...messages.values()].sort((a,b)=>a.createdTimestamp-b.createdTimestamp).map(m=>`[${new Date(m.createdTimestamp).toISOString()}] ${m.author.tag}: ${m.content}`).join("\\n"):"Nie udało się pobrać wiadomości.";
  const archive=guild.channels.cache.find(c=>c.type===0&&c.name==="archiwum-ticketów");
  if(archive)await archive.send({content:"**ZAMKNIĘTE ZGŁOSZENIE KANCELARII**\\n**Kanał:** "+i.channel.name+"\\n**Autor:** <@"+(ownerId||"0")+">\\n**Zamknął:** "+i.user,files:[new AttachmentBuilder(Buffer.from(transcript,"utf8"),{name:i.channel.name+"-transkrypcja.txt"})]}).catch(e=>console.error("Błąd archiwizacji ticketu:",e));
  await i.editReply(archive?"Ticket zamknięty, a transkrypcja zapisana w archiwum.":"Ticket zamknięty. Nie znaleziono kanału archiwum.");
  await i.channel.delete("Ticket zamknięty").catch(()=>{});
  return;
 }
 return;
}
if(!i.isChatInputCommand())return;const n=i.commandName;
if(n==="konfiguruj-serwer"){if(!i.guild||!i.memberPermissions?.has(PermissionFlagsBits.Administrator))return i.reply({content:"Tylko administrator serwera może uruchomić konfigurację.",flags:MessageFlags.Ephemeral});if(!i.guild.members.me.permissions.has([PermissionFlagsBits.ManageRoles,PermissionFlagsBits.ManageChannels]))return i.reply({content:"Bot potrzebuje uprawnień Zarządzanie rolami i Zarządzanie kanałami. Nadaj je botowi i spróbuj ponownie.",flags:MessageFlags.Ephemeral});await i.deferReply({flags:MessageFlags.Ephemeral});try{const result=await configureGuild(i.guild);return i.editReply("Konfiguracja zakończona. Utworzono role: "+result.madeRoles+", kategorie: "+result.madeCategories+", kanały: "+result.madeChannels+". Istniejące elementy pozostawiono bez zmian.");}catch(e){console.error("Błąd konfiguracji serwera:",e);return i.editReply("Nie udało się dokończyć konfiguracji: "+e.message);}}
if(["sprawa","status-sprawy","pracownik"].includes(n)&&!staff(i.member))return i.reply({content:"Komenda dostępna tylko dla personelu kancelarii.",flags:MessageFlags.Ephemeral});const d=read();
if(n==="sprawa"){const x={id:"KA-"+new Date().getFullYear()+"-"+String(Date.now()).slice(-6),title:i.options.getString("tytul"),client:i.options.getString("klient"),type:i.options.getString("rodzaj"),lawyer:i.user.tag,status:"Nowa",notes:"",createdAt:new Date().toISOString()};d.cases.unshift(x);save(d);if(process.env.CASES_CHANNEL_ID){const ch=await client.channels.fetch(process.env.CASES_CHANNEL_ID).catch(()=>null);if(ch)await ch.send("**Nowa sprawa "+x.id+"**\n"+x.title+" · "+x.type+"\nKlient: "+x.client)}return i.reply({content:"Zarejestrowano sprawę **"+x.id+"**.",flags:MessageFlags.Ephemeral})}
if(n==="moje-sprawy"){const rows=d.cases.slice(0,10);return i.reply({content:rows.length?rows.map(x=>"**"+x.id+"** — "+x.title+" · "+x.status).join("\n"):"Brak spraw.",flags:MessageFlags.Ephemeral})}
if(n==="status-sprawy"){const x=d.cases.find(x=>x.id.toLowerCase()===i.options.getString("numer").toLowerCase());if(!x)return i.reply({content:"Nie znaleziono sprawy.",flags:MessageFlags.Ephemeral});x.status=i.options.getString("status");save(d);return i.reply({content:"Status sprawy "+x.id+": **"+x.status+"**.",flags:MessageFlags.Ephemeral})}
if(n==="pracownik"){const x={id:"PR-"+Date.now().toString().slice(-7),name:i.options.getString("osoba"),role:i.options.getString("stanowisko"),discord:i.user.tag,active:true,createdAt:new Date().toISOString()};d.staff.unshift(x);save(d);return i.reply({content:"Dodano: **"+x.name+"** — "+x.role,flags:MessageFlags.Ephemeral})}
}catch(e){console.error("Błąd obsługi interakcji:",e);}
});
client.on("error",e=>console.error("Błąd klienta Discord:",e));
if(process.env.DISCORD_TOKEN)client.login(process.env.DISCORD_TOKEN).catch(e=>console.error("Błąd logowania bota:",e.message));else console.log("Brak DISCORD_TOKEN — bot Discord nie został uruchomiony.");