/* Registre · CSC — Sélection de contacts pour un mailing : filtrer les comptes (typologie, sous-typologie, famille, type,
   département, agence, recherche) et leurs contacts (fonction), puis copier toutes les adresses d'un coup
   ou créer une liste dans le Mailing (envoi, relances, historique des comptes).
   Ouvert depuis la page Mailing (tous les comptes) ou depuis la liste Comptes (les comptes affichés).
   Chargé avant 18-demarrage.js (toujours en dernier) : partage les déclarations des fichiers précédents. */
"use strict";

const MSNONE="\u0000";   /* valeur « Sans typologie » dans les cases */
let MS=null;
const msMail=s=>{const m=/[^\s@;,<>()"']+@[^\s@;,<>()"']+\.[a-z]{2,}/i.exec(String(s||""));return m?m[0]:""};
const msMonth=()=>new Date().toLocaleDateString("fr-FR",{month:"long",year:"numeric"});

function msOpen(base,baseLbl){if(MODAL)closeModal();
  MS={base:base?new Set(base):null,baseLbl:baseLbl||"",q:"",typos:new Set(),sous:new Set(),fam:"",type:"",dp:"",ag:"",fct:"",mode:"tous",exclNon:true,off:new Set(),lim:250,nom:"",nomTouched:false,copied:""};
  msDraw();setTimeout(()=>{const i=$("#msQ");if(i)i.focus({preventScroll:true})},40)}

/* ---------- Calcul ---------- */
/* Comptes retenus ; skip : filtre ignoré (pour compter les cases de typologie) */
function msComptes(skip){const w=nh(MS.q).split(" ").filter(Boolean);
  return S.comptes.filter(k=>{if(MS.base&&!MS.base.has(k.id))return false;
    if(skip!=="typo"&&MS.typos.size&&!MS.typos.has(k.typologie||MSNONE))return false;
    if(skip!=="typo"&&skip!=="sous"&&MS.sous.size&&!MS.sous.has(k.sousTypo||MSNONE))return false;
    if(MS.fam&&famOf(k)!==MS.fam)return false;if(MS.type&&k.type!==MS.type)return false;
    if(MS.dp&&k.dept!==MS.dp)return false;if(MS.ag&&k.agence!==MS.ag)return false;
    if(w.length){const h=nh([k.nom,grpName(k),k.ville,k.typologie,k.sousTypo,k.segment].join(" "));if(!w.every(t=>h.includes(t)))return false}
    return true})}
/* Adresses exclues dans le Mailing (colonne « Envoyer » à Non) */
const msNon=()=>{const s=new Set();if(MS.exclNon)S.mailing.forEach(m=>{if(/^non/i.test(m.envoyer||"")&&m.mail)s.add(m.mail.toLowerCase())});return s};
/* Contacts retenus : [{k,c,mail}] sans doublon d'adresse ; comptes sans adresse */
function msRows(){const K=msComptes(),fw=nh(MS.fct).split(" ").filter(Boolean),non=msNon(),seen=new Set(),rows=[],sans=[];let nNon=0;
  K.slice().sort((a,b)=>a.nom.localeCompare(b.nom,"fr")).forEach(k=>{
    let C=ctOf(k.id).map(c=>({c,mail:msMail(c.mail)})).filter(x=>x.mail);
    if(fw.length)C=C.filter(x=>{const h=nh(x.c.fonction||"");return fw.every(t=>h.includes(t))});
    if(MS.mode==="principal"&&C.length){const p=C.find(x=>x.c.principal)||C[0];C=[p]}
    let n=0;C.forEach(x=>{const lk=x.mail.toLowerCase();if(non.has(lk)){nNon++;return}if(seen.has(lk))return;seen.add(lk);rows.push({k,c:x.c,mail:x.mail});n++});
    if(!n)sans.push(k)});
  return {K,rows,sans,nNon}}
/* Cases de typologie et de sous-typologie, avec le nombre de comptes (selon les autres filtres) */
function msFacet(field,skip){const m=new Map();msComptes(skip).forEach(k=>{const v=k[field]||MSNONE;m.set(v,(m.get(v)||0)+1)});
  return [...m.entries()].sort((a,b)=>a[0]===MSNONE?1:b[0]===MSNONE?-1:a[0].localeCompare(b[0],"fr"))}
const msDefName=()=>{const t=[...MS.typos].filter(x=>x!==MSNONE);return (t.length?t.slice(0,2).join(", ")+(t.length>2?"…":""):MS.fam?FNOM[MS.fam]:MS.q.trim()?MS.q.trim():"Sélection")+" – "+msMonth()};

/* ---------- Affichage ---------- */
function msChecks(id,field,skip,sel){const F=msFacet(field,skip);
  if(!F.length||(F.length===1&&F[0][0]===MSNONE&&field==="sousTypo"))return "";
  return '<div class="ms-ck" id="'+id+'">'+F.map(([v,n])=>'<label class="'+(sel.has(v)?'on':'')+'"><input type="checkbox" data-msck="'+field+'" value="'+esc(v)+'"'+(sel.has(v)?' checked':'')+'><span class="grow">'+esc(v===MSNONE?"Sans typologie":v)+'</span><span class="num sub">'+n+'</span></label>').join("")+'</div>'}
function msFilters(){const uniq=f=>[...new Set(S.comptes.filter(k=>!MS.base||MS.base.has(k.id)).map(f).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"fr"));
  const st=msChecks("msSous","sousTypo","sous",MS.sous);
  return '<div class="field-s"><label for="msQ">Rechercher un compte</label><input type="search" id="msQ" value="'+esc(MS.q)+'" placeholder="Ex. : mairie, ville de, Melun…" autocomplete="off"></div>'+
    '<div class="f"><span class="lbl">Typologie'+(MS.typos.size?' <button type="button" class="more ms-clr" data-msclr="typos">Tout effacer</button>':'')+'</span>'+(msChecks("msTypo","typologie","typo",MS.typos)||'<p class="hint">Aucune typologie renseignée.</p>')+'</div>'+
    (st?'<div class="f"><span class="lbl">Sous-typologie'+(MS.sous.size?' <button type="button" class="more ms-clr" data-msclr="sous">Tout effacer</button>':'')+'</span>'+st+'</div>':'')+
    '<div class="field-s"><label for="msFam">Famille</label><select id="msFam" data-msf="fam"><option value="">Toutes</option>'+FAMILLES.map(([c,n])=>'<option value="'+c+'"'+(MS.fam===c?' selected':'')+'>'+esc(n)+'</option>').join("")+'</select></div>'+
    '<div class="field-s"><label for="msTy">Type de compte</label><select id="msTy" data-msf="type"><option value="">Tous</option>'+TYPES.map(t=>'<option'+(MS.type===t?' selected':'')+'>'+esc(t)+'</option>').join("")+'</select></div>'+
    '<div class="row"><div class="field-s"><label for="msDp">Département</label><select id="msDp" data-msf="dp"><option value="">Tous</option>'+DEPTS.filter(([d])=>d===MS.dp||S.comptes.some(k=>k.dept===d&&(!MS.base||MS.base.has(k.id)))).map(([d,n])=>'<option value="'+d+'"'+(MS.dp===d?' selected':'')+'>'+esc(d+" · "+n)+'</option>').join("")+'</select></div>'+
    '<div class="field-s"><label for="msAg">Agence</label><select id="msAg" data-msf="ag"><option value="">Toutes</option>'+uniq(k=>k.agence).map(a=>'<option'+(MS.ag===a?' selected':'')+'>'+esc(a)+'</option>').join("")+'</select></div></div>'+
    '<div class="field-s"><label for="msFct">Fonction du contact contient</label><input type="search" id="msFct" value="'+esc(MS.fct)+'" placeholder="Ex. : services techniques, DGS, patrimoine…" autocomplete="off"></div>'+
    '<div class="f"><span class="lbl">Contacts par compte</span><div class="seg" role="group" aria-label="Contacts par compte"><button type="button" data-msmode="tous" aria-pressed="'+(MS.mode==="tous")+'">Tous</button><button type="button" data-msmode="principal" aria-pressed="'+(MS.mode==="principal")+'">Le principal</button></div></div>'+
    (S.mailing.some(m=>/^non/i.test(m.envoyer||""))?'<label class="toggle"><input type="checkbox" id="msNon"'+(MS.exclNon?' checked':'')+'> Exclure les adresses marquées « Non » dans le Mailing</label>':'')}
function msResults(){const R=msRows(),sel=R.rows.filter(x=>!MS.off.has(x.c.id)),shown=R.rows.slice(0,MS.lim);
  const nk=new Set(sel.map(x=>x.k.id)).size;
  let h='<div class="ms-sum"><div><b class="num">'+R.K.length+'</b><span class="sub">compte'+(R.K.length>1?'s':'')+'</span></div><div><b class="num">'+sel.length+'</b><span class="sub">adresse'+(sel.length>1?'s':'')+' sélectionnée'+(sel.length>1?'s':'')+(sel.length<R.rows.length?' sur '+R.rows.length:'')+'</span></div>'+
    '<div><b class="num'+(R.sans.length?' warn':'')+'">'+R.sans.length+'</b><span class="sub">compte'+(R.sans.length>1?'s':'')+' sans adresse</span></div></div>';
  if(sel.length>400)h+='<p class="notice warn ms-w">Au-delà de 400 destinataires environ, la messagerie peut refuser l\'envoi : créez la liste, puis envoyez par lots (filtre Agence ou Département dans le Mailing).</p>';
  if(!R.rows.length)h+='<div class="empty"><h3>Aucun contact avec une adresse e-mail</h3><p>'+(R.K.length?'Les '+pl(R.K.length,"compte")+' retenus n\'ont pas de contact avec e-mail'+(MS.fct.trim()?' pour cette fonction':'')+'. Complétez les fiches, ou élargissez les filtres.':'Aucun compte ne correspond : retirez un filtre.')+'</p></div>';
  else{let cur="";h+='<div class="ms-bar"><button type="button" class="more" data-msall="1">Tout cocher</button><button type="button" class="more" data-msall="0">Tout décocher</button><span class="grow"></span><span class="sub">'+pl(nk,"compte")+' dans la sélection</span></div><div class="ms-l">';
    shown.forEach(x=>{if(x.k.id!==cur){if(cur)h+='</div>';cur=x.k.id;h+='<div class="ms-k"><div class="ms-kh"><button type="button" class="lk strong" data-kopen="'+esc(x.k.id)+'">'+esc(x.k.nom)+'</button><span class="sub">'+esc([x.k.typologie,x.k.sousTypo&&x.k.sousTypo!==x.k.typologie?x.k.sousTypo:"",x.k.ville].filter(Boolean).join(" · "))+'</span></div>'}
      const on=!MS.off.has(x.c.id);
      h+='<label class="ms-c'+(on?'':' off')+'"><input type="checkbox" data-msc="'+esc(x.c.id)+'"'+(on?' checked':'')+'><span class="ms-cn">'+(x.c.principal?'<span class="star" title="Contact principal">★</span>':'')+esc(x.c.nom||"Sans nom")+(x.c.fonction?'<span class="sub"> · '+esc(x.c.fonction)+'</span>':'')+'</span><span class="ms-cm">'+esc(x.mail)+'</span></label>'});
    h+='</div></div>'+(R.rows.length>shown.length?'<div class="bar"><button class="btn" type="button" data-msmore="1">Afficher '+Math.min(250,R.rows.length-shown.length)+' de plus</button><span class="sub">'+shown.length+' sur '+R.rows.length+'</span></div>':'')}
  if(R.sans.length)h+='<details class="ms-sans"><summary>'+pl(R.sans.length,"compte retenu sans adresse e-mail","comptes retenus sans adresse e-mail")+(R.nNon?' · '+pl(R.nNon,"adresse exclue","adresses exclues")+' (« Non » dans le Mailing)':'')+'</summary><div class="ms-sl">'+R.sans.slice(0,200).map(k=>'<button type="button" class="lk" data-kopen="'+esc(k.id)+'">'+esc(k.nom)+'</button>').join("")+(R.sans.length>200?'<span class="sub">… et '+(R.sans.length-200)+' autres</span>':'')+'</div></details>';
  return h}
function msFoot(){const n=msRows().rows.filter(x=>!MS.off.has(x.c.id)).length;if(!MS.nomTouched)MS.nom=msDefName();
  return '<label class="ms-nom"><span class="lbl">Nom de la liste</span><input type="text" id="msNom" value="'+esc(MS.nom)+'"></label><span class="grow"></span>'+
    '<button class="btn" type="button" data-act="mclose">Fermer</button><button class="btn" type="button" data-msgo="copy"'+(n?'':' disabled')+' title="Pour le champ Cci de votre messagerie">Copier '+pl(n,"adresse","adresses")+'</button>'+
    '<button class="btn primary" type="button" data-msgo="list"'+(n?'':' disabled')+' title="Ajoute ces contacts au Mailing : envoi, relances et historique des comptes">Créer la liste de mailing</button>'}
function msDraw(){
  showModal(mHead("Mailing","Sélectionner des contacts")+
    '<div class="db"><div class="ms-grid"><aside class="ms-f" id="msF">'+(MS.base?'<div class="ms-base"><span>'+esc(MS.baseLbl)+'</span><button type="button" class="more" data-msbase="all">Partir de tous les comptes</button></div>':'')+msFilters()+'</aside>'+
    '<section class="ms-r" id="msR">'+msResults()+'</section></div></div>'+
    '<div class="df ms-df" id="msD">'+msFoot()+'</div>',"ms");
  modalBig()}
function msRefresh(filters){const f=$("#msF"),r=$("#msR"),d=$("#msD");if(!MS||!r)return;
  if(filters&&f){const ae=document.activeElement,aid=ae&&ae.id,top=f.scrollTop,pos=ae&&ae.selectionStart;
    f.innerHTML=(MS.base?'<div class="ms-base"><span>'+esc(MS.baseLbl)+'</span><button type="button" class="more" data-msbase="all">Partir de tous les comptes</button></div>':'')+msFilters();f.scrollTop=top;
    if(aid){const n=document.getElementById(aid);if(n){n.focus({preventScroll:true});try{if(pos!=null)n.setSelectionRange(pos,pos)}catch(_){}}}}
  r.innerHTML=msResults();if(d){const nom=$("#msNom");if(nom&&MS.nomTouched)MS.nom=nom.value;d.innerHTML=msFoot()}}

/* ---------- Copier, créer la liste ---------- */
async function msCopy(){const sel=msRows().rows.filter(x=>!MS.off.has(x.c.id));if(!sel.length)return;
  const txt=sel.map(x=>x.mail).join("; ");
  try{await navigator.clipboard.writeText(txt);toast(pl(sel.length,"adresse copiée","adresses copiées")+" : collez-les dans le champ Cci de votre mail")}
  catch(e){const r=$("#msR");if(r){r.insertAdjacentHTML("afterbegin",'<div class="notice"><textarea class="exout" id="msCopyTxt" readonly>'+esc(txt)+'</textarea><p class="hint">La copie automatique est bloquée ici : le texte est sélectionné, faites Ctrl+C.</p></div>');const t=$("#msCopyTxt");if(t){t.focus();t.select()}}}}
async function msList(){const sel=msRows().rows.filter(x=>!MS.off.has(x.c.id));if(!sel.length)return;
  const nom=(vOf("msNom")||msDefName()).trim();
  const have=new Set(S.mailing.filter(m=>m.liste===nom).map(mkey)),stamp=now(),list=[];let dup=0;
  sel.forEach(({k,c,mail})=>{const m=mnorm({id:uid(),creeLe:stamp,liste:nom,client:k.nom,typologie:k.typologie||"",famille:FNOM[famOf(k)]||"",contact:c.nom||"",mail,agence:k.agence||"",apporteur:k.apporteur||"",compteId:k.id,contactId:c.id,origine:"selection"});
    if(have.has(mkey(m))){dup++;return}have.add(mkey(m));list.push(m)});
  if(!list.length){toast("Ces contacts sont déjà tous dans la liste « "+nom+" ».");return}
  if(!(await mBulk(list)))return;
  closeModal();MUI.liste=nom;MUI.view="aenv";MUI.q="";MUI.famille="";MUI.agence="";MUI.typologie="";MUI.lim=200;showTab("mailing");
  toast("Liste « "+nom+" » : "+pl(list.length,"contact ajouté","contacts ajoutés")+(dup?" · "+pl(dup,"déjà présent","déjà présents"):"")+" · Copier les adresses, puis marquer comme envoyés")}

/* ---------- Événements ---------- */
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-msopen],[data-msmode],[data-msall],[data-msmore],[data-msgo],[data-msclr],[data-msbase]");if(!t)return;const d=t.dataset;
  if(d.msopen!=null){if(d.msopen==="kv"){const U=UI.kv,v=KV.find(x=>x[0]===U.v)||KV[0],L=kBase().filter(v[2]);msOpen(L.map(k=>k.id),pl(L.length,"compte affiché","comptes affichés")+" dans Comptes (vue « "+v[1]+" » et filtres)")}else msOpen(null);return}
  if(!MS||MODAL!=="ms")return;
  if(d.msmode!=null){MS.mode=d.msmode;MS.lim=250;msRefresh(true);return}
  if(d.msall!=null){const R=msRows().rows;if(d.msall==="1")R.forEach(x=>MS.off.delete(x.c.id));else R.forEach(x=>MS.off.add(x.c.id));msRefresh();return}
  if(d.msmore!=null){MS.lim+=250;msRefresh();return}
  if(d.msclr!=null){MS[d.msclr].clear();if(d.msclr==="typos")MS.sous.clear();MS.lim=250;msRefresh(true);return}
  if(d.msbase!=null){MS.base=null;MS.baseLbl="";msRefresh(true);return}
  if(d.msgo==="copy"){msCopy();return}
  if(d.msgo==="list"){msList();return}});
document.addEventListener("change",e=>{const t=e.target;if(!MS||MODAL!=="ms"||!t)return;
  if(t.dataset.msck!=null){const s=t.dataset.msck==="typologie"?MS.typos:MS.sous;t.checked?s.add(t.value):s.delete(t.value);MS.lim=250;msRefresh(true);return}
  if(t.dataset.msf!=null){MS[t.dataset.msf]=t.value;MS.lim=250;msRefresh(true);return}
  if(t.id==="msNon"){MS.exclNon=t.checked;msRefresh();return}
  if(t.dataset.msc!=null){t.checked?MS.off.delete(t.dataset.msc):MS.off.add(t.dataset.msc);const l=t.closest(".ms-c");if(l)l.classList.toggle("off",!t.checked);
    const d=$("#msD");if(d){const nom=$("#msNom");if(nom&&MS.nomTouched)MS.nom=nom.value;d.innerHTML=msFoot()}
    const s=document.querySelector("#msR .ms-sum");if(s){const R=msRows(),n=R.rows.filter(x=>!MS.off.has(x.c.id)).length;s.children[1].innerHTML='<b class="num">'+n+'</b><span class="sub">adresse'+(n>1?'s':'')+' sélectionnée'+(n>1?'s':'')+(n<R.rows.length?' sur '+R.rows.length:'')+'</span>'}}});
let msT=null;
document.addEventListener("input",e=>{const t=e.target;if(!MS||MODAL!=="ms"||!t)return;
  if(t.id==="msQ"||t.id==="msFct"){MS[t.id==="msQ"?"q":"fct"]=t.value;MS.lim=250;clearTimeout(msT);msT=setTimeout(()=>msRefresh(true),180);return}
  if(t.id==="msNom"){MS.nom=t.value;MS.nomTouched=true}});
