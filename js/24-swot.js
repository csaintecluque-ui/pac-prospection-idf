/* Registre · CSC — Analyse SWOT : forces, faiblesses, opportunités, menaces, sur l'entreprise (nom saisi), un compte, un secteur ou une campagne.
   Stratégies croisées (S×O, W×O, S×T, W×T) envoyées dans le plan d'action (PAC), importables seules (25) ; analyse jointe au PAC ; impression ;
   recherche globale ; bouton SWOT de la fiche compte.
   Chargé avant 18-demarrage.js (toujours en dernier) : partage les déclarations des fichiers précédents. */
"use strict";

const I_SW=SV+'<rect x="2" y="2" width="12" height="12" rx="1.5"/><path d="M8 2v12M2 8h12"/></svg>';
(()=>{const i=NAV.findIndex(x=>x[0]==="pac");
  if(i>=0&&!NAV.some(x=>x[0]==="swot")){NAV.splice(i,0,["swot","Analyse SWOT",I_SW,NAV[i][3]]);NAV[i+1][3]=""}
  if(!VIEWS_ALL.includes("swot"))VIEWS_ALL.push("swot");
  if(!$("#view-swot")){const p=$("#view-pac");if(p)p.insertAdjacentHTML("beforebegin",'<section id="view-swot" hidden></section>')}})();

const SWQD={s:"Atouts internes : savoir-faire, références, maillage des agences, réactivité, relation client…",
  w:"Points faibles internes : délais de rendu, prix, effectifs, couverture du territoire, dépendance à quelques clients…",
  o:"Facteurs externes favorables : réglementation, besoins des clients, appels d'offres, secteurs porteurs…",
  t:"Facteurs externes défavorables : concurrents, accords-cadres, pression sur les prix, conjoncture, budgets…"};
const SWPS={activite:"Entreprise",compte:"Compte",secteur:"Secteur",campagne:"Campagne",libre:"Autre sujet"};
const SWQ1={s:"une force",w:"une faiblesse",o:"une opportunité",t:"une menace"};
const SWXD={so:["so","Miser sur vos forces pour saisir les opportunités"],wo:["wo","Corriger vos faiblesses pour ne pas laisser passer les opportunités"],
  st:["st","Vous appuyer sur vos forces pour contrer les menaces"],wt:["wt","Réduire les faiblesses qui vous exposent aux menaces"]};
const SWIMP={1:"faible",2:"moyenne",3:"forte"};
const SWPH={activite:"L'entreprise, la filiale, la région ou l'agence que vous analysez.",
  compte:"Un client ou un prospect (un groupe compte avec ses sites) : les atouts et les fragilités de l'entreprise face à lui.",
  secteur:"Un secteur d'activité (segment ou typologie des comptes) : bailleurs sociaux, foncières, industriels…",
  campagne:"Une campagne de prospection : ses cibles, ses opportunités, ses motifs de classement sans suite.",
  libre:"Une offre, un marché, un appel d'offres…"};
const SWK="pac-idf-swot-ui";
const SWU=(()=>{const d={cur:""};try{return Object.assign(d,JSON.parse(localStorage.getItem(SWK)||"{}"))}catch(e){return d}})();
const swuSave=()=>{try{localStorage.setItem(SWK,JSON.stringify({cur:SWU.cur}))}catch(e){}};
let SWUNDO=null,SWN=null,SWDRAG=null;

/* ---------- Libellés ---------- */
const swQL=q=>(SWQ.find(x=>x[0]===q)||SWQ[0])[1];
const swXL=st=>(SWX.find(x=>x[0]===st)||SWX[0])[1];
const swTag=st=>'<span class="sw-tag"><i class="q-'+st[0]+'">'+st[0].toUpperCase()+'</i>×<i class="q-'+st[1]+'">'+st[1].toUpperCase()+'</i></span>';
const swCut=(s,n)=>{s=String(s||"").trim().replace(/\s+/g," ");return s.length>n?s.slice(0,n)+"…":s};
function swAuto(a){const y=a.periode?" "+a.periode:"";
  if(a.portee==="compte"){const k=kOf(a.compteId);return (k?k.nom:"Compte")+y}
  if(a.portee==="secteur")return (a.secteur||"Secteur")+y;
  if(a.portee==="campagne")return a.campagne||"Campagne";
  if(a.portee==="libre")return "Analyse SWOT"+y;
  return (a.entite||"Entreprise")+y}
const swTitle=a=>a.titre||swAuto(a);
function swScope(a){
  if(a.portee==="compte"){const k=kOf(a.compteId);return k?"Compte · "+k.nom:"Compte à choisir"}
  if(a.portee==="secteur")return a.secteur?"Secteur · "+a.secteur:"Secteur à choisir";
  if(a.portee==="campagne")return a.campagne?"Campagne · "+a.campagne:"Campagne à choisir";
  if(a.portee==="libre")return "Autre sujet";
  return a.entite?"Entreprise · "+a.entite:"Entreprise"}
const swList=()=>S.swot.slice().sort((a,b)=>String(a.creeLe||"").localeCompare(String(b.creeLe||"")));
const swCur=()=>S.swot.find(a=>a.id===SWU.cur)||swList()[0]||null;
const swCamps=()=>[...new Set(S.cibles.map(c=>c.campagne).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"fr"));
const swPacOf=x=>x.pacId?S.pac.find(p=>p.id===x.pacId)||null:null;
const swNextPer=p=>/^\d{4}$/.test(String(p||"").trim())?String(+p+1):"";
function swTouch(a){a.majLe=now();lsSave()}

/* ---------- Page ---------- */
const swItHTML=x=>'<div class="sw-it'+(x.imp===3?' imp3':x.imp===1?' imp1':'')+'" data-swi="'+esc(x.id)+'"><span class="sw-grip" draggable="true" title="Glisser vers un autre quadrant ou une autre place">⠿</span>'+
  '<textarea class="sw-ta" rows="1" data-swit="'+esc(x.id)+'" aria-label="'+esc(swQL(x.q))+'">'+esc(x.txt)+'</textarea>'+
  '<button type="button" class="sw-imp i'+x.imp+'" data-swimp="'+esc(x.id)+'" title="Importance '+SWIMP[x.imp]+' · cliquer pour changer" aria-label="Importance '+SWIMP[x.imp]+'"><i></i><i></i><i></i></button>'+
  '<button type="button" class="sw-x" data-swx="'+esc(x.id)+'" title="Supprimer" aria-label="Supprimer">'+I_X+'</button></div>';
function swAxHTML(x){const p=swPacOf(x),pn=p?(S.plans.find(y=>y.id===p.planId)||{}).nom||"":"";
  return '<div class="sw-it sw-axe" data-swa="'+esc(x.id)+'"><textarea class="sw-ta" rows="1" data-swat="'+esc(x.id)+'" aria-label="Axe '+esc(swXL(x.st).toLowerCase())+'">'+esc(x.txt)+'</textarea>'+
   (p?'<button type="button" class="sw-inpac" data-swpgo="'+esc(p.id)+'" title="Ouvrir la ligne du plan d\'action'+(pn?' « '+esc(pn)+' »':'')+'">'+I_CHECK+'Dans le PAC</button>'
     :'<button type="button" class="btn sw-pac" data-swpac="'+esc(x.id)+'" title="Créer une ligne du plan d\'action avec cet axe">→ PAC</button>')+
   '<button type="button" class="sw-x" data-swxa="'+esc(x.id)+'" title="Supprimer l\'axe" aria-label="Supprimer l\'axe">'+I_X+'</button></div>'}
function swQuad(a,q){const L=a.items.filter(x=>x.q===q);
  return '<div class="sw-q q-'+q+'" data-swq="'+q+'"><div class="sw-qh"><span class="sw-l">'+q.toUpperCase()+'</span><h3>'+swQL(q)+'</h3><span class="sub num">'+(L.length||"")+'</span></div>'+
   '<p class="hint">'+esc(SWQD[q])+'</p><div class="sw-list">'+L.map(swItHTML).join("")+'</div>'+
   '<input type="text" class="sw-add" data-swaddq="'+q+'" placeholder="Ajouter '+SWQ1[q]+'… (Entrée)" aria-label="Ajouter '+SWQ1[q]+'" autocomplete="off"></div>'}
function swHead(a){const k=a.portee==="compte"?kOf(a.compteId):null;let tg="";
  if(a.portee==="activite")tg='<div class="f sw-tg"><label class="lbl" for="swEnt">Entreprise</label><input type="text" id="swEnt" value="'+esc(a.entite)+'" placeholder="Nom de l\'entreprise, de la filiale ou de la région" autocomplete="off"></div>';
  else if(a.portee==="compte")tg='<div class="f sw-tg"><label class="lbl" for="swK">Compte</label><input type="text" id="swK" list="kList" value="'+esc(k?k.nom:"")+'" placeholder="Nom du compte" autocomplete="off">'+comptesDL()+'</div>';
  else if(a.portee==="secteur"){const L=secteursAll();if(a.secteur&&!L.includes(a.secteur))L.unshift(a.secteur);
    tg='<div class="f sw-tg"><label class="lbl" for="swSec">Secteur</label><select id="swSec"><option value="">Choisir un secteur…</option>'+L.map(s=>'<option'+(s===a.secteur?' selected':'')+'>'+esc(s)+'</option>').join("")+'</select></div>'}
  else if(a.portee==="campagne"){const L=swCamps();if(a.campagne&&!L.includes(a.campagne))L.unshift(a.campagne);
    tg='<div class="f sw-tg"><label class="lbl" for="swCamp">Campagne</label>'+(L.length?'<select id="swCamp"><option value="">Choisir une campagne…</option>'+L.map(s=>'<option'+(s===a.campagne?' selected':'')+'>'+esc(s)+'</option>').join("")+'</select>':'<p class="hint">Aucune campagne : elles viennent de vos cibles.</p>')+'</div>'}
  return '<div class="panel sw-head"><div class="sw-h1"><input type="text" id="swTit" class="sw-tit" value="'+esc(a.titre)+'" placeholder="'+esc(swAuto(a))+'" aria-label="Titre de l\'analyse" autocomplete="off">'+
   '<div class="bar">'+(k?'<button class="btn ghost" type="button" data-kopen="'+esc(k.id)+'">Fiche compte</button>':'')+
    (pacSwot(curPlan())===a?'<span class="sw-joined" title="Elle sort avec l\'impression et l\'export Excel de ce plan">'+I_CHECK+'Jointe au PAC « '+esc(curPlan().nom)+' »</span>'
      :'<button class="btn ghost" type="button" data-swjoin="1" title="Faire sortir cette analyse avec l\'impression et l\'export Excel du plan « '+esc(curPlan().nom)+' »">Joindre au PAC</button>')+
    '<button class="btn ghost" type="button" data-swdup="1" title="Nouvelle analyse reprenant ce contenu, par exemple pour la période suivante">Dupliquer</button><button class="btn ghost danger" type="button" data-swdel="1">Supprimer</button></div></div>'+
   '<div class="sw-meta"><div class="f"><span class="lbl">Portée</span><div class="seg" role="group" aria-label="Portée de l\'analyse">'+SWPORT.map(([p,l])=>'<button type="button" data-swp="'+p+'" aria-pressed="'+(a.portee===p)+'">'+esc(SWPS[p])+'</button>').join("")+'</div></div>'+tg+
   '<div class="f sw-pf"><label class="lbl" for="swPer">Période</label><input type="text" id="swPer" value="'+esc(a.periode)+'" placeholder="2026, T1 2027…" autocomplete="off"></div></div></div>'}
function swStrat(a){const nP=a.axes.filter(swPacOf).length;
  const cell=st=>{const L=a.axes.filter(x=>x.st===st),nm=swXL(st);
    return '<div class="sw-sc"><div class="sw-sch">'+swTag(st)+'<b>'+esc(nm)+'</b><span class="sub num">'+(L.length||"")+'</span></div><p class="hint">'+esc(SWXD[st][1])+'</p>'+
     '<div class="sw-list">'+L.map(swAxHTML).join("")+'</div><input type="text" class="sw-add" data-swaddx="'+st+'" placeholder="Ajouter un axe… (Entrée)" aria-label="Ajouter un axe, stratégie '+esc(nm.toLowerCase())+'" autocomplete="off"></div>'};
  return '<div class="panel sw-strat"><div class="ph"><h2>Stratégies · croisement SWOT</h2>'+(a.axes.length?'<span class="sub">'+pl(a.axes.length,"axe")+(nP?" · "+nP+" dans le PAC":"")+'</span>':'')+
     '<button class="btn ghost sw-ximp" type="button" data-swximport="1" title="Importer des axes stratégiques : Excel, Word, PowerPoint, PDF, texte ou texte collé (titres Offensive, Réorientation, Défensive, Repli, S × O…, ou matrice TOWS)">Importer</button></div>'+
   '<p class="hint">Croisez vos constats pour décider quoi faire. « → PAC » crée une ligne dans le plan d\'action en cours (« '+esc(curPlan().nom)+' ») pour la piloter.</p>'+
   '<div class="sw-st">'+cell("so")+cell("wo")+cell("st")+cell("wt")+'</div></div>'}
function renderSwot(){const el=$("#view-swot");if(!el)return;
  /* Saisies en cours dans les champs « Ajouter… » : conservées pendant le rafraîchissement */
  const dr={};el.querySelectorAll("input.sw-add").forEach(i=>{if(i.value)dr[i.dataset.swaddq||"x"+i.dataset.swaddx]=i.value});
  const L=swList(),a=swCur();if(a&&SWU.cur!==a.id){SWU.cur=a.id;swuSave()}
  const tools='<button class="btn ghost" type="button" data-swimport="1" title="Excel, Word, PowerPoint, PDF, texte ou texte collé">Importer</button><button class="btn ghost" type="button" data-swprint="1"'+(a?'':' disabled')+' title="Imprimer ou enregistrer en PDF">Imprimer</button><button class="btn primary" type="button" data-swnew="activite">'+I_PLUS+'Nouvelle analyse</button>';
  let h=pageH("Pilotage","Analyse SWOT","Forces, faiblesses, opportunités et menaces · de l'entreprise, d'un compte, d'un secteur ou d'une campagne",tools);
  if(!a){el.innerHTML=h+'<div class="list-wrap"><div class="empty"><h3>Aucune analyse SWOT</h3><p>Posez les forces, faiblesses, opportunités et menaces de l\'entreprise, d\'un compte, d\'un secteur ou d\'une campagne. Les stratégies qui en découlent partent dans votre plan d\'action.</p>'+
    '<div class="bar" style="justify-content:center"><button class="btn primary" type="button" data-swnew="activite">Analyser l\'entreprise</button><button class="btn" type="button" data-swnew="compte">Un compte</button><button class="btn" type="button" data-swnew="secteur">Un secteur</button><button class="btn" type="button" data-swnew="campagne">Une campagne</button><button class="btn" type="button" data-swimport="1">Importer un SWOT</button></div></div></div>';return}
  if(L.length>1)h+='<div class="camps sw-camps" aria-label="Analyses SWOT">'+L.map(x=>{const n=q=>x.items.filter(y=>y.q===q).length;
    return '<button type="button" class="camp" data-swsel="'+esc(x.id)+'" aria-pressed="'+(x.id===a.id)+'"><b>'+esc(swTitle(x))+'</b><span class="sub">'+esc(swScope(x))+(x.periode&&!swTitle(x).includes(x.periode)?' · '+esc(x.periode):'')+'</span>'+
     '<span class="cs">'+SWQ.map(([q,l])=>'<span title="'+esc(l)+'"><i class="sw-dot q-'+q+'"></i><b class="sw-cl">'+q.toUpperCase()+'</b> '+n(q)+'</span>').join("")+(x.axes.length?'<span>'+pl(x.axes.length,"axe")+'</span>':'')+'</span></button>'}).join("")+'</div>';
  h+=swHead(a);
  if(SWUNDO&&SWUNDO.aid===a.id)h+='<div class="notice sw-undo" role="status"><span class="grow">'+esc(SWUNDO.lbl)+'</span><button class="btn" type="button" data-swundo="1">Annuler</button></div>';
  h+='<div class="sw-mx"><span></span><span class="sw-ax">Positif</span><span class="sw-ax">Négatif</span><span class="sw-ax v">Interne</span>'+swQuad(a,"s")+swQuad(a,"w")+'<span class="sw-ax v">Externe</span>'+swQuad(a,"o")+swQuad(a,"t")+'</div>';
  h+=swStrat(a);
  h+='<div class="panel"><div class="ph"><h2>Notes</h2></div><textarea id="swNotes" rows="3" placeholder="Sources, hypothèses, personnes consultées, dates de mise à jour…">'+esc(a.notes)+'</textarea></div>';
  el.innerHTML=h;
  Object.entries(dr).forEach(([k,v])=>{const i=el.querySelector(k[0]==="x"&&k.length===3?'input[data-swaddx="'+k.slice(1)+'"]':'input[data-swaddq="'+k+'"]');if(i)i.value=v});
  swFit(el)}
function swFit(root){(root||document).querySelectorAll("textarea.sw-ta").forEach(t=>{t.style.height="auto";t.style.height=(t.scrollHeight+2)+"px"})}
/* Hauteur des lignes recalculée si la largeur change (fenêtre, panneau) ou quand les polices arrivent */
let swRT=null;window.addEventListener("resize",()=>{if(S.tab!=="swot")return;clearTimeout(swRT);swRT=setTimeout(()=>swFit($("#view-swot")),120)});
try{document.fonts.ready.then(()=>{if(S.tab==="swot")swFit($("#view-swot"))})}catch(e){}
function swFocus(sel){const i=document.querySelector(sel);if(i)i.focus({preventScroll:true})}

/* ---------- Modifications ---------- */
function swAdd(a,q,txt,src){txt=String(txt||"").trim();if(!txt)return null;const x=swItem({q,txt,src:src||""});a.items.push(x);SWUNDO=null;swTouch(a);return x}
function swAddAxe(a,st,txt){txt=String(txt||"").trim();if(!txt)return null;const x=swAxe({st,txt});a.axes.push(x);SWUNDO=null;swTouch(a);return x}
function swDel(a,kind,id){const L=a[kind],i=L.findIndex(x=>x.id===id);if(i<0)return;const x=L.splice(i,1)[0];
  SWUNDO={aid:a.id,kind,obj:x,idx:i,lbl:(kind==="items"?swQL(x.q).replace(/s$/,"")+" supprimée":"Axe supprimé")+(x.txt?" : « "+swCut(x.txt,70)+" »":"")};swTouch(a);renderSwot()}
function swUndo(){const u=SWUNDO,a=u&&S.swot.find(x=>x.id===u.aid);SWUNDO=null;if(!a){renderSwot();return}
  a[u.kind].splice(Math.min(u.idx,a[u.kind].length),0,u.obj);swTouch(a);renderSwot();toast("Suppression annulée")}
function swToPac(a,x){const p=pnorm({id:uid(),creeLe:now(),planId:curPlan().id,ordre:pacNextOrdre(),element:swCut(x.txt,200),
    descriptif:"Issu de l'analyse SWOT « "+swTitle(a)+" » · stratégie "+swXL(x.st).toLowerCase()+" ("+x.st[0].toUpperCase()+" × "+x.st[1].toUpperCase()+")",
    secteurs:a.portee==="secteur"&&a.secteur?[a.secteur]:[],campagnes:a.portee==="campagne"&&a.campagne?[a.campagne]:[]});
  put("pac",p);x.pacId=p.id;swTouch(a);renderNav();renderSwot();toast("Ajouté au plan d'action « "+curPlan().nom+" »")}
function swPacGo(pid){const p=S.pac.find(x=>x.id===pid);if(!p)return;if(p.planId&&p.planId!==S.settings.planCourant){S.settings.planCourant=p.planId;lsSave()}showTab("pac");openPac(pid)}
function swForCompte(kid){const k=kOf(kid);if(!k)return;
  let a=S.swot.filter(x=>x.portee==="compte"&&x.compteId===kid).sort((x,y)=>String(y.majLe||"").localeCompare(String(x.majLe||"")))[0];
  if(!a){a=swnorm({id:uid(),creeLe:now(),majLe:now(),portee:"compte",compteId:kid,periode:String(new Date().getFullYear())});S.swot.push(a);bump();lsSave();toast("Analyse SWOT créée pour "+k.nom)}
  SWU.cur=a.id;SWUNDO=null;swuSave();showTab("swot")}
const swGo=id=>{SWU.cur=id;SWUNDO=null;swuSave();showTab("swot")};

/* ---------- Nouvelle analyse (ou copie d'une analyse) ---------- */
function swNewOpen(portee,fromId){SWN={portee:portee||"activite",entite:S.settings.swEntite||"",kNom:"",secteur:"",campagne:"",titre:"",periode:String(new Date().getFullYear()),from:fromId||""};
  const f=fromId&&S.swot.find(x=>x.id===fromId);
  if(f){const k=kOf(f.compteId),np=swNextPer(f.periode);Object.assign(SWN,{portee:f.portee,entite:f.entite||SWN.entite,kNom:k?k.nom:"",secteur:f.secteur,campagne:f.campagne,periode:np||f.periode,
    titre:f.titre&&np&&f.titre.includes(f.periode)?f.titre.replace(f.periode,np):f.titre})}
  else if(S.tab==="compte"&&SWN.portee==="compte"){const k=kOf(S.kid);if(k)SWN.kNom=k.nom}
  swNewDraw()}
function swNewRead(){const n=SWN,v=id=>{const e=$("#"+id);return e?e.value:null};if(!n)return;
  [["swnE","entite"],["swnK","kNom"],["swnS","secteur"],["swnC","campagne"],["swnT","titre"],["swnP","periode"],["swnF","from"]].forEach(([id,f])=>{const x=v(id);if(x!=null)n[f]=x})}
function swNewDraw(){const n=SWN,ph=swAuto({portee:n.portee,entite:n.entite,compteId:(findCompte(n.kNom)||{}).id||"",secteur:n.secteur,campagne:n.campagne,periode:n.periode});let tg="";
  if(n.portee==="activite")tg='<div class="f"><label class="lbl" for="swnE">Entreprise</label><input type="text" id="swnE" value="'+esc(n.entite)+'" placeholder="Nom de l\'entreprise, de la filiale ou de la région" autocomplete="off"></div>';
  else if(n.portee==="compte")tg='<div class="f"><label class="lbl" for="swnK">Compte <span class="req">*</span></label><input type="text" id="swnK" list="kList" value="'+esc(n.kNom)+'" placeholder="Nom du compte" autocomplete="off">'+comptesDL()+'</div>';
  else if(n.portee==="secteur")tg='<div class="f"><label class="lbl" for="swnS">Secteur <span class="req">*</span></label><select id="swnS"><option value="">Choisir un secteur…</option>'+secteursAll().map(s=>'<option'+(s===n.secteur?' selected':'')+'>'+esc(s)+'</option>').join("")+'</select></div>';
  else if(n.portee==="campagne"){const C=swCamps();tg='<div class="f"><label class="lbl" for="swnC">Campagne <span class="req">*</span></label>'+(C.length?'<select id="swnC"><option value="">Choisir une campagne…</option>'+C.map(s=>'<option'+(s===n.campagne?' selected':'')+'>'+esc(s)+'</option>').join("")+'</select>':'<p class="hint">Aucune campagne pour l\'instant : elles viennent de vos cibles.</p>')+'</div>'}
  showModal(mHead("Analyse SWOT",n.from?"Dupliquer l'analyse":"Nouvelle analyse")+'<div class="db"><form id="swnForm" onsubmit="return false">'+
   '<div class="f"><span class="lbl">Sur quoi porte l\'analyse ?</span><div class="tpick" role="group" aria-label="Portée">'+SWPORT.map(([p,l])=>'<button type="button" data-swnp="'+p+'" aria-pressed="'+(n.portee===p)+'">'+esc(l)+'</button>').join("")+'</div><p class="hint">'+esc(SWPH[n.portee])+'</p></div>'+tg+
   '<div class="row"><div class="f"><label class="lbl" for="swnT">Titre <span class="sub">(facultatif)</span></label><input type="text" id="swnT" value="'+esc(n.titre)+'" placeholder="'+esc(ph)+'" autocomplete="off"></div>'+
    '<div class="f"><label class="lbl" for="swnP">Période</label><input type="text" id="swnP" value="'+esc(n.periode)+'" placeholder="2026, T1 2027…" autocomplete="off"></div></div>'+
   (S.swot.length?'<div class="f"><label class="lbl" for="swnF">Partir de</label><select id="swnF"><option value="">Une analyse vierge</option>'+swList().map(x=>'<option value="'+esc(x.id)+'"'+(x.id===n.from?' selected':'')+'>'+esc(swTitle(x)+" · "+pl(x.items.length,"ligne")+(x.axes.length?", "+pl(x.axes.length,"axe"):""))+'</option>').join("")+'</select><p class="hint">Reprend les lignes, les axes et les notes de l\'analyse choisie (sans les liens vers le PAC).</p></div>':'')+
   '</form></div><div class="df"><span class="grow"></span><button class="btn" type="button" data-act="mclose">Annuler</button><button class="btn primary" type="button" data-swcreate="1">Créer l\'analyse</button></div>',"sw");
  setTimeout(()=>{const f=(n.portee==="compte"&&!n.kNom&&$("#swnK"))||(n.portee==="activite"&&!n.entite&&$("#swnE"))||$("#swnT");if(f)f.focus({preventScroll:true})},30)}
function swCreate(){swNewRead();const n=SWN;if(!n)return;
  const o=swnorm({id:uid(),creeLe:now(),majLe:now(),portee:n.portee,titre:n.titre.trim(),periode:n.periode.trim()});
  if(n.portee==="activite"){o.entite=String(n.entite||"").trim();if(o.entite)S.settings.swEntite=o.entite}
  if(n.portee==="compte"){const k=findCompte(n.kNom);if(!k){toast("Choisissez un compte de la liste.");swFocus("#swnK");return}o.compteId=k.id}
  if(n.portee==="secteur"){if(!n.secteur){toast("Choisissez un secteur.");swFocus("#swnS");return}o.secteur=n.secteur}
  if(n.portee==="campagne"){if(!n.campagne){toast("Choisissez une campagne.");swFocus("#swnC");return}o.campagne=n.campagne}
  const f=n.from&&S.swot.find(x=>x.id===n.from);
  if(f){o.items=f.items.map(x=>swItem(Object.assign({},x,{id:""})));o.axes=f.axes.map(x=>swAxe(Object.assign({},x,{id:"",pacId:""})));o.notes=f.notes}
  S.swot.push(o);bump();SWU.cur=o.id;SWUNDO=null;SWN=null;swuSave();lsSave();closeModal();
  if(S.tab!=="swot")showTab("swot");else{renderSwot();window.scrollTo(0,0)}toast(f?"Analyse dupliquée":"Analyse créée")}

/* ---------- Impression : un bloc réutilisé seul (Imprimer) ou en tête du PAC (impression du plan, onglet ouvert depuis Notion) ---------- */
const SWP_CSS='.swp{font:9.8pt/1.42 "IBM Plex Sans",Arial,sans-serif;color:#1E1B18}.swp *{-webkit-print-color-adjust:exact;print-color-adjust:exact}'+
  '.swp .swp-h h2{font:700 17pt/1.2 "IBM Plex Sans",Arial,sans-serif;margin:0;text-transform:none;letter-spacing:0}.swp .swp-h p{color:#69625B;margin:1mm 0 4mm}'+
  '.swp .swp-mx{display:grid;grid-template-columns:6mm 1fr 1fr;gap:3mm}.swp .swp-ax{font-size:7.5pt;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#69625B;text-align:center}'+
  '.swp .swp-ax.v{writing-mode:vertical-rl;transform:rotate(180deg);align-self:center;justify-self:center}'+
  '.swp .swp-q{border:1px solid #E0DDD7;border-top:2.5px solid var(--c);border-radius:2mm;padding:2.5mm 3.5mm;break-inside:avoid;min-height:36mm;background:#fff}'+
  '.swp .swp-s{--c:#2E7A45;--b:#E2F0E6}.swp .swp-w{--c:#B0442D;--b:#F7E1DA}.swp .swp-o{--c:#2A66A8;--b:#E0EAF6}.swp .swp-t{--c:#9A6200;--b:#FBEED3}'+
  '.swp .swp-q h3{font:700 11pt "IBM Plex Sans",Arial,sans-serif;margin:0 0 1.5mm;display:flex;align-items:center;gap:2mm;color:#1E1B18}'+
  '.swp .swp-q h3 span{display:inline-grid;place-items:center;width:5.5mm;height:5.5mm;border-radius:1.2mm;background:var(--b);color:var(--c);font-size:9.5pt}'+
  '.swp ul{margin:0;padding-left:4.5mm}.swp li{margin:.8mm 0}.swp li.i3{font-weight:600}.swp li.i1{color:#69625B}.swp .swp-e{color:#69625B;margin:0}'+
  '.swp .swp-tt{font:700 11.5pt "IBM Plex Sans",Arial,sans-serif;color:#A35C2A;border-bottom:1.5px solid #A35C2A;padding-bottom:1mm;margin:5mm 0 2.5mm;break-after:avoid}'+
  '.swp .swp-xs{display:grid;grid-template-columns:1fr 1fr;gap:3mm 6mm}.swp .swp-x{break-inside:avoid}.swp .swp-x h4{font:700 10pt "IBM Plex Sans",Arial,sans-serif;margin:0 0 1mm}'+
  '.swp .swp-x h4 small{font-weight:500;color:#69625B}.swp .swp-pac{font-size:7pt;font-weight:600;color:#2E7A45;border:1px solid #2E7A45;border-radius:1mm;padding:0 1mm}'+
  '.swp .swp-pre{white-space:pre-wrap;margin:0}.swp .swp-lg{margin:3mm 0 0;font-size:8pt;color:#69625B}';
(()=>{if(!document.getElementById("swpCss")){const st=document.createElement("style");st.id="swpCss";st.textContent=SWP_CSS;document.head.appendChild(st)}})();
/* Données à imprimer, autonomes (l'onglet d'impression ouvert depuis Notion n'a pas les données du registre) */
function swPrintData(a){return {t:swTitle(a),sc:swScope(a),per:a.periode&&!swTitle(a).includes(a.periode)?a.periode:"",
  items:a.items.map(x=>({q:x.q,txt:x.txt,imp:x.imp})),axes:a.axes.map(x=>({st:x.st,txt:x.txt,pac:!!swPacOf(x)})),notes:a.notes||""}}
function swBlockHTML(d){const R=s=>esc(s==null?"":s),I=d.items||[],A=d.axes||[];
  const Q=q=>{const L=I.filter(x=>x.q===q);return '<div class="swp-q swp-'+q+'"><h3><span>'+q.toUpperCase()+'</span>'+swQL(q)+'</h3>'+(L.length?'<ul>'+L.map(x=>'<li class="i'+x.imp+'">'+R(x.txt)+'</li>').join("")+'</ul>':'<p class="swp-e">—</p>')+'</div>'};
  const X=st=>{const L=A.filter(x=>x.st===st);return '<div class="swp-x"><h4>'+R(swXL(st))+' <small>'+st[0].toUpperCase()+' × '+st[1].toUpperCase()+'</small></h4>'+(L.length?'<ul>'+L.map(x=>'<li>'+R(x.txt)+(x.pac?' <span class="swp-pac">PAC</span>':'')+'</li>').join("")+'</ul>':'<p class="swp-e">—</p>')+'</div>'};
  let b='<div class="swp-h"><h2>'+R(d.t)+'</h2><p>Analyse SWOT · '+R([d.sc,d.per].filter(Boolean).join(" · "))+'</p></div>'+
    '<div class="swp-mx"><span></span><span class="swp-ax">Positif</span><span class="swp-ax">Négatif</span><span class="swp-ax v">Interne</span>'+Q("s")+Q("w")+'<span class="swp-ax v">Externe</span>'+Q("o")+Q("t")+'</div>';
  if(A.length)b+='<h3 class="swp-tt">Stratégies</h3><div class="swp-xs">'+["so","wo","st","wt"].map(X).join("")+'</div>';
  if(String(d.notes||"").trim())b+='<h3 class="swp-tt">Notes</h3><p class="swp-pre">'+R(d.notes)+'</p>';
  if(I.some(x=>x.imp!==2))b+='<p class="swp-lg">En gras : importance forte · en gris : importance faible.</p>';
  return b}
function swPrint(a){
  const html='<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>SWOT · '+esc(swTitle(a))+'</title><style>@page{margin:11mm 12mm}body{margin:0}'+SWP_CSS+
    'footer{margin-top:6mm;font:8pt Arial,sans-serif;color:#69625B;border-top:1px solid #E0DDD7;padding-top:2mm}</style></head><body><div class="swp">'+swBlockHTML(swPrintData(a))+'</div>'+
    '<footer>Analyse éditée le '+new Date().toLocaleDateString("fr-FR")+' · CSC</footer><script>setTimeout(()=>print(),300)<\/script></body></html>';
  const w=window.open("","_blank");if(!w){toast("Fenêtre bloquée : autorisez les fenêtres pour imprimer l'analyse.");return}w.document.write(html);w.document.close()}

/* ---------- Analyse jointe au PAC : choisie dans la page du plan ; à défaut, celle dont des axes sont dans ce plan ---------- */
function pacSwot(p){if(!p||!S.swot.length||p.swotId==="")return null;
  if(p.swotId){const a=S.swot.find(x=>x.id===p.swotId);if(a)return a}
  const ids=new Set(planLines(p.id).map(l=>l.id));let best=null,n=0;
  S.swot.forEach(a=>{const k=a.axes.filter(x=>x.pacId&&ids.has(x.pacId)).length;if(k>n){n=k;best=a}});return best}
function pacSwotBar(plan){if(!S.swot.length)return "";const a=pacSwot(plan);
  return '<div class="pac-swbar">'+I_SW+'<label for="pSwot">Analyse SWOT jointe à l\'impression et à l\'export Excel du plan</label><select id="pSwot"><option value="">Aucune</option>'+
    swList().map(x=>'<option value="'+esc(x.id)+'"'+(a&&a.id===x.id?' selected':'')+'>'+esc(swTitle(x))+'</option>').join("")+'</select>'+
    (a?'<button type="button" class="more" data-swgo="'+esc(a.id)+'">Ouvrir l\'analyse</button>'+(plan.swotId===undefined?'<span class="sub">choisie d\'après les axes envoyés dans ce plan</span>':''):'')+'</div>'}
function pacSwotPrint(plan){const a=pacSwot(plan);return a?'<div class="pac-swot swp">'+swBlockHTML(swPrintData(a))+'</div>':""}
/* Onglet Excel « SWOT » placé après l'onglet du plan (08 · buildXlsx) */
function addSwotSheet(wb,name,a,plan){
  const ws=wb.addWorksheet(name,{properties:{tabColor:{argb:COPPER}},views:[{showGridLines:false}]});
  [5,64,64].forEach((w,i)=>ws.getColumn(i+1).width=w);
  const QC={s:["FF2E7A45","FFE2F0E6"],w:["FFB0442D","FFF7E1DA"],o:["FF2A66A8","FFE0EAF6"],t:["FF9A6200","FFFBEED3"]},BRD="FFD8D4CD",TXT="FF1E1B18",thin={style:"thin",color:{argb:BRD}};
  const est=t=>String(t||"").split("\n").reduce((s,l)=>s+Math.max(1,Math.ceil(l.length/62)),0);
  ws.mergeCells("A1:C1");const T=ws.getCell("A1");T.value="Analyse SWOT · "+swTitle(a);
  T.font={name:"Calibri",size:16,bold:true,color:{argb:PARCH}};T.fill={type:"pattern",pattern:"solid",fgColor:{argb:INK}};T.alignment={vertical:"middle",indent:1};ws.getRow(1).height=34;
  ws.mergeCells("A2:C2");const P2=ws.getCell("A2");P2.value=[swScope(a),a.periode&&!swTitle(a).includes(a.periode)?a.periode:"","jointe au plan « "+(plan.nom||"PAC")+" »","éditée le "+new Date().toLocaleDateString("fr-FR")].filter(Boolean).join(" · ");
  P2.font={name:"Calibri",size:10,italic:true,color:{argb:GREYTXT}};P2.alignment={vertical:"middle",indent:1};ws.getRow(2).height=20;
  let r=4;[["B","Positif"],["C","Négatif"]].forEach(([c,v])=>{const x=ws.getCell(c+r);x.value=v;x.font={name:"Calibri",size:9,bold:true,color:{argb:GREYTXT}};x.alignment={horizontal:"center"}});r++;
  /* Deux quadrants côte à côte : un en-tête coloré, puis une ligne par élément */
  const pair=(k1,k2,head,line,lbl)=>{const L1=line(k1),L2=line(k2),n=Math.max(L1.length,L2.length,1),r0=r,hr=ws.getRow(r);
    [[2,k1],[3,k2]].forEach(([ci,k])=>{const c=hr.getCell(ci),h=head(k);c.value=h.v;c.font={name:"Calibri",size:h.sz,bold:true,color:{argb:h.fg}};c.fill={type:"pattern",pattern:"solid",fgColor:{argb:h.bg}};
      c.alignment={vertical:"middle",indent:1};c.border={top:{style:"medium",color:{argb:h.top}},left:thin,right:thin}});hr.height=24;r++;
    for(let i=0;i<n;i++){const row=ws.getRow(r);let ln=1;
      [[2,L1[i]],[3,L2[i]]].forEach(([ci,x])=>{const c=row.getCell(ci);c.value=x?"• "+x.t:(i===0?"—":null);
        c.font={name:"Calibri",size:10.5,bold:!!x&&x.b,color:{argb:!x||x.g?GREYTXT:TXT}};c.alignment={vertical:"top",wrapText:true,indent:1};
        c.border=i===n-1?{left:thin,right:thin,bottom:thin}:{left:thin,right:thin};if(x)ln=Math.max(ln,est(x.t))});
      row.height=Math.max(17,ln*14+5);r++}
    if(lbl){ws.mergeCells(r0,1,r-1,1);const c=ws.getCell(r0,1);c.value=lbl;c.font={name:"Calibri",size:9,bold:true,color:{argb:GREYTXT}};c.alignment={textRotation:90,vertical:"middle",horizontal:"center"}}
    r++};
  const qHead=q=>({v:q.toUpperCase()+" · "+swQL(q),sz:12,fg:QC[q][0],bg:QC[q][1],top:QC[q][0]}),qLine=q=>a.items.filter(x=>x.q===q).map(x=>({t:x.txt,b:x.imp===3,g:x.imp===1}));
  pair("s","w",qHead,qLine,"INTERNE");pair("o","t",qHead,qLine,"EXTERNE");
  const sec=t=>{ws.mergeCells(r,1,r,3);const c=ws.getCell(r,1);c.value=t;c.font={name:"Calibri",size:13,bold:true,color:{argb:"FFA35C2A"}};c.border={bottom:{style:"medium",color:{argb:COPPER}}};ws.getRow(r).height=22;r+=2};
  if(a.axes.length){sec("Stratégies");
    const xHead=st=>({v:swXL(st)+" · "+st[0].toUpperCase()+" × "+st[1].toUpperCase(),sz:11,fg:INK,bg:"FFEFEEEB",top:BRD}),xLine=st=>a.axes.filter(x=>x.st===st).map(x=>({t:x.txt+(swPacOf(x)?"  (dans le PAC)":"")}));
    pair("so","wo",xHead,xLine,"");pair("st","wt",xHead,xLine,"")}
  if(String(a.notes||"").trim()){sec("Notes");ws.mergeCells(r,2,r,3);const c=ws.getCell(r,2);c.value=a.notes;c.font={name:"Calibri",size:10.5,color:{argb:TXT}};c.alignment={vertical:"top",wrapText:true,indent:1};
    ws.getRow(r).height=Math.min(409,Math.max(18,String(a.notes).split("\n").reduce((s,l)=>s+Math.max(1,Math.ceil(l.length/125)),0)*14+6))}
  ws.pageSetup={orientation:"portrait",paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:0,margins:{left:.4,right:.4,top:.5,bottom:.5,header:.25,footer:.25}};
  ws.headerFooter={oddFooter:"&LRegistre · CSC&RPage &P / &N"};return ws}

/* ---------- Recherche globale (17) ---------- */
function swFind(q){const w=nh(q).split(" ").filter(Boolean);if(!w.length)return [];
  return swList().filter(a=>{const h=nh([swTitle(a),swScope(a),a.periode,a.notes].concat(a.items.map(x=>x.txt),a.axes.map(x=>x.txt)).join(" "));return w.every(x=>h.includes(x))}).slice(0,5)
    .map(a=>({g:"Analyses SWOT",t:"swot",id:a.id,l:swTitle(a),s:[swScope(a),pl(a.items.length,"ligne"),a.axes.length?pl(a.axes.length,"axe"):""].filter(Boolean).join(" · ")}))}

/* ---------- Événements ---------- */
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("button");if(!t)return;const d=t.dataset;
  if(d.swk){swForCompte(d.swk);return}
  if(d.swgo){swGo(d.swgo);return}
  if(d.swnew!=null){swNewOpen(d.swnew||"activite");return}
  if(MODAL==="sw"&&SWN){
    if(d.swnp){swNewRead();SWN.portee=d.swnp;swNewDraw();return}
    if(d.swcreate){swCreate();return}}
  if(S.tab!=="swot")return;
  const a=swCur();if(!a)return;
  if(d.swsel){if(d.swsel!==a.id){SWU.cur=d.swsel;SWUNDO=null;swuSave();renderSwot()}return}
  if(d.swprint){swPrint(a);return}
  if(d.swjoin){const p=curPlan();p.swotId=a.id;lsSave();renderSwot();toast("Jointe au plan « "+p.nom+" » : elle sortira avec son impression et son export Excel");return}
  if(d.swdup){swNewOpen(a.portee,a.id);return}
  if(d.swdel){if(!t.classList.contains("armed")){t.classList.add("armed");t.textContent="Confirmer la suppression";return}
    S.swot=S.swot.filter(x=>x.id!==a.id);S.plans.forEach(p=>{if(p.swotId===a.id)delete p.swotId});bump();SWU.cur="";SWUNDO=null;swuSave();lsSave();renderSwot();toast("Analyse « "+swTitle(a)+" » supprimée");return}
  if(d.swp){if(a.portee!==d.swp){a.portee=d.swp;swTouch(a);renderSwot();if(d.swp==="compte"&&!kOf(a.compteId))swFocus("#swK")}return}
  if(d.swundo){swUndo();return}
  if(d.swimp){const x=a.items.find(y=>y.id===d.swimp);if(x){x.imp=x.imp%3+1;SWUNDO=null;swTouch(a);renderSwot()}return}
  if(d.swx){swDel(a,"items",d.swx);return}
  if(d.swxa){swDel(a,"axes",d.swxa);return}
  if(d.swpac){const x=a.axes.find(y=>y.id===d.swpac);if(x&&x.txt.trim())swToPac(a,x);return}
  if(d.swpgo){swPacGo(d.swpgo);return}
});
document.addEventListener("keydown",e=>{const t=e.target;if(!t||!t.dataset||e.key!=="Enter"||e.isComposing)return;
  if(t.dataset.swaddq||t.dataset.swaddx){e.preventDefault();const a=swCur();if(!a||!t.value.trim())return;
    if(t.dataset.swaddq){const q=t.dataset.swaddq;swAdd(a,q,t.value);t.value="";renderSwot();swFocus('input[data-swaddq="'+q+'"]')}
    else{const st=t.dataset.swaddx;swAddAxe(a,st,t.value);t.value="";renderSwot();swFocus('input[data-swaddx="'+st+'"]')}return}
  if((t.dataset.swit||t.dataset.swat)&&!e.shiftKey){e.preventDefault();t.blur();return}
  if(t.id==="swTit"||t.id==="swPer"||t.id==="swEnt"){e.preventDefault();t.blur()}});
document.addEventListener("input",e=>{const t=e.target;if(!t)return;
  if(t.classList&&t.classList.contains("sw-ta")){t.style.height="auto";t.style.height=(t.scrollHeight+2)+"px";return}
  /* Compte choisi dans la liste : appliqué tout de suite */
  if(t.id==="swK"&&S.tab==="swot"){const a=swCur(),k=findCompte(t.value);if(a&&k&&k.id!==a.compteId&&nh(k.nom)===nh(t.value)){a.compteId=k.id;swTouch(a);renderSwot()}}});
document.addEventListener("change",e=>{const t=e.target;if(!t||S.tab!=="swot")return;const a=swCur();if(!a)return;
  if(t.dataset.swit){const x=a.items.find(y=>y.id===t.dataset.swit);if(!x)return;const v=t.value.trim();if(!v){swDel(a,"items",x.id);return}if(v!==x.txt){x.txt=v;swTouch(a)}return}
  if(t.dataset.swat){const x=a.axes.find(y=>y.id===t.dataset.swat);if(!x)return;const v=t.value.trim();if(!v){swDel(a,"axes",x.id);return}if(v!==x.txt){x.txt=v;swTouch(a)}return}
  /* Titre, période, notes : enregistrés sans rafraîchir la page (le clic suivant n'est pas perdu) */
  if(t.id==="swTit"||t.id==="swPer"||t.id==="swEnt"){const v=t.value.trim();if(t.id==="swTit")a.titre=v;else if(t.id==="swPer")a.periode=v;else{a.entite=v;if(v)S.settings.swEntite=v}swTouch(a);
    const ti=$("#swTit");if(ti)ti.placeholder=swAuto(a);const c=document.querySelector('.sw-camps [data-swsel="'+a.id+'"] b');if(c)c.textContent=swTitle(a);return}
  if(t.id==="swNotes"){a.notes=t.value;swTouch(a);return}
  if(t.id==="swSec"){a.secteur=t.value;swTouch(a);renderSwot();return}
  if(t.id==="swCamp"){a.campagne=t.value;swTouch(a);renderSwot();return}
  if(t.id==="swK"){const k=findCompte(t.value);if(!k&&t.value.trim())toast("Compte introuvable : choisissez-le dans la liste.")}});
/* Page du PAC : analyse jointe au plan affiché ("" = aucune) */
document.addEventListener("change",e=>{const t=e.target;if(!t||t.id!=="pSwot")return;const p=curPlan(),a=S.swot.find(x=>x.id===t.value);p.swotId=t.value;lsSave();renderPac();
  toast(a?"« "+swTitle(a)+" » sortira avec l'impression et l'export Excel du plan":"Aucune analyse SWOT jointe à ce plan")});
/* Glisser-déposer : une ligne change de quadrant ou de place (poignée ⠿) */
const swDragEnd=()=>{SWDRAG=null;document.querySelectorAll(".sw-q.over,.sw-it.drag").forEach(x=>x.classList.remove("over","drag"))};
document.addEventListener("dragstart",e=>{const g=e.target.closest&&e.target.closest(".sw-grip");if(!g)return;const it=g.closest(".sw-it");if(!it)return;
  SWDRAG=it.dataset.swi;try{e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",SWDRAG);e.dataTransfer.setDragImage(it,14,14)}catch(_){}
  setTimeout(()=>it.classList.add("drag"),0)});
document.addEventListener("dragover",e=>{if(!SWDRAG)return;const q=e.target.closest&&e.target.closest(".sw-q");if(!q)return;e.preventDefault();
  try{e.dataTransfer.dropEffect="move"}catch(_){}document.querySelectorAll(".sw-q.over").forEach(x=>{if(x!==q)x.classList.remove("over")});q.classList.add("over")});
document.addEventListener("drop",e=>{if(!SWDRAG)return;const qEl=e.target.closest&&e.target.closest(".sw-q");const id=SWDRAG;swDragEnd();if(!qEl)return;e.preventDefault();
  const a=swCur();if(!a)return;const i=a.items.findIndex(x=>x.id===id);if(i<0)return;const x=a.items.splice(i,1)[0],from=x.q;x.q=qEl.dataset.swq;
  const ov=e.target.closest(".sw-it[data-swi]");let j=-1;
  if(ov&&ov.dataset.swi!==id){const k=a.items.findIndex(y=>y.id===ov.dataset.swi);if(k>=0){const r=ov.getBoundingClientRect();j=e.clientY>r.top+r.height/2?k+1:k}}
  if(j<0){let last=-1;a.items.forEach((y,n)=>{if(y.q===x.q)last=n});j=last+1||a.items.length}
  a.items.splice(j,0,x);SWUNDO=null;swTouch(a);renderSwot();if(from!==x.q)toast("Déplacé dans les "+swQL(x.q).toLowerCase())});
document.addEventListener("dragend",swDragEnd);
