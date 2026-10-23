/* Four flyable landmarks assembled from the existing Kenney CC0 models. */
(()=>{
 const T=THREE,UP=new T.Vector3(0,1,0);
 const sites=[
  {id:'castleland',name:'北境 · 古堡庭院',normal:new T.Vector3(-.459779,.576857,-.675159).normalize(),scale:1.12,heading:.25,pad:16},
  {id:'bridgeland',name:'河谷 · 五孔石桥',normal:new T.Vector3(.596599,.558571,-.576253).normalize(),scale:1.05,heading:-.55,pad:8},
  {id:'rockland',name:'南境 · 岩门峡谷',normal:new T.Vector3(-.498057,-.672286,-.547696).normalize(),scale:1.1,heading:.4,pad:14},
  {id:'marketland',name:'林野 · 拱廊集市',normal:new T.Vector3(.453644,-.357429,.816365).normalize(),scale:1.08,heading:-.6,pad:12}
 ];
 const plans=new Map();
 for(const site of sites){
  const structures=[];plans.set(site.id,structures);
  const structure=(x,z,angle=0)=>{const s={x,z,angle,parts:[],portal:null};structures.push(s);return s;};
  const part=(s,pack,file,p,size,kind='建筑')=>s.parts.push({url:`assets/kenney-${pack}/${file}.glb`,p,size,kind});
  function arch(x,z,angle=0,width=28,height=27,kind='石拱门'){
   const s=structure(x,z,angle);part(s,'castle','tower-square-arch',[0,0,0],[width,height,23],kind);part(s,'castle','tower-square-top',[0,height,0],[width,3,23],'拱顶步道');s.portal={center:[0,height*.28,0],halfLength:18,roof:[0,height*.85,0],name:kind};return s;
  }
  if(site.id==='castleland'){
   for(const x of [-38,38])for(const z of [-38,38]){const s=structure(x,z);part(s,'castle','tower-hexagon-base',[0,-2,0],[21,21,21],'城堡塔楼');part(s,'castle','tower-square-mid-windows',[0,25,0],[16,18,16],'城堡塔楼');part(s,'castle','tower-hexagon-roof',[0,43,0],[24,24,24],'城堡尖顶');}
   arch(0,38,0,30,31,'古堡南门');arch(0,-38,0,30,31,'古堡北门');arch(-38,0,Math.PI/2,30,31,'古堡西门');arch(38,0,Math.PI/2,30,31,'古堡东门');
  }else if(site.id==='bridgeland'){
   for(let i=-2;i<=2;i++)arch(i*23,0,0,24.73,29,'石桥第'+(i+3)+'孔');
  }else if(site.id==='rockland'){
   for(let i=0;i<3;i++){const s=structure(Math.sin(i*1.2)*18,38-i*38,(i-1)*.15);for(const side of [-1,1])part(s,'nature','rock_tallA',[side*17,-2,0],[10,29+i*3,16],'门侧岩柱');part(s,'nature','rock_largeA',[0,24+i*3,0],[52,14,19],'岩门横梁');s.portal={center:[0,13,0],halfLength:16,roof:[0,32+i*3,0],name:'峡谷岩门 '+(i+1)};}
   for(const side of [-1,1])for(let i=0;i<3;i++){const s=structure(side*(37+i*3),32-i*30);part(s,'nature','rock_tallA',[0,-2,0],[13,20+i*6,19],'峡谷石峰');}
  }else{
   for(const x of [-44,44])for(const z of [-23,18]){
    const s=structure(x,z,x>0?-Math.PI/2:Math.PI/2),w=17;
    part(s,'castle','tower-square-base',[0,-2,0],[w,2,w],'房屋石基');
    for(let floor=0;floor<2;floor++)for(let side=0;side<4;side++){
     const item={url:'assets/kenney-town/'+(floor===0&&side===0?'wall-door':'wall-window-shutters')+'.glb',p:[0,floor*11,0],size:[w,11,w],angle:side*Math.PI/2,kind:'集市房屋'};s.parts.push(item);
    }
    part(s,'town','roof-gable',[0,22,0],[w,w*.65,w],'集市屋顶');
   }
   for(const x of [-23,0,23])arch(x,49,0,24.73,29,'集市拱廊');
   for(const x of [-11,11]){const s=structure(x,-8);part(s,'town',x<0?'stall-red':'stall-green',[0,0,0],[6,6,6],'集市摊位');}
  }
 }
 async function build({R,group,groundRadius,registerCollider,materialPairs,collisionMaterial}){
  const urls=[...new Set([...plans.values()].flatMap(ss=>ss.flatMap(s=>s.parts.map(p=>p.url))))],loader=new PaperGLTF.GLTFLoader(),assets=new Map();
  await Promise.all(urls.map(async url=>{const response=await fetch(url);if(!response.ok)throw new Error('模型读取失败：'+url);const buffer=await response.arrayBuffer();assets.set(url,(await loader.parseAsync(buffer,url.slice(0,url.lastIndexOf('/')+1))).scene);}));
  const neighborhoods=[],portals=[],styleMeshes=[];let colliderCount=0,modelCount=0;
  function adapt(original){
   const m=new T.MeshLambertMaterial({color:original.color,map:original.map,vertexColors:original.vertexColors,side:T.DoubleSide,flatShading:true});
   m.color.lerp(new T.Color('#9eaa91'),.14);const soft=m.clone();soft.color.lerp(new T.Color('#a2a095'),.18);materialPairs.set(m,soft);return m;
  }
  const materials=new Map();
  for(const site of sites){
   const area=new T.Group();area.name=site.name;group.add(area);
   const q=new T.Quaternion().setFromUnitVectors(UP,site.normal).multiply(new T.Quaternion().setFromAxisAngle(UP,site.heading));
   const center=site.normal.clone().multiplyScalar(R+site.pad),areaFrame=new T.Matrix4().compose(center,q,new T.Vector3(1,1,1));
   const localPortals=[];
   for(const data of plans.get(site.id)){
    const p=new T.Vector3(data.x,0,data.z).applyMatrix4(areaFrame),n=p.clone().normalize(),frame=new T.Group();
    frame.position.copy(n).multiplyScalar(groundRadius(n)+(site.id==='bridgeland'?-.8:-.1));
    frame.quaternion.copy(new T.Quaternion().setFromUnitVectors(site.normal,n).multiply(q)).multiply(new T.Quaternion().setFromAxisAngle(UP,data.angle));area.add(frame);
    for(const item of data.parts){const holder=new T.Group(),model=assets.get(item.url).clone(true);holder.position.fromArray(item.p);holder.scale.fromArray(item.size);holder.rotation.y=item.angle||0;holder.add(model);frame.add(holder);modelCount++;
     model.traverse(mesh=>{if(!mesh.isMesh)return;const convert=m=>{if(!materials.has(m))materials.set(m,adapt(m));return materials.get(m);};mesh.material=Array.isArray(mesh.material)?mesh.material.map(convert):convert(mesh.material);mesh.userData.sourceMaterials=mesh.material;mesh.userData.kind=item.kind;styleMeshes.push(mesh);});
    }
    frame.updateMatrixWorld(true);
    if(data.portal){const d=data.portal,center=new T.Vector3(...d.center).applyMatrix4(frame.matrixWorld),forward=new T.Vector3(0,0,-1).transformDirection(frame.matrixWorld),up=new T.Vector3(0,1,0).transformDirection(frame.matrixWorld);const p={id:site.id,name:d.name,center,forward,up,halfLength:d.halfLength,roof:new T.Vector3(...d.roof).applyMatrix4(frame.matrixWorld)};localPortals.push(p);portals.push(p);}
   }
   area.updateMatrixWorld(true);area.traverse(mesh=>{if(!mesh.isMesh)return;if(!mesh.geometry.boundsTree)MeshBVHLib.computeBoundsTree.call(mesh.geometry,{maxLeafTris:12});const c=new T.Mesh(mesh.geometry,collisionMaterial);c.raycast=MeshBVHLib.acceleratedRaycast;c.matrixAutoUpdate=false;c.matrix.copy(mesh.matrixWorld);c.matrixWorld.copy(mesh.matrixWorld);c.userData={bounds:new T.Box3().setFromObject(mesh),kind:mesh.userData.kind};registerCollider(c);colliderCount++;});
   neighborhoods.push({frame:area,site,top:90,portals:localPortals});
  }
  function spawn(id,pose){const b=neighborhoods.find(b=>b.site.id===id);if(!b)return null;const portal=b.portals[sitePortalIndex(id)],p=portal.center.clone().addScaledVector(portal.forward,-42).addScaledVector(portal.up,6),up=p.clone().normalize(),f=portal.forward.clone().addScaledVector(up,-portal.forward.dot(up)).normalize();return {...pose(up,0),x:p.x,y:p.y,z:p.z,fx:f.x,fy:f.y,fz:f.z};}
  function sitePortalIndex(id){return id==='bridgeland'?2:id==='marketland'?1:0;}
  return {neighborhoods,portals,spawn,colliderCount,modelCount,uniqueModels:urls.length,setStyle(style){for(const mesh of styleMeshes){const m=mesh.userData.sourceMaterials;mesh.material=style==='soft'?(Array.isArray(m)?m.map(v=>materialPairs.get(v)):materialPairs.get(m)):m;}}};
 }
 globalThis.TokyoLandmarks={sites,plans,build};
})();

