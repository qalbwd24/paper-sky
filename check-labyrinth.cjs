const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),THREE=require('./vendor/three.min.js');
const sandbox={THREE};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(__dirname+'/labyrinth.js','utf8')+'\nthis.R=Labyrinth;',sandbox);const R=sandbox.R,world=sandbox.buildLabyrinth(Number(process.argv[2])||73021),plan=world.plan;
assert.equal(world.width,1680);assert.equal(world.levels.length,5);assert.equal(world.connectors.length,4);assert.equal(new Set(R.themes.map(t=>t.sky)).size,5);
assert.equal(plan.portals.length,8);assert.equal(new Set(plan.layers.map(l=>JSON.stringify(l.nodes))).size,5);assert.notDeepEqual(R.plan(73021).layers,R.plan(73022).layers);
let maxGrade=0;for(let i=0;i<=1000;i++){for(const spec of plan.physical){const d=spec.curve.getTangentAt(i/1000);maxGrade=Math.max(maxGrade,Math.asin(d.y));}}assert.ok(maxGrade<8*Math.PI/180,'every part of the connector is climbable within the pitch limit');
for(let l=0;l<5;l++){const p=world.spawn(l);assert.ok(p.y>world.ground(p.x,p.z,p.y)+30);assert.equal(world.floorAt(p.y),l);}
function trace(a,b){const d=b.clone().sub(a),len=d.length();return world.raycast(a,d.normalize(),len);}
const failures=[];
for(let l=0;l<5;l++)for(const r of plan.layers[l].routes){const points=r.curve.getSpacedPoints(180).map(p=>p.add(new THREE.Vector3(0,R.bases[l]*R.scale,0)));for(let j=1;j<points.length;j++){const h=trace(points[j-1],points[j]);if(h)failures.push({floor:l,route:r.i,t:j/180,kind:h.kind});}}
console.log('Main route centre obstructions:',JSON.stringify(failures.slice(0,40)),'total',failures.length);
assert.equal(failures.length,0,'main route centres cannot be blocked by intersecting structures');
for(let l=0;l<4;l++){const pts=plan.physical[l].curve.getSpacedPoints(1200);for(let i=1;i<pts.length;i++)assert.equal(trace(pts[i-1],pts[i]),null,'connector centre must remain physically open at '+l+':'+i);}
const p=plan.physical[0].curve.getPointAt(.48),t=plan.physical[0].curve.getTangentAt(.48),right=new THREE.Vector3(-t.z,0,t.x).normalize();assert.ok(trace(p,p.clone().addScaledVector(right,75)),'the actual tunnel wall stops the plane');
assert.ok(trace(new THREE.Vector3(0,290,0),new THREE.Vector3(0,325,0)),'floor underside blocks direct central ascent');
for(const c of world.colliders)assert.ok([...c.bounds.min.toArray(),...c.bounds.max.toArray()].every(Number.isFinite));
for(const gate of plan.portals){world.reset();const n=new THREE.Vector3(Math.sin(gate.yaw),0,Math.cos(gate.yaw)),a=new THREE.Vector3(gate.x,gate.y,gate.z).addScaledVector(n,10),b=a.clone().addScaledVector(n,-20);assert.equal(trace(a,b),null,'fold gate opening is clear');const state={x:b.x,y:b.y,z:b.z,yaw:gate.yaw,pitch:.03,speed:60};assert.ok(world.travel(a,state,1/120));assert.equal(world.floorAt(state.y),plan.portals[gate.target].level);assert.equal(state.speed,60);assert.equal(state.pitch,.03);assert.equal(trace(new THREE.Vector3(state.x,state.y,state.z),new THREE.Vector3(state.x,state.y,state.z).addScaledVector(n,5)),null,'fold destination has clearance');}
const C=require('./flight-core.js'),state={x:0,y:0,z:0,yaw:0,pitch:0,bank:0,speed:8,distance:0,climbInput:0};for(let i=0;i<120*20;i++)C.advance(state,{left:0,right:0,pitch:-1,boost:true,slow:false},1/120,R.flightProfile);assert.ok(state.speed>148&&state.speed<=155,'maze dive boost reaches the raised speed limit');
console.log('PASS: five large worlds, unique palettes, four open winding connections, max grade '+(maxGrade*180/Math.PI).toFixed(2)+' degrees, real tunnel walls, solid upper floor, finite spatial colliders.');
console.log(world.stats);

