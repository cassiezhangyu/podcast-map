#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ownRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2), value=name=>{const i=args.indexOf(name);return i>=0?args[i+1]:undefined;};
const mode=value('--mode')||'understanding', root=path.resolve(value('--root')||ownRoot);
if(!['understanding','visual','open-source'].includes(mode)) throw new Error('mode 只能是 understanding、visual 或 open-source');
const checks=[];
const add=(id,status,required,message)=>checks.push({id,status,required,message});
const command=name=>spawnSync(name,['--version'],{encoding:'utf8'});

const major=Number(process.versions.node.split('.')[0]);
add('node',major>=18?'pass':'fail',true,`Node ${process.versions.node}；需要 18 或更高版本`);
for(const file of ['SKILL.md','references/content-model.md','references/transcription.md'])
  add('file:'+file,fs.existsSync(path.join(root,file))?'pass':'fail',true,fs.existsSync(path.join(root,file))?'存在':'缺失');

const markdown=[];
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory()){if(!['assets','.git'].includes(e.name))walk(p);}else if(p.endsWith('.md'))markdown.push(p);}}
if(fs.existsSync(root))walk(root);
const missing=[];
for(const file of markdown){const body=fs.readFileSync(file,'utf8');for(const m of body.matchAll(/\[[^\]]*\]\(([^)]+)\)/gu)){
  const link=m[1].split('#')[0];if(!link||/^[a-z]+:/iu.test(link)||link.startsWith('#'))continue;
  if(!fs.existsSync(path.resolve(path.dirname(file),decodeURIComponent(link))))missing.push(path.relative(root,file)+' -> '+link);
}}
add('relative-links',missing.length?'fail':'pass',true,missing.length?missing.join('；'):'相对 Markdown 链接可解析');

if(mode==='visual'){
  let sharpOk=false,sharpWhere='';try{const spec=process.env.KNOWLEDGE_SHARP_MODULE||'sharp';createRequire(path.join(root,'package.json'))(spec);sharpOk=true;sharpWhere=process.env.KNOWLEDGE_SHARP_MODULE?'来自 KNOWLEDGE_SHARP_MODULE':'来自项目依赖';}catch(e){sharpWhere='未找到 Sharp；在项目安装 sharp 或设置 KNOWLEDGE_SHARP_MODULE';}
  add('sharp',sharpOk?'pass':'fail',true,sharpWhere);
  let fontOk=false,fontMessage='未检测到可用中文无衬线字体';
  if(process.platform==='darwin'){
    for(const p of ['/System/Library/Fonts/PingFang.ttc','/System/Library/Fonts/STHeiti Medium.ttc'])if(fs.existsSync(p)){fontOk=true;fontMessage='检测到 '+p;break;}
  }else{
    const r=spawnSync('fc-match',['Noto Sans CJK SC'],{encoding:'utf8'});if(r.status===0&&r.stdout.trim()){fontOk=true;fontMessage=r.stdout.trim();}
  }
  add('chinese-font',fontOk?'pass':'fail',true,fontMessage);
  for(const name of ['ffmpeg','curl']){const r=command(name);add('optional:'+name,r.status===0?'pass':'warning',false,r.status===0?'可用':'未找到；仅在相应来源获取或转写路线需要');}
}

if(mode==='open-source'){
  const textFiles=[];
  function collect(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory()){if(!['assets','.git'].includes(e.name))collect(p);}else if(/\.(md|mjs|js|json|ya?ml)$/iu.test(e.name)&&e.name!=='doctor.mjs'&&e.name!=='test_doctor.mjs')textFiles.push(p);}}
  collect(root);const leaks=[];
  const absoluteUserPath=new RegExp('(?:/Users/|/home/)[^/\\s"\']+','u');
  const secret=/(?:api[_-]?key|access[_-]?token|secret)["'\s:=]+[A-Za-z0-9_\-]{16,}/iu;
  for(const file of textFiles){const body=fs.readFileSync(file,'utf8');if(absoluteUserPath.test(body))leaks.push(path.relative(root,file)+': 本机用户绝对路径');if(secret.test(body))leaks.push(path.relative(root,file)+': 疑似凭证');}
  add('private-data-scan',leaks.length?'fail':'pass',true,leaks.length?leaks.join('；'):'未发现本机用户绝对路径或常见明文凭证形态');
  add('readme',fs.existsSync(path.join(root,'README.md'))?'pass':'fail',true,'README.md');
  add('license',fs.existsSync(path.join(root,'LICENSE'))?'pass':'warning',false,fs.existsSync(path.join(root,'LICENSE'))?'已声明许可证':'尚未选择代码许可证；发布 GitHub 前由作者决定');
}

const failures=checks.filter(c=>c.required&&c.status==='fail');
const report={mode,root,interpretation:'环境与可移植性自检；不下载依赖，不验证内容理解质量或视觉审美。',failureCount:failures.length,checks};
console.log(JSON.stringify(report,null,2));process.exitCode=failures.length?1:0;
