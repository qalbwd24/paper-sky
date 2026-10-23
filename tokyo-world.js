/* Littlest Tokyo — Glen Fox, CC BY 4.0. Preserve source materials and animation. */
(()=>{
 const T=THREE;
 const options={
  id:'tokyo',radius:320,
  districts:[
   {id:'street',name:'街口 · 看招牌',x:0,z:120,pad:0,height:8,start:[0,120,40],heading:0,color:'#ae7058'},
   {id:'rooftop',name:'屋顶 · 看列车',x:0,z:0,pad:0,height:8,start:[0,100,100],heading:0,color:'#698c89'},
   {id:'waterfront',name:'侧街 · 绕飞',x:100,z:0,pad:0,height:8,start:[100,0,40],heading:1.5,color:'#698c89'},
   ...[...TokyoDistricts.sites.slice(1),...TokyoLandmarks.sites].map(s=>({id:s.id,name:s.name,x:0,z:0,pad:0,height:8,start:[0,100,100],heading:0,color:'#698c89'}))
  ],
  credit:'Littlest Tokyo · Glen Fox · CC BY 4.0 · 本地加载完成',
  overviewTitle:'俯瞰小世界',worldInfo:'半径 320 米 · 紧凑街区',
  flightProfile:{cruiseSpeed:18,cruiseMaxSpeed:32,boostSpeed:50,maxSpeed:65,slowSpeed:5,pitchDrag:10,turnRate:1.1,boostTurnRate:1.7},
  overview:{position:[710,860,980],target:[0,20,0],up:[0,1,0]},
  regionAt:CompactTokyo.regionAt,
  height:CompactTokyo.height,
  setupRendering({renderer,scene}){
   const pmrem=new T.PMREMGenerator(renderer),room=new PaperEnvironment.RoomEnvironment();
   scene.environment=pmrem.fromScene(room,.04).texture;room.dispose();pmrem.dispose();
   renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
  },
  async createScenery({group,R,registerCollider,groundRadius,stats,hemi,sun}){
   const draco=new PaperDraco.DRACOLoader();draco.setDecoderPath('vendor/draco/');draco.setWorkerLimit(2);
   const loader=new PaperGLTF.GLTFLoader();loader.setDRACOLoader(draco);
   let gltf;try{gltf=await loader.loadAsync('assets/littlest-tokyo/LittlestTokyo.glb');}finally{draco.dispose();}
   const city=gltf.scene;city.updateMatrixWorld(true);
   const box=new T.Box3().setFromObject(city),rawSize=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
   const scale=150/Math.max(rawSize.x,rawSize.z),root=new T.Group();root.name='小东京 · Glen Fox';
   root.scale.setScalar(scale);city.position.add(new T.Vector3(-center.x,-box.min.y,-center.z));root.add(city);root.position.y=R+12;group.add(root);root.updateMatrixWorld(true);
   const size=rawSize.clone().multiplyScalar(scale),materialPairs=new Map(),animatedNodes=new Set();
   const mixer=new T.AnimationMixer(city);
   // Constant exported tracks do not make an entire building dynamic.
   for(const clip of gltf.animations)for(const track of clip.tracks){
    const stride=track.getValueSize(),values=track.values;let changing=false;
    for(let i=stride;i<values.length;i++)if(Math.abs(values[i]-values[i%stride])>1e-5){changing=true;break;}
    if(changing){const name=T.PropertyBinding.parseTrackName(track.name).nodeName,node=T.PropertyBinding.findNode(city,name);if(node)animatedNodes.add(node);}
   }
   for(const clip of gltf.animations)mixer.clipAction(clip).play();
   const collisionMaterial=new T.MeshBasicMaterial({side:T.DoubleSide});let colliderCount=0,outlineCount=0,animatedCount=0;
   city.traverse(obj=>{
    if(!obj.isMesh)return;
    const materials=Array.isArray(obj.material)?obj.material:[obj.material];
    for(const original of materials)if(!materialPairs.has(original)){
     const soft=original.clone();
     if(!/outline/i.test(original.name)){
      if('roughness'in soft)soft.roughness=Math.max(.75,soft.roughness);
      if('metalness'in soft)soft.metalness*=.35;
      soft.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n float inkLuma=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=mix(vec3(inkLuma),diffuseColor.rgb,.78);');};
      soft.customProgramCacheKey=()=> 'tokyo-soft-palette-v1';
     }
     materialPairs.set(original,soft);
    }
    obj.userData.sourceMaterials=obj.material;
    if(materials.every(m=>/outline/i.test(m.name))){outlineCount++;return;}
    let dynamic=obj.isSkinnedMesh;for(let n=obj;n&&n!==root;n=n.parent)if(animatedNodes.has(n))dynamic=true;
    if(dynamic){animatedCount++;return;}
    // Cutout foliage, smoke and glass overlays are visual details, not solid shells.
    if(materials.every(m=>(m.transparent||m.alphaTest>0)&&!/glass/i.test(m.name)))return;
    const bounds=new T.Box3().setFromObject(obj),extent=bounds.getSize(new T.Vector3());
    if(Math.max(extent.x,extent.y,extent.z)<.6)return;
    if(!obj.geometry.boundsTree)MeshBVHLib.computeBoundsTree.call(obj.geometry,{maxLeafTris:12});
    const collider=new T.Mesh(obj.geometry,collisionMaterial);collider.raycast=MeshBVHLib.acceleratedRaycast;
    collider.matrixAutoUpdate=false;collider.matrix.copy(obj.matrixWorld);collider.matrixWorld.copy(obj.matrixWorld);
    collider.userData={bounds,kind:'街区建筑'};registerCollider(collider);colliderCount++;
   });
   const plinth=new T.Mesh(new T.BoxGeometry(size.x*1.035,22,size.z*1.035),new T.MeshLambertMaterial({color:'#aca58c'}));
   plinth.position.set(0,R+.9,0);plinth.name='街区地基';group.add(plinth);plinth.updateMatrixWorld(true);plinth.userData={bounds:new T.Box3().setFromObject(plinth),kind:'街道路面'};registerCollider(plinth);
   const sourceMaterialCount=materialPairs.size;
   const surroundings=await CompactTokyo.build({T,R,group,root,city,size,scale,animatedNodes,registerCollider,groundRadius,materialPairs,collisionMaterial,plinth});
   hemi.intensity=1.7;sun.intensity=2.2;
   Object.assign(stats,{models:1,modelTypes:1,districts:3,asset:'Littlest Tokyo',author:'Glen Fox',license:'CC BY 4.0',size:size.toArray(),scale,sourceMaterials:sourceMaterialCount,outlineMeshes:outlineCount,animatedMeshes: animatedCount,animationClips:gltf.animations.length,animationTime:0,colliders:colliderCount+1,style:'original'});
   Object.assign(stats,surroundings.stats);
   stats.colliders+=surroundings.stats.additionalColliders;
   const starts={street:[size.x*.58,size.y*.40,size.z*.68],rooftop:[-size.x*.38,size.y+13,size.z*.40],waterfront:[size.x*.76,size.y*.48,-size.z*.22]};
   function spawn(id,pose){const other=surroundings.spawn(id,pose);if(other)return other;const a=starts[id]||starts.street,p=new T.Vector3(a[0],R+12+a[1],a[2]),n=p.clone().normalize();const s=pose(n,0,Math.atan2(a[0],a[2]));Object.assign(s,{x:p.x,y:p.y,z:p.z});return s;}
   function setStyle(style){stats.style=style;surroundings.setStyle(style);city.traverse(obj=>{if(!obj.isMesh)return;const original=obj.userData.sourceMaterials;obj.material=style==='soft'?(Array.isArray(original)?original.map(m=>materialPairs.get(m)):materialPairs.get(original)):original;});}
   return {spawn,setStyle,drawMap:surroundings.drawMap,update(dt,position,overview){mixer.update(Math.min(dt,.05));stats.animationTime=mixer.time;surroundings.update(position,overview);}};
  }
 };
 globalThis.FlightSceneOptions=options;
})();

