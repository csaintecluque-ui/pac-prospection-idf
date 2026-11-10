/* Registre · CSC — Groupes multi-sites : un compte « tête de groupe » (ex. SAFRAN) et ses sites
   Les notes et comptes rendus saisis sur le groupe s'affichent sur la fiche de chaque site ;
   la fiche du groupe liste ses sites et peut afficher tout l'historique des sites.
   Fichier 12/18 : les fichiers se chargent dans l'ordre et partagent leurs déclarations. */
"use strict";

/* ---------- Modèle : compte.groupeId = id du compte tête de groupe (un seul niveau) ---------- */
const grpOf=k=>{if(!k||!k.groupeId||k.groupeId===k.id)return null;return kOf(k.groupeId)};
const sitesOf=gid=>gid?(IX().grp.get(gid)||[]).filter(x=>x.id!==gid):[];
const isGrp=k=>!!k&&sitesOf(k.id).length>0;
const grpName=k=>{const g=grpOf(k);return g?g.nom:""};
const byNom=(a,b)=>a.nom.localeCompare(b.nom,"fr");
/* Liens cassés, boucles, groupes de groupes : tout est ramené à un seul niveau */
function grpRepair(){let ch=false;
  S.comptes.forEach(k=>{if(!k.groupeId)return;let g=kOf(k.groupeId);
    if(!g||g.id===k.id){k.groupeId="";ch=true;return}
    let n=0,loop=false;
    while(g.groupeId&&g.groupeId!==g.id&&n<8){const up=kOf(g.groupeId);if(!up)break;if(up.id===k.id){loop=true;break}g=up;n++}
    if(loop){k.groupeId="";ch=true;return}
    if(g.id!==k.groupeId){k.groupeId=g.id;ch=true}});
  if(ch)bump();return ch}

/* ---------- Fenêtre « Compte » : champ Groupe ---------- */
function grpField(k){const n=sitesOf(k.id).length;
  if(n)return '<div class="f"><span class="lbl">Groupe</span><p class="hint" style="margin:0">Tête de groupe : '+pl(n,"site")+' rattaché'+(n>1?'s':'')+'. Les sites se gèrent depuis la fiche du compte (panneau « Sites du groupe »).</p></div>';
  const g=grpOf(k),L=S.comptes.filter(x=>x.id!==k.id&&!x.groupeId).sort((a,b)=>(isGrp(b)-isGrp(a))||byNom(a,b));
  return '<div class="f"><label class="lbl" for="km-grp">Groupe (compte de tête)</label><input type="text" id="km-grp" list="kgList" value="'+esc(g?g.nom:"")+'" placeholder="Ex. SAFRAN · laisser vide si le compte est indépendant" autocomplete="off">'+
    '<datalist id="kgList">'+L.map(x=>'<option value="'+esc(x.nom)+'">'+(isGrp(x)?esc("Groupe · "+pl(sitesOf(x.id).length,"site")):"")+'</option>').join("")+'</datalist>'+
    '<p class="hint" style="margin:0">Pour un compte à plusieurs sites : les notes et comptes rendus saisis sur le groupe s\'affichent sur la fiche de chaque site. Un nom qui n\'existe pas encore crée le compte groupe.</p></div>'}
/* À l'enregistrement : rattache au groupe (créé si besoin). Renvoie false si le choix est impossible. */
function grpApply(k){if(!("_grp" in k))return true;const name=String(k._grp||"").trim();delete k._grp;
  if(!name){k.groupeId="";return true}
  if(nh(name)===nh(k.nom)){toast("Un compte ne peut pas être son propre groupe.");return false}
  if(sitesOf(k.id).length){toast("Ce compte est déjà la tête d'un groupe : il ne peut pas être rattaché à un autre groupe.");return false}
  let g=findCompte(name);if(g){const top=grpOf(g);if(top)g=top}
  if(g&&g.id===k.id){toast("Un compte ne peut pas être son propre groupe.");return false}
  if(!g){g=ensureCompte(name,{type:k.type,segment:k.segment,typologie:k.typologie,famille:k.famille,agence:k.agence,origine:"groupe"});toast("Compte groupe « "+g.nom+" » créé")}
  k.groupeId=g.id;return true}

/* ---------- Fiche compte ---------- */
function grpTags(k){const g=grpOf(k),n=sitesOf(k.id).length;
  return g?'<button type="button" class="tag grp" data-kopen="'+esc(g.id)+'" title="Ouvrir la fiche du groupe">Site du groupe '+esc(g.nom)+'</button>':n?'<span class="tag grp">Groupe · '+pl(n,"site")+'</span>':''}
const grpListTag=k=>{const g=grpOf(k),n=sitesOf(k.id).length;return g?'<span class="ty grp" title="Site du groupe '+esc(g.nom)+'">'+esc(g.nom)+'</span>':n?'<span class="ty grp">Groupe · '+pl(n,"site")+'</span>':''};
const gBtns=gid=>'<div class="qa"><button class="btn" type="button" data-anew="note" data-k="'+esc(gid)+'">'+I_EV.note+'Note</button><button class="btn" type="button" data-anew="visite" data-cr="1" data-k="'+esc(gid)+'">'+I_CR+'Compte rendu</button><button class="btn" type="button" data-kedit="'+esc(gid)+'">Modifier les infos du groupe</button></div>';
/* Ligne du panneau Informations */
function grpKv(k){const g=grpOf(k),n=sitesOf(k.id).length;
  if(g)return '<dt>Groupe</dt><dd><button type="button" class="lk strong" data-kopen="'+esc(g.id)+'">'+esc(g.nom)+'</button></dd>';
  if(n)return '<dt>Sites</dt><dd>'+pl(n,"site")+' rattaché'+(n>1?'s':'')+'</dd>';return ''}
const grpHint=k=>grpOf(k)||isGrp(k)?'':'<button type="button" class="more" style="align-self:flex-start" data-gact="gattach" data-g="'+esc(k.id)+'">Plusieurs sites ? Rattacher des sites à ce compte</button>';
function grpPanel(k){const g=grpOf(k);
  if(g){const others=sitesOf(g.id).filter(x=>x.id!==k.id).sort(byNom),GA_=actOf(g.id),A=GA_.filter(a=>a.statut==="fait").sort(aSortDesc),open=GA_.filter(isOpen).sort(aSort),shown=UI.grpAll?A:A.slice(0,4);
    return '<div class="panel grp-p"><div class="ph"><h2>Groupe · '+esc(g.nom)+'</h2><button type="button" class="more" data-kopen="'+esc(g.id)+'">Ouvrir le groupe</button></div>'+
      '<p class="hint" style="margin:0">Informations communes à tous les sites du groupe.</p>'+
      (g.notes?'<p class="dnotes">'+esc(g.notes)+'</p>':'')+
      (A.length?'<div class="tl">'+shown.map(x=>tlItem(x,[])).join("")+'</div>'+(A.length>4?'<button type="button" class="more" style="align-self:flex-start" data-gact="gmore">'+(UI.grpAll?'Afficher moins':'Voir les '+A.length+' notes et échanges du groupe')+'</button>':''):(g.notes?'':'<p class="hint">Rien n\'est encore saisi sur le groupe : ajoutez une note ou un compte rendu ci-dessous.</p>'))+
      (open.length?'<div class="sub">À venir sur le groupe : '+open.slice(0,3).map(a=>esc((a.date?fdate(a.date)+" · ":"")+(a.objet||ALBL[a.type]))).join(" ; ")+'</div>':'')+
      gBtns(g.id)+
      (others.length?'<div class="sub">Autres sites : '+others.map(x=>'<button type="button" class="lk" data-kopen="'+esc(x.id)+'">'+esc(x.nom)+'</button>').join(", ")+'</div>':'')+'</div>'}
  const L=sitesOf(k.id).slice().sort(byNom);if(!L.length)return "";const t=todayISO();
  return '<div class="panel grp-p"><div class="ph"><h2>Sites du groupe</h2><span class="sub num">'+L.length+'</span><button type="button" class="more" data-gact="gattach" data-g="'+esc(k.id)+'">Rattacher / détacher</button></div>'+
    '<p class="hint" style="margin:0">Les notes et comptes rendus saisis ici, sur le groupe, s\'affichent sur la fiche de chaque site.</p>'+
    '<div class="gsites">'+L.map(x=>{const nx=nextOf(x.id),la=lastOf(x.id);
      return '<button type="button" class="gsite" data-kopen="'+esc(x.id)+'"><b>'+esc(x.nom)+'</b>'+((x.ville||x.dept)?'<span class="sub">'+esc([x.ville,x.dept?dLabel(x.dept):""].filter(Boolean).join(" · "))+'</span>':'')+
        '<span class="sub">'+(la?'Dernier contact '+fdate(la.date):'Jamais contacté')+(nx?' · <span class="'+(nx.date&&nx.date<t?'late':'')+'">'+esc((nx.date?fdate(nx.date):"Sans date")+" "+(nx.objet||ALBL[nx.type]||""))+'</span>':'')+'</span></button>'}).join("")+'</div>'+
    '<div class="qa"><button class="btn" type="button" data-gact="gsite" data-g="'+esc(k.id)+'">'+I_PLUS+'Nouveau site</button></div></div>'}
/* Historique du groupe : ajoute les échanges des sites (désactivable) */
const grpSitesOn=k=>isGrp(k)&&UI.grpSites!==false;
function grpHist(k,hist){if(!grpSitesOn(k))return;
  sitesOf(k.id).forEach(s=>actOf(s.id).filter(a=>a.statut!=="afaire").forEach(a=>hist.push(Object.assign({},a,{_site:s.nom}))))}
const grpHistBtn=k=>isGrp(k)?'<button type="button" class="more" data-gact="gsites">'+(grpSitesOn(k)?'Masquer les sites':'Inclure les sites')+'</button>':'';
const grpTlIds=k=>grpSitesOn(k)?sitesOf(k.id).flatMap(s=>actOf(s.id)):[];

/* ---------- Fiche de préparation de RDV ---------- */
function grpPrep(k,R,cut,sec){const g=grpOf(k);
  if(g){const A=actOf(g.id).filter(a=>a.statut==="fait").sort(aSortDesc).slice(0,6);
    return sec("Groupe "+R(g.nom),(g.notes?'<p class="pre">'+R(g.notes)+'</p>':'')+A.map(x=>{const cr=x.cr?crRows(x).filter(r=>r[0]!=="Points abordés").map(([l,v])=>l+" : "+v).join(" · "):"";
      return '<div class="ex"><b>'+R(x.date?fdate(x.date):"")+' · '+R(ALBL[x.type]||"")+'</b>'+(x.objet?' · '+R(x.objet):'')+((x.details||cr)?'<div>'+R(cut([x.details,cr].filter(Boolean).join("\n"),420))+'</div>':'')+'</div>'}).join("")||'<p class="e">Rien de saisi sur le groupe.</p>')}
  const L=sitesOf(k.id).slice().sort(byNom);
  return L.length?sec("Sites du groupe",'<ul>'+L.map(x=>{const la=lastOf(x.id);return '<li><b>'+R(x.nom)+'</b>'+(x.ville?' · '+R(x.ville):'')+(la?' · dernier contact '+R(fdate(la.date)):'')+'</li>'}).join("")+'</ul>'):""}

/* ---------- Rattacher / détacher des sites ---------- */
let GA=null;
const gaWord=n=>(nh(n).split(" ").find(w=>w.length>2&&!["groupe","group","sas","sa","ste","societe","the"].includes(w))||nh(n).split(" ")[0]||"");
function gaOpen(gid){const g=kOf(gid);if(!g)return;const top=grpOf(g);
  if(top){toast("« "+g.nom+" » est un site du groupe « "+top.nom+" » : ouvrez le groupe pour rattacher des sites.");return}
  GA={g:gid,sel:new Set(sitesOf(gid).map(x=>x.id)),q:gaWord(g.nom)};
  showModal(mHead("Groupe · "+esc(g.nom),"Rattacher des sites")+
   '<div class="db"><p class="hint" style="margin:0">Cochez les comptes qui sont des sites de « '+esc(g.nom)+' ». Chaque site garde ses contacts, ses actions et ses devis ; les notes et comptes rendus du groupe s\'afficheront sur sa fiche.</p>'+
   '<div class="f"><label class="lbl" for="ga-q">Rechercher un compte</label><input type="search" id="ga-q" value="'+esc(GA.q)+'" placeholder="Nom, ville, adresse…" autocomplete="off"></div><div id="gaL" class="ga-l"></div></div>'+
   '<div class="df"><span class="sub" id="gaN"></span><span class="grow"></span><button class="btn" type="button" data-act="mclose">Annuler</button><button class="btn primary" type="button" data-gact="gaok">Enregistrer</button></div>',"grp");
  gaDraw();setTimeout(()=>{const f=$("#ga-q");if(f){f.focus({preventScroll:true});try{f.select()}catch(_){}}},40)}
function gaDraw(){const box=$("#gaL");if(!box||!GA)return;const w=nh(GA.q).split(" ").filter(Boolean);
  const cand=S.comptes.filter(k=>k.id!==GA.g&&!isGrp(k));
  const sel=cand.filter(k=>GA.sel.has(k.id)).sort(byNom);
  const hits=w.length?cand.filter(k=>!GA.sel.has(k.id)&&w.every(t=>nh([k.nom,k.ville,k.adresse,k.cp].join(" ")).includes(t))).sort(byNom):[];
  const row=k=>{const o=grpOf(k),other=o&&o.id!==GA.g;
    return '<label class="ga-o"><input type="checkbox" data-ga="'+esc(k.id)+'"'+(GA.sel.has(k.id)?' checked':'')+'><span><b>'+esc(k.nom)+'</b><span class="sub">'+esc([kInfo(k),other?"actuellement site de "+o.nom:""].filter(Boolean).join(" · "))+'</span></span></label>'};
  box.innerHTML=(sel.length?'<div class="ga-h">Sites cochés · '+sel.length+'</div>'+sel.map(row).join(""):'')+
    (w.length?'<div class="ga-h">Comptes trouvés · '+hits.length+'</div>'+(hits.length?hits.slice(0,80).map(row).join("")+(hits.length>80?'<p class="hint" style="padding:6px 10px">'+(hits.length-80)+' autres : précisez la recherche.</p>':''):'<p class="hint" style="padding:6px 10px">Aucun autre compte ne correspond.</p>')
      :(sel.length?'':'<p class="hint" style="padding:8px 10px">Tapez le nom des sites à rattacher.</p>'));
  gaCount()}
function gaCount(){const n=$("#gaN");if(n&&GA)n.textContent=pl(GA.sel.size,"site")+" coché"+(GA.sel.size>1?"s":"")}
function gaOk(){if(!GA)return;const gid=GA.g,g=kOf(gid);if(!g){closeModal();return}let add=0,rem=0;
  S.comptes.forEach(k=>{if(k.id===gid)return;if(GA.sel.has(k.id)){if(k.groupeId!==gid){k.groupeId=gid;k.majLe=now();add++}}else if(k.groupeId===gid){k.groupeId="";k.majLe=now();rem++}});
  if(add&&g.groupeId){g.groupeId="";g.majLe=now()}
  bump();grpRepair();GA=null;closeModal();commit();
  toast(add||rem?[add?pl(add,"site")+" rattaché"+(add>1?"s":""):"",rem?pl(rem,"site")+" détaché"+(rem>1?"s":""):""].filter(Boolean).join(" · ")+" · groupe « "+g.nom+" »":"Aucun changement")}

/* ---------- Événements propres aux groupes ---------- */
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-gact]");if(!t)return;const a=t.dataset.gact;
  if(a==="gattach"){gaOpen(t.dataset.g);return}
  if(a==="gaok"){gaOk();return}
  if(a==="gsite"){const g=kOf(t.dataset.g);if(g)openCompte(null,{groupeId:g.id,type:g.type,segment:g.segment,typologie:g.typologie,famille:g.famille,agence:g.agence,apporteur:g.apporteur});return}
  if(a==="gmore"){UI.grpAll=!UI.grpAll;renderCompte();return}
  if(a==="gsites"){UI.grpSites=!grpSitesOn(kOf(S.kid));renderCompte();return}});
document.addEventListener("change",e=>{const t=e.target;if(GA&&t.matches&&t.matches("input[data-ga]")){t.checked?GA.sel.add(t.dataset.ga):GA.sel.delete(t.dataset.ga);gaCount()}});
document.addEventListener("input",e=>{if(GA&&e.target&&e.target.id==="ga-q"){GA.q=e.target.value;gaDraw()}});
