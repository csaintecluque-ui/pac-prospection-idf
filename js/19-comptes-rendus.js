/* Registre · CSC — Page « Comptes rendus » : tous les comptes rendus au même endroit, recherche plein texte,
   filtres par période et par nature, lecture en un clic, impression de la sélection ; bloc du tableau de bord.
   Chargé avant 18-demarrage.js (toujours en dernier) : partage les déclarations des fichiers précédents. */
"use strict";

/* Un compte rendu : un CR détaillé, ou un RDV / visio / événement réalisé avec des notes */
const isCR=a=>!!a&&a.origine!=="mailing"&&a.statut!=="annule"&&(!!a.cr||(a.statut==="fait"&&!!String(a.details||"").trim()&&(isRdv(a.type)||a.type==="evenement")));
const CRNAT=[["","Tous"],["cr","Comptes rendus détaillés"],["rdv","Notes de RDV"]];
const CRP=[["","Toutes dates"],["30","30 derniers jours"],["90","3 derniers mois"],["an","Cette année"]];
const CRK="pac-idf-cr-ui";
const CRU=(()=>{const d={q:"",f:"",p:"",lim:60};try{return Object.assign(d,JSON.parse(localStorage.getItem(CRK)||"{}"),{q:"",lim:60})}catch(e){return d}})();
const cruSave=()=>{try{localStorage.setItem(CRK,JSON.stringify({f:CRU.f,p:CRU.p}))}catch(e){}};

(()=>{const i=NAV.findIndex(x=>x[0]==="agenda");if(!NAV.some(x=>x[0]==="cr"))NAV.splice(i+1,0,["cr","Comptes rendus",I_CR,""]);
  if(!VIEWS_ALL.includes("cr"))VIEWS_ALL.push("cr");
  if(!$("#view-cr")){const ag=$("#view-agenda");if(ag)ag.insertAdjacentHTML("afterend",'<section id="view-cr" hidden></section>')}})();

/* Texte du compte rendu (pour la recherche et l'extrait) */
const crBody=a=>{const c=a.cr||{};return [c.contexte,c.besoins,a.details,c.decisions,c.suites,a.suite].filter(x=>String(x||"").trim()).join("\n")};
const crWho=a=>{const c=a.cr||{},ct=ctById(a.contactId);return [c.client||(ct?ct.nom:"")||a.interlocuteur,c.interne||a.accompagnant].filter(Boolean).join(" · ")};
const crHay=a=>{const k=kOf(a.compteId),ct=ctById(a.contactId),c=a.cr||{};
  return nh([a.objet,crBody(a),a.resultat,a.lieu,a.accompagnant,a.interlocuteur,k&&k.nom,grpName(k),k&&k.ville,ct&&ct.nom,c.client,c.interne,c.concurrence,(c.prestas||[]).map(p=>PLABEL[p]||p).join(" ")].join(" "))};
function crPeriod(a){const p=CRU.p;if(!p)return true;const d=a.date||"";if(!d)return false;
  if(p==="an")return d>=todayISO().slice(0,4)+"-01-01";return d>=addD(todayISO(),-Number(p))}
const crBase=()=>S.actions.filter(a=>isCR(a)&&crPeriod(a));
const crKind=(a,f)=>!f||(f==="cr"?!!a.cr:!a.cr);
function crList(){const w=nh(CRU.q).split(" ").filter(Boolean);
  return crBase().filter(a=>crKind(a,CRU.f)&&(!w.length||(h=>w.every(t=>h.includes(t)))(crHay(a)))).sort(aSortDesc)}
/* Extrait : autour du premier mot cherché trouvé, mots surlignés */
function crExtract(a,q,n){const txt=crBody(a).split("\n").map(x=>x.trim()).filter(Boolean).join(" · ").replace(/\s+/g," ");if(!txt)return "";n=n||240;
  const w=nh(q).split(" ").filter(t=>t.length>1);let s=0;
  if(w.length){const low=nh(txt);let pos=-1;for(const t of w){const i=low.indexOf(t);if(i>=0&&(pos<0||i<pos))pos=i}
    /* nh() garde la longueur pour les lettres accentuées courantes : la position sert de repère approximatif */
    if(pos>60)s=Math.max(0,txt.lastIndexOf(" ",pos-40)+1)}
  let ex=txt.slice(s,s+n);if(s+n<txt.length)ex=ex.replace(/\s+\S*$/,"")+"…";if(s>0)ex="…"+ex;
  let o=esc(ex);w.forEach(t=>{const re=new RegExp("("+t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+")","ig");o=o.replace(re,"<mark>$1</mark>")});return o}
function crCard(a,q){const k=kOf(a.compteId),g=grpOf(k);
  return '<div class="crc" data-aid="'+esc(a.id)+'" tabindex="0" role="button" aria-label="Lire le compte rendu : '+esc(a.objet||ALBL[a.type])+'">'+
    '<div class="crc-h"><span class="eic eic-'+esc(a.type)+'">'+(I_EV[a.type]||I_EV.autre)+'</span><span class="num crc-d">'+(a.date?fdate(a.date):"Sans date")+'</span>'+
     (k?'<button type="button" class="lk strong" data-kopen="'+esc(k.id)+'">'+esc(k.nom)+'</button>':'')+(g?'<span class="ty grp">'+esc(g.nom)+'</span>':isGrp(k)?'<span class="ty grp">Groupe</span>':'')+
     '<span class="grow"></span>'+(a.cr?'<span class="pill tone-info">Compte rendu</span>':'<span class="pill tone-grey">'+esc(ESHORT[a.type]||ALBL[a.type]||a.type)+'</span>')+'</div>'+
    '<div class="crc-o">'+esc(a.objet||ALBL[a.type]||"Échange")+'</div>'+
    (crBody(a)?'<div class="crc-x">'+crExtract(a,q)+'</div>':'')+
    ((crWho(a)||a.lieu)?'<div class="sub">'+esc([crWho(a),a.lieu].filter(Boolean).join(" · "))+'</div>':'')+'</div>'}

function renderCR(){const el=$("#view-cr");if(!el)return;
  const B=crBase(),L=crList(),all=S.actions.filter(isCR).length;
  let h=pageH("Actions commerciales","Comptes rendus",pl(all,"compte rendu","comptes rendus")+" enregistré"+(all>1?"s":"")+" · "+pl(S.actions.filter(a=>a.cr&&a.statut!=="annule").length,"détaillé")+" · notes de RDV comprises",
    '<button class="btn ghost" type="button" data-cract="print"'+(L.length?'':' disabled')+' title="Imprimer ou enregistrer en PDF les comptes rendus affichés">Imprimer la sélection</button><button class="btn primary" type="button" data-anew="visite" data-cr="1">'+I_PLUS+'Compte rendu</button>');
  h+='<div class="cr-bar"><div class="field-s cr-q"><label for="crQ">Rechercher dans les comptes rendus</label><input type="search" id="crQ" value="'+esc(CRU.q)+'" placeholder="Compte, groupe, contact, mot du compte rendu (ex. DTA, Safran, Dupont)…" autocomplete="off"></div>'+
    '<div class="field-s"><label for="crP">Période</label><select id="crP">'+CRP.map(([k,l])=>'<option value="'+k+'"'+(CRU.p===k?' selected':'')+'>'+esc(l)+'</option>').join("")+'</select></div></div>';
  h+='<div class="chips">'+CRNAT.map(([k,l])=>'<button type="button" class="chip" data-crf="'+k+'" aria-pressed="'+(CRU.f===k)+'">'+esc(l)+'<span class="n num">'+B.filter(a=>crKind(a,k)).length+'</span></button>').join("")+'</div>';
  if(!L.length){h+='<div class="list-wrap"><div class="empty"><h3>'+(all?'Aucun compte rendu pour cette recherche':'Aucun compte rendu pour l\'instant')+'</h3><p>'+(all?'Changez de période ou retirez un mot de la recherche.':'Rédigez-en un avec le bouton « Compte rendu », ou cochez « Compte rendu » dans un RDV réalisé.')+'</p></div></div>';el.innerHTML=h;return}
  const shown=L.slice(0,CRU.lim);let cur="",grp="";
  shown.forEach(a=>{const m=(a.date||"").slice(0,7)||"Sans date";if(m!==cur){if(cur)grp+='</div>';cur=m;
    grp+='<div class="cr-m"><span class="lbl">'+esc(m==="Sans date"?m:blCap(dObj(m+"-01").toLocaleDateString("fr-FR",{month:"long",year:"numeric"})))+'</span></div><div class="cr-g">'}
    grp+=crCard(a,CRU.q)});
  h+=grp+(cur?'</div>':'')+'<div class="pager">'+(L.length>shown.length?'<button class="btn" type="button" data-cract="more">Afficher '+Math.min(60,L.length-shown.length)+' de plus</button>':'')+'<span class="sub">'+shown.length+' sur '+pl(L.length,"compte rendu","comptes rendus")+'</span></div>';
  el.innerHTML=h}

/* Impression des comptes rendus affichés (une page lisible, à enregistrer en PDF) */
function crPrintList(){const L=crList();if(!L.length){toast("Aucun compte rendu à imprimer.");return}const R=s=>esc(s==null?"":s);
  const sec=(t,v)=>String(v||"").trim()?'<h3>'+t+'</h3><p class="pre">'+R(v)+'</p>':'';
  const body=L.map(a=>{const k=kOf(a.compteId),g=grpOf(k),c=a.cr||{};
    return '<div class="cr"><h2>'+R(a.objet||ALBL[a.type]||"Échange")+'</h2><p class="m">'+R([a.date?dObj(a.date).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"}):"",ALBL[a.type]||"",k?k.nom:"",g?"groupe "+g.nom:"",crWho(a),a.lieu].filter(Boolean).join(" · "))+'</p>'+
      sec("Contexte",c.contexte)+sec("Besoins exprimés",c.besoins)+sec(a.cr?"Points abordés":"Compte rendu",a.details)+sec("Décisions et engagements",c.decisions)+sec("Prochaines étapes",c.suites)+sec("Suite notée",a.suite)+'</div>'}).join("");
  const crit=[CRU.q?"recherche « "+CRU.q+" »":"",(CRP.find(x=>x[0]===CRU.p)||[])[1],CRU.f?(CRNAT.find(x=>x[0]===CRU.f)||[])[1]:""].filter(Boolean).join(" · ");
  const html='<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Comptes rendus'+(CRU.q?' · '+R(CRU.q):'')+'</title><style>'+
    'body{font:10pt/1.45 "IBM Plex Sans",Arial,sans-serif;color:#1E1B18;margin:12mm 13mm}h1{font-size:16pt;margin:0}p.s{color:#69625B;margin:1mm 0 5mm}'+
    '.cr{border-top:1.5px solid #A35C2A;padding:3mm 0 4mm;break-inside:avoid-page}h2{font-size:12pt;margin:0}p.m{color:#69625B;margin:.5mm 0 2mm}h3{font-size:9pt;text-transform:uppercase;letter-spacing:.05em;color:#A35C2A;margin:2.5mm 0 .5mm}.pre{white-space:pre-wrap;margin:0}'+
    'footer{margin-top:6mm;font-size:8pt;color:#69625B;border-top:1px solid #E0DDD7;padding-top:2mm}</style></head><body><h1>Comptes rendus</h1><p class="s">'+R(pl(L.length,"compte rendu","comptes rendus")+(crit?" · "+crit:""))+'</p>'+body+
    '<footer>Édité le '+new Date().toLocaleDateString("fr-FR")+' · CSC</footer><script>setTimeout(()=>print(),300)<\/script></body></html>';
  const w=window.open("","_blank");if(!w){toast("Fenêtre bloquée : autorisez les fenêtres pour imprimer.");return}w.document.write(html);w.document.close()}

/* Bloc du tableau de bord */
function crWidget(){const L=S.actions.filter(isCR).sort(aSortDesc).slice(0,6);
  return '<div class="panel"><div class="ph"><h2>Derniers comptes rendus</h2><button type="button" class="more" data-nav="cr">Tous</button></div>'+
    (L.length?'<div class="crw">'+L.map(a=>{const k=kOf(a.compteId);return '<div class="crw-i" data-aid="'+esc(a.id)+'" tabindex="0" role="button"><span class="num sub">'+(a.date?fdate(a.date):"—")+'</span><span class="grow"><b>'+esc(k?k.nom:"")+'</b><span class="sub">'+esc(a.objet||ALBL[a.type])+'</span></span></div>'}).join("")+'</div>'
      :'<p class="hint">Aucun compte rendu pour l\'instant.</p>')+'<button class="btn" type="button" data-anew="visite" data-cr="1" style="align-self:flex-start">'+I_CR+'Rédiger un compte rendu</button></div>'}

/* ---------- Événements ---------- */
let crT=null;
document.addEventListener("input",e=>{if(e.target&&e.target.id==="crQ"){CRU.q=e.target.value;CRU.lim=60;clearTimeout(crT);crT=setTimeout(()=>keepFocus("crQ",renderCR),180)}});
document.addEventListener("change",e=>{if(e.target&&e.target.id==="crP"){CRU.p=e.target.value;CRU.lim=60;cruSave();renderCR()}});
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-crf],[data-cract]");if(!t)return;
  if(t.dataset.crf!=null){CRU.f=t.dataset.crf;CRU.lim=60;cruSave();renderCR();return}
  if(t.dataset.cract==="more"){CRU.lim+=60;renderCR();return}
  if(t.dataset.cract==="print"){crPrintList();return}});
document.addEventListener("keydown",e=>{const t=e.target;if(e.key==="Enter"&&t&&t.matches&&t.matches(".crc[data-aid],.crw-i[data-aid]")){e.preventDefault();viewAction(t.dataset.aid)}});
