import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildCoverSvg, auditCover, expectedCover, loadSharp, COVER_SYSTEM } from './cover-system.mjs';

const palette = {
  source_id: '测试来源',
  roles: {paper:'#FFFFFF',ink:'#263142',muted:'#626B77',line:'#BCC3CD',primary:'#365DA8',contrast:'#985719',primarySoft:'#EFF4FC',contrastSoft:'#FBF2E6'},
  meanings: {primary:'关键判断',contrast:'约束'}, cover_accent:'primary',
  selection: {recent_sources:[],reason:'隔离测试，无历史'}
};
const config = {
  system:COVER_SYSTEM, original_title:'E163. 要完了？不！是要玩了！',
  title_lines:[{text:'E163.',role:'ink'},{text:'要完了？',role:'ink'},{text:'不！是要玩了！',role:'accent'}],
  subtitle:['把定义权留给自己'],source_lines:['测试来源'],podcast_image:'podcast.png'
};
const sharp=loadSharp(process.cwd());
const image=await sharp({create:{width:1200,height:1600,channels:3,background:'#ffffff'}}).png().toBuffer();
let count=0;
async function test(name, fn) { await fn(); count++; console.log('通过：'+name); }
const root=fs.mkdtempSync(path.join(os.tmpdir(),'cover-contract-test-'));
fs.mkdirSync(path.join(root,'editable'));
const writeConfig = c => fs.writeFileSync(path.join(root,'cover-layout.json'),JSON.stringify(c));
const writeSvg = s => fs.writeFileSync(path.join(root,'editable/cover.svg'),s);
try {
  writeConfig(config);
  fs.writeFileSync(path.join(root,'palette.json'),JSON.stringify(palette));
  fs.writeFileSync(path.join(root,'infographic.png'),image);
  fs.writeFileSync(path.join(root,'podcast.png'),image);
  const svg=await expectedCover(root,sharp);
  writeSvg(svg);
  await test('三行母版实际 SVG 匹配',async()=>assert.deepEqual((await auditCover(root)).errors,[]));
  await test('最终像素保留灰色背景及微透暖白面板',async()=>{
    const {data,info}=await sharp(Buffer.from(svg)).removeAlpha().raw().toBuffer({resolveWithObject:true});
    const pixel=(x,y)=>Array.from(data.subarray((y*info.width+x)*info.channels,(y*info.width+x)*info.channels+3));
    const outer=pixel(20,800),panel=pixel(100,800);
    assert.ok(outer.every(c=>c>140&&c<180),'外围应为参考处理后的灰色，不能漂白');
    assert.ok(panel[0]>240&&panel[0]<255&&panel[0]>panel[1]&&panel[1]>panel[2],'面板应微透暖白，不是纯白');
  });
  const four={...config,original_title:'EP58 别再追 AI 新工具了，先问问自己到底要什么？',adaptation_reason:'完整词组与反问分行',title_lines:[{text:'EP58',role:'ink',font_size:116},{text:'别再追 AI 新工具了，',role:'ink',font_size:96},{text:'先问问自己',role:'accent',font_size:108},{text:'到底要什么？',role:'accent',font_size:108}]};
  await test('四行允许局部适配',async()=>assert.ok(buildCoverSvg(four,palette,image,image).includes('y="842"')));
  await test('整体缩成76px被拒',async()=>assert.throws(()=>buildCoverSvg({...four,title_lines:four.title_lines.map(l=>({...l,font_size:76}))},palette,image,image),/整体缩字/));
  await test('所有行降至96px仍被拒',async()=>assert.throws(()=>buildCoverSvg({...four,title_lines:four.title_lines.map(l=>({...l,font_size:96}))},palette,image,image),/大字层级/));
  await test('原标题删词被拒',async()=>assert.throws(()=>buildCoverSvg({...config,original_title:'另一标题'},palette,image,image),/原标题不同/));
  await test('交替染色被拒',async()=>assert.throws(()=>buildCoverSvg({...config,title_lines:config.title_lines.map((l,i)=>({...l,role:i===1?'accent':'ink'}))},palette,image,image),/交替换色/));
  await test('非播客来源类型被拒',async()=>assert.throws(()=>buildCoverSvg({...config,source_type:'unsupported'},palette,image,null),/只接受播客来源/));
  for (const [name, before, after] of [
    ['标题起点漂移','y="500"','y="520"'],
    ['图片圆角丢失','clip-path="url(#podcast-clip)"',''],
    ['面板位置漂移','x="88" y="260"','x="88" y="280"'],
    ['面板被不透明纯白替代','fill="#fffaf0" fill-opacity="0.94"','fill="#FFFFFF"'],
    ['分隔线变细','d="M158 905H1040" stroke="#263142" stroke-width="3"','d="M158 905H1040" stroke="#263142" stroke-width="2"'],
    ['源文件额外添加元素','</svg>','<rect width="1200" height="1600" fill="gray"/></svg>']
  ]) await test(name+'被拒',async()=>{writeSvg(svg.replace(before,after));assert.ok((await auditCover(root)).errors.length);});
  writeSvg(svg);
  await test('最终总览更新后旧封面被拒',async()=>{
    fs.writeFileSync(path.join(root,'infographic.png'),Buffer.from('新总览'));
    assert.ok((await auditCover(root)).errors.length);
    fs.writeFileSync(path.join(root,'infographic.png'),image);
  });
  await test('缺少配置不能只靠SVG通过',async()=>{fs.renameSync(path.join(root,'cover-layout.json'),path.join(root,'saved.json'));assert.ok((await auditCover(root)).errors.length);writeConfig(config);});
  await test('合同标识接入正式发布检查',async()=>{
    fs.writeFileSync(path.join(root,'visual-contract.yaml'),'background: "#FFFFFF"\ntop_right_progress: true\ndivider_count: 1\ncover_system: "editorial-fixed-v1"\n');
    writeSvg(svg.replace('y="500"','y="520"'));
    const r=spawnSync(process.execPath,[fileURLToPath(new URL('./check_release_artifacts.mjs',import.meta.url)),root],{encoding:'utf8'});
    assert.ok(JSON.parse(r.stdout).failures.some(s=>s.includes('最终封面 SVG')));
  });
  console.log(`完成 ${count} 项封面合同回归；不代表视觉或跨任务盲测通过。`);
} finally { fs.rmSync(root,{recursive:true,force:true}); }
