import test from "node:test";
import assert from "node:assert/strict";
// No provider keys are read by this pure module; fallback is verified offline only.
delete process.env.OPENROUTER_API_KEY;
import { filterRecords, recordsToCsv, exportRecords, buildInsights } from "../featurePack.mjs";
const rows=[{id:1,reference:"A-1",title:"Alpha case",status:"Open",owner:"Ops",risk:"High",due_date:"2026-09-01",amount:0,payload:{note:"",flag:false,count:0}},{id:2,reference:"B-2",title:"Beta case",status:"Closed",owner:"Ops",risk:"Low",due_date:null,amount:250,payload:{note:"done",flag:true,count:2}}];
test("search/filter on main list",()=>{assert.equal(filterRecords(rows,{q:"alpha"}).length,1);assert.equal(filterRecords(rows,{status:"Closed"}).length,1);assert.equal(filterRecords(rows,{q:"missing"}).length,0);});
test("CSV/JSON export preserves false, 0 and empty",()=>{const csv=recordsToCsv(rows);assert.ok(csv.includes("false"));assert.ok(csv.split("\n")[1].includes(",0,"));const out=exportRecords(rows,"json");assert.equal(out.contentType.includes("json"),true);assert.ok(out.body.includes('"flag": false'));assert.ok(out.body.includes('"count": 0'));});
test("deterministic insights are labelled aiGenerated:false with labelled sections",()=>{const r=buildInsights(rows);assert.equal(r.aiGenerated,false);assert.equal(r.insights.length,3);for(const i of r.insights){assert.equal(i.aiGenerated,false);assert.ok(i.sections.length>=2);assert.ok(i.sections.every(s=>s.title&&s.detail!==undefined));}assert.ok(JSON.stringify(r).includes("0"));});
