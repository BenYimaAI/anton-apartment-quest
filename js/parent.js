import { loadChats, saveChats, loadLocalWall, saveLocalWall } from "./save.js";
import { initCloud, sendCloudMessage, createCloudWallPost, signIn, getSession } from "./backend.js";

const $=s=>document.querySelector(s);
let cloud=false;
const chats=loadChats();

const status=await initCloud();
cloud=!!status.enabled;
$("#mode-status").textContent=cloud?"Cloud configured":"Local mode";
if(cloud){
  $("#parent-login").style.display="block";
  const session=await getSession();
  $("#parent-auth-status").textContent=session?`Signed in as ${session.user.email}`:"Not signed in";
}
$("#parent-login-form").addEventListener("submit",async e=>{
  e.preventDefault();
  try{const d=await signIn($("#parent-email").value.trim(),$("#parent-password").value);$("#parent-password").value="";$("#parent-auth-status").textContent=`Signed in as ${d.user.email}`;}
  catch(err){$("#parent-auth-status").textContent=err.message||"Sign-in failed";}
});

$("#message-form").addEventListener("submit",async e=>{
  e.preventDefault();const sender=$("#sender").value;const text=$("#message-text").value.trim();if(!text)return;
  chats[sender]??=[];chats[sender].push({from:sender,text,at:Date.now()});saveChats(chats);$("#message-text").value="";render();
  if(cloud){try{await sendCloudMessage(sender,text,sender,"Anton");}catch(err){alert("Saved locally, but cloud send failed: "+err.message)}}
});

$("#wall-form").addEventListener("submit",async e=>{
  e.preventDefault();const post={id:"local-"+Date.now(),date:new Date().toISOString().slice(0,10),title:$("#wall-title").value.trim(),text:$("#wall-text").value.trim(),image:$("#wall-image").value.trim()};
  const posts=loadLocalWall();posts.unshift(post);saveLocalWall(posts);e.target.reset();
  if(cloud){try{await createCloudWallPost(post);}catch(err){alert("Saved locally, but cloud publish failed: "+err.message)}}
  alert("Published. Reopen or refresh the game to see the update.");
});
function render(){const h=$("#message-preview");h.innerHTML="";for(const name of ["Papa","Mama","Family"]){for(const m of (chats[name]||[]).slice(-4).reverse()){const d=document.createElement("div");d.className="preview-item";d.textContent=`${name}: ${m.text}`;h.appendChild(d);}}}
render();
