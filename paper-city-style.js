/* Stable surface cues are evaluated in object/world coordinates, never screen noise. */
const PaperCityStyle={
 surface(material,kind){
  material.onBeforeCompile=shader=>{
   shader.vertexShader='varying vec3 cityLocal; varying vec3 cityNormal; varying vec3 cityScale; varying vec3 cityWorld;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    cityLocal=position;cityNormal=normal;mat4 cityM=modelMatrix;
    #ifdef USE_INSTANCING
     cityM=modelMatrix*instanceMatrix;
    #endif
    cityScale=vec3(length(cityM[0].xyz),length(cityM[1].xyz),length(cityM[2].xyz));cityWorld=(cityM*vec4(position,1.)).xyz;`);
   shader.fragmentShader='varying vec3 cityLocal; varying vec3 cityNormal; varying vec3 cityScale; varying vec3 cityWorld;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    vec3 nc=abs(cityNormal),edge=(vec3(.5)-abs(cityLocal))*cityScale;float border=nc.x>.5?min(edge.y,edge.z):nc.y>.5?min(edge.x,edge.z):min(edge.x,edge.y);
    float aa=max(fwidth(border),.006);float crease=1.-smoothstep(.04-aa,.32+aa,border);
    diffuseColor.rgb*=1.-.20*crease;
    // Broad, low-contrast paper tone; no high-frequency stripes to shimmer in motion.
    diffuseColor.rgb*=1.+.009*sin(cityWorld.x*.025+cityWorld.z*.019+cityWorld.y*.012);
   `);
  };material.customProgramCacheKey=()=> 'city-paper-edges-v2-'+kind;
 },
 shadow(sun){sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.001;sun.shadow.normalBias=1;},
 fit(sun,bounds,scale){
  // One fixed shadow frustum covers the whole city, including upstream casters.
  // Camera travel no longer moves a hard shadow boundary through the buildings.
  const axis=new THREE.Vector3(-260,430,200).normalize(),right=new THREE.Vector3(0,1,0).cross(axis).normalize(),up=axis.clone().cross(right),center=bounds.getCenter(new THREE.Vector3());
  let halfX=0,halfY=0,halfZ=0;
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
   const d=new THREE.Vector3(x,y,z).sub(center);halfX=Math.max(halfX,Math.abs(d.dot(right)));halfY=Math.max(halfY,Math.abs(d.dot(up)));halfZ=Math.max(halfZ,Math.abs(d.dot(axis)));
  }
  halfX+=45;halfY+=45;const distance=halfZ+100;
  Object.assign(sun.shadow.camera,{left:-halfX,right:halfX,top:halfY,bottom:-halfY,near:1,far:distance+halfZ+100});sun.shadow.camera.updateProjectionMatrix();
  sun.target.position.copy(center).divideScalar(scale);sun.position.copy(center).addScaledVector(axis,distance).divideScalar(scale);sun.target.updateMatrixWorld();sun.userData.cityShadowBounds=bounds.clone();
 },
 follow(sun,p,scale,quality,active){
  sun.castShadow=active&&quality!=='low'&&quality!=='pixel';
  // Geometry and light stay fixed; moving aircraft still update their shadows each frame.
 }
};
if(typeof module!=='undefined')module.exports=PaperCityStyle;
