/* 界面偏好：只保存公开的筛选/列表选择，不保存任何身份或凭证 */
(function(){
  var KEY = 'yixiu.pref.v1';
  var data = {};
  try{
    var raw = localStorage.getItem(KEY);
    if(raw){ var p = JSON.parse(raw); if(p && typeof p === 'object') data = p; }
  }catch(e){ /* 隐私模式或数据损坏：用空偏好 */ }
  window.YixiuPref = {
    get: function(k, fallback){
      return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : fallback;
    },
    set: function(k, v){
      data[k] = v;
      try{ localStorage.setItem(KEY, JSON.stringify(data)); }catch(e){}
    }
  };
})();

/* 一休主题 · 交互 */
(function(){
  // tabs：用 panes 的 data-title 生成头部
  document.querySelectorAll('.tabs').forEach(function(tabs){
    var panes = tabs.querySelectorAll('.pane');
    if(!panes.length) return;
    var heads = document.createElement('div');
    heads.className = 'heads';
    panes.forEach(function(pane, i){
      var h = document.createElement('div');
      h.className = 'head' + (i === 0 ? ' on' : '');
      h.textContent = pane.getAttribute('data-title') || ('选项' + (i + 1));
      h.addEventListener('click', function(){
        tabs.querySelectorAll('.head').forEach(function(x){ x.classList.remove('on'); });
        tabs.querySelectorAll('.pane').forEach(function(x){ x.classList.remove('on'); });
        h.classList.add('on');
        pane.classList.add('on');
      });
      heads.appendChild(h);
      pane.classList.toggle('on', i === 0);
    });
    tabs.insertBefore(heads, panes[0]);
  });

  // video：点击封面才加载 iframe（无痕、省流量）
  document.querySelectorAll('.video-embed').forEach(function(box){
    var cover = box.querySelector('.vcover');
    if(!cover) return;
    cover.addEventListener('click', function(){
      var iframe = document.createElement('iframe');
      iframe.src = box.getAttribute('data-src');
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
      iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      box.innerHTML = '';
      box.appendChild(iframe);
    });
  });

  // 首页分类 chip 切换（纯视觉演示）
  document.querySelectorAll('.chips .chip').forEach(function(chip){
    chip.addEventListener('click', function(){
      document.querySelectorAll('.chips .chip').forEach(function(x){ x.classList.remove('on'); });
      chip.classList.add('on');
    });
  });

  // 视频列表页分类筛选
  var pageChips = document.querySelectorAll('.page-chips .chip');
  if(pageChips.length){
    function applyPageFilter(chip){
      pageChips.forEach(function(x){ x.classList.remove('on'); });
      chip.classList.add('on');
      var cat = chip.getAttribute('data-cat');
      window.YixiuPref.set('pageCat', cat);
      document.querySelectorAll('.video-grid .vcard').forEach(function(card){
        var show = (cat === '全部') || (card.getAttribute('data-cat') === cat);
        card.style.display = show ? '' : 'none';
      });
    }
    pageChips.forEach(function(chip){
      chip.addEventListener('click', function(){ applyPageFilter(chip); });
    });
    var savedPageCat = window.YixiuPref.get('pageCat', '');
    for(var pi = 0; pi < pageChips.length; pi++){
      if(pageChips[pi].getAttribute('data-cat') === savedPageCat){ applyPageFilter(pageChips[pi]); break; }
    }
  }

  // 课程中心：分类筛选（锚点跳转兼容 location.hash）
  var hubFilter = document.getElementById('hub-filter');
  if(hubFilter){
    var hubChips = hubFilter.querySelectorAll('.hub-chip');
    var hubCards = document.querySelectorAll('#hub-grid .hub-course');
    var hubEmpty = document.getElementById('hub-empty');
    function applyHubFilter(cat){
      window.YixiuPref.set('hubCat', cat);
      hubChips.forEach(function(x){ x.classList.toggle('on', x.getAttribute('data-cat') === cat); });
      var visible = 0;
      hubCards.forEach(function(card){
        var show = (cat === 'all') || (card.getAttribute('data-cat') === cat);
        card.style.display = show ? '' : 'none';
        if(show) visible++;
      });
      if(hubEmpty) hubEmpty.hidden = visible !== 0;
    }
    hubChips.forEach(function(chip){
      chip.addEventListener('click', function(){ applyHubFilter(chip.getAttribute('data-cat')); });
    });
    // URL 带 hash 且对应课程存在时，自动切到该课程的分类，保证锚点可达
    var hashHandled = false;
    if(location.hash && location.hash.length > 1){
      var target = document.querySelector(location.hash);
      if(target && target.classList.contains('hub-course')){
        applyHubFilter(target.getAttribute('data-cat'));
        hashHandled = true;
      }
    }
    // 无锚点时恢复上次筛选
    if(!hashHandled){
      var savedHub = window.YixiuPref.get('hubCat', 'all');
      if(savedHub && savedHub !== 'all'){
        var hubExists = false;
        hubChips.forEach(function(x){ if(x.getAttribute('data-cat') === savedHub) hubExists = true; });
        if(hubExists) applyHubFilter(savedHub);
      }
    }
  }

  // 课程中心：章节目录折叠
  document.querySelectorAll('.hub-toggle').forEach(function(btn){
    btn.addEventListener('click', function(){
      var panel = document.getElementById(btn.getAttribute('aria-controls'));
      if(!panel) return;
      var willOpen = panel.hidden;
      panel.hidden = !willOpen;
      btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      btn.classList.toggle('on', willOpen);
    });
  });

  // 文章归档：视频讲义 / 图文 筛选
  var archiveFilter = document.getElementById('archive-filter');
  if(archiveFilter){
    var afChips = archiveFilter.querySelectorAll('.af-chip');
    var afRows = document.querySelectorAll('#archive-list .arow');
    var afEmpty = document.getElementById('archive-empty');
    function applyArchiveFilter(chip){
      afChips.forEach(function(x){ x.classList.remove('on'); });
      chip.classList.add('on');
      var kind = chip.getAttribute('data-kind');
      window.YixiuPref.set('archiveKind', kind);
      var visible = 0;
      afRows.forEach(function(row){
        var show = (kind === 'all') || (row.getAttribute('data-kind') === kind);
        row.style.display = show ? '' : 'none';
        if(show) visible++;
      });
      if(afEmpty) afEmpty.hidden = visible !== 0;
    }
    afChips.forEach(function(chip){
      chip.addEventListener('click', function(){ applyArchiveFilter(chip); });
    });
    var savedKind = window.YixiuPref.get('archiveKind', 'all');
    if(savedKind){
      for(var ai = 0; ai < afChips.length; ai++){
        if(afChips[ai].getAttribute('data-kind') === savedKind){ applyArchiveFilter(afChips[ai]); break; }
      }
    }
  }

  // 文章页：顶部阅读进度条（随正文滚动）
  var readbarFill = document.getElementById('readbar-fill');
  if(readbarFill){
    function updateReadbar(){
      var doc = document.documentElement;
      var scrollTop = window.pageYOffset || doc.scrollTop || 0;
      var max = Math.max(0, (doc.scrollHeight || document.body.scrollHeight) - window.innerHeight);
      var pct = max > 0 ? Math.min(100, Math.max(0, scrollTop / max * 100)) : 0;
      readbarFill.style.width = pct + '%';
    }
    window.addEventListener('scroll', updateReadbar, {passive:true});
    window.addEventListener('resize', updateReadbar);
    updateReadbar();
  }

  // 资源导航页：实时搜索 + 分类锚点高亮
  var toolSearch = document.getElementById('tool-search');
  if(toolSearch){
    var cards = Array.prototype.slice.call(document.querySelectorAll('.tool-card'));
    var groups = Array.prototype.slice.call(document.querySelectorAll('[data-group]'));
    var empty = document.getElementById('tool-empty');
    function applySearch(){
      var kw = toolSearch.value.trim().toLowerCase();
      var totalVisible = 0;
      groups.forEach(function(g){
        var gVisible = 0;
        g.querySelectorAll('.tool-card').forEach(function(card){
          var hay = (card.getAttribute('data-kw') || '') + ' ' + (card.getAttribute('data-name') || '');
          var show = !kw || hay.indexOf(kw) !== -1;
          card.style.display = show ? '' : 'none';
          if(show) gVisible++;
        });
        g.style.display = gVisible ? '' : 'none';
        totalVisible += gVisible;
      });
      if(empty) empty.hidden = totalVisible !== 0;
    }
    toolSearch.addEventListener('input', applySearch);
    // 按 "/" 聚焦搜索框
    document.addEventListener('keydown', function(e){
      if(e.key === '/' && document.activeElement !== toolSearch){
        var tag = (document.activeElement && document.activeElement.tagName || '').toLowerCase();
        if(tag !== 'input' && tag !== 'textarea'){ e.preventDefault(); toolSearch.focus(); }
      }
      if(e.key === 'Escape' && document.activeElement === toolSearch){ toolSearch.value = ''; applySearch(); toolSearch.blur(); }
    });

    // 左侧悬浮分类菜单：点击高亮 + 平滑滚动（偏移固定导航高度）
    var navCats = Array.prototype.slice.call(document.querySelectorAll('.ns-item'));
    navCats.forEach(function(cat){
      cat.addEventListener('click', function(e){
        var target = document.getElementById(cat.getAttribute('data-target'));
        if(!target) return;
        e.preventDefault();
        navCats.forEach(function(x){ x.classList.remove('on'); });
        cat.classList.add('on');
        var top = target.getBoundingClientRect().top + window.pageYOffset - 92;
        window.scrollTo({ top: top, behavior: 'smooth' });
      });
    });
    // 滚动时同步高亮当前分类：按菜单项的 data-target 找对应区块（兼容无 data-group 的友链区）
    var ticking = false;
    function syncCatOnScroll(){
      if(ticking) return;
      ticking = true;
      window.requestAnimationFrame(function(){
        var line = window.pageYOffset + 140, current = null;
        navCats.forEach(function(cat){
          var target = document.getElementById(cat.getAttribute('data-target'));
          if(!target || target.style.display === 'none') return;
          if(target.getBoundingClientRect().top + window.pageYOffset <= line) current = cat;
        });
        navCats.forEach(function(x){ x.classList.remove('on'); });
        if(current){ current.classList.add('on'); }
        ticking = false;
      });
    }
    window.addEventListener('scroll', syncCatOnScroll, {passive:true});
  }
})();

/* 关于页：统计数字滚动递增（纯装饰，终值已写在 HTML 中，降级不影响显示） */
(function(){
  var nums = Array.prototype.slice.call(document.querySelectorAll('.ab-stat b[data-count]'));
  if(!nums.length) return;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduced || !window.requestAnimationFrame) return;

  function run(el){
    var target = parseInt(el.getAttribute('data-count'), 10);
    if(isNaN(target) || target <= 0) return;
    var dur = 900, start = null;
    el.textContent = '0';
    function step(ts){
      if(start === null) start = ts;
      var p = Math.min(1, (ts - start) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased);
      if(p < 1) window.requestAnimationFrame(step);
      else el.textContent = String(target);
    }
    window.requestAnimationFrame(step);
  }

  if('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(en.isIntersecting){ run(en.target); io.unobserve(en.target); }
      });
    }, { threshold: 0.4 });
    nums.forEach(function(el){ io.observe(el); });
  }else{
    nums.forEach(run);
  }
})();

/* 打赏弹层：开关 / 渠道切换 / 复制链接（带降级，全部容错） */
(function(){
  var modal = document.getElementById('rw-modal');
  if(!modal) return;

  var openers = Array.prototype.slice.call(document.querySelectorAll('[data-rw-open]'));
  var closers = Array.prototype.slice.call(modal.querySelectorAll('[data-rw-close]'));
  var tabs = Array.prototype.slice.call(modal.querySelectorAll('[data-rw-tab]'));
  var panes = Array.prototype.slice.call(modal.querySelectorAll('[data-rw-pane]'));
  var lastFocus = null;

  function openModal(){
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    var first = modal.querySelector('.rw-close');
    if(first) first.focus();
  }
  function closeModal(){
    modal.hidden = true;
    document.body.style.overflow = '';
    if(lastFocus && lastFocus.focus) lastFocus.focus();
  }
  openers.forEach(function(b){ b.addEventListener('click', openModal); });
  closers.forEach(function(b){ b.addEventListener('click', closeModal); });
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && !modal.hidden) closeModal();
  });

  // 支付宝 / 微信切换
  tabs.forEach(function(tab){
    tab.addEventListener('click', function(){
      var key = tab.getAttribute('data-rw-tab');
      tabs.forEach(function(t){ t.classList.toggle('on', t === tab); });
      panes.forEach(function(p){ p.classList.toggle('on', p.getAttribute('data-rw-pane') === key); });
    });
  });

  // 分享本页链接：手机呼出系统分享面板（微信/QQ 等）；桌面端退回复制链接
  var shareBtn = document.querySelector('[data-rw-share]');
  if(shareBtn){
    shareBtn.addEventListener('click', function(){
      var url = window.location.href.split('#')[0];
      function done(){
        shareBtn.classList.add('copied');
        window.setTimeout(function(){ shareBtn.classList.remove('copied'); }, 1600);
      }
      if(navigator.share){
        navigator.share({ title: document.title, url: url }).catch(function(){ /* 用户取消分享时静默 */ });
      }else if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(url).then(done, function(){ legacyCopy(url, done); });
      }else{
        legacyCopy(url, done);
      }
    });
  }
  function legacyCopy(text, done){
    try{
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      done();
    }catch(e){ /* 复制链接失败时静默，不影响页面 */ }
  }
})();

/* 手机扫码打开本页：二维码小方块 → 按钮上方展开本页地址二维码 */
(function(){
  var btn = document.querySelector('[data-rw-qr]');
  var pop = document.getElementById('rw-qr-pop');
  var box = document.getElementById('rw-qr-code');
  if(!btn || !pop || !box) return;

  var made = false;
  function drawQR(){
    try{
      var url = window.location.href.split('#')[0];
      var qr = window.qrcode(0, 'M');       // typeNumber 0 = 自动按内容长度选版本
      qr.addData(url);
      qr.make();
      box.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0 });
    }catch(e){
      box.innerHTML = '<span style="font-size:12px;color:#666">二维码生成失败</span>';
    }
  }
  function buildQR(){
    if(made) return;
    made = true;
    if(window.qrcode){ drawQR(); return; }
    // 二维码库只在用户点击时出现时才加载，不占用首屏带宽
    var s = document.createElement('script');
    s.src = window.__YIXIU_QR || '/js/qrcode.min.js';
    s.onload = drawQR;
    s.onerror = function(){
      box.innerHTML = '<span style="font-size:12px;color:#666">二维码库加载失败</span>';
    };
    document.head.appendChild(s);
  }
  function openPop(){
    buildQR();
    pop.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    btn.classList.add('on');
  }
  function closePop(){
    pop.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    btn.classList.remove('on');
  }

  btn.addEventListener('click', function(e){
    e.stopPropagation();
    if(pop.hidden) openPop(); else closePop();
  });
  // 点击页面其他位置时收起
  document.addEventListener('click', function(e){
    if(pop.hidden) return;
    if(!pop.contains(e.target) && e.target !== btn) closePop();
  });
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && !pop.hidden) closePop();
  });
})();

/* ===== 代码块：顶部语言条 + 复制按钮 ===== */
(function(){
  var figs = document.querySelectorAll('.post-body figure.highlight');
  if(!figs.length) return;

  var ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z"/></svg>';
  var LABEL = {
    js:'JavaScript', javascript:'JavaScript', ts:'TypeScript', bash:'Bash', sh:'Shell', shell:'Shell',
    python:'Python', py:'Python', yaml:'YAML', yml:'YAML', json:'JSON', css:'CSS', scss:'SCSS',
    html:'HTML', xml:'XML', diff:'Diff', plain:'Plain Text', plaintext:'Plain Text',
    text:'Plain Text', ejs:'EJS', md:'Markdown'
  };

  function langOf(fig){
    var list = String(fig.className || '').split(/\s+/);
    for(var i = 0; i < list.length; i++){
      var c = list[i].toLowerCase();
      if(c && c !== 'highlight' && c !== 'hljs') return c;
    }
    return '';
  }

  function copyText(text, done){
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(done, function(){ fallback(text, done); });
    }else{
      fallback(text, done);
    }
  }
  function fallback(text, done){
    try{
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      done();
    }catch(e){ /* 复制失败时静默，不影响页面 */ }
  }

  Array.prototype.forEach.call(figs, function(fig){
    var table = fig.querySelector('table');
    var scroll = document.createElement('div');
    scroll.className = 'hl-scroll';
    if(table){
      fig.insertBefore(scroll, table);
      scroll.appendChild(table);
    }else{
      while(fig.firstChild) scroll.appendChild(fig.firstChild);
      fig.appendChild(scroll);
    }

    var raw = langOf(fig);
    var label = LABEL[raw] || raw.toUpperCase() || 'CODE';
    var bar = document.createElement('div');
    bar.className = 'hl-bar';
    bar.innerHTML = '<span class="hl-dots"><i></i><i></i><i></i></span>' +
      '<span class="hl-lang">' + label + '</span>' +
      '<button type="button" class="hl-copy" aria-label="复制代码">' + ICON + '<span>复制</span></button>';
    fig.insertBefore(bar, scroll);

    var btn = bar.querySelector('.hl-copy');
    var txt = btn.querySelector('span');
    btn.addEventListener('click', function(){
      var codeEl = fig.querySelector('.code pre') || fig.querySelector('pre');
      var text = codeEl ? (codeEl.innerText || codeEl.textContent || '') : '';
      copyText(text.replace(/\n+$/, ''), function(){
        btn.classList.add('copied');
        txt.textContent = '已复制';
        window.setTimeout(function(){
          btn.classList.remove('copied');
          txt.textContent = '复制';
        }, 1600);
      });
    });
  });
})();

/* ===== 文章目录：从正文 h2/h3/h4 自动生成 + 滚动高亮 ===== */
(function(){
  var body = document.querySelector('.post-body');
  if(!body) return;
  var toc   = document.getElementById('toc');
  var tocM  = document.getElementById('toc-m');
  var list  = document.getElementById('toc-list');
  var listM = document.getElementById('toc-m-list');
  var layout = document.querySelector('.post-layout');
  if(!toc || !tocM || !list || !listM) return;

  var hs = Array.prototype.slice.call(body.querySelectorAll('h2, h3, h4'));
  if(hs.length < 2){
    if(toc) toc.remove();
    if(tocM) tocM.remove();
    if(layout) layout.classList.add('no-toc');
    return;
  }

  function esc(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  var items = hs.map(function(h, i){
    if(!h.id) h.id = 'section-' + (i + 1);
    return {
      el: h,
      id: h.id,
      text: (h.textContent || '').trim(),
      level: Number(h.tagName.charAt(1))
    };
  });

  var minLevel = 6;
  items.forEach(function(it){ if(it.level < minLevel) minLevel = it.level; });

  var html = items.map(function(it){
    var lv = it.level - minLevel + 2;
    return '<a class="toc-link lv' + lv + '" href="#' + esc(it.id) +
      '" data-toc-id="' + esc(it.id) + '">' + esc(it.text) + '</a>';
  }).join('');
  list.innerHTML = html;
  listM.innerHTML = html;
  document.getElementById('toc-count').textContent = items.length + ' 节';
  document.getElementById('toc-m-count').textContent = '· ' + items.length + ' 节';
  toc.removeAttribute('hidden');
  tocM.removeAttribute('hidden');

  var links = Array.prototype.slice.call(document.querySelectorAll('.toc-link'));
  var ticking = false;
  function sync(){
    ticking = false;
    var y = window.pageYOffset || document.documentElement.scrollTop || 0;
    var threshold = y + 130;
    var idx = 0;
    for(var i = 0; i < items.length; i++){
      var top = items[i].el.getBoundingClientRect().top + y;
      if(top <= threshold) idx = i; else break;
    }
    if(y + window.innerHeight >= (document.documentElement.scrollHeight - 6)) idx = items.length - 1;
    links.forEach(function(a){
      a.classList.toggle('on', a.getAttribute('data-toc-id') === items[idx].id);
    });
  }
  function onScroll(){
    if(!ticking){ ticking = true; window.requestAnimationFrame(sync); }
  }
  window.addEventListener('scroll', onScroll, {passive:true});
  window.addEventListener('resize', onScroll);
  sync();

  links.forEach(function(a){
    a.addEventListener('click', function(){ if(tocM.open) tocM.open = false; });
  });
  var topBtn = document.getElementById('toc-top');
  if(topBtn) topBtn.addEventListener('click', function(){
    window.scrollTo({top:0, behavior:'smooth'});
  });
})();
