// Static geometry review, not a screenshot or measurement of the running game.
const fs=require('node:fs');global.THREE=require('./vendor/three.min.js');const {createInkBird}=require('./ink-bird.js');
const sharp=require(process.env.CODEX_NODE_MODULES+'/sharp');
const panels=[['GLIDE',-.21,0],['CLIMB',.38,0],['DIVE',-.72,0],['BANK',0,.75]];
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="960"><rect width="1440" height="960" fill="#f4f2e9"/>';
for(let k=0;k<4;k++){
 const [label,pitch,bank]=panels[k],b=createInkBird();b.group.visible=true;
 for(let i=0;i<300;i++)b.update(1/120,{pitch,bank,active:true});
 b.group.rotation.set(pitch*.35,0,bank*.55);b.group.updateMatrixWorld(true);
 const camera=new THREE.PerspectiveCamera(35,1.5,.001,10);camera.position.set(.23,.27,.45);camera.lookAt(0,0,.01);camera.updateMatrixWorld(true);
 const view=camera.matrixWorldInverse,x=(k%2)*720,y=Math.floor(k/2)*480,tri=[];
 b.group.traverse(m=>{if(!m.isMesh)return;const a=m.geometry.attributes.position,c=m.geometry.attributes.color;
 for(let i=0;i<a.count;i+=3){const points=[],color=new THREE.Color(0,0,0);let depth=0;
 for(let j=0;j<3;j++){const v=new THREE.Vector3().fromBufferAttribute(a,i+j).applyMatrix4(m.matrixWorld);depth+=v.clone().applyMatrix4(view).z;v.project(camera);points.push([x+360+v.x*340,y+250-v.y*225]);color.r+=c.getX(i+j)/3;color.g+=c.getY(i+j)/3;color.b+=c.getZ(i+j)/3;}
 tri.push({depth,points,color:'#'+color.getHexString()});}});
 tri.sort((a,b)=>a.depth-b.depth);svg+=`<text x="${x+36}" y="${y+46}" fill="#666a60" font-family="sans-serif" font-size="17" letter-spacing="4">${label}</text>`;
 for(const t of tri)svg+=`<polygon points="${t.points.map(v=>v.map(n=>n.toFixed(2)).join(',')).join(' ')}" fill="${t.color}"/>`;
}
svg+='</svg>';fs.writeFileSync(__dirname+'/references/ink-bird-poses.svg',svg,'utf8');
sharp(Buffer.from(svg)).png().toFile(__dirname+'/references/ink-bird-poses.png').then(()=>console.log('Saved static bird geometry preview.'));
