import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from './three.module.min.js';
import {FactoryScene} from './training-scene.mjs';
import {FACTORIES,newState} from './training-core.mjs';
test('all factory geometry builds, updates and disposes without requiring a GPU',t=>{
 const original=globalThis.document;globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){}})})};t.after(()=>globalThis.document=original);
 const view=Object.create(FactoryScene.prototype);Object.assign(view,{world:new THREE.Group(),profile:{},selected:0,avatar:false,targets:[],actors:[],products:[],racks:[],lastFactory:''});
 for(const f of FACTORIES){const state=newState(f.id);view.update(state);assert.equal(view.targets.length,4);assert.equal(view.products.length,4);assert.equal(view.actors.length,4);view.world.traverse(o=>{assert.ok(o.position.toArray().every(Number.isFinite));});state.layout[0]='near';state.issueFixed=true;view.update(state);assert.equal(view.racks[0].position.z,2.95);assert.equal(view.issue.visible,false);}
 view.clearWorld();assert.equal(view.world.children.length,0);
});
