/* 构建期静态资源优化：
 * 1. 按内容生成短 hash，输出 URL 带 ?v=xxx，便于 CDN/浏览器长缓存且更新即刻生效
 * 2. after_generate 压缩 public/css/style.css，不动主题源码
 * 依赖：clean-css（仅构建期使用），Node 内置 crypto 算 hash。 */
'use strict';

var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

var ASSETS = ['css/style.css', 'js/main.js', 'js/auth.js', 'js/qrcode.min.js'];
var versions = {};

function shortHash(buf){
  return crypto.createHash('sha256').update(buf).digest('hex').slice(0, 10);
}

function sourceFile(rel){
  var candidates = [
    path.join(__dirname, '..', 'themes', 'yixiu', 'source', rel),
    path.join(__dirname, '..', 'source', rel)
  ];
  for(var i = 0; i < candidates.length; i++){
    try{ if(fs.statSync(candidates[i]).isFile()) return candidates[i]; }
    catch(e){ /* try next */ }
  }
  return null;
}

function buildVersions(){
  ASSETS.forEach(function(rel){
    var f = sourceFile(rel);
    versions[rel] = f ? shortHash(fs.readFileSync(f)) : '';
  });
}

function register(hexo){
  // 模板里用 assetUrl('/css/style.css')，自动带内容版本号
  hexo.extend.helper.register('assetUrl', function(rel){
    var key = String(rel || '').replace(/^\/+/, '');
    var base = this.url_for(rel);
    var v = versions[key];
    return v ? base + '?v=' + v : base;
  });

  // 每次 generate 前基于源文件重算 hash，保证 URL 与产物内容对应
  hexo.extend.filter.register('before_generate', function(){
    buildVersions();
  });

  // 常规 generate 时压缩；clean 后首次生成文件落盘晚于钩子，改由 build 脚本兜底
  hexo.extend.filter.register('after_generate', function(){
    minifyPublic(hexo.public_dir, hexo.log);
  });
}

function minifyPublic(publicDir, log){
  // Hexo 默认忽略下划线开头的文件，手动把 Pages 响应头配置放进产物
  var headersSrc = path.join(__dirname, '..', 'source', '_headers');
  if(fs.existsSync(headersSrc) && fs.existsSync(publicDir)){
    fs.copyFileSync(headersSrc, path.join(publicDir, '_headers'));
  }
  var target = path.join(publicDir, 'css', 'style.css');
  if(!fs.existsSync(target)) return;
  var src = fs.readFileSync(target, 'utf8');
  try{
    var CleanCSS = require('clean-css');
    var result = new CleanCSS({ level:2, rebase:false }).minify(src);
    if(result.errors && result.errors.length){
      (log ? log.warn : console.warn)('[optimize] CSS minify skipped: ' + result.errors.join('; '));
      return;
    }
    if(Buffer.byteLength(result.styles) >= Buffer.byteLength(src)) return;  // 已压缩过
    fs.writeFileSync(target, result.styles, 'utf8');
    (log ? log.info : console.log)('[optimize] CSS minified: ' + Buffer.byteLength(src) + ' -> ' + Buffer.byteLength(result.styles) + ' bytes');
  }catch(e){
    (log ? log.warn : console.warn)('[optimize] CSS minify failed: ' + e.message);
  }
}

if(typeof hexo !== 'undefined' && hexo && hexo.extend){
  register(hexo);
}

// 独立运行：node scripts/optimize-assets.js（npm run build 末尾调用）
if(require.main === module){
  minifyPublic(path.join(__dirname, '..', 'public'), console);
}

module.exports = { register: register, minifyPublic: minifyPublic };
