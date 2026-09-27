// Optional cloud adapter. The game is intentionally fully playable without it.
// When window.AAQ_CONFIG.cloud.enabled is true, this module uses Supabase for
// cloud save, messages and Family Wall data.
let client = null;
let ready = false;

export async function initCloud(){
  const cfg = window.AAQ_CONFIG?.cloud;
  if(!cfg?.enabled || !cfg.supabaseUrl || !cfg.supabaseAnonKey) return {enabled:false};
  try{
    const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    client = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
    ready = true;
    return {enabled:true};
  }catch(err){
    console.warn("Cloud disabled:",err);
    return {enabled:false,error:err};
  }
}

export async function getSession(){
  if(!ready) return null;
  const {data} = await client.auth.getSession();
  return data.session || null;
}

export async function signIn(email,password){
  if(!ready) throw new Error("Cloud is not configured");
  const {data,error}=await client.auth.signInWithPassword({email,password});
  if(error) throw error;
  return data;
}

export async function cloudSave(state){
  if(!ready) return false;
  const session = await getSession();
  if(!session) return false;
  const payload={user_id:session.user.id,state,updated_at:new Date().toISOString()};
  const {error}=await client.from("game_saves").upsert(payload,{onConflict:"user_id"});
  if(error) throw error;
  return true;
}

export async function cloudLoad(){
  if(!ready) return null;
  const session=await getSession();
  if(!session) return null;
  const {data,error}=await client.from("game_saves").select("state").eq("user_id",session.user.id).maybeSingle();
  if(error) throw error;
  return data?.state || null;
}

export async function sendCloudMessage(thread,body,senderName="Anton",recipientName=thread){
  if(!ready) return false;
  const session=await getSession();
  if(!session) return false;
  const {error}=await client.from("messages").insert({sender_id:session.user.id,sender_name:senderName,recipient_name:recipientName,thread,body});
  if(error) throw error;
  return true;
}

export async function getCloudMessages(){
  if(!ready) return [];
  const session=await getSession();
  if(!session) return [];
  const {data,error}=await client.from("messages").select("*").order("created_at",{ascending:true}).limit(250);
  if(error) throw error;
  return data||[];
}

export async function getCloudWallPosts(){
  if(!ready) return [];
  const session=await getSession();
  if(!session) return [];
  const {data,error}=await client.from("wall_posts").select("*").order("created_at",{ascending:false}).limit(50);
  if(error) throw error;
  return data||[];
}

export async function createCloudWallPost(post){
  if(!ready) return false;
  const session=await getSession();
  if(!session) return false;
  const {error}=await client.from("wall_posts").insert({author_id:session.user.id,title:post.title,text:post.text,image_url:post.image||null});
  if(error) throw error;
  return true;
}

export async function signOut(){
  if(!ready) return;
  await client.auth.signOut();
}
