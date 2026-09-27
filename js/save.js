const KEY = "aaquest.save.v1";
const CHAT_KEY = "aaquest.chat.v1";
const WALL_KEY = "aaquest.wall.local.v1";

export function defaultState(){
  return {
    version:1,
    player:{x:0,z:8.6,rotation:Math.PI,xp:0,coins:0,level:1},
    completed:{},
    settings:{cameraDistance:9,sound:true,markers:true},
    updatedAt:new Date().toISOString()
  };
}

export function loadState(){
  try{
    const raw = localStorage.getItem(KEY);
    if(!raw) return defaultState();
    return {...defaultState(), ...JSON.parse(raw)};
  }catch{ return defaultState(); }
}

export function saveState(state){
  state.updatedAt = new Date().toISOString();
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function resetState(){ localStorage.removeItem(KEY); }

export function loadChats(){
  try{
    const raw = localStorage.getItem(CHAT_KEY);
    if(raw) return JSON.parse(raw);
  }catch{}
  return {
    Papa:[
      {from:"Papa",text:"Hey Anton — welcome to Apartment Quest!",at:Date.now()-1000*60*25},
      {from:"Papa",text:"Try one mission and tell me how it goes.",at:Date.now()-1000*60*23}
    ],
    Mama:[{from:"Mama",text:"Have fun — and don't forget the kitchen quest 😊",at:Date.now()-1000*60*18}],
    Family:[{from:"Family",text:"Family group is ready.",at:Date.now()-1000*60*10}]
  };
}

export function saveChats(chats){ localStorage.setItem(CHAT_KEY, JSON.stringify(chats)); }
export function loadLocalWall(){
  try{return JSON.parse(localStorage.getItem(WALL_KEY)||"[]");}catch{return []}
}
export function saveLocalWall(posts){ localStorage.setItem(WALL_KEY, JSON.stringify(posts)); }
