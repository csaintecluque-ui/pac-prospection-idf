/* PAC Prospection IDF · CSC — Événements de l'interface et démarrage de l'application
   Fichier 18/18 : les fichiers se chargent dans l'ordre et partagent leurs déclarations. */
"use strict";

/* ================= V3 · Événements ================= */
document.addEventListener("click",async e=>{
  const t=e.target.closest("button,a[data-kopen],[data-aid],[data-mopen],[data-cday],[data-cib],[data-pid],tr[data-id],tr[data-kid],[data-act]");if(!t)return;
  const d=t.dataset;
  /* Fenêtre modale ouverte : ses propres boutons d'abord */
  if(d.act==="mclose"){closeModal();return}
  if(d.act==="msize"){const m=$("#modal");MSIZE=m.classList.contains("compact")?"auto":"compact";modalBig();if(m.classList.contains("moved")){const r=m.getBoundingClientRect();if(r.right<120||r.left>innerWidth-120){m.classList.remove("moved");m.style.left=m.style.top=""}}return}
  if(d.kpick){kPick(d.kpick);return}
  if(d.act==="crcopy"){crCopy();return}
  if(d.act==="crmail"){crMail();return}
  if(d.act==="crprint"){crPrint();return}
  if(d.atype&&AM){amRead();AM.type=d.atype;if(AM.type==="note")AM.statut="fait";drawAction();return}
  if(d.ast&&AM){amRead();AM.statut=d.ast;drawAction();return}
  if(d.act==="amsave"){const nl=NLINK;await amSave();if(nl&&!AM)nbDone(nl);return}
  if(d.act==="amdel"){await amDelete(t);return}
  if(d.act==="ctsave"){ctSave();return}
  if(d.act==="ctdel"){ctDelete(t);return}
  if(d.act==="ctback"){ctBack();return}
  if(d.ktype&&KM){kmRead();KM.type=d.ktype;document.querySelectorAll("#modal [data-ktype]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.ktype===KM.type)));return}
  if(d.act==="ksave"){kSave();return}
  if(d.act==="kdel"){kDelete(t);return}
  if(d.act==="kmerge"){kMergeMenu();return}
  if(d.act==="kmergego"){kMergeGo();return}
  if(d.act==="kmergeto"){kMergeGo(d.to);return}
  /* Navigation */
  if(d.famgo!=null){UI.kv.fam=d.famgo;UI.kv.v=d.kvset||"tous";UI.kv.lim=150;uiSave();closeModal();showTab("comptes");return}
  if(d.hisf!=null){UI.hisF=d.hisf;UI.hisAll=false;loadHisto(S.kid);return}
  if(d.act==="hisall"){UI.hisAll=true;loadHisto(S.kid);return}
  if(d.act==="pfam"){const n=ensureFamilyPlans(true);const f=S.plans.find(p=>p.famille);if(f)S.settings.planCourant=f.id;commit();toast(n?pl(n,"plan")+" créé"+(n>1?"s":"")+" : un par famille de clients":"Les plans par famille existent déjà");return}
  if(d.nav){closeModal();showTab(d.nav);return}
  if(d.kopen){e.stopPropagation();if(!d.kopen)return;closeModal();if(!$("#drawer").hidden)closeDrawer();showTab("compte",d.kopen);return}
  if(d.knew){openCompte(null);return}
  if(d.kedit){openCompte(d.kedit);return}
  if(d.ctnew){openContact({compteId:d.ctnew,from:d.from||""});return}
  if(d.ctedit){openContact({id:d.ctedit});return}
  if(d.cibnew){openDrawer(null,{compteId:d.cibnew});return}
  if(d.cib){openDrawer(d.cib);return}
  if(d.done){e.stopPropagation();await toggleDone(d.done);return}
  if(d.mrel){e.stopPropagation();relanceFaite(d.mrel);return}
  if(d.anew){
    let kid=d.k||"",cid=d.c||"";
    if(D&&t.closest("#drawer")){if(!(await doSave(true)))return;kid=D.compteId;cid=D.id}
    else if(!kid&&S.tab==="compte")kid=S.kid;
    closeModal();openAction({type:d.anew,compteId:kid,cibleId:cid,objet:d.obj||"",cr:!!d.cr});return}
  if(d.tlx){TLO.has(d.tlx)?TLO.delete(d.tlx):TLO.add(d.tlx);renderCompte();return}
  if(d.act==="tlall"){const k=kOf(S.kid);if(!k)return;const ids=actOf(k.id).filter(a=>a.statut!=="afaire"&&(a.details||a.cr||a.suite)).map(a=>"a"+a.id);const all=ids.every(x=>TLO.has(x));ids.forEach(x=>all?TLO.delete(x):TLO.add(x));renderCompte();return}
  if(d.act==="rvedit"&&RV){const id=RV.id;openAction({id});return}
  if(d.aid&&!t.matches("button.ck")){closeModal();viewAction(d.aid);return}
  if(d.mopen){mEditMenu(d.mopen);return}
  if(d.relday){MUI.view="rel";showTab("mailing");return}
  if(d.mailday){MUI.view="env";MUI.lim=200;showTab("mailing");return}
  if(d.cday){openAction({type:"visite",date:d.cday,compteId:S.tab==="compte"?S.kid:""});return}
  /* Calendrier */
  if(d.cmode){const k=d.cal;UI.cal[k].mode=d.cmode;if(k==="agenda")UI.ag.vue=d.cmode;uiSave();render();return}
  if(d.cnav!=null&&d.cal){calNav(d.cal,+d.cnav);return}
  /* Tableau de bord, agenda */
  if(d.agf){UI.ag.f=d.agf;UI.ag.vue="liste";UI.ag.lim=250;uiSave();if(S.tab!=="agenda")showTab("agenda");else render();return}
  if(d.agv){UI.ag.vue=d.agv;if(d.agv!=="liste")UI.cal.agenda.mode=d.agv;uiSave();render();return}
  if(d.act==="agmore"){UI.ag.lim+=250;render();return}
  if(d.act==="agnodate"){UI.ag.f="nodate";UI.ag.vue="liste";uiSave();showTab("agenda");return}
  if(d.act==="mrelview"){MUI.view="rel";MUI.lim=200;showTab("mailing");return}
  if(d.act==="migok"){if(S.settings.migrationV3)S.settings.migrationV3.vu=true;lsSave();render();return}
  if(d.act==="backup"){await doBackup();return}
  if(d.act==="export"){exportMenu();return}
  /* Comptes */
  if(d.kv){UI.kv.v=d.kv;UI.kv.lim=150;uiSave();render();return}
  if(d.act==="kmore"){UI.kv.lim+=150;render();return}
  if(d.act==="kimport"){histoMenu();return}
  if(t.matches("tr[data-kid]")){showTab("compte",d.kid);return}
  if(d.hf!=null&&t.matches(".chip")){UI.histF=d.hf;renderCompte();return}
  /* Cibles */
  if(d.camp!=null&&t.matches(".camp")){const s=$("#fCa");s.value=s.value===d.camp?"":d.camp;renderCibles();return}
  if(d.view){S.view=d.view;renderCibles();return}
  if(d.tog){toggleRow(d.tog);return}
  if(d.togall){const ids=[...document.querySelectorAll("#listWrap tr[data-id]")].map(r=>r.dataset.id);const ao=ids.every(id=>S.open.has(id));
    ids.forEach(id=>ao?S.open.delete(id):S.open.add(id));renderList();const b=$("#listWrap [data-togall]");if(b)b.focus({preventScroll:true});return}
  if(d.open){openDrawer(d.open);return}
  if(t.matches("tr[data-id]")){openDrawer(d.id);return}
  if(t.id==="btnNew"||d.act==="new"){openDrawer(null);return}
  if(t.id==="btnExport"){exportMenu();return}
  if(t.id==="btnImport"){importMenu();return}
  if(t.id==="btnDelEx"){
    if(!t.classList.contains("armed")){t.classList.add("armed","danger");t.textContent="Confirmer la suppression des exemples";return}
    S.cibles=S.cibles.filter(c=>!c.exemple);bump();commit();toast("Exemples supprimés");return}
  if(d.act==="close"){closeDrawer();return}
  /* Mailing */
  if(d.mview){MUI.view=d.mview;MUI.lim=200;renderMKpis();renderMList();return}
  if(d.act==="mimport"){mImportMenu();return}
  if(d.act==="mnew"){mEditMenu(null);return}
  if(d.medit){mEditMenu(d.medit);return}
  if(d.act==="mesave"){await mSaveEdit();return}
  if(d.act==="medel"){await mDeleteEdit(t);return}
  if(d.act==="meopen"){const ex=S.mailing.find(x=>x.id===d.id);if(!ex||!ME)return;mReadEdit();const typed=ME,m=clone(ex);
    if(typed.envoye&&!m.envoye){m.envoye=true;m.dateEnvoi=typed.dateEnvoi||todayISO();m.relance=m.relance||typed.relance}
    if(typed.commentaire&&!String(m.commentaire).includes(typed.commentaire))m.commentaire=[m.commentaire,typed.commentaire].filter(Boolean).join(" · ");
    ["contact","typologie","famille","agence","apporteur","appel","accroche","attention"].forEach(k=>{if(!m[k]&&typed[k])m[k]=typed[k]});
    const changed=JSON.stringify(m)!==JSON.stringify(ex);ME=m;meNew=false;meDel=false;mDrawEdit();
    toast(changed?"Fiche existante ouverte avec votre saisie : vérifiez, puis Enregistrer.":"Fiche existante ouverte.");return}
  if(d.act==="mimpgo"){await mImportGo();return}
  if(d.act==="mcopy"){await mCopyAddresses();return}
  if(d.act==="mmark"){await mMarkCopied();return}
  if(d.act==="mnoteclose"){MUI.copied=null;MUI.showCopy="";renderMNote();return}
  if(d.act==="mmore"){MUI.lim+=200;renderMList();return}
  if(d.act==="mexport"){exportMenu();return}
  if(d.mrelok){const m=S.mailing.find(x=>x.id===d.mrelok);if(m){m.relanceFaite=todayISO();mPersist(m);renderMKpis();renderMList();toast("Relance notée comme faite")}return}
  if(d.mcp!=null){const m=mById(t.closest("tr[data-mid]")),tp=m&&mTpl(m);if(!tp)return;
    try{await navigator.clipboard.writeText(tp.corps);toast("Texte du mail copié · objet : "+tp.objet)}catch(e2){toast("Copie bloquée ici : utilisez le bouton Mail.")}return}
  if(d.act==="dupmenu"){dupMenu();return}
  if(d.act==="dupgo"){await dupGo();return}
  if(d.act==="dupundo"){await dupUndo();return}
  if(d.act==="dupok"){UNDO=null;render();return}
  /* PAC */
  if(d.act==="pmanage"){planManage();return}
  if(d.plm){planAct(d.plm,d.id,t);return}
  if(d.plan){S.settings.planCourant=d.plan;PUI.f="";puiSave();lsSave();render();return}
  if(d.act==="pplannew"){planMenu(true);return}
  if(d.act==="pplancreate"){await planCreate();return}
  if(d.act==="pplansave"){planSave();return}
  if(d.act==="pplandel"){planDelete(t);return}
  if(d.act==="pplandup"){planDup();return}
  if(d.act==="psecteurs"){pacSecteursMenu();return}
  if(d.act==="psecgo"){pacSecteursGo();return}
  if(d.act==="pdedup"){pacDedup(t);return}
  if(d.pid&&(t.matches("tr")||t.matches(".pi"))){openPac(d.pid);return}
  if(d.pprio){const p=S.pac.find(x=>x.id===d.pprio);if(!p)return;const c=clone(p);const seq=["1","2","3",""];c.prio=seq[(seq.indexOf(c.prio)+1)%4];
    if(await savePac(c))toast((c.prio?"Priorité "+prioLbl(c.prio):"Priorité retirée")+" — "+c.element);return}
  if(d.pf!=null&&t.matches(".chip")){PUI.f=d.pf;puiSave();renderPac();return}
  if(d.pdq){const p=S.pac.find(x=>x.id===d.pdq);if(!p)return;const c=clone(p);c.decision=c.decision===d.d?"":d.d;
    if(await savePac(c))toast(c.decision?"Décision : "+c.decision.toLowerCase()+" — "+c.element:"Décision retirée");return}
  if(d.act==="pnew"){openPac(null);return}
  if(d.act==="pexport"){exportMenu();return}
  if(d.act==="pprint"){pacPrint();return}
  if(d.act==="phead"){planMenu(false);return}
  if(d.act==="pfromcamps"){await pacFromCamps();return}
  if(d.act==="pimport"){pacImportMenu();return}
  if(d.act==="pmod"){pacModelesMenu();return}
  if(d.act==="pmgo"){const sel=[...document.querySelectorAll("#drawer input[data-pm]:checked")].map(i=>PAC_MODELES[+i.dataset.pm]);
    if(!sel.length){toast("Cochez au moins une ligne.");return}const n=await pacAddModeles(sel);closeDrawer();toast(n?n+" ligne"+(n>1?"s":"")+" ajoutée"+(n>1?"s":"")+" au plan":"Ces lignes sont déjà dans le plan");return}
  if(d.act==="pimpgo"){await pacImportGo();return}
  if(P){
    if(d.ppr){pReadForm();P.prio=P.prio===d.ppr?"":d.ppr;drawPac();return}
    if(d.pdec){pReadForm();P.decision=P.decision===d.pdec?"":d.pdec;drawPac();return}
    if(d.act==="psave"){pReadForm();if(!P.element){toast("Renseignez l'élément de la ligne.");$("#p-element").focus({preventScroll:true});return}
      if(await savePac(clone(P))){toast(pIsNew?"Ligne ajoutée au plan":"Ligne enregistrée");closeDrawer()}return}
    if(d.act==="pdel"){if(!pDelArmed){pDelArmed=true;t.classList.add("armed");t.textContent="Confirmer la suppression";return}
      if(await deletePac(P.id)){toast("Ligne supprimée du plan");closeDrawer()}return}
    if(d.act==="pup"||d.act==="pdown"){await pacMove(d.act==="pup"?-1:1);return}
    return}
  if(d.copy){let src=null;if(D&&D.id===d.copy){if(!(await doSave(true)))return;src=S.cibles.find(x=>x.id===d.copy);closeDrawer()}else src=S.cibles.find(x=>x.id===d.copy);
    if(src)copyMenu(src);return}
  if(d.act==="docopy"){doCopy();return}
  if(!D)return;
  if(d.prio){readForm();D.priorite=d.prio;drawDrawer();return}
  if(d.type){readForm();D._k.type=d.type;drawDrawer();return}
  if(d.stage){readForm();D.etape=d.stage;drawDrawer();return}
  if(d.act==="save"){doSave(false);return}
  if(d.act==="del"){
    if(!delArmed){delArmed=true;t.classList.add("armed");t.textContent="Confirmer la suppression";return}
    await deleteCible(D.id);toast("Cible supprimée (le compte, ses contacts et ses actions sont conservés)");closeDrawer();return}
});
document.addEventListener("change",e=>{const t=e.target;
  if(t.id==="o-creee"){$("#oFields").hidden=!t.checked}
  if(t.matches("#drawer input[data-dg]"))dupCount();
  if(t.name==="plAxe"){const w=$("#plFamW");if(w)w.hidden=t.value!=="famille";return}
  if(t.id==="am-cr"){const w=$("#am-crw");if(w)w.style.display=t.checked?"flex":"none";const l=document.querySelector('label[for="am-det"]');if(l&&AM&&AM.type!=="note")l.textContent=t.checked?"Points abordés":(isRdv(AM.type)||AM.type==="evenement"?"Compte rendu":"Détails");return}
  if(t.id==="am-su"){$("#am-suw").hidden=!t.checked;return}
  if(t.id==="am-k"&&AM&&$("#kcList")&&$("#kcList").hidden){amRead();drawAction();return}
  if(t.id==="agTy"){UI.ag.type=t.value;uiSave();render();return}
  if(t.dataset&&t.dataset.kf){UI.kv[t.dataset.kf]=t.value;UI.kv.lim=150;uiSave();render();return}
});
/* Recherche : la saisie reste dans le champ pendant le rafraîchissement */
function keepFocus(id,fn){const el=document.getElementById(id),pos=el?el.selectionStart:0;fn();const n=document.getElementById(id);if(n){n.focus({preventScroll:true});try{n.setSelectionRange(pos,pos)}catch(_){}}}
let qT=null;
document.addEventListener("input",e=>{const t=e.target;
  if(t.id==="am-k"){renderKc();return}
  if(t.id==="agQ"){UI.ag.q=t.value;UI.ag.lim=250;clearTimeout(qT);qT=setTimeout(()=>keepFocus("agQ",render),180);return}
  if(t.id==="kQ"){UI.kv.q=t.value;UI.kv.lim=150;clearTimeout(qT);qT=setTimeout(()=>keepFocus("kQ",render),200);return}
});
document.addEventListener("keydown",e=>{
  if(e.target&&e.target.id==="am-k"&&kcKey(e))return;
  if(e.key==="Escape"&&!$("#modal").hidden){closeModal();return}
  if(e.key==="Escape"&&!$("#drawer").hidden){if(D||P||ME){stayOpen();return}closeDrawer();return}
  if(e.key==="Enter"&&e.target.matches("tr[data-id]"))openDrawer(e.target.dataset.id);
  if(e.key==="Enter"&&e.target.matches("tr[data-kid]"))showTab("compte",e.target.dataset.kid);
  if(e.key==="Enter"&&e.target.matches("tr[data-pid]"))openPac(e.target.dataset.pid);
  if((e.key==="ArrowRight"||e.key==="ArrowLeft")&&e.target.matches("tr[data-id]")){e.preventDefault();toggleRow(e.target.dataset.id,e.key==="ArrowRight")}
});
/* Un clic à côté du panneau ne le ferme pas : seuls Enregistrer et Fermer le font */
function stayOpen(){toast(D||ME?"La fiche reste ouverte : Enregistrer, ou Fermer.":"Pour quitter ce panneau : Fermer.");
  const b=document.querySelector("#drawer .df .btn.primary")||document.querySelector('#drawer [data-act="close"]');if(b){b.classList.remove("nudge");void b.offsetWidth;b.classList.add("nudge")}}
$("#scrim").addEventListener("click",stayOpen);
/* Fenêtres déplaçables par l'en-tête ; double-clic pour recentrer */
let MDRAG=null;
document.addEventListener("pointerdown",e=>{const h=e.target.closest&&e.target.closest("#modal .dh");if(!h||e.button>0||e.target.closest("button,a,input,select,textarea,label")||window.innerWidth<700)return;
  const m=$("#modal"),r=m.getBoundingClientRect();MDRAG={dx:e.clientX-r.left,dy:e.clientY-r.top};m.classList.add("moved");m.style.left=r.left+"px";m.style.top=r.top+"px";$("#mscrim").classList.add("light");document.body.classList.add("dragging");e.preventDefault()});
document.addEventListener("pointermove",e=>{if(!MDRAG)return;const m=$("#modal"),w=m.offsetWidth;
  const x=Math.min(Math.max(e.clientX-MDRAG.dx,120-w),innerWidth-120),y=Math.min(Math.max(e.clientY-MDRAG.dy,0),innerHeight-56);m.style.left=x+"px";m.style.top=y+"px"});
document.addEventListener("pointerup",()=>{if(MDRAG){MDRAG=null;document.body.classList.remove("dragging")}});
document.addEventListener("dblclick",e=>{const h=e.target.closest&&e.target.closest("#modal .dh");if(!h||e.target.closest("button,a,input,select,textarea"))return;const m=$("#modal");m.classList.remove("moved");m.style.left=m.style.top="";$("#mscrim").classList.remove("light")});
document.addEventListener("mousedown",e=>{const o=e.target.closest&&e.target.closest(".kc-o");if(o){e.preventDefault();if(o.dataset.dvpick!=null)dvPick(o.dataset.dvpick);else kPick(o.dataset.kpick)}});
document.addEventListener("focusin",e=>{if(e.target.id==="am-k"){const el=e.target;if(AM&&AM.compteId&&el.value)setTimeout(()=>{if(document.activeElement===el)el.select()},0);renderKc()}});
document.addEventListener("focusout",e=>{if(e.target.id==="am-k")setTimeout(()=>{if(document.activeElement&&document.activeElement.id==="am-k")return;kcHide()},120)});
$("#mscrim").addEventListener("click",()=>{const b=document.querySelector("#modal .df .btn.primary");if(b){b.classList.remove("nudge");void b.offsetWidth;b.classList.add("nudge")}toast("Enregistrer, ou Annuler.")});
["#q","#fBu","#fAg","#fPr","#fTy","#fDp","#fCa","#fSort"].forEach(s=>$(s).addEventListener("input",()=>{if(s==="#fCa")renderCampStrip();renderList()}));

handoffMode().then(h=>{if(!h)init()});
