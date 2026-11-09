/* Registre · CSC — Historique clients et familles, stockage IndexedDB, gestion des plans, actions rapides, comptes rendus, tableau de bord personnalisable, bloc-notes, bilan d'activité
   Fichier 9/18 : les fichiers se chargent dans l'ordre et partagent leurs déclarations. */
"use strict";

/* ================= V3.1 · Antécédents de facturation, familles de clients, mailing → comptes ================= */
/* Pièces (factures, devis, commandes) stockées dans IndexedDB : volumineuses, ré-importables */
const IDB_NAME="pac-idf",IDB_STORE="histo";
let idbP=null;
function idb(){if(idbP)return idbP;idbP=new Promise((res,rej)=>{try{if(!window.indexedDB){rej(new Error("idb"));return}const r=indexedDB.open(IDB_NAME,2);r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains(IDB_STORE))db.createObjectStore(IDB_STORE);if(!db.objectStoreNames.contains("app"))db.createObjectStore("app")};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}catch(e){rej(e)}});idbP.catch(()=>{idbP=null});return idbP}
async function hGet(kid){try{const db=await idb();return await new Promise((res,rej)=>{const q=db.transaction(IDB_STORE).objectStore(IDB_STORE).get(kid);q.onsuccess=()=>res(q.result||[]);q.onerror=()=>rej(q.error)})}catch(e){return null}}
async function hPutMany(map){const db=await idb();await new Promise((res,rej)=>{const tx=db.transaction(IDB_STORE,"readwrite"),st=tx.objectStore(IDB_STORE);map.forEach((v,k)=>st.put(v,k));tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)})}
async function hDel(kid){try{const db=await idb();await new Promise(res=>{const tx=db.transaction(IDB_STORE,"readwrite");tx.objectStore(IDB_STORE).delete(kid);tx.oncomplete=res;tx.onerror=res})}catch(e){}}
async function hAll(){try{const db=await idb();return await new Promise((res,rej)=>{const out={},c=db.transaction(IDB_STORE).objectStore(IDB_STORE).openCursor();c.onsuccess=()=>{const cur=c.result;if(cur){out[cur.key]=cur.value;cur.continue()}else res(out)};c.onerror=()=>rej(c.error)})}catch(e){return null}}
async function hMove(src,dst){const a=await hGet(src);if(!a||!a.length)return;const b=await hGet(dst)||[];const seen=new Set(b.map(p=>p.n+"|"+p.d+"|"+p.m));
  await hPutMany(new Map([[dst,b.concat(a.filter(p=>!seen.has(p.n+"|"+p.d+"|"+p.m))).sort((x,y)=>String(y.d).localeCompare(String(x.d)))]]));await hDel(src);
  const k=kOf(dst),P=await hGet(dst);if(k&&P&&P.length){k.histo=Object.assign(hSum(P),{imp:(k.histo&&k.histo.imp)||todayISO()});lsSave();render()}}

/* Familles de clients (mêmes regroupements que les mails types) */
const FAMILLES=[["F1","Foncières, gestionnaires & prescripteurs",["Investisseur / Foncière","Prescripteur","Copropriété"]],["F2","Collectivités & acteurs publics",["Collectivité territoriale","État & établissement public"]],
 ["F3","Bailleurs sociaux (hors contrat cadre)",["Bailleur social"]],["F4","Entreprises occupantes",["Industrie","Commerce & distribution","Hôtellerie, restauration & loisirs","Tertiaire & services","Banque & assurance","Énergie, eau & télécom","Transport & mobilité"]],
 ["F5","Santé, enseignement & associatif",["Santé & médico-social","Enseignement & recherche","Associatif & cultuel"]],["F6","Promoteurs, aménageurs & entreprises de travaux",["Promoteur / Aménageur","Entreprise BTP & services techniques"]]];
const FNOM=Object.fromEntries(FAMILLES.map(f=>[f[0],f[1]]));
const SEG2FAM={"Industriel":"F4","Logistique / entrepôts":"F4","Tertiaire / bureaux":"F4","Bailleur social":"F3","Foncière / investisseur":"F1","Promoteur":"F6","Syndic / administrateur de biens":"F1","Property / facility management":"F1","Collectivité / établissement public":"F2","Maîtrise d'œuvre / architecte / BET":"F1","Entreprise de travaux (prescripteur)":"F6","Expert d'assurance / après sinistre":"F1"};
const FAM_BY_TYPO={};FAMILLES.forEach(([c,,t])=>t.forEach(x=>{FAM_BY_TYPO[nh(x)]=c}));
function famOf(k){if(!k)return "";if(k.famille&&FNOM[k.famille])return k.famille;return famAuto(k)}
/* Famille déduite (typologie, liste de mailing, segment), utilisée tant qu'aucune famille n'est choisie sur le compte */
function famAuto(k){if(!k)return "";const t=FAM_BY_TYPO[nh(k.typologie)];if(t)return t;
  const ml=mlOf(k.id).find(m=>m.famille);if(ml){const f=FAMILLES.find(x=>nh(x[1])===nh(ml.famille));if(f)return f[0]}
  return SEG2FAM[k.segment]||""}

/* Pièces : étapes du logiciel de facturation */
const ETP={"FACTURE COMPTABILISEE":"FC","FACTURE VALIDEE":"FV","FACTURE":"FA","FACTURE D'AVOIR":"AV","DEVIS":"DV","DEVIS REJETE":"DR","COMMANDE":"CO","BON DE LIVRAISON":"BL","PROFORMA":"PF","DEMANDE D'AVOIR":"DA"};
const ETL={FC:"Facture",FV:"Facture validée",FA:"Facture",AV:"Avoir",DV:"Devis",DR:"Devis rejeté",CO:"Commande",BL:"Bon de livraison",PF:"Proforma",DA:"Demande d'avoir",X:"Autre"};
const ETT={FC:"ok",FV:"ok",FA:"ok",AV:"grey",DV:"warn",DR:"bad",CO:"info",BL:"info",PF:"info",DA:"grey",X:"grey"};
const isFact=e=>e==="FC"||e==="FV"||e==="FA"||e==="AV";
const HST={actif:["Client actif","ok"],nouveau:["Nouveau client","info"],relance:["Perdu ? pièce sans facture cette année","warn"],perdu:["Perdu : facturé l'an dernier, rien cette année","bad"],devis:["Devis sans facture","grey"],cmd:["Commande en cours, pas encore facturée","info"]};
/* Résumé des antécédents : CA facturé par année (avoirs déduits), toutes pièces, devis en attente, statut */
function hSum(P){const Y=new Date().getFullYear(),y1=String(Y),y0=String(Y-1),ans={},vc={},dc={},lim=addD(todayISO(),-365),r2=x=>Math.round(x*100)/100;
  let first="",last="",lastP="";const dv={n:0,m:0,d:""},co={n:0,m:0};
  P.forEach(p=>{const y=String(p.d||"").slice(0,4);if(!y)return;const a=ans[y]||(ans[y]={ca:0,nf:0,tp:0,np:0}),m=Number(p.m)||0;a.tp+=m;a.np++;
    if(isFact(p.e)){a.ca+=m;if(p.e!=="AV")a.nf++;if(m>0){if(!first||p.d<first)first=p.d;if(p.d>last)last=p.d}}
    if(p.d>lastP)lastP=p.d;
    if(p.e==="DV"&&p.d>=lim){dv.n++;dv.m+=m;if(p.d>dv.d)dv.d=p.d}
    if((p.e==="CO"||p.e==="BL"||p.e==="PF")&&y===y1){co.n++;co.m+=m}
    if(p.v)vc[p.v]=(vc[p.v]||0)+1;const dp=cpDept(p.cp);if(dp)dc[dp]=(dc[dp]||0)+1});
  Object.values(ans).forEach(a=>{a.ca=r2(a.ca);a.tp=r2(a.tp)});
  const A0=ans[y0]||{},A1=ans[y1]||{},f0=A0.nf>0,f1=A1.nf>0;
  const st=f1?(A0.np?"actif":"nouveau"):f0?(A1.np?"relance":"perdu"):(co.n?"cmd":"devis");
  return {ans,first,last,lastP,dv:{n:dv.n,m:r2(dv.m),d:dv.d},co:{n:co.n,m:r2(co.m)},st,villes:Object.entries(vc).sort((a,b)=>b[1]-a[1]).slice(0,3).map(x=>x[0]),dept:(Object.entries(dc).sort((a,b)=>b[1]-a[1])[0]||[""])[0],nb:P.length,y0,y1}}
const hCA=(k,y)=>{const h=k&&k.histo;if(!h)return 0;const a=h.ans[y||h.y1];return a?a.ca:0};

/* ---------- Mailing : un mail coché « envoyé » = un compte client + une action Mail dans son historique ---------- */
function syncMailAction(m){
  const ex=S.actions.find(a=>a.mailingId===m.id);
  if(!m.envoye){if(ex&&ex.origine==="mailing"){S.actions=S.actions.filter(a=>a!==ex);bump()}return}
  absorbMailing(m);const k=kOf(m.compteId);if(k&&k.type!=="Client existant"){k.type="Client existant";k.majLe=now()}
  const t=mTpl(m),ob="Mailing « "+(m.liste||"clients")+" »"+(t&&t.objet?" : "+t.objet:"");
  if(ex){ex.date=m.dateEnvoi||ex.date;ex.contactId=m.contactId||ex.contactId;ex.compteId=m.compteId;ex.details=m.commentaire||"";ex.majLe=now()}
  else S.actions.push(anorm({id:uid(),compteId:m.compteId,contactId:m.contactId||"",type:"mail",date:m.dateEnvoi||todayISO(),statut:"fait",resultat:"Envoyé",objet:ob,details:m.commentaire||"",faitLe:m.dateEnvoi||todayISO(),mailingId:m.id,origine:"mailing",creeLe:now(),majLe:now()}));
  bump()}

/* ---------- PAC : un plan par famille de clients ---------- */
function famLines(code){const Y=new Date().getFullYear(),y0=Y-1,y1=Y,fam=FNOM[code]||"",low=fam.charAt(0).toLowerCase()+fam.slice(1);
  const L=[{prio:"1",element:"Reconquête des clients perdus",objectif:"Faire revenir les clients de la famille facturés en "+y0+" sans commande en "+y1+" ("+low+")",
    descriptif:"Liste issue de l'historique de facturation : filtre « Clients perdus » de l'onglet Comptes, classé par CA. Comprendre la raison de l'arrêt (prix, concurrent, absence de besoin, interlocuteur parti) et proposer une reprise de contact ciblée.",
    t1:"Extraire les clients perdus de la famille, classés par CA\nAppeler les premiers comptes et qualifier la raison de l'arrêt",t2:"RDV avec les comptes au plus fort potentiel\nProposition adaptée (BPU, délais, interlocuteur dédié)",
    t3:"Relance des comptes restés sans suite\nMailing de reprise de contact",t4:"Bilan : comptes réactivés, CA récupéré, motifs de perte",
    qui:"CSC + chefs d'agence + apporteurs",quand:"T1 à T4, point mensuel",kpi:"Clients perdus contactés, RDV, devis émis, comptes réactivés, CA récupéré",attendus:"Réactivation des principaux comptes perdus et motifs de perte connus"},
   {prio:"2",element:"Fidélisation et développement des clients actifs",objectif:"Augmenter le CA par client et sécuriser les comptes récurrents",
    descriptif:"Mailing aux clients "+y0+"-"+y1+" (mail type de la famille), relance à 15 jours, RDV annuel avec les principaux comptes, proposition des diagnostics pas encore commandés, suivi des devis en attente.",
    t1:"Envoi du mailing et relances\nRDV annuel avec les principaux comptes",t2:"Proposer les diagnostics complémentaires\nRelancer les devis en attente",t3:"Point qualité : délais, rapports, interlocuteurs",t4:"Revue annuelle des comptes, préparation de l'année suivante",
    qui:"CSC + chefs d'agence",quand:"T1 à T4",kpi:"Mails envoyés, relances, RDV, devis en attente relancés, CA par client",attendus:"Hausse du CA moyen par client et du taux de transformation des devis"}];
  const S2={
   F1:[{prio:"1",element:"Copropriétés et syndics",objectif:"Capter les obligations des copropriétés : DPE collectif, DTA des parties communes, repérages avant travaux",descriptif:"Le DPE collectif s'impose à toutes les copropriétés, par étapes selon leur taille. Les syndics gèrent aussi les DTA des parties communes et les repérages avant les travaux votés en AG : s'appuyer sur les syndics déjà clients pour couvrir leur portefeuille.",
     t1:"Recenser les syndics clients et le nombre de copropriétés gérées\nPrésenter une offre portefeuille (DPE collectif + DTA)",t2:"Interventions en conseil syndical sur demande\nTarif par lot pour le DPE collectif",t3:"Programmer les diagnostics avant les AG de printemps",t4:"Bilan des copropriétés traitées, relance des syndics inactifs",qui:"CSC + chefs d'agence",quand:"T1 à T4",kpi:"Syndics rencontrés, copropriétés couvertes, DPE collectifs et DTA commandés, CA",attendus:"Accords de travail avec plusieurs syndics et flux régulier de copropriétés"},
    {prio:"2",element:"Foncières et gestionnaires d'actifs",objectif:"Se référencer chez les foncières, asset et property managers",descriptif:"DTA et mises à jour, repérages avant travaux preneurs, DPE tertiaire, diagnostics avant cession d'actifs ou de portefeuilles (data room).",
     t1:"Cartographier les foncières et gestionnaires clients et leurs patrimoines",t2:"RDV directions techniques et property managers\nInscriptions sur les plateformes prestataires",t3:"Réponses aux consultations et BPU\nOffre data room pour les cessions",t4:"Revue annuelle avec les comptes signés",qui:"CSC + chefs d'agence",quand:"T1 à T4, revue trimestrielle",kpi:"Foncières rencontrées, référencements et contrats-cadres signés, volume de commandes, CA",attendus:"Contrats-cadres récurrents sur les grands patrimoines"}],
   F2:[{prio:"1",element:"Marchés publics",objectif:"Être titulaire des accords-cadres de diagnostics des collectivités clientes",descriptif:"Veille des avis de marché (BOAMP, profils acheteurs), réponse avec la cellule AO, suivi des échéances des marchés en cours chez les clients pour être consulté au renouvellement.",
     t1:"Recenser les marchés en cours et leurs échéances\nMettre en place la veille AO",t2:"Réponses aux consultations\nRDV avec les services patrimoine",t3:"Bons de commande : réactivité et qualité des rendus",t4:"Bilan des marchés gagnés et perdus, préparation des renouvellements",qui:"CSC + cellule AO + chefs d'agence",quand:"T1 à T4",kpi:"AO répondus, AO gagnés, montant des marchés, bons de commande reçus",attendus:"Marchés à bons de commande sur plusieurs collectivités"},
    {prio:"2",element:"Patrimoine scolaire et bâtiments publics",objectif:"Anticiper les travaux d'été et les mises à jour des DTA",descriptif:"Écoles, gymnases, équipements culturels : repérages amiante et plomb avant les travaux programmés pendant les vacances scolaires, DTA à mettre à jour, PEMD avant démolition.",
     t1:"Récupérer les programmes de travaux d'été des collectivités clientes",t2:"Chiffrer et planifier les repérages avant fin mai",t3:"Interventions pendant l'été, rendus rapides",t4:"Bilan et calendrier de l'année suivante",qui:"CSC + chefs d'agence",quand:"T1 à T3",kpi:"Programmes récupérés, repérages commandés avant l'été, délais de rendu",attendus:"Commandes groupées avant l'été"}],
   F3:[{prio:"1",element:"Avant relocation et avant vente",objectif:"Devenir le prestataire des diagnostics de rotation des logements",descriptif:"DPE, amiante (DAPP), plomb (CREP), électricité et gaz à chaque relocation ou vente : volume régulier, délais courts. Proposer un BPU et un circuit de commande simple avec les agences de gestion.",
     t1:"Identifier les bailleurs hors contrat cadre et leurs agences de gestion",t2:"Proposer un BPU relocation / vente avec délai garanti",t3:"Suivi des délais et de la qualité des rendus",t4:"Revue annuelle, extension à d'autres agences",qui:"CSC + chefs d'agence",quand:"T1 à T4",kpi:"Bailleurs rencontrés, BPU signés, logements traités, délais",attendus:"Flux régulier de diagnostics de rotation"},
    {prio:"2",element:"Réhabilitation et démolition",objectif:"Être consulté sur les programmes de réhabilitation et de renouvellement urbain",descriptif:"Repérages amiante et plomb avant travaux, PEMD avant démolition, accompagnement des plans stratégiques de patrimoine et des opérations de renouvellement urbain.",
     t1:"Récupérer les plans de réhabilitation et les opérations prévues",t2:"Présentation aux directions du patrimoine et de la maîtrise d'ouvrage",t3:"Réponses aux consultations",t4:"Bilan, préparation des programmes suivants",qui:"CSC + chefs d'agence",quand:"T1 à T4",kpi:"Opérations identifiées, consultations reçues, devis, CA",attendus:"Présence sur les opérations de réhabilitation des bailleurs clients"}],
   F4:[{prio:"1",element:"Sites industriels et tertiaires",objectif:"Ouvrir des comptes récurrents sur les diagnostics avant travaux et de maintenance",descriptif:"DTA à jour, repérages amiante avant travaux et arrêts techniques, plomb, DPE tertiaire. Cibler les responsables travaux, maintenance et HSE des sites.",
     t1:"Lister les sites clients par département et identifier les responsables travaux / HSE",t2:"Visites ciblées avec les chefs d'agence",t3:"Proposer un BPU ou un accord annuel\nAnticiper les arrêts techniques d'été",t4:"Bilan des comptes ouverts",qui:"CSC + chefs d'agence",quand:"T1 à T4",kpi:"Sites visités, BPU proposés, devis, CA",attendus:"Comptes récurrents sur les principaux sites"},
    {prio:"2",element:"Synergies avec les autres BU",objectif:"Croiser les clients avec ceux des autres BU du groupe",descriptif:"Identifier les clients communs avec les BU Équipements, Environnement et Construction ; visites communes ; présentation de l'offre diagnostic en Café Commerce et en réunion inter-BU.",
     t1:"Croiser les listes clients avec les apporteurs des autres BU",t2:"Visites communes",t3:"Suivi des opportunités transmises",t4:"Bilan des affaires apportées par BU",qui:"CSC + apporteurs des autres BU",quand:"T1 à T4, réunion inter-BU mensuelle",kpi:"Clients communs identifiés, visites communes, opportunités apportées, CA",attendus:"Flux d'affaires régulier avec les autres BU"}],
   F5:[{prio:"1",element:"Établissements recevant du public",objectif:"Couvrir les obligations des établissements : DTA, plomb, avant travaux",descriptif:"Établissements de santé et médico-sociaux, enseignement privé et supérieur, associations et lieux de culte : DTA à jour, repérages avant travaux, plomb dans les bâtiments anciens.",
     t1:"Recenser les établissements clients et leurs gestionnaires (directions techniques, économats)",t2:"Proposer la mise à jour des DTA et un tarif multi-sites",t3:"Repérages avant travaux d'été",t4:"Bilan, programmation de l'année suivante",qui:"CSC + chefs d'agence",quand:"T1 à T4",kpi:"Établissements rencontrés, DTA mis à jour, repérages, CA",attendus:"Accords multi-sites avec les principaux gestionnaires"},
    {prio:"2",element:"Calendrier des travaux d'été",objectif:"Être retenu avant les vacances scolaires",descriptif:"Les travaux des établissements d'enseignement et de nombreux ERP se concentrent l'été : capter les besoins de repérage dès le printemps.",
     t1:"Mailing et appels : recueillir les programmes de travaux",t2:"Devis et planification avant fin mai",t3:"Interventions en juillet-août",t4:"Retour d'expérience et relance pour l'année suivante",qui:"CSC + chefs d'agence",quand:"T1 à T3",kpi:"Programmes recueillis, devis émis avant fin mai, interventions réalisées",attendus:"Planning d'été rempli dès le printemps"}],
   F6:[{prio:"1",element:"Promoteurs et aménageurs",objectif:"Accompagner les opérations dès l'acquisition foncière",descriptif:"Diagnostics avant acquisition, amiante avant démolition, plomb, PEMD. S'appuyer sur les clients promoteurs de la BU Construction.",
     t1:"Identifier les opérations en cours avec la BU Construction",t2:"RDV directions techniques et de programmes\nProposer un BPU promoteur",t3:"Offre « avant acquisition / avant démolition »",t4:"Bilan des référencements",qui:"CSC + apporteurs BU Construction",quand:"T1 à T4",kpi:"Promoteurs rencontrés, opérations suivies, devis, CA",attendus:"Référencement chez plusieurs promoteurs"},
    {prio:"2",element:"Entreprises de travaux",objectif:"Faire prescrire le repérage avant intervention par les entreprises de travaux",descriptif:"Étancheurs, couvreurs, désamianteurs, entreprises générales : le repérage amiante avant intervention est obligatoire. Proposer des contrats-cadres sur le modèle du contrat étancheurs.",
     t1:"Lister les entreprises clientes et leurs conducteurs de travaux",t2:"Présenter le contrat-cadre et un délai garanti",t3:"Suivi des chantiers et réactivité",t4:"Bilan des contrats signés",qui:"CSC + chefs d'agence",quand:"T1 à T4",kpi:"Entreprises rencontrées, contrats-cadres signés, chantiers traités, CA",attendus:"Contrats-cadres actifs avec plusieurs entreprises"}]};
  return L.concat(S2[code]||[])}
function ensureFamilyPlans(force){if(S.settings.pacFamilles&&!force)return 0;let n=0;
  const Y=new Date().getFullYear(),per=String(new Date().getMonth()>=9?Y+1:Y);
  FAMILLES.forEach(([code,nom])=>{if(S.plans.some(p=>p.famille===code))return;
    const p={id:uid(),nom:nom,axe:"famille",famille:code,titre:"Plan d'action commercial · "+nom,periode:per,ordre:S.plans.length+1,creeLe:now()};S.plans.push(p);
    famLines(code).forEach((l,j)=>S.pac.push(Object.assign(pblank(),l,{id:uid(),planId:p.id,ordre:j+1,creeLe:now(),majLe:now()})));n++});
  S.settings.pacFamilles=true;bump();return n}
/* Indicateurs d'une famille : comptes, CA par année, perdus, devis en attente, mailing, actions, opportunités */
function famStats(code){const K=S.comptes.filter(k=>famOf(k)===code),ids=new Set(K.map(k=>k.id)),Y=new Date().getFullYear(),y0=String(Y-1),y1=String(Y);
  const o={k:K.length,ctr:0,ca0:0,ca1:0,n0:0,n1:0,perdus:0,caPerdu:0,dvN:0,dvM:0,histo:0};
  K.forEach(k=>{if(k.contrat)o.ctr++;const h=k.histo;if(!h)return;o.histo++;const a0=h.ans[y0]||{},a1=h.ans[y1]||{};if(a0.nf){o.ca0+=a0.ca;o.n0++}if(a1.nf){o.ca1+=a1.ca;o.n1++}
    if(h.st==="perdu"||h.st==="relance"){o.perdus++;o.caPerdu+=a0.ca||0}o.dvN+=h.dv.n;o.dvM+=h.dv.m});
  const ML=S.mailing.filter(m=>ids.has(m.compteId));o.ml=ML.length;o.sent=ML.filter(m=>m.envoye).length;o.rel=relancesDues().filter(m=>ids.has(m.compteId)).length;
  const A=S.actions.filter(a=>ids.has(a.compteId)&&a.origine!=="mailing");o.rdv=A.filter(a=>isRdv(a.type)&&a.statut==="fait").length;o.appels=A.filter(a=>a.type==="appel"&&a.statut==="fait").length;o.open=A.filter(isOpen).length;
  const C=S.cibles.filter(c=>ids.has(c.compteId)&&c.opp.creee);o.opps=C.length;o.oppM=C.reduce((s,c)=>s+(Number(c.opp.montant)||0),0);o.y0=y0;o.y1=y1;return o}
function famPanel(code){const s=famStats(code),t=(l,v,d,act)=>'<button type="button" class="kpi click"'+(act||"")+'><span class="lbl">'+l+'</span><span class="v">'+v+'</span><span class="d">'+d+'</span></button>';
  return '<div class="kpis6">'+t("Comptes de la famille",s.k,(s.ctr?s.ctr+" en contrat cadre · ":"")+pl(s.histo,"avec antécédents","avec antécédents"),' data-famgo="'+code+'"')+
   t("CA facturé "+s.y0,eur(s.ca0),pl(s.n0,"client facturé","clients facturés"),' data-famgo="'+code+'"')+
   t("CA facturé "+s.y1+" à date",eur(s.ca1),pl(s.n1,"client facturé","clients facturés"),' data-famgo="'+code+'"')+
   t("Clients perdus",s.perdus,eur(s.caPerdu)+" facturés en "+s.y0,' data-famgo="'+code+'" data-kvset="perdus"')+
   t("Devis en attente",s.dvN,eur(s.dvM)+" sur 12 mois",' data-famgo="'+code+'" data-kvset="devis"')+
   t("Actions",s.sent+" / "+s.ml,"mails envoyés · "+pl(s.rdv,"RDV")+" · "+pl(s.appels,"appel")+" · "+s.open+" à faire",' data-famgo="'+code+'"')+'</div>'+
   (s.histo?'':'<div class="notice">Les chiffres de facturation apparaîtront après l\'import de l\'historique clients (Comptes › Importer › Historique clients).</div>')}

/* ---------- Import de l'historique clients (export de facturation) ---------- */
const BILLING=/^(factur|compta|invoice|fournisseur|supplier|yooz|basware|dematerial|achats?[._-]|ap[._-]|accounts?|scan|edi|noreply|no-reply)/i;
let HIMP=null;
async function parseHisto(file){const book=await openBook(file);const out={pieces:[],clients:new Map(),contacts:[],contrats:new Set(),types:null,sheets:[],fname:file.name};
  for(const sh of book.sheets){if(sh.state&&sh.state!=="visible"&&book.sheets.length>1)continue;const rows=await book.load(sh);if(!rows.length)continue;
    let h=-1,H=null;for(let i=0;i<Math.min(rows.length,12);i++){const hd=Array.from(rows[i],v=>nh(cellVal(v)));if((hd.includes("tiers")&&hd.includes("etape wf"))||hd.includes("client tiers")||hd.includes("compte nom exact")||(hd.includes("famille")&&hd.includes("objet"))){h=i;H=hd;break}}
    if(h<0)continue;
    const col=(...n)=>{for(const x of n){const i=H.indexOf(x);if(i>=0)return i}return -1};
    const g=(r,i)=>{if(i<0)return "";const v=cellVal(r[i]);return v==null?"":v};
    const s=(r,i)=>{const v=g(r,i);return v instanceof Date?toISO(v):String(v).trim()};
    if(H.includes("etape wf")){
      const iT=col("tiers"),iD=col("date"),iE=col("etape wf"),iM=col("total ht"),iV=col("ville"),iCP=col("cp"),iN=col("n de piece"),iA=col("adresse de l intervention"),iAp=col("apporteur d affaire"),iAg=col("agence"),iC=col("nom"),iCt=col("contact"),iTe=col("technicien");
      let n=0;for(let r=h+1;r<rows.length;r++){const R=rows[r]||[];const t=s(R,iT);if(!t)continue;const e=ETP[String(g(R,iE)).trim().toUpperCase()]||"X";
        out.pieces.push({t,d:toISO(g(R,iD)),e,m:Number(toNum(g(R,iM)))||0,v:s(R,iV),cp:s(R,iCP),n:s(R,iN),a:s(R,iA),ap:s(R,iAp).replace(/^-$/,""),ag:s(R,iAg),c:s(R,iC)||s(R,iCt).replace(/\S+@\S+/,"").replace(/^[.\s]+$/,"").trim(),te:s(R,iTe)});n++}
      out.sheets.push([sh.name,"pièces",n]);continue}
    if(H.includes("compte nom exact")){const i=col("compte nom exact");let n=0;for(let r=h+1;r<rows.length;r++){const v=s(rows[r]||[],i);if(v){out.contrats.add(nh(v));n++}}out.sheets.push([sh.name,"contrats cadres",n]);continue}
    if(!H.includes("client tiers")){const t=mParseTypes(rows);if(t){out.types=t;out.sheets.push([sh.name,"mails types",t.length])}continue}
    const iT=col("client tiers"),iTy=col("typologie"),iSt=col("sous typologie"),iF=col("fiabilite"),iAg=col("agence principale"),iAp=col("apporteur d affaire principal","apporteur principal"),
      iCP=col("contact principal"),iMP=col("e mail contact principal"),iC=col("contact"),iMl=col("e mail"),iNF=col("nb factures"),iCA=col("ca ht 2026","ca ht facture 2026"),iDF=col("derniere facture"),iPr=col("prenom"),iNo=col("nom");
    let n=0;for(let r=h+1;r<rows.length;r++){const R=rows[r]||[];const t=s(R,iT);if(!t)continue;const k=nh(t);let c=out.clients.get(k);if(!c){c={nom:t};out.clients.set(k,c)}
      [["typologie",iTy],["sousTypo",iSt],["fiab",iF],["agence",iAg],["apporteur",iAp]].forEach(([f,i])=>{const v=s(R,i);if(v&&v!=="-"&&!c[f])c[f]=v});
      if(iCP>=0){const nm=s(R,iCP),ml=s(R,iMP);if((nm||ml)&&!c.princ)c.princ={nom:nm,mail:ml}}
      if(iC>=0){const nm=(s(R,iC)||[s(R,iPr),s(R,iNo)].filter(Boolean).join(" ")).replace(/^[.\s]+$/,""),ml=s(R,iMl);if(nm||ml)out.contacts.push({k,nom:nm,mail:ml,nf:s(R,iNF),ca:s(R,iCA),df:toISO(g(R,iDF))})}
      n++}
    out.sheets.push([sh.name,"clients",n])}
  /* clients présents seulement dans les pièces */
  out.pieces.forEach(p=>{const k=nh(p.t);if(!out.clients.has(k))out.clients.set(k,{nom:p.t})});
  if(!out.pieces.length&&!out.clients.size)throw new Error("vide");
  return out}
function histoMenu(){
  const d=$("#drawer");HIMP=null;const last=S.settings.histoImport;
  d.innerHTML='<div class="dh"><div class="grow"><span class="lbl">Comptes</span><h2 id="dTitle">Importer</h2></div><button class="btn ghost" type="button" data-act="close">Fermer</button></div>'+
  '<div class="db"><div class="addv" style="border-style:solid;background:var(--surface)"><span class="lbl">Historique clients (export de facturation)</span>'+
   '<p class="hint">Le classeur d\'analyse des clients facturés : onglets de pièces (factures, devis, commandes), clients typés, contacts clients, contrats cadres et mails types. Pour chaque client : le compte est créé ou complété (type « Client existant », typologie, famille, agence, apporteur, contrat cadre), ses contacts sont ajoutés et ses antécédents calculés : CA facturé par année, devis en attente, commandes en cours, statut (actif, nouveau, perdu).</p>'+
   '<p class="hint">Rien n\'est supprimé : vos comptes, contacts, actions et cibles sont conservés. Un nouvel import remplace seulement les antécédents par ceux du fichier.'+(last?' Dernier import : '+new Date(last.le).toLocaleDateString("fr-FR")+' · '+esc(last.fichier||"")+'.':'')+'</p>'+
   '<input type="file" id="hiFile" accept=".xlsx"><div id="hiPrev"></div></div>'+
  '<div class="addv"><span class="lbl">Cibles de prospection</span><p class="hint">Une liste de clients ou de prospects à travailler en campagne (Excel ou CSV, une ligne par entreprise).</p><div class="bar"><button class="btn" type="button" id="btnImpCib">Importer des cibles</button></div></div></div>';
  $("#scrim").hidden=false;d.hidden=false;
  $("#btnImpCib").onclick=()=>importMenu();
  $("#hiFile").onchange=async e=>{const f=e.target.files[0];if(!f)return;const pv=$("#hiPrev");pv.innerHTML='<p class="hint">Lecture du fichier… (quelques secondes pour un gros classeur)</p>';
    try{HIMP=await parseHisto(f);drawHistoPrev()}catch(err){console.error(err);pv.innerHTML='<div class="notice warn"><b>Aucune donnée reconnue.</b> Il faut des onglets avec une colonne « Client (Tiers) » ou des pièces (« Tiers », « Etape WF », « Total HT »).</div>'}};
}
function drawHistoPrev(){const H=HIMP,pv=$("#hiPrev");
  const ty={};H.clients.forEach(c=>{const t=c.typologie||"Sans typologie";ty[t]=(ty[t]||0)+1});
  const exDef=t=>/^(interne|particulier)/i.test(t);
  let nEx=0;H.clients.forEach(c=>{if(findCompte(c.nom))nEx++});
  const years={};H.pieces.forEach(p=>{const y=String(p.d).slice(0,4);if(y)years[y]=(years[y]||0)+1});
  pv.innerHTML='<div style="display:flex;flex-direction:column;gap:12px;margin-top:8px">'+
   '<p class="hint">'+esc(H.fname)+' · '+H.sheets.map(x=>esc(x[0])+' ('+x[2]+' '+x[1]+')').join(" · ")+'</p>'+
   '<div class="imp-sum"><div><b>'+H.clients.size+'</b><span class="sub">clients</span></div><div><b>'+nEx+'</b><span class="sub">déjà dans l\'appli</span></div><div><b>'+H.pieces.length+'</b><span class="sub">pièces ('+Object.entries(years).sort().map(([y,n])=>y+" : "+n).join(", ")+')</span></div><div><b>'+H.contacts.length+'</b><span class="sub">lignes de contacts</span></div><div><b>'+H.contrats.size+'</b><span class="sub">contrats cadres</span></div></div>'+
   '<div class="f"><span class="lbl">Typologies à importer</span><div class="checks" id="hiTy">'+Object.entries(ty).sort((a,b)=>b[1]-a[1]).map(([t,n])=>'<label><input type="checkbox" data-hity value="'+esc(t)+'"'+(exDef(t)?'':' checked')+'>'+esc(t)+' · '+n+'</label>').join("")+'</div><p class="hint">Particuliers et facturation interne sont décochés par défaut : ils ne sont pas des comptes à prospecter. Les comptes déjà présents dans l\'appli sont toujours complétés.</p></div>'+
   '<div class="bar"><button class="btn primary" type="button" id="hiGo">Importer l\'historique</button></div></div>';
  $("#hiGo").onclick=histoApply}
async function histoApply(){const H=HIMP;if(!H)return;const btn=$("#hiGo");btn.disabled=true;btn.textContent="Import en cours…";
  await new Promise(r=>setTimeout(r,30));
  const keep=new Set([...document.querySelectorAll("#hiTy input:checked")].map(i=>i.value));
  const byK=new Map();H.pieces.forEach(p=>{const k=nh(p.t);let l=byK.get(k);if(!l)byK.set(k,l=[]);l.push(p)});
  const store=new Map(),done=new Map();let nNew=0,nUpd=0,nSkip=0;const c0=S.contacts.length;
  H.clients.forEach((c,k)=>{let acc=findCompte(c.nom);
    if(!acc&&!keep.has(c.typologie||"Sans typologie")){nSkip++;return}
    const isNew=!acc;if(!acc)acc=ensureCompte(c.nom,{origine:"historique"});
    const P=(byK.get(k)||[]).map(p=>{const o=Object.assign({},p);delete o.t;return o}).sort((a,b)=>String(b.d).localeCompare(String(a.d)));
    if(P.some(p=>isFact(p.e))||mlOf(acc.id).length)acc.type="Client existant";else if(isNew)acc.type="Prospect";
    if(c.typologie&&(!acc.typologie||/^à qualifier$/i.test(acc.typologie)))acc.typologie=c.typologie;
    if(c.sousTypo)acc.sousTypo=c.sousTypo;if(c.fiab)acc.fiab=c.fiab;
    if(c.agence&&!acc.agence)acc.agence=c.agence;if(c.apporteur&&!acc.apporteur)acc.apporteur=c.apporteur;
    acc.contrat=H.contrats.has(k);
    if(P.length){acc.histo=Object.assign(hSum(P),{imp:todayISO()});store.set(acc.id,P);if(!acc.dept&&acc.histo.dept)acc.dept=acc.histo.dept}
    acc.majLe=now();done.set(k,acc);
    if(c.princ&&(c.princ.nom||c.princ.mail)&&!BILLING.test(c.princ.mail||"")){const ct=ensureContact(acc.id,c.princ);if(!ctOf(acc.id).some(x=>x.principal&&x.id!==ct.id))ct.principal=true}
    isNew?nNew++:nUpd++});
  bump();
  H.contacts.forEach(x=>{const acc=done.get(x.k);if(!acc)return;if(x.mail&&BILLING.test(x.mail))return;if(!x.nom&&!x.mail)return;
    const ct=ensureContact(acc.id,{nom:x.nom,mail:x.mail});
    const info=[x.nf?pl(Number(x.nf)||0,"facture"):"",x.ca&&Number(toNum(x.ca))?eur(toNum(x.ca))+" HT":"",x.df?"dernière facture le "+fdate(x.df):""].filter(Boolean).join(" · ");
    if(info&&!ct.notes)ct.notes="Facturation "+new Date().getFullYear()+" : "+info});
  try{if(store.size)await hPutMany(store)}catch(e){toast("Antécédents détaillés non enregistrés (stockage du navigateur indisponible) : les totaux sont conservés.")}
  if(H.types&&H.types.length)S.settings.mailTypes=H.types;
  const np=ensureFamilyPlans();
  S.settings.histoImport={le:now(),fichier:H.fname,clients:done.size,pieces:H.pieces.length};
  bump();lsSave();HIMP=null;closeDrawer();UI.kv.v="tous";uiSave();showTab("comptes");
  toast(pl(nNew,"compte créé","comptes créés")+" · "+pl(nUpd,"compte complété","comptes complétés")+" · "+pl(S.contacts.length-c0,"contact ajouté","contacts ajoutés")+(nSkip?" · "+nSkip+" ignorés (typologies décochées)":"")+(np?" · "+pl(np,"PAC")+" par famille":""))}

/* Antécédents dans la fiche compte */
function histoHead(k){const h=k.histo;if(!h)return '<p class="hint">Aucun antécédent de facturation pour ce compte'+(S.settings.histoImport?'.':' : importez l\'historique clients (Comptes › Importer › Historique clients).')+'</p>';
  const a0=h.ans[h.y0]||{},a1=h.ans[h.y1]||{},st=HST[h.st]||["",""];
  return '<div class="acc-stats" style="grid-template-columns:repeat(4,minmax(0,1fr))"><div><b>'+eur(a0.ca||0)+'</b><span>CA facturé '+h.y0+' · '+pl(a0.nf||0,"facture")+'</span></div><div><b>'+eur(a1.ca||0)+'</b><span>CA facturé '+h.y1+' à date · '+pl(a1.nf||0,"facture")+'</span></div>'+
    '<div><b class="'+(h.dv.n?'late':'')+'" style="'+(h.dv.n?'color:var(--warn)':'')+'">'+(h.dv.n?eur(h.dv.m):"—")+'</b><span>'+(h.dv.n?pl(h.dv.n,"devis en attente","devis en attente")+(h.dv.d?' · dernier le '+fdate(h.dv.d):''):'Aucun devis en attente')+'</span></div>'+
    '<div><b>'+(h.last?fdate(h.last):"—")+'</b><span>Dernière facture'+(h.first?' · 1re le '+fdate(h.first):'')+'</span></div></div>'+
    '<div class="acc-tags" style="margin-top:8px"><span class="pill tone-'+st[1]+'">'+esc(st[0])+'</span>'+(k.contrat?'<span class="tag bu">Contrat cadre</span>':'<span class="tag">Gré à gré</span>')+(h.co.n?'<span class="sub">'+pl(h.co.n,"commande")+' en cours ('+eur(h.co.m)+')</span>':'')+(h.villes.length?'<span class="sub">Interventions : '+esc(h.villes.join(", "))+'</span>':'')+(k.fiab?'<span class="sub">· classement '+esc(k.fiab.toLowerCase())+'</span>':'')+'</div>'}
async function loadHisto(kid){const box=$("#histoList");if(!box)return;const P=await hGet(kid);if(S.kid!==kid||!$("#histoList"))return;
  if(P==null){box.innerHTML='<p class="hint">Détail des pièces indisponible dans ce navigateur.</p>';return}
  if(!P.length){box.innerHTML="";return}
  const f=UI.hisF||"",L=P.filter(p=>!f||(f==="fact"?isFact(p.e):f==="devis"?(p.e==="DV"||p.e==="DR"):!isFact(p.e)&&p.e!=="DV"&&p.e!=="DR")),lim=UI.hisAll?L.length:12;
  const n=x=>P.filter(p=>x==="fact"?isFact(p.e):x==="devis"?(p.e==="DV"||p.e==="DR"):!isFact(p.e)&&p.e!=="DV"&&p.e!=="DR").length;
  box.innerHTML='<div class="chips echips">'+[["","Toutes",P.length],["fact","Factures",n("fact")],["devis","Devis",n("devis")],["autre","Commandes et autres",n("autre")]].filter(x=>x[2]||!x[0]).map(([k,l,c])=>'<button type="button" class="chip" data-hisf="'+k+'" aria-pressed="'+(f===k)+'">'+l+'<span class="n num">'+c+'</span></button>').join("")+'</div>'+
   '<div class="imp-prev" style="margin-top:8px"><table><thead><tr><th>Date</th><th>Pièce</th><th>Étape</th><th class="r">Montant HT</th><th>Lieu d\'intervention</th><th>Contact</th><th>Apporteur</th></tr></thead><tbody>'+
   L.slice(0,lim).map(p=>'<tr style="cursor:default"><td class="num" style="white-space:nowrap">'+fdate(p.d)+'</td><td class="num sub">'+esc(p.n)+'</td><td><span class="pill tone-'+(ETT[p.e]||"grey")+'" style="font-size:11px">'+esc(ETL[p.e]||p.e)+'</span></td><td class="r num">'+eur(p.m)+'</td><td>'+esc([p.a,[p.cp,p.v].filter(Boolean).join(" ")].filter(Boolean).join(", "))+'</td><td class="sub">'+esc(p.c||"")+'</td><td class="sub">'+esc(p.ap||"")+'</td></tr>').join("")+'</tbody></table></div>'+
   (L.length>lim?'<button type="button" class="more" data-act="hisall" style="padding:6px 2px;text-align:left">Afficher les '+L.length+' pièces</button>':'')}

/* Mise à niveau des données (V3.1) : comptes du mailing = clients, mails envoyés = actions, PAC par famille */
function upgrade31(){if(S.settings.upg31)return false;
  const ml=new Set(S.mailing.map(m=>m.compteId));S.comptes.forEach(k=>{if(ml.has(k.id))k.type="Client existant"});
  S.mailing.forEach(m=>{if(m.envoye)syncMailAction(m)});
  ensureFamilyPlans();S.settings.upg31=true;bump();return true}

/* ================= V3.2 · Stockage dans IndexedDB (usage long terme) et gestion des plans ================= */
/* Les données vivent dans la base du navigateur (IndexedDB) : pas de limite pratique, contrairement au stockage local (~5 Mo partagés entre les applis du même site) */
async function appGet(key){const db=await idb();return await new Promise((res,rej)=>{const q=db.transaction("app").objectStore("app").get(key);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}
async function appPut(key,val){const db=await idb();await new Promise((res,rej)=>{const tx=db.transaction("app","readwrite");tx.objectStore("app").put(val,key);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error)})}
async function appDel(key){const db=await idb();await new Promise((res,rej)=>{const tx=db.transaction("app","readwrite");tx.objectStore("app").delete(key);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}
/* La sauvegarde automatique dans un dossier du PC a été retirée (V3.29) : on oublie l'accès au dossier mémorisé */
setTimeout(()=>{appDel("bkDir").catch(()=>{});if(S.settings&&S.settings.autoBk){delete S.settings.autoBk;lsSave()}},4000);
let saving=null,dirty=false,saveErr=false;
function idbQueue(){dirty=true;if(saving)return;
  saving=(async()=>{while(dirty){dirty=false;try{await appPut("state",snapshot());if(saveErr){saveErr=false;setSync("local","Enregistré sur ce poste")}}
    catch(e){saveErr=true;setSync("warn","Non enregistré");toast("Enregistrement impossible dans ce navigateur. Faites une sauvegarde complète (Exporter).");break}}saving=null})()}
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden"&&mT){clearTimeout(mT);mT=null;lsSave()}});
const persistReq=()=>{try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist()}catch(e){}};
function applyState(r){
  S.cibles=(r.cibles||[]).map(norm);S.comptes=(r.comptes||[]).map(knorm);S.contacts=(r.contacts||[]).map(ctnorm);S.actions=(r.actions||[]).map(anorm);
  S.plans=Array.isArray(r.plans)?r.plans:[];S.pac=(r.pac||[]).map(pnorm);S.mailing=(r.mailing||[]).map(mnorm);S.devis=(r.devis||[]).map(dvnorm);S.settings=Object.assign({objectif:8},r.settings||{});bump()}
async function loadState(){
  let idbOK=true,st;
  try{st=await appGet("state")}catch(e){idbOK=false}
  if(idbOK&&st&&st.schema===SCHEMA){applyState(st);STORE="idb";ensurePlans();repairLinks();if(upgrade31())lsSave();persistReq();return {}}
  const r=lsLoad();
  if(r.blocked&&!idbOK)return r;
  if(r.corrupt)return r;
  if(idbOK){
    if(r.lost){STORE="idb";return r}
    try{await appPut("state",snapshot());const b=await appGet("state");
      if(b&&b.cibles.length===S.cibles.length&&b.comptes.length===S.comptes.length&&b.mailing.length===S.mailing.length&&b.actions.length===S.actions.length){
        STORE="idb";r.moved=true;persistReq();
        try{const bk=localStorage.getItem(BK_KEY);if(bk){await appPut("copieV2",bk);localStorage.removeItem(BK_KEY)}}catch(e){}
        try{localStorage.setItem(LS_KEY,JSON.stringify({schema:SCHEMA,storage:"idb",le:now(),note:"Données dans la base du navigateur (IndexedDB)"}))}catch(e){}}}
    catch(e){}}
  return r}
async function fillSto(){const el=$("#stoInfo");if(!el)return;let t=STORE==="idb"?"Données dans la base du navigateur (IndexedDB), sans limite pratique de taille":"Données dans le stockage local du navigateur (limité à environ 5 Mo)";
  try{if(navigator.storage&&navigator.storage.estimate){const e=await navigator.storage.estimate();t+=" · "+(e.usage/1048576).toLocaleString("fr-FR",{maximumFractionDigits:1})+" Mo utilisés"}}catch(e){}
  if($("#stoInfo"))$("#stoInfo").textContent=t+"."}
async function getCopieV2(){try{const l=localStorage.getItem(BK_KEY);if(l)return l}catch(e){}try{return await appGet("copieV2")||null}catch(e){return null}}
async function fillBk(){const box=$("#bkBox");if(!box)return;const txt=await getCopieV2();if(!txt||!$("#bkBox"))return;
  box.innerHTML='<div class="addv"><span class="lbl">Copie de l\'ancienne version (V2)</span><p class="hint">Conservée sur ce poste lors du passage en V3, telle qu\'elle était. Vous pouvez la télécharger, puis la supprimer.</p><div class="bar"><button class="btn" type="button" id="bkDl">Télécharger la copie V2</button><button class="btn ghost danger" type="button" id="bkDel">Supprimer la copie V2</button></div></div>';
  $("#bkDl").onclick=()=>offer("Registre_copie_V2_"+todayISO()+".json",txt);
  const bx=$("#bkDel");bx.onclick=async()=>{if(!bx.classList.contains("armed")){bx.classList.add("armed");bx.textContent="Confirmer : supprimer la copie V2";return}
    try{localStorage.removeItem(BK_KEY)}catch(e){}try{const db=await idb();db.transaction("app","readwrite").objectStore("app").delete("copieV2")}catch(e){}box.innerHTML="";toast("Copie V2 supprimée de ce navigateur")}}

/* ---------- Gestion des plans : ajouter, modifier, dupliquer, archiver, ordonner, supprimer ---------- */
const plSort=(a,b)=>(a.ordre||0)-(b.ordre||0)||String(a.creeLe||"").localeCompare(String(b.creeLe||""));
function planManage(){const d=$("#drawer"),L=S.plans.slice().sort(plSort),cur=curPlan();
  const ax=p=>(PAXES.find(x=>x[0]===p.axe)||PAXES[PAXES.length-1])[1];
  d.innerHTML='<div class="dh"><div class="grow"><span class="lbl">Plan d\'action</span><h2 id="dTitle">Gérer les plans</h2><p class="hint" style="margin-top:4px">'+pl(L.length,"plan")+(L.some(p=>p.archive)?' dont '+L.filter(p=>p.archive).length+' archivé'+(L.filter(p=>p.archive).length>1?'s':''):'')+'. Un plan archivé est masqué de la barre des plans mais reste consultable et dans l\'export Excel.</p></div><button class="btn ghost" type="button" data-act="close">Fermer</button></div>'+
  '<div class="db"><div class="cards">'+L.map((p,i)=>{const n=planLines(p.id),dec=n.filter(l=>l.decision).length;
    return '<div class="ccard" style="padding-right:12px'+(p.archive?';opacity:.75':'')+'"><div class="nm" style="padding-right:0">'+esc(p.nom)+(p.id===cur.id?' <span class="pill tone-info" style="font-size:11px">Affiché</span>':'')+(p.archive?' <span class="pill tone-grey" style="font-size:11px">Archivé</span>':'')+'</div>'+
     '<div class="sub">'+esc(ax(p))+(p.famille&&FNOM[p.famille]?' · '+esc(FNOM[p.famille]):'')+' · période '+esc(p.periode||"—")+' · '+pl(n.length,"ligne")+' · '+dec+' décision'+(dec>1?'s':'')+'</div>'+
     '<div class="bar" style="margin-top:6px;gap:6px"><button class="btn" type="button" data-plm="open" data-id="'+esc(p.id)+'">Ouvrir</button><button class="btn ghost" type="button" data-plm="edit" data-id="'+esc(p.id)+'">Paramètres</button><button class="btn ghost" type="button" data-plm="dup" data-id="'+esc(p.id)+'">Dupliquer</button><button class="btn ghost" type="button" data-plm="arch" data-id="'+esc(p.id)+'">'+(p.archive?'Réactiver':'Archiver')+'</button>'+
      '<button class="btn ghost" type="button" data-plm="up" data-id="'+esc(p.id)+'"'+(i?'':' disabled')+' aria-label="Monter">↑</button><button class="btn ghost" type="button" data-plm="down" data-id="'+esc(p.id)+'"'+(i<L.length-1?'':' disabled')+' aria-label="Descendre">↓</button><span class="grow"></span><button class="btn danger" type="button" data-plm="del" data-id="'+esc(p.id)+'">Supprimer</button></div></div>'}).join("")+'</div></div>'+
  '<div class="df">'+(FAMILLES.some(f=>!S.plans.some(p=>p.famille===f[0]))?'<button class="btn" type="button" data-act="pfam">Un plan par famille de clients</button>':'')+'<span class="grow"></span><button class="btn" type="button" data-act="close">Fermer</button><button class="btn primary" type="button" data-act="pplannew">'+I_PLUS+'Nouveau plan</button></div>';
  $("#scrim").hidden=false;d.hidden=false}
function planAct(act,id,btn){const p=S.plans.find(x=>x.id===id);if(!p)return;
  if(act==="open"){S.settings.planCourant=id;PUI.f="";puiSave();closeDrawer();lsSave();showTab("pac");return}
  if(act==="edit"){S.settings.planCourant=id;planMenu(false);return}
  if(act==="dup"){const c=Object.assign(clone(p),{id:uid(),nom:p.nom+" (copie)",archive:false,creeLe:now(),ordre:(p.ordre||0)+.5});S.plans.push(c);
    planLines(p.id).forEach(l=>S.pac.push(Object.assign(clone(l),{id:uid(),planId:c.id,creeLe:now()})));renum();lsSave();planManage();render();toast("Plan dupliqué : « "+c.nom+" »");return}
  if(act==="arch"){p.archive=!p.archive;if(p.archive&&S.settings.planCourant===id){const nx=S.plans.slice().sort(plSort).find(x=>!x.archive);if(nx)S.settings.planCourant=nx.id}
    lsSave();planManage();render();toast(p.archive?"Plan archivé : « "+p.nom+" »":"Plan réactivé : « "+p.nom+" »");return}
  if(act==="up"||act==="down"){const L=S.plans.slice().sort(plSort),i=L.indexOf(p),j=i+(act==="up"?-1:1);if(j<0||j>=L.length)return;[L[i],L[j]]=[L[j],L[i]];L.forEach((x,k)=>x.ordre=k+1);lsSave();planManage();render();return}
  if(act==="del"){const n=planLines(id).length;
    if(!btn.classList.contains("armed")){btn.classList.add("armed");btn.textContent=n?"Confirmer : supprimer le plan et ses "+pl(n,"ligne"):"Confirmer la suppression";return}
    S.pac=S.pac.filter(l=>l.planId!==id);S.plans=S.plans.filter(x=>x.id!==id);
    if(S.settings.planCourant===id){const nx=S.plans.slice().sort(plSort).find(x=>!x.archive)||S.plans[0];S.settings.planCourant=nx?nx.id:""}
    ensurePlans();renum();bump();lsSave();planManage();render();toast("Plan « "+p.nom+" » supprimé");return}}
function renum(){S.plans.slice().sort(plSort).forEach((x,k)=>x.ordre=k+1);bump()}

/* ================= V3.3 · Actions rapides, recherche de compte, comptes rendus ================= */
/* Barre latérale : une action en un clic, rattachée au compte choisi */
const QK=[["visite","RDV"],["appel","Appel"],["mail","Mail"],["tache","Rappel"],["note","Note"],["cr","Compte rendu"]];
const I_CR=SV+'<path d="M4 1.8h6l2.5 2.5v9.9H4z"/><path d="M10 1.8v2.5h2.5M6 7h4.5M6 9.3h4.5M6 11.6h3"/></svg>';
function renderQk(){const el=$("#qk");if(!el)return;if(el.dataset.done){nbBadge();return}el.dataset.done="1";
  el.innerHTML=QK.map(([t,l])=>'<button type="button" data-anew="'+(t==="cr"?"visite":t)+'"'+(t==="cr"?' data-cr="1"':'')+' data-qk="1" title="'+esc(t==="cr"?"Rédiger un compte rendu":"Nouveau : "+l)+'">'+(t==="cr"?I_CR:I_EV[t])+'<span>'+esc(l)+'</span></button>').join("")+'<button type="button" data-dvnew="1" title="Nouveau devis">'+I_DV+'<span>Devis</span></button><button type="button" class="qk-nb" data-act="nbopen" title="Bloc-notes personnel, sans compte">'+I_EV.note+'<span>Bloc-notes</span><b class="num" id="qkNb" hidden></b></button>';nbBadge()}

/* ---------- Recherche de compte (nom, ville, contact, e-mail, typologie…) ---------- */
let KSX=null,KSXV=-1,KC_I=0;
function kIndex(){if(KSX&&KSXV===S.ver)return KSX;
  KSX=S.comptes.map(k=>({k,n:nh(k.nom),h:nh([k.nom,k.ville,k.typologie,k.segment,k.agence,k.apporteur,ctOf(k.id).map(c=>c.nom+" "+c.mail).join(" ")].join(" "))}));KSXV=S.ver;return KSX}
function kRecent(){const seen=new Set(),out=[];if(S.tab==="compte"&&kOf(S.kid)){out.push(kOf(S.kid));seen.add(S.kid)}
  S.actions.filter(a=>a.origine!=="mailing").sort((a,b)=>String(b.majLe||"").localeCompare(String(a.majLe||""))).some(a=>{if(!seen.has(a.compteId)&&kOf(a.compteId)){seen.add(a.compteId);out.push(kOf(a.compteId))}return out.length>=8});
  return out}
function kSearch(q,lim){const w=nh(q).split(" ").filter(Boolean);if(!w.length)return kRecent();const full=w.join(" "),R=[];
  for(const x of kIndex()){if(!w.every(t=>x.h.includes(t)))continue;const s=x.n===full?100:x.n.startsWith(full)?80:w.every(t=>x.n.includes(t))?60:20;R.push([s,x.k])}
  return R.sort((a,b)=>b[0]-a[0]||a[1].nom.localeCompare(b[1].nom,"fr")).slice(0,lim||12).map(r=>r[1])}
function kInfo(k){const h=k.histo,p=principal(k.id);
  return [k.type,k.dept?dLabel(k.dept):"",k.ville,FNOM[famOf(k)]||k.typologie||k.segment,p?p.nom:"",h?"CA "+h.y1+" : "+eur(hCA(k)):""].filter(Boolean).join(" · ")}
function kcHTML(a,k){return '<div class="f"><label class="lbl" for="am-k">Compte <span class="req">*</span></label><div class="kc"><input type="search" id="am-k" value="'+esc(a._k)+'" placeholder="Rechercher un compte : nom, ville, contact, e-mail…" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="kcList" aria-autocomplete="list"><div class="kc-list" id="kcList" role="listbox" hidden></div></div>'+
  (k?'<p class="hint kc-sel">'+esc(kInfo(k))+'</p>':a._k?'<p class="hint">Nouveau compte : il sera créé à l\'enregistrement.</p>':'<p class="hint">Tapez quelques lettres : la liste se filtre sur le nom, la ville, les contacts et leurs e-mails.</p>')+'</div>'}
function renderKc(){const inp=$("#am-k"),box=$("#kcList");if(!inp||!box)return;const q=inp.value.trim(),L=kSearch(q,12);KC_I=0;
  const hl=s=>{let o=esc(s);nh(q).split(" ").filter(t=>t.length>1).forEach(t=>{const re=new RegExp("("+t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+")","ig");o=o.replace(re,"<mark>$1</mark>")});return o};
  let h=(!q&&L.length?'<div class="kc-h">Comptes récents</div>':'')+L.map((k,i)=>'<button type="button" class="kc-o'+(i===0?' act':'')+'" data-kpick="'+esc(k.id)+'" role="option"><span class="grow"><b>'+hl(k.nom)+'</b><span class="sub">'+esc(kInfo(k))+'</span></span></button>').join("");
  if(q&&!findCompte(q))h+='<button type="button" class="kc-o'+(L.length?'':' act')+'" data-kpick="__new" role="option">'+I_PLUS+'<span class="grow">Créer le compte « <b>'+esc(q)+'</b> »</span></button>';
  if(q&&!L.length&&!h)h='<div class="kc-h">Aucun compte trouvé</div>';
  box.innerHTML=h;box.hidden=!h;inp.setAttribute("aria-expanded",String(!box.hidden))}
function kcHide(){const b=$("#kcList");if(b)b.hidden=true;const i=$("#am-k");if(i)i.setAttribute("aria-expanded","false")}
function kPick(id){if(!AM)return;const typed=vOf("am-k");amRead();
  if(id==="__new"){AM._k=typed;AM.compteId="";AM.contactId="";AM.cibleId=""}
  else{const k=kOf(id);if(!k)return;AM.compteId=id;AM._k=k.nom;const p=principal(id);AM.contactId=p?p.id:"";const cs=cibOf(id);AM.cibleId=cs.length===1?cs[0].id:""}
  drawAction();setTimeout(()=>{const f=$("#am-obj");if(f)f.focus({preventScroll:true})},20)}
function kcKey(e){const box=$("#kcList");if(!box||box.hidden){if(e.key==="ArrowDown"){renderKc();e.preventDefault()}return false}
  const o=[...box.querySelectorAll(".kc-o")];if(!o.length)return false;
  if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();o[KC_I].classList.remove("act");KC_I=(KC_I+(e.key==="ArrowDown"?1:-1)+o.length)%o.length;o[KC_I].classList.add("act");o[KC_I].scrollIntoView({block:"nearest"});return true}
  if(e.key==="Enter"){e.preventDefault();kPick(o[KC_I].dataset.kpick);return true}
  if(e.key==="Escape"){e.preventDefault();e.stopPropagation();kcHide();return true}
  return false}

/* ---------- Compte rendu structuré ---------- */
const CRF=[["contexte","Contexte / objet de l'échange",2,"Pourquoi ce RDV, situation du client, patrimoine concerné…"],["besoins","Besoins exprimés",3,"Projets de travaux, obligations à couvrir, volumes, calendrier…"],
  ["decisions","Décisions et engagements",2,"Ce qui a été convenu de part et d'autre…"],["suites","Prochaines étapes",2,"Devis à envoyer, personnes à rencontrer, relance…"]];
const crOK=t=>t!=="note"&&t!=="tache";
function crSection(a){const on=!!(a.cr||a._crOpen),c=a.cr||{},k=kOf(a.compteId),ct=ctById(a.contactId);
  const cli=c.client!=null?c.client:(ct?ct.nom+(ct.fonction?" ("+ct.fonction+")":""):"");
  return '<div class="suite"><label class="toggle"><input type="checkbox" id="am-cr"'+(on?' checked':'')+'> Rédiger un compte rendu</label>'+
   '<div id="am-crw" style="display:'+(on?'flex':'none')+';flex-direction:column;gap:10px">'+
    '<div class="row"><div class="f"><label class="lbl" for="cr-cli">Participants côté client</label><input type="text" id="cr-cli" list="crCt" value="'+esc(cli)+'" placeholder="Nom (fonction), …"><datalist id="crCt">'+(k?ctOf(k.id).map(x=>'<option value="'+esc(x.nom+(x.fonction?" ("+x.fonction+")":""))+'">').join(""):"")+'</datalist></div>'+
    '<div class="f"><label class="lbl" for="cr-int">Participants internes</label><input type="text" id="cr-int" value="'+esc(c.interne!=null?c.interne:["CSC",a.accompagnant].filter(Boolean).join(", "))+'" placeholder="CSC, chef d\'agence, apporteur…"></div></div>'+
    CRF.slice(0,2).map(([f,l,r,ph])=>ta("cr-"+f,l,c[f],r,ph)).join("")+
    '<div class="f"><span class="lbl">Diagnostics évoqués</span><div class="checks">'+PRESTA.map(([v,l])=>'<label><input type="checkbox" data-crp value="'+esc(v)+'"'+((c.prestas||[]).includes(v)?' checked':'')+'>'+esc(l)+'</label>').join("")+'</div></div>'+
    '<div class="row"><div class="f"><label class="lbl" for="cr-pot">Potentiel annuel estimé (€)</label><input type="number" min="0" step="500" class="num" id="cr-pot" value="'+esc(c.potentiel||"")+'"></div><div class="f"><label class="lbl" for="cr-conc">Concurrence en place</label><input type="text" id="cr-conc" value="'+esc(c.concurrence||"")+'" placeholder="Prestataire actuel, contrat, échéance…"></div></div>'+
    CRF.slice(2).map(([f,l,r,ph])=>ta("cr-"+f,l,c[f],r,ph)).join("")+
    '<p class="hint">Les diagnostics évoqués et le potentiel complètent la cible du compte. Les points abordés se saisissent dans le champ ci-dessus ; vous pouvez y coller un compte rendu dicté.</p>'+
    '<div class="bar"><button class="btn" type="button" data-act="crcopy">Copier le compte rendu</button><button class="btn" type="button" data-act="crmail">Envoyer par mail</button><button class="btn ghost" type="button" data-act="crprint">Imprimer / PDF</button></div>'+
   '</div></div>'}
function crRead(){const box=$("#am-cr");if(!box)return;
  if(!box.checked){AM.cr=null;AM._crOpen=false;return}
  AM._crOpen=true;AM.cr={client:vOf("cr-cli"),interne:vOf("cr-int"),contexte:vOf("cr-contexte"),besoins:vOf("cr-besoins"),prestas:[...document.querySelectorAll("#amForm input[data-crp]:checked")].map(i=>i.value),
    potentiel:vOf("cr-pot"),concurrence:vOf("cr-conc"),decisions:vOf("cr-decisions"),suites:vOf("cr-suites")}}
const crRows=(a)=>{const c=a.cr||{};return [["Participants (client)",c.client],["Participants (interne)",c.interne],["Lieu",a.lieu],["Contexte",c.contexte],["Besoins exprimés",c.besoins],["Points abordés",a.details],
  ["Diagnostics évoqués",(c.prestas||[]).map(p=>PLABEL[p]||p).join(", ")],["Potentiel estimé",c.potentiel?eur(c.potentiel)+" par an":""],["Concurrence",c.concurrence],["Décisions",c.decisions],["Prochaines étapes",c.suites]].filter(r=>r[1])};
function crTitle(a){return "Compte rendu – "+(ALBL[a.type]||"Échange")+(a.date?" du "+dObj(a.date).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"}):"")+(a.heure?" à "+a.heure.replace(":","h"):"")}
function crText(a){const k=kOf(a.compteId);return crTitle(a)+"\n"+(k?"Compte : "+k.nom+"\n":"")+(a.objet?"Objet : "+a.objet+"\n":"")+"\n"+crRows(a).map(([l,v])=>l+" :\n"+v).join("\n\n")}
function crHTML(a){const R=crRows(a).filter(r=>r[0]!=="Points abordés"&&r[0]!=="Lieu");if(!R.length)return "";return '<dl class="crv">'+R.map(([l,v])=>'<dt>'+esc(l)+'</dt><dd>'+esc(v)+'</dd>').join("")+'</dl>'}
function crCurrent(){if(MODAL==="view"&&RV)return Object.assign({},RV);amRead();const a=Object.assign({},AM);if(!a.cr){toast("Cochez « Rédiger un compte rendu » et complétez-le.");return null}return a}
async function crCopy(){const a=crCurrent();if(!a)return;const t=crText(a);try{await navigator.clipboard.writeText(t);toast("Compte rendu copié")}catch(e){toast("Copie bloquée ici : utilisez Imprimer / PDF.")}}
function crMail(){const a=crCurrent();if(!a)return;const ct=ctById(a.contactId),to=ct&&ct.mail?ct.mail:"",body=crText(a);
  const url="mailto:"+encodeURIComponent(to).replace(/%40/g,"@")+"?subject="+encodeURIComponent(crTitle(a)+(kOf(a.compteId)?" – "+kOf(a.compteId).nom:""))+"&body="+encodeURIComponent(body.length>1800?body.slice(0,1800)+"\n[…]":body);
  const l=document.createElement("a");l.href=url;l.target="_blank";l.rel="noopener";document.body.appendChild(l);l.click();l.remove()}
function crPrint(){const a=crCurrent();if(!a)return;const k=kOf(a.compteId);
  const html='<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>'+esc(crTitle(a))+'</title><style>body{font:11pt/1.5 "IBM Plex Sans",Arial,sans-serif;color:#1E1B18;margin:18mm 16mm}h1{font-size:16pt;margin:0 0 2mm}p.s{color:#69625B;margin:0 0 6mm}dl{display:grid;grid-template-columns:48mm 1fr;gap:3mm 6mm;margin:0}dt{font-weight:600;color:#A35C2A}dd{margin:0;white-space:pre-wrap}footer{margin-top:10mm;font-size:9pt;color:#69625B;border-top:1px solid #E0DDD7;padding-top:3mm}</style></head><body>'+
    '<h1>'+esc(crTitle(a))+'</h1><p class="s">'+esc([k&&k.nom,a.objet].filter(Boolean).join(" · "))+'</p><dl>'+crRows(a).map(([l,v])=>'<dt>'+esc(l)+'</dt><dd>'+esc(v)+'</dd>').join("")+'</dl><footer>Édité le '+new Date().toLocaleDateString("fr-FR")+'</footer><script>setTimeout(()=>print(),300)<\/script></body></html>';
  const w=window.open("","_blank");if(!w){toast("Fenêtre bloquée : autorisez les fenêtres, ou utilisez Copier.");return}w.document.write(html);w.document.close()}
/* Le compte rendu complète la cible : diagnostics évoqués, potentiel */
function crToCible(a,k){const c=a.cr;if(!c||!(c.prestas.length||c.potentiel))return "";const cs=cibOf(k.id),cb=cs.find(x=>x.id===a.cibleId)||(cs.length===1?cs[0]:null);if(!cb)return "";
  const before=JSON.stringify([cb.prestations,cb.potentiel]);cb.prestations=PRESTA.map(p=>p[0]).filter(p=>cb.prestations.includes(p)||c.prestas.includes(p));
  if(c.potentiel&&!cb.potentiel)cb.potentiel=Number(c.potentiel);if(JSON.stringify([cb.prestations,cb.potentiel])===before)return "";cb.majLe=now();bump();return " · cible « "+campShort(cb)+" » complétée"}

/* ================= V3.4 · Historique replié, lecture en grand, édition en grand ================= */
/* Historique du compte : une ligne résumée par échange, flèche pour déployer */
const TLO=new Set();
function tlItem(x,cs){const ct=ctById(x.contactId),who=[ct?ct.nom:"",x.interlocuteur&&(!ct||x.interlocuteur!==ct.nom)?x.interlocuteur:"",x.accompagnant?"avec "+x.accompagnant:""].filter(Boolean).join(" · "),cb=cibById(x.cibleId);
  const id=(x.mailing?"m":"a")+x.id,op=TLO.has(id),has=!!(x.details||x.cr||x.suite);
  const first=String(x.details||(x.cr&&(x.cr.contexte||x.cr.besoins))||"").split("\n")[0];
  return '<div class="tl-i'+(x.statut==="annule"?' annule':'')+(op?' open':'')+'" '+(x.mailing?'data-mopen="'+esc(x.id)+'"':'data-aid="'+esc(x.id)+'"')+'><span class="eic eic-'+esc(x.type)+'">'+(I_EV[x.type]||I_EV.autre)+'</span>'+
   '<div style="min-width:0;display:flex;flex-direction:column;gap:3px"><div class="eh"><span class="num">'+(x.date?fdate(x.date):"—")+'</span><b>'+esc(x.mailing?"Mailing":ESHORT[x.type]||x.type)+'</b>'+
    (x.statut==="annule"?'<span class="pill tone-grey">Annulé</span>':'')+(x.cr?'<span class="pill tone-info">Compte rendu</span>':'')+(x.resultat?'<span class="pill tone-'+(/^(Joint|Réponse|Appel reçu|Mail reçu|Rencontr|Relancé)/.test(x.resultat)?"ok":"info")+'">'+esc(x.resultat)+'</span>':'')+
    '<span class="sub grow">'+esc(who)+(cb&&cs.length>1?' · '+esc(campShort(cb)):'')+'</span>'+
    (has?'<button type="button" class="tgb'+(op?'':' has')+'" data-tlx="'+esc(id)+'" aria-expanded="'+op+'" title="'+(op?'Replier':'Déplier')+'" aria-label="'+(op?'Replier':'Déplier')+' le détail">'+CHEV+'</button>':'')+'</div>'+
    (x.objet?'<div class="eobj">'+esc(x.objet)+'</div>':'')+
    (op?(x.details?'<p class="edet">'+esc(x.details)+'</p>':'')+(x.cr?crHTML(x):'')+(x.suite?'<div class="sub">Suite : '+esc(x.suite)+'</div>':'')
      :(first&&first!==x.objet?'<div class="tl-sum">'+esc(first.length>160?first.slice(0,160)+"…":first)+'</div>':''))+'</div></div>'}

/* Lecture d'une action en grand : un compte rendu mis en page */
let RV=null;
const viewable=a=>!!(a&&(a.cr||(a.statut!=="afaire"&&a.details)));
function viewAction(id){const a=S.actions.find(x=>x.id===id);if(!a)return;if(!viewable(a)){openAction({id});return}
  RV=a;const k=kOf(a.compteId),ct=ctById(a.contactId),cb=cibById(a.cibleId),c=a.cr||{},t=todayISO();
  const dl=a.date?dObj(a.date).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"}):"";
  const sec=(ti,v,big)=>v?'<section class="rv-s'+(big?' big':'')+'"><h3>'+ti+'</h3><div class="rv-t">'+esc(v)+'</div></section>':'';
  const card=(ti,body)=>body?'<div class="rv-c"><h3>'+ti+'</h3>'+body+'</div>':'';
  const kv=(l,v)=>v?'<div class="rv-kv"><span>'+l+'</span><b>'+v+'</b></div>':'';
  const open=k?actOf(k.id).filter(isOpen).sort(aSort).slice(0,5):[];
  showModal('<div class="dh rv-h"><div class="grow"><span class="lbl">'+(a.cr?'Compte rendu':'Échange')+' · '+esc(ALBL[a.type]||a.type)+'</span><h2 id="mTitle">'+esc(a.objet||ALBL[a.type])+'</h2>'+
    '<p class="rv-meta"><span>'+esc(dl.charAt(0).toUpperCase()+dl.slice(1))+(a.heure?' à '+esc(a.heure.replace(":","h")):'')+'</span>'+(k?'<button type="button" class="lk strong" data-kopen="'+esc(k.id)+'">'+esc(k.nom)+'</button>':'')+(a.lieu?'<span>'+esc(a.lieu)+'</span>':'')+
    '<span class="pill tone-'+stTone(a)+'">'+esc(stLbl(a))+'</span>'+(a.resultat?'<span class="pill tone-info">'+esc(a.resultat)+'</span>':'')+'</p></div><button class="btn ghost" type="button" data-act="mclose">Fermer</button></div>'+
   '<div class="db"><div class="rv-grid"><div class="rv-main">'+
     sec("Contexte",c.contexte)+sec("Besoins exprimés",c.besoins)+sec(a.cr?"Points abordés":"Compte rendu",a.details,true)+sec("Décisions et engagements",c.decisions)+sec("Prochaines étapes",c.suites)+(a.suite?sec("Suite notée",a.suite):'')+
     (!a.details&&!a.cr?'<p class="hint">Aucun contenu.</p>':'')+'</div>'+
    '<aside class="rv-side">'+
     card("Participants",kv("Client",esc(c.client||(ct?ct.nom:"")))+kv("Interne",esc(c.interne||""))+kv("Accompagnant",esc(a.accompagnant||""))+
       (ct&&(ct.tel||ct.mail)?'<div class="rv-kv"><span>Contact</span><b>'+(ct.tel?'<a class="dl num" href="tel:'+esc(ct.tel.replace(/[^\d+]/g,""))+'">'+esc(ct.tel)+'</a> ':'')+(ct.mail?'<a class="dl" href="mailto:'+esc(ct.mail)+'">'+esc(ct.mail)+'</a>':'')+'</b></div>':''))+
     card("Opportunité",((c.prestas||[]).length?'<div class="tags" style="margin-bottom:6px">'+c.prestas.map(p=>'<span class="tag" title="'+esc(PLABEL[p]||p)+'">'+esc(PLABEL[p]||p)+'</span>').join("")+'</div>':'')+kv("Potentiel",c.potentiel?eur(c.potentiel)+" / an":"")+kv("Concurrence",esc(c.concurrence||""))+kv("Campagne",cb?esc(campShort(cb))+' · <span class="pill st-'+cb.etape+'" style="font-size:11px">'+esc(SL[cb.etape])+'</span>':""))+
     (open.length?'<div class="rv-c"><h3>À venir sur ce compte</h3><div class="todo">'+open.map(x=>tItem(x,{noCompte:true,full:true})).join("")+'</div></div>':'')+
    '</aside></div></div>'+
   '<div class="df">'+(k?'<button class="btn ghost" type="button" data-kopen="'+esc(k.id)+'">Fiche compte</button>':'')+'<button class="btn ghost" type="button" data-act="crcopy">Copier</button><button class="btn ghost" type="button" data-act="crmail">Envoyer par mail</button><button class="btn ghost" type="button" data-act="crprint">Imprimer / PDF</button><span class="grow"></span><button class="btn" type="button" data-act="mclose">Fermer</button><button class="btn primary" type="button" data-act="rvedit">Modifier</button></div>',"view");
  modalBig()}

/* ================= V3.6 · Tableau de bord personnalisable et bloc-notes ================= */
const DW=[["kpis","Indicateurs",12],["suividevis","Suivi de mes devis",12],["cal","Calendrier",8],["todo","À faire",4],["prioA","Priorité A sans prochaine action",4],["recent","Dernières actions réalisées",4],["notes","Bloc-notes",4],
  ["devis","Devis en attente (historique importé)",6],["perdus","Clients perdus à reconquérir",6],["pipe","Pipeline des cibles",4],["visites","Visites réalisées par mois",4],["pac","Plan d'action (PAC)",4]];
const DWT=Object.fromEntries(DW.map(x=>[x[0],x[1]]));
let DEDIT=false,DRO=null,DMV=null,DRS=null;
function dashCfg(){let c=Array.isArray(S.settings.dash)?S.settings.dash.filter(x=>x&&DWT[x.id]):[];const ids=new Set(c.map(x=>x.id));
  /* Un bloc nouveau se place après son voisin d'origine plutôt qu'en fin de tableau de bord */
  DW.forEach(([id,,w],i)=>{if(ids.has(id))return;const pv=i?c.findIndex(x=>x.id===DW[i-1][0]):-1;c.splice(pv+1,0,{id,w,h:0,on:true});ids.add(id)});
  c.forEach(x=>{x.w=Math.min(12,Math.max(2,parseInt(x.w,10)||4));x.h=Math.max(0,parseInt(x.h,10)||0);x.on=x.on!==false});
  S.settings.dash=c;return c}
const dwOf=id=>dashCfg().find(x=>x.id===id);
function dwSpan(w){const vw=window.innerWidth;return vw<820?12:vw<1250?Math.max(w,6):w}
function dashHTML(W){const c=dashCfg(),vis=c.filter(x=>x.on&&W[x.id]!=null),hid=c.filter(x=>!x.on&&W[x.id]!=null);let h='';
  if(DEDIT)h+='<div class="dedit-bar"><div class="grow"><b>Personnalisation du tableau de bord</b><span class="sub">Glissez un bloc par sa barre pour le déplacer · tirez le coin en bas à droite pour changer sa largeur et sa hauteur · double-clic sur le coin : hauteur automatique.</span>'+
    (hid.length?'<div class="dadd"><span class="lbl">Blocs masqués</span>'+hid.map(x=>'<button type="button" class="chip" data-dwon="'+x.id+'">'+I_PLUS+esc(DWT[x.id])+'</button>').join("")+'</div>':'')+'</div>'+
    '<button class="btn" type="button" data-act="dreset">Disposition d\'origine</button><button class="btn primary" type="button" data-act="dedit">Terminer</button></div>';
  h+='<div class="dgrid'+(DEDIT?' edit':'')+'" id="dgrid">'+vis.map(x=>'<div class="dw" data-dw="'+x.id+'" style="grid-column:span '+dwSpan(x.w)+'"><div class="dw-in">'+
    (DEDIT?'<div class="dw-bar"><span class="dw-grip" title="Glisser pour déplacer ce bloc">⠿ '+esc(DWT[x.id])+'</span><span class="grow"></span>'+
      '<button type="button" class="dw-b" data-dww="-1" title="Plus étroit" aria-label="Plus étroit">−</button><span class="dw-sz num" title="Largeur sur 12 colonnes">'+x.w+'/12</span><button type="button" class="dw-b" data-dww="1" title="Plus large" aria-label="Plus large">+</button>'+
      '<button type="button" class="dw-b" data-dwh="0"'+(x.h?'':' disabled')+' title="Revenir à la hauteur automatique">Hauteur auto</button><button type="button" class="dw-b" data-dwoff="1" title="Masquer ce bloc (vous pourrez le remettre)">Masquer</button></div>':'')+
    '<div class="dw-c'+(x.h?' fix':'')+'"'+(x.h?' style="height:'+x.h+'px"':'')+'>'+W[x.id]+'</div>'+(DEDIT?'<span class="dw-rs" title="Tirer pour redimensionner · double-clic : hauteur automatique"></span>':'')+'</div></div>').join("")+'</div>';
  if(!vis.length)h+='<div class="panel"><p class="hint">Tous les blocs sont masqués. '+(DEDIT?'Ajoutez-en depuis la barre ci-dessus.':'<button type="button" class="more" data-act="dedit">Personnaliser le tableau de bord</button>')+'</p></div>';
  return h}
function dwRow(el){const i=el.firstElementChild;if(i)el.style.gridRowEnd="span "+Math.max(1,Math.ceil((i.offsetHeight+16)/4))}
function dashFit(){const g=$("#dgrid");if(!g)return;g.querySelectorAll(".dw").forEach(el=>{const x=dwOf(el.dataset.dw);if(x)el.style.gridColumn="span "+dwSpan(x.w);dwRow(el)})}
function dashObs(){if(DRO)DRO.disconnect();DRO=null;if(!window.ResizeObserver)return;DRO=new ResizeObserver(es=>es.forEach(e=>{const el=e.target.parentElement;if(el&&el.isConnected)dwRow(el)}));
  document.querySelectorAll("#dgrid .dw-in").forEach(i=>DRO.observe(i))}
let DFT=0;window.addEventListener("resize",()=>{clearTimeout(DFT);DFT=setTimeout(dashFit,120)});
function dashOrder(){const ids=[...document.querySelectorAll("#dgrid .dw")].map(e=>e.dataset.dw),c=dashCfg();
  S.settings.dash=ids.map(id=>c.find(x=>x.id===id)).filter(Boolean).concat(c.filter(x=>!ids.includes(x.id)));lsSave()}
function dSzLbl(el,x){const s=el.querySelector(".dw-sz");if(s)s.textContent=x.w+"/12";const b=el.querySelector('[data-dwh]');if(b)b.disabled=!x.h}

/* Déplacement et redimensionnement des blocs (mode Personnaliser) */
document.addEventListener("pointerdown",e=>{if(e.button>0||!e.target.closest)return;
  const g=e.target.closest("#dgrid.edit .dw-grip");
  if(g){const el=g.closest(".dw"),gh=document.createElement("div");gh.className="dghost";gh.textContent=DWT[el.dataset.dw]||"";document.body.appendChild(gh);
    DMV={el,last:null,gh};el.classList.add("dmoving");document.body.classList.add("dragging");gh.style.left=e.clientX+14+"px";gh.style.top=e.clientY+10+"px";e.preventDefault();return}
  const r=e.target.closest("#dgrid.edit .dw-rs");
  if(r){const el=r.closest(".dw"),c=el.querySelector(".dw-c"),grid=$("#dgrid"),x=dwOf(el.dataset.dw);if(!x||!c)return;
    DRS={el,c,x,sx:e.clientX,sy:e.clientY,sw:el.getBoundingClientRect().width,sh:c.offsetHeight,colW:(grid.clientWidth-11*16)/12,w:x.w,h:x.h};
    el.classList.add("dsizing");document.body.classList.add("dragging","dsz");e.preventDefault()}});
document.addEventListener("pointermove",e=>{
  if(DMV){DMV.gh.style.left=e.clientX+14+"px";DMV.gh.style.top=e.clientY+10+"px";
    if(e.clientY<70)window.scrollBy(0,-18);else if(e.clientY>window.innerHeight-70)window.scrollBy(0,18);
    const t=document.elementFromPoint(e.clientX,e.clientY),T=t&&t.closest?t.closest("#dgrid .dw"):null;
    if(T&&T!==DMV.el&&T!==DMV.last){const L=[...T.parentNode.children],i=L.indexOf(DMV.el),j=L.indexOf(T);if(i<j)T.after(DMV.el);else T.before(DMV.el);DMV.last=T}
    else if(!T)DMV.last=null;return}
  if(DRS){const s=DRS,dx=e.clientX-s.sx,dy=e.clientY-s.sy;
    if(window.innerWidth>=820){s.w=Math.min(12,Math.max(2,Math.round((s.sw+dx+16)/(s.colW+16))));s.el.style.gridColumn="span "+dwSpan(s.w)}
    s.h=Math.max(140,Math.round((s.sh+dy)/10)*10);s.c.style.height=s.h+"px";s.c.classList.add("fix");dwRow(s.el);dSzLbl(s.el,{w:s.w,h:s.h})}});
document.addEventListener("pointerup",()=>{
  if(DMV){DMV.gh.remove();DMV.el.classList.remove("dmoving");document.body.classList.remove("dragging");DMV=null;dashOrder();dashFit();return}
  if(DRS){const s=DRS;DRS=null;s.el.classList.remove("dsizing");document.body.classList.remove("dragging","dsz");s.x.w=s.w;s.x.h=s.h;lsSave();dashFit()}});
document.addEventListener("dblclick",e=>{const r=e.target.closest&&e.target.closest("#dgrid.edit .dw-rs");if(!r)return;const x=dwOf(r.closest(".dw").dataset.dw);if(x){x.h=0;lsSave();renderTdb()}});

/* ---------- Bloc-notes personnel (sans compte) ---------- */
let NLINK=null,NBT=0;
function nbList(){if(!Array.isArray(S.settings.notes))S.settings.notes=[];return S.settings.notes}
const nbOf=id=>nbList().find(n=>n.id===id);
function nbSorted(){return nbList().slice().sort((a,b)=>(b.p?1:0)-(a.p?1:0)||String(b.c).localeCompare(String(a.c)))}
function nbWhen(n){const f=iso=>{const d=new Date(iso);return isNaN(d)?"":d.toLocaleDateString("fr-FR",{day:"numeric",month:"short"})+" à "+d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}).replace(":","h")};
  return "Le "+f(n.c)+(n.m&&n.m.slice(0,16)!==String(n.c).slice(0,16)?" · modifiée le "+f(n.m):"")}
function nbHTML(ctx){const L=nbSorted();
  let h='<div class="nb-new"><textarea class="nb-in" data-nbin="'+ctx+'" rows="2" placeholder="Noter une idée, un numéro, un rappel… Entrée pour ajouter · Maj+Entrée pour aller à la ligne" aria-label="Nouvelle note"></textarea><button class="btn primary" type="button" data-act="nbadd" data-ctx="'+ctx+'">'+I_PLUS+'Ajouter</button></div>';
  h+=L.length?'<div class="nb-l">'+L.map(n=>{const id=esc(n.id);return '<div class="nb-i'+(n.p?' pin':'')+'" data-nid="'+id+'"><textarea class="nb-t" data-nbt="'+id+'" rows="1" aria-label="Note">'+esc(n.t)+'</textarea>'+
    '<div class="nb-m"><span class="sub">'+(n.p?'Épinglée · ':'')+esc(nbWhen(n))+'</span><span class="grow"></span><button type="button" class="nb-b" data-nbpin="'+id+'" aria-pressed="'+!!n.p+'">'+(n.p?'Désépingler':'Épingler')+'</button>'+
    '<button type="button" class="nb-b" data-nbk="'+id+'" title="Enregistrer cette note dans un compte (elle quitte alors le bloc-notes)">Verser dans un compte</button><button type="button" class="nb-b del" data-nbdel="'+id+'">Supprimer</button></div></div>'}).join("")+'</div>'
    :'<p class="hint">Aucune note. Écrivez ci-dessus : la note reste ici, sans compte. Vous pourrez la verser dans un compte plus tard.</p>';
  return h}
function nbPanel(){const n=nbList().length;return '<div class="panel nb"><div class="ph"><h2>Bloc-notes</h2><span class="sub num">'+(n||"")+'</span><button type="button" class="more" data-act="nbopen">Ouvrir en fenêtre</button></div>'+nbHTML("d")+'</div>'}
function nbGrow(t){t.style.height="auto";t.style.height=Math.min(t.scrollHeight+2,420)+"px"}
function nbGrowAll(root){(root||document).querySelectorAll(".nb-t").forEach(nbGrow)}
function nbBadge(){const b=$("#qkNb");if(b){const n=nbList().length;b.textContent=n||"";b.hidden=!n}}
function nbRefresh(focusCtx){
  if(MODAL==="nb"){const db=$("#modal .db");if(db)db.innerHTML=nbHTML("m")}
  const w=document.querySelector('#dgrid [data-dw="notes"] .dw-c');if(w&&S.tab==="tdb")w.innerHTML=nbPanel();
  nbGrowAll();nbBadge();
  if(focusCtx){const i=document.querySelector('[data-nbin="'+focusCtx+'"]');if(i)i.focus({preventScroll:true})}}
function nbAdd(ctx){const i=document.querySelector('[data-nbin="'+ctx+'"]');if(!i)return;const t=i.value.replace(/\s+$/,"");
  if(!t.trim()){i.focus({preventScroll:true});return}
  nbList().push({id:uid(),t,c:now(),m:now(),p:false});lsSave();nbRefresh(ctx)}
function nbDel(id){S.settings.notes=nbList().filter(n=>n.id!==id);lsSave();nbRefresh()}
function nbOpen(){showModal('<div class="dh"><div class="grow"><span class="lbl">Notes personnelles · sans compte</span><h2 id="mTitle">Bloc-notes</h2></div><button class="btn ghost" type="button" data-act="mclose">Fermer</button></div><div class="db nb-db">'+nbHTML("m")+'</div>',"nb");
  nbGrowAll($("#modal"));const i=$('#modal [data-nbin="m"]');if(i)i.focus({preventScroll:true})}
function nbToCompte(id){const n=nbOf(id);if(!n)return;
  openAction({type:"note"});NLINK=id;const d=$("#am-det");if(d){d.value=n.t}
  const k=$("#am-k");if(k)k.focus({preventScroll:true});toast("Choisissez le compte, puis enregistrez : la note quittera le bloc-notes.")}
function nbDone(id){if(!nbOf(id))return;S.settings.notes=nbList().filter(n=>n.id!==id);lsSave();nbBadge();if(S.tab==="tdb")renderTdb();toast("Note versée dans le compte")}

document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("button");if(!t)return;const d=t.dataset;
  if(d.act==="dedit"){DEDIT=!DEDIT;renderTdb();if(DEDIT){const b=$(".dedit-bar");if(b)b.scrollIntoView({block:"nearest"})}return}
  if(d.act==="dreset"){S.settings.dash=null;dashCfg();lsSave();renderTdb();toast("Disposition d'origine rétablie");return}
  if(d.dwon){const x=dwOf(d.dwon);if(x){x.on=true;lsSave();renderTdb()}return}
  const el=t.closest("#dgrid .dw");
  if(el&&(d.dww||d.dwh!=null||d.dwoff)){const x=dwOf(el.dataset.dw);if(!x)return;
    if(d.dww){x.w=Math.min(12,Math.max(2,x.w+Number(d.dww)));el.style.gridColumn="span "+dwSpan(x.w);dSzLbl(el,x);lsSave();dashFit();return}
    if(d.dwh!=null){x.h=0;lsSave();renderTdb();return}
    if(d.dwoff){x.on=false;lsSave();renderTdb();toast("Bloc « "+DWT[x.id]+" » masqué · Personnaliser pour le remettre");return}}
  if(d.act==="nbopen"){nbOpen();return}
  if(d.act==="nbadd"){nbAdd(d.ctx);return}
  if(d.nbpin){const n=nbOf(d.nbpin);if(n){n.p=!n.p;lsSave();nbRefresh()}return}
  if(d.nbk){nbToCompte(d.nbk);return}
  if(d.nbdel){if(t.dataset.armed){nbDel(d.nbdel);return}t.dataset.armed="1";t.textContent="Confirmer la suppression";t.classList.add("armed");
    setTimeout(()=>{if(t.isConnected){delete t.dataset.armed;t.textContent="Supprimer";t.classList.remove("armed")}},3500);return}});
document.addEventListener("keydown",e=>{const t=e.target;if(!t||!t.dataset)return;
  if(t.dataset.nbin&&e.key==="Enter"&&!e.shiftKey&&!e.isComposing){e.preventDefault();e.stopPropagation();nbAdd(t.dataset.nbin)}},true);
document.addEventListener("input",e=>{const t=e.target;if(!t||!t.dataset)return;
  if(t.dataset.nbt){const n=nbOf(t.dataset.nbt);if(!n)return;n.t=t.value;n.m=now();nbGrow(t);clearTimeout(NBT);NBT=setTimeout(lsSave,500)}
  else if(t.dataset.nbin){t.style.height="auto";t.style.height=Math.min(t.scrollHeight+2,260)+"px"}});
document.addEventListener("focusout",e=>{const t=e.target;if(!t||!t.dataset||!t.dataset.nbt)return;const n=nbOf(t.dataset.nbt);
  if(n&&!n.t.trim()){clearTimeout(NBT);S.settings.notes=nbList().filter(x=>x!==n);lsSave();setTimeout(()=>nbRefresh(),0)}
  else{clearTimeout(NBT);lsSave()}});

/* ================= V3.7 · Bilan d'activité : réalisé sur N semaines et à venir ================= */
const BLK="pac-idf-bilan";
const BL=(()=>{const d={past:2,next:2,depuis:"",types:[],q:"",det:true,mailing:false,notes:false,retard:true,devis:true};
  try{return Object.assign(d,JSON.parse(localStorage.getItem(BLK)||"{}"),{q:""})}catch(e){return d}})();
const blSave=()=>{try{const o=Object.assign({},BL);delete o.q;localStorage.setItem(BLK,JSON.stringify(o))}catch(e){}};
const BLT=[["rdv","RDV / visio",["visite","visio"]],["appel","Appels",["appel"]],["mail","Mails",["mail"]],["tache","Rappels / tâches",["tache"]],["note","Notes",["note"]],["autre","Événements / autres",["evenement","autre"]]];
const blGrp=ty=>(BLT.find(g=>g[2].includes(ty))||BLT[5])[0];
const blF=(d,o)=>dObj(d).toLocaleDateString("fr-FR",o||{day:"numeric",month:"long"}).replace(/(^|\D)1 (?=[a-zéû])/,"$11er ");
const blCap=s=>s.charAt(0).toUpperCase()+s.slice(1);
function blRange(){const t=todayISO(),from=BL.depuis&&BL.depuis<=t?BL.depuis:addD(t,-7*BL.past+1);return {t,from,to:addD(t,7*BL.next)}}
function blMatch(a){if(BL.types.length&&!BL.types.includes(blGrp(a.type)))return false;
  if(BL.q){const k=kOf(a.compteId),c=ctById(a.contactId);if(!nh([k&&k.nom,k&&k.ville,a.objet,a.details,a.resultat,c&&c.nom,a.cr&&JSON.stringify(a.cr)].join(" ")).includes(nh(BL.q)))return false}return true}
function blData(){const R=blRange(),A=S.actions;
  const doneAll=A.filter(a=>a.statut==="fait"&&a.date&&a.date>=R.from&&a.date<=R.t);
  const mail=doneAll.filter(a=>a.origine==="mailing"&&(!BL.types.length||BL.types.includes("mail")));
  const real=doneAll.filter(a=>a.origine!=="mailing"&&blMatch(a));
  let done=(BL.mailing?doneAll.filter(blMatch):real).slice();
  if(BL.notes)nbList().forEach(n=>{const d=new Date(n.c);if(isNaN(d))return;const iso=isoOf(d);if(iso<R.from||iso>R.t||(BL.q&&!nh(n.t).includes(nh(BL.q)))||(BL.types.length&&!BL.types.includes("note")))return;
    done.push({_nb:true,id:n.id,type:"note",date:iso,heure:pad(d.getHours())+":"+pad(d.getMinutes()),objet:"Bloc-notes personnel",details:n.t})});
  done.sort((a,b)=>b.date.localeCompare(a.date)||(b.heure||"").localeCompare(a.heure||""));
  const next=BL.next?A.filter(a=>isOpen(a)&&a.date&&a.date>=R.t&&a.date<=R.to&&blMatch(a)).sort(aSort):[];
  const late=BL.retard?A.filter(a=>isOpen(a)&&a.date&&a.date<R.t&&blMatch(a)).sort(aSort):[];
  return {R,done,real,next,late,mail}}
function blWeeks(L,desc,mail){const m=new Map(),add=w=>{if(!m.has(w))m.set(w,{L:[],mail:0});return m.get(w)};
  L.forEach(a=>add(mondayOf(a.date)).L.push(a));if(mail&&!BL.mailing)mail.forEach(a=>add(mondayOf(a.date)).mail++);
  return [...m.entries()].sort((x,y)=>desc?y[0].localeCompare(x[0]):x[0].localeCompare(y[0]))}
function blWk(w){const cw=mondayOf(todayISO()),f=d=>blF(d,{day:"numeric",month:"short"}).replace(".","");
  return {tag:w===cw?"Cette semaine":w===addD(cw,-7)?"Semaine dernière":w===addD(cw,7)?"Semaine prochaine":"",per:"du "+f(w)+" au "+f(addD(w,6))}}
function blNote(a){return [a.details,a.resultat?"Résultat : "+a.resultat:"",a.suite?"Suite prévue : "+a.suite:""].filter(Boolean).join("\n")}
function blRow(a,fut){const k=kOf(a.compteId),ct=ctById(a.contactId),late=fut==="late",txt=blNote(a),crc=a.cr?crHTML(a):"";
  const meta=[k?'<button type="button" class="lk strong" data-kopen="'+esc(k.id)+'">'+esc(k.nom)+'</button>'+(k.ville?' <span class="sub">'+esc(k.ville)+'</span>':''):'',ct?esc(ct.nom+(ct.fonction?" ("+ct.fonction+")":"")):'',a.accompagnant?"avec "+esc(a.accompagnant):'',a.lieu?esc(a.lieu):''].filter(Boolean).join(" · ");
  return '<div class="bl-r'+(fut?' fut':'')+(late?' late':'')+(a._nb?' nbk':'')+'"'+(a._nb?'':' data-aid="'+esc(a.id)+'"')+'>'+
    '<div class="bl-d"><b>'+esc(blCap(blF(a.date,{weekday:"short",day:"numeric",month:"short"}).replace(/\./g,"")))+'</b>'+(a.heure?'<span class="num">'+esc(a.heure.replace(":","h"))+'</span>':'')+'</div>'+
    '<span class="eic eic-'+esc(a.type)+'" title="'+esc(ALBL[a.type]||"")+'">'+(I_EV[a.type]||I_EV.autre)+'</span>'+
    '<div class="bl-b"><div class="bl-o"><span class="bl-ty">'+esc(ALBL[a.type]||"Action")+(a.cr?' · compte rendu':'')+(a.origine==="mailing"?' · mailing':'')+'</span>'+esc(a.objet&&a.objet!==ALBL[a.type]?a.objet:"")+'</div>'+
    (meta?'<div class="m">'+meta+'</div>':'')+(BL.det&&(txt||crc)?'<div class="bl-n">'+(txt?'<p>'+esc(txt)+'</p>':'')+crc+'</div>':'')+'</div></div>'}
function blSection(title,sub,weeks,fut,empty){
  let h='<div class="panel bl-sec"><div class="ph"><h2>'+title+'</h2><span class="sub">'+sub+'</span></div>';
  if(!weeks.length)return h+'<p class="hint">'+empty+'</p></div>';
  weeks.forEach(([w,g])=>{const W=blWk(w);
    h+='<div class="bl-wk"><div class="bl-wh">'+(W.tag?'<b>'+W.tag+'</b> · ':'')+'<span>'+esc(W.per)+'</span><span class="n num">'+pl(g.L.length,"action")+(g.mail?' · '+pl(g.mail,"mail")+' de mailing':'')+'</span></div>'+
      g.L.map(a=>blRow(a,fut)).join("")+(g.mail&&!g.L.length?'':'')+(g.mail?'<button type="button" class="bl-mail" data-blo="mailing">'+I_MAIL+pl(g.mail,"mail envoyé","mails envoyés")+' par mailing cette semaine · afficher le détail</button>':'')+'</div>'});
  return h+'</div>'}
function blKpis(D){const by=g=>D.real.filter(a=>blGrp(a.type)===g).length,cr=D.real.filter(a=>a.cr).length,ks=new Set(D.real.map(a=>a.compteId).filter(Boolean)).size;
  const t=(l,v,d,cls)=>'<div class="kpi'+(cls?' '+cls:'')+'"><span class="lbl">'+l+'</span><span class="v">'+v+'</span><span class="d">'+d+'</span></div>';
  const nr=D.next.filter(a=>isRdv(a.type)).length;
  return '<div class="bl-k">'+t("RDV / visio réalisés",by("rdv"),pl(cr,"compte rendu","comptes rendus"))+t("Appels",by("appel"),"passés sur la période")+
    t("Mails",by("mail"),pl(D.mail.length,"envoi","envois")+" de mailing en plus")+t("Rappels traités",by("tache"),pl(by("note"),"note")+" · "+pl(by("autre"),"autre"))+
    t("Comptes travaillés",ks,"au moins une action réalisée")+(BL.next?t("À venir",D.next.length,pl(nr,"RDV")+" planifié"+(nr>1?"s":"")):'')+(BL.retard?t("En retard",D.late.length,D.late.length?"actions à rattraper":"rien en retard",D.late.length?"bad":""):'')+'</div>'}
function blPeriod(R){return "Du "+blF(R.from,{weekday:"long",day:"numeric",month:"long"})+" au "+blF(R.t,{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
function renderBilan(){const el=$("#view-bilan");if(!el)return;const R=blRange();
  const seg=(attr,vals,cur,lbl)=>'<div class="seg" role="group" aria-label="'+lbl+'">'+vals.map(([v,l])=>'<button type="button" data-'+attr+'="'+v+'" aria-pressed="'+(cur===v)+'">'+l+'</button>').join("")+'</div>';
  const ck=(k,l)=>'<label class="bl-ck"><input type="checkbox" data-blo="'+k+'"'+(BL[k]?' checked':'')+'>'+l+'</label>';
  let h=pageH("Pilotage","Bilan d'activité",esc(blPeriod(R))+(BL.next?' · à venir jusqu\'au '+esc(blF(R.to,{day:"numeric",month:"long"})):''),
    '<button class="btn" type="button" data-act="blcopy">Copier pour un mail</button><button class="btn primary" type="button" data-act="blprint">Imprimer / PDF</button>');
  h+='<div class="panel bl-ctl"><div class="bl-line"><span class="lbl">Réalisé sur</span>'+seg("blp",[[1,"1 sem."],[2,"2 sem."],[3,"3 sem."],[4,"4 sem."],[6,"6 sem."],[8,"8 sem."],[12,"12 sem."]],BL.depuis?-1:BL.past,"Nombre de semaines passées")+
    '<label class="bl-dep">ou depuis le <input type="date" id="blDep" value="'+esc(BL.depuis)+'" max="'+R.t+'"></label>'+(BL.depuis?'<button type="button" class="more" data-act="bldepx">effacer</button>':'')+
    '<span class="lbl" style="margin-left:10px">À venir</span>'+seg("bln",[[0,"Non"],[1,"1 sem."],[2,"2 sem."],[4,"4 sem."],[8,"8 sem."]],BL.next,"Nombre de semaines à venir")+'</div>'+
    '<div class="bl-line"><div class="chips"><button type="button" class="chip" data-blt="" aria-pressed="'+!BL.types.length+'">Tout</button>'+BLT.map(([k,l])=>'<button type="button" class="chip" data-blt="'+k+'" aria-pressed="'+BL.types.includes(k)+'">'+esc(l)+'</button>').join("")+'</div>'+
    '<input type="search" id="blQ" value="'+esc(BL.q)+'" placeholder="Filtrer : compte, ville, contact, mot dans les notes…" style="width:280px"></div>'+
    '<div class="bl-line">'+ck("det","Afficher le détail des notes et comptes rendus")+ck("retard","Actions en retard")+ck("mailing","Détailler les mails de mailing")+ck("notes","Inclure mon bloc-notes")+ck("devis","Inclure les devis")+'</div></div>';
  h+='<div id="blBody"></div>';el.innerHTML=h;blBody()}
function blBody(){const b=$("#blBody");if(!b)return;const D=blData(),R=D.R;
  let h=blKpis(D)+blDevisHTML(blDevis(R));
  const past=blSection("Réalisé",esc(pl(D.done.length,"élément"))+(D.mail.length&&!BL.mailing?' · '+pl(D.mail.length,"mail")+' de mailing':''),blWeeks(D.done,true,D.mail),"","Aucune action réalisée sur la période"+(BL.types.length||BL.q?" avec ces filtres":"")+".");
  let side="";
  if(BL.next)side+=blSection("À venir",esc(pl(D.next.length,"action"))+' jusqu\'au '+esc(blF(R.to,{day:"numeric",month:"short"})),blWeeks(D.next,false),"fut","Rien de planifié sur cette période.");
  if(BL.retard&&D.late.length)side+='<div class="panel bl-sec"><div class="ph"><h2>En retard</h2><span class="sub">'+pl(D.late.length,"action")+' non faite'+(D.late.length>1?'s':'')+'</span></div><div class="bl-wk">'+D.late.map(a=>blRow(a,"late")).join("")+'</div></div>';
  h+='<div class="bl-cols'+(side?'':' one')+'"><div>'+past+'</div>'+(side?'<div class="bl-side">'+side+'</div>':'')+'</div>';
  b.innerHTML=h}

/* Copie texte (mail) et impression */
function blTxtRow(a){const k=kOf(a.compteId),ct=ctById(a.contactId),n=BL.det?blNote(a):"",cr=BL.det&&a.cr?crRows(a).filter(r=>r[0]!=="Points abordés"&&r[0]!=="Lieu").map(([l,v])=>l+" : "+String(v).replace(/\n/g," / ")):[];
  return "• "+blF(a.date,{weekday:"short",day:"numeric",month:"short"}).replace(/\./g,"")+(a.heure?" "+a.heure.replace(":","h"):"")+" – "+(ALBL[a.type]||"")+(a.cr?" (compte rendu)":"")+(k?" – "+k.nom:"")+(ct?" – "+ct.nom:"")+(a.objet&&a.objet!==ALBL[a.type]?" : "+a.objet:"")+
    (n?"\n    "+n.replace(/\n/g,"\n    "):"")+(cr.length?"\n    "+cr.join("\n    "):"")}
function blText(){const D=blData(),R=D.R,by=g=>D.real.filter(a=>blGrp(a.type)===g).length;
  let s="Bilan d'activité – "+blPeriod(R).toLowerCase().replace(/^du/,"du")+"\n\nSynthèse : "+[pl(by("rdv"),"RDV / visio","RDV / visio"),pl(by("appel"),"appel"),pl(by("mail"),"mail"),pl(D.mail.length,"envoi")+" de mailing",pl(by("tache"),"rappel traité","rappels traités"),pl(new Set(D.real.map(a=>a.compteId).filter(Boolean)).size,"compte travaillé","comptes travaillés")].join(" · ")+"\n";
  const sec=(t,W)=>{s+="\n"+t.toUpperCase()+"\n";if(!W.length){s+="(rien)\n";return}W.forEach(([w,g])=>{const x=blWk(w);s+="\n"+(x.tag?x.tag+" – ":"")+x.per.charAt(0).toUpperCase()+x.per.slice(1)+"\n"+g.L.map(blTxtRow).join("\n")+(g.mail?(g.L.length?"\n":"")+"• "+pl(g.mail,"mail envoyé","mails envoyés")+" par mailing":"")+"\n"})};
  sec("Réalisé",blWeeks(D.done,true,D.mail));
  if(BL.next)sec("À venir (jusqu'au "+blF(R.to)+")",blWeeks(D.next,false));
  if(BL.retard&&D.late.length)s+="\nEN RETARD\n"+D.late.map(blTxtRow).join("\n")+"\n";
  s+=blDevisTxt(blDevis(R));
  return s}
async function blCopy(){const t=blText();try{await navigator.clipboard.writeText(t);toast("Bilan copié : collez-le dans votre mail")}catch(e){const ta=document.createElement("textarea");ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand("copy");toast("Bilan copié")}catch(x){toast("Copie impossible")}ta.remove()}}
function blPrint(){const D=blData(),R=D.R,by=g=>D.real.filter(a=>blGrp(a.type)===g).length;
  const row=a=>{const k=kOf(a.compteId),ct=ctById(a.contactId),n=BL.det?blNote(a):"",cr=BL.det&&a.cr?crRows(a).filter(r=>r[0]!=="Points abordés"&&r[0]!=="Lieu"):[];
    return '<tr><td class="d">'+esc(blF(a.date,{weekday:"short",day:"numeric",month:"short"}).replace(/\./g,""))+(a.heure?'<br>'+esc(a.heure.replace(":","h")):'')+'</td><td class="t">'+esc(ALBL[a.type]||"")+(a.cr?'<br><i>compte rendu</i>':'')+'</td><td><b>'+esc(k?k.nom:a._nb?"Bloc-notes":"")+'</b>'+(ct?' · '+esc(ct.nom):'')+(a.objet&&a.objet!==ALBL[a.type]?'<div>'+esc(a.objet)+'</div>':'')+
      (n?'<div class="n">'+esc(n)+'</div>':'')+(cr.length?'<div class="n">'+cr.map(([l,v])=>'<b>'+esc(l)+' :</b> '+esc(v)).join("<br>")+'</div>':'')+'</td></tr>'};
  const sec=(t,W)=>'<h2>'+esc(t)+'</h2>'+(W.length?W.map(([w,g])=>{const x=blWk(w);return '<h3>'+(x.tag?esc(x.tag)+' · ':'')+esc(x.per)+' <span>'+pl(g.L.length,"action")+(g.mail?' · '+pl(g.mail,"mail")+' de mailing':'')+'</span></h3><table>'+g.L.map(row).join("")+'</table>'}).join(""):'<p>Rien sur la période.</p>');
  const html='<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Bilan d\'activité</title><style>body{font:10pt/1.45 "IBM Plex Sans",Arial,sans-serif;color:#1E1B18;margin:14mm 13mm}h1{font-size:16pt;margin:0}p.s{color:#69625B;margin:1mm 0 5mm}.k{display:flex;flex-wrap:wrap;gap:3mm;margin-bottom:4mm}.k div{border:1px solid #E0DDD7;border-radius:2mm;padding:2mm 4mm;min-width:28mm}.k b{display:block;font-size:15pt}.k span{color:#69625B;font-size:8.5pt}h2{font-size:12.5pt;color:#A35C2A;border-bottom:1.5px solid #A35C2A;padding-bottom:1mm;margin:7mm 0 2mm}h3{font-size:10.5pt;margin:4mm 0 1mm;break-after:avoid}h3 span{font-weight:400;color:#69625B}table{width:100%;border-collapse:collapse}td{border-top:1px solid #E0DDD7;padding:1.6mm 2mm;vertical-align:top}td.d{width:22mm;white-space:nowrap}td.t{width:26mm;color:#69625B}tr{break-inside:avoid}.n{white-space:pre-wrap;color:#3A342E;margin-top:1mm;font-size:9.3pt}footer{margin-top:8mm;font-size:8.5pt;color:#69625B;border-top:1px solid #E0DDD7;padding-top:2mm}</style></head><body>'+
    '<h1>Bilan d\'activité</h1><p class="s">'+esc(blPeriod(R))+(BL.next?' · à venir jusqu\'au '+esc(blF(R.to)):'')+(BL.types.length?' · '+esc(BL.types.map(k=>BLT.find(x=>x[0]===k)[1]).join(", ")):'')+(BL.q?' · filtre « '+esc(BL.q)+' »':'')+'</p>'+
    '<div class="k">'+[["RDV / visio",by("rdv")],["Appels",by("appel")],["Mails",by("mail")],["Mailing",D.mail.length],["Rappels traités",by("tache")],["Comptes rendus",D.real.filter(a=>a.cr).length],["Comptes travaillés",new Set(D.real.map(a=>a.compteId).filter(Boolean)).size]].concat(BL.next?[["À venir",D.next.length]]:[]).map(([l,v])=>'<div><b>'+v+'</b><span>'+esc(l)+'</span></div>').join("")+'</div>'+
    sec("Réalisé",blWeeks(D.done,true,D.mail))+(BL.next?sec("À venir",blWeeks(D.next,false)):'')+(BL.retard&&D.late.length?'<h2>En retard</h2><table>'+D.late.map(row).join("")+'</table>':'')+
    blDevisPrint(blDevis(R))+'<footer>Édité le '+new Date().toLocaleDateString("fr-FR")+' · CSC</footer><script>setTimeout(()=>print(),300)<\/script></body></html>';
  const w=window.open("","_blank");if(!w){toast("Fenêtre bloquée : autorisez les fenêtres, ou utilisez « Copier pour un mail ».");return}w.document.write(html);w.document.close()}

document.addEventListener("click",e=>{if(S.tab!=="bilan")return;const t=e.target.closest&&e.target.closest("button");if(!t)return;const d=t.dataset;
  if(d.blp!=null){BL.past=Number(d.blp);BL.depuis="";blSave();renderBilan();return}
  if(d.bln!=null){BL.next=Number(d.bln);blSave();renderBilan();return}
  if(d.blt!=null){if(!d.blt)BL.types=[];else BL.types=BL.types.includes(d.blt)?BL.types.filter(x=>x!==d.blt):BL.types.concat(d.blt);blSave();renderBilan();return}
  if(d.blo==="mailing"&&t.classList.contains("bl-mail")){BL.mailing=true;blSave();renderBilan();return}
  if(d.act==="bldepx"){BL.depuis="";blSave();renderBilan();return}
  if(d.act==="blcopy"){blCopy();return}
  if(d.act==="blprint"){blPrint();return}});
document.addEventListener("change",e=>{const t=e.target;if(S.tab!=="bilan"||!t)return;
  if(t.dataset&&t.dataset.blo){BL[t.dataset.blo]=t.checked;blSave();renderBilan();return}
  if(t.id==="blDep"){BL.depuis=t.value&&t.value<=todayISO()?t.value:"";blSave();renderBilan()}});
let BLQT=0;document.addEventListener("input",e=>{if(e.target&&e.target.id==="blQ"){BL.q=e.target.value;clearTimeout(BLQT);BLQT=setTimeout(blBody,180)}});
