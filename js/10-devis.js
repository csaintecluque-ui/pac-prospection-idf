/* Registre · CSC — Suivi des devis : page, fenêtre, tableau de bord, bilan, imports Word / PDF / Excel
   Fichier 10/18 : les fichiers se chargent dans l'ordre et partagent leurs déclarations. */
"use strict";

/* ================= V3.8 · Suivi des devis : prestations, prélèvements estimatifs (rouge) / définitifs (bleu), réalisation ================= */
/* Catalogue repris des plaquettes « Diagnostics et repérages réglementaires » et « Amiante sur équipements » */
const DV_CAT=[
  ["Repérages amiante et plomb",["Repérage amiante avant travaux","Repérage amiante avant démolition","Repérage plomb avant travaux","Repérage plomb avant démolition","Repérage amiante en industrie (équipements, NF X46-100)","Repérage amiante tous domaines","Repérage amiante et matières dangereuses sur navires","Amiante ferroviaire","Amiante aéronef","Prélèvements sur enrobés (amiante / HAP)","Diagnostic réglementaire amiante (DTA, avant vente…)","Diagnostic PEMD (produits, équipements, matériaux, déchets)","Examen visuel"]],
  ["Amiante dans l'air",["Prélèvement d'air statique amiante (LAB REF 26)","Prélèvement d'air individuel amiante (LAB REF 28)"]],
  ["Diagnostics immobiliers réglementaires",["Diagnostic gaz","Diagnostic électricité","Diagnostic de performance énergétique (DPE)","État des risques et pollutions (ERP)","Constat de l'état parasitaire","Mesurage de surface","Audit énergétique"]],
  ["Nucléaire",["Diagnostic en installation nucléaire"]],
  ["AMO et déconstruction",["Étude et conseil en stratégie patrimoniale","AMO amiante","AMO déconstruction et démolition"]]];
const DV_ALL=DV_CAT.flatMap(g=>g[1]);
const DVST=[["brouillon","À envoyer"],["attente","En attente"],["accepte","Accepté"],["refuse","Refusé"],["sansuite","Sans suite"]];
const DVL=Object.fromEntries(DVST);
/* Relance : délai sans réponse (réglable, 15 jours par défaut) compté depuis le devis ou la dernière relance ; « reporter » décale l'échéance */
const dvRelJ=()=>Math.max(1,parseInt(S.settings.dvRelJ,10)||15);
function dvRelDue(d){if(d.statut!=="attente")return "";const lr=(d.relances||[]).slice(-1)[0]||"",b=[d.date||"",lr].sort().pop();let due=b?addD(b,dvRelJ()):"";if(d.relSnooze&&d.relSnooze>due)due=d.relSnooze;return due}
const nb0=v=>{const n=parseFloat(String(v==null?"":v).replace(/[\s€]/g,"").replace(",","."));return isFinite(n)?n:0};
const eur2=n=>(Number(n)||0).toLocaleString("fr-FR",{maximumFractionDigits:2})+" €";
const dvPrelDef=p=>{const g=DV_CAT.findIndex(c=>c[1].includes(p));return g===0||g===1};
function dvLblank(p){return {id:uid(),presta:p||"",prix:"",pOn:dvPrelDef(p||""),nb:"",pu:"",def:false,faite:false,faiteLe:""}}
function dvblank(){return {compteId:"",contactId:"",numero:"",date:todayISO(),objet:"",statut:"attente",dateRep:"",notes:"",lignes:[]}}
function dvnorm(x){const o=Object.assign(dvblank(),x||{});
  o.lignes=(Array.isArray(o.lignes)?o.lignes:[]).map(l=>{const r=Object.assign(dvLblank(),l||{});if(!r.id)r.id=uid();r.pOn=!!r.pOn;r.def=!!r.def;r.faite=!!r.faite;return r});
  if(!DVL[o.statut])o.statut="attente";return o}
/* Montants : prix de la prestation + nombre de prélèvements × prix unitaire */
const lPrel=l=>l.pOn?nb0(l.nb)*nb0(l.pu):0,lTot=l=>nb0(l.prix)+lPrel(l),lHasP=l=>!!l.pOn&&nb0(l.nb)>0,lEst=l=>lHasP(l)&&!l.def;
function dvSum(d){const r={presta:0,prel:0,est:0,def:0,tot:0,real:0,n:d.lignes.length,nf:0,estN:0,nbE:0,nbD:0,reste:0};
  d.lignes.forEach(l=>{const p=lPrel(l);r.presta+=nb0(l.prix);r.prel+=p;
    if(lHasP(l)){if(l.def){r.def+=p;r.nbD+=nb0(l.nb)}else{r.est+=p;r.estN++;r.nbE+=nb0(l.nb)}}
    if(l.faite){r.real+=lTot(l);r.nf++}});
  r.tot=r.presta+r.prel;r.reste=d.statut==="accepte"?r.tot-r.real:0;return r}
const dvLive=d=>d.statut!=="refuse"&&d.statut!=="sansuite";
const dvSortD=(a,b)=>(b.date||"").localeCompare(a.date||"")||String(b.majLe||"").localeCompare(String(a.majLe||""));
const dvOf=kid=>S.devis.filter(d=>d.compteId===kid).sort(dvSortD);
const dvAge=d=>d.date?Math.max(0,Math.round((Date.parse(todayISO())-Date.parse(d.date))/864e5)):null;
const dvRel=d=>{const due=dvRelDue(d);return !!due&&due<=todayISO()};
const dvToDo=d=>d.statut==="accepte"&&dvSum(d).nf<d.lignes.length;
const dvAvTag=d=>d.avoir?'<span class="dv-av" title="'+esc("Avoir émis"+(d.avoir.le?" le "+fdate(d.avoir.le):"")+" : "+eur(d.avoir.m)+(d.avoir.pieces&&d.avoir.pieces.length?" ("+d.avoir.pieces.join(", ")+")":"")+". Le devis reste compté comme accepté.")+'">Avoir '+eur(d.avoir.m)+'</span>':'';
const dvPill=d=>'<span class="pill dvs-'+d.statut+'">'+esc(DVL[d.statut])+'</span>'+dvAvTag(d);
const dvTotCls=s=>s.estN?" est":s.nbD?" def":"";
const dvShort=p=>String(p||"Prestation").replace(/\s*\([^()]*\)\s*$/,"");
const I_DV=SV+'<path d="M4 1.8h6l2.5 2.5v9.9H4z"/><path d="M10 1.8v2.5h2.5"/><path d="M10.4 7.4a2.2 2.2 0 1 0 0 3.2M6.4 8.4h3.1M6.4 9.7h3.1"/></svg>';
function dvPrelTxt(s){const P=[];
  if(s.nbE)P.push('<span class="est" title="Nombre de prélèvements estimatif">'+s.nbE+' prél. estimatif'+(s.nbE>1?'s':'')+' · '+eur(s.est)+'</span>');
  if(s.nbD)P.push('<span class="def" title="Nombre de prélèvements définitif">'+s.nbD+' prél. définitif'+(s.nbD>1?'s':'')+' · '+eur(s.def)+'</span>');
  return P.join('<br>')}
function dvTags(d,max){const L=d.lignes;
  return '<span class="dv-tags">'+L.slice(0,max||99).map(l=>'<span class="dv-tg'+(l.faite?' ok':'')+'" title="'+esc((l.presta||"Prestation")+(l.faite?" · réalisée"+(l.faiteLe?" le "+fdate(l.faiteLe):""):" · non réalisée")+(lHasP(l)?" · "+nb0(l.nb)+" prélèvement(s) "+(l.def?"définitif(s)":"estimatif(s)"):""))+'">'+(l.faite?I_CHECK:'')+esc(dvShort(l.presta))+(lHasP(l)?'<i class="'+(l.def?'def':'est')+'">'+nb0(l.nb)+'</i>':'')+'</span>').join("")+(max&&L.length>max?'<span class="sub">+ '+(L.length-max)+'</span>':'')+'</span>'}
function dvRealHTML(d,s){if(d.statut!=="accepte"&&!s.nf)return '<span class="sub">—</span>';
  return '<div class="dv-rm"><span class="num">'+s.nf+' / '+s.n+'</span><div class="meter"><b style="width:'+(s.n?s.nf/s.n*100:0)+'%;background:var(--ok)"></b></div>'+(s.nf?'<span class="sub">'+eur(s.real)+' réalisé</span>':'')+'</div>'}
function dvKpis(B){const X=B.map(d=>[d,dvSum(d)]),sum=(f,g)=>X.reduce((a,[d,s])=>a+(f(d,s)?g(d,s):0),0),cnt=f=>X.filter(([d,s])=>f(d,s)).length;
  const dec=d=>d.statut==="accepte"||!dvLive(d),acc=cnt(d=>d.statut==="accepte"),n=cnt(dec),accM=sum(d=>d.statut==="accepte",(d,s)=>s.tot),decM=sum(dec,(d,s)=>s.tot);
  return {att:cnt(d=>d.statut==="attente"),attM:sum(d=>d.statut==="attente",(d,s)=>s.tot),acc,accM,taux:n?Math.round(acc/n*100):null,tauxM:decM?Math.round(accM/decM*100):null,
    real:sum(()=>true,(d,s)=>s.real),nf:sum(()=>true,(d,s)=>s.nf),reste:sum(d=>d.statut==="accepte",(d,s)=>s.reste),todo:cnt(d=>dvToDo(d)),
    est:sum(dvLive,(d,s)=>s.est),estD:cnt((d,s)=>dvLive(d)&&s.estN>0),def:sum(dvLive,(d,s)=>s.def),rel:cnt(dvRel),tot:sum(()=>true,(d,s)=>s.tot),bro:cnt(d=>d.statut==="brouillon")}}

/* ---------- Page « Suivi des devis » ---------- */
const DVV=[["tous","Tous",()=>true],["brouillon","À envoyer",d=>d.statut==="brouillon"],["attente","En attente",d=>d.statut==="attente"],["relance","À relancer",dvRel],
  ["arealiser","Acceptés à réaliser",dvToDo],["realises","Réalisés",d=>d.statut==="accepte"&&d.lignes.length>0&&!dvToDo(d)],["perdus","Refusés / sans suite",d=>!dvLive(d)],["estim","Prélèvements estimatifs",d=>dvLive(d)&&d.lignes.some(lEst)],["avoir","Avec avoir",d=>!!d.avoir]];
const DVF=["an","mo","pr","cl","dp"];
const DVUI=(()=>{const d={vs:[],q:"",an:[],mo:[],pr:[],cl:[],dp:[],sorts:[{k:"date",dir:"desc"}],grp:"mois",open:{},lim:400};let o={};
  try{o=JSON.parse(localStorage.getItem("pac-idf-dv")||"{}")}catch(e){}
  const r=Object.assign(d,o,{q:"",lim:400});DVF.forEach(k=>{const v=r[k];r[k]=Array.isArray(v)?v:v?[v]:[]});
  if(!Array.isArray(r.vs))r.vs=r.v&&r.v!=="tous"?[r.v]:[];delete r.v;
  if(!Array.isArray(r.sorts)||!r.sorts.length){const so=String(r.sort||"date-desc");r.sorts=[{k:so.split("-")[0],dir:so.endsWith("asc")?"asc":"desc"}]}delete r.sort;delete r.ap;return r})();
const dvUiSave=()=>{try{localStorage.setItem("pac-idf-dv",JSON.stringify({vs:DVUI.vs,an:DVUI.an,mo:DVUI.mo,pr:DVUI.pr,cl:DVUI.cl,dp:DVUI.dp,sorts:DVUI.sorts,grp:DVUI.grp,open:DVUI.open}))}catch(e){}};
const MOIS=["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
/* Typologie de client : famille, segment, typologie ou type du compte */
function dvClOk(k,cl){if(!cl)return true;if(!k)return false;const [t,v]=[cl.slice(0,1),cl.slice(2)];
  return t==="f"?famOf(k)===v:t==="s"?k.segment===v:t==="y"?k.typologie===v:t==="t"?k.type===v:true}
function dvBase(){const w=nh(DVUI.q).split(" ").filter(Boolean);
  const U=DVUI;return S.devis.filter(d=>{const dt=d.date||"";if(U.an.length&&!U.an.includes(dt.slice(0,4)))return false;if(U.mo.length&&!U.mo.includes(dt.slice(5,7)))return false;
    if(U.pr.length&&!d.lignes.some(l=>U.pr.includes(l.presta)))return false;
    const k=kOf(d.compteId);if(U.cl.length&&!U.cl.some(c=>dvClOk(k,c)))return false;if(U.dp.length&&!U.dp.includes(k?k.dept:""))return false;
    if(!w.length)return true;const ct=ctById(d.contactId),hay=nh([k?k.nom:"",k?k.ville:"",d.numero,(d.refs||[]).join(" "),d.apporteur,d.objet,d.notes,ct?ct.nom:"",d.lignes.map(l=>l.presta).join(" ")].join(" "));return w.every(t=>hay.includes(t))})}
const DVSORT=[["date","Date du devis","desc"],["mt","Montant HT","desc"],["compte","Compte","asc"],["statut","Statut","asc"],["real","Réalisation","desc"],["num","N° de devis","asc"],["presta","Prestation","asc"],["nb","Nombre de dossiers (vue par compte)","desc"],["taux","Transformation (vue par compte)","desc"]];
const DVSL=Object.fromEntries(DVSORT.map(x=>[x[0],x[1]]));
/* Liste affichée : vues cochées (au moins une), puis tri */
function dvList(B){B=B||dvBase();const V=DVUI.vs.map(k=>DVV.find(x=>x[0]===k)).filter(Boolean);return (V.length?B.filter(d=>V.some(v=>v[2](d))):B).sort(dvSorter())}
const DVGRP=[["mois","Année puis mois"],["annee","Année"],["compte","Compte"],["statut","Statut"],["aucun","Sans regroupement"]];
function dvSorter(){const kn=d=>((kOf(d.compteId)||{}).nom||""),si=Object.fromEntries(DVST.map((x,i)=>[x[0],i])),C=new Map(),sm=d=>{let v=C.get(d.id);if(!v)C.set(d.id,v=dvSum(d));return v};
  const cmp={date:(a,b)=>(a.date||"").localeCompare(b.date||""),mt:(a,b)=>sm(a).tot-sm(b).tot,compte:(a,b)=>kn(a).localeCompare(kn(b),"fr"),statut:(a,b)=>si[a.statut]-si[b.statut],
    real:(a,b)=>{const x=sm(a),y=sm(b);return (x.n?x.nf/x.n:0)-(y.n?y.nf/y.n:0)||x.real-y.real},num:(a,b)=>String(a.numero||"").localeCompare(String(b.numero||""),"fr",{numeric:true}),presta:(a,b)=>String((a.lignes[0]||{}).presta||"").localeCompare(String((b.lignes[0]||{}).presta||""),"fr")};
  const L=DVUI.sorts.filter(x=>cmp[x.k]);
  return (a,b)=>{for(const x of L){const r=cmp[x.k](a,b);if(r)return x.dir==="asc"?r:-r}return dvSortD(a,b)}}
/* Groupes repliables : ouverts par défaut pour l'année en cours (et ses mois), repliés sinon */
const dvGOpen=(key,def)=>DVUI.open[key]!=null?DVUI.open[key]:def;
function dvGroupTree(L){const g=DVUI.grp,cy=String(new Date().getFullYear()),asc=((DVUI.sorts.find(x=>x.k==="date")||{}).dir)==="asc";
  const mk=(key,label,items,def,sub)=>({key,label,items,def,sub});
  if(g==="aucun")return null;
  if(g==="annee"||g==="mois"){const by=new Map();L.forEach(d=>{const y=(d.date||"").slice(0,4)||"Sans date";if(!by.has(y))by.set(y,[]);by.get(y).push(d)});
    const ys=[...by.keys()].sort((a,b)=>asc?a.localeCompare(b):b.localeCompare(a));
    return ys.map(y=>{const items=by.get(y);let sub=null;
      if(g==="mois"){const bm=new Map();items.forEach(d=>{const m=(d.date||"").slice(5,7)||"00";if(!bm.has(m))bm.set(m,[]);bm.get(m).push(d)});
        sub=[...bm.keys()].sort((a,b)=>asc?a.localeCompare(b):b.localeCompare(a)).map(m=>mk("m"+y+"-"+m,m==="00"?"Sans date":blCap(MOIS[+m-1])+" "+y,bm.get(m),true))}
      return mk("y"+y,y,items,y===cy,sub)})}
  if(g==="compte"){const by=new Map();L.forEach(d=>{const id=kOf(d.compteId)?d.compteId:"?";if(!by.has(id))by.set(id,[]);by.get(id).push(d)});
    const G=[...by.entries()].map(([id,items])=>{const k=kOf(id),g=mk("c"+id,k?k.nom:"Compte introuvable",items,false);g.k=k;const X=items.map(d=>[d,dvSum(d)]),acc=X.filter(([d])=>d.statut==="accepte"),dec=X.filter(([d])=>d.statut==="accepte"||!dvLive(d));
      g.tot=X.reduce((a,[,s])=>a+s.tot,0);g.last=items.map(d=>d.date||"").sort().pop()||"";g.n=items.length;g.real=X.reduce((a,[,s])=>a+s.real,0);g.taux=dec.length?acc.length/dec.length:-1;g.st=acc.length?0:items.some(d=>d.statut==="attente")?1:2;return g});
    /* Ordre des comptes : critères de tri cochés, dans l'ordre (montant global par défaut) */
    const gc={compte:(x,y)=>x.label.localeCompare(y.label,"fr"),num:(x,y)=>x.label.localeCompare(y.label,"fr"),date:(x,y)=>x.last.localeCompare(y.last),mt:(x,y)=>x.tot-y.tot,nb:(x,y)=>x.n-y.n,taux:(x,y)=>x.taux-y.taux,real:(x,y)=>x.real-y.real,statut:(x,y)=>x.st-y.st};
    const C=DVUI.sorts.filter(x=>gc[x.k]);return G.sort((x,y)=>{for(const c of C){const r=gc[c.k](x,y);if(r)return c.dir==="asc"?r:-r}return y.tot-x.tot||x.label.localeCompare(y.label,"fr")})}
  if(g==="statut")return DVST.map(([s,l])=>mk("s"+s,l,L.filter(d=>d.statut===s),s==="attente"||s==="accepte")).filter(x=>x.items.length);
  return null}
function dvCHead(G){const open=dvGOpen(G.key,G.def),k=G.k,X=G.items.map(d=>[d,dvSum(d)]),cnt=s=>X.filter(([d])=>d.statut===s),sm=a=>a.reduce((x,[,s])=>x+s.tot,0);
  const acc=cnt("accepte"),att=cnt("attente"),lost=X.filter(([d])=>d.statut==="refuse"||d.statut==="sansuite"),dec=acc.length+lost.length,real=X.reduce((a,[,s])=>a+s.real,0),est=X.some(([,s])=>s.estN),av=G.items.filter(d=>d.avoir).length;
  return '<tr class="dv-gh dv-ck'+(open?' open':'')+'" data-dvgr="'+esc(G.key)+'"><td colspan="2"><button type="button" class="dv-gb" data-dvg="'+esc(G.key)+'" aria-expanded="'+open+'"><span class="dv-ch">'+CHEV+'</span><span class="dv-cn"><b>'+esc(G.label)+'</b><span class="sub">'+esc(k?[k.type,k.dept?dLabel(k.dept):"",k.ville,FNOM[famOf(k)]||k.segment].filter(Boolean).join(" · "):"")+'</span></span></button></td>'+
    '<td><b class="num">'+G.items.length+'</b> <span class="sub">dossier'+(G.items.length>1?'s':'')+'</span>'+(G.last?'<div class="sub">dernier le '+fdate(G.last)+'</div>':'')+'</td>'+
    '<td class="r"><b class="num dv-ctot'+(est?' est':'')+'">'+eur(G.tot)+'</b><div class="sub">montant global HT</div></td>'+
    '<td><div class="dv-cst">'+(acc.length?'<span class="pill dvs-accepte">'+acc.length+' · '+eur(sm(acc))+'</span>':'')+(att.length?'<span class="pill dvs-attente">'+att.length+' · '+eur(sm(att))+'</span>':'')+(lost.length?'<span class="pill dvs-refuse">'+lost.length+' · '+eur(sm(lost))+'</span>':'')+(av?'<span class="dv-av">'+av+' avoir'+(av>1?'s':'')+'</span>':'')+
      (dec?'<div class="sub">transfo '+Math.round(acc.length/dec*100)+' % (nb) · '+Math.round(sm(acc)/Math.max(1,sm(acc)+sm(lost))*100)+' % (€)</div>':'')+'</div></td>'+
    '<td>'+(acc.length||real?'<div class="dv-rm"><span class="num">'+eur(real)+'</span><div class="meter"><b style="width:'+(sm(acc)?Math.min(100,real/sm(acc)*100):0)+'%;background:var(--ok)"></b></div><span class="sub">réalisé</span></div>':'<span class="sub">—</span>')+
      (k?'<button type="button" class="more dv-kf" data-kopen="'+esc(k.id)+'">Fiche compte</button>':'')+'</td></tr>'}
function dvGHead(G,lvl){const open=dvGOpen(G.key,G.def),X=G.items.map(d=>[d,dvSum(d)]),tot=X.reduce((a,[,s])=>a+s.tot,0),n=s=>G.items.filter(d=>d.statut===s).length;
  const acc=X.filter(([d])=>d.statut==="accepte").reduce((a,[,s])=>a+s.tot,0),real=X.reduce((a,[,s])=>a+s.real,0);
  return '<tr class="dv-gh l'+lvl+'"><td colspan="6"><button type="button" class="dv-gb" data-dvg="'+esc(G.key)+'" aria-expanded="'+open+'"><span class="dv-ch">'+CHEV+'</span><b>'+esc(G.label)+'</b>'+
    '<span class="sub">'+pl(G.items.length,"devis","devis")+' · '+eur(tot)+' HT'+[n("attente")?n("attente")+" en attente":"",n("accepte")?n("accepte")+" accepté"+(n("accepte")>1?"s":"")+" ("+eur(acc)+")":"",n("refuse")?n("refuse")+" refusé"+(n("refuse")>1?"s":""):"",real?eur(real)+" réalisé":""].filter(Boolean).map(x=>" · "+x).join("")+'</span></button></td></tr>'}
function dvRow(d,inK){const k=kOf(d.compteId),s=dvSum(d),age=dvAge(d);
  return '<tr data-dvid="'+esc(d.id)+'" tabindex="0"'+(inK?' class="dv-in"':'')+'><td class="nw"><span class="num">'+(d.date?fdate(d.date):"—")+'</span>'+(d.numero?'<div class="sub">N° '+esc(d.numero)+'</div>':'')+'</td>'+
    '<td>'+(inK?'':'<div class="co"><b>'+esc(k?k.nom:"Compte introuvable")+'</b></div>')+(d.objet?'<div class="sub dv-obj'+(inK?' in':'')+'" title="'+esc(d.objet)+'">'+esc(d.objet)+'</div>':(inK?'<span class="sub">—</span>':''))+'</td>'+
    '<td>'+dvTags(d,4)+'</td>'+
    '<td class="r"><span class="num dv-tt'+dvTotCls(s)+'">'+eur(s.tot)+'</span>'+(s.prel?'<div class="sub dv-pl">'+dvPrelTxt(s)+'</div>':'')+'</td>'+
    '<td>'+dvPill(d)+(d.statut==="attente"&&age!=null?'<div class="sub'+(dvRel(d)?' late':'')+'">depuis '+pl(age,"jour")+((d.relances||[]).length?' · relancé le '+fdate(d.relances.slice(-1)[0]):'')+'</div>'+(dvRel(d)?'<button type="button" class="dv-rl" data-dvrel="'+esc(d.id)+'">'+I_MAIL+'Relancer</button>':''):d.dateRep&&d.statut!=="brouillon"?'<div class="sub">le '+fdate(d.dateRep)+'</div>':'')+'</td>'+
    '<td>'+dvRealHTML(d,s)+'</td></tr>'}
function renderDevis(){const el=$("#view-devis");if(!el)return;
  const B=dvBase(),L=dvList(B),K=dvKpis(B);
  const yrs=[...new Set(S.devis.map(d=>(d.date||"").slice(0,4)).filter(Boolean).concat([String(new Date().getFullYear())]))].sort().reverse();
  const prs=[...new Set(S.devis.flatMap(d=>d.lignes.map(l=>l.presta)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"fr"));
  const KS=[...new Set(S.devis.map(d=>d.compteId))].map(kOf).filter(Boolean),uq=f=>[...new Set(KS.map(f).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"fr"));
  const fams=FAMILLES.filter(([c])=>KS.some(k=>famOf(k)===c)),segs=uq(k=>k.segment),typs=uq(k=>k.typologie),tys=TYPES.filter(t=>KS.some(k=>k.type===t)),dps=DEPTS.filter(([c])=>KS.some(k=>k.dept===c));
  let h=pageH("Suivi de prospection","Suivi des devis",pl(S.devis.length,"devis","devis")+' suivis · prélèvements <span class="est">en rouge : estimatifs</span>, <span class="def">en bleu : définitifs</span>',
    '<button class="btn ghost" type="button" data-act="dvexport">Exporter / Excel</button>'+(S.settings.dvxLast?'<button class="btn ghost" type="button" data-act="dvqn" title="Ce qui a changé lors du dernier import Excel">Quoi de neuf</button>':'')+'<button class="btn" type="button" data-act="dvimp" title="Devis Word (.docx) ou PDF, un ou plusieurs, ou export Excel des pièces (devis, commandes, factures) · ou glissez les fichiers sur la page">'+SV+'<path d="M8 10.5V2.5M4.8 5.6 8 2.4l3.2 3.2M2.5 10v3.5h11V10"/></svg>'+'Importer (Word, PDF ou Excel)</button><button class="btn primary" type="button" data-dvnew="1">'+I_PLUS+'Nouveau devis</button>');
  if(!S.devis.length){el.innerHTML=h+'<div class="list-wrap"><div class="empty"><h3>Aucun devis suivi pour l\'instant</h3><p>Pour chaque devis : le compte, les prestations, leur prix, les prélèvements (nombre × prix unitaire, estimatif en rouge puis définitif en bleu), puis les prestations réalisées au fil des interventions.</p><p style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button class="btn" type="button" data-act="dvimp">Importer (devis Word ou PDF, export Excel)</button><button class="btn primary" type="button" data-dvnew="1">'+I_PLUS+'Créer un devis</button></p><p class="sub">Vous pouvez aussi glisser vos devis .docx ou .pdf, ou votre export Excel, sur cette page.</p></div></div>';return}
  const tile=(vv,lbl,val,sub,cls)=>'<button type="button" class="kpi click'+(DVUI.vs.length===1&&DVUI.vs[0]===vv?' on':'')+'" data-dvv="'+vv+'"><span class="lbl">'+lbl+'</span><span class="v'+(cls?' '+cls:'')+'">'+val+'</span><span class="d">'+sub+'</span></button>';
  h+='<div class="dv-k">'+tile("attente","En attente",K.att,eur(K.attM)+(K.rel?' · <span class="late">'+K.rel+' à relancer</span>':''))+
    tile("realises","Acceptés",K.acc,eur(K.accM)+(K.taux!=null?'<br>transformation <b title="Acceptés ÷ (acceptés + refusés + sans suite), en nombre de devis ; les devis en attente ne comptent pas">'+K.taux+' %</b> en nombre · <b title="Même calcul sur les montants HT">'+K.tauxM+' %</b> en montant':''))+
    tile("realises","Réalisé",'<span class="num">'+eur(K.real)+'</span>',pl(K.nf,"prestation réalisée","prestations réalisées"))+
    tile("arealiser","Reste à réaliser",'<span class="num">'+eur(K.reste)+'</span>',pl(K.todo,"devis","devis")+" accepté"+(K.todo>1?"s":"")+" en cours")+
    tile("estim","Prélèvements",'<span class="num est">'+eur(K.est)+'</span>','<span class="est">'+pl(K.estD,"devis","devis")+' à confirmer</span>'+(K.def?' · <span class="def">'+eur(K.def)+' définitifs</span>':''))+'</div>';
  h+='<div class="chips" title="Plusieurs vues peuvent être cochées ensemble">'+DVV.map(([k,l,f])=>{const n=k==="tous"?B.length:B.filter(f).length,on=k==="tous"?!DVUI.vs.length:DVUI.vs.includes(k);return (k==="tous"||n||on)?'<button type="button" class="chip" data-dvc="'+k+'" aria-pressed="'+on+'">'+(k!=="tous"&&on?I_CHECK:'')+esc(l)+'<span class="n num">'+n+'</span></button>':''}).join("")+'</div>';
  const ms=(f,lab,items,all)=>{const cur=DVUI[f],ok=new Set(items.map(x=>x[0])),n=cur.length,one=n===1?(items.find(x=>x[0]===cur[0])||[0,cur[0]])[1]:"";
    return '<div class="field-s dv-ms'+(DVOPEN===f?' open':'')+'"><span class="lbl">'+lab+'</span><button type="button" class="dv-msb'+(n?' on':'')+'" data-dvms="'+f+'" aria-expanded="'+(DVOPEN===f)+'"><span>'+esc(n?(n===1?one:n+" sélectionnés"):all)+'</span>'+CHEV+'</button>'+
      (DVOPEN===f?'<div class="dv-msp" data-msp="'+f+'">'+(items.length>8?'<input type="search" class="dv-msq" data-msq="'+f+'" value="'+esc(MSQ[f]||"")+'" placeholder="Rechercher…">':'')+
        '<div class="dv-msl">'+items.filter(x=>x[2]||!MSQ[f]||nh(x[1]).includes(nh(MSQ[f]))||cur.includes(x[0])).map(x=>x[2]?'<div class="dv-msg">'+esc(x[1])+'</div>':'<label><input type="checkbox" data-dvm="'+f+'" value="'+esc(x[0])+'"'+(cur.includes(x[0])?' checked':'')+'><span>'+esc(x[1])+'</span></label>').join("")+'</div>'+
        '<div class="dv-msf"><button type="button" class="more" data-dvmclr="'+f+'">Effacer</button><button type="button" class="btn primary" data-dvmok="1">OK</button></div></div>':'')+'</div>'};
  const nf=DVF.filter(k=>DVUI[k].length).length+(DVUI.q?1:0);
  const clItems=[].concat(fams.length?[["","Famille",1]].concat(fams.map(([c,n])=>["f:"+c,n])):[],segs.length?[["","Segment",1]].concat(segs.map(x=>["s:"+x,x])):[],typs.length?[["","Typologie",1]].concat(typs.map(x=>["y:"+x,x])):[],tys.length?[["","Type de compte",1]].concat(tys.map(x=>["t:"+x,x])):[]);
  const srt=DVUI.sorts.map((x,i)=>(DVUI.sorts.length>1?(i+1)+". ":"")+DVSL[x.k]+(x.dir==="asc"?" ↑":" ↓")).join(", ");
  h+='<div class="filters dv-f2"><div class="field-s dv-q"><label for="dvQ">Rechercher</label><input type="search" id="dvQ" value="'+esc(DVUI.q)+'" placeholder="Compte, n° de devis ou de facture, objet, prestation, contact…"></div>'+
    ms("an","Année",yrs.map(y=>[y,y]),"Toutes")+ms("mo","Mois",MOIS.map((m,i)=>[pad(i+1),blCap(m)]),"Tous")+ms("pr","Prestation",prs.map(p=>[p,p]),"Toutes")+ms("cl","Typologie client",clItems,"Toutes")+ms("dp","Département",dps.map(([c,n])=>[c,c+" · "+n]),"Tous")+
    '<div class="field-s dv-ms'+(DVOPEN==="sort"?' open':'')+'"><span class="lbl">Trier par</span><button type="button" class="dv-msb on" data-dvms="sort" aria-expanded="'+(DVOPEN==="sort")+'"><span>'+esc(srt||"Date ↓")+'</span>'+CHEV+'</button>'+
     (DVOPEN==="sort"?'<div class="dv-msp"><p class="hint" style="margin:0 0 6px">Cochez un ou plusieurs critères : ils s\'appliquent dans l\'ordre où vous les cochez.</p><div class="dv-msl">'+DVSORT.map(([k,l])=>{const i=DVUI.sorts.findIndex(x=>x.k===k),x=DVUI.sorts[i];
       return '<div class="dv-so"><label><input type="checkbox" data-dvso="'+k+'"'+(x?' checked':'')+'><span class="dv-on num">'+(x?i+1:"")+'</span><span>'+esc(l)+'</span></label>'+(x?'<button type="button" class="dv-dir" data-dvdir="'+k+'" title="Inverser l\'ordre">'+(x.dir==="asc"?"Croissant ↑":"Décroissant ↓")+'</button>':'')+'</div>'}).join("")+'</div>'+
       '<div class="dv-msf"><span></span><button type="button" class="btn primary" data-dvmok="1">OK</button></div></div>':'')+'</div>'+
    '<div class="field-s"><label for="dvGrp">Regrouper</label><select id="dvGrp" data-dvf="dvGrp">'+DVGRP.map(([v,l])=>'<option value="'+v+'"'+(DVUI.grp===v?' selected':'')+'>'+esc(l)+'</option>').join("")+'</select></div>'+
    (nf?'<div class="field-s" style="justify-content:flex-end"><button class="btn ghost" type="button" data-act="dvfx">Effacer les filtres ('+nf+')</button></div>':'')+'</div>';
  if(!L.length){el.innerHTML=h+'<div class="list-wrap"><div class="empty"><h3>Aucun devis dans cette vue</h3><p>Changez de vue ou retirez un filtre.</p></div></div>';return}
  const T=L.reduce((a,d)=>a+dvSum(d).tot,0),tree=dvGroupTree(L);
  const th=(k,l,cls,cs)=>{const i=DVUI.sorts.findIndex(x=>x.k===k),x=DVUI.sorts[i];return '<th'+(cls?' class="'+cls+'"':'')+(cs?' colspan="'+cs+'"':'')+'><button type="button" class="dv-th'+(x?' on':'')+'" data-dvsort="'+k+'" title="Trier · Maj+clic : ajouter ce critère">'+l+(x?' <i>'+(DVUI.sorts.length>1?(i+1):'')+(x.dir==="asc"?"↑":"↓")+'</i>':'')+'</button></th>'};
  let body="",shown=0;const lim=DVUI.lim;
  const rows=list=>{let s="";for(const d of list){if(shown>=lim)break;s+=dvRow(d,DVUI.grp==="compte");shown++}return s};
  if(!tree)body=rows(L);
  else tree.forEach(G=>{body+=DVUI.grp==="compte"?dvCHead(G):dvGHead(G,0);if(!dvGOpen(G.key,G.def))return;
    if(G.sub)G.sub.forEach(M=>{body+=dvGHead(M,1);if(dvGOpen(M.key,M.def))body+=rows(M.items)});else body+=rows(G.items)});
  const aff=DVUI.grp==="compte"?"compte":DVUI.grp==="aucun"?"liste":"mois";
  h+='<div class="dv-gt"><div class="seg" role="group" aria-label="Affichage"><button type="button" data-dvaff="mois" aria-pressed="'+(aff==="mois")+'">Par mois</button><button type="button" data-dvaff="compte" aria-pressed="'+(aff==="compte")+'">Par compte</button><button type="button" data-dvaff="liste" aria-pressed="'+(aff==="liste")+'">Liste</button></div>'+
    (DVUI.grp==="compte"?'<span class="sub">'+pl(tree.length,"compte")+' · '+pl(L.length,"dossier")+' · '+eur(T)+' HT · ouvrez un compte pour voir ses devis</span>':'')+'<span class="grow"></span>'+
    (tree?'<button type="button" class="more" data-act="dvgall" data-o="1">Tout déplier</button><button type="button" class="more" data-act="dvgall" data-o="0">Tout replier</button>':'')+'</div>'+
   '<div class="list-wrap"><table class="tbl dv-tbl"><thead><tr>'+(DVUI.grp==="compte"?th("compte","Compte","",2)+th("nb","Dossiers")+th("mt","Montant global HT","r")+th("taux","Statut · transformation")+th("real","Réalisé"):th("date","Date · N°")+th("compte","Compte · objet")+th("presta","Prestations")+th("mt","Montant HT","r")+th("statut","Statut")+th("real","Réalisation"))+'</tr></thead><tbody>'+body+'</tbody></table></div>'+
   '<div class="pager">'+(shown>=lim?'<button class="btn" type="button" data-act="dvmore">Afficher plus</button>':'')+'<span class="sub">'+pl(L.length,"devis","devis")+' · '+eur(T)+' HT</span></div>';
  el.innerHTML=h}
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("button");if(!t||S.tab!=="devis")return;const d=t.dataset;
  if(d.dvg){const cur=t.getAttribute("aria-expanded")==="true";DVUI.open[d.dvg]=!cur;dvUiSave();renderDevis();return}
  if(d.dvaff){const a=d.dvaff;if(a==="compte"){if(DVUI.grp!=="compte"&&(DVUI.sorts[0]||{}).k==="date")DVUI.sorts=[{k:"mt",dir:"desc"}];DVUI.grp="compte"}
    else{if(DVUI.grp==="compte"&&(DVUI.sorts[0]||{}).k==="mt")DVUI.sorts=[{k:"date",dir:"desc"}];DVUI.grp=a==="liste"?"aucun":"mois"}dvUiSave();renderDevis();return}
  if(d.act==="dvgall"){const tree=dvGroupTree(dvList())||[],o=d.o==="1";tree.forEach(G=>{DVUI.open[G.key]=o;if(o)(G.sub||[]).forEach(M=>{DVUI.open[M.key]=true})});dvUiSave();renderDevis();return}
  if(d.dvsort){const k=d.dvsort,i=DVUI.sorts.findIndex(x=>x.k===k),def=(DVSORT.find(x=>x[0]===k)||[])[2]||"desc";
    if(e.shiftKey){if(i>=0)DVUI.sorts[i].dir=DVUI.sorts[i].dir==="asc"?"desc":"asc";else DVUI.sorts.push({k,dir:def})}
    else DVUI.sorts=[{k,dir:i===0&&DVUI.sorts.length===1?(DVUI.sorts[0].dir==="asc"?"desc":"asc"):def}];
    dvUiSave();renderDevis();return}
  if(d.dvc){const k=d.dvc;if(k==="tous")DVUI.vs=[];else DVUI.vs=DVUI.vs.includes(k)?DVUI.vs.filter(x=>x!==k):DVUI.vs.concat(k);DVUI.lim=400;dvUiSave();renderDevis();return}
  if(d.dvms){DVOPEN=DVOPEN===d.dvms?"":d.dvms;renderDevis();const q=document.querySelector(".dv-msp .dv-msq");if(q)q.focus({preventScroll:true});return}
  if(d.dvmok){DVOPEN="";renderDevis();return}
  if(d.dvmclr){DVUI[d.dvmclr]=[];dvUiSave();renderDevis();return}
  if(d.dvdir){const x=DVUI.sorts.find(y=>y.k===d.dvdir);if(x)x.dir=x.dir==="asc"?"desc":"asc";dvUiSave();renderDevis();return}});
let DVOPEN="";const MSQ={};
document.addEventListener("click",e=>{if(S.tab!=="devis"||!e.target.closest)return;const tr=e.target.closest("tr[data-dvgr]");if(!tr||e.target.closest("button,a"))return;const b=tr.querySelector("[data-dvg]");if(b)b.click()});
/* Fermeture d'une liste à cocher par un clic à côté */
document.addEventListener("mousedown",e=>{if(!DVOPEN||S.tab!=="devis")return;if(e.target.closest&&e.target.closest(".dv-ms.open"))return;DVOPEN="";document.querySelectorAll(".dv-ms.open").forEach(el=>{el.classList.remove("open");const p=el.querySelector(".dv-msp");if(p)p.remove();const b=el.querySelector(".dv-msb");if(b)b.setAttribute("aria-expanded","false")})});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&DVOPEN&&S.tab==="devis"&&$("#modal").hidden){e.stopImmediatePropagation();DVOPEN="";renderDevis()}},true);
function dvMsKeep(fn){const p=document.querySelector(".dv-msl"),sc=p?p.scrollTop:0;fn();const n=document.querySelector(".dv-msl");if(n)n.scrollTop=sc}
document.addEventListener("input",e=>{const t=e.target;if(t&&t.dataset&&t.dataset.msq){MSQ[t.dataset.msq]=t.value;const f=t.dataset.msq;keepFocusSel('.dv-msq[data-msq="'+f+'"]',renderDevis)}});
function keepFocusSel(sel,fn){const el=document.querySelector(sel),pos=el?el.selectionStart:0;fn();const n=document.querySelector(sel);if(n){n.focus({preventScroll:true});try{n.setSelectionRange(pos,pos)}catch(_){}}}
document.addEventListener("change",e=>{const t=e.target;if(!t||!t.dataset)return;
  if(t.dataset.dvm){const f=t.dataset.dvm,v=t.value;DVUI[f]=t.checked?DVUI[f].concat(v):DVUI[f].filter(x=>x!==v);DVUI.lim=400;dvUiSave();dvMsKeep(renderDevis);return}
  if(t.dataset.dvso){const k=t.dataset.dvso;if(t.checked){if(!DVUI.sorts.some(x=>x.k===k))DVUI.sorts.push({k,dir:(DVSORT.find(x=>x[0]===k)||[])[2]||"desc"})}else{DVUI.sorts=DVUI.sorts.filter(x=>x.k!==k);if(!DVUI.sorts.length)DVUI.sorts=[{k:"date",dir:"desc"}]}dvUiSave();dvMsKeep(renderDevis);return}
  if(t.dataset.dvf==="dvGrp"){DVUI.grp=t.value;dvUiSave();renderDevis()}});
/* ---------- Bloc du tableau de bord et de la fiche compte ---------- */
function dvWidget(){const y=String(new Date().getFullYear()),all=S.devis,KA=dvKpis(all),KY=dvKpis(all.filter(d=>(d.date||"").slice(0,4)===y));
  let h='<div class="panel"><div class="ph"><h2>Suivi de mes devis</h2><button type="button" class="more" data-dvnew="1">+ Devis</button><button type="button" class="more" data-dvv="tous">Tous les devis</button></div>';
  if(!all.length)return h+'<p class="hint">Aucun devis suivi pour l\'instant. Pour chaque devis : le compte, les prestations et leur prix, les prélèvements (estimatifs en rouge, définitifs en bleu), puis les prestations réalisées.</p></div>';
  const att=all.filter(d=>d.statut==="attente").sort((a,b)=>(a.date||"").localeCompare(b.date||"")),todo=all.filter(dvToDo).sort(dvSortD);
  const tile=(vv,lbl,val,sub)=>'<button type="button" class="dv-wk" data-dvv="'+vv+'"><span class="lbl">'+lbl+'</span><b>'+val+'</b><span class="sub">'+sub+'</span></button>';
  const row=(d,right)=>{const k=kOf(d.compteId),s=dvSum(d);return '<button type="button" class="dv-wr" data-dvid="'+esc(d.id)+'"><span class="grow"><b>'+esc(k?k.nom:"Compte ?")+'</b><span class="sub">'+esc([d.numero?"N° "+d.numero:"",d.objet||dvShort((d.lignes[0]||{}).presta)].filter(Boolean).join(" · "))+'</span></span>'+right(d,s)+'</button>'};
  h+='<div class="dv-wks">'+tile("attente","En attente",'<span class="num">'+KA.att+'</span>',eur(KA.attM)+(KA.rel?' · <span class="late">'+KA.rel+' à relancer</span>':''))+
    tile("realises","Acceptés "+y,'<span class="num">'+KY.acc+'</span>',eur(KY.accM)+(KY.taux!=null?' · transfo '+KY.taux+' % (nb) · '+KY.tauxM+' % (€)':''))+
    tile("realises","Réalisé "+y,'<span class="num">'+eur(KY.real)+'</span>',pl(KY.nf,"prestation","prestations"))+
    tile("arealiser","Reste à réaliser",'<span class="num">'+eur(KA.reste)+'</span>',pl(KA.todo,"devis","devis")+" en cours")+
    tile("estim","Prélèvements",'<span class="num est">'+eur(KA.est)+'</span>','<span class="est">estimatifs</span>'+(KA.def?' · <span class="def">'+eur(KA.def)+' définitifs</span>':''))+'</div>';
  const more=(n,v)=>n>5?'<button type="button" class="more" data-dvv="'+v+'">+ '+(n-5)+' autres</button>':'';
  h+='<div class="dv-wl"><div><h4>En attente de réponse <span class="num">'+att.length+'</span></h4>'+(att.length?att.slice(0,5).map(d=>row(d,(d,s)=>{const a=dvAge(d);return '<span class="r"><b class="num'+dvTotCls(s)+'">'+eur(s.tot)+'</b><span class="sub'+(dvRel(d)?' late':'')+'">'+(a!=null?(a?"depuis "+pl(a,"jour"):"aujourd'hui"):"")+'</span>'+(dvRel(d)?'<span class="dv-rl sm" data-dvrel="'+esc(d.id)+'" role="button" tabindex="0">Relancer</span>':'')+'</span>'})).join("")+more(att.length,"attente"):'<p class="hint">Aucun devis en attente.</p>')+'</div>'+
    '<div><h4>Acceptés, à réaliser <span class="num">'+todo.length+'</span></h4>'+(todo.length?todo.slice(0,5).map(d=>row(d,(d,s)=>'<span class="r"><b class="num'+dvTotCls(s)+'">'+eur(s.reste)+'</b><span class="sub">'+s.nf+' / '+s.n+' réalisée'+(s.nf>1?'s':'')+'</span></span>')).join("")+more(todo.length,"arealiser"):'<p class="hint">Aucune prestation en attente de réalisation.</p>')+'</div></div></div>';
  return h}
function dvAccPanel(k){const L=dvOf(k.id);
  let h='<div class="panel"><div class="ph"><h2>Devis</h2><span class="sub num">'+L.length+'</span><button type="button" class="more" data-dvnew="1" data-dvk="'+esc(k.id)+'">+ Devis</button></div>';
  if(!L.length)return h+'<p class="hint">Aucun devis suivi pour ce compte.</p></div>';
  const K=dvKpis(L);
  h+='<p class="sub" style="margin:-4px 0 0">'+[K.acc?pl(K.acc,"accepté")+" · "+eur(K.accM):"",K.att?K.att+" en attente · "+eur(K.attM):"",K.real?eur(K.real)+" réalisé":""].filter(Boolean).join(" · ")+'</p>';
  return h+'<div class="cards">'+L.map(d=>{const s=dvSum(d);
    return '<button type="button" class="dv-card" data-dvid="'+esc(d.id)+'"><span class="ctop"><span class="num">'+(d.date?fdate(d.date):"—")+'</span>'+(d.numero?'<span class="sub">N° '+esc(d.numero)+'</span>':'')+'<span class="grow"></span>'+dvPill(d)+'</span>'+
      (d.objet?'<span class="sub">'+esc(d.objet)+'</span>':'')+dvTags(d)+
      '<span class="dv-cl"><b class="num'+dvTotCls(s)+'">'+eur(s.tot)+' HT</b>'+(s.prel?'<span class="sub">'+dvPrelTxt(s)+'</span>':'')+'</span>'+
      (d.statut==="accepte"?'<span class="dv-rm"><span class="num">'+s.nf+' / '+s.n+'</span><span class="meter"><b style="width:'+(s.n?s.nf/s.n*100:0)+'%;background:var(--ok)"></b></span></span>':'')+'</button>'}).join("")+'</div></div>'}

/* ---------- Fenêtre devis ---------- */
let DV=null,dvNew=false,dvDelA=false,DVCAT=false,DVKI=0;
function openDevis(id,preset){if(MODAL&&MODAL!=="devis")closeModal();
  const src=id?S.devis.find(d=>d.id===id):null;if(id&&!src){toast("Devis introuvable.");return}
  dvNew=!src;dvDelA=false;
  DV=src?dvnorm(clone(src)):Object.assign(dvblank(),{id:uid(),creeLe:now()},preset||{});
  DV._k=(kOf(DV.compteId)||{}).nom||"";
  if(dvNew&&DV.compteId&&!DV.contactId){const p=principal(DV.compteId);if(p)DV.contactId=p.id}
  DVCAT=dvNew;dvDraw(true);
  setTimeout(()=>{const f=dvNew&&!DV._k?$("#dv-k"):null;if(f)f.focus({preventScroll:true})},40)}
function dvKcHTML(d,k){return '<div class="f s2"><label class="lbl" for="dv-k">Compte <span class="req">*</span></label><div class="kc"><input type="search" id="dv-k" value="'+esc(d._k)+'" placeholder="Rechercher un compte : nom, ville, contact, e-mail…" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="dvkList" aria-autocomplete="list"><div class="kc-list" id="dvkList" role="listbox" hidden></div></div>'+
  (k?'<p class="hint kc-sel">'+esc(kInfo(k))+'</p>':d._k?'<p class="hint">Nouveau compte : il sera créé à l\'enregistrement.</p>':'')+'</div>'}
function dvLineHTML(l,i){const hp=lHasP(l),c=l.def?"def":"est";
  return '<div class="dv-l'+(l.faite?' done':'')+'" data-li="'+i+'">'+
   '<div class="dv-c"><span class="lbl dv-m">Prestation</span><input type="text" list="dvCatL" data-lf="presta" value="'+esc(l.presta)+'" placeholder="Choisir ou saisir une prestation" aria-label="Prestation"></div>'+
   '<div class="dv-c"><span class="lbl dv-m">Prix HT</span><span class="dv-eu"><input type="number" min="0" step="any" inputmode="decimal" data-lf="prix" value="'+esc(l.prix)+'" aria-label="Prix HT de la prestation"><i>€</i></span></div>'+
   '<div class="dv-c">'+(l.pOn?
     '<span class="lbl dv-m">Prélèvements : nombre × prix unitaire</span><div class="dv-pr"><input type="number" min="0" step="1" inputmode="numeric" data-lf="nb" class="dv-nb '+c+'" value="'+esc(l.nb)+'" placeholder="Nb" aria-label="Nombre de prélèvements"><span class="x">×</span><span class="dv-eu"><input type="number" min="0" step="any" inputmode="decimal" data-lf="pu" class="'+c+'" value="'+esc(l.pu)+'" placeholder="PU" aria-label="Prix unitaire HT d\'un prélèvement"><i>€</i></span>'+
     '<span class="dv-ed" role="group" aria-label="Nombre de prélèvements"><button type="button" class="e'+(l.def?'':' on')+'" data-dvdef="0" aria-pressed="'+!l.def+'" title="Nombre estimé au devis (rouge)">Estimatif</button><button type="button" class="d'+(l.def?' on':'')+'" data-dvdef="1" aria-pressed="'+l.def+'" title="Nombre réel après intervention (bleu)">Définitif</button></span>'+
     '<button type="button" class="dv-x" data-dvpon="0" title="Retirer les prélèvements de cette ligne" aria-label="Retirer les prélèvements">×</button></div>'
     :'<button type="button" class="dv-addp" data-dvpon="1">'+I_PLUS+'Prélèvements</button>')+'</div>'+
   '<div class="dv-c dv-amt"><span class="lbl dv-m">Montant HT</span><span class="num'+(hp?' '+c:'')+'" data-lt>'+eur2(lTot(l))+'</span><span class="sub'+(hp?' '+c:'')+'" data-lp>'+(hp?'dont '+eur2(lPrel(l)):'')+'</span></div>'+
   '<div class="dv-c dv-fa"><label class="toggle"><input type="checkbox" data-lf="faite"'+(l.faite?' checked':'')+'> Réalisée</label>'+(l.faite?'<input type="date" data-lf="faiteLe" value="'+esc(l.faiteLe)+'" aria-label="Réalisée le">':'')+'</div>'+
   '<button type="button" class="dv-del" data-dvldel="'+i+'" title="Retirer cette prestation" aria-label="Retirer cette prestation">'+SV+'<path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 9h5.8l.6-9"/></svg></button></div>'}
function dvTotHTML(d){const s=dvSum(d);
  return '<div><span class="lbl">Prestations</span><b class="num">'+eur2(s.presta)+'</b><span class="sub">'+pl(s.n,"prestation")+'</span></div>'+
   '<div><span class="lbl">Prélèvements</span><b class="num">'+(s.est||s.def?(s.est?'<span class="est">'+eur2(s.est)+'</span>':'')+(s.est&&s.def?' + ':'')+(s.def?'<span class="def">'+eur2(s.def)+'</span>':''):eur2(0))+'</b><span class="sub">'+([s.nbE?'<span class="est">'+s.nbE+' estimatif'+(s.nbE>1?'s':'')+'</span>':'',s.nbD?'<span class="def">'+s.nbD+' définitif'+(s.nbD>1?'s':'')+'</span>':''].filter(Boolean).join(" · ")||"aucun")+'</span></div>'+
   '<div class="t"><span class="lbl">Total HT'+(s.estN?' · estimatif':'')+'</span><b class="num'+dvTotCls(s)+'">'+eur2(s.tot)+'</b></div>'+
   '<div><span class="lbl">Réalisé</span><b class="num">'+eur2(s.real)+'</b><span class="sub">'+s.nf+' / '+pl(s.n,"prestation")+'</span></div>'}
function dvCatHTML(){const have=new Map();DV.lignes.forEach(l=>have.set(l.presta,(have.get(l.presta)||0)+1));
  return '<div class="dv-cat"><p class="hint" style="margin:0">Cliquez sur les prestations du devis : chacune ajoute une ligne. Les repérages et l\'amiante dans l\'air ouvrent aussi les prélèvements.</p>'+
   DV_CAT.map(([g,L])=>'<div class="g"><span>'+esc(g)+'</span><div class="chips">'+L.map(p=>'<button type="button" class="chip" data-dvadd="'+esc(p)+'" aria-pressed="'+have.has(p)+'">'+(have.has(p)?I_CHECK:I_PLUS)+esc(p)+(have.get(p)>1?'<span class="n num">×'+have.get(p)+'</span>':'')+'</button>').join("")+'</div></div>').join("")+'</div>'}
function dvDraw(first){const d=DV,k=kOf(d.compteId),cts=k?ctOf(k.id):[];
  const db=$("#modal .db"),sc=!first&&db&&MODAL==="devis"?db.scrollTop:0;
  const custom=[...new Set(S.devis.flatMap(x=>x.lignes.map(l=>l.presta)).filter(p=>p&&!DV_ALL.includes(p)))];
  const rep=d.statut==="accepte"||d.statut==="refuse"||d.statut==="sansuite";
  showModal(mHead(dvNew?"Nouveau devis":"Devis",(d.numero?"N° "+esc(d.numero)+" · ":"")+esc(d._k||"Compte à renseigner"))+
  '<div class="db"><form id="dvForm" class="dv-form" onsubmit="return false">'+dvImpHTML()+(d.avoir?'<div class="notice warn"><b>Avoir émis'+(d.avoir.le?' le '+fdate(d.avoir.le):'')+' : '+eur(d.avoir.m)+'</b>'+(d.avoir.pieces&&d.avoir.pieces.length?' ('+esc(d.avoir.pieces.join(", "))+')':'')+'. Le devis a été accepté : il reste compté comme gagné, au montant du devis.</div>':'')+
   (dvNew&&!d._imp?'<div class="dv-impb"><button class="btn" type="button" data-act="dvimp">'+SV+'<path d="M8 10.5V2.5M4.8 5.6 8 2.4l3.2 3.2M2.5 10v3.5h11V10"/></svg>'+'Remplir depuis le devis (Word ou PDF)</button><span class="sub">Compte, n°, date, objet, prestations, prix et analyses sont repris du fichier · ou glissez-le ici</span></div>':'')+
   '<div class="dv-head">'+dvKcHTML(d,k)+
    '<div class="f"><label class="lbl" for="dv-ct">Contact</label><select id="dv-ct"><option value="">—</option>'+cts.map(c=>'<option value="'+esc(c.id)+'"'+(c.id===d.contactId?' selected':'')+'>'+esc(c.nom||c.mail||"Contact")+(c.fonction?' · '+esc(c.fonction):'')+'</option>').join("")+'</select></div>'+
    fld("dv-num","N° de devis",d.numero,"text",' placeholder="Référence du devis"')+
    '<div class="f s2"><label class="lbl" for="dv-obj">Objet / site</label><input type="text" id="dv-obj" value="'+esc(d.objet)+'" placeholder="Ex. : repérage avant travaux, bâtiment B, 12 rue…"></div>'+
    fld("dv-date","Date du devis",d.date,"date")+
    (rep?fld("dv-rep",d.statut==="accepte"?"Accepté le":"Réponse le",d.dateRep,"date"):'<div class="f dv-sp"></div>')+
    '<div class="f s4"><span class="lbl">Statut</span><div class="seg dv-seg" role="group" aria-label="Statut du devis">'+DVST.map(([s,l])=>'<button type="button" data-dvst="'+s+'" aria-pressed="'+(d.statut===s)+'">'+esc(l)+'</button>').join("")+'</div></div>'+
   '</div>'+
   '<div class="dv-sec"><div class="dv-sh"><h3>Prestations du devis</h3><button class="btn'+(DVCAT?' primary':'')+'" type="button" data-act="dvcat" aria-pressed="'+DVCAT+'">'+(DVCAT?'Fermer le catalogue':I_PLUS+'Catalogue des prestations')+'</button><button class="btn ghost" type="button" data-act="dvfree">'+I_PLUS+'Prestation libre</button></div>'+
    (DVCAT?dvCatHTML():'')+
    '<datalist id="dvCatL">'+DV_ALL.concat(custom).map(p=>'<option value="'+esc(p)+'">').join("")+'</datalist>'+
    (d.lignes.length?'<div class="dv-lines"><div class="dv-lh"><span>Prestation</span><span>Prix HT</span><span>Prélèvements : nombre × prix unitaire</span><span class="r">Montant HT</span><span>Réalisation</span><span></span></div>'+d.lignes.map(dvLineHTML).join("")+'</div>':'<p class="hint">Aucune prestation pour l\'instant : ouvrez le catalogue et cliquez sur les prestations du devis.</p>')+
    '<div class="dv-tot" id="dvTot">'+dvTotHTML(d)+'</div>'+
    '<p class="hint dv-leg"><span class="est">Rouge</span> : nombre de prélèvements estimatif, tel que chiffré au devis. <span class="def">Bleu</span> : nombre définitif, après intervention. Cochez « Réalisée » au fil des interventions.</p>'+
   '</div>'+
   ta("dv-not","Notes",d.notes,3,"Conditions, pièces attendues, interlocuteur, motif de refus…")+
  '</form></div>'+
  '<div class="df">'+(dvNew?'':'<button class="btn danger" type="button" data-act="dvdel">Supprimer</button>')+(k&&!dvNew?'<button class="btn ghost" type="button" data-kopen="'+esc(k.id)+'">Fiche compte</button>':'')+'<button class="btn ghost" type="button" data-act="dvrel">'+I_EV.tache+'Planifier une relance</button>'+(!dvNew&&d.statut==="attente"?'<button class="btn ghost" type="button" data-dvrel="'+esc(d.id)+'">'+I_MAIL+'Mail de relance</button>':'')+'<span class="grow"></span><button class="btn" type="button" data-act="mclose">Annuler</button><button class="btn primary" type="button" data-act="dvsave">'+(dvNew?'Créer le devis':'Enregistrer')+'</button></div>',"devis");
  modalBig();if(sc){const n=$("#modal .db");if(n)n.scrollTop=sc}}
function dvRead(){if(!DV||!$("#dvForm"))return;const d=DV;
  const ct=$("#dv-ct");if(ct)d.contactId=ct.value;
  const typed=vOf("dv-k"),k=findCompte(typed);d._k=typed;
  if(k){if(k.id!==d.compteId){d.compteId=k.id;const p=principal(k.id);d.contactId=p?p.id:""}}else{d.compteId="";d.contactId=""}
  d.numero=vOf("dv-num");d.objet=vOf("dv-obj");d.date=vOf("dv-date");const r=$("#dv-rep");if(r)d.dateRep=r.value;d.notes=vOf("dv-not");
  document.querySelectorAll("#dvForm .dv-l").forEach(el=>{const l=d.lignes[+el.dataset.li];if(!l)return;
    el.querySelectorAll("[data-lf]").forEach(i=>{l[i.dataset.lf]=i.type==="checkbox"?i.checked:String(i.value).trim()})})}
function dvLineRefresh(le,l){const hp=lHasP(l),c=l.def?"def":"est",a=le.querySelector("[data-lt]"),p=le.querySelector("[data-lp]");
  if(a){a.textContent=eur2(lTot(l));a.className="num"+(hp?" "+c:"")}if(p){p.textContent=hp?"dont "+eur2(lPrel(l)):"";p.className="sub"+(hp?" "+c:"")}}
function dvSave(){dvRead();const d=DV;
  if(!d._k){toast("Indiquez le compte.");const f=$("#dv-k");if(f)f.focus({preventScroll:true});return null}
  d.lignes=d.lignes.filter(l=>l.presta||nb0(l.prix)||(l.pOn&&nb0(l.nb)));
  if(!d.lignes.length){dvDraw();toast("Ajoutez au moins une prestation.");return null}
  if(d.numero){const o=S.devis.find(x=>x.id!==d.id&&nh(x.numero)===nh(d.numero));if(o){toast("Le devis n° "+d.numero+" est déjà suivi ("+((kOf(o.compteId)||{}).nom||"")+") : pas de doublon.");return null}}
  let k=findCompte(d._k),created=false;if(!k){k=ensureCompte(d._k,(d._imp&&d._imp.init)||{origine:"devis"});created=true}
  d.compteId=k.id;if(!d.date)d.date=todayISO();if(d._imp)dvImpContact(d,k);
  d.lignes.forEach(l=>{if(!l.presta)l.presta="Prestation";if(!l.pOn){l.nb="";l.pu="";l.def=false}if(!l.faite)l.faiteLe="";else if(!l.faiteLe)l.faiteLe=todayISO()});
  const o=Object.assign({},d);delete o._k;delete o._imp;delete o._upd;put("devis",o);
  const wasNew=dvNew,s=dvSum(o);closeModal();commit();
  toast((wasNew?"Devis créé":"Devis enregistré")+" · "+k.nom+" · "+eur(s.tot)+" HT"+(s.estN?" (prélèvements estimatifs)":"")+(created?" · compte créé":""));
  return {k,o}}
function dvDelete(btn){if(!dvDelA){dvDelA=true;btn.classList.add("armed");btn.textContent="Confirmer la suppression";return}
  drop("devis",DV.id);closeModal();commit();toast("Devis supprimé")}
/* Recherche de compte dans la fenêtre devis */
function dvRenderKc(){const inp=$("#dv-k"),box=$("#dvkList");if(!inp||!box)return;const q=inp.value.trim(),L=kSearch(q,12);DVKI=0;
  let h=(!q&&L.length?'<div class="kc-h">Comptes récents</div>':'')+L.map((k,i)=>'<button type="button" class="kc-o'+(i===0?' act':'')+'" data-dvpick="'+esc(k.id)+'" role="option"><span class="grow"><b>'+esc(k.nom)+'</b><span class="sub">'+esc(kInfo(k))+'</span></span></button>').join("");
  if(q&&!findCompte(q))h+='<button type="button" class="kc-o'+(L.length?'':' act')+'" data-dvpick="__new" role="option">'+I_PLUS+'<span class="grow">Créer le compte « <b>'+esc(q)+'</b> »</span></button>';
  box.innerHTML=h;box.hidden=!h;inp.setAttribute("aria-expanded",String(!box.hidden))}
function dvPick(id){if(!DV)return;const typed=vOf("dv-k");dvRead();
  if(id==="__new"){DV._k=typed;DV.compteId="";DV.contactId=""}
  else{const k=kOf(id);if(!k)return;DV.compteId=id;DV._k=k.nom;const p=principal(id);DV.contactId=p?p.id:""}
  dvDraw();setTimeout(()=>{const f=$("#dv-num");if(f)f.focus({preventScroll:true})},20)}

/* ---------- Événements du suivi des devis ---------- */
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("button,tr[data-dvid]");if(!t)return;const d=t.dataset;
  if(d.dvnew){openDevis(null,d.dvk?{compteId:d.dvk}:(S.tab==="compte"&&kOf(S.kid)?{compteId:S.kid}:null));return}
  if(d.dvid){openDevis(d.dvid);return}
  if(d.dvv){DVUI.vs=d.dvv==="tous"?[]:[d.dvv];DVUI.lim=400;dvUiSave();if(S.tab!=="devis")showTab("devis");else renderDevis();return}
  if(d.act==="dvmore"){DVUI.lim+=200;renderDevis();return}
  if(d.act==="dvexport"){exportMenu();return}
  if(d.act==="dvfx"){DVUI.q="";DVF.forEach(k=>{DVUI[k]=[]});dvUiSave();renderDevis();return}
  if(!DV||MODAL!=="devis")return;
  if(d.dvst){dvRead();DV.statut=d.dvst;if(d.dvst==="attente"||d.dvst==="brouillon")DV.dateRep="";else if(!DV.dateRep)DV.dateRep=todayISO();dvDraw();return}
  if(d.act==="dvcat"){dvRead();DVCAT=!DVCAT;dvDraw();return}
  if(d.dvadd){dvRead();DV.lignes.push(dvLblank(d.dvadd));dvDraw();return}
  if(d.act==="dvfree"){dvRead();DV.lignes.push(dvLblank(""));dvDraw();setTimeout(()=>{const L=document.querySelectorAll('#dvForm .dv-l [data-lf="presta"]');if(L.length)L[L.length-1].focus({preventScroll:true})},30);return}
  const le=t.closest(".dv-l"),li=le?+le.dataset.li:-1,l=li>=0?DV.lignes[li]:null;
  if(d.dvdef!=null&&l){dvRead();l.def=d.dvdef==="1";dvDraw();if(l.def&&!nb0(l.nb))setTimeout(()=>{const x=document.querySelector('#dvForm .dv-l[data-li="'+li+'"] [data-lf="nb"]');if(x)x.focus({preventScroll:true})},30);return}
  if(d.dvpon!=null&&l){dvRead();l.pOn=d.dvpon==="1";if(!l.pOn){l.nb="";l.pu="";l.def=false}dvDraw();
    if(l.pOn)setTimeout(()=>{const x=document.querySelector('#dvForm .dv-l[data-li="'+li+'"] [data-lf="nb"]');if(x)x.focus({preventScroll:true})},30);return}
  if(d.dvldel!=null){dvRead();DV.lignes.splice(+d.dvldel,1);dvDraw();return}
  if(d.act==="dvsave"){dvSave();return}
  if(d.act==="dvdel"){dvDelete(t);return}
  if(d.act==="dvrel"){const r=dvSave();if(r)openAction({type:"tache",compteId:r.k.id,date:addD(todayISO(),7),objet:"Relancer le devis"+(r.o.numero?" n° "+r.o.numero:"")+(r.o.objet?" – "+r.o.objet:"")});return}
});
document.addEventListener("input",e=>{const t=e.target;if(!t||!t.closest)return;
  if(t.id==="dvQ"){DVUI.q=t.value;DVUI.lim=200;clearTimeout(qT);qT=setTimeout(()=>keepFocus("dvQ",renderDevis),180);return}
  if(!DV)return;
  if(t.id==="dv-k"){dvRenderKc();return}
  const le=t.closest("#dvForm .dv-l");if(!le||!t.dataset.lf||t.type==="checkbox")return;
  const l=DV.lignes[+le.dataset.li];if(!l)return;l[t.dataset.lf]=String(t.value).trim();dvLineRefresh(le,l);const b=$("#dvTot");if(b)b.innerHTML=dvTotHTML(DV)});
document.addEventListener("change",e=>{const t=e.target;if(!t||!t.closest)return;
  if(!DV)return;
  if(t.id==="dv-k"&&$("#dvkList")&&$("#dvkList").hidden){dvRead();dvDraw();return}
  const le=t.closest("#dvForm .dv-l");if(!le||!t.dataset.lf)return;const l=DV.lignes[+le.dataset.li];if(!l)return;
  if(t.dataset.lf==="faite"){dvRead();if(l.faite&&!l.faiteLe)l.faiteLe=todayISO();if(!l.faite)l.faiteLe="";
    const msg=[];if(l.faite&&(DV.statut==="attente"||DV.statut==="brouillon")){DV.statut="accepte";if(!DV.dateRep)DV.dateRep=todayISO();msg.push("devis passé en « Accepté »")}
    if(l.faite&&lEst(l))msg.push("saisissez le nombre définitif de prélèvements");
    dvDraw();if(msg.length)toast("Prestation réalisée : "+msg.join(" · "));return}
  if(t.dataset.lf==="presta"){l.presta=String(t.value).trim();if(!l.pOn&&dvPrelDef(l.presta)){dvRead();l.pOn=true;dvDraw()}}});
document.addEventListener("keydown",e=>{const t=e.target;if(!t)return;
  if(t.matches&&t.matches("tr[data-dvid]")&&e.key==="Enter"){openDevis(t.dataset.dvid);return}
  if(t.id!=="dv-k")return;const box=$("#dvkList");
  if(!box||box.hidden){if(e.key==="ArrowDown"){dvRenderKc();e.preventDefault()}return}
  const o=[...box.querySelectorAll(".kc-o")];if(!o.length)return;
  if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();o[DVKI].classList.remove("act");DVKI=(DVKI+(e.key==="ArrowDown"?1:-1)+o.length)%o.length;o[DVKI].classList.add("act");o[DVKI].scrollIntoView({block:"nearest"});return}
  if(e.key==="Enter"){e.preventDefault();dvPick(o[DVKI].dataset.dvpick);return}
  if(e.key==="Escape"){e.preventDefault();e.stopImmediatePropagation();box.hidden=true;t.setAttribute("aria-expanded","false")}},true);
document.addEventListener("focusin",e=>{if(e.target.id==="dv-k"){const el=e.target;if(DV&&DV.compteId&&el.value)setTimeout(()=>{if(document.activeElement===el)el.select()},0);dvRenderKc()}});
document.addEventListener("focusout",e=>{if(e.target.id==="dv-k")setTimeout(()=>{if(document.activeElement&&document.activeElement.id==="dv-k")return;const b=$("#dvkList");if(b)b.hidden=true},120)});



/* ================= V3.9 · Devis dans le bilan d'activité ================= */
function blDevis(R){if(!BL.devis||!S.devis.length)return null;const q=nh(BL.q),inR=x=>!!x&&x>=R.from&&x<=R.t;
  const L=S.devis.filter(d=>{if(!q)return true;const k=kOf(d.compteId);return nh([k&&k.nom,k&&k.ville,d.numero,d.objet,d.notes,d.lignes.map(l=>l.presta).join(" ")].join(" ")).includes(q)});
  const byRep=(a,b)=>(b.dateRep||"").localeCompare(a.dateRep||"");
  const env=L.filter(d=>d.statut!=="brouillon"&&inR(d.date)).sort(dvSortD),acc=L.filter(d=>d.statut==="accepte"&&inR(d.dateRep)).sort(byRep),lost=L.filter(d=>!dvLive(d)&&inR(d.dateRep)).sort(byRep);
  const real=[];L.forEach(d=>d.lignes.forEach(l=>{if(l.faite&&inR(l.faiteLe))real.push({d,l})}));real.sort((a,b)=>b.l.faiteLe.localeCompare(a.l.faiteLe));
  const tot=a=>a.reduce((x,d)=>x+dvSum(d).tot,0);
  return {env,acc,lost,real,envM:tot(env),accM:tot(acc),lostM:tot(lost),realM:real.reduce((x,r)=>x+lTot(r.l),0),K:dvKpis(L)}}
const blDd=d=>blF(d,{day:"numeric",month:"short"}).replace(/\./g,"");
function blDevisHTML(V){if(!V)return "";const K=V.K;
  const tile=(lbl,v,sub,cls)=>'<div class="kpi"><span class="lbl">'+lbl+'</span><span class="v'+(cls?' '+cls:'')+'">'+v+'</span><span class="d">'+sub+'</span></div>';
  const row=(d,date,txt,amt,cls)=>{const k=kOf(d.compteId);return '<button type="button" class="dv-wr" data-dvid="'+esc(d.id)+'"><span class="bl-dd num">'+esc(blDd(date))+'</span><span class="grow"><b>'+esc(k?k.nom:"Compte ?")+'</b><span class="sub">'+esc(txt)+'</span></span><span class="r"><b class="num'+(cls||"")+'">'+eur(amt)+'</b></span></button>'};
  const dtx=d=>[d.numero?"N° "+d.numero:"",d.objet||d.lignes.map(l=>dvShort(l.presta)).join(", ")].filter(Boolean).join(" · ");
  const list=(title,arr,f,empty)=>'<div><h4>'+title+' <span class="num">'+arr.length+'</span></h4>'+(arr.length?arr.slice(0,8).map(f).join("")+(arr.length>8?'<button type="button" class="more" data-dvv="tous">+ '+(arr.length-8)+' autres dans le suivi des devis</button>':''):'<p class="hint">'+empty+'</p>')+'</div>';
  return '<div class="panel bl-dv"><div class="ph"><h2>Devis</h2><span class="sub">sur la période</span><button type="button" class="more" data-dvv="tous">Suivi des devis</button></div>'+
   '<div class="bl-dvk">'+tile("Devis envoyés",'<span class="num">'+V.env.length+'</span>',eur(V.envM)+" HT")+tile("Devis acceptés",'<span class="num">'+V.acc.length+'</span>',eur(V.accM)+" HT")+
    tile("Refusés / sans suite",'<span class="num">'+V.lost.length+'</span>',eur(V.lostM)+" HT")+tile("Prestations réalisées",'<span class="num">'+eur(V.realM)+'</span>',pl(V.real.length,"prestation"))+'</div>'+
   '<div class="bl-dvl">'+list("Envoyés",V.env,d=>{const s=dvSum(d);return row(d,d.date,dtx(d),s.tot,dvTotCls(s))},"Aucun devis envoyé sur la période.")+
    list("Acceptés",V.acc,d=>{const s=dvSum(d);return row(d,d.dateRep,dtx(d),s.tot,dvTotCls(s))},"Aucun devis accepté sur la période.")+
    (V.lost.length?list("Refusés / sans suite",V.lost,d=>{const s=dvSum(d);return row(d,d.dateRep,DVL[d.statut]+" · "+dtx(d),s.tot,"")},""):'')+
    list("Prestations réalisées",V.real,r=>row(r.d,r.l.faiteLe,r.l.presta+(lHasP(r.l)?" · "+nb0(r.l.nb)+" prél. "+(r.l.def?"définitifs":"estimatifs"):""),lTot(r.l),lHasP(r.l)?(r.l.def?" def":" est"):""),"Aucune prestation réalisée sur la période.")+'</div>'+
   '<p class="bl-enc">En cours aujourd\'hui : <b>'+pl(K.att,"devis","devis")+' en attente</b> ('+eur(K.attM)+(K.rel?', dont <span class="late">'+K.rel+' à relancer</span>':'')+') · <b>reste à réaliser '+eur(K.reste)+'</b> sur '+pl(K.todo,"devis","devis")+' accepté'+(K.todo>1?'s':'')+(K.est?' · prélèvements estimatifs <span class="est">'+eur(K.est)+'</span>':'')+'</p></div>'}
function blDevisTxt(V){if(!V)return "";const K=V.K,k=d=>(kOf(d.compteId)||{}).nom||"Compte ?";
  const ln=(date,d,txt,amt)=>"• "+blDd(date)+" – "+k(d)+(txt?" – "+txt:"")+" – "+eur(amt)+" HT";
  const dtx=d=>[d.numero?"n° "+d.numero:"",d.objet].filter(Boolean).join(" – ");
  let s="\nDEVIS\nSynthèse : "+[pl(V.env.length,"envoyé")+" ("+eur(V.envM)+")",pl(V.acc.length,"accepté")+" ("+eur(V.accM)+")",pl(V.lost.length,"refusé ou sans suite","refusés ou sans suite"),pl(V.real.length,"prestation réalisée","prestations réalisées")+" ("+eur(V.realM)+")"].join(" · ")+"\n";
  s+="En cours : "+pl(K.att,"devis","devis")+" en attente ("+eur(K.attM)+(K.rel?", dont "+K.rel+" à relancer":"")+") · reste à réaliser "+eur(K.reste)+(K.est?" · prélèvements estimatifs "+eur(K.est):"")+"\n";
  const sec=(t,L)=>{if(L.length)s+="\n"+t+"\n"+L.join("\n")+"\n"};
  sec("Envoyés",V.env.map(d=>ln(d.date,d,dtx(d),dvSum(d).tot)+(dvSum(d).estN?" (prélèvements estimatifs)":"")));
  sec("Acceptés",V.acc.map(d=>ln(d.dateRep,d,dtx(d),dvSum(d).tot)));
  sec("Refusés / sans suite",V.lost.map(d=>ln(d.dateRep,d,DVL[d.statut]+(dtx(d)?" – "+dtx(d):""),dvSum(d).tot)));
  sec("Prestations réalisées",V.real.map(r=>ln(r.l.faiteLe,r.d,r.l.presta+(lHasP(r.l)?" ("+nb0(r.l.nb)+" prélèvements "+(r.l.def?"définitifs":"estimatifs")+")":""),lTot(r.l))));
  return s}
function blDevisPrint(V){if(!V)return "";const K=V.K,k=d=>(kOf(d.compteId)||{}).nom||"Compte ?";
  const RED="#C62828",BLUE="#1F5FBF",col=c=>c==="est"?';color:'+RED:c==="def"?';color:'+BLUE:'';
  const tr=(date,d,txt,amt,c)=>'<tr><td class="d">'+esc(blDd(date))+'</td><td><b>'+esc(k(d))+'</b>'+(txt?'<div>'+esc(txt)+'</div>':'')+'</td><td style="text-align:right;white-space:nowrap'+col(c)+'">'+esc(eur(amt))+' HT</td></tr>';
  const dtx=d=>[d.numero?"N° "+d.numero:"",d.objet||d.lignes.map(l=>dvShort(l.presta)).join(", ")].filter(Boolean).join(" · ");
  const cl=s=>s.estN?"est":s.nbD?"def":"";
  const tb=(t,rows)=>rows.length?'<h3>'+esc(t)+' <span>'+rows.length+'</span></h3><table>'+rows.join("")+'</table>':'';
  return '<h2>Devis</h2><div class="k">'+[["Envoyés",V.env.length+" · "+eur(V.envM)],["Acceptés",V.acc.length+" · "+eur(V.accM)],["Refusés / sans suite",String(V.lost.length)],["Réalisé",eur(V.realM)],["En attente à date",K.att+" · "+eur(K.attM)],["Reste à réaliser",eur(K.reste)]].map(([l,v])=>'<div><b>'+esc(v)+'</b><span>'+esc(l)+'</span></div>').join("")+'</div>'+
   tb("Envoyés",V.env.map(d=>{const s=dvSum(d);return tr(d.date,d,dtx(d),s.tot,cl(s))}))+tb("Acceptés",V.acc.map(d=>{const s=dvSum(d);return tr(d.dateRep,d,dtx(d),s.tot,cl(s))}))+
   tb("Refusés / sans suite",V.lost.map(d=>tr(d.dateRep,d,DVL[d.statut]+" · "+dtx(d),dvSum(d).tot,"")))+
   tb("Prestations réalisées",V.real.map(r=>tr(r.l.faiteLe,r.d,r.l.presta+(lHasP(r.l)?" · "+nb0(r.l.nb)+" prélèvements "+(r.l.def?"définitifs":"estimatifs"):""),lTot(r.l),lHasP(r.l)?(r.l.def?"def":"est"):"")))+
   (K.est?'<p style="font-size:8.5pt;color:#69625B">Montants en rouge : prélèvements estimatifs · en bleu : prélèvements définitifs.</p>':'')}


/* ================= V3.10 · Import d'un devis Word (.docx) : remplit la ligne devis, sans doublon ================= */
/* Lecture du .docx dans le navigateur, sans bibliothèque : archive zip + DecompressionStream */
async function zipText(buf,name){const u8=new Uint8Array(buf),v=new DataView(buf);let e=-1;
  for(let i=u8.length-22;i>=Math.max(0,u8.length-65600);i--){if(v.getUint32(i,true)===0x06054b50){e=i;break}}
  if(e<0)throw new Error("zip");
  const n=v.getUint16(e+10,true);let p=v.getUint32(e+16,true);const td=new TextDecoder();
  for(let i=0;i<n;i++){if(v.getUint32(p,true)!==0x02014b50)break;
    const meth=v.getUint16(p+10,true),cs=v.getUint32(p+20,true),fl=v.getUint16(p+28,true),xl=v.getUint16(p+30,true),cl=v.getUint16(p+32,true),off=v.getUint32(p+42,true);
    if(td.decode(u8.subarray(p+46,p+46+fl))===name){const st=off+30+v.getUint16(off+26,true)+v.getUint16(off+28,true),data=u8.subarray(st,st+cs);
      if(meth===0)return td.decode(data);
      if(typeof DecompressionStream==="undefined")throw new Error("inflate");
      return td.decode(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer())}
    p+=46+fl+xl+cl}
  return null}
const WNS="http://schemas.openxmlformats.org/wordprocessingml/2006/main";
function wText(p){let s="";const tw=p.ownerDocument.createTreeWalker(p,1);let n=tw.currentNode;
  while(n){if(n.namespaceURI===WNS){const l=n.localName;if(l==="t")s+=n.textContent;else if(l==="tab")s+=" ";else if(l==="br"||l==="cr")s+="\n"}n=tw.nextNode()}
  return s.replace(/ /g," ")}
const dvNum=t=>{let x=String(t||"").replace(/[\s €]/g,"");if(!x||!/\d/.test(x))return null;if(x.includes(",")&&x.includes("."))x=x.replace(/,/g,"");else x=x.replace(",",".");const n=parseFloat(x);return isFinite(n)?n:null};
const dvIsPrel=t=>/\b(analyses?|pr[ée]l[èe]vements?|[ée]chantillons?)\b/i.test(t);
function dvParseDocx(xml,fname){const doc=new DOMParser().parseFromString(xml,"application/xml");
  const paras=[...doc.getElementsByTagNameNS(WNS,"p")].map(wText).map(s=>s.trim()).filter(Boolean);
  const cellLines=tc=>[...tc.getElementsByTagNameNS(WNS,"p")].map(wText).join("\n").split("\n").map(s=>s.replace(/\s+/g," ").trim()).filter(Boolean);
  const tables=[...doc.getElementsByTagNameNS(WNS,"tbl")].map(t=>[...t.getElementsByTagNameNS(WNS,"tr")].filter(tr=>tr.parentNode===t).map(tr=>[...tr.childNodes].filter(c=>c.localName==="tc").map(cellLines)));
  return dvParseCore(paras,tables,fname)}
function dvParseCore(paras,tables,fname){const all=paras.join("\n");
  const fm=String(fname||"").match(/([A-Z]{1,4}\d{5,})(?:[_ -](\d{4})-(\d{2})-(\d{2}))?/);
  const r={numero:"",date:"",objet:"",site:"",client:"",adresse:"",cp:"",ville:"",siret:"",contact:null,emetteur:"",agence:"",lignes:[],brut:[]};
  let m=all.match(/Affaire\s*n[°o]\s*:?\s*([A-Z]{0,4}\d{5,})/i)||all.match(/\bDevis\s*\n?\s*([A-Z]{1,4}\d{5,})/i);r.numero=m?m[1]:fm?fm[1]:"";
  m=all.match(/\ble\s+(\d{2})\/(\d{2})\/(\d{4})/i);r.date=m?m[3]+"-"+m[2]+"-"+m[1]:fm&&fm[2]?fm[2]+"-"+fm[3]+"-"+fm[4]:"";
  m=all.match(/^Objet\s*:\s*(.+)$/im)||all.match(/Description\s*:\s*(.+)$/im);r.objet=m?m[1].trim():"";
  const li=paras.findIndex(p=>/LIEU D.INTERVENTION/i.test(p));if(li>=0&&paras[li+1]&&!/^(ARTICLE|[A-Z]\.\s)/.test(paras[li+1]))r.site=paras[li+1].replace(/\s+/g," ").replace(/\s*:\s*/," : ").trim();
  /* Client : cellule « PROPOSITION ENTRE » */
  tables.forEach(t=>t.forEach(row=>row.forEach(c=>{if(r.client||!c.length||!/^PROPOSITION ENTRE/i.test(c[0]))return;
    const L=c.slice(1),name=[];let i=0;
    for(;i<L.length;i++){if(/^\d|SIRET|CI APR|attention|t[ée]l[ée]phone|mail\s*:/i.test(L[i])||/\b(rue|avenue|boulevard|bd|place|all[ée]e|chemin|quai|route|impasse|cours)\b/i.test(L[i]))break;name.push(L[i])}
    r.client=name.join(" ").replace(/\s+/g," ").trim();const adr=[];
    for(;i<L.length;i++){if(/SIRET|CI APR|attention/i.test(L[i]))break;const z=L[i].match(/^(\d{5})\s+(.+)$/);if(z){r.cp=z[1];r.ville=z[2]}else adr.push(L[i])}
    r.adresse=adr.join(", ");const txt=L.join("\n");
    let x=txt.match(/SIRET\s*:?\s*([\d ]{14,})/i);if(x)r.siret=x[1].replace(/\s/g,"");
    const nm=txt.match(/attention de\s+(?:(?:Monsieur|Madame|M\.|Mme|Mlle)\s+)?([^\n]+)/i),tel=txt.match(/t[ée]l[ée]phone\s*:?\s*([+\d][\d .]{8,})/i),ml=txt.match(/mail\s*:\s*([^\s@]+@[^\s]+)/i);
    if(nm||ml)r.contact={nom:nm?nm[1].trim():"",tel:tel?tel[1].trim():"",mail:ml?ml[1].trim():""}})));
  if(!r.contact){m=all.match(/attention de\s+(?:(?:Monsieur|Madame|M\.|Mme)\s+)?([^\n]+)/i);if(m)r.contact={nom:m[1].trim(),tel:"",mail:""}}
  m=all.match(/^Agence\s+([^\n\-–]+)/im);if(m)r.agence="Agence "+m[1].trim();
  /* Tableau des prestations : en-tête « Libellé … P.U … » */
  const hn=s=>nh(s).replace(/ /g,"");
  tables.forEach(t=>{const hi=t.findIndex(row=>{const h=row.map(c=>hn(c.join(" ")));return h.some(x=>x.startsWith("libell"))&&h.some(x=>x==="puht"||x==="pu"||x.startsWith("prixunit"))});if(hi<0)return;
    const H=t[hi].map(c=>hn(c.join(" "))),ix=f=>H.findIndex(f);
    const cL=ix(x=>x.startsWith("libell")),cQ=ix(x=>x.startsWith("qt")||x.startsWith("quant")),cU=ix(x=>x==="puht"||x==="pu"||x.startsWith("prixunit")),cT=ix(x=>x==="ptht"||x==="pt"||x.startsWith("montant")||x.startsWith("totalht")||x.startsWith("prixtotal"));
    t.slice(hi+1).forEach(row=>{const g=(k,back)=>(row.length===H.length?row[k]:row[row.length-back])||[];
      const lib=g(cL,H.length-cL),title=(lib[0]||"").trim();if(!title||/^total/i.test(title))return;
      const qs=(g(cQ,H.length-cQ).join(" ")||"").trim(),q=dvNum(qs),u=dvNum(g(cU,H.length-cU).join(" ")),tt=dvNum(g(cT,H.length-cT).join(" "));
      r.brut.push({title,desc:lib.slice(1).join(" "),qs,q,u,t:tt})})});
  /* Prélèvements / analyses : rattachés à la prestation amiante qui prévoit des prélèvements, sinon ligne à part */
  const rows=r.brut,base=rows.filter(x=>!dvIsPrel(x.title));
  base.forEach(x=>{const prix=x.t!=null&&x.t>0?x.t:(x.q&&x.u!=null?x.q*x.u:0);x.l=Object.assign(dvLblank(),{presta:x.title,prix:prix?String(Math.round(prix*100)/100):"",pOn:false});if(x.q&&x.q>1&&x.u!=null)x.l.presta=x.title+" (× "+x.q+")"});
  rows.filter(x=>dvIsPrel(x.title)).forEach(x=>{const nb=x.q!=null&&x.q>0?String(x.q):"",pu=x.u!=null?String(x.u):"";
    const free=base.filter(b=>!b.l.pOn),tgt=free.find(b=>/amiante|plomb|hap|enrob|dta|rep[ée]rage/i.test(b.title)&&/pr[ée]l[èe]vement|sondage/i.test(b.desc))||free.find(b=>/amiante|plomb|hap|enrob|rep[ée]rage/i.test(b.title));
    if(tgt){Object.assign(tgt.l,{pOn:true,nb,pu,def:false});tgt.prel=x.title}
    else{const l=Object.assign(dvLblank(),{presta:x.title,prix:"",pOn:true,nb,pu,def:false});base.push({title:x.title,l})}});
  const order=rows.map(x=>x.l).filter(Boolean);base.forEach(b=>{if(!order.includes(b.l))order.push(b.l)});r.lignes=order;
  r.prelSur=(base.find(b=>b.prel)||{}).title||"";
  return r}
/* Rapprochement du client du devis avec un compte existant */
const DV_STOP=new Set(["sa","sas","sasu","sarl","sci","eurl","snc","gie","hotel","the","de","la","le","les","des","du","et","en","paris","france","center","centre","conference","groupe","group","societe","ste","cie","immobilier","immobiliere","agence","residence"]);
function dvMatchCompte(name){if(!name)return null;const k=findCompte(name);if(k)return {k,sure:true};
  const W=new Set(nh(name).split(" ").filter(t=>t.length>2&&!DV_STOP.has(t)));if(!W.size)return null;let best=null,bs=0;
  S.comptes.forEach(c=>{const cw=nh(c.nom).split(" ").filter(t=>t.length>2&&!DV_STOP.has(t));if(!cw.length||!cw.every(t=>W.has(t)))return;if(cw.length>bs){bs=cw.length;best=c}});
  return best?{k:best,sure:false}:null}
function dvFromImport(r,fname){const mt=dvMatchCompte(r.client),k=mt&&mt.k;
  const d=Object.assign(dvblank(),{id:uid(),creeLe:now(),numero:r.numero,date:r.date||todayISO(),objet:[r.objet,r.site].filter(Boolean).join(" – "),statut:"attente",lignes:r.lignes.map(l=>Object.assign({},l))});
  d.notes=["Importé depuis « "+fname+" »",r.agence?r.agence.replace(/\s*[-–]\s*socotec.*$/i,""):"",r.client&&k&&!mt.sure?"Client du devis : "+r.client:""].filter(Boolean).join(" · ");
  d.compteId=k?k.id:"";d._k=k?k.nom:r.client;
  d._imp={file:fname,client:r.client,match:k?(mt.sure?"exact":"proche"):"nouveau",ct:r.contact,init:{adresse:r.adresse,cp:r.cp,ville:r.ville,dept:cpDept(r.cp),origine:"devis",siret:r.siret||""},prelSur:r.prelSur};
  if(k&&r.contact){const c=findContact(k.id,r.contact);if(c)d.contactId=c.id}
  return d}
async function dvReadFile(f){if(/\.pdf$/i.test(f.name))return dvReadPdf(f);if(!/\.docx$/i.test(f.name))throw new Error("format");
  const xml=await zipText(await f.arrayBuffer(),"word/document.xml");if(!xml)throw new Error("docx");return dvParseDocx(xml,f.name)}
/* Un fichier : la fenêtre s'ouvre pré-remplie pour vérification. Plusieurs fichiers : les devis sont créés directement. */
async function dvImport(files){files=[...(files||[])];if(!files.length)return;
  const xl=files.find(f=>/\.(xlsx|xlsm)$/i.test(f.name));if(xl){dvxOpen(xl);return}
  if(files.some(f=>/\.(xls|csv)$/i.test(f.name))&&!files.some(f=>/\.(docx|pdf)$/i.test(f.name))){toast("Enregistrez l'export au format Excel .xlsx, puis importez-le.");return}
  const bad=files.filter(f=>!/\.(docx|pdf)$/i.test(f.name));if(bad.length===files.length){toast("Choisissez un devis Word (.docx) ou PDF, ou l'export Excel (.xlsx).");return}
  files=files.filter(f=>/\.(docx|pdf)$/i.test(f.name));
  if(files.length===1){let r;try{r=await dvReadFile(files[0])}catch(e){toast("Lecture impossible de « "+files[0].name+" » : "+(e.message==="inflate"?"navigateur trop ancien.":e.message==="scan"?"ce PDF ne contient pas de texte (document scanné).":e.message==="pdfjs"?"lecteur PDF indisponible, vérifiez la connexion internet.":"le fichier n'est pas un devis lisible."));return}
    if(!r.lignes.length&&!r.numero){toast("Aucun devis reconnu dans « "+files[0].name+" ».");return}
    const ex=r.numero?S.devis.find(d=>nh(d.numero)===nh(r.numero)||(d.refs||[]).some(x=>nh(x)===nh(r.numero))):null;
    if(ex){openDevis(ex.id);DV._upd={r,file:files[0].name};dvDraw();toast("Ce devis est déjà suivi : il est ouvert, rien n'est créé en double.");return}
    if(DV&&MODAL==="devis"&&dvNew){dvRead();const keep={id:DV.id,creeLe:DV.creeLe},typed=DV._k;const nd=dvFromImport(r,files[0].name);DV=Object.assign(nd,keep);if(!nd.compteId&&typed&&!r.client)DV._k=typed;DVCAT=false;dvDraw(true)}
    else{if(MODAL)closeModal();DV=dvFromImport(r,files[0].name);dvNew=true;dvDelA=false;DVCAT=false;dvDraw(true)}
    toast("Devis lu : vérifiez puis Enregistrer.");return}
  let n=0,dup=0,err=0,nk=0;const seen=new Set();
  for(const f of files){let r;try{r=await dvReadFile(f)}catch(e){err++;continue}
    const key=nh(r.numero);if(key&&(seen.has(key)||S.devis.some(d=>nh(d.numero)===key))){dup++;continue}if(key)seen.add(key);
    if(!r.lignes.length){err++;continue}
    const d=dvFromImport(r,f.name);const k=dvImpCompte(d);if(d._imp.match==="nouveau")nk++;d.compteId=k.id;dvImpContact(d,k);
    const o=Object.assign({},d);delete o._k;delete o._imp;put("devis",o);n++}
  commit();toast(pl(n,"devis importé","devis importés")+(dup?" · "+dup+" déjà suivi"+(dup>1?"s":"")+" (ignoré"+(dup>1?"s":"")+")":"")+(nk?" · "+pl(nk,"compte créé","comptes créés"):"")+(err?" · "+err+" illisible"+(err>1?"s":""):""))}
function dvImpCompte(d){let k=findCompte(d._k)||kOf(d.compteId);if(!k){const i=d._imp&&d._imp.init||{origine:"devis"};k=ensureCompte(d._k,i)}return k}
function dvImpContact(d,k){const c=d._imp&&d._imp.ct;if(!c||!(c.nom||c.mail))return;if(d.contactId&&ctById(d.contactId))return;const ct=ensureContact(k.id,c);d.contactId=ct.id}
/* Mise à jour d'un devis déjà suivi depuis le fichier : statut, réalisations et nombres définitifs conservés */
function dvApplyUpd(){if(!DV||!DV._upd)return;dvRead();const r=DV._upd.r,old=DV.lignes;
  DV.lignes=r.lignes.map(l=>{const o=old.find(x=>nh(x.presta)===nh(l.presta)),n=Object.assign({},l,{id:o?o.id:l.id});
    if(o){n.faite=o.faite;n.faiteLe=o.faiteLe;if(o.def&&o.pOn){n.def=true;n.nb=o.nb}}return n});
  if(!DV.objet)DV.objet=[r.objet,r.site].filter(Boolean).join(" – ");if(r.date)DV.date=r.date;
  delete DV._upd;dvDraw();toast("Prestations mises à jour depuis le fichier : vérifiez puis Enregistrer.")}
function dvImpHTML(){const d=DV;if(!d)return "";
  if(d._upd)return '<div class="notice dv-imp"><span><b>Devis déjà suivi.</b> Le fichier « '+esc(d._upd.file)+' » correspond à ce devis (n° '+esc(d.numero)+') : rien n\'a été créé en double. Pour reprendre ses prestations et ses prix, gardant statut, réalisations et nombres définitifs :</span><button class="btn" type="button" data-act="dvimpupd">Mettre à jour depuis le fichier</button></div>';
  if(!d._imp)return "";const i=d._imp,k=kOf(d.compteId);
  return '<div class="notice dv-imp"><span><b>Rempli depuis « '+esc(i.file)+' ».</b> '+(i.match==="exact"?'Compte reconnu : '+esc(k?k.nom:"")+'.':i.match==="proche"?'Client du devis « '+esc(i.client)+' » rapproché du compte <b>'+esc(k?k.nom:"")+'</b> : changez-le si ce n\'est pas le bon.':'Client « '+esc(i.client||"?")+' » : aucun compte trouvé, il sera créé à l\'enregistrement (adresse et contact repris), ou choisissez un compte existant.')+
    (i.ct&&(i.ct.nom||i.ct.mail)?' Contact : '+esc([i.ct.nom,i.ct.mail].filter(Boolean).join(" · "))+(d.contactId?'':' (ajouté au compte).'):'')+
    (i.prelSur?' Les analyses sont rattachées à « '+esc(i.prelSur)+' », en estimatif.':'')+' Vérifiez puis Enregistrer.</span></div>'}
/* Dépôt de fichiers sur la page devis ou la fenêtre devis */
document.addEventListener("dragover",e=>{if(!(S.tab==="devis"||MODAL==="devis"))return;if(e.dataTransfer&&[...e.dataTransfer.types].includes("Files")){e.preventDefault();document.body.classList.add("dv-drop")}});
document.addEventListener("dragleave",e=>{if(!e.relatedTarget)document.body.classList.remove("dv-drop")});
document.addEventListener("drop",e=>{document.body.classList.remove("dv-drop");if(!(S.tab==="devis"||MODAL==="devis"))return;if(e.dataTransfer&&e.dataTransfer.files.length){e.preventDefault();dvImport(e.dataTransfer.files)}});
document.addEventListener("change",e=>{const t=e.target;if(t&&t.id==="dvFile"){const f=t.files;dvImport(f).finally(()=>{t.value=""})}});
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("button");if(!t)return;
  if(t.dataset.act==="dvimp"){let i=$("#dvFile");if(!i){i=document.createElement("input");i.type="file";i.id="dvFile";i.accept=".docx,.pdf,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";i.multiple=true;i.hidden=true;document.body.appendChild(i)}i.multiple=!(MODAL==="devis");i.click();return}
  if(t.dataset.act==="dvimpupd"){dvApplyUpd();return}});


/* ================= V3.11 · Intégration des devis depuis un export Excel (devis, commandes, factures) par apporteur d'affaires ================= */
const xv=v=>v==null?"":v instanceof Date?v:typeof v==="object"?(v.richText?v.richText.map(t=>t.text).join(""):v.result!=null?v.result:v.text!=null?v.text:""):v;
const xIso=v=>{if(v instanceof Date&&!isNaN(v))return v.getUTCFullYear()+"-"+pad(v.getUTCMonth()+1)+"-"+pad(v.getUTCDate());const m=String(v||"").match(/(\d{2})\/(\d{2})\/(\d{4})/);if(m)return m[3]+"-"+m[2]+"-"+m[1];const n=String(v||"").match(/^(\d{4})-(\d{2})-(\d{2})/);return n?n[0]:""};
const xNum=v=>typeof v==="number"?v:dvNum(v)||0;
const DVX_COLS={piece:h=>h==="n de piece"||h==="numero de piece"||h==="piece",tiers:h=>h==="tiers"||h==="client",date:h=>h==="date"||h==="date piece",etape:h=>h.startsWith("etape"),adr:h=>h.startsWith("adresse de l intervention"),comp:h=>h.startsWith("complement adresse"),
  cp:h=>h==="cp"||h==="code postal",ville:h=>h==="ville",total:h=>h==="total ht"||h==="montant ht",frais:h=>h.startsWith("frais de dossier"),app:h=>h.startsWith("apporteur d affaire"),agence:h=>h==="agence",tech:h=>h==="technicien",
  cmd:h=>h.startsWith("n de commande d origine"),dcmd:h=>h==="date commande",contact:h=>h==="contact",suivi:h=>h==="suivi par"};
/* Étapes du circuit : devis → commande → bon de livraison / proforma → facture */
function dvxStage(e,piece){const x=nh(e);
  if(/rejet|refus|annul/.test(x))return {st:"refuse",r:1};
  if(/^devis/.test(x))return {st:"attente",r:0};
  if(/commande/.test(x))return {st:"accepte",r:2};
  if(/livraison|proforma/.test(x))return {st:"accepte",r:3,done:true};
  if(/factur|avoir/.test(x)||/^(FC|FVI)/i.test(piece))return {st:"accepte",r:4,done:true,fact:true};
  return /^DE/i.test(piece)?{st:"attente",r:0}:{st:"accepte",r:2}}
async function dvxRead(f){await loadExcel();const wb=new ExcelJS.Workbook();await wb.xlsx.load(await f.arrayBuffer());
  for(const ws of wb.worksheets){let hr=0,C=null;
    for(let r=1;r<=Math.min(15,ws.rowCount)&&!C;r++){const H=[];ws.getRow(r).eachCell({includeEmpty:true},(c,i)=>{H[i]=nh(xv(c.value))});
      const m={};Object.entries(DVX_COLS).forEach(([k,f])=>{const i=H.findIndex(h=>h&&f(h));if(i>0)m[k]=i});if(m.piece&&m.etape&&m.app){C=m;hr=r}}
    if(!C)continue;const rows=[];
    for(let r=hr+1;r<=ws.rowCount;r++){const row=ws.getRow(r),g=k=>C[k]?xv(row.getCell(C[k]).value):"";const piece=String(g("piece")).trim();if(!piece)continue;
      rows.push({piece,tiers:String(g("tiers")).trim(),date:xIso(g("date")),etape:String(g("etape")).trim(),adr:String(g("adr")).replace(/\s+/g," ").trim(),comp:String(g("comp")).replace(/\s+/g," ").trim(),cp:String(g("cp")).trim(),ville:String(g("ville")).trim(),
        total:xNum(g("total")),frais:xNum(g("frais")),app:String(g("app")).trim(),agence:String(g("agence")).trim(),tech:String(g("tech")).trim(),cmd:String(g("cmd")).trim(),dcmd:xIso(g("dcmd")),contact:String(g("contact")).trim()})}
    return rows}
  throw new Error("colonnes")}
/* Regroupement par affaire : les factures et avoirs rejoignent leur commande (ou devis) d'origine */
function dvxGroups(rows){const G=new Map();
  /* même commande d'origine ET même client : une facture saisie par erreur sur la commande d'un autre client reste à part */
  rows.forEach(x=>{const inv=/^(FC|FVI|FPF|BLI)/i.test(x.piece)&&x.cmd,key=inv?x.cmd:x.piece,gk=key+"|"+(inv?nh(x.tiers):"");let g=G.get(gk);if(!g)G.set(gk,g={key,rows:[]});g.rows.push(x)});
  return [...G.values()].map(g=>{const R=g.rows,S0=R.map(x=>Object.assign(dvxStage(x.etape,x.piece),{x})),top=S0.reduce((a,b)=>b.r>a.r?b:a),inv=R.filter(x=>/^(FC|FVI)/i.test(x.piece));
    const base=R.find(x=>x.piece===g.key)||R.slice().sort((a,b)=>(a.date||"").localeCompare(b.date||""))[0],last=R.slice().sort((a,b)=>(b.date||"").localeCompare(a.date||""))[0];
    const pos=inv.filter(x=>x.total>0).map(x=>({x,v:x.total,used:false})),corr=[],real=[];
    inv.filter(x=>x.total<0).forEach(a=>{const v=-a.total,same=pos.filter(p=>!p.used&&Math.abs(p.v-v)<.01);if(same.length>=2){same[0].used=true;corr.push(a.piece)}else real.push(a)});
    const gross=pos.filter(p=>!p.used).reduce((s,p)=>s+p.v,0),avM=real.reduce((s,a)=>s-a.total,0);
    const amount=Math.round((inv.length?(gross>0?gross:avM):(base.total||top.x.total))*100)/100;
    const avoir=real.length?{m:Math.round(avM*100)/100,pieces:real.map(a=>a.piece),le:real.map(a=>a.date).sort().pop()||""}:null;
    return {key:g.key,rows:R,pieces:R.map(x=>x.piece),st:top.st,done:!!top.done,fact:!!top.fact,cancel:false,avoir,corr,amount,tiers:base.tiers||last.tiers,
      date:(top.st==="accepte"?(R.map(x=>x.dcmd).find(Boolean)||base.date):base.date)||last.date,dateRep:top.st==="accepte"?(R.map(x=>x.dcmd).find(Boolean)||top.x.date):top.st==="refuse"?top.x.date:"",faiteLe:top.done?last.date:"",
      app:(last.app||base.app),apps:[...new Set(R.map(x=>x.app).filter(Boolean))],agence:base.agence||last.agence,tech:R.map(x=>x.tech).find(Boolean)||"",contact:base.contact||last.contact,frais:base.frais,
      objet:dvxObjet(base),cp:base.cp,ville:base.ville,factures:inv.map(x=>x.piece)}})}
function dvxObjet(b){let P=[b.adr].filter(Boolean);const c=b.comp;
  if(c&&!nh(b.adr).includes(nh(c))){if(nh(c).includes(nh(b.adr))&&b.adr)P=[c];else P.push(c)}
  if(b.cp&&!P.some(x=>x.includes(b.cp)))P.push([b.cp,b.ville].filter(Boolean).join(" "));else if(!b.cp&&b.ville&&!P.some(x=>nh(x).includes(nh(b.ville))))P.push(b.ville);
  return P.join(" – ")}
const DVX_LEGAL=/\b(sa|sas|sasu|sarl|sci|eurl|snc|scp|gie|scs)\b/g;
const dvxKey=n=>nh(n).replace(DVX_LEGAL," ").replace(/\s+/g," ").trim();
function dvxIndex(){const m=new Map();S.comptes.forEach(k=>{const a=dvxKey(k.nom);if(a&&!m.has(a))m.set(a,k)});return m}
/* Plan d'intégration (rien n'est modifié avant « Intégrer ») */
function dvxPlan(groups,apps){const sel=new Set(apps),KI=dvxIndex(),plan={add:[],upd:[],link:[],same:0,av:0,newK:new Set(),G:[]};
  const byNum=new Map();S.devis.forEach(d=>{[d.numero].concat(d.refs||[]).filter(Boolean).forEach(n=>byNum.set(nh(n),d))});
  const used=new Set();
  groups.filter(g=>g.apps.some(a=>sel.has(a))).forEach(g=>{plan.G.push(g);
    const ex=[g.key].concat(g.pieces).map(n=>byNum.get(nh(n))).find(Boolean);
    if(ex){if(g.avoir)plan.av++;used.add(ex.id);const c=dvxMerge(clone(ex),g);if(JSON.stringify(c)!==JSON.stringify(dvnorm(clone(ex))))plan.upd.push({d:ex,g});else plan.same++;return}
    if(g.avoir)plan.av++;
    const k=KI.get(dvxKey(g.tiers));
    if(g.st==="accepte"&&k){/* devis en attente du même client et du même montant : c'est lui qui a été commandé */
      const cand=S.devis.filter(d=>!used.has(d.id)&&d.compteId===k.id&&(d.statut==="attente"||d.statut==="brouillon")&&Math.abs(dvSum(d).tot-g.amount)<=Math.max(1,g.amount*.005)&&(!d.date||!g.date||d.date<=g.date));
      if(cand.length){const d=cand.sort((a,b)=>(b.date||"").localeCompare(a.date||""))[0];used.add(d.id);plan.link.push({d,g});return}}
    if(!k)plan.newK.add(dvxKey(g.tiers));plan.add.push({g,k})});
  return plan}
function dvxMerge(d,g){d=dvnorm(d);
  if(g.st==="accepte"){if(d.statut!=="accepte"){d.statut="accepte";d.dateRep=g.dateRep||d.dateRep||todayISO()}}
  else if(g.st==="refuse"){if(d.statut==="attente"||d.statut==="brouillon"){d.statut="refuse";d.dateRep=g.dateRep||d.dateRep}}
  if(g.done&&!g.cancel)d.lignes.forEach(l=>{if(!l.faite){l.faite=true;l.faiteLe=g.faiteLe||todayISO()}});
  if(d.lignes.length===1&&d.lignes[0].gx)d.lignes[0].prix=String(g.amount);
  if(g.avoir)d.avoir=g.avoir;else if(d.avoir&&d.src==="excel")delete d.avoir;
  if(g.corr&&g.corr.length&&!String(d.notes).includes(g.corr[0]))d.notes=[d.notes,"Facture refaite (avoir "+g.corr.join(", ")+" puis nouvelle facture)"].filter(Boolean).join(" · ");
  d.refs=[...new Set((d.refs||[]).concat(g.pieces,[g.key]).filter(n=>n&&nh(n)!==nh(d.numero)))];
  const f=g.factures.filter(n=>!String(d.notes).includes(n));if(f.length)d.notes=[d.notes,"Factures : "+f.join(", ")].filter(Boolean).join(" · ");
  if(!d.apporteur&&g.app)d.apporteur=g.app;return d}
function dvxNew(g,k){const won=g.st==="accepte";
  const d=Object.assign(dvblank(),{id:uid(),creeLe:now(),compteId:k.id,numero:g.key,date:g.date||todayISO(),objet:g.objet,statut:g.st,dateRep:g.st==="attente"?"":(g.dateRep||""),src:"excel",apporteur:g.app,
    refs:g.pieces.filter(n=>n!==g.key),avoir:g.avoir||undefined,lignes:[Object.assign(dvLblank(""),{presta:"Montant global du devis (import Excel)",prix:String(g.amount),pOn:false,gx:true,faite:!!(g.done&&won),faiteLe:g.done&&won?g.faiteLe:""})]});
  d.notes=["Import Excel","apporteur "+g.app,g.agence?"agence "+g.agence:"",g.tech?"technicien "+g.tech:"",g.frais?"dont frais de dossier "+eur(g.frais):"",g.factures.length?"Factures : "+g.factures.join(", "):"",g.corr&&g.corr.length?"Facture refaite (avoir "+g.corr.join(", ")+" puis nouvelle facture)":""].filter(Boolean).join(" · ");
  const c=dvxContact(g.contact);if(c){const ct=ensureContact(k.id,c);d.contactId=ct.id}return d}
function dvxContact(s){s=String(s||"").trim();if(!s)return null;const m=s.match(/[^\s<>()]+@[^\s<>()]+/),mail=m?m[0]:"",nom=s.replace(mail,"").replace(/[<>()]/g,"").replace(/\s+/g," ").trim();return nom||mail?{nom,mail}:null}
/* Fenêtre d'intégration */
let DVX=null;
async function dvxOpen(f){let rows;try{rows=await dvxRead(f)}catch(e){toast(e.message==="colonnes"?"Colonnes non reconnues : il faut au moins « N° de pièce », « Etape WF » et « Apporteur d'affaire ».":"Lecture impossible de « "+f.name+" » (vérifiez la connexion internet pour la lecture Excel).");return}
  if(!rows.length){toast("Aucune ligne dans « "+f.name+" ».");return}
  const groups=dvxGroups(rows),cnt=new Map();groups.forEach(g=>g.apps.forEach(a=>{let c=cnt.get(a);if(!c)cnt.set(a,c={n:0,att:0,ref:0,won:0});c.n++;c[g.st==="attente"?"att":g.st==="refuse"?"ref":"won"]++}));
  const saved=(S.settings.dvApporteurs||[]).filter(a=>cnt.has(a)),ds=rows.map(r=>r.date).filter(Boolean).sort();
  DVX={file:f.name,rows,groups,cnt,sel:new Set(saved),q:"",from:ds[0]||"",to:ds[ds.length-1]||""};if(MODAL)closeModal();dvxDraw()}
function dvxDraw(){const X=DVX,L=[...X.cnt.entries()].sort((a,b)=>(X.sel.has(b[0])-X.sel.has(a[0]))||b[1].n-a[1].n||a[0].localeCompare(b[0],"fr")),q=nh(X.q);
  showModal(mHead("Intégrer des devis depuis Excel",esc(X.file))+
  '<div class="db"><p class="hint" style="margin:0">'+pl(X.rows.length,"ligne")+' lue'+(X.rows.length>1?'s':'')+' ('+pl(X.groups.length,"affaire")+')'+(X.from?' du '+fdate(X.from)+' au '+fdate(X.to):'')+'. Cochez les apporteurs d\'affaires dont les devis entrent dans votre suivi : votre choix est mémorisé pour les prochains imports. Devis → en attente · devis rejeté → refusé · commande → accepté · facture ou bon de livraison → accepté et réalisé.</p>'+
   '<div class="dvx-g"><div class="dvx-l"><input type="search" id="dvxQ" value="'+esc(X.q)+'" placeholder="Rechercher un apporteur…"><div class="dvx-list">'+
    L.filter(([a])=>!q||nh(a).includes(q)||X.sel.has(a)).map(([a,c])=>'<label class="dvx-a'+(X.sel.has(a)?' on':'')+'"><input type="checkbox" data-dvxa="'+esc(a)+'"'+(X.sel.has(a)?' checked':'')+'><span class="grow"><b>'+esc(a)+'</b><span class="sub">'+[c.att?c.att+" en attente":"",c.won?c.won+" gagné"+(c.won>1?"s":""):"",c.ref?c.ref+" refusé"+(c.ref>1?"s":""):""].filter(Boolean).join(" · ")+'</span></span><span class="num sub">'+c.n+'</span></label>').join("")+'</div></div>'+
   '<div class="dvx-s" id="dvxSum">'+dvxSumHTML()+'</div></div></div>'+
  '<div class="df"><span class="grow"></span><button class="btn" type="button" data-act="mclose">Annuler</button><button class="btn primary" type="button" data-act="dvxgo"'+(X.sel.size?'':' disabled')+'>Intégrer</button></div>',"dvx");modalBig()}
function dvxSumHTML(){const X=DVX;if(!X.sel.size)return '<div class="empty" style="padding:30px 10px"><h3>Aucun apporteur coché</h3><p>Cochez vos apporteurs d\'affaires dans la liste.</p></div>';
  const P=dvxPlan(X.groups,[...X.sel]);X.plan=P;const G=P.G,by=s=>G.filter(g=>g.st===s),sum=a=>eur(a.reduce((x,g)=>x+g.amount,0));
  const won=by("accepte"),att=by("attente"),ref=by("refuse"),fact=won.filter(g=>g.fact);
  const t=(l,v,d,c)=>'<div class="kpi"><span class="lbl">'+l+'</span><span class="v'+(c?' '+c:'')+'"><span class="num">'+v+'</span></span><span class="d">'+d+'</span></div>';
  return '<div class="dv-k" style="grid-template-columns:repeat(3,minmax(0,1fr))">'+t("En attente",att.length,sum(att))+t("Gagnés",won.length,sum(won)+(fact.length?" · "+fact.length+" facturé"+(fact.length>1?"s":""):""),"")+t("Refusés",ref.length,sum(ref))+'</div>'+
   '<ul class="dvx-r"><li><b>'+pl(P.add.length,"devis nouveau","devis nouveaux")+'</b> à créer'+(P.newK.size?' (dont '+pl(P.newK.size,"compte")+' à créer)':'')+'</li>'+
   '<li><b>'+pl(P.upd.length,"devis déjà suivi","devis déjà suivis")+'</b> mis à jour (statut, réalisation, factures)'+(P.same?' · '+P.same+' déjà à jour':'')+'</li>'+
   (P.link.length?'<li><b>'+pl(P.link.length,"devis en attente","devis en attente")+'</b> passé'+(P.link.length>1?'s':'')+' en accepté : la commande du même client et du même montant y est rattachée</li>':'')+
   (P.av?'<li><b>'+pl(P.av,"affaire avec avoir","affaires avec avoir")+'</b> : gardée'+(P.av>1?'s':'')+' en gagné au montant du devis, et signalée'+(P.av>1?'s':'')+' « Avoir »</li>':'')+'</ul>'+
   '<p class="hint" style="margin:0">Sans doublon : un n° de devis, de commande ou de facture déjà suivi met à jour le devis existant. Le détail des prestations n\'est pas dans l\'export : chaque devis porte son montant global, et vous pouvez ensuite importer le devis Word pour le détailler.</p>'}
function dvxGo(){const X=DVX,P=dvxPlan(X.groups,[...X.sel]);S.settings.dvApporteurs=[...X.sel];
  let nk=0;const KI=dvxIndex(),QI=[],QK=[];
  P.add.forEach(({g})=>{let k=KI.get(dvxKey(g.tiers));if(!k){k=ensureCompte(g.tiers||"Client sans nom",{type:g.st==="accepte"?"Client existant":"Prospect",ville:g.ville,cp:/^\d{5}$/.test(g.cp)?g.cp:"",dept:cpDept(g.cp),origine:"devis excel"});QK.push(k.nom);KI.set(dvxKey(k.nom),k);nk++}
    else if(g.st==="accepte"&&(TYPE_RANK[k.type]||0)<TYPE_RANK["Client existant"])k.type="Client existant";
    const o=dvxNew(g,k);put("devis",o);QI.push({id:o.id,n:1,e:qnDiff(null,o,true)})});
  P.upd.forEach(({d,g})=>{const o=dvxMerge(clone(d),g),e=qnDiff(dvnorm(clone(d)),o,false);put("devis",o);if(e.length)QI.push({id:o.id,e})});
  P.link.forEach(({d,g})=>{const c=dvxMerge(clone(d),g);c.notes=[c.notes,"Commande "+g.key+" rattachée (même client, même montant)"].filter(Boolean).join(" · ");const e=qnDiff(dvnorm(clone(d)),c,false);put("devis",c);if(e.length)QI.push({id:c.id,e})});
  qnRecord(X.file,QI,QK);
  closeModal();DVX=null;commit();if(S.tab!=="devis")showTab("devis");setTimeout(qnOpen,50);
  toast("Intégré : "+[pl(P.add.length,"devis créé","devis créés"),pl(P.upd.length,"mis à jour","mis à jour"),P.link.length?pl(P.link.length,"rattaché","rattachés")+" à sa commande":"",nk?pl(nk,"compte créé","comptes créés"):""].filter(Boolean).join(" · "))}
document.addEventListener("change",e=>{const t=e.target;if(!DVX||MODAL!=="dvx"||!t.dataset||t.dataset.dvxa==null)return;const a=t.dataset.dvxa;t.checked?DVX.sel.add(a):DVX.sel.delete(a);
  const lb=t.closest(".dvx-a");if(lb)lb.classList.toggle("on",t.checked);const s=$("#dvxSum");if(s)s.innerHTML=dvxSumHTML();const b=document.querySelector('#modal [data-act="dvxgo"]');if(b)b.disabled=!DVX.sel.size});
document.addEventListener("input",e=>{if(e.target&&e.target.id==="dvxQ"&&DVX){DVX.q=e.target.value;keepFocus("dvxQ",dvxDraw)}});
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("button");if(t&&t.dataset.act==="dvxgo"&&DVX){dvxGo()}});


/* ================= V3.13 · Lecture d'un devis PDF (PDF texte, issu de Word) ================= */
const PDF_SRC="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",PDFW_SRC="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
let pdfP=null;
function loadPdf(){if(window.pdfjsLib)return Promise.resolve();if(pdfP)return pdfP;
  pdfP=new Promise((res,rej)=>{const s=document.createElement("script");s.src=PDF_SRC;s.onload=()=>{try{window.pdfjsLib.GlobalWorkerOptions.workerSrc=PDFW_SRC;res()}catch(e){pdfP=null;rej(new Error("pdfjs"))}};s.onerror=()=>{pdfP=null;rej(new Error("pdfjs"))};document.head.appendChild(s)});return pdfP}
/* Lignes de texte reconstituées à partir des positions (une ligne = même hauteur sur la page) */
async function pdfLines(buf){await loadPdf();const doc=await window.pdfjsLib.getDocument({data:new Uint8Array(buf),isEvalSupported:false}).promise,L=[];
  for(let p=1;p<=doc.numPages;p++){const pg=await doc.getPage(p),vp=pg.getViewport({scale:1}),tc=await pg.getTextContent();
    const it=tc.items.filter(i=>i.str&&i.str.trim()).map(i=>({s:i.str.replace(/ /g," "),x:i.transform[4],y:vp.height-i.transform[5],w:i.width||0,h:Math.abs(i.transform[3])||9}));
    it.sort((a,b)=>a.y-b.y||a.x-b.x);const lines=[];
    it.forEach(i=>{let l=lines.find(l=>Math.abs(l.y-i.y)<Math.max(2,i.h*.4));if(!l)lines.push(l={y:i.y,h:i.h,items:[]});l.items.push(i)});
    lines.forEach(l=>{l.items.sort((a,b)=>a.x-b.x);let t="",px=null;
      l.items.forEach(i=>{if(px!=null){const g=i.x-px;t+=g>12?"   ":(g>1&&!/\s$/.test(t)&&!/^\s/.test(i.s)?" ":"")}t+=i.s;px=i.x+i.w});l.t=t;l.gy=(p-1)*10000+l.y});
    lines.sort((a,b)=>a.y-b.y);L.push(...lines)}
  return L}
const pdfIsNum=s=>/^(?:[\d\s.,]+|U|u|F|ens\.?|forfait)$/.test(String(s).trim());
async function dvReadPdf(f){const L=await pdfLines(await f.arrayBuffer());
  if(!L.length)throw new Error("scan");
  const paras=[];L.forEach(l=>l.t.split(/\s{3,}/).map(s=>s.trim()).filter(Boolean).forEach(s=>paras.push(s)));
  const tables=[];
  /* Bloc client : lignes sous « PROPOSITION ENTRE » */
  const ci=L.findIndex(l=>/PROPOSITION ENTRE/i.test(l.t));
  if(ci>=0){const c=["PROPOSITION ENTRE"];for(let i=ci+1;i<L.length&&c.length<14;i++){const s=L[i].t.split(/\s{3,}/)[0].trim();if(/^(ET|Devis)$/i.test(s))break;if(s)c.push(s)}tables.push([[c]])}
  /* Tableau des prestations : colonnes repérées par l'en-tête, montants rattachés à leur ligne */
  const isHead=l=>/libell/i.test(l.t)&&/P\.?\s?U/i.test(l.t);const hi=L.findIndex(isHead);
  if(hi>=0){const H=L[hi],col=re=>{const i=H.items.find(i=>re.test(i.s.trim()));return i?i.x+i.w/2:null};
    const C={q:col(/^qt/i),u:col(/^P\.?\s?U/i),t:col(/^(P\.?\s?T|montant|total)/i),v:col(/^TVA/i)},xs=Object.values(C).filter(v=>v!=null),xNum=Math.min(...xs)-28;
    const body=[];
    for(let i=hi+1;i<L.length;i++){const l=L[i],tt=l.t.trim();if(/Base HT|Total HT|Comme l.indique|^ARTICLE|CONDITIONS/i.test(tt))break;
      if(isHead(l)||/SIRET|Si[èe]ge social|www\.|capital de|^\d+\/\d+$|^[A-Z]{1,4}\d{5,}\s+Agence|^Immeuble|^Mail\s*:/i.test(tt))continue;
      const nums=l.items.filter(x=>x.x+x.w/2>=xNum&&pdfIsNum(x.s)),txt=l.items.filter(x=>x.x+x.w/2<xNum);
      body.push({gy:l.gy,h:l.h,text:txt.map(x=>x.s).join(" ").replace(/\s+/g," ").trim(),nums})}
    const N=body.filter(b=>b.nums.length>=2),T=body.filter(b=>b.text);
    if(N.length&&T.length){const rows=[],near=x=>{let best=null,d=1e9;Object.entries(C).forEach(([k,c])=>{if(c==null)return;const e=Math.abs(c-(x.x+x.w/2));if(e<d){d=e;best=k}});return best};
      const top=N.every(n=>n.text);let st=0;
      N.forEach((n,i)=>{let e;
        if(top){e=st;while(e+1<T.length&&(i===N.length-1||T[e+1].gy<N[i+1].gy-1))e++}
        else{const first=T[st]?T[st].gy:n.gy,est=2*n.gy-first,tol=(n.h||9)*.7;e=st;
          while(e+1<T.length&&(i===N.length-1||(T[e+1].gy<=est+tol&&T[e+1].gy<N[i+1].gy)))e++}
        const lines=T.slice(st,e+1).map(x=>x.text);st=e+1;const v={q:"",u:"",t:"",v:""};n.nums.forEach(x=>{const k=near(x);if(k)v[k]=(v[k]?v[k]+" ":"")+x.s.trim()});
        rows.push([[""],lines.length?lines:[""],[v.q],[v.u],[v.t],[v.v]])});
      tables.push([[["Ref. Client"],["Libellé"],["Qté"],["P.U HT"],["P.T HT"],["TVA"]]].concat(rows))}}
  return dvParseCore(paras,tables,f.name)}
