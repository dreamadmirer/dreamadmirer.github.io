/* ==========================================================================
   课题组介绍网站 — 交互脚本（无依赖）
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- 1. 移动端导航展开 / 收起 ---------- */
  var toggle = document.querySelector('.nav__toggle');
  var menu = document.getElementById('site-menu');

  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var open = menu.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    // 点击菜单内链接后自动收起
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        menu.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });

    // 点击页面其它区域收起
    document.addEventListener('click', function (e) {
      if (!menu.classList.contains('is-open')) return;
      if (e.target.closest('.site-header')) return;
      menu.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    });

    // Esc 收起
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) {
        menu.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }

  /* ---------- 2. 当前页高亮 ---------- */
  var here = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav__link').forEach(function (link) {
    var target = (link.getAttribute('href') || '').split('#')[0];
    if (!target) return;
    if (target === here) {
      link.setAttribute('aria-current', 'page');
    }
  });

  /* ---------- 3. 论文筛选（按标签过滤） ---------- */
  var filters = document.querySelectorAll('[data-filter]');
  var pubs = document.querySelectorAll('[data-tags]');

  if (filters.length && pubs.length) {
    filters.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var want = btn.getAttribute('data-filter');
        filters.forEach(function (b) {
          b.classList.toggle('btn--primary', b === btn);
          b.classList.toggle('btn--ghost', b !== btn);
          b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        });
        pubs.forEach(function (pub) {
          var tags = (pub.getAttribute('data-tags') || '').split(/\s+/);
          var show = want === 'all' || tags.indexOf(want) !== -1;
          pub.hidden = !show;
        });
      });
    });
  }

  /* ---------- 4. 页脚年份 ---------- */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
