// Exercise the existing keyboard-limited flight model through the entire winding tube.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),THREE=require('./vendor/three.min.js'),C=require('./flight-core.js');
const sb={THREE};vm.createContext(sb);vm.runInContext(fs.readFileSync(__dirname+'/labyrinth.js','utf8')+';this.R=Labyrinth;',sb);const world=sb.buildLabyrinth();
for(const spec of world.plan.physical)for(const reverse of [false,true]){
  const path=spec.curve.getSpacedPoints(2200);
  const pts=reverse?path.slice().reverse():path,dir=pts[1].clone().sub(pts[0]).normalize(),state={x:pts[0].x,y:pts[0].y,z:pts[0].z,yaw:Math.atan2(-dir.x,-dir.z),pitch:Math.asin(dir.y),bank:0,speed:23,climbInput:0,distance:0,acceleration:0};let index=0,maxError=0,frames=0;
  for(;frames<60*800&&index<pts.length-3;frames++){
    const p=new THREE.Vector3(state.x,state.y,state.z);while(index+1<pts.length&&p.distanceToSquared(pts[index+1])<p.distanceToSquared(pts[index]))index++;
    const lookahead=Math.max(13,Math.ceil(state.speed*.75/(spec.length/2200)));
    const aim=pts[Math.min(pts.length-1,index+lookahead)],yaw=Math.atan2(state.x-aim.x,state.z-aim.z),error=Math.atan2(Math.sin(yaw-state.yaw),Math.cos(yaw-state.yaw));
    // Bang-bang I / release and J / L only. No added lift and no altered maximum pitch.
    C.advance(state,{left:error>.012?1:0,right:error<-.012?1:0,pitch:state.y<aim.y+2?1:0,boost:false,slow:false},1/60,sb.R.flightProfile);
    const b=new THREE.Vector3(state.x,state.y,state.z),d=b.clone().sub(p),length=d.length(),collision=world.raycast(p,d.normalize(),length);assert.equal(collision,null,'keyboard controller hit '+collision?.kind+' at sample '+index+' reverse='+reverse);
    maxError=Math.max(maxError,b.distanceTo(pts[index]));
  }
  assert.ok(index>=pts.length-3,'the full connection must be traversable');
  console.log('PASS: '+(reverse?'descending':'ascending')+' entire '+Math.round(spec.length)+' m tube with current maze keyboard physics; '+(frames/60).toFixed(1)+' simulated seconds, max centre deviation '+maxError.toFixed(1)+' m.');
}
