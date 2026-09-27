import * as THREE from "three";
import { createWorld, createPlayer, createQuestMarker } from "./world.js";
import { loadState, saveState, resetState, loadChats, saveChats, loadLocalWall } from "./save.js";
import { initCloud, cloudSave, cloudLoad, getCloudWallPosts, getCloudMessages, sendCloudMessage, signIn, getSession } from "./backend.js";

const $ = (s)=>document.querySelector(s);
const $$ = (s)=>[...document.querySelectorAll(s)];
const canvas = $("#game-canvas");
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x9ecdf3,38,75);
const renderer = new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:"high-performance"});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const camera = new THREE.PerspectiveCamera(48,1,.1,120);
camera.position.set(5,27,23);
scene.add(camera);

const world = createWorld(scene);
const player = createPlayer();
scene.add(player);

let state = loadState();
player.position.set(state.player.x,0,state.player.z);
player.rotation.y = state.player.rotation || Math.PI;
let quests = [];
let markers = new Map();
let wallPosts = [];
let cloudEnabled = false;
let cloudSessionAvailable = false;
let mode = "menu";
let cameraDistance = state.settings?.cameraDistance ?? 9;
let startTransition = null;
let nearestAction = null;
let lastSave = 0;
let chats = loadChats();
let activeThread = "Papa";

const keys = {w:false,a:false,s:false,d:false};
const touchMove = {up:false,left:false,down:false,right:false};

await bootstrap();

async function bootstrap(){
  resize();
  window.addEventListener("resize",resize);
  quests = await fetchJson("./data/quests.json", defaultQuests());
  const staticPosts = await fetchJson("./data/family-wall.json", []);
  wallPosts = [...loadLocalWall(), ...staticPosts];
  buildQuestMarkers();
  applyWallTextures();
  renderMissions();
  renderWall();
  renderChatThreads();
  renderChat();
  updateHUD();
  wireUI();
  setupInput();

  const cloud = await initCloud();
  cloudEnabled = !!cloud.enabled;
  $("#chat-mode-note").textContent = cloudEnabled ? "Cloud mode enabled — sign in according to README setup." : "Local demo mode — messages stay in this browser until cloud is enabled.";
  if(cloudEnabled){
    $("#cloud-login-box").classList.remove("hidden");
    await refreshAuthStatus();
    try{
      const cs = await cloudLoad();
      if(cs){ state = {...state,...cs}; player.position.set(state.player.x,0,state.player.z); }
      const cp = await getCloudWallPosts(); if(cp?.length){wallPosts=[...cp.map(p=>({id:p.id,title:p.title,text:p.text,image:p.image_url||"",date:(p.created_at||"").slice(0,10)})),...wallPosts];renderWall();applyWallTextures();}
      const cm = await getCloudMessages(); if(cm?.length){ mergeCloudMessages(cm); }
    }catch(err){ console.warn(err); }
    setInterval(syncCloudFeed,10000);
  }
  animate();
}

function defaultQuests(){return [
  {id:"clean",title:"Clean",icon:"🧹",x:-9.5,z:6.5,xp:20,coins:10,hint:"Clean the laundry / utility area."},
  {id:"eat",title:"Eat",icon:"🍽️",x:-6,z:-5.5,xp:15,coins:5,hint:"Sit down at the dining table and eat."},
  {id:"tidy",title:"Tidy Up",icon:"📦",x:-9.5,z:2,xp:25,coins:12,hint:"Help tidy Anna's room."},
  {id:"renovate",title:"Renovate",icon:"🔨",x:-11,z:-3.5,xp:35,coins:18,hint:"Improve the living-room wall."},
  {id:"cook",title:"Cook",icon:"👨‍🍳",x:1,z:-.5,xp:30,coins:15,hint:"Prepare a family meal in the kitchen."},
  {id:"anna",title:"Play with Anna",icon:"👧",x:-7,z:-2,xp:40,coins:20,hint:"Spend some time playing with Anna."}
]}
async function fetchJson(url,fallback){try{const r=await fetch(url,{cache:"no-store"});if(!r.ok)throw 0;return await r.json();}catch{return fallback;}}

function buildQuestMarkers(){
  for(const q of quests){
    const m=createQuestMarker(q);m.position.set(q.x,0,q.z);scene.add(m);markers.set(q.id,m);
    if(state.completed[q.id])m.visible=false;
  }
}

function wireUI(){
  $("#start-btn").addEventListener("click",()=>startGame(false));
  $("#continue-btn").addEventListener("click",()=>startGame(true));
  $$('[data-open="wall"]').forEach(b=>b.addEventListener("click",()=>$("#wall-dialog").showModal()));
  $$('[data-open="chat"]').forEach(b=>b.addEventListener("click",openChat));
  $$('[data-open="settings"]').forEach(b=>b.addEventListener("click",()=>$("#settings-dialog").showModal()));
  $("#chat-fab").addEventListener("click",openChat);
  $("#chat-form").addEventListener("submit",sendMessage);
  $("#camera-distance").value=cameraDistance;
  $("#camera-distance").addEventListener("input",e=>{cameraDistance=Number(e.target.value);state.settings.cameraDistance=cameraDistance;persist();});
  $("#sound-enabled").checked=state.settings.sound!==false;
  $("#sound-enabled").addEventListener("change",e=>{state.settings.sound=e.target.checked;persist();});
  $("#markers-enabled").checked=state.settings.markers!==false;
  $("#markers-enabled").addEventListener("change",e=>{state.settings.markers=e.target.checked;syncMarkerVisibility();persist();});
  $("#cloud-login-btn").addEventListener("click",async()=>{
    try{await signIn($("#cloud-email").value.trim(),$("#cloud-password").value);$("#cloud-password").value="";await refreshAuthStatus();await syncCloudFeed();toast("Cloud account connected.");}
    catch(err){$("#cloud-auth-status").textContent=err.message||"Sign-in failed";}
  });
  $("#reset-save").addEventListener("click",()=>{if(confirm("Reset Anton's local progress on this browser?")){resetState();location.reload();}});
  $("#mobile-interact").addEventListener("pointerdown",e=>{e.preventDefault();interact();});
}

function setupInput(){
  addEventListener("keydown",e=>{
    const k=e.key.toLowerCase();
    if(["w","a","s","d"].includes(k)) keys[k]=true;
    if(k==="arrowup")keys.w=true;if(k==="arrowdown")keys.s=true;if(k==="arrowleft")keys.a=true;if(k==="arrowright")keys.d=true;
    if(k==="e" && mode==="play") interact();
    if(k==="escape" && mode==="play") returnToMenu();
  });
  addEventListener("keyup",e=>{
    const k=e.key.toLowerCase();if(["w","a","s","d"].includes(k))keys[k]=false;
    if(k==="arrowup")keys.w=false;if(k==="arrowdown")keys.s=false;if(k==="arrowleft")keys.a=false;if(k==="arrowright")keys.d=false;
  });
  $$("[data-move]").forEach(btn=>{
    const dir=btn.dataset.move;
    const on=e=>{e.preventDefault();touchMove[dir]=true;}; const off=e=>{e.preventDefault();touchMove[dir]=false;};
    btn.addEventListener("pointerdown",on);btn.addEventListener("pointerup",off);btn.addEventListener("pointercancel",off);btn.addEventListener("pointerleave",off);
  });
}

function startGame(continueGame){
  if(!continueGame && !Object.keys(state.completed||{}).length){ player.position.set(0,0,8.6); }
  $("#menu").classList.add("hidden");$("#hud").classList.remove("hidden");
  if(matchMedia("(pointer:coarse)").matches)$("#mobile-controls").classList.remove("hidden");
  mode="transition";
  const fromPos=camera.position.clone();const fromTarget=new THREE.Vector3(3,0,0);
  startTransition={t:0,fromPos,fromTarget,toPos:new THREE.Vector3(0,4.4,13.5),toTarget:new THREE.Vector3(0,1.5,7.5)};
  setTimeout(()=>{if(!localStorage.getItem("aaquest.intro.shown")){ $("#intro-dialog").showModal();localStorage.setItem("aaquest.intro.shown","1");}},1500);
}
function returnToMenu(){mode="menu";$("#hud").classList.add("hidden");$("#mobile-controls").classList.add("hidden");$("#menu").classList.remove("hidden");persist();}

function animate(time=0){
  requestAnimationFrame(animate);
  const dt=Math.min(.033,(time-(animate.last||time))/1000);animate.last=time;
  if(mode==="menu") menuCamera(time);
  else if(mode==="transition") transitionCamera(dt);
  else if(mode==="play"){updatePlayer(dt);updateCamera(dt);updateInteractions();updateMarkers(time);autoSave(time);}
  renderer.render(scene,camera);
}
function menuCamera(time){
  const a=time*.00008;camera.position.set(5+Math.cos(a)*2.4,27,22+Math.sin(a)*2.4);camera.lookAt(3,0,-.2);player.visible=false;
}
function transitionCamera(dt){
  player.visible=true;startTransition.t=Math.min(1,startTransition.t+dt/.95);const e=easeInOut(startTransition.t);
  camera.position.lerpVectors(startTransition.fromPos,startTransition.toPos,e);const target=startTransition.fromTarget.clone().lerp(startTransition.toTarget,e);camera.lookAt(target);
  if(startTransition.t>=1){mode="play";updateHUD();}
}
function easeInOut(t){return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;}

function updatePlayer(dt){
  let dx=(keys.d||touchMove.right?1:0)-(keys.a||touchMove.left?1:0);
  let dz=(keys.s||touchMove.down?1:0)-(keys.w||touchMove.up?1:0);
  if(!dx&&!dz)return;
  const len=Math.hypot(dx,dz);dx/=len;dz/=len;const speed=3.6;
  const nx=player.position.x+dx*speed*dt,nz=player.position.z+dz*speed*dt;
  if(canMoveTo(nx,player.position.z))player.position.x=nx;
  if(canMoveTo(player.position.x,nz))player.position.z=nz;
  player.rotation.y=Math.atan2(dx,dz)+Math.PI;
  updateMiniMap();
}
function canMoveTo(x,z){
  if(!isWalkable(x,z))return false;
  const r=.38;
  for(const b of world.colliders){
    if(x+r>b.min.x&&x-r<b.max.x&&z+r>b.min.z&&z-r<b.max.z)return false;
  }
  return true;
}
function isWalkable(x,z){
  const rs=[[-14,-2,-10,0],[-14,-6,0,9.2],[-3,6,4,9.2],[-2,2,-5,4],[2.5,8.3,-.3,3.9],[8.1,12.2,.2,6.2],[12,20,-2,6.3],[.7,12.2,-9.5,-5.7]];
  return rs.some(([x1,x2,z1,z2])=>x>x1+.25&&x<x2-.25&&z>z1+.25&&z<z2-.25);
}
function updateCamera(dt){
  const desired=new THREE.Vector3(player.position.x+4.2,5.0,player.position.z+cameraDistance*.72);
  camera.position.lerp(desired,1-Math.pow(.001,dt));const target=new THREE.Vector3(player.position.x,1.4,player.position.z-1.2);camera.lookAt(target);
}

function updateInteractions(){
  let best=null,bestD=Infinity;
  for(const q of quests){if(state.completed[q.id])continue;const d=distance2D(player.position.x,player.position.z,q.x,q.z);if(d<1.7&&d<bestD){bestD=d;best={type:"quest",quest:q};}}
  const wallD=distance2D(player.position.x,player.position.z,-12.2,-4.8);if(wallD<1.8&&wallD<bestD)best={type:"wall",label:"Open Family Wall"};
  const annaD=distance2D(player.position.x,player.position.z,-8.9,-4.0);if(annaD<1.5&&annaD<bestD&&!state.completed.anna)best={type:"quest",quest:quests.find(q=>q.id==="anna")};
  nearestAction=best;
  const box=$("#interaction");
  if(best){box.classList.remove("hidden");$("#interaction-label").textContent=best.type==="quest"?best.quest.title:best.label;}else box.classList.add("hidden");
}
function interact(){
  if(!nearestAction){toast("Nothing to interact with here.");return;}
  if(nearestAction.type==="wall"){renderWall();$("#wall-dialog").showModal();return;}
  const q=nearestAction.quest;if(!q||state.completed[q.id])return;
  state.completed[q.id]=true;state.player.x=player.position.x;state.player.z=player.position.z;state.player.rotation=player.rotation.y;state.player.xp+=q.xp;state.player.coins+=q.coins;
  state.player.level=1+Math.floor(state.player.xp/100);
  const marker=markers.get(q.id);if(marker)marker.visible=false;
  persist();renderMissions();updateHUD();toast(`${q.icon} ${q.title} complete! +${q.xp} XP · +${q.coins} coins`);
  if(q.id==="renovate") renovateLivingRoom();
}
function renovateLivingRoom(){
  // Visual reward: add a warm feature panel to the living room.
  const geo=new THREE.BoxGeometry(.12,1.8,3.0);const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0xc89866,roughness:.72}));m.position.set(-13.75,1.45,-3.9);scene.add(m);
}
function updateMarkers(time){
  let i=0;for(const [id,m] of markers){m.visible=state.settings.markers!==false&&!state.completed[id];if(!m.visible)continue;m.children[1].position.y=1.4+Math.sin(time*.003+i)*.13;m.children[1].rotation.y=time*.0015;i++;}
}
function syncMarkerVisibility(){for(const [id,m] of markers)m.visible=state.settings.markers!==false&&!state.completed[id];}

function renderMissions(){
  const host=$("#mission-list");host.innerHTML="";
  for(const q of quests){const done=!!state.completed[q.id];const row=document.createElement("div");row.className="mission-row"+(done?" done":"");row.innerHTML=`<span class="icon">${q.icon}</span><span>${q.title}</span><b>${done?"✓":"○"}</b>`;row.title=q.hint||"";host.appendChild(row);}
}
function updateHUD(){
  const xp=state.player.xp||0;const level=1+Math.floor(xp/100);const within=xp%100;
  $("#level").textContent=`Lv. ${level}`;$("#xp-label").textContent=`${within} / 100 XP`;$("#xp-fill").style.width=`${within}%`;$("#coins").textContent=state.player.coins||0;$("#stars").textContent=Object.values(state.completed||{}).filter(Boolean).length;updateChatBadge();
}
function updateMiniMap(){
  const el=$("#mini-player");const x=8+(player.position.x+14)/34*160;const y=18+(player.position.z+10)/20*100;el.style.left=`${Math.max(4,Math.min(166,x))}px`;el.style.top=`${Math.max(16,Math.min(114,y))}px`;
}
function autoSave(time){if(time-lastSave>3500){lastSave=time;state.player.x=player.position.x;state.player.z=player.position.z;state.player.rotation=player.rotation.y;persist(false);}}
async function persist(show=true){
  saveState(state);if(show){$("#save-indicator").textContent="▣ Saved";}
  if(cloudEnabled){try{await cloudSave(state);}catch(e){console.warn(e)}}
}
function toast(text){const t=$("#toast");t.textContent=text;t.classList.remove("hidden");clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.add("hidden"),2600);}
function distance2D(x1,z1,x2,z2){return Math.hypot(x1-x2,z1-z2)}

function openChat(){renderChat();$("#chat-dialog").showModal();}
function renderChatThreads(){
  const nav=$("#chat-threads");nav.innerHTML="";for(const name of ["Papa","Mama","Family"]){const b=document.createElement("button");b.className="thread-btn"+(name===activeThread?" active":"");b.textContent=name;b.addEventListener("click",()=>{activeThread=name;renderChatThreads();renderChat();});nav.appendChild(b);}
}
function renderChat(){
  $("#chat-title").textContent=activeThread;const host=$("#chat-messages");host.innerHTML="";for(const m of chats[activeThread]||[]){const d=document.createElement("div");d.className="bubble"+(m.from==="Anton"?" mine":"");d.innerHTML=`<b>${escapeHtml(m.from)}</b><div>${escapeHtml(m.text)}</div><small>${new Date(m.at).toLocaleString()}</small>`;host.appendChild(d);}host.scrollTop=host.scrollHeight;renderChatThreads();updateChatBadge();
}
async function sendMessage(e){e.preventDefault();const input=$("#chat-input");const text=input.value.trim();if(!text)return;const msg={from:"Anton",text,at:Date.now()};chats[activeThread]??=[];chats[activeThread].push(msg);saveChats(chats);input.value="";renderChat();if(cloudEnabled){try{await sendCloudMessage(activeThread,text);}catch(err){toast("Message saved locally; cloud send failed.");}}}
function mergeCloudMessages(rows){
  for(const r of rows){const thread=r.thread || (r.recipient_name==="Anton" ? (r.sender_name||"Family") : r.recipient_name) || "Family";if(!chats[thread])chats[thread]=[];const at=new Date(r.created_at).getTime();if(!chats[thread].some(m=>m.text===r.body&&Math.abs(m.at-at)<1000))chats[thread].push({from:r.sender_name||r.sender_display_name||"Family",text:r.body,at});}saveChats(chats);renderChat();
}
function updateChatBadge(){const count=Object.values(chats).reduce((n,arr)=>n+arr.filter(m=>m.from!=="Anton").length,0);$("#chat-badge").textContent=Math.min(count,99);}
function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));}

function renderWall(){
  const host=$("#wall-posts");host.innerHTML="";for(const p of wallPosts){const c=document.createElement("article");c.className="wall-card";const media=p.image?`<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.title||"Family photo")}">`:`<div class="wall-placeholder">${escapeHtml((p.title||"Family").slice(0,1))}</div>`;c.innerHTML=`${media}<div class="copy"><h3>${escapeHtml(p.title||"Family update")}</h3><p>${escapeHtml(p.text||"")}</p><time>${escapeHtml(p.date||p.created_at||"")}</time></div>`;host.appendChild(c);}
}
function applyWallTextures(){
  if(!world.familyFrames?.length)return;for(let i=0;i<world.familyFrames.length;i++){const p=wallPosts[i];const canvas=document.createElement("canvas");canvas.width=512;canvas.height=384;const ctx=canvas.getContext("2d");const grad=ctx.createLinearGradient(0,0,512,384);grad.addColorStop(0,["#7cc9ff","#ff99cb","#8fd18b"][i%3]);grad.addColorStop(1,"#f4e6b8");ctx.fillStyle=grad;ctx.fillRect(0,0,512,384);ctx.fillStyle="#17304c";ctx.font="bold 42px system-ui";ctx.fillText(p?.title?.slice(0,18)||"Family",28,80);ctx.font="26px system-ui";wrapText(ctx,p?.text||"New family update",28,135,450,34);ctx.font="20px system-ui";ctx.fillText(p?.date||"",28,340);const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;world.familyFrames[i].material=new THREE.MeshStandardMaterial({map:tex,roughness:.72});}}
function wrapText(ctx,text,x,y,maxWidth,lineHeight){const words=text.split(" ");let line="";for(const w of words){const test=line+w+" ";if(ctx.measureText(test).width>maxWidth&&line){ctx.fillText(line,x,y);line=w+" ";y+=lineHeight;}else line=test;}ctx.fillText(line,x,y);}

async function refreshAuthStatus(){
  if(!cloudEnabled)return;
  const session=await getSession();cloudSessionAvailable=!!session;
  $("#cloud-auth-status").textContent=session?`Signed in as ${session.user.email}`:"Not signed in — local mode is still active.";
}
async function syncCloudFeed(){
  if(!cloudEnabled)return;
  try{
    const session=await getSession();if(!session)return;
    const cm=await getCloudMessages();if(cm?.length)mergeCloudMessages(cm);
    const cp=await getCloudWallPosts();
    if(cp?.length){
      const mapped=cp.map(p=>({id:p.id,title:p.title,text:p.text,image:p.image_url||"",date:(p.created_at||"").slice(0,10)}));
      const localIds=new Set(wallPosts.map(p=>p.id));let changed=false;
      for(const p of mapped){if(!localIds.has(p.id)){wallPosts.unshift(p);changed=true;}}
      if(changed){renderWall();applyWallTextures();}
    }
  }catch(err){console.warn("Cloud sync",err)}
}

function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
