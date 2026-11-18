/* 一休主题 · 讲义标签（安知鱼风格） */

// {% note [info|warning|danger|success] 标题 %} 内容 {% endnote %}
hexo.extend.tag.register('note', function(args, content){
  var type = (args[0] || 'info').toLowerCase();
  var iconMap = {info:'💡', tip:'💡', warning:'⚠️', danger:'❗', success:'✅'};
  var title = args.slice(1).join(' ') || {info:'提示', tip:'提示', warning:'注意', danger:'重要', success:'小贴士'}[type] || '提示';
  var icon = iconMap[type] || '💡';
  return '<div class="note ' + type + '"><div class="ic">' + icon + '</div><div><div class="ttl">' + title + '</div>' + hexo.render.renderSync({text: content, engine: 'markdown'}) + '</div></div>';
}, {ends: true});

// {% tabs %} ... {% tab 标题 %}内容{% endtab %} ... {% endtabs %}
hexo.extend.tag.register('tabs', function(args, content){
  return '<div class="tabs">' + content + '</div>';
}, {ends: true});

hexo.extend.tag.register('tab', function(args, content){
  var title = args.join(' ') || '选项';
  var body = hexo.render.renderSync({text: content, engine: 'markdown'});
  return '<div class="pane" data-title="' + title + '">' + body + '</div>';
}, {ends: true});

// {% folding 标题 %} 内容 {% endfolding %}
hexo.extend.tag.register('folding', function(args, content){
  var title = args.join(' ') || '展开查看';
  var body = hexo.render.renderSync({text: content, engine: 'markdown'});
  return '<div class="folding"><details><summary>' + title + '<span class="arrow">›</span></summary><div class="ans">' + body + '</div></details></div>';
}, {ends: true});

// {% gallery 图1 图2 ... %} —— 图片地址列表，可带 |说明
hexo.extend.tag.register('gallery', function(args){
  var html = '<div class="gallery">';
  args.forEach(function(a){
    var parts = a.split('|');
    var src = parts[0];
    var cap = parts[1] || '';
    html += '<figure><img src="' + src + '" alt="' + cap + '">';
    if(cap) html += '<figcaption>' + cap + '</figcaption>';
    html += '</figure>';
  });
  return html + '</div>';
});

// {% video youtube链接|bilibili BV号 %} —— 真实 iframe 嵌入（YouTube 用 embed 域名）
hexo.extend.tag.register('video', function(args){
  var raw = args.join(' ');
  var src = '';
  if(/youtu/i.test(raw)){
    var id = (raw.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/) || [])[1];
    if(id) src = 'https://www.youtube.com/embed/' + id;
  } else if(/BV[\w]+/.test(raw)){
    var bv = (raw.match(/BV[\w]+/) || [])[0];
    src = 'https://player.bilibili.com/player.html?bvid=' + bv;
  } else if(/^https?:\/\//.test(raw)){
    src = raw;
  }
  if(!src) return '<div class="note warning">视频地址无法识别：' + raw + '</div>';
  return '<div class="player"><iframe src="' + src + '" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>';
});
