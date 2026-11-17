/* Registre · CSC — Fichiers reliés : des liens vers les fichiers du PC, rien n'est copié dans Registre.
   L'accès au fichier (FileSystemFileHandle) reste dans ce navigateur, base « app », clé « lien:<id> » ;
   le nom, le type et la taille suivent les données et la sauvegarde (S.liens).
   Sur les réunions, les comptes rendus (actions), les fiches compte et les cibles.
   Chrome ou Edge, Registre ouvert en pleine page : un cadre Notion n'a pas accès aux fichiers du PC.
   Chargé avant 18-demarrage.js (toujours en dernier) : partage les déclarations des fichiers précédents. */
"use strict";

const I_CLIP=SV+'<path d="M10.6 5.4 6.3 9.7a1.3 1.3 0 0 0 1.8 1.8l4.5-4.5a2.6 2.6 0 0 0-3.7-3.7L4.3 7.9a3.9 3.9 0 0 0 5.5 5.5l3.3-3.3"/></svg>';
const lkOK=()=>!IN_FRAME&&typeof window.showOpenFilePicker==="function";
const lkWhy=()=>IN_FRAME?"Ouvrez Registre en pleine page (hors Notion) pour relier ou ouvrir un fichier de votre PC.":"Ce navigateur ne permet pas de relier des fichiers : utilisez Chrome ou Edge.";
const lkKey=id=>"lien:"+id;
let LKH=null,LKURL=null;const LKBAD=new Set();   /* LKH : liens utilisables dans ce navigateur (null tant que non chargé) */

/* ---------- Types de fichiers ---------- */
const LKEXT={pdf:"pdf",png:"image",jpg:"image",jpeg:"image",gif:"image",webp:"image",bmp:"image",txt:"texte",
  doc:"word",docx:"word",odt:"word",rtf:"word",xls:"excel",xlsx:"excel",xlsm:"excel",csv:"excel",ods:"excel",ppt:"ppt",pptx:"ppt",odp:"ppt",msg:"mail",eml:"mail",
  dwg:"plan",dxf:"plan",zip:"zip",rar:"zip","7z":"zip"};
const LKLBL={pdf:"PDF",image:"Image",texte:"Texte",word:"Word",excel:"Excel",ppt:"PPT",mail:"Mail",plan:"Plan",zip:"Archive",autre:"Fichier"};
/* Aperçu dans Registre : seulement des formats sans script (pas de HTML ni de SVG) */
const LKMIME={pdf:"application/pdf",png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg",gif:"image/gif",webp:"image/webp",bmp:"image/bmp",txt:"text/plain;charset=utf-8"};
const lkExt=n=>{const m=/\.([a-z0-9]{1,5})$/i.exec(String(n||""));return m?m[1].toLowerCase():""};
const lkKind=n=>LKEXT[lkExt(n)]||"autre";
const lkSize=b=>{b=+b||0;return b<1024?b+" o":b<1048576?Math.round(b/1024).toLocaleString("fr-FR")+" ko":(b/1048576).toLocaleString("fr-FR",{maximumFractionDigits:1})+" Mo"};
const lkOf=(owner,id)=>S.liens.filter(l=>l.owner===owner&&l.ownerId===id).sort((a,b)=>String(a.ajouteLe).localeCompare(String(b.ajouteLe)));
const lkN=(owner,id)=>{let n=0;S.liens.forEach(l=>{if(l.owner===owner&&l.ownerId===id)n++});return n};
const lkClip=(owner,id)=>{const n=lkN(owner,id);return n?'<span class="clip" title="'+pl(n,"fichier relié","fichiers reliés")+'">'+I_CLIP+'<span class="num">'+n+'</span></span>':''};
const lkMissing=l=>LKBAD.has(l.id)||(LKH!==null&&!LKH.has(l.id));

/* ---------- Bloc « Fichiers » : panel (fiche compte), card (lecture), field (tiroir cible), plain (fenêtres de saisie) ---------- */
function lkItem(l){const k=lkKind(l.nom),bad=lkMissing(l);
  return '<li class="lki'+(bad?' bad':'')+'"><button type="button" class="lki-o" data-lkopen="'+esc(l.id)+'" title="'+esc(bad?"Lien à refaire : "+l.nom:"Ouvrir "+l.nom)+'"><span class="lki-t t-'+k+'">'+LKLBL[k]+'</span><span class="lki-n">'+esc(l.nom)+'</span></button>'+
    (bad?'<button type="button" class="lki-f" data-lkfix="'+esc(l.id)+'" title="Le fichier a été déplacé, renommé, ou le lien a été créé sur un autre navigateur : choisissez-le de nouveau">Relier</button>':'<span class="sub num lki-s">'+esc(lkSize(l.taille))+'</span>')+
    '<button type="button" class="lki-x" data-lkdel="'+esc(l.id)+'" title="Retirer le lien (le fichier reste sur votre PC)" aria-label="Retirer le lien vers '+esc(l.nom)+'">'+I_X+'</button></li>'}
function lkBlock(owner,id,mode){mode=mode||"plain";const L=lkOf(owner,id),ok=lkOK(),at='data-lkown="'+owner+'" data-lkid="'+esc(id)+'" data-lkmode="'+mode+'"';
  const add='<button type="button" class="'+(mode==="panel"?"more":"btn lkb-add")+'" data-lkadd="'+owner+'" data-lkfor="'+esc(id)+'"'+(ok?' title="Choisir un ou plusieurs fichiers sur votre PC : Registre garde un lien, rien n\'est copié"':' disabled title="'+esc(lkWhy())+'"')+'>'+(mode==="panel"?'+ Relier un fichier':I_CLIP+'Relier un fichier')+'</button>';
  const list=L.length?'<ul class="lkl">'+L.map(lkItem).join("")+'</ul>':'<p class="hint">'+(ok?'Aucun fichier relié. Le fichier reste à sa place sur votre PC : Registre garde seulement un lien.':esc(lkWhy()))+'</p>';
  const n=L.length?'<span class="sub num">'+L.length+'</span>':'';
  if(mode==="panel")return '<div class="panel lkb" '+at+'><div class="ph"><h2>Fichiers</h2>'+n+add+'</div>'+list+'</div>';
  if(mode==="card")return '<div class="rv-c lkb" '+at+'><div class="lkb-h"><h3>Fichiers</h3>'+n+'</div>'+list+'<div>'+add+'</div></div>';
  if(mode==="field")return '<fieldset class="lkb" '+at+'><legend>Fichiers</legend>'+list+'<div>'+add+'</div></fieldset>';
  return '<div class="f lkb" '+at+'><div class="lkb-h"><span class="lbl">Fichiers</span>'+n+'<span class="grow"></span>'+add+'</div>'+list+'</div>'}
/* Met à jour les blocs affichés, sans redessiner la fenêtre ouverte (les saisies en cours sont conservées) */
function lkRefresh(owner,id){document.querySelectorAll(".lkb[data-lkown]").forEach(b=>{if(owner&&(b.dataset.lkown!==owner||b.dataset.lkid!==id))return;b.outerHTML=lkBlock(b.dataset.lkown,b.dataset.lkid,b.dataset.lkmode)})}

/* ---------- Relier, ouvrir, retirer ---------- */
async function lkAdd(owner,id){if(!lkOK()){toast(lkWhy());return}
  let hs;try{hs=await window.showOpenFilePicker({multiple:true,id:"registre-fichiers",startIn:"documents"})}catch(e){if(e&&e.name!=="AbortError")toast("Sélection impossible : "+(e.message||e));return}
  const cur=await Promise.all(lkOf(owner,id).map(async l=>{try{return await appGet(lkKey(l.id))}catch(e){return null}}));
  let n=0,dup=0;
  for(const h of hs){let same=false;for(const c of cur){try{if(c&&await c.isSameEntry(h)){same=true;break}}catch(e){}}if(same){dup++;continue}
    let f;try{f=await h.getFile()}catch(e){continue}
    const l=lnorm({id:uid(),owner,ownerId:id,nom:f.name,type:f.type,taille:f.size,modifLe:f.lastModified?new Date(f.lastModified).toISOString():"",ajouteLe:now()});
    try{await appPut(lkKey(l.id),h)}catch(e){toast("Lien non enregistré : ce navigateur refuse de garder l'accès au fichier.");return}
    S.liens.push(l);if(LKH)LKH.add(l.id);cur.push(h);n++}
  if(n){bump();lsSave();lkRefresh();lkListRefresh()}
  toast(n?pl(n,"fichier relié","fichiers reliés")+" · rien n'est copié, le fichier reste à sa place"+(dup?" · "+pl(dup,"déjà relié","déjà reliés"):""):dup?"Ce fichier est déjà relié.":"Aucun fichier relié.")}
async function lkFix(lid){const l=S.liens.find(x=>x.id===lid);if(!l)return;if(!lkOK()){toast(lkWhy());return}
  let hs;try{hs=await window.showOpenFilePicker({multiple:false,id:"registre-fichiers",startIn:"documents"})}catch(e){if(e&&e.name!=="AbortError")toast("Sélection impossible : "+(e.message||e));return}
  const h=hs[0];let f;try{f=await h.getFile()}catch(e){toast("Fichier illisible.");return}
  try{await appPut(lkKey(l.id),h)}catch(e){toast("Lien non enregistré.");return}
  Object.assign(l,{nom:f.name,type:f.type,taille:f.size,modifLe:f.lastModified?new Date(f.lastModified).toISOString():l.modifLe});
  LKBAD.delete(l.id);if(LKH)LKH.add(l.id);bump();lsSave();lkRefresh();lkListRefresh();toast("Lien refait : « "+f.name+" »")}
async function lkDel(lid){const l=S.liens.find(x=>x.id===lid);if(!l)return;
  S.liens=S.liens.filter(x=>x.id!==lid);LKBAD.delete(lid);if(LKH)LKH.delete(lid);appDel(lkKey(lid)).catch(()=>{});bump();lsSave();lkRefresh();lkListRefresh();
  toast("Lien retiré : « "+l.nom+" » reste sur votre PC")}
async function lkOpen(lid){const l=S.liens.find(x=>x.id===lid);if(!l)return;
  if(!lkOK()){toast(lkWhy());return}
  if(lkMissing(l)){await lkFix(lid);return}
  let h=null;try{h=await appGet(lkKey(lid))}catch(e){}
  if(!h){LKBAD.add(lid);lkRefresh();toast("Lien introuvable dans ce navigateur : cliquez sur « Relier » pour le choisir de nouveau.");return}
  try{let p=await h.queryPermission({mode:"read"});if(p!=="granted")p=await h.requestPermission({mode:"read"});if(p!=="granted"){toast("Accès au fichier refusé : autorisez l'accès pour l'ouvrir.");return}}
  catch(e){toast("Accès au fichier impossible : "+(e.message||e));return}
  let f;try{f=await h.getFile()}catch(e){LKBAD.add(lid);lkRefresh();toast("« "+l.nom+" » est introuvable : déplacé, renommé ou supprimé. Cliquez sur « Relier » pour le choisir de nouveau.");return}
  if(f.size!==l.taille||f.name!==l.nom){l.nom=f.name;l.taille=f.size;l.type=f.type;bump();lsSave();lkRefresh()}
  const mime=LKMIME[lkExt(f.name)];
  if(mime){lkShow(f,URL.createObjectURL(new Blob([f],{type:mime})));return}
  /* Word, Excel, PowerPoint… : le navigateur ne peut pas lancer l'application sur l'original ; il en ouvre une copie */
  const url=URL.createObjectURL(f),a=document.createElement("a");a.href=url;a.download=f.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  toast("Copie de « "+f.name+" » téléchargée : ouvrez-la depuis les téléchargements du navigateur · l'original reste à sa place")}
/* Élément supprimé : ses liens partent avec lui (les fichiers restent sur le PC) */
function lkDropOwner(owner,id){const L=lkOf(owner,id);if(!L.length)return;const o=new Set(L.map(l=>l.id));S.liens=S.liens.filter(l=>!o.has(l.id));o.forEach(x=>{LKBAD.delete(x);if(LKH)LKH.delete(x);appDel(lkKey(x)).catch(()=>{})});bump()}
/* Aperçu (PDF, images, texte) par-dessus Registre : la fenêtre en cours de saisie reste intacte */
function lkShow(f,url){lkClose();let v=$("#lkView");if(!v){document.body.insertAdjacentHTML("beforeend",'<div id="lkView" class="lkv" role="dialog" aria-modal="true" aria-label="Aperçu du fichier" hidden></div>');v=$("#lkView")}
  const k=lkKind(f.name);LKURL=url;
  v.innerHTML='<div class="lkv-p"><div class="lkv-h"><span class="lki-t t-'+k+'">'+LKLBL[k]+'</span><b class="grow">'+esc(f.name)+'</b><span class="sub num">'+esc(lkSize(f.size))+'</span>'+
    '<a class="btn ghost" href="'+url+'" target="_blank" rel="noopener">Ouvrir dans un onglet</a><button class="btn" type="button" data-lkvclose="1">Fermer</button></div>'+
    '<div class="lkv-b">'+(k==="image"?'<img src="'+url+'" alt="'+esc(f.name)+'">':'<iframe src="'+url+'" title="'+esc(f.name)+'"></iframe>')+'</div></div>';
  v.hidden=false;const c=v.querySelector("[data-lkvclose]");if(c)c.focus({preventScroll:true})}
function lkClose(){const v=$("#lkView");if(v){v.hidden=true;v.innerHTML=""}if(LKURL){const u=LKURL;LKURL=null;setTimeout(()=>URL.revokeObjectURL(u),30000)}}
/* Les cartes et listes affichent un trombone : on les redessine après un ajout ou un retrait */
function lkListRefresh(){if(MODAL||!$("#drawer").hidden)return;if(["cr","compte","tdb"].includes(S.tab))render()}

/* ---------- Démarrage : liens disponibles dans ce navigateur, nettoyage des liens orphelins ---------- */
async function lkKeys(){const db=await idb();return await new Promise((res,rej)=>{const q=db.transaction("app").objectStore("app").getAllKeys(IDBKeyRange.bound("lien:","lien:￿"));q.onsuccess=()=>res(q.result||[]);q.onerror=()=>rej(q.error)})}
const lkOwnerExists=l=>l.owner==="reunion"?S.reunions.some(x=>x.id===l.ownerId):l.owner==="action"?S.actions.some(x=>x.id===l.ownerId):l.owner==="compte"?!!kOf(l.ownerId):l.owner==="cible"?S.cibles.some(x=>x.id===l.ownerId):false;
async function lkInit(){let keys=[];try{keys=await lkKeys()}catch(e){LKH=new Set();return}
  /* Une réunion, une action ou une cible jamais enregistrée (ou supprimée) laisse des liens sans propriétaire : on les retire */
  const orphan=S.liens.filter(l=>!lkOwnerExists(l));
  if(orphan.length){const o=new Set(orphan.map(l=>l.id));S.liens=S.liens.filter(l=>!o.has(l.id));bump();lsSave()}
  const known=new Set(S.liens.map(l=>l.id));LKH=new Set();
  keys.forEach(k=>{const id=String(k).slice(5);if(known.has(id))LKH.add(id);else appDel(k).catch(()=>{})});
  lkRefresh()}

/* ---------- Événements ---------- */
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-lkadd],[data-lkopen],[data-lkdel],[data-lkfix],[data-lkvclose],#lkView");if(!t)return;
  if(t.id==="lkView"){if(e.target===t)lkClose();return}
  const d=t.dataset;
  if(d.lkvclose!=null){lkClose();return}
  if(d.lkadd!=null){lkAdd(d.lkadd,d.lkfor);return}
  if(d.lkopen!=null){lkOpen(d.lkopen);return}
  if(d.lkfix!=null){lkFix(d.lkfix);return}
  if(d.lkdel!=null){lkDel(d.lkdel);return}});
/* Échap ferme l'aperçu avant la fenêtre qui est dessous */
document.addEventListener("keydown",e=>{if(e.key==="Escape"){const v=$("#lkView");if(v&&!v.hidden){e.preventDefault();e.stopImmediatePropagation();lkClose()}}},true);
