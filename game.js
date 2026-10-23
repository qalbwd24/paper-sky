/* Local flight engine. World geometry and paper skins live in their own files. */
(()=>{'use strict';
const $=id=>document.getElementById(id),C=FlightCore;
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas:$('world'),antialias:true,logarithmicDepthBuffer:true,powerPreference:'low-power'});}catch(e){$('error').hidden=false;$('error').textContent='3D 画面未能启动：'+e.message;return;}
renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.012,100);
const plane=createPaperPlane(renderer);scene.add(plane);
const effects=new FlightEffects(scene,renderer),worlds={},combat=new PaperCombat(scene,plane);
const profiles={labyrinth:Labyrinth.flightProfile,atrium:{speedScale:.10,turnRate:1.8,windScale:.015},classroom:{speedScale:.10,turnRate:1.8,windScale:.025},valley:{speedScale:1,turnRate:.75,windScale:1}};
let sceneId='atrium',world,profile=profiles.atrium,atriumSeed=73021,startFloor=0,mazeFloor=3,mazeSeed=73021,liftSpeed=0;
try{mazeSeed=Number(localStorage.getItem("paper-maze-seed"))||73021;}catch{}
let watched=-1,viewFirstPerson=false,viewPose=null,viewToken='';
let net=null;
const safeHistory=[];let checkpointTime=0,launchAge=10,lastRecovery=false,trapCount=0;
const isIndoor=()=>sceneId==='atrium'||sceneId==='classroom';
try{atriumSeed=Number(localStorage.getItem('paper-atrium-seed'))||73021;}catch{}
const s={x:0,y:0,z:0,yaw:0,pitch:0,bank:0,speed:0,distance:0,acceleration:0,climbInput:0,boostControl:0},previous={...s};let visual={...s};
let mode='ready',pause=false,quality='high',lastHit=null,frameCount=0,frameWindow=0,fps=0,lastTime=0,lastRender=0,accumulator=0,hudElapsed=0,flightTime=0,motion=.35,windEnabled=true,renderDt=0;
let wind={x:0,y:0,z:0,gust:0};
const keys=new Set(),raycaster=new THREE.Raycaster(),ray=new THREE.Ray(),hitPoint=new THREE.Vector3(),cameraFollow={yaw:0,pitch:0,distance:.64,fov:58};
const cameraPos=new THREE.Vector3(),cameraLook=new THREE.Vector3();
const contact=new FlightContact();

function notify(text){$('toast').textContent=text;$('toast').style.opacity=1;clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('toast').style.opacity=0,3300);}
function setMode(m){mode=m;$('welcome').hidden=m!=='ready';$('landing').hidden=m!=='landed';$('flightState').textContent=m==='flying'?'自由飞行':m==='landed'?'停留看景':'等待出发';}
function setPause(value){if(net?.active){keys.clear();pause=false;$('paused').hidden=true;if(value)notify('联机不会暂停其他玩家，松开按键继续滑翔');return;}pause=value;keys.clear();accumulator=0;Object.assign(previous,s);$('paused').hidden=!pause;}
function syncFlightSetup(){if(net?.active){plane.scale.setScalar(5.6);profile=net.isHunter?ChaseNetPhysics.hunter:ChaseNetPhysics.runner;return;}plane.scale.setScalar(sceneId==='labyrinth'?5.6:.7);profile=sceneId==='labyrinth'&&combat.enabled&&world.floorAt(s.y)===3?(combat.mode==='race'?combat.race.profile():Labyrinth.combatProfile):profiles[sceneId];}
function reset(){if(net?.active){notify('联机由房主重新开始，捕获后自动换位');return;}contact.reset();watched=-1;viewPose=null;viewToken='';combat.spectatedId=-1;document.body.classList.remove('spectating');$('viewTarget').value='player';$('viewMode').hidden=true;$('viewInfo').hidden=true;world.reset?.();plane.userData.resetPose();launchAge=10;lastRecovery=false;trapCount=0;safeHistory.length=0;checkpointTime=0;Object.assign(s,sceneId==='labyrinth'?world.spawn(mazeFloor):sceneId==='atrium'?{x:0,y:startFloor*5+1.45,z:6.2,yaw:0}:sceneId==='classroom'?{x:-1.35,y:1.55,z:3.65,yaw:0}:{x:185,y:C.heightAt(185,465)+28,z:465,yaw:.08});Object.assign(s,{pitch:0,bank:0,speed:0,distance:0,acceleration:0,climbInput:0,boostControl:0});syncFlightSetup();lastHit=null;liftSpeed=0;effects.reset();flightTime=0;wind={x:0,y:0,z:0,gust:0};setPause(false);setMode('ready');visual={...s};syncPlane();updateCamera(1,true);combat.configure(world,sceneId==='labyrinth',s);hud();}
function chooseScene(id){
  sceneId=profiles[id]?id:'atrium';profile=profiles[sceneId];
  if(world)scene.remove(world.group);
  world=worlds[sceneId]||(worlds[sceneId]=sceneId==='labyrinth'?buildLabyrinth(mazeSeed):sceneId==='atrium'?buildAtrium(renderer,atriumSeed):sceneId==='classroom'?buildClassroom(renderer):buildValley());scene.add(world.group);
  const indoor=isIndoor(),tower=sceneId==='atrium',maze=sceneId==='labyrinth';scene.background=new THREE.Color(tower?'#c7d5d1':indoor?'#c7dce2':'#bdd8dc');scene.fog=indoor?null:new THREE.Fog('#bdd8dc',580,2200);camera.far=maze?world.viewDistance:indoor?80:2800;camera.updateProjectionMatrix();renderer.shadowMap.enabled=sceneId==='classroom'&&quality!=='low'&&quality!=='pixel';
  $('scene').value=sceneId;$('mazeFloor').value=mazeFloor;for(const id of ['combatMode','raceRole','enemyColor','aimAssist','viewTarget'])$(id).hidden=!maze;$('raceRole').hidden=!maze||combat.mode!=='race';$('aimAssist').hidden=!maze||combat.mode==='race';$('mazeFloor').hidden=!maze;$('shuffleMaze').hidden=!maze;$('layoutButton').hidden=!maze;$('startFloor').hidden=!tower;$('shuffle').hidden=!tower;
  $('welcomeTitle').innerHTML=maze?'折纸都会，<br>追风练习。':tower?'一层一世界，<br>乘风去楼上。':indoor?'下课以后，<br>再飞一会儿。':'借一点风，<br>去山的另一边。';
  $('welcomeDescription').innerHTML=maze?'不限时追逐赛：Shift 加速，Ctrl 减速。<br>追近并保持锁定，自动发射导弹捕获；也可选择逃逸机。':tower?'旧车站 · 水墨庭院 · 霓虹实验室<br>进入中庭气流，按 Ctrl 慢飞盘旋升层。':indoor?'一张写满演算的 A4 纸，<br>穿过课桌，掠过窗边的阳光。':'掠过屋顶，沿着河流下降，<br>松开按键，顺着风缓缓滑翔。';
  $('mapLabel').textContent=maze?'五层迷境 / LABYRINTH':tower?'三重中庭 / ATRIUM':indoor?'教室 / CLASSROOM':'晴湾 / QINGWAN';$('mapCanvas').setAttribute('aria-label',maze?'当前迷境路线图':tower?'当前楼层小地图':indoor?'教室小地图':'山谷小地图');document.body.classList.toggle('atrium',tower);document.body.classList.toggle('labyrinth',maze);
  try{localStorage.setItem('paper-scene',sceneId);}catch{}reset();resize();
}
function shuffleAtrium(){
  if(sceneId!=='atrium')return;
  scene.remove(world.group);world.dispose();delete worlds.atrium;
  atriumSeed=(Math.imul(atriumSeed,1664525)+1013904223)>>>0;
  try{localStorage.setItem('paper-atrium-seed',String(atriumSeed));}catch{}
  chooseScene('atrium');notify('布局已更换，宽走道和落脚区仍然保留。');$('world').focus();
}
function launchProfile(age){if(age>=3)return profile;const t=C.clamp(age/3,0,1),ease=t*t*(3-2*t);return {...profile,cruiseSpeed:8+((profile.cruiseSpeed||23)-8)*ease,trimPitch:C.trimPitch*ease};}
// Check a real launch arc, with margin at the wings and nose, before placing the plane.
function collisionRay(a,b){const d=b.clone().sub(a),length=d.length();if(length<1e-8)return false;d.divideScalar(length);if(world.raycast)return !!world.raycast(a,d,length);const r=new THREE.Ray(a,d),p=new THREE.Vector3();for(const obj of world.colliders){const bounds=obj.bounds||obj.userData.bounds;if(!obj.isMesh&&bounds.containsPoint(a))return true;if(!r.intersectBox(bounds,p)||p.distanceTo(a)>length+.015)continue;if(!obj.isMesh)return true;raycaster.set(a,d);raycaster.near=0;raycaster.far=length+.015;if(raycaster.intersectObject(obj,false).length)return true;}return false;}
function clearLaunch(p,yaw){
  const outside=q=>sceneId==='labyrinth'&&(q.x < world.plan.bounds.min.x+30||q.x>world.plan.bounds.max.x-30||q.z<world.plan.bounds.min.z+30||q.z>world.plan.bounds.max.z-30||q.y < -60||q.y>world.height-35);if(outside(p))return false;
  const q={...s,...p,yaw,pitch:.10,bank:0,speed:8*profile.speedScale,climbInput:0},margin=isIndoor()?.13:Math.max(.65,plane.scale.x*.16);
  const offsets=[[0,0,0],[margin,0,0],[-margin,0,0],[0,margin,0],[0,-margin,0],[0,0,margin],[0,0,-margin]];
  for(const offset of offsets){const a=new THREE.Vector3(p.x,p.y,p.z),b=a.clone().add(new THREE.Vector3(...offset));if(collisionRay(a,b))return false;}
  for(let i=0;i<42;i++){const old=new THREE.Vector3(q.x,q.y,q.z);C.advance(q,{left:0,right:0,pitch:0,boost:false,slow:false},.07,launchProfile((i+1)*.07));const now=new THREE.Vector3(q.x,q.y,q.z);if(outside(q))return false;if(q.y<world.ground(q.x,q.z,q.y)+margin)return false;
    if(sceneId==='valley'&&world.trees.some(t=>q.y<t.y+t.h*1.225&&Math.hypot(q.x-t.x,q.z-t.z)<t.s+margin))return false;
    for(const offset of offsets){const v=new THREE.Vector3(...offset);if(collisionRay(old.clone().add(v),now.clone().add(v)))return false;}
  }return true;
}
function recoverySpawn(){return sceneId==='labyrinth'?world.spawn(world.floorAt(s.y)):sceneId==='atrium'?{x:0,y:world.floorAt(s.y)*5+1.45,z:6.2,yaw:0}:sceneId==='classroom'?{x:-1.35,y:1.55,z:3.65,yaw:0}:{x:185,y:C.heightAt(185,465)+28,z:465,yaw:.08};}
function recoverLaunch(){
  if(trapCount>0){Object.assign(s,recoverySpawn());safeHistory.length=0;trapCount=0;return '连续碰撞：已回到本层安全起点，低速重新起飞。';}
  // Prefer a genuinely earlier open flight segment over a nearby wall-facing point.
  for(let i=safeHistory.length-1;i>=0;i--){const p=safeHistory[i];if(Math.hypot(p.x-s.x,p.y-s.y,p.z-s.z)<(isIndoor()?1.4:18))continue;for(const angle of [0,.6,-.6,Math.PI])if(clearLaunch(p,p.yaw+angle)){Object.assign(s,p,{yaw:p.yaw+angle});return '已退回开阔航段，低速重新起飞。';}}
  const n=lastHit.normal,margin=isIndoor()?.26:1.5,origin={x:s.x+n.x*margin,y:s.y+n.y*(n.y>.5?(isIndoor()?.8:5):margin),z:s.z+n.z*margin};origin.y=Math.max(origin.y,world.ground(origin.x,origin.z,origin.y)+(isIndoor()?.55:3));
  const heading=Math.abs(n.y)<.6?Math.atan2(-n.x,-n.z):s.yaw;
  for(const angle of [0,.4,-.4,.8,-.8,Math.PI/2,-Math.PI/2,Math.PI,2.4,-2.4])if(clearLaunch(origin,heading+angle)){Object.assign(s,origin,{yaw:heading+angle});return '已检查前方净空，低速重新起飞。';}
  Object.assign(s,recoverySpawn());safeHistory.length=0;return '角落空间不足，已回到本层安全起点。';
}
function launch(){if(mode==='flying')return;
  contact.reset();lastRecovery=!!lastHit;if(lastHit)notify(recoverLaunch());launchAge=0;s.pitch=.10;
  s.speed=8*profile.speedScale;s.climbInput=0;s.boostControl=0;s.bank=0;s.acceleration=0;lastHit=null;liftSpeed=0;effects.reset();setPause(false);setMode('flying');if($('sound').getAttribute('aria-pressed')==='true')ensureAudio();$('world').focus();
}
function land(kind,normal=new THREE.Vector3(0,1,0)){if(mode==='flying'&&lastRecovery&&launchAge<4)trapCount++;s.speed=0;s.acceleration=0;lastHit={kind,normal};Object.assign(previous,s);setMode('landed');$('landingTitle').textContent=kind.includes('课桌')?'在草稿旁，歇一会儿。':kind==='屋顶'?'在屋顶上，歇一会儿。':'在这里，歇一会儿。';$('landingText').textContent='碰到了'+kind+'。AD / JL 调整方向，空格再次起飞。';}
function boxNormal(p,b){let best=Infinity,n=new THREE.Vector3();for(const axis of ['x','y','z'])for(const side of ['min','max']){const d=Math.abs(p[axis]-b[side][axis]);if(d<best){best=d;n.set(0,0,0);n[axis]=side==='min'?-1:1;}}return n;}
function surfaceRay(a,dir,length){
 if(world.raycast)return world.raycast(a,dir,length);
 let best=null;ray.set(a,dir);
 for(const obj of world.colliders){const bounds=obj.bounds||obj.userData.bounds;
  if(!ray.intersectBox(bounds,hitPoint)||hitPoint.distanceTo(a)>length+.00001)continue;
  let distance=hitPoint.distanceTo(a),normal=boxNormal(hitPoint,bounds);
  if(obj.isMesh){raycaster.set(a,dir);raycaster.near=0;raycaster.far=length;const h=raycaster.intersectObject(obj,false)[0];if(!h)continue;distance=h.distance;normal=h.face.normal.clone().transformDirection(obj.matrixWorld);if(normal.dot(dir)>0)normal.negate();}
  if(!best||distance<best.distance)best={distance,fraction:distance/length,normal,kind:obj.kind||obj.userData.kind||'建筑'};
 }
 if(sceneId==='valley'){const steps=Math.max(1,Math.ceil(length/.15));for(let i=0;i<=steps;i++){const p=a.clone().addScaledVector(dir,length*i/steps);for(const tr of world.trees){if(p.y<tr.y||p.y>tr.y+tr.h*1.225)continue;const r=p.y<tr.y+tr.h*.35?.8:Math.max(.5,tr.s*(1-(p.y-tr.y-tr.h*.325)/(tr.h*.9)));if(Math.hypot(p.x-tr.x,p.z-tr.z)<r&&(!best||i/steps<best.fraction))best={distance:length*i/steps,fraction:i/steps,normal:new THREE.Vector3(p.x-tr.x,0,p.z-tr.z).normalize(),kind:'树木'};}}}
 return best;
}
function sweep(old,dt){
 const shape=FlightContact.shape(plane);
 const hit=contact.move(old,s,dt,{...shape,...(combat.race.active?(combat.race.role==='hunter'?{tangentRetention:.70,wallBounce:.07,groundBounce:.10}:{tangentRetention:.90,wallBounce:.11,groundBounce:.13}):{}),sweepHull:world.sweepHull,raycast:surfaceRay,ground:world.ground});
 if(hit&&sceneId==='labyrinth'&&combat.enabled)combat.burst(hit.position,hit.normal,contact.velocity,0xe9debf,3,true,.22);
}
const held=(...codes)=>codes.some(code=>keys.has(code))?1:0;
function physics(dt){if(net?.active){syncFlightSetup();net.step(dt);flightTime+=dt;return;}if(pause)return;if(watched>=0){combat.update(dt,s,false,true);return;}const left=held('KeyA','KeyJ','ArrowLeft'),right=held('KeyD','KeyL','ArrowRight');if(mode!=='flying'){if(mode==='landed')s.yaw+=(left-right)*dt;return;}
  syncFlightSetup();launchAge+=dt;if(launchAge>4){lastRecovery=false;trapCount=0;}const old={...s};C.advance(s,{left,right,pitch:held('KeyW','KeyI','ArrowUp')-held('KeyS','KeyK','ArrowDown'),boost:combat.race.active?(combat.race.role==='hunter'&&!held('ControlLeft','ControlRight')?held('ShiftLeft','ShiftRight'):0):held('ShiftLeft','ShiftRight'),slow:held('ControlLeft','ControlRight')},dt,launchProfile(launchAge));
  const w=windEnabled?C.windAt(s.x,s.y,s.z,flightTime):{x:0,y:0,z:0,gust:0};wind={x:w.x*profile.windScale,y:w.y*profile.windScale,z:w.z*profile.windScale,gust:w.gust};if(sceneId==='atrium'){const targetLift=world.draft(s.x,s.y,s.z)*(held('KeyS','KeyK','ArrowDown')?.28:1);liftSpeed+=(targetLift-liftSpeed)*(1-Math.exp(-3.5*dt));wind.y+=liftSpeed;}s.x+=wind.x*dt;s.y+=wind.y*dt;s.z+=wind.z*dt;
  if(sceneId==='valley'){const radius=Math.hypot(s.x,s.z);if(radius>1180){const home=Math.atan2(s.x,s.z),angle=Math.atan2(Math.sin(home-s.yaw),Math.cos(home-s.yaw));s.yaw+=C.clamp(angle,-1.4,1.4)*dt*1.4;}if(s.y>470){s.y=470;s.pitch=Math.min(s.pitch,0);}}
  const transfer=world.travel?.(old,s,dt);if(transfer){contact.reset();safeHistory.length=0;effects.reset();Object.assign(previous,s);visual={...s};syncPlane();updateCamera(1,true);notify(transfer);flightTime+=dt;return;}
  sweep(old,dt);flightTime+=dt;combat.update(dt,s,held('KeyZ'),mode==='flying');if(combat.race.respawnRequested){combat.race.respawnRequested=false;launchAge=0;combat.race.playerGeneration++;combat.race.playerImmune=3;Object.assign(s,world.spawn(3),{pitch:.1,bank:0,speed:8,climbInput:0,boostControl:0});contact.reset();effects.reset();Object.assign(previous,s);visual={...s};syncPlane();updateCamera(0,true);notify('已重新起飞 · 3 秒保护');}
  if(mode==='flying'&&(checkpointTime+=dt)>.3){checkpointTime=0;safeHistory.push({x:s.x,y:s.y,z:s.z,yaw:s.yaw});if(safeHistory.length>36)safeHistory.shift();}
  if(sceneId==='labyrinth'){if(s.y < -80 || s.z<world.plan.bounds.min.z || s.z>world.plan.bounds.max.z || s.x < world.plan.bounds.min.x || s.x>world.plan.bounds.max.x){lastHit={kind:'边界',normal:new THREE.Vector3(0,1,0)};notify(recoverLaunch());contact.reset();lastHit=null;Object.assign(previous,s);}if(s.y>world.height-25)s.pitch=Math.min(s.pitch,0);}
}
function syncPlane(dt=0){plane.userData.updatePose(dt,{pitch:visual.pitch,bank:visual.bank,active:mode==='flying',boost:visual.boostControl||0,slow:!!held('ControlLeft','ControlRight'),impact:contact.cooldown>0?.5:0});plane.position.set(visual.x,visual.y,visual.z);plane.rotation.set(visual.pitch,visual.yaw,visual.bank,'YXZ');plane.updateMatrixWorld(true);}
function viewAvailable(){return sceneId==='labyrinth'&&combat.enabled&&world.floorAt(s.y)===3;}
function chooseView(id){
 if(id>=0&&!viewAvailable()){notify('请先进入 4F 的追逐练习。');return;}
 watched=id;combat.spectatedId=id;viewPose=null;viewToken='';keys.clear();accumulator=0;Object.assign(previous,s);effects.reset();
 document.body.classList.toggle('spectating',id>=0);$('viewTarget').value=id<0?'player':String(id);$('viewMode').hidden=id<0;$('viewInfo').hidden=id<0;
 updateCamera(0,true);resize();hud();if(id>=0&&$('sound').getAttribute('aria-pressed')==='true')ensureAudio();$('world').focus();
}
function viewState(){
 if(watched<0)return visual;
 let enemy=combat.enemies[watched];
 if(enemy.dead>0){const next=combat.enemies.find(e=>e.dead<=0);if(next){watched=next.id;combat.spectatedId=watched;$('viewTarget').value=String(watched);enemy=next;}else return viewPose||{...enemy.s};}
 const alpha=pause?1:accumulator*120,old=enemy.oldPose||enemy.s;
 viewPose={...enemy.s,x:enemy.old.x+(enemy.s.x-enemy.old.x)*alpha,y:enemy.old.y+(enemy.s.y-enemy.old.y)*alpha,z:enemy.old.z+(enemy.s.z-enemy.old.z)*alpha,yaw:C.angleLerp(old.yaw||0,enemy.s.yaw,alpha),pitch:(old.pitch||0)+(enemy.s.pitch-(old.pitch||0))*alpha,bank:(old.bank||0)+(enemy.s.bank-(old.bank||0))*alpha};return viewPose;
}
function updateCamera(dt,snap=false){
  const modelScale=plane.scale.x/.7;const v=viewState(),token=watched+':'+(watched>=0?combat.enemies[watched].generation:0);if(token!==viewToken){snap=true;viewToken=token;}const f=snap?1:1-Math.exp(-7*dt),energy=effects.strength*motion;
  cameraFollow.yaw=C.angleLerp(cameraFollow.yaw,v.yaw,f);cameraFollow.pitch+=(v.pitch-cameraFollow.pitch)*f;
  const ease=snap?1:1-Math.exp(-3*dt);cameraFollow.distance+=(.64*modelScale*Math.max(1,.9/camera.aspect)+energy*.10*modelScale-cameraFollow.distance)*ease;cameraFollow.fov+=(58+energy*15-cameraFollow.fov)*ease;
  const d=C.direction(cameraFollow.yaw,cameraFollow.pitch*.45),horizontal=C.direction(cameraFollow.yaw,0);
  cameraPos.set(v.x-d.x*cameraFollow.distance,v.y+.23*modelScale-d.y*cameraFollow.distance,v.z-d.z*cameraFollow.distance);
  cameraLook.set(v.x+horizontal.x*.38*modelScale,v.y+.01*modelScale+cameraFollow.pitch*.24*modelScale,v.z+horizontal.z*.38*modelScale);
  if(sceneId==='atrium'){cameraPos.x=C.clamp(cameraPos.x,-7.92,7.92);cameraPos.z=C.clamp(cameraPos.z,-7.92,7.92);cameraPos.y=C.clamp(cameraPos.y,.055,14.9);}
  else if(sceneId==='classroom'){cameraPos.x=C.clamp(cameraPos.x,-4.12,4.12);cameraPos.z=C.clamp(cameraPos.z,-5.12,5.12);cameraPos.y=C.clamp(cameraPos.y,.055,3.5);
    // Room boundaries constrain the camera continuously. Thin furniture and fan
    // hit boxes must never snap the chase distance forward by half a metre.
  }else cameraPos.y=Math.max(cameraPos.y,world.ground(cameraPos.x,cameraPos.z,v.y)+.05);
  if(watched>=0&&viewFirstPerson){const forward=C.direction(v.yaw,v.pitch);cameraPos.set(v.x,v.y,v.z).addScaledVector(new THREE.Vector3(forward.x,forward.y,forward.z),combat.enemies[watched].mesh.userData.dimensions.length*.5+.12);cameraLook.copy(cameraPos).add(new THREE.Vector3(forward.x,forward.y,forward.z).multiplyScalar(40));}
  else if(watched>=0){const origin=new THREE.Vector3(v.x,v.y,v.z),offset=cameraPos.clone().sub(origin),length=offset.length();if(length>0){const hit=world.raycast(origin,offset.divideScalar(length),length);if(hit)cameraPos.copy(origin).addScaledVector(offset,Math.max(.12,hit.distance-.12));}}
  camera.position.copy(cameraPos);camera.lookAt(cameraLook);if(Math.abs(camera.fov-cameraFollow.fov)>.0001){camera.fov=cameraFollow.fov;camera.updateProjectionMatrix();}
}
const mapCtx=$('mapCanvas').getContext('2d');
function drawMap(){if(net?.active)return;const ctx=mapCtx;ctx.fillStyle='#e6ead8';ctx.fillRect(0,0,180,180);let scale=1/15;
  if(sceneId==='labyrinth'){
    const level=world.floorAt(s.y);scale=78/Math.max(Math.abs(world.plan.bounds.min.x),Math.abs(world.plan.bounds.max.x),Math.abs(world.plan.bounds.min.z),Math.abs(world.plan.bounds.max.z));ctx.fillStyle=['#d6bea0','#d8dad2','#172c46','#e4d1b6','#25283f'][level];ctx.fillRect(0,0,180,180);ctx.save();ctx.translate(90,90);ctx.strokeStyle=level===2||level===4?'#82bbbe':'#846f60';ctx.lineWidth=1;ctx.strokeRect(-world.width/2*scale,-world.depth/2*scale,world.width*scale,world.depth*scale);for(const route of world.plan.layers[level].routes){ctx.beginPath();for(const p of route.curve.getSpacedPoints(12))ctx.lineTo(p.x*scale,p.z*scale);ctx.stroke();}ctx.strokeStyle='#bf8754';ctx.beginPath();for(const connection of world.plan.physical){if(connection.from!==level&&connection.to!==level)continue;ctx.beginPath();for(const p of connection.curve.getSpacedPoints(60))ctx.lineTo(p.x*scale,p.z*scale);ctx.stroke();}for(const gate of world.plan.portals){if(gate.level!==level)continue;ctx.fillStyle='#a5558d';ctx.beginPath();ctx.arc(gate.x*scale,gate.z*scale,3,0,Math.PI*2);ctx.fill();ctx.font='9px sans-serif';ctx.fillText((world.plan.portals[gate.target].level+1)+'F',gate.x*scale+4,gate.z*scale+3);}ctx.fillStyle=level===3&&combat.race.active?(combat.race.role==='hunter'?'#f02d4e':'#d98b14'):level===2||level===4?'#fff3ce':'#396d61';ctx.translate(s.x*scale,s.z*scale);ctx.rotate(-s.yaw);ctx.beginPath();ctx.moveTo(0,-5);ctx.lineTo(-3,4);ctx.lineTo(3,4);ctx.closePath();ctx.fill();ctx.restore();combat.map(ctx,scale,s);ctx.fillStyle=level===2||level===4?'#c6dfdf':'#495b50';ctx.font='10px sans-serif';ctx.fillText((level+1)+'F / '+Labyrinth.themes[level].name,9,16);ctx.fillText(level===3&&combat.enabled?combat.mode==='race'?'红：追击 / 黄：逃逸':'箭头：敌机 / 紫点：折跃':'紫点：跨层折跃门',40,170);return;
  }
  if(sceneId==='atrium'){
    scale=9;const layer=world.layouts[world.floorAt(s.y)];ctx.fillStyle=['#e0dbc5','#ecece2','#172840'][layer.level];ctx.fillRect(0,0,180,180);ctx.strokeStyle=layer.level===2?'#76afb9':'#849588';ctx.lineWidth=2;ctx.strokeRect(18,18,144,144);ctx.strokeRect(63,63,54,54);ctx.fillStyle=layer.level===2?'#356978':'#a4bfb0';ctx.globalAlpha=.5;ctx.beginPath();ctx.arc(84,90,20,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.fillStyle=layer.level===2?'#9a78ae':'#9a9c8a';for(const p of layer.items)ctx.fillRect(90+(p.x-p.w/2)*scale,90+(p.z-p.d/2)*scale,p.w*scale,p.d*scale);ctx.fillStyle=layer.level===2?'#d1e9e6':'#43695a';ctx.font='11px sans-serif';ctx.fillText('↑',80,94);ctx.fillText('↓',109,94);ctx.fillText((layer.level+1)+'F',24,33);
  }
  else if(sceneId==='classroom'){scale=14;ctx.strokeStyle='#8a9787';ctx.lineWidth=2;ctx.strokeRect(90-4.2*scale,90-5.2*scale,8.4*scale,10.4*scale);ctx.fillStyle='#456a59';ctx.fillRect(60,17,60,4);ctx.fillStyle='#bc9669';for(const desk of world.desks)ctx.fillRect(90+(desk.x-.3)*scale,90+(desk.z-.21)*scale,.6*scale,.42*scale);}
  else{ctx.strokeStyle='#a9cbc2';ctx.lineWidth=5;ctx.beginPath();for(let z=-1300;z<=1300;z+=25)ctx.lineTo(90+C.riverX(z)/15,90+z/15);ctx.stroke();ctx.fillStyle='#b38c68';for(const h of world.houses)ctx.fillRect(90+h.x/15-1,90+h.z/15-1,3,3);}
  ctx.save();ctx.translate(90+s.x*scale,90+s.z*scale);ctx.rotate(-s.yaw);ctx.fillStyle=sceneId==='atrium'&&world.floorAt(s.y)===2?'#a0fff2':'#285e55';ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(-3.5,5);ctx.lineTo(0,3);ctx.lineTo(3.5,5);ctx.closePath();ctx.fill();ctx.restore();
}
function updateModeCopy(){if(net?.active)return;const race=sceneId==='labyrinth'&&combat.enabled&&combat.mode==='race';$('speedHint').textContent=race?(combat.race.role==='hunter'?'Shift 加速 / Ctrl 减速':'逃逸机 · 固定速度'):'Shift 加速 / Ctrl 慢飞';$('captureHint').textContent=race?'35m · 锁定 2.3s':combat.enabled&&sceneId==='labyrinth'?'Z 曳光弹':'松开滑翔';if(sceneId==='labyrinth'){$('welcomeTitle').innerHTML=race?'折纸都会，<br>无限追逐。':'五层迷境，<br>自在穿行。';$('welcomeDescription').innerHTML=race?'追近并保持锁定，自动发射导弹捕获。<br>不限时；被捕获后重新加入，也可切换追逃身份。':combat.enabled?'Z 发射曳光弹，练习追击与瞄准。<br>Shift 加速，Ctrl 慢飞；V 观察 AI。':'穿过五层不同的风景，探索通道与折跃门。<br>Shift 加速，Ctrl 慢飞。';}}
function hud(){updateModeCopy();const observing=watched>=0,tracked=observing?(viewPose||visual):s;$('viewTarget').disabled=!viewAvailable();$('viewInfo').hidden=!observing;if(observing){const e=combat.enemies[watched];$('viewDetails').textContent='观战 AI '+(watched+1)+' · '+(e.dead>0?'等待重新加入':e.behavior||'起飞')+' · '+(viewFirstPerson?'机头视角':'机尾跟随')+' · 玩家已悬停';}$('flightState').textContent=net?.active?(net.isHunter?'追击机':'逃逸机'):observing?'观战 AI '+(watched+1):mode==='flying'?(combat.race.active?(combat.race.role==='hunter'?'追击机':'逃逸机'):'自由飞行'):mode==='landed'?'停留看景':'等待出发';if(sceneId==='labyrinth'){const theme=Labyrinth.themes[world.floorAt(tracked.y)];scene.background.setHex(theme.sky);scene.fog.color.setHex(theme.sky);scene.fog.near=world.width*.7;scene.fog.far=world.viewDistance;}document.body.classList.toggle('neon',(sceneId==='atrium'&&world.floorAt(tracked.y)===2)||(sceneId==='labyrinth'&&[2,4].includes(world.floorAt(tracked.y))));const indoor=isIndoor(),agl=tracked.y-world.ground(tracked.x,tracked.z,tracked.y);$('altitude').textContent=Math.max(0,agl).toFixed(indoor?2:1);$('speed').textContent=tracked.speed.toFixed(1);$('distance').textContent=indoor?tracked.distance.toFixed(1):(tracked.distance/1000).toFixed(2);$('distanceUnit').textContent=indoor?'m':'km';$('fps').textContent=fps+' FPS · '+({low:'省电',pixel:'像素',high:'清晰',balanced:'均衡'}[quality]);$('place').textContent=sceneId==='labyrinth'?('迷境 · '+(world.floorAt(tracked.y)+1)+'F '+Labyrinth.themes[world.floorAt(tracked.y)].name+' · '+world.nearestRoute(tracked.x,tracked.y,tracked.z)):sceneId==='atrium'?('三重中庭 · '+(world.floorAt(tracked.y)+1)+'F '+AtriumRules.names[world.floorAt(tracked.y)]+(liftSpeed>.35?' · ↑ 气流托举':'')):indoor?'高二教室 · 午后 / 42 个座位':'晴湾 · 山谷漫游';drawMap();}
function resize(){const settings={balanced:[1280,720],low:[960,540],high:[1920,1080],pixel:[480,270]}[quality],scale=Math.min(1,settings[0]/innerWidth,settings[1]/innerHeight),w=Math.floor(innerWidth*scale),h=Math.floor(innerHeight*scale);renderer.setSize(w,h,false);effects.target.samples=renderer.capabilities.isWebGL2?(quality==='high'?4:2):0;effects.resize(w,h);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.shadowMap.enabled=sceneId==='classroom'&&quality!=='low'&&quality!=='pixel';document.body.classList.toggle('pixel',quality==='pixel');const headerBottom=document.querySelector('header').getBoundingClientRect().bottom;$('location').style.top=(headerBottom+10)+'px';if(innerWidth<=700)$('map').style.top=(headerBottom+60)+'px';else $('map').style.top='';}

let audioCtx=null,audioGain=null,filter=null,panner=null;
function ensureAudio(){try{if(!audioCtx){audioCtx=new (window.AudioContext||window.webkitAudioContext)();const buf=audioCtx.createBuffer(1,audioCtx.sampleRate*4,audioCtx.sampleRate),data=buf.getChannelData(0);let v=0;for(let i=0;i<data.length;i++){const white=Math.random()*2-1;v=(v+white*.02)/1.02;data[i]=v*2.8+white*.18;}const source=audioCtx.createBufferSource();source.buffer=buf;source.loop=true;filter=audioCtx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=600;audioGain=audioCtx.createGain();audioGain.gain.value=0;panner=audioCtx.createStereoPanner();source.connect(filter).connect(audioGain).connect(panner).connect(audioCtx.destination);source.start();}audioCtx.resume().catch(()=>notify('风声未能播放，可点击风声按钮重试。'));}catch(e){$('sound').setAttribute('aria-pressed','false');$('sound').textContent='风声：关';notify('当前浏览器无法播放风声，飞行不受影响。');}}
function toggleAudio(){const on=$('sound').getAttribute('aria-pressed')!=='true';$('sound').setAttribute('aria-pressed',String(on));$('sound').textContent='风声：'+(on?'开':'关');if(on)ensureAudio();if(audioGain)audioGain.gain.setTargetAtTime(on&&!pause?.025:0,audioCtx.currentTime,.3);}

$('viewTarget').onchange=e=>chooseView(e.target.value==='player'?-1:Number(e.target.value));$('viewMode').onclick=()=>{viewFirstPerson=!viewFirstPerson;$('viewMode').textContent=viewFirstPerson?'观战：机头':'观战：机尾';viewToken='';updateCamera(0,true);hud();$('world').focus();};$('returnView').onclick=()=>chooseView(-1);
$('raceRole').onchange=e=>{combat.race.role=e.target.value;reset();$('world').focus();};
$('combatMode').onchange=e=>{chooseView(-1);combat.enabled=e.target.value!=='off';combat.mode=e.target.value==='race'?'race':'practice';$('raceRole').hidden=combat.mode!=='race';$('aimAssist').hidden=combat.mode==='race'||!combat.enabled;syncFlightSetup();combat.reset(s);$('world').focus();};$('enemyColor').onchange=e=>{combat.color(e.target.value);$('world').focus();};$('aimAssist').onclick=()=>{combat.assist=!combat.assist;$('aimAssist').textContent='辅助瞄准：'+(combat.assist?'开':'关');$('aimAssist').setAttribute('aria-pressed',String(combat.assist));$('world').focus();};
$('shuffleMaze').onclick=()=>{if(sceneId!=='labyrinth')return;world.dispose();delete worlds.labyrinth;mazeSeed=(Math.imul(mazeSeed,1664525)+1013904223)>>>0;try{localStorage.setItem('paper-maze-seed',String(mazeSeed));}catch{}chooseScene('labyrinth');notify('五层布局、弯道和折跃门连接已重新生成。');};
$('mazeFloor').onchange=e=>{mazeFloor=Number(e.target.value);if(sceneId==='labyrinth')reset();$('world').focus();};$('layoutButton').onclick=()=>{if(mode==='flying'||watched>=0)setPause(true);$('layoutFrame').src='layout.html?seed='+mazeSeed;$('layoutDialog').showModal();};$('closeLayout').onclick=()=>$('layoutDialog').close();
$('shuffle').onclick=shuffleAtrium;$('startFloor').onchange=e=>{startFloor=Number(e.target.value);if(sceneId==='atrium')reset();$('world').focus();};
$('start').onclick=launch;$('launch').onclick=launch;$('reset').onclick=reset;$('resume').onclick=()=>setPause(false);$('sound').onclick=toggleAudio;
$('scene').onchange=e=>{if(e.target.value==='planet'){location.href='planet.html';return;}chooseScene(e.target.value);$('world').focus();};
$('skin').onchange=e=>{plane.userData.setSkin(e.target.value);try{localStorage.setItem('paper-skin',e.target.value);}catch{}$('world').focus();};
$('quality').onchange=e=>{quality=e.target.value;resize();$('world').focus();};
$('motion').onchange=e=>{motion=Number(e.target.value);$('world').focus();};
$('fullscreen').onclick=()=>{const action=document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();action.catch(()=>notify('当前浏览器不支持全屏，可在 Edge 中打开。'));};
$('help').onclick=()=>{if(mode==='flying'||watched>=0)setPause(true);$('helpDialog').showModal();};$('closeHelp').onclick=()=>$('helpDialog').close();
document.addEventListener('keydown',e=>{if($('helpDialog').open||$('layoutDialog').open||e.target.tagName==='SELECT')return;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyS','KeyA','KeyD','KeyI','KeyK','KeyJ','KeyL','KeyZ','ControlLeft','ControlRight'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.repeat)return;if(e.code==='KeyV'){if(viewAvailable())chooseView(watched>=2?-1:watched+1);else notify('4F 追逐练习支持 AI 观战。');}else if(e.code==='KeyB')chooseView(-1);else if(e.code==='Space'&&mode!=='flying'&&watched<0)launch();else if(e.code==='KeyP'||e.code==='Escape')setPause(!pause);else if(e.code==='KeyR')reset();});
document.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();if(mode==='flying'||watched>=0)setPause(true);});document.addEventListener('visibilitychange',()=>{if(document.hidden&&(mode==='flying'||watched>=0))setPause(true);});window.addEventListener('resize',resize);
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();setPause(true);$('error').hidden=false;$('error').textContent='3D 画面暂时中断。请重新打开游戏，并选择省电画质。';});
window.flightDiagnostics=()=>({build:"paper-city-chase-8",contact:{hits:contact.hits,last:contact.last,velocity:contact.velocity.toArray()},view:{target:watched,firstPerson:viewFirstPerson,subject:viewPose?{...viewPose}:null,camera:camera.position.toArray()},flightLimits:{cruise:profile.cruiseMaxSpeed,max:profile.maxSpeed},modelScale:plane.scale.x/.7,combat:combat.diagnostics(),shadows:renderer.shadowMap.enabled,launchAge,trapCount,motion,maze:sceneId==='labyrinth'?{floor:world.floorAt(s.y),...world.stats}:null,logDepth:renderer.capabilities.logarithmicDepthBuffer,tower:sceneId==='atrium'?{floor:world.floorAt(s.y)+1,seed:world.seed,updraft:liftSpeed,openRatios:world.layouts.map(l=>l.openRatio)}:null,scene:sceneId,skin:plane.userData.skin,paperPose:{...plane.userData.pose},dimensions:plane.userData.dimensions,room:isIndoor()?[world.width,world.depth,world.height]:null,mode,pause,position:{x:s.x,y:s.y,z:s.z},yaw:s.yaw,pitch:s.pitch,speed:s.speed,normalizedSpeed:s.speed/profile.speedScale,acceleration:s.acceleration,distance:s.distance,fps,quality,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,resolution:[renderer.domElement.width,renderer.domElement.height],lastHit:lastHit?.kind,wind:{...wind},effects:effects.diagnostics(),fov:camera.fov,visual:{...visual},planeScreen:plane.position.clone().project(camera).toArray(),noseAlignment:new THREE.Vector3(0,0,-1).applyQuaternion(plane.quaternion).dot(new THREE.Vector3(...Object.values(C.direction(visual.yaw,visual.pitch)))),audio:audioCtx?{state:audioCtx.state,gain:audioGain.gain.value}:null});
if(new URLSearchParams(location.search).has('qa'))window.flightQA={combat,view:chooseView,world:()=>world,
  place(values){contact.reset();plane.userData.resetPose();launchAge=10;lastRecovery=false;Object.assign(s,{pitch:0,bank:0,yaw:0,speed:23*profile.speedScale,acceleration:0,climbInput:0,boostControl:0},values);syncFlightSetup();lastHit=null;liftSpeed=0;effects.reset();setMode('flying');setPause(false);visual={...s};syncPlane();updateCamera(1,true);},
  step(seconds,input={}){keys.clear();const codes={left:'KeyJ',right:'KeyL',up:'KeyI',down:'KeyK',boost:'ShiftLeft',slow:'ControlLeft',fire:'KeyZ'};for(const name in codes)if(input[name])keys.add(codes[name]);pause=false;for(let i=0;i<Math.round(seconds*120);i++){Object.assign(previous,s);physics(1/120);visual={...s};syncPlane(1/120);updateCamera(1/120);effects.update(1/120,{plane,camera,speed:s.speed/profile.speedScale/(profile.effectSpeedScale||1),acceleration:s.acceleration/profile.speedScale/(profile.effectSpeedScale||1),active:mode==='flying'&&watched<0,wind,motion});}keys.clear();setPause(true);combat.render(1,camera,s,false);hud();return flightDiagnostics();},
  render(){visual={...s};syncPlane();updateCamera(0);world.updateLighting?.(visual,quality);combat.render(1,camera,visual,false);if(world.update)world.update(0,visual.y);effects.update(0,{plane,camera,speed:s.speed/profile.speedScale/(profile.effectSpeedScale||1),acceleration:s.acceleration/profile.speedScale/(profile.effectSpeedScale||1),active:mode==='flying'&&watched<0,wind,motion});net?.render(0);effects.render(camera,quality);hud();},
  cameraSample(values,dt=1/120){setPause(true);visual={...s,...values};syncPlane();updateCamera(dt,values.snap||false);camera.updateMatrixWorld(true);const p=plane.position.clone().project(camera);return {screen:p.toArray(),position:camera.position.toArray(),distance:camera.position.distanceTo(plane.position)};},
  landmarks(){return sceneId==='labyrinth'?world.plan.layers[world.floorAt(s.y)].nodes:sceneId==='valley'?world.houses[4]:world.desks?.[0];},
  mazeRoute(t,l=0){const c=world.plan.physical[l].curve,p=c.getPointAt(t),d=c.getTangentAt(t);return {x:p.x,y:p.y,z:p.z,yaw:Math.atan2(-d.x,-d.z),pitch:Math.asin(d.y)};},
  mazeGates(){return world.plan.portals;},
  forceLand(kind='角落',normal=[0,1,0]){land(kind,new THREE.Vector3(...normal));},
  clearLaunch(p,yaw){return clearLaunch(p,yaw);},
  launch,scene:chooseScene,wind(value){windEnabled=value;},
  paperView(skin='math'){plane.userData.setSkin(skin);$('skin').value=skin;this.place({x:-1.35,y:1.5,z:1.5,pitch:-.04});visual={...s};syncPlane();setPause(true);},
  texture(skin){plane.userData.setSkin(skin);if(skin==='inkbird')return null;const image=plane.children[0].material.map?.image;return image?.toDataURL?.()||image?.src;}
};
function frame(now){requestAnimationFrame(frame);const wallDt=lastTime?(now-lastTime)/1000:1/60,dt=Math.min(wallDt,.08);lastTime=now;frameWindow+=wallDt;hudElapsed+=wallDt;renderDt+=dt;
  if(!pause){accumulator+=dt;while(accumulator>=1/120){Object.assign(previous,s);physics(1/120);accumulator-=1/120;}}
  if((quality==='low'||quality==='pixel')&&now-lastRender<1000/30-.5)return;lastRender=now;const elapsed=renderDt;renderDt=0;
  visual=net?.active?net.framePose(accumulator,elapsed):mode==='flying'&&!pause?C.interpolate(previous,s,accumulator*120):{...s};syncPlane(pause?0:elapsed);updateCamera(pause?0:elapsed);
  effects.update(pause?0:elapsed,{plane,camera,speed:s.speed/profile.speedScale/(profile.effectSpeedScale||1),acceleration:s.acceleration/profile.speedScale/(profile.effectSpeedScale||1),active:mode==='flying'&&watched<0,wind,motion});
  const subject=watched>=0?(viewPose||visual):visual;if(world.update)world.update(pause?0:elapsed,subject.y);world.updateLighting?.(subject,quality);renderer.shadowMap.enabled=(sceneId==='classroom'||sceneId==='labyrinth'&&world.floorAt(visual.y)===3)&&quality!=='low'&&quality!=='pixel';combat.render((mode==='flying'||watched>=0)&&!pause?accumulator*120:1,camera,subject,mode==='flying'&&!pause&&watched<0);if(watched>=0&&viewFirstPerson)combat.enemies[watched].mesh.visible=false;
  if(!pause){if(world.blades)world.blades.rotation.z+=elapsed*.16;if(world.fans)for(const fan of world.fans)fan.rotation.y+=elapsed*1.6;}
  if(audioGain){const soundOn=$('sound').getAttribute('aria-pressed')==='true',flying=(mode==='flying'||watched>=0)&&!pause,energy=C.clamp((subject.speed/profile.speedScale/(profile.effectSpeedScale||1)-6)/44,0,1);
    audioGain.gain.setTargetAtTime(soundOn&&!pause?(flying?.008+energy*energy*.17+wind.gust*.004:.003):0,audioCtx.currentTime,.18);filter.frequency.setTargetAtTime(360+energy*energy*2000,audioCtx.currentTime,.22);panner.pan.setTargetAtTime(C.clamp(wind.x*.06,-.3,.3),audioCtx.currentTime,.5);}
  net?.render(elapsed);effects.render(camera,quality);frameCount++;if(frameWindow>=1){fps=Math.round(frameCount/frameWindow);frameCount=0;frameWindow=0;}if(hudElapsed>.2){hud();hudElapsed=0;}
}
let savedScene='labyrinth',savedSkin='math';try{savedScene=localStorage.getItem('paper-scene')||savedScene;savedSkin=localStorage.getItem('paper-skin')||savedSkin;}catch{}
try{if(!localStorage.getItem('paper-combat-intro-v1')){savedScene='labyrinth';localStorage.setItem('paper-combat-intro-v1','1');}}catch{}
try{if(!localStorage.getItem('paper-original-intro-v1')){savedSkin='original';localStorage.setItem('paper-original-intro-v1','1');localStorage.setItem('paper-skin','original');}}catch{}
try{if(!localStorage.getItem('paper-sky-intro-v1')){savedSkin='papersky';localStorage.setItem('paper-sky-intro-v1','1');localStorage.setItem('paper-skin',savedSkin);}}catch{}
const requestedSkin=new URLSearchParams(location.search).get('skin');if(requestedSkin)savedSkin=requestedSkin;
if(!['math','mechanical','white','inkbird','original','papersky'].includes(savedSkin))savedSkin='math';plane.userData.setSkin(savedSkin);$('skin').value=savedSkin;
window.paperBridge={scene,camera,renderer,plane,state:s,world:()=>world,notify,
 input:()=>({left:held('KeyA','KeyJ','ArrowLeft'),right:held('KeyD','KeyL','ArrowRight'),pitch:held('KeyW','KeyI','ArrowUp')-held('KeyS','KeyK','ArrowDown'),boost:!!held('ShiftLeft','ShiftRight'),slow:!!held('ControlLeft','ControlRight')}),
 prepare(connection,seed){mazeSeed=seed;mazeFloor=3;combat.enabled=false;if(worlds.labyrinth){scene.remove(worlds.labyrinth.group);worlds.labyrinth.dispose();delete worlds.labyrinth;}chooseScene('labyrinth');net=connection;watched=-1;combat.spectatedId=-1;setPause(false);setMode('flying');windEnabled=false;for(const id of ['scene','mazeFloor','shuffleMaze','combatMode','raceRole','enemyColor','aimAssist','viewTarget','viewMode','reset','layoutButton'])$(id).disabled=true;},
 snap(value,hard=false){Object.assign(s,value);if(hard){Object.assign(previous,s);visual={...s};effects.reset();syncPlane();updateCamera(0,true);}},
 ensureAudio, clearKeys:()=>keys.clear(), combat};
resize();chooseScene(savedScene);requestAnimationFrame(frame);
})();
















