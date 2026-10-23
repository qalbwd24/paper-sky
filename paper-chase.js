/* Unlimited tag race. Capture is acquired by proximity + heading + line of sight. */
class PaperChase {
 constructor(combat){
  this.c=combat;this.role='hunter';this.playerState=null;this.playerGeneration=0;
  this.hunterProfile={...Labyrinth.combatProfile,cruiseSpeed:22,cruiseMaxSpeed:22,boostSpeed:42,maxSpeed:42,slowSpeed:13,pitchDrag:2,turnRate:1.65,boostTurnRate:.75,bankAngle:.60,boostBankAngle:.34,maxClimbPitch:.34,boostClimbPitch:.21,pitchResponse:3.6,boostPitchResponse:1.8,liftResponse:4,boostLiftResponse:2.5,liftReleaseResponse:5.2,boostLiftReleaseResponse:4.5,diveResponse:4.4,boostDiveResponse:2.5,accelerationRate:1.8};
  this.runnerProfile={...this.hunterProfile,cruiseSpeed:30,cruiseMaxSpeed:30,boostSpeed:30,maxSpeed:30,slowSpeed:18,turnRate:1.05,boostTurnRate:1.05,bankAngle:.43,boostBankAngle:.43,maxClimbPitch:.26,boostClimbPitch:.26,pitchResponse:2.3,boostPitchResponse:2.3,liftResponse:3,boostLiftResponse:3,liftReleaseResponse:4.5,boostLiftReleaseResponse:4.5,diveResponse:3,boostDiveResponse:3};
  this.group=new THREE.Group();combat.group.add(this.group);
  this.missiles=Array.from({length:4},()=>{
   const mesh=new THREE.Group(),body=new THREE.Mesh(new THREE.CylinderGeometry(.055,.065,.38,6),new THREE.MeshBasicMaterial({color:'#fff6cd'})),nose=new THREE.Mesh(new THREE.ConeGeometry(.065,.18,6),new THREE.MeshBasicMaterial({color:'#ff8750'}));nose.position.y=.28;mesh.add(body,nose);
   const flame=new THREE.Mesh(new THREE.ConeGeometry(.055,.24,6),new THREE.MeshBasicMaterial({color:'#ffb34f',toneMapped:false}));flame.rotation.z=Math.PI;flame.position.y=-.3;mesh.add(flame);this.group.add(mesh);
   const geometry=new THREE.BufferGeometry(),positions=new Float32Array(36*3);geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setDrawRange(0,0);const trail=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:'#ffd787',transparent:true,opacity:.8,depthWrite:false}));trail.frustumCulled=false;this.group.add(trail);
   return {mesh,trail,positions,p:new THREE.Vector3(),old:new THREE.Vector3(),v:new THREE.Vector3(),history:[],life:0};
  });
  this.badge=document.createElement('div');this.badge.id='captureBadge';combat.overlay.appendChild(this.badge);
  this.ring=document.createElement('div');this.ring.id='captureRing';combat.overlay.appendChild(this.ring);this.reset();
 }
 get active(){return this.c.mode==='race'&&this.c.enabled&&this.c.active&&this.c.floor===3;}
 isHunter(id){return this.role==='hunter'?id===-1:id===0;}
 profile(id=-1){return this.isHunter(id)?this.hunterProfile:this.runnerProfile;}
 actor(id){if(id===-1)return this.playerState?{id,s:this.playerState,generation:this.playerGeneration,dead:this.respawnDelay>0,immune:this.playerImmune}:null;const e=this.c.enemies[id];return e?{id,s:e.s,generation:e.generation,dead:e.dead>0,immune:e.raceImmune||0}:null;}
 reset(){this.lock={id:null,time:0};this.captures=0;this.caught=0;this.total=0;this.cooldown=0;this.respawnDelay=0;this.respawnRequested=false;this.playerImmune=2.5;this.message='';this.messageAge=0;this.playerGeneration++;for(const m of this.missiles){m.life=0;m.mesh.visible=m.trail.visible=false;}this.badge.hidden=this.ring.hidden=true;}
 attachPilot(){if(this.c.pilot)this.c.pilot.race=this.c.mode==='race'?this:null;}
 spawned(e){e.raceImmune=this.c.time<.1?.5:3;e.raceFast=false;e.racePlanAt=0;}
 clear(a,b){const d=b.clone().sub(a),length=d.length();return length<1e-5||!this.c.world.raycast(a,d.divideScalar(length),Math.max(0,length-.08));}
 candidates(hunter){return [-1,0,1,2].map(id=>this.actor(id)).filter(a=>a&&!a.dead&&!this.isHunter(a.id)&&a.immune<=0&&(a.id!==-1||this.c.spectatedId<0)&&!this.missiles.some(m=>m.life>0&&m.target===a.id&&m.generation===a.generation));}
 eligibility(hunter,target){const delta=this.c.pos(target.s).sub(this.c.pos(hunter.s)),distance=delta.length();return distance<=35&&(distance<.01||delta.divideScalar(distance).dot(this.c.dir(hunter.s))>=Math.cos(25*Math.PI/180)-1e-12)&&this.clear(this.c.pos(hunter.s),this.c.pos(target.s));}
 setGoal(e,goal,time,mode){const p=this.c.pos(e.s),n=e.nav;this.c.pilot.clampGoal(goal);Object.assign(n,{goal,origin:p,path:[],index:0,job:null,retry:time,lastGoalAt:time,progressAt:time,best:p.distanceTo(goal),mode,lastCheck:time,visited:[p.clone()]});n.metrics.legs++;}
 newLeg(e,player,time){
  const p=this.c.pos(e.s),hunter=this.actor(this.role==='hunter'?-1:0);let direction=this.c.dir(e.s),label=this.isHunter(e.id)?'寻找逃逸机':'巡航逃逸';
  if(this.isHunter(e.id)){
   const targets=this.candidates(e).sort((a,b)=>this.c.pos(a.s).distanceToSquared(p)-this.c.pos(b.s).distanceToSquared(p));const target=targets[0];e.raceTarget=target?.id??null;
   if(target){const goal=this.c.pos(target.s).addScaledVector(this.c.dir(target.s),target.s.speed*.25);this.setGoal(e,goal,time,'追近目标');return;}
  }else if(hunter&&!hunter.dead){direction=p.clone().sub(this.c.pos(hunter.s));direction.y=0;if(direction.lengthSq()<1)direction=this.c.dir(e.s);direction.normalize();label='拉开距离';}
  const home=this.c.world.spawn(3),fromHome=new THREE.Vector3(home.x-p.x,0,home.z-p.z);
  if(fromHome.length()>420)direction=fromHome.normalize();
  const side=new THREE.Vector3(-direction.z,0,direction.x),phase=(e.id+1)*2.1+e.nav.metrics.legs*.85;
  const goal=p.clone().addScaledVector(direction,95).addScaledVector(side,Math.sin(phase)*55);goal.y+=Math.sin(phase*.7)*7;
  this.setGoal(e,goal,time,label);
 }
 plan(e,player,time){
  this.playerState=player;if(time<(e.racePlanAt||0))return;e.racePlanAt=time+(this.isHunter(e.id)?.45:2);
  if(this.isHunter(e.id)||!e.nav.goal||this.actor(this.role==='hunter'?-1:0)&&this.c.pos(e.s).distanceTo(this.c.pos(this.actor(this.role==='hunter'?-1:0).s))<90)this.newLeg(e,player,time);
  if(this.isHunter(e.id)&&e.nav.goal){const delta=e.nav.goal.clone().sub(this.c.pos(e.s)),distance=delta.length(),error=this.c.dir(e.s).dot(delta.normalize());e.raceFast=distance>9&&error>.8&&this.c.pilot.clear(this.c.pos(e.s),this.c.pos(e.s).addScaledVector(this.c.dir(e.s),42),1.7);}else e.raceFast=false;
 }
 launch(hunter,target){
  const m=this.missiles.find(m=>m.life<=0);if(!m)return false;
  const origin=this.c.pos(hunter.s),d=this.c.dir(hunter.s),muzzle=origin.clone().addScaledVector(d,this.c.player.userData.dimensions.length*this.c.player.scale.x/.7*.5+.16);
  if(!this.clear(origin,muzzle))return false;
  m.p.copy(muzzle);m.old.copy(muzzle);m.v.copy(this.c.pos(target.s).sub(muzzle).normalize()).multiplyScalar(48);m.history=[muzzle.clone()];m.life=1.4;m.age=0;m.target=target.id;m.generation=target.generation;m.hunter=hunter.id;m.tick=0;
  this.cooldown=1;this.lock={id:null,time:0};this.message='锁定完成 · 导弹发射';this.messageAge=.65;return true;
 }
 finish(m,target){
  const c=this.c,p=c.pos(target.s),n=m.v.clone().normalize().negate();c.burst(p,n,c.dir(target.s).multiplyScalar(target.s.speed),target.id===-1?0xffe4af:c.enemies[target.id].mesh.userData.body.material.color.getHex(),18,true,.65,true);
  c.hitAge=.35;this.total++;if(m.hunter===-1)this.captures++;
  if(target.id===-1){this.caught++;this.respawnDelay=.9;this.playerImmune=5;this.message='被捕获 · 即将重新起飞';}
  else{const e=c.enemies[target.id];e.dead=4;e.hp=0;this.message='捕获 AI '+(target.id+1)+' · 稍后重新加入';}
  this.messageAge=1.8;m.life=0;
 }
 update(dt,player){
  this.playerState=player;if(!this.active)return;this.attachPilot();this.playerImmune=Math.max(0,this.playerImmune-dt);for(const e of this.c.enemies)e.raceImmune=Math.max(0,(e.raceImmune||0)-dt);
  this.messageAge=Math.max(0,this.messageAge-dt);this.cooldown=Math.max(0,this.cooldown-dt);
  if(this.respawnDelay>0){this.respawnDelay=Math.max(0,this.respawnDelay-dt);if(this.respawnDelay===0)this.respawnRequested=true;}
  for(const m of this.missiles){if(m.life<=0)continue;const target=this.actor(m.target);if(!target||target.dead||target.generation!==m.generation||m.target===-1&&this.c.spectatedId>=0){m.life=0;continue;}
   m.old.copy(m.p);m.life-=dt;m.age+=dt;const aim=this.c.pos(target.s),distance=m.p.distanceTo(aim),desired=aim.sub(m.p).normalize();m.v.normalize().lerp(desired,1-Math.exp(-18*dt)).normalize().multiplyScalar(Math.min(125,48+m.age*220));
   const end=m.p.clone().addScaledVector(m.v,dt),delta=end.clone().sub(m.p),length=delta.length(),wall=this.c.world.raycast(m.p,delta.clone().normalize(),length);
   const previousTarget=target.id<0?this.c.pos(target.s).addScaledVector(this.c.dir(target.s),-target.s.speed*dt):this.c.enemies[target.id].old;
   const rel0=m.p.clone().sub(previousTarget),relDelta=delta.clone().sub(this.c.pos(target.s).sub(previousTarget)),aa=relDelta.lengthSq(),bb=2*rel0.dot(relDelta),cc=rel0.lengthSq()-1.05**2,disc=bb*bb-4*aa*cc;
   const hit=cc<=0?0:disc>=0&&aa>0?(-bb-Math.sqrt(disc))/(2*aa):Infinity;
   if(hit>=0&&hit<=1&&(!wall||hit<wall.fraction)){m.p.lerp(end,hit);this.finish(m,target);continue;}
   if(wall||end.y<this.c.world.ground(end.x,end.z,end.y)){if(wall)m.p.addScaledVector(delta,wall.fraction);else m.p.copy(end);this.c.burst(m.p,wall?.normal||new THREE.Vector3(0,1,0),m.v,0xffbc64,6);m.life=0;this.message='导弹被障碍挡住 · 重新追近';this.messageAge=1.2;continue;}
   m.p.copy(end);if(++m.tick%2===0){m.history.unshift(m.p.clone());if(m.history.length>35)m.history.pop();}
  }
  const hunter=this.actor(this.role==='hunter'?-1:0);
  if(!hunter||hunter.dead||hunter.id===-1&&this.c.spectatedId>=0||this.cooldown>0||this.missiles.some(m=>m.life>0)){this.lock={id:null,time:0};return;}
  const eligible=this.candidates(hunter).filter(a=>this.eligibility(hunter,a));let target=eligible.find(a=>a.id===this.lock.id)||eligible.sort((a,b)=>this.c.pos(a.s).distanceToSquared(this.c.pos(hunter.s))-this.c.pos(b.s).distanceToSquared(this.c.pos(hunter.s)))[0];
  if(target){if(this.lock.id!==target.id)this.lock={id:target.id,time:0};this.lock.time+=dt;if(this.lock.time>=2.3&&!this.launch(hunter,target))this.lock.time=.45;}
  else{const last=this.actor(this.lock.id);if(last&&!this.clear(this.c.pos(hunter.s),this.c.pos(last.s)))this.lock={id:null,time:0};else{this.lock.time=Math.max(0,this.lock.time-dt*2);if(this.lock.time===0)this.lock.id=null;}}
 }
 render(alpha,camera,s){
  this.group.visible=this.active;for(const m of this.missiles){m.mesh.visible=m.trail.visible=this.active&&m.life>0;if(!m.mesh.visible)continue;m.mesh.position.copy(m.old).lerp(m.p,alpha);m.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),m.v.clone().normalize());m.mesh.position.toArray(m.positions,0);m.history.forEach((p,i)=>p.toArray(m.positions,(i+1)*3));m.trail.geometry.setDrawRange(0,m.history.length+1);m.trail.geometry.attributes.position.needsUpdate=true;}
  this.badge.hidden=!this.active||this.messageAge<=0;this.badge.textContent=this.message;this.ring.hidden=true;for(const cue of this.c.cues){cue.classList.remove('raceCue','raceHunter');}if(!this.active||!camera||!s)return;
  this.c.overlay.querySelector('#gunSight').hidden=true;this.c.overlay.querySelector('#hitConfirm').hidden=true;
  const status=this.c.overlay.querySelector('#combatStatus');status.textContent=this.role==='hunter'?`追击机 · ${s.boostControl>.5?'高速追近 42':'低速灵活 22'} m/s · Shift 加速 / Ctrl 减速 · 捕获 ${this.captures} · 不限时`:`逃逸机 · 30 m/s · 被捕获 ${this.caught} 次 · 不限时`;
  for(const e of this.c.enemies){const cue=this.c.cues[e.id];if(cue.hidden)continue;cue.classList.add('raceCue');cue.classList.toggle('raceHunter',this.isHunter(e.id));const distance=Math.round(e.mesh.position.distanceTo(this.c.pos(s))),arrow=cue.querySelector('span')?.outerHTML||'➤';cue.innerHTML=(cue.classList.contains('offscreen')?arrow+' ':'◎ ')+(this.isHunter(e.id)?'追击机':'逃逸机')+' '+distance+'m';}
  if(this.lock.id!==null){const target=this.actor(this.lock.id),p=target&&this.c.pos(target.s).project(camera);if(p&&p.z<1&&Math.abs(p.x)<1&&Math.abs(p.y)<1){this.ring.hidden=false;this.ring.style.left=(p.x*.5+.5)*100+'%';this.ring.style.top=(-p.y*.5+.5)*100+'%';this.ring.style.setProperty('--progress',Math.min(1,this.lock.time/2.3)*360+'deg');this.ring.textContent=this.lock.id===-1?'被锁定':Math.round(this.lock.time/2.3*100)+'%';}}
 }
 diagnostics(){return {active:this.active,role:this.role,captures:this.captures,caught:this.caught,total:this.total,lock:{...this.lock},missiles:this.missiles.filter(m=>m.life>0).length,respawnDelay:this.respawnDelay,playerImmune:this.playerImmune,profiles:{hunter:this.hunterProfile,runner:this.runnerProfile}};}
}
