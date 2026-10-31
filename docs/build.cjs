/* 组装最终单文件 HTML
   用法：node build-pdfjs.cjs（生成 parts/05_pdfjs.html）→ node build.cjs */
const fs = require('fs');
const path = require('path');
const dir = __dirname;

const read = f => fs.readFileSync(path.join(dir, 'parts', f), 'utf8');

const head   = read('00_head.html');
const data   = read('01_data.html');
const app    = read('02_app.html');
const alloc  = read('03_alloc.html');
const ins    = read('04_ins.html');
const engine = read('06_engine.html');
const insv2  = read('07_insv2.html');
const quick  = read('08_quickcalc.html');
const pdfjs  = read('05_pdfjs.html');

// pdf.js 内联插入到 </head> 之前
// 必须用函数式替换：pdf.js 源码含 $& / $` 等特殊模式，字符串替换会被误解析
let out = head.replace('</head>', () => pdfjs + '\n</head>');

const scripts = [data, app, alloc, ins, engine, insv2, quick];
for (const s of scripts) out += '\n' + s + '\n';

out += '\n</body>\n</html>\n';

const target = path.join(dir, 'index.html');
fs.writeFileSync(target, out, 'utf8');
console.log('生成完成：', target);
console.log('大小：', (out.length / 1024 / 1024).toFixed(2), 'MB');
