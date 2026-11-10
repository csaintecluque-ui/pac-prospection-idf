/* Registre · CSC — Liste des comptes, fiche compte, cibles et campagnes
   Fichier 4/18 : les fichiers se chargent dans l'ordre et partagent leurs déclarations. */
"use strict";

/* ================= V3 · Comptes et fiche compte ================= */
const KV=[["prosp","En prospection",k=>cibOf(k.id).length>0],["Client existant","Clients existants",k=>k.type==="Client existant"],["Prospect","Prospects",k=>k.type==="Prospect"],["Prescripteur","Prescripteurs",k=>k.type==="Prescripteur"],
  ["retard","Action en retard",k=>{const n=nextOf(k.id);return !!(n&&n.date&&n.date<todayISO())}],["sans","Sans prochaine action",k=>!nextOf(k.id)&&cibOf(k.id).some(isActive)],["perdus","Clients perdus",k=>!!k.histo&&(k.histo.st==="perdu"||k.histo.st==="relance")],["devis","Devis en attente",k=>!!k.histo&&k.histo.dv.n>0],["contrat","Contrat cadre",k=>!!k.contrat],["groupes","Groupes et sites",k=>!!grpOf(k)||isGrp(k)],["tous","Tous",()=>true]];
function kBase(){const U=UI.kv,words=nh(U.q).split(" ").filter(Boolean);
  return S.comptes.filter(k=>{if(U.sec&&secteurOf(k)!==U.sec)return false;if(U.fam&&famOf(k)!==U.fam)return false;if(U.dp&&k.dept!==U.dp)return false;if(U.ag&&k.agence!==U.ag)return false;
    if(words.length){const hay=nh([k.nom,grpName(k),k.ville,k.notes,k.typologie,k.segment,k.agence,k.apporteur,...ctOf(k.id).map(c=>c.nom+" "+c.mail)].join(" "));if(!words.every(w=>hay.includes(w)))return false}
    return true})}
function renderComptes(){
  const el=$("#view-comptes"),U=UI.kv,B=kBase(),v=KV.find(x=>x[0]===U.v)||KV[0],L=B.filter(v[2]);
  const nxt=new Map(),lst=new Map();L.forEach(k=>{nxt.set(k.id,nextOf(k.id));lst.set(k.id,lastOf(k.id))});
  const so=U.sort;
  L.sort((a,b)=>{if(so==="name")return a.nom.localeCompare(b.nom,"fr");
    if(so==="last"){const x=lst.get(a.id),y=lst.get(b.id);return ((y&&y.date)||"").localeCompare((x&&x.date)||"")||a.nom.localeCompare(b.nom,"fr")}
    if(so==="ca"){const yp=String(new Date().getFullYear()-1),sc=k=>k.histo?hCA(k)+hCA(k,yp):caOf(k.id);return sc(b)-sc(a)||a.nom.localeCompare(b.nom,"fr")}
    if(so==="devis")return ((b.histo&&b.histo.dv.m)||0)-((a.histo&&a.histo.dv.m)||0)||a.nom.localeCompare(b.nom,"fr");
    const x=nxt.get(a.id),y=nxt.get(b.id);return ((x&&x.date)||(x?"9998":"9999")).localeCompare((y&&y.date)||(y?"9998":"9999"))||a.nom.localeCompare(b.nom,"fr")});
  const uniq=f=>[...new Set(S.comptes.map(f).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"fr"));
  let h=pageH("Suivi de prospection","Comptes",pl(S.comptes.length,"compte")+" · "+pl(S.contacts.length,"contact")+" · "+pl(S.comptes.filter(k=>cibOf(k.id).length).length,"compte")+" en prospection",
    '<button class="btn ghost" type="button" data-act="kimport">Importer</button><button class="btn ghost" type="button" data-act="kenr" title="Extraire les comptes à compléter, puis réintégrer les compléments">Compléter les infos</button><button class="btn ghost" type="button" data-act="export">Exporter / Excel</button><button class="btn primary" type="button" data-knew="1">'+I_PLUS+'Nouveau compte</button>');
  h+='<div class="chips">'+KV.map(([k,l,fn])=>'<button type="button" class="chip" data-kv="'+esc(k)+'" aria-pressed="'+(U.v===k)+'">'+esc(l)+'<span class="n num">'+B.filter(fn).length+'</span></button>').join("")+'</div>';
  h+='<div class="filters" style="grid-template-columns:minmax(0,2fr) repeat(5,minmax(0,1fr))"><div class="field-s"><label for="kQ">Rechercher</label><input type="search" id="kQ" value="'+esc(U.q)+'" placeholder="Compte, ville, contact, e-mail, notes…"></div>'+
    '<div class="field-s"><label for="kSec">Secteur</label><select id="kSec" data-kf="sec"><option value="">Tous</option>'+uniq(secteurOf).map(s=>'<option'+(U.sec===s?' selected':'')+'>'+esc(s)+'</option>').join("")+'</select></div>'+
    '<div class="field-s"><label for="kFam">Famille</label><select id="kFam" data-kf="fam"><option value="">Toutes</option>'+FAMILLES.map(([c,n])=>'<option value="'+c+'"'+(U.fam===c?' selected':'')+'>'+esc(n)+'</option>').join("")+'</select></div>'+
    '<div class="field-s"><label for="kDp">Département</label><select id="kDp" data-kf="dp"><option value="">Tous</option>'+DEPTS.filter(([d])=>d===U.dp||S.comptes.some(k=>k.dept===d)).map(([d,n])=>'<option value="'+d+'"'+(U.dp===d?' selected':'')+'>'+esc(d+" · "+n)+'</option>').join("")+'</select></div>'+
    '<div class="field-s"><label for="kAg">Agence</label><select id="kAg" data-kf="ag"><option value="">Toutes</option>'+uniq(k=>k.agence).map(s=>'<option'+(U.ag===s?' selected':'')+'>'+esc(s)+'</option>').join("")+'</select></div>'+
    '<div class="field-s"><label for="kSort">Trier par</label><select id="kSort" data-kf="sort"><option value="next"'+(so==="next"?' selected':'')+'>Prochaine action</option><option value="last"'+(so==="last"?' selected':'')+'>Dernière activité</option><option value="name"'+(so==="name"?' selected':'')+'>Nom</option><option value="ca"'+(so==="ca"?' selected':'')+'>CA facturé</option><option value="devis"'+(so==="devis"?' selected':'')+'>Devis en attente</option></select></div></div>';
  if(!L.length){h+='<div class="list-wrap"><div class="empty"><h3>Aucun compte dans cette vue</h3><p>Changez de vue ou retirez un filtre.</p></div></div>';el.innerHTML=h;return}
  const t=todayISO(),shown=L.slice(0,U.lim);
  h+='<div class="list-wrap"><table class="tbl"><thead><tr><th>Compte</th><th>Secteur</th><th>Contacts</th><th>Campagnes</th><th>Dernière activité</th><th>Prochaine action</th><th>Mailing</th><th class="r">CA facturé</th></tr></thead><tbody>'+
   shown.map(k=>{const cts=ctOf(k.id),p=principal(k.id),cs=cibOf(k.id),n=nxt.get(k.id),la=lst.get(k.id),ml=mlOf(k.id),sent=ml.filter(m=>m.envoye).sort((a,b)=>(b.dateEnvoi||"").localeCompare(a.dateEnvoi||""))[0],ca=caOf(k.id);
    return '<tr data-kid="'+esc(k.id)+'" tabindex="0"><td><div class="co"><b>'+esc(k.nom)+'</b></div><div class="sub">'+tyTag(k.type)+grpListTag(k)+(k.contrat?'<span class="ty">Contrat cadre</span>':'')+(k.histo&&(k.histo.st==="perdu"||k.histo.st==="relance")?'<span class="ty" style="background:var(--bad-soft);color:var(--bad)">Perdu</span>':'')+(k.histo&&k.histo.dv.n?'<span class="ty" style="background:var(--warn-soft);color:var(--warn)">'+pl(k.histo.dv.n,"devis","devis")+'</span>':'')+(k.dept?'<span class="ty">'+esc(k.dept)+'</span>':'')+esc([k.ville,k.agence].filter(Boolean).join(" · "))+'</div></td>'+
     '<td class="sub" style="max-width:200px">'+esc(secteurOf(k)||"—")+'</td>'+
     '<td>'+(p?'<div style="font-size:13px">'+esc(p.nom||p.mail)+'</div>':'<span class="sub">—</span>')+(cts.length>1?'<div class="sub">+ '+(cts.length-1)+' autre'+(cts.length>2?'s':'')+'</div>':'')+'</td>'+
     '<td><div class="stp">'+(cs.length?cs.map(c=>'<span class="pill st-'+c.etape+'" title="'+esc(c.campagne)+'">'+esc(SL[c.etape])+'</span>').join(""):'<span class="sub">—</span>')+'</div></td>'+
     '<td>'+(la?'<div class="nx"><span class="d">'+fdate(la.date)+'</span><span class="l">'+esc(la.label)+'</span></div>':'<span class="sub">—</span>')+'</td>'+
     '<td>'+(n?'<div class="nx"><span class="d'+(n.date&&n.date<t?' late':'')+'">'+esc(n.date?fdate(n.date):"Sans date")+'</span><span class="l">'+esc(n.objet||ALBL[n.type])+'</span></div>':'<span class="sub">—</span>')+'</td>'+
     '<td>'+(ml.length?(sent?'<div class="nx"><span class="d">'+fdate(sent.dateEnvoi)+'</span><span class="l">envoyé'+(sent.relance&&!sent.relanceFaite?' · relance '+fdate(sent.relance):'')+'</span></div>':'<span class="sub">'+esc(ml[0].liste||"Liste")+' · à envoyer</span>'):'<span class="sub">—</span>')+'</td>'+
     '<td class="r num">'+(k.histo?eur(hCA(k))+'<div class="sub">'+k.histo.y0+' : '+eur(hCA(k,k.histo.y0))+'</div>':ca?eur(ca)+'<div class="sub">mailing</div>':'<span class="sub">—</span>')+'</td></tr>'}).join("")+'</tbody></table></div>'+
   '<div class="pager">'+(L.length>shown.length?'<button class="btn" type="button" data-act="kmore">Afficher '+Math.min(150,L.length-shown.length)+' de plus</button>':'')+'<span class="sub">'+shown.length+' sur '+pl(L.length,"compte")+'</span></div>';
  el.innerHTML=h;
}

/* ---------- Fiche compte ---------- */
const HF=[["","Tout"],["cr","Comptes rendus"],["rdv","RDV et visites"],["appel","Appels"],["mail","Mails"],["note","Notes"],["autre","Autres"]];
const hGroup=x=>x.mailing?"mail":isRdv(x.type)?"rdv":x.type==="appel"?"appel":x.type==="mail"?"mail":x.type==="note"?"note":"autre";
function renderCompte(){
  const el=$("#view-compte"),k=kOf(S.kid);
  if(!k){el.innerHTML=pageH('<button type="button" data-nav="comptes">Comptes</button>',"Compte introuvable","Ce compte a peut-être été fusionné ou supprimé.","");return}
  const t=todayISO(),cts=ctOf(k.id).slice().sort((a,b)=>(b.principal-a.principal)||String(a.nom).localeCompare(String(b.nom),"fr")),cs=cibOf(k.id),A=actOf(k.id),ml=mlOf(k.id);
  const open=A.filter(isOpen).sort(aSort),n=open[0],la=lastOf(k.id),ca=caOf(k.id);
  const hist=A.filter(a=>a.statut!=="afaire").map(a=>Object.assign({},a));
  ml.filter(m=>m.envoye&&!S.actions.some(a=>a.mailingId===m.id)).forEach(m=>hist.push({mailing:true,id:m.id,type:"mail",date:m.dateEnvoi,statut:"fait",objet:"Mail envoyé · liste « "+(m.liste||"mailing")+" »",details:m.commentaire||"",contactId:m.contactId,resultat:m.relanceFaite?"Relancé le "+fdate(m.relanceFaite):m.relance?"Relance prévue le "+fdate(m.relance):""}));
  grpHist(k,hist);hist.sort(aSortDesc);
  const hf=UI.histF,hm=(x,f)=>f==="cr"?!!x.cr:hGroup(x)===f,H=hist.filter(x=>!hf||hm(x,hf));
  const rel=ml.filter(m=>m.envoye&&m.relance&&!m.relanceFaite);
  let h='<div class="page-h"><div class="grow"><span class="crumb"><button type="button" data-nav="comptes">Comptes</button>›<span>Fiche compte</span></span></div></div>';
  h+='<div class="acc-h"><div class="acc-top"><div class="grow"><h2>'+esc(k.nom)+'</h2><div class="acc-tags">'+tyTag(k.type)+grpTags(k)+(secteurOf(k)?'<span class="tag bu">'+esc(secteurOf(k))+'</span>':'')+(k.dept?'<span class="ty">'+esc(dLabel(k.dept))+'</span>':'')+(k.ville?'<span class="sub">'+esc(k.ville)+'</span>':'')+(k.contrat?'<span class="tag bu">Contrat cadre</span>':'')+(FNOM[famOf(k)]?'<span class="sub">· '+esc(FNOM[famOf(k)])+'</span>':'')+(k.agence?'<span class="sub">· agence '+esc(k.agence)+'</span>':'')+'</div></div>'+
    '<div class="bar"><button class="btn" type="button" data-prep="'+esc(k.id)+'" title="Fiche imprimable : informations, contacts, devis, échanges, prospection">Préparer le RDV</button><button class="btn" type="button" data-kedit="'+esc(k.id)+'">Modifier</button><button class="btn" type="button" data-ctnew="'+esc(k.id)+'">'+I_PLUS+'Contact</button><button class="btn" type="button" data-cibnew="'+esc(k.id)+'">'+I_PLUS+'Campagne</button><button class="btn primary" type="button" data-anew="visite" data-k="'+esc(k.id)+'">'+I_PLUS+'RDV</button></div></div>'+
    '<div class="acc-stats"><div><b class="'+(n&&n.date&&n.date<t?'late':'')+'">'+(n?esc(n.date?fdate(n.date):"Sans date"):"—")+'</b><span>'+(n?esc(n.objet||ALBL[n.type]):"Aucune action prévue")+'</span></div>'+
     '<div><b>'+(la?fdate(la.date):"—")+'</b><span>'+(la?"Dernier contact · "+esc(la.label):"Jamais contacté")+'</span></div>'+
     '<div><b>'+A.filter(a=>a.statut==="fait"&&a.type!=="note").length+'</b><span>actions réalisées · '+A.filter(a=>a.type==="visite"&&a.statut==="fait").length+' visite(s)</span></div>'+
     '<div><b>'+cs.length+'</b><span>'+(cs.length?esc(cs.map(c=>SL[c.etape]).join(", ")):"campagne")+'</span></div>'+
     (k.histo?'<div><b>'+eur(hCA(k))+'</b><span>CA facturé '+k.histo.y1+' · '+k.histo.y0+' : '+eur(hCA(k,k.histo.y0))+'</span></div>':'<div><b>'+(ca?eur(ca):"—")+'</b><span>CA connu (listes mailing)</span></div>')+'</div></div>';
  /* Colonne 1 : informations et contacts */
  const kv=(l,v)=>v?'<dt>'+l+'</dt><dd>'+v+'</dd>':'';
  const c1='<div class="panel"><div class="ph"><h2>Informations</h2><button type="button" class="more" data-kedit="'+esc(k.id)+'">Modifier</button></div><dl class="kvl">'+
     kv("Type",esc(k.type))+grpKv(k)+kv("Famille",esc(FNOM[famOf(k)]||"")+(famOf(k)&&!k.famille?' <span class="sub">(déduite)</span>':''))+kv("Segment",esc(k.segment))+kv("Typologie",esc(k.typologie)+(k.sousTypo&&k.sousTypo!==k.typologie?' · '+esc(k.sousTypo):''))+kv("Département",esc(dLabel(k.dept)))+kv("SIRET",esc(k.siret))+kv("Adresse",esc([k.adresse,[k.cp,k.ville].filter(Boolean).join(" ")].filter(Boolean).join(", ")))+
     kv("Téléphone",k.tel?'<a class="dl num" href="tel:'+esc(k.tel.replace(/[^\d+]/g,""))+'">'+esc(k.tel)+'</a>':"")+kv("Site web",k.web?'<a class="dl" href="'+esc(/^https?:/.test(k.web)?k.web:"https://"+k.web)+'" target="_blank" rel="noopener">'+esc(k.web)+'</a>':"")+
     kv("Agence",esc(k.agence))+kv("Apporteur",esc(k.apporteur))+'</dl>'+(k.notes?'<p class="dnotes" style="border-top:1px solid var(--line);padding-top:10px">'+esc(k.notes)+'</p>':'<p class="hint">Aucune note. Ajoutez l\'organisation, le patrimoine, les contrats en place…</p>')+grpHint(k)+'</div>'+grpPanel(k)+
   '<div class="panel"><div class="ph"><h2>Contacts</h2><span class="sub num">'+cts.length+'</span><button type="button" class="more" data-ctnew="'+esc(k.id)+'">+ Ajouter</button></div>'+
    (cts.length?'<div class="cards">'+cts.map(c=>'<div class="ccard"><div class="nm">'+(c.principal?'<span class="star" title="Contact principal">★</span>':'')+esc(c.nom||"Sans nom")+'</div>'+(c.fonction?'<div class="sub">'+esc(c.fonction)+'</div>':'')+
      (c.tel?'<a class="dl num" href="tel:'+esc(c.tel.replace(/[^\d+]/g,""))+'">'+I_TEL+esc(c.tel)+'</a>':'')+(c.mail?'<a class="dl" href="mailto:'+esc(c.mail)+'" target="_blank" rel="noopener">'+I_MAIL+esc(c.mail)+'</a>':'')+(c.notes?'<div class="sub" style="white-space:pre-line">'+esc(c.notes)+'</div>':'')+
      '<button class="btn ghost ed" type="button" data-ctedit="'+esc(c.id)+'">Modifier</button></div>').join("")+'</div>':'<p class="hint">Aucun contact. Ajoutez vos interlocuteurs : ils seront proposés dans chaque action.</p>')+'</div>';
  /* Colonne 2 : à venir et historique */
  const c2='<div class="panel"><div class="ph"><h2>À venir</h2><span class="sub num">'+open.length+'</span></div>'+qBtns(k.id,cs.length===1?cs[0].id:"")+
     (open.length||rel.length?'<div class="todo">'+open.map(a=>tItem(a,{noCompte:true,full:true})).join("")+rel.map(rItem).join("")+'</div>':'<p class="hint">Aucune action prévue : planifiez un RDV, un appel ou un rappel.</p>')+'</div>'+
   '<div class="panel"><div class="ph"><h2>Antécédents de facturation</h2>'+(k.histo?'<span class="sub">import du '+fdate(k.histo.imp)+' · '+pl(k.histo.nb,"pièce")+'</span>':'')+'</div>'+histoHead(k)+'<div id="histoList"></div></div>'+
   '<div class="panel"><div class="ph"><h2>Historique</h2><span class="sub num">'+hist.length+'</span>'+grpHistBtn(k)+(H.some(x=>x.details||x.cr)?'<button type="button" class="more" data-act="tlall">'+(H.every(x=>!(x.details||x.cr||x.suite)||TLO.has((x.mailing?"m":"a")+x.id))?'Tout replier':'Tout déplier')+'</button>':'')+'</div>'+
    (hist.length?'<div class="chips echips">'+HF.filter(([f])=>!f||hist.some(x=>hm(x,f))).map(([f,l])=>'<button type="button" class="chip" data-hf="'+f+'" aria-pressed="'+(hf===f)+'">'+l+'<span class="n num">'+(f?hist.filter(x=>hm(x,f)).length:hist.length)+'</span></button>').join("")+'</div>':'')+
    (H.length?'<div class="tl">'+H.map(x=>tlItem(x,cs)).join("")+'</div>':'<p class="hint">'+(hist.length?'Rien pour ce filtre.':'Aucun échange enregistré. Les appels, RDV et mails faits apparaissent ici, avec les mails envoyés depuis le mailing.')+'</p>')+'</div>';
  /* Colonne 3 : prospection, opportunités, mailing */
  const c3=dvAccPanel(k)+'<div class="panel"><div class="ph"><h2>Prospection</h2><button type="button" class="more" data-cibnew="'+esc(k.id)+'">+ Campagne</button></div>'+
    (cs.length?'<div class="cards">'+cs.map(c=>'<div class="cibc" data-cib="'+esc(c.id)+'"><div class="ctop"><span class="prio prio-'+esc(c.priorite)+'">'+esc(c.priorite)+'</span><span class="grow">'+esc(campShort(c))+'</span><span class="pill st-'+c.etape+'">'+esc(SL[c.etape])+'</span></div>'+
      '<div class="tags">'+c.prestations.map(p=>'<span class="tag" title="'+esc(PLABEL[p]||p)+'">'+esc(p)+'</span>').join("")+c.bu.map(b=>'<span class="tag bu">'+esc(b)+'</span>').join("")+'</div>'+
      '<div class="sub">'+esc([c.potentiel?"Potentiel "+eur(c.potentiel)+" / an":"",c.apporteur?"via "+c.apporteur:"",c.source].filter(Boolean).join(" · "))+'</div>'+
      (c.opp.creee?'<div class="kv">Opportunité : <b>'+esc(c.opp.statut)+(c.opp.montant?' · '+eur(c.opp.montant):'')+(c.opp.devis?' · '+esc(c.opp.devis):'')+'</b></div>':'')+(c.notes?'<div class="sub" style="white-space:pre-line;max-height:5.6em;overflow:hidden">'+esc(fmtNotes(c.notes))+'</div>':'')+'</div>').join("")+'</div>':'<p class="hint">Ce compte n\'est dans aucune campagne de prospection.</p>')+'</div>'+
   (ml.length?'<div class="panel"><div class="ph"><h2>Mailing</h2><span class="sub num">'+ml.length+'</span></div><div>'+ml.map(m=>'<div class="mlc" data-mopen="'+esc(m.id)+'"><div><b style="font-weight:600">'+esc(m.liste||"Liste")+'</b> · '+(m.envoye?'<span style="color:var(--ok)">envoyé le '+fdate(m.dateEnvoi)+'</span>':'<span class="sub">'+(mOui(m)?'à envoyer':esc(m.envoyer))+'</span>')+'</div><div class="sub">'+esc([m.contact,m.mail].filter(Boolean).join(" · "))+'</div>'+
     (m.mission||m.ca?'<div class="sub">'+esc([m.mission?"Dernière mission : "+m.mission:"",m.ca?"CA "+m.ca+" €":"",m.nbFact?m.nbFact+" facture(s)":""].filter(Boolean).join(" · "))+'</div>':'')+(m.relance?'<div class="sub">Relance '+(m.relanceFaite?'faite le '+fdate(m.relanceFaite):'le '+fdate(m.relance))+'</div>':'')+(m.commentaire?'<div class="sub">'+esc(m.commentaire)+'</div>':'')+'</div>').join("")+'</div></div>':'');
  h+='<div class="acc-grid"><div class="c1">'+c1+'</div><div class="c2">'+c2+'</div><div class="c3">'+c3+'</div></div>';
  el.innerHTML=h;if(k.histo)loadHisto(k.id);
}

/* ================= V3 · Cibles & campagnes (suivi de prospection) ================= */
const fmtNotes=t=>String(t||"").replace(/\s+·\s+(?=[A-ZÀ-Ý][^·:\n]{0,40}:)/g,"\n");
const startOfWeek=()=>mondayOf(todayISO());
const VIEWS=[
  {k:"actives",l:"Cibles actives",f:c=>isActive(c)},
  {k:"prioA",l:"Priorité A sans RDV",f:c=>c.priorite==="A"&&(c.etape==="a_qualifier"||c.etape==="cible")},
  {k:"relance",l:"Action en retard",f:c=>{const n=nextFor(c);return isActive(c)&&!!n&&!!n.date&&n.date<=todayISO()}},
  {k:"sans",l:"Sans prochaine action",f:c=>isActive(c)&&!nextFor(c)},
  {k:"visites",l:"RDV à venir (7 j)",f:c=>visitsOf(c).some(a=>a.statut==="afaire"&&a.date>=todayISO()&&a.date<=addDaysISO(7))},
  {k:"closes",l:"Clôturées",f:c=>!isActive(c)},
  {k:"toutes",l:"Toutes",f:()=>true}];
function filtered(){
  const v=VIEWS.find(x=>x.k===S.view)||VIEWS[0];
  const q=$("#q").value.trim().toLowerCase(),bu=$("#fBu").value,ag=$("#fAg").value,pr=$("#fPr").value;
  return S.cibles.filter(v.f).filter(c=>{
    if(bu&&!c.bu.includes(bu))return false;
    if(ag&&c.agence!==ag)return false;
    if(pr&&c.priorite!==pr)return false;
    const ty=$("#fTy").value;if(ty&&typeOf(c)!==ty)return false;
    const ca=$("#fCa").value;if(ca==="__"?!!c.campagne:(ca&&c.campagne!==ca))return false;
    const dp=$("#fDp").value;if(dp==="__"?!!c.dept:(dp&&c.dept!==dp))return false;
    if(q){const p=principal(c.compteId);const h=[c.compte,p&&p.nom,c.apporteur,c.campagne,c.agence,c.notes,secteurOf(kOf(c.compteId))].join(" ").toLowerCase();if(!h.includes(q))return false}
    return true;
  }).sort((a,b)=>{const k=$("#fSort").value;const na=nextFor(a),nb=nextFor(b);
    const byP=(a.priorite||"Z").localeCompare(b.priorite||"Z"),byN=((na&&na.date)||(na?"9998":"9999")).localeCompare((nb&&nb.date)||(nb?"9998":"9999")),byC=a.compte.localeCompare(b.compte,"fr");
    if(k==="dept")return (a.dept||"99").localeCompare(b.dept||"99")||byP||byC;
    if(k==="camp")return (a.campagne||"~").localeCompare(b.campagne||"~","fr")||(a.dept||"99").localeCompare(b.dept||"99")||byP||byC;
    if(k==="next")return byN||byP||byC;
    if(k==="name")return byC;
    if(k==="pot")return (Number(b.potentiel)||0)-(Number(a.potentiel)||0)||byP||byC;
    return byP||byN||byC});
}
function fillSelect(sel,opts,label){const cur=sel.value;sel.innerHTML='<option value="">'+label+'</option>'+opts.map(o=>'<option'+(o===cur?' selected':'')+'>'+esc(o)+'</option>').join("")}
const campShort=c=>(c.campagne?c.campagne.replace(/^PAC IDF – /,""):"Sans campagne");
function renderCampStrip(){const camps=[...new Set(S.cibles.map(c=>c.campagne).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"fr")),cur=$("#fCa").value;
  const order=["a_qualifier","cible","rdv","visite","opportunite","gagne","sans_suite"],col={a_qualifier:"var(--grey)",cible:"var(--info)",rdv:"var(--warn)",visite:"var(--accent)",opportunite:"var(--opp-open)",gagne:"var(--ok)",sans_suite:"var(--bad)"};
  $("#camps").innerHTML=camps.length>1?camps.map(cp=>{const C=S.cibles.filter(c=>c.campagne===cp),n=C.length,v=C.reduce((s,c)=>s+visitsDone(c),0),o=C.filter(c=>c.opp.creee).length;
    return '<button type="button" class="camp" data-camp="'+esc(cp)+'" aria-pressed="'+(cur===cp)+'"><b>'+esc(cp.replace(/^PAC IDF – /,""))+'</b><span class="cs"><span>'+pl(n,"cible")+'</span><span>'+pl(v,"visite")+'</span><span>'+pl(o,"opp.","opp.")+'</span></span><span class="bar5">'+order.map(k=>{const m=C.filter(c=>c.etape===k).length;return m?'<i style="width:'+(m/n*100)+'%;background:'+col[k]+'" title="'+esc(SL[k])+' : '+m+'"></i>':''}).join("")+'</span></button>'}).join(""):"";
  $("#camps").hidden=camps.length<2}
function renderCibles(){
  $("#views").innerHTML=VIEWS.map(v=>'<button type="button" class="chip" aria-pressed="'+(S.view===v.k)+'" data-view="'+v.k+'">'+esc(v.l)+'<span class="n num">'+S.cibles.filter(v.f).length+'</span></button>').join("");
  fillSelect($("#fBu"),BUS,"Toutes");
  {const sel=$("#fDp"),cur=sel.value;const used=[...new Set(S.cibles.map(c=>c.dept).filter(Boolean))].sort();
   sel.innerHTML='<option value="">Tous</option>'+used.map(d=>'<option value="'+esc(d)+'"'+(d===cur?' selected':'')+'>'+esc(dLabel(d))+' ('+S.cibles.filter(c=>c.dept===d).length+')</option>').join("")+(S.cibles.some(c=>!c.dept)?'<option value="__"'+(cur==="__"?' selected':'')+'>Non renseigné</option>':'');}
  {const sel=$("#fCa"),cur=sel.value;const used=[...new Set(S.cibles.map(c=>c.campagne).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"fr"));
   sel.innerHTML='<option value="">Toutes</option>'+used.map(x=>'<option value="'+esc(x)+'"'+(x===cur?' selected':'')+'>'+esc(x.replace(/^PAC IDF – /,""))+' ('+S.cibles.filter(c=>c.campagne===x).length+')</option>').join("")+(S.cibles.some(c=>!c.campagne)?'<option value="__"'+(cur==="__"?' selected':'')+'>Sans campagne</option>':'');}
  fillSelect($("#fAg"),[...new Set(S.cibles.map(c=>c.agence).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"fr")),"Toutes");
  const act=S.cibles.filter(isActive);
  $("#cibSub").textContent=pl(S.cibles.length,"cible")+" dans "+pl(new Set(S.cibles.map(c=>c.campagne).filter(Boolean)).size,"campagne")+" · "+act.length+" active"+(act.length>1?"s":"")+" · "+act.filter(c=>!nextFor(c)).length+" sans prochaine action";
  renderCampStrip();
  const ex=S.cibles.filter(c=>c.exemple).length,n=$("#exNote");
  if(ex){n.hidden=false;n.innerHTML='<b>'+ex+' fiche'+(ex>1?'s':'')+' d\'exemple</b> pour découvrir l\'outil. <button class="btn ghost" type="button" id="btnDelEx">Supprimer les exemples</button>'}else n.hidden=true;
  renderDupNote();
  renderList();
}
function renderList(){
  const w=$("#listWrap");
  if(!S.cibles.length){
    w.innerHTML='<div class="empty"><h3>Aucune cible pour l\'instant</h3><p>Une cible, c\'est un compte que vous travaillez dans une campagne de prospection : étape, priorité, diagnostics visés, potentiel, opportunité.</p><button class="btn primary" type="button" data-act="new">Créer une cible</button></div>';return}
  const rows=filtered();
  if(!rows.length){w.innerHTML='<div class="empty"><h3>Aucune cible dans cette vue</h3><p>Changez de vue ou retirez un filtre.</p></div>';return}
  const t=todayISO();
  const allOpen=rows.every(c=>S.open.has(c.id));
  w.innerHTML='<table><thead><tr><th class="tg"><button type="button" class="tgb" data-togall="1" aria-expanded="'+allOpen+'" title="'+(allOpen?'Tout replier':'Tout déplier')+'" aria-label="'+(allOpen?'Tout replier':'Tout déplier')+'">'+CHEV+'</button></th><th>Client</th><th>BU d\'origine</th><th>Diagnostics visés</th><th>Prio.</th><th>Étape</th><th>Prochaine action</th><th>Dernier contact</th><th class="r">Potentiel / an</th><th class="r">Visites</th></tr></thead><tbody>'+
  rows.map(c=>{
    const n=nextFor(c),late=n&&n.date&&n.date<t&&isActive(c),k=kOf(c.compteId),p=principal(c.compteId),la=lastOf(c.compteId);
    const nv=visitsDone(c);
    const op=S.open.has(c.id),has=!!(c.notes||p||actOf(c.compteId).length);
    return '<tr data-id="'+esc(c.id)+'" tabindex="0"'+(op?' class="open"':'')+'><td class="tg"><button type="button" class="tgb'+(has?' has':'')+'" data-tog="'+esc(c.id)+'" aria-expanded="'+op+'" aria-label="'+(op?'Replier':'Déplier')+' : contact et notes" title="'+(has?'Contact, notes et actions':'Rien de renseigné')+'">'+CHEV+'</button></td><td><div class="co"><button type="button" class="lk" data-kopen="'+esc(c.compteId)+'" title="Ouvrir la fiche compte">'+esc(c.compte||"Sans nom")+'</button>'+(c.exemple?'<span class="ex">Exemple</span>':'')+'</div><div class="sub">'+(k?tyTag(k.type)+' ':'')+(c.dept?'<span class="ty">'+esc(c.dept)+'</span> ':'')+esc([p&&p.nom,c.agence].filter(Boolean).join(" · "))+'</div></td>'+
    '<td><div class="tags">'+c.bu.map(b=>'<span class="tag bu">'+esc(b)+'</span>').join("")+'</div>'+(c.apporteur?'<div class="sub">via '+esc(c.apporteur)+'</div>':'')+'</td>'+
    '<td><div class="tags">'+c.prestations.map(p=>'<span class="tag" title="'+esc(PLABEL[p]||p)+'">'+esc(p)+'</span>').join("")+'</div></td>'+
    '<td><span class="prio prio-'+esc(c.priorite)+'">'+esc(c.priorite)+'</span></td>'+
    '<td><span class="pill st-'+c.etape+'">'+esc(SL[c.etape])+'</span></td>'+
    '<td>'+(n?'<div class="nx"><span class="d'+(late?' late':'')+'">'+esc(n.date?fdate(n.date):"Sans date")+'</span><span class="l">'+esc(n.objet||ALBL[n.type])+'</span></div>':'<span class="sub">—</span>')+'</td>'+
    '<td>'+(la?'<div class="nx"><span class="d">'+fdate(la.date)+'</span><span class="l">'+esc(la.label)+'</span></div>':'<span class="sub">—</span>')+'</td>'+
    '<td class="r num">'+(c.potentiel?eur(c.potentiel):'<span class="sub">—</span>')+'</td>'+
    '<td class="r num">'+nv+'</td></tr>'+(op?detRow(c):'')}).join("")+'</tbody></table>';
}
function detRow(c){
  const kv=(l,v)=>v?'<div class="kv">'+l+' : <b>'+esc(v)+'</b></div>':'';
  const sibs=siblings(c),p=principal(c.compteId),cts=ctOf(c.compteId),k=kOf(c.compteId);
  const contactSib=sibs.length?'<div class="kv" style="margin-top:6px">Aussi dans :</div><div class="sib">'+sibs.map(x=>'<button type="button" data-open="'+esc(x.id)+'" title="'+esc(x.campagne||"Sans campagne")+'">'+esc(campShort(x))+'</button>').join("")+'</div>':'';
  const contact='<div class="dcol"><span class="lbl">Contact'+(cts.length>1?'s ('+cts.length+')':'')+'</span>'+
    (p?'<div class="co">'+esc(p.nom||p.mail)+'</div>'+(p.fonction?'<div class="sub">'+esc(p.fonction)+'</div>':'')+
      (p.tel?'<a class="dl num" href="tel:'+esc(p.tel.replace(/[^\d+]/g,""))+'">'+I_TEL+esc(p.tel)+'</a>':'')+(p.mail?'<a class="dl" href="mailto:'+esc(p.mail)+'" target="_blank" rel="noopener">'+I_MAIL+esc(p.mail)+'</a>':''):'<div class="sub">Aucun contact renseigné</div>')+
    '<div style="height:4px"></div>'+kv("Agence",c.agence)+kv("Apporteur",c.apporteur)+kv("Accompagnant",c.accompagnant)+kv("Secteur",secteurOf(k))+kv("Département",dLabel(c.dept))+contactSib+'</div>';
  const notes='<div class="dcol"><span class="lbl">Notes</span>'+(c.notes?'<p class="dnotes">'+esc(fmtNotes(c.notes))+'</p>':'<p class="sub" style="margin:0">Aucune note.</p>')+
    (c.etape==="sans_suite"&&c.motif?'<div class="kv">Motif sans suite : <b>'+esc(c.motif)+'</b></div>':'')+'</div>';
  const A=actOf(c.compteId).slice().sort((x,y)=>(isOpen(y)-isOpen(x))||(isOpen(x)?aSort(x,y):aSortDesc(x,y))),cut=t=>t.length>200?t.slice(0,200)+"…":t;
  const suivi='<div class="dcol"><span class="lbl">Actions du compte'+(A.length?' ('+A.length+')':'')+'</span>'+
    (A.length?A.slice(0,3).map(x=>'<div class="dv"><span class="num">'+(x.date?fdate(x.date):"Sans date")+'</span> · <b>'+esc(ESHORT[x.type]||x.type)+'</b> · '+esc(stLbl(x))+(x.resultat?' · '+esc(x.resultat):'')+(x.objet?'<p><b>'+esc(x.objet)+'</b></p>':'')+(x.details?'<p>'+esc(cut(x.details))+'</p>':'')+'</div>').join("")+(A.length>3?'<div class="sub">+ '+pl(A.length-3,"autre action","autres actions")+' dans la fiche compte</div>':''):'<p class="sub" style="margin:0">Aucune action.</p>')+
    (c.opp.creee?'<div class="kv" style="margin-top:4px">Opportunité Athena : <b>'+esc(c.opp.statut)+(c.opp.montant?' · '+eur(c.opp.montant):'')+(c.opp.devis?' · '+esc(c.opp.devis):'')+'</b></div>':'')+
    '<div class="dact"><button class="btn" type="button" data-open="'+esc(c.id)+'">Modifier la cible</button><button class="btn" type="button" data-kopen="'+esc(c.compteId)+'">Fiche compte</button><button class="btn ghost" type="button" data-anew="appel" data-k="'+esc(c.compteId)+'" data-c="'+esc(c.id)+'">'+I_EV.appel+'Appel</button><button class="btn ghost" type="button" data-anew="visite" data-k="'+esc(c.compteId)+'" data-c="'+esc(c.id)+'">'+I_EV.visite+'RDV</button><button class="btn ghost" type="button" data-copy="'+esc(c.id)+'">Copier vers une autre campagne</button></div></div>';
  return '<tr class="det" data-det="'+esc(c.id)+'"><td colspan="10"><div class="det-in">'+contact+notes+suivi+'</div></td></tr>';
}
function toggleRow(id,force){
  const tr=document.querySelector('#listWrap tr[data-id="'+CSS.escape(id)+'"]');if(!tr)return;
  const op=force==null?!S.open.has(id):force;if(op===S.open.has(id))return;
  const c=S.cibles.find(x=>x.id===id);if(!c)return;
  const b=tr.querySelector("[data-tog]");
  if(op){S.open.add(id);tr.classList.add("open");tr.insertAdjacentHTML("afterend",detRow(c))}
  else{S.open.delete(id);tr.classList.remove("open");const d=tr.nextElementSibling;if(d&&d.matches("tr.det"))d.remove()}
  if(b){b.setAttribute("aria-expanded",String(op));b.setAttribute("aria-label",(op?"Replier":"Déplier")+" : contact et notes")}
  const all=document.querySelector("#listWrap [data-togall]");if(all){const ao=[...document.querySelectorAll("#listWrap tr[data-id]")].every(r=>S.open.has(r.dataset.id));all.setAttribute("aria-expanded",String(ao));const l=ao?"Tout replier":"Tout déplier";all.title=l;all.setAttribute("aria-label",l)}
}
function siblings(c){return S.cibles.filter(x=>x.id!==c.id&&x.compteId===c.compteId).sort((a,b)=>(a.campagne||"").localeCompare(b.campagne||"","fr"))}

/* ---------- Fiche cible (panneau latéral) ---------- */
let D=null,isNew=false,delArmed=false;
function openDrawer(id,preset){
  const src=id?S.cibles.find(c=>c.id===id):null;
  isNew=!src;D=src?clone(src):Object.assign(blank(),{id:uid(),creeLe:now()},preset||{});
  const k=kOf(D.compteId);if(k){D.compte=k.nom;if(isNew&&!D.dept)D.dept=k.dept}
  D._k={type:k?k.type:"Prospect",segment:k?k.segment:""};D._ct={nom:"",fonction:"",tel:"",mail:""};
  delArmed=false;$("#drawer").classList.add("wide");drawDrawer();$("#scrim").hidden=false;$("#drawer").hidden=false;
  const db=document.querySelector("#drawer .db");if(db)db.scrollTop=0;
  setTimeout(()=>{const f=$("#d-compte");if(f&&isNew&&!D.compteId)f.focus({preventScroll:true})},30);
}
function closeDrawer(){$("#scrim").hidden=true;$("#drawer").hidden=true;$("#drawer").classList.remove("wide");D=null;P=null;ME=null;CP=null;PIMP=null;DUP=null;MIMP=null;IMP=null}
function opts(list,cur,empty){if(cur&&!list.includes(cur))list=list.concat([cur]);return (empty!=null?'<option value="">'+esc(empty)+'</option>':'')+list.map(o=>'<option'+(o===cur?' selected':'')+'>'+esc(o)+'</option>').join("")}
function checks(name,list,sel,lab){return '<div class="checks">'+list.map(it=>{const v=Array.isArray(it)?it[0]:it,l=Array.isArray(it)?it[0]+" · "+it[1]:it;return '<label><input type="checkbox" data-arr="'+name+'" value="'+esc(v)+'"'+(sel.includes(v)?' checked':'')+'>'+esc(lab?lab(it):l)+'</label>'}).join("")+'</div>'}
function drawDrawer(){
  const c=D,k=kOf(c.compteId);
  const db0=document.querySelector("#drawer .db"),prevTop=$("#drawer").hidden||!db0?0:db0.scrollTop;
  const agences=[...new Set(S.cibles.map(x=>x.agence).filter(Boolean))];
  const camps=[...new Set([CAMPAGNE_DEF,...S.cibles.map(x=>x.campagne).filter(Boolean)])];
  const cts=k?ctOf(k.id):[],A=k?actOf(k.id):[],open=A.filter(isOpen).sort(aSort),done=A.filter(a=>!isOpen(a)).sort(aSortDesc);
  $("#drawer").innerHTML=
  '<div class="dh"><div class="grow"><span class="lbl">'+(isNew?"Nouvelle cible":"Cible · "+esc(campShort(c)))+'</span><h2 id="dTitle">'+esc(c.compte||"Compte à renseigner")+'</h2></div>'+(k?'<button class="btn" type="button" data-kopen="'+esc(k.id)+'">Fiche compte</button>':'')+'<button class="btn ghost" type="button" data-act="close" aria-label="Fermer">Fermer</button></div>'+
  '<div class="db"><form id="dForm" class="fgrid" onsubmit="return false">'+
  '<div class="fcol">'+
   '<fieldset><legend>Compte</legend>'+
    (k?'<div class="ccard" style="padding-right:12px"><div class="nm" style="padding-right:0">'+esc(k.nom)+'</div><div class="sub">'+esc([k.ville,k.agence?"agence "+k.agence:""].filter(Boolean).join(" · ")||"Compte existant")+'</div></div>'
      :'<div class="f"><label class="lbl" for="d-compte">Compte <span class="req">*</span></label><input type="text" id="d-compte" data-k="compte" list="kList" value="'+esc(c.compte)+'" placeholder="Nom exact du compte dans Athena" autocomplete="off">'+comptesDL()+'<p class="hint">Choisissez un compte existant, ou tapez un nouveau nom : le compte sera créé.</p></div>')+
    '<div class="f"><span class="lbl">Type de compte</span><div class="seg" role="group" aria-label="Type de compte">'+TYPES.map(ty=>'<button type="button" data-type="'+esc(ty)+'" aria-pressed="'+(c._k.type===ty)+'">'+esc(ty)+'</button>').join("")+'</div></div>'+
    '<div class="row"><div class="f"><label class="lbl" for="d-segment">Segment</label><select id="d-segment">'+opts(SEGMENTS,c._k.segment,"—")+'</select></div><div class="f"><label class="lbl" for="d-dept">Département (campagne)</label><select id="d-dept" data-k="dept"><option value="">—</option>'+DEPTS.map(([d,n])=>'<option value="'+d+'"'+(c.dept===d?' selected':'')+'>'+esc(d+" · "+n)+'</option>').join("")+'</select></div></div>'+
    (k?'<div class="f"><span class="lbl">Contacts du compte</span>'+(cts.length?'<div class="mini">'+cts.map(x=>'<div class="mi"><div class="grow"><b style="font-weight:500">'+(x.principal?'★ ':'')+esc(x.nom||x.mail)+'</b><div class="sub">'+esc([x.fonction,x.tel,x.mail].filter(Boolean).join(" · "))+'</div></div><button class="btn ghost" type="button" data-ctedit="'+esc(x.id)+'">Modifier</button></div>').join("")+'</div>':'<p class="hint">Aucun contact.</p>')+'<button class="btn" type="button" data-ctnew="'+esc(k.id)+'" style="align-self:flex-start">'+I_PLUS+'Contact</button></div>'
      :'<div class="row"><div class="f"><label class="lbl" for="dc-nom">Contact (facultatif)</label><input type="text" id="dc-nom" value="'+esc(c._ct.nom)+'"></div><div class="f"><label class="lbl" for="dc-fon">Fonction</label><input type="text" id="dc-fon" value="'+esc(c._ct.fonction)+'"></div></div><div class="row"><div class="f"><label class="lbl" for="dc-tel">Téléphone</label><input type="tel" id="dc-tel" value="'+esc(c._ct.tel)+'"></div><div class="f"><label class="lbl" for="dc-mail">E-mail</label><input type="email" id="dc-mail" value="'+esc(c._ct.mail)+'"></div></div>')+
   '</fieldset>'+
   '<fieldset><legend>Origine</legend>'+
    '<div class="f"><span class="lbl">BU d\'origine</span>'+checks("bu",BUS,c.bu)+'</div>'+
    '<div class="row"><div class="f"><label class="lbl" for="d-apporteur">Apporteur interne</label><input type="text" id="d-apporteur" data-k="apporteur" value="'+esc(c.apporteur)+'" placeholder="Collègue de l\'autre BU"></div><div class="f"><label class="lbl" for="d-source">Source</label><select id="d-source" data-k="source">'+opts(SOURCES,c.source)+'</select></div></div>'+
    '<div class="row"><div class="f"><label class="lbl" for="d-campagne">Campagne</label><input type="text" id="d-campagne" data-k="campagne" list="cpList" value="'+esc(c.campagne)+'"><datalist id="cpList">'+camps.map(a=>'<option value="'+esc(a)+'">').join("")+'</datalist></div><div class="f"><label class="lbl" for="d-agence">Agence de rattachement</label><input type="text" id="d-agence" data-k="agence" list="agList" value="'+esc(c.agence)+'"><datalist id="agList">'+agences.map(a=>'<option value="'+esc(a)+'">').join("")+'</datalist></div></div>'+
   '</fieldset>'+
   '<fieldset><legend>Potentiel</legend>'+
    '<div class="f"><span class="lbl">Diagnostics visés</span>'+checks("prestations",PRESTA,c.prestations,it=>it[0]+" · "+it[1])+'</div>'+
    '<div class="row"><div class="f"><label class="lbl" for="d-potentiel">Potentiel annuel estimé (€)</label><input type="number" min="0" step="500" id="d-potentiel" class="num" data-k="potentiel" value="'+esc(c.potentiel)+'"></div>'+
    '<div class="f"><span class="lbl">Priorité</span><div class="seg" role="group" aria-label="Priorité">'+["A","B","C"].map(p=>'<button type="button" data-prio="'+p+'" aria-pressed="'+(c.priorite===p)+'">'+p+'</button>').join("")+'</div></div></div>'+
    '<p class="hint">A : potentiel fort et apporteur identifié · B : à travailler · C : opportuniste.</p>'+
   '</fieldset>'+
   '<fieldset><legend>Opportunité Athena</legend>'+
    '<label class="toggle"><input type="checkbox" id="o-creee"'+(c.opp.creee?' checked':'')+'> Une opportunité a été créée dans Athena</label>'+
    '<div id="oFields"'+(c.opp.creee?'':' hidden')+' style="display:flex;flex-direction:column;gap:10px">'+
     '<div class="row"><div class="f"><label class="lbl" for="o-montant">Montant estimé (€)</label><input type="number" min="0" step="100" id="o-montant" class="num" value="'+esc(c.opp.montant)+'"></div><div class="f"><label class="lbl" for="o-statut">Statut</label><select id="o-statut">'+opts(OSTAT,c.opp.statut)+'</select></div></div>'+
     '<div class="row"><div class="f"><label class="lbl" for="o-devis">N° de devis Athena</label><input type="text" id="o-devis" value="'+esc(c.opp.devis)+'"></div><div class="f"><label class="lbl" for="o-date">Date de création</label><input type="date" id="o-date" value="'+esc(c.opp.date)+'"></div></div>'+
    '</div>'+
   '</fieldset>'+
  '</div>'+
  '<div class="fcol">'+
   '<fieldset><legend>Suivi de la cible</legend>'+
    '<div class="f"><span class="lbl">Étape</span><div class="steps">'+STAGES.map(s=>'<button type="button" data-stage="'+s.k+'" class="'+(SIDX[s.k]<SIDX[c.etape]&&c.etape!=="sans_suite"&&s.k!=="sans_suite"?"done":"")+'" aria-pressed="'+(c.etape===s.k)+'">'+esc(s.l)+'</button>').join("")+'</div><p class="hint">L\'étape avance seule quand un RDV est planifié ou réalisé sur le compte, et quand vous créez une opportunité.</p></div>'+
    (c.etape==="sans_suite"?'<div class="f"><label class="lbl" for="d-motif">Motif sans suite <span class="req">*</span></label><select id="d-motif" data-k="motif">'+opts(MOTIFS,c.motif,"Choisir un motif")+'</select></div>':'')+
    '<div class="f"><label class="lbl" for="d-acc">Accompagnant visite</label><input type="text" id="d-acc" data-k="accompagnant" value="'+esc(c.accompagnant)+'" placeholder="Chef d\'agence ou commercial de la BU"></div>'+
    '<div class="f"><label class="lbl" for="d-notes">Notes de prospection</label><textarea id="d-notes" data-k="notes" rows="5">'+esc(c.notes)+'</textarea></div>'+
   '</fieldset>'+
   '<section class="ech" aria-label="Actions du compte"><div class="ech-h"><span class="leg">Actions du compte</span></div>'+
    qBtns(k?k.id:"",c.id)+
    (open.length?'<div class="todo"><div class="todo-g acc">À venir<span class="n">'+open.length+'</span></div>'+open.map(a=>tItem(a,{noCompte:true,full:true})).join("")+'</div>':'<p class="hint">Aucune action prévue sur ce compte.</p>')+
    (done.length?'<div class="todo"><div class="todo-g">Historique<span class="n">'+done.length+'</span></div>'+done.slice(0,15).map(a=>tItem(a,{noCompte:true,full:true})).join("")+(done.length>15?'<button type="button" class="more" data-kopen="'+esc(k.id)+'" style="padding:6px 2px;text-align:left">Tout l\'historique dans la fiche compte</button>':'')+'</div>':'')+
    '<p class="hint">Les actions sont portées par le compte : elles se retrouvent dans l\'agenda, le tableau de bord et chaque campagne du compte.</p>'+
   '</section>'+
  '</div>'+
  '</form></div>'+
  '<div class="df">'+(isNew?'':'<button class="btn danger" type="button" data-act="del" id="dDel">Supprimer la cible</button><button class="btn ghost" type="button" data-copy="'+esc(c.id)+'">Copier vers…</button>')+'<span class="grow"></span><button class="btn" type="button" data-act="close">Fermer</button><button class="btn primary" type="button" data-act="save">Enregistrer</button></div>';
  const db1=document.querySelector("#drawer .db");if(db1&&prevTop)db1.scrollTop=prevTop;
}
function readForm(){
  const c=D;if(!c||!$("#dForm"))return;
  document.querySelectorAll("#dForm [data-k]").forEach(i=>{c[i.dataset.k]=i.value.trim?i.value.trim():i.value});
  c.potentiel=c.potentiel===""?"":Number(c.potentiel);
  c.bu=[...document.querySelectorAll('#dForm input[data-arr="bu"]:checked')].map(i=>i.value);
  c.prestations=[...document.querySelectorAll('#dForm input[data-arr="prestations"]:checked')].map(i=>i.value);
  const sg=$("#d-segment");if(sg)c._k.segment=sg.value;
  if($("#dc-nom"))c._ct={nom:vOf("dc-nom"),fonction:vOf("dc-fon"),tel:vOf("dc-tel"),mail:vOf("dc-mail")};
  const oc=$("#o-creee");if(oc){c.opp.creee=oc.checked;c.opp.montant=$("#o-montant").value===""?"":Number($("#o-montant").value);c.opp.statut=$("#o-statut").value;c.opp.devis=$("#o-devis").value.trim();c.opp.date=$("#o-date").value}
}
async function doSave(keepOpen){
  readForm();
  let k=kOf(D.compteId);
  if(!k){if(!D.compte){toast("Renseignez le nom du compte.");const f=$("#d-compte");if(f)f.focus({preventScroll:true});return false}
    k=findCompte(D.compte)||ensureCompte(D.compte,{origine:"cible",dept:D.dept||""})}
  k.type=D._k.type||k.type;k.segment=D._k.segment;if(!k.dept&&D.dept)k.dept=D.dept;k.majLe=now();
  if(D._ct&&(D._ct.nom||D._ct.mail||D._ct.tel))ensureContact(k.id,D._ct);
  D.compteId=k.id;D.compte=k.nom;
  if(D.opp.creee&&!D.opp.date)D.opp.date=todayISO();
  bump();autoStage(D);
  if(D.etape==="sans_suite"&&!D.motif){drawDrawer();toast("Choisissez un motif sans suite.");return false}
  const c=clone(D);delete c._k;delete c._ct;delete c.exemple;
  const wasNew=isNew;put("cibles",c);lsSave();
  if(keepOpen){isNew=false;D=Object.assign(clone(c),{_k:{type:k.type,segment:k.segment},_ct:{nom:"",fonction:"",tel:"",mail:""}});render();drawDrawer();return true}
  closeDrawer();render();toast(wasNew?"Cible créée":"Cible enregistrée");return true;
}
/* Doublons : fusion de deux cibles du même compte dans le même département */
function mergeGroup(g){
  const m=clone(g[0]),rest=g.slice(1);
  ["agence","apporteur","accompagnant","source","campagne","motif"].forEach(k=>{if(!m[k]){const o=rest.find(x=>x[k]);if(o)m[k]=o[k]}});
  g.forEach(x=>{if(x.priorite&&(!m.priorite||x.priorite<m.priorite))m.priorite=x.priorite;if((Number(x.potentiel)||0)>(Number(m.potentiel)||0))m.potentiel=x.potentiel});
  m.bu=[...new Set(g.flatMap(x=>x.bu))];
  m.prestations=PRESTA.map(p=>p[0]).filter(p=>g.some(x=>x.prestations.includes(p))).concat([...new Set(g.flatMap(x=>x.prestations))].filter(p=>!PLABEL[p]));
  let notes=[];g.forEach(x=>{const t=String(x.notes||"").trim();if(!t||notes.some(n=>n.includes(t)))return;notes=notes.filter(n=>!t.includes(n));notes.push(t)});
  m.notes=notes.join("\n");m.leadIds=[...new Set(g.flatMap(x=>x.leadIds||[]))];
  if(!(m.opp&&m.opp.creee)){const o=rest.find(x=>x.opp&&x.opp.creee);if(o)m.opp=clone(o.opp)}
  const ord=["a_qualifier","cible","rdv","visite","opportunite","gagne"];g.forEach(x=>{if(ord.indexOf(x.etape)>ord.indexOf(m.etape))m.etape=x.etape});
  const cr=g.map(x=>x.creeLe).filter(Boolean).sort()[0];if(cr)m.creeLe=cr;
  const r=norm(m);autoStage(r);return r}
