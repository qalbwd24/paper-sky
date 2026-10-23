/* A4-sized dart: metres, sharp nose = local -Z, texture coordinates follow the paper. */
function createPaperPlane(renderer){
  const group=new THREE.Group();group.scale.setScalar(.7);
  const W=.18,L=.265;
  function scratchTexture(mechanics=false){
    const c=document.createElement('canvas');c.width=1024;c.height=1448;const ctx=c.getContext('2d');
    ctx.fillStyle='#f3f0df';ctx.fillRect(0,0,c.width,c.height);
    let seed=413;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<28000;i++){ctx.fillStyle=rand()>.5?'rgba(99,82,56,.025)':'rgba(255,255,255,.10)';ctx.fillRect(rand()*1024,rand()*1448,1+rand()*2,1);}
    ctx.strokeStyle='rgba(84,135,161,.24)';ctx.lineWidth=1;for(let y=0;y<1448;y+=28){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(1024,y);ctx.stroke();}for(let x=0;x<1024;x+=28){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,1448);ctx.stroke();}
    ctx.strokeStyle='rgba(174,84,79,.17)';ctx.beginPath();ctx.moveTo(73,38);ctx.lineTo(73,1400);ctx.stroke();
    const notes=[
      ['高二数学 · 草稿',105,90,39,-.03],['9 / 10    函数与导数',550,139,26,.02],
      ['① f(x) = x² − 3x + 2',90,220,36,-.025],['Δ = 9 − 8 = 1',145,284,33,.02],['∴ x₁ = 1，x₂ = 2',101,355,34,-.01],
      ['f′(x) = 2x − 3',515,252,35,.035],['令 f′(x) = 0',530,320,33,-.01],['x = 3/2，f(x)min = −1/4',470,390,29,.025],
      ['② sin 2α = 2sinα cosα',91,474,33,.015],['cos²α + sin²α = 1',114,534,32,-.035],['注意：定义域！',610,550,32,.065],
      ['③ aₙ = a₁ + (n−1)d',100,815,35,-.025],['Sₙ = n(a₁+aₙ) / 2',125,887,34,.02],['= na₁ + n(n−1)d / 2',109,956,32,-.025],
      ['P(A∩B) = P(A)P(B)',510,820,31,.015],['独立事件',600,879,29,-.06],
      ['向量：a·b = |a||b|cosθ',112,1089,34,.01],['|a+b|² = |a|² + 2a·b + |b|²',95,1167,31,-.02],
      ['再验一遍 x = 1',545,1295,31,.04],['答：取 x ≥ 2',118,1357,35,-.035]
    ];
    if(!mechanics){
    for(const [text,x,y,size,angle] of notes){ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.font=`${size}px KaiTi, STKaiti, cursive`;ctx.fillStyle='rgba(38,62,94,.83)';ctx.fillText(text,0,0);ctx.restore();}
    ctx.strokeStyle='#536783';ctx.lineWidth=2.4;ctx.beginPath();ctx.moveTo(550,715);ctx.lineTo(942,715);ctx.moveTo(697,745);ctx.lineTo(697,447);ctx.stroke();ctx.beginPath();for(let i=-135;i<195;i++){const x=697+i,y=699-(i-30)*(i-30)/95;if(i===-135)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();
    ctx.font='26px KaiTi, serif';ctx.fillStyle='#435b7b';ctx.fillText('O',669,743);ctx.fillText('x',951,724);ctx.fillText('y',685,446);
    ctx.strokeStyle='rgba(163,67,65,.65)';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(727,541,138,31,.03,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(508,1268);ctx.lineTo(897,1285);ctx.moveTo(522,1280);ctx.lineTo(884,1265);ctx.stroke();
    }else{
      ctx.strokeStyle='#334c68';ctx.fillStyle='#334c68';ctx.lineWidth=3;
      const label=(text,x,y,size=32)=>{ctx.font=`${size}px KaiTi, STKaiti, serif`;ctx.fillText(text,x,y);};
      const line=(...p)=>{ctx.beginPath();ctx.moveTo(p[0],p[1]);for(let i=2;i<p.length;i+=2)ctx.lineTo(p[i],p[i+1]);ctx.stroke();};
      const circle=(x,y,r)=>{ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();};
      const pin=(x,y)=>{circle(x,y,7);};
      label('机械原理 / 机械设计 · 草稿',84,88,39);label('832  复习',687,142,29);
      label('① 铰链四杆机构',83,210,35);
      line(132,448,255,295,570,341,659,448);line(132,448,659,448);
      for(const [x,y] of [[132,448],[255,295],[570,341],[659,448]])pin(x,y);
      label('A',99,442,25);label('B',232,278,25);label('C',568,323,25);label('D',668,445,25);
      for(const x of [132,659]){line(x,457,x-18,484,x+18,484,x,457);for(let j=-23;j<22;j+=9)line(x+j,485,x+j-9,497);}
      label('F = 3n − 2Pₗ − Pₕ',110,555,36);label('= 3×3 − 2×4 = 1',120,608,33);
      label('② 渐开线直齿轮',102,693,34);
      function gear(x,y,r,teeth){ctx.beginPath();for(let i=0;i<=teeth*4;i++){const a=i/(teeth*4)*Math.PI*2,rr=(i%4===1||i%4===2)?r+9:r;const px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr;if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}ctx.stroke();circle(x,y,r*.35);ctx.save();ctx.setLineDash([8,5]);circle(x,y,r+4);ctx.restore();}
      gear(240,849,74,16);gear(452,849,128,28);line(126,849,612,849);label('d = mz',650,792,34);label('i₁₂ = z₂ / z₁',620,861,33);label('ω₁ ↻',151,984,31);label('↺ ω₂',433,1031,31);
      label('③ 轴系结构 · 定位',95,1118,34);
      line(115,1198,215,1198,215,1179,607,1179,607,1198,862,1198,862,1236,607,1236,607,1255,215,1255,215,1236,115,1236,115,1198);
      for(const x of [277,709]){ctx.strokeRect(x,1152,45,130);line(x,1152,x+45,1282);line(x+45,1152,x,1282);}
      ctx.save();ctx.setLineDash([18,7,3,7]);line(83,1217,937,1217);ctx.restore();
      label('轴肩定位  /  轴承端盖',154,1357,31);ctx.strokeStyle='#aa5550';line(608,1267,655,1310,864,1310);label('留间隙',704,1340,26);
    }
    ctx.strokeStyle='rgba(70,66,62,.075)';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(511,0);ctx.lineTo(516,1448);ctx.stroke();
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t;
  }
  const texture=scratchTexture();
  const math=new THREE.MeshStandardMaterial({color:'#ffffff',map:texture,roughness:.92,metalness:0,side:THREE.DoubleSide});
  const mechanical=new THREE.MeshStandardMaterial({color:'#ffffff',map:scratchTexture(true),roughness:.92,metalness:0,side:THREE.DoubleSide});
  const white=new THREE.MeshStandardMaterial({color:'#fffaf0',roughness:.92,metalness:0,side:THREE.DoubleSide});
  const nose=[0,0,-L/2],left=[-W/2,.002,L/2],right=[W/2,.002,L/2],lr=[-.006,-.002,.106],rr=[.006,-.002,.106],ridge=[0,-.003,.112],keel=[0,-.014,.118];
  const positions=[],uv=[];
  function tri(a,b,c){positions.push(...a,...b,...c);for(const p of [a,b,c])uv.push(.5+p[0]/.21,1-(p[2]+L/2)/.297);}
  tri(nose,left,lr);tri(nose,rr,right);tri(nose,lr,ridge);tri(nose,ridge,rr);tri(nose,keel,lr);tri(nose,rr,keel);tri(lr,keel,ridge);tri(ridge,keel,rr);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();
  const mesh=new THREE.Mesh(g,math);mesh.castShadow=true;mesh.receiveShadow=false;group.add(mesh);
  group.userData.createOpponent=color=>{const enemy=new THREE.Group();enemy.scale.copy(group.scale);const material=white.clone();material.color.set(color);material.emissive=new THREE.Color(color);material.emissiveIntensity=.12;const body=new THREE.Mesh(g.clone(),material);body.castShadow=true;enemy.add(body);enemy.add(new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry,10),new THREE.LineBasicMaterial({color:'#493f52',transparent:true,opacity:.6})));const original=typeof createOriginalPlane==='function'?createOriginalPlane(renderer,color):null;if(original){enemy.add(original.group);original.group.visible=false;}const papersky=typeof createPaperSkyPlane==='function'?createPaperSkyPlane(renderer,color):null;if(papersky){enemy.add(papersky.group);papersky.group.visible=false;}enemy.userData.papersky=papersky;enemy.userData.original=original;enemy.userData.body=body;enemy.userData.setModel=skin=>{const useSky=skin==='papersky'&&papersky;if(papersky)papersky.group.visible=!!useSky;const use=skin==='original'&&original;body.visible=enemy.children[1].visible=!use&&!useSky;if(original)original.group.visible=!!use;enemy.userData.body=useSky?papersky.mesh:use?original.mesh:body;};enemy.userData.updatePose=(dt,state)=>{if(papersky?.group.visible)papersky.update(dt,state);if(original?.group.visible)original.update(dt,state);};enemy.userData.dimensions={length:L*.7,wingspan:W*.7};return enemy;};
  const lines=new THREE.LineSegments(new THREE.EdgesGeometry(g,10),new THREE.LineBasicMaterial({color:'#999786',transparent:true,opacity:.38}));group.add(lines);
  group.userData.wingTips=[new THREE.Vector3(...left),new THREE.Vector3(...right)];
  group.userData.probes=[new THREE.Vector3(...nose),new THREE.Vector3(...left),new THREE.Vector3(...right),new THREE.Vector3(0,-.018,.045),new THREE.Vector3(...keel)];
  const skyPlane=typeof createPaperSkyPlane==='function'?createPaperSkyPlane(renderer):null;if(skyPlane){group.add(skyPlane.group);skyPlane.group.visible=false;}group.userData.papersky=skyPlane;
  const imported=typeof createOriginalPlane==='function'?createOriginalPlane(renderer):null;if(imported){group.add(imported.group);imported.group.visible=false;}group.userData.imported=imported;
  const paperProbes=group.userData.probes.map(v=>v.clone()),bird=createInkBird();group.add(bird.group);
  group.userData.dimensions={length:L*.7,wingspan:W*.7,sourceSheet:[.21,.297]};
  // Deform only the paper, never the camera or flight body. No periodic flapping or noise.
  const rest=new Float32Array(g.attributes.position.array),edgeRest=new Float32Array(lines.geometry.attributes.position.array);
  const pose={climb:0,dive:0,bank:0};
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  function deform(x,y,z,out,offset){
    const outer=clamp((Math.abs(x)-.008)/(.09-.008),0,1),side=Math.sign(x);
    out[offset]=x*(1-.065*pose.dive*outer);
    out[offset+1]=y+outer*(.006*pose.climb-.004*pose.dive+side*.0045*pose.bank);
    out[offset+2]=z+outer*(.004*pose.dive-.002*pose.climb);
  }
  function applyPose(){
    for(const [geometry,base] of [[g,rest],[lines.geometry,edgeRest]]){
      const a=geometry.attributes.position;
      for(let i=0;i<base.length;i+=3)deform(base[i],base[i+1],base[i+2],a.array,i);
      a.needsUpdate=true;
    }
    g.computeVertexNormals();
    const a=g.attributes.position;
    group.userData.wingTips[0].fromBufferAttribute(a,1);group.userData.wingTips[1].fromBufferAttribute(a,5);
  }
  // Bounds include the millimetre-scale flex, preventing wing-tip culling.
  for(const geometry of [g,lines.geometry]){geometry.computeBoundingSphere();geometry.boundingSphere.radius+=.012;}
  function syncBirdTips(){bird.tips.forEach((v,i)=>group.userData.wingTips[i].copy(v));}
  group.userData.resetPose=()=>{skyPlane?.reset();imported?.reset();pose.climb=pose.dive=pose.bank=0;applyPose();bird.reset();if(group.userData.skin==='inkbird')syncBirdTips();if(group.userData.skin==='papersky')skyPlane.tips.forEach((v,i)=>group.userData.wingTips[i].copy(v));if(group.userData.skin==='original')imported.tips.forEach((v,i)=>group.userData.wingTips[i].copy(v));};
  group.userData.updatePose=(dt,{pitch=0,bank=0,active=false,boost=0,slow=false,impact=0})=>{
    if(group.userData.skin==='papersky'&&skyPlane){skyPlane.update(dt,{pitch,bank,active,boost,slow,impact});skyPlane.tips.forEach((v,i)=>group.userData.wingTips[i].copy(v));return;}
    if(group.userData.skin==='original'&&imported){imported.update(dt,{pitch,bank,active});imported.tips.forEach((v,i)=>group.userData.wingTips[i].copy(v));return;}
    if(group.userData.skin==='inkbird'){bird.update(dt,{pitch,bank,active});syncBirdTips();return;}
    if(dt<=0)return;
    const target={climb:active?Math.pow(clamp(pitch/.44,0,1),.8):0,dive:active?Math.pow(clamp((-pitch-.12)/.7,0,1),.8):0,bank:active?clamp(bank/.9,-1,1):0};
    const f=1-Math.exp(-7*dt);let changed=false;
    for(const k of ['climb','dive','bank']){const delta=(target[k]-pose[k])*f;if(Math.abs(delta)>1e-7){pose[k]+=delta;changed=true;}}
    if(changed)applyPose();
  };
  Object.defineProperty(group.userData,'pose',{get:()=>group.userData.skin==='papersky'?skyPlane.pose:group.userData.skin==='original'?imported.pose:group.userData.skin==='inkbird'?bird.pose:pose});
  group.userData.setSkin=skin=>{
    skin=['white','math','mechanical','inkbird',...(imported?['original']:[]),...(skyPlane?['papersky']:[])].includes(skin)?skin:'math';
    const isSky=skin==='papersky';if(skyPlane)skyPlane.group.visible=isSky;const isOriginal=skin==='original';if(imported)imported.group.visible=isOriginal;const isBird=skin==='inkbird';group.userData.skin=skin;
    mesh.visible=lines.visible=!isBird&&!isOriginal&&!isSky;bird.group.visible=isBird;
    if(!isBird&&!isOriginal&&!isSky)mesh.material={white,math,mechanical}[skin];
    group.userData.dimensions=isSky?{...skyPlane.dimensions}:isOriginal?{...imported.dimensions}:isBird?{...bird.dimensions}:{length:L*.7,wingspan:W*.7,sourceSheet:[.21,.297]};
    // Keep Vector3 identities because the sweep caches their references.
    group.userData.probes.forEach((v,i)=>isSky?v.copy(skyPlane.probes[i]):isOriginal?v.copy(imported.probes[i]):isBird?v.fromArray(bird.probes[i]):v.copy(paperProbes[i]));
    group.userData.resetPose();
  };group.userData.setSkin('math');
  return group;
}

