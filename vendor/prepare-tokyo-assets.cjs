// Keep upstream r160 loaders intact except their module boundary.
const fs=require('fs'),path=require('path');
const stage='F:/codex/messenger-research',root=path.resolve(__dirname,'..');
for(const [file,name] of [['DRACOLoader.js','PaperDraco'],['RoomEnvironment.js','PaperEnvironment']]){
 let s=fs.readFileSync(path.join(stage,file),'utf8').replace(/import \{([\s\S]*?)\} from 'three';/,'const {$1} = THREE;').replace(/export \{([\s\S]*?)\};\s*$/,`globalThis.${name} = {$1};`);
 if(/(^|\n)import |(^|\n)export /.test(s))throw Error(file+' module adaptation failed');
 fs.writeFileSync(path.join(__dirname,file),'/* Official Three.js r160, MIT. Module wrapper only; see THREE-LICENSE.txt. */\n(()=>{\n'+s+'\n})();\n');
}
fs.mkdirSync(path.join(__dirname,'draco'),{recursive:true});
for(const file of ['draco_wasm_wrapper.js','draco_decoder.wasm'])fs.copyFileSync(path.join(stage,file),path.join(__dirname,'draco',file));
for(const file of ['three-mesh-bvh.umd.js','BVH-LICENSE.txt'])fs.copyFileSync(path.join(stage,file),path.join(__dirname,file));
fs.mkdirSync(path.join(root,'assets/littlest-tokyo'),{recursive:true});
fs.copyFileSync(path.join(stage,'LittlestTokyo.glb'),path.join(root,'assets/littlest-tokyo/LittlestTokyo.glb'));
