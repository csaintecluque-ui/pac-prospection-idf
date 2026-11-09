/* PAC Prospection IDF · CSC — Sauvegarde automatique dans un dossier du PC
   (Chrome ou Edge sur ordinateur, appli ouverte dans un onglet : Notion n'autorise pas l'accès aux dossiers)
   Fichier chargé après 11 et avant 19-demarrage.
   Fichier 12/18 : chargé avant le démarrage, partage les déclarations des fichiers précédents. */
"use strict";

const AB_OK=!!window.showDirectoryPicker&&!IN_FRAME,AB_KEEP=10,AB_RE=/^PAC_sauvegarde_\d{4}-\d{2}-\d{2}_\d{2}h\d{2}\.json$/;
let abDir=null,abBusy=false,abChecked=false;
const abCfg=()=>Object.assign({on:false,nom:"",le:"",fichier:""},S.settings.autoBk||{});
async function abLoad(){if(!AB_OK)return null;if(abDir)return abDir;try{abDir=await appGet("bkDir")||null}catch(e){abDir=null}return abDir}
async function abPerm(ask){const d=await abLoad();if(!d)return "none";
  try{let p=await d.queryPermission({mode:"readwrite"});if(p!=="granted"&&ask)p=await d.requestPermission({mode:"readwrite"});return p}catch(e){return "none"}}
/* Choix du dossier : la sauvegarde est activée et une première copie est écrite */
async function abPick(){try{const d=await window.showDirectoryPicker({id:"pac-sauvegardes",mode:"readwrite"});abDir=d;await appPut("bkDir",d);
    S.settings.autoBk=Object.assign(abCfg(),{on:true,nom:d.name});lsSave();await abRun(true);fillAb()}
  catch(e){if(!e||e.name!=="AbortError")toast("Ce dossier n'est pas accessible : choisissez-en un autre.")}}
/* Une sauvegarde par jour (au plus), les AB_KEEP plus récentes sont gardées */
async function abRun(force){if(!AB_OK||abBusy)return false;const c=abCfg();if(!c.on&&!force)return false;
  if(!force&&c.le&&Date.now()-new Date(c.le).getTime()<20*3600e3)return false;
  if(await abPerm(!!force)!=="granted"){abWake(true);return false}
  abBusy=true;
  try{const d=abDir,t=new Date(),nm="PAC_sauvegarde_"+todayISO()+"_"+pad(t.getHours())+"h"+pad(t.getMinutes())+".json";
    const fh=await d.getFileHandle(nm,{create:true}),w=await fh.createWritable();await w.write(await backupJSON());await w.close();
    const L=[];for await(const [n,h] of d.entries()){if(h.kind==="file"&&AB_RE.test(n))L.push(n)}
    L.sort();while(L.length>AB_KEEP){const n=L.shift();try{await d.removeEntry(n)}catch(e){}}
    S.settings.autoBk=Object.assign(abCfg(),{le:now(),nom:d.name,fichier:nm});S.settings.lastBackup=now();lsSave();renderNav();abWake(false);
    if(force)toast("Sauvegarde écrite dans « "+d.name+" » : "+nm);
    if(S.tab==="tdb")renderTdb();return true}
  catch(e){toast("Sauvegarde automatique impossible : "+((e&&e.message)||"dossier inaccessible"));return false}
  finally{abBusy=false}}
/* Après un redémarrage du navigateur, Chrome redemande l'accès au dossier : un bouton le réactive en un clic */
function abWake(show){let b=$("#abWake");
  if(!b&&show){const f=document.querySelector(".side-f");if(!f)return;f.insertAdjacentHTML("afterbegin",'<button type="button" class="btn ab-wake" id="abWake" data-act="abwake" title="Chrome demande à nouveau l\'accès au dossier de sauvegarde">Réactiver la sauvegarde auto</button>');b=$("#abWake")}
  if(b)b.hidden=!show}
async function fillAb(){const box=$("#abBox");if(!box)return;const c=abCfg();
  if(!AB_OK){box.innerHTML='<div class="addv"><span class="lbl">Sauvegarde automatique</span><p class="hint">'+(IN_FRAME?'Disponible en ouvrant l\'appli dans un onglet de Chrome ou Edge (Notion n\'autorise pas l\'accès aux dossiers) : elle écrit alors chaque jour une sauvegarde dans un dossier de votre PC.':'Disponible dans Chrome ou Edge, sur ordinateur.')+'</p>'+
    (IN_FRAME?'<a class="btn" href="'+esc(location.href.split("#")[0])+'" target="_blank" rel="noopener">Ouvrir l\'appli dans un onglet</a>':'')+'</div>';return}
  const d=await abLoad(),p=d?await abPerm(false):"none";if(!$("#abBox"))return;
  box.innerHTML='<div class="addv"><span class="lbl">Sauvegarde automatique</span>'+(d?
    '<p class="hint">Dossier : <b>'+esc(d.name)+'</b> · '+(c.on?'une sauvegarde par jour, les '+AB_KEEP+' plus récentes sont gardées':'<b>désactivée</b>')+(c.le?' · dernière le '+esc(new Date(c.le).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})):'')+(c.on&&p!=="granted"?' · <b style="color:var(--warn)">accès au dossier à réautoriser</b>':'')+'</p>'+
    '<div class="bar"><button class="btn" type="button" data-act="abnow">Sauvegarder maintenant dans le dossier</button><button class="btn ghost" type="button" data-act="abpick">Changer de dossier</button><button class="btn ghost" type="button" data-act="abtog">'+(c.on?'Désactiver':'Activer')+'</button></div>'
    :'<p class="hint">Choisissez un dossier de votre PC (idéalement synchronisé, OneDrive par exemple) : l\'appli y écrira une sauvegarde chaque jour et gardera les '+AB_KEEP+' plus récentes.</p><button class="btn primary" type="button" data-act="abpick">Choisir le dossier de sauvegarde</button>')+'</div>'}
document.addEventListener("click",async e=>{const t=e.target.closest&&e.target.closest("button");if(!t)return;const a=t.dataset.act;
  if(a==="abpick"){await abPick();return}
  if(a==="abnow"){await abRun(true);fillAb();return}
  if(a==="abtog"){S.settings.autoBk=Object.assign(abCfg(),{on:!abCfg().on});lsSave();if(abCfg().on)await abRun(true);else abWake(false);fillAb();return}
  if(a==="abwake"){if(await abPerm(true)==="granted"){abWake(false);await abRun(false)||toast("Sauvegarde automatique réactivée");fillAb()}return}});
/* Vérification au démarrage, puis toutes les 30 minutes et au retour sur l'onglet */
function abTick(){if(!AB_OK||S.mode==="wait")return;abChecked=true;abRun(false)}
setTimeout(abTick,5000);setInterval(abTick,30*60e3);
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&abChecked)abTick()});
