/* GU-007 · v3 完整版
   指针 / 时钟 / 进度 / 目录 / 阅读百分比 / 复制 / 入场
*/
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(pointer: fine)').matches;
  var pad = function (n) { return n < 10 ? '0' + n : '' + n; };

  /* ---------------- 自定义指针 ---------------- */
  var cursor = document.getElementById('cursor');
  if (cursor && fine && !reduce) {
    var dot = cursor.querySelector('.cursor-dot');
    var ring = cursor.querySelector('.cursor-ring');
    document.body.classList.add('has-cursor');

    var mx = window.innerWidth / 2, my = window.innerHeight / 2;
    var dx = mx, dy = my, rx = mx, ry = my;
    var running = false;

    var loop = function () {
      dx += (mx - dx) * 0.55;
      dy += (my - dy) * 0.55;
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;

      dot.style.transform = 'translate3d(' + dx.toFixed(2) + 'px,' + dy.toFixed(2) + 'px,0)';
      ring.style.transform = 'translate3d(' + rx.toFixed(2) + 'px,' + ry.toFixed(2) + 'px,0)';

      if (Math.abs(mx - rx) > 0.2 || Math.abs(my - ry) > 0.2) {
        requestAnimationFrame(loop);
      } else {
        running = false;
      }
    };

    document.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      cursor.style.opacity = '1';
      if (!running) { running = true; requestAnimationFrame(loop); }
    }, { passive: true });

    document.addEventListener('mouseleave', function () { cursor.style.opacity = '0'; });

    document.addEventListener('mouseover', function (e) {
      var hit = e.target.closest ? e.target.closest('a, button, input, [data-hover]') : null;
      document.body.classList.toggle('cursor-hover', !!hit);
    });
  }

  /* ---------------- 时钟 ---------------- */
  var clock = document.getElementById('clock');
  var clockDate = document.getElementById('clockDate');
  var dayBar = document.getElementById('dayBar');
  var dayPct = document.getElementById('dayPct');
  var daysSince = document.getElementById('daysSince');
  var LAST_POST = new Date(2026, 10, 3);

  if (clock || clockDate || dayBar) {
    var WEEK = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    var tick = function () {
      var d = new Date();
      if (clock) clock.innerHTML = pad(d.getHours()) + '<small>:</small>' + pad(d.getMinutes());
      if (clockDate) {
        clockDate.textContent =
          d.getFullYear() + '.' + pad(d.getMonth() + 1) + '.' + pad(d.getDate()) + '　' + WEEK[d.getDay()];
      }
      // 今日进度
      var p = (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()) / 864;
      if (dayBar) dayBar.style.width = p.toFixed(1) + '%';
      if (dayPct) dayPct.textContent = pad(Math.round(p));
    };
    tick();
    setInterval(tick, 1000);
  }

  if (daysSince) {
    var now = new Date();
    var days = Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - LAST_POST) / 86400000);
    daysSince.innerHTML = Math.max(0, days) + '<small>天</small>';
  }

  /* ---------------- 进度 + 阅读百分比 ---------------- */
  var progress = document.getElementById('progress');
  var pctEl = document.getElementById('readPct');
  var headings = Array.prototype.slice.call(document.querySelectorAll('.prose h2[id], .prose h3[id]'));
  var ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var y = window.pageYOffset || document.documentElement.scrollTop;
      var total = document.documentElement.scrollHeight - window.innerHeight;

      if (progress) progress.style.transform = 'scaleX(' + (total > 0 ? y / total : 0).toFixed(4) + ')';

      if (pctEl && headings.length) {
        var first = headings[0].getBoundingClientRect().top + y;
        var last = headings[headings.length - 1].getBoundingClientRect().top + y;
        var p = (y + window.innerHeight * 0.5 - first) / Math.max(1, last - first);
        p = Math.max(0, Math.min(1, p));
        pctEl.innerHTML = pad(Math.round(p * 100)) + '<span>%</span>';
      }
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------------- 目录高亮 ---------------- */
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll('[data-toc]'));
  if (headings.length && tocLinks.length && 'IntersectionObserver' in window) {
    var map = {};
    tocLinks.forEach(function (a) { map[a.getAttribute('data-toc')] = a; });
    var visible = {};

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { visible[e.target.id] = e.isIntersecting; });
      var active = null;
      for (var i = 0; i < headings.length; i++) {
        if (visible[headings[i].id]) { active = headings[i].id; break; }
      }
      if (!active) {
        for (var j = headings.length - 1; j >= 0; j--) {
          if (headings[j].getBoundingClientRect().top < 120) { active = headings[j].id; break; }
        }
      }
      tocLinks.forEach(function (a) { a.parentNode.classList.remove('is-active'); });
      if (active && map[active]) map[active].parentNode.classList.add('is-active');
    }, { rootMargin: '-96px 0px -62% 0px', threshold: 0 });

    headings.forEach(function (h) { io.observe(h); });
  }

  /* ---------------- 代码复制 ---------------- */
  Array.prototype.forEach.call(document.querySelectorAll('.code'), function (block) {
    var btn = block.querySelector('.code-copy');
    var code = block.querySelector('code');
    if (!btn || !code) return;
    btn.addEventListener('click', function () {
      var text = code.innerText;
      var done = function () {
        btn.textContent = 'COPIED';
        setTimeout(function () { btn.textContent = 'COPY'; }, 1400);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, done);
      } else {
        var ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (e) { /* noop */ }
        document.body.removeChild(ta);
        done();
      }
    });
  });


  /* ---------------- 今日签（安全圈版） ---------------- */
  var slipBody = document.getElementById('slipBody');
  if (slipBody) {
    var FORTUNE = [
      ['读源码', '靠猜测'],
      ['复现漏洞', '手抖删库'],
      ['打靶场', '碰生产'],
      ['备份快照', '强推分支'],
      ['看规范', '抄载荷'],
      ['抓个包', '忘代理'],
      ['整理字典', '乱点链接'],
      ['记一笔', '只收藏'],
      ['读 PoC', '直接跑'],
      ['查日志', '拍脑袋']
    ];
    var d0 = new Date();
    var seed = d0.getFullYear() * 372 + (d0.getMonth() + 1) * 31 + d0.getDate();
    var f = FORTUNE[seed % FORTUNE.length];
    slipBody.innerHTML = '<b>宜</b>' + f[0] + '\n<b>忌</b>' + f[1];
  }

  /* ---------------- 戳一下 ---------------- */
  var poke = document.getElementById('poke');
  var pokeImg = document.getElementById('pokeImg');
  var pokeBubble = document.getElementById('pokeBubble');
  if (poke && pokeImg && pokeBubble) {
    var MO = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    var SAY = [
      '别戳啦', '在看书', '唔…', '好痒', '又戳？', '让我睡会',
      '在写题', 'flag 呢', '喵', '再戳要收费', '没空', 'this is fine'
    ];
    var mi = 0;
    var bubbleTimer = null;
    poke.addEventListener('click', function () {
      mi = (mi + 1) % MO.length;
      pokeImg.src = 'img/mo-' + MO[mi] + '.webp';
      pokeBubble.textContent = SAY[Math.floor(Math.random() * SAY.length)];
      poke.classList.add('done');
      poke.classList.remove('is-pop');
      void poke.offsetWidth;
      poke.classList.add('is-pop');
      clearTimeout(bubbleTimer);
      bubbleTimer = setTimeout(function () { poke.classList.remove('is-pop'); }, 1800);
    });
  }

  /* ---------------- 迷你终端：一台练习机 ---------------- */
  var term = document.getElementById('term');
  var termLog = document.getElementById('termLog');
  var termIn = document.getElementById('termIn');
  if (term && termLog && termIn) {
    var MAX_LINES = 80;
    var FLAG = 'flag{m4pl3_p4p3r_1nk}';

    // 所有输出都走 textContent，绝不拼 innerHTML —— 输入内容只当文本
    var write = function (cls, text) {
      var el = document.createElement('div');
      if (cls) el.className = cls;
      el.textContent = text;
      termLog.appendChild(el);
      while (termLog.childNodes.length > MAX_LINES) termLog.removeChild(termLog.firstChild);
      termLog.scrollTop = termLog.scrollHeight;
    };

    var FILES = {
      'readme.md': [
        '这是 Maple 的练习机，别当真。',
        'flag 在 flag.txt，权限 000，直接 cat 读不到。',
        '不过 —— 有人把 index.php 的源码留在这一层了。'
      ],
      'index.php': [
        '<?php',
        "  // 一个很朴素的读取器",
        "  if (isset($_GET['file'])) {",
        "      echo file_get_contents($_GET['file']);   // 没过滤 :)",
        '  }',
        '?>'
      ]
    };

    write('dim', 'Last login: now on ttys001');
    write('dim', '# maple@g7 ~ web security notes');
    write('dim', '# 一台练习机。输入 help 看命令，flag 自己找。');

    // 模拟 HTTP：只做字符串匹配，不发任何请求
    function mockRequest(url) {
      var qs = url.indexOf('?') < 0 ? '' : url.slice(url.indexOf('?') + 1);
      var params = Object.create(null);
      qs.split('&').forEach(function (kv) {
        if (!kv) return;
        var i = kv.indexOf('=');
        var k = i < 0 ? kv : kv.slice(0, i);
        var v = i < 0 ? '' : kv.slice(i + 1);
        try { v = decodeURIComponent(v); } catch (e) { /* 非法编码就当原文 */ }
        if (!(k in params)) params[k] = v;
      });

      if (!('file' in params)) {
        return { status: 200, body: ['<h1>index.php</h1>', 'missing param: file'] };
      }
      var name = String(params.file).replace(/^(\.{1,2}\/)+/, '').replace(/^\/+/, '');
      if (name === 'flag.txt') return { status: 200, body: [FLAG], flag: true };
      if (Object.prototype.hasOwnProperty.call(FILES, name)) return { status: 200, body: FILES[name] };
      return { status: 404, body: ['Warning: file_get_contents(' + name + '): failed to open stream'] };
    }

    var CMDS = {
      help: function () {
        write('dim', 'ls   cat <file>   curl <url>   hint   whoami   pwd   date   echo   clear');
      },
      ls: function () {
        write('ok', 'readme.md    index.php    flag.txt  (mode 000)');
      },
      cat: function (arg) {
        if (!arg) { write('warn', 'cat: missing operand'); return; }
        var name = arg.replace(/^(\.{1,2}\/)+/, '').replace(/^\/+/, '');
        if (name === 'flag.txt') { write('warn', 'cat: flag.txt: Permission denied'); return; }
        if (Object.prototype.hasOwnProperty.call(FILES, name)) {
          FILES[name].forEach(function (l) { write('', l); });
          return;
        }
        write('warn', 'cat: ' + arg + ': No such file or directory');
      },
      curl: function (arg) {
        if (!arg) { write('warn', 'curl: 用法  curl "index.php?file=readme.md"'); return; }
        var url = arg.replace(/^['"]+|['"]+$/g, '');
        var res = mockRequest(url);
        write('dim', 'HTTP/1.1 ' + res.status);
        res.body.forEach(function (l) { write(res.status === 200 ? '' : 'warn', l); });
        if (res.flag) {
          write('ok', '✓ 拿到了。file 参数没过滤，权限被绕过 —— 这就是 LFI。');
        }
      },
      hint: function () {
        write('dim', 'readme.md 告诉了你该看哪儿。看完记得看看 index.php。');
      },
      whoami: function () { write('ok', 'maple (g7) — web security learner'); },
      pwd: function () { write('ok', '/home/maple'); },
      date: function () { write('ok', new Date().toString()); },
      echo: function (arg) { write('', arg || ''); },
      sudo: function () {
        write('warn', 'maple is not in the sudoers file. This incident will be reported.');
      },
      rm: function () { write('warn', 'rm: 这是演示机，别删。'); },
      clear: function () { termLog.innerHTML = ''; }
    };

    var run = function (raw) {
      var text = String(raw).slice(0, 120).trim();
      if (!text) return;
      write('cmd', text);

      var sp = text.indexOf(' ');
      var cmd = (sp < 0 ? text : text.slice(0, sp)).toLowerCase();
      var arg = sp < 0 ? '' : text.slice(sp + 1).trim();

      // 只认自有属性：constructor / __proto__ 之类不会被打到
      if (!Object.prototype.hasOwnProperty.call(CMDS, cmd)) {
        write('warn', 'command not found: ' + cmd);
        write('dim', '输入 help 看命令');
        return;
      }
      try {
        CMDS[cmd](arg);
      } catch (err) {
        write('warn', 'error: 这条命令没跑通');
      }
    };

    termIn.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      var v = termIn.value;
      termIn.value = '';
      run(v);
    });

    term.addEventListener('click', function () { termIn.focus(); });
  }

  /* ---------------- 日历 ---------------- */
  var calGrid = document.getElementById('calGrid');
  var calMonth = document.getElementById('calMonth');
  if (calGrid) {
    var n0 = new Date();
    var yy = n0.getFullYear(), mm = n0.getMonth();
    if (calMonth) calMonth.textContent = yy + ' / ' + pad(mm + 1);

    var WD = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    var out = WD.map(function (w) { return '<span class="wd">' + w + '</span>'; }).join('');
    var firstDay = new Date(yy, mm, 1).getDay();
    var lastDate = new Date(yy, mm + 1, 0).getDate();
    var i0, d0;
    for (i0 = 0; i0 < firstDay; i0++) out += '<span class="out">·</span>';
    for (d0 = 1; d0 <= lastDate; d0++) {
      out += '<span' + (d0 === n0.getDate() ? ' class="today"' : '') + '>' + d0 + '</span>';
    }
    calGrid.innerHTML = out;
  }


  /* ---------------- 文章搜索 + 分类筛选 ---------------- */
  var entries = Array.prototype.slice.call(document.querySelectorAll('#entries .entry'));
  var q = document.getElementById('q');
  var qCount = document.getElementById('qCount');
  var noHit = document.getElementById('noHit');
  var chips = Array.prototype.slice.call(document.querySelectorAll('.filter button'));
  var curCat = '*';

  function applyFilter() {
    if (!entries.length) return;
    var term = (q ? q.value : '').trim().toLowerCase();
    var shown = 0;

    entries.forEach(function (en) {
      var cat = en.getAttribute('data-cat') || '';
      var okCat = curCat === '*' || cat === curCat;
      var text = en.textContent.toLowerCase();
      var okTerm = !term || text.indexOf(term) !== -1;
      var ok = okCat && okTerm;
      en.hidden = !ok;
      if (ok) shown += 1;
    });

    if (qCount) qCount.innerHTML = '<b>' + shown + '</b> / ' + entries.length;
    if (noHit) noHit.hidden = shown > 0;
  }

  if (q) {
    q.addEventListener('input', applyFilter);
    document.addEventListener('keydown', function (e) {
      if (e.key === '/' && document.activeElement !== q && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        q.focus();
      }
    });
  }

  chips.forEach(function (b) {
    b.addEventListener('click', function () {
      chips.forEach(function (x) { x.classList.remove('is-on'); });
      b.classList.add('is-on');
      curCat = b.getAttribute('data-cat') || '*';
      applyFilter();
    });
  });

  applyFilter();

  /* ---------------- 入场 ---------------- */
  var rises = Array.prototype.slice.call(document.querySelectorAll('.rise'));
  if (rises.length) {
    if (reduce || !('IntersectionObserver' in window)) {
      rises.forEach(function (el) { el.classList.add('in'); });
    } else {
      var io2 = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          e.target.classList.add('in');
          io2.unobserve(e.target);
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      rises.forEach(function (el) { io2.observe(el); });
      setTimeout(function () {
        rises.forEach(function (el) { el.classList.add('in'); });
      }, 1500);
    }
  }
})();
