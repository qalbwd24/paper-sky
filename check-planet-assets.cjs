// Decode actual GLBs with the same official loader. CPU geometry tests omit GPU texture uploads.
const fs=require('fs'),assert=require('node:assert/strict');global.THREE=require('./vendor/three.min.js');require('./vendor/BufferGeometryUtils.js');require('./vendor/GLTFLoader.js');
const files=['kenney-nature/tree_pineDefaultA.glb','kenney-nature/tree_oak.glb','kenney-nature/rock_largeA.glb','kenney-castle/tower-square-arch.glb','kenney-castle/tower-square-roof.glb'];
const loader=new PaperGLTF.GLTFLoader();loader.register(()=>({name:'CPU_TEST_TEXTURE',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
(async()=>{
 for(const file of files){
  const data=fs.readFileSync(__dirname+'/assets/'+file),array=data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength);
  const gltf=await new Promise((resolve,reject)=>loader.parse(array,'',resolve,reject));gltf.scene.updateMatrixWorld(true);let meshes=0;gltf.scene.traverse(o=>{if(o.isMesh){meshes++;assert(o.geometry.attributes.position.count>0);o.material.side=THREE.DoubleSide;}});assert(meshes>0);
  if(file.includes('arch')){
   const caster=new THREE.Raycaster(),paths=[];for(const axis of ['x','z'])for(const h of [.2,.4,.6,.85]){const a=new THREE.Vector3(0,h,0),d=new THREE.Vector3();a[axis]=-2;d[axis]=1;caster.set(a,d);caster.far=4;paths.push({axis,h,hit:caster.intersectObject(gltf.scene,true).length>0});}
   assert(paths.some(p=>p.h<.5&&!p.hit),'Arch must have a real opening');assert(paths.some(p=>p.hit),'Arch must retain solid stone');console.log('Arch rays:',JSON.stringify(paths));
  }
 }
 console.log('PASS: all 5 used CC0 GLBs decode, real arch openings remain flyable.');
})().catch(e=>{console.error(e);process.exitCode=1});
