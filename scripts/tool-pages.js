// --------------------------------------------------
// 工具详情页生成器
// 读取 source/_data/resources.yml，为每个工具生成 /tools/<id>/ 静态页。
// 新增工具只需在 resources.yml 加一条（含唯一 id），页面自动生成，无需改模板。
// --------------------------------------------------
var fs = require('fs');
var path = require('path');
var yaml = require('js-yaml');

function readGroups(hexo) {
  var file = path.join(hexo.source_dir, '_data', 'resources.yml');
  if (!fs.existsSync(file)) return [];
  try {
    var data = yaml.load(fs.readFileSync(file, 'utf8'));
    return (data && data.groups) || [];
  } catch (e) {
    console.error('[tool-pages] 读取 resources.yml 失败：' + e.message);
    return [];
  }
}

function register(hexo) {
  hexo.extend.generator.register('tool-pages', function(locals) {
    var groups = readGroups(hexo);
    var routes = [];
    var seen = {};

    groups.forEach(function(g, gi) {
      (g.items || []).forEach(function(it) {
        if (!it.id) return;
        var id = String(it.id).trim();
        if (seen[id]) {
          console.error('[tool-pages] 重复的 id：' + id + '（已跳过）');
          return;
        }
        seen[id] = true;

        // 计算同分类的上一/下一个工具
        var items = g.items || [];
        var idx = items.indexOf(it);
        var prev = idx > 0 ? items[idx - 1] : null;
        var next = idx < items.length - 1 ? items[idx + 1] : null;

        routes.push({
          path: 'tools/' + id + '/',
          layout: ['tool', 'page'],
          data: {
            title: it.name + ' - 工具详情',
            layout: 'tool',
            tool: it,
            group: { name: g.name, icon: g.icon, desc: g.desc, anchor: 'group-' + gi },
            prevTool: prev,
            nextTool: next,
            allGroups: groups
          }
        });
      });
    });

    return routes;
  });
}

if (typeof hexo !== 'undefined' && hexo && hexo.extend) {
  register(hexo);
}

module.exports = { register: register };
