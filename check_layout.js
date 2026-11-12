// 用 Edge 远程调试协议测量页面在指定视口下的溢出元素（仅用于本地自检，无第三方依赖）
const http = require('http');
const crypto = require('crypto');
const net = require('net');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9333;
const SITE = __dirname;
const WIDTHS = [360, 390, 430, 768, 1440];
const PAGES = ['index.html', 'advisor.html', 'research.html', 'projects.html', 'publications.html', 'join.html'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function getJSON(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

/* ---------- 极简 WebSocket 客户端（仅支持客户端掩码文本帧） ---------- */
function connectWS(wsUrl) {
  const u = new URL(wsUrl);
  const key = crypto.randomBytes(16).toString('base64');
  return new Promise((resolve, reject) => {
    const sock = net.connect(Number(u.port), u.hostname, () => {
      sock.write(
        `GET ${u.pathname}${u.search} HTTP/1.1\r\n` +
        `Host: ${u.host}\r\n` +
        'Upgrade: websocket\r\nConnection: Upgrade\r\n' +
        `Sec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`
      );
    });
    sock.on('error', reject);

    let handshaken = false;
    let buf = Buffer.alloc(0);
    const handlers = { message: () => {} };

    sock.on('data', (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      if (!handshaken) {
        const i = buf.indexOf('\r\n\r\n');
        if (i === -1) return;
        const head = buf.slice(0, i).toString();
        if (!/101/.test(head.split('\r\n')[0])) return reject(new Error('握手失败: ' + head.split('\r\n')[0]));
        buf = buf.slice(i + 4);
        handshaken = true;
        resolve(api);
      }
      // 解析帧
      for (;;) {
        if (buf.length < 2) return;
        const b0 = buf[0], b1 = buf[1];
        const opcode = b0 & 0x0f;
        const masked = (b1 & 0x80) !== 0;
        let len = b1 & 0x7f;
        let off = 2;
        if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
        else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
        let mask = null;
        if (masked) { if (buf.length < off + 4) return; mask = buf.slice(off, off + 4); off += 4; }
        if (buf.length < off + len) return;
        let payload = buf.slice(off, off + len);
        if (mask) { const p = Buffer.from(payload); for (let k = 0; k < p.length; k++) p[k] ^= mask[k % 4]; payload = p; }
        buf = buf.slice(off + len);

        if (opcode === 0x8) { sock.end(); return; }
        if (opcode === 0x1) handlers.message(payload.toString('utf8'));
        else if (opcode === 0x9) sendFrame(sock, 0xa, payload); // ping -> pong
      }
    });

    function sendFrame(s, opcode, payload) {
      const data = Buffer.isBuffer(payload) ? payload : Buffer.from(String(payload), 'utf8');
      const mask = crypto.randomBytes(4);
      let header;
      if (data.length < 126) header = Buffer.from([0x80 | opcode, 0x80 | data.length]);
      else if (data.length < 65536) { header = Buffer.alloc(4); header[0] = 0x80 | opcode; header[1] = 0x80 | 126; header.writeUInt16BE(data.length, 2); }
      else { header = Buffer.alloc(10); header[0] = 0x80 | opcode; header[1] = 0x80 | 127; header.writeBigUInt64BE(BigInt(data.length), 2); }
      const masked = Buffer.from(data);
      for (let k = 0; k < masked.length; k++) masked[k] ^= mask[k % 4];
      s.write(Buffer.concat([header, mask, masked]));
    }

    const api = {
      onMessage: (fn) => { handlers.message = fn; },
      sendText: (text) => sendFrame(sock, 0x1, text),
      close: () => { try { sock.end(); } catch (e) {} },
    };
  });
}

async function main() {
  const profile = path.join(os.tmpdir(), 'dsh-edge-profile-' + Date.now());
  const proc = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + profile,
    'about:blank',
  ], { stdio: 'ignore' });

  let targets = null;
  for (let i = 0; i < 60; i++) {
    try { targets = await getJSON(`http://127.0.0.1:${PORT}/json/list`); if (targets && targets.length) break; }
    catch (e) { /* 等待浏览器启动 */ }
    await sleep(500);
  }
  if (!targets || !targets.length) { console.log('无法连接 Edge 调试端口'); proc.kill(); process.exit(1); }

  // 选择一个真正的 page 目标（避免误连扩展后台页）
  const page = targets.find((t) => t.type === 'page' && /^(file|about|http)/.test(t.url || ''))
            || targets.find((t) => t.type === 'page');
  if (!page) { console.log('未找到可用的页面目标'); proc.kill(); process.exit(1); }

  const ws = await connectWS(page.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  ws.onMessage((text) => {
    const msg = JSON.parse(text);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  });
  // 整页导航会重建执行上下文，这里为每次导航建立新的会话
  let sessionId = null;
  const send = (method, params = {}, withSession = true) => new Promise((res) => {
    const i = ++id;
    const payload = { id: i, method, params };
    if (withSession && sessionId) payload.sessionId = sessionId;
    pending.set(i, res);
    ws.sendText(JSON.stringify(payload));
    setTimeout(() => { if (pending.has(i)) { pending.delete(i); res({}); } }, 20000);
  });

  await send('Target.setAutoAttach', { autoAttach: false, waitForDebuggerOnStart: false }, false);
  const attach = await send('Target.attachToTarget', { targetId: page.id, flatten: true }, false);
  sessionId = attach.result && attach.result.sessionId;
  if (!sessionId) { console.log('无法附加到页面目标'); proc.kill(); process.exit(1); }

  await send('Page.enable');
  await send('Runtime.enable');

  const EXPR = `(() => {
    const d = document, w = window;
    const vw = w.innerWidth;
    const bad = [];
    d.querySelectorAll('body *').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.right > vw + 1) {
        bad.push({ sel: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).join('.') : ''), right: Math.round(r.right), w: Math.round(r.width) });
      }
    });
    const seen = new Set();
    const uniq = bad.filter(b => { const k = b.sel; if (seen.has(k)) return false; seen.add(k); return true; });
    return JSON.stringify({ vw, docW: d.documentElement.scrollWidth, bodyW: d.body.scrollWidth, overflow: uniq.slice(0, 10), count: uniq.length });
  })()`;

  let failures = 0;
  for (const page of PAGES) {
    for (const width of WIDTHS) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
      await send('Page.navigate', { url: 'file:///' + path.join(SITE, page).replace(/\\/g, '/') });
      await sleep(700);
      const res = await send('Runtime.evaluate', { expression: EXPR, returnByValue: true });
      const out = res.result && res.result.result && res.result.result.value;
      if (!out) { console.log(`${page} @${width} :: 测量失败`); failures++; continue; }
      const r = JSON.parse(out);
      const ok = r.docW <= r.vw + 1 && r.count === 0;
      if (!ok) {
        failures++;
        console.log(`[溢出] ${page} @${width}px  docW=${r.docW} vw=${r.vw} 元素数=${r.count}`);
        r.overflow.forEach(o => console.log(`        ${o.sel}  right=${o.right} w=${o.w}`));
      } else {
        console.log(`[OK]   ${page} @${width}px  docW=${r.docW}`);
      }
    }
  }

  console.log(failures ? `\n共 ${failures} 处溢出` : '\n所有视口均无横向溢出 [OK]');

  /* ---------- 移动端导航交互检查 ---------- */
  const NAV_EXPR = `(() => {
    const t = document.querySelector('.nav__toggle');
    const m = document.getElementById('site-menu');
    if (!t || !m) return JSON.stringify({ error: '未找到导航元素' });
    const r = t.getBoundingClientRect();
    const inView = r.left >= 0 && r.right <= window.innerWidth + 1 && r.width > 0;
    const cs = getComputedStyle(t);
    const closed = getComputedStyle(m).display;
    t.click();
    const opened = getComputedStyle(m).display;
    const items = Array.from(m.querySelectorAll('a')).map(a => {
      const b = a.getBoundingClientRect();
      return { text: a.textContent.trim(), visible: b.width > 0 && b.right <= window.innerWidth + 1 };
    });
    t.click();
    const reclosed = getComputedStyle(m).display;
    return JSON.stringify({ toggleInView: inView, toggleDisplay: cs.display, closed, opened, reclosed, items });
  })()`;

  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'file:///' + path.join(SITE, 'index.html').replace(/\\/g, '/') });
  await sleep(1500);
  const ctxRes = await send('Runtime.evaluate', {
    expression: `JSON.stringify({ url: location.href, title: document.title, ready: document.readyState, hasToggle: !!document.querySelector('.nav__toggle'), hasMenu: !!document.getElementById('site-menu'), bodyLen: document.body ? document.body.innerHTML.length : -1 })`,
    returnByValue: true,
  });
  console.log('\n--- 页面上下文 ---');
  console.log((ctxRes.result && ctxRes.result.result && ctxRes.result.result.value) || JSON.stringify(ctxRes).slice(0, 300));
  const navRes = await send('Runtime.evaluate', { expression: NAV_EXPR, returnByValue: true });
  const navOut = navRes.result && navRes.result.result && navRes.result.result.value;
  console.log('\n--- 移动端导航（390px）---');
  if (!navOut) {
    console.log('导航测量失败');
    failures++;
  } else {
    const n = JSON.parse(navOut);
    if (n.error) { console.log('错误: ' + n.error); failures++; }
    else {
      const okToggle = n.toggleInView && n.toggleDisplay !== 'none';
      const okOpen = n.opened !== 'none';
      const okClose = n.reclosed === 'none';
      const allVisible = n.items.length === 6 && n.items.every(i => i.visible);
      console.log(`汉堡按钮在视口内: ${okToggle ? 'OK' : '失败'} (display=${n.toggleDisplay})`);
      console.log(`默认收起: ${n.closed === 'none' ? 'OK' : '失败'} (display=${n.closed})`);
      console.log(`点击后展开: ${okOpen ? 'OK' : '失败'} (display=${n.opened})`);
      console.log(`再次点击收起: ${okClose ? 'OK' : '失败'} (display=${n.reclosed})`);
      console.log(`菜单 6 项均可见且不溢出: ${allVisible ? 'OK' : '失败'} -> ${n.items.map(i => i.text).join(' / ')}`);
      if (!(okToggle && okOpen && okClose && allVisible)) failures++;
    }
  }

  fs.writeFileSync(path.join(SITE, '_shots', 'layout-report.json'), JSON.stringify({ failures }, null, 2));
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {}
  ws.close();
  proc.kill();
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error('自检异常:', e.message); process.exit(1); });
