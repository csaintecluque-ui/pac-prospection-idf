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
let RS=null,rsNew=false,rsDel=false,RSV=null,rsWas="";

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
  return S.reunions.filter(r=>r.statut!=="annule"&&r.affaires.some(a=>a.compteId===k.id||(a.compte&&nh(a.compte)===n))).sort(aSortDesc)}
const rsAgences=()=>[...new Set([...S.reunions.map(r=>r.agence),...S.comptes.map(k=>k.agence)].map(x=>String(x||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"fr"));
const rsLastType=()=>{const r=S.reunions.slice().sort(aSortDesc)[0];return r?r.type:"cafe"};
const RSST=[["afaire","Planifiée"],["fait","Tenue"],["annule","Annulée"]];
const rsStLbl=r=>r.statut==="afaire"?"Planifiée":r.statut==="annule"?"Annulée":"Tenue";
const rsStTone=r=>r.statut==="afaire"?((r.date&&r.date<todayISO())?"bad":"warn"):r.statut==="fait"?"ok":"grey";
/* Points d'agenda (actions) proposés pour relier la réunion : autour de sa date, plus celui déjà relié */
const rsActLbl=a=>{const k=kOf(a.compteId);return [a.date?fday(a.date):"Sans date",a.heure?a.heure.replace(":","h"):"",ESHORT[a.type]||ALBL[a.type]||a.type,a.objet||"",k?k.nom:""].filter(Boolean).join(" · ")};
function rsActOpts(r){const d=r.date||todayISO(),lo=addD(d,-21),hi=addD(d,21);
  const L=S.actions.filter(a=>a.origine!=="mailing"&&a.type!=="note"&&a.type!=="mail"&&(a.id===r.actionId||(a.date&&a.date>=lo&&a.date<=hi&&a.statut!=="annule")));
  L.sort((a,b)=>Math.abs(dObj(a.date||d)-dObj(d))-Math.abs(dObj(b.date||d)-dObj(d))||aSort(a,b));return L.slice(0,60)}
const rsOfAction=aid=>aid?S.reunions.filter(r=>r.actionId===aid).sort(aSortDesc):[];

/* ---------- Saisie ---------- */
/* o : {id} modifier · {id,cr} rédiger le compte rendu d'une réunion planifiée · {statut:"afaire",date,heure} planifier · {fromAction} compte rendu d'un point d'agenda */
function rsOpen(o){o=o||{};const src=o.id?S.reunions.find(r=>r.id===o.id):null;rsNew=!src;rsDel=false;rsWas=src?src.statut:"";
  const t=todayISO(),d=o.date||t;
  RS=src?rsnorm(clone(src)):Object.assign(rsblank(),{id:uid(),creeLe:now(),type:o.type||rsLastType(),date:d,heure:o.heure||"",statut:o.statut||(d>t?"afaire":"fait")});
  if(src&&o.cr){RS.statut="fait";if(RS.date>t)RS.date=t}
  const fa=o.fromAction?S.actions.find(a=>a.id===o.fromAction):null;
  if(fa&&!src){Object.assign(RS,{actionId:fa.id,date:fa.date||t,heure:fa.heure||"",titre:fa.objet||"",agence:fa.lieu||"",statut:"fait"});if(RS.date>t)RS.date=t}
  if(!RS.affaires.length&&RSYN.has(RS.type)&&RS.statut!=="annule")RS.affaires=[rsAff()];
  rsDraw();setTimeout(()=>{const f=$(rsNew&&!fa?"#rs-ag":"#rs-pts");if(f)f.focus({preventScroll:true})},40)}
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
function rsDraw(){const r=RS,ph=rsTitle(Object.assign({},r,{titre:""})),plan=r.statut==="afaire",AO=rsActOpts(r);
  showModal(mHead(rsNew?(plan?"Planifier une réunion":"Nouvelle réunion"):(plan?"Réunion planifiée":"Réunion"),esc(rsTitle(r)))+
  '<div class="db"><form id="rsForm" class="am-grid rs-grid" onsubmit="return false"><div class="am-col">'+
    '<div class="tpick" role="group" aria-label="Type de réunion">'+RTYPES.map(([t,l])=>'<button type="button" data-rstype="'+t+'" aria-pressed="'+(r.type===t)+'">'+esc(l)+'</button>').join("")+'</div>'+
    '<div class="row4"><div class="f"><label class="lbl" for="rs-date">Date</label><input type="date" id="rs-date" value="'+esc(r.date)+'"></div><div class="f"><label class="lbl" for="rs-heure">Heure</label><input type="time" id="rs-heure" value="'+esc(r.heure)+'"></div>'+
     '<div class="f" style="grid-column:span 2"><label class="lbl" for="rs-ag">Agence ou lieu</label><input type="text" id="rs-ag" list="rsAgL" value="'+esc(r.agence)+'" placeholder="Ex. : agence de Melun, visio…" autocomplete="off"></div></div>'+
    '<div class="f"><span class="lbl">Statut</span><div class="seg" role="group" aria-label="Statut de la réunion">'+RSST.map(([s,l])=>'<button type="button" data-rsst="'+s+'" aria-pressed="'+(r.statut===s)+'">'+l+'</button>').join("")+'</div><p class="hint" id="rsStH">'+rsStHint(r.statut)+'</p></div>'+
    '<div class="f"><label class="lbl" for="rs-act">Point d\'agenda relié <span class="sub">(facultatif)</span></label><select id="rs-act"><option value="">Aucun</option>'+AO.map(a=>'<option value="'+esc(a.id)+'"'+(a.id===r.actionId?' selected':'')+'>'+esc(rsActLbl(a))+'</option>').join("")+'</select><p class="hint">Un RDV, un événement ou un rappel de votre agenda, à trois semaines près de la date.</p></div>'+
    '<div class="f"><label class="lbl" for="rs-tit">Titre <span class="sub">(facultatif)</span></label><input type="text" id="rs-tit" value="'+esc(r.titre)+'" placeholder="'+esc(ph)+'"></div>'+
    ta("rs-part","Participants",r.participants,3,"Personnes, BU ou filiales présentes…")+
    ta("rs-dec","Décisions et prochaines étapes",r.decisions,5,"Qui fait quoi, pour quand…")+
  '</div><div class="am-col">'+ta("rs-pts",plan?"Ordre du jour":"Points abordés",r.points,13,plan?"Sujets à aborder, documents à préparer…":RPH[r.type])+'</div>'+
  '<div class="rs-affw" id="rsAffW">'+rsAffHTML()+'</div><div class="rs-lkw">'+lkBlock("reunion",r.id,"plain")+'</div></form></div>'+
  '<div class="df">'+(rsNew?'':'<button class="btn danger" type="button" data-rsact="del">Supprimer</button>')+'<span class="grow"></span><button class="btn" type="button" data-act="mclose">Annuler</button><button class="btn primary" type="button" data-rsact="save">Enregistrer</button></div>'+
  '<datalist id="rsAgL">'+rsAgences().map(a=>'<option value="'+esc(a)+'">').join("")+'</datalist>'+
  '<datalist id="rsKL">'+S.comptes.map(k=>'<option value="'+esc(k.nom)+'">').join("")+'</datalist>',"rs");
  modalBig()}
const rsStHint=s=>s==="afaire"?"La réunion apparaît dans l'agenda. Une fois tenue, rédigez son compte rendu.":s==="annule"?"La réunion reste dans l'historique, sans compte rendu.":"Le compte rendu apparaît dans la page Comptes rendus.";
function rsRead(){if(!RS||!$("#rsForm"))return;
  RS.date=vOf("rs-date");RS.heure=vOf("rs-heure");RS.agence=vOf("rs-ag");RS.titre=vOf("rs-tit");
  RS.participants=vOf("rs-part");RS.points=vOf("rs-pts");RS.decisions=vOf("rs-dec");const ac=$("#rs-act");if(ac)RS.actionId=ac.value;
  RS.affaires=[...document.querySelectorAll("#rsAffW .rs-al[data-raf]")].map(row=>{const g=f=>{const i=row.querySelector('[data-f="'+f+'"]');return i?String(i.value).trim():""};
    return rsAff({compte:g("compte"),apporteur:g("apporteur"),besoin:g("besoin"),suite:g("suite")})})}
function rsAffRedraw(focusLast){const w=$("#rsAffW");if(!w)return;w.innerHTML=rsAffHTML();
  if(focusLast){const l=w.querySelectorAll('.rs-al[data-raf] [data-f="compte"]');if(l.length)l[l.length-1].focus({preventScroll:false})}}
async function rsSave(){rsRead();const r=RS;if(!r)return;
  r.affaires=r.affaires.filter(rsFilled);
  r.affaires.forEach(a=>{const k=a.compte?findCompte(a.compte):null;a.compteId=k?k.id:"";if(k)a.compte=k.nom});
  if(r.statut==="fait"&&!r.points&&!r.decisions&&!r.affaires.length){toast("Le compte rendu est vide : notez les points abordés ou une affaire, ou laissez la réunion planifiée.");const f=$("#rs-pts");if(f)f.focus({preventScroll:true});if(!RS.affaires.length){RS.affaires=[rsAff()];rsAffRedraw()}return}
  if(!r.date)r.date=todayISO();
  /* Compte rendu d'un point d'agenda : le point passe en fait */
  const la=r.statut==="fait"&&r.actionId?S.actions.find(a=>a.id===r.actionId):null,doneA=!!(la&&isOpen(la));
  if(doneA){la.statut="fait";la.faitLe=todayISO();if(!la.date||la.date>todayISO())la.date=r.date;la.majLe=now();restage(la.compteId)}
  const o=put("reunions",rsnorm(r)),nk=new Set(o.affaires.map(a=>a.compteId).filter(Boolean)).size,wasNew=rsNew;
  closeModal();commit();
  toast((o.statut==="afaire"?(wasNew?"Réunion planifiée dans l'agenda":"Réunion planifiée enregistrée"):o.statut==="annule"?"Réunion annulée":wasNew||rsWas!=="fait"?"Compte rendu de réunion enregistré":"Réunion enregistrée")+(nk?" · visible sur la fiche de "+pl(nk,"compte"):"")+(doneA?" · point d'agenda marqué fait":""))}
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
  const dl=rsDate(r),plan=r.statut==="afaire",la=r.actionId?S.actions.find(a=>a.id===r.actionId):null;
  showModal('<div class="dh rv-h"><div class="grow"><span class="lbl">'+(plan?'Réunion planifiée':'Réunion')+' · '+esc(RTL[r.type])+'</span><h2 id="mTitle">'+esc(rsTitle(r))+'</h2>'+
    '<p class="rv-meta"><span>'+esc(dl?blCap(dl):"Sans date")+(r.heure?' à '+esc(r.heure.replace(":","h")):'')+'</span>'+(r.agence?'<span>'+esc(r.agence)+'</span>':'')+'<span class="pill tone-'+rsStTone(r)+'">'+esc(rsStLbl(r))+'</span></p></div><button class="btn ghost" type="button" data-act="mclose">Fermer</button></div>'+
   '<div class="db"><div class="rv-grid"><div class="rv-main">'+(plan?'<div class="notice rs-plan"><span class="grow">Réunion planifiée'+(r.date&&r.date<todayISO()?', date passée':'')+' : une fois tenue, rédigez son compte rendu.</span><button class="btn primary" type="button" data-rsact="cr">Rédiger le compte rendu</button></div>':'')+
     sec(plan?"Ordre du jour":"Points abordés",r.points,true)+aff+sec("Décisions et prochaines étapes",r.decisions)+(rsBody(r)||plan?'':'<p class="hint">Aucun contenu.</p>')+'</div>'+
    '<aside class="rv-side">'+(r.participants?'<div class="rv-c"><h3>Participants</h3><div class="rv-t rs-pt">'+esc(r.participants)+'</div></div>':'')+
     '<div class="rv-c"><h3>Réunion</h3>'+kv("Type",esc(RTL[r.type]))+kv("Agence ou lieu",esc(r.agence))+kv("Affaires",A.length?String(A.length):"")+kv("Clients reliés",ks.length?ks.map(k=>'<button type="button" class="lk" data-kopen="'+esc(k.id)+'">'+esc(k.nom)+'</button>').join(", "):"")+'</div>'+
     (la?'<div class="rv-c"><h3>Point d\'agenda relié</h3><div class="todo">'+tItem(la,{full:true})+'</div></div>':'')+lkBlock("reunion",r.id,"card")+'</aside></div></div>'+
   '<div class="df"><button class="btn ghost" type="button" data-rsact="copy">Copier</button><button class="btn ghost" type="button" data-rsact="mail">Envoyer par mail</button><button class="btn ghost" type="button" data-rsact="print">Imprimer / PDF</button><span class="grow"></span><button class="btn" type="button" data-act="mclose">Fermer</button><button class="btn'+(plan?'':' primary')+'" type="button" data-rsact="edit">Modifier</button></div>',"rsv");
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
/* ---------- Agenda : réunions planifiées ou tenues, à côté des actions ---------- */
function rsTItem(r,o){o=o||{};const late=r.statut==="afaire"&&r.date&&r.date<todayISO(),done=r.statut==="fait";
  return '<div class="ti'+(r.statut!=="afaire"?' done':'')+'" data-rid="'+esc(r.id)+'"><button type="button" class="ck'+(done?' on':'')+'" data-rsdone="'+esc(r.id)+'" title="'+(done?"Lire le compte rendu":"Réunion tenue : rédiger le compte rendu")+'" aria-label="'+(done?"Lire le compte rendu":"Réunion tenue, rédiger le compte rendu")+' : '+esc(rsTitle(r))+'">'+(done?I_CHECK:'')+'</button>'+
   '<span class="eic eic-rs" title="Réunion">'+I_RS+'</span>'+
   '<div style="min-width:0"><div class="o">'+esc(rsTitle(r))+'</div><div class="m">'+esc([RTL[r.type],r.agence,r.statut==="annule"?"annulée":""].filter(Boolean).join(" · "))+'</div></div>'+
   '<div class="dt'+(late?' late':'')+'">'+esc(o.full?(r.date?fday(r.date)+(r.heure?" · "+r.heure.replace(":","h"):""):"Sans date"):whenLbl(r))+'</div></div>'}
function rsEvBtn(r,withK){const late=r.statut==="afaire"&&r.date<todayISO();
  return '<button type="button" class="ev k-reunion'+(r.statut==="fait"?' done':'')+(late?' late':'')+'" data-rid="'+esc(r.id)+'" title="'+esc("Réunion · "+rsTitle(r)+(r.agence?" · "+r.agence:"")+" · "+rsStLbl(r))+'">'+(r.heure?'<span class="t">'+esc(r.heure.replace(":","h"))+'</span>':'')+'<span class="o">'+esc(rsTitle(r))+'</span>'+(withK&&r.agence?'<span class="k">'+esc(r.agence)+'</span>':'')+'</button>'}
function rsAgRow(r){const t=todayISO(),late=r.statut==="afaire"&&r.date&&r.date<t,done=r.statut==="fait",la=r.actionId?S.actions.find(a=>a.id===r.actionId):null,lk=la?kOf(la.compteId):null;
  return '<tr data-rid="'+esc(r.id)+'"><td><button type="button" class="ck'+(done?' on':'')+'" data-rsdone="'+esc(r.id)+'" aria-label="'+(done?"Lire le compte rendu":"Réunion tenue : rédiger le compte rendu")+'">'+(done?I_CHECK:'')+'</button></td>'+
    '<td class="num'+(late?' late':'')+'" style="white-space:nowrap">'+(r.date?esc(fday(r.date))+(r.date.slice(0,4)!==t.slice(0,4)?' '+r.date.slice(0,4):''):'<span class="sub">—</span>')+(r.heure?'<div class="sub">'+esc(r.heure.replace(":","h"))+'</div>':'')+'</td>'+
    '<td><span class="eic eic-rs" style="vertical-align:middle">'+I_RS+'</span> <span class="sub">Réunion</span></td>'+
    '<td><b style="font-weight:500">'+esc(rsTitle(r))+'</b>'+(done&&rsBody(r)?' <span class="pill tone-rs" style="font-size:11px">Compte rendu</span>':'')+'<div class="sub">'+esc([RTL[r.type],r.agence].filter(Boolean).join(" · "))+'</div></td>'+
    '<td>'+(lk?'<button type="button" class="lk strong" data-kopen="'+esc(lk.id)+'">'+esc(lk.nom)+'</button>':'<span class="sub">Sans compte</span>')+'</td><td class="sub">'+esc(String(r.participants||"").split(/\n/)[0].slice(0,60))+'</td><td class="sub"></td>'+
    '<td><span class="pill tone-'+rsStTone(r)+'">'+esc(rsStLbl(r))+'</span></td></tr>'}
/* Point d'agenda (action) : compte rendu de réunion relié */
function rsActCard(a){const L=rsOfAction(a.id);if(!L.length)return "";
  return '<div class="rv-c"><h3>Compte rendu de réunion</h3><div class="crw">'+L.map(r=>'<div class="crw-i" data-rid="'+esc(r.id)+'" tabindex="0" role="button"><span class="num sub">'+(r.date?fdate(r.date):"—")+'</span><span class="grow"><b>'+esc(rsTitle(r))+'</b><span class="sub">'+esc(RTL[r.type]+" · "+rsStLbl(r))+'</span></span></div>').join("")+'</div></div>'}
const rsActBtn=a=>{if(!a||["mail","appel","note"].includes(a.type))return "";const L=rsOfAction(a.id);
  return '<button class="btn ghost" type="button" data-rsfrom="'+esc(a.id)+'" title="'+(L.length?'Ouvrir le compte rendu de réunion relié à ce point d\'agenda':'Pour une réunion interne (Café Commerce, équipe…) : un compte rendu de réunion relié à ce point d\'agenda')+'">'+I_RS+(L.length?'CR de réunion relié':'CR de réunion')+'</button>'};

/* Fiche compte : réunions où le compte a été évoqué */
function rsAccPanel(k){const L=rsOfCompte(k);if(!L.length)return "";const n=nh(k.nom);
  return '<div class="panel"><div class="ph"><h2>Évoqué en réunion</h2><span class="sub num">'+L.length+'</span></div><div class="crw">'+
    L.slice(0,6).map(r=>{const a=r.affaires.find(x=>x.compteId===k.id||(x.compte&&nh(x.compte)===n))||{};
      return '<div class="crw-i" data-rid="'+esc(r.id)+'" tabindex="0" role="button"><span class="num sub">'+(r.date?fdate(r.date):"—")+'</span><span class="grow"><b>'+esc(rsTitle(r))+(r.statut!=="fait"?' <span class="pill tone-'+rsStTone(r)+'" style="font-size:11px">'+esc(rsStLbl(r))+'</span>':'')+'</b><span class="sub">'+esc(rsAffTxt(a)||RTL[r.type])+'</span></span></div>'}).join("")+
    '</div>'+(L.length>6?'<button type="button" class="more" style="align-self:flex-start" data-rsall="'+esc(k.nom)+'">Voir les '+L.length+' réunions</button>':'')+'</div>'}
/* Recherche globale (Ctrl+K) */
function rsFind(q){const w=nh(q).split(" ").filter(Boolean);if(!w.length)return [];
  return S.reunions.filter(r=>{const h=rsHay(r);return w.every(t=>h.includes(t))}).sort(aSortDesc).slice(0,8)}

/* ---------- Événements ---------- */
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-rsact],[data-rstype],[data-rsst],[data-rsdone],[data-rsfrom],[data-rsfromam],[data-rid],[data-rsnew],[data-rsall]");if(!t)return;
  /* Lien vers un compte à l'intérieur d'une carte : laisser la fiche s'ouvrir */
  const inner=e.target.closest("button,a");if(t.dataset.rid!=null&&inner&&inner!==t&&t.contains(inner))return;
  const d=t.dataset;
  if(d.rsnew!=null){if(MODAL)closeModal();rsOpen(d.rsnew==="plan"?{statut:"afaire"}:{type:d.rsnew&&RTL[d.rsnew]?d.rsnew:""});return}
  /* Réunion planifiée cochée dans l'agenda : elle a eu lieu, on rédige son compte rendu */
  if(d.rsdone!=null){if(MODAL)closeModal();const r=S.reunions.find(x=>x.id===d.rsdone);if(!r)return;if(r.statut==="fait"){rsView(r.id);return}rsOpen({id:r.id,cr:true});toast("Réunion tenue : rédigez le compte rendu.");return}
  /* Compte rendu de réunion pour un point de l'agenda (action) */
  if(d.rsfrom!=null){const ex=rsOfAction(d.rsfrom)[0];if(MODAL)closeModal();if(ex){rsView(ex.id);return}rsOpen({fromAction:d.rsfrom});return}
  /* Nouvelle action choisie dans le calendrier : bascule vers une réunion, même date et heure */
  if(d.rsfromam!=null&&AM&&MODAL==="action"){amRead();const dt=AM.date||todayISO(),hr=AM.heure||"",st=dt>todayISO()||AM.statut==="afaire"?"afaire":"fait";closeModal();rsOpen({date:dt,heure:hr,statut:st});return}
  if(d.rid!=null){if(MODAL&&MODAL!=="rsv")closeModal();rsView(d.rid);return}
  if(d.rsall!=null){CRU.q=d.rsall;CRU.f="rs";CRU.p="";CRU.lim=60;showTab("cr");return}
  if(d.rsst!=null&&RS&&MODAL==="rs"){rsRead();RS.statut=d.rsst;rsStUI();return}
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
    if(a==="cr"){const id=RSV.id;closeModal();rsOpen({id,cr:true});return}
    if(a==="copy"){rsCopy(RSV);return}
    if(a==="mail"){rsMail(RSV);return}
    if(a==="print"){crPrintItems([RSV],rsTitle(RSV),"Compte rendu de réunion · "+RTL[RSV.type]);return}}});
/* Statut affiché dans la fenêtre : boutons, aide, libellés de l'ordre du jour */
function rsStUI(){const plan=RS.statut==="afaire";document.querySelectorAll("#rsForm [data-rsst]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.rsst===RS.statut)));
  const h=$("#rsStH");if(h)h.textContent=rsStHint(RS.statut);const p=$("#rs-pts");if(p){p.placeholder=plan?"Sujets à aborder, documents à préparer…":RPH[RS.type];const l=document.querySelector('label[for="rs-pts"]');if(l)l.textContent=plan?"Ordre du jour":"Points abordés"}
  const mh=document.querySelector("#modal .dh .lbl");if(mh)mh.textContent=rsNew?(plan?"Planifier une réunion":"Nouvelle réunion"):(plan?"Réunion planifiée":"Réunion")}
document.addEventListener("change",e=>{const t=e.target;if(!t||MODAL!=="rs"||!RS)return;
  /* Date future : la réunion est planifiée ; les points d'agenda proposés suivent la date */
  if(t.id==="rs-date"){rsRead();if(RS.date>todayISO()&&RS.statut==="fait"){RS.statut="afaire";rsStUI()}
    const s=$("#rs-act");if(s){const cur=s.value;s.innerHTML='<option value="">Aucun</option>'+rsActOpts(RS).map(a=>'<option value="'+esc(a.id)+'"'+(a.id===cur?' selected':'')+'>'+esc(rsActLbl(a))+'</option>').join("")}}});
document.addEventListener("input",e=>{const t=e.target;if(!t||MODAL!=="rs"||!RS)return;
  if(t.id==="rs-ag"){const ti=$("#rs-tit");if(ti)ti.placeholder=rsTitle(Object.assign({},RS,{titre:"",agence:t.value.trim()}));return}
  if(t.dataset&&t.dataset.f==="compte"){const k=t.value.trim()?findCompte(t.value.trim()):null;t.classList.toggle("known",!!k);t.title=k?"Compte existant : la réunion apparaîtra sur sa fiche":""}});
document.addEventListener("keydown",e=>{const t=e.target;if(e.key==="Enter"&&t&&t.matches&&t.matches(".crc[data-rid],.crw-i[data-rid]")){e.preventDefault();rsView(t.dataset.rid)}});
