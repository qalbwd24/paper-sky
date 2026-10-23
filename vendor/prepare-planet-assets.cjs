// Reproduce the import-only adaptation of official Three.js r160 examples.
const fs=require('fs'),path=require('path');
const stage='F:/codex/paper-planet-assets';
for(const [file,name] of [['BufferGeometryUtils.js','PaperGeometryUtils'],['GLTFLoader.js','PaperGLTF']]){
 let s=fs.readFileSync(path.join(stage,file),'utf8');
 s=s.replace(/import \{([\s\S]*?)\} from 'three';/, 'const {$1} = THREE;');
 s=s.replace("import { toTrianglesDrawMode } from '../utils/BufferGeometryUtils.js';",'const {toTrianglesDrawMode}=PaperGeometryUtils;');
 s=s.replace(/export \{([\s\S]*?)\};\s*$/,`globalThis.${name} = {$1};`);
 s=s.replace(/^export function /gm,'function ');
 if(/(^|\n)import |(^|\n)export /.test(s))throw Error('Unexpected module syntax '+file);
 fs.writeFileSync(path.join(__dirname,file),'/* Official Three.js r160 example, MIT. Only module wrapper adapted; see three-LICENSE.txt. */\n(()=>{\n'+s+'\n})();\n');
}
fs.copyFileSync(path.join(stage,'three-LICENSE.txt'),path.join(__dirname,'three-LICENSE.txt'));
