/* PAC Prospection IDF · CSC — Socle : référentiels, utilitaires, modèle de données (comptes, contacts, actions, cibles), migration, enregistrement
   Fichier 1/18 : les fichiers se chargent dans l'ordre et partagent leurs déclarations. */
"use strict";

/* ---------- Référentiels ---------- */
const STAGES=[
  {k:"a_qualifier",l:"À qualifier"},{k:"cible",l:"Ciblé"},{k:"rdv",l:"RDV pris"},
  {k:"visite",l:"Visité"},{k:"opportunite",l:"Opportunité créée"},{k:"gagne",l:"Gagné"},{k:"sans_suite",l:"Sans suite"}];
const SL=Object.fromEntries(STAGES.map(s=>[s.k,s.l]));
const SIDX=Object.fromEntries(STAGES.map((s,i)=>[s.k,i]));
const BUS=["Construction","Équipements","Environnement","Infrastructures","Autre BU"];
const SEGMENTS=["Industriel","Logistique / entrepôts","Tertiaire / bureaux","Bailleur social","Foncière / investisseur","Promoteur","Syndic / administrateur de biens","Property / facility management","Collectivité / établissement public","Maîtrise d'œuvre / architecte / BET","Entreprise de travaux (prescripteur)","Expert d'assurance / après sinistre","Autre"];
const PRESTA=[["AMI","Amiante"],["CREP","Plomb"],["DPE","DPE / audit énergétique"],["GAZ","Gaz"],["ÉLEC","Électricité"],["TERM","Termites"],["PEMD","PEMD (avant démolition)"],["VENTE","Avant vente / relocation"],["AUTRE","Autre"]];
const PLABEL=Object.fromEntries(PRESTA);
const SOURCES=["Autre BU","Café Commerce","Réunion inter-BU","Événement client","Prospection directe","Lead Athena"];
const MOTIFS=["Accord-cadre concurrent","Pas de besoin","Prix","Pas de réponse","Autre"];
const VSTAT=["Planifiée","Réalisée","Annulée"];
const OSTAT=["Ouvert","Conclue","Perdu"];
const TYPES=["Client existant","Prospect","Prescripteur"];
const DEPTS=[["75","Paris"],["77","Seine-et-Marne"],["78","Yvelines"],["91","Essonne"],["92","Hauts-de-Seine"],["93","Seine-Saint-Denis"],["94","Val-de-Marne"],["95","Val-d'Oise"]];
const DNAME=Object.fromEntries(DEPTS);const dLabel=d=>d?(DNAME[d]?d+" · "+DNAME[d]:d):"";
const CAMPAGNE_DEF="PAC IDF – Clients autres BU – T4 2026";

/* ---------- Utilitaires ---------- */
const $=s=>document.querySelector(s);
const esc=v=>String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pad=n=>String(n).padStart(2,"0");
const todayISO=()=>{const d=new Date();return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())};
const addDaysISO=(n)=>{const d=new Date();d.setDate(d.getDate()+n);return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())};
const fdate=iso=>{if(!iso)return "";const [y,m,d]=iso.split("-");return d+"/"+m+"/"+y};
const eur=n=>(Number(n)||0).toLocaleString("fr-FR",{maximumFractionDigits:0})+" €";
const uid=()=>"c"+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const clone=o=>JSON.parse(JSON.stringify(o));
const isActive=c=>c.etape!=="gagne"&&c.etape!=="sans_suite";
let toastT;
function toast(msg){const t=$("#toast");t.textContent=msg;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,2800)}


/* ================= V3 · État, modèle Comptes / Contacts / Actions, migration ================= */
const nh=x=>String(x==null?"":x).normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const now=()=>new Date().toISOString();
const S={open:new Set(),mode:"wait",cibles:[],comptes:[],contacts:[],actions:[],plans:[],pac:[],mailing:[],devis:[],settings:{objectif:8},writable:true,view:"actives",tab:"tdb",kid:"",db:null,downloads:null,ver:0};
const LS_KEY="pac-idf-v1",BK_KEY="pac-idf-copie-v2",SCHEMA=3,VERSION="V3.23";
let STORE="ls"; /* "idb" dès que les données sont dans la base du navigateur */
const IN_FRAME=(()=>{try{return window.self!==window.top}catch(e){return true}})();
const TYPE_RANK={"Client existant":3,"Prescripteur":2,"Prospect":1};

/* Cible = un compte suivi dans une campagne de prospection (étape, priorité, potentiel, opportunité) */
function blank(){
  return {compteId:"",compte:"",dept:"",campagne:CAMPAGNE_DEF,source:"Autre BU",bu:[],apporteur:"",prestations:[],potentiel:"",priorite:"B",etape:"a_qualifier",agence:"",accompagnant:"",
    motif:"",notes:"",leadIds:[],opp:{creee:false,montant:"",statut:"Ouvert",devis:"",date:""}};
}
function guessDept(c){
  const nx=x=>String(x||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
  const camp=nx(c.campagne);for(const [code,name] of DEPTS){if(camp.includes(nx(name)))return code}
  const m=String(c.notes||"").match(/(?:Site|Siège)\s*:[^·]*?\b(7[5789]|9[1-5])\d{3}\b/);if(m)return m[1];
  const m2=String(c.notes||"").match(/\b(7[5789]|9[1-5])\d{3}\b/);if(m2)return m2[1];
  return ""}
function norm(c){const b=blank();const o=Object.assign(b,c||{});o.opp=Object.assign(blank().opp,(c&&c.opp)||{});
  o.bu=Array.isArray(o.bu)?o.bu:[];o.prestations=Array.isArray(o.prestations)?o.prestations:[];o.leadIds=Array.isArray(o.leadIds)?o.leadIds:[];
  if(!SIDX.hasOwnProperty(o.etape))o.etape="a_qualifier";if(!o.dept)o.dept=guessDept(o);return o}
/* Compte, contact, action */
function kblank(){return {nom:"",type:"Prospect",segment:"",typologie:"",famille:"",siret:"",cp:"",dept:"",adresse:"",ville:"",web:"",tel:"",agence:"",apporteur:"",notes:"",origine:"",contrat:false,sousTypo:"",fiab:"",histo:null}}
const knorm=x=>Object.assign(kblank(),x||{});
function ctblank(){return {compteId:"",nom:"",fonction:"",tel:"",mail:"",notes:"",principal:false}}
const ctnorm=x=>{const o=Object.assign(ctblank(),x||{});o.principal=!!o.principal;return o};
function ablank(){return {compteId:"",cibleId:"",contactId:"",type:"appel",date:"",heure:"",statut:"afaire",objet:"",details:"",resultat:"",accompagnant:"",interlocuteur:"",lieu:"",suite:"",faitLe:""}}
const anorm=x=>{const o=Object.assign(ablank(),x||{});if(!["afaire","fait","annule"].includes(o.statut))o.statut="afaire";return o};

/* Index recalculés à chaque modification */
let IXC=null,IXV=-1;
const bump=()=>{S.ver++};
function IX(){if(IXC&&IXV===S.ver)return IXC;
  const g=(arr,k)=>{const m=new Map();for(const x of arr){const v=x[k];if(!v)continue;let l=m.get(v);if(!l)m.set(v,l=[]);l.push(x)}return m};
  const byName=new Map();S.comptes.forEach(k=>{const n=nh(k.nom);if(n&&!byName.has(n))byName.set(n,k)});
  IXC={compte:new Map(S.comptes.map(k=>[k.id,k])),byName,cib:g(S.cibles,"compteId"),ct:g(S.contacts,"compteId"),act:g(S.actions,"compteId"),ml:g(S.mailing,"compteId"),
    contact:new Map(S.contacts.map(c=>[c.id,c])),cible:new Map(S.cibles.map(c=>[c.id,c]))};
  IXV=S.ver;return IXC}
const kOf=id=>id?IX().compte.get(id)||null:null;
const cibOf=kid=>IX().cib.get(kid)||[];
const ctOf=kid=>IX().ct.get(kid)||[];
const actOf=kid=>IX().act.get(kid)||[];
const mlOf=kid=>IX().ml.get(kid)||[];
const ctById=id=>id?IX().contact.get(id)||null:null;
const cibById=id=>id?IX().cible.get(id)||null:null;
const findCompte=name=>{const n=nh(name);return n?IX().byName.get(n)||null:null};
const secteurOf=k=>k?(k.segment||k.typologie||""):"";
const typeOf=c=>{const k=kOf(c.compteId);return k?k.type:""};
const principal=kid=>{const L=ctOf(kid);return L.find(x=>x.principal)||L[0]||null};
const isOpen=a=>a.statut==="afaire";
const isRdv=t=>t==="visite"||t==="visio";
const aSort=(a,b)=>(a.date||"9999").localeCompare(b.date||"9999")||(a.heure||"99").localeCompare(b.heure||"99");
const aSortDesc=(a,b)=>(b.date||"").localeCompare(a.date||"")||(b.heure||"").localeCompare(a.heure||"")||String(b.majLe||"").localeCompare(String(a.majLe||""));
function nextOf(kid){let best=null;for(const a of actOf(kid)){if(!isOpen(a))continue;if(!best||aSort(a,best)<0)best=a}return best}
const nextFor=c=>nextOf(c.compteId);
/* Dernier contact réel : action faite (hors notes) ou mail envoyé depuis le mailing */
function lastOf(kid){let d="",lab="";const t=todayISO();
  actOf(kid).forEach(a=>{if(a.statut==="fait"&&a.type!=="note"&&a.date&&a.date<=t&&a.date>d){d=a.date;lab=ALBL[a.type]||a.type}});
  mlOf(kid).forEach(m=>{if(m.envoye&&m.dateEnvoi&&m.dateEnvoi>d){d=m.dateEnvoi;lab="Mail (mailing)"}});
  return d?{date:d,label:lab}:null}
const visitsOf=c=>actOf(c.compteId).filter(a=>a.type==="visite"&&(!a.cibleId||a.cibleId===c.id));
const visitsDone=c=>visitsOf(c).filter(a=>a.statut==="fait").length;
const lastDone=c=>{const d=visitsOf(c).filter(a=>a.statut==="fait"&&a.date).map(a=>a.date).sort();return d.length?d[d.length-1]:""};
const lastContact=c=>{const l=lastOf(c.compteId);return l?l.date:""};
const caOf=kid=>mlOf(kid).reduce((s,m)=>s+(Number(String(m.ca||"").replace(/[^\d,.\-]/g,"").replace(",","."))||0),0);
function autoStage(c){
  if(c.etape==="sans_suite"||c.etape==="gagne")return;
  let t=SIDX[c.etape];const V=visitsOf(c);
  if(V.some(a=>a.statut==="afaire"))t=Math.max(t,SIDX.rdv);
  if(V.some(a=>a.statut==="fait"))t=Math.max(t,SIDX.visite);
  if(c.opp.creee)t=Math.max(t,SIDX.opportunite);
  if(c.opp.creee&&c.opp.statut==="Conclue")t=SIDX.gagne;
  c.etape=STAGES[t].k;
}
/* Recalcule l'étape des cibles d'un compte après une action (RDV planifié, visite réalisée) */
function restage(kid){cibOf(kid).forEach(c=>{const b=c.etape;autoStage(c);if(c.etape!==b){c.majLe=now()}});bump()}

/* ---------- Création / rapprochement ---------- */
function ensureCompte(name,init){const n=String(name||"").trim()||"Sans nom";let k=findCompte(n);if(k)return k;
  k=Object.assign(kblank(),init||{},{id:uid(),nom:n,creeLe:now(),majLe:now()});S.comptes.push(k);
  if(IXC&&IXV===S.ver){IXC.compte.set(k.id,k);const m=nh(k.nom);if(m&&!IXC.byName.has(m))IXC.byName.set(m,k)}else bump();return k}
function findContact(kid,d){const L=ctOf(kid),mail=String(d.mail||"").trim().toLowerCase(),n=nh(d.nom);
  return (mail&&L.find(x=>String(x.mail||"").toLowerCase()===mail))||(n&&L.find(x=>nh(x.nom)===n))||null}
function ensureContact(kid,d){let ct=findContact(kid,d);
  if(ct){["nom","fonction","tel","mail"].forEach(f=>{if(!ct[f]&&d[f])ct[f]=String(d[f]).trim()});return ct}
  ct=Object.assign(ctblank(),{id:uid(),compteId:kid,nom:String(d.nom||"").trim(),fonction:String(d.fonction||"").trim(),tel:String(d.tel||"").trim(),mail:String(d.mail||"").trim(),principal:!ctOf(kid).length,creeLe:now(),majLe:now()});
  S.contacts.push(ct);
  if(IXC&&IXV===S.ver){IXC.contact.set(ct.id,ct);let l=IXC.ct.get(kid);if(!l)IXC.ct.set(kid,l=[]);l.push(ct)}else bump();return ct}
/* Statut d'un ancien échange ou d'une ancienne visite */
const legStat=r=>/^(Planifi|À faire|A faire)/i.test(r||"")?"afaire":/^Annul/i.test(r||"")?"annule":"fait";
function addLegacyAction(x,k,c,ctId){
  const id=String(x.id||uid());if(S.actions.some(a=>a.id===id))return;
  const ty=x.k==="v"?"visite":(["visite","visio","appel","mail","evenement","autre"].includes(x.type)?x.type:"autre");
  const res=x.k==="v"?(x.statut||""):(x.resultat||"");
  let ct=ctId;if(x.interlocuteur){const f=findContact(k.id,{nom:x.interlocuteur});if(f)ct=f.id}
  S.actions.push(anorm({id,compteId:k.id,cibleId:c.id,contactId:ct,type:ty,date:x.date||"",statut:legStat(res),
    resultat:/^(Planifi|Réalis|Annul|Rencontr|Fait|À faire)/i.test(res)?"":res,objet:x.objet||"",details:x.cr||x.details||"",accompagnant:x.accompagnant||"",
    interlocuteur:x.interlocuteur||"",suite:[x.suite,x.relance?"le "+fdate(x.relance):""].filter(Boolean).join(" "),faitLe:legStat(res)==="fait"?(x.date||""):"",creeLe:c.creeLe||now(),majLe:c.majLe||now(),origine:"V2"}));bump()}
/* Une fiche « cible » de la V2 (ou d'un import Excel) : le compte, le contact, les visites, les échanges et la prochaine action
   partent dans le compte ; la cible garde le suivi de prospection */
const LEGACY=["contact","fonction","tel","mail","visites","echanges","prochaineAction","prochaineLibelle","type","segment","copieDe"];
function absorbCible(raw){
  const L={};const src=Object.assign({},raw||{});LEGACY.forEach(f=>{if(f in src){L[f]=src[f];delete src[f]}});
  const c=norm(src);if(!c.id)c.id=uid();
  let k=kOf(c.compteId);
  if(!k)k=ensureCompte(c.compte||"Sans nom",{type:L.type||"Prospect",segment:L.segment||"",dept:c.dept||"",origine:"cible"});
  if(L.type&&(TYPE_RANK[L.type]||0)>(TYPE_RANK[k.type]||0))k.type=L.type;
  if(L.segment&&!k.segment)k.segment=L.segment;
  if(!k.dept&&c.dept)k.dept=c.dept;
  c.compteId=k.id;c.compte=k.nom;
  let ctId="";
  if(L.contact||L.tel||L.mail){const ct=ensureContact(k.id,{nom:L.contact||"",fonction:L.fonction||"",tel:L.tel||"",mail:L.mail||""});ctId=ct.id}
  (Array.isArray(L.visites)?L.visites:[]).forEach(v=>addLegacyAction(Object.assign({},v,{k:"v"}),k,c,ctId));
  (Array.isArray(L.echanges)?L.echanges:[]).forEach(e=>addLegacyAction(Object.assign({},e,{k:"e"}),k,c,ctId));
  if(L.prochaineAction||L.prochaineLibelle){const ob=String(L.prochaineLibelle||"Relancer").trim(),d=L.prochaineAction||"";
    if(!actOf(k.id).some(a=>isOpen(a)&&nh(a.objet)===nh(ob)&&(a.date||"")===d)){
      S.actions.push(anorm({id:uid(),compteId:k.id,cibleId:"",contactId:ctId,type:"tache",date:d,objet:ob,statut:"afaire",creeLe:c.majLe||c.creeLe||now(),majLe:now(),origine:"prochaine action"}));bump()}}
  return c}
/* Ligne de mailing : rattachée à un compte (créé si besoin) et à un contact */
const mType=()=>"Client existant"; /* toutes les listes de mailing sont des clients déjà facturés */
function absorbMailing(m){
  if(!(m.compteId&&kOf(m.compteId))){
    const name=String(m.client||m.mail||"").trim()||"Sans nom";let k=findCompte(name);
    if(!k)k=ensureCompte(name,{type:mType(m),typologie:m.typologie||"",agence:m.agence||"",apporteur:m.apporteur||"",origine:"mailing"});
    else{if(!k.typologie&&m.typologie)k.typologie=m.typologie;if(!k.agence&&m.agence)k.agence=m.agence;if(!k.apporteur&&m.apporteur)k.apporteur=m.apporteur}
    m.compteId=k.id}
  if(!(m.contactId&&ctById(m.contactId))&&(m.contact||m.mail)){const ct=ensureContact(m.compteId,{nom:m.contact||"",mail:m.mail||""});m.contactId=ct.id}
  return m}

/* ---------- Plans du PAC ---------- */
const PAXES=[["secteur","Par secteur d'activité"],["theme","Par plan d'action"],["famille","Par famille de clients"],["autre","Autre"]];
function ensurePlans(){
  if(!S.plans.length){S.plans.push({id:uid(),nom:"PAC IDF "+(S.settings.pacPeriode||new Date().getFullYear()),axe:"theme",titre:S.settings.pacTitre||PAC_TITRE_DEF,periode:S.settings.pacPeriode||String(new Date().getFullYear()),ordre:1,creeLe:now()})}
  const ids=new Set(S.plans.map(p=>p.id));S.pac.forEach(l=>{if(!ids.has(l.planId))l.planId=S.plans[0].id});
  if(!ids.has(S.settings.planCourant))S.settings.planCourant=S.plans[0].id}
function curPlan(){ensurePlans();return S.plans.find(p=>p.id===S.settings.planCourant)||S.plans[0]}

/* ---------- Migration V2 → V3 ---------- */
function migrateV2(r){
  S.settings=Object.assign({objectif:8},r.settings||{});
  S.comptes=[];S.contacts=[];S.actions=[];S.cibles=[];S.mailing=[];S.plans=[];bump();
  (r.cibles||[]).forEach(x=>{S.cibles.push(absorbCible(Object.assign({},x,{id:x.id||uid()})));bump()});
  (r.mailing||[]).forEach(x=>{S.mailing.push(absorbMailing(mnorm(Object.assign({},x,{id:x.id||uid()}))));bump()});
  S.pac=(r.pac||[]).map(pnorm);ensurePlans();
  S.cibles.forEach(autoStage);bump();upgrade31();
}
/* Réparation légère au chargement : tout lien cassé est recréé */
function repairLinks(){
  S.cibles=S.cibles.map(c=>kOf(c.compteId)?c:absorbCible(c));bump();
  S.mailing.forEach(m=>{if(!kOf(m.compteId))absorbMailing(m)});
  const kids=new Set(S.comptes.map(k=>k.id));
  S.contacts.forEach(ct=>{if(!kids.has(ct.compteId)){const k=ensureCompte("Contacts sans compte");ct.compteId=k.id}});
  S.actions.forEach(a=>{if(!kids.has(a.compteId)){const k=ensureCompte("Actions sans compte");a.compteId=a.compteId&&kids.has(a.compteId)?a.compteId:k.id}});
  S.devis.forEach(d=>{if(!kids.has(d.compteId)){const k=ensureCompte("Devis sans compte");d.compteId=k.id}});
  S.cibles.forEach(c=>{const k=kOf(c.compteId);if(k&&c.compte!==k.nom)c.compte=k.nom});bump()}

/* ---------- Persistance (navigateur) ---------- */
function setSync(mode,txt){S.mode=mode;const a=$("#sync"),b=$("#syncTxt");if(a)a.dataset.s=mode;if(b)b.textContent=txt}
const snapshot=()=>({schema:SCHEMA,cibles:S.cibles,comptes:S.comptes,contacts:S.contacts,actions:S.actions,plans:S.plans,pac:S.pac,mailing:S.mailing,devis:S.devis,settings:S.settings});
let saveWarned=false;
function lsSave(){bump();
  if(STORE==="idb"){idbQueue();return true}
  const txt=JSON.stringify(snapshot());
  try{localStorage.setItem(LS_KEY,txt);if(S.mode==="warn"&&!saveWarned)setSync("local","Enregistré sur ce poste");return true}
  catch(e){
    /* Espace plein : la copie de l'ancienne version (déjà dans votre sauvegarde) est libérée en premier */
    try{if(localStorage.getItem(BK_KEY)){localStorage.removeItem(BK_KEY);localStorage.setItem(LS_KEY,txt);S.settings.copieV2Liberee=true;return true}}catch(_){}
    saveWarned=true;setSync("warn","Non enregistré");toast("Enregistrement impossible : l'espace du navigateur est plein. Faites une sauvegarde complète (Exporter).");return false}}
function commit(){lsSave();render()}
function put(coll,o){o.majLe=now();const L=S[coll],i=L.findIndex(x=>x.id===o.id);if(i>=0)L[i]=o;else L.push(o);bump();return o}
function drop(coll,id){S[coll]=S[coll].filter(x=>x.id!==id);bump()}
async function saveCible(c){const k=kOf(c.compteId)||ensureCompte(c.compte);c.compteId=k.id;c.compte=k.nom;put("cibles",c);commit();return true}
async function deleteCible(id){drop("cibles",id);S.actions.forEach(a=>{if(a.cibleId===id)a.cibleId=""});commit();return true}
async function saveSettings(){lsSave()}
async function savePac(p){if(!p.planId)p.planId=curPlan().id;put("pac",p);commit();return true}
async function deletePac(id){drop("pac",id);commit();return true}
async function bulkApply(saves,dels){const del=new Set(dels);S.cibles=S.cibles.filter(x=>!del.has(x.id));
  saves.forEach(c=>{const k=kOf(c.compteId)||ensureCompte(c.compte);c.compteId=k.id;c.compte=k.nom;c.majLe=now();const i=S.cibles.findIndex(x=>x.id===c.id);if(i>=0)S.cibles[i]=c;else S.cibles.push(c)});
  bump();commit();return true}
function dbErr(){toast("Enregistrement impossible pour le moment.");return false}
function applyRO(){}

function lsLoad(){
  let raw=null;try{raw=localStorage.getItem(LS_KEY)}catch(e){return {blocked:true}}
  if(!raw){ensurePlans();return {fresh:true}}
  let r;try{r=JSON.parse(raw)}catch(e){return {corrupt:true}}
  if(r&&r.storage==="idb"){ensurePlans();return {lost:true}}
  if(r&&r.schema===SCHEMA){
    S.cibles=(r.cibles||[]).map(norm);S.comptes=(r.comptes||[]).map(knorm);S.contacts=(r.contacts||[]).map(ctnorm);S.actions=(r.actions||[]).map(anorm);
    S.plans=Array.isArray(r.plans)?r.plans:[];S.pac=(r.pac||[]).map(pnorm);S.mailing=(r.mailing||[]).map(mnorm);S.devis=(r.devis||[]).map(dvnorm);S.settings=Object.assign({objectif:8},r.settings||{});
    bump();ensurePlans();repairLinks();if(upgrade31())lsSave();return {}}
  /* Données de la V2 : copie de sécurité conservée telle quelle, puis conversion */
  let copie=false;try{if(!localStorage.getItem(BK_KEY))localStorage.setItem(BK_KEY,raw);copie=true}catch(e){}
  migrateV2(r||{});
  S.settings.migrationV3={le:now(),cibles:S.cibles.length,comptes:S.comptes.length,contacts:S.contacts.length,actions:S.actions.length,mailing:S.mailing.length,pac:S.pac.length,copie,vu:false};
  const ok=lsSave();return {migrated:true,ok}}

async function init(){
  const st=await loadState();
  let ok=true;try{localStorage.setItem("pac-idf-test","1");localStorage.removeItem("pac-idf-test")}catch(e){ok=false}
  const b=$("#banner");
  if((!ok||st.blocked)&&STORE!=="idb"){setSync("warn","Non enregistré");b.hidden=false;b.className="notice warn";
    b.innerHTML="<b>Enregistrement bloqué.</b> Ce navigateur n'autorise pas l'enregistrement dans ce cadre : les saisies seront perdues à la fermeture. <a href=\""+location.href.split("#")[0]+"\" target=\"_blank\" rel=\"noopener\">Ouvrir l'application dans un onglet</a>."}
  else if(st.lost){setSync("warn","Données introuvables");b.hidden=false;b.className="notice warn";b.innerHTML="<b>Vos données ne sont plus dans ce navigateur</b> (base du navigateur vidée). Restaurez votre dernière sauvegarde complète : Exporter / sauvegarder, puis Restaurer."}
  else if(st.corrupt){setSync("warn","Données illisibles");b.hidden=false;b.className="notice warn";b.innerHTML="<b>Les données enregistrées sont illisibles.</b> Rien n'a été modifié. Restaurez votre dernière sauvegarde (Exporter / sauvegarder)."}
  else if(st.migrated&&!st.ok){b.hidden=false;b.className="notice warn";b.innerHTML="<b>Conversion non enregistrée</b> : l'espace du navigateur est plein. Vos données d'origine sont intactes. Faites une sauvegarde complète puis libérez de l'espace."}
  else setSync("local",IN_FRAME?"Enregistré sur ce poste · Notion":"Enregistré sur ce poste");
  routeFromHash();render();
  maybePacSeed();
}
