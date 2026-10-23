/* Short world-space wing wakes + one lightweight peripheral lens pass. */
class FlightEffects {
  constructor(scene,renderer){
    this.scene=scene;this.renderer=renderer;this.time=0;this.gate=new FlightCore.WakeGate();this.nodes=[[],[]];this.lastTips=[null,null];this.strength=0;this.motion=1;this.postActive=false;this.nodeId=0;
    this.positions=new Float32Array(2400*3);this.alphas=new Float32Array(2400);
    this.geometry=new THREE.BufferGeometry();this.geometry.setAttribute('position',new THREE.BufferAttribute(this.positions,3).setUsage(THREE.DynamicDrawUsage));this.geometry.setAttribute('wakeAlpha',new THREE.BufferAttribute(this.alphas,1).setUsage(THREE.DynamicDrawUsage));this.geometry.setDrawRange(0,0);
    this.wakeMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
      vertexShader:'#include <common>\n#include <logdepthbuf_pars_vertex>\nattribute float wakeAlpha; varying float a; void main(){a=wakeAlpha;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);\n#include <logdepthbuf_vertex>\n}',
      fragmentShader:'#include <logdepthbuf_pars_fragment>\nvarying float a; void main(){\n#include <logdepthbuf_fragment>\ngl_FragColor=vec4(vec3(1.0),a);\n#include <colorspace_fragment>\n}'
    });
    this.mesh=new THREE.Mesh(this.geometry,this.wakeMaterial);this.mesh.frustumCulled=false;scene.add(this.mesh);
    this.target=new THREE.WebGLRenderTarget(1,1,{depthBuffer:true,stencilBuffer:false});
    this.target.samples=renderer.capabilities.isWebGL2?2:0;
    this.postScene=new THREE.Scene();this.postCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
    this.postMaterial=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{image:{value:this.target.texture},amount:{value:0},clock:{value:0}},
      vertexShader:'varying vec2 uv0; void main(){uv0=uv;gl_Position=vec4(position.xy,0.0,1.0);}',
      fragmentShader:`
        uniform sampler2D image; uniform float amount; uniform float clock; varying vec2 uv0;
        float hash(float n){return fract(sin(n*127.1)*43758.5453);}
        void main(){
          vec2 d=uv0-vec2(.5,.43);
          float radius=length(d);
          float edge=smoothstep(.24,.67,radius);
          vec2 uv=uv0-d*dot(d,d)*amount*.055;
          vec2 blur=d*edge*amount*.027;
          vec3 col=texture2D(image,uv).rgb*.40;
          col+=texture2D(image,clamp(uv+blur*.35,.001,.999)).rgb*.18;
          col+=texture2D(image,clamp(uv+blur*.75,.001,.999)).rgb*.14;
          col+=texture2D(image,clamp(uv-blur*.35,.001,.999)).rgb*.16;
          col+=texture2D(image,clamp(uv-blur*.75,.001,.999)).rgb*.12;
          // Sparse individual air streaks; protect the plane and the centre view.
          float angle=(atan(d.y,d.x)+3.141593)/6.283186*43.0;
          float sector=floor(angle),seed=hash(sector);
          float angular=1.0-smoothstep(.013,.034,abs(fract(angle)-(.2+seed*.6)));
          float head=fract(clock*(.55+seed*.5)+hash(sector+4.0))*.8+.2;
          float streak=angular*smoothstep(head-.16,head-.03,radius)*(1.0-smoothstep(head-.02,head+.01,radius));
          col=mix(col,vec3(1.0),streak*edge*amount*.15);
          gl_FragColor=vec4(col,1.0);
          #include <colorspace_fragment>
        }`
    });
    this.postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.postMaterial));
    this._a=new THREE.Vector3();this._b=new THREE.Vector3();this._side=new THREE.Vector3();this._view=new THREE.Vector3();this._tangent=new THREE.Vector3();
  }
  resize(w,h){this.target.setSize(w,h);}
  reset(){this.nodes=[[],[]];this.lastTips=[null,null];this.gate.reset();this.strength=0;this.geometry.setDrawRange(0,0);}
  update(dt,{plane,camera,speed,acceleration,active,wind,motion}){
    this.motion=motion;
    if(dt>0){
      this.time+=dt;
      const target=active?FlightCore.clamp((speed-25)/23,0,1):0;
      this.strength+=(target-this.strength)*(1-Math.exp(-3.8*dt));
      const emit=this.gate.update(dt,acceleration,speed,active);
      plane.updateMatrixWorld(true);
      for(let side=0;side<2;side++){
        const tip=plane.userData.wingTips[side].clone().applyMatrix4(plane.matrixWorld);
        const nodes=this.nodes[side];
        if(emit){
          const last=this.lastTips[side]||tip;
          // Short evenly spaced samples even at the 30 FPS quality setting.
          const samples=Math.min(4,Math.max(1,Math.ceil(last.distanceTo(tip)/.018)));
          for(let i=1;i<=samples;i++)nodes.push({p:last.clone().lerp(tip,i/samples),born:this.time-dt*(1-i/samples),life:.39+side*.025,burst:this.gate.burst,intensity:this.gate.strength,id:++this.nodeId,wind:{x:wind.x,y:wind.y,z:wind.z}});
        }
        this.lastTips[side]=tip;
        while(nodes.length&&this.time-nodes[0].born>nodes[0].life)nodes.shift();
        if(nodes.length>100)nodes.splice(0,nodes.length-100);
      }
    }
    this.buildWakes(camera);
  }
  buildWakes(camera){
    let count=0;
    // Keep sub-millimetre wake widths near the origin before writing Float32 data.
    // Absolute kilometre coordinates quantise thin trails and can make them shimmer.
    this.mesh.position.copy(camera.position);
    const point=(n,out)=>{const age=(this.time-n.born)*.7;return out.set(n.p.x+n.wind.x*age,n.p.y+(n.wind.y+.008)*age,n.p.z+n.wind.z*age);};
    const vertex=(p,sign,width,alpha)=>{const i=count*3;this.positions[i]=p.x-camera.position.x+this._side.x*sign*width;this.positions[i+1]=p.y-camera.position.y+this._side.y*sign*width;this.positions[i+2]=p.z-camera.position.z+this._side.z*sign*width;this.alphas[count++]=alpha;};
    for(const nodes of this.nodes)for(let i=1;i<nodes.length;i++){
      const a=nodes[i-1],b=nodes[i];if(a.burst!==b.burst)continue;
      point(a,this._a);point(b,this._b);this._tangent.subVectors(this._b,this._a);if(this._tangent.lengthSq()>12||this._tangent.lengthSq()<.00000001)continue;
      this._view.subVectors(camera.position,this._a);this._side.crossVectors(this._tangent,this._view).normalize();
      const fade=n=>Math.pow(Math.max(0,1-(this.time-n.born)/n.life),1.5);
      const fa=fade(a),fb=fade(b),wa=.0003+.0011*fa,wb=.0003+.0011*fb;
      const aa=fa*.58*a.intensity,ab=fb*.58*b.intensity;
      vertex(this._a,-1,wa,aa);vertex(this._a,1,wa,aa);vertex(this._b,1,wb,ab);
      vertex(this._a,-1,wa,aa);vertex(this._b,1,wb,ab);vertex(this._b,-1,wb,ab);
    }
    this.geometry.attributes.position.needsUpdate=true;this.geometry.attributes.wakeAlpha.needsUpdate=true;this.geometry.setDrawRange(0,count);
  }
  render(camera,quality){
    const amount=this.strength*this.motion;
    this.postActive=amount>.015&&quality!=='low'&&quality!=='pixel';
    const r=this.renderer;r.info.autoReset=false;r.info.reset();
    if(this.postActive){r.setRenderTarget(this.target);r.render(this.scene,camera);r.setRenderTarget(null);this.postMaterial.uniforms.amount.value=amount;this.postMaterial.uniforms.clock.value=this.time;r.render(this.postScene,this.postCamera);}
    else{r.setRenderTarget(null);r.render(this.scene,camera);}
  }
  diagnostics(){return {strength:this.strength,emitting:this.gate.emitting,burst:this.gate.burst,nodes:this.nodes.map(n=>n.length),postActive:this.postActive,oldest:this.nodes[0][0]?{id:this.nodes[0][0].id,position:this.nodes[0][0].p.toArray()}:null};}
}
