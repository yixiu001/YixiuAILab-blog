/* 全站 GitHub 登录：导航头像 + 评论区身份
 * 依赖 cloudflare/comments Worker 的 /api/auth/* 接口。
 * 未配置 OAuth 凭证（Worker 返回 configured:false）时整站隐藏登录入口，
 * 不显示不可用的按钮，不伪造登录状态。 */
(function(){
  var AUTH = window.__YIXIU_AUTH || {};
  var API = String(AUTH.api || '').replace(/\/+$/, '');
  var ENABLE = AUTH.enable === true;
  if(!ENABLE || !API) return;

  // 本地只缓存公开资料，绝不缓存 session token（token 仅存于 HttpOnly Cookie）。
  // localStorage 按 origin 隔离：blog1 -> 主域切换时不会串数据，首次访问回退为实时校验。
  var CACHE_KEY = 'yixiu.auth.profile.v1';
  var CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

  function readCache(){
    try{
      var raw = localStorage.getItem(CACHE_KEY);
      if(!raw) return null;
      var c = JSON.parse(raw);
      if(!c || !c.login || !c.cached_at) return null;
      if(Date.now() - Number(c.cached_at) > CACHE_TTL){
        localStorage.removeItem(CACHE_KEY);
        return null;
      }
      return {
        login: String(c.login),
        avatar_url: safeAvatar(c.avatar_url),
        html_url: safeAvatar(c.html_url)
      };
    }catch(e){ return null; }   // 隐私模式 / 数据损坏：静默降级
  }

  function writeCache(user){
    try{
      if(!user || !user.login){ localStorage.removeItem(CACHE_KEY); return; }
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        login: String(user.login),
        avatar_url: safeAvatar(user.avatar_url),
        html_url: safeAvatar(user.html_url),
        cached_at: Date.now()
      }));
    }catch(e){ /* 容量满或被禁用：不影响登录功能 */ }
  }

  function clearCache(){
    try{ localStorage.removeItem(CACHE_KEY); }catch(e){}
  }

  function safeAvatar(raw){
    try{
      var u = new URL(String(raw || ''), location.href);
      return /^https?:$/.test(u.protocol) ? u.href : '';
    }catch(e){ return ''; }
  }

  // verified 表示服务端已确认登录态；缓存资料仅为展示，verified=false
  var state = { ready:false, configured:null, user:null, verified:false };
  // 记录最近一次画到 DOM 上的外观；后台校验回来若外观未变则不重绘，避免登录区闪一下
  var lastPaintKey = null;
  function paintKey(){
    if(state.configured === false || (state.configured === null && !state.user)) return 'placeholder';
    if(state.user) return 'user:' + state.user.login + '|' + (state.user.avatar_url || '');
    return 'anon';
  }

  function fire(){
    document.dispatchEvent(new CustomEvent('yixiu:auth', { detail: {
      ready: state.ready, configured: state.configured,
      user: state.user, verified: state.verified
    } }));
  }

  function setUser(user, verified){
    state.ready = true;
    state.user = user || null;
    state.verified = !!verified && !!state.user;
    if(state.verified) writeCache(state.user); else clearCache();
    render();
    fire();
  }

  function render(){
    var slot = document.getElementById('auth-slot');
    if(!slot) return;
    // 外观未变化（如后台校验确认了同一用户）时保留现有 DOM 与事件，不清空重建
    var key = paintKey();
    if(key === lastPaintKey) return;
    lastPaintKey = key;
    slot.innerHTML = '';

    // 未配置凭证：正式域名不显示入口；本地预览显示占位按钮，便于确认位置与样式
    // configured 为 null 表示尚未校验完成；此时若有本地缓存资料，先展示头像
    if(state.configured === false || (state.configured === null && !state.user)){
      var host = String(location.hostname || '').toLowerCase();
      if(host === 'localhost' || host === '127.0.0.1'){
        var demo = document.createElement('button');
        demo.type = 'button';
        demo.className = 'auth-login auth-login-preview';
        demo.textContent = 'GitHub 登录';
        demo.title = '预览入口：配置 OAuth 凭证并部署后端后自动变为可用';
        demo.addEventListener('click', function(){
          window.alert(
            '这是登录入口的预览。\n\n正式使用还需要：\n' +
            '1. 创建 GitHub OAuth App\n' +
            '2. 将 Client ID / Secret 写入 Worker\n' +
            '3. 同步 D1 表并部署 Worker\n\n' +
            '完成后此按钮会自动变为可用。'
          );
        });
        slot.appendChild(demo);
      }
      return;
    }

    if(state.user){
      var wrap = document.createElement('div');
      wrap.className = 'auth-user';
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'auth-user-btn';
      btn.setAttribute('aria-label', '账号菜单');
      var img = document.createElement('img');
      img.className = 'auth-avatar';
      img.src = state.user.avatar_url || '';
      img.alt = '@' + state.user.login;
      var name = document.createElement('span');
      name.className = 'auth-name';
      name.textContent = '@' + state.user.login;
      btn.appendChild(img);
      btn.appendChild(name);
      btn.appendChild(document.createTextNode(' ▾'));
      var menu = document.createElement('div');
      menu.className = 'auth-menu';
      menu.hidden = true;
      var gh = document.createElement('a');
      gh.className = 'auth-menu-item';
      gh.href = state.user.html_url || ('https://github.com/' + encodeURIComponent(state.user.login));
      gh.target = '_blank';
      gh.rel = 'noopener noreferrer';
      gh.textContent = 'GitHub 主页 ↗';
      var out = document.createElement('button');
      out.type = 'button';
      out.className = 'auth-menu-item';
      out.textContent = '退出登录';
      menu.appendChild(gh);
      menu.appendChild(out);
      wrap.appendChild(btn);
      wrap.appendChild(menu);
      slot.appendChild(wrap);

      btn.addEventListener('click', function(e){
        e.stopPropagation();
        menu.hidden = !menu.hidden;
      });
      document.addEventListener('click', function(){ menu.hidden = true; });
      out.addEventListener('click', function(){ logout(); });
    }else{
      var login = document.createElement('button');
      login.type = 'button';
      login.className = 'auth-login';
      login.textContent = 'GitHub 登录';
      login.title = '使用 GitHub 账号登录';
      login.addEventListener('click', function(){
        var back = location.pathname + location.search;
        location.href = API + '/api/auth/github/start?redirect=' + encodeURIComponent(back);
      });
      slot.appendChild(login);
    }
  }

  function logout(){
    fetch(API + '/api/auth/logout', {
      method:'POST', credentials:'include', headers:{ 'Content-Type':'application/json' }
    }).then(function(r){ return r.json(); }).then(function(d){
      if(!d || !d.ok) throw new Error('logout_failed');
      setUser(null);
    }).catch(function(){
      window.alert('退出失败，请稍后再试。');
    });
  }

  function refresh(){
    return fetch(API + '/api/auth/me', { credentials:'include' })
      .then(function(r){ return r.json(); })
      .then(function(d){
        state.configured = !!(d && d.configured);
        if(!state.configured) clearCache();   // 后端不可用：旧缓存不再可信
        setUser((d && d.user) || null, true);
        return state;
      })
      .catch(function(){
        // 网络失败：保留缓存仅供展示，verified 仍为 false，评论不会冒充身份
        state.configured = null;
        state.ready = true;
        render();
        fire();
        return state;
      });
  }

  // 暴露给评论区等组件复用
  window.YixiuAuth = {
    get state(){ return state; },
    refresh: refresh,
    logout: logout,
    loginUrl: function(back){
      return API + '/api/auth/github/start?redirect=' + encodeURIComponent(back || location.pathname + location.search);
    }
  };

  // 先用本地缓存即时渲染（未验证），校验延后到浏览器空闲，首屏不等 0.6s 的 /api/auth/me
  function scheduleRefresh(delay){
    var run = function(){ refresh(); };
    if(typeof requestIdleCallback === 'function'){
      requestIdleCallback(run, { timeout: 2500 });
    }else{
      setTimeout(run, delay);
    }
  }
  var cached = readCache();
  var fromAuthFlow = /[?&]auth_error=/.test(location.search);
  if(cached){
    state.user = cached;
    state.configured = null;
    render();
    fire();
  }
  // 刚从 OAuth 回调跳回时必须立刻校验，否则登录态不会即时出现
  if(fromAuthFlow) refresh();
  else scheduleRefresh(cached ? 1200 : 300);
})();
