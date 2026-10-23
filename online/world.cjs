const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),THREE=require('../vendor/three.min.js'),FlightCore=require('../flight-core.js');
const root=path.resolve(__dirname,'..'),box={THREE,FlightCore};vm.createContext(box);
for(const name of ['paper-city-style.js','labyrinth.js','flight-contact.js'])vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),box,{filename:name});
const {Labyrinth,Contact,build}=vm.runInContext('({Labyrinth,Contact:FlightContact,build:buildLabyrinth})',box);
const P=require('../chase-net-physics.js')(THREE,FlightCore,Contact,Labyrinth);
let world;module.exports={THREE,P,Labyrinth,getWorld:()=>world||(world=build(P.SEED))};
