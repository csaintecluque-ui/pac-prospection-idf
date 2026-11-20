/* Registre · CSC — Import d'une analyse SWOT : Excel (.xlsx), Word (.docx), PowerPoint (.pptx), PDF, texte (.txt, .csv) ou texte collé.
   Les titres (Forces, Faiblesses, Opportunités, Menaces, Strengths…, stratégies S×O…) classent les lignes ; la position sur la page
   (colonne, ligne de tableau, cadre de diapositive) rattache chaque ligne au titre le plus proche au-dessus d'elle. Aperçu corrigible
   avant l'import, dans une nouvelle analyse ou dans l'analyse affichée. Lecteurs zip, Word et PDF repris de 10-devis.js.
   Chargé avant 18-demarrage.js (toujours en dernier) : partage les déclarations des fichiers précédents. */
"use strict";

const SWI_CATS=[["s","Forces"],["w","Faiblesses"],["o","Opportunités"],["t","Menaces"],["so","Stratégie offensive (S × O)"],["wo","Stratégie de réorientation (W × O)"],["st","Stratégie défensive (S × T)"],["wt","Stratégie de repli (W × T)"],["notes","Notes"]];
const SWI_CL=Object.fromEntries(SWI_CATS);
const SWI_BUL=/^\s*(?:[•●○◦▪▫■□◆◇►▸▹➢➤✓✔·]\s*|[\-–—*+]\s+|\d{1,2}[.)]\s+)/;
let SWI=null;

/* ---------- Classement d'une ligne : titre de quadrant, de stratégie, notes, ligne à ignorer, ou contenu ---------- */
const swiClean=s=>String(s==null?"":s).replace(/ /g," ").replace(/\s+/g," ").trim();
function swiHead(t,noLetter){const s=swiClean(t).replace(/\s*[:：]\s*$/,"");if(!s||s.length>70||/[,;]$/.test(s))return "";const n=nh(s);
  const one={s:"s",w:"w",o:"o",t:"t"}[n];if(one)return noLetter?"":one;
  const Q=[["s",/^(?:s )?(?:les |nos )?(?:forces?|points? forts?|atouts?|strengths?)(?: internes?)?$/],
    ["w",/^(?:w )?(?:les |nos )?(?:faiblesses?|points? faibles?|weakness(?:es)?)(?: internes?)?$/],
    ["o",/^(?:o )?(?:les )?(?:opportunites?|opportunities|opportunity)(?: externes?)?$/],
    ["t",/^(?:t )?(?:les )?(?:menaces?|risques?|threats?)(?: externes?)?$/]];
  for(const [k,re] of Q)if(re.test(n))return k;
  const m=n.replace(/\b(?:strategies?|strategy|strategique|axes?|de|d|la|du)\b/g," ").replace(/\s+/g," ").trim();
  const X={so:["offensive","s o","s x o","so","maxi maxi"],wo:["reorientation","w o","w x o","wo","mini maxi","amelioration"],st:["defensive","s t","s x t","st","maxi mini","diversification"],wt:["repli","survie","w t","w x t","wt","mini mini"]};
  for(const [k,L] of Object.entries(X)){if(L.includes(m))return k;if(L.some(a=>m===L[0]+" "+a||m===a+" "+L[0]))return k}
  if(/^notes?$/.test(n))return "notes";
  return ""}
function swiIgnore(t){const n=nh(t);if(!n)return true;
  return /^(?:positif|negatif|positive|negative|interne|externe|internes|externes|origine (?:interne|externe)|swot|afom|ffom|matrice swot|analyse swot|strategies?|strategies swot|croisement swot|strategies croisement swot|tows|pac)$/.test(n)
    ||/^en gras importance forte/.test(n)||/^analyse editee le/.test(n)||/^page \d+( \d+)?$/.test(n)||/^registre csc/.test(n)}
const swiItem=t=>swiClean(String(t||"").replace(SWI_BUL,"").replace(/\s*\(dans le PAC\)\s*$/i,""));

/* ---------- Blocs → lignes classées ----------
   Bloc : { t: texte, x, y : position (unités du format ; un tableau est mis à plat en colonnes de 1000 et lignes de 100), b : puce,
   pg : page, diapositive ou onglet. Une page sans aucun titre SWOT (ex. le tableau du PAC imprimé à la suite) reste non classée. */
function swiParse(blocks,opt){opt=opt||{};const H=[],I=[];let titre="",entite="";
  /* « Forces : a ; b » sur une seule ligne : le titre puis le contenu */
  const B=[];blocks.forEach(b=>{const t=swiClean(b.t);if(!t)return;const k=t.indexOf(":");
    if(k>0&&k<40){const h=swiHead(t.slice(0,k),opt.noLetter);const rest=t.slice(k+1).trim();if(h&&rest){B.push(Object.assign({},b,{t:t.slice(0,k)}));rest.split(/\s*;\s*/).forEach((r,j)=>B.push(Object.assign({},b,{t:r,y:b.y+.001*(j+1)})));return}}
    B.push(Object.assign({},b,{t}))});
  let prevIt=null;
  B.forEach((b,i)=>{b.i=i;b.pg=b.pg||0;const m=b.t.match(/^analyse swot\s*[·:–—-]\s*(.+)$/i);
    /* Impression Registre : le titre, puis « Analyse SWOT · Entreprise · nom · période » ; export Excel : « Analyse SWOT · titre » */
    if(m){const e2=m[1].match(/^entreprise\s*·\s*([^·]+)/i);if(e2){entite=entite||e2[1].trim();if(prevIt){titre=prevIt.t;I.splice(I.indexOf(prevIt),1);prevIt=null}}else titre=m[1].trim();return}
    const e=b.t.match(/^entreprise\s*·\s*([^·]+)/i);if(e&&!entite){entite=e[1].trim();return}
    const h=swiHead(b.t,opt.noLetter);if(h){b.h=h;H.push(b);return}
    if(swiIgnore(b.t))return;b.bul=b.b||SWI_BUL.test(b.t);I.push(b);prevIt=H.length?null:b});
  /* Titre le plus proche au-dessus, dans la même colonne de préférence */
  /* PDF, diapositives : une page ne compte que si elle porte au moins deux titres de quadrant, ou si elle prolonge la page SWOT
     précédente avec un titre nouveau (un « Opportunités » isolé dans le tableau du PAC imprimé à la suite ne compte pas) */
  if(opt.pages){const pgs=[...new Set(H.map(h=>h.pg))].sort((a,b)=>a-b),ok=new Set(),seen=new Set();let prev=-2;
    pgs.forEach(p=>{const k=new Set(H.filter(h=>h.pg===p).map(h=>h.h)),nq=[...k].filter(x=>"swot".includes(x)&&x.length===1).length;
      if(nq>=2||(prev===p-1&&[...k].some(x=>!seen.has(x)))){ok.add(p);k.forEach(x=>seen.add(x));prev=p}});
    for(let j=H.length-1;j>=0;j--)if(!ok.has(H[j].pg))H.splice(j,1)}
  const dxOf=(h,b)=>h.x1!=null&&b.x>=h.x&&b.x<=h.x1?0:Math.abs(h.x-b.x);
  const above=(L,b)=>{let best=null,sc=Infinity;L.forEach(h=>{if(h.y>b.y||(h.y===b.y&&h.x>b.x))return;const s=(b.y-h.y)+3*dxOf(h,b);if(s<sc){sc=s;best=h}});return best};
  I.forEach(b=>{const own=H.filter(h=>h.pg===b.pg);if(!own.length){b.cat="";return}
    let best=above(own,b);
    /* Haut de page avant le premier titre : suite de la rubrique de la page précédente, dans la même colonne */
    if(!best){const prev=H.filter(h=>h.pg<b.pg);if(prev.length){const lp=Math.max(...prev.map(h=>h.pg)),L=prev.filter(h=>h.pg===lp),dmin=Math.min(...L.map(h=>Math.abs(h.x-b.x)));
      best=L.filter(h=>Math.abs(h.x-b.x)<=dmin+60).sort((x,y)=>y.y-x.y)[0]||null}}
    b.cat=best?best.h:""});
  /* PDF : une ligne sans puce sous une ligne à puce, dans la même colonne et la même rubrique, en est la suite */
  let R=I.slice().sort((a,b)=>a.y-b.y||a.x-b.x);
  if(opt.merge){const out=[];R.forEach(b=>{const p=[...out].reverse().find(x=>x.cat===b.cat&&Math.abs(x.x-b.x)<40);
      if(p&&!b.bul&&b.y-p.ly<(opt.lh||30)&&(p.bul||/^[a-zà-ÿ(]/.test(b.t))&&!/[.!?]$/.test(p.t)){p.t+=" "+b.t;p.ly=b.y}else{b.ly=b.y;out.push(b)}});R=out}
  const rows=R.map(b=>({t:swiItem(b.cat.length===2?b.t.replace(/\s+PAC$/,""):b.t),cat:b.cat,on:!!b.cat})).filter(r=>r.t&&r.t!=="—"&&r.t!=="-");
  /* Un titre de l'export Registre « Entreprise 2026 » : nom et période séparés */
  let periode="";const y=titre.match(/\b(20\d\d)\b/);if(y)periode=y[1];
  if(entite&&titre&&nh(titre)===nh(entite+" "+periode))titre="";
  return {rows,titre,entite,periode,nH:H.length}}

/* ---------- Lecteurs ---------- */
function swiTextBlocks(txt){const L=String(txt||"").replace(/\r/g,"").split("\n");
  if(L.some(l=>l.includes("\t")))return L.flatMap((l,r)=>l.split("\t").map((c,col)=>({t:c.replace(/^"|"$/g,""),x:col*1000,y:r*100})));
  return L.map((t,i)=>({t,x:0,y:i}))}
function swiCsv(txt){const d=(txt.split("\n")[0].match(/;/g)||[]).length>=(txt.split("\n")[0].match(/,/g)||[]).length?";":",",B=[];let r=0,c=0,f="",q=false;
  const push=()=>{f.split(/\r?\n/).forEach((t,k)=>B.push({t,x:c*1000,y:r*100+k}));f=""};
  for(let i=0;i<txt.length;i++){const ch=txt[i];
    if(q){if(ch==='"'){if(txt[i+1]==='"'){f+='"';i++}else q=false}else f+=ch}
    else if(ch==='"')q=true;else if(ch===d){push();c++}else if(ch==="\n"){push();r++;c=0}else if(ch!=="\r")f+=ch}
  push();return B}
async function swiDocx(buf){const xml=await zipText(buf,"word/document.xml");if(!xml)throw new Error("docx");
  const doc=new DOMParser().parseFromString(xml,"application/xml"),body=doc.getElementsByTagNameNS(WNS,"body")[0],B=[];let y=0;
  const walk=el=>{for(const c of el.childNodes){if(c.namespaceURI!==WNS)continue;
    if(c.localName==="p")wText(c).split("\n").forEach(t=>B.push({t,x:0,y:(y++)*100}));
    else if(c.localName==="tbl"){const y0=y*100;let r=0;
      [...c.childNodes].filter(n=>n.localName==="tr").forEach(tr=>{let col=0;
        [...tr.childNodes].filter(n=>n.localName==="tc").forEach(tc=>{let k=0;[...tc.getElementsByTagNameNS(WNS,"p")].forEach(p=>wText(p).split("\n").forEach(t=>B.push({t,x:col*1000,y:y0+r*100+(k++)})));col++});r++});
      y+=r+1}
    else if(c.localName==="sdt"){const sc=c.getElementsByTagNameNS(WNS,"sdtContent")[0];if(sc)walk(sc)}}};
  if(body)walk(body);return B}
const ANS="http://schemas.openxmlformats.org/drawingml/2006/main";
function aText(p){let s="";const tw=p.ownerDocument.createTreeWalker(p,1);let n=tw.currentNode;
  while(n){if(n.namespaceURI===ANS){if(n.localName==="t")s+=n.textContent;else if(n.localName==="br")s+="\n"}n=tw.nextNode()}return s}
async function swiPptx(buf){const B=[];let miss=0;
  const offOf=el=>{const o=el.getElementsByTagNameNS(ANS,"off")[0];return o?{x:+o.getAttribute("x")||0,y:+o.getAttribute("y")||0}:{x:0,y:0}};
  for(let s=1;s<=80&&miss<3;s++){const xml=await zipText(buf,"ppt/slides/slide"+s+".xml");if(xml==null){miss++;continue}miss=0;
    const doc=new DOMParser().parseFromString(xml,"application/xml"),Y=s*1e9;
    [...doc.getElementsByTagNameNS(ANS,"tbl")].forEach(tb=>{let f=tb;while(f&&f.localName!=="graphicFrame")f=f.parentNode;const o=offOf(f||tb);let r=0;
      [...tb.getElementsByTagNameNS(ANS,"tr")].forEach(tr=>{let col=0;[...tr.childNodes].filter(n=>n.localName==="tc").forEach(tc=>{let k=0;
        [...tc.getElementsByTagNameNS(ANS,"p")].forEach(p=>aText(p).split("\n").forEach(t=>B.push({t,x:o.x+col*1e6,y:Y+o.y+r*1e5+(k++),pg:s})));col++});r++})});
    [...doc.getElementsByTagName("*")].filter(e=>e.localName==="sp").forEach(sp=>{const o=offOf(sp);let k=0;
      [...sp.getElementsByTagNameNS(ANS,"p")].forEach(p=>aText(p).split("\n").forEach(t=>B.push({t,x:o.x,y:Y+o.y+(k++)*10,pg:s})))})}
  /* SmartArt : textes du diagramme, dans l'ordre */
  if(!B.some(b=>swiClean(b.t)))for(let d=1;d<=20;d++){const xml=await zipText(buf,"ppt/diagrams/data"+d+".xml");if(xml==null)break;
    const doc=new DOMParser().parseFromString(xml,"application/xml");[...doc.getElementsByTagNameNS(ANS,"p")].forEach(p=>B.push({t:aText(p),x:0,y:d*1e6+B.length}))}
  return B}
async function swiXlsx(buf){await loadExcel();const wb=new ExcelJS.Workbook();await wb.xlsx.load(buf);
  let sh=wb.worksheets.filter(w=>/swot|afom|ffom/i.test(w.name));if(!sh.length)sh=wb.worksheets;const B=[];
  const cn=l=>[...l].reduce((n,ch)=>n*26+ch.charCodeAt(0)-64,0);
  sh.forEach((ws,si)=>{const end={};((ws.model&&ws.model.merges)||[]).forEach(m=>{const x=String(m).match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);if(x)end[x[1]+x[2]]=cn(x[3])});
    ws.eachRow({includeEmpty:false},(row,r)=>row.eachCell({includeEmpty:false},(c,col)=>{
      if(c.isMerged&&c.master&&c.master.address!==c.address)return;const x1=end[c.address]?end[c.address]*1000:null;
      String(c.text==null?"":c.text).split(/\r?\n/).forEach((t,k)=>B.push({t,x:col*1000,x1,y:si*1e7+r*100+k,pg:si}))}))});
  return B}
async function swiPdf(buf){await loadPdf();const doc=await window.pdfjsLib.getDocument({data:new Uint8Array(buf),isEvalSupported:false}).promise,B=[];
  for(let p=1;p<=Math.min(doc.numPages,30);p++){const pg=await doc.getPage(p),vp=pg.getViewport({scale:1}),tc=await pg.getTextContent();
    const it=tc.items.filter(i=>i.str&&i.str.trim()&&Math.abs(i.transform[1])<.01&&Math.abs(i.transform[2])<.01).map(i=>({s:i.str.replace(/ /g," "),x:i.transform[4],y:vp.height-i.transform[5],w:i.width||0,h:Math.abs(i.transform[3])||9})).sort((a,b)=>a.y-b.y||a.x-b.x);
    const rows=[];it.forEach(i=>{let r=rows.find(r=>Math.abs(r.y-i.y)<Math.max(2,i.h*.4));if(!r)rows.push(r={y:i.y,items:[]});r.items.push(i)});
    rows.forEach(r=>{r.items.sort((a,b)=>a.x-b.x);const segs=[];
      r.items.forEach(i=>{const g=segs[segs.length-1];if(g&&i.x-g.end<=12){g.t+=(i.x-g.end>1&&!/\s$/.test(g.t)&&!/^\s/.test(i.s)?" ":"")+i.s;g.end=Math.max(g.end,i.x+i.w)}else segs.push({t:i.s,x:i.x,end:i.x+i.w,y:(p-1)*1e5+r.y,pg:p-1})});
      /* Puce isolée (glyphe à part) : elle marque le segment suivant */
      segs.forEach((g,j)=>{if(/^\s*[•●▪■◦‣–-]\s*$/.test(g.t)&&segs[j+1]){segs[j+1].b=true;g.t=""}});
      segs.forEach(g=>{if(g.t.trim())B.push(g)})})}
  return B}
async function swiRead(f){const n=f.name||"",buf=await f.arrayBuffer();
  if(/\.xlsx$/i.test(n))return swiParse(await swiXlsx(buf));
  if(/\.docx$/i.test(n))return swiParse(await swiDocx(buf));
  if(/\.pptx$/i.test(n))return swiParse(await swiPptx(buf),{pages:true});
  if(/\.pdf$/i.test(n))return swiParse(await swiPdf(buf),{merge:true,lh:30,pages:true,noLetter:true});
  const txt=new TextDecoder().decode(buf);
  if(/\.csv$/i.test(n))return swiParse(swiCsv(txt));
  if(/\.(txt|md|text)$/i.test(n))return swiParse(swiTextBlocks(txt));
  throw new Error("format")}

/* ---------- Fenêtres : source, puis aperçu ---------- */
function swiOpen(){SWI=null;
  showModal(mHead("Analyse SWOT","Importer un SWOT")+'<div class="db">'+
    '<p class="hint">Un fichier Excel (.xlsx), Word (.docx), PowerPoint (.pptx), PDF ou texte (.txt, .csv), ou le texte collé ci-dessous. Les titres Forces, Faiblesses, Opportunités, Menaces (ou Strengths, Weaknesses, Opportunities, Threats) classent les lignes ; un aperçu vous permet de corriger avant l\'import.</p>'+
    '<div class="bar"><button class="btn primary" type="button" data-swifile="1">Choisir un fichier…</button><span class="sub" id="swiSt"></span></div>'+
    '<div class="f"><label class="lbl" for="swiTxt">Ou collez le texte du SWOT</label><textarea id="swiTxt" rows="11" placeholder="Forces&#10;- Maillage des agences&#10;- …&#10;Faiblesses&#10;- …&#10;Opportunités&#10;- …&#10;Menaces&#10;- …"></textarea>'+
    '<p class="hint">Un tableau copié depuis Excel ou Word se colle aussi : chaque colonne garde son titre.</p></div></div>'+
    '<div class="df"><span class="grow"></span><button class="btn" type="button" data-act="mclose">Annuler</button><button class="btn primary" type="button" data-switxt="1">Analyser le texte collé</button></div>',"swi");
  setTimeout(()=>{const t=$("#swiTxt");if(t)t.focus({preventScroll:true})},30)}
function swiPick(){let i=$("#swiFile");if(!i){i=document.createElement("input");i.type="file";i.id="swiFile";i.hidden=true;
    i.accept=".xlsx,.docx,.pptx,.pdf,.txt,.csv,.md,application/pdf,text/plain,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation";
    document.body.appendChild(i);i.addEventListener("change",async()=>{const f=i.files&&i.files[0];i.value="";if(f)await swiFromFile(f)})}
  i.click()}
async function swiFromFile(f){const n=f.name||"";
  if(/\.(xls|doc|ppt)$/i.test(n)){toast("Ancien format Office : enregistrez le fichier en ."+n.split(".").pop().toLowerCase()+"x, puis importez-le.");return}
  const st=$("#swiSt");if(st)st.textContent="Lecture de « "+n+" »…";
  try{swiShow(await swiRead(f),n)}
  catch(e){console.error(e);if(st)st.textContent="";
    toast(e.message==="format"?"Format non pris en charge : Excel (.xlsx), Word (.docx), PowerPoint (.pptx), PDF, .txt ou .csv.":e.message==="inflate"?"Ce navigateur ne sait pas ouvrir ce fichier : utilisez Chrome ou Edge à jour.":
      /\.(pdf|xlsx)$/i.test(n)?"Lecture impossible de « "+n+" » : vérifiez la connexion internet (lecteur PDF / Excel), ou collez le texte.":"Lecture impossible de « "+n+" ». Collez le texte du SWOT à la place.")}}
function swiShow(r,src){const cur=swCur(),y=String(new Date().getFullYear());
  SWI={src,rows:r.rows,nH:r.nH,dest:"new",entite:r.entite||S.settings.swEntite||"",titre:r.titre||"",periode:r.periode||y,curId:cur?cur.id:""};
  if(!SWI.rows.length){toast("Aucune ligne trouvée"+(src?" dans « "+src+" »":"")+". Collez le texte du SWOT à la place.");if(MODAL!=="swi")swiOpen();return}
  swiDraw()}
function swiDraw(){const w=SWI,cur=w.curId&&S.swot.find(x=>x.id===w.curId),n=k=>w.rows.filter(r=>r.on&&r.cat===k).length;
  const opts=sel=>'<option value="">Non classée</option>'+SWI_CATS.map(([k,l])=>'<option value="'+k+'"'+(k===sel?' selected':'')+'>'+esc(l)+'</option>').join("");
  const grp=k=>{const L=w.rows.map((r,i)=>[r,i]).filter(([r])=>r.cat===k);if(!L.length)return "";const big=!k&&L.length>12;
    return (big?'<details class="swi-g">':'<div class="swi-g">')+(big?'<summary class="swi-gh cat-x">':'<div class="swi-gh cat-'+(k||"x")+'">')+esc(k?SWI_CL[k]:"Non classées : choisissez une rubrique, ou laissez décoché")+'<span class="sub num">'+L.length+'</span>'+(big?'</summary>':'</div>')+
      L.map(([r,i])=>'<div class="swi-r cat-'+(k||"x")+'"><input type="checkbox" data-swion="'+i+'"'+(r.on?' checked':'')+' aria-label="Importer cette ligne"><input type="text" data-switx="'+i+'" value="'+esc(r.t)+'" aria-label="Texte"><select data-swic="'+i+'" aria-label="Rubrique">'+opts(k)+'</select></div>').join("")+(big?'</details>':'</div>')};
  const tot=w.rows.filter(r=>r.on&&r.cat).length;
  showModal(mHead("Importer un SWOT",esc(w.src||"Texte collé"))+'<div class="db">'+
    (w.nH?'':'<div class="notice warn">Aucun titre Forces, Faiblesses, Opportunités ou Menaces trouvé : choisissez la rubrique de chaque ligne.</div>')+
    '<div class="swi-sum">'+SWQ.map(([q,l])=>'<span><i class="sw-dot q-'+q+'"></i>'+esc(l)+' <b class="num">'+n(q)+'</b></span>').join("")+'<span>Axes <b class="num">'+["so","wo","st","wt"].reduce((s,k)=>s+n(k),0)+'</b></span>'+(n("notes")?'<span>Notes <b class="num">'+n("notes")+'</b></span>':'')+'</div>'+
    '<div class="f"><span class="lbl">Importer dans</span><div class="seg" role="group" aria-label="Destination"><button type="button" data-swidest="new" aria-pressed="'+(w.dest==="new")+'">Une nouvelle analyse</button>'+(cur?'<button type="button" data-swidest="cur" aria-pressed="'+(w.dest==="cur")+'">L\'analyse « '+esc(swCut(swTitle(cur),40))+' »</button>':'')+'</div></div>'+
    (w.dest==="new"?'<div class="row3"><div class="f"><label class="lbl" for="swiE">Entreprise</label><input type="text" id="swiE" value="'+esc(w.entite)+'" placeholder="Nom de l\'entreprise, de la filiale ou de la région" autocomplete="off"></div>'+
      '<div class="f"><label class="lbl" for="swiT">Titre <span class="sub">(facultatif)</span></label><input type="text" id="swiT" value="'+esc(w.titre)+'" placeholder="'+esc((w.entite||"Entreprise")+(w.periode?" "+w.periode:""))+'" autocomplete="off"></div>'+
      '<div class="f"><label class="lbl" for="swiP">Période</label><input type="text" id="swiP" value="'+esc(w.periode)+'" autocomplete="off"></div></div>'
      :'<p class="hint">Les lignes s\'ajoutent à celles de l\'analyse ; une ligne déjà présente dans la même rubrique n\'est pas reprise.</p>')+
    '<div class="swi-list">'+SWI_CATS.map(([k])=>grp(k)).join("")+grp("")+'</div></div>'+
    '<div class="df"><button class="btn ghost" type="button" data-swiback="1">Autre fichier ou texte</button><span class="grow"></span><button class="btn" type="button" data-act="mclose">Annuler</button><button class="btn primary" type="button" data-swigo="1" id="swiGo">'+swiGoLbl(tot)+'</button></div>',"swi");
  modalBig()}
const swiGoLbl=n=>n?"Importer "+pl(n,"ligne"):"Rien à importer";
function swiReadForm(){const w=SWI;if(!w)return;
  document.querySelectorAll("#modal [data-switx]").forEach(i=>{const r=w.rows[+i.dataset.switx];if(r)r.t=i.value});
  document.querySelectorAll("#modal [data-swion]").forEach(i=>{const r=w.rows[+i.dataset.swion];if(r)r.on=i.checked});
  [["swiE","entite"],["swiT","titre"],["swiP","periode"]].forEach(([id,f])=>{const e=$("#"+id);if(e)w[f]=e.value})}
function swiGo(){swiReadForm();const w=SWI,R=w.rows.filter(r=>r.on&&r.cat&&r.t.trim());if(!R.length){toast("Cochez au moins une ligne classée.");return}
  let a=w.dest==="cur"?S.swot.find(x=>x.id===w.curId):null,isNew=false;
  if(!a){a=swnorm({id:uid(),creeLe:now(),majLe:now(),portee:"activite",entite:w.entite.trim(),titre:w.titre.trim(),periode:w.periode.trim()});if(a.entite)S.settings.swEntite=a.entite;S.swot.push(a);isNew=true}
  let n=0,dup=0;const has=(L,k,f,t)=>L.some(x=>x[k]===f&&nh(x.txt)===nh(t));
  R.forEach(r=>{const t=r.t.trim();
    if(SWQ.some(q=>q[0]===r.cat)){if(has(a.items,"q",r.cat,t)){dup++;return}a.items.push(swItem({q:r.cat,txt:t}));n++}
    else if(SWX.some(x=>x[0]===r.cat)){if(has(a.axes,"st",r.cat,t)){dup++;return}a.axes.push(swAxe({st:r.cat,txt:t}));n++}
    else if(r.cat==="notes"){a.notes=[a.notes,t].filter(Boolean).join("\n");n++}});
  bump();SWU.cur=a.id;SWUNDO=null;swuSave();swTouch(a);SWI=null;closeModal();
  if(S.tab!=="swot")showTab("swot");else{renderSwot();window.scrollTo(0,0)}
  toast(pl(n,"ligne importée","lignes importées")+(isNew?" dans une nouvelle analyse":"")+(dup?" · "+pl(dup,"doublon ignoré","doublons ignorés"):""))}

/* ---------- Événements ---------- */
document.addEventListener("click",async e=>{const t=e.target.closest&&e.target.closest("button");if(!t)return;const d=t.dataset;
  if(d.swimport){swiOpen();return}
  if(MODAL!=="swi")return;
  if(d.swifile){swiPick();return}
  if(d.switxt){const v=($("#swiTxt")||{}).value||"";if(!v.trim()){toast("Collez d'abord le texte du SWOT.");return}swiShow(swiParse(swiTextBlocks(v)),"");return}
  if(d.swiback){swiOpen();return}
  if(d.swidest&&SWI){swiReadForm();SWI.dest=d.swidest;swiDraw();return}
  if(d.swigo&&SWI){swiGo();return}});
document.addEventListener("change",e=>{const t=e.target;if(!t||MODAL!=="swi"||!SWI)return;
  if(t.dataset.swic!=null){swiReadForm();const r=SWI.rows[+t.dataset.swic];if(r){r.cat=t.value;r.on=!!t.value}const sy=($("#modal .db")||{}).scrollTop||0;swiDraw();const db=$("#modal .db");if(db)db.scrollTop=sy;return}
  if(t.dataset.swion!=null){swiReadForm();const b=$("#swiGo");if(b)b.textContent=swiGoLbl(SWI.rows.filter(r=>r.on&&r.cat).length)}});
/* Fichier déposé sur la fenêtre d'import */
document.addEventListener("dragover",e=>{if(MODAL==="swi"&&e.dataTransfer&&[...(e.dataTransfer.types||[])].includes("Files"))e.preventDefault()});
document.addEventListener("drop",e=>{if(MODAL!=="swi"||!e.dataTransfer||!e.dataTransfer.files||!e.dataTransfer.files.length)return;e.preventDefault();swiFromFile(e.dataTransfer.files[0])});
