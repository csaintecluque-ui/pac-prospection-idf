/* Registre · CSC — Analyse des devis : objectif, tendances mois par mois (N / N-1), prévisionnel,
   répartition par famille de clients, prestation, département et type de compte
   Fichier 15/18 : chargé avant le démarrage, partage les déclarations des fichiers précédents. */
"use strict";

const ANK="pac-idf-an";
const AN=(()=>{const d={an:String(new Date().getFullYear()),tab:"famille"};try{return Object.assign(d,JSON.parse(localStorage.getItem(ANK)||"{}"))}catch(e){return d}})();
const anSave=()=>{try{localStorage.setItem(ANK,JSON.stringify(AN))}catch(e){}};
const MOIS3=["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
const dAcc=d=>d.dateRep||d.date||"";                       /* date d'acceptation (ou du devis) */
const dLost=d=>d.dateRep||d.date||"";
const pct=(a,b)=>b?Math.round(a/b*100):null;
function anMonths(y){const M=Array.from({length:12},(_,i)=>({m:pad(i+1),env:0,envM:0,acc:0,accM:0,lost:0,lostM:0,real:0}));
  S.devis.forEach(d=>{const s=dvSum(d);
    if(d.statut!=="brouillon"&&(d.date||"").slice(0,4)===y){const x=M[+d.date.slice(5,7)-1];x.env++;x.envM+=s.tot}
    if(d.statut==="accepte"&&dAcc(d).slice(0,4)===y){const x=M[+dAcc(d).slice(5,7)-1];x.acc++;x.accM+=s.tot}
    if(!dvLive(d)&&dLost(d).slice(0,4)===y){const x=M[+dLost(d).slice(5,7)-1];x.lost++;x.lostM+=s.tot}
    d.lignes.forEach(l=>{if(l.faite&&(l.faiteLe||"").slice(0,4)===y){M[+l.faiteLe.slice(5,7)-1].real+=lTot(l)}})});
  return M}
/* Taux de transformation en montant sur 12 mois glissants : sert au prévisionnel des devis en attente */
function anTaux12(){const from=addD(todayISO(),-365);let a=0,l=0;S.devis.forEach(d=>{const r=d.dateRep||d.date||"";if(r<from)return;if(d.statut==="accepte")a+=dvSum(d).tot;else if(!dvLive(d))l+=dvSum(d).tot});return a+l?a/(a+l):0}
function anBars(M,P,obj){const W=760,H=230,pl_=46,pr=10,pt=16,pb=30,iw=W-pl_-pr,ih=H-pt-pb,bw=iw/12;
  const mx=Math.max(1,obj/12,...M.map(x=>x.accM),...P.map(x=>x.accM)),y=v=>pt+ih-(v/mx)*ih,k=v=>v>=1000?Math.round(v/1000)+" k":String(Math.round(v));
  let s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Devis acceptés par mois, année en cours et précédente">';
  for(let i=0;i<=4;i++){const v=mx*i/4;s+='<line x1="'+pl_+'" x2="'+(W-pr)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/><text x="'+(pl_-6)+'" y="'+(y(v)+4)+'" text-anchor="end" font-size="10" fill="var(--muted)">'+k(v)+'</text>'}
  M.forEach((x,i)=>{const x0=pl_+i*bw,p=P[i];
    s+='<rect x="'+(x0+bw*.14)+'" y="'+y(p.accM)+'" width="'+(bw*.32)+'" height="'+(pt+ih-y(p.accM))+'" fill="var(--grey-soft)" stroke="var(--line)"><title>'+MOIS3[i]+' '+(+AN.an-1)+' : '+eur(p.accM)+'</title></rect>'+
      '<rect x="'+(x0+bw*.5)+'" y="'+y(x.accM)+'" width="'+(bw*.36)+'" height="'+(pt+ih-y(x.accM))+'" fill="var(--accent)" rx="2"><title>'+MOIS3[i]+' '+AN.an+' : '+eur(x.accM)+' acceptés ('+x.acc+')</title></rect>'+
      '<text x="'+(x0+bw/2)+'" y="'+(H-10)+'" text-anchor="middle" font-size="10.5" fill="var(--muted)">'+MOIS3[i]+'</text>'});
  if(obj)s+='<line x1="'+pl_+'" x2="'+(W-pr)+'" y1="'+y(obj/12)+'" y2="'+y(obj/12)+'" stroke="var(--ok)" stroke-dasharray="5 4" stroke-width="1.5"/><text x="'+(W-pr)+'" y="'+(y(obj/12)-5)+'" text-anchor="end" font-size="10.5" fill="var(--ok)">objectif mensuel '+k(obj/12)+'</text>';
  return s+'</svg>'}
function anCumul(M,P,obj){const W=760,H=200,pl_=46,pr=10,pt=14,pb=26,iw=W-pl_-pr,ih=H-pt-pb,cm=new Date().getMonth(),cy=String(new Date().getFullYear());
  const c=a=>{let t=0;return a.map(x=>t+=x.accM)},A=c(M),B=c(P),last=AN.an===cy?cm:11,mx=Math.max(1,obj,...A,...B),X=i=>pl_+(i+.5)*iw/12,Y=v=>pt+ih-(v/mx)*ih,k=v=>v>=1000?Math.round(v/1000)+" k":String(Math.round(v));
  const path=(a,n)=>a.slice(0,n+1).map((v,i)=>(i?"L":"M")+X(i).toFixed(1)+" "+Y(v).toFixed(1)).join(" ");
  let s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Cumul des devis acceptés depuis janvier">';
  for(let i=0;i<=4;i++){const v=mx*i/4;s+='<line x1="'+pl_+'" x2="'+(W-pr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/><text x="'+(pl_-6)+'" y="'+(Y(v)+4)+'" text-anchor="end" font-size="10" fill="var(--muted)">'+k(v)+'</text>'}
  if(obj)s+='<path d="M'+X(0)+' '+Y(obj/12)+' L'+X(11)+' '+Y(obj)+'" stroke="var(--ok)" stroke-dasharray="5 4" fill="none" stroke-width="1.5"/>';
  s+='<path d="'+path(B,11)+'" stroke="var(--muted)" fill="none" stroke-width="1.6"/><path d="'+path(A,last)+'" stroke="var(--accent)" fill="none" stroke-width="2.6"/>';
  s+='<circle cx="'+X(last)+'" cy="'+Y(A[last])+'" r="4" fill="var(--accent)"/><text x="'+(X(last)+7)+'" y="'+(Y(A[last])-6)+'" font-size="11" fill="var(--fg)" font-weight="600">'+k(A[last])+'</text>';
  MOIS3.forEach((m,i)=>{s+='<text x="'+X(i)+'" y="'+(H-8)+'" text-anchor="middle" font-size="10.5" fill="var(--muted)">'+m+'</text>'});
  return s+'</svg>'}
/* Répartitions : un groupe par famille, prestation, département ou type de compte */
const ANT=[["famille","Familles de clients"],["presta","Prestations"],["dept","Départements"],["type","Types de compte"]];
function anGroups(tab,y){const G=new Map(),add=(key,lab,d,amt,flt)=>{let g=G.get(key);if(!g)G.set(key,g={key,lab,flt,n:0,tot:0,acc:0,accM:0,lost:0,lostM:0,att:0,attM:0});
    g.n++;g.tot+=amt;if(d.statut==="accepte"){g.acc++;g.accM+=amt}else if(!dvLive(d)){g.lost++;g.lostM+=amt}else{g.att++;g.attM+=amt}};
  S.devis.forEach(d=>{if((d.date||"").slice(0,4)!==y||d.statut==="brouillon")return;const k=kOf(d.compteId),s=dvSum(d);
    if(tab==="famille"){const f=famOf(k);add(f||"?",f?FNOM[f]:"Famille non renseignée",d,s.tot,f?{cl:["f:"+f]}:null)}
    else if(tab==="dept"){const p=k&&k.dept;add(p||"?",p?dLabel(p):"Département non renseigné",d,s.tot,p?{dp:[p]}:null)}
    else if(tab==="type"){const t=k&&k.type;add(t||"?",t||"Type non renseigné",d,s.tot,t?{cl:["t:"+t]}:null)}
    else d.lignes.forEach(l=>{const gx=l.gx||/montant global/i.test(l.presta);add(gx?"~gx":l.presta,gx?"Sans détail (montant global importé d'Excel)":l.presta,d,lTot(l),gx?null:{pr:[l.presta]})})});
  return [...G.values()].sort((a,b)=>(a.key==="~gx")-(b.key==="~gx")||b.tot-a.tot)}
function renderAnalyse(){const el=$("#view-analyse");if(!el)return;const y=AN.an,yp=String(+y-1),cy=String(new Date().getFullYear()),t=todayISO();
  const yrs=[...new Set(S.devis.map(d=>(d.date||"").slice(0,4)).filter(Boolean).concat([cy]))].sort().reverse();
  const M=anMonths(y),P=anMonths(yp),obj=Number((S.settings.dvObj||{})[y])||0,sum=(a,f)=>a.reduce((s,x)=>s+x[f],0);
  const accM=sum(M,"accM"),acc=sum(M,"acc"),lostM=sum(M,"lostM"),lost=sum(M,"lost"),env=sum(M,"env"),envM=sum(M,"envM"),real=sum(M,"real");
  const upto=y===cy?+t.slice(5,7):12,accP=P.slice(0,upto).reduce((s,x)=>s+x.accM,0),evo=accP?Math.round((accM-accP)/accP*100):null;
  const prorata=obj?(y===cy?obj*((+t.slice(5,7)-1)+(+t.slice(8,10))/31)/12:obj):0;
  const att=S.devis.filter(d=>d.statut==="attente"),attM=att.reduce((s,d)=>s+dvSum(d).tot,0),tx=anTaux12(),pond=attM*tx;
  const dl=S.devis.filter(d=>(d.statut==="accepte"||!dvLive(d))&&d.date&&d.dateRep&&d.dateRep>d.date&&(d.date||"").slice(0,4)===y).map(d=>(Date.parse(d.dateRep)-Date.parse(d.date))/864e5);
  const tile=(l,v,d,cls)=>'<div class="kpi'+(cls?' '+cls:'')+'"><span class="lbl">'+l+'</span><span class="v"><span class="num">'+v+'</span></span><span class="d">'+d+'</span></div>';
  let h=pageH("Pilotage","Analyse des devis","Objectif, tendances et répartition des devis · données du suivi des devis",
    '<div class="seg" role="group" aria-label="Année">'+yrs.slice(0,5).map(x=>'<button type="button" data-anan="'+x+'" aria-pressed="'+(x===y)+'">'+x+'</button>').join("")+'</div>');
  if(!S.devis.length){el.innerHTML=h+'<div class="list-wrap"><div class="empty"><h3>Aucun devis suivi</h3><p>Importez ou saisissez vos devis dans « Suivi des devis » : l\'analyse se construit à partir d\'eux.</p><p><button class="btn primary" type="button" data-nav="devis">Suivi des devis</button></p></div></div>';return}
  h+='<div class="panel an-obj"><div class="ph"><h2>Objectif '+y+'</h2><label class="obj">Devis acceptés (€ HT) <input type="number" min="0" step="1000" id="anObj" class="num" value="'+(obj||"")+'" placeholder="ex. 600000"></label></div>'+
    (obj?'<div class="an-pg"><div class="meter big"><b style="width:'+Math.min(100,accM/obj*100)+'%"></b>'+(y===cy?'<i style="left:'+Math.min(100,prorata/obj*100)+'%" title="Attendu à date"></i>':'')+'</div><div class="sub"><b class="num">'+eur(accM)+'</b> sur '+eur(obj)+' · <b>'+pct(accM,obj)+' %</b> atteint'+(y===cy?' · attendu à date '+eur(prorata)+' ('+(accM>=prorata?'<span style="color:var(--ok)">en avance de '+eur(accM-prorata)+'</span>':'<span style="color:var(--bad)">en retard de '+eur(prorata-accM)+'</span>')+')':'')+'</div></div>':'<p class="hint" style="margin:0">Saisissez votre objectif annuel de devis acceptés : la progression, l\'attendu à date et l\'objectif mensuel apparaissent alors.</p>')+'</div>';
  h+='<div class="bl-k">'+tile("Acceptés "+y,eur(accM),acc+" devis"+(evo!=null?' · <b style="color:'+(evo>=0?'var(--ok)':'var(--bad)')+'">'+(evo>=0?"+":"")+evo+' %</b> vs '+yp+(y===cy?" à date":""):""))+
    tile("Devis envoyés "+y,env,eur(envM))+tile("Transformation "+y,(pct(acc,acc+lost)??"–")+" %",(pct(accM,accM+lostM)??"–")+" % en montant · "+lost+" refusés")+
    tile("Montant moyen accepté",acc?eur(accM/acc):"–","par devis accepté")+tile("Délai de réponse",dl.length?Math.round(dl.reduce((a,b)=>a+b,0)/dl.length)+" j":"–",dl.length?"moyenne sur "+pl(dl.length,"devis","devis"):"dates de réponse manquantes")+
    tile("Prévisionnel",eur(pond),"en attente "+eur(attM)+" × "+Math.round(tx*100)+" % (transfo 12 mois)")+(y===cy?tile("Atterrissage estimé",eur(accM+pond),"acceptés + prévisionnel"+(obj?" · "+pct(accM+pond,obj)+" % de l'objectif":""),obj&&accM+pond>=obj?"ok":""):tile("Réalisé "+y,eur(real),"prestations réalisées"))+'</div>';
  h+='<div class="an-g"><div class="panel"><div class="ph"><h2>Acceptés par mois</h2><span class="sub"><i class="an-lg" style="background:var(--accent)"></i>'+y+' <i class="an-lg" style="background:var(--grey-soft);border:1px solid var(--line)"></i>'+yp+'</span></div>'+anBars(M,P,obj)+'</div>'+
    '<div class="panel"><div class="ph"><h2>Cumul depuis janvier</h2><span class="sub"><i class="an-lg" style="background:var(--accent)"></i>'+y+' <i class="an-lg" style="background:var(--muted)"></i>'+yp+(obj?' <i class="an-lg" style="background:var(--ok)"></i>objectif':'')+'</span></div>'+anCumul(M,P,obj)+'</div></div>';
  h+='<div class="panel"><div class="ph"><h2>Mois par mois</h2></div><div class="list-wrap" style="border:0"><table class="tbl an-t"><thead><tr><th>Mois</th><th class="r">Envoyés</th><th class="r">Acceptés</th><th class="r">Refusés</th><th class="r">Réalisé</th><th class="r">Acceptés '+yp+'</th><th class="r">Écart</th></tr></thead><tbody>'+
    M.map((x,i)=>{const p=P[i],e=x.accM-p.accM,fut=y===cy&&i+1>+t.slice(5,7);return '<tr class="'+(fut?'fut':'')+'"><td>'+blCap(MOIS[i])+'</td><td class="r num">'+(x.env?x.env+' · '+eur(x.envM):'—')+'</td><td class="r num"><b>'+(x.acc?x.acc+' · '+eur(x.accM):'—')+'</b></td><td class="r num">'+(x.lost?x.lost+' · '+eur(x.lostM):'—')+'</td><td class="r num">'+(x.real?eur(x.real):'—')+'</td><td class="r num">'+(p.accM?eur(p.accM):'—')+'</td><td class="r num" style="color:'+(fut?'var(--muted)':e>=0?'var(--ok)':'var(--bad)')+'">'+(fut||(!x.accM&&!p.accM)?'—':(e>=0?'+':'−')+eur(Math.abs(e)))+'</td></tr>'}).join("")+
    '<tr class="tot"><td>Total</td><td class="r num">'+env+' · '+eur(envM)+'</td><td class="r num"><b>'+acc+' · '+eur(accM)+'</b></td><td class="r num">'+lost+' · '+eur(lostM)+'</td><td class="r num">'+eur(real)+'</td><td class="r num">'+eur(sum(P,"accM"))+'</td><td class="r num"></td></tr></tbody></table></div></div>';
  const G=anGroups(AN.tab,y),mxT=Math.max(1,...G.map(g=>g.tot));
  h+='<div class="panel"><div class="ph"><h2>Répartition '+y+'</h2><div class="seg" role="group" aria-label="Répartition">'+ANT.map(([k,l])=>'<button type="button" data-antab="'+k+'" aria-pressed="'+(AN.tab===k)+'">'+esc(l)+'</button>').join("")+'</div></div>'+
    '<p class="hint" style="margin:-4px 0 0">Devis datés de '+y+'. '+(AN.tab==="presta"?'Montants par ligne de prestation ; le statut est celui du devis. ':'')+'Cliquez une ligne pour voir ses devis.</p>'+
    (G.length?'<div class="list-wrap" style="border:0"><table class="tbl an-t"><thead><tr><th>'+esc((ANT.find(x=>x[0]===AN.tab)||ANT[0])[1].replace(/s de| de|s$/,"").trim())+'</th><th class="r">Devis</th><th>Montant total</th><th class="r">Acceptés</th><th class="r">Refusés</th><th class="r">En attente</th><th class="r">Transfo (nb · €)</th><th class="r">Moyen accepté</th></tr></thead><tbody>'+
      G.map(g=>'<tr'+(g.flt?' data-anf="'+esc(JSON.stringify(g.flt))+'"':'')+'><td><b>'+esc(g.lab)+'</b></td><td class="r num">'+g.n+'</td><td><div class="an-bar"><b style="width:'+(g.tot/mxT*100)+'%"><i style="width:'+(g.tot?g.accM/g.tot*100:0)+'%"></i></b><span class="num">'+eur(g.tot)+'</span></div></td><td class="r num">'+g.acc+' · '+eur(g.accM)+'</td><td class="r num">'+(g.lost?g.lost+' · '+eur(g.lostM):'—')+'</td><td class="r num">'+(g.att?eur(g.attM):'—')+'</td>'+
        '<td class="r num">'+(g.acc+g.lost?pct(g.acc,g.acc+g.lost)+' % · '+pct(g.accM,g.accM+g.lostM)+' %':'—')+'</td><td class="r num">'+(g.acc?eur(g.accM/g.acc):'—')+'</td></tr>').join("")+'</tbody></table></div>':'<p class="hint">Aucun devis en '+y+'.</p>')+'</div>';
  el.innerHTML=h}
document.addEventListener("click",e=>{if(S.tab!=="analyse"||!e.target.closest)return;const t=e.target.closest("button,tr[data-anf]");if(!t)return;const d=t.dataset;
  if(d.anan){AN.an=d.anan;anSave();renderAnalyse();return}
  if(d.antab){AN.tab=d.antab;anSave();renderAnalyse();return}
  if(d.anf){const f=JSON.parse(d.anf);DVF.forEach(k=>{DVUI[k]=[]});DVUI.q="";DVUI.vs=[];DVUI.an=[AN.an];Object.assign(DVUI,f);DVUI.grp="compte";DVUI.sorts=[{k:"mt",dir:"desc"}];dvUiSave();showTab("devis");return}});
document.addEventListener("change",e=>{if(e.target&&e.target.id==="anObj"){const v=Math.max(0,Math.round(Number(e.target.value)||0));S.settings.dvObj=Object.assign({},S.settings.dvObj||{},{[AN.an]:v});lsSave();renderAnalyse()}});
