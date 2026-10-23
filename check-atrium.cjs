const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const R=require('./atrium-layout.js'),THREE=require('./vendor/three.min.js');
assert.deepEqual(R.layout(73021),R.layout(73021),'a seed reproduces the same layout');
assert.notDeepEqual(R.layout(73021),R.layout(73022),'reshuffling changes the layout');
for(let seed=0;seed<100;seed++)for(const floor of R.layout(seed)){
  assert.ok(floor.items.length>=8,'each floor has a useful variety of obstacles');
  assert.ok(floor.openRatio>.7,'at least seventy percent of the floor remains open');
  for(const p of floor.items){
    assert.ok(Math.abs(p.x)-p.w/2>=1.35&&Math.abs(p.z)-p.d/2>=1.35,'the full cross-shaped corridor stays clear');
    assert.ok(Math.abs(p.x)-p.w/2>=3.3||Math.abs(p.z)-p.d/2>=3.3,'no random obstacle intrudes into the atrium opening');
    assert.ok(Math.abs(p.x)+p.w/2<=7.05&&Math.abs(p.z)+p.d/2<=7.05,'obstacles stay inside the room');
  }
}
assert.equal(R.ground(0,0,12),0,'the atrium opening remains continuous to the ground');
assert.equal(R.ground(0,6,12),10,'the top landing area has the correct elevation');
assert.equal(R.ground(0,6,8),5,'the middle landing area has the correct elevation');
assert.equal(R.draft(2.4,8,0),0,'the right side is a calm descent route');
assert.ok(R.draft(-.65,8,0)>2,'the rising column can overcome the gentle descent');
assert.equal(R.draft(-.65,14.7,0),0,'the updraft fades before the ceiling');
for(let x=-4;x<4;x+=.01)assert.ok(Math.abs(R.draft(x+.001,8,0)-R.draft(x,8,0))<.01,'the wind boundary is smooth');

// Canvas painting is visual-only; geometry and collision checks use a no-op context.
const ctx=new Proxy({}, {get(target,key){return key in target?target[key]:()=>{};}});
const sandbox={THREE,AtriumRules:R,document:{createElement:()=>({getContext:()=>ctx})}};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync(require.resolve('./atrium.js'),'utf8'),sandbox);
const world=sandbox.buildAtrium({capabilities:{getMaxAnisotropy:()=>4}},73021);
for(const collider of world.colliders){const b=collider.bounds||collider.userData.bounds;assert.ok([...b.min.toArray(),...b.max.toArray()].every(Number.isFinite),'all colliders have finite bounds');}
function downwardHit(x,z){const ray=new THREE.Ray(new THREE.Vector3(x,14,z),new THREE.Vector3(0,-1,0)),hit=new THREE.Vector3();let y=-Infinity;for(const c of world.colliders){const b=c.bounds||c.userData.bounds;if(ray.intersectBox(b,hit))y=Math.max(y,hit.y);}return y;}
assert.equal(downwardHit(0,0),0,'no hidden floor blocks the vertical opening');
assert.equal(downwardHit(0,6),10,'upper landing deck is solid');
const ring=world.colliders.find(c=>c.userData?.kind==='发光圆环');
assert.ok(ring,'the lab has a fly-through ring');
assert.equal(new THREE.Raycaster(new THREE.Vector3(5.7,12,-7),new THREE.Vector3(0,0,1)).intersectObject(ring).length,0,'the ring centre is really open');
assert.ok(new THREE.Raycaster(new THREE.Vector3(6.68,12,-7),new THREE.Vector3(0,0,1)).intersectObject(ring).length>0,'the ring rim has collision geometry');
world.dispose();
console.log('PASS: 100 seeded layouts, open corridors, landing decks, continuous atrium, smooth updraft, calm descent lane, real ring opening.');
