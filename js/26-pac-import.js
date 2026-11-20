/* Registre · CSC — Import d'un PAC Excel : formats « Vierge » et « Feuil1 » du PAC France, et export Excel de Registre retouché dans Excel
   (priorité « P1 · » devant l'élément, colonnes Attendus / Obtenus sous « Résultats », cellules fusionnées, chiffres calculés de la colonne Obtenus).
   Le tableau s'arrête à la première ligne vide : ce qui suit (budget, arbitrages…) devient les compléments du plan, affichés sous le tableau,
   imprimés et exportés avec lui. Trois destinations : mettre à jour un plan (lignes reconnues par leur élément, liens aux campagnes et
   secteurs et objectifs chiffrés conservés), ajouter les lignes à la suite du plan affiché, ou créer un nouveau plan.
   Annulation tant que le panneau reste ouvert. Chargé juste avant 18-demarrage.js. */
"use strict";

const PAC_COLS=[[/^priorite|^prio/,"prio"],[/^plan d action$/,"pa"],[/^elements?$/,"el"],[/^objectifs?$/,"objectif"],[/^descriptif/,"descriptif"],[/^actions?$/,"actions"],
  [/^(trimestre|t) ?1$/,"t1"],[/^(trimestre|t) ?2$/,"t2"],[/^(trimestre|t) ?3$/,"t3"],[/^(trimestre|t) ?4$/,"t4"],
  [/^qui/,"qui"],[/^quand/,"quand"],[/indicateur|kpi/,"kpi"],[/^(resultats? )?attendus?( |$)/,"attendus"],[/^(resultats? )?obtenus?( |$)|^resultats?$/,"obtenus"],
  [/^continuer$/,"d:Continuer"],[/^modifier$/,"d:Modifier"],[/^reporter$/,"d:Reporter"],[/^arreter$/,"d:Arrêter"]];
const pacCol=n=>{const h=PAC_COLS.find(([re])=>re.test(n));return h?h[1]:null};
/* Colonnes propres à un tableau de PAC : une ligne qui en remplit au moins deux, après une ligne vide, fait encore partie du tableau */
const PX_SPEC=new Set(["actions","t1","t2","t3","t4","qui","quand","kpi","attendus","obtenus","d:Continuer","d:Modifier","d:Reporter","d:Arrêter"]);
const PX_OBJ={"Visites réalisées":"visites","Opportunités":"opps","Devis":"devis","CA conclu":"ca"};

/* Texte affiché d'une cellule : pourcentages et nombres au format français, dates, résultat des formules
   (ExcelJS perd le résultat 0 d'une formule : une formule sans résultat dans une cellule au format numérique vaut 0) */
function pxCellTxt(cell){const raw=cell.value,f0=raw&&typeof raw==="object"&&raw.formula!=null&&raw.result==null&&/[0#]/.test(String(cell.numFmt||""));
  const v=f0?0:cellVal(raw);
  if(v instanceof Date)return fdate(toISO(v));
  if(typeof v==="number"){if(/%/.test(String(cell.numFmt||"")))return (Math.round(v*1000)/10).toLocaleString("fr-FR")+" %";return v.toLocaleString("fr-FR",{maximumFractionDigits:2})}
  if(typeof v==="boolean")return v?"Oui":"Non";
  if(v&&typeof v==="object")return "";
  return String(v==null?"":v).trim()}

/* Ligne lue dans le fichier → ligne du PAC */
function pxRec(o){const p=pblank();
  if(o.pa&&o.el){p.element=o.pa;p.objectif=o.el;p.descriptif=[o.objectif,o.descriptif].filter(Boolean).join("\n")}
  else{p.element=o.pa||o.el||"";p.objectif=o.objectif||"";p.descriptif=o.descriptif||""}
  ["actions","t1","t2","t3","t4","qui","quand","kpi","attendus","obtenus","decision"].forEach(k=>{if(o[k])p[k]=o[k]});
  if(o.prio)p.prio=toPrio(o.prio);
  /* « P1 · Prescripteurs » (export Registre) : la priorité sort de l'élément ; un élément sur plusieurs lignes tient sur une seule */
  const m=p.element.match(/^\s*P ?([123])\s*(?:[·•:–—\-.)]\s*|\s+)([\s\S]+)$/i);
  if(m&&m[2].trim()){if(!p.prio)p.prio=m[1];p.element=m[2]}
  p.element=p.element.split("\n").map(s=>s.trim()).filter(Boolean).join(" · ");
  /* « Actions : … » ajouté sous le descriptif par l'export quand la ligne a aussi des trimestres */
  if([p.t1,p.t2,p.t3,p.t4].some(Boolean)&&!p.actions){const i=p.descriptif.search(/(^|\n)Actions : /);
    if(i>=0){p.actions=p.descriptif.slice(i).replace(/^\n?Actions : /,"").trim();p.descriptif=p.descriptif.slice(0,i).trim()}}
  /* Colonne Obtenus de l'export : chiffres calculés (recalculés par Registre), objectifs chiffrés, campagnes et secteurs reliés, puis le commentaire */
  const L=p.obtenus.split("\n").map(s=>s.trim());
  if(/^Cibles : \d+$/.test(L[0]||"")){let i=1;
    for(;i<L.length;i++){const k=L[i].match(/^(Visites réalisées|Opportunités|Devis|CA conclu) : [^/]*?(?:\/ ([^(]+?))?(?: \(\d+ %\))?$/);if(!k)break;
      if(k[2]){const n=Number(k[2].replace(/[^\d,]/g,"").replace(",","."));if(n)p.obj[PX_OBJ[k[1]]]=n}}
    for(;i<L.length;i++){let k=L[i].match(/^Campagnes : (.+)$/);if(k){const cl=campList();p.campagnes=k[1].split(", ").map(campCanon).filter(c=>cl.includes(c));continue}
      k=L[i].match(/^Secteurs : (.+)$/);if(k){p.secteurs=k[1].split(", ").map(s=>s.trim()).filter(Boolean);continue}break}
    p.obtenus=L.slice(i).join("\n").trim()}
  if(!p.element&&!p.objectif)return null;if(!p.element){p.element=p.objectif;p.objectif=""}
  if(/^elements?$/.test(nh(p.element)))return null;
  return p}

async function parsePacFile(file){
  await loadExcel();const wb=new ExcelJS.Workbook();await wb.xlsx.load(await file.arrayBuffer());
  const sheets=[];
  wb.worksheets.forEach(ws=>{if(ws.state==="hidden")return;
    const maxC=Math.min(ws.columnCount||0,40),maxR=ws.rowCount||0,at=(r,c)=>ws.getRow(r).getCell(c);
    /* Cellule fusionnée : vide quand la fusion vient de la même ligne (texte sur plusieurs colonnes), valeur reprise quand elle descend de la ligne du dessus */
    const slave=cell=>cell.isMerged&&cell.master&&cell.master.address!==cell.address;
    const txt=(r,c)=>{const cell=at(r,c);if(slave(cell))return cell.master.row===r?"":pxCellTxt(cell.master);return pxCellTxt(cell)};
    const span=(r,c)=>{const cell=at(r,c);if(!cell.isMerged)return [c];const a=cell.master.address,L=[];for(let k=1;k<=maxC;k++){const x=at(r,k);if(x.isMerged&&x.master.address===a)L.push(k)}return L};
    let hr=0;
    for(let r=1;r<=Math.min(maxR,15)&&!hr;r++)for(let c=1;c<=maxC;c++){if(/^objectifs?$/.test(nh(txt(r,c)))){hr=r;break}}
    if(!hr)return;
    const subRow=r=>{let k=0;for(let c=1;c<=maxC;c++){const f=pacCol(nh(txt(r,c)));if(f&&/^(t\d|qui|quand|kpi|d:|attendus|obtenus)/.test(f))k++}return k>=2};
    const sub=hr<maxR&&subRow(hr+1)?hr+1:0;
    const map={};for(let c=1;c<=maxC;c++){const a=nh(txt(hr,c)),b=sub?nh(txt(sub,c)):"";const f=(b&&b!==a&&pacCol(b))||pacCol(a);if(f&&!Object.values(map).includes(f))map[c]=f}
    const colOf=f=>{const e=Object.entries(map).find(x=>x[1]===f);return e?+e[0]:0};
    const tq=["t2","t3","t4"].map(colOf);
    /* Au-dessus du tableau : titre (ligne 1) et « nom du plan · période · édité le … » (ligne 2 de l'export Registre) */
    const pre=[];for(let r=1;r<hr;r++){for(let c=1;c<=maxC;c++){const v=txt(r,c);if(v){pre.push(v);break}}}
    const seg=String(pre[1]||"").split(" · ").map(s=>s.trim()),edit=/^edite le/.test(nh(seg[seg.length-1]||""));
    let nom=String(ws.name||"").replace(/^PAC\s*[–-]\s*/i,"").trim();if(!nom||/^(pac|vierge|(feuil(le)?|sheet) ?\d*)$/i.test(nom))nom=edit?seg[0]:"";
    const meta={titre:pre[0]||"",nom:nom,periode:edit&&seg.length>=3?seg[seg.length-2]:""};
    const recs=[],notes=[];let inTab=true,gap=false;
    for(let r=(sub||hr)+1;r<=maxR;r++){
      const vals={};let any=false;for(let c=1;c<=maxC;c++){const v=txt(r,c);if(v){vals[c]=v;any=true}}
      if(!any){if(recs.length)gap=true;if(notes.length&&notes[notes.length-1].length)notes.push([]);continue}
      if(inTab&&gap){const k=Object.keys(vals).filter(c=>PX_SPEC.has(map[c])).length;if(k<2)inTab=false;gap=false}
      if(!inTab){/* Compléments : une rangée de cellules (les cellules fusionnées sur la ligne ne comptent qu'une fois) */
        const row=[];for(let c=1;c<=maxC;c++){const cell=at(r,c);if(slave(cell)&&cell.master.row===r)continue;row.push(String(txt(r,c)).replace(/\s*\n\s*/g," "))}
        while(row.length&&!row[row.length-1])row.pop();const ne=row.filter(Boolean);notes.push(ne.length===1?ne:row);continue}
      const o={};
      Object.entries(map).forEach(([c,f])=>{const v=vals[c];if(!v)return;
        if(f==="t1"&&tq.every(Boolean)){const sc=span(r,+c);if(tq.every(k=>sc.includes(k)))f="actions"}
        if(f.startsWith("d:"))o.decision=f.slice(2);else if(!o[f])o[f]=v});
      const p=pxRec(o);if(p)recs.push(p)}
    while(notes.length&&!notes[notes.length-1].length)notes.pop();
    if(recs.length)sheets.push(Object.assign({name:ws.name,recs,notes,filled:recs.reduce((s,p)=>s+["objectif","descriptif","actions","t1","t2","t3","t4","qui","quand","kpi","attendus"].filter(k=>p[k]).length,0)},meta));
  });
  if(!sheets.length)throw new Error("none");
  sheets.sort((a,b)=>b.filled-a.filled);return {sheets,pick:0};
}

/* ---------- Mise à jour d'un plan : chaque ligne du fichier retrouve sa ligne du plan par son élément ---------- */
const pxHead=e=>nh(String(e||"").split(" · ")[0]);
function pxMatch(recs,old){const used=new Set(),res=recs.map(()=>null);
  const pass=test=>recs.forEach((r,i)=>{if(res[i])return;const m=old.find(o=>!used.has(o.id)&&test(r,o));if(m){used.add(m.id);res[i]=m}});
  pass((r,o)=>nh(r.element)===nh(o.element));
  pass((r,o)=>pxHead(r.element)===pxHead(o.element));
  pass((r,o)=>{const a=pxHead(r.element),b=pxHead(o.element);return a.length>=4&&b.length>=4&&(a.startsWith(b+" ")||b.startsWith(a+" "))});
  return {pairs:recs.map((r,i)=>[r,res[i]]),gone:old.filter(o=>!used.has(o.id))}}
const pxSheet=()=>PIMP.sheets[PIMP.pick];
const pxNamed=()=>{const k=nh(pxSheet().nom);return k?S.plans.find(p=>nh(p.nom)===k)||null:null};
function pxReset(){const named=pxNamed();PIMP.mode=named?"maj":planLines(curPlan().id).length?"new":"add";PIMP.majId=(named||curPlan()).id;PIMP.keep=false;PIMP.head=true;PIMP.notes=true}
const pxPlan=()=>PIMP.mode==="maj"?S.plans.find(p=>p.id===PIMP.majId)||curPlan():curPlan();

function pacImportMenu(){
  if(!S.writable){toast("Modification impossible ici : ouvrez Registre en pleine page.");return}
  PIMP=null;const d=$("#drawer");
  d.innerHTML='<div class="dh"><div class="grow"><span class="lbl">PAC</span><h2 id="dTitle">Importer un PAC Excel</h2></div><button class="btn ghost" type="button" data-act="close">Fermer</button></div><div class="db">'+
  '<p class="hint">Un PAC au format du PAC France (en-têtes « Élément · Objectif · Descriptif de l\'action · Trimestre 1 à 4 · Qui ? · Quand ? · Indicateurs clés · Résultats · Continuer / Modifier / Reporter / Arrêter ») ou un export Excel de Registre retouché dans Excel. Vous choisissez ensuite de mettre à jour un plan, d\'ajouter les lignes ou de créer un nouveau plan.</p>'+
  '<div class="f"><label class="lbl" for="pimpF">Fichier Excel</label><input type="file" id="pimpF" accept=".xlsx"></div><div id="pimpOut"></div></div>'+
  '<div class="df" id="pimpDf"><span class="grow"></span><button class="btn" type="button" data-act="close">Annuler</button><button class="btn primary" type="button" data-act="pimpgo" id="pimpGo" disabled>Importer</button></div>';
  $("#scrim").hidden=false;d.hidden=false;
  $("#pimpF").addEventListener("change",async e=>{const f=e.target.files[0];if(!f)return;$("#pimpOut").innerHTML='<p class="hint">Lecture du fichier…</p>';$("#pimpGo").disabled=true;
    try{PIMP=await parsePacFile(f);pxReset();drawPacImport()}
    catch(err){PIMP=null;$("#pimpOut").innerHTML='<p class="hint">Aucun tableau de PAC reconnu dans ce fichier : il faut une ligne d\'en-tête contenant au moins « Objectif » (classeur .xlsx). Si le fichier est bien un .xlsx, vérifiez la connexion internet.</p>'}});
}
function drawPacImport(){
  const s=pxSheet(),n=s.recs.length,cur=curPlan(),plan=pxPlan(),old=planLines(plan.id),M=PIMP.mode==="maj"?pxMatch(s.recs,old):null;
  const nNew=M?M.pairs.filter(x=>!x[1]).length:n,nUpd=M?n-nNew:0,gone=M?M.gone:[];
  const B=pxBlocks(s.notes),bTitle=b=>b[0].length===1?b[0][0]:b[0].filter(Boolean).join(" · ");
  const prio=p=>p.prio?'<span class="prio prio-'+PCLS[p.prio]+'">P'+p.prio+'</span> ':'';
  const opt=(v,l,sub)=>'<label><input type="radio" name="pimpM" value="'+v+'"'+(PIMP.mode===v?' checked':'')+'> <span>'+l+(sub?' <span class="sub">— '+sub+'</span>':'')+'</span></label>';
  const others=S.plans.filter(p=>!p.archive||p.id===PIMP.majId).sort(plSort);
  const newName=s.nom||"PAC importé";
  const titreDiff=(s.titre&&s.titre!==(plan.titre||""))||(s.periode&&s.periode!==(plan.periode||""));
  $("#pimpOut").innerHTML=(PIMP.sheets.length>1?'<div class="f"><label class="lbl" for="pimpS">Onglet à importer</label><select id="pimpS">'+PIMP.sheets.map((x,i)=>'<option value="'+i+'"'+(i===PIMP.pick?' selected':'')+'>'+esc(x.name)+' · '+pl(x.recs.length,"ligne")+'</option>').join("")+'</select></div>':'')+
   '<div class="f"><span class="lbl">'+pl(n,"ligne")+' trouvée'+(n>1?'s':'')+' · onglet « '+esc(s.name)+' »</span><ol class="pimp">'+s.recs.map((p,i)=>{const m=M&&M.pairs[i][1];
     return '<li>'+prio(p)+'<b>'+esc(p.element)+'</b>'+(p.objectif?' — '+esc(p.objectif.length>110?p.objectif.slice(0,108)+"…":p.objectif):'')+(M?'<span class="pimp-st '+(m?'up':'add')+'">'+(m?(nh(m.element)===nh(p.element)?'mise à jour':'met à jour « '+esc(m.element)+' »'):'nouvelle ligne')+'</span>':'')+'</li>'}).join("")+'</ol></div>'+
   (B.length?'<div class="f"><span class="lbl">Sous le tableau</span><p class="hint" style="margin:0 0 6px">'+pl(B.length,"bloc")+' hors du tableau du PAC : '+B.map(b=>'« '+esc(bTitle(b))+' »').join(", ")+'.</p>'+
     '<label class="chk"><input type="checkbox" id="pimpN"'+(PIMP.notes?' checked':'')+'> Les reprendre en compléments sous le tableau du plan (affichés, imprimés et exportés avec lui, modifiables dans « Paramètres du plan »)</label></div>':'')+
   '<div class="f"><span class="lbl">Destination</span><div class="radio">'+
     opt("maj",'Mettre à jour le plan <select id="pimpP" class="pimp-sel">'+others.map(p=>'<option value="'+esc(p.id)+'"'+(p.id===PIMP.majId?' selected':'')+'>'+esc(p.nom)+'</option>').join("")+'</select>',"les lignes reconnues par leur élément sont remplacées par celles du fichier, en gardant leurs campagnes, secteurs, objectifs chiffrés et, si le fichier n\'en a pas, leur décision et leur commentaire de suivi")+
     opt("add","Ajouter les lignes à la suite du plan « "+esc(cur.nom)+" »",pl(planLines(cur.id).length,"ligne")+" aujourd'hui")+
     opt("new","Créer un nouveau plan « "+esc(newName)+" »","")+'</div></div>'+
   (M?'<div class="notice'+(gone.length?' warn':'')+'"><b>Plan « '+esc(plan.nom)+' » :</b> '+[pl(nUpd,"ligne")+' mise'+(nUpd>1?'s':'')+' à jour',pl(nNew,"ligne")+' ajoutée'+(nNew>1?'s':'')].join(", ")+
      (gone.length?', '+pl(gone.length,"ligne")+' absente'+(gone.length>1?'s':'')+' du fichier : '+gone.map(g=>'« '+esc(g.element)+' »'+(g.campagnes.length||(g.secteurs||[]).length?' (reliée à '+esc(g.campagnes.map(campLbl).concat(g.secteurs||[]).join(", "))+')':'')).join(", ")+'.'+
       '<label class="chk" style="margin-top:6px"><input type="checkbox" id="pimpK"'+(PIMP.keep?' checked':'')+'> Garder ces lignes dans le plan (sinon elles sont retirées)</label>':'.')+'</div>':'')+
   (PIMP.mode!=="add"&&(PIMP.mode==="new"?s.titre||s.periode:titreDiff)?'<label class="chk"><input type="checkbox" id="pimpH"'+(PIMP.head?' checked':'')+'> Reprendre '+(s.titre?'le titre « '+esc(s.titre)+' »':'')+(s.titre&&s.periode?' et ':'')+(s.periode?'la période « '+esc(s.periode)+' »':'')+' du fichier</label>':'');
  const g=$("#pimpGo");g.disabled=false;
  g.textContent=PIMP.mode==="maj"?"Mettre à jour le plan":PIMP.mode==="new"?"Créer le plan ("+pl(n,"ligne")+")":"Ajouter "+pl(n,"ligne");
  const on=(id,ev,fn)=>{const e=$("#"+id);if(e)e.addEventListener(ev,fn)};
  on("pimpS","change",e=>{PIMP.pick=+e.target.value;pxReset();drawPacImport()});
  document.querySelectorAll('#pimpOut input[name="pimpM"]').forEach(i=>i.addEventListener("change",()=>{PIMP.mode=i.value;drawPacImport()}));
  on("pimpP","change",e=>{PIMP.majId=e.target.value;PIMP.mode="maj";drawPacImport()});
  on("pimpP","click",e=>e.stopPropagation());
  on("pimpN","change",e=>{PIMP.notes=e.target.checked});
  on("pimpK","change",e=>{PIMP.keep=e.target.checked});
  on("pimpH","change",e=>{PIMP.head=e.target.checked});
}
async function pacImportGo(){
  if(!PIMP||PIMP.undo)return;
  const s=pxSheet(),undo={pac:clone(S.pac),plans:clone(S.plans),cur:S.settings.planCourant},t=now();
  let plan,nUpd=0,nNew=0,nGone=0;
  const head=p=>{if(!PIMP.head)return;if(s.titre)p.titre=s.titre;if(s.periode)p.periode=s.periode};
  const notesTo=(p,append)=>{if(!PIMP.notes||!s.notes.length)return false;p.notes=append&&(p.notes||[]).length?p.notes.concat([[]],clone(s.notes)):clone(s.notes);return true};
  if(PIMP.mode==="new"){
    plan={id:uid(),nom:s.nom||"PAC importé",axe:"theme",titre:"",periode:String(new Date().getFullYear()),ordre:S.plans.length+1,creeLe:t};head(plan);notesTo(plan);S.plans.push(plan);
    s.recs.forEach((r,i)=>{S.pac.push(Object.assign(pblank(),clone(r),{id:uid(),planId:plan.id,ordre:i+1,creeLe:t,majLe:t}));nNew++})}
  else if(PIMP.mode==="add"){
    plan=curPlan();let o=pacNextOrdre()-1;notesTo(plan,true);
    s.recs.forEach(r=>{S.pac.push(Object.assign(pblank(),clone(r),{id:uid(),planId:plan.id,ordre:++o,creeLe:t,majLe:t}));nNew++})}
  else{
    plan=pxPlan();const M=pxMatch(s.recs,planLines(plan.id));head(plan);notesTo(plan);
    const keep=new Set(PIMP.keep?M.gone.map(g=>g.id):[]),out=[];
    M.pairs.forEach(([r,m],i)=>{const x=Object.assign(pblank(),clone(r),{planId:plan.id,ordre:i+1,majLe:t});
      if(m){/* Décision corrective et commentaire de suivi saisis dans Registre : gardés quand le fichier n'en a pas */
        if(!x.decision&&m.decision)x.decision=m.decision;if(!x.obtenus&&m.obtenus)x.obtenus=m.obtenus;
        Object.assign(x,{id:m.id,creeLe:m.creeLe||t,campagnes:r.campagnes.length?r.campagnes:clone(m.campagnes),secteurs:(r.secteurs||[]).length?r.secteurs:clone(m.secteurs||[]),
        obj:Object.assign({},m.obj,...Object.entries(r.obj).filter(e=>e[1]!=="").map(([k,v])=>({[k]:v})))});nUpd++}
      else{Object.assign(x,{id:uid(),creeLe:t});nNew++}
      out.push(x)});
    M.gone.forEach((g,i)=>{if(keep.has(g.id))out.push(Object.assign(clone(g),{ordre:M.pairs.length+i+1}));else nGone++});
    S.pac=S.pac.filter(l=>l.planId!==plan.id).concat(out)}
  plan.majLe=t;S.settings.planCourant=plan.id;PUI.f="";puiSave();bump();commit();
  PIMP.undo=undo;
  const parts=[nUpd?pl(nUpd,"ligne")+" mise"+(nUpd>1?"s":"")+" à jour":"",nNew?pl(nNew,"ligne")+" ajoutée"+(nNew>1?"s":""):"",nGone?pl(nGone,"ligne")+" retirée"+(nGone>1?"s":""):"",PIMP.notes&&s.notes.length?"compléments repris sous le tableau":""].filter(Boolean);
  $("#drawer .db").innerHTML='<div class="notice ok"><b>Import terminé · plan « '+esc(plan.nom)+' »</b><br>'+esc(parts.join(", "))+'.</div><p class="hint">Vous pouvez annuler cet import tant que ce panneau reste ouvert.</p>';
  $("#pimpDf").innerHTML='<button class="btn" type="button" data-act="pimpundo">Annuler cet import</button><span class="grow"></span><button class="btn primary" type="button" data-act="close">Fermer</button>';
  toast("PAC importé : "+parts.join(", "));
}
function pacImportUndo(){if(!PIMP||!PIMP.undo)return;const u=PIMP.undo;
  S.pac=u.pac.map(pnorm);S.plans=u.plans;S.settings.planCourant=u.cur;bump();ensurePlans();closeDrawer();commit();toast("Import annulé : le plan est revenu à son état d'avant")}

/* ---------- Compléments sous le tableau : rangées de cellules, une rangée vide sépare deux blocs ---------- */
function pxBlocks(rows){const B=[];let cur=[];(rows||[]).forEach(r=>{if(!r||!r.some(c=>String(c).trim())){if(cur.length)B.push(cur);cur=[]}else cur.push(r)});if(cur.length)B.push(cur);return B}
const pxNum=c=>/^[-+]?[\d\s  .,]+( ?%| ?k?€)?$/.test(String(c).trim());
function pacNotesHTML(rows){const B=pxBlocks(rows);if(!B.length)return "";
  return '<div class="pac-cpl">'+B.map(b=>{let h='<section class="cpl-b">',i=0;
    while(i<b.length){const r=b[i];
      if(r.length===1){h+=i===0?'<h3>'+esc(r[0])+'</h3>':'<p class="cpl-n">'+esc(r[0])+'</p>';i++;continue}
      if(r.length===2){h+='<dl class="cpl-kv">';while(i<b.length&&b[i].length===2){h+='<dt>'+esc(b[i][0])+'</dt><dd'+(pxNum(b[i][1])?' class="num"':'')+'>'+esc(b[i][1])+'</dd>';i++}h+='</dl>';continue}
      const w=r.length;h+='<div class="cpl-tw"><table class="cpl-t"><thead><tr>'+r.map((c,j)=>'<th'+(j?' class="num"':'')+'>'+esc(c)+'</th>').join("")+'</tr></thead><tbody>';i++;
      while(i<b.length&&b[i].length>=3){const x=b[i].concat(Array(Math.max(0,w-b[i].length)).fill(""));h+='<tr'+(/^total/i.test(x[0])?' class="tot"':'')+'>'+x.map((c,j)=>'<td'+(j&&pxNum(c)?' class="num"':'')+'>'+esc(c)+'</td>').join("")+'</tr>';i++}
      h+='</tbody></table></div>'}
    return h+'</section>'}).join("")+'</div>'}
/* Export Excel : « 30 % » et « 7 500 » redeviennent des nombres au format d'origine */
function pxXlVal(v){const t=String(v||"").trim(),m=t.match(/^(-?[\d\s\u202f\u00a0]+(?:,(\d+))?)\s?(%)?$/);if(!m||!/\d/.test(m[1]))return {v:t||null};
  const n=Number(m[1].replace(/[\s\u202f\u00a0]/g,"").replace(",","."));if(!isFinite(n))return {v:t};const d=m[2]?m[2].length:0;
  return m[3]?{v:n/100,f:d?"0."+"0".repeat(d)+"%":"0%"}:{v:n,f:d?"#,##0."+"0".repeat(d):"#,##0"}}
/* Saisie dans « Paramètres du plan » : une rangée par ligne, cellules séparées par « | », une ligne vide entre deux blocs */
const pxNotesTxt=rows=>(rows||[]).map(r=>(r||[]).join(" | ")).join("\n").replace(/\n{3,}/g,"\n\n").trim();
const pxNotesRead=txt=>{const R=String(txt||"").split("\n").map(l=>l.trim()?l.split("|").map(c=>c.trim()):[]);while(R.length&&!R[R.length-1].length)R.pop();return R.filter((r,i)=>r.length||(i&&R[i-1].length))};
