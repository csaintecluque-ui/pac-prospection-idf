/* PAC Prospection IDF · CSC — Comptes à compléter (extraction / réintégration), glisser-déposer dans le calendrier
   Fichier 11/12 : les fichiers se chargent dans l'ordre et partagent leurs déclarations. */
"use strict";

/* ================= V3.19 · Extraction des comptes à compléter, puis réintégration des compléments ================= */
const ENR_COLS=[{h:"ID (ne pas modifier)",w:16,k:"id"},{h:"Compte",w:34,bold:true,k:"nom"},{h:"Type",w:15,k:"type"},{h:"Famille",w:30,k:"famille"},{h:"Segment",w:28,k:"segment"},{h:"Typologie",w:24,k:"typologie"},
  {h:"SIRET",w:17,k:"siret"},{h:"Adresse",w:34,k:"adresse"},{h:"Code postal",w:11,k:"cp"},{h:"Ville",w:20,k:"ville"},{h:"Département",w:12,k:"dept"},{h:"Téléphone standard",w:17,k:"tel"},{h:"Site web",w:26,k:"web"},{h:"Agence",w:18,k:"agence"},
  {h:"Contact principal",w:24,k:"ct_nom"},{h:"Fonction",w:22,k:"ct_fon"},{h:"E-mail contact",w:28,k:"ct_mail"},{h:"Tél. contact",w:15,k:"ct_tel"},{h:"Notes",w:40,wrap:true,k:"notes"},
  {h:"Dernier devis (pour info)",w:44,wrap:true,k:"_dv"},{h:"Champs à compléter",w:30,wrap:true,k:"_miss"}];
const ENR_KEY=["siret","adresse","cp","ville","tel","web","segment"],ENR_LBL={siret:"SIRET",adresse:"adresse",cp:"code postal",ville:"ville",tel:"téléphone",web:"site web",segment:"segment"};
const enrMiss=k=>ENR_KEY.filter(f=>!String(k[f]||"").trim());
const ENRS=[["incomplets","Comptes incomplets",k=>enrMiss(k).length>0],["auto","Comptes créés automatiquement (devis, export Excel, actions)",k=>/^(devis|action)/.test(k.origine||"")],["devis","Comptes ayant des devis",k=>dvOf(k.id).length>0],["tous","Tous les comptes",()=>true]];
let ENR={scope:"incomplets",imp:null,repl:false};
function enrRows(scope){const f=(ENRS.find(x=>x[0]===scope)||ENRS[0])[2];
  return S.comptes.filter(f).sort((a,b)=>a.nom.localeCompare(b.nom,"fr")).map(k=>{const p=principal(k.id)||{},d=dvOf(k.id)[0];
    const v={id:k.id,nom:k.nom,type:k.type,famille:FNOM[famOf(k)]||"",segment:k.segment,typologie:k.typologie,siret:k.siret,adresse:k.adresse,cp:k.cp,ville:k.ville,dept:k.dept,tel:k.tel,web:k.web,agence:k.agence,
      ct_nom:p.nom,ct_fon:p.fonction,ct_mail:p.mail,ct_tel:p.tel,notes:k.notes,_dv:d?[d.numero,d.date?fdate(d.date):"",d.objet].filter(Boolean).join(" · "):"",_miss:enrMiss(k).map(x=>ENR_LBL[x]).join(", ")};
    return ENR_COLS.map(c=>v[c.k]==null?"":v[c.k])})}
async function buildEnrXlsx(rows){await loadExcel();const wb=new ExcelJS.Workbook();wb.creator="PAC Prospection IDF · CSC";wb.created=new Date();
  /* Feuille simple (sans « tableau » Excel) : relisible quel que soit l'outil qui l'a enregistrée */
  const ws=wb.addWorksheet("Comptes à compléter",{properties:{tabColor:{argb:COPPER}},views:[{state:"frozen",ySplit:1,xSplit:2,activeCell:"C2"}]});
  ws.addRow(ENR_COLS.map(c=>c.h));rows.forEach(r=>ws.addRow(r));
  ENR_COLS.forEach((c,i)=>{const col=ws.getColumn(i+1);col.width=c.w;col.alignment={vertical:"top",wrapText:!!c.wrap};if(c.bold)for(let r=2;r<=rows.length+1;r++)ws.getCell(r,i+1).font={name:"Calibri",size:10,bold:true}});
  headStyle(ws,ENR_COLS.length);ws.autoFilter={from:{row:1,column:1},to:{row:1,column:ENR_COLS.length}};
  const li=wb.addWorksheet("Listes",{properties:{tabColor:{argb:INK}}});const L=[["Type",TYPES],["Famille",FAMILLES.map(f=>f[1])],["Segment",SEGMENTS],["Département",DEPTS.map(d=>d[0])]];
  L.forEach(([h,vals],i)=>{const c=li.getColumn(i+1);c.width=i===2?40:30;li.getCell(1,i+1).value=h;li.getCell(1,i+1).font={bold:true};vals.forEach((v,j)=>{li.getCell(j+2,i+1).value=v})});
  const colL=n=>{let s="";while(n>0){const m=(n-1)%26;s=String.fromCharCode(65+m)+s;n=Math.floor((n-1)/26)}return s};
  const val={type:"A",famille:"B",segment:"C",dept:"D"},len={type:TYPES.length,famille:FAMILLES.length,segment:SEGMENTS.length,dept:DEPTS.length};
  const n=Math.max(rows.length,1);
  ENR_COLS.forEach((c,ci)=>{const col=ci+1;
    for(let r=2;r<=n+1;r++){const cell=ws.getCell(r,col);
      if(val[c.k])cell.dataValidation={type:"list",allowBlank:true,showErrorMessage:false,formulae:["Listes!$"+val[c.k]+"$2:$"+val[c.k]+"$"+(len[c.k]+1)]};
      if(c.k==="id"||c.k==="_dv"||c.k==="_miss")cell.font={name:"Calibri",size:9,color:{argb:GREYTXT}};
      else if(ENR_KEY.includes(c.k)&&rows[r-2]&&!String(rows[r-2][ci]||"").trim())cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFFFF4D6"}}}});
  const md=wb.addWorksheet("Mode d'emploi");md.getColumn(1).width=110;
  ["Compléter les comptes","","1. Complétez les cellules (en jaune : informations manquantes). Ne modifiez pas la colonne « ID ».","2. Type, Famille, Segment et Département : choisissez dans la liste (onglet « Listes »).","3. Dans l'application : Comptes › Compléter les infos › Réintégrer, puis choisissez ce fichier.","","Par défaut, seules les informations vides sont remplies ; cochez « Remplacer » pour écraser les informations existantes.","Les colonnes « Dernier devis » et « Champs à compléter » sont là pour information et ne sont pas réintégrées."].forEach((t,i)=>{const c=md.getCell(i+1,1);c.value=t;if(!i)c.font={bold:true,size:14}});
  return new Blob([await wb.xlsx.writeBuffer()],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"})}
const enrName=()=>"Comptes_a_completer_"+todayISO()+".xlsx";
async function enrDownload(){const rows=enrRows(ENR.scope);if(!rows.length){toast("Aucun compte dans cette sélection.");return}
  try{toast("Préparation du fichier…");saveBlob(await buildEnrXlsx(rows),enrName());toast(pl(rows.length,"compte")+" extrait"+(rows.length>1?"s":""))}catch(e){toast("Extraction impossible : vérifiez la connexion internet, puis réessayez.")}}
async function enrHandoffURL(){return location.href.split("#")[0]+"#xlsk="+await packData({rows:enrRows(ENR.scope)})}
/* Lecture du fichier complété */
const ENR_ALIAS={id:["id ne pas modifier","id"],nom:["compte","nom du compte","nom"],type:["type"],famille:["famille"],segment:["segment"],typologie:["typologie"],siret:["siret"],adresse:["adresse"],cp:["code postal","cp"],ville:["ville"],dept:["departement","dept"],
  tel:["telephone standard","telephone","tel standard"],web:["site web","site internet","web"],agence:["agence"],ct_nom:["contact principal","contact"],ct_fon:["fonction"],ct_mail:["e mail contact","email contact","mail contact"],ct_tel:["tel contact","telephone contact"],notes:["notes"]};
async function enrRead(f){await loadExcel();const wb=new ExcelJS.Workbook();await wb.xlsx.load(await f.arrayBuffer());
  for(const ws of wb.worksheets){const H={};ws.getRow(1).eachCell({includeEmpty:true},(c,i)=>{const h=nh(xv(c.value));Object.entries(ENR_ALIAS).forEach(([k,a])=>{if(H[k]==null&&a.includes(h))H[k]=i})});
    if(H.nom==null&&H.id==null)continue;const out=[];
    for(let r=2;r<=ws.rowCount;r++){const row=ws.getRow(r),o={};Object.entries(H).forEach(([k,i])=>{let v=xv(row.getCell(i).value);if(v instanceof Date)v=fdate(xIso(v));o[k]=String(v==null?"":v).trim()});if(o.id||o.nom)out.push(o)}
    return out}
  throw new Error("colonnes")}
function enrNorm(o){const v=Object.assign({},o);
  if(v.type){const t=TYPES.find(x=>nh(x)===nh(v.type));v.type=t||""}
  if(v.famille){const f=FAMILLES.find(x=>nh(x[1])===nh(v.famille)||nh(x[0])===nh(v.famille));v.famille=f?f[0]:""}
  if(v.cp){const m=v.cp.replace(/\s/g,"").match(/\d{5}/);v.cp=m?m[0]:v.cp}
  if(v.dept){const m=v.dept.match(/\b(\d{2}|2[AB])\b/);v.dept=m?m[1]:""}
  if(!v.dept&&v.cp&&DNAME[v.cp.slice(0,2)])v.dept=v.cp.slice(0,2);
  if(v.siret)v.siret=v.siret.replace(/\s/g,"");return v}
const ENR_F=["type","famille","segment","typologie","siret","adresse","cp","ville","dept","tel","web","agence","notes"];
/* Plan : quels champs changent (champs vides seulement, ou aussi les champs remplis si « Remplacer ») */
function enrPlan(list,repl){const P={k:[],miss:0,nf:0,keep:0};
  list.forEach(o=>{const v=enrNorm(o),k=(v.id&&kOf(v.id))||findCompte(v.nom);if(!k){P.miss++;return}const ch=[];
    ENR_F.forEach(f=>{const nv=v[f];if(nv==null||nv==="")return;const cur=String((f==="famille"?famOf(k):k[f])||"").trim();if(cur===nv)return;
      if(f==="notes"){if(cur.includes(nv))return;ch.push([f,cur?cur+"\n"+nv:nv]);return}
      if(cur&&!repl){P.keep++;return}ch.push([f,nv])});
    if(repl&&v.nom&&v.id&&nh(v.nom)!==nh(k.nom))ch.push(["nom",v.nom]);
    const ct=v.ct_nom||v.ct_mail?{nom:v.ct_nom||"",fonction:v.ct_fon||"",mail:v.ct_mail||"",tel:v.ct_tel||""}:null;
    if(ch.length||ct){P.k.push({k,ch,ct});P.nf+=ch.length}});
  return P}
function enrApply(){const I=ENR.imp;if(!I)return;const P=enrPlan(I.list,ENR.repl);let nct=0;
  P.k.forEach(({k,ch,ct})=>{ch.forEach(([f,v])=>{k[f]=v});
    if(ct){const ex=findContact(k.id,ct);if(ex){["fonction","tel","mail"].forEach(f=>{if(ct[f]&&(!ex[f]||ENR.repl))ex[f]=ct[f]});if(ct.nom&&!ex.nom)ex.nom=ct.nom}else{ensureContact(k.id,ct);nct++}}
    k.majLe=now()});
  bump();ENR.imp=null;closeModal();commit();toast(pl(P.k.length,"compte complété","comptes complétés")+" · "+pl(P.nf,"information")+(nct?" · "+pl(nct,"contact ajouté","contacts ajoutés"):"")+(P.miss?" · "+P.miss+" ligne"+(P.miss>1?"s":"")+" sans compte correspondant":""))}
function enrMenu(){const cnt=s=>S.comptes.filter(ENRS.find(x=>x[0]===s)[2]).length,I=ENR.imp,P=I?enrPlan(I.list,ENR.repl):null;
  showModal(mHead("Comptes","Compléter les informations des comptes")+
  '<div class="db"><div class="enr-g"><div class="panel"><h2>1 · Extraire</h2><p class="hint" style="margin:0">Un fichier Excel avec les informations de chaque compte ; les manques sont en jaune. Complétez-le vous-même ou donnez-le à Claude pour les recherches, puis réintégrez-le.</p>'+
    '<div class="enr-r">'+ENRS.map(([k,l])=>'<label class="toggle"><input type="radio" name="enrS" value="'+k+'"'+(ENR.scope===k?' checked':'')+'> '+esc(l)+' <span class="sub num">'+cnt(k)+'</span></label>').join("")+'</div>'+
    (IN_FRAME?'<a class="btn primary" id="enrX" href="#" target="_blank" rel="noopener" aria-disabled="true">Préparation du lien…</a><p class="hint" style="margin:0">Notion bloque les téléchargements : un onglet s\'ouvre et télécharge le fichier.</p>':'<button class="btn primary" type="button" data-act="enrdl">Télécharger le fichier Excel</button>')+'</div>'+
   '<div class="panel"><h2>2 · Réintégrer</h2><p class="hint" style="margin:0">Choisissez le fichier complété. Les comptes sont retrouvés par leur ID (ou leur nom).</p>'+
    '<label class="btn" style="width:max-content;cursor:pointer">Choisir le fichier complété (.xlsx)<input type="file" id="enrF" accept=".xlsx" hidden></label>'+
    (I?'<div class="enr-sum"><b>'+esc(I.file)+'</b> · '+pl(I.list.length,"ligne")+'<ul><li><b>'+pl(P.k.length,"compte")+'</b> à compléter · '+pl(P.nf,"information")+' à ajouter</li>'+(P.keep?'<li>'+pl(P.keep,"information différente","informations différentes")+' déjà saisie'+(P.keep>1?'s':'')+(ENR.repl?'':' : conservée'+(P.keep>1?'s':''))+'</li>':'')+(P.miss?'<li>'+pl(P.miss,"ligne")+' sans compte correspondant (ignorée'+(P.miss>1?'s':'')+')</li>':'')+'</ul>'+
      '<label class="toggle"><input type="checkbox" id="enrRp"'+(ENR.repl?' checked':'')+'> Remplacer aussi les informations déjà saisies</label>'+
      (P.k.length?'<details><summary>Voir le détail</summary><div class="enr-det">'+P.k.slice(0,200).map(({k,ch,ct})=>'<div><b>'+esc(k.nom)+'</b> : '+esc(ch.map(([f,v])=>({nom:"nom",famille:"famille",dept:"département",cp:"code postal",tel:"téléphone",web:"site web"}[f]||f)+" → "+(f==="famille"?FNOM[v]:String(v).split("\n").pop())).concat(ct?["contact "+(ct.nom||ct.mail)]:[]).join(" · "))+'</div>').join("")+'</div></details>':'')+
      '<button class="btn primary" type="button" data-act="enrgo"'+(P.k.length?'':' disabled')+'>Intégrer les compléments</button></div>':'')+'</div></div></div>'+
  '<div class="df"><span class="grow"></span><button class="btn" type="button" data-act="mclose">Fermer</button></div>',"enr");modalBig();
  if(IN_FRAME)enrHandoffURL().then(u=>{const a=$("#enrX");if(a){a.href=u;a.textContent="Télécharger le fichier Excel";a.removeAttribute("aria-disabled")}}).catch(()=>{const a=$("#enrX");if(a)a.textContent="Extraction indisponible ici"})}
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("button");if(!t)return;const a=t.dataset.act;
  if(a==="kenr"){enrMenu();return}if(a==="enrdl"){enrDownload();return}if(a==="enrgo"){enrApply();return}});
document.addEventListener("change",async e=>{const t=e.target;if(!t||MODAL!=="enr")return;
  if(t.name==="enrS"){ENR.scope=t.value;enrMenu();return}
  if(t.id==="enrRp"){ENR.repl=t.checked;enrMenu();return}
  if(t.id==="enrF"&&t.files[0]){const f=t.files[0];try{ENR.imp={file:f.name,list:await enrRead(f)};enrMenu()}catch(x){console.error("enr",x);toast(x.message==="colonnes"?"Fichier non reconnu : il faut au moins la colonne « Compte » ou « ID ».":"Lecture impossible (vérifiez la connexion internet pour la lecture Excel).")}}});


/* ================= V3.21 · Glisser une action dans le calendrier pour la déplacer ================= */
/* Souris : glisser dès quelques pixels. Tactile : appui long, puis glisser. */
let CDR=null,CDRsup=0,CDRundo=null;
document.addEventListener("pointerdown",e=>{const ev=e.target.closest&&e.target.closest(".cal .ev[data-aid]");if(!ev||e.button>0)return;
  const a=S.actions.find(x=>x.id===ev.dataset.aid);if(!a)return;
  CDR={ev,a,x:e.clientX,y:e.clientY,touch:e.pointerType!=="mouse",on:false,t:null,over:null};
  if(CDR.touch)CDR.t=setTimeout(()=>{if(CDR&&!CDR.on)cdrStart()},380)});
function cdrStart(){const c=CDR,r=c.ev.getBoundingClientRect(),g=c.ev.cloneNode(true);c.on=true;
  g.classList.add("ev-ghost");g.removeAttribute("data-aid");g.style.width=r.width+"px";g.style.left=r.left+"px";g.style.top=r.top+"px";document.body.appendChild(g);
  c.g=g;c.dx=c.x-r.left;c.dy=c.y-r.top;c.ev.classList.add("ev-src");document.body.classList.add("cal-dragging");
  if(c.touch&&navigator.vibrate)try{navigator.vibrate(12)}catch(_){}}
function cdrEnd(){const c=CDR;CDR=null;if(!c)return null;clearTimeout(c.t);if(!c.on)return null;
  if(c.g)c.g.remove();c.ev.classList.remove("ev-src");document.body.classList.remove("cal-dragging");if(c.over)c.over.classList.remove("drop");CDRsup=Date.now();return c}
document.addEventListener("pointermove",e=>{const c=CDR;if(!c)return;const dist=Math.hypot(e.clientX-c.x,e.clientY-c.y);
  if(!c.on){if(c.touch){if(dist>8){clearTimeout(c.t);CDR=null}return}if(dist<6)return;cdrStart()}
  e.preventDefault();c.g.style.left=(e.clientX-c.dx)+"px";c.g.style.top=(e.clientY-c.dy)+"px";
  const el=document.elementFromPoint(e.clientX,e.clientY),day=el&&el.closest?el.closest(".cal-d[data-cday]"):null;
  if(c.over&&c.over!==day)c.over.classList.remove("drop");if(day)day.classList.add("drop");c.over=day});
document.addEventListener("pointerup",()=>{const c=cdrEnd();if(!c)return;const d=c.over&&c.over.dataset.cday;if(!d||d===c.a.date)return;
  const a=c.a;CDRundo={id:a.id,date:a.date};a.date=d;a.majLe=now();bump();commit();
  toast("Déplacé au "+dObj(d).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})+" : "+(a.objet||ALBL[a.type])+" · Ctrl+Z pour annuler")});
document.addEventListener("pointercancel",()=>{cdrEnd()});
document.addEventListener("touchmove",e=>{if(CDR&&CDR.on)e.preventDefault()},{passive:false});
document.addEventListener("contextmenu",e=>{if(CDR||(e.target.closest&&e.target.closest(".cal .ev")))e.preventDefault()});
/* Le clic qui suit un dépôt n'ouvre ni l'action ni une nouvelle action */
document.addEventListener("click",e=>{if(Date.now()-CDRsup<400){e.stopImmediatePropagation();e.preventDefault()}},true);
/* Annuler le dernier déplacement */
document.addEventListener("keydown",e=>{if(!CDRundo||!(e.ctrlKey||e.metaKey)||e.key.toLowerCase()!=="z")return;const t=e.target;if(t&&(t.matches("input,textarea,select")||t.isContentEditable))return;
  const a=S.actions.find(x=>x.id===CDRundo.id);if(!a)return;e.preventDefault();a.date=CDRundo.date;a.majLe=now();CDRundo=null;bump();commit();toast("Déplacement annulé : "+(a.objet||ALBL[a.type])+" revient au "+fdate(a.date))});
