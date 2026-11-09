/* Registre · CSC — « Quoi de neuf » après chaque import de l'export Excel des pièces
   Fichier 14/18 : chargé avant le démarrage, partage les déclarations des fichiers précédents. */
"use strict";

const QN_CAT=[["gagne","Affaires gagnées","ok"],["realise","Réalisées / facturées","ok"],["perdu","Refusées / sans suite","bad"],["attente","Nouveaux devis en attente","warn"],["avoir","Avoirs","bad"]];
/* Comparaison avant / après pour chaque devis touché par l'import */
function qnDiff(before,after,isNew){const E=[];const sa=dvSum(after),sb=before?dvSum(before):null;
  if(isNew){E.push(after.statut==="accepte"?"gagne":after.statut==="attente"||after.statut==="brouillon"?"attente":"perdu");if(sa.nf&&after.statut==="accepte")E.push("realise")}
  else{if(after.statut!==before.statut){if(after.statut==="accepte")E.push("gagne");else if(!dvLive(after))E.push("perdu")}if(sa.nf>sb.nf)E.push("realise")}
  if(after.avoir&&(!before||!before.avoir||before.avoir.m!==after.avoir.m))E.push("avoir");return E}
function qnRecord(file,items,comptes){S.settings.dvxLast={le:now(),file,items:items.slice(0,1500),comptes:comptes.slice(0,300)};lsSave()}
function qnOpen(){const Q=S.settings.dvxLast;if(!Q){toast("Aucun import Excel pour l'instant.");return}if(MODAL)closeModal();
  const by=c=>Q.items.filter(x=>x.e.includes(c)).map(x=>[x,S.devis.find(d=>d.id===x.id)]).filter(([,d])=>d);
  const row=([x,d],c)=>{const k=kOf(d.compteId),s=dvSum(d);return '<button type="button" class="dv-wr" data-dvid="'+esc(d.id)+'"><span class="grow"><b>'+esc(k?k.nom:"Compte ?")+'</b><span class="sub">'+esc([d.numero?"N° "+d.numero:"",x.n?"nouveau":"mis à jour",d.objet].filter(Boolean).join(" · "))+'</span></span><span class="r"><b class="num">'+esc(c==="avoir"&&d.avoir?"− "+eur(d.avoir.m):eur(s.tot))+'</b></span></button>'};
  const sec=QN_CAT.map(([c,l,tone])=>{const L=by(c);if(!L.length)return "";const m=L.reduce((a,[,d])=>a+(c==="avoir"&&d.avoir?d.avoir.m:dvSum(d).tot),0);
    return '<div class="qn-s"><h4><span class="pill qn-'+tone+'">'+esc(l)+'</span><span class="num">'+L.length+' · '+esc(eur(m))+'</span></h4>'+L.slice(0,60).map(p=>row(p,c)).join("")+(L.length>60?'<p class="hint">+ '+(L.length-60)+' autres : voir le suivi des devis.</p>':'')+'</div>'}).join("");
  showModal(mHead("Quoi de neuf","Depuis l'import du "+esc(new Date(Q.le).toLocaleString("fr-FR",{dateStyle:"long",timeStyle:"short"})))+
   '<div class="db"><p class="hint" style="margin:0">Fichier « '+esc(Q.file)+' » · '+pl(Q.items.length,"devis touché","devis touchés")+(Q.comptes.length?' · '+pl(Q.comptes.length,"compte créé","comptes créés")+' : '+esc(Q.comptes.slice(0,12).join(", "))+(Q.comptes.length>12?"…":""):'')+'</p>'+
   (sec||'<div class="empty" style="padding:30px"><h3>Rien de nouveau</h3><p>Aucun changement de statut, de réalisation ou d\'avoir depuis l\'import précédent.</p></div>')+'</div>'+
   '<div class="df">'+(Q.comptes.length?'<button class="btn ghost" type="button" data-act="kenrauto">Compléter les comptes créés</button>':'')+'<span class="grow"></span><button class="btn" type="button" data-act="mclose">Fermer</button><button class="btn primary" type="button" data-act="qnall">Voir le suivi des devis</button></div>',"qn");modalBig()}
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("button");if(!t)return;
  if(t.dataset.act==="dvqn"){qnOpen();return}
  if(t.dataset.act==="qnall"){closeModal();showTab("devis");return}
  if(t.dataset.act==="kenrauto"){ENR.scope="auto";enrMenu()}});
