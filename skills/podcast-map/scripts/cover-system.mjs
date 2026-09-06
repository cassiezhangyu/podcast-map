// 固定系列封面：生成和验收共用几何；不负责正文，也不判断审美。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createPalette } from './palette.mjs';

export const COVER_SYSTEM = 'editorial-fixed-v1';
const escapeXml = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const normalize = s => s.replace(/\s/gu, '');
const cleanEpisode = s => normalize(String(s)).replace(/[.．。:：-]+$/gu, '');

function validateSourceIdentity(config) {
  const identity = config.source_identity;
  if (!identity || typeof identity !== 'object') throw new Error('缺少结构化 source_identity，无法核验封面人物与节目身份');
  for (const key of ['platform', 'show', 'episode', 'duration', 'verification'])
    if (typeof identity[key] !== 'string' || !identity[key].trim()) throw new Error(`source_identity.${key} 不能为空`);
  if (!Array.isArray(identity.hosts) || !identity.hosts.length || identity.hosts.some(s => typeof s !== 'string' || !s.trim()))
    throw new Error('source_identity.hosts 至少需要一位经核验的本期主持人');
  if (!Array.isArray(identity.guests) || identity.guests.some(s => typeof s !== 'string' || !s.trim()))
    throw new Error('source_identity.guests 必须是数组；单人节目使用空数组');
  if (!Array.isArray(config.source_lines) || config.source_lines.length !== 2 || config.source_lines.some(s => typeof s !== 'string' || !s.trim()))
    throw new Error('播客封面来源识别固定为两行');
  const first = normalize(config.source_lines[0]), second = normalize(config.source_lines[1]);
  for (const value of [identity.platform, identity.show, ...identity.hosts, ...identity.guests])
    if (!first.includes(normalize(value))) throw new Error(`来源第一行缺少已核验身份：${value}`);
  for (const value of [identity.episode, identity.duration, identity.published_at].filter(Boolean))
    if (!second.includes(normalize(value))) throw new Error(`来源第二行缺少已核验信息：${value}`);
  return identity;
}

export function loadSharp(root) {
  return createRequire(path.join(path.resolve(root), 'package.json'))(process.env.KNOWLEDGE_SHARP_MODULE || 'sharp');
}

// 取自用户重新确认的 v20 / v5.3 图层参数；与正文语义配色分离。
export async function prepareCoverBackground(overview, sharp) {
  return sharp(overview).resize(1200, 1600, {fit:'fill'})
    .modulate({saturation:0.30, brightness:0.90}).blur(2.4)
    .composite([{input:{create:{width:1200,height:1600,channels:4,
      background:{r:104,g:110,b:116,alpha:0.56}}},blend:'over'}]).png().toBuffer();
}

export function buildCoverSvg(config, palette, overview, podcast) {
  const C = createPalette(palette), accent = C[palette.cover_accent];
  if ((config.source_type ?? 'podcast') !== 'podcast') throw new Error('当前封面系统只接受播客来源');
  const lines = config.title_lines;
  if (config.system !== COVER_SYSTEM) throw new Error('封面系统标识不符');
  if (!Array.isArray(lines) || ![3, 4].includes(lines.length)) throw new Error('本母版支持三行或四行；其他结构须单独取得用户许可');
  if (!config.original_title?.trim() || lines.some(l => !l.text?.trim())) throw new Error('原标题或标题行为空');
  if (normalize(lines.map(l => l.text).join('')) !== normalize(config.original_title)) throw new Error('断行后的文字与准确原标题不同');
  const sizes = lines.map(l => l.font_size ?? 116);
  if (sizes.some(n => !Number.isFinite(n) || n < 88 || n > 116) || Math.max(...sizes) < 108)
    throw new Error('标题失去大字层级：局部适配限 88–116px，至少一行达到 108px；不可整体缩字');
  if (lines.some(l => !['ink', 'accent'].includes(l.role))) throw new Error('标题只能使用深色和一个强调角色');
  if (lines.some((l, i) => i > 0 && lines[i - 1].role === 'accent' && l.role === 'ink')) throw new Error('标题不逐行交替换色');
  for (const key of ['subtitle'])
    if (!Array.isArray(config[key]) || config[key].length < 1 || config[key].length > 2 || config[key].some(s => typeof s !== 'string' || !s.trim()))
      throw new Error(key + ' 需要一到两行实际文字');
  const identity = validateSourceIdentity(config);
  if (normalize(config.original_title).startsWith(normalize(identity.episode)) && cleanEpisode(lines[0].text) !== cleanEpisode(identity.episode))
    throw new Error('标题第一行必须单独放集数或期号，不能与主题文字混排');
  if (lines.length === 4 && !config.adaptation_reason?.trim()) throw new Error('四行适配须记录断行理由');
  if (!overview?.length) throw new Error('必须使用最终总览作为背景');
  const step = lines.length === 3 ? 136 : 114;
  const text = (value, y, size, color = C.ink, weight = 400) => `<text x="158" y="${y}" font-family="PingFang SC, Noto Sans CJK SC, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}">${escapeXml(value)}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600">
<defs><clipPath id="podcast-clip"><rect x="916" y="340" width="132" height="132" rx="16"/></clipPath></defs>
<rect width="1200" height="1600" fill="#FFFFFF"/>
<image href="data:image/png;base64,${overview.toString('base64')}" width="1200" height="1600"/>
<rect x="88" y="260" width="1024" height="1000" rx="5" fill="#fffaf0" fill-opacity="0.94"/>
<path d="M158 350h120" stroke="${accent}" stroke-width="8"/>
<rect x="906" y="330" width="152" height="152" rx="22" fill="#fffaf0" stroke="${C.ink}" stroke-width="3"/>
${podcast ? `<image href="data:image/png;base64,${podcast.toString('base64')}" x="916" y="340" width="132" height="132" preserveAspectRatio="xMidYMid meet" clip-path="url(#podcast-clip)"/>` : ''}
${lines.map((l, i) => text(l.text, 500 + i * step, sizes[i], l.role === 'accent' ? accent : C.ink, 600)).join('\n')}
<path d="M158 905H1040" stroke="${C.ink}" stroke-width="3"/>
${config.subtitle.map((s, i) => text(s, 985 + i * 60, 42)).join('\n')}
${config.source_lines.map((s, i) => text(s, 1160 + i * 43, 27)).join('\n')}
</svg>`;
}

function localFile(root, relative) {
  if (typeof relative !== 'string' || path.isAbsolute(relative) || relative.split(/[\\/]/u).includes('..')) throw new Error('封面输入必须为包内相对路径');
  return path.join(root, relative);
}

export async function expectedCover(root, sharp = loadSharp(root)) {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'cover-layout.json'), 'utf8'));
  const palette = JSON.parse(fs.readFileSync(path.join(root, 'palette.json'), 'utf8'));
  if ((config.source_type ?? 'podcast') !== 'podcast') throw new Error('当前封面系统只接受播客来源');
  const identity = validateSourceIdentity(config);
  if (!fs.existsSync(localFile(root, identity.verification))) throw new Error('source_identity.verification 指向的核验记录不存在');
  if (!config.podcast_image && !config.missing_image_reason?.trim()) throw new Error('缺官方图片时须记录限制');
  if (config.podcast_image) {
    if (config.podcast_image_kind !== 'show_album') throw new Error('默认只接受经核验的节目专辑图；单集图须另行取得用户批准');
    if (typeof config.podcast_image_verification !== 'string' || !config.podcast_image_verification.trim() || !fs.existsSync(localFile(root, config.podcast_image_verification)))
      throw new Error('节目专辑图必须提供存在的 podcast_image_verification 核验记录');
  }
  const background = await prepareCoverBackground(fs.readFileSync(path.join(root, 'infographic.png')), sharp);
  return buildCoverSvg(config, palette, background,
    config.podcast_image ? fs.readFileSync(localFile(root, config.podcast_image)) : null);
}

export async function auditCover(root) {
  const errors = [];
  try {
    const expected = await expectedCover(root);
    const actual = fs.readFileSync(path.join(root, 'editable/cover.svg'), 'utf8');
    if (actual !== expected) errors.push('最终封面 SVG 不符合固定母版或未使用当前文案、配色和总览；须重新生成，不能只修改声明');
  } catch (e) { errors.push(e.message); }
  return { scope: 'cover-svg-contract', errors, limits: '只核验实际 SVG 与受限输入生成结果一致；不证明 PNG 同步、字体可用、字形不溢出、断句合理或系列观感通过，仍须渲染并看图。' };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(process.argv[2] || process.cwd());
  if (process.argv.includes('--write-svg')) {
    const svg = await expectedCover(root);
    fs.mkdirSync(path.join(root, 'editable'), { recursive: true });
    fs.writeFileSync(path.join(root, 'editable/cover.svg'), svg);
    console.log('已生成固定母版 SVG；还需渲染 PNG 并检查手机预览。');
  } else {
    const report = await auditCover(root);
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.errors.length ? 1 : 0;
  }
}
