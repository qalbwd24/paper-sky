/* Original Qingwan valley, preserved as a selectable world. */
function buildValley(){
const C=FlightCore,scene=new THREE.Group();
scene.add(new THREE.HemisphereLight('#ecf3ff','#688e7e',.9));
const sun=new THREE.DirectionalLight('#fff0d5',2.1);sun.position.set(-450,600,-350);scene.add(sun);
let seed=123987;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const material=(color)=>new THREE.MeshLambertMaterial({color,flatShading:true});
const palette={wall:material('#f4e4c3'),wall2:material('#e5d2ad'),roof:material('#b86b4b'),roof2:material('#d08a61'),wood:material('#72664e'),leaf:material('#73916d'),leaf2:material('#93a475'),pine:material('#557c69'),window:material('#647f78'),stone:material('#a5aaa0'),white:material('#fff4d6')};
const collisionObjects=[];
function addMesh(geo,mat,x,y,z,solid=false){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);scene.add(m);if(solid)collisionObjects.push(m);return m;}
const boxGeo=new THREE.BoxGeometry(1,1,1);
function box(x,y,z,w,h,d,mat,solid=true){const m=addMesh(boxGeo,mat,x,y,z,solid);m.scale.set(w,h,d);return m;}
// Non-indexed flat-colour terrain: roughly 45k triangles, one draw call.
const positions=[],colors=[];const landColors=['#99af7d','#a6b98a','#afbd8c','#b6c497','#9fb784'].map(x=>new THREE.Color(x));
function tri(a,b,c,color){positions.push(...a,...b,...c);for(let i=0;i<3;i++)colors.push(color.r,color.g,color.b);}
for(let z=-1500;z<1500;z+=20)for(let x=-1500;x<1500;x+=20){
  const a=[x,C.rawHeight(x,z),z],b=[x+20,C.rawHeight(x+20,z),z],c=[x,C.rawHeight(x,z+20),z+20],d=[x+20,C.rawHeight(x+20,z+20),z+20];
  const band=(Math.sin(x/140+Math.sin(z/110))*.5+.5);const col=new THREE.Color('#a6b98a').lerp(new THREE.Color('#a0b183'),band*.65);col.multiplyScalar(.98+rand()*.04);
  const h=(a[1]+b[1]+c[1]+d[1])/4;if(h>90)col.lerp(new THREE.Color('#929e89'),C.clamp((h-90)/150,0,.8));if(h<6)col.set('#c8c6a0');
  tri(a,c,b,col);tri(b,c,d,col);
}
const landGeo=new THREE.BufferGeometry();landGeo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));landGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));landGeo.computeVertexNormals();
scene.add(new THREE.Mesh(landGeo,new THREE.MeshLambertMaterial({vertexColors:true,flatShading:true})));
// Distant overlapping peaks give the horizon a layered silhouette.
const mountainMat=material('#829e98');
for(let i=0;i<23;i++){const angle=i/23*Math.PI*2,r=1660+rand()*100,h=220+rand()*290;const m=addMesh(new THREE.ConeGeometry(190+rand()*140,h,5),mountainMat,Math.sin(angle)*r,h*.5-10,Math.cos(angle)*r);m.rotation.y=rand()*Math.PI;m.scale.z=.75+rand()*.65;}
const water=addMesh(new THREE.PlaneGeometry(3100,3100),material('#78b5b6'),0,1,0);water.rotation.x=-Math.PI/2;
// Decorative river ripples, batched into one geometry.
const ripples=[];
for(let i=0;i<240;i++){let z=rand()*2700-1350,x=C.riverX(z)+(rand()-.5)*28;const w=1+rand()*4;ripples.push(x-w,1.08,z,x+w,1.08,z);}
const rippleGeo=new THREE.BufferGeometry();rippleGeo.setAttribute('position',new THREE.Float32BufferAttribute(ripples,3));scene.add(new THREE.LineSegments(rippleGeo,new THREE.LineBasicMaterial({color:'#c1dbcd',transparent:true,opacity:.4})));
// Buildings have real pitched roof geometry and matching collision surfaces.
const houses=[];
function house(x,z,w,d,h,roofMat=palette.roof){
  const base=Math.max(C.heightAt(x-w/2,z-d/2),C.heightAt(x+w/2,z+d/2),C.heightAt(x-w/2,z+d/2),C.heightAt(x+w/2,z-d/2));
  const body=box(x,base+h/2-1,z,w,h+2,d,rand()>.5?palette.wall:palette.wall2);body.userData.kind='墙面';
  const e=w/2+.9,f=d/2+.9,r=h*.58,verts=[[-e,0,-f],[e,0,-f],[0,r,-f],[-e,0,f],[e,0,f],[0,r,f]];
  const data=[];for(const face of [[0,2,1],[3,4,5],[0,3,5],[0,5,2],[2,5,4],[2,4,1],[0,1,4],[0,4,3]])for(const j of face)data.push(...verts[j]);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(data,3));g.computeVertexNormals();const roof=addMesh(g,roofMat,x,base+h,z,true);roof.userData.kind='屋顶';
  box(x+w*.26,base+h+r*.65,z+d*.17,1.5,r,1.6,palette.wall2);
  for(let k=-1;k<=1;k+=2){box(x+k*w*.26,base+h*.6,z+d/2+.03,1.55,2,.12,palette.window,false);box(x+k*w*.26,base+h*.6,z-d/2-.03,1.55,2,.12,palette.window,false);}
  box(x,base+1.7,z+d/2+.1,1.8,3.4,.15,palette.wood,false);
  houses.push({x,z,w,d,base,h,roofY:base+h+r});
}
for(let i=0;i<26;i++){const z=-250+(i%9)*60+(rand()-.5)*14,x=C.riverX(z)+85+Math.floor(i/9)*59+(rand()-.5)*10;house(x,z,13+rand()*8,15+rand()*9,7+rand()*5,i%3?palette.roof:palette.roof2);}
for(const [x,z] of [[-100,-320],[-145,140],[-130,210],[210,470],[235,-630],[-160,-720]])house(x,z,14,18,9);
// Three simple bridges; their decks stop the plane, their undersides remain open.
for(const z of [-330,210,-750]){const x=C.riverX(z),y=Math.max(C.heightAt(x-58,z),C.heightAt(x+58,z))+1;box(x,y,z,128,2,10,palette.wood).userData.kind='桥面';for(const side of [-1,1]){box(x,y+2.3,z+side*4.8,128,.6,.5,palette.wood);for(let j=-3;j<=3;j++)box(x+j*18,y+1,z+side*4.8,.7,3,.7,palette.wood);}}
// A windmill gives the valley a landmark.
const mill={x:-180,z:-120},my=C.heightAt(mill.x,mill.z);addMesh(new THREE.CylinderGeometry(4,6,22,7),palette.wall,mill.x,my+11,mill.z,true).userData.kind='风车';addMesh(new THREE.ConeGeometry(7,8,7),palette.roof,mill.x,my+26,mill.z,true);
const blades=new THREE.Group();blades.position.set(mill.x,my+19,mill.z+4.7);scene.add(blades);for(let i=0;i<4;i++){const arm=new THREE.Mesh(boxGeo,palette.wood);arm.scale.set(1,15,.5);arm.position.set(0,7,0);const g=new THREE.Group();g.rotation.z=i*Math.PI/2;g.add(arm);const sail=new THREE.Mesh(boxGeo,palette.white);sail.scale.set(3.2,8,.25);sail.position.set(1.4,10,.3);g.add(sail);blades.add(g);}
// Instanced forest: hundreds of trees, only three draw calls.
const treeData=[];
for(let i=0;i<750;i++){const x=(rand()-.5)*2250,z=(rand()-.5)*2450;if(Math.abs(x-C.riverX(z))<62||houses.some(h=>Math.hypot(x-h.x,z-h.z)<30)||Math.hypot(x-mill.x,z-mill.z)<35||[-330,210,-750].some(b=>Math.abs(z-b)<15&&Math.abs(x-C.riverX(z))<80))continue;treeData.push({x,z,y:C.heightAt(x,z),h:9+rand()*13,s:3+rand()*4});}
const trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.55,.9,1,5),palette.wood,treeData.length),crowns=new THREE.InstancedMesh(new THREE.ConeGeometry(1,1,6),palette.pine,treeData.length),crowns2=new THREE.InstancedMesh(new THREE.ConeGeometry(1,1,5),palette.leaf,treeData.length);
const dummy=new THREE.Object3D();for(let i=0;i<treeData.length;i++){const t=treeData[i];dummy.position.set(t.x,t.y+t.h*.35,t.z);dummy.scale.set(1,t.h*.7,1);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);dummy.position.y=t.y+t.h*.7;dummy.scale.set(t.s,t.h*.75,t.s);dummy.updateMatrix();crowns.setMatrixAt(i,dummy.matrix);dummy.position.y=t.y+t.h*.95;dummy.scale.set(t.s*.73,t.h*.55,t.s*.73);dummy.updateMatrix();crowns2.setMatrixAt(i,dummy.matrix);}scene.add(trunks,crowns,crowns2);
// Soft, opaque low-poly clouds. No volumetrics or expensive shadow maps.
const cloudGeo=new THREE.IcosahedronGeometry(1,1),cloudMat=new THREE.MeshBasicMaterial({color:'#f4f0de'});
for(let i=0;i<30;i++){const x=(rand()-.5)*2400,z=(rand()-.5)*2400,y=220+rand()*190;for(let j=0;j<3;j++){const m=addMesh(cloudGeo,cloudMat,x+j*20,y+rand()*9,z);m.scale.set(30+rand()*18,9+rand()*7,17+rand()*14);}}

scene.updateMatrixWorld(true);for(const m of collisionObjects)m.userData.bounds=new THREE.Box3().setFromObject(m);
return {group:scene,colliders:collisionObjects,trees:treeData,houses,mill,blades,ground:(x,z)=>Math.max(1,C.heightAt(x,z)),width:3000,depth:3000,height:500};
}

