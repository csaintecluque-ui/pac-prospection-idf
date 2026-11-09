/* Registre · CSC — Mailing : listes, envoi, relances, import
   Fichier 7/18 : les fichiers se chargent dans l'ordre et partagent leurs déclarations. */
"use strict";

/* ---------- Mailing : liste de contacts, case « envoyé », date d'envoi, relance, commentaire ---------- */
const mOui=m=>!m.envoyer||/^oui/i.test(m.envoyer);
const MVIEWS=[
  {k:"aenv",l:"À envoyer",f:m=>!m.envoye&&mOui(m)&&!!m.mail},
  {k:"env",l:"Envoyés",f:m=>m.envoye},
  {k:"rel",l:"Relances à faire",f:m=>m.envoye&&!!m.relance&&!m.relanceFaite&&m.relance<=todayISO()},
  {k:"comp",l:"À compléter ou vérifier",f:m=>!m.envoye&&!/^non/i.test(m.envoyer)&&(!m.mail||/^à (compl|vérif)/i.test(m.envoyer))},
  {k:"excl",l:"Exclus",f:m=>/^non/i.test(m.envoyer)},
  {k:"tous",l:"Tous",f:()=>true}];
function mblank(){return {liste:"",client:"",typologie:"",famille:"",contact:"",mail:"",appel:"",accroche:"",mission:"",agence:"",apporteur:"",nbFact:"",ca:"",attention:"",envoyer:"",envoye:false,dateEnvoi:"",relance:"",relanceFaite:"",commentaire:""}}
function mnorm(x){const o=Object.assign(mblank(),x||{});o.envoye=!!o.envoye;o.mail=String(o.mail||"").trim();return o}
const mkey=m=>nh(m.client)+"|"+String(m.mail||"").trim().toLowerCase();
const MUI={view:"aenv",q:"",liste:"",famille:"",agence:"",lim:200,copied:null,showCopy:""};
const addDaysTo=(iso,n)=>{const d=new Date(iso+"T12:00:00");d.setDate(d.getDate()+n);return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())};
const relJ=()=>{const n=parseInt(S.settings.mailRelanceJ,10);return isNaN(n)?15:Math.max(0,n)};
/* Enregistrement : différé pendant la saisie, groupé pour les actions en masse */
let mT=null;const mDirty=new Map();
function mPersist(m){syncMailAction(m);bump();clearTimeout(mT);mT=setTimeout(()=>{mT=null;lsSave();renderNav()},300)}
async function mBulk(list){list.forEach(x=>{absorbMailing(x);const i=S.mailing.findIndex(y=>y.id===x.id);if(i>=0)S.mailing[i]=x;else S.mailing.push(x);syncMailAction(x)});bump();lsSave();renderNav();return true}
window.addEventListener("pagehide",()=>{if(mT&&S.mode!=="db"){clearTimeout(mT);lsSave()}});
/* Mails types : {APPEL} et {ACCROCHE} remplacés pour chaque contact */
function mTpl(m){const T=S.settings.mailTypes||[];if(!T.length)return null;const f=nh(m.famille),ty=nh(m.typologie);
  const t=(f&&T.find(x=>nh(x.famille)===f))||(ty&&T.find(x=>(x.typos||[]).some(y=>nh(y)===ty)));if(!t)return null;
  const fill=s=>String(s||"").replace(/\{APPEL\}/g,m.appel||"Bonjour,").replace(/\{ACCROCHE\}/g,m.accroche||"").replace(/[ \t]+\n/g,"\n").replace(/\n{3,}/g,"\n\n").trim();
  return {objet:fill(t.objet),corps:fill(t.corps)}}
const mMailto=(m,t)=>"mailto:"+m.mail+(t?"?subject="+encodeURIComponent(t.objet)+"&body="+encodeURIComponent(t.corps):"");
const mFold=x=>String(x||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
/* Recherche et filtres communs à toutes les vues : les mots peuvent être dans n'importe quel ordre, sans accents */
function mBase(){const words=mFold(MUI.q).split(/\s+/).filter(Boolean);
  return S.mailing.filter(m=>(!MUI.liste||m.liste===MUI.liste)&&(!MUI.famille||m.famille===MUI.famille)&&(!MUI.agence||m.agence===MUI.agence)&&
    (!words.length||(h=>words.every(w=>h.includes(w)))(mFold([m.client,m.contact,m.mail,m.commentaire,m.typologie,m.famille,m.liste,m.appel].join(" ")))))}
function mFiltered(){const v=MVIEWS.find(x=>x.k===MUI.view)||MVIEWS[0];
  return mBase().filter(v.f)
   .sort((a,b)=>MUI.view==="rel"?(a.relance||"").localeCompare(b.relance||"")||a.client.localeCompare(b.client,"fr"):MUI.view==="env"?(b.dateEnvoi||"").localeCompare(a.dateEnvoi||"")||a.client.localeCompare(b.client,"fr"):a.client.localeCompare(b.client,"fr"))}
function mRow(m){const ro=!S.writable,dis=ro?" disabled":"",late=m.envoye&&m.relance&&!m.relanceFaite&&m.relance<=todayISO(),t=mTpl(m);
  return '<tr data-mid="'+esc(m.id)+'"'+(m.envoye?' class="msent"':'')+'>'+
   '<td class="mchk"><label class="mck"><input type="checkbox" data-msent'+(m.envoye?' checked':'')+dis+'><span>'+(m.envoye?'Envoyé':'À envoyer')+'</span></label></td>'+
   '<td>'+(ro?'<div class="co">'+esc(m.client||"Sans nom")+'</div>':'<button type="button" class="mlink" data-medit="'+esc(m.id)+'" title="Modifier ce contact">'+esc(m.client||"Sans nom")+'</button>')+'<div class="sub">'+(m.compteId?'<button type="button" class="lk" data-kopen="'+esc(m.compteId)+'" style="color:var(--accent)">Fiche compte</button> · ':'')+esc([m.typologie,m.agence].filter(Boolean).join(" · "))+'</div>'+
    (m.envoyer&&!mOui(m)?'<div class="mflag">'+esc(m.envoyer)+'</div>':'')+(m.attention?'<div class="mflag warn">'+esc(m.attention)+'</div>':'')+'</td>'+
   '<td><div>'+esc(m.contact||"—")+'</div>'+(m.mail?'<a class="dl" href="mailto:'+esc(m.mail)+'" target="_blank" rel="noopener">'+esc(m.mail)+'</a>':'<span class="sub">Pas d\'e-mail</span>')+'</td>'+
   '<td><input type="date" data-mf="dateEnvoi" aria-label="Date d\'envoi" value="'+esc(m.dateEnvoi)+'"'+dis+'></td>'+
   '<td><input type="date" data-mf="relance" aria-label="Date de relance" value="'+esc(m.relance)+'"'+(late?' class="mlate"':'')+dis+'>'+(m.relanceFaite?'<div class="sub">relance faite le '+fdate(m.relanceFaite)+'</div>':'')+'</td>'+
   '<td><input type="text" data-mf="commentaire" aria-label="Commentaire" value="'+esc(m.commentaire)+'" placeholder="Réponse, rappel, suite…"'+dis+'></td>'+
   '<td class="mact">'+(late&&!ro?'<button class="btn" type="button" data-mrelok="'+esc(m.id)+'" title="Noter la relance comme faite">Relancé</button>':'')+(m.mail?'<a class="btn ghost" href="'+esc(mMailto(m,t))+'" target="_blank" rel="noopener" title="'+(t?'Ouvre le mail prêt à envoyer dans votre messagerie':'Ouvre un mail vide adressé à ce contact')+'">'+I_MAIL+'Mail</a>':'')+
    (t?'<button class="btn ghost" type="button" data-mcp title="Copier le texte du mail">Copier</button>':'')+'</td></tr>'}
function renderMKpis(){
  const M=S.mailing,cnt=k=>M.filter(MVIEWS.find(v=>v.k===k).f).length,tot=M.filter(m=>mOui(m)).length,sent=M.filter(m=>m.envoye).length;
  const k=$("#mKpis");if(k)k.innerHTML=
   '<div class="kpi"><span class="lbl">Contacts à joindre</span><span class="v">'+tot+'</span><span class="d">'+pl(M.length,"ligne")+' au total</span></div>'+
   '<div class="kpi"><span class="lbl">Envoyés</span><span class="v">'+sent+'</span><div class="meter"><b style="width:'+(tot?Math.min(100,sent/tot*100):0)+'%"></b></div></div>'+
   '<div class="kpi"><span class="lbl">Reste à envoyer</span><span class="v">'+cnt("aenv")+'</span><span class="d">'+cnt("comp")+' à compléter ou vérifier</span></div>'+
   '<div class="kpi"><span class="lbl">Relances à faire</span><span class="v">'+cnt("rel")+'</span><span class="d">date de relance atteinte</span></div>';
  const B=mBase(),cb=k=>B.filter(MVIEWS.find(v=>v.k===k).f).length;
  const v=$("#mViews");if(v)v.innerHTML=MVIEWS.map(x=>'<button type="button" class="chip" aria-pressed="'+(MUI.view===x.k)+'" data-mview="'+x.k+'">'+esc(x.l)+'<span class="n num">'+cb(x.k)+'</span></button>').join("");
}
function renderMList(){
  const w=$("#mList");if(!w)return;const rows=mFiltered(),shown=rows.slice(0,MUI.lim);
  w.innerHTML=rows.length?'<table class="mtab"><thead><tr><th>Envoi</th><th>Client</th><th>Contact</th><th>Date d\'envoi</th><th>Relance le</th><th>Commentaire</th><th></th></tr></thead><tbody>'+shown.map(mRow).join("")+'</tbody></table>'
    :(()=>{const B=mBase(),cur=MVIEWS.find(x=>x.k===MUI.view)||MVIEWS[0],other=MVIEWS.filter(x=>x.k!==MUI.view&&x.k!=="tous").map(x=>[x,B.filter(x.f).length]).filter(([,n])=>n);
      return '<div class="empty"><h3>Aucun contact dans « '+esc(cur.l)+' »'+(MUI.q.trim()?' pour « '+esc(MUI.q.trim())+' »':'')+'</h3>'+
       (other.length?'<p>Trouvé dans une autre vue :</p><div class="chips" style="justify-content:center">'+other.map(([x,n])=>'<button type="button" class="chip" data-mview="'+x.k+'">'+esc(x.l)+'<span class="n num">'+n+'</span></button>').join("")+'</div>':'<p>Changez de vue ou retirez un filtre.</p>')+'</div>'})();
  $("#mMore").innerHTML=rows.length>shown.length?'<button class="btn" type="button" data-act="mmore">Afficher '+Math.min(200,rows.length-shown.length)+' de plus</button> <span class="sub">'+shown.length+' sur '+rows.length+'</span>':(rows.length?'<span class="sub">'+pl(rows.length,"contact")+'</span>':'');
}
function renderMNote(){const n=$("#mNote");if(!n)return;const c=MUI.copied;
  if(!c){n.hidden=true;n.innerHTML="";return}
  n.hidden=false;n.className="notice";
  n.innerHTML='<div><b>'+pl(c.ids.length,"adresse copiée","adresses copiées")+'</b> : collez-les dans le champ Cci de votre mail.'+(c.ids.length>400?' <b>Attention</b> : au-delà de 400 destinataires environ, la messagerie peut refuser l\'envoi ; filtrez par liste, famille ou agence pour envoyer par lots.':'')+'</div>'+
   (MUI.showCopy?'<textarea class="exout" id="mCopyTxt" readonly>'+esc(MUI.showCopy)+'</textarea><p class="hint">La copie automatique est bloquée ici : le texte est sélectionné, faites Ctrl+C.</p>':'')+
   (S.writable?'<div class="bar"><span>Une fois le mail envoyé :</span><button class="btn primary" type="button" data-act="mmark">Marquer ces '+pl(c.ids.length,"contact")+' comme envoyés aujourd\'hui</button><button class="btn ghost" type="button" data-act="mnoteclose">Fermer</button></div>':'');
  const ta=$("#mCopyTxt");if(ta){ta.focus({preventScroll:true});ta.select()}}
function renderMailing(){
  const el=$("#view-mailing");if(!el)return;const M=S.mailing,ro=!S.writable;
  if(!M.length){el.innerHTML=pageH("Actions commerciales","Mailing","","")+'<div class="empty"><h3>Aucune liste de mailing</h3><p>Importez votre fichier de contacts (Excel ou CSV) : une ligne par contact, avec au minimum le client et l\'adresse e-mail. Vous pouvez aussi ajouter les contacts un par un. Vous suivez ensuite chaque envoi, sa date, la relance et vos commentaires.</p>'+(ro?'':'<div class="bar" style="justify-content:center"><button class="btn primary" type="button" data-act="mimport">Importer une liste</button><button class="btn" type="button" data-act="mnew">Ajouter un contact à la main</button></div>')+'</div>';return}
  const uniq=k=>[...new Set(M.map(m=>m[k]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"fr"));
  const sel=(id,k,lab)=>'<div class="field-s"><label for="'+id+'">'+lab+'</label><select id="'+id+'" data-mflt="'+k+'"><option value="">Toutes</option>'+uniq(k).map(o=>'<option'+(MUI[k]===o?' selected':'')+'>'+esc(o)+'</option>').join("")+'</select></div>';
  el.innerHTML=pageH("Actions commerciales","Mailing","Chaque mail envoyé apparaît dans l\'historique du compte ; les relances dues remontent dans le tableau de bord et l\'agenda.","")+'<div class="kpis" id="mKpis"></div>'+
   '<div class="bar"><div class="chips grow" id="mViews" aria-label="Vues du mailing"></div>'+
    (ro?'':'<button class="btn ghost" type="button" data-act="mimport">Importer une liste</button>')+
    '<button class="btn ghost" type="button" data-act="mcopy" title="Copier les adresses des contacts affichés qui n\'ont pas encore reçu le mail">Copier les adresses</button>'+
    '<button class="btn ghost" type="button" data-act="mexport">Exporter / Excel</button>'+
    (ro?'':'<button class="btn primary" type="button" data-act="mnew"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 3v10M3 8h10"/></svg>Nouveau contact</button>')+'</div>'+
   '<div class="filters"><div class="field-s"><label for="mQ">Rechercher</label><input type="search" id="mQ" value="'+esc(MUI.q)+'" placeholder="Client, contact, e-mail, commentaire…"></div>'+
    sel("mFl","liste","Liste")+sel("mFf","famille","Famille")+sel("mFa","agence","Agence")+
    '<div class="field-s"><label for="mRj">Relance après (jours)</label><input type="number" id="mRj" min="0" step="1" class="num" value="'+relJ()+'"'+(ro?' disabled':'')+'></div></div>'+
   '<div id="mNote" class="notice" hidden></div>'+
   '<div class="list-wrap" id="mList"></div><div class="bar" id="mMore"></div>'+
   '<p class="hint">Cocher « Envoyé » inscrit la date du jour et une date de relance '+relJ()+' jours plus tard ; les deux restent modifiables. Le compte client est créé si besoin et le mail s\'ajoute à l\'historique du compte. Le bouton Mail ouvre votre messagerie avec le mail type de la famille du client, quand le fichier importé en contient.</p>';
  renderMKpis();renderMList();renderMNote();
}
/* Actions sur une ligne */
function mById(tr){return tr&&S.mailing.find(x=>x.id===tr.dataset.mid)}
function mRefreshRow(tr,m){const tmp=document.createElement("tbody");tmp.innerHTML=mRow(m);tr.replaceWith(tmp.firstChild)}
function mSetSent(m,on){if(on){m.envoye=true;if(!m.dateEnvoi)m.dateEnvoi=todayISO();if(!m.relance&&relJ())m.relance=addDaysTo(m.dateEnvoi,relJ())}else{m.envoye=false;m.dateEnvoi="";m.relance="";m.relanceFaite=""}}
document.addEventListener("change",e=>{
  const t=e.target,tr=t.closest&&t.closest("#view-mailing tr[data-mid]");
  if(t.id==="mRj"){S.settings.mailRelanceJ=Math.max(0,parseInt(t.value,10)||0);saveSettings();return}
  if(t.id==="me-sent"){const de=$("#me-de"),rl=$("#me-rel");if(t.checked){if(!de.value)de.value=todayISO();if(!rl.value&&relJ())rl.value=addDaysTo(de.value,relJ())}else{de.value="";rl.value=""}return}
  if(t.id==="me-de"){if(t.value){$("#me-sent").checked=true;const rl=$("#me-rel");if(!rl.value&&relJ())rl.value=addDaysTo(t.value,relJ())}return}
  if(t.dataset&&t.dataset.mflt!=null){MUI[t.dataset.mflt]=t.value;MUI.lim=200;renderMKpis();renderMList();return}
  if(!tr||!S.writable)return;const m=mById(tr);if(!m)return;
  if(t.matches("[data-msent]")){mSetSent(m,t.checked);mRefreshRow(tr,m);mPersist(m);renderMKpis();return}
  if(t.dataset.mf){const f=t.dataset.mf;m[f]=t.value.trim?t.value.trim():t.value;
    if(f==="dateEnvoi"&&m.dateEnvoi&&!m.envoye){m.envoye=true;if(!m.relance&&relJ())m.relance=addDaysTo(m.dateEnvoi,relJ())}
    if(f!=="commentaire")mRefreshRow(tr,m);mPersist(m);renderMKpis()}
});
document.addEventListener("input",e=>{const t=e.target;
  if(t.id==="mQ"){MUI.q=t.value;MUI.lim=200;renderMKpis();renderMList();return}
  if(t.id==="me-fam"||t.id==="me-typo"||t.id==="me-appel"){mTplHint();return}
  if(t.id==="me-client"||t.id==="me-mail"){mDupCheck();return}
  if(t.dataset&&t.dataset.mf==="commentaire"&&S.writable){const m=mById(t.closest("tr[data-mid]"));if(m){m.commentaire=t.value;mPersist(m)}}
});
async function mCopyAddresses(){
  const rows=mFiltered().filter(m=>!m.envoye&&m.mail&&mOui(m)),seen=new Set(),ids=[],mails=[];
  rows.forEach(m=>{const k=m.mail.toLowerCase();ids.push(m.id);if(!seen.has(k)){seen.add(k);mails.push(m.mail)}});
  if(!mails.length){toast("Aucune adresse à copier : tous les contacts affichés ont déjà reçu le mail.");return}
  const txt=mails.join("; ");MUI.copied={ids};MUI.showCopy="";
  try{await navigator.clipboard.writeText(txt)}catch(e){MUI.showCopy=txt}
  renderMNote();if(!MUI.showCopy)toast(pl(mails.length,"adresse copiée","adresses copiées"));
}
async function mMarkCopied(){const c=MUI.copied;if(!c)return;const list=[];
  c.ids.forEach(id=>{const m=S.mailing.find(x=>x.id===id);if(m&&!m.envoye){mSetSent(m,true);list.push(m)}});
  if(await mBulk(list)){MUI.copied=null;MUI.showCopy="";renderMailing();toast(pl(list.length,"contact marqué","contacts marqués")+" comme envoyé"+(list.length>1?"s":""))}}
/* Ajout ou modification d'un contact à la main */
let ME=null,meNew=false,meDel=false;
function mEditMenu(id){
  const src=id?S.mailing.find(x=>x.id===id):null;meNew=!src;meDel=false;
  ME=src?clone(src):Object.assign(mblank(),{id:uid(),creeLe:new Date().toISOString(),envoyer:"Oui",liste:MUI.liste||"Ajouts manuels"});
  mDrawEdit();$("#scrim").hidden=false;$("#drawer").hidden=false;
  setTimeout(()=>{const f=$("#me-client");if(f&&meNew)f.focus({preventScroll:true})},30)}
function mDrawEdit(){
  const m=ME,uniq=k=>[...new Set(S.mailing.map(x=>x[k]).concat(k==="famille"?(S.settings.mailTypes||[]).map(t=>t.famille):[]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"fr"));
  const dl=(id,k)=>'<datalist id="'+id+'">'+uniq(k).map(v=>'<option value="'+esc(v)+'">').join("")+'</datalist>';
  const inp=(id,k,lab,extra)=>'<div class="f"><label class="lbl" for="'+id+'">'+lab+'</label><input type="text" id="'+id+'" data-me="'+k+'" value="'+esc(m[k])+'"'+(extra||"")+'></div>';
  const ENV=["Oui","À compléter","À vérifier","Non – exclu du mailing"];
  $("#drawer").innerHTML='<div class="dh"><div class="grow"><span class="lbl">'+(meNew?"Nouveau contact":"Contact du mailing")+'</span><h2 id="dTitle">'+esc(m.client||"Client à renseigner")+'</h2></div><button class="btn ghost" type="button" data-act="close">Fermer</button></div>'+
  '<div class="db"><div id="meDup" class="notice warn" hidden></div><form id="meForm" onsubmit="return false">'+
   '<fieldset><legend>Contact</legend>'+
    '<div class="f"><label class="lbl" for="me-client">Client <span class="req">*</span></label><input type="text" id="me-client" data-me="client" value="'+esc(m.client)+'"></div>'+
    '<div class="row">'+inp("me-contact","contact","Contact",' placeholder="NOM Prénom"')+'<div class="f"><label class="lbl" for="me-mail">E-mail</label><input type="email" id="me-mail" data-me="mail" value="'+esc(m.mail)+'" placeholder="prenom.nom@societe.fr"></div></div>'+
    '<div class="row">'+inp("me-typo","typologie","Typologie",' list="meTy"')+inp("me-fam","famille","Famille",' list="meFa"')+'</div>'+dl("meTy","typologie")+dl("meFa","famille")+
    '<div class="row">'+inp("me-ag","agence","Agence",' list="meAg"')+inp("me-app","apporteur","Apporteur",' list="meAp"')+'</div>'+dl("meAg","agence")+dl("meAp","apporteur")+
    '<div class="f"><label class="lbl" for="me-liste">Liste</label><input type="text" id="me-liste" data-me="liste" list="meLi" value="'+esc(m.liste)+'"></div>'+dl("meLi","liste")+
   '</fieldset>'+
   '<fieldset style="margin-top:18px"><legend>Mail</legend>'+
    '<div class="row"><div class="f"><label class="lbl" for="me-env">Envoyer ?</label><select id="me-env" data-me="envoyer">'+opts(ENV,m.envoyer)+'</select></div>'+inp("me-appel","appel","Formule d'appel",' placeholder="Bonjour Prénom Nom,"')+'</div>'+
    '<div class="f"><label class="lbl" for="me-acc">Accroche</label><textarea id="me-acc" data-me="accroche" rows="2" placeholder="Nous avons eu le plaisir d\'intervenir pour vous en …">'+esc(m.accroche)+'</textarea></div>'+
    inp("me-att","attention","Point d'attention")+
    '<p class="hint" id="meTpl"></p>'+
   '</fieldset>'+
   '<fieldset style="margin-top:18px"><legend>Suivi</legend>'+
    '<label class="toggle"><input type="checkbox" id="me-sent"'+(m.envoye?' checked':'')+'> Mail envoyé</label>'+
    '<div class="row"><div class="f"><label class="lbl" for="me-de">Date d\'envoi</label><input type="date" id="me-de" data-me="dateEnvoi" value="'+esc(m.dateEnvoi)+'"></div><div class="f"><label class="lbl" for="me-rel">Relance le</label><input type="date" id="me-rel" data-me="relance" value="'+esc(m.relance)+'"></div></div>'+
    '<div class="f"><label class="lbl" for="me-com">Commentaire</label><textarea id="me-com" data-me="commentaire" rows="3">'+esc(m.commentaire)+'</textarea></div>'+
   '</fieldset></form></div>'+
  '<div class="df">'+(meNew?'':'<button class="btn danger" type="button" data-act="medel">Supprimer</button>')+'<span class="grow"></span><button class="btn" type="button" data-act="close">Fermer</button><button class="btn primary" type="button" data-act="mesave">'+(meNew?'Ajouter le contact':'Enregistrer')+'</button></div>';
  mTplHint()}
function mDupCheck(){const n=$("#meDup");if(!ME||!n)return null;mReadEdit();
  const k=mkey(ME),mail=ME.mail.toLowerCase(),o=ME.client?S.mailing.find(x=>x.id!==ME.id&&mkey(x)===k):null,same=!o&&meNew&&mail?S.mailing.find(x=>x.id!==ME.id&&x.mail.toLowerCase()===mail):null,x=o||same;
  if(!x){n.hidden=true;n.innerHTML="";return null}
  const v=MVIEWS.find(w=>w.k!=="tous"&&w.f(x));
  n.hidden=false;n.className="notice "+(o?"warn":"");
  n.innerHTML='<div><b>'+(o?'Ce contact existe déjà':'Cette adresse est déjà dans la liste')+'</b> : '+esc(x.client)+(x.contact?' · '+esc(x.contact):'')+', liste « '+esc(x.liste||"—")+' »'+(v?', vue « '+esc(v.l)+' »':'')+(x.envoyer&&!mOui(x)?' ('+esc(x.envoyer)+')':'')+'.</div>'+
   '<div class="bar" style="margin-top:6px"><button class="btn'+(o?' primary':'')+'" type="button" data-act="meopen" data-id="'+esc(x.id)+'">Ouvrir sa fiche'+(ME.envoye||ME.commentaire?' avec ce que vous venez de saisir':'')+'</button></div>';
  return o}
function mReadEdit(){document.querySelectorAll("#meForm [data-me]").forEach(i=>{ME[i.dataset.me]=i.value.trim()});ME.envoye=$("#me-sent").checked}
function mTplHint(){const h=$("#meTpl");if(!h||!ME)return;mReadEdit();const t=mTpl(ME);
  h.textContent=t?"Mail type de la famille : « "+t.objet+" »":"Aucun mail type pour cette famille : le bouton Mail ouvrira un mail vide adressé au contact."}
async function mSaveEdit(){mReadEdit();const m=ME;
  if(!m.client){toast("Renseignez le client.");$("#me-client").focus({preventScroll:true});return}
  if(m.mail&&!/^[^\s@;,]+@[^\s@;,]+\.[^\s@;,]+$/.test(m.mail)){toast("Adresse e-mail incomplète ou mal écrite.");$("#me-mail").focus({preventScroll:true});return}
  if(mDupCheck()){toast("Ce contact existe déjà : ouvrez sa fiche, en haut du panneau.");const db=document.querySelector("#drawer .db");if(db)db.scrollTop=0;return}
  if(m.envoye){if(!m.dateEnvoi)m.dateEnvoi=todayISO();if(!m.relance&&relJ())m.relance=addDaysTo(m.dateEnvoi,relJ())}else{m.dateEnvoi="";m.relance=""}
  const saved=mnorm(m);if(!(await mBulk([saved])))return;
  const wasNew=meNew;ME=null;closeDrawer();render();
  const v=MVIEWS.find(x=>x.k===MUI.view)||{};
  toast((wasNew?"Contact ajouté":"Contact enregistré")+(mFiltered().some(x=>x.id===saved.id)?"":" · hors de la vue « "+v.l+" »"));
}
async function mDeleteEdit(btn){
  if(!meDel){meDel=true;btn.classList.add("armed");btn.textContent="Confirmer la suppression";return}
  const id=ME.id;
  if(S.mode==="db"){try{await S.db.collection("mailing").doc(id).delete()}catch(e){dbErr(e);return}}else{S.mailing=S.mailing.filter(x=>x.id!==id);lsSave()}
  ME=null;closeDrawer();render();toast("Contact supprimé")}
/* Import d'une liste : en-têtes cherchés dans les premières lignes, un contact = un client + une adresse */
const MALIAS={client:["client tiers","client","tiers","compte","societe","raison sociale","entreprise"],typologie:["typologie","type de client"],famille:["famille"],
  contact:["contact","contact principal","interlocuteur"],prenom:["prenom"],nom:["nom","nom de famille"],
  mail:["e mail","email","mail","courriel","adresse mail","adresse e mail","e mail contact principal","e mail contact","mail contact"],
  appel:["formule d appel"],accroche:["accroche"],mission:["derniere mission facturee","derniere mission devis","derniere mission"],
  agence:["agence principale","agence"],apporteur:["apporteur principal","apporteur"],nbFact:["nb factures","nb factures 2025","nb factures 2026"],
  ca:["ca ht 2026","ca ht facture 2025","ca ht facture 2026","ca ht","ca"],attention:["point d attention"],envoyer:["envoyer"],statut:["statut"],
  envoye:["envoye","mail envoye"],dateEnvoi:["date d envoi","envoye le"],relance:["date de relance","relance le","relance"],commentaire:["commentaire","commentaires"],liste:["liste"]};
const MIDX={};Object.entries(MALIAS).forEach(([k,a])=>a.forEach(x=>{if(!MIDX[x])MIDX[x]=k}));
function mParseSheet(rows,listeName){
  let h=-1,map=null;
  for(let i=0;i<Math.min(rows.length,12);i++){const mp=Array.from(rows[i],v=>MIDX[nh(cellVal(v))]||null);if(mp.includes("client")&&mp.includes("mail")){h=i;map=mp;break}}
  if(h<0)return null;
  const recs=[];let withMail=0,mailCells=0;
  for(let r=h+1;r<rows.length;r++){const row=rows[r],o={};
    map.forEach((k,i)=>{if(!k)return;let v=cellVal(row[i]);if(v==null||v==="")return;
      if(k==="mail"){v=String(v).trim();mailCells++;if(!v.includes("@")||o.mail)return}
      if(o[k]==null||o[k]==="")o[k]=v});
    if(!o.client&&!o.mail)continue;
    const s=k=>o[k]==null?"":String(o[k] instanceof Date?toISO(o[k]):o[k]).trim();
    const m=mnorm({liste:s("liste")||listeName,client:s("client"),typologie:s("typologie"),famille:s("famille"),contact:s("contact")||[s("prenom"),s("nom")].filter(Boolean).join(" "),mail:s("mail"),
      appel:s("appel"),accroche:s("accroche"),mission:s("mission"),agence:s("agence"),apporteur:s("apporteur"),nbFact:s("nbFact"),ca:s("ca"),attention:s("attention"),envoyer:s("envoyer"),
      commentaire:s("commentaire")||s("statut"),dateEnvoi:toISO(o.dateEnvoi),relance:toISO(o.relance)});
    if(o.envoye!=null&&/^(oui|x|1|vrai|true|envoy)/i.test(String(o.envoye).trim()))m.envoye=true;if(m.dateEnvoi)m.envoye=true;
    if(m.mail)withMail++;recs.push(m)}
  return {recs,withMail,hasEnvoyer:map.includes("envoyer")};
}
function mParseTypes(rows){
  for(let i=0;i<Math.min(rows.length,12);i++){const hd=Array.from(rows[i],v=>nh(cellVal(v)));const fi=hd.indexOf("famille"),oi=hd.indexOf("objet"),ci=hd.findIndex(x=>x==="corps du mail"||x==="corps"),ti=hd.findIndex(x=>x.startsWith("typologies"));
    if(fi<0||oi<0||ci<0)continue;const out=[];
    for(let r=i+1;r<rows.length;r++){const g=k=>{const v=cellVal(rows[r][k]);return v==null?"":String(v)};if(!g(fi)||!g(ci))continue;
      out.push({famille:g(fi).trim(),typos:ti>=0?g(ti).split(g(ti).includes(";")?/;/:/[;,]/).map(x=>x.trim()).filter(Boolean):[],objet:g(oi).trim(),corps:g(ci)})}
    return out.length?out:null}
  return null}
let MIMP=null;
function mImportMenu(){
  const d=$("#drawer");MIMP=null;
  d.innerHTML='<div class="dh"><div class="grow"><span class="lbl">Mailing</span><h2 id="dTitle">Importer une liste de mailing</h2></div><button class="btn ghost" type="button" data-act="close">Fermer</button></div>'+
  '<div class="db"><p class="hint">Un fichier Excel (.xlsx) ou CSV : une ligne par contact, avec au minimum le client et l\'adresse e-mail. Les titres de colonnes sont reconnus même sous un bandeau de titre. Les onglets « Mails types » (famille, objet, corps du mail) donnent le texte prêt à envoyer.</p>'+
  '<p class="hint"><b>Pas de doublon :</b> un contact déjà présent (même client, même e-mail) n\'est pas ajouté une deuxième fois. Ses informations sont mises à jour et son suivi (envoi, dates, commentaire) est conservé.</p>'+
  '<input type="file" id="mFile" accept=".xlsx,.csv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv">'+
  (IN_FRAME?'<p class="hint">Dans Notion, cliquez sur le bouton plutôt que de faire glisser le fichier.</p>':'')+
  '<div id="mPrev"></div></div>';
  $("#scrim").hidden=false;d.hidden=false;
  $("#mFile").onchange=async e=>{const f=e.target.files[0];if(!f)return;const pv=$("#mPrev");pv.innerHTML='<p class="hint">Lecture du fichier…</p>';
    try{const book=await openBook(f),sheets=[];let types=null;
      for(const sh of book.sheets){if(sh.state!=="visible"&&book.sheets.length>1)continue;const rows=await book.load(sh);if(!rows.length)continue;
        const p=mParseSheet(rows,sh.name==="(csv)"?f.name.replace(/\.[^.]+$/,""):sh.name);if(p&&p.recs.length&&p.withMail)sheets.push(Object.assign({name:sh.name},p));
        if(!types){const t=mParseTypes(rows);if(t)types=t}}
      sheets.sort((a,b)=>(b.hasEnvoyer?1:0)-(a.hasEnvoyer?1:0));MIMP={sheets,types,fname:f.name};mDrawPreview()}
    catch(err){pv.innerHTML='<div class="notice warn"><b>Fichier illisible.</b> Enregistrez-le au format .xlsx ou .csv et réessayez.</div>'}};
}
function mDrawPreview(){const pv=$("#mPrev"),I=MIMP;
  if(!I.sheets.length){pv.innerHTML='<div class="notice warn"><b>Aucune liste de contacts trouvée.</b> Il faut au moins une colonne « Client » et une colonne « E-mail » contenant des adresses.</div>';return}
  const anyEnv=I.sheets.some(s=>s.hasEnvoyer);
  pv.innerHTML='<div style="display:flex;flex-direction:column;gap:10px;margin-top:6px"><span class="lbl">Onglets à importer</span><div class="cpl">'+
   I.sheets.map((s,i)=>'<label><input type="checkbox" data-msh="'+i+'"'+(!anyEnv||s.hasEnvoyer?' checked':'')+'><span class="grow"><b>'+esc(s.name)+'</b><span class="sub" style="display:block">'+pl(s.recs.length,"ligne")+' · '+pl(s.withMail,"adresse e-mail","adresses e-mail")+(s.hasEnvoyer?' · colonne « Envoyer ? »':'')+'</span></span></label>').join("")+'</div>'+
   (I.types?'<p class="hint"><b>'+pl(I.types.length,"mail type","mails types")+'</b> trouvé'+(I.types.length>1?'s':'')+' ('+esc(I.types.map(t=>t.famille).join(", "))+') : le bouton Mail de chaque contact ouvrira le texte prêt à envoyer.</p>':'')+
   '<div class="imp-sum" id="mSum"></div><div class="bar"><button class="btn primary" type="button" data-act="mimpgo" id="mGo">Importer</button></div></div>';
  pv.querySelectorAll("input[data-msh]").forEach(c=>c.onchange=mCount);mCount()}
function mCollect(){const I=MIMP,sel=[...document.querySelectorAll("#mPrev input[data-msh]:checked")].map(c=>I.sheets[+c.dataset.msh]);
  const byKey=new Map(S.mailing.map(m=>[mkey(m),m])),seen=new Set(),add=[],upd=[];let dup=0;
  sel.forEach(s=>s.recs.forEach(r=>{const k=mkey(r);if(seen.has(k)){dup++;return}seen.add(k);const ex=byKey.get(k);if(ex)upd.push([ex,r]);else add.push(r)}));
  return {add,upd,dup}}
function mCount(){const c=mCollect();
  $("#mSum").innerHTML='<div><b>'+c.add.length+'</b><span class="sub">nouveau'+(c.add.length>1?'x':'')+' contact'+(c.add.length>1?'s':'')+'</span></div><div><b>'+c.upd.length+'</b><span class="sub">déjà présent'+(c.upd.length>1?'s':'')+'</span></div><div><b>'+c.dup+'</b><span class="sub">en double dans le fichier</span></div>';
  const n=c.add.length+c.upd.length;$("#mGo").disabled=!n;$("#mGo").textContent=n?"Importer "+pl(n,"contact"):"Rien à importer"}
async function mImportGo(){const c=mCollect(),now=new Date().toISOString(),list=[];
  const DESC=["client","typologie","famille","contact","mail","appel","accroche","mission","agence","apporteur","nbFact","ca","attention","envoyer"];
  c.add.forEach(r=>list.push(Object.assign(r,{id:uid(),creeLe:now})));
  c.upd.forEach(([ex,r])=>{const m=clone(ex);DESC.forEach(k=>{if(r[k])m[k]=r[k]});if(!m.liste)m.liste=r.liste;
    if(r.envoye&&!m.envoye)m.envoye=true;["dateEnvoi","relance","commentaire"].forEach(k=>{if(r[k]&&!m[k])m[k]=r[k]});list.push(mnorm(m))});
  const b=$("#mGo");b.disabled=true;b.textContent="Import en cours…";
  if(MIMP.types){S.settings.mailTypes=MIMP.types;await saveSettings()}
  if(!(await mBulk(list))){b.disabled=false;b.textContent="Réessayer";return}
  MIMP=null;closeDrawer();MUI.view="aenv";MUI.lim=200;renderMailing();
  toast([c.add.length?pl(c.add.length,"contact ajouté","contacts ajoutés"):"",c.upd.length?pl(c.upd.length,"contact mis à jour","contacts mis à jour"):""].filter(Boolean).join(" · ")||"Rien de nouveau");
}
