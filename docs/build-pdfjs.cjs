/* 生成 parts/05_pdfjs.html —— 把 pdf.js 内联进页面，实现双击即用（无需本地服务器）
   依赖：pdfjs-dist（此处取自本机浏览器工具依赖目录，版本 5.7.284，Apache-2.0）
   用法：node build-pdfjs.cjs  然后  node build.cjs */
const fs = require('fs');
const path = require('path');

const PDFJS_DIR = 'C:/Users/LiuXiaolong/AppData/Roaming/office-raccoon/node_modules/pdfjs-dist/build';
const dir = __dirname;

const main = fs.readFileSync(path.join(PDFJS_DIR, 'pdf.min.mjs'), 'utf8');
const worker = fs.readFileSync(path.join(PDFJS_DIR, 'pdf.worker.min.mjs'), 'utf8');

// 去掉末尾 export，改为挂到 globalThis
function toGlobals(code, globalName) {
  const exportRe = /export\s*\{([^}]*)\}\s*;?\s*$/;
  const m = exportRe.exec(code.trimEnd());
  if (!m) throw new Error('未找到末尾 export 语句');
  const names = m[1].split(',').map(s => {
    const parts = s.trim().split(/\s+as\s+/);
    return { local: parts[0].trim(), exported: (parts[1] || parts[0]).trim() };
  });
  const body = code.slice(0, m.index);
  const assign = names.map(n => `${JSON.stringify(n.exported)}:${n.local}`).join(',');
  return `${body}\nglobalThis.${globalName} = {${assign}};`;
}

const mainBody = toGlobals(main, '__PDFJS__');
const workerBody = toGlobals(worker, '__PDFJS_WORKER__');

// 转义为 JS 字符串字面量，并拆开 </script 防止提前闭合
const esc = s => JSON.stringify(s).replace(/<\/script/gi, '<\\/script');

const out = `<script type="module">
/* pdf.js v5.7.284 · Apache-2.0 · 内联自 pdfjs-dist，用于本地解析条款 PDF */
/* 1) 先在主线程装载 worker 全局：file:// 下 Blob worker 与动态 import 均受限，
      注入 globalThis.pdfjsWorker 可让 fake worker 直接可用，避免跨域失败 */
(function(){
${workerBody}
})();
try {
  if (globalThis.__PDFJS_WORKER__ && !globalThis.pdfjsWorker) {
    globalThis.pdfjsWorker = globalThis.__PDFJS_WORKER__;
  }
} catch (e) {}
(function(){
${mainBody}
})();
(function(){
  const lib = globalThis.__PDFJS__;
  if (!lib) return;
  // 2) http(s) 环境下优先用后台 worker，避免大文件解析卡住界面
  const canUseRealWorker = /^https?:$/.test(location.protocol);
  if (canUseRealWorker && typeof Worker !== 'undefined') {
    try {
      const blob = new Blob([${esc(workerBody)}], { type: 'text/javascript' });
      lib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob);
    } catch (e) {
      console.warn('PDF worker 初始化失败，改用主线程', e);
    }
  }
  globalThis.__PDFJS_READY__ = true;
  window.dispatchEvent(new CustomEvent('pdfjsready'));
})();
</script>`;

fs.writeFileSync(path.join(dir, 'parts/05_pdfjs.html'), out, 'utf8');
console.log('已生成 parts/05_pdfjs.html：', (out.length / 1048576).toFixed(2), 'MB');
