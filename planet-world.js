/* A complete 2 km sphere; quiet ink colours, local GLB scenery, no screen-space shadows. */
function buildInkPlanet(options=globalThis.FlightSceneOptions||{}){
 const T=THREE,R=options.radius||2000,NX=256,NY=128,group=new T.Group(),tiles=[],colliders=[],stats={radius:R,models:0,ready:false};
 const districts=options.districts||(typeof PlanetDistricts!=='undefined'?PlanetDistricts:require('./planet-scenery.js').PlanetDistricts);
 let sceneryController=null;
 const centers=[[0,1,0],[.85,.05,.52],[-.63,-.66,-.4],[.15,-.9,.4]].map(a=>new T.Vector3(...a).normalize());
 function height(n){
  if(options.height)return options.height(n,R);
  let land=-28;
  for(let i=1;i<centers.length;i++){
   const d=2*(1-n.dot(centers[i])),coast=Math.exp(-d/(i? .20:.23));
   land+=coast*(105+Math.pow(Math.abs(Math.sin(n.x*21+i)*Math.cos(n.z*18-i)+.25*Math.sin(n.y*25)),2)*125);
  }
  if(n.y>.1){
   const x=n.x/n.y*R,z=n.z/n.y*R,coast=Math.exp(-(x*x+z*z)/950000);
   land+=coast*(64+14*Math.sin(x/170)*Math.sin(z/125));
   land+=290*Math.exp(-((x+490+65*Math.sin(z/200))**2/18000+z*z/620000));
   land+=225*Math.exp(-((x-660)**2/38000+(z+20)**2/450000));
   land+=185*Math.exp(-((z+690)**2/24000+x*x/450000));
   land-=112*Math.exp(-((x+25)**2/48000+(z-180)**2/122500));
   for(const district of districts){const distance=Math.hypot(x-district.x,z-district.z),t=T.MathUtils.smoothstep(distance,district.pad*.7,district.pad*1.35);land=land*t+district.height*(1-t);}
  }
  return land;
 }
 const verts=new Float32Array((NX+1)*(NY+1)*3),point=new T.Vector3();
 for(let y=0;y<=NY;y++)for(let x=0;x<=NX;x++){
  const phi=x/NX*Math.PI*2,theta=y/NY*Math.PI;point.set(-Math.cos(phi)*Math.sin(theta),Math.cos(theta),Math.sin(phi)*Math.sin(theta));point.multiplyScalar(R+height(point));point.toArray(verts,(y*(NX+1)+x)*3);
 }
 let pathMap=null;const terrainMat=new T.MeshLambertMaterial({vertexColors:true,flatShading:true});
 // Fixed world-space pigment mottling: no animated random grain or expensive post pass.
 terrainMat.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 inkPoint;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n inkPoint=position;');
  shader.uniforms.inkPaths={value:pathMap};shader.uniforms.roadColor={value:new T.Color('#c9b88e')};
  shader.fragmentShader='varying vec3 inkPoint;\n uniform sampler2D inkPaths; uniform vec3 roadColor;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float wash=sin(inkPoint.x*.12+sin(inkPoint.z*.067))*sin(inkPoint.y*.16+inkPoint.z*.13); diffuseColor.rgb*=.95+.045*wash;
   if(inkPoint.y>1000.0){vec2 pathUV=vec2(inkPoint.x,inkPoint.z)/inkPoint.y*2000.0/2400.0+.5;vec2 masks=texture2D(inkPaths,vec2(pathUV.x,1.0-pathUV.y)).rg;diffuseColor.rgb=mix(diffuseColor.rgb,roadColor,masks.r*.92)*(1.0-masks.g*.22);}
  `);
 };
 const color=new T.Color(),a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),d=new T.Vector3();
 function get(x,y,v){return v.fromArray(verts,(y*(NX+1)+x)*3);}
 for(let ty=0;ty<NY;ty+=16)for(let tx=0;tx<NX;tx+=16){
  const positions=[],colors=[];
  function add(v){positions.push(v.x,v.y,v.z);const h=v.length()-R,t=T.MathUtils.clamp((h-20)/210,0,1);color.set('#9cab83').lerp(new T.Color('#687d77'),t);if(h<10)color.set('#d8c9a4');const nx=v.x/Math.max(.1,v.y)*R,nz=v.z/Math.max(.1,v.y)*R;if(v.y>0&&Math.hypot(nx-190,nz-410)<165)color.lerp(new T.Color('#d0be98'),.75);if(v.y>0&&Math.hypot(nx+225,nz+340)<180)color.lerp(new T.Color('#ac9d89'),.6);colors.push(color.r,color.g,color.b);}
  for(let y=ty;y<ty+16;y++)for(let x=tx;x<tx+16;x++){
   get(x,y,a);get(x+1,y,b);get(x,y+1,c);get(x+1,y+1,d);
   if(y>0){add(a);add(c);add(b);}if(y<NY-1){add(b);add(c);add(d);}
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();g.computeBoundingSphere();const mesh=new T.Mesh(g,terrainMat);mesh.name='湖山球面';group.add(mesh);tiles.push(mesh);
 }
 const water=new T.Mesh(new T.SphereGeometry(R,NX,NY),new T.MeshBasicMaterial({color:'#aac2bb'}));water.name='静水';group.add(water);
 const skyUp={value:new T.Vector3(0,1,0)},observer={value:new T.Vector3(0,R,0)};
 const sky=new T.Mesh(new T.SphereGeometry(12000,24,12),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{skyUp,zenith:{value:new T.Color('#bed5d1')},horizon:{value:new T.Color('#f0ead9')}},vertexShader:'varying vec3 skyRay; void main(){skyRay=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec3 skyRay;uniform vec3 skyUp;uniform vec3 zenith;uniform vec3 horizon;void main(){float h=dot(normalize(skyRay),skyUp);gl_FragColor=vec4(mix(horizon,zenith,smoothstep(-.04,.8,h)),1.0);\n#include <colorspace_fragment>\n}'}));sky.renderOrder=-100;sky.frustumCulled=false;group.add(sky);
 water.material.onBeforeCompile=shader=>{shader.uniforms.inkObserver=observer;shader.vertexShader='varying vec3 waterPoint;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n waterPoint=position;');shader.fragmentShader='varying vec3 waterPoint; uniform vec3 inkObserver;\n'+shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n float grazing=1.0-clamp(dot(normalize(waterPoint),normalize(inkObserver-waterPoint)),0.0,1.0);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.77,.81,.71),grazing*grazing*.27);');};
 const hemi=new T.HemisphereLight('#f4f4e8','#74837d',1.3),sun=new T.DirectionalLight('#faf8ec',1.25);group.add(hemi,sun);sun.target.position.set(0,0,0);group.add(sun.target);
 const ray=new T.Ray(),hit=new T.Vector3(),zero=new T.Vector3();
 function groundRadius(n){
  const theta=Math.acos(T.MathUtils.clamp(n.y,-1,1));let phi=Math.atan2(n.z,-n.x);if(phi<0)phi+=Math.PI*2;
  const x=Math.min(NX-1,Math.floor(phi/(Math.PI*2)*NX)),y=Math.min(NY-1,Math.floor(theta/Math.PI*NY));
  get(x,y,a);get(x+1,y,b);get(x,y+1,c);get(x+1,y+1,d);ray.set(zero,n);
  const land=(ray.intersectTriangle(a,c,b,false,hit)||ray.intersectTriangle(b,c,d,false,hit))?hit.length():R+height(n);
  const positions=water.geometry.attributes.position;
  a.fromBufferAttribute(positions,y*(NX+1)+x);b.fromBufferAttribute(positions,y*(NX+1)+x+1);c.fromBufferAttribute(positions,(y+1)*(NX+1)+x);d.fromBufferAttribute(positions,(y+1)*(NX+1)+x+1);
  const sea=(ray.intersectTriangle(a,c,b,false,hit)||ray.intersectTriangle(b,c,d,false,hit))?hit.length():R;
  return Math.max(land,sea);
 }
 function clearance(p){const n=p.clone().normalize();return p.length()-groundRadius(n);}
 const raycaster=new T.Raycaster(),boxHit=new T.Vector3(),collisionGrid=new Map();let rayToken=0;
 raycaster.firstHitOnly=true;
 function registerCollider(obj){colliders.push(obj);const b=obj.userData.bounds;for(let x=Math.floor(b.min.x/100);x<=Math.floor(b.max.x/100);x++)for(let y=Math.floor(b.min.y/100);y<=Math.floor(b.max.y/100);y++)for(let z=Math.floor(b.min.z/100);z<=Math.floor(b.max.z/100);z++){const key=x+','+y+','+z;if(!collisionGrid.has(key))collisionGrid.set(key,[]);collisionGrid.get(key).push(obj);}}
 function cast(origin,dir,length){
  let best=null;ray.set(origin,dir);rayToken++;const end=origin.clone().addScaledVector(dir,length),candidates=[];
  for(let x=Math.floor(Math.min(origin.x,end.x)/100);x<=Math.floor(Math.max(origin.x,end.x)/100);x++)for(let y=Math.floor(Math.min(origin.y,end.y)/100);y<=Math.floor(Math.max(origin.y,end.y)/100);y++)for(let z=Math.floor(Math.min(origin.z,end.z)/100);z<=Math.floor(Math.max(origin.z,end.z)/100);z++)for(const obj of collisionGrid.get(x+','+y+','+z)||[])if(obj.rayToken!==rayToken){obj.rayToken=rayToken;candidates.push(obj);}
  for(const obj of candidates){
   // An origin inside a large mesh's bounds still needs triangle testing.
   // intersectBox returns the far exit in that case, not the nearby surface.
   if(!obj.userData.bounds.containsPoint(origin)&&(!ray.intersectBox(obj.userData.bounds,boxHit)||boxHit.distanceTo(origin)>length+.001))continue;
   raycaster.set(origin,dir);raycaster.far=length+.001;const h=raycaster.intersectObject(obj,false)[0];
   if(h&&(!best||h.distance<best.distance))best={distance:h.distance,fraction:h.distance/length,normal:h.face.normal.clone().transformDirection(obj.matrixWorld),kind:obj.userData.kind};
  }return best;
 }
 function pose(n,h=0,heading=0){
  const up=n.clone().normalize(),pos=up.clone().multiplyScalar(groundRadius(up)+h),f=new T.Vector3(0,0,-1).addScaledVector(up,up.z).normalize();
  if(f.lengthSq()<.1)f.crossVectors(up,new T.Vector3(1,0,0)).normalize();f.applyAxisAngle(up,heading);
  return {x:pos.x,y:pos.y,z:pos.z,fx:f.x,fy:f.y,fz:f.z,yaw:0,pitch:0,bank:0,speed:0,distance:0,acceleration:0,climbInput:0,boostControl:0};
 }
 function spawn(id=districts[0].id){if(sceneryController?.spawn)return sceneryController.spawn(id,pose);const d=districts.find(d=>d.id===id)||districts[0];return pose(new T.Vector3(d.start[0]/R,1,d.start[1]/R).normalize(),d.start[2],d.heading);}
 const makePlan=typeof createPlanetSceneryPlan!=='undefined'?createPlanetSceneryPlan:require('./planet-scenery.js').createPlanetSceneryPlan;
 const plan=options.createScenery?{items:[],roads:[],landmarks:[],normal:(x,z)=>new T.Vector3(x/R,1,z/R).normalize()}:makePlan(groundRadius,R),anchors=plan.items.map(item=>({n:new T.Vector3().setFromMatrixPosition(item.transform).normalize(),kind:item.kind}));
 // Paint paths into the terrain itself, so they cannot float or clip against hillside triangles.
 if(typeof document!=='undefined'){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;const ctx=canvas.getContext('2d');ctx.fillStyle='#000';ctx.fillRect(0,0,1024,1024);ctx.globalCompositeOperation='lighten';
  for(const item of plan.items){const p=new T.Vector3().setFromMatrixPosition(item.transform);if(p.y<1000||clearance(p)>5)continue;const x=(p.x/p.y*R/2400+.5)*1024,z=(p.z/p.y*R/2400+.5)*1024,e=item.transform.elements,size=Math.max(1,Math.hypot(e[0],e[1],e[2])*.48)*1024/2400,g=ctx.createRadialGradient(x,z,0,x,z,size);g.addColorStop(0,'#00e000');g.addColorStop(1,'#000000');ctx.fillStyle=g;ctx.fillRect(x-size,z-size,size*2,size*2);}
  ctx.strokeStyle='#ff0000';ctx.lineCap=ctx.lineJoin='round';
  for(const road of plan.roads){const curve=new T.CatmullRomCurve3(road.points.map(p=>new T.Vector3(p[0],0,p[1])));ctx.lineWidth=road.width/2400*1024;ctx.beginPath();for(const p of curve.getPoints(240))ctx.lineTo((p.x/2400+.5)*1024,(p.z/2400+.5)*1024);ctx.stroke();}pathMap=new T.CanvasTexture(canvas);pathMap.anisotropy=4;
 }
 async function scenery(){
  if(options.createScenery){sceneryController=await options.createScenery({T,R,group,registerCollider,groundRadius,stats,hemi,sun});stats.ready=true;group.updateMatrixWorld(true);return;}
  const loader=new PaperGLTF.GLTFLoader(),byFile=new Map(),lineBuckets=new Map(),edgeCache=new Map();
  for(const item of plan.items){if(!byFile.has(item.file))byFile.set(item.file,[]);byFile.get(item.file).push(item);}
  const styleMaterial=(source,tint)=>{
   const m=new T.MeshLambertMaterial({map:source.map,color:source.color,vertexColors:source.vertexColors,side:T.DoubleSide,flatShading:true,transparent:source.transparent,opacity:source.opacity,alphaTest:source.alphaTest});
   if(tint)m.color.lerp(new T.Color(tint),.5);
   m.onBeforeCompile=shader=>{shader.uniforms.pigmentSaturation={value:tint?.12:.65};shader.fragmentShader='uniform float pigmentSaturation;\n'+shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n float pigment=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722)); diffuseColor.rgb=mix(vec3(pigment),diffuseColor.rgb,pigmentSaturation)*vec3(.98,1.0,.96);');};m.customProgramCacheKey=()=> 'soft-pigment-2';return m;
  };
  await Promise.all([...byFile].map(async([file,items])=>{
   const gltf=await loader.loadAsync('assets/'+file);gltf.scene.updateMatrixWorld(true);
   gltf.scene.traverse(obj=>{if(!obj.isMesh)return;
    const buckets=new Map();for(const item of items){const matrix=item.transform.clone().multiply(obj.matrixWorld),pos=new T.Vector3().setFromMatrixPosition(matrix),key=Math.floor(pos.x/300)+','+Math.floor(pos.z/300)+','+(item.tint||'');if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push({matrix,item,pos});}
    for(const values of buckets.values()){
     const original=Array.isArray(obj.material)?obj.material:[obj.material],materials=original.map(m=>styleMaterial(m,values[0].item.tint));const material=Array.isArray(obj.material)?materials:materials[0];
     const mesh=new T.InstancedMesh(obj.geometry,material,values.length);values.forEach((v,i)=>mesh.setMatrixAt(i,v.matrix));mesh.computeBoundingSphere();mesh.name='Kenney '+values[0].item.kind;group.add(mesh);
     for(const {matrix,item,pos} of values){
      const collider=new T.Mesh(obj.geometry,material);collider.matrixAutoUpdate=false;collider.matrix.copy(matrix);collider.matrixWorld.copy(matrix);obj.geometry.computeBoundingBox();collider.userData={bounds:obj.geometry.boundingBox.clone().applyMatrix4(matrix),kind:item.kind};registerCollider(collider);
      if(!['树林','松林','秋林','岩石'].includes(item.kind)){
       if(!edgeCache.has(obj.geometry.uuid))edgeCache.set(obj.geometry.uuid,new T.EdgesGeometry(obj.geometry,45));const edges=edgeCache.get(obj.geometry.uuid).attributes.position,key=Math.floor(pos.x/400)+','+Math.floor(pos.z/400);if(!lineBuckets.has(key))lineBuckets.set(key,[]);const out=lineBuckets.get(key),point=new T.Vector3();for(let i=0;i<edges.count;i++){point.fromBufferAttribute(edges,i).applyMatrix4(matrix);out.push(point.x,point.y,point.z);}
      }
     }
    }
   });
  }));
  const lineMat=new T.LineBasicMaterial({color:'#344a43',transparent:true,opacity:.22,depthWrite:false});for(const vertices of lineBuckets.values()){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));group.add(new T.LineSegments(g,lineMat));}for(const edges of edgeCache.values())edges.dispose();
  stats.models=plan.items.length;stats.modelTypes=byFile.size;stats.districts=districts.length;stats.ready=true;group.updateMatrixWorld(true);
 }
 const ready=typeof document==='undefined'?Promise.resolve():scenery();
 function update(position,overview=false,dt=0){
  sceneryController?.update(dt,position,overview);
  sky.position.copy(overview?new T.Vector3():position);skyUp.value.copy(overview?new T.Vector3(0,1,0):position.clone().normalize());observer.value.copy(position);
  const n=position.clone().normalize();hemi.position.copy(n);sun.position.copy(n).multiplyScalar(R+500).add(new T.Vector3(900,200,600));if(overview)sun.position.set(3000,4500,2200);
  const horizon=Math.acos(Math.min(1,R/position.length()))+Math.acos(R/(R+500));
  for(const tile of tiles){const bounds=tile.geometry.boundingSphere,margin=Math.asin(Math.min(1,bounds.radius/Math.max(R,bounds.center.length())));tile.visible=overview||bounds.center.dot(n)/bounds.center.length()>Math.cos(Math.min(Math.PI,horizon+margin+.03));}
 }
 function drawMap(ctx,s){ctx.fillStyle='#eae8db';ctx.fillRect(0,0,180,180);ctx.fillStyle='#abc3b9';ctx.beginPath();ctx.arc(90,87,68,0,Math.PI*2);ctx.fill();ctx.fillStyle='#61776a';for(const p of anchors){ctx.fillRect(90+p.n.x*160,87+p.n.z*160,2,2);}ctx.strokeStyle='#718b7e';ctx.strokeRect(13,10,154,154);const n=new T.Vector3(s.x,s.y,s.z).normalize();ctx.fillStyle='#9a4d3c';ctx.beginPath();ctx.arc(90+n.x*160,87+n.z*160,4,0,Math.PI*2);ctx.fill();ctx.font='10px system-ui';ctx.fillStyle='#465a50';ctx.fillText(n.y>.7?'湖山岛 / 北半球':'正在环游星球',14,174);}
 function regionAt(position){if(position.y<800)return position.y<0?'南半球 · 远海群山':'远海群山';const x=position.x/position.y*R,z=position.z/position.y*R;let nearest=null,distance=Infinity;for(const d of districts){const gap=Math.hypot(x-d.x,z-d.z);if(gap<distance){nearest=d;distance=gap;}}return distance<270?nearest.name:'湖山岛 · 山间漫游';}
 const plainMap=drawMap;function districtMap(ctx,s){if(sceneryController?.drawMap)return sceneryController.drawMap(ctx,s);plainMap(ctx,s);ctx.font='9px system-ui';for(const d of districts){const n=plan.normal(d.x,d.z),x=90+n.x*160,z=87+n.z*160;ctx.fillStyle=d.color;ctx.fillRect(x-2,z-2,4,4);ctx.fillStyle='#374d42';ctx.fillText(d.name,x+4,z+3);}}
 return {group,stats,ready,spawn,pose,groundRadius,clearance,cast,update,drawMap:districtMap,height,tiles,water,colliders,anchors,plan,districts,regionAt:options.regionAt||regionAt,radius:R,overview:options.overview,setStyle:style=>sceneryController?.setStyle(style)};
}
if(typeof module!=='undefined')module.exports={buildInkPlanet};
