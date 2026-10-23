/* Hand-arranged districts built from distinct CC0 asset kits. See assets/新增街区模型来源.md. */
(()=>{
 const T=THREE;
 const sites=[
  {id:'street',name:'小东京',normal:new T.Vector3(0,1,0),scale:1,heading:0},
  {id:'harbor',name:'帆船港湾',normal:new T.Vector3(1,.22,.2).normalize(),scale:.65,heading:.5},
  {id:'suburb',name:'花园住宅',normal:new T.Vector3(-.3,.3,1).normalize(),scale:.65,heading:2.2},
  {id:'cottage',name:'林间小屋',normal:new T.Vector3(-1,.05,-.1).normalize(),scale:.65,heading:-.8},
  {id:'industry',name:'风车工坊',normal:new T.Vector3(.15,-.1,-1).normalize(),scale:.65,heading:1.3},
  {id:'downtown',name:'高楼商业街',normal:new T.Vector3(.1,-1,.2).normalize(),scale:.65,heading:2.8}
 ];
 const layouts={},A=(pack,file,x,z,width,angle=0,y=0)=>({url:`assets/${pack}/${file}`,x,z,width,angle,y});
 const K=(pack,name,x,z,width,angle=0,y=0)=>A('kenney-'+pack,name+'.glb',x,z,width,angle,y);
 const H=(name,x,z,width,angle=0)=>A('tiny-treats-house',name+'.gltf',x,z,width,angle);
 layouts.harbor=[K('pirate','ship-large',13,-8,40,.2,-16),K('pirate','boat-row-large',-10,12,12,.6,-13),K('pirate','structure-platform-dock',0,28,48,0,-13),K('pirate','tower-complete-large',-37,-7,20,0,-4),K('pirate','palm-detailed-bend',-37,24,13,.6,-4),K('pirate','crate',-14,29,5,0,-7),K('pirate','barrel',-8,29,3.5,0,-7)];
 layouts.suburb=[K('suburban','building-type-a',-26,-24,25,.15),K('suburban','building-type-c',23,-25,23,-.3),K('suburban','building-type-g',-25,23,24,Math.PI/2),K('suburban','building-type-m',23,24,23,Math.PI),K('suburban','building-type-t',0,-31,18,0),K('suburban','tree-large',-40,0,12),K('suburban','tree-small',37,0,10),K('town','fountain-round',0,5,10)];
 layouts.cottage=[H('house',0,-9,41),H('tree_large',-32,-22,17),H('tree_large',30,-27,20,1.5),H('mailbox',22,18,5),H('bench_A',-23,20,10,.3),H('fence_straight_long',-22,32,25),H('fence_straight_long',22,32,25),H('fence_straight_long',-35,8,27,Math.PI/2),H('fence_straight_long',35,0,27,Math.PI/2)];
 layouts.industry=[K('industrial','building-c',-24,-22,30),K('industrial','building-h',21,-25,28,Math.PI/2),K('industrial','windmill',-27,24,24,.3),K('industrial','water-tower',27,19,16),K('industrial','solar-panel-landscape-group',0,21,22),K('industrial','shipping-container-a',-1,-18,15,Math.PI/2),K('industrial','chimney-large',-38,-22,7)];
 layouts.downtown=[K('commercial','building-skyscraper-a',-25,-25,22),K('commercial','building-skyscraper-c',24,-25,22,Math.PI),K('commercial','building-c',-25,22,25,Math.PI/2),K('commercial','building-j',23,23,25,-Math.PI/2),K('commercial','building-m',0,-29,18),K('commercial','detail-parasol-a',-8,16,7),K('commercial','detail-parasol-b',8,16,7),K('town','lantern',-10,-1,3),K('town','lantern',10,-1,3)];
 async function build({R,group,registerCollider,collisionMaterial,materialPairs,plinth}){
  const loader=new PaperGLTF.GLTFLoader(),urls=[...new Set(Object.values(layouts).flat().map(a=>a.url))],loaded=new Map();
  await Promise.all(urls.map(async url=>{const gltf=await loader.loadAsync(url);gltf.scene.updateMatrixWorld(true);const box=new T.Box3().setFromObject(gltf.scene);loaded.set(url,{gltf,box,size:box.getSize(new T.Vector3()),center:box.getCenter(new T.Vector3())});}));
  const neighborhoods=[],styleMeshes=[];let additionalColliders=0,modelCount=0;
  function solid(mesh,kind){if(!mesh.geometry.boundsTree)MeshBVHLib.computeBoundsTree.call(mesh.geometry,{maxLeafTris:12});const c=new T.Mesh(mesh.geometry,collisionMaterial);c.raycast=MeshBVHLib.acceleratedRaycast;c.matrixAutoUpdate=false;c.matrix.copy(mesh.matrixWorld);c.matrixWorld.copy(mesh.matrixWorld);c.userData={bounds:new T.Box3().setFromObject(mesh),kind};registerCollider(c);additionalColliders++;}
  function stylePair(original){if(materialPairs.has(original))return;const soft=original.clone();soft.roughness=Math.max(.75,soft.roughness||0);soft.metalness=0;soft.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n float luma=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=mix(vec3(luma),diffuseColor.rgb,.78);');};soft.customProgramCacheKey=()=> 'district-soft-v1';materialPairs.set(original,soft);}
  for(const site of sites.slice(1)){
   const frame=new T.Group();frame.name=site.name;frame.position.copy(site.normal).multiplyScalar(R+12);frame.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),site.normal);frame.rotateY(site.heading);group.add(frame);
   let top=20;const assetNames=[];
   for(const item of layouts[site.id]){
    const {gltf,box,size,center}=loaded.get(item.url),scale=item.width/Math.max(size.x,size.z),holder=new T.Group(),model=gltf.scene.clone(true);
    holder.position.set(item.x,item.y,item.z);holder.rotation.y=item.angle;holder.scale.setScalar(scale);model.position.add(new T.Vector3(-center.x,-box.min.y,-center.z));holder.add(model);frame.add(holder);holder.name=item.url.split('/').pop();assetNames.push(item.url);modelCount++;top=Math.max(top,12+item.y+size.y*scale);
    model.traverse(mesh=>{if(!mesh.isMesh)return;const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];materials.forEach(stylePair);mesh.userData.sourceMaterials=mesh.material;styleMeshes.push(mesh);});
   }
   if(site.id!=='harbor'){
    const base=new T.Mesh(new T.BoxGeometry(94,12,94),plinth.material);base.position.y=-6.1;base.name='街道路面';frame.add(base);
    // Narrow paths connect the models while leaving garden and flight space between them.
    const road=new T.Mesh(new T.BoxGeometry(site.id==='cottage'?5:9,.12,88),new T.MeshLambertMaterial({color:site.id==='cottage'?'#c4b99c':'#8b9390'}));road.position.set(0,.02,0);frame.add(road);
   }
   frame.updateMatrixWorld(true);frame.traverse(mesh=>{if(mesh.isMesh)solid(mesh,'街区建筑');});
   neighborhoods.push({frame,site,top,assets:assetNames});
  }
  function spawn(id,pose){const b=neighborhoods.find(b=>b.site.id===id);if(!b)return null;const p=new T.Vector3(0,Math.max(29,b.top*.48),70).applyMatrix4(b.frame.matrixWorld),up=p.clone().normalize(),forward=new T.Vector3(0,0,-1).transformDirection(b.frame.matrixWorld);forward.addScaledVector(up,-forward.dot(up)).normalize();return {...pose(up,0,0),x:p.x,y:p.y,z:p.z,fx:forward.x,fy:forward.y,fz:forward.z};}
  return {neighborhoods,spawn,additionalColliders,modelCount,uniqueModels:urls.length,assetManifest:neighborhoods.map(b=>({id:b.site.id,name:b.site.name,assets:b.assets})),
   setStyle(style){for(const mesh of styleMeshes){const m=mesh.userData.sourceMaterials;mesh.material=style==='soft'?(Array.isArray(m)?m.map(v=>materialPairs.get(v)):materialPairs.get(m)):m;}}
  };
 }
 globalThis.TokyoDistricts={sites,layouts,build};
})();

