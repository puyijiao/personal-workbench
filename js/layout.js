/* ===== UI 基础设施 + 布局编辑层 ===== */
/* 全局声明（非 IIFE），兼容 file:// 双击打开与 localhost 预览 */
/* 加载顺序：storage.js → layout.js → app.js */

/* ---------- 通用工具 ---------- */
var $ = function (s, p) { return (p || document).querySelector(s); };
var $$ = function (s, p) { return Array.prototype.slice.call((p || document).querySelectorAll(s)); };
var DAILY_CAL_GOAL = 1800;

function toast(msg) {
  var t = $('#toast'); if (!t) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove('show'); }, 2200);
}

function openModal(title, bodyHTML, footHTML, onMount) {
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = bodyHTML;
  $('#modalFoot').innerHTML = footHTML || '';
  $('#modalMask').classList.add('show');
  if (onMount) onMount($('#modalBody'));
}

function closeModal() { $('#modalMask').classList.remove('show'); }

/* 二次确认弹窗（数据缓冲保护，防止误删） */
function confirmDialog(title, msg, onOk, opts) {
  opts = opts || {};
  openModal(title, '<p style="line-height:1.7">' + msg + '</p>',
    '<button class="btn" data-action="modal-cancel">' + (opts.cancelText || '取消') + '</button>' +
    '<button class="btn ' + (opts.danger ? 'danger' : 'primary') + '" id="cf-ok">' + (opts.okText || '确认') + '</button>',
    function () { $('#cf-ok').onclick = function () { closeModal(); if (onOk) onOk(); }; });
}

/* 弹窗关闭绑定（脚本在 body 末尾，DOM 已就绪） */
$('#modalClose').onclick = closeModal;
$('#modalMask').addEventListener('click', function (e) { if (e.target.id === 'modalMask') closeModal(); });

/* ====================================================================
   Layout 自由编辑层
   —— 侧边栏与卡片的 顺序/重命名/显隐/自定义/拖拽/右键菜单
   —— 仅操作独立键 workbench_layout_v1，绝不触碰业务数据 workbench_data_v1
   ==================================================================== */
var BUILTIN_SIDEBAR = [
  { id: 'dashboard', type: 'builtin', icon: '🏠', name: '总览仪表盘' },
  { id: 'work', type: 'builtin', icon: '👗', name: '本职工作' },
  { id: 'diet', type: 'builtin', icon: '🍚', name: '健康饮食' },
  { id: 'body', type: 'builtin', icon: '📋', name: '体重体脂' },
  { id: 'study', type: 'builtin', icon: '📚', name: '课外提升' },
  { id: 'title', type: 'builtin', icon: '🎓', name: '中级职称' },
  { id: 'sport', type: 'builtin', icon: '🏃', name: '运动打卡' },
];

var BUILTIN_CARDS = {
  dashboard: ['dashCard'],
  work: ['workRingCard', 'workStyleCard', 'workBoardCard', 'workNotesCard'],
  diet: ['dietSummaryCard', 'dietMealsCard', 'foodLibCard'],
  body: ['bodyCardsCard', 'bodyWeightChartCard', 'bodyFatChartCard', 'bodyTableCard'],
  study: ['studyOverviewCard', 'studyListCard', 'knowledgeCard'],
  title: ['titleOverviewCard', 'titleCourseChartCard', 'titleAchievementCard', 'courseTableCard'],
  sport: ['sportOverviewCard', 'miniCard', 'bandCard', 'sportCalendarCard'],
};

var DEFAULT_NAMES = {
  dashCard: '今日总览',
  workRingCard: '设计稿进度', workStyleCard: '初样完成记录', workBoardCard: '任务看板', workNotesCard: '设计灵感与笔记',
  dietSummaryCard: '今日营养概览', dietMealsCard: '今日餐次', foodLibCard: '我的食材库',
  bodyCardsCard: '最新体测', bodyWeightChartCard: '体重趋势', bodyFatChartCard: '体脂率趋势', bodyTableCard: '历史记录',
  studyOverviewCard: '备考概览', studyListCard: '学习计划', knowledgeCard: '知识笔记',
  titleOverviewCard: '课时进度', titleCourseChartCard: '课时完成进度', titleAchievementCard: '成果记录', courseTableCard: '课时明细',
  sportOverviewCard: '运动概览', miniCard: '每日小动作打卡', bandCard: '华为手环数据', sportCalendarCard: '本月打卡日历',
};

var Layout = {
  KEY: 'workbench_layout_v1',
  cfg: null,
  _drag: null,
  _navSrc: null,
  _ctxItems: null,
  _ctxBound: false,
  onNavigate: null,  /* 由 app.js 设置：Layout.onNavigate = navigate */

  defaultCfg: function () {
    var sidebar = BUILTIN_SIDEBAR.map(function (b) { return { id: b.id, type: 'builtin', icon: b.icon, name: b.name, hidden: false }; });
    var pages = {};
    Object.keys(BUILTIN_CARDS).forEach(function (pid) {
      var cards = {};
      BUILTIN_CARDS[pid].forEach(function (cid) { cards[cid] = { type: 'builtin', name: null, hidden: false }; });
      pages[pid] = { order: BUILTIN_CARDS[pid].slice(), cards: cards };
    });
    return { sidebar: sidebar, pages: pages };
  },

  load: function () {
    if (this.cfg) return this.cfg;
    try {
      var raw = localStorage.getItem(this.KEY);
      this.cfg = raw ? JSON.parse(raw) : this.defaultCfg();
    } catch (e) { this.cfg = this.defaultCfg(); }
    this.normalize();
    return this.cfg;
  },

  save: function () {
    try { localStorage.setItem(this.KEY, JSON.stringify(this.cfg)); }
    catch (e) { console.error('布局保存失败', e); }
  },

  normalize: function () {
    var c = this.cfg;
    if (!Array.isArray(c.sidebar)) c.sidebar = [];
    BUILTIN_SIDEBAR.forEach(function (b, idx) {
      var ex = null;
      for (var i = 0; i < c.sidebar.length; i++) { if (c.sidebar[i].id === b.id) { ex = c.sidebar[i]; break; } }
      if (!ex) {
        ex = { id: b.id, type: 'builtin', icon: b.icon, name: b.name, hidden: false };
        c.sidebar.splice(idx, 0, ex);
      } else {
        ex.type = 'builtin';
        if (!ex.icon) ex.icon = b.icon;
        if (ex.id === 'work' && ex.icon === '✂️') ex.icon = '👗';
        if (ex.id === 'diet' && ex.icon === '🍱') ex.icon = '🍚';
        if (ex.id === 'body' && ex.icon === '⚖️') ex.icon = '📋';
        if (ex.name == null) ex.name = b.name;
        if (ex.hidden == null) ex.hidden = false;
      }
    });
    if (!c.pages) c.pages = {};
    Object.keys(BUILTIN_CARDS).forEach(function (pid) {
      if (!c.pages[pid]) c.pages[pid] = { order: [], cards: {} };
      var pg = c.pages[pid];
      if (!Array.isArray(pg.order)) pg.order = [];
      if (!pg.cards) pg.cards = {};
      BUILTIN_CARDS[pid].forEach(function (cid) {
        if (!pg.cards[cid]) pg.cards[cid] = { type: 'builtin', name: null, hidden: false };
        if (pg.order.indexOf(cid) === -1) pg.order.push(cid);
      });
    });
    c.sidebar.forEach(function (i) { if (i.type === 'custom' && !c.pages[i.id]) c.pages[i.id] = { order: [], cards: {} }; });
  },

  init: function () {
    this.load();
    var self = this;
    this.cfg.sidebar.forEach(function (i) { if (i.type === 'custom') self.buildCustomPage(i); });
    this.renderNav();
    Object.keys(this.cfg.pages).forEach(function (pid) { self.applyPage(pid); });
    var mask = $('#ctxMask'); if (mask) mask.onclick = function () { self.hideCtx(); };
    /* 上下文菜单：事件委托（单个监听器，永不被 DOM 重排打断） */
    if (!this._ctxBound) {
      this._ctxBound = true;
      var cmenu = $('#ctxMenu');
      if (cmenu) cmenu.addEventListener('click', function (e) {
        var el = e.target.closest('.ctx-item'); if (!el) return;
        e.stopPropagation();
        self.hideCtx();
        var idx = +el.dataset.i;
        if (self._ctxItems && self._ctxItems[idx]) self._ctxItems[idx].fn();
      });
    }
  },

  afterRender: function (pageId) { this.applyPage(pageId); },

  /* ---- 右键上下文菜单 ---- */
  showCtx: function (x, y, items) {
    var m = $('#ctxMenu');
    this._ctxItems = items;
    m.innerHTML = items.map(function (it, i) {
      return '<div class="ctx-item ' + (it.danger ? 'danger' : '') + '" data-i="' + i + '"><span class="ctx-ic">' + (it.ic || '') + '</span>' + it.label + '</div>';
    }).join('');
    m.style.left = Math.min(x, window.innerWidth - 210) + 'px';
    m.style.top = Math.min(y, window.innerHeight - 320) + 'px';
    m.classList.add('show'); $('#ctxMask').classList.add('show');
  },

  hideCtx: function () { $('#ctxMenu').classList.remove('show'); $('#ctxMask').classList.remove('show'); },

  /* ---- 侧边栏：渲染 / 拖拽 / 右键 ---- */
  renderNav: function () {
    var nav = $('#navList'); nav.innerHTML = '';
    var self = this;
    this.cfg.sidebar.forEach(function (item) {
      if (item.hidden) return;
      var a = document.createElement('a');
      a.className = 'nav-item'; a.dataset.target = item.id;
      var badge = item.type === 'builtin' ? '<span class="nav-badge" id="' + item.id + 'Badge"></span>' : '';
      a.innerHTML = '<span class="nav-ic">' + (item.icon || '📋') + '</span><span class="nav-name">' + escape(item.name) + '</span>' + badge + '<span class="nav-handle" title="拖拽排序" draggable="true">⠿</span>';
      a.onclick = function (e) { if (e.target.classList.contains('nav-handle')) return; if (self.onNavigate) self.onNavigate(item.id); };
      a.oncontextmenu = function (e) { e.preventDefault(); self.showNavMenu(e.clientX, e.clientY, item); };
      nav.appendChild(a);
    });
    this.initSidebarDnD(nav);
  },

  initSidebarDnD: function (nav) {
    var self = this;
    nav.querySelectorAll('.nav-item').forEach(function (item) {
      /* 拖拽源 = 手柄（⠿），不是整个导航项 → 解除对右键/单击的拦截 */
      var handle = item.querySelector('.nav-handle');
      if (handle) {
        handle.addEventListener('dragstart', function (e) {
          self._navSrc = item.dataset.target;
          e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', 'nav');
          try { e.dataTransfer.setDragImage(item, 20, 20); } catch (_) {}
          item.classList.add('dragging');
        });
        handle.addEventListener('dragend', function () {
          item.classList.remove('dragging'); self._navSrc = null;
          $$('.nav-item.drag-over').forEach(function (c) { c.classList.remove('drag-over'); });
        });
      }
      /* 放置目标 = 整个导航项 */
      item.addEventListener('dragover', function (e) { if (self._navSrc && self._navSrc !== item.dataset.target) { e.preventDefault(); item.classList.add('drag-over'); } });
      item.addEventListener('dragleave', function () { item.classList.remove('drag-over'); });
      item.addEventListener('drop', function (e) {
        e.preventDefault(); item.classList.remove('drag-over');
        if (self._navSrc && self._navSrc !== item.dataset.target) {
          var r = item.getBoundingClientRect(); var after = (e.clientY - r.top) > r.height / 2;
          self.moveNav(self._navSrc, item.dataset.target, after);
        }
      });
    });
  },

  moveNav: function (srcId, targetId, after) {
    var arr = this.cfg.sidebar; var si = -1;
    for (var i = 0; i < arr.length; i++) { if (arr[i].id === srcId) { si = i; break; } }
    if (si < 0) return;
    var it = arr.splice(si, 1)[0];
    var ti = -1;
    for (var j = 0; j < arr.length; j++) { if (arr[j].id === targetId) { ti = j; break; } }
    if (ti < 0) arr.push(it); else { if (after) ti++; arr.splice(ti, 0, it); }
    this.save(); this.renderNav();
  },

  showNavMenu: function (x, y, item) {
    var self = this;
    var items = [
      { ic: '✏️', label: '重命名分类', fn: function () { self.navRename(item); } },
      { ic: '➕', label: '新增一级分类', fn: function () { self.navAdd(); } },
      { ic: '🔼', label: '上移', fn: function () { self.navMove(item.id, -1); } },
      { ic: '🔽', label: '下移', fn: function () { self.navMove(item.id, 1); } },
      { ic: '🙈', label: item.hidden ? '显示分类' : '隐藏分类', fn: function () { self.navHide(item); } },
      { ic: '🗑️', label: item.type === 'builtin' ? '隐藏并保留数据' : '删除分类', danger: true, fn: function () { self.navDelete(item); } },
    ];
    var hidden = this.cfg.sidebar.filter(function (i) { return i.hidden; });
    if (hidden.length) items.push({ ic: '↩️', label: '恢复已隐藏分类', fn: function () { self.navRestore(); } });
    this.showCtx(x, y, items);
  },

  navMove: function (id, dir) {
    var arr = this.cfg.sidebar; var i = -1;
    for (var k = 0; k < arr.length; k++) { if (arr[k].id === id) { i = k; break; } }
    if (i < 0) return;
    var j = i + dir; if (j < 0 || j >= arr.length) return;
    var it = arr.splice(i, 1)[0]; arr.splice(j, 0, it);
    this.save(); this.renderNav(); toast('已调整顺序');
  },

  navRename: function (item) {
    var self = this;
    openModal('重命名分类',
      '<div class="field"><label>分类名称</label><input id="nv-name" value="' + escape(item.name) + '" /></div>' +
      '<div class="field"><label>图标(emoji)</label><input id="nv-icon" value="' + escape(item.icon || '📋') + '" maxlength="4" /></div>',
      '<button class="btn" data-action="modal-cancel">取消</button><button class="btn primary" id="nv-ok">保存</button>',
      function () {
        $('#nv-ok').onclick = function () {
          var n = $('#nv-name').value.trim(); if (!n) { toast('请输入名称'); return; }
          item.name = n; item.icon = $('#nv-icon').value.trim() || '📋';
          self.save(); self.renderNav();
          if (item.type === 'custom') { var h1 = document.querySelector('#page-' + item.id + ' .page-title'); if (h1) h1.textContent = n; }
          closeModal(); toast('已重命名');
        };
      });
  },

  navAdd: function () {
    var self = this;
    openModal('新增一级分类',
      '<div class="field"><label>分类名称</label><input id="na-name" placeholder="如：读书笔记" /></div>' +
      '<div class="field"><label>图标(emoji)</label><input id="na-icon" value="📋" maxlength="4" /></div>' +
      '<div class="hint">新建分类为空白页，可在其中自由新增自定义卡片</div>',
      '<button class="btn" data-action="modal-cancel">取消</button><button class="btn primary" id="na-ok">创建</button>',
      function () {
        $('#na-ok').onclick = function () {
          var n = $('#na-name').value.trim(); if (!n) { toast('请输入名称'); return; }
          var id = 'm' + uid();
          var item = { id: id, type: 'custom', icon: $('#na-icon').value.trim() || '📋', name: n, hidden: false };
          self.cfg.sidebar.push(item);
          self.cfg.pages[id] = { order: [], cards: {} };
          self.buildCustomPage(item);
          self.save(); self.renderNav(); closeModal();
          toast('已新增分类「' + n + '」');
          if (self.onNavigate) self.onNavigate(id);
        };
      });
  },

  navHide: function (item) {
    item.hidden = !item.hidden; this.save(); this.renderNav();
    toast(item.hidden ? '已隐藏，数据完整保留' : '已恢复显示');
  },

  navDelete: function (item) {
    var self = this;
    if (item.type === 'builtin') {
      confirmDialog('隐藏分类',
        '隐藏「' + item.name + '」后侧边栏不再显示，但其下的课时、饮食、体重等数据完整保留，可随时在右键「恢复已隐藏分类」中重新显示。',
        function () { item.hidden = true; self.save(); self.renderNav(); toast('已隐藏，数据完整保留'); },
        { danger: true, okText: '隐藏' });
    } else {
      confirmDialog('删除分类',
        '删除自定义分类「' + item.name + '」将移除该分类及其下所有自定义卡片，不影响其他业务数据。',
        function () {
          self.cfg.sidebar = self.cfg.sidebar.filter(function (i) { return i.id !== item.id; });
          delete self.cfg.pages[item.id];
          var sec = $('#page-' + item.id); if (sec) sec.remove();
          self.save(); self.renderNav(); toast('已删除分类');
          var first = $('.nav-item'); if (first && self.onNavigate) self.onNavigate(first.dataset.target);
        },
        { danger: true, okText: '删除' });
    }
  },

  navRestore: function () {
    var self = this;
    var hidden = this.cfg.sidebar.filter(function (i) { return i.hidden; });
    if (!hidden.length) { toast('没有已隐藏的分类'); return; }
    openModal('恢复已隐藏分类',
      '<div class="note-grid">' + hidden.map(function (i) {
        return '<div class="note-card"><div class="nc-body" style="font-weight:600">' + (i.icon || '📋') + ' ' + escape(i.name) + '</div><button class="btn sm primary" data-id="' + i.id + '" style="margin-top:8px">显示</button></div>';
      }).join('') + '</div>',
      '', function (box) {
        box.querySelectorAll('[data-id]').forEach(function (b) {
          b.onclick = function () {
            var it = null;
            for (var k = 0; k < self.cfg.sidebar.length; k++) { if (self.cfg.sidebar[k].id === b.dataset.id) { it = self.cfg.sidebar[k]; break; } }
            if (it) { it.hidden = false; self.save(); self.renderNav(); toast('已恢复「' + it.name + '」'); }
            closeModal();
          };
        });
      });
  },

  buildCustomPage: function (item) {
    if ($('#page-' + item.id)) return;
    var sec = document.createElement('section');
    sec.className = 'page'; sec.id = 'page-' + item.id; sec.dataset.page = item.id;
    sec.innerHTML = '<div class="page-head"><div><h1 class="page-title">' + escape(item.name) + '</h1><p class="page-desc">自定义分类 · 自由记录任意内容</p></div></div>' +
      '<div class="page-cards" data-sortable data-page="' + item.id + '">' +
      '<div class="add-card-bar"><button class="add-card-btn" data-action="add-card" data-page="' + item.id + '">＋ 新增空白卡片</button></div>' +
      '</div>';
    $('.main').appendChild(sec);
  },

  /* ---- 卡片：排序 / 显隐 / 重命名 / 外壳 / 拖拽 / 自定义 ---- */
  barEl: function (container) { return container.querySelector('.add-card-bar'); },

  cardNameOf: function (id, meta) {
    if (meta && meta.name != null && meta.name !== '') return meta.name;
    return DEFAULT_NAMES[id] || '自定义卡片';
  },

  applyPage: function (pageId) {
    var container = document.querySelector('.page-cards[data-page="' + pageId + '"]');
    if (!container) return;
    var pg = this.cfg.pages[pageId] || { order: [], cards: {} };
    var self = this;
    (BUILTIN_CARDS[pageId] || []).forEach(function (cid) {
      if (!pg.cards[cid]) pg.cards[cid] = { type: 'builtin', name: null, hidden: false };
      if (pg.order.indexOf(cid) === -1) pg.order.push(cid);
    });
    var bar = this.barEl(container);
    /* 插入自定义卡片 */
    pg.order.forEach(function (cid) {
      var m = pg.cards[cid]; if (!m) return;
      var el = container.querySelector('[data-card="' + cid + '"]');
      if (!el && m.type === 'custom') { el = self.buildCustomCard(cid, m); container.insertBefore(el, bar); }
    });
    /* 按排序重排 */
    pg.order.forEach(function (cid) {
      var el = container.querySelector('[data-card="' + cid + '"]');
      if (el && el !== bar) container.insertBefore(el, bar);
    });
    /* 显隐 + 标题 + 外壳 */
    pg.order.forEach(function (cid) {
      var el = container.querySelector('[data-card="' + cid + '"]');
      if (!el) return;
      var m = pg.cards[cid] || { hidden: false };
      el.style.display = m.hidden ? 'none' : '';
      var h3 = el.querySelector('.card-title'); if (h3) h3.textContent = self.cardNameOf(cid, m);
      self.injectChrome(el, pageId, cid, m);
      self.initCardDnD(el);
      if (m.type === 'custom') {
        var body = el.querySelector('.custom-body');
        if (body && !body._bound) {
          body._bound = true;
          body.addEventListener('blur', function () { var mm = self.cfg.pages[pageId].cards[cid]; if (mm) { mm.content = body.innerHTML; self.save(); } });
        }
      }
    });
  },

  applyNames: function (pageId) {
    var pg = this.cfg.pages[pageId]; if (!pg) return;
    var container = document.querySelector('.page-cards[data-page="' + pageId + '"]'); if (!container) return;
    var self = this;
    pg.order.forEach(function (cid) {
      var el = container.querySelector('[data-card="' + cid + '"]'); if (!el) return;
      var m = pg.cards[cid] || {};
      var h3 = el.querySelector('.card-title');
      if (h3) h3.textContent = self.cardNameOf(cid, m);
    });
  },

  buildCustomCard: function (id, meta) {
    var el = document.createElement('div');
    el.className = 'card custom-card'; el.dataset.card = id; el.dataset.custom = '1';
    el.innerHTML = '<div class="card-head"><h3 class="card-title">' + escape(this.cardNameOf(id, meta)) + '</h3><div class="card-actions"></div></div>' +
      '<div class="card-content"><div class="custom-body" contenteditable="true" data-ph="点击此处输入内容，支持换行…">' + (meta.content || '') + '</div></div>';
    return el;
  },

  injectChrome: function (el, pageId, cardId, meta) {
    var head = el.querySelector('.card-head'); if (!head) return;
    /* 拖拽手柄：不存在才创建 */
    if (!head.querySelector('.drag-handle')) {
      var dh = document.createElement('span'); dh.className = 'drag-handle'; dh.title = '拖拽调换位置'; dh.innerHTML = '⠿';
      head.insertBefore(dh, head.firstChild);
    }
    /* 更多按钮：不存在才创建，但每次都更新 data-action（修复旧版 chrome 无 data-action 的卡片） */
    var more = head.querySelector('.card-more');
    if (!more) {
      more = document.createElement('button'); more.className = 'card-more'; more.title = '更多操作'; more.textContent = '···';
      head.appendChild(more);
    }
    more.setAttribute('data-action', 'card-menu');
    more.setAttribute('data-page', pageId);
    more.setAttribute('data-card', cardId);
    more.onclick = null; /* 清除可能存在的旧 onclick 绑定 */
  },

  initCardDnD: function (el) {
    if (el._dnd) return; el._dnd = true;
    var handle = el.querySelector('.drag-handle'); if (!handle) return;
    var self = this;
    handle.setAttribute('draggable', 'true');
    handle.addEventListener('dragstart', function (e) {
      self._drag = { id: el.dataset.card, pageId: el.closest('.page-cards').dataset.page };
      e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', 'card');
      try { e.dataTransfer.setDragImage(el, 20, 20); } catch (_) {}
      el.classList.add('dragging');
    });
    handle.addEventListener('dragend', function () { el.classList.remove('dragging'); self._drag = null; $$('.card.drag-over').forEach(function (c) { c.classList.remove('drag-over'); }); });
    el.addEventListener('dragover', function (e) { if (self._drag && self._drag.id !== el.dataset.card) { e.preventDefault(); el.classList.add('drag-over'); } });
    el.addEventListener('dragleave', function () { el.classList.remove('drag-over'); });
    el.addEventListener('drop', function (e) {
      e.preventDefault(); el.classList.remove('drag-over');
      if (self._drag && self._drag.id !== el.dataset.card) {
        var r = el.getBoundingClientRect(); var after = (e.clientY - r.top) > r.height / 2;
        self.moveCard(self._drag.id, el.dataset.card, after, self._drag.pageId);
      }
    });
  },

  moveCard: function (srcId, targetId, after, pageId) {
    var order = this.cfg.pages[pageId].order;
    var si = order.indexOf(srcId); if (si < 0) return;
    order.splice(si, 1);
    var ti = order.indexOf(targetId);
    if (ti < 0) order.push(srcId); else { if (after) ti++; order.splice(ti, 0, srcId); }
    this.save(); this.applyPage(pageId);
  },

  showCardMenu: function (btn, pageId, cardId) {
    var self = this;
    var pg = this.cfg.pages[pageId]; if (!pg) return;
    var meta = pg.cards[cardId]; if (!meta) return;
    var items = [
      { ic: '✏️', label: '重命名卡片', fn: function () { self.cardRename(pageId, cardId); } },
      { ic: meta.type === 'custom' ? '🗑️' : '🙈', label: meta.type === 'custom' ? '删除卡片' : '隐藏卡片（数据保留）', danger: meta.type === 'custom', fn: function () { self.cardDelete(pageId, cardId, meta); } },
    ];
    var hidden = pg.order.filter(function (cid) { return pg.cards[cid] && pg.cards[cid].hidden; });
    if (hidden.length) items.push({ ic: '↩️', label: '恢复已隐藏卡片', fn: function () { self.cardRestore(pageId); } });
    var r = btn.getBoundingClientRect();
    this.showCtx(r.right, r.bottom + 4, items);
  },

  cardRename: function (pageId, cardId) {
    var self = this;
    var m = this.cfg.pages[pageId].cards[cardId]; if (!m) return;
    openModal('重命名卡片', '<div class="field"><label>卡片名称</label><input id="cr-name" value="' + escape(this.cardNameOf(cardId, m)) + '" /></div>',
      '<button class="btn" data-action="modal-cancel">取消</button><button class="btn primary" id="cr-ok">保存</button>',
      function () {
        $('#cr-ok').onclick = function () { var v = $('#cr-name').value.trim(); if (!v) { toast('请输入名称'); return; } m.name = v; self.save(); self.applyNames(pageId); closeModal(); toast('已重命名'); };
      });
  },

  cardDelete: function (pageId, cardId, meta) {
    var self = this;
    if (meta.type !== 'custom') {
      confirmDialog('隐藏卡片',
        '隐藏后该卡片不再显示，但其内已录入的课时、饮食、体重等数据完整保留，可随时在「恢复已隐藏卡片」中重新显示。',
        function () { meta.hidden = true; self.save(); self.applyPage(pageId); toast('已隐藏，数据完整保留'); },
        { danger: true, okText: '隐藏' });
    } else {
      confirmDialog('删除自定义卡片',
        '删除后该卡片及其内容将被移除，不影响其他业务数据。',
        function () {
          var pg = self.cfg.pages[pageId];
          pg.order = pg.order.filter(function (c) { return c !== cardId; });
          delete pg.cards[cardId];
          var el = document.querySelector('.page-cards[data-page="' + pageId + '"] [data-card="' + cardId + '"]');
          if (el) el.remove();
          self.save(); toast('已删除卡片');
        },
        { danger: true, okText: '删除' });
    }
  },

  cardRestore: function (pageId) {
    var self = this;
    var pg = this.cfg.pages[pageId];
    var hidden = pg.order.filter(function (cid) { return pg.cards[cid] && pg.cards[cid].hidden; });
    if (!hidden.length) { toast('没有已隐藏的卡片'); return; }
    openModal('恢复已隐藏卡片',
      '<div class="note-grid">' + hidden.map(function (cid) {
        var m = pg.cards[cid];
        return '<div class="note-card"><div class="nc-body" style="font-weight:600">' + escape(self.cardNameOf(cid, m)) + '</div><button class="btn sm primary" data-id="' + cid + '" style="margin-top:8px">显示</button></div>';
      }).join('') + '</div>',
      '', function (box) {
        box.querySelectorAll('[data-id]').forEach(function (b) {
          b.onclick = function () {
            var mm = pg.cards[b.dataset.id];
            if (mm) { mm.hidden = false; self.save(); self.applyPage(pageId); toast('已显示'); }
            closeModal();
          };
        });
      });
  },

  addCustomCard: function (pageId) {
    var id = 'c' + uid();
    var pg = this.cfg.pages[pageId];
    pg.order.push(id); pg.cards[id] = { type: 'custom', name: '自定义卡片', content: '', hidden: false };
    this.save(); this.applyPage(pageId);
    var self = this;
    setTimeout(function () {
      var b = document.querySelector('.page-cards[data-page="' + pageId + '"] [data-card="' + id + '"] .custom-body');
      if (b) b.focus();
    }, 30);
    toast('已新增空白卡片，点击卡片区域即可输入内容');
  }
};
