const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),THREE=require('./vendor/three.min.js');
const context={THREE};vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/labyrinth.js','utf8')+'\nthis.rules=Labyrinth;',context);
for(const seed of [73021,2300099960,17]){
  const world=context.buildLabyrinth(seed),R=context.rules;
  // At every floor height (including the former switch thresholds), routes must remain visible.
  for(let y=0;y<=world.height;y+=10){world.update(0,y);for(const c of world.connectors)assert.ok(c.visible&&c.parent.visible,'a tunnel disappeared at altitude '+y);for(const f of world.foundations)assert.ok(f.visible&&f.parent===world.group,'sky slab cannot inherit upper scenery culling');}
  const camera=new THREE.PerspectiveCamera(58,16/9,.012,world.viewDistance),frustum=new THREE.Frustum(),matrix=new THREE.Matrix4();
  for(let l=0;l<5;l++){const p=world.spawn(l);camera.position.set(p.x,p.y,p.z);
    for(const route of world.plan.physical)for(const target of route.curve.getSpacedPoints(24)){
      assert.ok(camera.position.distanceTo(target)+route.radius<world.viewDistance,'far clip cuts off a visible route');camera.lookAt(target);camera.updateMatrixWorld(true);matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(matrix);assert.ok(frustum.containsPoint(target),'route cannot enter the camera frustum');
    }
  }
  for(let l=1;l<5;l++){
    const slab=world.foundations[l],g=slab.geometry,n=g.attributes.normal,a=g.attributes.color,expected=new THREE.Color(R.themes[l-1].sky);assert.ok(slab.material.isMeshBasicMaterial,'sky must be independent of sun direction');
    for(let i=0;i<n.count;i++)if(n.getY(i)<-.5)assert.ok(Math.abs(a.getX(i)-expected.r)+Math.abs(a.getY(i)-expected.g)+Math.abs(a.getZ(i)-expected.b)<1e-6,'underside uses the wrong floor palette');
    const y=R.bases[l]*R.scale;assert.ok(world.raycast(new THREE.Vector3(0,y-30,0),new THREE.Vector3(0,1,0),40),'physical upper floor must still stop direct ascent');
  }
  console.log('PASS visibility seed',seed,'far',world.viewDistance,'metres; routes remain visible, underside sky palette and solid ceilings intact.');world.dispose();
}
