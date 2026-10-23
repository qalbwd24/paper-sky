/* Three-level pilot: committed flight legs, bounded 3D A*, reachable trajectory checks.
   Everything moves through FlightCore; navigation never moves or teleports a plane. */
class PaperPilot {
 constructor(world,floor=3){this.world=world;this.floor=floor;this.base=Labyrinth.bases[floor]*Labyrinth.scale;this.top=this.base+Labyrinth.heights[floor]*Labyrinth.scale-20;this.extent=(world.width||1680)/2-45;}
 pos(s){return new THREE.Vector3(s.x,s.y,s.z);}
 dir(s){const d=FlightCore.direction(s.yaw,s.pitch);return new THREE.Vector3(d.x,d.y,d.z);}
 reset(e){e.command=null;e.steer=0;e.cruiseSpeed=22+e.id;e.nextThink=e.id*.04;e.nav={leg:0,goal:null,path:[],index:0,job:null,retry:0,progressAt:0,best:Infinity,turnBias:0,lastGoalAt:-100,evadeUntil:0,evadeCooldown:0,hp:e.hp,visited:[],metrics:{legs:0,arrivals:0,plans:0,escapes:0,evasions:0,failedPlans:0}};}
 profile(e){return this.race?this.race.profile(e.id):{...Labyrinth.combatProfile,cruiseSpeed:e.cruiseSpeed||22,cruiseMaxSpeed:30,maxSpeed:30,boostSpeed:30,turnRate:.95};}
 contactEscape(e,normal,time){
  if(!e.nav)this.reset(e);const n=e.nav,p=this.pos(e.s),forward=this.dir({...e.s,pitch:0});
  const goal=this.clampGoal(p.clone().addScaledVector(normal,65).addScaledVector(forward,normal.y>.6?90:0));
  goal.y=FlightCore.clamp(goal.y,p.y-12,p.y+14);
  Object.assign(n,{goal,origin:p,path:[],index:0,job:null,retry:time,lastGoalAt:time,progressAt:time,best:p.distanceTo(goal),mode:'碰撞脱离',lastCheck:time,visited:[p.clone()],evadeCooldown:time+2});n.metrics.escapes++;
 }
 smooth(e,dt){if(!e.command)return;e.steer+=(e.command.turn-e.steer)*(1-Math.exp(-8*dt));e.controls={left:Math.max(0,e.steer),right:Math.max(0,-e.steer),pitch:e.command.pitch,boost:!!(this.race&&e.raceFast),slow:!this.race&&e.command.slow};}
 lift(pitch,limit=FlightCore.maxClimbPitch){if(pitch<FlightCore.trimPitch)return pitch/.72;const f=FlightCore.clamp((pitch-FlightCore.trimPitch)/(limit-FlightCore.trimPitch),0,1);let a=0,b=1;for(let i=0;i<9;i++){const m=(a+b)/2;if(m*m*(3-2*m)<f)a=m;else b=m;}return (a+b)/2;}
 safePoint(p,margin=2){return Math.abs(p.x)<this.extent+25&&Math.abs(p.z)<this.extent+25&&p.y<this.top&&p.y>this.world.ground(p.x,p.z,p.y)+margin;}
 clear(a,b,margin=1.5){
  if(!this.safePoint(b,margin+1))return false;const delta=b.clone().sub(a),length=delta.length();if(length<.001)return true;delta.divideScalar(length);
  if(this.world.raycast(a,delta,length))return false;
  const right=new THREE.Vector3(-delta.z,0,delta.x).normalize().multiplyScalar(margin),up=new THREE.Vector3(0,margin,0);
  for(const offset of [right,right.clone().negate(),up,up.clone().negate()])if(this.world.raycast(a.clone().add(offset),delta,length))return false;
  return true;
 }
 clampGoal(p){p.x=FlightCore.clamp(p.x,-this.extent,this.extent);p.z=FlightCore.clamp(p.z,-this.extent,this.extent);p.y=FlightCore.clamp(p.y,this.world.ground(p.x,p.z,p.y)+16,this.top-10);return p;}
 newLeg(e,player,time,watching,escape=false,evade=false){
  if(this.race){this.race.newLeg(e,player,time);return;}
  const n=e.nav,p=this.pos(e.s),forward=this.dir({...e.s,pitch:0}),right=new THREE.Vector3(-forward.z,0,forward.x);n.leg++;n.metrics.legs++;
  const phase=((n.leg*37+e.id*59)%101)/101,playerPos=this.pos(player),distance=p.distanceTo(playerPos);let goal,mode;
  if(evade){goal=p.clone().addScaledVector(forward,105).addScaledVector(right,(e.id%2?1:-1)*65);goal.y+=e.id%2?8:-8;mode='受威胁规避';n.evadeUntil=time+3.2;n.evadeCooldown=time+8;n.metrics.evasions++;}
  else if(!watching&&player.speed>10&&distance<240&&!escape){
   const heading=this.dir({...player,pitch:0}),side=new THREE.Vector3(-heading.z,0,heading.x);
   // Commit to passing through a corridor near the player, never a stationary hover point.
   goal=playerPos.clone().addScaledVector(heading,65+e.id*22).addScaledVector(side,(e.id===1?-1:1)*(28+e.id*14));goal.y+=e.id===2?8:-5;mode=['交叉掠过','侧翼绕行','高位穿行'][e.id];
  }else{
   let angle=(phase-.5)*1.1;if(escape)angle=(n.turnBias<0?-1:1)*(1.0+phase*.5);
   if(distance>430||Math.abs(p.x)>this.extent-60||Math.abs(p.z)>this.extent-60){const home=playerPos.clone().sub(p);angle=Math.atan2(-home.x,-home.z)-e.s.yaw;}
   const dir=forward.clone().applyAxisAngle(new THREE.Vector3(0,1,0),angle);goal=p.clone().addScaledVector(dir,125+phase*65);goal.y+=Math.sin(n.leg*1.7+e.id)*9;mode=escape?'脱困换路':'自主巡航';
  }
  goal.y=FlightCore.clamp(goal.y,p.y-18,p.y+14);this.clampGoal(goal);
  // Reaching a boundary should produce a new inward leg, not an unreachable point behind it.
  if(p.distanceTo(goal)<45){goal=p.clone().addScaledVector(forward,-110).addScaledVector(right,85*(e.id%2?1:-1));this.clampGoal(goal);}
  n.goal=goal;n.origin=p;n.path=[];n.index=0;n.job=null;n.retry=time;n.lastGoalAt=time;n.progressAt=time;n.best=p.distanceTo(goal);n.mode=mode;n.lastCheck=time;n.visited=[p.clone()];if(escape)n.metrics.escapes++;
 }
 startSearch(e,time){
  const n=e.nav,start=this.pos(e.s),goal=n.goal.clone(),node={x:0,y:0,z:0,p:start,g:0,f:start.distanceTo(goal),key:'0,0,0',parent:null};
  n.job={start,goal,open:[node],seen:new Map([[node.key,node]]),closed:new Set(),edges:new Map(),expanded:0,best:node};n.metrics.plans++;n.retry=time+2.5;
 }
 search(e){
  const n=e.nav,job=n.job;if(!job)return;
  const finish=node=>{const path=[job.goal];for(let q=node;q?.parent;q=q.parent)path.unshift(q.p);n.path=path;n.index=0;n.job=null;};
  // Work is bounded per decision; a blocked district cannot stall a render frame.
  for(let budget=0;budget<8;budget++){
   if(!job.open.length||job.expanded>=240){if(job.best.p.distanceTo(job.goal)<job.start.distanceTo(job.goal)-35){const partial=[];for(let q=job.best;q?.parent;q=q.parent)partial.unshift(q.p);n.path=partial;n.index=0;}n.metrics.failedPlans++;n.job=null;return;}
   let at=0;for(let i=1;i<job.open.length;i++)if(job.open[i].f<job.open[at].f)at=i;const node=job.open.splice(at,1)[0];if(job.closed.has(node.key))continue;job.closed.add(node.key);job.expanded++;
   if(node.p.distanceTo(job.goal)<job.best.p.distanceTo(job.goal))job.best=node;
   const delta=job.goal.clone().sub(node.p),flat=Math.hypot(delta.x,delta.z),grade=delta.y/Math.max(1,flat);
   if(delta.length()<80&&grade<.14&&grade>-.25&&this.clear(node.p,job.goal,2)){finish(node);return;}
   for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){if(!dx&&!dz)continue;for(const dy of [0,-1,1]){
    const x=node.x+dx,y=node.y+dy,z=node.z+dz;if(Math.abs(x)>6||Math.abs(z)>6||Math.abs(y)>3)continue;const key=x+','+y+','+z;if(job.closed.has(key))continue;
    const p=job.start.clone().add(new THREE.Vector3(x*48,y*6,z*48)),g=node.g+p.distanceTo(node.p)*(dy>0?1.06:1),prior=job.seen.get(key);if(prior&&prior.g<=g)continue;
    const edge=node.key<key?node.key+'|'+key:key+'|'+node.key;let clear=job.edges.get(edge);if(clear===undefined){clear=this.clear(node.p,p,2);job.edges.set(edge,clear);}if(!clear)continue;
    const next={x,y,z,p,g,f:g+p.distanceTo(job.goal),key,parent:node};job.seen.set(key,next);job.open.push(next);
   }}
  }
 }
 aim(e,time){
  const n=e.nav,p=this.pos(e.s);
  if(n.path.length){
   // Discard passed points after planning while the aircraft was still moving.
   while(n.index<n.path.length-1&&p.distanceTo(n.path[n.index+1])<p.distanceTo(n.path[n.index])&&this.clear(p,n.path[n.index+1],2))n.index++;
   while(n.index<n.path.length&&p.distanceTo(n.path[n.index])<Math.max(12,e.s.speed*.7))n.index++;
   for(let i=Math.min(n.path.length-1,n.index+2);i>n.index;i--)if(this.clear(p,n.path[i],2)){n.index=i;break;}
   if(n.index<n.path.length)return n.path[n.index];n.path=[];n.index=0;
  }
  if(!n.job&&time>=n.retry&&!this.clear(p,n.goal,2))this.startSearch(e,time);this.search(e);
  return n.path[n.index]||n.goal;
 }
 rollout(e,target,turnBias,pitchBias,slow,others){
  const q={...e.s},start=this.pos(q),profile=this.profile(e),n=e.nav,dt=.2,steps=24;let steer=e.steer||0,first=null,survived=0,separation=0;
  for(let i=0;i<steps;i++){
   const p=this.pos(q),delta=target.clone().sub(p),flat=Math.hypot(delta.x,delta.z);let yaw=Math.atan2(-delta.x,-delta.z);
   // Fly through a waypoint during prediction instead of doing a U-turn around it.
   if(p.clone().sub(target).dot(target.clone().sub(start))>0)yaw=Math.atan2(start.x-target.x,start.z-target.z);
   const error=Math.atan2(Math.sin(yaw-q.yaw),Math.cos(yaw-q.yaw)),turn=FlightCore.clamp(error*1.8+turnBias*Math.exp(-i*dt*.35),-1,1),pitch=FlightCore.clamp(Math.atan2(delta.y,Math.max(25,flat))+pitchBias,-.21,this.race?.maxPitch??.125),command={turn,pitch:this.lift(pitch,(profile.maxClimbPitch??FlightCore.maxClimbPitch)+((profile.boostClimbPitch??profile.maxClimbPitch??FlightCore.maxClimbPitch)-(profile.maxClimbPitch??FlightCore.maxClimbPitch))*(q.boostControl||0)),slow};if(!first)first=command;
   steer+=(turn-steer)*(1-Math.exp(-8*dt));FlightCore.advance(q,{left:Math.max(0,steer),right:Math.max(0,-steer),pitch:command.pitch,boost:!!(this.race&&e.raceFast&&!(slow&&this.race.allowBraking)),slow:(!this.race||this.race.allowBraking)&&slow},dt,profile);
   const now=this.pos(q);if(!this.clear(p,now,1.65))break;survived+=dt;
   if(i%4===0)for(const other of others){if(other===e||other.dead)continue;const future=this.pos(other.s).addScaledVector(this.dir(other.s),other.s.speed*(i+1)*dt),distance=now.distanceTo(future);const clearance=this.race?.isHunter(e.id)?3:9;if(distance<clearance)separation+=(clearance-distance)*(clearance-distance)*.15;}
  }
  const progress=start.distanceTo(target)-this.pos(q).distanceTo(target),safe=survived>steps*dt-.01;
  return {command:first,survived,safe,turnBias,pitchBias,separation,score:(safe?1800:survived*130)+progress*1.6-separation-Math.abs(turnBias-n.turnBias)*6-Math.abs(pitchBias)*35};
 }
 update(e,player,time,others,watching=false){
  if(!e.nav)this.reset(e);const n=e.nav,p=this.pos(e.s);let goalChanged=false;
  if(this.race)this.race.plan(e,player,time);
  if(!n.goal){this.newLeg(e,player,time,watching);goalChanged=true;}
  const distance=p.distanceTo(n.goal);if(distance<n.best-3){n.best=distance;n.progressAt=time;}
  const passed=p.clone().sub(n.goal).dot(n.goal.clone().sub(n.origin))>0&&distance<65;
  if(distance<Math.max(18,e.s.speed*.8)||passed){n.metrics.arrivals++;this.newLeg(e,player,time,watching);goalChanged=true;}
  else if(time-n.progressAt>5.5||time-n.lastGoalAt>20){this.newLeg(e,player,time,watching,true);goalChanged=true;}
  // React only to visible aim or an actual hit, with a cooldown and a committed escape leg.
  const fromPlayer=p.clone().sub(this.pos(player)),near=fromPlayer.length(),aimed=near<75&&near>1&&fromPlayer.normalize().dot(this.dir(player))>.995;
  if(!this.race&&!watching&&time>n.evadeCooldown&&((e.hp<n.hp)||aimed&&!this.world.raycast(this.pos(player),fromPlayer,near-1))){this.newLeg(e,player,time,watching,false,true);goalChanged=true;}n.hp=e.hp;
  if(!this.race&&!goalChanged&&!watching&&player.speed>10&&time-n.lastGoalAt>6&&p.distanceTo(this.pos(player))>180)this.newLeg(e,player,time,watching);
  const target=this.aim(e,time),delta=target.clone().sub(p),yaw=Math.atan2(-delta.x,-delta.z),error=Math.abs(Math.atan2(Math.sin(yaw-e.s.yaw),Math.cos(yaw-e.s.yaw)));
  e.cruiseSpeed=n.evadeUntil>time?26:FlightCore.clamp(24+e.id-error*5,14,26);
  let best=this.rollout(e,target,0,0,false,others);
  if(!best.safe||best.separation>12){
   const braking=best.survived<2.8;
   for(const bias of [-2,-1,0,1,2])for(const vertical of [0,-.12,.12]){if(!bias&&!vertical&&!braking)continue;const candidate=this.rollout(e,target,bias,vertical,braking,others);if(candidate.score>best.score)best=candidate;}
  }
  e.command=best.command;n.turnBias=best.turnBias;n.predictedClearance=best.survived;n.planning=!!n.job;
  e.behavior=!best.safe?'减速脱险':Math.abs(best.turnBias)>.01||Math.abs(best.pitchBias)>.01?'绕障穿行':n.path.length?'沿绕行航线':n.mode;
 }
}
if(typeof module!=='undefined')module.exports=PaperPilot;

