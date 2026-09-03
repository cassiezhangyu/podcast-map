#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),doctor=path.join(root,'scripts/doctor.mjs');
const run=(mode,target=root,env={})=>{const r=spawnSync(process.execPath,[doctor,'--mode',mode,'--root',target],{encoding:'utf8',env:{...process.env,...env}});return {r,report:JSON.parse(r.stdout)};};
let count=0;const test=(name,fn)=>{fn();count++;console.log('通过：'+name);};
test('理解模式不要求绘图依赖',()=>assert.equal(run('understanding').report.failureCount,0));
test('视觉模式可通过显式依赖定位',()=>assert.equal(run('visual',root,{KNOWLEDGE_SHARP_MODULE:process.argv[2]||'sharp'}).report.failureCount,0));
test('开源模式当前无私人路径',()=>assert.equal(run('open-source').report.failureCount,0));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'knowledge-skill-doctor-'));
try{fs.cpSync(root,temp,{recursive:true});fs.writeFileSync(path.join(temp,'leak.md'),'private: /Users/example/secret/file');
  test('私人绝对路径会阻断开源检查',()=>{const x=run('open-source',temp);assert.equal(x.r.status,1);assert.ok(x.report.checks.some(c=>c.id==='private-data-scan'&&c.status==='fail'));});
}finally{fs.rmSync(temp,{recursive:true,force:true});}
console.log(`完成 ${count} 项环境自检回归；不验证内容或审美。`);
