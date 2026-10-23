/* Five valley-scale worlds. Metres throughout; no vertical lift or forced steering. */
const Labyrinth = (()=>{
  const themes=[
    {name:'赭砂遗迹',sky:0xd6bea0,ground:0xb99472,wall:0xcda67c,dark:0x846756,accent:0x579b97,ink:0xead3a9},
    {name:'墨山回廊',sky:0xdadbd5,ground:0xa9b0a8,wall:0xe0dfd5,dark:0x404c4b,accent:0xa54f46,ink:0x75827a},
    {name:'蓝图机城',sky:0x0c213c,ground:0x152e48,wall:0x255774,dark:0x102139,accent:0xf0a65a,ink:0x66c8da},
    {name:'折纸都会',sky:0xecdcca,ground:0xcfbea3,wall:0xf0d1b5,dark:0x9298a6,accent:0xba797f,ink:0x7faea7},
    {name:'星夜晶洞',sky:0x16192f,ground:0x30314c,wall:0x565b83,dark:0x22263f,accent:0x84d3c9,ink:0xba9cde}
  ];
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const heights=[520,680,570,760,630],bases=[0,520,1200,1770,2530];
  function floorAt(y){let l=0;while(l<4&&y>=bases[l+1]-16)l++;return l;}
  function height(x,z,l){return 17+12*Math.sin(x*.004+l)*Math.sin(z*.0046-l)+6*Math.cos((x+z)*.007);}
  // Exactly the same triangle interpolation as the terrain mesh.
  function terrain(x,z,l){const step=40,x0=Math.floor((x+1400)/step)*step-1400,z0=Math.floor((z+1400)/step)*step-1400,u=(x-x0)/step,v=(z-z0)/step,a=height(x0,z0,l),b=height(x0+step,z0,l),c=height(x0,z0+step,l),d=height(x0+step,z0+step,l);return u+v<=1?a+(b-a)*u+(c-a)*v:d+(c-d)*(1-u)+(b-d)*(1-v);}
  function ground(x,z,y=0){if(Math.abs(x)>1400||Math.abs(z)>1400)return -180;const l=floorAt(y);return bases[l]+terrain(x,z,l);}
  function plan(seed=73021){
    const nodes=[[-850,-850,95],[0,-850,165],[850,-850,100],[-850,0,155],[0,0,235],[850,0,180],[-850,850,90],[0,850,150],[850,850,95]].map(([x,z,y],i)=>({x,y,z,i}));
    const links=[[0,1],[1,2],[2,5],[5,8],[8,7],[7,6],[6,3],[3,0],[3,4],[4,5],[1,4],[4,7],[0,4],[4,8],[2,4],[4,6]];
    const routes=links.map(([a,b],i)=>{const p=nodes[a],q=nodes[b],mid=new THREE.Vector3((p.x+q.x)/2,(p.y+q.y)/2+(i===8||i===9?95:i===10||i===11?-70:0),(p.z+q.z)/2);return {a,b,i,curve:new THREE.CatmullRomCurve3([new THREE.Vector3(p.x,p.y,p.z),mid,new THREE.Vector3(q.x,q.y,q.z)],false,'centripetal')};});
    const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
    const layers=Array.from({length:5},(_,l)=>{
      const n=[9,11,12,10,14][l],nodes=[],edges=[],add=(a,b)=>{if(a!==b&&!edges.some(e=>e[0]===Math.min(a,b)&&e[1]===Math.max(a,b)))edges.push([Math.min(a,b),Math.max(a,b)]);};
      for(let i=0;i<n;i++){let x,z;if(l===0){const slots=[[-1050,-250],[-550,200],[0,-180],[520,150],[1030,-220],[-700,-850],[150,-930],[700,870],[-450,920]];[x,z]=slots[i];x+=(random()-.5)*180;z+=(random()-.5)*180;}
        else if(l===1){const a=(i<8?i/8:(i-8)/3)*Math.PI*2+(random()-.5)*.2,r=i<8?850+random()*180:300+random()*100;x=Math.cos(a)*r;z=Math.sin(a)*r;}
        else if(l===2){x=(i%4-1.5)*630+(random()-.5)*180;z=(Math.floor(i/4)-1)*840+(random()-.5)*200;}
        else if(l===3){const a=i/n*Math.PI*2+(random()-.5)*.25,r=550+(i%3)*220+random()*80;x=Math.cos(a)*r;z=Math.sin(a)*r;}
        else {let attempts=0;do{x=(random()-.5)*2200;z=(random()-.5)*2200;}while(nodes.some(p=>Math.hypot(p.x-x,p.z-z)<350)&&attempts++<100);}
        nodes.push({x,z,y:(l===3?165:140)+x*.028+z*.032+(random()-.5)*18,i,label:['砂谷岔口','山中亭台','机城节点','纸楼街区','晶洞浮岛'][l]+' '+(i+1)});
      }
      if(l===0){[[0,1],[1,2],[2,3],[3,4],[1,5],[2,6],[3,7],[2,8],[5,6],[7,8]].forEach(([a,b])=>add(a,b));}
      if(l===1){for(let i=0;i<8;i++)add(i,(i+1)%8);add(8,9);add(9,10);add(10,8);add(1,8);add(4,9);add(6,10);}
      if(l===2){for(let i=0;i<n;i++){if(i%4<3)add(i,i+1);if(i<8&&(i%2===0||random()>.4))add(i,i+4);}add(1,6);add(6,11);}
      if(l===3){for(let i=0;i<n;i++)add(i,(i+1)%n);for(const i of [0,2,5,7])add(i,(i+4)%n);}
      // A spanning tree guarantees access; extra short links create loops, not a uniform grid.
      const reached=new Set([0]);while(reached.size<n){let best=[0,0,Infinity];for(const a of reached)for(let b=0;b<n;b++)if(!reached.has(b)){const d=Math.hypot(nodes[a].x-nodes[b].x,nodes[a].z-nodes[b].z);if(d<best[2])best=[a,b,d];}add(best[0],best[1]);reached.add(best[1]);}
      if(l===4)for(let i=0;i<10;i++){const a=Math.floor(random()*n),near=nodes.map((p,b)=>({b,d:Math.hypot(p.x-nodes[a].x,p.z-nodes[a].z)})).filter(p=>p.b!==a).sort((a,b)=>a.d-b.d);add(a,near[1].b);}
      const routes=edges.map(([a,b],i)=>{const p=nodes[a],q=nodes[b],dx=q.x-p.x,dz=q.z-p.z,length=Math.hypot(dx,dz),bend=(random()-.5)*100,mid=new THREE.Vector3((p.x+q.x)/2-dz/length*bend,(p.y+q.y)/2+(random()-.5)*24,(p.z+q.z)/2+dx/length*bend);return {a,b,i,curve:new THREE.CatmullRomCurve3([new THREE.Vector3(p.x,p.y,p.z),mid,new THREE.Vector3(q.x,q.y,q.z)],false,'centripetal')};});
      return {nodes,routes};
    });
    const patterns=[[[1100,650],[1600,850],[2200,200],[1780,-450],[1100,-650]],[[1100,650],[1650,1050],[2350,700],[2550,-450],[1650,-1050],[1100,-650]],[[1100,650],[1600,600],[2080,950],[2520,200],[1800,-80],[2150,-700],[1100,-650]],[[1100,650],[1650,1000],[2300,650],[1850,0],[2400,-650],[1600,-950],[1100,-650]]];
    const physical=patterns.map((pattern,l)=>{
      const angle=l*Math.PI/2+Math.floor(random()*4)*Math.PI/2,rotation=new THREE.Matrix4().makeRotationY(angle),variation=.9+random()*.2;
      let stretch=variation,curve;for(let attempt=0;attempt<20;attempt++){const horizontal=new THREE.CatmullRomCurve3(pattern.map(([x,z])=>new THREE.Vector3(1100+(x-1100)*stretch,0,z).applyMatrix4(rotation)),false,'centripetal');const length=horizontal.getLength();if(length<heights[l]/Math.tan(6.8*Math.PI/180)){stretch*=1.09;continue;}const points=horizontal.getSpacedPoints(320).map((p,i)=>new THREE.Vector3(p.x,bases[l]+100+heights[l]*i/320,p.z));curve=new THREE.CatmullRomCurve3(points,false,'centripetal');break;}
      return {from:l,to:l+1,curve,name:['砂岩双弯','云廊回旋','机城折线','纸桥折返'][l],radius:[60,67,57,73][l],sides:[10,8,6,4][l],angle,length:curve.getLength()};
    });
    const slots=[[-1120,-330],[1120,280],[-350,-1120],[320,1120],[-1130,420],[1130,-420]];
    const used=[0,0,0,0,0],pool=[[0,2],[1,3],[2,4],[0,3],[1,4],[0,4]];for(let i=pool.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
    const offsets=used.map(()=>Math.floor(random()*slots.length)),portals=[];
    for(const [a,b] of pool.slice(0,4)){const pair=[];for(const l of [a,b]){const slot=slots[(offsets[l]+used[l]++)%slots.length];pair.push({level:l,x:slot[0],y:bases[l]+155+random()*65,z:slot[1],yaw:Math.abs(slot[0])>1000?Math.PI/2:0});}pair[0].target=portals.length+1;pair[1].target=portals.length;portals.push(...pair);}
    const bounds=new THREE.Box3(new THREE.Vector3(-1500,-180,-1500),new THREE.Vector3(1500,3160,1500));for(const c of physical)for(const p of c.curve.getSpacedPoints(80))bounds.expandByPoint(p);bounds.expandByScalar(180);
    return {layers,nodes:layers[0].nodes,routes:layers[0].routes,physical,portals,bounds};
  }
  const flightProfile={speedScale:1,turnRate:.75,boostTurnRate:2.05,boostBankAngle:.90,boostClimbPitch:25*Math.PI/180,boostPitchResponse:3.2,windScale:.3,cruiseSpeed:54,cruiseMaxSpeed:68,boostSpeed:125,slowSpeed:12,pitchDrag:35,maxSpeed:155,accelerationRate:.8,effectSpeedScale:2.4};
  const combatProfile={...flightProfile,cruiseSpeed:28,cruiseMaxSpeed:38,boostSpeed:62,maxSpeed:74,slowSpeed:8,pitchDrag:18,effectSpeedScale:1.2};
  return {scale:.6,flightProfile,combatProfile,themes,heights,bases,floorAt,height,terrain,ground,plan};
})();

function buildLabyrinth(seed=73021){
  const R=Labyrinth,P=R.plan(seed),group=new THREE.Group(),levels=[],connectors=[],foundations=[],colliders=[],buckets=new Map(),large=[],cell=180;
  const vec=new THREE.Vector3(),mat4=new THREE.Matrix4(),quat=new THREE.Quaternion(),unit=new THREE.Vector3(1,1,1),normalMat=new THREE.Matrix3(),localRay=new THREE.Ray(),hit=new THREE.Vector3(),raycaster=new THREE.Raycaster();
  const geom={box:new THREE.BoxGeometry(1,1,1),cone:new THREE.ConeGeometry(1,1,5),cylinder:new THREE.CylinderGeometry(1,1,1,10),ring:new THREE.TorusGeometry(1,.09,5,24),hex:new THREE.TorusGeometry(1,.085,4,6),crystal:new THREE.OctahedronGeometry(1)};
  const batches=new Map(),terrains=[],contacts=Array.from({length:5},()=>[]),stats={structures:0,colliders:0,seed,passages:8,foldGates:8,layerHeights:R.heights,connectorLengths:P.physical.map(c=>Math.round(c.length))};
  const reservedLayers=P.layers.map(layer=>layer.routes.flatMap(r=>r.curve.getSpacedPoints(Math.ceil(r.curve.getLength()/10))));
  // Enlarged buildings must also leave the full inter-floor flight tube open.
  for(const connection of P.physical)for(const p of connection.curve.getSpacedPoints(Math.ceil(connection.length/10))){
    for(let l=0;l<5;l++)if(p.y>R.bases[l]-180&&p.y<R.bases[l]+R.heights[l]+180){const q=p.clone();q.y-=R.bases[l];q.clearance=connection.radius+5;reservedLayers[l].push(q);}
  }
  for(const gate of P.portals)for(let d=-120;d<=120;d+=10)reservedLayers[gate.level].push(new THREE.Vector3(gate.x+Math.sin(gate.yaw)*d,gate.y-R.bases[gate.level],gate.z+Math.cos(gate.yaw)*d));
  const reservePoint=new THREE.Vector3(),reserveInverse=new THREE.Matrix4();
  function register(obj){const b=obj.bounds,id=colliders.length;colliders.push(obj);const x0=Math.floor(b.min.x/cell),x1=Math.floor(b.max.x/cell),y0=Math.floor(b.min.y/cell),y1=Math.floor(b.max.y/cell),z0=Math.floor(b.min.z/cell),z1=Math.floor(b.max.z/cell);if((x1-x0+1)*(y1-y0+1)*(z1-z0+1)>160){large.push(id);return;}for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)for(let z=z0;z<=z1;z++){const k=x+','+y+','+z;if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(id);}}
  function part(l,g,m,pos,scale,rotation,kind='迷境结构',solid=true){
    const parent=levels[l],key=l+':'+g+':'+m,reserved=reservedLayers[l];
    quat.setFromEuler(new THREE.Euler(...(rotation||[0,0,0]),'YXZ'));mat4.compose(new THREE.Vector3(pos[0],pos[1]+R.bases[l],pos[2]),quat,new THREE.Vector3(...scale));
    // At intersections, open the visible structure itself, not only its collider.
    if(g==='box'&&solid&&kind!=='上一层地基'){
      const radius=Math.hypot(...scale)*.5;reserveInverse.copy(mat4).invert();
      for(const p of reserved){const margin=p.clearance||7;if(Math.abs(p.x-pos[0])>radius+margin||Math.abs(p.z-pos[2])>radius+margin||Math.abs(p.y-pos[1])>radius+margin)continue;reservePoint.set(p.x,p.y+R.bases[l],p.z).applyMatrix4(reserveInverse);if(Math.abs(reservePoint.x)<.5+margin/scale[0]&&Math.abs(reservePoint.y)<.5+margin/scale[1]&&Math.abs(reservePoint.z)<.5+margin/scale[2])return;}
    }
    if((g==='ring'||g==='hex')&&solid){reserveInverse.copy(mat4).invert();const radius=Math.max(...scale)*1.2;for(const p of reserved){if(Math.abs(p.x-pos[0])>radius||Math.abs(p.y-pos[1])>radius||Math.abs(p.z-pos[2])>radius)continue;reservePoint.set(p.x,p.y+R.bases[l],p.z).applyMatrix4(reserveInverse);const r=Math.hypot(reservePoint.x,reservePoint.y),margin=5/Math.min(...scale);if(Math.abs(reservePoint.z)<.1+margin&&r>(g==='hex'?.78:.90)-margin&&r<1.1+margin)return;}}
    if(g==='crystal'&&solid){reserveInverse.copy(mat4).invert();const radius=Math.max(...scale)+8;for(const p of reserved){if(Math.abs(p.x-pos[0])>radius||Math.abs(p.y-pos[1])>radius||Math.abs(p.z-pos[2])>radius)continue;reservePoint.set(p.x,p.y+R.bases[l],p.z).applyMatrix4(reserveInverse);if(Math.abs(reservePoint.x)+Math.abs(reservePoint.y)+Math.abs(reservePoint.z)<1+10/Math.min(...scale))return;}}
    if(g==='cone'&&solid){reserveInverse.copy(mat4).invert();const radius=Math.max(...scale)+8;for(const p of reserved){if(Math.abs(p.x-pos[0])>radius||Math.abs(p.y-pos[1])>radius||Math.abs(p.z-pos[2])>radius)continue;reservePoint.set(p.x,p.y+R.bases[l],p.z).applyMatrix4(reserveInverse);if(Math.abs(reservePoint.x)<1+8/scale[0]&&Math.abs(reservePoint.z)<1+8/scale[2]&&Math.abs(reservePoint.y)<.5+8/scale[1])return;}}
    if(kind==='上一层地基'){
      // Keep the physical slab, but its downward face belongs to the sky of the floor below.
      // A separate single-pass mesh stays visible even when the upper floor's scenery is culled.
      const geometry=geom.box.clone(),normal=geometry.attributes.normal,colors=new Float32Array(normal.count*3),sky=new THREE.Color(R.themes[Math.max(0,l-1)].sky),edge=new THREE.Color(R.themes[l].dark);
      for(let i=0;i<normal.count;i++){const c=normal.getY(i)<-.5?sky:edge;colors.set([c.r,c.g,c.b],i*3);}geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
      const slab=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({vertexColors:true}));slab.name='楼板与下层天幕 '+l;slab.matrixAutoUpdate=false;slab.matrix.copy(mat4);foundations.push(slab);group.add(slab);
    }else{let batch=batches.get(key);if(!batch){batch={parent,geometry:geom[g],material:parent.userData.materials[m],matrices:[]};batches.set(key,batch);}batch.matrices.push(mat4.clone());}stats.structures++;
    if(solid){const geometry=geom[g];if(!geometry.boundingBox)geometry.computeBoundingBox();const bounds=geometry.boundingBox.clone().applyMatrix4(mat4);if(g==='box')register({bounds,inverse:mat4.clone().invert(),matrix:mat4.clone(),kind});else{const mesh=new THREE.Mesh(geometry,parent.userData.materials[m]);mesh.matrixAutoUpdate=false;mesh.matrix.copy(mat4);mesh.matrixWorld.copy(mat4);register({bounds,mesh,kind});}
      // Only ground-touching structures contribute to this inexpensive, static contact cue.
      const ground=R.terrain(pos[0],pos[2],l)+R.bases[l];
      if(kind!=='上一层地基'&&bounds.min.y<=ground+6&&bounds.max.y>ground+2)contacts[l].push({x:pos[0],z:pos[2],rx:Math.min(160,(bounds.max.x-bounds.min.x)*.5+24),rz:Math.min(160,(bounds.max.z-bounds.min.z)*.5+24)});
    }
  }
  const box=(l,m,x,y,z,w,h,d,yaw=0,kind='墙面',solid=true)=>part(l,'box',m,[x,y,z],[w,h,d],[0,yaw,0],kind,solid);
  function bar(l,m,a,b,width,kind){const mid=a.clone().add(b).multiplyScalar(.5),d=b.clone().sub(a),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize()),e=new THREE.Euler().setFromQuaternion(q,'YXZ');part(l,'box',m,mid.toArray(),[width,d.length(),width],[e.x,e.y,e.z],kind);}
  function frame(l,p,yaw,width=58,height=62,m='wall',roof=true){
    const right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
    for(const side of [-1,1])box(l,m,p.x+right.x*width*.5*side,p.y,p.z+right.z*width*.5*side,7,height,8,yaw,'门洞侧柱');
    if(roof)box(l,m,p.x,p.y+height*.5,p.z,width+7,7,9,yaw,'门洞上沿');
    box(l,'dark',p.x,p.y-height*.5-3,p.z,width+14,6,16,yaw,'桥面');
  }
  function hollowBuilding(l,x,z,y,w,h,d){
    if(l===3){w*=1.35;h*=1.35;d*=1.35;}
    for(const dx of [-1,1])for(const dz of [-1,1])box(l,'wall',x+dx*(w/2-10),y+h/2,z+dz*(d/2-10),14,h,14,0,'建筑立柱');
    for(let k=0;k<3;k++)box(l,k%2?'accent':'wall',x,y+k*h/2,z,w,9,d,0,'镂空楼层');
    if(l===1||l===3){for(const side of [-1,1])part(l,'box',l===1?'dark':'ink',[x+side*w*.23,y+h+17,z],[w*.56,7,d+26],[0,0,side*.28],'折面屋顶');}
  }
  for(let l=0;l<5;l++){
    const theme=R.themes[l],layer=new THREE.Group();levels.push(layer);group.add(layer);const materials={};
    // All solid faces receive Lambert lighting; a small emissive floor keeps night palettes readable.
    for(const k of ['ground','wall','dark','accent','ink']){const night=l===2||l===4;materials[k]=new THREE.MeshLambertMaterial({color:theme[k],emissive:night?theme[k]:0,emissiveIntensity:night?(k==='accent'||k==='ink'?.13:.045):0,flatShading:true,side:THREE.DoubleSide});if(l===3&&typeof PaperCityStyle!=='undefined')PaperCityStyle.surface(materials[k],k);}layer.userData.materials=materials;
    const terrain=new THREE.PlaneGeometry(2800,2800,70,70);terrain.rotateX(-Math.PI/2);const pos=terrain.attributes.position;for(let i=0;i<pos.count;i++)pos.setY(i,R.height(pos.getX(i),pos.getZ(i),l)+R.bases[l]);terrain.computeVertexNormals();const groundMaterial=materials.ground.clone();groundMaterial.vertexColors=true;terrains.push(terrain);const groundMesh=new THREE.Mesh(terrain,groundMaterial);groundMesh.receiveShadow=l===3;layer.add(groundMesh);
    // The solid underside prevents skipping floors by simply climbing in the centre.
    box(l,'dark',0,-9,0,2800,18,2800,0,'上一层地基');
    for(const route of P.layers[l].routes){
      const curve=route.curve,length=curve.getLength(),count=Math.ceil(length/95);
      for(let j=1;j<count;j++){
        const t=j/count,p=curve.getPointAt(t),d=curve.getTangentAt(t),yaw=Math.atan2(d.x,d.z),width=(route.i>=12?45:68)*(l===3?1.2:1),galleryHeight=66*(l===3?1.2:1);
        if(l===2||l===4){part(l,l===2?'ring':'hex',j%4===0?'accent':'ink',p.toArray(),[width*.58,width*.58,width*.58],[0,yaw,Math.sin(j)*.15],'穿越环');if(j%3===0)frame(l,p,yaw,width,65,'dark',false);}
        else frame(l,p,yaw,width,galleryHeight,j%4===0?'accent':'wall');
        // Alternate roofed galleries and open bridges; walls remain outside the flight centre.
        if(j%5<3){const right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));for(const side of [-1,1])box(l,j%2?'wall':'dark',p.x+right.x*(width/2+5)*side,p.y,p.z+right.z*(width/2+5)*side,l===3?11:9,galleryHeight,length/count-12,yaw,'回廊侧壁');box(l,'dark',p.x,p.y-galleryHeight/2-4,p.z,width+18,7,length/count-12,yaw,'高架桥面');if(j%5===1)box(l,'wall',p.x,p.y+galleryHeight/2+4,p.z,width+18,7,length/count-12,yaw,'回廊顶板');}
        if(j%3===0){const bottom=R.terrain(p.x,p.z,l);box(l,'dark',p.x,p.y/2+bottom/2-25,p.z,12,Math.max(5,p.y-bottom-50),12,yaw,'高架支撑');}
      }
    }
    // Nine readable landmarks, each a cluster with multiple doors and height choices.
    for(const node of P.layers[l].nodes){
      const {x,z,y,i}=node;hollowBuilding(l,x,z,y-48,185,190,155);
      for(let side=-1;side<=1;side+=2){const p=new THREE.Vector3(x+side*140,y+35,z);frame(l,p,Math.PI/2,64,82,'accent');}
      if(l===0){for(let k=-2;k<=2;k++){box(l,'wall',x+k*39,y+140,z+90,18,130,25,0,'引水桥墩');box(l,'wall',x+k*39,y+210,z+90,45,12,30,0,'引水桥');}}
      if(l===1){for(let k=0;k<3;k++)hollowBuilding(l,x+165,z-110,y-30+k*65,110-k*18,48,95-k*12);}
      if(l===2){for(let k=0;k<3;k++){const p=[x-145,y+50+k*72,z];part(l,'ring','accent',p,[62,62,62],[0,Math.PI/2,0],'巨型机械齿环');for(let tooth=0;tooth<12;tooth++){const a=tooth*Math.PI/6;part(l,'box','ink',[p[0],p[1]+Math.cos(a)*69,p[2]+Math.sin(a)*69],[19,13,13],[a,0,0],'齿环齿块');}}}
      if(l===3){for(let k=0;k<3;k++)hollowBuilding(l,x+180,z+100-k*90,y-20+k*35,85,150,70);}
      if(l===4){for(let k=0;k<6;k++){const a=k*Math.PI/3;part(l,'crystal','ink',[x+Math.cos(a)*145,y+65,z+Math.sin(a)*145],[18,85,23],[.2,a,.3],'悬浮晶体');}part(l,'hex','accent',[x,y+230,z],[95,95,95],[0,0,0],'星门');}
      // A side spur with a fork and a visible dead-end wall, away from the main routes.
      const branch=new THREE.Vector3(x+240,y+70,z+(i%2?190:-190));frame(l,branch,Math.PI/4,48,62,'ink');frame(l,branch.clone().add(new THREE.Vector3(75,12,-75)),Math.PI/4,42,62,'accent');box(l,'dark',branch.x+155,branch.y+12,branch.z-150,65,65,8,Math.PI/4,'支路尽头');
    }
    // Seeded irregular scenery, excluded from clear route tubes and all spawn/transition aprons.
    let seed=917+l*331;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
    const samples=P.layers[l].routes.flatMap(r=>r.curve.getSpacedPoints(24));
    const terminals=P.physical.filter(c=>c.from===l||c.to===l).map(c=>c.curve.getPointAt(c.from===l?0:1)).concat(P.portals.filter(p=>p.level===l));
    for(let k=0;k<240;k++){const x=(random()-.5)*2700,z=(random()-.5)*2700;if(samples.some(p=>Math.hypot(p.x-x,p.z-z)<105)||terminals.some(p=>Math.hypot(p.x-x,p.z-z)<150)||Math.hypot(x,z-1140)<190||x>950&&Math.abs(z)<820)continue;const h=25+random()*110,w=18+random()*45,y=R.terrain(x,z,l);
      if(l===0||l===1)part(l,'cone',k%3?'dark':'wall',[x,y+h/2,z],[w,h,w*.85],[0,random()*6.28,0],'岩峰');
      else if(l===3)hollowBuilding(l,x,z,y,w*1.3,h,w);
      else part(l,l===4?'crystal':'box',k%4?'wall':'accent',[x,y+h/2,z],[w*.7,h,w*.7],[0,random()*3,0],l===4?'晶簇':'机械塔');
    }
    // Low water / ink river / blueprint grid / paper street / star path.
    for(let k=-1300;k<=1300;k+=100){box(l,'ink',Math.sin(k*.004)*240,7,k,95,1,104,0,'水道',false);if(l===2){part(l,'box','ink',[k,35,0],[1,1,2750],null,'蓝图地格',false);part(l,'box','ink',[0,35,k],[2750,1,1],null,'蓝图地格',false);}}
    for(const c of P.physical.filter(c=>c.from===l||c.to===l)){const t=c.from===l?0:1,p=c.curve.getPointAt(t),d=c.curve.getTangentAt(t);frame(l,new THREE.Vector3(p.x,p.y-R.bases[l],p.z),Math.atan2(d.x,d.z),100,120,'accent');}
    if(l===0||l===1)for(let k=0;k<18;k++){const a=k*Math.PI/9,x=Math.cos(a)*1330,z=Math.sin(a)*1330;if(P.physical.some(c=>c.curve.getSpacedPoints(100).some(p=>Math.hypot(p.x-x,p.z-z)<190)))continue;part(l,'cone',k%3?'ground':'dark',[x,115+k%4*22,z],[95+k%3*30,220+k%4*44,110],[0,a,0],'边缘山体');}
    if(l===4){const stars=[];for(let k=0;k<1200;k++)stars.push((random()-.5)*2800,R.bases[l]+420+random()*130,(random()-.5)*2800);const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(stars,3));layer.add(new THREE.Points(g,new THREE.PointsMaterial({color:0xcdd5ed,size:1.7,sizeAttenuation:true})));}
  }
  // A winding, physically hollow tube, never a solid bounding box over its opening.
  for(let l=0;l<4;l++){
    const parent=new THREE.Group();group.add(parent);connectors.push(parent);const spec=P.physical[l],points=spec.curve.getSpacedPoints(240),curve=spec.curve;
    const material=new THREE.MeshLambertMaterial({color:R.themes[l].dark,emissive:R.themes[l].dark,emissiveIntensity:.12,flatShading:true,side:THREE.DoubleSide});
    const tube=new THREE.TubeGeometry(curve,240,spec.radius,spec.sides,false);
    // Each small strip has its own broad-phase bounds but shares the visual surface exactly.
    const source=tube.attributes.position,index=tube.index,strip=spec.sides*6,visible=[];
    for(let j=0;j<240;j++){if(l===2&&j%16>=10||l===3&&j%28>=22)continue;const arr=[];for(let k=j*strip;k<(j+1)*strip;k++){const i=index.getX(k);arr.push(source.getX(i),source.getY(i),source.getZ(i));}visible.push(...arr);const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(arr,3));g.computeVertexNormals();g.computeBoundingBox();register({bounds:g.boundingBox.clone(),mesh:new THREE.Mesh(g,material),kind:spec.name+'隧壁'});}
    const skin=new THREE.BufferGeometry();skin.setAttribute('position',new THREE.Float32BufferAttribute(visible,3));skin.computeVertexNormals();parent.add(new THREE.Mesh(skin,material));tube.dispose();
    const marks=new THREE.Group();parent.add(marks);const matrices=[];
    for(let j=0;j<=70;j++){const t=j/70,p=curve.getPointAt(t),d=curve.getTangentAt(t);quat.setFromUnitVectors(new THREE.Vector3(0,0,1),d);mat4.compose(p,quat,new THREE.Vector3(spec.radius*.86,spec.radius*.86,spec.radius*.86));matrices.push(mat4.clone());}
    const rings=new THREE.InstancedMesh(geom.ring,new THREE.MeshBasicMaterial({color:R.themes[l].accent}),matrices.length);matrices.forEach((m,i)=>rings.setMatrixAt(i,m));marks.add(rings);
    // Longitudinal light lines make both the bend and gradient legible from inside.
    for(const side of [-1,1]){const pts=[];for(let j=0;j<points.length;j++){const d=curve.getTangentAt(j/(points.length-1)),right=new THREE.Vector3(-d.z,0,d.x).normalize();pts.push(points[j].clone().addScaledVector(right,side*spec.radius*.65).add(new THREE.Vector3(0,-18,0)));}parent.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:R.themes[l].ink})));}
  }
  for(const gate of P.portals){const l=gate.level,p=new THREE.Vector3(gate.x,gate.y-R.bases[l],gate.z);frame(l,p,gate.yaw,96,100,'accent');part(l,l===4?'hex':'ring','ink',p.toArray(),[40,40,40],[0,gate.yaw,0],'折跃门边框');
    if(typeof document!=='undefined'){const canvas=document.createElement('canvas');canvas.width=640;canvas.height=160;const ctx=canvas.getContext('2d');ctx.fillStyle='#152b39';ctx.fillRect(0,0,640,160);ctx.fillStyle='#e8f2df';ctx.font='bold 38px Microsoft YaHei';ctx.textAlign='center';const destination=P.portals[gate.target].level;ctx.fillText('折跃 → '+(destination+1)+'F '+R.themes[destination].name,320,65);ctx.font='25px Microsoft YaHei';ctx.fillText('穿过光环 · 双向跨层捷径',320,119);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthWrite:false}));sprite.position.set(gate.x,gate.y+73,gate.z);sprite.scale.set(146,36.5,1);levels[l].add(sprite);}
  }
  for(const [key,b] of batches){const mesh=new THREE.InstancedMesh(b.geometry,b.material,b.matrices.length);b.matrices.forEach((m,i)=>{mesh.setMatrixAt(i,m);if(key.startsWith('3:')){const hue=.90+.10*Math.sin(m.elements[12]*.11+m.elements[14]*.073);mesh.setColorAt(i,new THREE.Color(hue,hue*.99,hue*.97));}});mesh.castShadow=mesh.receiveShadow=key.startsWith('3:');mesh.computeBoundingSphere();b.parent.add(mesh);
    // No coincident outline / wireframe shells: distant edges otherwise flicker in motion.
  }
  // Bake soft ground contact into existing vertices: no overlay, depth fighting, or extra draw pass.
  for(let l=0;l<5;l++){const terrain=terrains[l],pos=terrain.attributes.position,colors=new Float32Array(pos.count*3);
    for(let i=0;i<pos.count;i++){let occlusion=0;for(const c of contacts[l]){const dx=(pos.getX(i)-c.x)/c.rx,dz=(pos.getZ(i)-c.z)/c.rz,d2=dx*dx+dz*dz;if(d2<6.25)occlusion=Math.max(occlusion,.28*Math.exp(-d2*1.3));}const shade=1-occlusion;colors.set([shade,shade,shade],i*3);}
    terrain.setAttribute('color',new THREE.BufferAttribute(colors,3));
  }
  group.add(new THREE.HemisphereLight(0xe8efff,0x8b8277,1.25));const sun=new THREE.DirectionalLight(0xfff0d9,2.0);sun.position.set(-650,900,450);group.add(sun);group.add(sun.target);const fill=new THREE.DirectionalLight(0xc8e0ef,.65);fill.position.set(500,300,-600);group.add(fill);
  if(typeof PaperCityStyle!=='undefined')PaperCityStyle.shadow(sun);
  // Compact the whole authored space while keeping the physical paper size unchanged.
  const scale=R.scale,scaling=new THREE.Matrix4().makeScale(scale,scale,scale);group.scale.setScalar(scale);
  const oldColliders=colliders.splice(0);buckets.clear();large.length=0;for(const c of oldColliders){c.bounds.applyMatrix4(scaling);if(c.matrix){c.matrix.premultiply(scaling);c.inverse.copy(c.matrix).invert();}if(c.mesh){c.mesh.matrixAutoUpdate=false;c.mesh.matrix.premultiply(scaling);c.mesh.matrixWorld.copy(c.mesh.matrix);}register(c);}
  for(const layer of P.layers){for(const n of layer.nodes){n.x*=scale;n.y*=scale;n.z*=scale;}for(const route of layer.routes){route.curve.points.forEach(p=>p.multiplyScalar(scale));route.curve.updateArcLengths();}}
  for(const spec of P.physical){spec.curve.points.forEach(p=>p.multiplyScalar(scale));spec.curve.updateArcLengths();spec.length*=scale;spec.radius*=scale;}
  for(const gate of P.portals){gate.x*=scale;gate.y*=scale;gate.z*=scale;}P.bounds.applyMatrix4(scaling);stats.layerHeights=R.heights.map(h=>h*scale);stats.connectorLengths=P.physical.map(c=>Math.round(c.length));stats.layouts=P.layers.map(l=>({nodes:l.nodes.length,paths:l.routes.length}));group.updateMatrixWorld(true);stats.colliders=colliders.length;
  if(typeof PaperCityStyle!=='undefined')PaperCityStyle.fit(sun,new THREE.Box3().setFromObject(levels[3]),scale);
  const localBox=new THREE.Box3(new THREE.Vector3(-.5,-.5,-.5),new THREE.Vector3(.5,.5,.5));
  function candidates(a,b){const ids=new Set(large);for(let x=Math.floor(Math.min(a.x,b.x)/cell);x<=Math.floor(Math.max(a.x,b.x)/cell);x++)for(let y=Math.floor(Math.min(a.y,b.y)/cell);y<=Math.floor(Math.max(a.y,b.y)/cell);y++)for(let z=Math.floor(Math.min(a.z,b.z)/cell);z<=Math.floor(Math.max(a.z,b.z)/cell);z++){const list=buckets.get(x+','+y+','+z);if(list)for(const id of list)ids.add(id);}return ids;}
  function raycast(a,d,length,skipBoxes=false){let best=null;const b=a.clone().addScaledVector(d,length),ray=new THREE.Ray(a,d);for(const id of candidates(a,b)){const obj=colliders[id];if(skipBoxes&&obj.inverse)continue;if(!obj.bounds.containsPoint(a)&&(!ray.intersectBox(obj.bounds,hit)||a.distanceTo(hit)>length+.003))continue;let distance,normal;
      if(obj.inverse){localRay.copy(ray).applyMatrix4(obj.inverse);if(localBox.containsPoint(localRay.origin)){distance=0;normal=d.clone().negate();}else{if(!localRay.intersectBox(localBox,hit))continue;normal=new THREE.Vector3();let axis='x';if(Math.abs(hit.y)>Math.abs(hit[axis]))axis='y';if(Math.abs(hit.z)>Math.abs(hit[axis]))axis='z';normal[axis]=Math.sign(hit[axis]);normal.applyNormalMatrix(normalMat.getNormalMatrix(obj.matrix));hit.applyMatrix4(obj.matrix);distance=hit.distanceTo(a);}}
      else{raycaster.set(a,d);raycaster.near=0;raycaster.far=length+.003;const h=raycaster.intersectObject(obj.mesh,false)[0];if(!h)continue;distance=h.distance;normal=h.face.normal.clone().transformDirection(obj.mesh.matrixWorld);if(normal.dot(d)>0)normal.negate();}
      if(distance<=length+.003&&(!best||distance<best.distance))best={distance,fraction:distance/length,normal,kind:obj.kind};
    }return best;}
  // Sweep the complete aircraft envelope against each oriented building box.
  // Transform offsets as vectors (no translation), retaining each box's scale.
  function sweepHull(a,b,offsets0,offsets1,padding=0){
    const radius=Math.max(...offsets0.map(p=>p.length()),...offsets1.map(p=>p.length()))+padding;
    const low=a.clone().min(b).addScalar(-radius),high=a.clone().max(b).addScalar(radius);let best=null;
    for(const id of candidates(low,high)){
      const obj=colliders[id];if(!obj.inverse||!obj.bounds.intersectsBox(new THREE.Box3(low,high)))continue;
      const linear=obj.hullLinear||(obj.hullLinear=new THREE.Matrix3().setFromMatrix4(obj.inverse));
      const normalMatrix=obj.hullNormal||(obj.hullNormal=new THREE.Matrix3().getNormalMatrix(obj.matrix));
      const scales=obj.hullScales||(obj.hullScales=new THREE.Vector3().setFromMatrixScale(obj.matrix));
      const p=a.clone().applyMatrix4(obj.inverse),q=b.clone().applyMatrix4(obj.inverse),d=q.clone().sub(p),min=new THREE.Vector3(Infinity,Infinity,Infinity),max=min.clone().negate();
      for(const v of [...offsets0,...offsets1]){const local=v.clone().applyMatrix3(linear);min.min(local);max.max(local);}
      const lo=new THREE.Vector3(),hi=new THREE.Vector3();for(const axis of ['x','y','z']){lo[axis]=-.5-max[axis]-padding/scales[axis];hi[axis]=.5-min[axis]+padding/scales[axis];}
      let enter=0,leave=1,normal=null,depth=0,inside=true,valid=true;
      for(const axis of ['x','y','z'])if(p[axis]<lo[axis]-1e-9||p[axis]>hi[axis]+1e-9)inside=false;
      if(inside){
        depth=Infinity;
        for(const axis of ['x','y','z'])for(const sign of [-1,1]){
          const gap=(sign<0?p[axis]-lo[axis]:hi[axis]-p[axis])*scales[axis];
          if(gap<depth){depth=gap;normal=new THREE.Vector3();normal[axis]=sign;}
        }
        normal.applyNormalMatrix(normalMatrix);
        if(depth<1e-6&&b.clone().sub(a).dot(normal)>=0)continue;
      }else{
        for(const axis of ['x','y','z']){
          if(Math.abs(d[axis])<1e-12){if(p[axis]<lo[axis]||p[axis]>hi[axis])valid=false;continue;}
          const t0=(lo[axis]-p[axis])/d[axis],t1=(hi[axis]-p[axis])/d[axis],near=Math.min(t0,t1),far=Math.max(t0,t1);
          if(near>enter){enter=near;normal=new THREE.Vector3();normal[axis]=d[axis]>0?-1:1;}
          leave=Math.min(leave,far);
        }
        if(!valid||!normal||enter>leave||enter<0||enter>1)continue;
        normal.applyNormalMatrix(normalMatrix);
      }
      if(!best||enter<best.fraction||enter===best.fraction&&depth>best.depth)best={fraction:enter,normal,depth:Math.max(0,depth),kind:obj.kind};
    }
    return best;
  }
  // Boxes are handled volumetrically; mesh rings and tubes keep precise rays.
  sweepHull.raycast=(a,d,length)=>raycast(a,d,length,true);
  let portalCooldown=0;
  function travel(old,s,dt){portalCooldown=Math.max(0,portalCooldown-dt);if(portalCooldown)return null;for(const gate of P.portals){const cos=Math.cos(gate.yaw),sin=Math.sin(gate.yaw),z0=(old.x-gate.x)*sin+(old.z-gate.z)*cos,z1=(s.x-gate.x)*sin+(s.z-gate.z)*cos;if(z0*z1>0||Math.abs(z1-z0)<1e-8)continue;const t=z0/(z0-z1),x=old.x+(s.x-old.x)*t,z=old.z+(s.z-old.z)*t,y=old.y+(s.y-old.y)*t,localX=(x-gate.x)*cos-(z-gate.z)*sin;if(Math.hypot(localX,y-gate.y)>30*scale)continue;const target=P.portals[gate.target],localZ=Math.sign(z1||-z0)*46*scale,tc=Math.cos(target.yaw),ts=Math.sin(target.yaw);s.x=target.x+localX*tc+localZ*ts;s.z=target.z-localX*ts+localZ*tc;s.y=target.y+(y-gate.y);s.yaw+=target.yaw-gate.yaw;portalCooldown=1.5;return '已折跃至 '+(target.level+1)+'F '+R.themes[target.level].name+' · 速度与姿态保留';}return null;}
  const viewDistance=Math.ceil(P.bounds.getSize(new THREE.Vector3()).length()+500);
  return {group,levels,connectors,foundations,viewDistance,colliders,plan:P,stats,width:2800*scale,depth:2800*scale,height:3160*scale,trees:[],houses:[],ground:(x,z,y=0)=>R.ground(x/scale,z/scale,y/scale)*scale,floorAt:y=>R.floorAt(y/scale),raycast,sweepHull,travel,
    reset(){portalCooldown=0;},
    dispose(){sun.shadow.dispose();const geometries=new Set(),materials=new Set();group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});for(const c of colliders)if(c.mesh){geometries.add(c.mesh.geometry);materials.add(c.mesh.material);}for(const g of geometries)g.dispose();for(const m of materials){m.map?.dispose();m.dispose();}},
    spawn(l=0){return {x:550*scale,y:(R.bases[l]+360)*scale,z:1240*scale,yaw:.3};},
    updateLighting(p,quality){if(typeof PaperCityStyle!=='undefined')PaperCityStyle.follow(sun,p,scale,quality,R.floorAt(p.y/scale)===3);},
    update(dt,y){y/=scale;levels.forEach((g,l)=>g.visible=y>R.bases[l]-220&&y<R.bases[l]+R.heights[l]+220);},
    nearestRoute(x,y,z){const l=R.floorAt(y/scale);for(const gate of P.portals)if(gate.level===l&&Math.hypot(gate.x-x,gate.y-y,gate.z-z)<210*scale)return '折跃门 → '+(P.portals[gate.target].level+1)+'F '+R.themes[P.portals[gate.target].level].name;if(Math.abs(x)>1380*scale||Math.abs(z)>1380*scale)return '层间弯道 · 渐进爬升 / 可反向下滑';let nearest=P.layers[l].nodes[0];for(const n of P.layers[l].nodes)if(Math.hypot(n.x-x,n.z-z)<Math.hypot(nearest.x-x,nearest.z-z))nearest=n;return nearest.label+' · '+(y/scale-R.bases[l]>210?'高路':y/scale-R.bases[l]>120?'中路':'低路');}
  };
}



