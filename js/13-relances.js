/* PAC Prospection IDF · CSC — Relances des devis en attente : liste à relancer, mail prêt, relance notée, report
   Fichier 13/18 : chargé avant le démarrage, partage les déclarations des fichiers précédents. */
"use strict";

const DVR_TPL={objet:"Votre devis n° {numero} – {objet}",
  corps:"Bonjour {contact},\n\nJe reviens vers vous au sujet de notre proposition n° {numero} du {date} pour {objet}, d'un montant de {montant} HT.\n\nAvez-vous pu en prendre connaissance ? Je reste à votre disposition pour en échanger, ou pour l'ajuster si nécessaire.\n\nBien cordialement,\n{signature}"};
const dvrTpl=()=>Object.assign({},DVR_TPL,S.settings.dvRelTpl||{});
function dvRelList(){return S.devis.filter(dvRel).sort((a,b)=>(dvRelDue(a)||"").localeCompare(dvRelDue(b)||"")||dvSum(b).tot-dvSum(a).tot)}
const dvLastRel=d=>(d.relances||[]).slice(-1)[0]||"";
/* Élément « Devis à relancer » (À faire, tableau de bord) */
function dvRelItem(d){const k=kOf(d.compteId),s=dvSum(d),age=dvAge(d),lr=dvLastRel(d);
  return '<div class="ti dvr-ti" data-dvrel="'+esc(d.id)+'" title="Préparer le mail de relance"><span class="dvr-b">'+I_MAIL+'</span>'+
    '<div style="min-width:0"><div class="o">Relancer le devis'+(d.numero?' n° '+esc(d.numero):'')+' · '+esc(eur(s.tot))+'</div><div class="m">'+(k?'<button type="button" class="lk" data-kopen="'+esc(k.id)+'">'+esc(k.nom)+'</button>':'')+(d.objet?' · '+esc(d.objet.slice(0,60)):'')+'</div></div>'+
    '<div class="dt late">'+(lr?'relancé le '+fdate(lr):age!=null?pl(age,"jour"):"")+'</div></div>'}
function dvrFill(txt,d,ct){const k=kOf(d.compteId)||{},s=dvSum(d);const obj=d.objet||d.lignes.map(l=>dvShort(l.presta)).filter(x=>!/montant global/i.test(x)).join(", ")||"votre projet";
  const v={contact:ct?(ct.nom||""):"",numero:d.numero||"",date:d.date?fdate(d.date):"",objet:obj,montant:eur(s.tot),compte:k.nom||"",signature:S.settings.signature||""};
  return String(txt).replace(/\{(\w+)\}/g,(m,x)=>v[x]!=null?v[x]:m).replace(/Bonjour ,/,"Bonjour,").replace(/ n°  ?–/," –").replace(/\n{3,}/g,"\n\n").trim()}
let DVR=null;
function dvRelOpen(id){const d=S.devis.find(x=>x.id===id);if(!d)return;if(MODAL)closeModal();const k=kOf(d.compteId),cts=k?ctOf(k.id):[];
  const ct=ctById(d.contactId)||cts.find(c=>c.mail)||cts[0]||null,T=dvrTpl();DVR={id,ctId:ct?ct.id:""};
  const s=dvSum(d),age=dvAge(d),R=d.relances||[];
  showModal(mHead("Relancer le devis",(d.numero?"N° "+esc(d.numero)+" · ":"")+esc(k?k.nom:""))+
  '<div class="db"><div class="dvr-g"><div class="dvr-i">'+
    '<p class="sub" style="margin:0">Devis du '+(d.date?fdate(d.date):"—")+' · <b>'+esc(eur(s.tot))+' HT</b>'+(age!=null?' · en attente depuis '+pl(age,"jour"):'')+'</p>'+(d.objet?'<p class="sub" style="margin:0">'+esc(d.objet)+'</p>':'')+
    '<p class="sub" style="margin:0">'+(R.length?'Déjà relancé '+(R.length>1?R.length+' fois, ':'')+'le '+R.map(fdate).join(", "):'Jamais relancé')+(d.relSnooze?' · reporté au '+fdate(d.relSnooze):'')+'</p>'+
    '<div class="row"><div class="f"><label class="lbl" for="dvr-ct">Destinataire</label><select id="dvr-ct">'+(cts.length?cts.map(c=>'<option value="'+esc(c.id)+'"'+(ct&&c.id===ct.id?' selected':'')+'>'+esc((c.nom||c.mail||"Contact")+(c.mail?" · "+c.mail:" (sans e-mail)"))+'</option>').join(""):'<option value="">Aucun contact sur ce compte</option>')+'</select></div>'+
    '<div class="f"><label class="lbl" for="dvr-j">Relancer au bout de</label><div style="display:flex;gap:6px;align-items:center"><input type="number" id="dvr-j" min="1" max="120" value="'+dvRelJ()+'" style="width:80px"><span class="sub">jours sans réponse (tous les devis)</span></div></div></div>'+
    fld("dvr-obj","Objet du mail",dvrFill(T.objet,d,ct))+ta("dvr-txt","Texte du mail",dvrFill(T.corps,d,ct),11)+
    '<div class="row">'+fld("dvr-sig","Signature (reprise dans les mails)",S.settings.signature||"")+'<div class="f" style="justify-content:flex-end"><button type="button" class="btn ghost" data-act="dvrtpl" title="Le texte actuel devient le modèle : {contact}, {numero}, {date}, {objet}, {montant}, {compte}, {signature} sont remplacés automatiquement">Enregistrer comme modèle</button></div></div>'+
  '</div></div></div>'+
  '<div class="df"><button class="btn ghost" type="button" data-act="dvrsnz">Reporter de 7 jours</button><button class="btn ghost" type="button" data-dvid="'+esc(d.id)+'">Ouvrir le devis</button><span class="grow"></span>'+
    '<button class="btn" type="button" data-act="dvrcopy">Copier le texte</button><a class="btn" id="dvrMail" href="#" target="_blank" rel="noopener">Ouvrir dans la messagerie</a><button class="btn primary" type="button" data-act="dvrdone">Marquer comme relancé</button></div>',"dvrel");
  dvrMailto()}
function dvrMailto(){const a=$("#dvrMail");if(!a||!DVR)return;const c=ctById(vOf("dvr-ct"));a.href="mailto:"+encodeURIComponent(c&&c.mail?c.mail:"")+"?subject="+encodeURIComponent(vOf("dvr-obj"))+"&body="+encodeURIComponent($("#dvr-txt").value)}
function dvrRefill(){const d=S.devis.find(x=>x.id===DVR.id);if(!d)return;const ct=ctById(vOf("dvr-ct")),T=dvrTpl();$("#dvr-obj").value=dvrFill(T.objet,d,ct);$("#dvr-txt").value=dvrFill(T.corps,d,ct);dvrMailto()}
function dvrDone(){const d=S.devis.find(x=>x.id===DVR.id);if(!d)return;const t=todayISO(),ct=ctById(vOf("dvr-ct"));
  const o=clone(d);o.relances=(o.relances||[]).concat(t);delete o.relSnooze;put("devis",o);
  put("actions",anorm({id:uid(),creeLe:now(),compteId:d.compteId,contactId:ct?ct.id:"",type:"mail",date:t,statut:"fait",faitLe:t,objet:"Relance devis"+(d.numero?" n° "+d.numero:""),details:"Objet : "+vOf("dvr-obj")+"\n\n"+$("#dvr-txt").value,resultat:"Envoyé",origine:"relance devis"}));
  closeModal();commit();toast("Relance notée"+(d.numero?" pour le devis n° "+d.numero:"")+" · prochaine dans "+pl(dvRelJ(),"jour")+" sans réponse")}
async function dvrCopy(){const t="Objet : "+vOf("dvr-obj")+"\n\n"+$("#dvr-txt").value;try{await navigator.clipboard.writeText(t);toast("Mail copié : collez-le dans Outlook")}catch(e){const x=$("#dvr-txt");x.focus({preventScroll:true});x.select();toast("Copie bloquée ici : le texte est sélectionné, faites Ctrl+C")}}
/* capture : le bouton « Relancer » est parfois posé dans une ligne qui ouvre le devis */
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-dvrel]");if(!t||(e.target.closest("[data-kopen]")&&t.contains(e.target.closest("[data-kopen]"))))return;e.stopPropagation();e.preventDefault();dvRelOpen(t.dataset.dvrel)},true);
document.addEventListener("keydown",e=>{if(e.key!=="Enter")return;const t=e.target.closest&&e.target.closest("span[data-dvrel]");if(t){e.stopPropagation();e.preventDefault();dvRelOpen(t.dataset.dvrel)}},true);
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("button,a");if(!t)return;const d=t.dataset;
  if(MODAL!=="dvrel"||!DVR)return;
  if(d.act==="dvrdone"){dvrDone();return}
  if(d.act==="dvrcopy"){dvrCopy();return}
  if(d.act==="dvrsnz"){const x=S.devis.find(y=>y.id===DVR.id);if(!x)return;const o=clone(x);o.relSnooze=addD(todayISO(),7);put("devis",o);closeModal();commit();toast("Relance reportée au "+fdate(o.relSnooze));return}
  if(d.act==="dvrtpl"){S.settings.dvRelTpl={objet:vOf("dvr-obj"),corps:$("#dvr-txt").value};
    /* les valeurs propres à ce devis redeviennent des repères */
    const x=S.devis.find(y=>y.id===DVR.id),ct=ctById(vOf("dvr-ct")),k=x&&kOf(x.compteId),s=x&&dvSum(x),sig=S.settings.signature||"";
    if(x){const rep=[[x.numero,"{numero}"],[x.date?fdate(x.date):"","{date}"],[eur(s.tot),"{montant}"],[ct&&ct.nom,"{contact}"],[k&&k.nom,"{compte}"],[sig,"{signature}"],[x.objet,"{objet}"]].filter(r=>r[0]&&String(r[0]).length>1);
      ["objet","corps"].forEach(f=>{let v=S.settings.dvRelTpl[f];rep.forEach(([a,b])=>{v=v.split(a).join(b)});S.settings.dvRelTpl[f]=v})}
    lsSave();toast("Modèle de relance enregistré");return}});
document.addEventListener("change",e=>{const t=e.target;if(MODAL!=="dvrel"||!t)return;
  if(t.id==="dvr-ct"){dvrRefill();return}
  if(t.id==="dvr-j"){S.settings.dvRelJ=Math.max(1,Math.min(120,parseInt(t.value,10)||15));lsSave();renderNav();return}
  if(t.id==="dvr-sig"){S.settings.signature=t.value.trim();lsSave();dvrRefill()}});
document.addEventListener("input",e=>{if(MODAL==="dvrel"&&e.target&&(e.target.id==="dvr-obj"||e.target.id==="dvr-txt"))dvrMailto()});
