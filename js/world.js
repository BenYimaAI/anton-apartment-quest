import * as THREE from "three";

const C = {
  wall:0xd9dde2,
  wallTrim:0xbcc4cc,
  wood:0xb9783f,
  wood2:0xc88b4f,
  tile:0x353b44,
  tile2:0x515862,
  white:0xf5f3ef,
  gray:0x808890,
  dark:0x2b3038,
  green:0x65a84a,
  blue:0x317fc1,
  pink:0xe777b5,
  yellow:0xf2c84d,
  skin:0xf2c7a7,
  blonde:0xe3bd4f,
  blackHair:0x24242a
};

export function createWorld(scene){
  const root = new THREE.Group();
  root.name = "Apartment";
  scene.add(root);

  const colliders = [];
  const questAnchors = {};
  const npcAnchors = {};
  const familyFrames = [];

  addAmbientStructure(scene);
  addFloors(root);
  addWalls(root,colliders);
  addFurniture(root,questAnchors,npcAnchors,familyFrames);
  addNPCs(root,npcAnchors);
  addBalcony(root);

  return {root,colliders,questAnchors,npcAnchors,familyFrames};
}

function mat(color,rough=.8,metal=.02){return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal});}
function box(group,x,y,z,w,h,d,color,opts={}){
  const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color,opts.roughness??.8,opts.metalness??.02));
  m.position.set(x,y+h/2,z);m.castShadow=opts.cast!==false;m.receiveShadow=opts.receive!==false;group.add(m);return m;
}
function addAmbientStructure(scene){
  scene.background = new THREE.Color(0x9ecdf3);
  const hemi=new THREE.HemisphereLight(0xe9f5ff,0x5b6a55,2.0);scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xfff0cf,3.2);sun.position.set(-10,24,10);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-30;sun.shadow.camera.right=30;sun.shadow.camera.top=30;sun.shadow.camera.bottom=-30;scene.add(sun);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(90,90),new THREE.MeshStandardMaterial({color:0x7fa66b,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.08;ground.receiveShadow=true;scene.add(ground);
  // soft city blocks around apartment
  for(let i=0;i<38;i++){
    const a=Math.random()*Math.PI*2,r=28+Math.random()*18;
    const w=2+Math.random()*4,h=3+Math.random()*9,d=2+Math.random()*4;
    const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(0xaab6bf));
    b.position.set(Math.cos(a)*r,h/2-.05,Math.sin(a)*r);b.receiveShadow=true;scene.add(b);
  }
}
function floorRect(group,x,z,w,d,color){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,.12,d),mat(color,1));m.position.set(x,.02,z);m.receiveShadow=true;group.add(m);return m;
}
function addFloors(g){
  // Geometry follows the supplied apartment plan in simplified/voxel form.
  floorRect(g,-8,-5,12,10,C.wood2);     // living / dining
  floorRect(g,-9.5,2.5,7,5,C.wood);    // Anna room
  floorRect(g,-10,7.2,6,4,C.tile);     // utility / WC
  floorRect(g,-1.0,-1.2,6,7.6,C.wood2);// kitchen
  floorRect(g,1.5,6.1,9,4.2,C.wood);   // entrance / corridor
  floorRect(g,5.4,1.8,5.8,4.2,C.wood); // Anton room
  floorRect(g,10.0,3.2,4.2,6.0,C.tile);// bathroom
  floorRect(g,16.0,2.1,8.0,8.2,C.wood);// parents bedroom
  floorRect(g,6.5,-7.6,11.5,3.8,C.wood);// balcony/loggia
}
function addWall(g,colliders,x1,z1,x2,z2,height=3.05,th=.24){
  const dx=x2-x1,dz=z2-z1,len=Math.hypot(dx,dz);const mesh=new THREE.Mesh(new THREE.BoxGeometry(len,height,th),mat(C.wall));
  mesh.position.set((x1+x2)/2,height/2,(z1+z2)/2);mesh.rotation.y=-Math.atan2(dz,dx);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
  // collision box: for diagonal walls use slightly larger AABB; current layout is mostly axis-aligned.
  const bb=new THREE.Box3().setFromObject(mesh);colliders.push(bb);
  return mesh;
}
function addWalls(g,c){
  // Left block outer shell
  addWall(g,c,-14,-10,-2,-10); addWall(g,c,-14,-10,-14,9.2); addWall(g,c,-14,9.2,-7,9.2);
  addWall(g,c,-7,9.2,6,9.2); addWall(g,c,-2,-10,-2,-5.2);
  // Anna / utility divisions
  addWall(g,c,-14,5,-6,5); addWall(g,c,-6,5,-6,9.2); addWall(g,c,-6,0,-6,3.2); addWall(g,c,-6,4.0,-6,5);
  // living / kitchen
  addWall(g,c,-6,0,-2,0); addWall(g,c,-2,-5.2,-2,-3.4); addWall(g,c,-2,-2.0,-2,0);
  addWall(g,c,2,-5,2,-2.6); addWall(g,c,2,-1.2,2,4.0);
  // entrance/corridor
  addWall(g,c,-3.0,4.0,-3.0,9.2); addWall(g,c,6,4,6,9.2); addWall(g,c,-3,4,1.6,4); addWall(g,c,3.0,4,6,4);
  // Anton room
  addWall(g,c,2.5,-.3,8.3,-.3); addWall(g,c,2.5,-.3,2.5,3.9); addWall(g,c,8.3,-.3,8.3,3.9); addWall(g,c,2.5,3.9,4.2,3.9); addWall(g,c,5.6,3.9,8.3,3.9);
  // bathroom
  addWall(g,c,8.1,.2,12.2,.2); addWall(g,c,12.2,.2,12.2,6.2); addWall(g,c,8.1,6.2,12.2,6.2); addWall(g,c,8.1,.2,8.1,2.1); addWall(g,c,8.1,3.6,8.1,6.2);
  // parent room
  addWall(g,c,12.0,-2.0,20.0,-2.0); addWall(g,c,20,-2,20,6.3); addWall(g,c,12,6.3,20,6.3); addWall(g,c,12,-2,12,1.1); addWall(g,c,12,2.5,12,6.3);
  // balcony rail / edge low walls
  addWall(g,c,.7,-9.5,12.2,-9.5,1.05,.18); addWall(g,c,12.2,-9.5,12.2,-5.7,1.05,.18); addWall(g,c,.7,-9.5,.7,-5.7,1.05,.18);
}
function addFurniture(g,q,n,frames){
  // Living room
  box(g,-10.6,.12,-4.1,1.0,1.2,5.0,0x707780);box(g,-8.8,.12,-6.3,4.6,1.2,1.1,0x707780);
  box(g,-8.1,.12,-4.6,2.0,.45,1.4,0x9a6a47);box(g,-8.1,.58,-4.6,1.2,.08,.8,0xc89564);
  box(g,-12.2,.12,-2.8,.55,1.7,3.2,0x5f4130);box(g,-12.0,1.95,-2.8,.14,1.8,2.3,0x222832);
  plant(g,-11.5,-7.7,1.3);plant(g,-3.2,-6.0,1.1);
  // dining
  box(g,-6.6,.12,-7.3,3.6,.75,1.7,0x9e6338);for(const [x,z] of [[-8.1,-7.3],[-5.1,-7.3],[-7.4,-8.6],[-5.8,-8.6],[-7.4,-6.0],[-5.8,-6.0]]) chair(g,x,z);
  // kitchen
  box(g,-1.7,.12,-2.5,1.1,.9,4.0,C.white);box(g,.6,.12,-3.6,3.2,.9,1.1,C.white);box(g,1.5,.12,.6,1.0,.9,4.4,C.white);box(g,-.8,.12,2.1,2.8,.9,1.0,C.white);
  box(g,-1.68,1.0,-2.5,.9,.06,3.7,0xa86e45);box(g,.6,1.0,-3.6,3.0,.06,.9,0xa86e45);box(g,1.5,1.0,.6,.8,.06,4.1,0xa86e45);
  // appliances
  box(g,-1.2,.12,2.4,.8,2.0,.8,0xd9e0e5); box(g,-.2,.12,2.4,.8,2.0,.8,0xd9e0e5);
  // Anna room
  bed(g,-11.6,2.7,0x9bcf63); wardrobe(g,-7.0,2.9,2.5);box(g,-11.8,.12,.9,.7,.85,2.0,0xb8c0ca);box(g,-8.6,.12,1.1,1.6,.9,.6,0xc48a66);
  // utility
  appliance(g,-11.9,7.4);appliance(g,-10.7,7.4);box(g,-8.4,.12,7.4,3.0,.9,.75,C.white);box(g,-7.0,.12,5.8,.75,1.9,.75,C.white);
  // Anton room
  bed(g,6.8,1.0,0x5c8fe0); wardrobe(g,4.0,2.8,2.1);box(g,7.2,.12,3.25,1.7,.75,.65,0xe3e3e2);chair(g,7.2,2.5);
  // Bathroom
  box(g,11.4,.12,3.2,.55,.55,3.0,0xf0f2f4);box(g,9.0,.12,5.25,1.2,.9,.6,C.white);box(g,9.2,.12,1.0,.9,.55,.8,C.white);box(g,9.2,.67,1.0,.4,.35,.5,C.white);
  // parent bedroom
  bed(g,16.3,1.7,0x56545a,3.0,4.4); wardrobe(g,16.0,5.7,5.8);box(g,13.3,.12,1.7,.75,.75,.6,0x8a624a);box(g,19.0,.12,1.7,.75,.75,.6,0x8a624a);
  // entrance storage
  wardrobe(g,3.9,8.5,2.3);box(g,-1.9,.12,7.6,1.8,.8,.55,0x8a624a);plant(g,5.0,7.7,.8);

  // Family Wall frames in living room, dynamically updated with post textures.
  for(let i=0;i<3;i++){
    const frame=box(g,-13.84,1.4,-5.7+i*1.8,.10,1.5,1.25,0x4e3426,{cast:false});
    frame.rotation.y=Math.PI/2;frames.push(frame);
  }

  q.clean=new THREE.Vector3(-9.5,0,6.6); q.eat=new THREE.Vector3(-6.6,0,-6.0);q.tidy=new THREE.Vector3(-9.6,0,2.3);q.renovate=new THREE.Vector3(-11.7,0,-3.5);q.cook=new THREE.Vector3(.3,0,-2.1);q.anna=new THREE.Vector3(-8.7,0,-4.2);
  n.anna=new THREE.Vector3(-8.9,0,-4.0);n.mama=new THREE.Vector3(-4.6,0,-7.3);n.papa=new THREE.Vector3(.2,0,-1.1);
}
function plant(g,x,z,s=1){box(g,x,.1,z,.65,.5,.65,0x76533a);const leaves=new THREE.Group();g.add(leaves);for(const [dx,dy,dz,sc] of [[0,.8,0,.75],[.3,.65,0,.5],[-.3,.7,.2,.5],[0,1.1,.1,.48]]){const m=new THREE.Mesh(new THREE.BoxGeometry(sc*s,sc*s,sc*s),mat(C.green));m.position.set(x+dx*s,dy*s,z+dz*s);leaves.add(m);}}
function bed(g,x,z,color,w=2.0,d=3.2){box(g,x,.12,z,w,.48,d,0xc5b08e);box(g,x,.62,z+.15,w*.94,.34,d*.84,color);box(g,x,.98,z-d*.27,w*.75,.22,d*.22,C.white);}
function wardrobe(g,x,z,w=2.5){box(g,x,.12,z,w,2.5,.62,0xe3e4df);for(let i=-1;i<=1;i++)box(g,x+i*w/4,1.2,z-.33,.05,.05,.05,0x777d84,{cast:false});}
function appliance(g,x,z){box(g,x,.12,z,1.0,1.0,.9,0xe9edf0);const door=box(g,x,.44,z-.47,.66,.55,.03,0x50606b,{cast:false});door.rotation.x=0;}
function chair(g,x,z){box(g,x,.12,z,.62,.5,.62,0x535962);box(g,x,.62,z+.25,.62,.72,.1,0x535962);}
function addBalcony(g){
  box(g,3.5,.12,-7.8,3.0,.72,1.4,0x8a5d39);for(const [x,z] of [[2.1,-7.8],[4.9,-7.8],[3.0,-6.8],[4.0,-6.8],[3.0,-8.8],[4.0,-8.8]])chair(g,x,z);plant(g,9.6,-8.6,1);plant(g,10.7,-6.4,.9);
}
function addNPCs(g,n){
  g.add(createVoxelCharacter("Anna",n.anna.x,n.anna.z,{hair:C.blonde,shirt:C.pink,pants:0xffffff,scale:.82}));
  g.add(createVoxelCharacter("Mama",n.mama.x,n.mama.z,{hair:C.blackHair,shirt:0xe9edf2,pants:0x45536b,scale:1}));
  g.add(createVoxelCharacter("Papa",n.papa.x,n.papa.z,{hair:C.blonde,shirt:0x3b8f52,pants:0x39475c,scale:1.05}));
}
export function createVoxelCharacter(name,x,z,{hair=C.blonde,shirt=C.blue,pants=0x34455f,scale=1}={}){
  const g=new THREE.Group();g.name=name;g.position.set(x,0,z);g.scale.setScalar(scale);
  box(g,0,1.55,0,.95,.85,.55,shirt);box(g,0,2.4,0,.8,.8,.72,C.skin);box(g,0,3.12,0,.9,.35,.78,hair);
  box(g,-.2,.15,0,.32,1.3,.4,pants);box(g,.2,.15,0,.32,1.3,.4,pants);box(g,-.65,1.55,0,.26,.9,.35,C.skin);box(g,.65,1.55,0,.26,.9,.35,C.skin);
  // face is on negative Z, matching default forward direction
  box(g,-.18,2.76,-.375,.11,.11,.03,0x4ca9e8,{cast:false});box(g,.18,2.76,-.375,.11,.11,.03,0x4ca9e8,{cast:false});
  return g;
}
export function createPlayer(){
  const p=createVoxelCharacter("Anton",0,8.6,{hair:C.blonde,shirt:0x276fc2,pants:0x26344a,scale:1});
  // backpack
  box(p,0,1.6,.43,.75,.95,.28,0x1a4d89);return p;
}
export function createQuestMarker(quest){
  const g=new THREE.Group();g.userData.questId=quest.id;
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.42,.08,8,24),new THREE.MeshStandardMaterial({color:0xffd029,emissive:0xff9300,emissiveIntensity:2}));ring.rotation.x=Math.PI/2;ring.position.y=.12;g.add(ring);
  const diamond=new THREE.Mesh(new THREE.OctahedronGeometry(.24),new THREE.MeshStandardMaterial({color:0xffe55f,emissive:0xffa000,emissiveIntensity:2}));diamond.position.y=1.4;g.add(diamond);
  return g;
}
