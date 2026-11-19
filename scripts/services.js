// --------------------------------------------------
// 外部服务与占位配置统一入口
// 所有模板只通过这几个 helper 读取站点根 _config.yml 的 services 段，
// 不再直接读 themes/yixiu/_config.yml 里的地址，避免多处重复维护。
// 打赏收款码图片也走这里：serviceCfg('reward')，由 reward.ejs 消费。
// 沿用 tool-pages.js / seo-generator.js 的 Hexo 沙箱注册模式。
// --------------------------------------------------

function register(hexo) {
  // 每次调用都读当前配置，保证 hexo server 热更新后取到新值
  function cfg() {
    return (hexo.config && hexo.config.services) || {};
  }

  hexo.extend.helper.register('serviceCfg', function (key) {
    var s = cfg();
    return key ? (s[key] || {}) : s;
  });

  // 只暴露规范化后的接口域名；具体路径是 Worker 固定实现，在模板/前端代码里写死
  hexo.extend.helper.register('serviceApi', function () {
    var a = cfg().api || {};
    return { base: String(a.base || '').replace(/\/+$/, '') };
  });

  // 渠道按钮：展示信息取自 services.channels，链接取自各服务自己的 url
  hexo.extend.helper.register('serviceChannels', function () {
    var s = cfg();
    var list = Array.isArray(s.channels) ? s.channels : [];
    return list.map(function (ch) {
      var target = s[ch.key] || {};
      return {
        name: ch.name || ch.key || '',
        icon: ch.icon || ch.key || '',
        class: ch.class || '',
        url: String(target.url || ch.url || '')
      };
    }).filter(function (ch) { return ch.url; });
  });
}

if (typeof hexo !== 'undefined' && hexo && hexo.extend) {
  register(hexo);
}

module.exports = { register: register };
