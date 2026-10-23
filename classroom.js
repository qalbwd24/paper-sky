/* A stylized Chinese senior-high classroom. One unit = one metre. */
function buildClassroom(renderer){
  const group=new THREE.Group(),colliders=[],desks=[],fans=[],batches=new Map();
  const W=8.4,D=10.4,H=3.6,boxGeo=new THREE.BoxGeometry(1,1,1);
  const mat=(color)=>new THREE.MeshStandardMaterial({color,roughness:.86});
  const p={wall:mat('#e5e1d5'),lower:mat('#c5cfbd'),trim:mat('#a1a99c'),wood:mat('#bf8850'),edge:mat('#865b37'),metal:mat('#59665f'),chair:mat('#a87648'),ceiling:mat('#eeeadd'),curtain:mat('#829a90'),door:mat('#965f42'),frame:mat('#b7c2bb'),bookRed:mat('#a4554c'),bookBlue:mat('#628c9a'),bookGreen:mat('#85945e'),pages:mat('#eee7d5')};
  function canvasMat(w,h,paint){const c=document.createElement('canvas');c.width=w;c.height=h;paint(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());return new THREE.MeshStandardMaterial({map:t,roughness:1});}
  function box(x,y,z,w,h,d,material,kind=null,shadow=true){
    let batch=batches.get(material.uuid);if(!batch){batch={mat:material,items:[],shadow};batches.set(material.uuid,batch);}
    batch.items.push({x,y,z,w,h,d});
    if(kind)colliders.push({bounds:new THREE.Box3(new THREE.Vector3(x-w/2,y-h/2,z-d/2),new THREE.Vector3(x+w/2,y+h/2,z+d/2)),kind});
  }
  function panel(material,w,h,x,y,z,ry=0){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),material);m.position.set(x,y,z);m.rotation.y=ry;m.receiveShadow=true;group.add(m);return m;}
  const floorMat=canvasMat(1024,1024,(ctx,w,h)=>{ctx.fillStyle='#b5b7ac';ctx.fillRect(0,0,w,h);let s=44;const r=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};for(let i=0;i<13000;i++){ctx.fillStyle=['#d7d7cc','#989e96','#bcc2b6','#878f87'][i%4];ctx.beginPath();ctx.ellipse(r()*w,r()*h,1+r()*2,1+r()*2,r()*3,0,Math.PI*2);ctx.fill();}ctx.strokeStyle='#868f8560';ctx.lineWidth=2;ctx.strokeRect(0,0,w,h);});
  floorMat.map.wrapS=floorMat.map.wrapT=THREE.RepeatWrapping;floorMat.map.repeat.set(W/.65,D/.65);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(W,D),floorMat);floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;group.add(floor);
  box(0,H+.07,0,W+.2,.14,D+.2,p.ceiling,'天花板');
  box(0,H/2,-D/2-.07,W+.2,H,.14,p.wall,'前墙');box(0,H/2,D/2+.07,W+.2,H,.14,p.wall,'后墙');
  box(W/2+.07,H/2,0,.14,H,D,p.wall,'侧墙');
  box(0,.52,-D/2+.005,W,1.04,.035,p.lower);box(0,.52,D/2-.005,W,1.04,.035,p.lower);box(W/2-.005,.52,0,.035,1.04,D,p.lower);
  // Genuine window openings, with solid glass and visible courtyard beyond.
  box(-W/2-.07,.55,0,.14,1.1,D,p.wall,'窗下墙');box(-W/2-.07,3.22,0,.14,.76,D,p.wall,'窗上墙');
  box(-W/2+.01,.5,0,.035,1,D,p.lower);box(-W/2+.04,1.10,0,.11,.07,D,p.trim,'窗台');
  const glass=new THREE.MeshBasicMaterial({color:'#bad9d6',transparent:true,opacity:.17,depthWrite:false});
  for(const z of [-3.4,0,3.4]){
    box(-W/2,1.94,z,.045,1.7,2.7,glass,'窗玻璃',false);
    for(const edge of [-1,1]){box(-W/2+.02,1.96,z+edge*1.39,.13,1.88,.065,p.frame,'窗框');}
    for(const y of [1.13,2.05,2.82])box(-W/2+.02,y,z,.13,.055,2.8,p.frame,'窗框');
    box(-W/2+.02,1.98,z,.14,1.7,.055,p.frame,'窗框');
    for(const side of [-1,1]){for(let j=0;j<5;j++)box(-W/2+.19+j%2*.035,1.91,z+side*(1.35-j*.039),.06,1.96,.05,p.curtain,null,false);}
  }
  for(const z of [-5.08,-1.7,1.7,5.08])box(-W/2-.04,1.95,z,.16,1.78,.5,p.wall,'窗间墙');
  for(const z of [-3.95,3.95]){box(W/2-.11,1.04,z,.085,2.08,.96,p.door,'教室门');box(W/2-.17,1.51,z,.02,.5,.48,p.frame);box(W/2-.2,1.51,z,.025,.43,.4,mat('#a8c0bb'));box(W/2-.23,.96,z-.3,.08,.025,.14,p.edge);}
  box(0,1.06,-D/2+.025,W,.04,.055,p.trim);box(0,.04,-D/2+.05,W,.08,.10,p.trim);box(0,.04,D/2-.05,W,.08,.10,p.trim);
  const chalk=canvasMat(2048,640,(ctx,w,h)=>{ctx.fillStyle='#254e43';ctx.fillRect(0,0,w,h);ctx.fillStyle='#ffffff06';for(let i=0;i<180;i++)ctx.fillRect((i*137)%w,(i*53)%h,80,2);ctx.fillStyle='#e3e6c9';ctx.font='46px KaiTi, STKaiti, serif';ctx.fillText('第二章  函数与导数',80,83);ctx.font='35px KaiTi, STKaiti, serif';['例：已知 f(x) = x² − 3x + 2','求函数的单调区间与最小值。','解：f′(x) = 2x − 3','令 f′(x) = 0，得 x = 3/2','∴ f(x)min = f(3/2) = −1/4'].forEach((t,i)=>ctx.fillText(t,95,167+i*77));ctx.strokeStyle='#d4e2c5';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(1120,486);ctx.lineTo(1570,486);ctx.moveTo(1280,535);ctx.lineTo(1280,143);ctx.stroke();ctx.beginPath();for(let x=-150;x<230;x++){const y=484-(x-60)*(x-60)/180;if(x===-150)ctx.moveTo(1280+x,y);else ctx.lineTo(1280+x,y);}ctx.stroke();ctx.fillText('x',1580,497);ctx.fillText('y',1270,120);ctx.fillStyle='#dbc78f';ctx.font='30px KaiTi, serif';ctx.fillText('作业',1710,140);ctx.fillText('课本 P.48',1670,204);ctx.fillText('第 3、5 题',1670,263);ctx.fillText('先独立思考',1660,443);});
  box(0,1.98,-5.115,4.65,1.43,.095,p.frame,'黑板');panel(chalk,4.49,1.28,0,1.99,-5.055);
  box(0,1.25,-4.99,4.68,.045,.18,p.frame,'粉笔槽');for(let i=0;i<5;i++)box(-1+i*.06,1.282,-4.94,.045,.012,.012,i===3?mat('#e6bc98'):p.pages);
  box(.8,1.29,-4.94,.14,.038,.06,p.edge);
  const slogan=canvasMat(1536,140,(ctx,w,h)=>{ctx.fillStyle='#e5e1d5';ctx.fillRect(0,0,w,h);ctx.fillStyle='#9d4941';ctx.textAlign='center';ctx.font='58px KaiTi, serif';ctx.fillText('博学笃志       切问近思',w/2,97);});panel(slogan,5.1,.46,0,2.99,-5.11);
  const flag=canvasMat(400,267,(ctx,w,h)=>{ctx.fillStyle='#ba3935';ctx.fillRect(0,0,w,h);ctx.fillStyle='#f4d26e';function star(x,y,r,rot){ctx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5+rot;ctx.lineTo(x+Math.cos(a)*r*(i%2?.4:1),y+Math.sin(a)*r*(i%2?.4:1));}ctx.closePath();ctx.fill();}star(67,69,30,0);for(const [x,y,a] of [[122,27,.3],[146,56,-.15],[145,94,.2],[119,122,.45]])star(x,y,10,a);});panel(flag,.5,.334,0,3.03,-5.09);
  const clock=canvasMat(256,256,(ctx,w,h)=>{ctx.fillStyle='#e8e7db';ctx.fillRect(0,0,w,h);ctx.fillStyle='#f8f7ed';ctx.strokeStyle='#596a61';ctx.lineWidth=10;ctx.beginPath();ctx.arc(128,128,116,0,7);ctx.fill();ctx.stroke();ctx.lineWidth=3;for(let i=0;i<12;i++){const a=i*Math.PI/6;ctx.beginPath();ctx.moveTo(128+Math.sin(a)*98,128-Math.cos(a)*98);ctx.lineTo(128+Math.sin(a)*108,128-Math.cos(a)*108);ctx.stroke();}ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(128,128);ctx.lineTo(168,161);ctx.moveTo(128,128);ctx.lineTo(45,128);ctx.stroke();});panel(clock,.36,.36,3.02,2.83,-5.115);
  const schedule=canvasMat(400,580,(ctx,w,h)=>{ctx.fillStyle='#f5f0db';ctx.fillRect(0,0,w,h);ctx.fillStyle='#526b5b';ctx.textAlign='center';ctx.font='37px KaiTi, serif';ctx.fillText('高二（3）班',200,58);ctx.font='31px KaiTi, serif';ctx.fillText('课程表',200,117);ctx.strokeStyle='#a9b6a3';for(let x=30;x<=370;x+=68){ctx.beginPath();ctx.moveTo(x,150);ctx.lineTo(x,525);ctx.stroke();}for(let y=150;y<=525;y+=53){ctx.beginPath();ctx.moveTo(30,y);ctx.lineTo(370,y);ctx.stroke();}ctx.font='22px KaiTi, serif';for(let r=0;r<7;r++)for(let c=0;c<5;c++)ctx.fillText(['数学','语文','英语','物理','化学'][(r+c*2)%5],64+c*68,184+r*53);});panel(schedule,.52,.75,3.27,1.78,-5.105);
  // Lectern, low teaching platform, a textbook and a water cup.
  box(0,.07,-4.5,5.6,.14,1.20,p.edge,'讲台台阶');box(0,.62,-4.37,1.15,.98,.54,p.wood,'讲桌');box(0,1.145,-4.37,1.25,.07,.66,p.edge,'讲桌桌面');box(.27,1.20,-4.32,.23,.05,.31,p.bookBlue,'讲台课本');
  const bottleGeo=new THREE.CylinderGeometry(.028,.031,.22,10),bottleMat=mat('#91b6b3');
  const seatCols=[-3.12,-2.40,-.36,.36,2.40,3.12];
  for(let row=0;row<7;row++)for(let col=0;col<6;col++){
    const x=seatCols[col],z=-2.8+row*.95;
    desks.push({x,z,width:.60,depth:.42,height:.75});
    box(x,.725,z,.60,.05,.42,p.wood,'课桌桌面');box(x,.60,z,.52,.20,.35,p.edge,'课桌抽屉');
    for(const a of [-1,1])for(const b of [-1,1])box(x+a*.25,.32,z+b*.155,.027,.64,.027,p.metal,'课桌腿');
    const cz=z+.49;box(x,.43,cz,.37,.04,.36,p.chair,'椅面');box(x,.64,cz+.16,.37,.26,.033,p.chair,'椅背');
    for(const a of [-1,1])for(const b of [-1,1])box(x+a*.15,.215,cz+b*.135,.023,.43,.023,p.metal,'椅腿');
    for(const a of [-1,1])box(x+a*.145,.59,cz+.16,.023,.37,.024,p.metal,'椅背支架');
    // Small books and pencases vary by desk, with physical A4-sized sheets.
    const n=row*6+col;if(n%3!==0){for(let k=0;k<2+n%3;k++)box(x-.14,.765+k*.026,z-.055,.18,.024,.24,k%2?p.pages:[p.bookRed,p.bookBlue,p.bookGreen][n%3],'课本');}
    if(n%2===0){const page=panel(p.pages,.21,.297,x+.11,.756,z+.015);page.rotation.x=-Math.PI/2;box(x+.12,.767,z+.05,.15,.012,.009,p.bookBlue);}
    if(n%5===0){const m=new THREE.Mesh(bottleGeo,bottleMat);m.position.set(x+.23,.865,z-.11);group.add(m);colliders.push({bounds:new THREE.Box3(new THREE.Vector3(x+.20,.75,z-.14),new THREE.Vector3(x+.26,.98,z-.08)),kind:'水杯'});}
    if(n%4===1)box(x+.15,.777,z-.12,.15,.045,.06,p.bookBlue,'文具盒');
  }
  // Back wall: class bulletin, storage, books and cleaning tools.
  const backBoard=canvasMat(1536,560,(ctx,w,h)=>{ctx.fillStyle='#315e4c';ctx.fillRect(0,0,w,h);ctx.fillStyle='#e7d7a5';ctx.font='70px KaiTi, serif';ctx.textAlign='center';ctx.fillText('把每一次努力，写进青春',w/2,120);ctx.font='35px KaiTi, serif';ctx.fillStyle='#dbe4ce';ctx.fillText('学习园地                     值日安排',w/2,235);ctx.font='29px KaiTi, serif';ctx.fillText('善思 · 笃行 · 求真',w/2,437);ctx.strokeStyle='#adc8a0';ctx.lineWidth=3;ctx.strokeRect(120,275,430,100);ctx.strokeRect(965,275,430,100);});panel(backBoard,4.8,1.55,0,2.07,5.10,Math.PI);
  box(-2.9,.63,4.75,1.1,1.26,.40,p.wood,'图书柜');for(let i=0;i<11;i++)box(-3.36+i*.087,.91,4.50,.065,.31+(i%3)*.025,.17,[p.bookBlue,p.bookRed,p.bookGreen][i%3],'图书角书本');
  box(3.45,.26,4.67,.32,.52,.32,p.trim,'垃圾桶');box(3.74,.65,4.95,.027,1.3,.027,p.edge,'扫帚');box(3.74,.13,4.95,.20,.25,.045,p.chair,'扫帚');
  // Overhead lamps and ceiling fans.
  const luminous=new THREE.MeshBasicMaterial({color:'#fff8df'});
  for(const x of [-2.6,0,2.6])for(const z of [-2.8,0,2.8]){box(x,3.36,z,1.18,.06,.17,p.frame,'日光灯');box(x,3.319,z,1.10,.009,.115,luminous,null,false);for(const a of [-1,1])box(x+a*.43,3.48,z,.008,.23,.008,p.metal);}
  for(const x of [-1.5,1.5])for(const z of [-1.45,2.3]){box(x,3.35,z,.04,.45,.04,p.metal,'吊扇');const g=new THREE.Group();g.position.set(x,3.14,z);for(let i=0;i<3;i++){const arm=new THREE.Group();arm.rotation.y=i*2*Math.PI/3;const blade=new THREE.Mesh(new THREE.BoxGeometry(.14,.012,.44),p.frame);blade.position.z=.24;arm.add(blade);g.add(arm);}group.add(g);fans.push(g);colliders.push({bounds:new THREE.Box3(new THREE.Vector3(x-.49,3.115,z-.49),new THREE.Vector3(x+.49,3.175,z+.49)),kind:'吊扇叶片'});}
  // Outside the side windows, a simple leafy courtyard and neighbouring building.
  const foliage=mat('#83996e');for(let i=0;i<9;i++){const m=new THREE.Mesh(new THREE.IcosahedronGeometry(.8,1),foliage);m.position.set(-6.5-(i%2)*1.3,1.5+(i%3)*.25,-5+i*1.3);group.add(m);}
  box(-11,2.3,0,.3,4.6,17,mat('#cfc8b4'));for(let z=-7;z<8;z+=1.1)for(let y=1;y<4;y+=1.5)box(-10.82,y,z,.035,.7,.7,mat('#a4bdb9'));
  // Draw repeated furniture in batches, retaining separate cheap collision boxes.
  const dummy=new THREE.Object3D();for(const batch of batches.values()){const mesh=new THREE.InstancedMesh(boxGeo,batch.mat,batch.items.length);batch.items.forEach((v,i)=>{dummy.position.set(v.x,v.y,v.z);dummy.scale.set(v.w,v.h,v.d);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});mesh.castShadow=batch.shadow;mesh.receiveShadow=true;group.add(mesh);}
  group.add(new THREE.HemisphereLight('#fff6df','#8e9b8a',1.65));
  const light=new THREE.DirectionalLight('#ffe2ac',2.25);light.position.set(-8,4,2);light.target.position.set(2,0,-1);light.castShadow=true;light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-8,right:8,top:8,bottom:-8,near:.2,far:28});light.shadow.bias=-.0003;light.shadow.normalBias=.015;group.add(light,light.target);
  group.updateMatrixWorld(true);
  return {group,colliders,desks,fans,width:W,depth:D,height:H,ground:()=>0,trees:[],houses:[]};
}
