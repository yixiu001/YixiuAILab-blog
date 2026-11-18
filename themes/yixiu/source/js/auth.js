/* 全站 GitHub 登录：导航头像 + 评论区身份
 * 依赖 cloudflare/comments Worker 的 /api/auth/* 接口。
 * 未配置 OAuth 凭证（Worker 返回 configured:false）时整站隐藏登录入口，
 * 不显示不可用的按钮，不伪造登录状态。 */
(function(){
  var AUTH = window.__YIXIU_AUTH || {};
  var API = String(AUTH.api || '').replace(/\/+$/, '');
  var ENABLE = AUTH.enable === true;
  if(!ENABLE || !API) return;

  var state = { ready:false, configured:false, user:null };

  function fire(){
    document.dispatchEvent(new CustomEvent('yixiu:auth', { detail: state }));
  }

  function setUser(user){
    state.ready = true;
    state.user = user || null;
    render();
    fire();
  }

  function render(){
    var slot = document.getElementById('auth-slot');
    if(!slot) return;
    slot.innerHTML = '';

    // 未配置凭证：正式域名不显示入口；本地预览显示占位按钮，便于确认位置与样式
    if(!state.configured){
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
        state.ready = true;
        state.configured = !!(d && d.configured);
        state.user = (d && d.user) || null;
        render();
        fire();
        return state;
      })
      .catch(function(){
        state.ready = true;
        state.configured = false;
        state.user = null;
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

  refresh();
})();
