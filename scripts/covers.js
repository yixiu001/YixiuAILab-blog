// --------------------------------------------------
// 页面封面图解析（沿用 tool-pages.js / seo-generator.js 的 Hexo 沙箱注册模式）
//
// 约定：把封面图放进 source/images/covers/，文件名取页面路径末段即可自动匹配，
//   文章   posts/apple-id/            -> apple-id.jpg（或 posts-apple-id.jpg）
//   讲义   courses/ai-app/ai-lesson-8/ -> ai-lesson-8.jpg（或 ai-app-ai-lesson-8.jpg）
//   课程   课程中心卡片                -> ai-app.jpg
//   兜底   所有未单独配图的页面        -> default.jpg
// 放好图片即生效，无需逐篇修改 front-matter；显式 cover 字段优先级最高。
//
// 旧数据里的 cover 多指向 /images/videos/<YouTubeID>.jpg（视频缩略图），
// 按要求一律不作为页面封面，自动改走上面的专属封面匹配。
// --------------------------------------------------
var fs = require('fs');
var path = require('path');

function register(hexo) {
  function coverMap() {
    var dir = path.join(hexo.source_dir, 'images', 'covers');
    var map = {};
    try {
      fs.readdirSync(dir).forEach(function (f) {
        if (!/\.(jpe?g|png|webp|avif|svg)$/i.test(f)) return;
        var key = f.replace(/\.[^.]+$/, '').toLowerCase();
        map[key] = '/images/covers/' + f;
      });
    } catch (e) {
      // 目录尚未创建：全部走模板里的品牌兜底封面
    }
    return map;
  }

  // 由页面路径生成候选文件名（从最精确到最简），用户用哪种命名都能命中
  function candidates(raw) {
    var s = String(raw == null ? '' : raw)
      .replace(/\/index\.html$/, '')
      .replace(/^\/+/, '').replace(/\/+$/, '').toLowerCase();
    if (!s) return [];
    var parts = s.split('/');
    var out = [];
    if (parts.length > 1) out.push(parts.join('-'));
    if (parts.length > 2) out.push(parts.slice(1).join('-'));
    out.push(parts[parts.length - 1]);
    return out;
  }

  // coverFor(显式 cover 值, 页面路径或课程 id) -> 封面 URL，取不到返回空串
  hexo.extend.helper.register('coverFor', function (raw, key) {
    var explicit = String(raw == null ? '' : raw).trim();
    if (explicit && !/\/images\/videos\//i.test(explicit)) return explicit;
    var map = coverMap();
    var list = candidates(key);
    for (var i = 0; i < list.length; i++) {
      if (map[list[i]]) return map[list[i]];
    }
    return map['default'] || '';
  });
}

if (typeof hexo !== 'undefined' && hexo && hexo.extend) {
  register(hexo);
}

module.exports = { register: register };
