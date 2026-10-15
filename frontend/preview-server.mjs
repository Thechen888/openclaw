// 零依赖静态预览服务器：规避 vite preview 在根路径 / 返回 3xx 重定向、
// 而 IDE 内嵌预览 webview 不跟随重定向导致黑屏的问题。
// 策略：根路径直接吐 dist/index.html（200，不重定向）；
//       /openclaw/dist/... 前缀映射到 dist 目录下的真实文件。
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// 可通过第 3 个参数指定要服务的目录（如 base='/' 的本地预览构建产物 dist-preview）
const DIST = path.join(__dirname, process.argv[3] || 'dist');
const BASE_PREFIX = '/openclaw/dist';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
};

const port = Number(process.argv[2] || 5194);

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, buf) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('500 Internal Server Error');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(buf);
  });
}

const server = http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    urlPath = '/';
  }

  // 去掉子路径 base 前缀，映射到 dist 内真实文件
  let rel = urlPath;
  if (rel === BASE_PREFIX || rel.startsWith(BASE_PREFIX + '/')) {
    rel = rel.slice(BASE_PREFIX.length) || '/';
  }

  // 目录 / 根路径 / 非资源请求（无扩展名，SPA 路由）→ index.html
  if (rel === '/' || rel === '' || rel === '/index.html') {
    return sendFile(res, path.join(DIST, 'index.html'));
  }

  const safe = path.normalize(path.join(DIST, rel));
  if (!safe.startsWith(DIST)) {
    res.writeHead(403);
    return res.end('403 Forbidden');
  }

  fs.stat(safe, (err, stat) => {
    if (!err && stat.isDirectory()) {
      return sendFile(res, path.join(safe, 'index.html'));
    }
    if (err || !/\.[a-z0-9]+$/i.test(safe)) {
      // 文件不存在或像是前端路由 → SPA 回退到 index.html
      return sendFile(res, path.join(DIST, 'index.html'));
    }
    sendFile(res, safe);
  });
});

server.listen(port, () => {
  console.log(`[preview-server] http://localhost:${port}/  (serving ${DIST}, no redirect at root)`);
});
