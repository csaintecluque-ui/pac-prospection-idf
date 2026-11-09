/* Registre · CSC — Exporter / sauvegarder / restaurer, copie de cibles vers d'autres campagnes, doublons
   Fichier 6/18 : les fichiers se chargent dans l'ordre et partagent leurs déclarations. */
"use strict";

/* ---------- Export, sauvegarde, restauration ---------- */
async function backupJSON(){const h=await hAll();return JSON.stringify(Object.assign({app:"Registre",version:3,exportLe:now()},snapshot(),{histo:h||{}}))}
function markBackup(){S.settings.lastBackup=now();if(S.settings.migrationV3)S.settings.migrationV3.vu=true;lsSave();renderNav()}
async function doBackup(){if(IN_FRAME&&!$("#exBox"))exportMenu();await offer("Registre_sauvegarde_"+todayISO()+".json",await backupJSON());markBackup();if(S.tab==="tdb")renderTdb()}
async function restore(text){
  let j;try{j=JSON.parse(text);if(!j||!Array.isArray(j.cibles))throw 0}catch(e){toast("Sauvegarde illisible : choisissez le fichier exporté par cette application.");return}
  const before={c:S.cibles.length,k:S.comptes.length,ct:S.contacts.length,a:S.actions.length,m:S.mailing.length,p:S.pac.length};
  if(j.schema===SCHEMA){
    const up=(coll,list,nf)=>{(list||[]).forEach(x=>{const o=nf(x);if(!o.id)o.id=uid();const i=S[coll].findIndex(y=>y.id===o.id);if(i>=0)S[coll][i]=o;else S[coll].push(o)})};
    up("comptes",j.comptes,knorm);up("contacts",j.contacts,ctnorm);up("actions",j.actions,anorm);up("cibles",j.cibles,norm);up("mailing",j.mailing,mnorm);up("devis",j.devis,dvnorm);
    (j.plans||[]).forEach(p=>{if(!S.plans.some(x=>x.id===p.id))S.plans.push(p)});up("pac",j.pac,pnorm);
    if(j.settings)S.settings=Object.assign({},j.settings,{lastBackup:S.settings.lastBackup||j.settings.lastBackup,migrationV3:S.settings.migrationV3});
    bump();ensurePlans();repairLinks()}
  else{
    /* Sauvegarde de la V2 : chaque fiche est rattachée à son compte, ses visites et échanges deviennent des actions */
    if(j.settings){const keep={lastBackup:S.settings.lastBackup,migrationV3:S.settings.migrationV3,planCourant:S.settings.planCourant};S.settings=Object.assign({objectif:8},S.settings,j.settings,keep)}
    (j.cibles||[]).forEach(x=>{const id=x.id||uid(),i=S.cibles.findIndex(c=>c.id===id);const prev=i>=0?S.cibles[i]:null;
      const c=absorbCible(Object.assign({},x,{id,compteId:prev?prev.compteId:""}));if(i>=0)S.cibles[i]=c;else S.cibles.push(c);bump()});
    (j.mailing||[]).forEach(x=>{const m=mnorm(x),ex=S.mailing.find(y=>y.id===m.id)||S.mailing.find(y=>mkey(y)===mkey(m));
      if(ex){m.id=ex.id;m.compteId=ex.compteId;m.contactId=ex.contactId;Object.assign(ex,m)}else{if(!m.id)m.id=uid();S.mailing.push(absorbMailing(m))}bump()});
    (j.pac||[]).forEach(x=>{const p=pnorm(x);if(!p.id)p.id=uid();const i=S.pac.findIndex(y=>y.id===p.id);if(i>=0){p.planId=S.pac[i].planId;S.pac[i]=p}else{p.planId=curPlan().id;S.pac.push(p)}});
    bump();ensurePlans();S.cibles.forEach(autoStage)}
  if(j.histo&&typeof j.histo==="object"){try{await hPutMany(new Map(Object.entries(j.histo)))}catch(e){}}
  lsSave();closeDrawer();render();
  const d=(a,b)=>a-b;
  toast("Restauré · "+[pl(S.cibles.length,"cible"),pl(S.comptes.length,"compte")+(S.comptes.length>before.k?" (+"+d(S.comptes.length,before.k)+")":""),pl(S.actions.length,"action"),pl(S.mailing.length,"ligne")+" de mailing",pl(S.pac.length,"ligne")+" de PAC"].join(" · "));
}
function exportMenu(){
  const rows=[["Compte","Type","Secteur","Département","Contact principal","Fonction","Téléphone","E-mail","Agence","BU d'origine","Apporteur","Source","Campagne","Diagnostics visés","Potentiel annuel (€)","Priorité","Étape","Motif sans suite","Prochaine action","Quoi","Visites réalisées","Opportunité","Montant opp. (€)","Statut opp.","N° devis","Notes"]]
    .concat(S.cibles.map(c=>{const k=kOf(c.compteId)||{},p=principal(c.compteId)||{},n=nextFor(c);return [c.compte,k.type,secteurOf(k),dLabel(c.dept),p.nom,p.fonction,p.tel,p.mail,c.agence,c.bu.join(", "),c.apporteur,c.source,c.campagne,c.prestations.map(x=>PLABEL[x]||x).join(", "),c.potentiel,c.priorite,SL[c.etape],c.motif,n?fdate(n.date):"",n?n.objet:"",visitsDone(c),c.opp.creee?"Oui":"Non",c.opp.creee?c.opp.montant:"",c.opp.creee?c.opp.statut:"",c.opp.devis,c.notes]}));
  const arows=[["Date","Heure","Compte","Type","Statut","Résultat","Contact","Objet","Détails / compte rendu","Accompagnant","Campagne","Compte rendu"]].concat(S.actions.slice().sort(aSortDesc).map(a=>{const k=kOf(a.compteId)||{},ct=ctById(a.contactId),cb=cibById(a.cibleId);return [fdate(a.date),a.heure,k.nom,ALBL[a.type]||a.type,stLbl(a),a.resultat,ct?ct.nom:a.interlocuteur,a.objet,a.details,a.accompagnant,cb?cb.campagne:"",a.cr?crRows(a).map(([l,v])=>l+" : "+v).join("\n"):""]}));
  const yy=new Date().getFullYear(),y0s=String(yy-1),y1s=String(yy);
  const krows=[["Compte","Type","Famille","Segment","Typologie","Contrat cadre","Statut","CA facturé "+y0s+" (€)","CA facturé "+y1s+" (€)","Devis en attente (€)","Département","Ville","Agence","Apporteur","Contacts","Campagnes","Dernier contact","Prochaine action","Quoi"]].concat(S.comptes.map(k=>{const n=nextOf(k.id),l=lastOf(k.id),h=k.histo;return [k.nom,k.type,FNOM[famOf(k)]||"",k.segment,k.typologie,k.contrat?"Oui":"",h?(HST[h.st]||[""])[0]:"",h?hCA(k,y0s):"",h?hCA(k,y1s):"",h&&h.dv.n?h.dv.m:"",dLabel(k.dept),k.ville,k.agence,k.apporteur,ctOf(k.id).length,cibOf(k.id).map(c=>c.campagne).join(", "),l?fdate(l.date):"",n?fdate(n.date):"",n?n.objet:""]}));
  const crows=[["Compte","Contact","Fonction","Téléphone","E-mail","Principal","Notes"]].concat(S.contacts.map(c=>{const k=kOf(c.compteId)||{};return [k.nom,c.nom,c.fonction,c.tel,c.mail,c.principal?"Oui":"",c.notes]}));
  const mrows=[["Envoyé","Date d'envoi","Relance le","Relance faite","Commentaire","Client","Typologie","Famille","Contact","E-mail","Agence","Apporteur","Liste","Envoyer ?","Point d'attention"]].concat(S.mailing.map(m=>[m.envoye?"Oui":"Non",fdate(m.dateEnvoi),fdate(m.relance),fdate(m.relanceFaite),m.commentaire,m.client,m.typologie,m.famille,m.contact,m.mail,m.agence,m.apporteur,m.liste,m.envoyer,m.attention]));
  let hasBk=false;try{hasBk=!!localStorage.getItem(BK_KEY)}catch(e){}
  const lb=S.settings.lastBackup;
  const d=$("#drawer");
  d.innerHTML='<div class="dh"><div class="grow"><span class="lbl">Exporter</span><h2 id="dTitle">Exporter et sauvegarder</h2></div><button class="btn ghost" type="button" data-act="close">Fermer</button></div>'+
  '<div class="db">'+
  '<div style="display:flex;flex-direction:column;gap:8px"><span class="lbl">Sauvegarde complète</span>'+
  '<button class="btn primary" type="button" id="exJ">Télécharger la sauvegarde complète (.json)</button>'+
  '<p class="hint">À faire chaque semaine : c\'est la seule copie de vos données en dehors de ce navigateur. '+(lb?'Dernière sauvegarde : '+new Date(lb).toLocaleDateString("fr-FR")+'.':'Aucune sauvegarde faite depuis la V3.')+' <span id="stoInfo"></span></p></div>'+
  '<div style="display:flex;flex-direction:column;gap:8px"><span class="lbl">Fichier Excel</span>'+
  (IN_FRAME?'<a class="btn" id="exX" href="#" target="_blank" rel="noopener" aria-disabled="true">Préparation du lien…</a><p class="hint">Notion bloque les téléchargements : un onglet s\'ouvre, produit le fichier et le télécharge. Il ne garde rien.</p>'
   :'<button class="btn" type="button" id="exX">Exporter en Excel (.xlsx)</button>')+
  xlSecHTML()+'</div>'+
  '<div style="display:flex;flex-direction:column;gap:8px"><span class="lbl">Copier pour Excel</span>'+
  '<button class="btn" type="button" id="exC">Cibles · '+pl(S.cibles.length,"ligne")+'</button>'+
  '<button class="btn" type="button" id="exA">Actions · '+pl(S.actions.length,"ligne")+'</button>'+
  '<button class="btn" type="button" id="exK">Comptes · '+pl(S.comptes.length,"ligne")+'</button>'+
  '<button class="btn" type="button" id="exT">Contacts · '+pl(S.contacts.length,"ligne")+'</button>'+
  (S.mailing.length?'<button class="btn" type="button" id="exM">Mailing · '+pl(S.mailing.length,"ligne")+'</button>':'')+'</div>'+
  '<div style="display:flex;flex-direction:column;gap:8px"><span class="lbl">Doublons de cibles</span><button class="btn" type="button" data-act="dupmenu">Vérifier les doublons</button><p class="hint">Même compte dans le même département : l\'application garde la fiche la plus avancée et la complète avec les autres.</p></div>'+
  '<div id="exBox" class="addv" hidden><p class="hint" id="exMsg"></p><textarea id="exOut" class="exout" readonly></textarea><div class="bar"><button class="btn primary" type="button" id="exCopy">Copier</button></div></div>'+
  '<div class="addv"><span class="lbl">Restaurer une sauvegarde</span><p class="hint">Choisissez un fichier de sauvegarde (V2 ou V3), ou collez son texte. Les éléments de la sauvegarde sont ajoutés, ou remplacés s\'ils existent déjà ; rien n\'est supprimé.</p><input type="file" id="imJ" accept=".json,.txt,application/json,text/plain"><textarea id="imTxt" class="exout" placeholder="Coller ici le texte de la sauvegarde"></textarea><div class="bar"><button class="btn" type="button" id="imBtn">Restaurer</button></div></div>'+
  '<div id="bkBox"></div>'+(false?'<div class="addv"><span class="lbl">Copie de l\'ancienne version (V2)</span><p class="hint">Conservée sur ce poste lors du passage en V3, telle qu\'elle était. Vous pouvez la télécharger, puis la supprimer pour libérer de la place dans le navigateur.</p><div class="bar"><button class="btn" type="button" id="bkDl">Télécharger la copie V2</button><button class="btn ghost danger" type="button" id="bkDel">Supprimer la copie V2</button></div></div>':'')+
  '</div>';
  $("#scrim").hidden=false;d.hidden=false;fillSto();fillBk();
  const stamp=todayISO();
  if(IN_FRAME){xlsxHandoffURL().then(u=>{const a=$("#exX");if(a){a.href=u;a.textContent="Exporter en Excel (.xlsx)";a.removeAttribute("aria-disabled");a.classList.add("primary")}}).catch(()=>{const a=$("#exX");if(a)a.textContent="Export Excel indisponible ici"})}
  else $("#exX").onclick=exportXlsxHere;
  $("#exJ").onclick=doBackup;
  $("#exC").onclick=()=>offer("Registre_cibles_"+stamp+".csv",csv(rows),tsv(rows));
  $("#exA").onclick=()=>offer("Registre_actions_"+stamp+".csv",csv(arows),tsv(arows));
  $("#exK").onclick=()=>offer("Registre_comptes_"+stamp+".csv",csv(krows),tsv(krows));
  $("#exT").onclick=()=>offer("Registre_contacts_"+stamp+".csv",csv(crows),tsv(crows));
  const em=$("#exM");if(em)em.onclick=()=>offer("Mailing_"+stamp+".csv",csv(mrows),tsv(mrows));
  $("#exCopy").onclick=async()=>{const t=$("#exOut");t.focus({preventScroll:true});t.select();
    try{await navigator.clipboard.writeText(t.value);toast("Copié")}
    catch(e){try{if(document.execCommand("copy")){toast("Copié");return}}catch(_){}toast("Le texte est sélectionné : faites Ctrl+C.")}};
  const im=$("#imJ");im.onchange=()=>{const f=im.files[0];if(!f)return;const r=new FileReader();r.onload=()=>restore(r.result);r.readAsText(f)};
  $("#imBtn").onclick=()=>{const v=$("#imTxt").value.trim();if(!v){toast("Collez d'abord le texte de la sauvegarde.");return}restore(v)};
  const bd=$("#bkDl");if(bd)bd.onclick=()=>{try{offer("Registre_copie_V2_"+stamp+".json",localStorage.getItem(BK_KEY)||"")}catch(e){toast("Copie illisible.")}};
  const bx=$("#bkDel");if(bx)bx.onclick=()=>{if(!bx.classList.contains("armed")){bx.classList.add("armed");bx.textContent="Confirmer : supprimer la copie V2";return}try{localStorage.removeItem(BK_KEY)}catch(e){}toast("Copie V2 supprimée de ce navigateur");exportMenu()};
}

/* ---------- Copie vers d'autres campagnes (clients multi-départements) ---------- */
let CP=null;
function deptFromCamp(name){const n=nh(name);for(const [code,dn] of DEPTS_LONG){if(n.includes(nh(dn)))return code}for(const [code] of DEPTS){if(new RegExp("(^| )"+code.toLowerCase()+"( |$)").test(n))return code}return ""}
function copyMenu(src){
  CP=clone(src);const k=nh(src.compte);
  const camps=[...new Set([CAMPAGNE_DEF,...S.cibles.map(x=>x.campagne).filter(Boolean)])].filter(x=>x!==src.campagne).sort((a,b)=>a.localeCompare(b,"fr"));
  const has=cp=>S.cibles.some(x=>x.campagne===cp&&nh(x.compte)===k);
  const d=$("#drawer");
  d.innerHTML='<div class="dh"><div class="grow"><span class="lbl">Copier vers d\'autres campagnes</span><h2 id="dTitle">'+esc(src.compte||"Sans nom")+'</h2><p class="hint" style="margin-top:4px">Depuis : '+esc(campShort(src))+(src.dept?' · '+esc(dLabel(src.dept)):'')+'</p></div><button class="btn ghost" type="button" data-act="close">Fermer</button></div>'+
  '<div class="db">'+
   '<div class="f"><span class="lbl">Campagnes de destination</span>'+
    (camps.length?'<div class="cpl">'+camps.map((cp,i)=>{const dup=has(cp),dd=deptFromCamp(cp);return '<label'+(dup?' class="dis"':'')+'><input type="checkbox" data-cp="'+esc(cp)+'"'+(dup?' disabled':'')+'><span class="grow">'+esc(cp.replace(/^PAC IDF – /,""))+'</span>'+(dup?'<span class="sub">déjà présente</span>':(dd?'<span class="ty">'+esc(dd)+'</span>':''))+'</label>'}).join("")+'</div>':'<p class="hint">Aucune autre campagne pour l\'instant : saisissez-en une ci-dessous.</p>')+
   '</div>'+
   '<div class="row"><div class="f"><label class="lbl" for="cp-new">Ou nouvelle campagne</label><input type="text" id="cp-new" placeholder="Prescripteurs – Yvelines"></div>'+
   '<div class="f"><label class="lbl" for="cp-dept">Département de la nouvelle campagne</label><select id="cp-dept"><option value="">Déduit du nom</option>'+DEPTS.map(([k2,n])=>'<option value="'+k2+'">'+esc(k2+" · "+n)+'</option>').join("")+'</select></div></div>'+
   '<div class="f"><span class="lbl">Reprendre</span><div class="checks">'+
    '<label><input type="checkbox" id="cp-notes" checked>Notes</label>'+
    '<label><input type="checkbox" id="cp-agence">Agence et accompagnant</label>'+
   '</div><p class="hint">Chaque copie repart à l\'étape « À qualifier », sans opportunité. Les contacts et l\'historique des actions restent communs : ils sont portés par le compte. Le département est déduit du nom de la campagne quand il y figure.</p></div>'+
  '</div>'+
  '<div class="df"><span class="grow"></span><button class="btn" type="button" data-act="close">Annuler</button><button class="btn primary" type="button" data-act="docopy">Copier</button></div>';
  $("#scrim").hidden=false;d.hidden=false;
}
async function doCopy(){
  const src=CP;if(!src)return;const k=nh(src.compte);
  const targets=[...document.querySelectorAll("#drawer input[data-cp]:checked")].map(i=>({camp:i.dataset.cp,dept:deptFromCamp(i.dataset.cp)}));
  const nv=$("#cp-new").value.trim();
  if(nv){if(nv===src.campagne){toast("C'est déjà la campagne de cette fiche.");return}
    if(S.cibles.some(x=>x.campagne===nv&&nh(x.compte)===k)){toast("Ce compte est déjà dans « "+nv+" ».");return}
    if(!targets.some(t=>t.camp===nv))targets.push({camp:nv,dept:$("#cp-dept").value||deptFromCamp(nv)})}
  if(!targets.length){toast("Cochez au moins une campagne.");return}
  const keepN=$("#cp-notes").checked,keepA=$("#cp-agence").checked;
  let ok=0,noDept=0;
  for(const t of targets){
    const c=Object.assign(blank(),clone(src),{id:uid(),creeLe:new Date().toISOString(),campagne:t.camp,dept:t.dept||"",
      etape:"a_qualifier",motif:"",leadIds:[],opp:blank().opp});
    delete c.exemple;delete c.majLe;
    if(!keepN)c.notes="";
    if(!keepA){c.agence="";c.accompagnant=""}
    if(!c.dept)noDept++;
    if(await saveCible(c)){ok++;S.open.add(c.id)}else break;
  }
  if(ok){CP=null;closeDrawer();toast((ok>1?ok+" copies créées":"Copie créée")+(noDept?" · département à renseigner sur "+noDept+" fiche"+(noDept>1?"s":""):""))}
}

/* ---------- Doublons : même client dans le même département ---------- */
let DUP=null,UNDO=null;
const dupKey=c=>{if(c.exemple)return "";const k=c.compteId||nh(c.compte);return k?k+"|"+(c.dept||""):""};
const STAGE_RANK={a_qualifier:0,cible:1,rdv:2,sans_suite:2,visite:3,opportunite:4,gagne:5};
const dupSig=g=>dupKey(g[0])+"#"+g.map(c=>c.id).sort().join(",");
function dupGroups(){
  const m={};S.cibles.forEach(c=>{const k=dupKey(c);if(k)(m[k]=m[k]||[]).push(c)});
  return Object.values(m).filter(g=>g.length>1)
    .map(g=>g.slice().sort((a,b)=>dupScore(b)-dupScore(a)||String(b.majLe||b.creeLe||"").localeCompare(String(a.majLe||a.creeLe||""))))
    .sort((a,b)=>a[0].compte.localeCompare(b[0].compte,"fr"))}
const dupIgnored=g=>(S.settings.dupIgnore||[]).includes(dupSig(g));
/* Fusion : la première fiche du groupe est conservée et complétée par les autres */
/* Enregistrement groupé : un seul rendu en mode local */
function renderDupNote(){
  const n=$("#dupNote");if(!n)return;
  if(!S.writable){n.hidden=true;return}
  if(UNDO){n.hidden=false;n.className="notice";
    n.innerHTML='<span><b>Doublons fusionnés</b> : '+pl(UNDO.n,"fiche")+' en trop supprimée'+(UNDO.n>1?'s':'')+'.</span><button class="btn" type="button" data-act="dupundo">Annuler la fusion</button><button class="btn ghost" type="button" data-act="dupok">OK</button>';return}
  const g=dupGroups().filter(x=>!dupIgnored(x)),extra=g.reduce((s,x)=>s+x.length-1,0);
  if(!extra){n.hidden=true;return}
  n.hidden=false;n.className="notice warn";
  n.innerHTML='<span><b>'+pl(extra,"doublon")+'</b> : '+pl(g.length,"client")+' en plusieurs exemplaires dans le même département.</span><button class="btn primary" type="button" data-act="dupmenu">Voir et fusionner</button>';
}
function dupMenu(){
  const groups=dupGroups();DUP=groups;
  const d=$("#drawer");
  const row=(c,j)=>'<span class="dupr">'+(j?'<span class="gone">Fusionnée</span>':'<span class="keep">Conservée</span>')+
    '<span class="pill st-'+c.etape+'">'+esc(SL[c.etape])+'</span>'+esc([campShort(c),visitsDone(c)?pl(visitsDone(c),"visite"):"",c.potentiel?eur(c.potentiel):"",c.opp&&c.opp.creee?"opportunité":""].filter(Boolean).join(" · "))+'</span>';
  d.innerHTML='<div class="dh"><div class="grow"><span class="lbl">Doublons</span><h2 id="dTitle">'+(groups.length?'Fusionner les doublons':'Aucun doublon')+'</h2></div><button class="btn ghost" type="button" data-act="close">Fermer</button></div>'+
  '<div class="db">'+(groups.length?
   '<div class="imp-sum" id="dupSum"></div>'+
   '<p class="hint">Un doublon, c\'est le même client dans le même département. Pour chacun, l\'application garde la fiche la plus avancée (opportunité, visites, étape) et la complète avec les autres : diagnostics visés, BU, priorité, potentiel, notes, opportunité. Les contacts et les actions restent sur le compte. Les fiches en trop sont supprimées. Décochez un client pour le laisser tel quel.</p>'+
   '<div class="cpl">'+groups.map((g,i)=>'<label class="dupg"><input type="checkbox" data-dg="'+i+'"'+(dupIgnored(g)?'':' checked')+'><span class="grow"><b>'+esc(g[0].compte)+'</b>'+(g[0].dept?' <span class="ty">'+esc(g[0].dept)+'</span>':'')+' <span class="sub">'+pl(g.length,"fiche")+'</span>'+g.map(row).join("")+'</span></label>').join("")+'</div>'
   :'<p class="hint">Aucun client n\'apparaît deux fois dans le même département. Un même client suivi dans deux départements n\'est pas un doublon.</p>')+
  '</div>'+
  (groups.length?'<div class="df"><span class="grow"></span><button class="btn" type="button" data-act="close">Annuler</button><button class="btn primary" type="button" data-act="dupgo" id="dupGo">Fusionner</button></div>':'');
  $("#scrim").hidden=false;d.hidden=false;dupCount();
}
function dupCount(){
  if(!DUP)return;const sel=[...document.querySelectorAll("#drawer input[data-dg]:checked")].map(i=>DUP[+i.dataset.dg]);
  const extra=sel.reduce((s,g)=>s+g.length-1,0),after=S.cibles.length-extra;
  const sum=$("#dupSum");if(sum)sum.innerHTML='<div><b>'+sel.length+'</b><span class="sub">client'+(sel.length>1?'s':'')+' à fusionner</span></div><div><b>'+extra+'</b><span class="sub">fiche'+(extra>1?'s':'')+' en trop</span></div><div><b>'+after+'</b><span class="sub">fiche'+(after>1?'s':'')+' après fusion</span></div>';
  const b=$("#dupGo");if(b){b.disabled=!extra;b.textContent=extra?"Fusionner "+pl(extra,"doublon"):"Fusionner"}
}
async function dupGo(){
  if(!DUP)return;const boxes=[...document.querySelectorAll("#drawer input[data-dg]")];
  const sel=boxes.filter(i=>i.checked).map(i=>DUP[+i.dataset.dg]);
  if(!sel.length){toast("Cochez au moins un client.");return}
  const btn=$("#dupGo");btn.disabled=true;btn.textContent="Fusion en cours…";
  const before=[],saves=[],dels=[];
  sel.forEach(g=>{g.forEach(c=>before.push(clone(c)));saves.push(mergeGroup(g));g.slice(1).forEach(c=>{dels.push(c.id);S.actions.forEach(a=>{if(a.cibleId===c.id)a.cibleId=g[0].id})})});
  const keepIgn=boxes.filter(i=>!i.checked).map(i=>dupSig(DUP[+i.dataset.dg]));
  if(!(await bulkApply(saves,dels))){btn.disabled=false;dupCount();return}
  dels.forEach(id=>S.open.delete(id));
  S.settings.dupIgnore=keepIgn;await saveSettings();
  UNDO={before,n:dels.length};DUP=null;closeDrawer();render();
  toast(pl(dels.length,"doublon")+" fusionné"+(dels.length>1?"s":""));
}
async function dupUndo(){
  if(!UNDO)return;const u=UNDO;UNDO=null;
  const ok=await bulkApply(u.before,[]);render();
  toast(ok?"Fusion annulée : "+pl(u.n,"fiche")+" rétablie"+(u.n>1?"s":""):"Annulation impossible pour le moment.");
}


function dupScore(c){
  let n=0;["agence","apporteur","accompagnant","notes","potentiel","motif"].forEach(k=>{if(c[k])n++});
  return (c.opp&&c.opp.creee?1e6:0)+visitsOf(c).length*1e4+(STAGE_RANK[c.etape]||0)*100+n+c.bu.length+c.prestations.length}
