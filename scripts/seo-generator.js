// --------------------------------------------------
// SEO 生成器：产出 sitemap.xml 与 robots.txt
// 沿用 tool-pages.js 的 Hexo 沙箱注册模式（hexo 为全局注入）。
// 零外部依赖，URL 全部基于 config.url 生成绝对地址。
// --------------------------------------------------

function xmlEscape(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// 把 Hexo 的 path 规范化为以 / 结尾的站点绝对路径
function normalizePath(p) {
  var s = String(p == null ? '' : p).replace(/^\/+/, '');
  if (!s) return '/';
  s = s.replace(/index\.html$/, '');
  if (/\.(xml|txt|json|ico)$/i.test(s)) return '/' + s;
  if (!/\/$/.test(s)) s += '/';
  return '/' + s;
}

function absoluteUrl(config, p) {
  var base = String(config.url || '').replace(/\/+$/, '');
  return base + normalizePath(p);
}

// 最后修改时间：优先 updated，其次 date；格式化为 W3C 日期
function lastMod(item) {
  var d = (item && (item.updated || item.date)) || null;
  if (!d) return '';
  try {
    var date = d.toDate ? d.toDate() : new Date(d);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
  } catch (e) {
    return '';
  }
}

function register(hexo) {
  hexo.extend.generator.register('seo-sitemap', function(locals) {
    var config = hexo.config;
    var base = String(config.url || '').replace(/\/+$/, '');
    var entries = [];

    function add(path, item, changefreq, priority) {
      entries.push({
        loc: absoluteUrl(config, path),
        lastmod: lastMod(item),
        changefreq: changefreq || 'weekly',
        priority: priority || '0.5'
      });
    }

    // 首页
    add('/', null, 'daily', '1.0');

    // 文章
    (locals.posts || []).forEach(function(post) {
      add(post.path, post, 'weekly', '0.8');
    });

    // 独立页面（含课程节、工具详情页、about 等）
    (locals.pages || []).forEach(function(page) {
      var p = normalizePath(page.path);
      // 跳过 sitemap/robots 自身，避免自引用
      if (/^\/(sitemap\.xml|robots\.txt)$/i.test(p)) return;
      add(page.path, page, 'monthly', '0.6');
    });

    // 分类 / 标签归档页
    (locals.categories || []).forEach(function(cat) {
      if (cat.length) add(cat.path, null, 'weekly', '0.3');
    });
    (locals.tags || []).forEach(function(tag) {
      if (tag.length) add(tag.path, null, 'weekly', '0.3');
    });

    // 归档首页
    var archivePath = (config.archive_dir || 'archives') + '/';
    add(archivePath, null, 'weekly', '0.5');

    // 去重（同一 loc 只保留一条）
    var seen = {};
    entries = entries.filter(function(e) {
      if (seen[e.loc]) return false;
      seen[e.loc] = true;
      return true;
    });

    var lines = [];
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    entries.forEach(function(e) {
      lines.push('  <url>');
      lines.push('    <loc>' + xmlEscape(e.loc) + '</loc>');
      if (e.lastmod) lines.push('    <lastmod>' + e.lastmod + '</lastmod>');
      lines.push('    <changefreq>' + e.changefreq + '</changefreq>');
      lines.push('    <priority>' + e.priority + '</priority>');
      lines.push('  </url>');
    });
    lines.push('</urlset>');
    var sitemap = lines.join('\n') + '\n';

    var robots = [
      'User-agent: *',
      'Allow: /',
      '',
      'Sitemap: ' + base + '/sitemap.xml',
      ''
    ].join('\n');

    return [
      { path: 'sitemap.xml', data: sitemap },
      { path: 'robots.txt', data: robots }
    ];
  });
}

if (typeof hexo !== 'undefined' && hexo && hexo.extend) {
  register(hexo);
}

module.exports = { register: register };
