/* Registre · CSC — Réunions : synergie (Café Commerce, inter-BU), équipe, direction, formation, autre.
   Un compte rendu sans compte obligatoire ; les affaires évoquées citent un client facultatif, relié à sa fiche s'il existe.
   Les réunions sont rangées avec les comptes rendus (filtre « Réunions »), dans la recherche globale (Ctrl+K),
   le bloc « Derniers comptes rendus » du tableau de bord et la fiche des comptes évoqués.
   Chargé avant 18-demarrage.js (toujours en dernier) : partage les déclarations des fichiers précédents. */
"use strict";

const RTL=Object.fromEntries(RTYPES);
const I_RS=SV+'<circle cx="5.5" cy="5.6" r="2.2"/><circle cx="11.2" cy="6.4" r="1.8"/><path d="M1.8 13.3c.4-2.4 1.9-3.8 3.7-3.8s3.3 1.4 3.7 3.8M9.9 9.8c.4-.2.8-.3 1.3-.3 1.6 0 2.7 1.2 3 3.3"/></svg>';
const RPH={cafe:"Affaires de la semaine, besoins des autres filiales, visites à mutualiser, retours clients…",
  interbu:"Présentations croisées des BU, bonnes pratiques, visites clients à mutualiser, prochains rendez-vous communs…",
  equipe:"Activité de la semaine, devis en cours, planning des techniciens, points d'organisation…",
  direction:"Résultats, objectifs, décisions de la direction, informations à redescendre aux équipes…",
  formation:"Thème, points clés à retenir, outils présentés, mise en pratique…",
  interne:"Sujets abordés, informations à retenir…"};
/* Les réunions de synergie servent à remonter des affaires : une ligne vide est proposée d'emblée */
const RSYN=new Set(["cafe","interbu"]);
let RS=null,rsNew=false,rsDel=false,RSV=null;

/* ---------- Outils ---------- */
const rsK=a=>kOf(a.compteId)||(a.compte?findCompte(a.compte):null);
const rsTitle=r=>String(r.titre||"").trim()||(RTL[r.type]||"Réunion")+(r.agence?" – "+r.agence:"");
const rsDate=r=>r.date?dObj(r.date).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"}):"";
const rsFilled=a=>[a.compte,a.apporteur,a.besoin,a.suite].some(x=>String(x||"").trim());
const rsAffTxt=a=>[a.apporteur?"remontée par "+a.apporteur:"",a.besoin,a.suite?"suite : "+a.suite:""].filter(Boolean).join(" · ");
const rsBody=r=>[r.points,r.affaires.map(a=>[a.compte,a.apporteur,a.besoin,a.suite].filter(Boolean).join(" · ")).join("\n"),r.decisions].filter(x=>String(x||"").trim()).join("\n");
const rsHay=r=>nh([rsTitle(r),RTL[r.type],r.agence,r.participants,rsBody(r),r.affaires.map(a=>{const k=rsK(a);return k?k.nom+" "+grpName(k):""}).join(" ")].join(" "));
/* Réunions où un compte a été évoqué (par sa fiche, ou par son nom exact si l'affaire n'était pas reliée) */
function rsOfCompte(k){if(!k)return [];const n=nh(k.nom);
  return S.reunions.filter(r=>r.affaires.some(a=>a.compteId===k.id||(a.compte&&nh(a.compte)===n))).sort(aSortDesc)}
const rsAgences=()=>[...new Set([...S.reunions.map(r=>r.agence),...S.comptes.map(k=>k.agence)].map(x=>String(x||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"fr"));
const rsLastType=()=>{const r=S.reunions.slice().sort(aSortDesc)[0];return r?r.type:"cafe"};

/* ---------- Saisie ---------- */
function rsOpen(o){o=o||{};const src=o.id?S.reunions.find(r=>r.id===o.id):null;rsNew=!src;rsDel=false;
  RS=src?rsnorm(clone(src)):Object.assign(rsblank(),{id:uid(),creeLe:now(),type:o.type||rsLastType(),date:todayISO()});
  if(!RS.affaires.length&&RSYN.has(RS.type))RS.affaires=[rsAff()];
  rsDraw();setTimeout(()=>{const f=$(rsNew?"#rs-ag":"#rs-pts");if(f)f.focus({preventScroll:true})},40)}
function rsAffHTML(){const A=RS.affaires;
  return '<div class="rs-affh"><h3>Affaires et clients évoqués</h3><span class="sub">Facultatif. Un client qui existe dans Registre fait apparaître la réunion sur sa fiche.</span><span class="grow"></span><button type="button" class="btn" data-rsact="affadd">'+I_PLUS+'Ajouter une affaire</button></div>'+
    (A.length?'<div class="rs-aff"><div class="rs-al rs-alh" aria-hidden="true"><span>Client</span><span>Remontée par</span><span>Besoin</span><span>Suite à donner</span><span></span></div>'+
      A.map((a,i)=>{const k=a.compte?findCompte(a.compte):null;
        return '<div class="rs-al" data-raf="'+i+'">'+
        '<input type="text" data-f="compte" list="rsKL" value="'+esc(a.compte)+'" placeholder="Client (facultatif)" aria-label="Client de l\'affaire '+(i+1)+'"'+(k?' class="known" title="Compte existant : la réunion apparaîtra sur sa fiche"':'')+'>'+
        '<input type="text" data-f="apporteur" value="'+esc(a.apporteur)+'" placeholder="BU, filiale ou personne" aria-label="Remontée par">'+
        '<input type="text" data-f="besoin" value="'+esc(a.besoin)+'" placeholder="Diagnostics, contexte, échéance…" aria-label="Besoin">'+
        '<input type="text" data-f="suite" value="'+esc(a.suite)+'" placeholder="Qui rappelle, visite, devis…" aria-label="Suite à donner">'+
        '<button type="button" class="btn ghost rs-adel" data-rsact="affdel" data-i="'+i+'" title="Retirer cette affaire" aria-label="Retirer l\'affaire '+(i+1)+'">'+I_X+'</button></div>'}).join("")+'</div>'
      :'<p class="hint">Aucune affaire notée pour cette réunion.</p>')}
function rsDraw(){const r=RS,ph=rsTitle(Object.assign({},r,{titre:""}));
  showModal(mHead(rsNew?"Nouvelle réunion":"Réunion",esc(rsTitle(r)))+
  '<div class="db"><form id="rsForm" class="am-grid rs-grid" onsubmit="return false"><div class="am-col">'+
    '<div class="tpick" role="group" aria-label="Type de réunion">'+RTYPES.map(([t,l])=>'<button type="button" data-rstype="'+t+'" aria-pressed="'+(r.type===t)+'">'+esc(l)+'</button>').join("")+'</div>'+
    '<div class="row4"><div class="f"><label class="lbl" for="rs-date">Date</label><input type="date" id="rs-date" value="'+esc(r.date)+'"></div><div class="f"><label class="lbl" for="rs-heure">Heure</label><input type="time" id="rs-heure" value="'+esc(r.heure)+'"></div>'+
     '<div class="f" style="grid-column:span 2"><label class="lbl" for="rs-ag">Agence ou lieu</label><input type="text" id="rs-ag" list="rsAgL" value="'+esc(r.agence)+'" placeholder="Ex. : agence de Melun, visio…" autocomplete="off"></div></div>'+
    '<div class="f"><label class="lbl" for="rs-tit">Titre <span class="sub">(facultatif)</span></label><input type="text" id="rs-tit" value="'+esc(r.titre)+'" placeholder="'+esc(ph)+'"></div>'+
    ta("rs-part","Participants",r.participants,3,"Personnes, BU ou filiales présentes…")+
    ta("rs-dec","Décisions et prochaines étapes",r.decisions,5,"Qui fait quoi, pour quand…")+
  '</div><div class="am-col">'+ta("rs-pts","Points abordés",r.points,13,RPH[r.type])+'</div>'+
  '<div class="rs-affw" id="rsAffW">'+rsAffHTML()+'</div><div class="rs-lkw">'+lkBlock("reunion",r.id,"plain")+'</div></form></div>'+
  '<div class="df">'+(rsNew?'':'<button class="btn danger" type="button" data-rsact="del">Supprimer</button>')+'<span class="grow"></span><button class="btn" type="button" data-act="mclose">Annuler</button><button class="btn primary" type="button" data-rsact="save">Enregistrer</button></div>'+
  '<datalist id="rsAgL">'+rsAgences().map(a=>'<option value="'+esc(a)+'">').join("")+'</datalist>'+
  '<datalist id="rsKL">'+S.comptes.map(k=>'<option value="'+esc(k.nom)+'">').join("")+'</datalist>',"rs");
  modalBig()}
function rsRead(){if(!RS||!$("#rsForm"))return;
  RS.date=vOf("rs-date");RS.heure=vOf("rs-heure");RS.agence=vOf("rs-ag");RS.titre=vOf("rs-tit");
  RS.participants=vOf("rs-part");RS.points=vOf("rs-pts");RS.decisions=vOf("rs-dec");
  RS.affaires=[...document.querySelectorAll("#rsAffW .rs-al[data-raf]")].map(row=>{const g=f=>{const i=row.querySelector('[data-f="'+f+'"]');return i?String(i.value).trim():""};
    return rsAff({compte:g("compte"),apporteur:g("apporteur"),besoin:g("besoin"),suite:g("suite")})})}
function rsAffRedraw(focusLast){const w=$("#rsAffW");if(!w)return;w.innerHTML=rsAffHTML();
  if(focusLast){const l=w.querySelectorAll('.rs-al[data-raf] [data-f="compte"]');if(l.length)l[l.length-1].focus({preventScroll:false})}}
async function rsSave(){rsRead();const r=RS;if(!r)return;
  r.affaires=r.affaires.filter(rsFilled);
  r.affaires.forEach(a=>{const k=a.compte?findCompte(a.compte):null;a.compteId=k?k.id:"";if(k)a.compte=k.nom});
  if(!r.points&&!r.decisions&&!r.affaires.length){toast("Le compte rendu est vide : notez les points abordés ou une affaire.");const f=$("#rs-pts");if(f)f.focus({preventScroll:true});if(!RS.affaires.length){RS.affaires=[rsAff()];rsAffRedraw()}return}
  if(!r.date)r.date=todayISO();
  const o=put("reunions",rsnorm(r)),nk=new Set(o.affaires.map(a=>a.compteId).filter(Boolean)).size,wasNew=rsNew;
  closeModal();commit();
  toast((wasNew?"Compte rendu de réunion enregistré":"Réunion enregistrée")+(nk?" · visible sur la fiche de "+pl(nk,"compte"):""))}
function rsDelete(btn){if(!RS)return;if(!rsDel){rsDel=true;btn.classList.add("armed");btn.textContent="Confirmer la suppression";return}
  const n=lkN("reunion",RS.id);lkDropOwner("reunion",RS.id);drop("reunions",RS.id);closeModal();commit();toast("Réunion supprimée"+(n?" · "+pl(n,"lien retiré","liens retirés")+", les fichiers restent sur votre PC":""))}

/* ---------- Lecture ---------- */
function rsView(id){const r=S.reunions.find(x=>x.id===id);if(!r)return;RSV=r;
  const sec=(ti,v,big)=>String(v||"").trim()?'<section class="rv-s'+(big?' big':'')+'"><h3>'+ti+'</h3><div class="rv-t">'+esc(v)+'</div></section>':'';
  const kv=(l,v)=>v?'<div class="rv-kv"><span>'+l+'</span><b>'+v+'</b></div>':'';
  const A=r.affaires,ks=[...new Set(A.map(rsK).filter(Boolean))];
  const aff=A.length?'<section class="rv-s"><h3>Affaires et clients évoqués <span class="sub num">'+A.length+'</span></h3><div class="rs-vl">'+A.map(a=>{const k=rsK(a);
      return '<div class="rs-v"><div class="rs-vk">'+(k?'<button type="button" class="lk strong" data-kopen="'+esc(k.id)+'">'+esc(k.nom)+'</button>':'<b>'+esc(a.compte||"Client non précisé")+'</b>')+(a.apporteur?'<span class="sub">remontée par '+esc(a.apporteur)+'</span>':'')+'</div>'+
        (a.besoin?'<div class="rs-vb">'+esc(a.besoin)+'</div>':'')+(a.suite?'<div class="rs-vs"><span class="lbl">Suite</span>'+esc(a.suite)+'</div>':'')+'</div>'}).join("")+'</div></section>':'';
  const dl=rsDate(r);
  showModal('<div class="dh rv-h"><div class="grow"><span class="lbl">Réunion · '+esc(RTL[r.type])+'</span><h2 id="mTitle">'+esc(rsTitle(r))+'</h2>'+
    '<p class="rv-meta"><span>'+esc(dl?blCap(dl):"Sans date")+(r.heure?' à '+esc(r.heure.replace(":","h")):'')+'</span>'+(r.agence?'<span>'+esc(r.agence)+'</span>':'')+'</p></div><button class="btn ghost" type="button" data-act="mclose">Fermer</button></div>'+
   '<div class="db"><div class="rv-grid"><div class="rv-main">'+sec("Points abordés",r.points,true)+aff+sec("Décisions et prochaines étapes",r.decisions)+(rsBody(r)?'':'<p class="hint">Aucun contenu.</p>')+'</div>'+
    '<aside class="rv-side">'+(r.participants?'<div class="rv-c"><h3>Participants</h3><div class="rv-t rs-pt">'+esc(r.participants)+'</div></div>':'')+
     '<div class="rv-c"><h3>Réunion</h3>'+kv("Type",esc(RTL[r.type]))+kv("Agence ou lieu",esc(r.agence))+kv("Affaires",A.length?String(A.length):"")+kv("Clients reliés",ks.length?ks.map(k=>'<button type="button" class="lk" data-kopen="'+esc(k.id)+'">'+esc(k.nom)+'</button>').join(", "):"")+'</div>'+lkBlock("reunion",r.id,"card")+'</aside></div></div>'+
   '<div class="df"><button class="btn ghost" type="button" data-rsact="copy">Copier</button><button class="btn ghost" type="button" data-rsact="mail">Envoyer par mail</button><button class="btn ghost" type="button" data-rsact="print">Imprimer / PDF</button><span class="grow"></span><button class="btn" type="button" data-act="mclose">Fermer</button><button class="btn primary" type="button" data-rsact="edit">Modifier</button></div>',"rsv");
  modalBig()}

/* ---------- Copier, mail, impression ---------- */
function rsText(r){const L=[rsTitle(r),[blCap(rsDate(r)),r.heure?r.heure.replace(":","h"):"",RTL[r.type],r.agence].filter(Boolean).join(" · ")];
  if(r.participants)L.push("","Participants : "+r.participants);
  if(r.points)L.push("","POINTS ABORDÉS",r.points);
  if(r.affaires.length){L.push("","AFFAIRES ET CLIENTS ÉVOQUÉS");r.affaires.forEach(a=>{const k=rsK(a);L.push("• "+((k&&k.nom)||a.compte||"Client non précisé")+(rsAffTxt(a)?" – "+rsAffTxt(a):""))})}
  if(r.decisions)L.push("","DÉCISIONS ET PROCHAINES ÉTAPES",r.decisions);
  return L.join("\n")}
async function rsCopy(r){const t=rsText(r);
  try{await navigator.clipboard.writeText(t);toast("Compte rendu copié")}
  catch(e){const x=document.createElement("textarea");x.value=t;document.body.appendChild(x);x.select();let ok=false;try{ok=document.execCommand("copy")}catch(_){}x.remove();toast(ok?"Compte rendu copié":"Copie impossible dans ce navigateur")}}
function rsMail(r){const body=rsText(r),url="mailto:?subject="+encodeURIComponent(rsTitle(r)+(r.date?" – "+fdate(r.date):""))+"&body="+encodeURIComponent(body.length>1800?body.slice(0,1800)+"\n[…]":body);
  const l=document.createElement("a");l.href=url;l.target="_blank";l.rel="noopener";document.body.appendChild(l);l.click();l.remove()}
/* Bloc d'impression (partagé avec l'impression de la page Comptes rendus) */
function rsPrintBlock(r,R,sec){
  return '<div class="cr"><h2>'+R(rsTitle(r))+'</h2><p class="m">'+R([blCap(rsDate(r)),r.heure?r.heure.replace(":","h"):"","Réunion · "+RTL[r.type],r.agence].filter(Boolean).join(" · "))+'</p>'+
    (r.participants?'<p class="m">Participants : '+R(r.participants)+'</p>':'')+sec("Points abordés",r.points)+
    (r.affaires.length?'<h3>Affaires et clients évoqués</h3><ul class="aff">'+r.affaires.map(a=>{const k=rsK(a);return '<li><b>'+R((k&&k.nom)||a.compte||"Client non précisé")+'</b>'+(rsAffTxt(a)?' – '+R(rsAffTxt(a)):'')+'</li>'}).join("")+'</ul>':'')+
    sec("Décisions et prochaines étapes",r.decisions)+'</div>'}

/* ---------- Listes ---------- */
function rsCard(r,q){const A=r.affaires,ks=[...new Set(A.map(rsK).filter(Boolean))];
  return '<div class="crc rs-c" data-rid="'+esc(r.id)+'" tabindex="0" role="button" aria-label="Lire le compte rendu de réunion : '+esc(rsTitle(r))+'">'+
    '<div class="crc-h"><span class="eic eic-rs">'+I_RS+'</span><span class="num crc-d">'+(r.date?fdate(r.date):"Sans date")+'</span>'+(r.agence?'<span class="ty">'+esc(r.agence)+'</span>':'')+
     '<span class="grow"></span>'+lkClip("reunion",r.id)+'<span class="pill tone-rs">'+esc(RTL[r.type])+'</span></div>'+
    '<div class="crc-o">'+esc(rsTitle(r))+'</div>'+
    (rsBody(r)?'<div class="crc-x">'+crExtract(r,q)+'</div>':'')+
    ((A.length||ks.length)?'<div class="sub rs-cs">'+(A.length?'<span>'+pl(A.length,"affaire évoquée","affaires évoquées")+'</span>':'')+ks.slice(0,4).map(k=>'<button type="button" class="lk" data-kopen="'+esc(k.id)+'">'+esc(k.nom)+'</button>').join("")+(ks.length>4?'<span>+'+(ks.length-4)+'</span>':'')+'</div>':'')+
    (r.participants?'<div class="sub">'+esc(r.participants.replace(/\s*\n\s*/g," · "))+'</div>':'')+'</div>'}
/* Fiche compte : réunions où le compte a été évoqué */
function rsAccPanel(k){const L=rsOfCompte(k);if(!L.length)return "";const n=nh(k.nom);
  return '<div class="panel"><div class="ph"><h2>Évoqué en réunion</h2><span class="sub num">'+L.length+'</span></div><div class="crw">'+
    L.slice(0,6).map(r=>{const a=r.affaires.find(x=>x.compteId===k.id||(x.compte&&nh(x.compte)===n))||{};
      return '<div class="crw-i" data-rid="'+esc(r.id)+'" tabindex="0" role="button"><span class="num sub">'+(r.date?fdate(r.date):"—")+'</span><span class="grow"><b>'+esc(rsTitle(r))+'</b><span class="sub">'+esc(rsAffTxt(a)||RTL[r.type])+'</span></span></div>'}).join("")+
    '</div>'+(L.length>6?'<button type="button" class="more" style="align-self:flex-start" data-rsall="'+esc(k.nom)+'">Voir les '+L.length+' réunions</button>':'')+'</div>'}
/* Recherche globale (Ctrl+K) */
function rsFind(q){const w=nh(q).split(" ").filter(Boolean);if(!w.length)return [];
  return S.reunions.filter(r=>{const h=rsHay(r);return w.every(t=>h.includes(t))}).sort(aSortDesc).slice(0,8)}

/* ---------- Événements ---------- */
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-rsact],[data-rstype],[data-rid],[data-rsnew],[data-rsall]");if(!t)return;
  /* Lien vers un compte à l'intérieur d'une carte : laisser la fiche s'ouvrir */
  const inner=e.target.closest("button,a");if(t.dataset.rid!=null&&inner&&inner!==t&&t.contains(inner))return;
  const d=t.dataset;
  if(d.rsnew!=null){if(MODAL)closeModal();rsOpen({type:d.rsnew&&RTL[d.rsnew]?d.rsnew:""});return}
  if(d.rid!=null){if(MODAL&&MODAL!=="rsv")closeModal();rsView(d.rid);return}
  if(d.rsall!=null){CRU.q=d.rsall;CRU.f="rs";CRU.p="";CRU.lim=60;showTab("cr");return}
  if(d.rstype!=null&&RS&&MODAL==="rs"){RS.type=d.rstype;document.querySelectorAll("#rsForm [data-rstype]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.rstype===RS.type)));
    const p=$("#rs-pts");if(p)p.placeholder=RPH[RS.type];
    /* Synergie : une ligne d'affaire prête à remplir ; autre réunion : on retire les lignes restées vides */
    rsRead();const n0=RS.affaires.length;if(RSYN.has(RS.type)){if(!n0)RS.affaires=[rsAff()]}else RS.affaires=RS.affaires.filter(rsFilled);if(RS.affaires.length!==n0)rsAffRedraw();
    const ti=$("#rs-tit");if(ti)ti.placeholder=rsTitle(Object.assign({},RS,{titre:"",agence:vOf("rs-ag")}));return}
  const a=d.rsact;
  if(MODAL==="rs"&&RS){
    if(a==="save"){rsSave();return}
    if(a==="del"){rsDelete(t);return}
    if(a==="affadd"){rsRead();RS.affaires.push(rsAff());rsAffRedraw(true);return}
    if(a==="affdel"){rsRead();RS.affaires.splice(+d.i,1);rsAffRedraw();return}}
  if(MODAL==="rsv"&&RSV){
    if(a==="edit"){const id=RSV.id;closeModal();rsOpen({id});return}
    if(a==="copy"){rsCopy(RSV);return}
    if(a==="mail"){rsMail(RSV);return}
    if(a==="print"){crPrintItems([RSV],rsTitle(RSV),"Compte rendu de réunion · "+RTL[RSV.type]);return}}});
document.addEventListener("input",e=>{const t=e.target;if(!t||MODAL!=="rs"||!RS)return;
  if(t.id==="rs-ag"){const ti=$("#rs-tit");if(ti)ti.placeholder=rsTitle(Object.assign({},RS,{titre:"",agence:t.value.trim()}));return}
  if(t.dataset&&t.dataset.f==="compte"){const k=t.value.trim()?findCompte(t.value.trim()):null;t.classList.toggle("known",!!k);t.title=k?"Compte existant : la réunion apparaîtra sur sa fiche":""}});
document.addEventListener("keydown",e=>{const t=e.target;if(e.key==="Enter"&&t&&t.matches&&t.matches(".crc[data-rid],.crw-i[data-rid]")){e.preventDefault();rsView(t.dataset.rid)}});
