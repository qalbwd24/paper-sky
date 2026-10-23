/* Browser-side pursuit: moving interception, retained routes and speed matching. */
class PaperPursuit{
 static input(command,memory,boost,slow){memory.turnDebt=(memory.turnDebt||0)+FlightCore.clamp(command.turn||0,-1,1);const turn=memory.turnDebt>.5?1:memory.turnDebt<-.5?-1:0;memory.turnDebt-=turn;const lift=FlightCore.clamp(command.pitch||0,-1,1);memory.liftDebt=(memory.liftDebt||0)+(lift>0?4.5*lift/(3+1.5*lift):lift);const pitch=memory.liftDebt>.5?1:memory.liftDebt<-.5?-1:0;memory.liftDebt-=pitch;return {left:turn>0?1:0,right:turn<0?1:0,pitch,boost:!!boost&&!slow,slow:!!slow};}
 constructor(pilot,selectTarget){this.pilot=pilot;this.selectTarget=selectTarget;this.track=null;this.target=null;this.desiredSpeed=22;this.nextRoute=0;this.lastRouteGoal=null;}
 reset(){this.track=null;this.target=null;this.nextRoute=0;this.lastRouteGoal=null;}
 clamp(point){const p=this.pilot;point.x=FlightCore.clamp(point.x,-p.extent,p.extent);point.z=FlightCore.clamp(point.z,-p.extent,p.extent);point.y=FlightCore.clamp(point.y,p.world.ground(point.x,point.z,point.y)+3,p.top-3);return point;}
 predict(target,self,time,latency){const p=this.pilot,pos=p.pos(target.s),velocity=p.dir(target.s).multiplyScalar(target.s.speed),delta=pos.clone().sub(p.pos(self.s)),speed=42,a=velocity.lengthSq()-speed*speed,b=2*delta.dot(velocity),c=delta.lengthSq(),disc=b*b-4*a*c;let intercept=Math.sqrt(c)/speed;if(disc>=0&&Math.abs(a)>1e-6){const roots=[(-b-Math.sqrt(disc))/(2*a),(-b+Math.sqrt(disc))/(2*a)].filter(t=>t>0);if(roots.length)intercept=Math.min(...roots);}
  let omega=0;if(this.track?.id===target.id){const dt=time-this.track.time;if(dt>.05){const turn=Math.atan2(Math.sin(target.s.yaw-this.track.yaw),Math.cos(target.s.yaw-this.track.yaw))/dt;omega=this.track.omega*.65+FlightCore.clamp(turn,-1.1,1.1)*.35;}}
  this.track={id:target.id,time,yaw:target.s.yaw,omega};const horizon=FlightCore.clamp(intercept,Math.sqrt(c)<20?.08:.25,Math.sqrt(c)<20?.22:2.2)+FlightCore.clamp(latency,0,.3),heading={...target.s,yaw:target.s.yaw+omega*horizon*.5};let goal=pos.clone().addScaledVector(p.dir(heading),target.s.speed*horizon);const travel=goal.clone().sub(pos),length=travel.length(),hit=length>.01?p.world.raycast(pos,travel.clone().divideScalar(length),length):null;if(hit)goal=pos.clone().addScaledVector(travel.divideScalar(length),Math.max(0,hit.distance-3));return this.clamp(goal);
 }
 update(e,players,id,time,latency=0){const p=this.pilot,n=e.nav,position=p.pos(e.s),nearest=this.selectTarget(players,{id,s:e.s}),previous=players.find(q=>q.id===this.target&&q.online&&q.kind!=='bot');const target=previous&&nearest&&position.distanceTo(p.pos(previous.s))<position.distanceTo(p.pos(nearest.s))*1.4+15?previous:nearest;if(!target){this.target=null;e.raceFast=false;e.raceSlow=false;return false;}const changed=this.target!==target.id;this.target=target.id;
  const goal=this.predict(target,{s:e.s},time,latency),direct=p.clear(position,goal,1.2);if(!n.goal||changed){Object.assign(n,{origin:position.clone(),path:[],index:0,job:null,retry:time,progressAt:time,best:Infinity});this.nextRoute=0;}n.goal=goal;n.lastGoalAt=time;n.mode='预测截击';
  // A moving goal must not discard a valid path every decision. Replan only
  // after material displacement, while retaining the current safe corridor.
  if(direct){n.path=[];n.index=0;n.job=null;this.lastRouteGoal=goal.clone();}
  else if(time>=this.nextRoute&&(!this.lastRouteGoal||this.lastRouteGoal.distanceTo(goal)>45||!n.path.length&&!n.job)){n.job=null;n.retry=time;this.nextRoute=time+2;this.lastRouteGoal=goal.clone();}
  const aim=direct?goal:p.aim(e,time);if(n.job)p.search(e);
  const delta=aim.clone().sub(position),yaw=Math.atan2(-delta.x,-delta.z),error=Math.abs(Math.atan2(Math.sin(yaw-e.s.yaw),Math.cos(yaw-e.s.yaw))),toTarget=p.pos(target.s).sub(position),distance=toTarget.length(),line=toTarget.clone().normalize(),along=p.dir(target.s).multiplyScalar(target.s.speed).dot(line);
  this.desiredSpeed=distance>22?42:FlightCore.clamp(along+(distance-6)*1.9,13,42);
  if(error>.55)this.desiredSpeed=Math.min(this.desiredSpeed,FlightCore.clamp(32-error*17,13,25));
  const horizon=e.s.speed*.9+7,front=p.world.raycast(position,p.dir(e.s),horizon);if(front)this.desiredSpeed=Math.min(this.desiredSpeed,front.distance<e.s.speed*.65+4?13:22);
  const slow=this.desiredSpeed<20||e.s.speed>this.desiredSpeed+4;e.raceSlow=slow;e.raceFast=!slow&&(e.raceFast?e.s.speed<this.desiredSpeed+.65:e.s.speed<this.desiredSpeed-.65)&&this.desiredSpeed>23;
  const others=players.filter(q=>q.id!==id&&q.id!==target.id).map((q,i)=>({id:i,s:q.s,dead:!q.online}));let best=p.rollout(e,aim,0,0,slow,others);
  if(!best.safe){for(const bias of [-1.6,-.8,.8,1.6]){const option=p.rollout(e,aim,bias,0,true,others);if(option.score>best.score)best=option;}if(best.survived<2)for(const pitch of [-.12,.15]){const option=p.rollout(e,aim,best.turnBias,pitch,true,others);if(option.score>best.score)best=option;}}
  e.command=best.command;n.turnBias=best.turnBias;n.predictedClearance=best.survived;n.planning=!!n.job;if(best.command.slow){e.raceSlow=true;e.raceFast=false;}e.behavior=!best.safe?'提前制动绕障':n.path.length||n.job?'沿通道截击':e.raceSlow?'减速咬住目标':e.raceFast?'加速拦截':'跟随锁定';
  const d=position.distanceTo(goal);if(d<n.best-2){n.best=d;n.progressAt=time;}if(time-n.progressAt>5){n.path=[];n.job=null;n.retry=time;this.nextRoute=0;n.progressAt=time;n.best=d;}return true;
 }
}
if(typeof module!=='undefined')module.exports=PaperPursuit;
