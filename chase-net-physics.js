/* Identical 60 Hz flight/collision code on the server and predicting client. */
(function(root,factory){if(typeof module!=='undefined')module.exports=factory;else root.ChaseNetPhysics=factory(THREE,FlightCore,FlightContact,Labyrinth);})(globalThis,function(T,C,Contact,L){
 const DT=1/60,LOCK=2.3,RANGE=35,CONE=25,SEED=73021,skins=['original','white','math','mechanical','inkbird','papersky'];
 const hunter={...L.combatProfile,cruiseSpeed:22,cruiseMaxSpeed:22,boostSpeed:42,maxSpeed:42,slowSpeed:13,pitchDrag:2,turnRate:1.65,boostTurnRate:.75,bankAngle:.60,boostBankAngle:.34,maxClimbPitch:.34,boostClimbPitch:.21,pitchResponse:3.6,boostPitchResponse:1.8,liftResponse:4,boostLiftResponse:2.5,liftReleaseResponse:5.2,boostLiftReleaseResponse:4.5,diveResponse:4.4,boostDiveResponse:2.5,accelerationRate:1.8};
 const runner={...hunter,cruiseSpeed:30,cruiseMaxSpeed:30,boostSpeed:30,maxSpeed:30,slowSpeed:18,turnRate:1.05,boostTurnRate:1.05,bankAngle:.43,boostBankAngle:.43,maxClimbPitch:.26,boostClimbPitch:.26,pitchResponse:2.3,boostPitchResponse:2.3,liftResponse:3,boostLiftResponse:3,liftReleaseResponse:4.5,boostLiftReleaseResponse:4.5,diveResponse:3,boostDiveResponse:3};
 // Cosmetics share the same paper-sized collision hull for fair play.
 const vertices=[[0,0,-.742],[-.454,.016,.60],[.454,.016,.60],[0,-.10,.25],[0,-.08,.65]].map(p=>new T.Vector3(...p)),points=[new T.Vector3(),...vertices];
 for(const [a,b] of [[0,1],[0,2],[1,2]])for(const t of [.25,.5,.75])points.push(vertices[a].clone().lerp(vertices[b],t));
 const shape={points,radius:.85,padding:.05};
 const collision=isHunter=>isHunter?{tangentRetention:.70,wallBounce:.07,groundBounce:.10}:{tangentRetention:.90,wallBounce:.11,groundBounce:.13};
 const pos=s=>new T.Vector3(s.x,s.y,s.z),dir=s=>new T.Vector3(...Object.values(C.direction(s.yaw,s.pitch)));
 const neutral=()=>({left:0,right:0,pitch:0,boost:false,slow:false});
 function input(i={}){return {left:i.left===1?1:0,right:i.right===1?1:0,pitch:[-1,0,1].includes(i.pitch)?i.pitch:0,boost:i.boost===true&&i.slow!==true,slow:i.slow===true};}
 function spawn(world,slot=0){const p=world.spawn(3);p.x+=Math.cos(p.yaw)*slot*5;p.z-=Math.sin(p.yaw)*slot*5;return {...p,pitch:.1,bank:0,speed:8,distance:0,acceleration:0,climbInput:0,boostControl:0,age:0};}
 function step(s,i,isHunter,body,world){i=input(i);if(!isHunter)i.boost=false;const base=isHunter?hunter:runner;let cfg=base;s.age=(s.age||0)+DT;if(s.age<3){const t=s.age/3,e=t*t*(3-2*t);cfg={...base,cruiseSpeed:8+(base.cruiseSpeed-8)*e,trimPitch:C.trimPitch*e};}const old={...s};C.advance(s,i,DT,cfg);body.move(old,s,DT,{...shape,...collision(isHunter),sweepHull:world.sweepHull,raycast:world.raycast,ground:world.ground});
  // The online arena is the fourth floor, without cross-floor teleport shortcuts.
  const minY=L.bases[3]*L.scale+2,maxY=L.bases[4]*L.scale-5;
  s.x=C.clamp(s.x,-world.width/2+2,world.width/2-2);s.z=C.clamp(s.z,-world.depth/2+2,world.depth/2-2);if(s.y<minY){s.y=minY;s.pitch=Math.max(.04,s.pitch);body.reset();}if(s.y>maxY){s.y=maxY;s.pitch=Math.min(-.04,s.pitch);body.reset();}return s;
 }
 function pack(b){return {velocity:b.velocity.toArray(),recovery:b.recovery,cooldown:b.cooldown,normals:b.normals.map(c=>({n:c.n.toArray(),point:c.point.toArray(),reach:c.reach}))};}
 function restore(b,v){b.reset();if(!v)return;b.velocity.fromArray(v.velocity);b.recovery=v.recovery;b.cooldown=v.cooldown;b.normals=v.normals.map(c=>({n:new T.Vector3(...c.n),point:new T.Vector3(...c.point),reach:c.reach}));}
 function clear(world,a,b){const d=b.clone().sub(a),n=d.length();return n<1e-6||!world.raycast(a,d.divideScalar(n),n);}
 function inspect(world,a,b){const d=pos(b).sub(pos(a)),distance=d.length();
  const reason=distance>RANGE+1e-8?'range':distance>=.01&&d.divideScalar(distance).dot(dir(a))<Math.cos(CONE*Math.PI/180)-1e-12?'angle':!clear(world,pos(a),pos(b))?'blocked':'ready';return {distance,reason};}
 function eligible(world,a,b){return inspect(world,a,b).reason==='ready';}
 return {DT,LOCK,RANGE,CONE,SEED,skins,hunter,runner,collision,pos,dir,neutral,input,spawn,step,pack,restore,inspect,eligible,clear,Contact};
});
