/* PAC Prospection IDF · CSC — Interface : navigation, fenêtres, actions (RDV, appel, mail…), contacts, comptes
   Fichier 2/18 : les fichiers se chargent dans l'ordre et partagent leurs déclarations. */
"use strict";

/* ================= V3 · Navigation, fenêtres, actions, contacts, comptes ================= */
const SV='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">';
const CHEV='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5"/></svg>';
const I_TEL=SV+'<path d="M5.5 2.5 3.4 2.6C2.9 2.7 2.5 3.1 2.5 3.6c.2 5.4 4.5 9.7 9.9 9.9.5 0 .9-.4 1-.9l.1-2.1-2.8-1.2-1.3 1.3a7.4 7.4 0 0 1-3.5-3.5L7.2 5.8 6 3z"/></svg>';
const I_MAIL=SV+'<rect x="2" y="3.5" width="12" height="9" rx="1.5"/><path d="m2.5 4.5 5.5 4 5.5-4"/></svg>';
const I_CHECK='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="m3.5 8.5 3 3 6-7"/></svg>';
const I_PLUS='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M8 3v10M3 8h10"/></svg>';
const I_EV={appel:I_TEL,mail:I_MAIL,
  visite:SV+'<path d="M8 14.5s4.5-4.2 4.5-7.7a4.5 4.5 0 0 0-9 0c0 3.5 4.5 7.7 4.5 7.7z"/><circle cx="8" cy="6.8" r="1.6"/></svg>',
  visio:SV+'<rect x="1.8" y="4" width="8.7" height="8" rx="1.5"/><path d="m10.5 7 3.7-2.2v6.4L10.5 9"/></svg>',
  evenement:SV+'<path d="M3 13.5V3h7.5l-1.2 2.6L10.5 8H3"/></svg>',
  tache:SV+'<path d="M8 2.2a3.9 3.9 0 0 0-3.9 3.9v2.5L2.8 11h10.4l-1.3-2.4V6.1A3.9 3.9 0 0 0 8 2.2zM6.5 13a1.6 1.6 0 0 0 3 0"/></svg>',
  note:SV+'<path d="M3.5 2.5h6l3 3v8h-9z"/><path d="M9.5 2.5v3h3M5.5 8.5h5M5.5 11h3.5"/></svg>',
  rel:I_MAIL,
  autre:'<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><circle cx="4" cy="8" r="1.3"/><circle cx="8" cy="8" r="1.3"/><circle cx="12" cy="8" r="1.3"/></svg>'};
const ATYPES=[["visite","RDV / visite"],["visio","Visio / réunion"],["appel","Appel"],["mail","Mail"],["tache","Rappel / tâche"],["evenement","Événement"],["note","Note"],["autre","Autre"]];
const ALBL=Object.fromEntries(ATYPES);
const ESHORT={visite:"Visite",visio:"Visio",appel:"Appel",mail:"Mail",tache:"Rappel",evenement:"Événement",note:"Note",autre:"Autre"};
const ARES={appel:["Joint","Message laissé","Pas de réponse","Appel reçu"],mail:["Envoyé","Réponse reçue","Sans réponse","Mail reçu"],evenement:["Rencontré","Pas de contact"]};
const stLbl=a=>a.statut==="afaire"?(isRdv(a.type)?"Planifié":"À faire"):a.statut==="fait"?(isRdv(a.type)?"Réalisé":a.type==="note"?"Note":"Fait"):"Annulé";
const stTone=a=>a.statut==="afaire"?((a.date&&a.date<todayISO())?"bad":"warn"):a.statut==="fait"?"ok":"grey";
const pl=(n,s,p)=>n+" "+(n>1?(p||s+"s"):s);
const DAYS=["dim.","lun.","mar.","mer.","jeu.","ven.","sam."];
const dObj=iso=>new Date(iso+"T12:00:00");
const isoOf=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const addD=(iso,n)=>{const d=dObj(iso);d.setDate(d.getDate()+n);return isoOf(d)};
const mondayOf=iso=>{const d=dObj(iso);d.setDate(d.getDate()-((d.getDay()+6)%7));return isoOf(d)};
const fday=iso=>{if(!iso)return "";const d=dObj(iso);return DAYS[d.getDay()]+" "+d.getDate()+" "+d.toLocaleDateString("fr-FR",{month:"short"}).replace(".","")};
function whenLbl(a){if(!a.date)return "Sans date";const t=todayISO();
  const h=a.heure?" · "+a.heure.replace(":","h"):"";
  if(a.date===t)return (a.heure?a.heure.replace(":","h"):"Aujourd'hui");
  if(a.date===addD(t,1))return "Demain"+h;if(a.date===addD(t,-1))return "Hier"+h;
  return fday(a.date)+(a.date.slice(0,4)!==t.slice(0,4)?" "+a.date.slice(0,4):"")+h}
const tyTag=ty=>ty?'<span class="ty ty-'+esc(ty.slice(0,4).toLowerCase())+'">'+esc(ty)+'</span>':'';

/* ---------- Navigation ---------- */
const I_DVN=SV+'<path d="M4 1.8h6l2.5 2.5v9.9H4z"/><path d="M10 1.8v2.5h2.5"/><path d="M10.4 7.4a2.2 2.2 0 1 0 0 3.2M6.4 8.4h3.1M6.4 9.7h3.1"/></svg>';
const NAV=[["tdb","Tableau de bord",SV+'<rect x="2" y="2" width="5" height="6" rx="1"/><rect x="9" y="2" width="5" height="4" rx="1"/><rect x="2" y="10" width="5" height="4" rx="1"/><rect x="9" y="8" width="5" height="6" rx="1"/></svg>',""],
 ["comptes","Comptes",SV+'<path d="M2.5 14V4.5l5-2v11.5M7.5 6.5h6V14M2 14h12M4.5 6h1M4.5 8.5h1M4.5 11h1M10 9h1.5M10 11.5h1.5"/></svg>',"Suivi de prospection"],
 ["cibles","Cibles & campagnes",SV+'<circle cx="8" cy="8" r="6"/><circle cx="8" cy="8" r="3.2"/><circle cx="8" cy="8" r=".6" fill="currentColor"/></svg>',""],
 ["devis","Suivi des devis",I_DVN,""],
 ["agenda","Agenda & actions",SV+'<rect x="2" y="3" width="12" height="11" rx="1.5"/><path d="M2 6.5h12M5.5 1.8v2.4M10.5 1.8v2.4M5 9.5h2M9 9.5h2M5 12h2"/></svg>',"Actions commerciales"],
 ["mailing","Mailing",SV+'<path d="M14 2 7 9M14 2l-4.5 12L7 9 2 6.5z"/></svg>',""],
 ["pac","Plan d'action (PAC)",SV+'<path d="M3 14.5V2M3 2.5h8.5l-1.5 3 1.5 3H3"/></svg>',"Pilotage"],
 ["bilan","Bilan d'activité",SV+'<path d="M2 14h12M3.5 13.5V9M7 13.5V5M10.5 13.5V7.5M14 13.5V3"/></svg>',""],
 ["analyse","Analyse des devis",SV+'<path d="M2.5 13.5h11M3.5 11l3-3.5 2.5 2 4-5"/><path d="M10.5 4.5h2.5V7"/></svg>',""]];
function renderNav(){
  renderQk();
  const t=todayISO(),late=S.actions.filter(a=>isOpen(a)&&a.date&&a.date<t).length,tod=S.actions.filter(a=>isOpen(a)&&a.date===t).length;
  const rel=S.mailing.filter(m=>m.envoye&&m.relance&&m.relance<=t&&!m.relanceFaite).length;
  const cnt={tdb:"",comptes:S.comptes.length,cibles:S.cibles.filter(isActive).length,agenda:late?[late,1]:tod?[tod,0]:"",mailing:rel?[rel,1]:"",devis:(()=>{const a=S.devis.filter(d=>d.statut==="attente").length,r=S.devis.filter(dvRel).length;return r?[a,1]:a||""})(),pac:S.pac.filter(p=>p.planId===curPlan().id).length};
  const cur=S.tab==="compte"?"comptes":S.tab;
  $("#nav").innerHTML=NAV.map(([k,l,ic,g])=>{const c=cnt[k],hot=Array.isArray(c)&&c[1],n=Array.isArray(c)?c[0]:c;
    return (g?'<div class="nav-g">'+esc(g)+'</div>':'')+'<button type="button" data-nav="'+k+'"'+(cur===k?' aria-current="page"':'')+' title="'+esc(l)+'">'+ic+'<span class="l">'+esc(l)+'</span>'+(n!==""&&n!=null?'<span class="nb'+(hot?' hot':'')+'">'+n+'</span>':'')+'</button>'}).join("");
}
const VIEWS_ALL=["tdb","agenda","comptes","compte","cibles","mailing","pac","bilan","devis","analyse"];
function showTab(k,arg,noPush){
  if(!VIEWS_ALL.includes(k))k="tdb";
  S.tab=k;if(k==="compte")S.kid=arg||S.kid;
  VIEWS_ALL.forEach(n=>{const v=$("#view-"+n);if(v)v.hidden=n!==k});
  const h="#!"+k+(k==="compte"?":"+S.kid:"");
  if(!noPush&&location.hash!==h){try{history.pushState(null,"",h)}catch(e){}}
  render();window.scrollTo(0,0);
}
function routeFromHash(){const h=location.hash;if(!h.startsWith("#!")){S.tab="tdb";VIEWS_ALL.forEach(n=>{const v=$("#view-"+n);if(v)v.hidden=n!=="tdb"});return}
  const [k,arg]=h.slice(2).split(":");S.tab=VIEWS_ALL.includes(k)?k:"tdb";if(S.tab==="compte")S.kid=arg||"";
  VIEWS_ALL.forEach(n=>{const v=$("#view-"+n);if(v)v.hidden=n!==S.tab})}
window.addEventListener("popstate",()=>{routeFromHash();render()});
function render(){
  if(!$("#nav"))return;
  renderNav();
  const t=S.tab;
  if(t==="tdb")renderTdb();else if(t==="agenda")renderAgenda();else if(t==="comptes")renderComptes();else if(t==="compte")renderCompte();
  else if(t==="cibles")renderCibles();else if(t==="mailing")renderMailing();else if(t==="pac")renderPac();else if(t==="bilan")renderBilan();else if(t==="devis")renderDevis();else if(t==="analyse")renderAnalyse();
}
const pageH=(crumb,title,sub,tools)=>'<div class="page-h"><div class="grow">'+(crumb?'<span class="crumb">'+crumb+'</span>':'')+'<h2>'+title+'</h2>'+(sub?'<p class="sub">'+sub+'</p>':'')+'</div>'+(tools?'<div class="bar">'+tools+'</div>':'')+'</div>';
const qBtns=(kid,cid)=>{const d=(k)=>' data-anew="'+k+'"'+(kid?' data-k="'+esc(kid)+'"':'')+(cid?' data-c="'+esc(cid)+'"':'');
  return '<div class="qa"><button class="btn" type="button"'+d("visite")+'>'+I_EV.visite+'RDV</button><button class="btn" type="button"'+d("appel")+'>'+I_EV.appel+'Appel</button><button class="btn" type="button"'+d("mail")+'>'+I_EV.mail+'Mail</button><button class="btn" type="button"'+d("tache")+'>'+I_EV.tache+'Rappel</button><button class="btn" type="button"'+d("note")+'>'+I_EV.note+'Note</button></div>'};

/* ---------- Élément d'action (listes « à faire », fiche compte) ---------- */
function tItem(a,o){o=o||{};const k=kOf(a.compteId),ct=ctById(a.contactId),late=isOpen(a)&&a.date&&a.date<todayISO();
  const meta=[!o.noCompte&&k?'<button type="button" class="lk" data-kopen="'+esc(k.id)+'">'+esc(k.nom)+'</button>':'',ct?esc(ct.nom):'',a.resultat?esc(a.resultat):''].filter(Boolean).join(" · ");
  return '<div class="ti'+(a.statut!=="afaire"?' done':'')+'" data-aid="'+esc(a.id)+'"><button type="button" class="ck'+(a.statut==="fait"?' on':'')+'" data-done="'+esc(a.id)+'" title="'+(a.statut==="fait"?"Rouvrir":"Marquer comme fait")+'" aria-label="'+(a.statut==="fait"?"Rouvrir":"Marquer comme fait")+' : '+esc(a.objet||ALBL[a.type])+'">'+(a.statut==="fait"?I_CHECK:'')+'</button>'+
   '<span class="eic eic-'+esc(a.type)+'" title="'+esc(ALBL[a.type]||a.type)+'">'+(I_EV[a.type]||I_EV.autre)+'</span>'+
   '<div style="min-width:0"><div class="o">'+esc(a.objet||(a.details?(a.details.length>90?a.details.slice(0,90)+"…":a.details):ALBL[a.type]||"Action"))+'</div>'+(meta?'<div class="m">'+meta+'</div>':'')+'</div>'+
   '<div class="dt'+(late?' late':'')+'">'+esc(o.full?(a.date?fday(a.date)+(a.heure?" · "+a.heure.replace(":","h"):""):"Sans date"):whenLbl(a))+'</div></div>'}
/* Relance de mailing due : présentée comme une action à faire */
function rItem(m){const late=m.relance<todayISO();
  return '<div class="ti" data-mopen="'+esc(m.id)+'"><button type="button" class="ck" data-mrel="'+esc(m.id)+'" title="Relance faite" aria-label="Relance faite : '+esc(m.client)+'"></button><span class="eic eic-rel">'+I_MAIL+'</span>'+
   '<div style="min-width:0"><div class="o">Relancer suite au mailing</div><div class="m">'+(m.compteId?'<button type="button" class="lk" data-kopen="'+esc(m.compteId)+'">'+esc(m.client)+'</button>':esc(m.client))+(m.contact?' · '+esc(m.contact):'')+'</div></div>'+
   '<div class="dt'+(late?' late':'')+'">'+esc(whenLbl({date:m.relance}))+'</div></div>'}
const relancesDues=(until)=>S.mailing.filter(m=>m.envoye&&m.relance&&!m.relanceFaite&&m.relance<=(until||todayISO())).sort((a,b)=>a.relance.localeCompare(b.relance));

/* ---------- Fenêtre modale ---------- */
let MODAL=null;
let MSIZE="auto";
function modalBig(){const m=$("#modal");if(MSIZE==="compact"){m.classList.remove("big");m.classList.add("compact")}else{m.classList.remove("compact");m.classList.add("big")}}
function modalCtl(m){const dh=m.querySelector(".dh");if(!dh)return;dh.title="Glisser pour déplacer la fenêtre · double-clic pour la recentrer";
  if(!dh.querySelector(".mgrip")){const g=document.createElement("span");g.className="mgrip";g.setAttribute("aria-hidden","true");g.textContent="⠿";dh.insertBefore(g,dh.firstChild)}
  const cl=dh.querySelector('[data-act="mclose"]');if(cl&&!dh.querySelector('[data-act="msize"]')){const b=document.createElement("button");b.type="button";b.className="btn ghost";b.dataset.act="msize";b.innerHTML='<span class="l-big">Réduire</span><span class="l-cmp">Agrandir</span>';dh.insertBefore(b,cl)}}
function showModal(html,kind){MODAL=kind||"x";const m=$("#modal");m.classList.remove("big","compact","gs-m");m.innerHTML=html;modalCtl(m);m.hidden=false;$("#mscrim").hidden=false}
function closeModal(){if(MODAL==="nb")setTimeout(()=>{if(S.tab==="tdb")renderTdb()},0);NLINK=null;MODAL=null;DV=null;AM=null;CM=null;KM=null;RV=null;const m=$("#modal");m.classList.remove("big","compact","moved","gs-m");m.style.left=m.style.top="";$("#mscrim").classList.remove("light");$("#modal").hidden=true;$("#mscrim").hidden=true}
const mHead=(lbl,title)=>'<div class="dh"><div class="grow"><span class="lbl">'+lbl+'</span><h2 id="mTitle">'+title+'</h2></div><button class="btn ghost" type="button" data-act="mclose">Fermer</button></div>';
const fld=(id,lab,val,type,extra)=>'<div class="f"><label class="lbl" for="'+id+'">'+lab+'</label><input type="'+(type||"text")+'" id="'+id+'" value="'+esc(val==null?"":val)+'"'+(extra||"")+'></div>';
const ta=(id,lab,val,rows,ph)=>'<div class="f"><label class="lbl" for="'+id+'">'+lab+'</label><textarea id="'+id+'" rows="'+(rows||3)+'"'+(ph?' placeholder="'+esc(ph)+'"':'')+'>'+esc(val||"")+'</textarea></div>';
const vOf=id=>{const e=document.getElementById(id);return e?String(e.value).trim():""};
const comptesDL=()=>'<datalist id="kList">'+S.comptes.slice().sort((a,b)=>a.nom.localeCompare(b.nom,"fr")).map(k=>'<option value="'+esc(k.nom)+'">').join("")+'</datalist>';

/* ---------- Action : RDV, appel, mail, rappel, note… ---------- */
let AM=null,amNew=false,amDel=false;
const EPH={appel:"Interlocuteur joint, besoins exprimés, projets de travaux, personnes à rencontrer, objections, concurrence en place…",
  mail:"Ce qui a été envoyé (présentation, plaquette, proposition…) ou la réponse obtenue…",
  visite:"Interlocuteurs rencontrés, patrimoine visité, besoins, projets, concurrence en place…",
  visio:"Participants, sujets abordés, besoins, décisions…",tache:"Ce qu'il faut faire, à qui s'adresser…",note:"Information à garder sur ce compte…",evenement:"Événement, personnes rencontrées, sujets abordés…",autre:"Détails…"};
const EOBJ={appel:"Ex. : présenter l'offre amiante avant travaux",mail:"Objet du mail",visite:"Ex. : visite du site de production",visio:"Objet de la réunion",tache:"Ex. : rappeler pour caler une visite",note:"Ex. : organigramme, contexte",evenement:"Nom de l'événement",autre:"Ex. : message LinkedIn"};
function openAction(o){o=o||{};
  const src=o.id?S.actions.find(a=>a.id===o.id):null;amNew=!src;amDel=false;
  if(src)AM=clone(src);
  else{const ty=o.type||"appel",d=o.date||todayISO(),k=kOf(o.compteId);
    AM=Object.assign(ablank(),{id:uid(),creeLe:now(),type:ty,objet:o.objet||"",compteId:o.compteId||"",cibleId:o.cibleId||"",date:ty==="tache"&&!o.date?addD(todayISO(),1):d,heure:o.heure||"",
      statut:ty==="note"?"fait":(isRdv(ty)||ty==="tache")?"afaire":(d>todayISO()?"afaire":"fait")});
    if(k){const p=principal(k.id);if(p)AM.contactId=p.id;const cs=cibOf(k.id);if(!AM.cibleId&&cs.length===1)AM.cibleId=cs[0].id}}
  AM._k=(kOf(AM.compteId)||{}).nom||"";AM._suite=null;AM._crOpen=!!(o.cr||AM.cr);if(o.cr&&amNew){AM.statut="fait";AM.objet=AM.objet||"Compte rendu de RDV"}
  drawAction();setTimeout(()=>{const f=amNew&&!AM._k?$("#am-k"):$("#am-obj");if(f)f.focus()},40);
}
function amRead(){if(!AM||!$("#am-obj"))return;
  AM._k=vOf("am-k");const k=findCompte(AM._k);if(k&&k.id!==AM.compteId){AM.compteId=k.id;AM.contactId="";AM.cibleId=""}if(!k)AM.compteId="";
  AM.date=vOf("am-date");AM.heure=vOf("am-heure");AM.objet=vOf("am-obj");AM.details=vOf("am-det");
  const r=$("#am-res");AM.resultat=r?r.value:"";const ac=$("#am-acc");AM.accompagnant=ac?ac.value.trim():AM.accompagnant;const li=$("#am-lieu");AM.lieu=li?li.value.trim():AM.lieu;
  const ct=$("#am-ct");if(ct)AM.contactId=ct.value;const cb=$("#am-cib");if(cb)AM.cibleId=cb.value;
  crRead();
  const su=$("#am-su");if(su&&su.checked){AM._suite={type:$("#am-sut").value,date:$("#am-sud").value,objet:$("#am-suo").value.trim()}}else if(su)AM._suite=null;
}
function drawAction(){
  const a=AM,k=kOf(a.compteId),cts=k?ctOf(k.id):[],cbs=k?cibOf(k.id):[],rdv=isRdv(a.type),res=ARES[a.type];
  const ST=[["afaire",rdv?"Planifié":"À faire"],["fait",rdv?"Réalisé":"Fait"],["annule","Annulé"]];
  showModal(mHead(amNew?"Nouvelle action":"Action",esc(ALBL[a.type]||"Action")+(a._k?' · '+esc(a._k):''))+
  '<div class="db"><form id="amForm" class="am-grid" onsubmit="return false"><div class="am-col">'+
   '<div class="tpick" role="group" aria-label="Type d\'action">'+ATYPES.map(([t,l])=>'<button type="button" data-atype="'+t+'" aria-pressed="'+(a.type===t)+'">'+(I_EV[t]||"")+esc(l)+'</button>').join("")+'</div>'+
   kcHTML(a,k)+
   '<div class="row4"><div class="f"><label class="lbl" for="am-date">Date</label><input type="date" id="am-date" value="'+esc(a.date)+'"></div><div class="f"><label class="lbl" for="am-heure">Heure</label><input type="time" id="am-heure" value="'+esc(a.heure)+'"></div>'+
    '<div class="f" style="grid-column:span 2"><span class="lbl">Statut</span><div class="seg" role="group" aria-label="Statut">'+ST.map(([s,l])=>'<button type="button" data-ast="'+s+'" aria-pressed="'+(a.statut===s)+'">'+l+'</button>').join("")+'</div></div></div>'+
   '<div class="row"><div class="f"><label class="lbl" for="am-ct">Contact</label><select id="am-ct"><option value="">—</option>'+cts.map(c=>'<option value="'+esc(c.id)+'"'+(c.id===a.contactId?' selected':'')+'>'+esc(c.nom||c.mail||"Contact")+(c.fonction?' · '+esc(c.fonction):'')+'</option>').join("")+'</select>'+(k?'<button type="button" class="more" style="align-self:flex-start;background:none;border:0;padding:2px 0;color:var(--accent);cursor:pointer;font-size:12.5px" data-ctnew="'+esc(k.id)+'" data-from="am">+ Nouveau contact</button>':'')+'</div>'+
    '<div class="f"><label class="lbl" for="am-cib">Campagne</label><select id="am-cib"><option value="">'+(cbs.length?'Toutes les campagnes du compte':'Aucune campagne')+'</option>'+cbs.map(c=>'<option value="'+esc(c.id)+'"'+(c.id===a.cibleId?' selected':'')+'>'+esc(campShort(c))+'</option>').join("")+'</select></div></div>'+
   '<div class="f"><label class="lbl" for="am-obj">Objet</label><input type="text" id="am-obj" value="'+esc(a.objet)+'" placeholder="'+esc(EOBJ[a.type]||"")+'"></div>'+
   (res?'<div class="f"><label class="lbl" for="am-res">Résultat</label><select id="am-res"><option value="">—</option>'+res.map(r=>'<option'+(r===a.resultat?' selected':'')+'>'+esc(r)+'</option>').join("")+'</select></div>':'')+
   (rdv?'<div class="row"><div class="f"><label class="lbl" for="am-acc">Accompagnant</label><input type="text" id="am-acc" value="'+esc(a.accompagnant)+'" placeholder="Chef d\'agence ou commercial de la BU"></div><div class="f"><label class="lbl" for="am-lieu">Lieu</label><input type="text" id="am-lieu" value="'+esc(a.lieu)+'" placeholder="Site, adresse, visio…"></div></div>':'')+
   (a.suite?'<p class="hint">Suite notée : '+esc(a.suite)+'</p>':'')+
   '<div class="suite"><label class="toggle"><input type="checkbox" id="am-su"'+(a._suite?' checked':'')+'> Planifier une suite</label>'+
    '<div id="am-suw" class="row3"'+(a._suite?'':' hidden')+'><div class="f"><label class="lbl" for="am-sut">Type</label><select id="am-sut">'+ATYPES.filter(x=>x[0]!=="note").map(([t,l])=>'<option value="'+t+'"'+((a._suite?a._suite.type:"tache")===t?' selected':'')+'>'+esc(l)+'</option>').join("")+'</select></div>'+
    '<div class="f"><label class="lbl" for="am-sud">Le</label><input type="date" id="am-sud" value="'+esc(a._suite?a._suite.date:addD(todayISO(),7))+'"></div><div class="f"><label class="lbl" for="am-suo">Quoi</label><input type="text" id="am-suo" value="'+esc(a._suite?a._suite.objet:"")+'" placeholder="Relancer, envoyer le devis…"></div></div></div>'+
  '</div><div class="am-col">'+
   ta("am-det",a.type==="note"?"Note":(a.cr||a._crOpen)?"Points abordés":rdv||a.type==="evenement"?"Compte rendu":"Détails",a.details,a.type==="note"||rdv||a.cr||a._crOpen?12:8,EPH[a.type])+
   (crOK(a.type)?crSection(a):'')+
  '</div></form></div>'+
  '<div class="df">'+(amNew?'':'<button class="btn danger" type="button" data-act="amdel">Supprimer</button>')+(k?'<button class="btn ghost" type="button" data-kopen="'+esc(k.id)+'">Fiche compte</button>':'')+(k&&rdv?'<button class="btn ghost" type="button" data-prep="'+esc(k.id)+'" data-prepa="'+esc(a.id)+'">Fiche de préparation</button>':'')+'<span class="grow"></span><button class="btn" type="button" data-act="mclose">Annuler</button><button class="btn primary" type="button" data-act="amsave">Enregistrer</button></div>',"action");
  modalBig();
}
async function amSave(){
  amRead();const a=AM;
  if(!a._k){toast("Indiquez le compte.");$("#am-k").focus();return}
  let k=findCompte(a._k),created=false;
  if(!k){k=ensureCompte(a._k,{origine:"action"});created=true}
  a.compteId=k.id;if(!a.objet&&a.type!=="note")a.objet=ALBL[a.type];
  if(a.statut==="fait"&&!a.faitLe)a.faitLe=todayISO();if(a.statut!=="fait")a.faitLe="";
  if(a.statut==="fait"&&!a.date)a.date=todayISO();
  const suite=a._suite;const o=Object.assign({},a);delete o._k;delete o._suite;delete o._crOpen;if(!o.cr||!crOK(o.type))delete o.cr;
  put("actions",o);
  if(suite){put("actions",anorm({id:uid(),creeLe:now(),compteId:k.id,cibleId:a.cibleId,contactId:a.contactId,type:suite.type||"tache",date:suite.date||"",objet:suite.objet||ALBL[suite.type]||"Suite",statut:"afaire"}))}
  const integ=o.cr?crToCible(o,k):"";
  restage(k.id);const wasNew=amNew;closeModal();commit();if(D)drawDrawer();
  toast((wasNew?(o.cr?"Compte rendu enregistré":"Action ajoutée"):"Action enregistrée")+" dans « "+k.nom+" »"+(suite?" · suite planifiée":"")+integ+(created?" · compte créé":""));
}
async function amDelete(btn){if(!amDel){amDel=true;btn.classList.add("armed");btn.textContent="Confirmer la suppression";return}
  const kid=AM.compteId;drop("actions",AM.id);restage(kid);closeModal();commit();if(D)drawDrawer();toast("Action supprimée")}
async function toggleDone(id){const a=S.actions.find(x=>x.id===id);if(!a)return;
  if(a.statut==="fait"){a.statut="afaire";a.faitLe=""}else{a.statut="fait";a.faitLe=todayISO();if(!a.date||a.date>todayISO())a.date=todayISO()}
  a.majLe=now();bump();restage(a.compteId);commit();if(D)drawDrawer();
  if(a.statut==="fait"){
    if(isRdv(a.type)&&!a.details&&!a.cr){openAction({id:a.id,cr:true});toast("RDV réalisé : rédigez le compte rendu.");return}
    toast("Fait : "+(a.objet||ALBL[a.type]))}
  else toast("Action rouverte")}
function relanceFaite(id){const m=S.mailing.find(x=>x.id===id);if(!m)return;m.relanceFaite=todayISO();lsSave();render();toast("Relance notée comme faite : "+m.client)}

/* ---------- Contact ---------- */
let CM=null,cmNew=false,cmDel=false,cmFrom="";
function openContact(o){o=o||{};const src=o.id?S.contacts.find(c=>c.id===o.id):null;cmNew=!src;cmDel=false;cmFrom=o.from||"";
  const keepA=cmFrom==="am"&&AM?(amRead(),clone(AM)):null;
  CM=src?clone(src):Object.assign(ctblank(),{id:uid(),compteId:o.compteId,creeLe:now(),principal:!ctOf(o.compteId).length});CM._am=keepA;
  const k=kOf(CM.compteId);
  showModal(mHead(cmNew?"Nouveau contact":"Contact",esc(CM.nom||"Contact")+(k?' · '+esc(k.nom):''))+
  '<div class="db"><form onsubmit="return false" style="display:flex;flex-direction:column;gap:12px">'+
   '<div class="row">'+fld("cm-nom",'Nom <span class="req">*</span>',CM.nom,"text",' placeholder="Prénom NOM"')+fld("cm-fon","Fonction",CM.fonction)+'</div>'+
   '<div class="row">'+fld("cm-tel","Téléphone",CM.tel,"tel")+fld("cm-mail","E-mail",CM.mail,"email")+'</div>'+
   '<label class="toggle"><input type="checkbox" id="cm-pr"'+(CM.principal?' checked':'')+'> Contact principal du compte</label>'+
   ta("cm-not","Notes",CM.notes,3,"Rôle dans les décisions, disponibilités, historique…")+
  '</form></div><div class="df">'+(cmNew?'':'<button class="btn danger" type="button" data-act="ctdel">Supprimer</button>')+'<span class="grow"></span><button class="btn" type="button" data-act="ctback">Annuler</button><button class="btn primary" type="button" data-act="ctsave">Enregistrer</button></div>',"contact");
  setTimeout(()=>{const f=$("#cm-nom");if(f)f.focus()},40)}
function ctBack(){const back=CM&&CM._am;if(back){AM=back;CM=null;drawAction()}else closeModal()}
function ctSave(){const c=CM;c.nom=vOf("cm-nom");c.fonction=vOf("cm-fon");c.tel=vOf("cm-tel");c.mail=vOf("cm-mail");c.notes=vOf("cm-not");c.principal=$("#cm-pr").checked;
  if(!c.nom&&!c.mail){toast("Renseignez au moins le nom ou l'e-mail.");$("#cm-nom").focus();return}
  if(c.mail&&!/^[^\s@;,]+@[^\s@;,]+\.[^\s@;,]+$/.test(c.mail)){toast("Adresse e-mail incomplète ou mal écrite.");$("#cm-mail").focus();return}
  const back=c._am;delete c._am;
  if(c.principal)ctOf(c.compteId).forEach(x=>{if(x.id!==c.id&&x.principal){x.principal=false;x.majLe=now()}});
  put("contacts",c);lsSave();
  if(back){AM=back;AM.contactId=c.id;CM=null;drawAction();toast("Contact ajouté");render();return}
  closeModal();render();if(D)drawDrawer();toast(cmNew?"Contact ajouté":"Contact enregistré")}
function ctDelete(btn){if(!cmDel){cmDel=true;btn.classList.add("armed");btn.textContent="Confirmer la suppression";return}
  const id=CM.id;drop("contacts",id);S.actions.forEach(a=>{if(a.contactId===id)a.contactId=""});S.mailing.forEach(m=>{if(m.contactId===id)m.contactId=""});
  closeModal();commit();if(D)drawDrawer();toast("Contact supprimé")}

/* ---------- Compte : création, modification, fusion, suppression ---------- */
let KM=null,kmNew=false,kmDel=false;
const secteursAll=()=>[...new Set([...SEGMENTS,...S.comptes.map(k=>k.segment).filter(Boolean),...S.comptes.map(k=>k.typologie).filter(Boolean)])].sort((a,b)=>a.localeCompare(b,"fr"));
function openCompte(id,preset){const src=id?kOf(id):null;kmNew=!src;kmDel=false;
  KM=src?clone(src):Object.assign(kblank(),{id:uid(),creeLe:now()},preset||{});
  const ag=[...new Set(S.comptes.map(k=>k.agence).concat(S.cibles.map(c=>c.agence)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"fr"));
  const typos=[...new Set(S.comptes.map(k=>k.typologie).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"fr"));
  showModal(mHead(kmNew?"Nouveau compte":"Compte",esc(KM.nom||"Compte à renseigner"))+
  '<div class="db"><div id="kmDup" class="notice warn" hidden></div><form onsubmit="return false" style="display:flex;flex-direction:column;gap:12px">'+
   fld("km-nom",'Nom du compte <span class="req">*</span>',KM.nom,"text",' placeholder="Nom exact du compte dans Athena"')+
   '<div class="f"><span class="lbl">Type</span><div class="seg" role="group" aria-label="Type">'+TYPES.map(t=>'<button type="button" data-ktype="'+esc(t)+'" aria-pressed="'+(KM.type===t)+'">'+esc(t)+'</button>').join("")+'</div></div>'+
   '<div class="row"><div class="f"><label class="lbl" for="km-seg">Segment</label><select id="km-seg">'+opts(SEGMENTS,KM.segment,"—")+'</select></div>'+
    '<div class="f"><label class="lbl" for="km-typo">Typologie (mailing)</label><input type="text" id="km-typo" list="kmTy" value="'+esc(KM.typologie)+'"><datalist id="kmTy">'+typos.map(t=>'<option value="'+esc(t)+'">').join("")+'</datalist></div></div>'+
   (()=>{const au=famAuto(KM);return '<div class="f"><label class="lbl" for="km-fam">Famille de clients</label><select id="km-fam"><option value="">'+esc("Automatique"+(au?" : "+FNOM[au]:" (aucune trouvée)"))+'</option>'+FAMILLES.map(([c,n])=>'<option value="'+c+'"'+(KM.famille===c?' selected':'')+'>'+esc(n)+'</option>').join("")+'</select><p class="hint" style="margin:0">Par défaut, la famille est déduite de la typologie ou du segment. Choisissez-en une pour l\'imposer.</p></div>'})()+
   '<div class="row3"><div class="f"><label class="lbl" for="km-dept">Département</label><select id="km-dept"><option value="">—</option>'+DEPTS.map(([d,n])=>'<option value="'+d+'"'+(KM.dept===d?' selected':'')+'>'+esc(d+" · "+n)+'</option>').join("")+'</select></div>'+fld("km-ville","Ville",KM.ville)+fld("km-tel","Téléphone (standard)",KM.tel,"tel")+'</div>'+
   '<div class="row3">'+fld("km-adr","Adresse",KM.adresse)+fld("km-cp","Code postal",KM.cp,"text",' inputmode="numeric" maxlength="5"')+fld("km-web","Site web",KM.web,"text",' placeholder="www…"')+'</div>'+
   '<div class="row"><div class="f"><label class="lbl" for="km-ag">Agence</label><input type="text" id="km-ag" list="kmAg" value="'+esc(KM.agence)+'"><datalist id="kmAg">'+ag.map(a=>'<option value="'+esc(a)+'">').join("")+'</datalist></div>'+fld("km-app","Apporteur interne",KM.apporteur)+'</div>'+fld("km-siret","SIRET",KM.siret,"text",' inputmode="numeric"')+
   ta("km-not","Notes sur le compte",KM.notes,4,"Organisation, patrimoine, contrats en place, concurrence…")+
  '</form></div><div class="df">'+(kmNew?'':'<button class="btn danger" type="button" data-act="kdel">Supprimer</button><button class="btn ghost" type="button" data-act="kmerge">Fusionner avec…</button>')+'<span class="grow"></span><button class="btn" type="button" data-act="mclose">Annuler</button><button class="btn primary" type="button" data-act="ksave">'+(kmNew?'Créer le compte':'Enregistrer')+'</button></div>',"compte");
  setTimeout(()=>{const f=$("#km-nom");if(f&&kmNew)f.focus()},40)}
function kmRead(){const k=KM;k.nom=vOf("km-nom");k.segment=$("#km-seg").value;k.typologie=vOf("km-typo");const kf=$("#km-fam");if(kf)k.famille=kf.value;k.dept=$("#km-dept").value;k.ville=vOf("km-ville");k.tel=vOf("km-tel");k.adresse=vOf("km-adr");k.web=vOf("km-web");k.cp=vOf("km-cp");k.siret=vOf("km-siret").replace(/\s/g,"");if(!k.dept&&/^\d{5}$/.test(k.cp)&&DNAME[k.cp.slice(0,2)])k.dept=k.cp.slice(0,2);k.agence=vOf("km-ag");k.apporteur=vOf("km-app");k.notes=vOf("km-not")}
function kSave(){kmRead();const k=KM;
  if(!k.nom){toast("Renseignez le nom du compte.");$("#km-nom").focus();return}
  const other=findCompte(k.nom);
  if(other&&other.id!==k.id){const n=$("#kmDup");n.hidden=false;n.innerHTML='<b>Un compte porte déjà ce nom</b> : '+esc(other.nom)+'. <button class="btn" type="button" data-kopen="'+esc(other.id)+'">Ouvrir ce compte</button>'+(kmNew?'':' <button class="btn" type="button" data-act="kmergeto" data-to="'+esc(other.id)+'">Fusionner dans ce compte</button>');return}
  const wasNew=kmNew;put("comptes",k);
  cibOf(k.id).forEach(c=>{c.compte=k.nom});bump();
  closeModal();lsSave();
  if(wasNew){showTab("compte",k.id);toast("Compte créé")}else{render();if(D)drawDrawer();toast("Compte enregistré")}}
function kDelete(btn){const k=KM,nc=cibOf(k.id).length,nm=mlOf(k.id).length,nd=dvOf(k.id).length;
  if(nc||nm||nd){toast("Ce compte a "+[nc?pl(nc,"cible"):"",nm?pl(nm,"ligne")+" de mailing":"",nd?pl(nd,"devis","devis"):""].filter(Boolean).join(" et ")+" : supprimez-les ou fusionnez le compte.");return}
  if(!kmDel){kmDel=true;btn.classList.add("armed");btn.textContent="Supprimer le compte, ses contacts et ses actions";return}
  const id=k.id;hDel(id);S.contacts=S.contacts.filter(c=>c.compteId!==id);S.actions=S.actions.filter(a=>a.compteId!==id);drop("comptes",id);
  closeModal();lsSave();showTab("comptes");toast("Compte supprimé")}
function kMergeMenu(){kmRead();const k=KM;
  showModal(mHead("Fusionner","Fusionner « "+esc(k.nom)+" » dans un autre compte")+
  '<div class="db"><p class="hint">Les contacts, actions, cibles, devis et lignes de mailing de « '+esc(k.nom)+' » rejoignent le compte choisi. Les informations vides du compte choisi sont complétées, puis « '+esc(k.nom)+' » est supprimé.</p>'+
   '<div class="f"><label class="lbl" for="km-to">Compte qui reste</label><input type="text" id="km-to" list="kList" placeholder="Nom du compte" autocomplete="off">'+comptesDL()+'</div></div>'+
  '<div class="df"><span class="grow"></span><button class="btn" type="button" data-act="mclose">Annuler</button><button class="btn primary" type="button" data-act="kmergego">Fusionner</button></div>',"merge");
  setTimeout(()=>{const f=$("#km-to");if(f)f.focus()},40)}
function mergeComptes(srcId,dstId){const a=kOf(srcId),b=kOf(dstId);if(!a||!b||a.id===b.id)return false;
  Object.keys(kblank()).forEach(f=>{if(f==="notes"){if(a.notes&&!String(b.notes).includes(a.notes))b.notes=[b.notes,a.notes].filter(Boolean).join("\n")}else if(!b[f]&&a[f])b[f]=a[f]});
  if((TYPE_RANK[a.type]||0)>(TYPE_RANK[b.type]||0))b.type=a.type;if(a.contrat)b.contrat=true;
  const map={};ctOf(a.id).slice().forEach(c=>{const ex=findContact(b.id,c);if(ex){["fonction","tel","mail","notes"].forEach(f=>{if(!ex[f]&&c[f])ex[f]=c[f]});map[c.id]=ex.id;S.contacts=S.contacts.filter(x=>x.id!==c.id)}else{c.compteId=b.id;if(ctOf(b.id).some(x=>x.principal))c.principal=false}});
  S.actions.forEach(x=>{if(x.compteId===a.id){x.compteId=b.id;if(map[x.contactId])x.contactId=map[x.contactId]}});
  S.mailing.forEach(m=>{if(m.compteId===a.id){m.compteId=b.id;if(map[m.contactId])m.contactId=map[m.contactId]}});
  S.cibles.forEach(c=>{if(c.compteId===a.id){c.compteId=b.id;c.compte=b.nom}});
  S.devis.forEach(d=>{if(d.compteId===a.id){d.compteId=b.id;if(map[d.contactId])d.contactId=map[d.contactId]}});
  S.comptes=S.comptes.filter(x=>x.id!==a.id);b.majLe=now();bump();restage(b.id);return true}
function kMergeGo(toId){const dst=toId?kOf(toId):findCompte(vOf("km-to"));const src=KM;
  if(!dst){toast("Choisissez un compte existant dans la liste.");return}
  if(dst.id===src.id){toast("Choisissez un autre compte.");return}
  if(!kOf(src.id)){toast("Enregistrez d'abord ce compte.");return}
  mergeComptes(src.id,dst.id);hMove(src.id,dst.id);closeModal();lsSave();showTab("compte",dst.id);toast("Comptes fusionnés dans « "+dst.nom+" »")}
