import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const cache=new Map();
function moduleFor(name) {
  if(cache.has(name))return cache.get(name);
  const code=readFileSync(new URL("../lib/rentals/"+name+".ts",import.meta.url),"utf8");
  const js=ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const mod={exports:{}};
  cache.set(name,mod.exports);
  new Function("require","module","exports",js)((p)=>p==="./regions"?moduleFor("regions"):null,mod,mod.exports);
  return mod.exports;
}
const {RENTAL_REGIONS}=moduleFor("regions");
const {ROOMIES_AREAS,roomiesAreaForSlug}=moduleFor("roomies");
assert.equal(ROOMIES_AREAS.length,RENTAL_REGIONS.length);
for(const area of ROOMIES_AREAS){
  assert.equal(roomiesAreaForSlug(area.slug)?.name,area.name);
  for(const url of [area.allUrl,area.roomsUrl].filter(Boolean)){
    const parsed=new URL(url);
    assert.equal(parsed.protocol,"https:");
    assert.equal(parsed.hostname,"www.roomies.co.nz");
  }
}
assert.equal(roomiesAreaForSlug("arataki").nearby,true);
assert.equal(roomiesAreaForSlug("otumoetai").roomsUrl,"https://www.roomies.co.nz/rooms/otumoetai-tauranga");
assert.equal(roomiesAreaForSlug("papamoa-beach").roomsUrl,"https://www.roomies.co.nz/rooms/papamoa-beach-papamoa");
console.log("Roomies location coverage checked: "+ROOMIES_AREAS.length+" areas.");
