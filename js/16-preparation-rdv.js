/* PAC Prospection IDF · CSC — Fiche de préparation de RDV : une page imprimable par compte
   Fichier 16/18 : chargé avant le démarrage, partage les déclarations des fichiers précédents. */
"use strict";

function prepRdv(kid,aid){const k=kOf(kid);if(!k){toast("Compte introuvable.");return}
  const a=aid?S.actions.find(x=>x.id===aid):null,t=todayISO(),cts=ctOf(k.id).slice().sort((x,y)=>(y.principal-x.principal)||String(x.nom).localeCompare(String(y.nom),"fr"));
  const A=actOf(k.id),open=A.filter(isOpen).sort(aSort),done=A.filter(x=>x.statut==="fait"&&x.type!=="note").sort(aSortDesc).slice(0,10),notes=A.filter(x=>x.type==="note").sort(aSortDesc).slice(0,5);
  const D=dvOf(k.id),K=dvKpis(D),cs=cibOf(k.id),h=k.histo,R=s=>esc(s==null?"":s);
  const cut=(s,n)=>{s=String(s||"").trim();return s.length>n?s.slice(0,n)+"…":s};
  const kv=(l,v)=>v?'<tr><th>'+l+'</th><td>'+v+'</td></tr>':'';
  const sec=(t,b)=>b?'<h2>'+t+'</h2>'+b:'';
  let b='<h1>'+R(k.nom)+'</h1><p class="s">'+R([k.type,FNOM[famOf(k)]||"",k.segment,k.dept?dLabel(k.dept):"",k.agence?"agence "+k.agence:""].filter(Boolean).join(" · "))+'</p>';
  if(a)b+='<div class="rdv"><b>'+R(ALBL[a.type]||"RDV")+(a.date?' du '+R(dObj(a.date).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})):'')+(a.heure?' à '+R(a.heure.replace(":","h")):'')+'</b>'+(a.objet?' · '+R(a.objet):'')+(a.lieu?'<br>Lieu : '+R(a.lieu):'')+(a.accompagnant?'<br>Accompagnant : '+R(a.accompagnant):'')+'</div>';
  b+='<div class="cols"><div>'+sec("Informations",'<table class="kv">'+kv("Adresse",R([k.adresse,[k.cp,k.ville].filter(Boolean).join(" ")].filter(Boolean).join(", ")))+kv("Téléphone",R(k.tel))+kv("Site web",R(k.web))+kv("SIRET",R(k.siret))+kv("Typologie",R(k.typologie))+kv("Apporteur",R(k.apporteur))+'</table>')+'</div>'+
    '<div>'+sec("Chiffres",'<table class="kv">'+(h?kv("CA facturé "+h.y1,R(eur(hCA(k))))+kv("CA facturé "+h.y0,R(eur(hCA(k,h.y0)))):'')+kv("Devis suivis",D.length?R(pl(D.length,"devis","devis")+" · "+eur(K.tot)+" HT"):"")+kv("Acceptés",K.acc?R(K.acc+" · "+eur(K.accM)+(K.taux!=null?" · transformation "+K.taux+" %":"")):"")+kv("En attente",K.att?R(K.att+" · "+eur(K.attM)):"")+kv("Réalisé",K.real?R(eur(K.real)):"")+'</table>')+'</div></div>';
  b+=sec("Contacts",cts.length?'<table class="t"><tr><th>Nom</th><th>Fonction</th><th>Téléphone</th><th>E-mail</th></tr>'+cts.map(c=>'<tr><td><b>'+R(c.nom)+'</b>'+(c.principal?' ★':'')+'</td><td>'+R(c.fonction)+'</td><td>'+R(c.tel)+'</td><td>'+R(c.mail)+'</td></tr>').join("")+'</table>':'<p class="e">Aucun contact enregistré.</p>');
  b+=sec("Devis",D.length?'<table class="t"><tr><th>Date</th><th>N°</th><th>Objet / prestations</th><th class="r">Montant HT</th><th>Statut</th></tr>'+D.slice(0,12).map(d=>{const s=dvSum(d);return '<tr><td>'+R(d.date?fdate(d.date):"")+'</td><td>'+R(d.numero)+'</td><td>'+R(cut(d.objet||d.lignes.map(l=>dvShort(l.presta)).join(", "),110))+'</td><td class="r">'+R(eur(s.tot))+'</td><td>'+R(DVL[d.statut])+(d.avoir?' · avoir':'')+(d.statut==="accepte"&&s.n?' · '+s.nf+'/'+s.n+' réalisé':'')+'</td></tr>'}).join("")+'</table>'+(D.length>12?'<p class="e">+ '+(D.length-12)+' devis plus anciens.</p>':''):'');
  b+=sec("À venir",open.length?'<ul>'+open.slice(0,8).map(x=>'<li><b>'+R(x.date?fdate(x.date):"Sans date")+'</b> · '+R(ALBL[x.type]||"")+' · '+R(x.objet)+'</li>').join("")+'</ul>':'');
  b+=sec("Derniers échanges",done.length?done.map(x=>{const ct=ctById(x.contactId),cr=x.cr?crRows(x).filter(r=>r[0]!=="Points abordés").map(([l,v])=>l+" : "+v).join(" · "):"";
      return '<div class="ex"><b>'+R(x.date?fdate(x.date):"")+' · '+R(ALBL[x.type]||"")+'</b>'+(ct?' · '+R(ct.nom):'')+(x.objet?' · '+R(x.objet):'')+((x.details||cr)?'<div>'+R(cut([x.details,cr].filter(Boolean).join("\n"),420))+'</div>':'')+'</div>'}).join(""):'<p class="e">Aucun échange enregistré.</p>');
  b+=sec("Prospection",cs.length?'<ul>'+cs.map(c=>'<li><b>'+R(campShort(c))+'</b> · '+R(SL[c.etape])+(c.prestations.length?' · visé : '+R(c.prestations.map(p=>PLABEL[p]||p).join(", ")):'')+(c.potentiel?' · potentiel '+R(eur(c.potentiel))+' / an':'')+(c.notes?'<div>'+R(cut(fmtNotes(c.notes),300))+'</div>':'')+'</li>').join("")+'</ul>':'');
  b+=sec("Notes",(k.notes?'<p class="pre">'+R(k.notes)+'</p>':'')+notes.map(x=>'<p class="pre"><b>'+R(fdate(x.date))+'</b> · '+R(cut(x.details||x.objet,300))+'</p>').join(""));
  b+='<h2>Notes du RDV</h2><div class="lines">'+'<i></i>'.repeat(9)+'</div>';
  const html='<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Préparation RDV · '+R(k.nom)+'</title><style>'+
    'body{font:10pt/1.45 "IBM Plex Sans",Arial,sans-serif;color:#1E1B18;margin:12mm 13mm}h1{font-size:17pt;margin:0}p.s{color:#69625B;margin:1mm 0 4mm}'+
    'h2{font-size:11.5pt;color:#A35C2A;border-bottom:1.5px solid #A35C2A;padding-bottom:1mm;margin:5mm 0 2mm;break-after:avoid}.rdv{background:#F5E7DB;border-radius:2mm;padding:2.5mm 4mm;margin-bottom:2mm}'+
    '.cols{display:grid;grid-template-columns:1fr 1fr;gap:6mm}table{width:100%;border-collapse:collapse}table.kv th{text-align:left;color:#69625B;font-weight:500;width:32mm;vertical-align:top;padding:1mm 2mm 1mm 0}table.kv td{padding:1mm 0}'+
    'table.t th{text-align:left;font-size:8.5pt;color:#69625B;border-bottom:1px solid #E0DDD7;padding:1mm 2mm}table.t td{border-bottom:1px solid #EFEEEB;padding:1.3mm 2mm;vertical-align:top}.r{text-align:right;white-space:nowrap}tr{break-inside:avoid}'+
    'ul{margin:0;padding-left:5mm}li{margin:1mm 0}.ex{border-bottom:1px solid #EFEEEB;padding:1.5mm 0;break-inside:avoid}.ex div,li div{color:#3A342E;white-space:pre-wrap;font-size:9.3pt;margin-top:.6mm}.e{color:#69625B;margin:0}.pre{white-space:pre-wrap;margin:1mm 0}'+
    '.lines i{display:block;border-bottom:1px solid #D8D2C8;height:8mm}footer{margin-top:6mm;font-size:8pt;color:#69625B;border-top:1px solid #E0DDD7;padding-top:2mm}</style></head><body>'+b+
    '<footer>Fiche éditée le '+new Date().toLocaleDateString("fr-FR")+' · CSC</footer><script>setTimeout(()=>print(),300)<\/script></body></html>';
  const w=window.open("","_blank");if(!w){toast("Fenêtre bloquée : autorisez les fenêtres pour imprimer la fiche.");return}w.document.write(html);w.document.close()}
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("button[data-prep]");if(!t)return;e.stopPropagation();prepRdv(t.dataset.prep,t.dataset.prepa||"")},true);
