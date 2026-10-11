import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import * as THREE from './three.module.min.js';
import * as ASSETS from './scene3d/assets.mjs';
import {assetWorker,addPenEquipment,disposeOwned} from './scene3d/pen-details.mjs';
import {GLTFLoader} from './vendor/three/GLTFLoader.js';

function canvas(){const context=new Proxy({measureText:t=>({width:t.length*16}),getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>({addColorStop(){}})},{get:(t,k)=>k in t?t[k]:()=>{}});return {width:600,height:400,clientWidth:390,clientHeight:500,style:{},getContext:()=>context,addEventListener(){},setAttribute(){},remove(){},getBoundingClientRect:()=>({left:0,top:0,width:390,height:500})};}
async function pack(){const p={tier:{lod:1},models:{}};for(const name of ['hall','worker','flowrack']){const b=readFileSync(new URL('./assets/factory/'+name+'.glb',import.meta.url));const g=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');p.models[name]=g.scene;p.models[name].traverse(o=>o.userData.shared=true);}return p;}

test('original pen view reuses real GLB assets, retains station identity, and never changes simulation data',async()=>{
 const p=await pack();let lastScene,renderCount=0;
 class Renderer{constructor(){this.domElement=canvas();this.shadowMap={};}setPixelRatio(){}setSize(){}dispose(){}render(s){lastScene=s;renderCount++;s.updateMatrixWorld(true);}}
 class PMREM{fromScene(){return {texture:new THREE.Texture(),dispose(){}};}dispose(){}}
 const scope={console,performance,Math,Uint8ClampedArray,assetWorker,addPenEquipment,disposeOwned,__THREE:{...THREE,WebGLRenderer:Renderer,PMREMGenerator:PMREM},__ASSETS:{...ASSETS,loadPack:async()=>p},window:{WebGLRenderingContext:true,devicePixelRatio:2,matchMedia:()=>({matches:true})},document:{createElement:canvas},ResizeObserver:class{observe(){}disconnect(){}}};
 let src=readFileSync(new URL('./pen-factory-view.mjs',import.meta.url),'utf8').replace(/^import .*\n/,'').replace('await import(u)','__THREE').replace("await import('./scene3d/assets.mjs')",'__ASSETS').replace(/export const .*\n/g,'');src+='\nglobalThis.testView=PEN3D;';vm.runInNewContext(src,scope);
 const st={S:[{name:'ประกอบ',cell:{c:1,r:1},tasks:['t1','t9'],has:{t9:true},wc:20,repair:0}],workers:[{id:1,st:0,sk:1,job:{}}],buf:[[],[]],jph:100,t:0,round:0,hourly:[],flow:[],shipped:0,goalRows:[]};
 const before=JSON.stringify(st),wrap={isConnected:true,clientWidth:390,clientHeight:500,insertBefore(){}};
 const view=await scope.testView.mount(wrap,st,{});const first=lastScene.getObjectByName('PenProcessEquipment');assert.ok(first);assert.ok(lastScene.getObjectByName('hips'),'GLB worker is attached');assert.ok(lastScene.getObjectByName('Hall'),'GLB hall is attached');
 for(let n=0;n<30;n++)view.update(1/30);assert.equal(lastScene.getObjectByName('PenProcessEquipment'),first,'unchanged line must not rebuild every frame');assert.equal(JSON.stringify(st),before);
 view.focus(0);view.zoom(-.15);view.focus(-1);assert.equal(JSON.stringify(st),before);
 st.S[0].tasks=['t1','t10'];st.S[0].has={t10:true};view.update(.02);assert.notEqual(lastScene.getObjectByName('PenProcessEquipment'),first,'changed process must update equipment');
 let disposedGeometry=0;lastScene.traverse(o=>o.geometry?.addEventListener('dispose',()=>disposedGeometry++));view.dispose();const frames=renderCount;view.update(.1);assert.equal(renderCount,frames);assert.ok(disposedGeometry>0);
});

test('production rules remain byte-identical apart from view wiring',()=>{
 // View source must not import the separate training game or write economic/process fields.
 const source=readFileSync(new URL('./pen-factory-view.mjs',import.meta.url),'utf8');assert.equal(/training-core|newState|act\(st|st\.(cash|shipped|scrap)\s*[-+]?=/.test(source),false);
 const doc=readFileSync(new URL('./index.html',import.meta.url),'utf8');for(const m of doc.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))if(m[1].trim())new vm.Script(m[1]);
 const start=doc.indexOf('      function step(dtp){dtp=Math.max(0,dtp);');const end=doc.indexOf('      function liveKPI(i)',start);assert.equal(createHash('sha256').update(doc.slice(start,end)).digest('hex'),'bd9f45378ec473d9089c73f8b4af520b53d18850445b80b7f37f3ce185bf56e9','original pen production tick is unchanged');
 assert.ok(doc.includes('id="pViewToggle"'));assert.ok(doc.includes('id="pViewStation"'));
});
