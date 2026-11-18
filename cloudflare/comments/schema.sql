-- 一休AI实验室 · D1 建表脚本
-- 执行：npx wrangler d1 execute yixiu-site --remote --file=cloudflare/comments/schema.sql

-- 评论：按页面 path 归档，path 即浏览器 location.pathname（如 /posts/hello-world/）
CREATE TABLE IF NOT EXISTS comments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  path       TEXT    NOT NULL,
  name       TEXT    NOT NULL DEFAULT '匿名访客',
  content    TEXT    NOT NULL,
  ip         TEXT    NOT NULL DEFAULT '',
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_comments_path ON comments(path, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_ip_time ON comments(ip, created_at);

-- 通用计数器：预留给阅读数、在学人数、点赞等动态数据
-- GET /api/count?key=views:/posts/hello-world/ 读取；POST 同地址 +1
CREATE TABLE IF NOT EXISTS counters (
  key   TEXT PRIMARY KEY,
  value INTEGER NOT NULL DEFAULT 0
);

-- GitHub 登录：用户表（github_id 唯一，重复登录只更新资料）
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  github_id     INTEGER NOT NULL UNIQUE,
  login         TEXT    NOT NULL,
  name          TEXT    NOT NULL DEFAULT '',
  avatar_url    TEXT    NOT NULL DEFAULT '',
  html_url      TEXT    NOT NULL DEFAULT '',
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- GitHub 登录：会话表（只存 token 的 SHA-256，明文只在浏览器 Cookie 里）
-- expires_at 为 Unix 秒；Worker 查询时与 Date.now()/1000 比较
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT    PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions(expires_at);

-- 评论与 GitHub 身份的关联（旧评论没有此行，前端按匿名头像显示）
CREATE TABLE IF NOT EXISTS comment_auth (
  comment_id INTEGER PRIMARY KEY,
  github_id  INTEGER NOT NULL,
  login      TEXT    NOT NULL,
  avatar_url TEXT    NOT NULL DEFAULT ''
);
