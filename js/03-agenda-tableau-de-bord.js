/* PAC Prospection IDF · CSC — Calendrier, tableau de bord, agenda
   Fichier 3/18 : les fichiers se chargent dans l'ordre et partagent leurs déclarations. */
"use strict";

/* ================= V3 · Calendrier, tableau de bord, agenda ================= */
const UIK="pac-idf-ui3";
const UI=(()=>{const d={cal:{tdb:{mode:"semaine",ref:""},agenda:{mode:"mois",ref:""}},ag:{vue:"liste",f:"afaire",type:"",q:"",lim:250},kv:{v:"prosp",q:"",sec:"",fam:"",dp:"",ag:"",sort:"next",lim:150},histF:""};
  try{const r=JSON.parse(localStorage.getItem(UIK)||"{}");return Object.assign(d,r,{cal:Object.assign(d.cal,r.cal||{}),ag:Object.assign(d.ag,r.ag||{},{q:"",lim:250}),kv:Object.assign(d.kv,r.kv||{},{q:"",lim:150})})}catch(e){return d}})();
const uiSave=()=>{try{localStorage.setItem(UIK,JSON.stringify({cal:UI.cal,ag:{vue:UI.ag.vue,f:UI.ag.f,type:UI.ag.type},kv:{v:UI.kv.v,sec:UI.kv.sec,fam:UI.kv.fam,dp:UI.kv.dp,ag:UI.kv.ag,sort:UI.kv.sort}}))}catch(e){}};

/* Événements d'une journée : actions datées (sauf annulées) + relances de mailing regroupées */
function mailsOn(iso){return S.actions.filter(a=>a.date===iso&&a.origine==="mailing").length}
function dayItems(iso){return S.actions.filter(a=>a.date===iso&&a.statut!=="annule"&&a.origine!=="mailing").sort((a,b)=>(a.heure||"00").localeCompare(b.heure||"00")||(a.statut==="fait")-(b.statut==="fait"))}
function relOn(iso){return S.mailing.filter(m=>m.envoye&&m.relance===iso&&!m.relanceFaite).length}
function evBtn(a,withK){const k=kOf(a.compteId),late=isOpen(a)&&a.date<todayISO();
  return '<button type="button" class="ev k-'+esc(a.type)+(a.statut==="fait"?' done':'')+(late?' late':'')+'" data-aid="'+esc(a.id)+'" title="'+esc((ALBL[a.type]||"")+" · "+(a.objet||"")+(k?" · "+k.nom:""))+'">'+(a.heure?'<span class="t">'+esc(a.heure.replace(":","h"))+'</span>':'')+'<span class="o">'+esc(a.objet||ALBL[a.type])+'</span>'+(withK&&k?'<span class="k">'+esc(k.nom)+'</span>':'')+'</button>'}
function calHTML(key){const st=UI.cal[key],t=todayISO();if(!st.ref)st.ref=t;
  const month=st.mode==="mois",ref=st.ref;
  let start,days,title;
  if(month){const d=dObj(ref);const first=isoOf(new Date(d.getFullYear(),d.getMonth(),1));start=mondayOf(first);const last=new Date(d.getFullYear(),d.getMonth()+1,0);days=Math.ceil((((last.getDate())+((dObj(first).getDay()+6)%7))/7))*7;
    title=dObj(ref).toLocaleDateString("fr-FR",{month:"long",year:"numeric"});title=title.charAt(0).toUpperCase()+title.slice(1)}
  else{start=mondayOf(ref);days=7;const e=addD(start,6);title="Semaine du "+dObj(start).getDate()+(start.slice(5,7)!==e.slice(5,7)?" "+dObj(start).toLocaleDateString("fr-FR",{month:"long"}):"")+" au "+dObj(e).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})}
  const mm=dObj(ref).getMonth();
  let h='<div class="cal-h"><h3>'+esc(title)+'</h3><div class="seg" role="group" aria-label="Affichage"><button type="button" data-cal="'+key+'" data-cmode="semaine" aria-pressed="'+!month+'">Semaine</button><button type="button" data-cal="'+key+'" data-cmode="mois" aria-pressed="'+month+'">Mois</button></div>'+
    '<button class="btn" type="button" data-cal="'+key+'" data-cnav="-1" aria-label="Période précédente">‹</button><button class="btn" type="button" data-cal="'+key+'" data-cnav="0">Aujourd\'hui</button><button class="btn" type="button" data-cal="'+key+'" data-cnav="1" aria-label="Période suivante">›</button></div>';
  h+='<div class="cal '+(month?'cal-m':'cal-w')+'">'+["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"].map(x=>'<div class="hd">'+x+'</div>').join("");
  for(let i=0;i<days;i++){const d=addD(start,i),dd=dObj(d),we=dd.getDay()===0||dd.getDay()===6,items=dayItems(d),nr=relOn(d),max=month?3:40;
    h+='<div class="cal-d'+(we?' we':'')+(d===t?' today':'')+(month&&dd.getMonth()!==mm?' out':'')+'" data-cday="'+d+'" title="Ajouter une action le '+fdate(d)+'"><div class="dn"><b>'+dd.getDate()+'</b>'+(!month?'<span>'+esc(dd.toLocaleDateString("fr-FR",{month:"short"}).replace(".",""))+'</span>':'')+'</div><span class="add" aria-hidden="true">+</span>'+
      items.slice(0,max).map(a=>evBtn(a,!month)).join("")+(items.length>max?'<span class="nmore">+ '+(items.length-max)+' autre'+(items.length-max>1?'s':'')+'</span>':'')+
      (mailsOn(d)?'<button type="button" class="ev k-rel" data-mailday="'+d+'">'+pl(mailsOn(d),"mail envoyé","mails envoyés")+' (mailing)</button>':'')+(nr?'<button type="button" class="ev k-rel" data-relday="'+d+'">'+I_MAIL.replace('aria-hidden="true"','aria-hidden="true" style="width:11px;height:11px;vertical-align:-1px;margin-right:3px"')+pl(nr,"relance")+' mailing</button>':'')+'</div>'}
  h+='</div><div class="cal-leg"><span><i style="background:var(--ok)"></i>RDV, visio</span><span><i style="background:var(--info)"></i>Appel</span><span><i style="background:var(--accent)"></i>Mail</span><span><i style="background:var(--warn)"></i>Rappel / tâche</span><span><i style="background:var(--bad)"></i>En retard</span><span>Cliquez sur un jour pour ajouter une action · glissez une action pour la déplacer.</span></div>';
  return h}
function calNav(key,dir){const st=UI.cal[key];if(dir===0)st.ref=todayISO();else if(st.mode==="mois"){const d=dObj(st.ref);st.ref=isoOf(new Date(d.getFullYear(),d.getMonth()+dir,1))}else st.ref=addD(st.ref,7*dir);uiSave();render()}

/* ---------- Tableau de bord ---------- */
function monthsBack(n){const out=[];const d=new Date();d.setDate(1);for(let i=n-1;i>=0;i--){const x=new Date(d.getFullYear(),d.getMonth()-i,1);out.push({k:x.getFullYear()+"-"+pad(x.getMonth()+1),l:x.toLocaleDateString("fr-FR",{month:"short"}).replace(".","")+" "+String(x.getFullYear()).slice(2)})}return out}
function chartVisits(){const done=S.actions.filter(a=>a.type==="visite"&&a.statut==="fait"),mk=todayISO().slice(0,7),obj=Number(S.settings.objectif)||0;
  const months=monthsBack(6),perM=months.map(m=>done.filter(a=>(a.date||"").slice(0,7)===m.k).length),maxV=Math.max(obj,...perM,4);
  const W=560,H=200,pl_=30,pr=10,pt=18,pb=28,iw=W-pl_-pr,ih=H-pt-pb,bw=iw/months.length,y=v=>pt+ih-(v/maxV)*ih;
  const ticks=[];const step=Math.max(1,Math.ceil(maxV/4));for(let t=0;t<=maxV;t+=step)ticks.push(t);
  let svg='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Visites réalisées par mois">';
  ticks.forEach(t=>{svg+='<line x1="'+pl_+'" x2="'+(W-pr)+'" y1="'+y(t)+'" y2="'+y(t)+'" stroke="var(--line)" stroke-width="1"/><text x="'+(pl_-6)+'" y="'+(y(t)+4)+'" text-anchor="end" font-size="11" fill="var(--muted)" font-family="IBM Plex Mono,monospace">'+t+'</text>'});
  perM.forEach((v,i)=>{const x=pl_+i*bw+bw*.22,w=bw*.56,cur=months[i].k===mk;
    svg+='<rect x="'+x+'" y="'+y(v)+'" width="'+w+'" height="'+Math.max(0,pt+ih-y(v))+'" rx="3" fill="'+(cur?'var(--accent)':'var(--copper)')+'" opacity="'+(cur?1:.55)+'"/>';
    svg+='<text x="'+(x+w/2)+'" y="'+(y(v)-5)+'" text-anchor="middle" font-size="11.5" fill="var(--fg)" font-family="IBM Plex Mono,monospace">'+v+'</text>';
    svg+='<text x="'+(x+w/2)+'" y="'+(H-9)+'" text-anchor="middle" font-size="11.5" fill="var(--muted)" font-family="IBM Plex Sans Condensed,sans-serif">'+esc(months[i].l)+'</text>'});
  if(obj){svg+='<line x1="'+pl_+'" x2="'+(W-pr)+'" y1="'+y(obj)+'" y2="'+y(obj)+'" stroke="var(--fg)" stroke-dasharray="5 4" stroke-width="1.3"/><text x="'+(W-pr)+'" y="'+(y(obj)-5)+'" text-anchor="end" font-size="11" fill="var(--fg)" font-family="IBM Plex Sans Condensed,sans-serif">Objectif '+obj+'</text>'}
  return svg+'</svg>'}
function todoHTML(limit){const t=todayISO(),tom=addD(t,1),wk=addD(t,7),O=S.actions.filter(isOpen).sort(aSort);
  const G=[["En retard","bad",O.filter(a=>a.date&&a.date<t)],["Aujourd'hui","acc",O.filter(a=>a.date===t)],["Demain","",O.filter(a=>a.date===tom)],["7 prochains jours","",O.filter(a=>a.date>tom&&a.date<=wk)]];
  const R=relancesDues();
  let h='<div class="todo">',any=false;
  G.forEach(([l,cls,L])=>{if(!L.length)return;any=true;h+='<div class="todo-g '+cls+'">'+esc(l)+'<span class="n">'+L.length+'</span></div>'+L.slice(0,limit).map(a=>tItem(a)).join("")+(L.length>limit?'<button type="button" class="more" data-nav="agenda" style="padding:6px 2px;text-align:left">Voir les '+L.length+' dans l\'agenda</button>':'')});
  if(R.length){any=true;h+='<div class="todo-g bad">Relances mailing<span class="n">'+R.length+'</span></div>'+R.slice(0,5).map(rItem).join("")+(R.length>5?'<button type="button" class="more" data-act="mrelview" style="padding:6px 2px;text-align:left">Voir les '+R.length+' relances</button>':'')}
  const DR=dvRelList();if(DR.length){any=true;h+='<div class="todo-g bad">Devis à relancer<span class="n">'+DR.length+'</span></div>'+DR.slice(0,5).map(dvRelItem).join("")+(DR.length>5?'<button type="button" class="more" data-dvv="relance" style="padding:6px 2px;text-align:left">Voir les '+DR.length+' devis à relancer</button>':'')}
  const nd=O.filter(a=>!a.date).length;
  if(!any)h+='<div class="empty-s">Rien en retard ni de prévu cette semaine.</div>';
  if(nd)h+='<div class="todo-g">Sans date<span class="n">'+nd+'</span></div><div class="ti" data-act="agnodate" style="grid-template-columns:minmax(0,1fr)"><span class="m">'+pl(nd,"action")+' à planifier (prochaines étapes reprises de vos cibles). <b style="color:var(--accent)">Les voir</b></span></div>';
  return h+'</div>'}
function renderTdb(){
  const el=$("#view-tdb"),t=todayISO(),A=S.actions,O=A.filter(isOpen);
  const late=O.filter(a=>a.date&&a.date<t),tod=O.filter(a=>a.date===t),wk=addD(t,7);
  const rdv7=O.filter(a=>isRdv(a.type)&&a.date>=t&&a.date<=wk);
  const mk=t.slice(0,7),visM=A.filter(a=>a.type==="visite"&&a.statut==="fait"&&(a.date||"").slice(0,7)===mk).length,obj=Number(S.settings.objectif)||0;
  const opps=S.cibles.filter(c=>c.opp.creee),oOpen=opps.filter(c=>c.opp.statut==="Ouvert"),won=opps.filter(c=>c.opp.statut==="Conclue");
  const R=relancesDues();
  const dl=new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  let h=pageH("Pilotage","Tableau de bord",esc(dl.charAt(0).toUpperCase()+dl.slice(1)),
    '<button class="btn'+(DEDIT?' primary':'')+'" type="button" data-act="dedit" aria-pressed="'+DEDIT+'">'+(DEDIT?'Terminer la personnalisation':'Personnaliser')+'</button><button class="btn" type="button" data-knew="1">'+I_PLUS+'Compte</button><button class="btn" type="button" data-anew="tache">'+I_EV.tache+'Rappel</button><button class="btn primary" type="button" data-anew="visite">'+I_PLUS+'RDV</button>');
  /* Messages : conversion V3, sauvegarde */
  const mg=S.settings.migrationV3;
  if(mg&&!mg.vu)h+='<div class="notice" style="display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center"><span class="grow" style="flex:1;min-width:280px"><b>Vos données sont passées en V3, rien n\'a été perdu.</b> '+pl(mg.cibles,"cible")+', '+pl(mg.mailing,"ligne")+' de mailing et '+pl(mg.pac,"ligne")+' de PAC sont conservées. Elles sont maintenant rattachées à '+pl(mg.comptes,"compte")+', '+pl(mg.contacts,"contact")+' et '+pl(mg.actions,"action")+' (visites et prochaines actions). '+(mg.copie?'Une copie intacte de l\'ancienne version reste sur ce poste.':'')+'</span><button class="btn" type="button" data-act="export">Faire une sauvegarde</button><button class="btn ghost" type="button" data-act="migok">OK</button></div>';
  const lb=S.settings.lastBackup,days=lb?Math.floor((Date.now()-new Date(lb).getTime())/864e5):null;
  if(!mg||mg.vu){if(days==null||days>=7)h+='<div class="notice warn" style="display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center"><span style="flex:1;min-width:240px"><b>'+(days==null?'Aucune sauvegarde faite depuis cet outil':'Dernière sauvegarde il y a '+days+' jours')+'.</b> Vos données ne sont que dans ce navigateur.</span><button class="btn primary" type="button" data-act="backup">Sauvegarder maintenant</button></div>'}
  const kpi=(cls,lbl,v,d,act)=>'<button type="button" class="kpi click '+cls+'"'+act+'><span class="lbl">'+lbl+'</span><span class="v">'+v+'</span><span class="d">'+d+'</span></button>';
  const W={};W.kpis='<div class="kpis6">'+
    kpi(late.length?'bad':'','En retard',late.length,late.length?'actions à rattraper':'aucune action en retard',' data-agf="retard"')+
    kpi(tod.length?'warn':'',"Aujourd'hui",tod.length,pl(tod.filter(a=>isRdv(a.type)).length,"RDV")+' · '+pl(tod.filter(a=>!isRdv(a.type)).length,"autre action","autres actions"),' data-agf="afaire"')+
    kpi('','RDV · 7 jours',rdv7.length,rdv7.length?'prochain : '+esc(whenLbl(rdv7.sort(aSort)[0])):'aucun RDV planifié',' data-agf="afaire"')+
    '<div class="kpi"><span class="lbl">Visites ce mois</span><span class="v">'+visM+(obj?'<small> / '+obj+'</small>':'')+'</span><div class="meter"><b style="width:'+(obj?Math.min(100,visM/obj*100):0)+'%"></b></div><label class="obj" for="objIn" style="margin-top:4px">Objectif <input type="number" min="0" step="1" id="objIn" class="num" value="'+esc(obj)+'" style="padding:2px 6px"></label></div>'+
    kpi('','Opportunités en cours',oOpen.length,eur(oOpen.reduce((s,c)=>s+(Number(c.opp.montant)||0),0))+' · '+pl(won.length,"gagnée")+' ('+eur(won.reduce((s,c)=>s+(Number(c.opp.montant)||0),0))+')',' data-nav="cibles"')+
    kpi(R.length?'warn':'','Relances mailing',R.length,R.length?'à faire aujourd\'hui ou avant':S.mailing.filter(m=>m.envoye).length+' mails envoyés',' data-act="mrelview"')+
  '</div>';
  W.cal='<div class="panel">'+calHTML("tdb")+'</div>';W.todo='<div class="panel"><div class="ph"><h2>À faire</h2><button type="button" class="more" data-nav="agenda">Agenda complet</button></div>'+todoHTML(8)+'</div>';
  /* Pipeline, activité, PAC */
  const C=S.cibles,byStage=STAGES.map(s=>({s,n:C.filter(c=>c.etape===s.k).length})),maxS=Math.max(1,...byStage.map(x=>x.n));
  const colorFor={a_qualifier:"var(--grey)",cible:"var(--info)",rdv:"var(--warn)",visite:"var(--accent)",opportunite:"var(--opp-open)",gagne:"var(--ok)",sans_suite:"var(--bad)"};
  const stageBars=byStage.map(x=>'<div class="hbar"><span>'+esc(x.s.l)+'</span><span class="t"><b style="width:'+(x.n/maxS*100)+'%;background:'+colorFor[x.s.k]+'"></b></span><span class="num" style="text-align:right">'+x.n+'</span></div>').join("");
  const p=curPlan(),pls=S.pac.filter(l=>l.planId===p.id).sort(byPrio);
  const pacL=pls.length?'<div class="pl-l">'+pls.slice(0,7).map(l=>{const st=pacStats(l);return '<div class="pi" data-pid="'+esc(l.id)+'"><span class="prio prio-'+(PCLS[l.prio]||'0')+'">'+(l.prio?'P'+l.prio:'–')+'</span><span style="min-width:0"><b>'+esc(l.element)+'</b><span class="sub" style="display:block">'+(l.campagnes.length||(l.secteurs||[]).length?pl(st.n,"cible")+' · '+pl(st.visites,"visite")+' · '+pl(st.opps,"opp."):esc((l.objectif||"").slice(0,70)))+'</span></span><span class="dpill d-'+(l.decision||'none')+'">'+esc(l.decision||"À décider")+'</span></div>'}).join("")+'</div>':'<p class="hint">Aucune ligne dans ce plan.</p>';
  W.pipe='<div class="panel"><div class="ph"><h2>Pipeline des cibles</h2><button type="button" class="more" data-nav="cibles">Cibles</button></div><div class="hbars">'+stageBars+'</div></div>';W.visites=
    '<div class="panel"><div class="ph"><h2>Visites réalisées par mois</h2></div>'+chartVisits()+'</div>';W.pac=
    '<div class="panel"><div class="ph"><h2>'+esc(p.nom)+'</h2><button type="button" class="more" data-nav="pac">Ouvrir le PAC</button></div>'+pacL+'</div>';
  /* À traiter : priorité A sans prochaine action ; activité récente */
  const seen=new Set(),todo=C.filter(c=>isActive(c)&&c.priorite==="A"&&!nextFor(c)).filter(c=>{if(seen.has(c.compteId))return false;seen.add(c.compteId);return true});
  const recent=A.filter(a=>a.statut==="fait"&&a.origine!=="mailing").sort((a,b)=>String(b.faitLe||b.date).localeCompare(String(a.faitLe||a.date))||String(b.majLe).localeCompare(String(a.majLe))).slice(0,8);
  W.prioA='<div class="panel"><div class="ph"><h2>Priorité A sans prochaine action</h2><span class="sub num">'+todo.length+'</span></div>'+
     (todo.length?'<div class="mini">'+todo.slice(0,8).map(c=>'<div class="mi"><div class="grow"><button type="button" class="lk strong" data-kopen="'+esc(c.compteId)+'">'+esc(c.compte)+'</button><div class="sub">'+esc(campShort(c))+' · <span class="pill st-'+c.etape+'" style="font-size:11px;padding:0 7px">'+esc(SL[c.etape])+'</span></div></div><button class="btn" type="button" data-anew="appel" data-k="'+esc(c.compteId)+'" data-c="'+esc(c.id)+'">'+I_EV.appel+'Appel</button><button class="btn" type="button" data-anew="visite" data-k="'+esc(c.compteId)+'" data-c="'+esc(c.id)+'">'+I_EV.visite+'RDV</button></div>').join("")+'</div>'+(todo.length>8?'<button type="button" class="more" data-nav="cibles">+ '+(todo.length-8)+' autres dans Cibles</button>':''):'<p class="hint">Toutes vos cibles de priorité A ont une prochaine action.</p>')+'</div>';W.recent=
    '<div class="panel"><div class="ph"><h2>Dernières actions réalisées</h2><button type="button" class="more" data-agf="faites">Historique</button></div>'+
     (recent.length?'<div class="todo">'+recent.map(a=>tItem(a,{full:true})).join("")+'</div>':'<p class="hint">Aucune action réalisée pour l\'instant.</p>')+'</div>';
  /* Antécédents : devis en attente et clients perdus à reconquérir */
  let gH="";const KH=S.comptes.filter(k=>k.histo);
  if(KH.length){const yp=String(new Date().getFullYear()-1),dv=KH.filter(k=>k.histo.dv.n).sort((a,b)=>b.histo.dv.m-a.histo.dv.m),lost=KH.filter(k=>k.histo.st==="perdu"||k.histo.st==="relance").sort((a,b)=>hCA(b,yp)-hCA(a,yp));
    const row=(k,v,s,ob)=>'<div class="mi"><div class="grow"><button type="button" class="lk strong" data-kopen="'+esc(k.id)+'">'+esc(k.nom)+'</button><div class="sub">'+s+'</div></div><span class="num" style="white-space:nowrap">'+v+'</span><button class="btn" type="button" data-anew="appel" data-k="'+esc(k.id)+'" data-obj="'+esc(ob)+'">'+I_EV.appel+'Appel</button></div>';
    W.devis='<div class="panel"><div class="ph"><h2>Devis en attente (historique importé)</h2><span class="sub num">'+dv.length+' · '+eur(dv.reduce((s,k)=>s+k.histo.dv.m,0))+'</span><button type="button" class="more" data-famgo="" data-kvset="devis">Tous</button></div>'+
      (dv.length?'<div class="mini">'+dv.slice(0,8).map(k=>row(k,eur(k.histo.dv.m),pl(k.histo.dv.n,"devis","devis")+(k.histo.dv.d?" · dernier le "+fdate(k.histo.dv.d):"")+(FNOM[famOf(k)]?" · "+esc(FNOM[famOf(k)]):""),"Relance devis en attente")).join("")+'</div>':'<p class="hint">Aucun devis en attente.</p>')+'</div>';W.perdus=
      '<div class="panel"><div class="ph"><h2>Clients perdus à reconquérir</h2><span class="sub num">'+lost.length+' · '+eur(lost.reduce((s,k)=>s+hCA(k,yp),0))+' en '+yp+'</span><button type="button" class="more" data-famgo="" data-kvset="perdus">Tous</button></div>'+
      (lost.length?'<div class="mini">'+lost.slice(0,8).map(k=>row(k,eur(hCA(k,yp)),"Dernière facture le "+fdate(k.histo.last)+(k.histo.st==="relance"?" · pièce "+k.histo.y1+" sans facture":"")+(FNOM[famOf(k)]?" · "+esc(FNOM[famOf(k)]):""),"Reconquête client")).join("")+'</div>':'<p class="hint">Aucun client perdu.</p>')+'</div>'}
  W.notes=nbPanel();W.suividevis=dvWidget();h+=dashHTML(W);
  el.innerHTML=h;dashFit();dashObs();nbGrowAll(el);nbBadge();
  const oi=$("#objIn");if(oi)oi.addEventListener("change",()=>{S.settings.objectif=Math.max(0,parseInt(oi.value,10)||0);saveSettings();renderTdb()});
}

/* ---------- Agenda & actions ---------- */
const AGF=[["afaire","À faire"],["retard","En retard"],["nodate","Sans date"],["faites","Faites"],["cr","Comptes rendus"],["toutes","Toutes"]];
function agBase(){const q=nh(UI.ag.q),ty=UI.ag.type;
  return S.actions.filter(a=>{if(ty&&a.type!==ty)return false;if(q){const k=kOf(a.compteId),ct=ctById(a.contactId);if(!nh([a.objet,a.details,a.resultat,k&&k.nom,ct&&ct.nom,a.accompagnant].join(" ")).includes(q))return false}return true})}
const agFilt=(f,a)=>{const t=todayISO();return f==="afaire"?isOpen(a):f==="retard"?isOpen(a)&&a.date&&a.date<t:f==="nodate"?isOpen(a)&&!a.date:f==="faites"?a.statut!=="afaire":f==="cr"?!!a.cr:true};
function renderAgenda(){
  const el=$("#view-agenda"),B=agBase(),f=UI.ag.f,L=B.filter(a=>agFilt(f,a));
  let h=pageH("Actions commerciales","Agenda &amp; actions",pl(S.actions.filter(isOpen).length,"action")+" à faire · "+pl(S.actions.filter(a=>a.statut==="fait").length,"action réalisée","actions réalisées"),
    '<button class="btn" type="button" data-anew="appel">'+I_EV.appel+'Appel</button><button class="btn" type="button" data-anew="tache">'+I_EV.tache+'Rappel</button><button class="btn primary" type="button" data-anew="visite">'+I_PLUS+'RDV</button>');
  h+='<div class="bar"><div class="seg" role="group" aria-label="Affichage"><button type="button" data-agv="liste" aria-pressed="'+(UI.ag.vue==="liste")+'">Liste</button><button type="button" data-agv="semaine" aria-pressed="'+(UI.ag.vue==="semaine")+'">Semaine</button><button type="button" data-agv="mois" aria-pressed="'+(UI.ag.vue==="mois")+'">Mois</button></div>'+
    (UI.ag.vue==="liste"?'<div class="chips grow">'+AGF.map(([k,l])=>'<button type="button" class="chip" data-agf="'+k+'" aria-pressed="'+(f===k)+'">'+l+'<span class="n num">'+B.filter(a=>agFilt(k,a)).length+'</span></button>').join("")+'</div>':'<span class="grow"></span>')+
    '<select id="agTy" aria-label="Type d\'action" style="width:auto"><option value="">Tous les types</option>'+ATYPES.map(([k,l])=>'<option value="'+k+'"'+(UI.ag.type===k?' selected':'')+'>'+esc(l)+'</option>').join("")+'</select>'+
    '<input type="search" id="agQ" value="'+esc(UI.ag.q)+'" placeholder="Rechercher (compte, objet, contact…)" style="width:260px"></div>';
  if(UI.ag.vue!=="liste"){UI.cal.agenda.mode=UI.ag.vue;h+='<div class="panel">'+calHTML("agenda")+'</div>';
    const late=S.actions.filter(a=>isOpen(a)&&a.date&&a.date<todayISO()).sort(aSort);
    if(late.length)h+='<div class="panel"><div class="ph"><h2>En retard</h2><span class="sub num">'+late.length+'</span></div><div class="todo">'+late.slice(0,12).map(a=>tItem(a,{full:true})).join("")+'</div></div>';
    el.innerHTML=h;return}
  if(!L.length){h+='<div class="list-wrap"><div class="empty"><h3>Aucune action dans cette vue</h3><p>Ajoutez un RDV, un appel ou un rappel avec les boutons en haut, ou depuis la fiche d\'un compte.</p></div></div>';el.innerHTML=h;return}
  const t=todayISO(),tom=addD(t,1),wkEnd=addD(mondayOf(t),6);
  let groups;
  if(f==="faites"||f==="cr"){const m={};L.slice().sort(aSortDesc).forEach(a=>{const k=(a.date||"").slice(0,7)||"Sans date";(m[k]=m[k]||[]).push(a)});
    groups=Object.entries(m).map(([k,v])=>[k==="Sans date"?k:dObj(k+"-01").toLocaleDateString("fr-FR",{month:"long",year:"numeric"}),v])}
  else{const S2=L.slice().sort(aSort),gs=[["En retard",a=>isOpen(a)&&a.date&&a.date<t],["Aujourd'hui",a=>a.date===t],["Demain",a=>a.date===tom],["Cette semaine",a=>a.date>tom&&a.date<=wkEnd],["Plus tard",a=>a.date>wkEnd],["Passées",a=>a.date&&a.date<t],["Sans date",a=>!a.date]];
    const used=new Set();groups=gs.map(([l,fn])=>[l,S2.filter(a=>{if(used.has(a.id)||!fn(a))return false;used.add(a.id);return true})]).filter(([,v])=>v.length);
    groups=groups.map(([l,v])=>[l,l==="Passées"?v.sort(aSortDesc):v])}
  let n=0;const lim=UI.ag.lim;
  h+='<div class="list-wrap"><table class="tbl"><thead><tr><th style="width:34px"></th><th>Date</th><th>Type</th><th>Objet</th><th>Compte</th><th>Contact</th><th>Campagne</th><th>Statut</th></tr></thead><tbody>';
  for(const [l,v] of groups){if(n>=lim)break;h+='<tr class="det" style="cursor:default"><td colspan="8" style="padding:10px 12px 6px;box-shadow:none;background:var(--surface-2)"><span class="lbl"'+(l==="En retard"?' style="color:var(--bad)"':'')+'>'+esc(l)+' · '+v.length+'</span></td></tr>';
    for(const a of v){if(n++>=lim)break;const k=kOf(a.compteId),ct=ctById(a.contactId),cb=cibById(a.cibleId),late=isOpen(a)&&a.date&&a.date<t;
      h+='<tr data-aid="'+esc(a.id)+'"><td><button type="button" class="ck'+(a.statut==="fait"?' on':'')+'" data-done="'+esc(a.id)+'" aria-label="Marquer comme fait">'+(a.statut==="fait"?I_CHECK:'')+'</button></td>'+
        '<td class="num'+(late?' late':'')+'" style="white-space:nowrap">'+(a.date?esc(fday(a.date))+(a.date.slice(0,4)!==t.slice(0,4)?' '+a.date.slice(0,4):''):'<span class="sub">—</span>')+(a.heure?'<div class="sub">'+esc(a.heure.replace(":","h"))+'</div>':'')+'</td>'+
        '<td><span class="eic eic-'+esc(a.type)+'" style="vertical-align:middle">'+(I_EV[a.type]||I_EV.autre)+'</span> <span class="sub">'+esc(ESHORT[a.type]||a.type)+'</span></td>'+
        '<td><b style="font-weight:500">'+esc(a.objet||ALBL[a.type])+'</b>'+(a.cr?' <span class="pill tone-info" style="font-size:11px">Compte rendu</span>':'')+(a.details?'<div class="sub" style="max-width:520px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(a.details)+'</div>':'')+'</td>'+
        '<td>'+(k?'<button type="button" class="lk strong" data-kopen="'+esc(k.id)+'">'+esc(k.nom)+'</button>':'')+'</td><td class="sub">'+esc(ct?ct.nom:"")+'</td><td class="sub">'+esc(cb?campShort(cb):"")+'</td>'+
        '<td><span class="pill tone-'+stTone(a)+'">'+esc(stLbl(a))+'</span>'+(a.resultat?'<div class="sub">'+esc(a.resultat)+'</div>':'')+'</td></tr>'}}
  h+='</tbody></table></div>'+(L.length>lim?'<div class="pager"><button class="btn" type="button" data-act="agmore">Afficher plus</button><span class="sub">'+lim+' sur '+L.length+'</span></div>':'');
  el.innerHTML=h;
}
