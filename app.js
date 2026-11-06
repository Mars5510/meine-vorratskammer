const $=s=>document.querySelector(s);const $$=s=>[...document.querySelectorAll(s)];
const store={get(k,f){try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}},set(k,v){localStorage.setItem(k,JSON.stringify(v))}};
let foods=store.get("foods",[]),shopping=store.get("shopping",[]);
const icons={"Obst & Gemüse":"🥑","Milchprodukte":"🥛","Getreide & Brot":"🍞","Konserven":"🥫","Getränke":"🧃","Tiefkühl":"🧊","Sonstiges":"🧺"};
const today=()=>{const d=new Date();d.setHours(0,0,0,0);return d};
function daysLeft(date){if(!date)return null;return Math.ceil((new Date(date+"T00:00:00")-today())/86400000)}
function status(f){let d=daysLeft(f.expiry);return d===null?"none":d<0?"expired":d<=7?"soon":"ok"}
function persist(){store.set("foods",foods);store.set("shopping",shopping);render()}
function render(){
 const soon=foods.filter(f=>status(f)==="soon").length,expired=foods.filter(f=>status(f)==="expired").length;
 $("#totalCount").textContent=foods.length;$("#soonCount").textContent=soon;$("#expiredCount").textContent=expired;$("#shoppingCount").textContent=shopping.filter(x=>!x.done).length;
 const q=$("#search").value.toLowerCase(),filter=$("#filter").value;
 const shown=foods.filter(f=>(f.name+" "+f.category).toLowerCase().includes(q)&&(filter==="all"||status(f)===filter));
 $("#items").innerHTML=shown.map(f=>{let s=status(f),d=daysLeft(f.expiry),tag=s==="expired"?"Abgelaufen":s==="soon"?(d===0?"Heute fällig":`Noch ${d} Tag${d===1?"":"e"}`):f.expiry?`MHD ${new Date(f.expiry+"T00:00:00").toLocaleDateString("de-DE")}`:"Ohne Datum";return `<article class="item"><div class="food-icon">${icons[f.category]||"🧺"}</div><div class="item-main"><strong>${esc(f.name)}</strong><small>${esc(String(f.qty))} ${esc(f.unit)} · ${esc(f.category)}</small></div><span class="expiry-tag ${s}">${tag}</span><button class="delete" data-delete="${f.id}" aria-label="Entfernen">×</button></article>`}).join("");
 $("#empty").classList.toggle("hidden",foods.length>0);$("#items").classList.toggle("hidden",shown.length===0);if(foods.length&&shown.length===0)$("#items").innerHTML='<p class="empty compact">Keine passenden Lebensmittel gefunden.</p>';
 $("#shoppingItems").innerHTML=shopping.map(x=>`<article class="item"><input type="checkbox" data-check="${x.id}" ${x.done?"checked":""} aria-label="Erledigt"><div class="item-main"><strong style="${x.done?"text-decoration:line-through;color:#9a9e96":""}">${esc(x.name)}</strong></div><button class="delete" data-shopdelete="${x.id}" aria-label="Entfernen">×</button></article>`).join("");
 $("#shoppingEmpty").classList.toggle("hidden",shopping.length>0);
 const priority=foods.filter(f=>status(f)==="soon"||status(f)==="expired");
 $("#notice").classList.toggle("hidden",priority.length===0);
 $("#notice").textContent=priority.length?`Hinweis: ${priority.length} Lebensmittel sind abgelaufen oder innerhalb der nächsten 7 Tage fällig.`:"";
 renderRecipes();
}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function renderRecipes(){
 const names=foods.map(f=>f.name.toLowerCase()),has=(...words)=>names.some(n=>words.some(w=>n.includes(w)));
 const ideas=[
  {e:"🍅",t:"Schnelle Tomaten-Pasta",d:"Tomaten, Nudeln, Öl und Gewürze zu einer einfachen Mahlzeit kombinieren.",ok:has("tomat","nudel","pasta")},
  {e:"🥑",t:"Bunte Gemüsepfanne",d:"Gemüse klein schneiden und mit etwas Öl in der Pfanne garen.",ok:has("paprika","zucchini","karotte","brokkoli")},
  {e:"🥣",t:"Cremige Hafer-Bowl",d:"Haferflocken mit Milch oder Pflanzendrink erwärmen und mit Obst servieren.",ok:has("hafer","milch","banane","apfel")},
  {e:"🥪",t:"Herzhafte Brotzeit",d:"Brot mit Käse, Aufstrich oder frischem Gemüse kombinieren.",ok:has("brot","käse","gurke")},
  {e:"🍲",t:"Schnelle Vorratssuppe",d:"Konserven und Gemüse mit Brühe aufkochen und abschmecken.",ok:has("dose","bohne","linsen","mais","karotte")}
 ];
 let selected=ideas.filter(x=>x.ok);if(!selected.length)selected=ideas.slice(0,3);
 $("#recipeItems").innerHTML=selected.map(x=>`<article class="recipe"><span class="emoji">${x.e}</span><h3>${x.t}</h3><p>${x.d}</p></article>`).join("");
}
$$(".tab").forEach(b=>b.addEventListener("click",()=>{$$(".tab").forEach(x=>x.classList.toggle("active",x===b));$$(".panel").forEach(x=>x.classList.toggle("active",x.id===b.dataset.tab))}));
function openDialog(){$("#itemDialog").showModal();$("#productName").focus()}
$("#addOpen").onclick=openDialog;$("#emptyAdd").onclick=openDialog;$("#closeDialog").onclick=$("#cancelDialog").onclick=()=>$("#itemDialog").close();
$("#itemForm").addEventListener("submit",e=>{e.preventDefault();foods.unshift({id:crypto.randomUUID(),name:$("#productName").value.trim(),qty:$("#quantity").value,unit:$("#unit").value,category:$("#category").value,expiry:$("#expiry").value});persist();e.target.reset();$("#quantity").value=1;$("#itemDialog").close()});
$("#items").addEventListener("click",e=>{let id=e.target.dataset.delete;if(id){foods=foods.filter(f=>f.id!==id);persist()}});
$("#search").oninput=render;$("#filter").onchange=render;
$("#shoppingForm").addEventListener("submit",e=>{e.preventDefault();let name=$("#shoppingInput").value.trim();if(name){shopping.push({id:crypto.randomUUID(),name,done:false});$("#shoppingInput").value="";persist()}});
$("#shoppingItems").addEventListener("click",e=>{let c=e.target.dataset.check,d=e.target.dataset.shopdelete;if(c){shopping=shopping.map(x=>x.id===c?{...x,done:e.target.checked}:x);persist()}if(d){shopping=shopping.filter(x=>x.id!==d);persist()}});
$("#refreshRecipes").onclick=renderRecipes;
let deferredPrompt;window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;$("#installBtn").classList.remove("hidden")});
$("#installBtn").onclick=async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$("#installBtn").classList.add("hidden")};
if("serviceWorker" in navigator && location.protocol!=="file:")navigator.serviceWorker.register("./sw.js").catch(()=>{});
render();