const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
global.THREE=require('./vendor/three.min.js');const {createInkBird}=require('./ink-bird.js');
const bird=createInkBird(),state=(pitch,bank,hz=120)=>{bird.reset();for(let i=0;i<hz;i++)bird.update(1/hz,{pitch,bank,active:true});return bird.tips.map(v=>v.clone());};
const glide=state(-.21,0),dive=state(-.72,0),climb=state(.4,0),left=state(0,.8),right=state(0,-.8);
assert.ok(Math.abs(dive[0].x)<Math.abs(glide[0].x)*.8,'dive visibly sweeps wings back');
assert.ok(climb[0].y>glide[0].y,'climb raises wings');
assert.ok(left[0].distanceTo(new THREE.Vector3(-right[1].x,right[1].y,right[1].z))<1e-9,'left/right mirror poses');
const a=state(.3,.5,30),b=state(.3,.5,120);a.forEach((v,i)=>assert.ok(v.distanceTo(b[i])<1e-8,'30/120 Hz agree'));
const before=JSON.stringify(bird.pose);bird.update(0,{pitch:-1,bank:-1,active:true});assert.equal(before,JSON.stringify(bird.pose),'pause freezes wing beat');
for(let i=0;i<240;i++)bird.update(1/120,{active:false});assert.ok(Math.abs(bird.pose.flap)<.001,'landing fades wing beats');
let triangles=0,meshes=0;bird.group.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;assert.ok(o.material.map&&o.material.alphaTest>0,'ink is cut out, without a paper rectangle');}});
assert.ok(triangles<4000&&meshes<=3,'small geometry budget');
// No folding over or abrupt stretching at the former wing/tail seam.
const surface=bird.group.children[0].geometry,pos=surface.attributes.position,index=surface.index;
for(const pitch of [-.72,0,.44])for(const bank of [-.9,0,.9]){
 state(pitch,bank);for(let j=0;j<index.count;j+=3){const a=new THREE.Vector3().fromBufferAttribute(pos,index.getX(j)),b=new THREE.Vector3().fromBufferAttribute(pos,index.getX(j+1)),c=new THREE.Vector3().fromBufferAttribute(pos,index.getX(j+2));assert(new THREE.Vector3().crossVectors(b.sub(a),c.sub(a)).y>0,'No inverted feather triangles');}
}
const shader={fragmentShader:'#include <map_fragment>'};bird.group.children[0].material.onBeforeCompile(shader);assert(shader.fragmentShader.includes('diffuseColor.rgb=vec3(0.0)'),'Pigment must be black, source colour only controls opacity');
const canvas={getContext:()=>new Proxy({},{get:()=>()=>{}})},context={THREE,createInkBird,document:{createElement:()=>({...canvas})}};
vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/paper.js','utf8'),context);
const plane=context.createPaperPlane({capabilities:{getMaxAnisotropy:()=>1}}),u=plane.userData,refs=[...u.probes];
for(const skin of ['math','inkbird','white','inkbird','mechanical']){u.setSkin(skin);assert.equal(plane.children[0].visible,skin!=='inkbird');assert.equal(plane.children[1].visible,skin!=='inkbird');assert.equal(plane.children[2].visible,skin==='inkbird');u.probes.forEach((v,i)=>assert.equal(v,refs[i],'keep cached collision probe identities'));}
u.setSkin('inkbird');u.updatePose(1,{pitch:.3,bank:.4,active:true});assert.ok(u.wingTips[0].x<0&&u.wingTips[1].x>0);u.resetPose();assert.equal(u.pose.flap,0);
console.log(`PASS: real bird mesh (${triangles} triangles, ${meshes} draw calls), sweep/climb/turn poses, frame-rate stability, pause/reset, shape switching, stable collision references.`);

