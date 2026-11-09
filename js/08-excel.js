/* PAC Prospection IDF · CSC — Export Excel (.xlsx), liens d'export depuis Notion, import Excel / CSV des cibles
   Fichier 8/18 : les fichiers se chargent dans l'ordre et partagent leurs déclarations. */
"use strict";

/* ---------- Export ---------- */
function csv(rows){return "﻿"+rows.map(r=>r.map(v=>{const s=String(v==null?"":v);return /[;"\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s}).join(";")).join("\r\n")}
function tsv(rows){return rows.map(r=>r.map(v=>String(v==null?"":v).replace(/[\t\r\n]+/g," ")).join("\t")).join("\n")}
async function offer(filename,data,pasteText){
  if(S.downloads){try{await S.downloads.save({filename,data})}catch(e){if(!(e&&e.code==="declined"))toast("Export impossible pour le moment.")}return}
  if(!IN_FRAME){
    try{const type=filename.endsWith(".json")?"application/json":"text/csv;charset=utf-8";const url=URL.createObjectURL(new Blob([data],{type}));
      const a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);toast("Fichier téléchargé : "+filename);return}
    catch(e){}
  }
  const box=$("#exBox");box.hidden=false;
  $("#exMsg").textContent=filename.endsWith(".json")
    ?"Notion bloque les téléchargements. Copiez ce texte et collez-le dans un fichier texte que vous enregistrez (par exemple PAC_sauvegarde.txt). Pour restaurer, recollez-le plus bas."
    :"Notion bloque les téléchargements. Copiez ce tableau et collez-le dans une feuille Excel vierge : les colonnes se placent toutes seules.";
  const ta=$("#exOut");ta.value=pasteText!=null?pasteText:data;ta.focus({preventScroll:true});ta.select();
}

/* ---------- Export Excel (.xlsx) ---------- */
const XL_SRC="https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js";
let xlP=null;
function loadExcel(){if(window.ExcelJS)return Promise.resolve();if(xlP)return xlP;
  xlP=new Promise((res,rej)=>{const sc=document.createElement("script");sc.src=XL_SRC;sc.onload=()=>res();sc.onerror=()=>{xlP=null;rej(new Error("load"))};document.head.appendChild(sc)});return xlP}
const toDate=iso=>{if(!iso)return null;const [y,m,d]=iso.split("-").map(Number);return new Date(Date.UTC(y,m-1,d))};
const colL=n=>{let s="";while(n>0){const m=(n-1)%26;s=String.fromCharCode(65+m)+s;n=Math.floor((n-1)/26)}return s};
const INK="FF1B1512",COPPER="FFC9804F",PARCH="FFF3E9D6",GREYTXT="FF69625B",LINE="FFE0DDD7";
const STAGE_FILL={a_qualifier:"FFECEAE6",cible:"FFE0EAF6",rdv:"FFFBEED3",visite:"FFF5E7DB",opportunite:"FFE6E0F3",gagne:"FFE2F0E6",sans_suite:"FFF7E1DA"};
const EUR='#,##0 "€"',DFMT="dd/mm/yyyy",PCT="0%";

function pageSetup(ws,title){ws.pageSetup={orientation:"landscape",paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:0,margins:{left:.4,right:.4,top:.6,bottom:.6,header:.3,footer:.3},printTitlesRow:"1:1"};
  ws.headerFooter={oddHeader:"&L&\"Calibri,Bold\"PAC Prospection IDF&R"+title,oddFooter:"&LExport du "+new Date().toLocaleDateString("fr-FR")+"&RPage &P / &N"}}
function headStyle(ws,n){const r=ws.getRow(1);r.height=32;for(let i=1;i<=n;i++){const c=r.getCell(i);
  c.font={bold:true,color:{argb:PARCH},name:"Calibri",size:11};c.fill={type:"pattern",pattern:"solid",fgColor:{argb:INK}};
  c.alignment={vertical:"middle",horizontal:"center",wrapText:true};c.border={bottom:{style:"medium",color:{argb:COPPER}}}}
  ws.views=[{state:"frozen",ySplit:1,xSplit:3,activeCell:"D2"}]}

/* ================= V3 · Export Excel (.xlsx) ================= */
const XCOLS=[
 {h:"Priorité",w:9,v:c=>c.priorite,al:"center"},
 {h:"Étape",w:17,v:c=>SL[c.etape]},
 {h:"Client",w:30,v:c=>c.compte,bold:true},
 {h:"Type",w:14,v:c=>typeOf(c)},
 {h:"Département",w:18,v:c=>dLabel(c.dept)},
 {h:"BU d'origine",w:20,v:c=>c.bu.join(", "),wrap:true},
 {h:"Apporteur interne",w:20,v:c=>c.apporteur,wrap:true},
 {h:"Diagnostics visés",w:28,v:c=>c.prestations.map(p=>PLABEL[p]||p).join(", "),wrap:true},
 {h:"Potentiel annuel",w:14,v:c=>c.potentiel===""?null:Number(c.potentiel),fmt:EUR},
 {h:"Prochaine action",w:13,v:c=>{const n=nextFor(c);return n?toDate(n.date):null},fmt:DFMT,al:"center"},
 {h:"Action à faire",w:34,v:c=>{const n=nextFor(c);return n?(n.objet||ALBL[n.type]):""},wrap:true},
 {h:"Visites réalisées",w:10,v:c=>visitsDone(c),al:"center"},
 {h:"Dernière visite",w:13,v:c=>toDate(lastDone(c)),fmt:DFMT,al:"center"},
 {h:"Dernier contact",w:13,v:c=>toDate(lastContact(c)),fmt:DFMT,al:"center"},
 {h:"Opportunité",w:12,v:c=>c.opp.creee?"Oui":"Non",al:"center"},
 {h:"Montant opp.",w:13,v:c=>c.opp.creee&&c.opp.montant!==""?Number(c.opp.montant):null,fmt:EUR},
 {h:"Statut opp.",w:11,v:c=>c.opp.creee?c.opp.statut:"",al:"center"},
 {h:"N° devis Athena",w:15,v:c=>c.opp.devis},
 {h:"Contact principal",w:22,v:c=>{const p=principal(c.compteId);return p?p.nom:""}},
 {h:"Secteur",w:26,v:c=>secteurOf(kOf(c.compteId)),wrap:true},
 {h:"Agence",w:15,v:c=>c.agence},
 {h:"Source",w:17,v:c=>c.source},
 {h:"Campagne",w:30,v:c=>c.campagne},
 {h:"Motif sans suite",w:20,v:c=>c.etape==="sans_suite"?c.motif:""},
 {h:"Notes",w:45,v:c=>c.notes,wrap:true}];
const XMAIN=XCOLS;
const XI=Object.fromEntries(XMAIN.map((c,i)=>[c.h,colL(i+1)]));
function xlStyleRows(ws,cols,n){for(let r=2;r<=Math.max(n,1)+1;r++){const row=ws.getRow(r);
  cols.forEach((x,i)=>{const cell=row.getCell(i+1);cell.font={name:"Calibri",size:10,bold:!!x.bold};cell.alignment={vertical:"top",horizontal:x.al||"left",wrapText:!!x.wrap};if(x.fmt)cell.numFmt=x.fmt;cell.border={bottom:{style:"thin",color:{argb:LINE}}}})}}
function xlTable(wb,name,tname,color,cols,rows,freeze){const ws=wb.addWorksheet(name,{properties:{tabColor:{argb:color}}});
  ws.addTable({name:tname,ref:"A1",headerRow:true,style:{theme:"TableStyleLight1",showRowStripes:true},columns:cols.map(c=>({name:c.h,filterButton:true})),rows:rows.length?rows:[cols.map(()=>null)]});
  cols.forEach((x,i)=>ws.getColumn(i+1).width=x.w);xlStyleRows(ws,cols,rows.length);headStyle(ws,cols.length);
  ws.views=[{state:"frozen",ySplit:1,xSplit:freeze||0,activeCell:"A2"}];pageSetup(ws,name);return ws}
function addPacSheet(wb,name,plan,pac,cibles){
  const wp=wb.addWorksheet(name,{properties:{tabColor:{argb:"FFA35C2A"}},views:[{showGridLines:false,state:"frozen",ySplit:4,xSplit:1,activeCell:"B5"}]});
  const W=[30,30,36,24,24,24,24,20,14,28,26,32,11,11,11,11];W.forEach((w,i)=>wp.getColumn(i+1).width=w);
  const BRD="FFB9B2A8";
  wp.mergeCells("A1:P1");const T=wp.getCell("A1");T.value=plan.titre||plan.nom||PAC_TITRE_DEF;
  T.font={name:"Calibri",size:16,bold:true,color:{argb:PARCH}};T.fill={type:"pattern",pattern:"solid",fgColor:{argb:INK}};T.alignment={vertical:"middle",indent:1};wp.getRow(1).height=34;
  wp.mergeCells("A2:P2");const P2=wp.getCell("A2");P2.value=plan.nom+" · "+(plan.periode||new Date().getFullYear())+" · édité le "+new Date().toLocaleDateString("fr-FR");
  P2.font={name:"Calibri",size:10,italic:true,color:{argb:GREYTXT}};P2.alignment={vertical:"middle",indent:1};wp.getRow(2).height=20;
  [["A3:A4","Élément"],["B3:B4","Objectif"],["C3:C4","Descriptif de l'action"],["D3:G3","Actions"],["H3:J3","Suivi du plan d'action"],["K3:L3","Résultats"],["M3:P3","Plan d'action correctif"]]
    .forEach(([rg,v])=>{wp.mergeCells(rg);wp.getCell(rg.split(":")[0]).value=v});
  Object.entries({D4:"Trimestre 1",E4:"Trimestre 2",F4:"Trimestre 3",G4:"Trimestre 4",H4:"Qui ? Agence ?",I4:"Quand ?",J4:"Indicateurs clés",K4:"Attendus",L4:"Obtenus",M4:"Continuer",N4:"Modifier",O4:"Reporter",P4:"Arrêter"}).forEach(([a,v])=>wp.getCell(a).value=v);
  [3,4].forEach(r=>{const row=wp.getRow(r);row.height=r===3?24:30;
    for(let c=1;c<=16;c++){const cell=row.getCell(c);const top=r===3||c<=3;
      cell.font={name:"Calibri",size:10.5,bold:true,color:{argb:top?PARCH:INK}};cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:top?INK:"FFEFEEEB"}};
      cell.alignment={vertical:"middle",horizontal:"center",wrapText:true};
      cell.border={top:{style:"thin",color:{argb:BRD}},left:{style:"thin",color:{argb:BRD}},right:{style:"thin",color:{argb:BRD}},bottom:{style:r===4?"medium":"thin",color:{argb:r===4?COPPER:BRD}}}}});
  const DF={"Continuer":["FFE2F0E6","FF2E7A45"],"Modifier":["FFFBEED3","FF9A6200"],"Reporter":["FFE0EAF6","FF2A66A8"],"Arrêter":["FFF7E1DA","FFB0442D"]};
  pac.slice().sort(byPrio).forEach((p,i)=>{const r=5+i,row=wp.getRow(r),st=pacStats(p,cibles),sc=p.secteurs||[];
    const obt=[];
    if(p.campagnes.length||sc.length){obt.push("Cibles : "+st.n);
      const f=(l,v,o,m)=>{const ob=Number(o)||0,fm=x=>m?eur(x):x;obt.push(l+" : "+fm(v)+(ob?" / "+fm(ob)+" ("+Math.round(v/ob*100)+" %)":""))};
      f("Visites réalisées",st.visites,p.obj.visites);f("Opportunités",st.opps,p.obj.opps);f("Devis",st.devis,p.obj.devis);f("CA conclu",st.ca,p.obj.ca,true);
      if(p.campagnes.length)obt.push("Campagnes : "+p.campagnes.map(c=>c.replace(/^PAC IDF – /,"")).join(", "));if(sc.length)obt.push("Secteurs : "+sc.join(", "))}
    if(p.obtenus)obt.push(p.obtenus);
    const anyT=[p.t1,p.t2,p.t3,p.t4].some(Boolean);
    const desc=[p.descriptif,anyT&&p.actions?"Actions : "+p.actions:""].filter(Boolean).join("\n");
    const vals=[(p.prio?"P"+p.prio+" · ":"")+p.element,p.objectif,desc,anyT?p.t1:p.actions,anyT?p.t2:"",anyT?p.t3:"",anyT?p.t4:"",p.qui,p.quand,p.kpi,p.attendus,obt.join("\n")].concat(PDEC.map(([d])=>p.decision===d?"X":""));
    vals.forEach((v,c)=>{const cell=row.getCell(c+1);cell.value=v||null;cell.font={name:"Calibri",size:10,bold:c===0};
      cell.alignment={vertical:c>=12?"middle":"top",horizontal:c>=12?"center":"left",wrapText:true};
      cell.border={bottom:{style:"thin",color:{argb:LINE}},right:{style:"thin",color:{argb:LINE}}}});
    if(!anyT&&p.actions)wp.mergeCells("D"+r+":G"+r);
    if(p.prio){const PF={"1":["FFA35C2A","FFFFFFFF"],"2":["FFF5E7DB","FFA35C2A"],"3":["FFEFEEEB","FF1B1512"]}[p.prio];const a=row.getCell(1);a.fill={type:"pattern",pattern:"solid",fgColor:{argb:PF[0]}};a.font={name:"Calibri",size:10,bold:true,color:{argb:PF[1]}}}
    if(p.decision){const k=PDEC.findIndex(d=>d[0]===p.decision),cell=row.getCell(13+k);
      cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:DF[p.decision][0]}};cell.font={name:"Calibri",size:11,bold:true,color:{argb:DF[p.decision][1]}}}
    const est=vals.map((v,c)=>{const w=c===3&&!anyT?W[3]*4:W[c];return String(v||"").split("\n").reduce((s,l)=>s+Math.max(1,Math.ceil(l.length/(w*1.05))),0)});
    row.height=Math.min(409,Math.max(30,Math.max(...est)*13.5+6));
  });
  wp.pageSetup={orientation:"landscape",paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:0,margins:{left:.3,right:.3,top:.5,bottom:.5,header:.25,footer:.25},printTitlesRow:"3:4"};
  wp.headerFooter={oddFooter:"&LPAC Prospection IDF · CSC&RPage &P / &N"};
}
/* Sections du classeur : cochées dans « Exporter » (toutes par défaut) ; « depuis le » limite les actions et les devis */
const XL_SEC=[["pac","Plan d'action (PAC)"],["syn","Synthèse des indicateurs"],["cib","Cibles et campagnes"],["act","Actions (RDV, appels, mails, rappels)"],["cpt","Comptes"],["ctc","Contacts"],["dev","Devis (une ligne par prestation)"],["dva","Analyse des devis (mois par mois)"],["mai","Mailing"]];
const xlSecs=st=>new Set(Array.isArray(st&&st.xlSec)?st.xlSec:XL_SEC.map(x=>x[0]));
function xlSecHTML(){const S0=xlSecs(S.settings),dep=S.settings.xlDepuis||"";
  return '<div class="xl-sec"><span class="sub">Onglets à inclure :</span><div class="xl-ck">'+XL_SEC.map(([k,l])=>'<label class="toggle"><input type="checkbox" data-xls="'+k+'"'+(S0.has(k)?' checked':'')+'> '+esc(l)+'</label>').join("")+'</div>'+
    '<div class="xl-bar"><button type="button" class="more" data-xlall="1">Tout cocher</button><button type="button" class="more" data-xlall="0">Tout décocher</button><span class="grow"></span><label class="sub">Actions et devis depuis le <input type="date" id="xlDep" value="'+esc(dep)+'"></label>'+(dep?'<button type="button" class="more" data-xldepx="1" title="Retirer la date : tout l\'historique">effacer</button>':'')+'</div>'+
    '<p class="hint" style="margin:0">'+(S0.size?pl(S0.size,"onglet")+' sélectionné'+(S0.size>1?'s':'')+(dep?' · actions et devis depuis le '+fdate(dep):''):'<b style="color:var(--bad)">Cochez au moins un onglet.</b>')+'. Votre choix est mémorisé.</p></div>'}
function xlSecRefresh(){const b=document.querySelector(".xl-sec");if(b)b.outerHTML=xlSecHTML();
  if(IN_FRAME){const a=$("#exX");if(a){a.setAttribute("aria-disabled","true");a.textContent="Préparation du lien…";xlsxHandoffURL().then(u=>{const x=$("#exX");if(x){x.href=u;x.textContent="Exporter en Excel (.xlsx)";x.removeAttribute("aria-disabled")}})}}}
document.addEventListener("change",e=>{const t=e.target;if(!t)return;
  if(t.dataset&&t.dataset.xls){const s=xlSecs(S.settings);t.checked?s.add(t.dataset.xls):s.delete(t.dataset.xls);S.settings.xlSec=XL_SEC.map(x=>x[0]).filter(k=>s.has(k));lsSave();xlSecRefresh();return}
  if(t.id==="xlDep"){S.settings.xlDepuis=t.value||"";lsSave();xlSecRefresh()}});
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("button");if(!t)return;
  if(t.dataset.xlall!=null){S.settings.xlSec=t.dataset.xlall==="1"?XL_SEC.map(x=>x[0]):[];lsSave();xlSecRefresh();return}
  if(t.dataset.xldepx){S.settings.xlDepuis="";lsSave();xlSecRefresh()}});
async function buildXlsx(cibles,settings,pac,mailing){mailing=mailing||[];settings=settings||{};
  const SEC=xlSecs(settings),X=k=>SEC.has(k),DEP=settings.xlDepuis||"";if(!SEC.size)throw new Error("aucune section");
  await loadExcel();
  const wb=new ExcelJS.Workbook();wb.creator="PAC Prospection IDF · CSC";wb.created=new Date();
  /* ---- PAC : un onglet par plan ---- */
  const plans=S.plans.filter(p=>pac.some(l=>l.planId===p.id)),used=new Set();
  if(X("pac"))plans.forEach(p=>{let nm=plans.length>1?("PAC – "+p.nom).replace(/[\[\]:*?\/\\]/g," ").slice(0,31):"PAC";while(used.has(nm))nm=nm.slice(0,28)+" "+used.size;used.add(nm);addPacSheet(wb,nm,p,pac.filter(l=>l.planId===p.id),cibles)});
  const order=cibles.slice().sort((a,b)=>{const na=nextFor(a),nb=nextFor(b);return (a.priorite||"Z").localeCompare(b.priorite||"Z")||SIDX[a.etape]-SIDX[b.etape]||((na&&na.date)||"9999").localeCompare((nb&&nb.date)||"9999")||a.compte.localeCompare(b.compte,"fr")});
  const sy=X("syn")?wb.addWorksheet("Synthèse",{properties:{tabColor:{argb:COPPER}},views:[{showGridLines:false}]}):null;
  /* ---- Cibles ---- */
  if(X("cib")){const wc=xlTable(wb,"Cibles","Cibles",INK,XMAIN,order.map(c=>XMAIN.map(x=>x.v(c))),3);
  order.forEach((c,i)=>{const row=wc.getRow(i+2);row.getCell(2).fill={type:"pattern",pattern:"solid",fgColor:{argb:STAGE_FILL[c.etape]}};
    const pr=row.getCell(1);pr.font={name:"Calibri",size:10,bold:true,color:{argb:c.priorite==="A"?"FFFFFFFF":INK}};
    if(c.priorite==="A")pr.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFA35C2A"}};else if(c.priorite==="B")pr.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFF5E7DB"}};
    const n=nextFor(c);if(n&&n.date&&n.date<todayISO()&&isActive(c))row.getCell(10).font={name:"Calibri",size:10,bold:true,color:{argb:"FFB0442D"}}})}
  /* ---- Actions ---- */
  if(X("act")){
  const AC=[{h:"Date",w:12,fmt:DFMT,al:"center"},{h:"Heure",w:8,al:"center"},{h:"Compte",w:30,bold:true},{h:"Type",w:15},{h:"Statut",w:11,al:"center"},{h:"Résultat",w:15},{h:"Contact",w:22},{h:"Objet",w:32,wrap:true},{h:"Détails / compte rendu",w:70,wrap:true},{h:"Accompagnant",w:18},{h:"Campagne",w:28},{h:"Compte rendu",w:70,wrap:true}];
  const acts=S.actions.filter(a=>!DEP||(a.date||"")>=DEP).sort(aSortDesc);
  const wa=xlTable(wb,"Actions","Actions","FF6E6862",AC,acts.map(a=>{const k=kOf(a.compteId)||{},ct=ctById(a.contactId),cb=cibById(a.cibleId);return [toDate(a.date),a.heure||null,k.nom||"",ALBL[a.type]||a.type,stLbl(a),a.resultat,ct?ct.nom:a.interlocuteur,a.objet,a.details,a.accompagnant,cb?cb.campagne:"",a.cr?crRows(a).filter(r=>r[0]!=="Points abordés").map(([l,v])=>l+" : "+v).join("\n"):""]}),0);
  acts.forEach((a,i)=>{const cell=wa.getRow(i+2).getCell(5);cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:{ok:"FFE2F0E6",warn:"FFFBEED3",bad:"FFF7E1DA",grey:"FFECEAE6"}[stTone(a)]}}});
  }
  /* ---- Comptes ---- */
  const yy=new Date().getFullYear(),y0s=String(yy-1),y1s=String(yy);
  if(X("cpt")){
  const KC=[{h:"Compte",w:32,bold:true},{h:"Type",w:14},{h:"Famille",w:26,wrap:true},{h:"Segment",w:24,wrap:true},{h:"Typologie",w:24,wrap:true},{h:"Contrat cadre",w:9,al:"center"},{h:"Statut",w:24,wrap:true},{h:"CA facturé "+y0s,w:14,fmt:EUR},{h:"CA facturé "+y1s,w:14,fmt:EUR},{h:"Devis en attente",w:14,fmt:EUR},{h:"Département",w:18},{h:"Agence",w:18},{h:"Apporteur",w:18},{h:"Contacts",w:9,al:"center"},{h:"Campagnes",w:30,wrap:true},{h:"Dernier contact",w:13,fmt:DFMT,al:"center"},{h:"Prochaine action",w:13,fmt:DFMT,al:"center"},{h:"Quoi",w:30,wrap:true},{h:"Notes",w:40,wrap:true}];
  const ks=S.comptes.slice().sort((a,b)=>a.nom.localeCompare(b.nom,"fr"));
  xlTable(wb,"Comptes","Comptes","FFA35C2A",KC,ks.map(k=>{const n=nextOf(k.id),l=lastOf(k.id);const h=k.histo;return [k.nom,k.type,FNOM[famOf(k)]||"",k.segment,k.typologie,k.contrat?"Oui":"",h?(HST[h.st]||[""])[0]:"",h?hCA(k,y0s):null,h?hCA(k,y1s):null,h&&h.dv.n?h.dv.m:null,dLabel(k.dept),k.agence,k.apporteur,ctOf(k.id).length,cibOf(k.id).map(c=>c.campagne.replace(/^PAC IDF – /,"")).join(", "),l?toDate(l.date):null,n?toDate(n.date):null,n?n.objet:"",k.notes]}),1);
  }
  /* ---- Contacts ---- */
  if(X("ctc")){const CC=[{h:"Compte",w:32,bold:true},{h:"Contact",w:24},{h:"Fonction",w:22},{h:"Téléphone",w:15},{h:"E-mail",w:30},{h:"Principal",w:9,al:"center"},{h:"Notes",w:40,wrap:true}];
  const cs=S.contacts.slice().sort((a,b)=>((kOf(a.compteId)||{}).nom||"").localeCompare((kOf(b.compteId)||{}).nom||"","fr")||(b.principal-a.principal));
  xlTable(wb,"Contacts","Contacts","FFA49B91",CC,cs.map(c=>[(kOf(c.compteId)||{}).nom||"",c.nom,c.fonction,c.tel,c.mail,c.principal?"Oui":"",c.notes]),1)}
  /* ---- Devis (une ligne par prestation ; prélèvements en rouge si estimatifs, en bleu si définitifs) ---- */
  const dvs=(S.devis||[]).filter(d=>!DEP||(d.date||"")>=DEP).sort(dvSortD);
  if(X("dev")&&dvs.length){
    const DC=[{h:"Date",w:12,fmt:DFMT,al:"center"},{h:"N° devis",w:14},{h:"Compte",w:30,bold:true},{h:"Contact",w:22},{h:"Objet / site",w:30,wrap:true},{h:"Statut",w:12,al:"center"},{h:"Réponse le",w:12,fmt:DFMT,al:"center"},{h:"Prestation",w:40,wrap:true},{h:"Prix HT",w:12,fmt:EUR},{h:"Nb prélèvements",w:12,al:"center"},{h:"PU prélèvement",w:13,fmt:EUR},{h:"Montant prélèvements",w:14,fmt:EUR},{h:"Prélèvements",w:12,al:"center"},{h:"Montant ligne HT",w:14,fmt:EUR},{h:"Réalisée",w:9,al:"center"},{h:"Réalisée le",w:12,fmt:DFMT,al:"center"},{h:"Avoir",w:12,fmt:EUR},{h:"Notes",w:40,wrap:true}];
    const rows=[],tone=[];
    dvs.forEach(d=>{const k=kOf(d.compteId)||{},ct=ctById(d.contactId);d.lignes.forEach(l=>{const hp=lHasP(l);
      rows.push([toDate(d.date),d.numero,k.nom||"",ct?ct.nom:"",d.objet,DVL[d.statut],toDate(d.dateRep),l.presta,nb0(l.prix)||null,hp?nb0(l.nb):null,hp?nb0(l.pu):null,hp?lPrel(l):null,hp?(l.def?"Définitif":"Estimatif"):"",lTot(l),l.faite?"Oui":"Non",toDate(l.faiteLe),d.avoir?d.avoir.m:null,d.notes]);
      tone.push(hp?(l.def?"FF1F5FBF":"FFC62828"):null)})});
    const wd=xlTable(wb,"Devis","Devis","FFC62828",DC,rows,3);
    tone.forEach((c,i)=>{const r=wd.getRow(i+2);if(c)[10,11,12,13].forEach(n=>{r.getCell(n).font={name:"Calibri",size:10,bold:true,color:{argb:c}}});if(rows[i][14]==="Oui")r.getCell(15).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFE2F0E6"}}})}
  /* ---- Analyse des devis : mois par mois, année en cours et précédente ---- */
  if(X("dva")&&(S.devis||[]).length){const y=String(new Date().getFullYear()),yp=String(+y-1),M=anMonths(y),P=anMonths(yp),obj=Number(((settings.dvObj)||{})[y])||0;
    const wv=wb.addWorksheet("Analyse devis",{properties:{tabColor:{argb:"FFC62828"}},views:[{showGridLines:false,state:"frozen",ySplit:4}]});
    wv.columns=[{width:14},{width:10},{width:14},{width:10},{width:14},{width:10},{width:14},{width:14},{width:16},{width:14}];
    wv.getCell("A1").value="Analyse des devis "+y;wv.getCell("A1").font={name:"Calibri",size:16,bold:true,color:{argb:INK}};
    wv.getCell("A2").value=(obj?"Objectif "+y+" : "+eur(obj)+" de devis acceptés · ":"")+"export du "+new Date().toLocaleDateString("fr-FR");wv.getCell("A2").font={name:"Calibri",size:10,color:{argb:GREYTXT}};
    const H=["Mois","Envoyés","Montant envoyé","Acceptés","Montant accepté","Refusés","Montant refusé","Réalisé","Accepté "+yp,"Écart"];
    H.forEach((h,i)=>{const c=wv.getCell(4,i+1);c.value=h;c.font={name:"Calibri",size:10,bold:true,color:{argb:"FFFFFFFF"}};c.fill={type:"pattern",pattern:"solid",fgColor:{argb:INK}};c.alignment={horizontal:i?"right":"left",vertical:"middle"}});
    const T=[0,0,0,0,0,0,0,0];
    M.forEach((x,i)=>{const p=P[i],v=[MOIS[i].charAt(0).toUpperCase()+MOIS[i].slice(1),x.env,x.envM,x.acc,x.accM,x.lost,x.lostM,x.real,p.accM,x.accM-p.accM];[x.env,x.envM,x.acc,x.accM,x.lost,x.lostM,x.real,p.accM].forEach((n,j)=>T[j]+=n);
      v.forEach((n,j)=>{const c=wv.getCell(5+i,j+1);c.value=n;c.font={name:"Calibri",size:10,bold:j===4};if([2,4,6,7,8,9].includes(j))c.numFmt=EUR;if(j)c.alignment={horizontal:"right"};c.border={bottom:{style:"hair",color:{argb:LINE}}}});
      const e=wv.getCell(5+i,10);e.font={name:"Calibri",size:10,color:{argb:x.accM-p.accM>=0?"FF2E7A45":"FFB0442D"}}});
    ["Total"].concat(T,[T[4]-T[7]]).forEach((n,j)=>{const c=wv.getCell(17,j+1);c.value=n;c.font={name:"Calibri",size:10.5,bold:true};if([2,4,6,7,8,9].includes(j))c.numFmt=EUR;if(j)c.alignment={horizontal:"right"};c.border={top:{style:"medium",color:{argb:COPPER}}}});
    const G=anGroups("famille",y);let r0=20;wv.getCell(r0,1).value="Par famille de clients ("+y+")";wv.getCell(r0,1).font={name:"Calibri",size:12,bold:true,color:{argb:"FFA35C2A"}};r0++;
    ["Famille","Devis","Montant total","Acceptés","Montant accepté","Refusés","Montant refusé","En attente (€)","Transfo (nb)","Transfo (€)"].forEach((h,i)=>{const c=wv.getCell(r0,i+1);c.value=h;c.font={name:"Calibri",size:10,bold:true,color:{argb:"FFFFFFFF"}};c.fill={type:"pattern",pattern:"solid",fgColor:{argb:INK}}});
    G.forEach((g,i)=>{const v=[g.lab,g.n,g.tot,g.acc,g.accM,g.lost,g.lostM,g.attM,g.acc+g.lost?g.acc/(g.acc+g.lost):null,g.accM+g.lostM?g.accM/(g.accM+g.lostM):null];
      v.forEach((n,j)=>{const c=wv.getCell(r0+1+i,j+1);c.value=n;c.font={name:"Calibri",size:10};if([2,4,6,7].includes(j))c.numFmt=EUR;if(j>=8)c.numFmt=PCT;c.border={bottom:{style:"hair",color:{argb:LINE}}}})});
    wv.pageSetup={orientation:"landscape",paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:0}}
  /* ---- Mailing ---- */
  if(X("mai")&&mailing.length){
    const MC=[{h:"Envoyé",w:9,al:"center"},{h:"Date d'envoi",w:12,fmt:DFMT,al:"center"},{h:"Relance le",w:12,fmt:DFMT,al:"center"},{h:"Relance faite",w:12,fmt:DFMT,al:"center"},{h:"Commentaire",w:40,wrap:true},{h:"Client",w:32,bold:true},{h:"Typologie",w:24},{h:"Famille",w:26,wrap:true},{h:"Contact",w:24},{h:"E-mail",w:32},{h:"Agence",w:18},{h:"Apporteur",w:18},{h:"Liste",w:18},{h:"Envoyer ?",w:22,wrap:true},{h:"Point d'attention",w:30,wrap:true}];
    const ml=mailing.slice().sort((a,b)=>(a.liste||"").localeCompare(b.liste||"","fr")||(a.client||"").localeCompare(b.client||"","fr"));
    const wm=xlTable(wb,"Mailing","Mailing","FF2A66A8",MC,ml.map(m=>[m.envoye?"Oui":"Non",toDate(m.dateEnvoi),toDate(m.relance),toDate(m.relanceFaite),m.commentaire,m.client,m.typologie,m.famille,m.contact,m.mail,m.agence,m.apporteur,m.liste,m.envoyer,m.attention]),0);
    ml.forEach((m,i)=>{const row=wm.getRow(i+2);if(m.envoye)row.getCell(1).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFE2F0E6"}};
      if(m.envoye&&m.relance&&!m.relanceFaite&&m.relance<=todayISO())row.getCell(3).font={name:"Calibri",size:10,bold:true,color:{argb:"FFB0442D"}}})}
  /* ---- Synthèse (formules liées à l'onglet Cibles quand il est exporté) ---- */
  if(sy){
  const N=order.length,NF=X("cib")?N:0,CR="Cibles!",col=h=>CR+"$"+XI[h]+"$2:$"+XI[h]+"$"+(N+1);
  const act=order.filter(isActive),done=S.actions.filter(a=>a.type==="visite"&&a.statut==="fait"),mk=todayISO().slice(0,7);
  const doneM=done.filter(a=>(a.date||"").slice(0,7)===mk).length,obj=Number(settings.objectif)||0;
  const opps=order.filter(c=>c.opp.creee),sumOpp=st=>opps.filter(c=>c.opp.statut===st).reduce((s,c)=>s+(Number(c.opp.montant)||0),0);
  const visited=order.filter(c=>visitsDone(c)>0);
  sy.columns=[{width:3},{width:42},{width:16},{width:18},{width:18},{width:3}];
  const T=sy.getCell("B2");T.value="PAC Prospection IDF";T.font={name:"Calibri",size:18,bold:true,color:{argb:INK}};
  const ST=sy.getCell("B3");ST.value="Diagnostic Île-de-France · export du "+new Date().toLocaleDateString("fr-FR",{day:"2-digit",month:"long",year:"numeric"});ST.font={name:"Calibri",size:10,color:{argb:GREYTXT}};
  sy.getRow(2).height=28;
  let r=5;
  const section=(title,heads)=>{const row=sy.getRow(r);row.height=22;
    const cells=[title].concat(heads||[]);cells.forEach((t,i)=>{const c=row.getCell(2+i);c.value=t;c.font={name:"Calibri",size:11,bold:true,color:{argb:i?GREYTXT:"FFA35C2A"}};
      c.alignment={vertical:"bottom",horizontal:i?"right":"left"};c.border={bottom:{style:"medium",color:{argb:COPPER}}}});
    for(let i=cells.length;i<4;i++){sy.getRow(r).getCell(2+i).border={bottom:{style:"medium",color:{argb:COPPER}}}}
    r++};
  const line=(label,vals,fmts,bold)=>{const row=sy.getRow(r);row.getCell(2).value=label;row.getCell(2).font={name:"Calibri",size:11,bold:!!bold};
    vals.forEach((v,i)=>{const c=row.getCell(3+i);c.value=v;c.font={name:"Calibri",size:11,bold:!!bold};c.alignment={horizontal:"right"};if(fmts&&fmts[i])c.numFmt=fmts[i]});
    for(let i=2;i<=5;i++)row.getCell(i).border={bottom:{style:"hair",color:{argb:LINE}}};r++};
  const F=(f,res)=>NF?{formula:f,result:res}:res;
  const t=todayISO(),open=S.actions.filter(isOpen);
  section("Indicateurs clés");
  line("Comptes",[S.comptes.length]);line("Contacts",[S.contacts.length]);
  line("Cibles actives",[F('COUNTIFS('+col("Étape")+',"<>Gagné",'+col("Étape")+',"<>Sans suite")',act.length)]);
  line("dont priorité A",[F('COUNTIFS('+col("Priorité")+',"A",'+col("Étape")+',"<>Gagné",'+col("Étape")+',"<>Sans suite")',act.filter(c=>c.priorite==="A").length)]);
  line("Potentiel annuel des cibles actives",[F('SUMIFS('+col("Potentiel annuel")+','+col("Étape")+',"<>Gagné",'+col("Étape")+',"<>Sans suite")',act.reduce((s,c)=>s+(Number(c.potentiel)||0),0))],[EUR]);
  line("Visites réalisées ce mois",[doneM,obj?"objectif "+obj:""]);
  line("Visites réalisées depuis le début",[done.length]);
  line("Appels, mails et autres actions faites ce mois",[S.actions.filter(a=>a.statut==="fait"&&a.type!=="visite"&&a.type!=="note"&&(a.date||"").slice(0,7)===mk).length]);
  line("Actions à faire",[open.length,open.filter(a=>a.date&&a.date<t).length+" en retard"]);
  line("Opportunités créées",[F('COUNTIF('+col("Opportunité")+',"Oui")',opps.length)]);
  line("Montant des opportunités en cours",[F('SUMIFS('+col("Montant opp.")+','+col("Statut opp.")+',"Ouvert")',sumOpp("Ouvert"))],[EUR]);
  line("CA conclu",[F('SUMIFS('+col("Montant opp.")+','+col("Statut opp.")+',"Conclue")',sumOpp("Conclue"))],[EUR],true);
  line("Taux cibles visitées → opportunité",[visited.length?visited.filter(c=>c.opp.creee).length/visited.length:"—"],[PCT]);
  line("Taux de transformation des opportunités",[opps.length?opps.filter(c=>c.opp.statut==="Conclue").length/opps.length:"—"],[PCT]);
  r++;section("Pipeline par étape",["Cibles","Potentiel annuel"]);
  STAGES.forEach(st=>{const ofS=order.filter(c=>c.etape===st.k);
    line(st.l,[F('COUNTIF('+col("Étape")+',"'+st.l+'")',ofS.length),F('SUMIFS('+col("Potentiel annuel")+','+col("Étape")+',"'+st.l+'")',ofS.reduce((s,c)=>s+(Number(c.potentiel)||0),0))],[null,EUR]);
    sy.getRow(r-1).getCell(2).fill={type:"pattern",pattern:"solid",fgColor:{argb:STAGE_FILL[st.k]}}});
  line("Total",[F('COUNTA('+col("Client")+')',N),F('SUM('+col("Potentiel annuel")+')',order.reduce((s,c)=>s+(Number(c.potentiel)||0),0))],[null,EUR],true);
  r++;section("Par département",["Cibles","dont priorité A","Opportunités"]);
  DEPTS.forEach(([k])=>{const ofD=order.filter(c=>c.dept===k);if(!ofD.length)return;const lb=dLabel(k);
    line(lb,[F('COUNTIF('+col("Département")+',"'+lb+'")',ofD.length),F('COUNTIFS('+col("Département")+',"'+lb+'",'+col("Priorité")+',"A")',ofD.filter(c=>c.priorite==="A").length),F('COUNTIFS('+col("Département")+',"'+lb+'",'+col("Opportunité")+',"Oui")',ofD.filter(c=>c.opp.creee).length)])});
  r++;section("Par type de compte",["Cibles","Opportunités"]);
  TYPES.forEach(ty=>{const ofT=order.filter(c=>typeOf(c)===ty);line(ty,[F('COUNTIF('+col("Type")+',"'+ty+'")',ofT.length),F('COUNTIFS('+col("Type")+',"'+ty+'",'+col("Opportunité")+',"Oui")',ofT.filter(c=>c.opp.creee).length)])});
  r++;section("Par BU d'origine",["Cibles","Visites réalisées","Opportunités"]);
  BUS.forEach(bu=>{const ofB=order.filter(c=>c.bu.includes(bu));if(!ofB.length)return;
    line(bu,[F('COUNTIF('+col("BU d'origine")+',"*'+bu+'*")',ofB.length),ofB.reduce((s,c)=>s+visitsDone(c),0),F('COUNTIFS('+col("BU d'origine")+',"*'+bu+'*",'+col("Opportunité")+',"Oui")',ofB.filter(c=>c.opp.creee).length)])});
  if(!order.some(c=>c.bu.length))line("Aucune BU renseignée",[]);
  r++;section("Opportunités issues du PAC",["Nombre","Montant estimé"]);
  OSTAT.forEach(o=>line(o==="Ouvert"?"Ouvert(e)":o,[F('COUNTIFS('+col("Opportunité")+',"Oui",'+col("Statut opp.")+',"'+o+'")',opps.filter(c=>c.opp.statut===o).length),F('SUMIFS('+col("Montant opp.")+','+col("Opportunité")+',"Oui",'+col("Statut opp.")+',"'+o+'")',sumOpp(o))],[null,EUR]));
  line("Total",[opps.length,opps.reduce((s,c)=>s+(Number(c.opp.montant)||0),0)],[null,EUR],true);
  if(mailing.length){const ok=m=>!m.envoyer||/^oui/i.test(m.envoyer);r++;section("Mailing",["Contacts"]);
    line("Contacts à joindre",[mailing.filter(ok).length]);line("Mails envoyés",[mailing.filter(m=>m.envoye).length]);
    line("Reste à envoyer",[mailing.filter(m=>!m.envoye&&ok(m)&&m.mail).length]);line("Relances à faire",[mailing.filter(m=>m.envoye&&m.relance&&!m.relanceFaite&&m.relance<=t).length])}
  r++;const note=sy.getRow(r).getCell(2);note.value=(NF?"Les chiffres des cibles se recalculent si vous modifiez l'onglet Cibles. ":"")+"Onglets : "+wb.worksheets.map(w=>w.name).join(", ")+"."+(DEP?" Actions et devis depuis le "+fdate(DEP)+".":"");note.font={name:"Calibri",size:9.5,italic:true,color:{argb:GREYTXT}};note.alignment={wrapText:true};sy.getRow(r).height=42;
  sy.pageSetup={orientation:"portrait",paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:1,margins:{left:.5,right:.5,top:.6,bottom:.6,header:.3,footer:.3}};
  sy.headerFooter={oddFooter:"&LPAC Prospection IDF · CSC&RExport du "+new Date().toLocaleDateString("fr-FR")};
  }
  if(!wb.worksheets.length){const w=wb.addWorksheet("Export");w.getCell("A1").value="Aucune donnée pour les onglets choisis."}
  const buf=await wb.xlsx.writeBuffer();
  return new Blob([buf],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
}
function saveBlob(blob,filename){const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000)}
const b64enc=str=>{const bytes=new TextEncoder().encode(str);let bin="";for(let i=0;i<bytes.length;i+=0x8000)bin+=String.fromCharCode.apply(null,bytes.subarray(i,i+0x8000));return btoa(bin).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")};
const b64dec=s=>{s=s.replace(/-/g,"+").replace(/_/g,"/");while(s.length%4)s+="=";const bin=atob(s);const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return new TextDecoder().decode(u)};
const xlName=()=>"PAC_Prospection_IDF_"+todayISO()+".xlsx";
async function packData(obj){const txt=JSON.stringify(obj);
  if(window.CompressionStream){const buf=new Uint8Array(await new Response(new Blob([txt]).stream().pipeThrough(new CompressionStream("deflate-raw"))).arrayBuffer());let bin="";for(let i=0;i<buf.length;i+=0x8000)bin+=String.fromCharCode.apply(null,buf.subarray(i,i+0x8000));return "z"+btoa(bin).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}
  return "j"+b64enc(txt)}
async function unpackData(s){const kind=s[0],body=s.slice(1);if(kind==="j")return JSON.parse(b64dec(body));
  let b=body.replace(/-/g,"+").replace(/_/g,"/");while(b.length%4)b+="=";const bin=atob(b),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
  return JSON.parse(await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).text())}
async function xlsxHandoffURL(){const st=Object.assign({},S.settings);delete st.mailTypes;return location.href.split("#")[0]+"#xlsz="+await packData(Object.assign({},snapshot(),{settings:st}))}
async function exportXlsxHere(){
  if(!xlSecs(S.settings).size){toast("Cochez au moins un onglet à exporter.");return}
  try{toast("Préparation du fichier Excel…");saveBlob(await buildXlsx(S.cibles,S.settings,S.pac,S.mailing),xlName());toast("Fichier Excel téléchargé")}
  catch(e){console.error(e);toast("Export Excel impossible : vérifiez la connexion internet, puis réessayez.")}
}
/* Onglet ouvert depuis le cadre Notion pour produire un fichier ou imprimer */
async function handoffMode(){
  const bare=()=>{document.body.classList.add("bare")};
  if(location.hash.startsWith("#pacprint=")){
    const raw=location.hash.slice(10);history.replaceState(null,"",location.pathname+location.search);bare();
    document.body.classList.add("print-pac");
    try{const d=JSON.parse(b64dec(raw));const lines=(d.lines||[]).map(x=>Object.assign(pnorm(x),{_st:x._st}));
      const z={n:0,visites:0,opps:0,devis:0,ca:0};
      $("#app").innerHTML='<section id="view-pac" style="display:flex;flex-direction:column;gap:14px">'+
        pacHead(d.t||PAC_TITRE_DEF,d.p||String(new Date().getFullYear()),lines,'<div class="bar pac-tools"><button class="btn primary" type="button" onclick="window.print()">Imprimer / PDF</button></div>')+
        '<div class="pac-wrap">'+pacTable(lines,p=>p._st||z,true)+'</div><p class="hint pac-note">Choisissez « Enregistrer au format PDF » comme imprimante pour obtenir un PDF. Rien n\'est enregistré dans cet onglet.</p></section>';
      setTimeout(()=>window.print(),600)}
    catch(e){$("#app").innerHTML='<div class="empty" style="padding:60px 20px"><h3>Impression impossible</h3><p>Le lien est incomplet. Revenez dans Notion et cliquez à nouveau sur Imprimer.</p></div>'}
    return true}
  if(location.hash==="#modele"){history.replaceState(null,"",location.pathname+location.search);bare();
    $("#app").innerHTML='<div class="empty" style="padding:60px 20px"><h3 id="hoT">Préparation du modèle…</h3><p id="hoP"></p><button class="btn primary" type="button" id="hoBtn" hidden>Télécharger à nouveau</button></div>';
    try{const blob=await buildTemplate();const go=()=>saveBlob(blob,"PAC_modele_import.xlsx");go();$("#hoT").textContent="Modèle d'import téléchargé";
      $("#hoP").textContent="Remplissez l'onglet Import, puis revenez dans Notion : Importer, et choisissez le fichier. Vous pouvez fermer cet onglet.";const b=$("#hoBtn");b.hidden=false;b.onclick=go}
    catch(e){$("#hoT").textContent="Modèle indisponible";$("#hoP").textContent="Vérifiez la connexion internet et réessayez."}
    return true}
  if(location.hash.startsWith("#xlsk=")){const raw=location.hash.slice(6);history.replaceState(null,"",location.pathname+location.search);bare();
    $("#app").innerHTML='<div class="empty" style="padding:60px 20px"><h3 id="hoT">Préparation du fichier Excel…</h3><p id="hoP">Le téléchargement démarre dans un instant.</p><button class="btn primary" type="button" id="hoBtn" hidden>Télécharger à nouveau</button></div>';
    try{const d=await unpackData(raw),R=d.rows||[],blob=await buildEnrXlsx(R),go=()=>saveBlob(blob,enrName());go();$("#hoT").textContent="Fichier des comptes téléchargé";$("#hoP").textContent=pl(R.length,"compte")+" extrait"+(R.length>1?"s":"")+". Vous pouvez fermer cet onglet et revenir dans Notion.";const b=$("#hoBtn");b.hidden=false;b.onclick=go}
    catch(e){$("#hoT").textContent="Extraction impossible";$("#hoP").textContent="Revenez dans Notion et réessayez."}
    return true}
  if(!location.hash.startsWith("#xlsz="))return false;
  const raw=location.hash.slice(6);history.replaceState(null,"",location.pathname+location.search);bare();
  $("#app").innerHTML='<div class="empty" style="padding:60px 20px"><h3 id="hoT">Préparation du fichier Excel…</h3><p id="hoP">Le téléchargement démarre dans un instant.</p><button class="btn primary" type="button" id="hoBtn" hidden>Télécharger à nouveau</button></div>';
  try{const d=await unpackData(raw);
    S.cibles=(d.cibles||[]).map(norm);S.comptes=(d.comptes||[]).map(knorm);S.contacts=(d.contacts||[]).map(ctnorm);S.actions=(d.actions||[]).map(anorm);S.plans=d.plans||[];S.pac=(d.pac||[]).map(pnorm);S.mailing=(d.mailing||[]).map(mnorm);S.devis=(d.devis||[]).map(dvnorm);S.settings=Object.assign({objectif:8},d.settings||{});bump();ensurePlans();
    const blob=await buildXlsx(S.cibles,S.settings,S.pac,S.mailing);const go=()=>saveBlob(blob,xlName());go();
    $("#hoT").textContent="Fichier Excel téléchargé";
    $("#hoP").textContent=pl(S.cibles.length,"cible")+", "+pl(S.comptes.length,"compte")+" et "+pl(S.actions.length,"action")+" exportés. Vous pouvez fermer cet onglet et revenir dans Notion. Rien n'a été enregistré ici.";
    const b=$("#hoBtn");b.hidden=false;b.onclick=go;
  }catch(e){$("#hoT").textContent="Export impossible";$("#hoP").textContent="Le lien d'export est incomplet ou la connexion internet est indisponible. Revenez dans Notion et cliquez à nouveau sur Export Excel."}
  return true;
}

/* ---------- Import Excel / CSV ---------- */
const FIELD_ALIASES={
  compte:["client","compte","raison sociale","entreprise","societe","nom","nom du client","nom client","compte athena"],
  /* Export des leads Athena (« Exporter vers Excel » depuis une vue de leads) */
  compteAthena:["compte existant","compte du lead","compte parent"],societe:["societe du lead","nom de la societe"],
  prenom:["prenom interlocuteur","prenom","prenom du contact"],nom:["nom interlocuteur","nom de famille"],contactAthena:["contact existant","contact du lead"],
  titreLead:["titre du lead","rubrique","sujet du lead"],leadDate:["cree le","date de creation"],leadId:["ne pas modifier lead"],
  type:["type","type de cible","categorie","nature"],
  dept:["departement","dept","dep","code departement","n departement"],cp:["code postal","cp"],
  contact:["contact","interlocuteur","nom du contact","contact principal"],
  fonction:["fonction","poste","titre"],
  tel:["telephone","tel","portable","mobile","telephone contact"],
  mail:["e mail","email","mail","courriel","adresse mail"],
  segment:["segment","secteur","activite","secteur d activite"],
  agence:["agence","agence de rattachement"],
  bu:["bu d origine","bu","bu origine","business unit"],
  apporteur:["apporteur interne","apporteur"],
  source:["source","origine"],
  campagne:["campagne"],
  prestations:["diagnostics vises","diagnostics","prestations","besoins","besoin"],
  potentiel:["potentiel annuel","potentiel","potentiel annuel eur","ca potentiel","potentiel annuel e"],
  priorite:["priorite","prio"],
  etape:["etape","statut","stade"],
  prochaineAction:["prochaine action","date de relance","relance","date prochaine action"],
  prochaineLibelle:["action a faire","action","quoi","prochaine etape"],
  accompagnant:["accompagnant","accompagnant visite"],
  motif:["motif sans suite","motif"],
  notes:["notes","note","commentaire","commentaires","observations","remarques"],
  oppCreee:["opportunite"],oppMontant:["montant opp","montant opportunite","montant"],oppStatut:["statut opp","statut opportunite"],oppDevis:["n devis athena","n devis","numero de devis","devis"]};
const ALIAS_IDX={};Object.entries(FIELD_ALIASES).forEach(([k,arr])=>arr.forEach(a=>ALIAS_IDX[a]=k));
const FIELD_LABEL={compteAthena:"Compte existant",societe:"Société du lead",prenom:"Prénom",nom:"Nom",contactAthena:"Contact existant",titreLead:"Titre du lead",leadDate:"Date du lead",leadId:"N° de lead Athena",compte:"Client",type:"Type",dept:"Département",cp:"Code postal",contact:"Contact",fonction:"Fonction",tel:"Téléphone",mail:"E-mail",segment:"Segment",agence:"Agence",bu:"BU d'origine",apporteur:"Apporteur",source:"Source",campagne:"Campagne",prestations:"Diagnostics visés",potentiel:"Potentiel annuel",priorite:"Priorité",etape:"Étape",prochaineAction:"Prochaine action",prochaineLibelle:"Action à faire",accompagnant:"Accompagnant",motif:"Motif sans suite",notes:"Notes",oppCreee:"Opportunité",oppMontant:"Montant opp.",oppStatut:"Statut opp.",oppDevis:"N° devis"};
function cellVal(v){if(v==null)return "";if(v instanceof Date)return v;if(typeof v==="object"){if(v.richText)return v.richText.map(r=>r.text).join("");if(v.text!=null)return String(v.text);if(v.result!=null)return v.result;if(v.formula)return "";}return v}
function toISO(v){if(v==null||v==="")return "";
  if(v instanceof Date){if(isNaN(v))return "";return v.getUTCFullYear()+"-"+pad(v.getUTCMonth()+1)+"-"+pad(v.getUTCDate())}
  if(typeof v==="number"&&v>20000&&v<80000){const d=new Date(Date.UTC(1899,11,30)+v*86400000);return toISO(d)}
  const t=String(v).trim();let m=t.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})(?:[\sT]|$)/);
  if(m){let y=+m[3];if(y<100)y+=2000;return y+"-"+pad(+m[2])+"-"+pad(+m[1])}
  m=t.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return m[1]+"-"+m[2]+"-"+m[3];return ""}
function toNum(v){if(v==null||v==="")return "";if(typeof v==="number")return v;const n=parseFloat(String(v).replace(/[^\d,.\-]/g,"").replace(/\s/g,"").replace(",","."));return isNaN(n)?"":n}
const splitList=v=>String(v||"").split(/[,;\/+\n]| et /).map(x=>x.trim()).filter(Boolean);
function mapType(v){const n=nh(v);if(!n)return "";if(n.includes("prescri"))return "Prescripteur";if(n.includes("client"))return "Client existant";if(n.includes("prospect"))return "Prospect";return ""}
function mapBU(v){const out=[];splitList(v).forEach(x=>{const n=nh(x);let b="Autre BU";if(n.startsWith("constr"))b="Construction";else if(n.startsWith("equip"))b="Équipements";else if(n.startsWith("envir"))b="Environnement";else if(n.startsWith("infra"))b="Infrastructures";if(!out.includes(b))out.push(b)});return out}
function mapPresta(v){const out=[];splitList(v).forEach(x=>{const n=nh(x);let k="AUTRE";
  if(n.includes("amiante")||n==="ami"||n.includes("dta")||n.includes("rat"))k="AMI";else if(n.includes("plomb")||n.includes("crep"))k="CREP";
  else if(n.includes("dpe")||n.includes("audit")||n.includes("energ"))k="DPE";else if(n.includes("gaz"))k="GAZ";else if(n.includes("elec"))k="ÉLEC";
  else if(n.includes("termite")||n==="term")k="TERM";else if(n.includes("pemd")||n.includes("dechet")||n.includes("demolition"))k="PEMD";else if(n.includes("vente")||n.includes("location")||n==="vente")k="VENTE";
  if(!out.includes(k))out.push(k)});return out}
function mapSegment(v){const n=nh(v);if(!n)return "";const hit=SEGMENTS.find(sg=>nh(sg)===n);if(hit)return hit;
  if(n.includes("bailleur"))return "Bailleur social";if(n.includes("fonci")||n.includes("investiss"))return "Foncière / investisseur";if(n.includes("promot"))return "Promoteur";
  if(n.includes("syndic")||n.includes("administrateur"))return "Syndic / administrateur de biens";if(n.includes("collectiv")||n.includes("public")||n.includes("mairie"))return "Collectivité / établissement public";
  if(n.includes("moe")||n.includes("architect")||n.includes("maitre d oeuvre")||n.includes("maitrise d oeuvre")||n.includes("bet")||n.includes("bureau d etude")||n.includes("economiste")||n.includes("amo"))return "Maîtrise d'œuvre / architecte / BET";
  if(n.includes("property")||n.includes("facility")||n.includes("gestionnaire"))return "Property / facility management";
  if(n.includes("assur")||n.includes("sinistre")||n.includes("expert"))return "Expert d'assurance / après sinistre";
  if(n.includes("travaux")||n.includes("prescri")||n.includes("etanch")||n.includes("demoli")||n.includes("desamiant")||n.includes("couvreur")||n.includes("couverture"))return "Entreprise de travaux (prescripteur)";
  if(n.includes("logisti")||n.includes("entrepot"))return "Logistique / entrepôts";if(n.includes("tertiaire")||n.includes("bureau"))return "Tertiaire / bureaux";
  if(n.includes("industri")||n.includes("usine")||n.includes("agro")||n.includes("pharma")||n.includes("chimi"))return "Industriel";return String(v).trim()}
function mapEtape(v){const n=nh(v);if(!n)return "";const hit=STAGES.find(st=>nh(st.l)===n||st.k===n);return hit?hit.k:""}
function mapSource(v){const n=nh(v);if(!n)return "";const hit=SOURCES.find(x=>nh(x)===n);return hit||String(v).trim()}
function readRows(rows){ /* rows: array of arrays, first = headers */
  if(!rows.length)return {cols:[],ignored:[],recs:[]};
  const head=rows[0].map(h=>String(cellVal(h)||"").trim());
  const map=head.map(h=>{const n=nh(h).replace(/ \*$/,"");return ALIAS_IDX[n]||ALIAS_IDX[n.replace(/ e$/,"")]||(n.startsWith("apporteur ")?"apporteur":null)});
  const cols=[],ignored=[];head.forEach((h,i)=>{if(!h)return;if(map[i]&&!cols.includes(map[i]))cols.push(map[i]);else if(!map[i]&&!/^\(ne pas modifier\)/i.test(h))ignored.push(h)});
  const recs=[];
  for(let r=1;r<rows.length;r++){const raw={};map.forEach((k,i)=>{if(k&&raw[k]==null){const v=cellVal(rows[r][i]);if(v!==""&&v!=null)raw[k]=v}});
    if(!Object.keys(raw).length)continue;recs.push(raw)}
  return {cols,ignored,recs};
}
function toCible(raw){const c={};
  const str=k=>raw[k]!=null?String(raw[k] instanceof Date?toISO(raw[k]):raw[k]).trim():"";
  ["compte","contact","fonction","tel","mail","agence","apporteur","campagne","prochaineLibelle","accompagnant","motif","notes"].forEach(k=>{const v=str(k);if(v)c[k]=v});
  if(raw.type)c.type=mapType(raw.type)||"";if(!c.type)delete c.type;
  {const dsrc=raw.dept!=null?raw.dept:null;let d="";
   if(dsrc!=null){const t=String(dsrc).trim();const m=t.match(/^(\d{2})/);if(m)d=m[1];else{const hit=DEPTS.find(([k,n])=>nh(n)===nh(t));if(hit)d=hit[0]}}
   if(!d&&raw.cp!=null){const m=String(raw.cp).trim().match(/^(\d{2})\d{3}$/);if(m)d=m[1]}
   if(d)c.dept=d}
  if(raw.segment)c.segment=mapSegment(raw.segment);if(raw.source)c.source=mapSource(raw.source);
  if(raw.bu)c.bu=mapBU(raw.bu);if(raw.prestations)c.prestations=mapPresta(raw.prestations);
  if(raw.potentiel!=null){const n=toNum(raw.potentiel);if(n!=="")c.potentiel=n}
  if(raw.priorite){const pz=String(raw.priorite).trim().toUpperCase().charAt(0);if("ABC".includes(pz))c.priorite=pz}
  if(raw.etape){const e=mapEtape(raw.etape);if(e)c.etape=e}
  if(raw.prochaineAction!=null){const d=toISO(raw.prochaineAction);if(d)c.prochaineAction=d}
  const op={};if(raw.oppCreee!=null)op.creee=/^(oui|yes|x|1|vrai|true)$/i.test(String(raw.oppCreee).trim());
  if(raw.oppMontant!=null){const n=toNum(raw.oppMontant);if(n!=="")op.montant=n}
  if(raw.oppStatut){const n=nh(raw.oppStatut);op.statut=n.startsWith("concl")?"Conclue":n.startsWith("perd")?"Perdu":"Ouvert"}
  if(raw.oppDevis)op.devis=String(raw.oppDevis).trim();
  if(Object.keys(op).length)c.opp=op;
  /* Lead Athena : compte (ou société du lead), interlocuteur, titre et date du lead */
  if(!c.compte){const v=str("compteAthena")||str("societe");if(v)c.compte=v}
  if(!c.contact){const v=[str("prenom"),str("nom")].filter(Boolean).join(" ")||str("contactAthena");if(v)c.contact=v}
  const titre=str("titreLead"),lid=str("leadId");
  if(titre||lid||raw.leadDate!=null||raw.compteAthena!=null||raw.societe!=null){
    const d=toISO(raw.leadDate),src=raw.source!=null?String(raw.source).trim():"";
    const line="Lead Athena"+(d?" du "+fdate(d):"")+(titre?" : "+titre:"")+(src&&nh(src)!=="lead athena"?" ("+src+")":"");
    c.notes=[c.notes,line].filter(Boolean).join("\n");
    c.source="Lead Athena";
    if(!c.type)c.type=str("compteAthena")?"Client existant":"Prospect";
    if(!c.campagne)c.campagne="PAC IDF – Leads Athena";
    if(!c.prochaineAction&&!c.prochaineLibelle){c.prochaineAction=todayISO();c.prochaineLibelle="Traiter le lead"+(titre?" : "+titre:"")}
    if(lid)c.leadIds=[lid];
  }
  return c}
function parseCSV(text){text=text.replace(/^﻿/,"");const first=text.split(/\r?\n/)[0]||"";
  const d=[";","\t",","].map(x=>[x,first.split(x).length]).sort((a,b)=>b[1]-a[1])[0][0];
  const rows=[];let row=[],f="",q=false;
  for(let i=0;i<text.length;i++){const ch=text[i];
    if(q){if(ch==='"'){if(text[i+1]==='"'){f+='"';i++}else q=false}else f+=ch}
    else if(ch==='"')q=true;else if(ch===d){row.push(f);f=""}else if(ch==="\n"||ch==="\r"){if(ch==="\r"&&text[i+1]==="\n")i++;row.push(f);rows.push(row);row=[];f=""}else f+=ch}
  if(f!==""||row.length){row.push(f);rows.push(row)}return rows.filter(r=>r.some(x=>String(x).trim()!==""))}
/* Lecteur Excel de secours : pour les fichiers produits par d'autres logiciels (export Athena…) que la bibliothèque Excel ne sait pas ouvrir, ou hors connexion */
async function unzipLite(buf){
  const dv=new DataView(buf),u8=new Uint8Array(buf);let e=-1;
  for(let i=buf.byteLength-22;i>=Math.max(0,buf.byteLength-65557);i--){if(dv.getUint32(i,true)===0x06054b50){e=i;break}}
  if(e<0)throw new Error("zip");
  const n=dv.getUint16(e+10,true),files={};let p=dv.getUint32(e+16,true);const td=new TextDecoder();
  for(let k=0;k<n&&dv.getUint32(p,true)===0x02014b50;k++){
    const nl=dv.getUint16(p+28,true),xl=dv.getUint16(p+30,true),cl=dv.getUint16(p+32,true);
    files[td.decode(u8.subarray(p+46,p+46+nl)).replace(/^\//,"")]={m:dv.getUint16(p+10,true),cs:dv.getUint32(p+20,true),lh:dv.getUint32(p+42,true)};p+=46+nl+xl+cl}
  const get=async name=>{const f=files[name];if(!f)return null;const st=f.lh+30+dv.getUint16(f.lh+26,true)+dv.getUint16(f.lh+28,true),d=u8.subarray(st,st+f.cs);
    if(f.m===0)return td.decode(d);
    return td.decode(await new Response(new Blob([d]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer())};
  return get;
}
async function readXlsxLite(buf){
  const get=await unzipLite(buf),P=new DOMParser(),xml=t=>P.parseFromString(t||"<x/>","application/xml"),tag=(el,n)=>[...el.getElementsByTagName(n)];
  const path=t=>{if(t.startsWith("/"))return t.slice(1);const out=[];("xl/"+t).split("/").forEach(s=>{if(s==="..")out.pop();else if(s&&s!==".")out.push(s)});return out.join("/")};
  const rels={};tag(xml(await get("xl/_rels/workbook.xml.rels")),"Relationship").forEach(r=>{rels[r.getAttribute("Id")]=path(r.getAttribute("Target"))});
  const ss=tag(xml(await get("xl/sharedStrings.xml")),"si").map(si=>tag(si,"t").filter(t=>!t.closest||!t.closest("rPh")).map(t=>t.textContent).join(""));
  const R="http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  const sheets=tag(xml(await get("xl/workbook.xml")),"sheet").map(s=>({name:s.getAttribute("name"),state:s.getAttribute("state")||"visible",path:rels[s.getAttributeNS(R,"id")||s.getAttribute("r:id")]}));
  const load=async sh=>{const d=xml(await get(sh.path)),rows=[];
    tag(d,"row").forEach(r=>{const a=[];
      tag(r,"c").forEach(c=>{const ref=(c.getAttribute("r")||"").replace(/\d+/g,"");let ci=0;for(const ch of ref)ci=ci*26+ch.charCodeAt(0)-64;ci=ci?ci-1:a.length;
        const t=c.getAttribute("t"),v=c.getElementsByTagName("v")[0],vt=v?v.textContent:"";
        a[ci]=t==="s"?(ss[+vt]||""):t==="inlineStr"?tag(c,"t").map(x=>x.textContent).join(""):t==="b"?(vt==="1"?"Oui":"Non"):(t==="str"||t==="e")?vt:(vt===""?"":Number(vt))});
      for(let i=0;i<a.length;i++)if(a[i]===undefined)a[i]="";
      if(a.some(x=>x!==""))rows.push(a)});
    return rows};
  return {sheets,load};
}
async function openBook(file){
  const name=file.name.toLowerCase();
  if(name.endsWith(".csv")||name.endsWith(".txt")){const rows=parseCSV(await file.text());return {sheets:[{name:"(csv)",state:"visible"}],load:async()=>rows}}
  const buf=await file.arrayBuffer();
  try{await loadExcel();const wb=new ExcelJS.Workbook();await wb.xlsx.load(buf.slice(0));
    return {sheets:wb.worksheets.map(ws=>({name:ws.name,state:ws.state||"visible",ws})),
      load:async sh=>{const out=[];sh.ws.eachRow({includeEmpty:false},r=>{out.push(r.values.slice(1))});return out}}}
  catch(e){if(!window.DecompressionStream)throw e;return readXlsxLite(buf)}
}
async function parseImportFile(file){
  const name=file.name.toLowerCase();
  if(name.endsWith(".csv")||name.endsWith(".txt")){return {sheet:null,...readRows(parseCSV(await file.text()))}}
  const book=await openBook(file);
  const byName=n=>book.sheets.find(s=>s.name===n);
  let pick=["Import","Cibles","Prospects"].map(byName).find(Boolean),rows=null;
  if(!pick){for(const s of book.sheets.filter(s=>s.state==="visible")){const r=await book.load(s);if(r.length){pick=s;rows=r;break}}}
  if(!pick)pick=book.sheets[0];
  const res=readRows(rows||await book.load(pick));
  const co=byName("Coordonnées");
  if(co&&co!==pick){const extra=readRows(await book.load(co));const byN={};extra.recs.forEach(x=>{if(x.compte)byN[nh(x.compte)]=x});
    res.recs.forEach(x=>{const e=x.compte&&byN[nh(x.compte)];if(e)Object.keys(e).forEach(k=>{if(x[k]==null)x[k]=e[k]})});
    extra.cols.forEach(k=>{if(!res.cols.includes(k))res.cols.push(k)})}
  return {sheet:pick.name,...res};
}
let IMP=null;
function importMenu(){
  const d=$("#drawer");IMP=null;
  d.innerHTML='<div class="dh"><div class="grow"><span class="lbl">Importer</span><h2 id="dTitle">Importer des clients et prospects</h2></div><button class="btn ghost" type="button" data-act="close">Fermer</button></div>'+
  '<div class="db">'+
  '<div style="display:flex;flex-direction:column;gap:8px"><span class="lbl">1. Le fichier</span>'+
  '<p class="hint">Un fichier Excel (.xlsx) ou CSV, une ligne par entreprise, avec au minimum une colonne « Client ». Les autres colonnes sont reconnues par leur titre : Type, Segment, BU d\'origine, Apporteur, Diagnostics visés, Potentiel, Priorité, Contact, Téléphone, E-mail… Un export de cette application se réimporte tel quel.</p>'+
  (IN_FRAME?'<a class="btn" href="'+location.href.split("#")[0]+'#modele" target="_blank" rel="noopener">Télécharger le modèle d\'import (.xlsx)</a>':'<button class="btn" type="button" id="imModel">Télécharger le modèle d\'import (.xlsx)</button>')+
  '</div>'+
  '<div style="display:flex;flex-direction:column;gap:8px"><span class="lbl">2. Choisir le fichier</span><input type="file" id="imFile" accept=".xlsx,.csv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv">'+
  (IN_FRAME?'<p class="hint">Dans Notion, cliquez sur le bouton plutôt que de faire glisser le fichier : Notion intercepte les fichiers déposés.</p>':'')+'</div>'+
  '<div id="imPrev" hidden></div>'+
  '</div>';
  $("#scrim").hidden=false;d.hidden=false;
  const mb=$("#imModel");if(mb)mb.onclick=async()=>{try{saveBlob(await buildTemplate(),"PAC_modele_import.xlsx");toast("Modèle téléchargé")}catch(e){toast("Modèle indisponible : vérifiez la connexion internet.")}};
  $("#imFile").onchange=async e=>{const f=e.target.files[0];if(!f)return;const pv=$("#imPrev");pv.hidden=false;pv.innerHTML='<p class="hint">Lecture du fichier…</p>';
    try{IMP=await parseImportFile(f);drawImportPreview(f.name)}catch(err){pv.innerHTML='<div class="notice warn"><b>Fichier illisible.</b> Enregistrez-le au format .xlsx ou .csv et réessayez. Si le fichier est un .xlsx, vérifiez la connexion internet.</div>'}};
}
/* Noms proches : tous les mots significatifs du nom le plus court se retrouvent dans l'autre (« Cougnaud » ≈ « COUGNAUD – Saint-Michel-sur-Orge ») */
const NSTOP=new Set(["sa","sas","sasu","sarl","eurl","sci","snc","scop","sem","spl","gie","et","de","du","des","la","le","les","the","and","cie","ste","societe","groupe","group","holding","france","fr"]);
const ntok=x=>nh(x).split(" ").filter(t=>t.length>1&&!NSTOP.has(t));
function nearOf(name,pool){const A=new Set(ntok(name));if(!A.size)return [];
  return pool.map(x=>{const B=new Set(ntok(x.compte));if(!B.size)return null;let i=0;A.forEach(t=>{if(B.has(t))i++});
      if(i<Math.min(A.size,B.size)||![...A].some(t=>B.has(t)&&(t.length>=4||/\d/.test(t))))return null;return {x,sc:i/Math.max(A.size,B.size)}})
    .filter(Boolean).sort((a,b)=>b.sc-a.sc||a.x.compte.localeCompare(b.x.compte,"fr")).slice(0,6).map(o=>o.x)}
function addNotes(a,b){let out=String(a||"").trim();String(b||"").split("\n").map(l=>l.trim()).filter(Boolean).forEach(l=>{if(!out.includes(l))out=out?out+"\n"+l:l});return out}
function mergeRow(a,b){ /* deux lignes du fichier pour le même client */
  Object.entries(b).forEach(([k,v])=>{if(v==null||v==="")return;
    if(k==="notes")a.notes=addNotes(a.notes,v);
    else if(k==="bu"||k==="prestations"||k==="leadIds")a[k]=[...new Set([...(a[k]||[]),...v])];
    else if(k==="opp")a.opp=Object.assign({},v,a.opp||{});
    else if(a[k]==null||a[k]==="")a[k]=v})}
function drawImportPreview(fname){
  const pv=$("#imPrev"),I=IMP;
  if(!["compte","compteAthena","societe"].some(k=>I.cols.includes(k))){pv.innerHTML='<div class="notice warn"><b>Colonne « Client » introuvable.</b> La première ligne du fichier doit contenir les titres de colonnes, dont « Client » (ou « Compte », « Entreprise », « Raison sociale », ou pour un export de leads Athena « Compte existant » ou « Société du lead »).</div>';return}
  /* Rapprochement : n° de lead Athena, puis même client et même département ; une seule fiche existante et une seule ligne dans le fichier = même client */
  const byName={};S.cibles.forEach(c=>{const k=nh(c.compte);if(k)(byName[k]=byName[k]||[]).push(c)});
  const byLead={};S.cibles.forEach(x=>x.leadIds.forEach(id=>{byLead[id]=x}));
  const effDept=c=>c.dept||guessDept(Object.assign(blank(),c));
  const recs=I.recs.map(toCible),rowsByName={};recs.forEach(c=>{const k=nh(c.compte);if(k)rowsByName[k]=(rowsByName[k]||0)+1});
  const used=new Set();
  const findEx=c=>{const k=nh(c.compte),all=byName[k]||[],same=all.filter(x=>!used.has(x.id));if(!same.length)return null;const d=effDept(c);
    if(d)return same.find(x=>x.dept===d)||same.find(x=>!x.dept)||(all.length===1&&rowsByName[k]===1?same[0]:null);
    return (c.campagne&&same.find(x=>x.campagne===c.campagne))||same[0]};
  const seen={},seenLead=new Set();let nSkip=0,nSame=0,nMerged=0;const items=[];
  recs.forEach(c=>{if(!c.compte){nSkip++;return}
    const lids=c.leadIds||[];if(lids.length&&lids.every(id=>seenLead.has(id))){nSame++;return}lids.forEach(id=>seenLead.add(id));
    const k=nh(c.compte)+"|"+effDept(c);if(seen[k]){mergeRow(seen[k].c,c);nMerged++;return}
    let ex=null;for(const id of lids){if(byLead[id]){ex=byLead[id];break}}
    if(!ex)ex=findEx(c);if(ex)used.add(ex.id);
    const dd=effDept(c),it={c,ex,near:ex?[]:nearOf(c.compte,S.cibles.filter(x=>!dd||!x.dept||x.dept===dd))};seen[k]=it;items.push(it)});
  I.items=items;I.counts={nSkip,nSame,nMerged};
  const isLead=I.cols.includes("titreLead")||I.cols.includes("leadId");
  const nearIt=items.filter(it=>it.near.length);
  const pill=it=>it.ex?'<span class="pill st-rdv">Existe</span>':it.near.length?'<span class="pill st-cible">Nom proche</span>':'<span class="pill st-gagne">Nouveau</span>';
  const show=items.slice(0,8),grouped=nMerged+nSame;
  pv.innerHTML='<div style="display:flex;flex-direction:column;gap:12px"><span class="lbl">3. Vérifier</span>'+
   '<p class="hint">'+esc(fname)+(I.sheet?' · onglet « '+esc(I.sheet)+' »':'')+(isLead?' · <b>export de leads Athena</b>':'')+'</p>'+
   '<div class="imp-sum" id="imSum"></div>'+
   '<p class="hint"><b>Colonnes reconnues :</b> '+I.cols.map(k=>esc(FIELD_LABEL[k]||k)).join(", ")+(I.ignored.length?'<br><b>Colonnes non reprises :</b> '+I.ignored.map(esc).join(", "):'')+
    (grouped?'<br>Regroupées : '+[nMerged?pl(nMerged,"ligne")+" du même client, réunie"+(nMerged>1?"s":"")+" en une fiche":"",nSame?pl(nSame,"lead")+" en double dans le fichier":""].filter(Boolean).join(" ; ")+'.':'')+(nSkip?'<br>Ignorées : '+pl(nSkip,"ligne")+' sans nom de client ni de société.':'')+'</p>'+
   (nearIt.length?'<div class="nearl"><span class="lbl">À vérifier : un nom proche existe déjà</span><p class="hint">Pour éviter un doublon, rattachez la ligne à la fiche existante, ou créez une nouvelle fiche.</p>'+
     nearIt.map(it=>{const i=items.indexOf(it);return '<div class="near-r"><div class="grow"><b>'+esc(it.c.compte)+'</b>'+(it.c.contact?'<div class="sub">'+esc(it.c.contact)+'</div>':'')+'</div><select data-near="'+i+'" aria-label="Rattachement de '+esc(it.c.compte)+'">'+
       it.near.map(x=>'<option value="'+esc(x.id)+'">Rattacher à '+esc(x.compte)+(x.dept?' ('+esc(x.dept)+')':'')+'</option>').join("")+'<option value="">Créer une nouvelle fiche</option></select></div>'}).join("")+'</div>':'')+
   '<div class="imp-prev"><table><thead><tr><th>Client</th><th>Type</th><th>Contact</th><th>Diagnostics</th><th></th></tr></thead><tbody>'+
   show.map(it=>'<tr><td><b>'+esc(it.c.compte)+'</b></td><td>'+esc(it.c.type||"Prospect")+'</td><td>'+esc(it.c.contact||"")+'</td><td>'+esc((it.c.prestations||[]).join(", "))+'</td><td>'+pill(it)+'</td></tr>').join("")+
   '</tbody></table></div>'+(items.length>show.length?'<p class="hint">… et '+(items.length-show.length)+' autre'+(items.length-show.length>1?'s':'')+'.</p>':'')+
   (items.some(it=>it.ex||it.near.length)?'<div class="radio"><span class="lbl">Pour les clients déjà présents</span>'+
     '<label><input type="radio" name="imDup" value="complete" checked> Compléter la fiche : seuls les champs vides sont remplis, les notes du fichier s\'ajoutent aux notes existantes</label>'+
     '<label><input type="radio" name="imDup" value="update"> Remplacer par les valeurs du fichier (les notes s\'ajoutent, les visites et échanges sont conservés)</label>'+
     '<label><input type="radio" name="imDup" value="skip"> Ne pas toucher aux fiches existantes</label></div>':'')+
   '<div class="bar"><button class="btn primary" type="button" id="imGo">Importer</button></div></div>';
  const upd=()=>{const mode=(document.querySelector('input[name="imDup"]:checked')||{}).value||"complete";
    let nNew=0,nEx=0;items.forEach((it,i)=>{if(impTarget(it,i))nEx++;else nNew++});
    const n=nNew+(mode==="skip"?0:nEx);
    $("#imSum").innerHTML='<div><b>'+nNew+'</b><span class="sub">nouvelle'+(nNew>1?'s':'')+' fiche'+(nNew>1?'s':'')+'</span></div><div><b>'+nEx+'</b><span class="sub">déjà présente'+(nEx>1?'s':'')+'</span></div><div><b>'+grouped+'</b><span class="sub">regroupée'+(grouped>1?'s':'')+'</span></div><div><b>'+nSkip+'</b><span class="sub">ignorée'+(nSkip>1?'s':'')+'</span></div>';
    $("#imGo").textContent=n?"Importer "+pl(n,"ligne"):"Rien à importer";$("#imGo").disabled=!n};
  pv.querySelectorAll('input[name="imDup"],select[data-near]').forEach(r=>r.onchange=upd);upd();
  $("#imGo").onclick=()=>runImport();
}
function impTarget(it,i){if(it.ex)return it.ex;if(!it.near.length)return null;const sel=document.querySelector('#imPrev select[data-near="'+i+'"]');const id=sel?sel.value:it.near[0].id;return id?S.cibles.find(x=>x.id===id)||null:null}
async function runImport(){
  const mode=(document.querySelector('input[name="imDup"]:checked')||{}).value||"complete";
  const out=new Map(),now=new Date().toISOString();let nNew=0;const touched=new Set();
  IMP.items.forEach((it,i)=>{const c=it.c,ex=impTarget(it,i);
    if(ex){if(mode==="skip")return;const m=out.get(ex.id)||clone(ex);touched.add(ex.id);
      Object.entries(c).forEach(([k,v])=>{if(v==null||v===""||k==="prochaineAction"||k==="prochaineLibelle")return;
        if(k==="bu"||k==="prestations"||k==="leadIds")m[k]=[...new Set([...(m[k]||[]),...v])];
        else if(k==="notes")m.notes=addNotes(m.notes,v);
        else if(k==="opp"){if(mode==="update"||!(m.opp&&m.opp.creee))m.opp=Object.assign({},m.opp,v)}
        else if(k==="type"&&mode==="complete"){if((TYPE_RANK[v]||0)>(TYPE_RANK[m.type]||0))m.type=v}
        else if(mode==="update"||m[k]==null||m[k]==="")m[k]=v});
      if((c.prochaineAction||c.prochaineLibelle)&&(mode==="update"||!nextOf(ex.compteId))){m.prochaineAction=c.prochaineAction||"";m.prochaineLibelle=c.prochaineLibelle||""}
      const n0=S.contacts.length+S.actions.length,nm=absorbCible(m),grew=S.contacts.length+S.actions.length>n0;if(grew||JSON.stringify(nm)!==JSON.stringify(norm(clone(ex))))out.set(ex.id,nm);else if(!out.has(ex.id))touched.delete(ex.id)}
    else{const n=norm(Object.assign(blank(),{source:"Prospection directe"},c,{id:uid(),creeLe:now}));n.opp=Object.assign(blank().opp,c.opp||{});out.set(n.id,absorbCible(n));nNew++}});
  const btn=$("#imGo");btn.disabled=true;btn.textContent="Import en cours…";
  const ok=out.size?await bulkApply([...out.values()],[]):true;
  if(!ok){btn.disabled=false;btn.textContent="Réessayer";return}
  toast([nNew?pl(nNew,"nouvelle fiche","nouvelles fiches"):"",touched.size?pl(touched.size,"fiche complétée","fiches complétées"):""].filter(Boolean).join(" · ")||"Rien de nouveau : tout était déjà dans l'application");
  closeDrawer();S.view="toutes";render();
}
async function buildTemplate(){
  await loadExcel();const wb=new ExcelJS.Workbook();wb.creator="PAC Prospection IDF · CSC";
  const ws=wb.addWorksheet("Import",{properties:{tabColor:{argb:COPPER}}});
  const TC=[["Client *",32],["Type",16],["Segment",28],["Agence",15],["BU d'origine",22],["Apporteur interne",22],["Source",18],["Diagnostics visés",30],["Potentiel annuel",15],["Priorité",9],["Étape",17],["Prochaine action",14],["Action à faire",32],["Contact",22],["Fonction",20],["Téléphone",15],["E-mail",28],["Campagne",30],["Notes",45],["Département",18]];
  ws.columns=TC.map(([h,w])=>({header:h,width:w}));
  headStyle(ws,TC.length);ws.views=[{state:"frozen",ySplit:1,xSplit:1,activeCell:"A2"}];
  const li=wb.addWorksheet("Listes",{state:"hidden"});
  const lists=[TYPES,SEGMENTS,SOURCES,["A","B","C"],STAGES.map(x=>x.l),DEPTS.map(([k,n])=>k+" · "+n)];
  lists.forEach((arr,ci)=>arr.forEach((v,ri)=>{li.getCell(ri+1,ci+1).value=v}));
  const L=ci=>["Listes!$"+colL(ci+1)+"$1:$"+colL(ci+1)+"$"+lists[ci].length];
  const dv={B:L(0),C:L(1),G:L(2),J:L(3),K:L(4),T:L(5)};
  for(let r=2;r<=500;r++){Object.entries(dv).forEach(([col,f])=>{ws.getCell(col+r).dataValidation={type:"list",allowBlank:true,formulae:f,showErrorMessage:false}});
    ws.getCell("I"+r).numFmt='#,##0 "€"';ws.getCell("L"+r).numFmt=DFMT}
  const g=wb.addWorksheet("Mode d'emploi",{views:[{showGridLines:false}]});g.getColumn(1).width=3;g.getColumn(2).width=110;
  const lines=[["Modèle d'import — PAC Prospection IDF",{size:16,bold:true}],["Une ligne par entreprise dans l'onglet Import. Seule la colonne Client est obligatoire.",{}],["",{}],
   ["Client : le nom exact du compte dans Athena. Il sert à reconnaître une entreprise déjà présente dans l'application.",{}],
   ["Type : Client existant, Prospect ou Prescripteur (liste déroulante). Vide = Prospect.",{}],
   ["BU d'origine et Diagnostics visés : plusieurs valeurs possibles, séparées par des virgules (ex. Amiante, Plomb, DPE).",{}],
   ["Diagnostics reconnus : Amiante, Plomb, DPE / audit énergétique, Gaz, Électricité, Termites, PEMD, Avant vente / relocation.",{}],
   ["Priorité : A, B ou C. Vide = B.   Étape : vide = À qualifier.",{}],
   ["Prochaine action : une date au format jj/mm/aaaa.",{}],["",{}],
   ["Dans l'application : Importer, choisir ce fichier, vérifier l'aperçu puis valider.",{bold:true}],
   ["Une entreprise déjà présente est complétée avec les informations du fichier : ses visites et son historique sont conservés.",{}]];
  lines.forEach(([t,f],i)=>{const c=g.getCell("B"+(i+2));c.value=t;c.font=Object.assign({name:"Calibri",size:11},f);c.alignment={wrapText:true}});
  const buf=await wb.xlsx.writeBuffer();return new Blob([buf],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
}
