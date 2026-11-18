// ============================================================
// 一休AI实验室 · 站点数据后端（Cloudflare Workers + D1）
// ------------------------------------------------------------
// 公开评论接口：
//   GET  /api/comments?path=/posts/xxx/   → 某页评论列表
//   POST /api/comments {path,name,content} → 发表评论（登录用户自动带 GitHub 身份）
//   GET  /api/count?key=xxx               → 读取计数器
//   POST /api/count?key=xxx               → 计数器 +1
//
// GitHub 登录（全站登录态）：
//   GET  /api/auth/me        → { configured, user } 当前登录用户
//   GET  /api/auth/github/start?redirect=/posts/xxx/ → 302 跳 GitHub 授权
//   GET  /api/auth/github/callback?code&state        → 换 token、建会话、跳回站点
//   POST /api/auth/logout    → 销毁会话
//
// 部署前必须设置两个 Worker Secret（不要写进代码或 wrangler.toml）：
//   .\cf.ps1 secret put GITHUB_CLIENT_ID
//   .\cf.ps1 secret put GITHUB_CLIENT_SECRET
// 并把 schema.sql 里新增的 users / sessions / comment_auth 三张表同步到远端 D1：
//   .\cf.ps1 d1 execute yixiu-site --remote --file=.\schema.sql -y
//
// 部署步骤（统一走 cloudflare/comments/cf.ps1，自动清除残留代理并直连）：
//   1) .env 填 CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID
//   2) .\cf.ps1 d1 execute yixiu-site --remote --file=.\schema.sql -y
//   3) .\cf.ps1 secret put GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET
//   4) .\cf.ps1 deploy
//   5) 自定义域名 https://api.yixiu521.com 已绑定，无需 workers.dev
//
// 注意：不要直接跑 npx wrangler。代理软件关闭后残留的 http_proxy 会指向
//       已失效的本地端口，导致 ECONNREFUSED / fetch failed。
//       d1 execute 需加 -y 跳过交互确认，否则非交互终端会卡住。
// ============================================================

const JSON_HEAD = { 'Content-Type': 'application/json; charset=utf-8' };
const SESSION_COOKIE = 'yixiu_session';
const STATE_COOKIE = 'yixiu_oauth_state';
const REDIRECT_COOKIE = 'yixiu_oauth_redirect';
const SESSION_TTL = 60 * 60 * 24 * 30;   // 30 天
const OAUTH_STATE_TTL = 600;             // 10 分钟

function allowedOrigins(env) {
  return String(env.ALLOW_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
}

function corsOrigin(request, env) {
  const allow = allowedOrigins(env);
  const origin = request.headers.get('Origin') || '';
  if (!allow.length) return '*';                 // 未配置：放开（便于本地预览）
  if (allow.includes(origin)) return origin;    // 命中白名单：回显
  return allow[0];                              // 未命中：浏览器会拦截
}

function originAllowed(request, env) {
  const allow = allowedOrigins(env);
  if (!allow.length) return true;
  const origin = request.headers.get('Origin') || '';
  return !origin || allow.includes(origin);
}

function reply(data, status, request, env) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: Object.assign({}, JSON_HEAD, {
      'Access-Control-Allow-Origin': corsOrigin(request, env),
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
      'Cache-Control': 'no-store'
    })
  });
}

function redirectResponse(location, cookies) {
  const headers = new Headers({ 'Location': location, 'Cache-Control': 'no-store' });
  if (cookies && cookies.length) {
    // 多个 Set-Cookie 必须逐条 append，不能拼成一个字符串
    for (const c of cookies) headers.append('Set-Cookie', c);
  }
  return new Response(null, { status: 302, headers: headers });
}

function cleanText(v, max) {
  return String(v == null ? '' : v)
    .replace(/[\u0000-\u001F\u007F]/g, ' ')   // 去掉控制字符
    .trim()
    .slice(0, max);
}

// ---------- cookie 工具：host-only cookie 挂在 api 域名上，随跨域请求携带 ----------
function cookieGet(request, name) {
  const raw = request.headers.get('Cookie') || '';
  const parts = raw.split(';');
  for (const p of parts) {
    const i = p.indexOf('=');
    if (i < 0) continue;
    if (p.slice(0, i).trim() === name) {
      try { return decodeURIComponent(p.slice(i + 1).trim()); }
      catch (e) { return p.slice(i + 1).trim(); }
    }
  }
  return '';
}

function cookieSet(name, value, maxAge) {
  // SameSite=None + Secure：本地 localhost 预览也能带上 cookie；正式域名更是同站请求。
  return name + '=' + encodeURIComponent(value) +
    '; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=' + maxAge;
}

function cookieClear(name) {
  return name + '=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0';
}

function randomToken(bytes) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sha256hex(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function safeRedirect(raw, request, env) {
  const site = String(env.SITE_URL || '').replace(/\/+$/, '');
  const base = site || new URL(request.url).origin;   // 相对路径必须以站点域名为基准
  const allow = allowedOrigins(env);
  if (site) allow.push(site);

  if (!raw) return base + '/';
  let u;
  try { u = new URL(raw, base + '/'); }
  catch (e) { return base + '/'; }

  if (u.origin === base) return u.toString();          // 相对路径 / 本站地址
  if (allow.includes(u.origin)) return u.toString();   // 白名单（例如本地预览）
  return base + '/';                                   // 防开放重定向
}

function authConfigured(env) {
  return !!(String(env.GITHUB_CLIENT_ID || '').trim() && String(env.GITHUB_CLIENT_SECRET || '').trim());
}

// ---------- D1 Sessions API：读走就近副本，写走主库 ----------
// 未开启读复制时 withSession 依然可用（查询落到主库），因此代码可先部署，
// Dashboard 开启读复制后无需再改代码即可生效。
function readDB(env) {
  return (env.DB && typeof env.DB.withSession === 'function')
    ? env.DB.withSession('first-unconstrained')   // 就近副本，降低亚太延迟
    : env.DB;
}
function writeDB(env) {
  return (env.DB && typeof env.DB.withSession === 'function')
    ? env.DB.withSession('first-primary')         // 写与主库读：强一致
    : env.DB;
}

async function currentUser(request, env, primary) {
  const token = cookieGet(request, SESSION_COOKIE);
  if (!token || !env.DB) return null;
  const hash = await sha256hex(token);
  const now = Math.floor(Date.now() / 1000);
  try {
    // 评论 POST 内署名用主库读（primary=true）；auth/me 用就近副本
    const db = primary ? writeDB(env) : readDB(env);
    return await db.prepare(
      'SELECT u.github_id, u.login, u.name, u.avatar_url, u.html_url ' +
      'FROM sessions s JOIN users u ON u.id = s.user_id ' +
      'WHERE s.token_hash = ? AND s.expires_at > ?'
    ).bind(hash, now).first() || null;
  } catch (e) {
    return null;   // 表未建好时优雅降级，不影响评论
  }
}

// ---------- GitHub OAuth ----------
function handleAuthStart(request, env, url) {
  if (!authConfigured(env)) {
    return reply({ ok: false, error: 'auth_not_configured' }, 503, request, env);
  }
  const state = randomToken(16);
  const back = safeRedirect(url.searchParams.get('redirect'), request, env);
  const callbackUrl = new URL('/api/auth/github/callback', request.url).toString();
  const authorize =
    'https://github.com/login/oauth/authorize' +
    '?client_id=' + encodeURIComponent(String(env.GITHUB_CLIENT_ID).trim()) +
    '&redirect_uri=' + encodeURIComponent(callbackUrl) +
    '&scope=' + encodeURIComponent('read:user') +
    '&state=' + encodeURIComponent(state);
  return redirectResponse(authorize, [
    cookieSet(STATE_COOKIE, state, OAUTH_STATE_TTL),
    cookieSet(REDIRECT_COOKIE, back, OAUTH_STATE_TTL)
  ]);
}

async function handleAuthCallback(request, env, url) {
  const fail = (err) => {
    const site = String(env.SITE_URL || '').replace(/\/+$/, '') || new URL(request.url).origin;
    return redirectResponse(site + '/?auth_error=' + encodeURIComponent(err), [
      cookieClear(STATE_COOKIE), cookieClear(REDIRECT_COOKIE)
    ]);
  };
  if (!authConfigured(env)) return fail('not_configured');

  const code = cleanText(url.searchParams.get('code'), 200);
  const state = cleanText(url.searchParams.get('state'), 100);
  const savedState = cookieGet(request, STATE_COOKIE);
  if (!code || !state || !savedState || state !== savedState) return fail('bad_state');
  if (!env.DB) return fail('db_not_bound');

  const callbackUrl = new URL('/api/auth/github/callback', request.url).toString();
  let ghUser;
  try {
    const tr = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'yixiu-ai-lab-auth'
      },
      body: JSON.stringify({
        client_id: String(env.GITHUB_CLIENT_ID).trim(),
        client_secret: String(env.GITHUB_CLIENT_SECRET).trim(),
        code: code,
        redirect_uri: callbackUrl
      })
    });
    const tj = await tr.json();
    if (!tj || !tj.access_token) return fail('token_exchange_failed');

    const ur = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': 'Bearer ' + tj.access_token,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'yixiu-ai-lab-auth'
      }
    });
    if (!ur.ok) return fail('user_fetch_failed');
    ghUser = await ur.json();
    if (!ghUser || !ghUser.id || !ghUser.login) return fail('bad_user');
  } catch (e) {
    return fail('github_unreachable');
  }

  try {
    // 登录是写链路：写入 + 写后读 + 建会话全部走主库，避免副本延迟导致登录态丢失
    const W = writeDB(env);
    await W.prepare(
      'INSERT INTO users (github_id, login, name, avatar_url, html_url, last_login_at) ' +
      'VALUES (?, ?, ?, ?, ?, datetime(\'now\')) ' +
      'ON CONFLICT(github_id) DO UPDATE SET ' +
      'login = excluded.login, name = excluded.name, avatar_url = excluded.avatar_url, ' +
      'html_url = excluded.html_url, last_login_at = datetime(\'now\')'
    ).bind(
      ghUser.id, ghUser.login, cleanText(ghUser.name || ghUser.login, 60),
      String(ghUser.avatar_url || ''), String(ghUser.html_url || '')
    ).run();

    const row = await W.prepare('SELECT id FROM users WHERE github_id = ?').bind(ghUser.id).first();
    if (!row) return fail('db_error');

    const token = randomToken(32);
    const hash = await sha256hex(token);
    const expires = Math.floor(Date.now() / 1000) + SESSION_TTL;
    await W.prepare(
      'INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)'
    ).bind(hash, row.id, expires).run();

    const back = safeRedirect(cookieGet(request, REDIRECT_COOKIE), request, env);
    return redirectResponse(back, [
      cookieSet(SESSION_COOKIE, token, SESSION_TTL),
      cookieClear(STATE_COOKIE),
      cookieClear(REDIRECT_COOKIE)
    ]);
  } catch (e) {
    return fail('db_error');
  }
}

async function handleAuth(request, env, url) {
  if (url.pathname === '/api/auth/me') {
    const user = await currentUser(request, env);
    return reply({ ok: true, configured: authConfigured(env), user: user }, 200, request, env);
  }
  if (url.pathname === '/api/auth/github/start') {
    if (request.method !== 'GET') return reply({ ok: false, error: 'method_not_allowed' }, 405, request, env);
    return handleAuthStart(request, env, url);
  }
  if (url.pathname === '/api/auth/github/callback') {
    if (request.method !== 'GET') return reply({ ok: false, error: 'method_not_allowed' }, 405, request, env);
    return await handleAuthCallback(request, env, url);
  }
  if (url.pathname === '/api/auth/logout') {
    if (request.method !== 'POST') return reply({ ok: false, error: 'method_not_allowed' }, 405, request, env);
    if (!originAllowed(request, env)) return reply({ ok: false, error: 'bad_origin' }, 403, request, env);
    const token = cookieGet(request, SESSION_COOKIE);
    if (token && env.DB) {
      try {
        const hash = await sha256hex(token);
        await writeDB(env).prepare('DELETE FROM sessions WHERE token_hash = ?').bind(hash).run();
      } catch (e) { /* 表未建好时忽略 */ }
    }
    const res = reply({ ok: true }, 200, request, env);
    res.headers.set('Set-Cookie', cookieClear(SESSION_COOKIE));
    return res;
  }
  return reply({ ok: false, error: 'not_found' }, 404, request, env);
}

// ---------- 评论 ----------
async function handleComments(request, env, url) {
  const DB = env.DB;
  if (!DB) return reply({ ok: false, error: 'db_not_bound' }, 500, request, env);

  if (request.method === 'GET') {
    const path = cleanText(url.searchParams.get('path'), 300);
    if (!path.startsWith('/')) return reply({ ok: false, error: 'invalid_path' }, 400, request, env);
    let items;
    try {
      // 评论列表是纯读：走就近副本。有 comment_auth 表时关联 GitHub 身份；没有时降级。
      const rs = await readDB(env).prepare(
        'SELECT c.id, c.name, c.content, c.created_at, ' +
        'a.login AS github_login, a.avatar_url AS github_avatar ' +
        'FROM comments c LEFT JOIN comment_auth a ON a.comment_id = c.id ' +
        'WHERE c.path = ? ORDER BY c.id ASC LIMIT 200'
      ).bind(path).all();
      items = (rs && rs.results) || [];
    } catch (e) {
      const rs = await readDB(env).prepare(
        'SELECT id, name, content, created_at FROM comments WHERE path = ? ORDER BY id ASC LIMIT 200'
      ).bind(path).all();
      items = (rs && rs.results) || [];
    }
    return reply({ ok: true, items: items }, 200, request, env);
  }

  if (request.method === 'POST') {
    if (!originAllowed(request, env)) return reply({ ok: false, error: 'bad_origin' }, 403, request, env);
    let body;
    try { body = await request.json(); }
    catch (e) { return reply({ ok: false, error: 'invalid_json' }, 400, request, env); }

    const path = cleanText(body.path, 300);
    const content = cleanText(body.content, 500);
    // 写链路全部走主库：署名读、防刷计数、插入、写后读取都必须强一致
    const W = writeDB(env);
    const user = await currentUser(request, env, true);
    // 只允许已登录的 GitHub 用户发表评论。前端闸门只是提示，这里才是真正的鉴权边界：
    // 直接 POST 接口绕过页面的请求同样会被拒绝，且不再接受客户端自报昵称。
    if (!user) {
      return reply({ ok: false, error: 'login_required' }, 401, request, env);
    }
    const name = user.login;
    if (!path.startsWith('/') || !content) {
      return reply({ ok: false, error: 'invalid_input' }, 400, request, env);
    }

    // 轻量防刷：同一 IP 60 秒内最多 5 条
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const recent = await W.prepare(
      "SELECT COUNT(*) AS n FROM comments WHERE ip = ? AND created_at > datetime('now','-60 seconds')"
    ).bind(ip).first();
    if (recent && recent.n >= 5) {
      return reply({ ok: false, error: 'rate_limited' }, 429, request, env);
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19); // UTC，与 D1 默认值同格式
    const rs = await W.prepare(
      'INSERT INTO comments (path, name, content, ip, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(path, name, content, ip, now).run();
    const id = rs && rs.meta && rs.meta.last_row_id;

    if (user && id) {
      try {
        await W.prepare(
          'INSERT INTO comment_auth (comment_id, github_id, login, avatar_url) VALUES (?, ?, ?, ?) ' +
          'ON CONFLICT(comment_id) DO UPDATE SET github_id = excluded.github_id, ' +
          'login = excluded.login, avatar_url = excluded.avatar_url'
        ).bind(id, user.github_id, user.login, String(user.avatar_url || '')).run();
      } catch (e) { /* 表未建好时评论仍可提交，只是不显示 GitHub 身份 */ }
    }

    return reply({
      ok: true,
      item: {
        id: id, name: name, content: content, created_at: now,
        github_login: user ? user.login : null,
        github_avatar: user ? user.avatar_url : null
      }
    }, 200, request, env);
  }

  return reply({ ok: false, error: 'method_not_allowed' }, 405, request, env);
}

async function handleCount(request, env, url) {
  const DB = env.DB;
  if (!DB) return reply({ ok: false, error: 'db_not_bound' }, 500, request, env);
  const key = cleanText(url.searchParams.get('key'), 120);
  if (!key) return reply({ ok: false, error: 'missing_key' }, 400, request, env);

  if (request.method === 'POST') {
    const W = writeDB(env);
    await W.prepare(
      'INSERT INTO counters (key, value) VALUES (?, 1) ON CONFLICT(key) DO UPDATE SET value = value + 1'
    ).bind(key).run();
    // 写后读走主库，立刻拿到 +1 后的值
    const row = await W.prepare('SELECT value FROM counters WHERE key = ?').bind(key).first();
    return reply({ ok: true, key: key, count: (row && row.value) || 0 }, 200, request, env);
  }
  // 纯读走就近副本
  const row = await readDB(env).prepare('SELECT value FROM counters WHERE key = ?').bind(key).first();
  return reply({ ok: true, key: key, count: (row && row.value) || 0 }, 200, request, env);
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: {
        'Access-Control-Allow-Origin': corsOrigin(request, env),
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin'
      }});
    }

    const url = new URL(request.url);
    try {
      if (url.pathname.indexOf('/api/auth/') === 0) return await handleAuth(request, env, url);
      if (url.pathname === '/api/comments') return await handleComments(request, env, url);
      if (url.pathname === '/api/count')    return await handleCount(request, env, url);
      return reply({ ok: false, error: 'not_found' }, 404, request, env);
    } catch (e) {
      return reply({ ok: false, error: 'server_error', detail: String(e && e.message || e) }, 500, request, env);
    }
  }
};
