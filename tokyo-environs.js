/* Compact globe. Tokyo meshes: Glen Fox / CC BY 4.0; nature: Kenney / CC0. */
(()=>{
 const T=THREE,UP=new T.Vector3(0,1,0),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const sites=[...TokyoDistricts.sites,...TokyoLandmarks.sites];
 const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
 function height(n,R){
  const channel=Math.sin(n.x*5.5+n.y*1.7)+.35*Math.sin(n.z*8);
  let h=19+9*Math.sin(n.x*9+n.z*4)*Math.cos(n.y*7-n.z*5)-42*Math.exp(-channel*channel/.017);
  for(const s of sites){const d=Math.acos(clamp(dot(n,s.normal),-1,1))*R;let t=clamp((d-75*s.scale)/(40*s.scale),0,1);t=t*t*(3-2*t);const pad=s.id==='harbor'?8-18*Math.exp(-Math.pow(d/34,4)):s.id==='bridgeland'?8-16*Math.exp(-Math.pow(d/68,4)):(s.pad??8);h=pad*(1-t)+h*t;}
  return h;
 }
 function regionAt(n){let best=sites[0],distance=-Infinity;for(const s of sites){const d=dot(n,s.normal);if(d>distance){best=s;distance=d;}}return best.name;}
 async function build({R,group,root,city,size,scale,animatedNodes,registerCollider,groundRadius,materialPairs,collisionMaterial,plinth}){
  const districts=await TokyoDistricts.build({R,group,registerCollider,collisionMaterial,materialPairs,plinth});
  const landmarks=await TokyoLandmarks.build({R,group,groundRadius,registerCollider,materialPairs,collisionMaterial});
  const neighborhoods=[...districts.neighborhoods,...landmarks.neighborhoods];let additionalColliders=districts.additionalColliders+landmarks.colliderCount;
  const loader=new PaperGLTF.GLTFLoader(),assets=await Promise.all(['tree_pineRoundA','tree_detailed','rock_largeA'].map(name=>loader.loadAsync(`assets/kenney-nature/${name}.glb`)));
  const placements=[[],[],[]];let natureCount=0;
  for(let i=0;i<580;i++){
   const y=1-2*(i+.5)/580,a=i*2.3999632297+.11*Math.sin(i*17.3),r=Math.sqrt(1-y*y),n=new T.Vector3(Math.cos(a)*r,y,Math.sin(a)*r);
   if(height(n,R)<5||sites.some(s=>Math.acos(clamp(n.dot(s.normal),-1,1))*R<100*s.scale+14))continue;
   const kind=i%6===0?2:i%3===0?1:0,s=kind===2?10+i%4*3:18+i%7*2.2;
   const q=new T.Quaternion().setFromUnitVectors(UP,n).multiply(new T.Quaternion().setFromAxisAngle(UP,a));
   placements[kind].push(new T.Matrix4().compose(n.clone().multiplyScalar(groundRadius(n)-.4),q,new T.Vector3(s,s,s)));natureCount++;
  }
  assets.forEach((asset,index)=>{asset.scene.updateMatrixWorld(true);asset.scene.traverse(source=>{
   if(!source.isMesh||!placements[index].length)return;
   // Kenney exports these stylized trees as metallic turquoise; harmonize with Tokyo's foliage.
   function natureMaterial(original){const material=original.clone();material.metalness=0;material.roughness=1;const name=original.name.toLowerCase();material.color.set(name.includes('leaf')?(index===0?'#587965':'#78905c'):name.includes('grass')?'#7c8e67':name.includes('wood')?'#8b7256':'#9b9483');return material;}
   const materials=Array.isArray(source.material)?source.material.map(natureMaterial):natureMaterial(source.material);
   const mesh=new T.InstancedMesh(source.geometry,materials,placements[index].length);mesh.name=index===2?'岸边岩石':'坡地树林';group.add(mesh);
   if(!source.geometry.boundsTree)MeshBVHLib.computeBoundsTree.call(source.geometry,{maxLeafTris:12});
   placements[index].forEach((matrix,i)=>{const m=matrix.clone().multiply(source.matrixWorld);mesh.setMatrixAt(i,m);const c=new T.Mesh(source.geometry,collisionMaterial);c.raycast=MeshBVHLib.acceleratedRaycast;c.matrixAutoUpdate=false;c.matrix.copy(m);c.matrixWorld.copy(m);if(!source.geometry.boundingBox)source.geometry.computeBoundingBox();c.userData={bounds:source.geometry.boundingBox.clone().applyMatrix4(m),kind:index===2?'岩石':'树木'};registerCollider(c);additionalColliders++;});
   mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();
  });});
  const map=document.createElement('canvas');map.width=180;map.height=156;const mc=map.getContext('2d'),pixels=mc.createImageData(180,156);
  for(let y=0;y<156;y++)for(let x=0;x<180;x++){const lat=(.5-y/156)*Math.PI,lon=(x/180-.5)*Math.PI*2,n={x:Math.sin(lon)*Math.cos(lat),y:Math.sin(lat),z:Math.cos(lon)*Math.cos(lat)},h=height(n,R),rgb=h<0?[131,174,177]:h<10?[201,195,159]:[153,172,138],k=(y*180+x)*4;pixels.data.set([...rgb,255],k);}mc.putImageData(pixels,0,0);
  function mapPoint(n){return [90+Math.atan2(n.x,n.z)/Math.PI*90,78-Math.asin(clamp(n.y,-1,1))/Math.PI*156];}
  return {
   stats:{models:1+districts.modelCount+landmarks.modelCount+natureCount,modelTypes:districts.uniqueModels+landmarks.uniqueModels+4,districts:sites.length,radius:R,natureInstances:natureCount,additionalColliders,sharedCityCopies:0,uniqueDistrictModels:districts.uniqueModels,districtAssets:districts.assetManifest,landmarkModels:landmarks.modelCount,landmarkRegions:TokyoLandmarks.sites.map(s=>({id:s.id,name:s.name})),passages:landmarks.portals},
   spawn:(id,pose)=>landmarks.spawn(id,pose)||districts.spawn(id,pose),setStyle(style){districts.setStyle(style);landmarks.setStyle(style);},
   update(position,overview){const n=position.clone().normalize(),horizon=Math.acos(clamp(R/position.length(),0,1));for(const b of neighborhoods){const angle=horizon+Math.acos(R/(R+b.top))+.25;b.frame.visible=overview||n.dot(b.site.normal)>Math.cos(Math.min(Math.PI,angle));}},
   drawMap(ctx,s){ctx.fillStyle='#e5e7dc';ctx.fillRect(0,0,180,180);ctx.drawImage(map,0,0);for(const site of sites){const p=mapPoint(site.normal);ctx.fillStyle=site.pad===undefined?'#776254':'#526e81';ctx.fillRect(p[0]-3,clamp(p[1]-3,1,149),6,6);if(site.pad!==undefined){ctx.strokeStyle='#f0ebd5';ctx.strokeRect(p[0]-1,clamp(p[1]-1,3,151),2,4);}}const p=mapPoint(new T.Vector3(s.x,s.y,s.z).normalize());ctx.fillStyle='#b34431';ctx.beginPath();ctx.arc(p[0],clamp(p[1],4,152),4,0,Math.PI*2);ctx.fill();ctx.fillStyle='#43584f';ctx.font='10px system-ui';ctx.fillText('蓝色：古堡 / 石桥 / 岩门 / 集市',5,172);}
  };
 }
 globalThis.CompactTokyo={height,regionAt,build};
})();

