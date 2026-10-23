/* Three walkable worlds around one continuous atrium. Procedural, offline, batched. */
function buildAtrium(renderer,seed=73021){
  const R=AtriumRules,group=new THREE.Group(),colliders=[],layouts=R.layout(seed),details=[],animations=[];
  const boxGeo=new THREE.BoxGeometry(1,1,1),cylinder=new THREE.CylinderGeometry(1,1,1,10),sphere=new THREE.IcosahedronGeometry(1,1),cone=new THREE.ConeGeometry(1,1,5);
  const batches=new Map(),outlines=new Map(),allMaterials=new Set(),allGeometries=new Set();
  const lambert=color=>{const m=new THREE.MeshLambertMaterial({color,flatShading:true});allMaterials.add(m);return m;};
  const basic=(color,opacity=1)=>{const m=new THREE.MeshBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:opacity===1});allMaterials.add(m);return m;};
  function painted(w,h,paint){const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;paint(canvas.getContext('2d'),w,h);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());const m=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide});allMaterials.add(m);return m;}
  function label(text,sub,bg,fg){return painted(1024,240,(c,w,h)=>{c.fillStyle=bg;c.fillRect(0,0,w,h);c.strokeStyle=fg;c.globalAlpha=.4;c.lineWidth=3;c.strokeRect(12,12,w-24,h-24);c.globalAlpha=1;c.textAlign='center';c.fillStyle=fg;c.font='60px KaiTi, SimSun, serif';c.fillText(text,w/2,112);c.font='23px Segoe UI, Microsoft YaHei, sans-serif';c.fillText(sub,w/2,181);});}
  const palettes=[
    {floor:lambert('#c5bca1'),wall:lambert('#e4d9ba'),trim:lambert('#65756c'),wood:lambert('#875c3e'),dark:lambert('#42574e'),accent:basic('#d8ba70'),light:basic('#fff3ce'),edge:basic('#615640'),glass:basic('#acccce')},
    {floor:basic('#e9e7dd'),wall:basic('#f1f0e7'),trim:basic('#3b4240'),wood:basic('#777c73'),dark:basic('#464d48'),accent:basic('#a95449'),light:basic('#faf9ed'),edge:basic('#343b39'),glass:basic('#dfe3da')},
    {floor:basic('#121c32'),wall:basic('#17243d'),trim:basic('#32466a'),wood:basic('#233652'),dark:basic('#0c152b'),accent:basic('#ec80cd'),light:basic('#8ceee5'),edge:basic('#68c8d1'),glass:basic('#182944')}
  ];
  let level=0,base=0,parent=group,pose={x:0,z:0,yaw:0};
  const point=(x,y,z)=>new THREE.Vector3(pose.x+x*Math.cos(pose.yaw)+z*Math.sin(pose.yaw),base+y,pose.z-x*Math.sin(pose.yaw)+z*Math.cos(pose.yaw));
  function part(geo,mat,x,y,z,sx=1,sy=1,sz=1,kind=null,rx=0,ry=0,rz=0,edge=false){
    allGeometries.add(geo);
    const matrix=new THREE.Matrix4().compose(point(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry+pose.yaw,rz,'YXZ')),new THREE.Vector3(sx,sy,sz));
    const key=parent.uuid+geo.uuid+mat.uuid;
    if(!batches.has(key))batches.set(key,{parent,geo,mat,matrices:[]});batches.get(key).matrices.push(matrix);
    if(kind){if(!geo.boundingBox)geo.computeBoundingBox();colliders.push({bounds:geo.boundingBox.clone().applyMatrix4(matrix),kind,level});}
    if(edge){const key=parent.uuid+level;if(!outlines.has(key))outlines.set(key,{parent,color:palettes[level].edge.color,vertices:[]});const edgeGeo=new THREE.EdgesGeometry(geo,25),a=edgeGeo.attributes.position;for(let i=0;i<a.count;i++){const v=new THREE.Vector3().fromBufferAttribute(a,i).applyMatrix4(matrix);outlines.get(key).vertices.push(v.x,v.y,v.z);}edgeGeo.dispose();}
  }
  const box=(x,y,z,w,h,d,mat,kind=null,edge=false)=>part(boxGeo,mat,x,y,z,w,h,d,kind,0,0,0,edge);
  function panel(mat,w,h,x,y,z,ry=0,rx=0){const g=new THREE.PlaneGeometry(w,h);part(g,mat,x,y,z,1,1,1,null,rx,ry);}
  function bounds(x,y,z,w,h,d,kind){const p=point(x,y,z);colliders.push({bounds:new THREE.Box3(p.clone().add(new THREE.Vector3(-w/2,-h/2,-d/2)),p.clone().add(new THREE.Vector3(w/2,h/2,d/2))),kind,level});}
  function floorLines(p){
    const lines=[];
    for(let n=-8;n<=8;n+=1){for(const axis of [0,1]){const ranges=level&&Math.abs(n)<3?[[-8,-3],[3,8]]:[[-8,8]];for(const [a,b] of ranges){if(axis===0)lines.push(n,base+.007,a,n,base+.007,b);else lines.push(a,base+.007,n,b,base+.007,n);}}}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(lines,3));allGeometries.add(geo);const mat=new THREE.LineBasicMaterial({color:level===2?'#42778a':level===1?'#b9b9ae':'#998e75',transparent:true,opacity:level===1?.17:.27});allMaterials.add(mat);group.add(new THREE.LineSegments(geo,mat));
  }
  function landscape(which){return painted(1024,640,(c,w,h)=>{
    c.fillStyle=['#c3d8d6','#eceee7','#101c36'][which];c.fillRect(0,0,w,h);
    if(which===0){c.fillStyle='#f8e4aa';c.beginPath();c.arc(720,150,67,0,Math.PI*2);c.fill();for(let layer=0;layer<3;layer++){c.fillStyle=['#b6c5b3','#93a999','#758f82'][layer];c.beginPath();c.moveTo(0,h);for(let x=0;x<=w;x+=20)c.lineTo(x,350+layer*66+Math.sin(x*.009+layer)*43+Math.sin(x*.021+layer)*16);c.lineTo(w,h);c.fill();}c.fillStyle='#6b7971';for(let i=0;i<7;i++){const x=i*190-35;c.fillRect(x,469,110,87);c.beginPath();c.moveTo(x-13,471);c.lineTo(x+55,421);c.lineTo(x+123,471);c.fill();}c.strokeStyle='#d1c7ad';c.lineWidth=8;c.beginPath();c.moveTo(0,595);c.lineTo(w,578);c.stroke();}
    if(which===1){for(let layer=0;layer<5;layer++){c.fillStyle=['#d7ddd6','#c3ccc5','#a4b4ad','#80958d','#5c736b'][layer];c.globalAlpha=.55;c.beginPath();c.moveTo(0,h);for(let x=0;x<=w;x+=18)c.lineTo(x,300+layer*57-150*Math.pow(Math.max(0,Math.sin(x*.008+layer*.9)),3));c.lineTo(w,h);c.fill();}c.globalAlpha=1;c.fillStyle='#a8564b';c.fillRect(866,76,49,69);c.fillStyle='#f3ece2';c.font='31px KaiTi, serif';c.fillText('山',875,123);}
    if(which===2){let s=35;for(let i=0;i<120;i++){s=(Math.imul(s,1664525)+1013904223)>>>0;const x=s%w;s=(Math.imul(s,1664525)+1013904223)>>>0;c.fillStyle=i%5?'#6989ae':'#c9e8ec';c.fillRect(x,s%440,i%5?1:3,i%5?1:3);}c.strokeStyle='#2b5476';c.lineWidth=3;for(let i=0;i<13;i++){const x=i*91;c.strokeRect(x,410-(i*73)%170,62,400);}c.strokeStyle='#78d8d4';c.lineWidth=2;c.beginPath();c.arc(745,156,91,0,Math.PI*2);c.stroke();}
  });}
  function bench(p,stone=false){const top=stone?p.wood:p.wood;box(0,.47,0,1.95,.10,.58,top,stone?'石凳':'长椅');if(!stone){box(0,.77,.27,1.95,.50,.08,p.wood,'长椅靠背');for(const x of [-.82,.82])box(x,.66,0,.065,.15,.69,p.dark,'长椅扶手');}for(const x of [-.76,.76])box(x,.23,0,.13,.46,.4,p.dark,'长椅支脚');}
  function bamboo(p){box(0,.13,0,1,.26,1,p.dark,'竹池');box(0,.268,0,.93,.014,.93,p.floor);for(let i=0;i<7;i++){const x=Math.sin(i*7.1)*.33,z=Math.cos(i*4.3)*.33,h=1.35+(i%3)*.28;part(cylinder,p.dark,x,h/2+.26,z,.024,h,.024,'竹竿');for(let n=0;n<4;n++){const y=.6+n*.31;part(cylinder,p.wood,x,y,z,.031,.023,.031);const leaf=new THREE.BufferGeometry();leaf.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,.36,.15,.02,.17,.02,.03],3));leaf.computeVertexNormals();part(leaf,p.trim,x,y,z,1,1,1,null,0,i+n*1.7);}}}
  function prop(item,p){pose={x:item.x,z:item.z,yaw:item.yaw};
    if(item.type==='bench')bench(p);
    if(item.type==='stoneSeat'){box(0,.36,0,1.62,.12,.65,p.wood,'石凳');for(const x of [-.55,.55])box(x,.16,0,.18,.32,.46,p.dark,'石凳支脚');}
    if(item.type==='luggage'){for(let j=0;j<3;j++){const x=(j-1)*.32,y=.21+(j===1?.3:0);box(x,y,(j%2)*.19,.4,.4,.34,j%2?p.trim:p.wood,'行李箱');box(x,y+.225,(j%2)*.19,.17,.035,.05,p.dark);box(x-.17,y,(j%2)*.19+.174,.035,.39,.015,p.accent);}}
    if(item.type==='crate'||item.type==='cargo'){box(0,.39,0,1.03,.78,.91,p.wood,'木箱',level===2);for(const z of [-.46,.46]){box(0,.14,z,1.04,.07,.025,p.trim);box(0,.63,z,1.04,.07,.025,p.trim);}if(level===2)box(0,.794,0,.73,.012,.66,p.light);}
    if(item.type==='rocks'){part(sphere,p.wood,-.22,.38,0,.65,.42,.54,'山石',0,item.variant*2,0,true);part(sphere,p.dark,.46,.18,.2,.27,.25,.34,'山石',0,.5,0,true);part(sphere,p.glass,-.4,.07,.3,.46,.09,.4);}
    if(item.type==='bamboo')bamboo(p);
    if(item.type==='console'){box(0,.44,0,1.5,.88,.77,p.wood,'实验台',true);box(0,.9,0,1.58,.06,.84,p.trim);box(0,1.22,.18,1.15,.55,.07,p.dark,'显示屏');box(0,1.22,.139,1.03,.43,.01,p.light);for(let n=0;n<4;n++)box(-.42+n*.24,.938,-.2,.14,.01,.09,n%2?p.accent:p.light);}
    if(item.type==='pod'){part(cylinder,p.trim,0,.27,0,.56,.54,.56,'实验基座');part(cylinder,p.dark,0,.55,0,.50,.03,.50);part(cone,p.light,0,1.2,0,.3,.75,.3,null,0,item.variant*6);part(cylinder,p.accent,0,.57,0,.54,.015,.54);}
    pose={x:0,z:0,yaw:0};
  }
  for(level=0;level<3;level++){
    base=level*5;const p=palettes[level];parent=group;
    if(level===0)box(0,-.10,0,16,.20,16,p.floor,'车站地面');else{
      for(const z of [-5.5,5.5])box(0,-.10,z,16,.20,5,p.floor,level===1?'庭院楼板':'实验室楼板');
      for(const x of [-5.5,5.5])box(x,-.10,0,5,.20,6,p.floor,level===1?'庭院楼板':'实验室楼板');
    }
    floorLines(p);
    for(const sign of [-1,1]){bounds(sign*8.08,2.5,0,.16,5,16,'中庭外墙');bounds(0,2.5,sign*8.08,16,5,.16,'中庭外墙');
      box(sign*8,.45,0,.14,.9,16,p.wall);box(0,.45,sign*8,16,.9,.14,p.wall);box(sign*8,4.65,0,.18,.7,16,p.wall);box(0,4.65,sign*8,16,.7,.18,p.wall);
      for(const v of [-7.9,0,7.9]){box(v,2.5,sign*7.97,.24,5,.22,p.trim);box(sign*7.97,2.5,v,.22,5,.24,p.trim);}
    }
    const view=landscape(level);
    for(const side of [-1,1])for(const a of [-4.05,4.05]){
      panel(view,7.45,3.45,a,2.63,side*7.98,side>0?Math.PI:0);
      panel(view,7.45,3.45,side*7.98,2.63,a,side>0?-Math.PI/2:Math.PI/2);
      for(const n of [-1,0,1]){box(a+n*2.35,2.64,side*7.91,.045,3.45,.075,p.trim);box(side*7.91,2.64,a+n*2.35,.075,3.45,.045,p.trim);}
    }
    // Unbroken rim marking, with no guardrails blocking the way between floors.
    const rim=level===2?p.light:level===1?p.trim:p.dark;
    for(const n of [-3.06,3.06]){box(n,.009,0,.055,.013,6.17,rim);box(0,.009,n,6.17,.013,.055,rim);}
    const signText=level===0?['风汀站','FENGTING STATION · 01']:level===1?['坐看云起','INK GARDEN · 02']:['折光实验室','REFRACTION LAB · 03'];
    panel(label(signText[0],signText[1],level===2?'#132139':level===1?'#eeede4':'#3e5b50',level===2?'#9cf3ed':level===1?'#475550':'#f4dfad'),5.2,1.22,0,3.78,-7.84);
    const way=label(level===0?'乘风上楼':'下一段风景','左侧气流中 Ctrl 慢飞盘旋 · 右侧通道俯冲下降',level===2?'#172b43':level===1?'#e2e5dc':'#dfdcc5',level===2?'#8beae6':'#4d7063');
    panel(way,2.8,.65,0,.018,3.65,0,-Math.PI/2);
    const detail=new THREE.Group();details.push(detail);group.add(detail);parent=detail;
    if(level===0){
      pose={x:-6.25,z:-6.25,yaw:0};box(0,1.08,0,2.3,2.16,1.65,p.dark,'售票亭');box(0,2.22,0,2.5,.14,1.85,p.wood,'售票亭顶');box(0,1.5,.836,1.65,.88,.015,p.glass);box(0,1.04,.95,1.9,.1,.4,p.wood,'售票窗口');panel(label('售票处','TICKETS','#d4c4a0','#46584c'),1.68,.39,0,2.02,.842);pose={x:0,z:0,yaw:0};
      const clock=painted(512,512,(c,w,h)=>{c.fillStyle='#dfdac5';c.fillRect(0,0,w,h);c.strokeStyle='#4b5c51';c.lineWidth=12;c.beginPath();c.arc(256,256,218,0,Math.PI*2);c.stroke();c.lineWidth=4;for(let i=0;i<12;i++){const a=i/12*Math.PI*2;c.beginPath();c.moveTo(256+185*Math.sin(a),256-185*Math.cos(a));c.lineTo(256+205*Math.sin(a),256-205*Math.cos(a));c.stroke();}c.lineWidth=10;c.beginPath();c.moveTo(180,175);c.lineTo(256,256);c.lineTo(387,215);c.stroke();});panel(clock,.85,.85,6.1,3.03,-7.86);
      panel(label('候车 · 不必匆忙','下一站，是另一种颜色。','#e2d5b2','#657469'),2.6,.61,5.9,1.46,-7.85);
      for(const x of [-5.6,5.6]){part(cylinder,p.dark,x,1.53,5.5,.035,3.06,.035,'站灯');part(cone,p.dark,x,3.1,5.5,.36,.27,.36);part(sphere,p.light,x,2.98,5.5,.12,.1,.12);}
      // Broad, soft-looking pools of afternoon light, with no shadow-map cost.
      const sunPatch=basic('#fff2cb',.10);for(let i=0;i<3;i++){panel(sunPatch,2.2,6,-5+i*4,.015,-1.2,0,-Math.PI/2);}
    }else if(level===1){
      pose={x:-6.05,z:-6.02,yaw:0};for(const x of [-.9,.9])for(const z of [-.8,.8])box(x,1.02,z,.075,2.04,.075,p.dark,'亭柱');box(0,2.05,0,2.35,.08,2.1,p.trim,'亭檐');part(cone,p.dark,0,2.35,0,1.63,.55,1.5,'亭顶',0,Math.PI/4);pose={x:0,z:0,yaw:0};
      for(let i=0;i<6;i++)part(cylinder,p.wood,-5.8+Math.sin(i)*.45,.035,-3.8+i*.53,.24,.07,.2,'踏石');
      panel(label('行至水穷处','坐看云起时','#eeede4','#5a6960'),1.35,3.25,5.85,2.45,-7.85);
      pose={x:5.85,z:-5.75,yaw:0};box(0,.08,0,1.1,.16,1.1,p.trim,'石灯底座');box(0,.48,0,.3,.7,.3,p.wood,'石灯');box(0,.95,0,.75,.32,.75,p.light,'石灯');part(cone,p.dark,0,1.23,0,.69,.32,.69,'石灯顶',0,Math.PI/4);pose={x:0,z:0,yaw:0};
    }else{
      pose={x:-6,z:-6,yaw:0};box(0,.42,0,2.25,.84,1.6,p.wood,'主控制台',true);box(0,.87,0,2.3,.08,1.65,p.trim);for(let i=0;i<3;i++){box(-.7+i*.7,1.4,.36,.61,.85,.07,p.dark,'主控制屏');box(-.7+i*.7,1.4,.313,.53,.74,.01,i%2?p.accent:p.light);}pose={x:0,z:0,yaw:0};
      const torusGeo=new THREE.TorusGeometry(.98,.032,6,36),torus=new THREE.Mesh(torusGeo,p.light);torus.position.set(5.7,base+2,-5.3);torus.userData.kind='发光圆环';torus.userData.bounds=new THREE.Box3().setFromObject(torus);colliders.push(torus);detail.add(torus);allGeometries.add(torusGeo);
      for(const x of [4.72,6.68])box(x,.48,-5.3,.05,.96,.05,p.trim,'圆环支架');
      const holo=new THREE.Mesh(new THREE.OctahedronGeometry(.52),new THREE.MeshBasicMaterial({color:'#ed9bdd',wireframe:true}));holo.position.set(5.7,base+1.6,5.7);detail.add(holo);allMaterials.add(holo.material);allGeometries.add(holo.geometry);animations.push(holo);part(cylinder,p.trim,5.7,.21,5.7,.72,.42,.72,'全息底座');
      for(const x of [-7.7,7.7])for(const z of [-6,-3,0,3,6])box(x,2,z,.035,2.6,.035,z%2?p.light:p.accent);
    }
    for(const item of layouts[level].items)prop(item,p);
    parent=group;
    // Large, intentionally clear landing pads on the cross-shaped walkways.
    const landingMat=label('歇一会儿','SAFE LANDING',level===2?'#1a3448':level===1?'#dce1d7':'#c9c9ae',level===2?'#89dace':'#6c7a68');
    for(const x of [-5.55,5.55])panel(landingMat,1.65,.55,x,.021,0,0,-Math.PI/2);
  }
  base=0;level=2;parent=group;pose={x:0,z:0,yaw:0};
  const spiralMat=basic('#628f7f',.52);
  for(const radius of [1.25,2.14])part(new THREE.RingGeometry(radius,radius+.035,64,1,.3,Math.PI*1.7),spiralMat,-.65,.025,0,1,1,1,null,-Math.PI/2);
  box(0,15.04,0,16,.08,16,palettes[2].dark,'采光顶');
  panel(landscape(2),5.7,5.7,0,14.986,0,0,Math.PI/2);
  for(const batch of batches.values()){const m=new THREE.InstancedMesh(batch.geo,batch.mat,batch.matrices.length);batch.matrices.forEach((matrix,i)=>m.setMatrixAt(i,matrix));m.instanceMatrix.needsUpdate=true;batch.parent.add(m);}
  for(const o of outlines.values()){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(o.vertices,3));const mat=new THREE.LineBasicMaterial({color:o.color,transparent:true,opacity:.43});allGeometries.add(geo);allMaterials.add(mat);o.parent.add(new THREE.LineSegments(geo,mat));}
  // World-space streaks mark a smooth upward column; the right side stays calm.
  const airPositions=new Float32Array(72*6),airGeo=new THREE.BufferGeometry();airGeo.setAttribute('position',new THREE.BufferAttribute(airPositions,3).setUsage(THREE.DynamicDrawUsage));const airMat=new THREE.LineBasicMaterial({color:'#97c7ba',transparent:true,opacity:.4,depthWrite:false});const air=new THREE.LineSegments(airGeo,airMat);air.frustumCulled=false;group.add(air);allGeometries.add(airGeo);allMaterials.add(airMat);
  const hemi=new THREE.HemisphereLight('#edf2ff','#62726d',.85),sun=new THREE.DirectionalLight('#ffedcc',1.65);sun.position.set(-10,18,4);group.add(hemi,sun);
  let time=0;
  function update(dt,y){time+=dt;const active=R.floorAt(y);details.forEach((g,i)=>g.visible=Math.abs(i-active)<=1);for(const m of animations){m.rotation.y+=dt*.5;m.rotation.z+=dt*.17;}
    airMat.color.set(active===2?'#7ed9e1':active===1?'#90a199':'#a8d9cb');for(let i=0;i<72;i++){const angle=i*2.399+time*.38,r=.55+(i%9)*.19,x=-.65+Math.cos(angle)*r,z=Math.sin(angle)*r,h=(i*.207+time*1.7)%14.6;const j=i*6;airPositions[j]=x;airPositions[j+1]=h;airPositions[j+2]=z;airPositions[j+3]=x+.015;airPositions[j+4]=h+.19;airPositions[j+5]=z+.009;}airGeo.attributes.position.needsUpdate=true;
  }
  update(0,1);group.updateMatrixWorld(true);
  return {group,colliders,layouts,details,seed,width:16,depth:16,height:15,trees:[],houses:[],ground:R.ground,floorAt:R.floorAt,draft:R.draft,update,
    dispose(){for(const g of allGeometries)g.dispose();for(const m of allMaterials){if(m.map)m.map.dispose();m.dispose();}}
  };
}
