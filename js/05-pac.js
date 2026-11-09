/* PAC Prospection IDF · CSC — Plan d'action commercial (PAC) : lignes, plans, import / export, impression
   Fichier 5/18 : les fichiers se chargent dans l'ordre et partagent leurs déclarations. */
"use strict";

/* ---------- PAC : plan d'action commercial (format PAC France : élément, objectif, actions T1-T4, suivi, résultats, correctif) ---------- */
const PDEC=[["Continuer","ok"],["Modifier","warn"],["Reporter","info"],["Arrêter","bad"]];
const PAC_TITRE_DEF="Plan d'action commercial Diagnostic – Île-de-France";
let P=null,pIsNew=false,pDelArmed=false,PIMP=null;
const PPRIO=[["1","P1","Haute"],["2","P2","Moyenne"],["3","P3","Basse"]],PCLS={"1":"A","2":"B","3":"C"};
const toPrio=v=>{const n=nh(v);if(/^p ?1$|haute|forte|elevee/.test(n))return "1";if(/^p ?2$|moyenne|normale/.test(n))return "2";if(/^p ?3$|basse|faible/.test(n))return "3";return ""};
const prioLbl=k=>{const x=PPRIO.find(y=>y[0]===k);return x?x[1]+" · "+x[2].toLowerCase():"Sans priorité"};
function pblank(){return {planId:"",secteurs:[],prio:"",element:"",objectif:"",descriptif:"",actions:"",t1:"",t2:"",t3:"",t4:"",qui:"",quand:"",kpi:"",attendus:"",obtenus:"",decision:"",campagnes:[],obj:{visites:"",opps:"",devis:"",ca:""},ordre:0}}
function pnorm(x){const o=Object.assign(pblank(),x||{});o.obj=Object.assign(pblank().obj,(x&&x.obj)||{});
  o.campagnes=Array.isArray(o.campagnes)?o.campagnes:[];o.secteurs=Array.isArray(o.secteurs)?o.secteurs:[];if(!PDEC.some(d=>d[0]===o.decision))o.decision="";o.ordre=Number(o.ordre)||0;o.prio=PCLS[String(o.prio)]?String(o.prio):"";return o}
const byPrio=(a,b)=>(a.prio||"9").localeCompare(b.prio||"9")||a.ordre-b.ordre||(a.creeLe||"").localeCompare(b.creeLe||"");
const PUI=(()=>{try{return Object.assign({f:"",sort:"prio"},JSON.parse(localStorage.getItem("pac-idf-ui")||"{}"))}catch(e){return {f:"",sort:"prio"}}})();
const puiSave=()=>{try{localStorage.setItem("pac-idf-ui",JSON.stringify(PUI))}catch(e){}};
const curQ=()=>Math.floor(new Date().getMonth()/3)+1;
function pacKpis(p,st){
  if(!p.campagnes.length&&!(p.secteurs||[]).length)return "";
  const L=[["Cibles",st.n,""],["Visites réalisées",st.visites,p.obj.visites],["Opportunités",st.opps,p.obj.opps],["Devis",st.devis,p.obj.devis],["CA conclu",st.ca,p.obj.ca,true]];
  return '<div class="pks">'+L.map(([l,v,o,money])=>{const ob=Number(o)||0,f=x=>money?eur(x):x;
    return '<div class="pk"><span>'+l+'</span><b>'+f(v)+(ob?' / '+f(ob):'')+'</b></div>'+(ob?'<div class="pbar"><i'+(v>=ob?' class="ok"':'')+' style="width:'+Math.min(100,Math.round(v/ob*100))+'%"></i></div>':'')}).join("")+'</div>';
}
function pacTable(lines,statsOf,ro){
  const q=curQ(),dash='<span class="sub">—</span>';
  return '<table class="pac"><colgroup><col style="width:170px"><col style="width:170px"><col style="width:200px">'+'<col style="width:125px">'.repeat(4)+
   '<col style="width:120px"><col style="width:90px"><col style="width:160px"><col style="width:150px"><col style="width:190px"><col style="width:116px"></colgroup>'+
   '<thead><tr><th rowspan="2" class="stk">Élément</th><th rowspan="2">Objectif</th><th rowspan="2">Descriptif de l\'action</th><th colspan="4">Actions</th><th colspan="3">Suivi du plan d\'action</th><th colspan="2">Résultats</th><th rowspan="2">Plan d\'action correctif</th></tr>'+
   '<tr>'+[1,2,3,4].map(i=>'<th'+(i===q?' class="cur" title="Trimestre en cours"':'')+'>Trimestre '+i+'</th>').join("")+'<th>Qui ? Agence ?</th><th>Quand ?</th><th>Indicateurs clés</th><th>Attendus</th><th>Obtenus</th></tr></thead><tbody>'+
   lines.map(p=>{const st=statsOf(p),tq=[p.t1,p.t2,p.t3,p.t4],anyT=tq.some(Boolean);
     const ml=x=>{const L=String(x).split("\n").map(l=>l.trim()).filter(Boolean);return L.length>1?L.map(l=>'<div class="ml">'+esc(l)+'</div>').join(""):esc(x)};
     const acts=anyT?tq.map((t,i)=>'<td'+(i+1===q?' class="cur"':'')+'>'+(t?ml(t):dash)+'</td>').join(""):'<td colspan="4">'+(p.actions?ml(p.actions):dash)+'</td>';
     const obt=pacKpis(p,st)+(p.obtenus?'<div>'+esc(p.obtenus)+'</div>':'')+((p.campagnes.length||(p.secteurs||[]).length)?'<div class="pcamp">'+esc(p.campagnes.map(c=>c.replace(/^PAC IDF – /,"")).concat(p.secteurs||[]).join(" · "))+'</div>':'');
     return '<tr data-pid="'+esc(p.id)+'" tabindex="0"><td class="stk"><div class="pel"><button type="button" class="prio prio-'+(PCLS[p.prio]||'0')+'" data-pprio="'+esc(p.id)+'" title="'+(ro?esc(prioLbl(p.prio)):'Priorité : '+esc(prioLbl(p.prio))+' — cliquer pour changer')+'" aria-label="Priorité : '+esc(prioLbl(p.prio))+'"'+(ro?' disabled':'')+'>'+(p.prio?'P'+p.prio:'–')+'</button><span>'+esc(p.element)+'</span></div></td><td>'+(p.objectif?esc(p.objectif):dash)+'</td>'+
      '<td>'+(p.descriptif?esc(p.descriptif):(anyT&&p.actions?'':dash))+(anyT&&p.actions?'<div class="pacts">Actions : '+esc(p.actions)+'</div>':'')+'</td>'+acts+
      '<td>'+(p.qui?esc(p.qui):dash)+'</td><td>'+(p.quand?esc(p.quand):dash)+'</td><td>'+(p.kpi?esc(p.kpi):dash)+'</td><td>'+(p.attendus?esc(p.attendus):dash)+'</td><td>'+(obt||dash)+'</td>'+
      '<td><div class="decs">'+PDEC.map(([d,k])=>'<button type="button" class="dec dc-'+k+'" data-pdq="'+esc(p.id)+'" data-d="'+esc(d)+'" aria-pressed="'+(p.decision===d)+'"'+(ro?' disabled':'')+'>'+esc(d)+'</button>').join("")+'</div></td></tr>'}).join("")+
   '</tbody></table>';
}
function pacHead(titre,per,lines,tools){
  const cnt=PDEC.map(([d])=>({d,n:lines.filter(p=>p.decision===d).length})).filter(x=>x.n),none=lines.filter(p=>!p.decision).length;
  const pc=PPRIO.map(([k,l])=>({l,n:lines.filter(p=>p.prio===k).length})).filter(x=>x.n);
  return '<div class="pac-head"><div class="grow"><span class="lbl">Plan d\'action · '+esc(per)+'<span class="pac-date"> · édité le '+new Date().toLocaleDateString("fr-FR")+'</span></span><h2>'+esc(titre)+'</h2>'+
   (lines.length?'<p class="sub" style="margin:3px 0 0">'+lines.length+' ligne'+(lines.length>1?'s':'')+(pc.length?' · '+pc.map(x=>x.n+' '+x.l).join(' · '):'')+(cnt.length?' · '+cnt.map(x=>x.n+' '+x.d.toLowerCase()).join(' · '):'')+(none?' · '+none+' sans décision':'')+'</p>':'')+
   '</div>'+(tools||'')+'</div>';
}
function pacPrintURL(){
  const lines=pacView().map(p=>Object.assign(clone(p),{_st:pacStats(p)}));
  return location.href.split("#")[0]+"#pacprint="+b64enc(JSON.stringify({t:pacTitre(),p:pacPeriode(),lines}));
}
function openPac(id){
  const src=id?S.pac.find(p=>p.id===id):null;pIsNew=!src;
  P=src?clone(src):Object.assign(pblank(),{id:uid(),creeLe:new Date().toISOString(),ordre:pacNextOrdre(),planId:curPlan().id});
  pDelArmed=false;drawPac();$("#scrim").hidden=false;$("#drawer").hidden=false;
  setTimeout(()=>{const f=$("#p-element");if(f&&pIsNew)f.focus({preventScroll:true})},30);
}
function drawPac(){
  const p=P,ro=!S.writable,dis=ro?" disabled":"";
  const camps=[...new Set([...S.cibles.map(c=>c.campagne).filter(Boolean),...p.campagnes])].sort((a,b)=>a.localeCompare(b,"fr"));
  const st=pacStats(p),pl=(n,s)=>n+" "+s+(n>1?"s":"");
  const ta=(k,l,rows,ph)=>'<div class="f"><label class="lbl" for="p-'+k+'">'+l+'</label><textarea id="p-'+k+'" data-pk="'+k+'" rows="'+(rows||2)+'"'+(ph?' placeholder="'+esc(ph)+'"':'')+'>'+esc(p[k])+'</textarea></div>';
  const inp=(k,l,ph)=>'<div class="f"><label class="lbl" for="p-'+k+'">'+l+'</label><input type="text" id="p-'+k+'" data-pk="'+k+'" value="'+esc(p[k])+'"'+(ph?' placeholder="'+esc(ph)+'"':'')+'></div>';
  const num=(k,l,step)=>'<div class="f"><label class="lbl" for="po-'+k+'">'+l+'</label><input type="number" min="0" step="'+(step||1)+'" class="num" id="po-'+k+'" data-po="'+k+'" value="'+esc(p.obj[k])+'"></div>';
  $("#drawer").innerHTML=
  '<div class="dh"><div class="grow"><span class="lbl">'+(pIsNew?"Nouvelle ligne du PAC":"Ligne du PAC")+'</span><h2 id="dTitle">'+esc(p.element||"Élément à renseigner")+'</h2></div><button class="btn ghost" type="button" data-act="close">Fermer</button></div>'+
  '<div class="db"><form id="pForm" onsubmit="return false">'+
   '<fieldset'+dis+'><legend>Plan d\'action</legend>'+inp("element",'Élément <span class="req">*</span>',"Développement des prescripteurs")+
    '<div class="f"><span class="lbl">Priorité</span><div class="seg" role="group" aria-label="Priorité">'+PPRIO.map(([k,l,t])=>'<button type="button" data-ppr="'+k+'" aria-pressed="'+(p.prio===k)+'"'+dis+'>'+l+' · '+t+'</button>').join("")+'</div></div>'+ta("objectif","Objectif",2,"Ce que l'on veut obtenir")+ta("descriptif","Descriptif de l'action",3)+'</fieldset>'+
   '<fieldset'+dis+' style="margin-top:18px"><legend>Actions</legend><div class="row">'+ta("t1","Trimestre 1",3)+ta("t2","Trimestre 2",3)+'</div><div class="row">'+ta("t3","Trimestre 3",3)+ta("t4","Trimestre 4",3)+'</div>'+
    ta("actions","Actions sans découpage par trimestre",2)+'</fieldset>'+
   '<fieldset'+dis+' style="margin-top:18px"><legend>Suivi du plan d\'action</legend><div class="row">'+inp("qui","Qui ? Agence ?","DCR + chefs d'agence")+inp("quand","Quand ?","T1 à T4, mensuel…")+'</div>'+ta("kpi","Indicateurs clés",2,"Nombre de RDV, CA signé…")+'</fieldset>'+
   '<fieldset'+dis+' style="margin-top:18px"><legend>Résultats</legend>'+ta("attendus","Résultats attendus",2)+
    '<div class="f"><span class="lbl">Campagnes reliées</span>'+(camps.length?'<div class="checks">'+camps.map(c=>'<label><input type="checkbox" data-pcamp value="'+esc(c)+'"'+(p.campagnes.includes(c)?' checked':'')+'>'+esc(c.replace(/^PAC IDF – /,""))+'</label>').join("")+'</div>':'<p class="hint">Aucune campagne pour l\'instant : elles viennent de vos cibles.</p>')+
    '<p class="hint">Les résultats obtenus se calculent à partir des cibles de ces campagnes'+(p.campagnes.length?' : '+pl(st.n,"cible")+', '+pl(st.visites,"visite")+' réalisée'+(st.visites>1?'s':'')+', '+pl(st.opps,"opportunité")+', '+st.devis+' devis, '+eur(st.ca)+' conclus':'')+'.</p></div>'+
    '<div class="f"><span class="lbl">Secteurs reliés</span><div class="checks">'+secteursAll().filter(s=>p.secteurs.includes(s)||S.comptes.some(k=>secteurOf(k)===s)).map(s=>'<label><input type="checkbox" data-psect value="'+esc(s)+'"'+(p.secteurs.includes(s)?' checked':'')+'>'+esc(s)+'</label>').join("")+'</div><p class="hint">Les cibles des comptes de ces secteurs (segment ou typologie) comptent aussi dans les résultats de la ligne.</p></div>'+
    (S.plans.length>1?'<div class="f"><label class="lbl" for="p-planId">Plan</label><select id="p-planId" data-pk="planId">'+S.plans.map(x=>'<option value="'+esc(x.id)+'"'+(x.id===p.planId?' selected':'')+'>'+esc(x.nom)+'</option>').join("")+'</select></div>':'')+
    '<div class="f"><span class="lbl">Objectifs chiffrés (facultatif)</span><div class="row">'+num("visites","Visites réalisées")+num("opps","Opportunités")+'</div><div class="row">'+num("devis","Devis")+num("ca","CA conclu (€)",500)+'</div></div>'+
    ta("obtenus","Résultats obtenus — commentaire",2)+'</fieldset>'+
   '<fieldset'+dis+' style="margin-top:18px"><legend>Plan d\'action correctif</legend><div class="seg" role="group" aria-label="Décision corrective">'+PDEC.map(([d])=>'<button type="button" data-pdec="'+esc(d)+'" aria-pressed="'+(p.decision===d)+'"'+dis+'>'+esc(d)+'</button>').join("")+'</div><p class="hint">Cliquez à nouveau sur la décision pour la retirer.</p></fieldset>'+
  '</form></div>'+
  '<div class="df">'+(ro?'<span class="sub grow">Lecture seule</span>':
   (pIsNew?'':'<button class="btn danger" type="button" data-act="pdel">Supprimer</button>'+(PUI.sort==="manuel"?'<button class="btn ghost" type="button" data-act="pup" title="Monter la ligne" aria-label="Monter la ligne">↑</button><button class="btn ghost" type="button" data-act="pdown" title="Descendre la ligne" aria-label="Descendre la ligne">↓</button>':''))+
   '<span class="grow"></span><button class="btn" type="button" data-act="close">Annuler</button><button class="btn primary" type="button" data-act="psave">Enregistrer</button>')+'</div>';
}
function pReadForm(){
  const p=P;document.querySelectorAll("#pForm [data-pk]").forEach(i=>{p[i.dataset.pk]=i.value.trim()});
  document.querySelectorAll("#pForm [data-po]").forEach(i=>{p.obj[i.dataset.po]=i.value===""?"":Math.max(0,Number(i.value)||0)});
  p.campagnes=[...document.querySelectorAll("#pForm input[data-pcamp]:checked")].map(i=>i.value);p.secteurs=[...document.querySelectorAll("#pForm input[data-psect]:checked")].map(i=>i.value);
}
async function pacMove(dir){
  pReadForm();const L=pacSorted(),i=L.findIndex(x=>x.id===P.id),j=i+dir;
  if(i<0||j<0||j>=L.length){toast(dir<0?"La ligne est déjà en tête":"La ligne est déjà la dernière");return}
  const arr=L.map(x=>x.id===P.id?P:x);[arr[i],arr[j]]=[arr[j],arr[i]];
  for(let k=0;k<arr.length;k++){const isMe=arr[k].id===P.id;if(arr[k].ordre!==k+1||isMe){const c=Object.assign(clone(arr[k]),{ordre:k+1});if(!(await savePac(c)))return;if(isMe)P.ordre=k+1}}
  toast(dir<0?"Ligne montée":"Ligne descendue");
}
async function pacFromCamps(){
  const linked=new Set(planLines(curPlan().id).flatMap(p=>p.campagnes));
  const free=[...new Set(S.cibles.map(c=>c.campagne).filter(Boolean))].filter(c=>!linked.has(c)).sort((a,b)=>a.localeCompare(b,"fr"));
  let o=pacNextOrdre()-1,n=0;
  for(const c of free){const p=Object.assign(pblank(),{id:uid(),creeLe:new Date().toISOString(),ordre:++o,element:c.replace(/^PAC IDF – /,""),campagnes:[c]});if(await savePac(p))n++;else break}
  if(n)toast(n+" ligne"+(n>1?"s":"")+" créée"+(n>1?"s":"")+" : complétez objectifs et actions");
}
/* Import d'un PAC Excel (formats « Vierge » et « Feuil1 » du PAC France) */
const PAC_COLS=[[/^priorite|^prio/,"prio"],[/^plan d action$/,"pa"],[/^elements?$/,"el"],[/^objectifs?$/,"objectif"],[/^descriptif/,"descriptif"],[/^actions?$/,"actions"],
  [/^(trimestre|t) ?1$/,"t1"],[/^(trimestre|t) ?2$/,"t2"],[/^(trimestre|t) ?3$/,"t3"],[/^(trimestre|t) ?4$/,"t4"],
  [/^qui/,"qui"],[/^quand/,"quand"],[/indicateur|kpi/,"kpi"],[/^resultats? attendus?/,"attendus"],[/^resultats?( obtenus?)?$/,"obtenus"],
  [/^continuer$/,"d:Continuer"],[/^modifier$/,"d:Modifier"],[/^reporter$/,"d:Reporter"],[/^arreter$/,"d:Arrêter"]];
const pacCol=n=>{const h=PAC_COLS.find(([re])=>re.test(n));return h?h[1]:null};
async function parsePacFile(file){
  await loadExcel();const wb=new ExcelJS.Workbook();await wb.xlsx.load(await file.arrayBuffer());
  const sheets=[];
  wb.worksheets.forEach(ws=>{if(ws.state==="hidden")return;
    const txt=(r,c)=>{const v=cellVal(ws.getRow(r).getCell(c).value);return v instanceof Date?fdate(toISO(v)):String(v==null?"":v).trim()};
    const maxC=Math.min(ws.columnCount||0,40),maxR=ws.rowCount||0;let hr=0;
    for(let r=1;r<=Math.min(maxR,15)&&!hr;r++)for(let c=1;c<=maxC;c++){if(/^objectifs?$/.test(nh(txt(r,c)))){hr=r;break}}
    if(!hr)return;
    const subRow=r=>{let k=0;for(let c=1;c<=maxC;c++){const f=pacCol(nh(txt(r,c)));if(f&&/^(t\d|qui|quand|kpi|d:|attendus)/.test(f))k++}return k>=2};
    const sub=hr<maxR&&subRow(hr+1)?hr+1:0;
    const map={};for(let c=1;c<=maxC;c++){const a=nh(txt(hr,c)),b=sub?nh(txt(sub,c)):"";const f=(b&&b!==a&&pacCol(b))||pacCol(a);if(f&&!Object.values(map).includes(f))map[c]=f}
    const recs=[];
    for(let r=(sub||hr)+1;r<=maxR;r++){const o={};let any=false;
      Object.entries(map).forEach(([c,f])=>{const v=txt(r,+c);if(!v)return;any=true;if(f.startsWith("d:"))o.decision=f.slice(2);else o[f]=v});
      if(!any)continue;
      const p=pblank();
      if(o.pa&&o.el){p.element=o.pa;p.objectif=o.el;p.descriptif=[o.objectif,o.descriptif].filter(Boolean).join("\n")}
      else{p.element=o.pa||o.el||"";p.objectif=o.objectif||"";p.descriptif=o.descriptif||""}
      ["actions","t1","t2","t3","t4","qui","quand","kpi","attendus","obtenus","decision"].forEach(k=>{if(o[k])p[k]=o[k]});if(o.prio)p.prio=toPrio(o.prio);
      if(!p.element&&!p.objectif)continue;if(!p.element){p.element=p.objectif;p.objectif=""}
      recs.push(p)}
    if(recs.length)sheets.push({name:ws.name,recs,filled:recs.reduce((s,p)=>s+["objectif","descriptif","actions","t1","t2","t3","t4","qui","quand","kpi","attendus"].filter(k=>p[k]).length,0)});
  });
  if(!sheets.length)throw new Error("none");
  sheets.sort((a,b)=>b.filled-a.filled);return {sheets,pick:0};
}
function pacImportMenu(){
  PIMP=null;const d=$("#drawer");
  d.innerHTML='<div class="dh"><div class="grow"><span class="lbl">PAC</span><h2 id="dTitle">Importer un PAC Excel</h2></div><button class="btn ghost" type="button" data-act="close">Fermer</button></div><div class="db">'+
  '<p class="hint">Format du PAC France : une ligne d\'en-tête « Élément · Objectif · Descriptif de l\'action · Actions (ou Trimestre 1 à 4) · Qui ? · Quand ? · Indicateurs clés · Résultats · Continuer / Modifier / Reporter / Arrêter ». Les lignes trouvées s\'ajoutent à la suite du plan affiché.</p>'+
  '<div class="f"><label class="lbl" for="pimpF">Fichier Excel</label><input type="file" id="pimpF" accept=".xlsx"></div><div id="pimpOut"></div></div>'+
  '<div class="df"><span class="grow"></span><button class="btn" type="button" data-act="close">Annuler</button><button class="btn primary" type="button" data-act="pimpgo" id="pimpGo" disabled>Importer</button></div>';
  $("#scrim").hidden=false;d.hidden=false;
  $("#pimpF").addEventListener("change",async e=>{const f=e.target.files[0];if(!f)return;$("#pimpOut").innerHTML='<p class="hint">Lecture du fichier…</p>';$("#pimpGo").disabled=true;
    try{PIMP=await parsePacFile(f);drawPacImport()}
    catch(err){PIMP=null;$("#pimpOut").innerHTML='<p class="hint">Aucun tableau de PAC reconnu dans ce fichier : il faut une ligne d\'en-tête contenant au moins « Objectif » (classeur .xlsx).</p>'}});
}
function drawPacImport(){
  const s=PIMP.sheets[PIMP.pick],n=s.recs.length;
  $("#pimpOut").innerHTML=(PIMP.sheets.length>1?'<div class="f"><label class="lbl" for="pimpS">Onglet à importer</label><select id="pimpS">'+PIMP.sheets.map((x,i)=>'<option value="'+i+'"'+(i===PIMP.pick?' selected':'')+'>'+esc(x.name)+' · '+x.recs.length+' ligne'+(x.recs.length>1?'s':'')+'</option>').join("")+'</select></div>':'')+
   '<div class="f"><span class="lbl">'+n+' ligne'+(n>1?'s':'')+' trouvée'+(n>1?'s':'')+' · onglet « '+esc(s.name)+' »</span><ol class="pimp">'+s.recs.map(p=>'<li><b>'+esc(p.element)+'</b>'+(p.objectif?' — '+esc(p.objectif):'')+'</li>').join("")+'</ol></div>';
  const g=$("#pimpGo");g.disabled=false;g.textContent="Ajouter "+n+" ligne"+(n>1?"s":"");
  const sel=$("#pimpS");if(sel)sel.addEventListener("change",()=>{PIMP.pick=+sel.value;drawPacImport()});
}
async function pacImportGo(){
  if(!PIMP)return;const s=PIMP.sheets[PIMP.pick];let o=pacNextOrdre()-1,n=0;
  for(const r of s.recs){const p=Object.assign(clone(r),{id:uid(),creeLe:new Date().toISOString(),ordre:++o});if(await savePac(p))n++;else break}
  PIMP=null;closeDrawer();if(n)toast(n+" ligne"+(n>1?"s":"")+" importée"+(n>1?"s":"")+" dans le PAC");
}
function pacPrint(){
  document.body.classList.add("print-pac");
  const off=()=>{document.body.classList.remove("print-pac");window.removeEventListener("afterprint",off)};
  window.addEventListener("afterprint",off);window.print();setTimeout(off,1500);
}

/* Lignes types du PAC IDF (axes de conquête) — reliées automatiquement aux campagnes dont le nom correspond */
const PAC_SEED="axes-idf-1";
const PAC_MODELES=[
 {element:"Industrie",re:/industri/,
  objectif:"Ouvrir des comptes industriels en gré à gré sur les diagnostics avant travaux et de maintenance",
  descriptif:"Cibler les sites industriels d'Île-de-France, en priorité les clients des autres BU (Équipements, Environnement), sur l'amiante avant travaux et arrêts techniques, le DTA, le plomb et le PEMD avant démolition.",
  t1:"Constituer la liste des sites industriels clients des autres BU, par département\nIdentifier les responsables travaux / maintenance / HSE",
  t2:"Visites ciblées avec les chefs d'agence et les apporteurs BU\nPrésenter l'offre avant travaux et arrêts techniques",
  t3:"Proposer un BPU ou un accord-cadre annuel aux sites visités\nAnticiper les arrêts techniques d'été",
  t4:"Bilan des comptes ouverts, relance des sites sans suite\nCiblage de l'année suivante",
  qui:"CSC + chefs d'agence + apporteurs BU Équipements / Environnement",quand:"T1 à T4, point mensuel",
  kpi:"Sites ciblés et visités, opportunités créées, devis émis, CA signé, taux de transformation",
  attendus:"Nouveaux comptes industriels récurrents, hausse du gré à gré"},
 {element:"Prescripteurs",re:/prescri|architect|maitr\w* d oeuvre|\bmoe\b|\bbet\b/,
  objectif:"Faire prescrire nos missions par les architectes, maîtres d'œuvre et BET",
  descriptif:"Faire intégrer le repérage amiante avant travaux, le plomb et le PEMD dans les DCE et les programmes de réhabilitation, pour être consultés en amont des projets.",
  t1:"Recenser les cabinets d'architectes, MOE, BET et économistes actifs en réhabilitation, par département",
  t2:"Rendez-vous de présentation\nRemettre une fiche « missions à intégrer à votre DCE »",
  t3:"Petit-déjeuner technique en agence (réglementation avant travaux, PEMD)\nSuivi des projets en cours",
  t4:"Bilan des projets prescrits, relance des cabinets actifs",
  qui:"CSC + chefs d'agence",quand:"T1 à T4, suivi mensuel",
  kpi:"Prescripteurs rencontrés, DCE intégrant nos missions, consultations reçues, devis issus de prescription, CA",
  attendus:"Consultation systématique sur les projets de réhabilitation des prescripteurs actifs"},
 {element:"Promoteurs",re:/promot/,
  objectif:"Devenir le diagnostiqueur de référence des promoteurs sur les opérations de démolition et de réhabilitation",
  descriptif:"Accompagner les promoteurs dès l'acquisition foncière : diagnostics avant acquisition, amiante avant démolition, plomb, PEMD. S'appuyer sur les clients promoteurs de la BU Construction.",
  t1:"Identifier les promoteurs actifs en IDF et leurs opérations en cours avec la BU Construction",
  t2:"Rendez-vous avec les directions techniques et de programmes\nProposer un BPU promoteur",
  t3:"Offre packagée « avant acquisition / avant démolition »\nRéponses aux consultations",
  t4:"Bilan des référencements obtenus, préparation des renouvellements",
  qui:"CSC + apporteurs BU Construction + chefs d'agence",quand:"T1 à T4",
  kpi:"Promoteurs rencontrés, référencements / BPU obtenus, opportunités, devis, CA",
  attendus:"Référencement chez plusieurs promoteurs, flux régulier d'opérations"},
 {element:"Foncières",re:/fonci|investiss|asset/,
  objectif:"Se référencer chez les foncières et gestionnaires d'actifs",
  descriptif:"Couvrir le patrimoine tertiaire, logistique et résidentiel des foncières : DTA et mises à jour, repérages avant travaux preneurs, DPE tertiaire, diagnostics avant cession d'actifs ou de portefeuilles. Modèle : contrat-cadre GECINA.",
  t1:"Cartographier les foncières, asset et property managers présents en IDF\nFinaliser le contrat-cadre GECINA",
  t2:"Rendez-vous directions techniques et property managers\nInscriptions sur les plateformes prestataires",
  t3:"Réponses aux consultations et BPU\nOffre data room pour les cessions de portefeuilles",
  t4:"Bilan des référencements, revue annuelle avec les comptes signés",
  qui:"CSC + chefs d'agence",quand:"T1 à T4, revue trimestrielle",
  kpi:"Foncières rencontrées, référencements et contrats-cadres signés, volume de commandes, CA",
  attendus:"Contrats-cadres récurrents sur les grands patrimoines tertiaires"},
 {element:"Voirie",re:/voirie|enrob|\bvrd\b|route|chauss/,
  objectif:"Développer le repérage amiante et HAP dans les enrobés auprès des gestionnaires de voirie",
  descriptif:"Proposer le repérage amiante et HAP des enrobés avant travaux de voirie (carottages, analyses) aux communes, départements, EPT et concessionnaires de réseaux, en synergie avec la BU Infrastructures.",
  t1:"Recenser les maîtres d'ouvrage voirie et leurs programmes de travaux\nVeille des appels d'offres",
  t2:"Présentations aux services voirie\nProposer des marchés à bons de commande",
  t3:"Réponses aux AO voirie\nCampagnes de carottage avant les chantiers d'été",
  t4:"Bilan des marchés, préparation des programmes de l'année suivante",
  qui:"CSC + BU Infrastructures + cellule AO + chefs d'agence",quand:"T1 à T4, pic au printemps",
  kpi:"Maîtres d'ouvrage rencontrés, AO voirie répondus / gagnés, carottages réalisés, CA",
  attendus:"Marchés à bons de commande voirie sur plusieurs départements"}];
const pacHasModele=m=>planLines(curPlan().id).some(p=>nh(p.element)===nh(m.element));
const pacModeleCamps=m=>[...new Set(S.cibles.map(c=>c.campagne).filter(Boolean))].filter(c=>m.re.test(nh(c)));
async function pacAddModeles(list){
  let o=pacNextOrdre()-1,n=0;
  for(const m of list){if(pacHasModele(m))continue;const {re,...f}=m;
    const p=Object.assign(pblank(),clone(f),{id:uid(),creeLe:new Date().toISOString(),ordre:++o,campagnes:pacModeleCamps(m)});
    if(await savePac(p))n++;else break}
  return n;
}
let seedState={pac:false,set:false,done:false};
async function maybePacSeed(){
  if(seedState.done||!S.writable)return;if(S.mode==="db"&&!(seedState.pac&&seedState.set))return;
  seedState.done=true;if(S.settings.pacSeed===PAC_SEED)return;
  const n=await pacAddModeles(PAC_MODELES);
  S.settings.pacSeed=PAC_SEED;await saveSettings();
  if(n)toast(n+" ligne"+(n>1?"s":"")+" ajoutée"+(n>1?"s":"")+" au PAC : "+PAC_MODELES.map(m=>m.element).join(", "));
}
function pacModelesMenu(){
  const d=$("#drawer");
  d.innerHTML='<div class="dh"><div class="grow"><span class="lbl">PAC</span><h2 id="dTitle">Lignes types</h2></div><button class="btn ghost" type="button" data-act="close">Fermer</button></div><div class="db">'+
  '<p class="hint">Axes de conquête pré-remplis : objectif, descriptif, actions T1 à T4, qui, quand, indicateurs. Chaque ligne est reliée aux campagnes dont le nom correspond. Vous complétez ensuite les objectifs chiffrés.</p>'+
  '<div class="cpl">'+PAC_MODELES.map((m,i)=>{const has=pacHasModele(m),cs=pacModeleCamps(m);
    return '<label'+(has?' class="dis"':'')+'><input type="checkbox" data-pm="'+i+'"'+(has?' disabled':' checked')+'><span class="grow"><b>'+esc(m.element)+'</b><span class="sub" style="display:block">'+esc(m.objectif)+'</span>'+(cs.length&&!has?'<span class="sub" style="display:block">Reliée à : '+esc(cs.map(c=>c.replace(/^PAC IDF – /,"")).join(", "))+'</span>':'')+'</span>'+(has?'<span class="sub">déjà dans le PAC</span>':'')+'</label>'}).join("")+'</div></div>'+
  '<div class="df"><span class="grow"></span><button class="btn" type="button" data-act="close">Annuler</button><button class="btn primary" type="button" data-act="pmgo">Ajouter</button></div>';
  $("#scrim").hidden=false;d.hidden=false;
}


/* ================= V3 · PAC : plusieurs plans (par secteur, par plan d'action) ================= */
const planLines=pid=>S.pac.filter(l=>l.planId===pid);
const pacSorted=()=>planLines(curPlan().id).sort((a,b)=>a.ordre-b.ordre||(a.creeLe||"").localeCompare(b.creeLe||""));
function pacView(){let L=PUI.sort==="prio"?planLines(curPlan().id).sort(byPrio):pacSorted();
  if(PUI.f==="0")L=L.filter(p=>!p.prio);else if(PUI.f)L=L.filter(p=>p.prio===PUI.f);return L}
const pacNextOrdre=()=>planLines(curPlan().id).reduce((m,p)=>Math.max(m,p.ordre),0)+1;
const pacTitre=()=>curPlan().titre||curPlan().nom||PAC_TITRE_DEF;
const pacPeriode=()=>curPlan().periode||String(new Date().getFullYear());
/* Cibles couvertes par une ligne : campagnes reliées et/ou secteurs reliés */
function pacCibles(p,cibles){const C=cibles||S.cibles,cp=p.campagnes||[],sc=p.secteurs||[];if(!cp.length&&!sc.length)return [];
  return C.filter(c=>{if(cp.includes(c.campagne))return true;if(!sc.length)return false;const k=kOf(c.compteId);return !!k&&(sc.includes(k.segment)||sc.includes(k.typologie))})}
function pacStats(p,cibles){const C=pacCibles(p,cibles);
  return {n:C.length,visites:C.reduce((s,c)=>s+visitsDone(c),0),opps:C.filter(c=>c.opp.creee).length,
    devis:C.filter(c=>String(c.opp.devis||"").trim()).length,ca:C.filter(c=>c.opp.creee&&c.opp.statut==="Conclue").reduce((s,c)=>s+(Number(c.opp.montant)||0),0)}}
function pacDupGroups(){const m={};planLines(curPlan().id).forEach(l=>{const k=nh(l.element);if(k)(m[k]=m[k]||[]).push(l)});return Object.values(m).filter(g=>g.length>1)}
function renderPac(){
  const el=$("#view-pac");if(!el)return;
  const plan=curPlan(),lines=pacSorted();
  const camps=[...new Set(S.cibles.map(c=>c.campagne).filter(Boolean))];
  const linked=new Set(lines.flatMap(p=>p.campagnes)),free=camps.filter(c=>!linked.has(c)).sort((a,b)=>a.localeCompare(b,"fr"));
  let h=pageH("Pilotage","Plan d'action commercial","Plusieurs plans possibles : un par secteur d'activité, un par plan d'action. Les résultats se calculent à partir des cibles reliées.",
    '<button class="btn" type="button" data-act="pmanage">Gérer les plans</button><button class="btn" type="button" data-act="pplannew">'+I_PLUS+'Nouveau plan</button>');
  h+='<div class="plans" role="tablist" aria-label="Plans">'+S.plans.slice().sort(plSort).filter(p=>!p.archive||p.id===plan.id).map(p=>'<button type="button" class="plan" data-plan="'+esc(p.id)+'" aria-pressed="'+(p.id===plan.id)+'">'+esc(p.nom)+'<span class="ax">'+esc((PAXES.find(x=>x[0]===p.axe)||PAXES[PAXES.length-1])[1])+'</span><span class="n">'+planLines(p.id).length+'</span></button>').join("")+(S.plans.some(p=>p.archive)?'<button type="button" class="more" data-act="pmanage">'+pl(S.plans.filter(p=>p.archive).length,"plan archivé","plans archivés")+'</button>':'')+'</div>'+
    (plan.archive?'<div class="notice warn" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span style="flex:1"><b>Plan archivé.</b> Il n\'apparaît plus dans la barre des plans.</span><button class="btn" type="button" data-plm="arch" data-id="'+esc(plan.id)+'">Réactiver</button></div>':'');
  const tools='<div class="bar pac-tools"><button class="btn ghost" type="button" data-act="phead">Paramètres du plan</button><button class="btn ghost" type="button" data-act="pmod">Lignes types</button><button class="btn ghost" type="button" data-act="psecteurs">Une ligne par secteur</button><button class="btn ghost" type="button" data-act="pimport">Importer un PAC Excel</button>'+
    (lines.length?(IN_FRAME?'<a class="btn ghost" href="'+pacPrintURL()+'" target="_blank" rel="noopener" title="S\'ouvre dans un onglet pour imprimer ou enregistrer en PDF">Imprimer</a>':'<button class="btn ghost" type="button" data-act="pprint">Imprimer</button>'):'')+
    '<button class="btn ghost" type="button" data-act="pexport">Exporter / Excel</button><button class="btn primary" type="button" data-act="pnew">'+I_PLUS+'Nouvelle ligne</button></div>';
  h+=pacHead(pacTitre(),pacPeriode(),lines,tools);
  if(plan.famille)h+=famPanel(plan.famille);
  if(!lines.length){
    h+='<div class="list-wrap"><div class="empty"><h3>Ce plan est vide</h3><p>Chaque ligne est un axe : objectif, actions par trimestre, qui, quand, indicateurs, résultats et décision corrective. Reliez une ligne à des campagnes ou à des secteurs : ses résultats se calculent à partir de vos cibles.</p>'+
     '<div class="bar" style="justify-content:center">'+(camps.length?'<button class="btn" type="button" data-act="pfromcamps">Une ligne par campagne ('+camps.length+')</button>':'')+'<button class="btn" type="button" data-act="psecteurs">Une ligne par secteur</button><button class="btn" type="button" data-act="pmod">Lignes types</button><button class="btn" type="button" data-act="pimport">Importer un PAC Excel</button><button class="btn primary" type="button" data-act="pnew">Nouvelle ligne</button></div></div></div>';
  }else{
    const dg=pacDupGroups();
    if(dg.length)h+='<div class="notice warn" style="display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center"><span style="flex:1;min-width:260px"><b>'+pl(dg.reduce((s,g)=>s+g.length-1,0),"ligne")+' en double</b> dans ce plan : '+esc(dg.map(g=>g[0].element+" ×"+g.length).join(", "))+'. La fusion garde une ligne par élément, complétée avec les décisions, priorités et résultats des autres.</span><button class="btn" type="button" data-act="pdedup" id="pDedup">Fusionner les doublons</button></div>';
    if(free.length&&plan.axe!=="secteur"&&plan.axe!=="famille")h+='<div class="notice">'+free.length+' campagne'+(free.length>1?'s':'')+' sans ligne dans ce plan : '+esc(free.map(x=>x.replace(/^PAC IDF – /,"")).join(", "))+'. <button class="btn ghost" type="button" data-act="pfromcamps">Créer '+(free.length>1?'les lignes':'la ligne')+'</button></div>';
    const V=pacView(),nP=k=>k==="0"?lines.filter(p=>!p.prio).length:k?lines.filter(p=>p.prio===k).length:lines.length;
    h+='<div class="pac-filt"><div class="chips grow" aria-label="Filtrer par priorité">'+[["","Toutes"],["1","P1 · haute"],["2","P2 · moyenne"],["3","P3 · basse"],["0","Sans priorité"]].filter(([k])=>!k||nP(k)||PUI.f===k).map(([k,l])=>'<button type="button" class="chip" data-pf="'+k+'" aria-pressed="'+(PUI.f===k)+'">'+l+'<span class="n num">'+nP(k)+'</span></button>').join("")+'</div>'+
      '<div class="ps"><label for="pSort">Trier</label><select id="pSort"><option value="prio"'+(PUI.sort==="prio"?' selected':'')+'>Par priorité</option><option value="manuel"'+(PUI.sort==="manuel"?' selected':'')+'>Ordre manuel</option></select></div></div>';
    h+=V.length?'<div class="pac-wrap">'+pacTable(V,p=>pacStats(p),false)+'</div>':'<div class="list-wrap"><div class="empty"><h3>Aucune ligne pour ce filtre</h3><p>Choisissez « Toutes » pour revoir l\'ensemble du plan.</p></div></div>';
    h+='<p class="hint pac-note">Cliquez sur une ligne pour la modifier ; la priorité (pastille) et la décision corrective se changent directement dans le tableau. Résultats calculés à partir des cibles des campagnes et des secteurs reliés. Trimestre en cours surligné.</p>';
  }
  el.innerHTML=h;
  const so=$("#pSort");if(so)so.addEventListener("change",()=>{PUI.sort=so.value;puiSave();renderPac()});
}
/* Paramètres d'un plan, nouveau plan */
function planMenu(isNewPlan){const p=isNewPlan?{nom:"",axe:"secteur",titre:"",periode:String(new Date().getFullYear())}:curPlan();
  const secs=secteursAll().filter(s=>S.comptes.some(k=>secteurOf(k)===s)||SEGMENTS.includes(s));
  const d=$("#drawer");
  d.innerHTML='<div class="dh"><div class="grow"><span class="lbl">PAC</span><h2 id="dTitle">'+(isNewPlan?'Nouveau plan':'Paramètres du plan')+'</h2></div><button class="btn ghost" type="button" data-act="close">Fermer</button></div><div class="db">'+
  '<div class="f"><label class="lbl" for="pl-nom">Nom du plan <span class="req">*</span></label><input type="text" id="pl-nom" value="'+esc(p.nom)+'" placeholder="PAC Industrie 2027, PAC Prescripteurs…"></div>'+
  '<div class="f"><span class="lbl">Organisation</span><div class="radio">'+PAXES.map(([k,l])=>'<label><input type="radio" name="plAxe" value="'+k+'"'+(p.axe===k?' checked':'')+'> '+esc(l)+(k==="secteur"?' <span class="sub">— une ligne par secteur, résultats calculés sur les comptes du secteur</span>':k==="theme"?' <span class="sub">— une ligne par axe ou par campagne</span>':'')+'</label>').join("")+'</div></div>'+
  '<div class="f" id="plFamW"'+(p.axe==="famille"?'':' hidden')+'><label class="lbl" for="pl-fam">Famille de clients</label><select id="pl-fam">'+FAMILLES.map(([c,n])=>'<option value="'+c+'"'+(p.famille===c?' selected':'')+'>'+esc(n)+'</option>').join("")+'</select><p class="hint">Le plan affiche les chiffres de la famille : comptes, CA, clients perdus, devis en attente, actions.</p></div>'+
  '<div class="f"><label class="lbl" for="pl-t">Titre imprimé</label><input type="text" id="pl-t" value="'+esc(p.titre)+'" placeholder="'+esc(PAC_TITRE_DEF)+'"></div>'+
  '<div class="f"><label class="lbl" for="pl-p">Période</label><input type="text" id="pl-p" value="'+esc(p.periode)+'" placeholder="2027, T4 2026…"></div>'+
  (isNewPlan?'<div class="f"><span class="lbl">Contenu de départ</span><div class="radio">'+
    '<label><input type="radio" name="plStart" value="vide" checked> Plan vide</label>'+
    '<label><input type="radio" name="plStart" value="secteurs"> Une ligne par secteur coché ci-dessous</label>'+
    '<label><input type="radio" name="plStart" value="famille"> Les lignes types de la famille choisie (reconquête, fidélisation et deux axes propres à la famille)</label>'+
    '<label><input type="radio" name="plStart" value="modeles"> Les lignes types (Industrie, Prescripteurs, Promoteurs, Foncières, Voirie)</label>'+
    '<label><input type="radio" name="plStart" value="copie"> Une copie du plan « '+esc(curPlan().nom)+' »</label></div></div>'+
    '<div class="f"><span class="lbl">Secteurs</span><div class="checks" id="plSecs">'+secs.map(s=>'<label><input type="checkbox" data-plsec value="'+esc(s)+'">'+esc(s)+'</label>').join("")+'</div></div>'
   :'<p class="hint">Le titre et la période sont repris à l\'impression et dans l\'export Excel.</p>')+
  '</div><div class="df">'+(isNewPlan?'':'<button class="btn danger" type="button" data-act="pplandel">Supprimer ce plan</button><button class="btn ghost" type="button" data-plm="arch" data-id="'+esc(p.id)+'">'+(p.archive?'Réactiver':'Archiver')+'</button><button class="btn ghost" type="button" data-act="pplandup">Dupliquer</button>')+'<span class="grow"></span><button class="btn" type="button" data-act="close">Annuler</button><button class="btn primary" type="button" data-act="'+(isNewPlan?'pplancreate':'pplansave')+'">'+(isNewPlan?'Créer le plan':'Enregistrer')+'</button></div>';
  $("#scrim").hidden=false;d.hidden=false;setTimeout(()=>$("#pl-nom").focus({preventScroll:true}),30)}
function planRead(){const axe=(document.querySelector('input[name="plAxe"]:checked')||{}).value||"theme";return {nom:vOf("pl-nom"),axe,famille:axe==="famille"?$("#pl-fam").value:"",titre:vOf("pl-t"),periode:vOf("pl-p")}}
function lineForSecteur(s,pid,o){return Object.assign(pblank(),{id:uid(),creeLe:now(),planId:pid,ordre:o,element:s,secteurs:[s],objectif:"",qui:"CSC + chefs d'agence"})}
async function planCreate(){const v=planRead();if(!v.nom){toast("Donnez un nom au plan.");$("#pl-nom").focus({preventScroll:true});return}
  const start=(document.querySelector('input[name="plStart"]:checked')||{}).value||"vide",src=curPlan();
  const p=Object.assign({id:uid(),creeLe:now(),ordre:S.plans.length+1},v);S.plans.push(p);
  let o=0;
  if(start==="secteurs"){[...document.querySelectorAll("#plSecs input:checked")].forEach(i=>{S.pac.push(lineForSecteur(i.value,p.id,++o))})}
  else if(start==="famille"){const fc=v.famille||$("#pl-fam").value;famLines(fc).forEach(l=>S.pac.push(Object.assign(pblank(),l,{id:uid(),planId:p.id,ordre:++o,creeLe:now(),majLe:now()})))}
  else if(start==="copie"){planLines(src.id).forEach(l=>{S.pac.push(Object.assign(clone(l),{id:uid(),planId:p.id,creeLe:now(),obtenus:"",decision:""}));o++})}
  S.settings.planCourant=p.id;bump();
  if(start==="modeles"){await pacAddModeles(PAC_MODELES)}
  closeDrawer();commit();toast("Plan « "+p.nom+" » créé"+(o?" · "+pl(o,"ligne"):""))}
function planSave(){const v=planRead();if(!v.nom){toast("Donnez un nom au plan.");return}Object.assign(curPlan(),v,{majLe:now()});closeDrawer();commit();toast("Plan enregistré")}
let plDelArmed=false;
function planDelete(btn){const p=curPlan(),n=planLines(p.id).length;
  if(!plDelArmed){plDelArmed=true;btn.classList.add("armed");btn.textContent=n?"Supprimer le plan et ses "+pl(n,"ligne"):"Confirmer la suppression";return}
  plDelArmed=false;S.pac=S.pac.filter(l=>l.planId!==p.id);S.plans=S.plans.filter(x=>x.id!==p.id);const nx=S.plans.slice().sort(plSort).find(x=>!x.archive)||S.plans[0];S.settings.planCourant=nx?nx.id:"";ensurePlans();bump();closeDrawer();commit();toast("Plan supprimé")}
function planDup(){const src=curPlan(),p=Object.assign(clone(src),{id:uid(),nom:src.nom+" (copie)",creeLe:now(),ordre:S.plans.length+1});S.plans.push(p);
  planLines(src.id).forEach(l=>S.pac.push(Object.assign(clone(l),{id:uid(),planId:p.id,creeLe:now()})));S.settings.planCourant=p.id;bump();closeDrawer();commit();toast("Plan dupliqué")}
function pacSecteursMenu(){const have=new Set(planLines(curPlan().id).flatMap(l=>l.secteurs||[]));
  const secs=secteursAll().map(s=>({s,n:S.comptes.filter(k=>secteurOf(k)===s).length})).filter(x=>x.n||SEGMENTS.includes(x.s));
  const d=$("#drawer");
  d.innerHTML='<div class="dh"><div class="grow"><span class="lbl">PAC · '+esc(curPlan().nom)+'</span><h2 id="dTitle">Une ligne par secteur</h2></div><button class="btn ghost" type="button" data-act="close">Fermer</button></div><div class="db">'+
   '<p class="hint">Chaque secteur coché devient une ligne du plan, reliée au secteur : ses résultats se calculent sur toutes les cibles des comptes de ce secteur (segment ou typologie du compte).</p>'+
   '<div class="cpl">'+secs.map(x=>'<label'+(have.has(x.s)?' class="dis"':'')+'><input type="checkbox" data-psec value="'+esc(x.s)+'"'+(have.has(x.s)?' disabled':'')+'><span class="grow">'+esc(x.s)+'</span><span class="sub">'+(have.has(x.s)?'déjà dans le plan':pl(x.n,"compte"))+'</span></label>').join("")+'</div></div>'+
   '<div class="df"><span class="grow"></span><button class="btn" type="button" data-act="close">Annuler</button><button class="btn primary" type="button" data-act="psecgo">Ajouter</button></div>';
  $("#scrim").hidden=false;d.hidden=false}
function pacSecteursGo(){const sel=[...document.querySelectorAll("#drawer input[data-psec]:checked")].map(i=>i.value);if(!sel.length){toast("Cochez au moins un secteur.");return}
  let o=pacNextOrdre()-1;sel.forEach(s=>S.pac.push(lineForSecteur(s,curPlan().id,++o)));bump();closeDrawer();commit();toast(pl(sel.length,"ligne")+" ajoutée"+(sel.length>1?"s":"")+" : complétez objectifs et actions")}
let pDedupArmed=false;
function pacDedup(btn){const G=pacDupGroups();if(!G.length)return;
  if(!pDedupArmed){pDedupArmed=true;btn.classList.add("armed");btn.textContent="Confirmer : garder "+pl(G.length,"ligne")+" sur "+G.reduce((s,g)=>s+g.length,0);return}
  pDedupArmed=false;const F=["prio","objectif","descriptif","actions","t1","t2","t3","t4","qui","quand","kpi","attendus","obtenus","decision"];
  G.forEach(g=>{const s=g.slice().sort((a,b)=>String(b.majLe||"").localeCompare(String(a.majLe||""))),keep=s[0];
    s.slice(1).forEach(x=>{F.forEach(f=>{if(!keep[f]&&x[f])keep[f]=x[f]});keep.campagnes=[...new Set([...keep.campagnes,...x.campagnes])];keep.secteurs=[...new Set([...(keep.secteurs||[]),...(x.secteurs||[])])];
      Object.keys(keep.obj).forEach(o=>{if(!keep.obj[o]&&x.obj[o])keep.obj[o]=x.obj[o]})});
    keep.ordre=Math.min(...g.map(x=>x.ordre));keep.majLe=now();const ids=new Set(s.slice(1).map(x=>x.id));S.pac=S.pac.filter(l=>!ids.has(l.id))});
  bump();commit();toast("Doublons fusionnés : "+pl(G.length,"ligne")+" conservée"+(G.length>1?"s":""))}
