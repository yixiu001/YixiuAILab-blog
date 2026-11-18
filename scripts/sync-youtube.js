/**
 * YouTube 频道数据同步脚本
 * 抓取 @YixiuAILab 的真实数据，生成 source/_data/youtube.yml
 * - 在 hexo generate 前自动运行（before_generate 钩子）
 * - 抓取失败时保留上次数据，不中断构建
 */
var https = require('https');
var fs = require('fs');
var path = require('path');

var CHANNEL = 'YixiuAILab';
var UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
var DATA_FILE = path.join(__dirname, '..', 'source', '_data', 'youtube.yml');
var IMG_DIR = path.join(__dirname, '..', 'source', 'images', 'videos');
var THEME_IMG_DIR = path.join(__dirname, '..', 'themes', 'yixiu', 'source', 'images', 'videos');

// 视频 ID → 站内讲义文章 / 分类（YouTube 只提供视频数据，这些是本站自有映射）
var VIDEO_META = {
  '2XJUSpqGRWE': { localUrl: '/posts/google-account/', category: '账号教程' },
  '-Lj0qYi_C6Q': { localUrl: '/posts/tg-account/', category: '账号教程' },
  'h9PJK64By4E': { localUrl: '/posts/apple-id/', category: '海外工具' },
  'kTVRMm4J5pw': { localUrl: '/posts/biyapay/', category: '支付充值' }
};

function fetch(url, redirects) {
  redirects = redirects || 0;
  return new Promise(function(resolve, reject) {
    if (redirects > 5) return reject(new Error('too many redirects'));
    https.get(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8' } }, function(res) {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        var next = res.headers.location.startsWith('http') ? res.headers.location : 'https://www.youtube.com' + res.headers.location;
        return fetch(next, redirects + 1).then(resolve, reject);
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('HTTP ' + res.statusCode)); }
      var chunks = [];
      res.on('data', function(c){ chunks.push(c); });
      res.on('end', function(){ resolve(Buffer.concat(chunks).toString('utf8')); });
    }).on('error', reject);
  });
}

function unescapeJson(s) {
  try { return JSON.parse('"' + s.replace(/"/g, '\\"') + '"'); }
  catch (e) { return s; }
}

// 把 "12.8K" / "1.8K" / "11,444" / "7 個月前" 等转成展示用的简洁文本
function prettyCount(raw) {
  if (!raw) return '';
  raw = raw.replace(/位訂閱者|位订阅者|次|觀看|观看/g, '').trim();
  return raw;
}
function toChineseTime(raw) {
  if (!raw) return '';
  return raw.replace(/個月/g, '个月').replace(/年前/g, '年前').replace(/天前/g, '天前').replace(/週/g, '周').replace(/小时/g,'小時');
}
function parseNum(raw) {
  if (!raw) return 0;
  var m = String(raw).replace(/,/g,'').match(/([\d.]+)\s*([KMW千萬万])?/i);
  if (!m) return 0;
  var n = parseFloat(m[1]);
  var u = (m[2] || '').toUpperCase();
  if (u === 'K' || u === '千') n *= 1e3;
  else if (u === 'M' || u === '萬' || u === '万') n *= 1e4;
  else if (u === 'W') n *= 1e4;
  return Math.round(n);
}

function parseAbout(html) {
  var d = {};
  var sub = (html.match(/"subscriberCountText":"([^"]+)"/) || [])[1];
  var vcnt = (html.match(/"videoCountText":"([^"]+)"/) || [])[1];
  var vraw = (html.match(/"viewCountText":"([^"]+)"/) || [])[1] || '';
  var views = (vraw.match(/([\d,]+)/) || [])[1] || '';
  var joined = (html.match(/"joinedDateText":\{"content":"([^"]+)"/) || [])[1];
  // 订阅数保留频道原始展示文本（如 12.8K / 1.28万），最贴近 YouTube 官网
  d.subscribersText = sub ? String(sub).replace(/位訂閱者|位订阅者/g, '').trim() : '';
  d.subscribers = parseNum(sub);
  d.videoCount = parseNum(vcnt);
  d.totalViews = parseNum(views);
  d.totalViewsText = views || '';
  d.joined = joined ? joined.replace(/加入日期：?/, '') : '';
  return d;
}

function parseVideos(html) {
  var ids = [];
  var re = /"videoId":"([\w-]{11})"/g, m;
  while ((m = re.exec(html))) { if (ids.indexOf(m[1]) < 0) ids.push(m[1]); }
  var out = [];
  ids.forEach(function(id) {
    var i = html.indexOf('"videoId":"' + id + '"');
    var seg = html.slice(i, i + 4200);
    var t = seg.match(/"lockupMetadataViewModel":\{"title":\{"content":"(.*?)"/);
    if (!t) return; // 不是视频卡片节点，跳过
    var metas = [];
    var mre = /"text":\{"content":"([^"]+)"/g, mm;
    while ((mm = mre.exec(seg))) { metas.push(mm[1]); if (metas.length >= 4) break; }
    var viewsText = metas[0] ? prettyCount(metas[0]) : '';
    var timeText = metas[1] ? toChineseTime(metas[1]) : '';
    var title = unescapeJson(t[1]);
    // 去重：同一视频可能在页面出现多次，按标题+观看数判定
    if (out.some(function(v){ return v.title === title; })) return;
    var meta = VIDEO_META[id] || {};
    out.push({
      id: id,
      title: title,
      viewsText: viewsText,
      views: parseNum(viewsText),
      published: timeText,
      url: meta.localUrl || ('https://www.youtube.com/watch?v=' + id),
      youtube: 'https://www.youtube.com/watch?v=' + id,
      category: meta.category || '其他',
      cover: 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg'
    });
  });
  return out;
}

function yamlEscape(s) {
  return String(s).replace(/"/g, '\\"').replace(/\n/g, ' ');
}

function buildYaml(data) {
  var lines = [];
  lines.push('# 由 scripts/sync-youtube.js 自动生成，请勿手动编辑');
  lines.push('# 数据来源：YouTube 频道 @' + CHANNEL);
  lines.push('# 同步时间：' + data.syncedAt);
  lines.push('channel:');
  lines.push('  id: ' + CHANNEL);
  lines.push('  name: 一休AI实验室');
  lines.push('  url: https://www.youtube.com/@' + CHANNEL);
  lines.push('  subscribers: ' + data.subscribers);
  lines.push('  subscribersText: "' + yamlEscape(data.subscribersText) + '"');
  lines.push('  videoCount: ' + data.videoCount);
  lines.push('  totalViews: ' + data.totalViews);
  lines.push('  totalViewsText: "' + yamlEscape(data.totalViewsText) + '"');
  lines.push('  joined: "' + yamlEscape(data.joined) + '"');
  lines.push('videos:');
  data.videos.forEach(function(v) {
    lines.push('  - id: ' + v.id);
    lines.push('    title: "' + yamlEscape(v.title) + '"');
    lines.push('    views: ' + v.views);
    lines.push('    viewsText: "' + yamlEscape(v.viewsText) + '"');
    lines.push('    published: "' + yamlEscape(v.published) + '"');
    lines.push('    category: "' + yamlEscape(v.category) + '"');
    lines.push('    url: "' + v.url + '"');
    lines.push('    youtube: "' + v.youtube + '"');
    lines.push('    cover: "' + v.cover + '"');
  });
  return lines.join('\n') + '\n';
}

// 视频列表页数据（videos.ejs 读 site.data.videos，顶层须为数组）
function buildVideosYaml(data) {
  var lines = [];
  lines.push('# 由 scripts/sync-youtube.js 自动生成，请勿手动编辑');
  lines.push('# 真实数据来自 @' + CHANNEL + '，同步时间：' + data.syncedAt);
  data.videos.forEach(function(v) {
    lines.push('  - id: ' + v.id);
    lines.push('    title: "' + yamlEscape(v.title) + '"');
    lines.push('    views: ' + v.views);
    lines.push('    viewsText: "' + yamlEscape(v.viewsText) + '"');
    lines.push('    date: "' + v.published + '"');
    lines.push('    category: "' + yamlEscape(v.category) + '"');
    lines.push('    duration: "' + yamlEscape(v.published) + '"');
    lines.push('    url: "' + v.url + '"');
    lines.push('    cover: "' + v.cover + '"');
  });
  return lines.join('\n') + '\n';
}

function downloadThumb(video) {
  return new Promise(function(resolve) {
    var target = path.join(IMG_DIR, video.id + '.jpg');
    var target2 = path.join(THEME_IMG_DIR, video.id + '.jpg');
    var url = video.cover;
    var done = function(v){ resolve(v); };
    try { fs.mkdirSync(IMG_DIR, { recursive: true }); fs.mkdirSync(THEME_IMG_DIR, { recursive: true }); } catch (e) {}
    if (fs.existsSync(target) && fs.statSync(target).size > 1000) {
      try { fs.copyFileSync(target, target2); } catch (e) {}
      video.cover = '/images/videos/' + video.id + '.jpg';
      return done(video);
    }
    https.get(url, { headers: { 'User-Agent': UA } }, function(res) {
      if (res.statusCode !== 200) { res.resume(); return done(video); }
      var chunks = [];
      res.on('data', function(c){ chunks.push(c); });
      res.on('end', function(){
        try {
          var buf = Buffer.concat(chunks);
          fs.writeFileSync(target, buf);
          fs.writeFileSync(target2, buf);
          video.cover = '/images/videos/' + video.id + '.jpg';
        } catch (e) {}
        done(video);
      });
    }).on('error', function(){ done(video); });
  });
}

function sync() {
  console.log('[youtube-sync] 正在同步 @' + CHANNEL + ' 真实数据...');
  return Promise.all([
    fetch('https://www.youtube.com/@' + CHANNEL + '/about'),
    fetch('https://www.youtube.com/@' + CHANNEL + '/videos')
  ]).then(function(results) {
    var channel = parseAbout(results[0]);
    var videos = parseVideos(results[1]);
    if (!channel.subscribers && !videos.length) throw new Error('解析结果为空，可能页面结构已变化');
    // 按最新在前排序（页面顺序通常已是最新）
    return Promise.all(videos.map(downloadThumb)).then(function(vids) {
      var data = {
        syncedAt: new Date().toISOString().replace('T',' ').slice(0,16) + ' UTC',
        subscribers: channel.subscribers,
        subscribersText: channel.subscribersText,
        videoCount: channel.videoCount || vids.length,
        totalViews: channel.totalViews,
        totalViewsText: channel.totalViewsText,
        joined: channel.joined,
        videos: vids
      };
      fs.writeFileSync(DATA_FILE, buildYaml(data), 'utf8');
      console.log('[youtube-sync] ✓ 已同步：' + data.subscribersText + ' 订阅 / ' + data.videoCount + ' 视频');
      return data;
    });
  }).catch(function(err) {
    console.warn('[youtube-sync] 抓取失败：' + err.message);
    if (fs.existsSync(DATA_FILE)) {
      console.warn('[youtube-sync] 保留上次成功同步的数据，构建继续。');
    } else {
      console.warn('[youtube-sync] 无历史数据，首页 YouTube 区块将显示占位提示。');
    }
    return null;
  });
}

// 作为 Hexo 钩子：generate 前同步；命中缓存（6小时内）则跳过
function registerHook(hexo) {
  hexo.extend.filter.register('before_generate', function() {
    if (process.env.YT_SYNC_FORCE === '1') return sync();
    var fresh = false;
    if (fs.existsSync(DATA_FILE)) {
      var age = Date.now() - fs.statSync(DATA_FILE).mtimeMs;
      fresh = age < 6 * 60 * 60 * 1000;
    }
    if (fresh) { console.log('[youtube-sync] 数据为近 6 小时内同步，跳过（设 YT_SYNC_FORCE=1 强制刷新）。'); return Promise.resolve(); }
    return sync();
  });
}

// 直接运行：node scripts/sync-youtube.js
if (require.main === module) {
  sync().then(function(){ process.exit(0); }, function(){ process.exit(1); });
}

// 被 Hexo 作为插件加载时，自动注册 before_generate 钩子
if (typeof hexo !== 'undefined' && hexo && hexo.extend) {
  registerHook(hexo);
}

module.exports = { sync: sync, registerHook: registerHook };
