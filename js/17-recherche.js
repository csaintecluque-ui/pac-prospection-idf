/* Registre · CSC — Recherche globale (Ctrl+K) : comptes, contacts, devis, actions, pages
   Fichier 17/18 : chargé avant le démarrage, partage les déclarations des fichiers précédents. */
"use strict";

let GS={q:"",i:0,R:[]};
const I_GS=SV+'<circle cx="7" cy="7" r="4.5"/><path d="m10.5 10.5 3 3"/></svg>';
(()=>{const nv=$("#nav");if(nv&&!$("#gsBtn"))nv.insertAdjacentHTML("beforebegin",'<button type="button" class="gs-btn" id="gsBtn" data-act="gsearch" title="Rechercher partout (Ctrl+K)">'+I_GS+'<span class="l">Rechercher</span><kbd>Ctrl K</kbd></button>')})();
function gsFind(q){const w=nh(q).split(" ").filter(Boolean),R=[];if(!w.length)return R;const ok=h=>w.every(x=>h.includes(x));
  NAV.forEach(([k,l])=>{if(ok(nh(l)))R.push({g:"Pages",t:"page",id:k,l,s:"Ouvrir la page"})});
  kSearch(q,8).forEach(k=>R.push({g:"Comptes",t:"compte",id:k.id,l:k.nom,s:kInfo(k)}));
  S.contacts.filter(c=>ok(nh([c.nom,c.fonction,c.mail,c.tel].join(" ")))).slice(0,6).forEach(c=>{const k=kOf(c.compteId);R.push({g:"Contacts",t:"contact",id:c.id,k:c.compteId,l:c.nom||c.mail,s:[c.fonction,k?k.nom:"",c.mail,c.tel].filter(Boolean).join(" · ")})});
  S.devis.filter(d=>{const k=kOf(d.compteId);return ok(nh([d.numero,(d.refs||[]).join(" "),d.objet,k?k.nom:"",d.lignes.map(l=>l.presta).join(" ")].join(" ")))}).sort(dvSortD).slice(0,8).forEach(d=>{const k=kOf(d.compteId);R.push({g:"Devis",t:"devis",id:d.id,l:(d.numero?"N° "+d.numero+" · ":"")+(k?k.nom:""),s:[d.date?fdate(d.date):"",DVL[d.statut],eur(dvSum(d).tot)+" HT",d.objet].filter(Boolean).join(" · ")})});
  S.actions.filter(a=>a.origine!=="mailing"&&ok(nh([a.objet,a.details,a.resultat,(kOf(a.compteId)||{}).nom].join(" ")))).sort(aSortDesc).slice(0,8).forEach(a=>{const k=kOf(a.compteId);R.push({g:"Actions",t:"action",id:a.id,l:(a.objet||ALBL[a.type]),s:[ALBL[a.type],a.date?fdate(a.date):"Sans date",k?k.nom:"",a.statut==="fait"?"faite":"à faire"].filter(Boolean).join(" · ")})});
  return R}
function gsOpen(){if(MODAL&&MODAL!=="gs")closeModal();GS={q:"",i:0,R:[]};
  showModal('<div class="gs"><div class="gs-in">'+I_GS+'<input type="search" id="gsQ" placeholder="Rechercher un compte, un contact, un devis, une action…" autocomplete="off" aria-label="Rechercher partout"><kbd>Échap</kbd></div><div class="gs-r" id="gsR"><p class="hint">Tapez quelques lettres : nom de compte, ville, contact, e-mail, n° de devis ou de facture, mot d\'une note…</p></div></div>',"gs");
  const m=$("#modal");m.classList.add("gs-m");setTimeout(()=>{const i=$("#gsQ");if(i)i.focus({preventScroll:true})},20)}
function gsDraw(){const box=$("#gsR");if(!box)return;const R=GS.R;if(!GS.q.trim()){box.innerHTML='<p class="hint">Tapez quelques lettres : nom de compte, ville, contact, e-mail, n° de devis ou de facture, mot d\'une note…</p>';return}
  if(!R.length){box.innerHTML='<p class="hint">Aucun résultat pour « '+esc(GS.q)+' ».</p>';return}
  let h="",g="";R.forEach((r,i)=>{if(r.g!==g){g=r.g;h+='<div class="gs-g">'+esc(g)+'</div>'}h+='<button type="button" class="gs-o'+(i===GS.i?' act':'')+'" data-gsi="'+i+'"><b>'+esc(r.l)+'</b><span class="sub">'+esc(r.s||"")+'</span></button>'});box.innerHTML=h}
function gsGo(i){const r=GS.R[i];if(!r)return;closeModal();
  if(r.t==="page")showTab(r.id);else if(r.t==="compte")showTab("compte",r.id);else if(r.t==="contact"){showTab("compte",r.k);openContact({id:r.id})}
  else if(r.t==="devis")openDevis(r.id);else if(r.t==="action")viewAction(r.id)}
document.addEventListener("keydown",e=>{const t=e.target,typing=t&&(t.matches&&t.matches("input,textarea,select")||t.isContentEditable);
  if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&!e.altKey&&e.key.toLowerCase()==="k"){e.preventDefault();gsOpen();return}
  if(MODAL!=="gs")return;
  if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();if(!GS.R.length)return;GS.i=(GS.i+(e.key==="ArrowDown"?1:-1)+GS.R.length)%GS.R.length;gsDraw();const a=document.querySelector(".gs-o.act");if(a)a.scrollIntoView({block:"nearest"});return}
  if(e.key==="Enter"&&GS.R.length){e.preventDefault();gsGo(GS.i)}},true);
document.addEventListener("input",e=>{if(e.target&&e.target.id==="gsQ"){GS.q=e.target.value;GS.R=gsFind(GS.q);GS.i=0;gsDraw()}});
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("button");if(!t)return;if(t.dataset.act==="gsearch"){gsOpen();return}if(t.dataset.gsi!=null&&MODAL==="gs"){gsGo(+t.dataset.gsi)}});
