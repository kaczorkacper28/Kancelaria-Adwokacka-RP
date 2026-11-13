"use strict";
const $=s=>document.querySelector(s);let data={cases:[],staff:[],documents:[],decisions:[]};
async function api(url,opts={}){const r=await fetch(url,{headers:{"Content-Type":"application/json"},...opts});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||"Błąd");return d}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function notice(t){$("#notice").textContent=t}
function render(){$("#stat-cases").textContent=data.cases.length;$("#stat-open").textContent=data.cases.filter(x=>x.status!=="Zakończona").length;$("#stat-staff").textContent=data.staff.length;$("#stat-docs").textContent=data.documents.length;
$("#case-list").innerHTML=data.cases.map(x=>'<article class="item"><strong>'+esc(x.id)+' · '+esc(x.title)+'</strong><small>'+esc(x.type)+' · Klient: '+esc(x.client)+' · Prowadzący: '+esc(x.lawyer||"Nieprzydzielony")+'</small><select data-case="'+esc(x.id)+'">'+["Nowa","W toku","Oczekuje","Zakończona"].map(s=>'<option '+(x.status===s?"selected":"")+'>'+s+'</option>').join("")+'</select></article>').join("")||'<p class="muted">Brak spraw.</p>';
$("#staff-list").innerHTML=data.staff.map(x=>'<article class="item"><strong>'+esc(x.name)+'</strong><small>'+esc(x.role)+' · '+esc(x.discord||"Brak Discord")+'</small></article>').join("")||'<p class="muted">Brak pracowników.</p>';
$("#doc-list").innerHTML=data.documents.map(x=>'<article class="item"><strong>'+esc(x.title)+'</strong><small>'+esc(x.kind)+'</small><p>'+esc(x.content)+'</p></article>').join("")||'<p class="muted">Brak dokumentów.</p>';
$("#decision-list").innerHTML=data.decisions.map(x=>'<article class="item"><strong>'+esc(x.title)+'</strong><p>'+esc(x.content)+'</p></article>').join("")||'<p class="muted">Brak decyzji.</p>'}
async function refresh(){data=await api("/api/data");render()}
function form(id,url){$(id).addEventListener("submit",async e=>{e.preventDefault();try{await api(url,{method:"POST",body:JSON.stringify(Object.fromEntries(new FormData(e.target)))});e.target.reset();await refresh();notice("Zapisano pomyślnie.")}catch(err){notice(err.message)}})}
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===b));document.querySelectorAll(".view").forEach(x=>x.classList.toggle("hidden",x.id!==b.dataset.tab))}));
$("#case-list").addEventListener("change",async e=>{if(!e.target.dataset.case)return;try{await api("/api/cases/"+encodeURIComponent(e.target.dataset.case),{method:"PATCH",body:JSON.stringify({status:e.target.value})});await refresh();notice("Zmieniono status.")}catch(err){notice(err.message)}});
$("#logout").addEventListener("click",async()=>{await api("/api/logout",{method:"POST"});location.href="/login"});
form("#case-form","/api/cases");form("#staff-form","/api/staff");form("#doc-form","/api/documents");form("#decision-form","/api/decisions");
refresh().catch(e=>{notice(e.message);if(e.message.includes("dostępu"))location.href="/login"});