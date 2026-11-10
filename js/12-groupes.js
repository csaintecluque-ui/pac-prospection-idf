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
  const exists=!!kOf(k.id);
  return '<div class="f"><label class="lbl" for="km-grp">Ce compte est un site du groupe…</label><input type="text" id="km-grp" list="kgList" value="'+esc(g?g.nom:"")+'" placeholder="Nom du groupe (ex. SAFRAN) · laisser vide si ce n\'est pas un site" autocomplete="off">'+
    '<datalist id="kgList">'+L.map(x=>'<option value="'+esc(x.nom)+'">'+(isGrp(x)?esc("Groupe · "+pl(sitesOf(x.id).length,"site")):"")+'</option>').join("")+'</datalist>'+
    '<p class="hint" style="margin:0">À remplir sur la fiche d\'un site : les notes et comptes rendus du groupe s\'afficheront dessus. Un nom de groupe qui n\'existe pas encore crée le compte groupe.</p>'+
    (exists&&!g?'<button type="button" class="btn" style="align-self:flex-start;margin-top:4px" data-gact="gattach" data-g="'+esc(k.id)+'">C\'est le groupe lui-même ? Ajouter ses sites</button>':'')+'</div>'}
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
/* Bouton de l'en-tête de la fiche : ajouter un site (sauf sur un site) */
const grpHeadBtn=k=>grpOf(k)?'':'<button class="btn" type="button" data-gact="gsite" data-g="'+esc(k.id)+'" title="Créer un site rattaché à ce compte (groupe multi-sites)">'+I_PLUS+'Site</button>';
function grpTags(k){const g=grpOf(k),n=sitesOf(k.id).length;
  return g?'<button type="button" class="tag grp" data-kopen="'+esc(g.id)+'" title="Ouvrir la fiche du groupe">Site du groupe '+esc(g.nom)+'</button>':n?'<span class="tag grp">Groupe · '+pl(n,"site")+'</span>':''}
const grpListTag=k=>{const g=grpOf(k),n=sitesOf(k.id).length;return g?'<span class="ty grp" title="Site du groupe '+esc(g.nom)+'">'+esc(g.nom)+'</span>':n?'<span class="ty grp">Groupe</span>':''};
const gBtns=gid=>'<div class="qa"><button class="btn" type="button" data-anew="note" data-k="'+esc(gid)+'">'+I_EV.note+'Note</button><button class="btn" type="button" data-anew="visite" data-cr="1" data-k="'+esc(gid)+'">'+I_CR+'Compte rendu</button><button class="btn" type="button" data-kedit="'+esc(gid)+'">Modifier les infos du groupe</button></div>';
/* Ligne du panneau Informations */
function grpKv(k){const g=grpOf(k),n=sitesOf(k.id).length;
  if(g)return '<dt>Groupe</dt><dd><button type="button" class="lk strong" data-kopen="'+esc(g.id)+'">'+esc(g.nom)+'</button></dd>';
  if(n)return '<dt>Sites</dt><dd>'+pl(n,"site")+' rattaché'+(n>1?'s':'')+'</dd>';return ''}
const grpHint=k=>grpOf(k)||isGrp(k)?'':'<div class="grp-hint"><span class="sub">Plusieurs sites ?</span><button type="button" class="btn" data-gact="gattach" data-g="'+esc(k.id)+'">Ajouter des sites</button></div>';
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
  if(MODAL==="compte")closeModal();
  GA={g:gid,sel:new Set(sitesOf(gid).map(x=>x.id)),nw:[],q:gaWord(g.nom)};
  showModal(mHead("Groupe · "+esc(g.nom),"Ajouter des sites")+
   '<div class="db"><p class="hint" style="margin:0">Cochez les comptes déjà existants qui sont des sites de « '+esc(g.nom)+' », ou tapez le nom d\'un nouveau site et cliquez sur « Créer ». Chaque site garde ses contacts, ses actions et ses devis ; les notes et comptes rendus du groupe s\'afficheront sur sa fiche.</p>'+
   '<div class="f"><label class="lbl" for="ga-q">Rechercher un compte</label><input type="search" id="ga-q" value="'+esc(GA.q)+'" placeholder="Nom, ville, adresse…" autocomplete="off"></div><div id="gaL" class="ga-l"></div></div>'+
   '<div class="df"><span class="sub" id="gaN"></span><span class="grow"></span><button class="btn" type="button" data-act="mclose">Annuler</button><button class="btn primary" type="button" data-gact="gaok">Enregistrer</button></div>',"grp");
  gaDraw();setTimeout(()=>{const f=$("#ga-q");if(f){f.focus({preventScroll:true});try{f.select()}catch(_){}}},40)}
function gaDraw(){const box=$("#gaL");if(!box||!GA)return;const w=nh(GA.q).split(" ").filter(Boolean);
  const cand=S.comptes.filter(k=>k.id!==GA.g&&!isGrp(k));
  const sel=cand.filter(k=>GA.sel.has(k.id)).sort(byNom);
  const hits=w.length?cand.filter(k=>!GA.sel.has(k.id)&&w.every(t=>nh([k.nom,k.ville,k.adresse,k.cp].join(" ")).includes(t))).sort(byNom):[];
  const row=k=>{const o=grpOf(k),other=o&&o.id!==GA.g;
    return '<label class="ga-o"><input type="checkbox" data-ga="'+esc(k.id)+'"'+(GA.sel.has(k.id)?' checked':'')+'><span><b>'+esc(k.nom)+'</b><span class="sub">'+esc([kInfo(k),other?"actuellement site de "+o.nom:""].filter(Boolean).join(" · "))+'</span></span></label>'};
  const qn=String(GA.q||"").trim(),dup=qn&&(findCompte(qn)||GA.nw.some(x=>nh(x)===nh(qn)));
  const nwRow=(n,i)=>'<label class="ga-o"><input type="checkbox" data-ganw="'+i+'" checked><span><b>'+esc(n)+'</b><span class="sub">nouveau compte, créé à l\'enregistrement</span></span></label>';
  box.innerHTML=(qn&&!dup?'<button type="button" class="ga-new" data-gact="ganew">'+I_PLUS+'<span>Créer le site « <b>'+esc(qn)+'</b> »</span></button>':'')+
    (sel.length||GA.nw.length?'<div class="ga-h">Sites cochés · '+(sel.length+GA.nw.length)+'</div>'+GA.nw.map(nwRow).join("")+sel.map(row).join(""):'')+
    (w.length?'<div class="ga-h">Comptes trouvés · '+hits.length+'</div>'+(hits.length?hits.slice(0,80).map(row).join("")+(hits.length>80?'<p class="hint" style="padding:6px 10px">'+(hits.length-80)+' autres : précisez la recherche.</p>':''):'<p class="hint" style="padding:6px 10px">Aucun autre compte ne correspond.</p>')
      :(sel.length||GA.nw.length?'':'<p class="hint" style="padding:8px 10px">Tapez le nom d\'un site : existant pour le cocher, nouveau pour le créer.</p>'));
  gaCount()}
function gaCount(){const n=$("#gaN");if(n&&GA){const c=GA.sel.size+GA.nw.length;n.textContent=pl(c,"site")+" coché"+(c>1?"s":"")}}
function gaNew(){if(!GA)return;const n=String(GA.q||"").trim();if(!n)return;const ex=findCompte(n);
  if(ex){if(ex.id===GA.g){toast("C'est le nom du groupe : donnez un nom au site (ex. "+n+" Massy).");return}GA.sel.add(ex.id)}else if(!GA.nw.some(x=>nh(x)===nh(n)))GA.nw.push(n);
  GA.q=gaWord(kOf(GA.g).nom)+" ";const f=$("#ga-q");if(f){f.value=GA.q;f.focus({preventScroll:true})}gaDraw()}
function gaOk(){if(!GA)return;const gid=GA.g,g=kOf(gid);if(!g){closeModal();return}let add=0,rem=0;
  GA.nw.forEach(n=>{const k=ensureCompte(n,{type:g.type,segment:g.segment,typologie:g.typologie,famille:g.famille,agence:g.agence,apporteur:g.apporteur,origine:"site"});GA.sel.add(k.id)});
  S.comptes.forEach(k=>{if(k.id===gid)return;if(GA.sel.has(k.id)){if(k.groupeId!==gid){k.groupeId=gid;k.majLe=now();add++}}else if(k.groupeId===gid){k.groupeId="";k.majLe=now();rem++}});
  if(add&&g.groupeId){g.groupeId="";g.majLe=now()}
  bump();grpRepair();GA=null;closeModal();commit();
  toast(add||rem?[add?pl(add,"site")+" rattaché"+(add>1?"s":""):"",rem?pl(rem,"site")+" détaché"+(rem>1?"s":""):""].filter(Boolean).join(" · ")+" · groupe « "+g.nom+" »":"Aucun changement")}

/* Liste des comptes : groupes dépliés (gardé pendant la session) */
const KXO=(()=>{try{return new Set(JSON.parse(sessionStorage.getItem("pac-idf-kxo")||"[]"))}catch(e){return new Set()}})();
const KXC=new Set(); /* groupes repliés à la main pendant une recherche */
const kxoSave=()=>{try{sessionStorage.setItem("pac-idf-kxo",JSON.stringify([...KXO]))}catch(e){}};
const kxIsOpen=id=>{const r=document.querySelector('#view-comptes tr.k-grp[data-kid="'+id+'"]');return !!(r&&r.classList.contains("open"))};
const kxSet=(id,o)=>{if(o){KXO.add(id);KXC.delete(id)}else{KXO.delete(id);KXC.add(id)}};
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-kx],[data-kxall]");if(!t)return;e.stopPropagation();
  if(t.dataset.kxall){const G=[...new Set([...document.querySelectorAll("#view-comptes .kx[data-kx]")].map(b=>b.dataset.kx))],all=G.every(kxIsOpen);G.forEach(id=>kxSet(id,!all))}
  else{const id=t.dataset.kx;kxSet(id,!kxIsOpen(id))}
  kxoSave();renderComptes()},true);
document.addEventListener("keydown",e=>{const t=e.target;if(!(t&&t.matches&&t.matches("#view-comptes tr.k-grp")))return;
  if(e.key==="ArrowRight"||e.key==="ArrowLeft"){e.preventDefault();const id=t.dataset.kid,o=e.key==="ArrowRight";if(o===kxIsOpen(id))return;kxSet(id,o);kxoSave();renderComptes();const r=document.querySelector('#view-comptes tr[data-kid="'+id+'"]');if(r)r.focus({preventScroll:true})}});

/* ---------- Événements propres aux groupes ---------- */
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-gact]");if(!t)return;const a=t.dataset.gact;
  if(a==="gattach"){gaOpen(t.dataset.g);return}
  if(a==="gaok"){gaOk();return}
  if(a==="ganew"){gaNew();return}
  if(a==="gsite"){const g=kOf(t.dataset.g);if(g)openCompte(null,{groupeId:g.id,type:g.type,segment:g.segment,typologie:g.typologie,famille:g.famille,agence:g.agence,apporteur:g.apporteur});return}
  if(a==="gmore"){UI.grpAll=!UI.grpAll;renderCompte();return}
  if(a==="gsites"){UI.grpSites=!grpSitesOn(kOf(S.kid));renderCompte();return}});
document.addEventListener("change",e=>{const t=e.target;if(!GA||!t.matches)return;
  if(t.matches("input[data-ga]")){t.checked?GA.sel.add(t.dataset.ga):GA.sel.delete(t.dataset.ga);gaCount();return}
  if(t.matches("input[data-ganw]")&&!t.checked){GA.nw.splice(+t.dataset.ganw,1);gaDraw()}});
document.addEventListener("keydown",e=>{if(GA&&e.key==="Enter"&&e.target&&e.target.id==="ga-q"){e.preventDefault();const b=document.querySelector('[data-gact="ganew"]');if(b)gaNew()}});
document.addEventListener("input",e=>{if(GA&&e.target&&e.target.id==="ga-q"){GA.q=e.target.value;gaDraw()}});
/* Nouvelle recherche : les groupes repliés à la main pendant la précédente se rouvrent automatiquement */
document.addEventListener("input",e=>{if(e.target&&e.target.id==="kQ")KXC.clear()});

/* ================= Suggestions de groupes : comptes au même début de nom ================= */
/* Mots ignorés en tête de nom (formes juridiques, articles) */
const GSTOP=new Set(["sa","sas","sasu","sarl","eurl","sca","sci","snc","ste","societe","ets","etablissements","etablissement","groupe","group","the","l","la","le","les","cie","compagnie","de","du","des","d"]);
/* Premiers mots trop courants pour suffire seuls : il faut alors deux mots communs */
const GGEN=new Set(["ville","mairie","commune","communaute","agglomeration","departement","conseil","region","centre","hopital","clinique","ehpad","residence","copropriete","syndicat","sdc","asl","aful","entreprise","entreprises","association","cabinet","agence","fonciere","immobiliere","immobilier","promotion","lycee","college","ecole","universite","institut","office","opac","oph","paris","france","batiment","bureau","bureaux","maison","transports","services","service","habitat","logement","logements","atelier","ateliers","construction","constructions","sci","holding","union","federation","chambre","caisse","banque","credit"]);
const GPLACE=new Set(["Contacts sans compte","Actions sans compte","Devis sans compte","Sans nom"]);
/* Mots significatifs du nom, avec leur position dans le texte d'origine (articles et formes juridiques retirés) */
function gTok(nom){const s=String(nom||""),re=/[^\s\-–—,.;:\/()'’"«»&+]+/g,T=[];let m;
  while((m=re.exec(s))){const n=nh(m[0]);if(n&&!GSTOP.has(n))T.push({n,a:m.index,b:m.index+m[0].length})}return T}
/* Un premier mot trop courant ou très court ne suffit pas : il faut deux mots communs */
const gNeed2=f=>GGEN.has(f)||f.length<=3;
let GSUG=null,GSUGV=-1;
function grpSuggest(){if(GSUG&&GSUGV===S.ver)return GSUG;const ign=new Set(S.settings.grpIgn||[]),B=new Map();
  S.comptes.forEach(k=>{if(GPLACE.has(k.nom)||grpOf(k))return;const T=gTok(k.nom);if(!T.length)return;const f=T[0].n;if(f.length<2||/^\d+$/.test(f))return;
    const key=gNeed2(f)?(T[1]?f+" "+T[1].n:""):f;if(!key)return;let l=B.get(key);if(!l)B.set(key,l=[]);l.push({k,T})});
  const out=[];
  B.forEach((L,key)=>{if(L.length<2)return;
    /* Préfixe de mots commun à tous les comptes du paquet */
    let n=0;const min=Math.min(...L.map(x=>x.T.length));while(n<min&&L.every(x=>x.T[n].n===L[0].T[n].n))n++;
    if(n<(gNeed2(L[0].T[0].n)?2:1))return;
    const ref=L.slice().sort((a,b)=>a.k.nom.length-b.k.nom.length)[0],name=ref.k.nom.slice(ref.T[0].a,ref.T[n-1].b).trim();
    const pk=nh(name);if(ign.has(pk))return;
    let head=findCompte(name);if(head){const top=grpOf(head);if(top)head=top}
    const members=L.map(x=>x.k).filter(k=>(!head||k.id!==head.id)&&!isGrp(k)&&!(head&&k.groupeId===head.id));
    if(head?members.length<1:members.length<2)return;
    out.push({key:pk,name,head:head?head.id:"",members:members.sort(byNom).map(k=>k.id)})});
  GSUG=out.sort((a,b)=>b.members.length-a.members.length||a.name.localeCompare(b.name,"fr"));GSUGV=S.ver;return GSUG}
/* Bandeau de la liste des comptes */
function grpSugBar(view){const L=grpSuggest(),n=L.length;if(!n)return "";const hid=(S.settings.grpSugHide||0)>=n;
  if(hid&&view!=="groupes")return "";
  return '<div class="notice grp-sug">'+I_PLUS+'<span class="grow"><b>'+pl(n,"groupe possible","groupes possibles")+'</b> : des comptes ont le même début de nom ('+esc(L.slice(0,4).map(x=>x.name).join(", "))+(n>4?"…":"")+').</span><button type="button" class="btn" data-gact="gsug">Voir les suggestions</button>'+(hid?'':'<button type="button" class="more" data-gact="gsughide" title="Le bandeau revient si de nouvelles suggestions apparaissent ; toujours accessible depuis la vue « Groupes et sites »">Masquer</button>')+'</div>'}
let GSM=null;
function gsugOpen(){const L=grpSuggest();if(!L.length){toast("Aucune suggestion de groupe : pas d'autres comptes au même début de nom.");return}
  if(MODAL)closeModal();
  GSM={L:L.map(s=>({key:s.key,name:s.name,head:s.head,members:s.members.slice(),sel:new Set(s.members),on:true})),q:""};
  showModal(mHead("Groupes multi-sites","Groupes suggérés")+
   '<div class="db"><p class="hint" style="margin:0">Comptes dont le nom commence par les mêmes mots. Vérifiez le nom du groupe, décochez les comptes qui n\'en font pas partie (ou toute la suggestion), puis validez. « Ignorer » retire définitivement une suggestion.</p>'+
   '<div class="f"><label class="lbl" for="gsm-q">Filtrer</label><input type="search" id="gsm-q" placeholder="Nom de groupe ou de compte…" autocomplete="off"></div><div id="gsmL" class="gsm-l"></div></div>'+
   '<div class="df"><span class="sub" id="gsmN"></span><span class="grow"></span><button class="btn" type="button" data-act="mclose">Annuler</button><button class="btn primary" type="button" data-gact="gsugok">Valider</button></div>',"gsug");
  modalBig();gsmDraw()}
function gsmDraw(){const box=$("#gsmL");if(!box||!GSM)return;const w=nh(GSM.q).split(" ").filter(Boolean);
  const vis=(s)=>!w.length||w.every(t=>nh([s.name,...s.members.map(id=>(kOf(id)||{}).nom)].join(" ")).includes(t));
  box.innerHTML=GSM.L.map((s,i)=>{if(!vis(s))return "";const h=kOf(s.head);
    return '<div class="gsm'+(s.on?'':' off')+'"><div class="gsm-h"><label class="gsm-on"><input type="checkbox" data-gson="'+i+'"'+(s.on?' checked':'')+' aria-label="Retenir le groupe '+esc(s.name)+'"></label>'+
      '<input type="text" class="gsm-n" data-gsn="'+i+'" value="'+esc(s.name)+'" aria-label="Nom du groupe">'+
      '<span class="sub">'+(h?(isGrp(h)?'groupe existant · '+pl(sitesOf(h.id).length,"site"):'compte existant « '+esc(h.nom)+' » → devient le groupe'):'nouveau compte groupe')+'</span>'+
      '<span class="grow"></span><button type="button" class="more" data-gact="gsign" data-i="'+i+'">Ignorer</button></div>'+
      '<div class="gsm-m">'+s.members.map(id=>{const k=kOf(id);if(!k)return "";return '<label class="ga-o"><input type="checkbox" data-gsm="'+i+'" data-id="'+esc(id)+'"'+(s.sel.has(id)?' checked':'')+'><span><b>'+esc(k.nom)+'</b><span class="sub">'+esc(kInfo(k))+'</span></span></label>'}).join("")+'</div></div>'}).join("")||'<p class="hint">Aucune suggestion pour ce filtre.</p>';
  gsmCount()}
function gsmCount(){const n=$("#gsmN");if(!n||!GSM)return;const on=GSM.L.filter(s=>s.on&&s.sel.size),m=on.reduce((a,s)=>a+s.sel.size,0);
  n.textContent=pl(on.length,"groupe")+" · "+pl(m,"compte")+" à rattacher";const b=document.querySelector('#modal [data-gact="gsugok"]');if(b)b.disabled=!on.length}
function gsugOk(){if(!GSM)return;let ng=0,nk=0;
  GSM.L.forEach(s=>{if(!s.on||!s.sel.size)return;const name=String(s.name||"").trim();if(!name)return;
    let g=findCompte(name);if(g){const top=grpOf(g);if(top)g=top}
    const ids=[...s.sel].filter(id=>kOf(id)&&(!g||id!==g.id));if(!ids.length)return;
    if(!g){const K=ids.map(kOf),cnt=f=>{const m=new Map();K.forEach(k=>{if(k[f])m.set(k[f],(m.get(k[f])||0)+1)});return [...m.entries()].sort((a,b)=>b[1]-a[1]).map(x=>x[0])[0]||""};
      const ty=K.some(k=>k.type==="Client existant")?"Client existant":K.some(k=>k.type==="Prescripteur")?"Prescripteur":"Prospect";
      g=ensureCompte(name,{type:ty,segment:cnt("segment"),typologie:cnt("typologie"),famille:cnt("famille"),origine:"groupe"})}
    if(g.groupeId){g.groupeId=""}
    let added=0;ids.forEach(id=>{const k=kOf(id);if(isGrp(k)||k.groupeId===g.id)return;k.groupeId=g.id;k.majLe=now();added++});
    if(added){ng++;nk+=added}});
  bump();grpRepair();GSM=null;closeModal();commit();
  toast(ng?pl(ng,"groupe")+" créé"+(ng>1?"s":"")+" ou complété"+(ng>1?"s":"")+" · "+pl(nk,"compte")+" rattaché"+(nk>1?"s":""):"Aucun changement")}
function gsugIgnore(i){if(!GSM)return;const s=GSM.L[i];if(!s)return;const ig=S.settings.grpIgn||(S.settings.grpIgn=[]);if(!ig.includes(s.key))ig.push(s.key);
  GSM.L.splice(i,1);lsSave();gsmDraw();toast("Suggestion « "+s.name+" » ignorée")}
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-gact]");if(!t)return;const a=t.dataset.gact;
  if(a==="gsug"){gsugOpen();return}
  if(a==="gsugok"){gsugOk();return}
  if(a==="gsign"){gsugIgnore(+t.dataset.i);return}
  if(a==="gsughide"){S.settings.grpSugHide=grpSuggest().length;lsSave();render();toast("Bandeau masqué : les suggestions restent dans la vue « Groupes et sites »");return}});
document.addEventListener("change",e=>{const t=e.target;if(!GSM||!t.matches)return;
  if(t.matches("input[data-gson]")){const s=GSM.L[+t.dataset.gson];s.on=t.checked;t.closest(".gsm").classList.toggle("off",!s.on);gsmCount();return}
  if(t.matches("input[data-gsm]")){const s=GSM.L[+t.dataset.gsm];t.checked?s.sel.add(t.dataset.id):s.sel.delete(t.dataset.id);gsmCount();return}});
document.addEventListener("input",e=>{const t=e.target;if(!GSM||!t)return;
  if(t.id==="gsm-q"){GSM.q=t.value;gsmDraw();return}
  if(t.matches&&t.matches("input[data-gsn]")){GSM.L[+t.dataset.gsn].name=t.value}});
