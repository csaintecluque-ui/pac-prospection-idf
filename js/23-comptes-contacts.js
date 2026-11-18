/* Registre · CSC — Import « Comptes et contacts » : une base de contacts, sans cible ni campagne.
   Onglet « Comptes » (une ligne par entreprise) et/ou onglet « Contacts » (une ligne par contact, colonne « Compte »).
   Les comptes sont créés ou complétés (champs vides seulement), tous les contacts sont ajoutés sans doublon
   (même e-mail, ou même nom, dans le même compte). L'import s'annule tant que le panneau reste ouvert.
   Ouvert depuis Comptes › Importer. Chargé avant 18-demarrage.js (toujours en dernier) : partage les déclarations des fichiers précédents. */
"use strict";

const CI_NOM=["compte","nom du compte","client","client tiers","tiers","societe","entreprise","raison sociale"];
const CI_K={nom:CI_NOM,type:["type"],segment:["segment"],typologie:["typologie"],sousTypo:["sous typologie"],famille:["famille"],siret:["siret"],
  adresse:["adresse"],cp:["code postal","cp"],ville:["ville"],dept:["departement","dept"],tel:["telephone standard","standard","telephone","tel"],
  web:["site web","site internet","web"],agence:["agence"],notes:["notes","commentaire","commentaires"]};
const CI_C={compte:CI_NOM,nomc:["nom complet","contact","nom du contact","interlocuteur","nom et prenom","prenom et nom"],nom:["nom","nom de famille"],prenom:["prenom"],
  fonction:["fonction","poste"],tel:["telephone","telephone 1","tel","tel 1","portable","mobile","telephone contact","tel contact"],tel2:["telephone 2","tel 2"],
  mail:["e mail","email","mail","courriel","adresse e mail","adresse mail","e mail contact"],notes:["notes","commentaire","commentaires"]};
/* Champs d'un compte complétés quand ils sont vides */
const CI_F=["type","segment","typologie","sousTypo","famille","siret","adresse","cp","ville","dept","tel","web","agence","notes"];
let CI=null;

/* En-têtes cherchés dans les 10 premières lignes ; need : clés indispensables */
function ciHead(rows,alias,need){
  const idx={};Object.entries(alias).forEach(([k,a])=>a.forEach(x=>{if(!idx[x])idx[x]=k}));
  for(let i=0;i<Math.min(rows.length,10);i++){const map=[],seen=new Set();
    Array.from(rows[i]||[],v=>nh(cellVal(v))).forEach((h,j)=>{const k=idx[h];if(k&&!seen.has(k)){seen.add(k);map[j]=k}});
    if(need(seen))return {h:i,map}}
  return null}
function ciRead(rows,hd){const out=[];
  for(let r=hd.h+1;r<rows.length;r++){const o={};let any=false;
    hd.map.forEach((k,j)=>{if(!k)return;let v=cellVal((rows[r]||[])[j]);if(v instanceof Date)v=toISO(v);v=v==null?"":String(v).trim();if(v){o[k]=v;any=true}});
    if(any)out.push(o)}
  return out}
const ciMail=v=>{const m=/[^\s@;,<>()"']+@[^\s@;,<>()"']+\.[a-z]{2,}/i.exec(String(v||""));return m?m[0].toLowerCase():""};
function ciCompte(o){const v={nom:o.nom||""};
  if(o.type)v.type=mapType(o.type);
  if(o.segment){const s=mapSegment(o.segment);if(SEGMENTS.includes(s))v.segment=s}
  ["typologie","sousTypo","siret","adresse","ville","tel","web","agence","notes"].forEach(k=>{if(o[k])v[k]=o[k]});
  if(o.famille){const f=FAMILLES.find(x=>nh(x[1])===nh(o.famille)||nh(x[0])===nh(o.famille));if(f)v.famille=f[0]}
  if(o.cp){const m=o.cp.replace(/\s/g,"").match(/\d{5}/);if(m)v.cp=m[0]}
  if(o.dept){const m=o.dept.match(/^\s*(97\d|2[AB]|\d{2})\b/i);if(m&&DNAME[m[1].toUpperCase()])v.dept=m[1].toUpperCase()}
  if(!v.dept&&cpDept(v.cp))v.dept=cpDept(v.cp);
  if(v.siret)v.siret=v.siret.replace(/\s/g,"");
  Object.keys(v).forEach(k=>{if(!v[k])delete v[k]});return v}
function ciContact(o){const nom=String(o.nomc||[o.prenom,o.nom].filter(Boolean).join(" ")).replace(/\s+/g," ").trim(),tel2=o.tel2||"";
  let notes=o.notes||"";if(tel2&&tel2!==o.tel&&!notes.includes(tel2))notes=(notes?notes+"\n":"")+"Tél. 2 : "+tel2;
  return {compte:o.compte||"",nom,fonction:o.fonction||"",tel:o.tel||"",mail:ciMail(o.mail),notes}}

async function ciLoad(f){
  const book=await openBook(f),vis=book.sheets.filter(s=>s.state==="visible"||book.sheets.length===1);
  const named=n=>vis.find(s=>nh(s.name)===n);
  let shK=named("comptes"),shC=named("contacts");const res={fname:f.name,comptes:[],contacts:[],sheets:[],named:!!(shK||shC)};
  const needK=s=>s.has("nom"),needC=s=>s.has("compte")&&(s.has("nomc")||s.has("nom")||s.has("prenom")||s.has("mail"));
  if(!shK&&!shC){ /* pas d'onglet nommé : le premier onglet reconnu, contacts d'abord */
    for(const s of vis){const rows=await book.load(s),hc=ciHead(rows,CI_C,needC);if(hc){res.contacts=ciRead(rows,hc).map(ciContact);res.sheets.push(s.name);return res}
      const hk=ciHead(rows,CI_K,needK);if(hk){res.comptes=ciRead(rows,hk).map(ciCompte);res.sheets.push(s.name);return res}}
    return res}
  if(shK){const rows=await book.load(shK),hk=ciHead(rows,CI_K,needK);if(hk){res.comptes=ciRead(rows,hk).map(ciCompte);res.sheets.push(shK.name)}}
  if(shC){const rows=await book.load(shC),hc=ciHead(rows,CI_C,needC);if(hc){res.contacts=ciRead(rows,hc).map(ciContact);res.sheets.push(shC.name)}}
  return res}

/* Un même contact : même e-mail, sinon même nom dans n'importe quel ordre (« DUPONT Jean » = « Jean Dupont ») */
const ciNk=n=>nh(n).split(" ").filter(Boolean).sort().join(" ");
function ciFind(L,c){const m=c.mail,n=ciNk(c.nom);return (m&&L.find(x=>String(x.mail||"").toLowerCase()===m))||(n&&L.find(x=>ciNk(x.nom)===n))||null}
/* Complète un contact (champs vides) ; une autre adresse e-mail va dans ses notes. Renvoie true si quelque chose change */
function ciMerge(e,c){let ch=false;["nom","fonction","tel","mail"].forEach(f=>{if(c[f]&&!e[f]){e[f]=c[f];ch=true}});
  const add=t=>{if(t&&!String(e.notes||"").includes(t)){e.notes=e.notes?e.notes+"\n"+t:t;ch=true}};
  if(c.mail&&e.mail&&String(e.mail).toLowerCase()!==c.mail)add("Autre e-mail : "+c.mail);
  if(c.notes)c.notes.split("\n").forEach(add);return ch}
/* Ce que l'import fera, sans rien modifier */
function ciPlan(){const I=CI,K=new Map();let ign=0,dup=0;
  const get=nom=>{const key=nh(nom);if(!key)return null;let it=K.get(key);if(!it)K.set(key,it={nom:String(nom).trim(),f:{},raw:[]});return it};
  I.comptes.forEach(v=>{const it=get(v.nom);if(!it){ign++;return}Object.entries(v).forEach(([k,x])=>{if(k!=="nom"&&x&&!it.f[k])it.f[k]=x})});
  I.contacts.forEach(c=>{const it=get(c.compte);if(!it||!(c.nom||c.mail||c.tel)){ign++;return}it.raw.push(c)});
  const P={list:[...K.values()],kNew:0,kEx:0,kFill:0,cNew:0,cEx:0,ign,dup:0,exNames:[]};
  P.list.forEach(it=>{const k=findCompte(it.nom),Lx=k?ctOf(k.id):[];it.cts=[];it.upd=[];
    it.raw.forEach(c=>{const e=ciFind(Lx,c);if(e){it.upd.push([e,c]);P.cEx++;return}
      const d=ciFind(it.cts,c);if(d){ciMerge(d,c);P.dup++;return}it.cts.push(Object.assign({},c))});
    P.cNew+=it.cts.length;
    if(!k){P.kNew++;return}
    P.kEx++;if(P.exNames.length<40)P.exNames.push(k.nom);
    if(CI_F.some(f=>{const v=it.f[f];if(!v)return false;if(f==="type")return (TYPE_RANK[v]||0)>(TYPE_RANK[k.type]||0);if(f==="notes")return !String(k.notes||"").includes(v);return !String(k[f]||"").trim()}))P.kFill++});
  return P}

function ciDraw(){const pv=$("#ciPrev");if(!pv||!CI)return;
  if(CI.done){const U=CI.done;
    pv.innerHTML='<div class="notice ci-done"><span class="grow"><b>Import terminé</b> : '+[pl(U.k.length,"compte créé","comptes créés"),pl(U.kb.length,"compte complété","comptes complétés"),pl(U.c.length,"contact ajouté","contacts ajoutés"),U.cb.length?pl(U.cb.length,"contact complété","contacts complétés"):""].filter(Boolean).join(" · ")+'. Aucune cible créée.</span>'+
      '<button class="btn" type="button" data-act="ciundo">Annuler cet import</button></div>';return}
  if(!CI.comptes.length&&!CI.contacts.length){pv.innerHTML='<div class="notice warn"><b>Rien de reconnu.</b> Il faut un onglet « Comptes » avec une colonne « Compte », ou un onglet « Contacts » avec les colonnes « Compte » et « Nom » ou « E-mail ».</div>';return}
  const P=ciPlan(),n=P.kNew+P.kFill+P.cNew;
  pv.innerHTML='<div style="display:flex;flex-direction:column;gap:10px;margin-top:6px">'+
   '<p class="hint">'+esc(CI.fname)+' · '+CI.sheets.map(esc).join(" · ")+' · '+pl(CI.comptes.length,"ligne compte","lignes comptes")+', '+pl(CI.contacts.length,"ligne contact","lignes contacts")+'</p>'+
   '<div class="imp-sum"><div><b>'+P.kNew+'</b><span class="sub">nouveau'+(P.kNew>1?'x':'')+' compte'+(P.kNew>1?'s':'')+'</span></div>'+
    '<div><b>'+P.kEx+'</b><span class="sub">déjà dans l\'appli'+(P.kFill?' ('+P.kFill+' à compléter)':'')+'</span></div>'+
    '<div><b>'+P.cNew+'</b><span class="sub">contact'+(P.cNew>1?'s':'')+' à ajouter</span></div>'+
    '<div><b>'+P.cEx+'</b><span class="sub">contact'+(P.cEx>1?'s':'')+' déjà présent'+(P.cEx>1?'s':'')+'</span></div></div>'+
   ((P.ign||P.dup)?'<p class="hint">'+[P.ign?pl(P.ign,"ligne ignorée","lignes ignorées")+' (sans compte, ou contact sans nom, e-mail ni téléphone)':"",P.dup?pl(P.dup,"contact en double","contacts en double")+' dans le fichier (même e-mail ou même nom dans le compte : regroupés)':""].filter(Boolean).join(" · ")+'.</p>':'')+
   (P.exNames.length?'<details><summary>Comptes déjà présents (complétés, champs vides seulement)</summary><p class="hint">'+P.exNames.map(esc).join(" · ")+(P.kEx>P.exNames.length?' … et '+(P.kEx-P.exNames.length)+' autres':'')+'</p></details>':'')+
   '<p class="hint">Aucune cible ni campagne n\'est créée. Les nouveaux comptes sont de type « '+esc("Prospect")+' » sauf si le fichier précise un type ; un compte existant garde le sien (un client reste client).</p>'+
   '<div class="bar"><button class="btn primary" type="button" data-act="cigo"'+(n?'':' disabled')+'>'+(n?'Importer '+pl(P.kNew+P.kEx,"compte")+' et '+pl(P.cNew,"contact"):'Rien de nouveau à importer')+'</button></div></div>'}

async function ciFile(e){const f=e.target.files[0];if(!f)return;const pv=$("#ciPrev");CI=null;pv.innerHTML='<p class="hint">Lecture du fichier…</p>';
  try{CI=await ciLoad(f);ciDraw()}catch(err){console.error("ci",err);pv.innerHTML='<div class="notice warn"><b>Fichier illisible.</b> Enregistrez-le au format .xlsx ou .csv et réessayez.</div>'}}

function ciApply(){if(!CI||CI.done)return;if(!S.writable){toast("Modification impossible ici : ouvrez Registre en pleine page.");return}
  const P=ciPlan(),k0=grpIds(),U={k:[],c:[],kb:[],cb:[]};
  P.list.forEach(it=>{let k=findCompte(it.nom);
    if(!k){const init={origine:"contacts"};CI_F.forEach(f=>{if(it.f[f])init[f]=it.f[f]});if(!init.type)init.type="Prospect";k=ensureCompte(it.nom,init);U.k.push(k.id)}
    else{const b=clone(k);let ch=false;
      CI_F.forEach(f=>{const v=it.f[f];if(!v)return;
        if(f==="type"){if((TYPE_RANK[v]||0)>(TYPE_RANK[k.type]||0)){k.type=v;ch=true}return}
        if(f==="notes"){if(!String(k.notes||"").includes(v)){k.notes=k.notes?k.notes+"\n"+v:v;ch=true}return}
        if(!String(k[f]||"").trim()){k[f]=v;ch=true}});
      if(ch){k.majLe=now();U.kb.push(b)}}
    it.upd.forEach(([e,c])=>{const b=clone(e);if(ciMerge(e,c)){e.majLe=now();U.cb.push(b)}});
    it.cts.forEach(c=>{const n0=ctOf(k.id).length,n=ensureContact(k.id,c);if(ctOf(k.id).length>n0){if(c.notes)n.notes=c.notes;U.c.push(n.id)}})});
  bump();commit();grpAfterImport(k0);CI.done=U;ciDraw();
  toast(pl(U.k.length,"compte créé","comptes créés")+" · "+pl(U.c.length,"contact ajouté","contacts ajoutés"))}

function ciUndo(){const U=CI&&CI.done;if(!U)return;
  const kc=new Set(U.k),cc=new Set(U.c);
  S.contacts=S.contacts.filter(c=>!cc.has(c.id));S.comptes=S.comptes.filter(k=>!kc.has(k.id));
  U.kb.forEach(b=>{const i=S.comptes.findIndex(x=>x.id===b.id);if(i>=0)S.comptes[i]=b});
  U.cb.forEach(b=>{const i=S.contacts.findIndex(x=>x.id===b.id);if(i>=0)S.contacts[i]=b});
  bump();commit();CI.done=null;ciDraw();toast("Import annulé")}

/* Un fichier « Comptes / Contacts » choisi dans l'import des cibles : on propose le bon import, fichier déjà chargé */
let CI_NEXT=null;
async function ciSuggest(f){CI_NEXT=null;if(!f)return;
  try{const r=await ciLoad(f);if(!r.named||!(r.comptes.length||r.contacts.length))return;CI_NEXT=r;const pv=$("#imPrev");if(!pv)return;
    pv.innerHTML='<div class="notice warn ci-done"><span class="grow"><b>Ce fichier est une base de comptes et contacts</b>, pas une liste de cibles ('+pl(r.comptes.length,"compte")+', '+pl(r.contacts.length,"contact")+'). Il s\'importe par Comptes › Importer › « Comptes et contacts (sans campagne) », sans créer de cible.</span>'+
      '<button class="btn primary" type="button" data-act="ciopen">Ouvrir cet import</button></div>'}catch(e){}}
function ciOpenNext(){const r=CI_NEXT;CI_NEXT=null;if(!r)return;histoMenu();CI=r;ciDraw();const pv=$("#ciPrev");if(pv)pv.scrollIntoView({block:"center"})}

document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("button");if(!t)return;const a=t.dataset.act;
  if(a==="ciopen"){ciOpenNext();return}
  if(a==="cigo"){t.disabled=true;t.textContent="Import en cours…";setTimeout(ciApply,30);return}
  if(a==="ciundo"){ciUndo();return}});
