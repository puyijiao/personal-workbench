/* ===== 个人工作台 主应用（业务逻辑） ===== */
/* 全局声明（非 IIFE），兼容 file:// 双击打开与 localhost 预览 */
/* 依赖：storage.js（Store/FOOD_DB/工具函数）、layout.js（UI 基础/Layout 编辑层） */
/* 加载顺序：storage.js → layout.js → app.js */

/* ---------- 路由 ---------- */
function navigate(target) {
  $$('.nav-item').forEach(function (n) { n.classList.toggle('active', n.dataset.target === target); });
  $$('.page').forEach(function (p) { p.classList.toggle('active', p.id === 'page-' + target); });
  var map = { dashboard: Dashboard, work: Work, diet: Diet, body: Body, health: Health, study: Study, title: Title, sport: Sport };
  try { if (map[target]) map[target].render(); }
  catch (e) { console.error('渲染「' + target + '」失败:', e); }
  if (typeof Layout !== 'undefined') Layout.afterRender(target);
  window.scrollTo(0, 0);
}

/* ====================================================================
   事件委托：所有 [data-action] 按钮统一由 document 级 click 监听分发
   —— 无论 DOM 如何重排、重渲染，按钮点击永不会失效
   ==================================================================== */
document.addEventListener('click', function (e) {
  var btn = e.target.closest('[data-action]');
  if (!btn) return;
  var action = btn.dataset.action;
  var id = btn.dataset.id;
  try {
    switch (action) {
      /* 导航 */
      case 'nav-jump': navigate(btn.dataset.target); break;
      /* 弹窗 */
      case 'modal-cancel': closeModal(); break;
      /* 导出导入 */
      case 'export-data': exportData(); break;
      case 'import-data': $('#importInput').click(); break;
      case 'import-clipboard': importFromClipboard(); break;
      case 'toggle-fullscreen': toggleFullscreen(); break;
      case 'toggle-sync': Sync.open(); break;
      case 'add-health-long': Health.addLong(); break;
      case 'add-health-short': Health.addShort(); break;
      case 'del-health-long': Health.delLong(id); break;
      case 'del-health-short': Health.delShort(id); break;
      case 'health-close-short': Health.closeShort(id); break;
      case 'health-exclude': Health.toggleExclude(id); break;
      case 'health-long-done': Health.doneShort(id); break;
      case 'add-health-habit': Health.addHabit(); break;
      case 'del-health-habit': Health.delHabit(id); break;
      case 'rec-shuffle': Health.shuffleRec(); break;
      case 'rename-workbench': renameWorkbench(); break;
      /* 本职工作 */
      case 'add-task': Work.editTask(); break;
      case 'add-design': Work.editDesign(); break;
      case 'del-design': Work.delDesign(id); break;
      case 'add-style': Work.editStyle(); break;
      case 'add-note': Work.editNote(); break;
      case 'edit-task': Work.editTask(id); break;
      case 'del-task': Work.delTask(id); break;
      case 'task-next': Work.moveStatus(id, 1); break;
      case 'task-back': Work.moveStatus(id, -1); break;
      case 'del-style': Work.delStyle(id); break;
      case 'del-note': Work.delNote(id); break;
      /* 饮食 */
      case 'add-food': Diet.addFood(btn.dataset.meal); break;
      case 'copy-doubao-prompt':
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(DOUBAO_PROMPT).then(function () { toast('✓ 已复制指令，去豆包粘贴即可'); });
        } else {
          var ta = document.createElement('textarea'); ta.value = DOUBAO_PROMPT; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); toast('✓ 已复制指令');
        }
        break;
      case 'add-food-lib': Diet.editFoodLibItem(); break;
      case 'edit-food-lib': Diet.editFoodLibItem(id); break;
      case 'edit-food': Diet.editFood(id); break;
      case 'del-food': Diet.delFood(id); break;
      case 'del-food-lib': Diet.delFoodLibItem(id); break;
      case 'food-stock-in': Diet.stockIn(id); break;
      case 'food-stock-out': Diet.stockOut(id); break;
      case 'edit-diet-goal': Diet.editGoal(); break;
      case 'diet-hist-prev': Diet.histNav(-1); break;
      case 'diet-hist-next': Diet.histNav(1); break;
      case 'diet-hist-fill': Diet.addFood('', Diet._histSel || today()); break;
      /* 体重体脂 */
      case 'add-body': Body.add(); break;
      case 'del-body': Body.del(id); break;
      /* 学习 */
      case 'add-study': Study.add(); break;
      case 'study-countdown': Study.setExam(); break;
      case 'add-knowledge': Study.addNote(); break;
      case 'toggle-study': Study.toggle(id); break;
      case 'del-study': Study.del(id); break;
      case 'del-knowledge': Study.delNote(id); break;
      /* 职称 */
      case 'add-course': Title.addCourse(); break;
      case 'add-achievement': Title.addAchievement(); break;
      case 'title-year': Title.pickYear(); break;
      case 'del-course': Title.delCourse(id); break;
      case 'del-achievement': Title.delAchievement(id); break;
      /* 运动 */
      case 'sport-check': Sport.check(); break;
      case 'add-mini': Sport.addMini(); break;
      case 'add-band': Sport.addBand(); break;
      case 'mini-check': Sport.toggleMini(id); break;
      case 'mini-del': Sport.delMini(id); break;
      /* 布局 */
      case 'add-card': Layout.addCustomCard(btn.dataset.page); break;
      case 'card-menu': Layout.showCardMenu(btn, btn.dataset.page, btn.dataset.card); break;
    }
  } catch (err) { console.error('按钮处理失败:', action, err); }
});

/* ====================================================================
   Enter 键快捷保存：弹窗内 input 聚焦时按 Enter → 触发保存按钮
   —— textarea 内需 Ctrl+Enter；搜索框/下拉框不触发；危险按钮(删除确认)不触发
   ==================================================================== */
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Enter') return;
  var mask = $('#modalMask');
  if (!mask || !mask.classList.contains('show')) return;
  var el = e.target;
  /* textarea 内仅 Ctrl+Enter 触发保存（普通 Enter 换行） */
  if (el.tagName === 'TEXTAREA') {
    if (!e.ctrlKey) return;
    e.preventDefault();
  } else if (el.tagName === 'INPUT') {
    /* 排除文件/复选框/单选/提交/按钮类型 */
    if (['checkbox', 'radio', 'file', 'submit', 'button'].indexOf(el.type) !== -1) return;
    /* 排除搜索建议框（Enter 不触发保存，由建议下拉处理） */
    if (el.id === 'fd-search') return;
    e.preventDefault();
  } else {
    /* 非 input/textarea（如 select 或按钮聚焦）不处理 */
    return;
  }
  /* 查找弹窗底部的保存按钮：优先 primary/success，不触发 danger（删除确认） */
  var saveBtn = $('#modalFoot .btn.primary') || $('#modalFoot .btn.success');
  if (saveBtn) saveBtn.click();
});

/* ====================================================================
   模块定义
   ==================================================================== */

/* ---------- 仪表盘总览 ---------- */
var Dashboard = {
  render: function () {
    var date = new Date();
    $('#todayLabel').textContent = (date.getMonth() + 1) + '月' + date.getDate() + '日 ' + '日一二三四五六'[date.getDay()];
    var t = today();
    var diet = Store.get('diet', []).filter(function (d) { return d.date === t; });
    var cal = diet.reduce(function (s, d) { return s + (+d.energy || 0); }, 0);
    var tasks = Store.get('tasks', []);
    var todoCnt = tasks.filter(function (x) { return x.status === 'todo'; }).length;
    var doingCnt = tasks.filter(function (x) { return x.status === 'doing'; }).length;
    var body = Store.get('bodyData', []);
    var lastBody = body[body.length - 1];
    var studyPlans = Store.get('studyPlans', []);
    var studyDone = studyPlans.filter(function (x) { return x.done; }).length;
    var studyTotal = studyPlans.length;
    var year = Store.get('titleYear', new Date().getFullYear());
    var courses = Store.get('courses', []).filter(function (c) { return c.year === year; });
    var courseHours = courses.reduce(function (s, c) { return s + (+c.hours || 0); }, 0);
    var sportLogs = Store.get('sportLogs', []);
    var streak = this.streak(sportLogs);
    var examDate = Store.get('studyExamDate', '');
    var examDays = examDate ? daysBetween(today(), examDate) : null;
    var dietGoals = Store.get('dietGoals', { cal: 1150 });

    var tiles = [
      { ic: '🍱', tag: '今日饮食', num: cal, unit: 'kcal', sub: '目标 ' + dietGoals.cal + 'kcal · ' + diet.length + ' 项', c: 'var(--c-diet)', bar: Math.min(cal / dietGoals.cal * 100, 100), target: 'diet' },
      { ic: '⚖️', tag: '最新体重', num: lastBody ? lastBody.weight : '--', unit: 'kg', sub: lastBody ? (lastBody.date === today() ? '今日 · 体脂率 ' + (lastBody.bodyFat || '--') + '%' : '上次 ' + lastBody.date.slice(5) + ' · 体脂率 ' + (lastBody.bodyFat || '--') + '%') : '暂无记录', c: 'var(--c-body)', bar: lastBody ? Math.min(lastBody.bodyFat || 0, 100) : 0, target: 'body' },
      { ic: '👗', tag: '工作任务', num: doingCnt, unit: '进行中', sub: todoCnt + ' 待办', c: 'var(--c-work)', bar: tasks.length ? (tasks.filter(function (x) { return x.status === 'done'; }).length / tasks.length * 100) : 0, target: 'work' },
      { ic: '📚', tag: '学习进度', num: studyDone + '/' + (studyTotal || 0), unit: '', sub: examDays !== null ? '距考试 ' + examDays + '天' : '未设考试日期', c: 'var(--c-study)', bar: studyTotal ? (studyDone / studyTotal * 100) : 0, target: 'study' },
      { ic: '🎓', tag: year + '年课时', num: courseHours, unit: '课时', sub: '目标 120 课时', c: 'var(--c-title)', bar: Math.min(courseHours / 120 * 100, 100), target: 'title' },
      { ic: '🏃', tag: '运动连续', num: streak, unit: '天', sub: '本周 ' + this.weekCount(sportLogs) + ' 次', c: 'var(--c-sport)', bar: Math.min(streak / 7 * 100, 100), target: 'sport' },
    ];
    $('#dashGrid').innerHTML = tiles.map(function (t) {
      return '<div class="dash-tile" data-action="nav-jump" data-target="' + t.target + '" style="border-top:4px solid ' + t.c + '">' +
        '<div class="dt-top"><div class="dt-ic" style="background:' + t.c + '22;color:' + t.c + '">' + t.ic + '</div><span class="dt-tag">' + t.tag + '</span></div>' +
        '<div class="dt-num">' + t.num + '<small> ' + t.unit + '</small></div>' +
        '<div class="dt-sub">' + t.sub + '</div>' +
        '<div class="dt-bar"><i style="width:' + t.bar + '%;background:' + t.c + '"></i></div>' +
        '</div>';
    }).join('');
  },
  streak: function (logs) {
    if (!logs.length) return 0;
    var set = {};
    logs.forEach(function (l) { set[l.date] = true; });
    var s = 0; var d = new Date();
    while (true) {
      var k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      if (set[k]) { s++; d.setDate(d.getDate() - 1); } else break;
    }
    return s;
  },
  weekCount: function (logs) {
    var d = new Date(); var day = (d.getDay() + 6) % 7;
    var monday = new Date(d); monday.setDate(d.getDate() - day);
    var set = {}; logs.forEach(function (l) { set[l.date] = true; });
    var c = 0;
    for (var i = 0; i < 7; i++) {
      var dd = new Date(monday); dd.setDate(monday.getDate() + i);
      var k = dd.getFullYear() + '-' + String(dd.getMonth() + 1).padStart(2, '0') + '-' + String(dd.getDate()).padStart(2, '0');
      if (set[k]) c++;
    }
    return c;
  }
};

/* ---------- 本职工作 ---------- */
var Work = {
  render: function () {
    this.renderRing(); this.renderStyles(); this.renderBoard(); this.renderNotes();
  },
  renderRing: function () {
    var goal = Store.get('workGoal', 26);
    var designs = Store.get('workDesigns', []);
    var ym = today().slice(0, 7);
    var yr = today().slice(0, 4);
    if (!this._designMonth) this._designMonth = ym;
    var selMonth = this._designMonth;
    var monthDone = designs.filter(function (d) { return (d.date || '').slice(0, 7) === ym; }).length;
    var yearDone = designs.filter(function (d) { return (d.date || '').slice(0, 4) === yr; }).length;
    var pct = Math.min(monthDone / goal * 100, 100);
    /* 月份选择器选项 */
    var monthOpts = '';
    for (var m = 12; m >= 1; m--) {
      var mm = m < 10 ? '0' + m : '' + m;
      var key = yr + '-' + mm;
      var cnt = designs.filter(function (d) { return (d.date || '').slice(0, 7) === key; }).length;
      monthOpts += '<option value="' + key + '"' + (key === selMonth ? ' selected' : '') + '>' + yr + '年' + m + '月 (' + cnt + '款)</option>';
    }
    /* 选中月份的款号列表 */
    var selDesigns = designs.filter(function (d) { return (d.date || '').slice(0, 7) === selMonth; }).slice().reverse();
    $('#workRing').innerHTML =
      '<div class="ring-card">' +
      '<div class="ring" style="--pct:' + pct.toFixed(0) + ';width:120px;height:120px"><i style="width:94px;height:94px">' + monthDone + '<br><small style="font-size:11px;color:var(--ink-soft)">/' + goal + '款</small></i></div>' +
      '<div class="rc-label">本月设计稿进度</div>' +
      '<div class="rc-sub">' + (monthDone >= goal ? '已达标，真棒！' : '还差 ' + (goal - monthDone) + ' 款达标') + '</div>' +
      '<div class="month-picker"><select id="designMonthSel" class="month-select">' + monthOpts + '</select><span class="month-count">' + selDesigns.length + '款</span></div>' +
      '<div class="design-recent" style="max-height:220px;overflow-y:auto;width:100%">' +
      (selDesigns.length ? selDesigns.map(function (d) {
        return '<div class="dr-item"><span class="dr-code">' + escape(d.code) + '</span><span class="dr-date">' + (d.date || '-') + '</span>' + (d.note ? '<span class="dr-note">' + escape(d.note) + '</span>' : '') + '<button class="dr-del" data-action="del-design" data-id="' + d.id + '">✕</button></div>';
      }).join('') : '<div class="empty-mini">该月份暂无设计稿</div>') +
      '</div>' +
      '<div class="year-total-mini">今年累计 ' + yearDone + ' 款</div>' +
      '</div>';
    var sel = $('#designMonthSel');
    if (sel) { sel.onchange = function () { Work._designMonth = this.value; Work.renderRing(); }; }
  },
  editDesign: function () {
    var self = this;
    openModal('登记设计稿',
      '<div class="field"><label>款号 <span style="color:var(--ink-soft);font-weight:400">（每行一个，可批量录入）</span></label><textarea id="dg-code" rows="3" placeholder="每行一个款号，如：&#10;AW2026-001&#10;AW2026-002&#10;AW2026-003" style="font-family:inherit"></textarea></div>' +
      '<div class="field-row"><div class="field"><label>出稿日期</label><input type="date" id="dg-date" value="' + today() + '" /></div><div class="field"><label>备注</label><input id="dg-note" placeholder="系列/风格/灵感等" /></div></div>' +
      '<div class="hint">支持一次录入多个款号，每行一个。设计稿与实物初样独立记录，无需关联。Ctrl+Enter 可快速保存</div>',
      '<button class="btn" data-action="modal-cancel">取消</button><button class="btn primary" id="dg-save">保存</button>',
      function () {
        $('#dg-save').onclick = function () {
          var raw = $('#dg-code').value;
          /* 按换行/逗号（中英文）拆分款号 */
          var codes = raw.split(/[\n,，]/).map(function (s) { return s.trim(); }).filter(function (s) { return s; });
          if (!codes.length) { toast('请填写款号'); return; }
          var arr = Store.get('workDesigns', []);
          var date = $('#dg-date').value;
          var note = $('#dg-note').value.trim();
          codes.forEach(function (code) {
            arr.push({ id: uid(), code: code, date: date, note: note });
          });
          Store.set('workDesigns', arr); closeModal(); self.renderRing();
          toast(codes.length > 1 ? '已登记 ' + codes.length + ' 款设计稿' : '已登记设计稿');
        };
      });
  },
  delDesign: function (id) {
    var self = this;
    confirmDialog('删除设计稿记录', '确认删除该设计稿记录？此操作不可撤销。', function () {
      Store.set('workDesigns', Store.get('workDesigns', []).filter(function (d) { return d.id !== id; }));
      self.renderRing(); toast('已删除');
    }, { danger: true, okText: '删除' });
  },
  renderStyles: function () {
    var styles = Store.get('workStyles', []);
    var yr = today().slice(0, 4);
    var ym = today().slice(0, 7);
    if (!this._styleMonth) this._styleMonth = ym;
    var selMonth = this._styleMonth;
    var totalCount = styles.length;
    var yearCount = styles.filter(function (s) { return (s.receivedDate || '').slice(0, 4) === yr; }).length;
    /* 月份选择器选项 */
    var monthOpts = '';
    for (var m = 12; m >= 1; m--) {
      var mm = m < 10 ? '0' + m : '' + m;
      var key = yr + '-' + mm;
      var cnt = styles.filter(function (s) { return (s.receivedDate || '').slice(0, 7) === key; }).length;
      monthOpts += '<option value="' + key + '"' + (key === selMonth ? ' selected' : '') + '>' + yr + '年' + m + '月 (' + cnt + '件)</option>';
    }
    /* 选中月份的款号列表 */
    var selStyles = styles.filter(function (s) { return (s.receivedDate || '').slice(0, 7) === selMonth; }).slice().reverse();
    $('#workStyleList').innerHTML =
      '<div class="month-picker"><select id="styleMonthSel" class="month-select">' + monthOpts + '</select><span class="month-count">' + selStyles.length + '件</span></div>' +
      '<div class="style-list" style="max-height:280px">' +
      (selStyles.length ? selStyles.map(function (s) {
        return '<div class="style-item"><span class="sx-code">' + escape(s.code) + '</span><span class="sx-date">' + (s.receivedDate || '-') + '</span><span class="sx-note">' + escape(s.note || '') + '</span><button class="sx-del" data-action="del-style" data-id="' + s.id + '">✕</button></div>';
      }).join('') : '<div class="empty-mini">该月份暂无初样记录</div>') +
      '</div>' +
      '<div class="year-total-mini">累计 ' + totalCount + ' 件 · 今年 ' + yearCount + ' 件</div>';
    var sel = $('#styleMonthSel');
    if (sel) { sel.onchange = function () { Work._styleMonth = this.value; Work.renderStyles(); }; }
  },
  editStyle: function () {
    var self = this;
    openModal('登记初样完成',
      '<div class="field"><label>款号 <span style="color:var(--ink-soft);font-weight:400">（每行一个，可批量录入）</span></label><textarea id="sy-code" rows="3" placeholder="每行一个款号，如：&#10;AW2026-001&#10;AW2026-002" style="font-family:inherit"></textarea></div>' +
      '<div class="field-row"><div class="field"><label>收到日期</label><input type="date" id="sy-rdate" value="' + today() + '" /></div><div class="field"><label>备注</label><input id="sy-note" placeholder="面料/版型/打版进度等" /></div></div>' +
      '<div class="hint">支持一次录入多个款号，每行一个。Ctrl+Enter 可快速保存</div>',
      '<button class="btn" data-action="modal-cancel">取消</button><button class="btn primary" id="sy-save">保存</button>',
      function () {
        $('#sy-save').onclick = function () {
          var raw = $('#sy-code').value;
          var codes = raw.split(/[\n,，]/).map(function (s) { return s.trim(); }).filter(function (s) { return s; });
          if (!codes.length) { toast('请填写款号'); return; }
          var arr = Store.get('workStyles', []);
          var rdate = $('#sy-rdate').value;
          var note = $('#sy-note').value.trim();
          codes.forEach(function (code) {
            arr.push({ id: uid(), code: code, receivedDate: rdate, note: note });
          });
          Store.set('workStyles', arr); closeModal(); self.renderStyles();
          toast(codes.length > 1 ? '已登记 ' + codes.length + ' 款初样' : '已登记初样');
        };
      });
  },
  delStyle: function (id) {
    var self = this;
    confirmDialog('删除初样记录', '确认删除该初样记录？此操作不可撤销。', function () {
      Store.set('workStyles', Store.get('workStyles', []).filter(function (s) { return s.id !== id; }));
      self.renderStyles(); toast('已删除');
    }, { danger: true, okText: '删除' });
  },
  renderBoard: function () {
    var tasks = Store.get('tasks', []);
    var self = this;
    var cols = [
      { status: 'todo', name: '待办', ic: '📋' },
      { status: 'doing', name: '进行中', ic: '🔄' },
      { status: 'done', name: '已完成', ic: '✅' }
    ];
    $('#workBoard').innerHTML = cols.map(function (col) {
      var list = tasks.filter(function (t) { return t.status === col.status; });
      return '<div class="col ' + (list.length ? '' : 'empty') + '" data-status="' + col.status + '">' +
        '<div class="col-head" style="border-color:var(--cc)"><h3><span class="dot"></span>' + col.ic + ' ' + col.name + '</h3><span class="cnt">' + list.length + '</span></div>' +
        (list.length ? list.map(function (t) { return self.taskCard(t); }).join('') : '<div class="empty-hint">暂无任务</div>') +
        '</div>';
    }).join('');
    var badge = $('#workBadge'); if (badge) badge.textContent = tasks.filter(function (t) { return t.status !== 'done'; }).length || '';
  },
  taskCard: function (t) {
    var pMap = { high: '高', mid: '中', low: '低' };
    var nextBtn = t.status !== 'done' ? '<button class="tc-next" data-action="task-next" data-id="' + t.id + '">→下一步</button>' : '';
    var backBtn = t.status !== 'todo' ? '<button class="tc-back" data-action="task-back" data-id="' + t.id + '">←退回</button>' : '';
    return '<div class="task-card" data-id="' + t.id + '">' +
      '<div class="tc-title">' + escape(t.title) + '</div>' +
      '<div class="tc-meta"><span>' + escape(t.project || '未分类') + '</span><span class="priority-' + t.priority + '">●' + pMap[t.priority] + '</span></div>' +
      (t.deadline ? '<div class="tc-meta"><span>截止 ' + fmtDate(t.deadline) + '</span></div>' : '') +
      '<div class="tc-actions">' + backBtn + nextBtn + '<button class="tc-edit" data-action="edit-task" data-id="' + t.id + '">编辑</button><button class="tc-del" data-action="del-task" data-id="' + t.id + '">删除</button></div>' +
      '</div>';
  },
  moveStatus: function (id, dir) {
    var tasks = Store.get('tasks', []);
    var order = ['todo', 'doing', 'done'];
    var i = tasks.findIndex(function (t) { return t.id === id; }); if (i < 0) return;
    var ci = order.indexOf(tasks[i].status);
    var ni = ci + dir; if (ni < 0 || ni >= order.length) return;
    tasks[i].status = order[ni]; Store.set('tasks', tasks);
    this.renderBoard(); toast('已更新状态');
  },
  editTask: function (id) {
    var self = this;
    var tasks = Store.get('tasks', []);
    var t = id ? tasks.find(function (x) { return x.id === id; }) : { title: '', project: '', priority: 'mid', status: 'todo', deadline: '' };
    openModal(id ? '编辑任务' : '新建任务',
      '<div class="field"><label>任务标题</label><input id="tk-title" value="' + escape(t.title) + '" placeholder="如：秋季新品设计稿" /></div>' +
      '<div class="field-row"><div class="field"><label>所属项目</label><input id="tk-project" value="' + escape(t.project) + '" placeholder="如：春夏季系列" /></div>' +
      '<div class="field"><label>优先级</label><select id="tk-priority">' +
      ['high|高', 'mid|中', 'low|低'].map(function (o) { return '<option value="' + o.split('|')[0] + '" ' + (t.priority === o.split('|')[0] ? 'selected' : '') + '>' + o.split('|')[1] + '</option>'; }).join('') +
      '</select></div></div>' +
      '<div class="field-row"><div class="field"><label>状态</label><select id="tk-status">' +
      ['todo|待办', 'doing|进行中', 'done|已完成'].map(function (o) { return '<option value="' + o.split('|')[0] + '" ' + (t.status === o.split('|')[0] ? 'selected' : '') + '>' + o.split('|')[1] + '</option>'; }).join('') +
      '</select></div><div class="field"><label>截止日期</label><input type="date" id="tk-deadline" value="' + (t.deadline || '') + '" /></div></div>',
      '<button class="btn" data-action="modal-cancel">取消</button><button class="btn primary" id="tk-save">保存</button>',
      function () {
        $('#tk-save').onclick = function () {
          var obj = { title: $('#tk-title').value.trim(), project: $('#tk-project').value.trim(), priority: $('#tk-priority').value, status: $('#tk-status').value, deadline: $('#tk-deadline').value };
          if (!obj.title) { toast('请填写标题'); return; }
          if (id) { Object.assign(t, obj); } else { tasks.unshift({ id: uid(), created: today(), title: obj.title, project: obj.project, priority: obj.priority, status: obj.status, deadline: obj.deadline }); }
          Store.set('tasks', tasks); closeModal(); self.renderBoard(); toast('已保存');
        };
      });
  },
  delTask: function (id) {
    var self = this;
    confirmDialog('删除任务', '确认删除该任务？此操作不可撤销。', function () {
      Store.set('tasks', Store.get('tasks', []).filter(function (t) { return t.id !== id; }));
      self.renderBoard(); toast('已删除');
    }, { danger: true, okText: '删除' });
  },
  renderNotes: function () {
    var notes = Store.get('workNotes', []);
    $('#workNotes').innerHTML = notes.length ? notes.map(function (n) {
      return '<div class="note-card"><button class="nc-del" data-action="del-note" data-id="' + n.id + '">✕</button><div class="nc-body">' + escape(n.content) + '</div><div class="nc-date">' + fmtDate(n.created) + '</div></div>';
    }).join('') : '<div class="empty-mini">还没有灵感笔记</div>';
  },
  editNote: function () {
    var self = this;
    openModal('记录设计灵感', '<div class="field"><label>笔记内容</label><textarea id="nn-content" placeholder="灵感、面料、配色、版型想法…" style="min-height:120px"></textarea></div>',
      '<button class="btn" data-action="modal-cancel">取消</button><button class="btn primary" id="nn-save">保存</button>',
      function () {
        $('#nn-save').onclick = function () {
          var v = $('#nn-content').value.trim();
          if (!v) { toast('内容不能为空'); return; }
          var n = Store.get('workNotes', []);
          n.unshift({ id: uid(), content: v, created: today() });
          Store.set('workNotes', n); closeModal(); self.renderNotes(); toast('已记录');
        };
      });
  },
  delNote: function (id) {
    var self = this;
    confirmDialog('删除笔记', '确认删除该笔记？', function () {
      Store.set('workNotes', Store.get('workNotes', []).filter(function (n) { return n.id !== id; }));
      self.renderNotes(); toast('已删除');
    }, { danger: true, okText: '删除' });
  }
};

/* ---------- 健康饮食 ---------- */
var MEALS = [['breakfast', '早餐', '🌅'], ['lunch', '午餐', '☀️'], ['dinner', '晚餐', '🌙'], ['snack', '加餐', '🍪']];

/* ---------- 豆包粘贴：标准化指令 + 智能解析 ---------- */
var DOUBAO_PROMPT = '你是营养计算助手。我告诉你我吃了什么，你帮我估算营养成分。\n\n请严格按以下格式输出（每行一个字段，不要用 Markdown 表格，纯文本即可）：\n\n食物：[名称]\n克数：[克数,单位g]\n热量：[数值,kcal]\n蛋白质：[数值,g]\n脂肪：[数值,g]\n碳水：[数值,g]\n钠：[数值,mg]\n膳食纤维：[数值,g]\n\n如果我一次吃多份食物，按总克数和总营养输出。\n如果某项未知，填 0。';

/**
 * 智能解析豆包/AI 返回的营养文本
 * 支持多种常见格式：键值对、单行逗号、Markdown 表格、自然语言
 * @param {string} text 输入文本
 * @returns {Array<{name,amount,energy,protein,fat,carb,fiber,sodium}>}
 */
function parseNutritionText(text) {
  if (!text || !text.trim()) return [];
  var items = [];
  // 0) 整体是 Markdown 表格：先拆成行，逐行处理（跳过表头/分隔行）
  if (/\|/.test(text) && /克数|热量|蛋白质/.test(text)) {
    var tableRows = text.split(/\r?\n/).filter(function (l) {
      return /\|/.test(l) && !/^\s*\|?\s*[-:]+\s*\|/.test(l) && !/食物.*克数.*热量/.test(l);
    });
    tableRows.forEach(function (row) {
      var cells = row.split('|').map(function (c) { return c.trim(); }).filter(function (c) { return c !== ''; });
      if (!cells[0]) return;
      var item = { name: cells[0], amount: 0, energy: 0, protein: 0, fat: 0, carb: 0, fiber: 0, sodium: 0 };
      if (cells[1]) item.amount = +cells[1].replace(/[^\d.]/g, '') || 0;
      if (cells[2]) item.energy = +cells[2].replace(/[^\d.]/g, '') || 0;
      if (cells[3]) item.protein = +cells[3].replace(/[^\d.]/g, '') || 0;
      if (cells[4]) item.fat = +cells[4].replace(/[^\d.]/g, '') || 0;
      if (cells[5]) item.carb = +cells[5].replace(/[^\d.]/g, '') || 0;
      if (cells[6]) item.sodium = +cells[6].replace(/[^\d.]/g, '') || 0;
      if (cells[7]) item.fiber = +cells[7].replace(/[^\d.]/g, '') || 0;
      if (item.name && (item.amount > 0 || item.energy > 0)) items.push(item);
    });
    return items;
  }
  // 1) 拆成多份：按空行 / "---" / 连续多个键值对分组
  var chunks = text.split(/\n\s*\n|(?=^\s*食物[:：])|(?=^\s*名称[:：])|(?=^\s*食品[:：])/m);
  chunks.forEach(function (chunk) {
    if (!chunk.trim()) return;
    var item = { name: '', amount: 0, energy: 0, protein: 0, fat: 0, carb: 0, fiber: 0, sodium: 0 };
    var lines = chunk.split(/\r?\n/);
    // 单行所有内容（逗号/空格分隔）
    var oneLine = lines.length === 1 ? lines[0] : '';
    // Markdown 表格行识别：| 食物 | 克数 | ...
    var isTable = /\|/.test(chunk) && /克数|热量|蛋白质/.test(chunk);
    if (isTable) {
      // 跳过表头和分隔行，取数据行
      var dataRow = lines.filter(function (l) { return /\|/.test(l) && !/^\s*\|?\s*[-:]+\s*\|/.test(l) && !/食物.*克数.*热量/.test(l); })[0];
      if (dataRow) {
        var cells = dataRow.split('|').map(function (c) { return c.trim(); }).filter(Boolean);
        if (cells[0]) item.name = cells[0];
        if (cells[1]) item.amount = +cells[1].replace(/[^\d.]/g, '') || 0;
        if (cells[2]) item.energy = +cells[2].replace(/[^\d.]/g, '') || 0;
        if (cells[3]) item.protein = +cells[3].replace(/[^\d.]/g, '') || 0;
        if (cells[4]) item.fat = +cells[4].replace(/[^\d.]/g, '') || 0;
        if (cells[5]) item.carb = +cells[5].replace(/[^\d.]/g, '') || 0;
        if (cells[6]) item.sodium = +cells[6].replace(/[^\d.]/g, '') || 0;
        if (cells[7]) item.fiber = +cells[7].replace(/[^\d.]/g, '') || 0;
      }
    } else {
      // 逐行扫描键值对
      lines.forEach(function (line) {
        var m;
        // 食物/名称/食品：xxx
        m = line.match(/^\s*(?:食物|名称|食品)\s*[:：=]\s*(.+?)\s*$/);
        if (m) item.name = m[1].replace(/^[\s*#-]+|[\s*]+$/g, '');
        // 克数/重量/份量：100g
        m = line.match(/^\s*(?:克数|重量|份量|食用量)\s*[:：=]\s*([\d.]+)/);
        if (m) item.amount = +m[1];
        // 热量/能量：144 kcal
        m = line.match(/^\s*(?:热量|能量|卡路里)\s*[:：=]\s*([\d.]+)/);
        if (m) item.energy = +m[1];
        // 蛋白质：13 g
        m = line.match(/^\s*(?:蛋白质|蛋白)\s*[:：=]\s*([\d.]+)/);
        if (m) item.protein = +m[1];
        // 脂肪：9 g
        m = line.match(/^\s*(?:脂肪|油脂)\s*[:：=]\s*([\d.]+)/);
        if (m) item.fat = +m[1];
        // 碳水：1 g
        m = line.match(/^\s*(?:碳水|碳水化合物|糖类)\s*[:：=]\s*([\d.]+)/);
        if (m) item.carb = +m[1];
        // 钠：130 mg
        m = line.match(/^\s*(?:钠)\s*[:：=]\s*([\d.]+)/);
        if (m) item.sodium = +m[1];
        // 膳食纤维：0 g
        m = line.match(/^\s*(?:膳食纤维|纤维)\s*[:：=]\s*([\d.]+)/);
        if (m) item.fiber = +m[1];
      });
      // 如果没识别到 name，尝试从单行里猜
      if (!item.name && oneLine) {
        var firstToken = oneLine.split(/[,，\s]/)[0];
        if (firstToken && /[\u4e00-\u9fa5a-zA-Z]/.test(firstToken)) item.name = firstToken;
      }
      // 如果还是没识别到 克数/热量，尝试单行内 "xxx 100g 144kcal ..." 这种格式
      if (item.amount === 0 && oneLine) {
        var m2 = oneLine.match(/([\d.]+)\s*(?:g|克|克重)/i);
        if (m2) item.amount = +m2[1];
        var m3 = oneLine.match(/([\d.]+)\s*(?:kcal|千卡|大卡|卡)/i);
        if (m3) item.energy = +m3[1];
      }
    }
    // 必须至少识别出 name 和 amount/energy 之一才算成功
    if (item.name && (item.amount > 0 || item.energy > 0)) items.push(item);
  });
  return items;
}

/**
 * 在食材库和内置库中查找食物名
 * 优先匹配食材库（用户自定义），再匹配内置库
 * @param {string} name 食物名称
 * @returns {object|null} 匹配到的食物对象，含 custom 标记
 */
function matchFoodInDb(name) {
  if (!name) return null;
  var q = name.toLowerCase().trim();
  // 优先：食材库
  var lib = Store.get('foodLib', []);
  for (var i = 0; i < lib.length; i++) {
    if (lib[i].name.toLowerCase().indexOf(q) !== -1 || q.indexOf(lib[i].name.toLowerCase()) !== -1) {
      return { ...lib[i], custom: true };
    }
  }
  // 其次：内置库
  for (var j = 0; j < FOOD_DB.length; j++) {
    if (FOOD_DB[j].name.toLowerCase().indexOf(q) !== -1 || q.indexOf(FOOD_DB[j].name.toLowerCase()) !== -1) {
      return { ...FOOD_DB[j], custom: false };
    }
  }
  return null;
}

/* 统一库存扣减：归一化匹配（完全同名 > 包含匹配选最短），返回扣减结果 */
function deductStock(name, amount) {
  var lib = Store.get('foodLib', []);
  var norm = function (s) { return String(s || '').replace(/[\s\u3000（）()·,，。、.．]/g, '').toLowerCase(); };
  var nName = norm(name);
  if (!nName || !(amount > 0)) return { ok: false, matched: null, reason: '无食材名或克重' };
  /* 1. 完全同名 */
  var hit = lib.find(function (f) { return norm(f.name) === nName && (f.stock || 0) > 0; });
  /* 2. 包含匹配：选出候选，取名字最短的（"鸡"→"鸡胸肉"而非"鸡蛋"） */
  if (!hit) {
    var cands = lib.filter(function (f) {
      if (!(f.stock || 0) > 0) return false;
      var nf = norm(f.name);
      return nf.indexOf(nName) !== -1 || nName.indexOf(nf) !== -1;
    });
    if (cands.length) {
      cands.sort(function (a, b) { return norm(a.name).length - norm(b.name).length; });
      hit = cands[0];
    }
  }
  if (!hit) return { ok: false, matched: null, reason: '未匹配到有库存的食材' };
  var was = hit.stock || 0;
  hit.stock = Math.max(0, was - amount);
  Store.set('foodLib', lib);
  /* 库存用完 → 替代组状态标 used */
  if (hit.stock <= 0 && was > 0) {
    var ac = Store.get('altChoices', []);
    var changed = false;
    ac.forEach(function (c) {
      if (c.chosen && c.chosen !== '__any__' && c.chosen.indexOf(hit.name) !== -1) { c.state = 'used'; changed = true; }
    });
    if (changed) Store.set('altChoices', ac);
  }
  return { ok: true, matched: hit.name, left: hit.stock, empty: hit.stock <= 0 };
}

var Diet = {
  render: function () { this.renderSummary(); this.renderMeals(); this.renderFoodLib(); this.renderHistory(); this.mountQuickPaste(); if (typeof Health !== 'undefined') Health.renderAdvice(); },
  /* 历史回顾：日历 + 周汇总 + 选中日期明细 */
  _histYear: null, _histMonth: null, _histSel: null,
  renderHistory: function () {
    var self = this;
    var box = $('#dietHistory');
    if (!box) return;
    var now = new Date();
    if (this._histYear === null) { this._histYear = now.getFullYear(); this._histMonth = now.getMonth() + 1; this._histSel = today(); }
    var y = this._histYear, m = this._histMonth, sel = this._histSel;
    var all = Store.get('diet', []);
    var g = Store.get('dietGoals', { cal: 1150, protein: 60, fat: 35, carb: 145, fiber: 25 });

    /* ---- 本周汇总 ---- */
    var weekStats = this._weekStats(all, g);

    /* ---- 日历 ---- */
    var firstDay = new Date(y, m - 1, 1).getDay();
    var daysInMonth = new Date(y, m, 0).getDate();
    var dayCal = {};
    all.forEach(function (d) { dayCal[d.date] = (dayCal[d.date] || 0) + (+d.energy || 0); });
    var cells = '';
    for (var i = 0; i < firstDay; i++) cells += '<div class="dh-cell empty"></div>';
    for (var d = 1; d <= daysInMonth; d++) {
      var dateStr = y + '-' + pad2(m) + '-' + pad2(d);
      var cal = dayCal[dateStr];
      var cls = 'dh-cell';
      if (cal !== undefined) {
        cls += cal > g.cal ? ' over' : ' ok';
      }
      if (dateStr === sel) cls += ' sel';
      if (dateStr === today()) cls += ' tday';
      cells += '<div class="' + cls + '" data-date="' + dateStr + '">' + d +
        (cal !== undefined ? '<small>' + Math.round(cal) + '</small>' : '') + '</div>';
    }

    /* ---- 选中日期明细 ---- */
    var selList = all.filter(function (x) { return x.date === sel; });
    var selCal = selList.reduce(function (s, x) { return s + (+x.energy || 0); }, 0);
    var detailHtml = '';
    if (selList.length) {
      /* 当日营养分析（纯数字对比，不判断达标与否） */
      var nut = { energy: 0, protein: 0, fat: 0, carb: 0, fiber: 0 };
      selList.forEach(function (x) {
        nut.energy += +x.energy || 0; nut.protein += +x.protein || 0; nut.fat += +x.fat || 0;
        nut.carb += +x.carb || 0; nut.fiber += +x.fiber || 0;
      });
      var g2 = g;
      var nutRows = [
        { label: '热量', val: nut.energy, goal: g2.cal, unit: 'kcal' },
        { label: '蛋白质', val: nut.protein, goal: g2.protein, unit: 'g' },
        { label: '脂肪', val: nut.fat, goal: g2.fat, unit: 'g' },
        { label: '碳水', val: nut.carb, goal: g2.carb, unit: 'g' },
        { label: '膳食纤维', val: nut.fiber, goal: g2.fiber, unit: 'g' }
      ];
      detailHtml = '<div class="dh-detail"><div class="dh-detail-head">' + sel + ' · 共 ' + Math.round(selCal) + ' kcal</div>';
      detailHtml += '<div class="dh-nut">';
      nutRows.forEach(function (r) {
        /* 颜色仅辅助：低=蓝 正常=绿 超=红（热量/脂肪超目标红，其余超目标也红） */
        var ratio = r.goal ? r.val / r.goal : 0;
        var cls = ratio >= 0.85 && ratio <= 1.05 ? 'ok' : (ratio < 0.85 ? 'low' : 'over');
        detailHtml += '<div class="dh-nut-row ' + cls + '">' +
          '<span class="dn-label">' + r.label + '</span>' +
          '<span class="dn-nums"><b>' + Math.round(r.val) + '</b> / ' + r.goal + ' ' + r.unit + '</span>' +
          '<span class="dn-bar"><i style="width:' + Math.min(ratio * 100, 100) + '%"></i></span>' +
        '</div>';
      });
      detailHtml += '</div>';
      var meals = { breakfast: [], lunch: [], dinner: [], snack: [] };
      selList.forEach(function (x) { (meals[x.meal] || (meals[x.meal] = [])).push(x); });
      Object.keys(meals).forEach(function (mk) {
        if (!meals[mk].length) return;
        var mName = { breakfast: '🌅 早餐', lunch: '☀️ 午餐', dinner: '🌙 晚餐', snack: '🍪 加餐' }[mk] || mk;
        detailHtml += '<div class="dh-meal"><div class="dh-meal-name">' + mName + '</div>';
        meals[mk].forEach(function (x) {
          detailHtml += '<div class="dh-item"><div class="dh-item-info"><span>' + escape(x.name) + ' ' + x.amount + 'g</span><b>' + Math.round(x.energy) + ' kcal</b></div>' +
            '<div class="dh-item-ops">' +
              '<button class="dh-op" data-action="edit-food" data-id="' + x.id + '" title="编辑">✎</button>' +
              '<button class="dh-op del" data-action="del-food" data-id="' + x.id + '" title="删除">🗑</button>' +
            '</div></div>';
        });
        detailHtml += '</div>';
      });
      detailHtml += '<button class="btn sm" data-action="diet-hist-fill" style="margin-top:10px;width:100%">＋ 补填 ' + sel + ' 的饮食</button></div>';
    } else {
      detailHtml = '<div class="dh-detail empty">📭 ' + sel + ' 没有饮食记录<br><button class="btn sm primary" data-action="diet-hist-fill" style="margin-top:10px">＋ 补填这天的饮食</button></div>';
    }

    var html =
      '<div class="dh-week">' +
        '<div class="dh-week-item"><div class="dwi-num">' + weekStats.days + '</div><div class="dwi-label">记录天数</div></div>' +
        '<div class="dh-week-item"><div class="dwi-num">' + Math.round(weekStats.avg) + '</div><div class="dwi-label">日均 kcal</div></div>' +
        '<div class="dh-week-item"><div class="dwi-num">' + weekStats.overDays + '</div><div class="dwi-label">超标天数</div></div>' +
        '<div class="dh-week-item"><div class="dwi-num">' + weekStats.goodDays + '</div><div class="dwi-label">达标天数</div></div>' +
      '</div>' +
      '<div class="dh-cal-head">' +
        '<button class="dh-nav" data-action="diet-hist-prev" title="上个月">‹</button>' +
        '<span class="dh-cal-title">' + y + '年' + m + '月</span>' +
        '<button class="dh-nav" data-action="diet-hist-next" title="下个月">›</button>' +
      '</div>' +
      '<div class="dh-weekdays"><span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span></div>' +
      '<div class="dh-cal">' + cells + '</div>' +
      '<div class="dh-legend"><span class="dot ok"></span>达标 <span class="dot over"></span>超标 <span class="dot none"></span>未记录</div>' +
      detailHtml;
    box.innerHTML = html;

    /* 绑定日历点击 */
    box.querySelectorAll('.dh-cell[data-date]').forEach(function (c) {
      c.onclick = function () { self._histSel = c.dataset.date; self.renderHistory(); };
    });
  },
  _weekStats: function (all, g) {
    var res = { days: 0, avg: 0, overDays: 0, goodDays: 0 };
    var dayMap = {};
    all.forEach(function (x) {
      var d = x.date;
      if (!d || d < weekAgoStr()) return;
      dayMap[d] = (dayMap[d] || 0) + (+x.energy || 0);
    });
    var dates = Object.keys(dayMap);
    res.days = dates.length;
    var sum = 0;
    dates.forEach(function (d) {
      sum += dayMap[d];
      if (dayMap[d] > g.cal) res.overDays++; else res.goodDays++;
    });
    res.avg = dates.length ? sum / dates.length : 0;
    return res;
  },
  histNav: function (dir) {
    var m = this._histMonth + dir;
    var y = this._histYear;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    this._histYear = y; this._histMonth = m;
    this.renderHistory();
  },
  editGoal: function () {
    var self = this;
    var g = Store.get('dietGoals', { cal: 1150, protein: 60, fat: 35, carb: 145, fiber: 25 });
    openModal('修改每日营养目标',
      '<div class="hint" style="margin-bottom:12px">根据自身体重和活动量设定每日营养目标，保存后立即生效</div>' +
      '<div class="field-row-3"><div class="field"><label>每日卡路里 (kcal)</label><input type="number" id="ng-cal" value="' + g.cal + '" min="800" step="10" /></div><div class="field"><label>蛋白质 (g)</label><input type="number" id="ng-protein" value="' + g.protein + '" min="0" step="1" /></div><div class="field"><label>脂肪 (g)</label><input type="number" id="ng-fat" value="' + g.fat + '" min="0" step="1" /></div></div>' +
      '<div class="field-row-3"><div class="field"><label>碳水 (g)</label><input type="number" id="ng-carb" value="' + g.carb + '" min="0" step="1" /></div><div class="field"><label>膳食纤维 (g)</label><input type="number" id="ng-fiber" value="' + g.fiber + '" min="0" step="1" /></div><div class="field"></div></div>' +
      '<div class="hint" style="margin-top:8px">参考：轻体力劳动者约 25-30 kcal/kg/天，蛋白质 1.0-1.2g/kg，脂肪供能比 20-30%</div>',
      '<button class="btn" data-action="modal-cancel">取消</button><button class="btn primary" id="ng-save">保存</button>',
      function () {
        $('#ng-save').onclick = function () {
          var cal = +$('#ng-cal').value || 0;
          if (cal < 800) { toast('卡路里目标不应低于800'); return; }
          Store.set('dietGoals', {
            cal: cal,
            protein: +$('#ng-protein').value || 0,
            fat: +$('#ng-fat').value || 0,
            carb: +$('#ng-carb').value || 0,
            fiber: +$('#ng-fiber').value || 0
          });
          closeModal(); self.renderSummary(); self.renderMeals(); toast('已更新每日目标');
        };
      });
  },
  renderSummary: function () {
    var t = today();
    var list = Store.get('diet', []).filter(function (d) { return d.date === t; });
    var cal = list.reduce(function (s, d) { return s + (+d.energy || 0); }, 0);
    var protein = list.reduce(function (s, d) { return s + (+d.protein || 0); }, 0);
    var fat = list.reduce(function (s, d) { return s + (+d.fat || 0); }, 0);
    var carb = list.reduce(function (s, d) { return s + (+d.carb || 0); }, 0);
    var fiber = list.reduce(function (s, d) { return s + (+d.fiber || 0); }, 0);
    var g = Store.get('dietGoals', { cal: 1150, protein: 60, fat: 35, carb: 145, fiber: 25 });
    var pct = g.cal > 0 ? Math.min(cal / g.cal * 100, 100) : 0;
    var over = cal > g.cal;
    var left = Math.round((g.cal - cal) * 100) / 100;
    if (left < 0) left = 0;
    var calShow = Math.round(cal * 100) / 100;
    var overAmt = Math.round((cal - g.cal) * 100) / 100;
    var proteinShow = Math.round(protein * 100) / 100;
    var fatShow = Math.round(fat * 100) / 100;
    var carbShow = Math.round(carb * 100) / 100;
    var fiberShow = Math.round(fiber * 100) / 100;
    $('#dietSummary').innerHTML =
      '<div class="cal-ring-wrap">' +
        '<div class="cal-ring' + (over ? ' over' : '') + '" style="--pct:' + pct + '">' +
          '<div class="cal-ring-center"><div class="crc-num">' + pct.toFixed(0) + '%</div><div class="crc-unit">' + calShow + '/' + g.cal + 'kcal</div></div>' +
        '</div>' +
        '<div class="cal-ring-info">' +
          '<div class="cri-row"><span>已摄入</span><b style="color:var(--c-diet)">' + calShow + ' kcal</b></div>' +
          '<div class="cri-row"><span>' + (over ? '超出' : '剩余') + '</span><b style="color:' + (over ? '#ef4444' : 'var(--ink)') + '">' + (over ? overAmt : left) + ' kcal</b></div>' +
          '<div class="cri-hint">' + (over ? '已超过今日目标，注意控制哦' : '保持良好，继续加油') + '</div>' +
          '<button class="goal-edit-btn" data-action="edit-diet-goal" style="margin-top:10px">⚙ 修改每日目标</button>' +
        '</div>' +
      '</div>' +
      '<div class="sum-card"><div class="sc-num">' + proteinShow + '<small>/' + g.protein + 'g</small></div><div class="sc-label">蛋白质</div></div>' +
      '<div class="sum-card"><div class="sc-num">' + fatShow + '<small>/' + g.fat + 'g</small></div><div class="sc-label">脂肪</div></div>' +
      '<div class="sum-card"><div class="sc-num">' + carbShow + '<small>/' + g.carb + 'g</small></div><div class="sc-label">碳水</div></div>' +
      '<div class="sum-card"><div class="sc-num">' + fiberShow + '<small>/' + g.fiber + 'g</small></div><div class="sc-label">膳食纤维</div></div>';
  },
  renderMeals: function () {
    var t = today();
    var all = Store.get('diet', []).filter(function (d) { return d.date === t; });
    $('#mealGrid').innerHTML = MEALS.map(function (meal) {
      var key = meal[0], name = meal[1], ic = meal[2];
      var list = all.filter(function (d) { return d.meal === key; });
      var mCal = list.reduce(function (s, d) { return s + (+d.energy || 0); }, 0);
      return '<div class="meal-col"><div class="mc-head"><div class="mc-name">' + ic + ' ' + name + '</div><div class="mc-cal">' + mCal + ' kcal</div></div>' +
        (list.length ? list.map(function (d) {
          return '<div class="food-row" data-id="' + d.id + '"><div class="fr-info"><div class="fr-name">' + escape(d.name) + ' <small style="color:var(--ink-soft)">' + d.amount + 'g</small></div>' +
            '<div class="fr-nutri">蛋' + d.protein + 'g 脂' + d.fat + 'g 碳' + d.carb + 'g 纤' + (d.fiber || 0) + 'g 钠' + d.sodium + 'mg</div></div>' +
            '<div class="fr-cal">' + d.energy + 'kcal</div><button class="fr-edit" data-action="edit-food" data-id="' + d.id + '" title="修改克重">✎</button><button class="fr-del" data-action="del-food" data-id="' + d.id + '">✕</button></div>';
        }).join('') : '<div class="empty-mini">点击"添加食物"记录</div>') +
        '<button class="btn sm" style="width:100%;margin-top:6px" data-action="add-food" data-meal="' + key + '">+ 添加' + name + '</button></div>';
    }).join('');
  },
  delFood: function (id) {
    var self = this;
    var diet = Store.get('diet', []);
    var rec = diet.find(function (x) { return x.id === id; });
    confirmDialog('删除饮食记录', '确认删除该条饮食记录？', function () {
      Store.set('diet', Store.get('diet', []).filter(function (x) { return x.id !== id; }));
      /* 删除后恢复库存（之前扣过的加回来） */
      if (rec) {
        var libX = Store.get('foodLib', []);
        var stockX = libX.find(function (f) { return f.name === rec.name && (f.stock || 0) >= 0; });
        if (stockX) {
          stockX.stock = (stockX.stock || 0) + (rec.amount || 0);
          Store.set('foodLib', libX);
        }
      }
      self.renderSummary(); self.renderMeals(); self.renderHistory(); self.renderFoodLib(); toast('已删除，库存已恢复');
    }, { danger: true, okText: '删除' });
  },
  editFood: function (id) {
    var self = this;
    var diet = Store.get('diet', []);
    var rec = diet.find(function (d) { return d.id === id; });
    if (!rec) return;
    /* 尝试从食物库查找原始食物项，用于精确重算 */
    var foodItem = allFoods().find(function (f) { return f.name === rec.name; });
    /* 重算函数：有原始食物项用 nutriForAmount，否则按比例反推 */
    function recalc(amt) {
      if (amt <= 0) return { energy: 0, protein: 0, fat: 0, carb: 0, fiber: 0, sodium: 0 };
      if (foodItem) return nutriForAmount(foodItem, amt);
      var ratio = amt / rec.amount;
      return {
        energy: +(rec.energy * ratio).toFixed(0),
        protein: +(rec.protein * ratio).toFixed(1),
        fat: +(rec.fat * ratio).toFixed(1),
        carb: +(rec.carb * ratio).toFixed(1),
        fiber: +((rec.fiber || 0) * ratio).toFixed(1),
        sodium: +(rec.sodium * ratio).toFixed(0)
      };
    }
    openModal('修改食物记录',
      '<div class="field"><label>食物名称</label><input value="' + escape(rec.name) + '" disabled style="opacity:0.7" /></div>' +
      '<div class="field-row"><div class="field"><label>餐次</label><select id="ef-meal">' +
      MEALS.map(function (m) { return '<option value="' + m[0] + '"' + (m[0] === rec.meal ? ' selected' : '') + '>' + m[1] + '</option>'; }).join('') +
      '</select></div><div class="field"><label>食用量 (克)</label><input type="number" id="ef-amount" value="' + rec.amount + '" min="1" step="0.1" /></div></div>' +
      '<div class="nutri-quick" id="ef-preview"><div class="nq-item"><div class="nq-label">能量</div><div class="nq-val" id="ef-cal">' + rec.energy + '</div></div><div class="nq-item"><div class="nq-label">蛋白质</div><div class="nq-val" id="ef-pro">' + rec.protein + 'g</div></div><div class="nq-item"><div class="nq-label">脂肪</div><div class="nq-val" id="ef-fat">' + rec.fat + 'g</div></div><div class="nq-item"><div class="nq-label">碳水</div><div class="nq-val" id="ef-car">' + rec.carb + 'g</div></div><div class="nq-item"><div class="nq-label">膳食纤维</div><div class="nq-val" id="ef-fib">' + (rec.fiber || 0) + 'g</div></div><div class="nq-item"><div class="nq-label">钠</div><div class="nq-val" id="ef-sod">' + rec.sodium + 'mg</div></div></div>' +
      '<div class="hint">修改克重后营养数据自动按比例重新换算，点击保存即可</div>',
      '<button class="btn" data-action="modal-cancel">取消</button><button class="btn primary" id="ef-save">保存修改</button>',
      function () {
        /* 实时预览 */
        $('#ef-amount').oninput = function () {
          var amt = +$('#ef-amount').value || 0;
          var r = recalc(amt);
          $('#ef-cal').textContent = r.energy;
          $('#ef-pro').textContent = r.protein + 'g';
          $('#ef-fat').textContent = r.fat + 'g';
          $('#ef-car').textContent = r.carb + 'g';
          $('#ef-fib').textContent = (r.fiber || 0) + 'g';
          $('#ef-sod').textContent = r.sodium + 'mg';
        };
        /* 保存 */
        $('#ef-save').onclick = function () {
          var amt = +$('#ef-amount').value || 0;
          if (amt <= 0) { toast('请输入有效的克重'); return; }
          var r = recalc(amt);
          /* 库存调整：改克重 = 先恢复旧的，再扣新的 */
          var libX = Store.get('foodLib', []);
          var stockX = libX.find(function (f) { return f.name === rec.name && (f.stock || 0) > 0; });
          if (stockX) {
            stockX.stock = Math.max(0, (stockX.stock || 0) + (rec.amount || 0) - amt);
            Store.set('foodLib', libX);
          }
          rec.amount = amt;
          rec.meal = $('#ef-meal').value;
          rec.energy = r.energy;
          rec.protein = r.protein;
          rec.fat = r.fat;
          rec.carb = r.carb;
          rec.fiber = r.fiber;
          rec.sodium = r.sodium;
          Store.set('diet', diet);
          closeModal(); self.renderSummary(); self.renderMeals(); self.renderHistory(); self.renderFoodLib(); toast('已修改克重为 ' + amt + 'g');
        };
      });
  },
  addFood: function (defaultMeal, defaultDate) {
    var self = this;
    openModal('添加食物',
      '<div class="seg" id="foodMode"><button class="active" data-mode="lib">🔍 食物库选择</button><button data-mode="photo">📷 拍照识别营养表</button></div>' +
      '<div class="field-row"><div class="field"><label>餐次</label><select id="fd-meal">' +
      MEALS.map(function (m) { return '<option value="' + m[0] + '" ' + (m[0] === defaultMeal ? 'selected' : '') + '>' + m[1] + '</option>'; }).join('') +
      '</select></div><div class="field"><label>日期</label><input type="date" id="fd-date" value="' + (defaultDate || today()) + '" /></div></div>' +
      '<div id="mode-lib"><div class="field"><label>搜索食物</label><div class="food-search-box"><input id="fd-search" placeholder="输入食物名，如：鸡蛋、米饭" autocomplete="off" /><div class="food-suggest" id="fd-suggest"></div></div></div>' +
      '<div class="field"><label>食用量 (克)</label><input type="number" id="fd-amount" value="100" min="1" /><div class="hint">输入实际食用克数，系统按比例换算营养素</div></div></div>' +
      '<div id="mode-photo" style="display:none"><div class="field"><label>上传营养成分表照片</label><input type="file" id="fd-img" accept="image/*" /><button class="btn sm" id="fd-ocr-btn" style="margin-top:8px;width:100%">🤖 智能识别营养数据</button><div class="img-preview" id="fd-preview"><img id="fd-imgel" /></div>' +
      '<div class="ocr-status" id="fd-ocr-status"></div>' +
      '<div class="hint">拍摄包装背面营养成分表，点击"智能识别"自动填入数据</div></div>' +
      '<div class="field"><label>食物名称</label><input id="fd-pname" placeholder="如：某品牌全麦面包" /></div>' +
      '<div class="seg" id="fd-basis" style="margin-bottom:10px"><button class="active" data-basis="100">每100g</button><button data-basis="1">每份</button></div>' +
      '<div class="field-row-3"><div class="field"><label>能量(kcal)</label><input type="number" id="fd-penergy" step="0.1" /></div><div class="field"><label>或 能量(kJ)</label><input type="number" id="fd-pkj" step="0.1" placeholder="填kJ自动换算" /></div><div class="field"><label>蛋白质(g)</label><input type="number" id="fd-pprotein" step="0.1" /></div></div>' +
      '<div class="field-row-3"><div class="field"><label>脂肪(g)</label><input type="number" id="fd-pfat" step="0.1" /></div><div class="field"><label>碳水(g)</label><input type="number" id="fd-pcarb" step="0.1" /></div><div class="field"><label>钠(mg)</label><input type="number" id="fd-psodium" step="0.1" /></div></div>' +
      '<div class="field"><label>膳食纤维(g)</label><input type="number" id="fd-pfiber" step="0.1" placeholder="营养成分表无此项可留空" /></div>' +
      '<div class="field"><label>食用量 <span id="fd-amt-label">(克)</span></label><input type="number" id="fd-pamount" value="100" min="1" /></div>' +
      '<div class="field"><label style="display:flex;align-items:center;gap:6px;font-weight:600;color:var(--ink-soft)"><input type="checkbox" id="fd-savelib" style="width:auto" checked /> 保存到我的食材库，下次可直接选用</label></div></div>' +
      '<div class="nutri-quick" id="fd-preview2" style="display:none"><div class="nq-item"><div class="nq-label">预计能量</div><div class="nq-val" id="nq-cal">0</div></div><div class="nq-item"><div class="nq-label">蛋白质</div><div class="nq-val" id="nq-pro">0g</div></div><div class="nq-item"><div class="nq-label">脂肪</div><div class="nq-val" id="nq-fat">0g</div></div><div class="nq-item"><div class="nq-label">碳水</div><div class="nq-val" id="nq-car">0g</div></div><div class="nq-item"><div class="nq-label">膳食纤维</div><div class="nq-val" id="nq-fib">0g</div></div></div>',
      '<button class="btn" data-action="modal-cancel">取消</button><button class="btn primary" id="fd-save">添加</button>',
      function (box) { self.mountAdd(box); });
  },
  mountAdd: function (box) {
    var self = this;
    var mode = 'lib', selected = null, basis = 100;
    var segLib = $('#foodMode', box);
    segLib.querySelectorAll('button').forEach(function (b) {
      b.onclick = function () {
        segLib.querySelectorAll('button').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active'); mode = b.dataset.mode;
        $('#mode-lib', box).style.display = mode === 'lib' ? 'block' : 'none';
        $('#mode-photo', box).style.display = mode === 'photo' ? 'block' : 'none';
        $('#fd-preview2', box).style.display = 'grid';
        self.calcPreview(box);
      };
    });
    var search = $('#fd-search', box), sug = $('#fd-suggest', box);
    search.oninput = function () {
      var q = search.value.trim();
      if (!q) { sug.classList.remove('show'); return; }
      var res = allFoods().filter(function (f) { return f.name.toLowerCase().indexOf(q.toLowerCase()) !== -1; }).slice(0, 8);
      sug.innerHTML = res.length ? res.map(function (f) { return '<div class="fs-item" data-name="' + escape(f.name) + '"><span class="fs-name">' + f.name + '</span><span class="fs-cal">' + f.energy + 'kcal/100g</span></div>'; }).join('') : '<div class="fs-item">无匹配食物</div>';
      sug.classList.add('show');
      sug.querySelectorAll('.fs-item[data-name]').forEach(function (it) {
        it.onclick = function () {
          selected = FOOD_DB.find(function (f) { return f.name === it.dataset.name; }) || Store.get('foodLib', []).find(function (f) { return f.name === it.dataset.name; });
          self._sel = selected;
          search.value = selected.name;
          sug.classList.remove('show');
          self.calcPreview(box);
        };
      });
    };
    search.onblur = function () { setTimeout(function () { sug.classList.remove('show'); }, 200); };
    $('#fd-amount', box).oninput = function () { self.calcPreview(box); };
    $('#fd-img', box).onchange = function (e) {
      var file = e.target.files[0]; if (!file) return;
      var r = new FileReader();
      r.onload = function () { $('#fd-imgel', box).src = r.result; $('#fd-preview', box).classList.add('show'); };
      r.readAsDataURL(file);
    };
    /* OCR 智能识别营养数据（第一次慢，可同时手动填写下方数据） */
    $('#fd-ocr-btn', box).onclick = function () {
      var imgEl = $('#fd-imgel', box);
      if (!imgEl.src) { toast('请先上传照片'); return; }
      var status = $('#fd-ocr-status', box);
      status.innerHTML = '<span class="ocr-loading">⏳ 正在加载识别引擎…（首次加载需下载15MB中文包，请耐心等待）</span>';
      /* 15秒后提示可手动填写 */
      var fallbackTimer = setTimeout(function () {
        if (status.querySelector('.ocr-loading')) {
          status.innerHTML = '<div class="ocr-loading">⏳ 识别引擎加载中…</div><div style="margin-top:6px;padding:8px;background:rgba(59,130,246,.08);border-radius:8px;font-size:13px;color:var(--ink)">💡 <b>无需等待</b>，可直接填写下方数据提交，使用 <b>豆包粘贴</b> 更快捷 ⚡</div>';
        }
      }, 15000);
      OCR.recognize(imgEl.src, function (st, prog) {
        var labels = { 'loading language traineddata': '加载中文语言包…', 'recognizing text': '正在识别文字…' };
        status.innerHTML = '<span class="ocr-loading">⏳ ' + (labels[st] || st) + ' ' + Math.round((prog || 0) * 100) + '%</span>';
      }, function (err, text) {
        if (err) { status.innerHTML = '<span class="ocr-error">⚠ 识别超时，按标签上数字直接手动填写即可</span>'; return; }
        clearTimeout(fallbackTimer);
        var p = OCR.parseNutritionLabel(text);
        var filled = [];
        if (p.energyKj != null && p.energy == null) { $('#fd-pkj', box).value = p.energyKj; filled.push('能量(kJ)'); }
        else if (p.energy != null) { $('#fd-penergy', box).value = p.energy; filled.push('能量'); }
        if (p.protein != null) { $('#fd-pprotein', box).value = p.protein; filled.push('蛋白质'); }
        if (p.fat != null) { $('#fd-pfat', box).value = p.fat; filled.push('脂肪'); }
        if (p.carb != null) { $('#fd-pcarb', box).value = p.carb; filled.push('碳水'); }
        if (p.sodium != null) { $('#fd-psodium', box).value = p.sodium; filled.push('钠'); }
        if (p.fiber != null) { $('#fd-pfiber', box).value = p.fiber; filled.push('膳食纤维'); }
        if (filled.length) { status.innerHTML = '<span class="ocr-success">✅ 已识别：' + filled.join('、') + '</span>'; self.calcPreview(box); toast('识别成功，请核对'); }
        else { status.innerHTML = '<span class="ocr-error">⚠ 未识别到数据，请手动填写或重拍</span><details style="margin-top:6px"><summary>查看识别原文</summary><pre style="white-space:pre-wrap;font-size:11px;max-height:120px;overflow:auto">' + escape(text) + '</pre></details>'; }
      });
    };
    var basisSeg = $('#fd-basis', box);
    basisSeg.querySelectorAll('button').forEach(function (b) {
      b.onclick = function () {
        basisSeg.querySelectorAll('button').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active'); basis = +b.dataset.basis;
        $('#fd-amt-label', box).textContent = basis === 100 ? '(克)' : '(份)';
        self.calcPreview(box);
      };
    });
    ['fd-penergy', 'fd-pkj', 'fd-pprotein', 'fd-pfat', 'fd-pcarb', 'fd-pfiber', 'fd-psodium', 'fd-pamount'].forEach(function (id) {
      $('#' + id, box).oninput = function () { self.calcPreview(box); };
    });
    $('#fd-save').onclick = function () { self.saveFood(box, mode, selected, basis); };
  },
  calcPreview: function (box) {
    var cal = $('#nq-cal', box), pro = $('#nq-pro', box), fat = $('#nq-fat', box), car = $('#nq-car', box), fib = $('#nq-fib', box);
    if (!cal) return;
    var r;
    var mode = $('#mode-lib', box).style.display !== 'none' ? 'lib' : 'photo';
    if (mode === 'lib' && this._sel) {
      var amt = +$('#fd-amount', box).value || 0;
      r = nutriForAmount(this._sel, amt);
    } else if (mode === 'photo') {
      var basisEl = $('#fd-basis .active', box);
      var basis = basisEl ? +basisEl.dataset.basis : 100;
      var energy = +$('#fd-penergy', box).value || 0;
      var pj = +$('#fd-pkj', box).value;
      if (!energy && pj) energy = kjToKcal(pj);
      var amt2 = +$('#fd-pamount', box).value || 0;
      var factor = basis === 100 ? amt2 / 100 : amt2;
      r = { energy: +(energy * factor).toFixed(0), protein: +((+$('#fd-pprotein', box).value || 0) * factor).toFixed(1), fat: +((+$('#fd-pfat', box).value || 0) * factor).toFixed(1), carb: +((+$('#fd-pcarb', box).value || 0) * factor).toFixed(1), fiber: +((+$('#fd-pfiber', box).value || 0) * factor).toFixed(1), sodium: +((+$('#fd-psodium', box).value || 0) * factor).toFixed(0) };
    } else { r = { energy: 0, protein: 0, fat: 0, carb: 0, fiber: 0, sodium: 0 }; }
    cal.textContent = r.energy; pro.textContent = r.protein + 'g'; fat.textContent = r.fat + 'g'; car.textContent = r.carb + 'g'; if (fib) fib.textContent = (r.fiber || 0) + 'g';
  },
  saveFood: function (box, mode, sel, basis) {
    var meal = $('#fd-meal', box).value;
    var date = $('#fd-date', box).value;
    if (mode === 'lib') {
      if (!sel) { toast('请先选择一个食物'); return; }
      var amt = +$('#fd-amount', box).value || 0;
      if (amt <= 0) { toast('请输入食用量'); return; }
      var r = nutriForAmount(sel, amt);
      Store.set('diet', Store.get('diet', []).concat([{ id: uid(), date: date, meal: meal, name: sel.name, amount: amt, energy: r.energy, protein: r.protein, fat: r.fat, carb: r.carb, fiber: r.fiber, sodium: r.sodium }]));
      /* 统一扣库存（提示合并到最后的 toast） */
      var stRes = deductStock(sel.name, amt);
    } else {
      var name = $('#fd-pname', box).value.trim();
      if (!name) { toast('请填写食物名称'); return; }
      var energy = +$('#fd-penergy', box).value || 0;
      var pj = +$('#fd-pkj', box).value;
      if (!energy && pj) energy = kjToKcal(pj);
      var amt3 = +$('#fd-pamount', box).value || 0;
      if (amt3 <= 0) { toast('请输入食用量'); return; }
      var factor = basis === 100 ? amt3 / 100 : amt3;
      var fiber = +$('#fd-pfiber', box).value || 0;
      var r2 = { energy: +(energy * factor).toFixed(0), protein: +((+$('#fd-pprotein', box).value || 0) * factor).toFixed(1), fat: +((+$('#fd-pfat', box).value || 0) * factor).toFixed(1), carb: +((+$('#fd-pcarb', box).value || 0) * factor).toFixed(1), fiber: +(fiber * factor).toFixed(1), sodium: +((+$('#fd-psodium', box).value || 0) * factor).toFixed(0) };
      var imgSrc = $('#fd-preview', box).classList.contains('show') ? $('#fd-imgel', box).src : null;
      Store.set('diet', Store.get('diet', []).concat([{ id: uid(), date: date, meal: meal, name: name, amount: amt3, energy: r2.energy, protein: r2.protein, fat: r2.fat, carb: r2.carb, fiber: r2.fiber, sodium: r2.sodium, image: imgSrc }]));
      /* 统一扣库存（提示合并到最后的 toast） */
      var stRes2 = deductStock(name, amt3);
      if (basis === 100 && $('#fd-savelib', box) && $('#fd-savelib', box).checked) {
        var lib = Store.get('foodLib', []);
        if (!lib.some(function (f) { return f.name === name; })) {
          lib.push({ id: uid(), name: name, base: 100, energy: energy, energyKj: pj || Math.round(energy * 4.184), protein: +$('#fd-pprotein', box).value || 0, fat: +$('#fd-pfat', box).value || 0, carb: +$('#fd-pcarb', box).value || 0, fiber: fiber, sodium: +$('#fd-psodium', box).value || 0 });
          Store.set('foodLib', lib);
        } else { toast('食材库已有同名食材，未重复保存'); }
      }
    }
    closeModal(); this.renderSummary(); this.renderMeals(); this.renderFoodLib(); this.renderHistory();
    /* 合并提示：扣库存信息 + 已记录（避免被"已记录饮食"覆盖） */
    var finalMsg = '已记录饮食';
    if (mode === 'lib' && stRes && stRes.ok) finalMsg = '✓ 已记录 · 扣库存「' + stRes.matched + '」' + amt + 'g，剩' + stRes.left + 'g';
    if (mode === 'lib' && stRes && !stRes.ok) finalMsg = '✓ 已记录 · ⚠️「' + sel.name + '」食材库无库存或未登记';
    if (mode !== 'lib' && typeof stRes2 !== 'undefined') {
      if (stRes2.ok) finalMsg = '✓ 已记录 · 扣库存「' + stRes2.matched + '」' + amt3 + 'g，剩' + stRes2.left + 'g';
      else finalMsg = '✓ 已记录 · ⚠️「' + name + '」未匹配到库存';
    }
    toast(finalMsg);
  },
  renderFoodLib: function () {
    var lib = Store.get('foodLib', []);
    if (!lib.length) {
      $('#foodLibList').innerHTML = '<div class="empty-mini">还没有自定义食材，拍照录入时勾选"保存到食材库"即可加入</div>';
      return;
    }
    var cats = Store.get('foodLibCategories', []);
    var card = function (f) {
      var kj = f.energyKj != null ? f.energyKj : Math.round(f.energy * 4.184);
      var stock = f.stock || 0;
      var low = f.stockLow || 0;
      var stockHtml = '<div class="fl-stock">' +
        '<span class="fl-stock-num ' + (stock > 0 && low > 0 && stock <= low ? 'low' : (stock <= 0 ? 'empty' : '')) + '">📦 ' + (stock > 0 ? stock + 'g' : '无库存') + '</span>' +
        '<span class="fl-stock-ops">' +
        '<button class="fl-stock-btn" data-action="food-stock-in" data-id="' + f.id + '" title="买入/补货">＋买</button>' +
        '<button class="fl-stock-btn" data-action="food-stock-out" data-id="' + f.id + '" title="手动扣减">－用</button>' +
        '</span></div>';
      return '<div class="note-card"><button class="nc-edit" data-action="edit-food-lib" data-id="' + f.id + '" title="修改">✎</button><button class="nc-del" data-action="del-food-lib" data-id="' + f.id + '" title="删除">✕</button><div class="nc-body" style="font-weight:600">' + escape(f.name) + '</div>' +
        '<div class="nc-date" style="font-size:11px">每100g：' + kj + 'kJ / ' + f.energy + 'kcal · 蛋' + (f.protein || 0) + 'g 脂' + (f.fat || 0) + 'g 碳' + (f.carb || 0) + 'g 纤' + (f.fiber || 0) + 'g 钠' + (f.sodium || 0) + 'mg</div>' +
        stockHtml + '</div>';
    };
    /* 按分类分组：先显示有食材的分类，最后是"未分类" */
    /* 排序：每个分类内部，有库存的在前、无库存的在后；都有/都无库存时按名字 */
    var sortByStock = function (a, b) {
      var sa = (a.stock || 0) > 0 ? 1 : 0;
      var sb = (b.stock || 0) > 0 ? 1 : 0;
      if (sa !== sb) return sb - sa;
      return (a.name || '').localeCompare(b.name || '', 'zh');
    };
    var groups = [];
    cats.forEach(function (cat) {
      var items = lib.filter(function (f) { return (f.category || '未分类') === cat; }).sort(sortByStock);
      if (items.length) groups.push({ name: cat, items: items });
    });
    var uncat = lib.filter(function (f) { return !f.category || cats.indexOf(f.category) === -1; }).sort(sortByStock);
    if (uncat.length) groups.push({ name: '📦 未分类', items: uncat });
    $('#foodLibList').innerHTML = groups.map(function (g) {
      return '<div class="fl-group"><div class="fl-group-head">' + escape(g.name) + ' <span class="fl-count">' + g.items.length + '</span></div>' +
        '<div class="fl-group-items">' + g.items.map(card).join('') + '</div></div>';
    }).join('');
  },
  categoryOptions: function (cur) {
    var cats = Store.get('foodLibCategories', []);
    var opts = cats.map(function (c) { return '<option value="' + escape(c) + '" ' + (c === cur ? 'selected' : '') + '>' + escape(c) + '</option>'; });
    if (cur && cats.indexOf(cur) === -1) opts.unshift('<option value="' + escape(cur) + '" selected>' + escape(cur) + '</option>');
    opts.push('<option value="📦 未分类" ' + (!cur || cur === '未分类' ? 'selected' : '') + '>📦 未分类</option>');
    return opts.join('');
  },
  editFoodLibItem: function (editId) {
    var self = this;
    var editing = editId ? Store.get('foodLib', []).find(function (f) { return f.id === editId; }) : null;
    var title = editing ? '修改食材' : '新增食材到食材库';
    var btnText = editing ? '保存修改' : '保存';
    /* 预填数据（编辑模式） */
    var pre = editing || {};
    var preKj = editing ? (pre.energyKj != null ? pre.energyKj : Math.round(pre.energy * 4.184)) : '';
    openModal(title,
      '<div class="ocr-section">' +
        '<label style="font-weight:600;display:block;margin-bottom:8px">📷 拍照识别营养成分表</label>' +
        '<input type="file" id="fl-ocr-img" accept="image/*" hidden />' +
        '<button class="btn" id="fl-ocr-btn" style="width:100%">📷 拍照/上传识别</button>' +
        '<div class="img-preview" id="fl-ocr-preview" style="margin-top:8px"><img id="fl-ocr-imgel" /></div>' +
        '<div class="ocr-status" id="fl-ocr-status"></div>' +
        '<div class="hint">拍摄食品包装背面营养成分表，自动识别并填入下方数据</div>' +
      '</div>' +
      '<div class="field"><label>食材名称</label><input id="fl-name" placeholder="如：自制杂粮馒头" value="' + escape(pre.name || '') + '" /></div>' +
      '<div class="hint" style="margin-bottom:10px">填写每100g的营养数据（参照包装营养成分表）</div>' +
      '<div class="field-row-3"><div class="field"><label>能量(kJ)</label><input type="number" step="0.1" id="fl-kj" value="' + (preKj || '') + '" placeholder="如：1672" /><div class="hint" id="fl-kj-hint" style="margin-top:4px;font-size:11px;color:var(--c-diet);font-weight:600"></div></div><div class="field"><label>蛋白质(g)</label><input type="number" step="0.1" id="fl-protein" value="' + (pre.protein || '') + '" /></div><div class="field"><label>脂肪(g)</label><input type="number" step="0.1" id="fl-fat" value="' + (pre.fat || '') + '" /></div></div>' +
      '<div class="field-row-3"><div class="field"><label>碳水(g)</label><input type="number" step="0.1" id="fl-carb" value="' + (pre.carb || '') + '" /></div><div class="field"><label>膳食纤维(g)</label><input type="number" step="0.1" id="fl-fiber" value="' + (pre.fiber || '') + '" /></div><div class="field"><label>钠(mg)</label><input type="number" step="0.1" id="fl-sodium" value="' + (pre.sodium || '') + '" /></div></div>' +
      '<div class="field"><label>分类</label><select id="fl-category">' + this.categoryOptions(pre.category) + '</select><input id="fl-category-new" placeholder="或输入新分类名，如：饮品" style="margin-top:6px" /></div>',
      '<button class="btn" data-action="modal-cancel">取消</button><button class="btn primary" id="fl-save">' + btnText + '</button>',
      function () {
        /* KJ → kcal 实时换算显示 */
        var kjInput = $('#fl-kj'), kjHint = $('#fl-kj-hint');
        function updateKjHint() {
          var v = +kjInput.value || 0;
          kjHint.textContent = v > 0 ? ('≈ ' + kjToKcal(v) + ' kcal') : '';
        }
        kjInput.oninput = updateKjHint;
        updateKjHint();
        /* OCR 拍照识别 */
        $('#fl-ocr-btn').onclick = function () { $('#fl-ocr-img').click(); };
        $('#fl-ocr-img').onchange = function (e) {
          var file = e.target.files[0]; if (!file) return;
          var preview = $('#fl-ocr-preview'), imgEl = $('#fl-ocr-imgel'), status = $('#fl-ocr-status');
          var reader = new FileReader();
          reader.onload = function () {
            imgEl.src = reader.result; preview.classList.add('show');
            status.innerHTML = '<span class="ocr-loading">⏳ 正在加载识别引擎…</span>';
            OCR.recognize(reader.result, function (st, prog) {
              var labels = { 'loading language traineddata': '加载中文语言包…', 'recognizing text': '正在识别文字…' };
              status.innerHTML = '<span class="ocr-loading">⏳ ' + (labels[st] || st) + ' ' + Math.round((prog || 0) * 100) + '%</span>';
            }, function (err, text) {
              if (err) { status.innerHTML = '<span class="ocr-error">⚠ 识别失败：' + (err.message || '网络错误') + '，请手动填写</span>'; return; }
              var p = OCR.parseNutritionLabel(text);
              var filled = [];
              if (p.energyKj != null) { $('#fl-kj').value = p.energyKj; filled.push('能量(kJ)'); }
              else if (p.energy != null) { $('#fl-kj').value = Math.round(p.energy * 4.184); filled.push('能量(kcal换算kJ)'); }
              updateKjHint();
              if (p.protein != null) { $('#fl-protein').value = p.protein; filled.push('蛋白质'); }
              if (p.fat != null) { $('#fl-fat').value = p.fat; filled.push('脂肪'); }
              if (p.carb != null) { $('#fl-carb').value = p.carb; filled.push('碳水'); }
              if (p.sodium != null) { $('#fl-sodium').value = p.sodium; filled.push('钠'); }
              if (p.fiber != null) { $('#fl-fiber').value = p.fiber; filled.push('膳食纤维'); }
              if (filled.length) {
                status.innerHTML = '<span class="ocr-success">✅ 已识别并填入：' + filled.join('、') + '</span>';
                toast('识别成功，请核对后保存');
              } else {
                status.innerHTML = '<span class="ocr-error">⚠ 未识别到营养数据，请手动填写或重拍</span><details style="margin-top:6px"><summary>查看识别原文</summary><pre style="white-space:pre-wrap;font-size:11px;max-height:120px;overflow:auto">' + escape(text) + '</pre></details>';
              }
            });
          };
          reader.readAsDataURL(file);
        };
        /* 保存（新增 or 修改） */
        $('#fl-save').onclick = function () {
          var name = $('#fl-name').value.trim();
          if (!name) { toast('请填写食材名称'); return; }
          var kj = +$('#fl-kj').value || 0;
          var kcal = kj > 0 ? kjToKcal(kj) : 0;
          /* 分类：优先取下拉框选择；若输入了新分类名则用它并加入分类库 */
          var cat = ($('#fl-category').value || '').trim();
          var newCat = ($('#fl-category-new').value || '').trim();
          if (newCat) cat = newCat;
          if (cat && cat !== '📦 未分类' && cat !== '未分类') {
            var cats = Store.get('foodLibCategories', []);
            if (cats.indexOf(cat) === -1) { cats.push(cat); Store.set('foodLibCategories', cats); }
          }
          var lib = Store.get('foodLib', []);
          if (editing) {
            /* 修改模式：更新已有记录 */
            var item = lib.find(function (f) { return f.id === editId; });
            if (!item) { toast('食材不存在'); return; }
            if (name !== item.name && lib.some(function (f) { return f.name === name; })) { toast('已有同名食材'); return; }
            item.name = name;
            item.category = cat;
            item.energy = kcal;
            item.energyKj = kj;
            item.protein = +$('#fl-protein').value || 0;
            item.fat = +$('#fl-fat').value || 0;
            item.carb = +$('#fl-carb').value || 0;
            item.fiber = +$('#fl-fiber').value || 0;
            item.sodium = +$('#fl-sodium').value || 0;
            Store.set('foodLib', lib); closeModal(); self.renderFoodLib(); toast('已修改');
          } else {
            /* 新增模式 */
            if (lib.some(function (f) { return f.name === name; })) { toast('已有同名食材'); return; }
            lib.push({ id: uid(), name: name, base: 100, energy: kcal, energyKj: kj, protein: +$('#fl-protein').value || 0, fat: +$('#fl-fat').value || 0, carb: +$('#fl-carb').value || 0, fiber: +$('#fl-fiber').value || 0, sodium: +$('#fl-sodium').value || 0, category: cat });
            Store.set('foodLib', lib); closeModal(); self.renderFoodLib(); toast('已加入食材库');
          }
        };
      });
  },
  delFoodLibItem: function (id) {
    var self = this;
    confirmDialog('删除食材', '确认从食材库删除该食材？', function () {
      Store.set('foodLib', Store.get('foodLib', []).filter(function (f) { return f.id !== id; }));
      self.renderFoodLib(); toast('已删除');
    }, { danger: true, okText: '删除' });
  },
  /* 买入/补货 */
  stockIn: function (id) {
    var self = this;
    var lib = Store.get('foodLib', []);
    var f = lib.find(function (x) { return x.id === id; });
    if (!f) return;
    openModal('买入补货 · ' + f.name,
      '<div class="field"><label>本次买入克重(g)</label><input type="number" id="st-in" placeholder="如：2000" min="1" /></div>' +
      '<div class="field"><label>补货提醒阈值(g)</label><input type="number" id="st-low" value="' + (f.stockLow || '') + '" placeholder="如：200，库存低于这个值提醒补货" /></div>' +
      '<div class="hint">当前库存 ' + (f.stock || 0) + 'g，买入后自动累加</div>',
      '<button class="btn" data-action="modal-cancel">取消</button><button class="btn primary" id="st-save">确认买入</button>',
      function () {
        $('#st-save').onclick = function () {
          var amt = +$('#st-in').value || 0;
          if (amt <= 0) { toast('请输入克重'); return; }
          f.stock = (f.stock || 0) + amt;
          if ($('#st-low').value) f.stockLow = +$('#st-low').value;
          Store.set('foodLib', lib);
          /* 买入 → 替代组状态改为 bought（有货了） */
          var ac = Store.get('altChoices', []);
          var changed = false;
          ac.forEach(function (c) {
            if (c.chosen && c.chosen !== '__any__' && c.chosen.indexOf(f.name) !== -1 && c.state !== 'bought') { c.state = 'bought'; changed = true; }
          });
          if (changed) Store.set('altChoices', ac);
          closeModal(); self.renderFoodLib(); self.renderHistory(); self.render(); toast('已买入 +' + amt + 'g');
        };
      }
    );
  },
  /* 手动扣减 */
  stockOut: function (id) {
    var self = this;
    var lib = Store.get('foodLib', []);
    var f = lib.find(function (x) { return x.id === id; });
    if (!f) return;
    openModal('手动扣减 · ' + f.name,
      '<div class="field"><label>本次食用克重(g)</label><input type="number" id="st-out" placeholder="如：80" min="1" /></div>' +
      '<div class="hint">当前库存 ' + (f.stock || 0) + 'g（平时记饮食会自动扣，这里用于补录/修正）</div>',
      '<button class="btn" data-action="modal-cancel">取消</button><button class="btn primary" id="st-save-out">确认扣减</button>',
      function () {
        $('#st-save-out').onclick = function () {
          var amt = +$('#st-out').value || 0;
          if (amt <= 0) { toast('请输入克重'); return; }
          f.stock = Math.max(0, (f.stock || 0) - amt);
          Store.set('foodLib', lib);
          closeModal(); self.renderFoodLib(); toast('已扣减 ' + amt + 'g，剩余 ' + f.stock + 'g');
        };
      }
    );
  },
  /* ---------- 豆包快速粘贴 ---------- */
  mountQuickPaste: function () {
    var self = this;
    var sel = $('#qp-meal');
    if (!sel) return;
    sel.innerHTML = MEALS.map(function (m) { return '<option value="' + m[0] + '">' + m[1] + '</option>'; }).join('');
    var now = new Date(); var h = now.getHours();
    sel.value = (h < 10) ? 'breakfast' : (h < 14) ? 'lunch' : (h < 17) ? 'snack' : (h < 21) ? 'dinner' : 'snack';
    $('#qp-date').value = today();
    $('#qp-parse-btn').onclick = function () { self.parseQuickPaste(); };
    $('#qp-save-btn').onclick = function () { self.saveQuickPaste(); };
    $('#pasteHelpBtn').onclick = function () {
      var h = $('#pasteHelp');
      h.style.display = h.style.display === 'none' ? 'block' : 'none';
    };
  },
  parseQuickPaste: function () {
    var txt = $('#qp-text').value.trim();
    if (!txt) { toast('请先粘贴豆包回答'); return; }
    var items = parseNutritionText(txt);
    var box = $('#qp-result');
    if (!items.length) {
      box.innerHTML = '<div class="qp-empty">⚠ 未识别到有效数据，请检查格式或参考使用说明</div>';
      box.style.display = 'block';
      $('#qp-save-btn').style.display = 'none';
      return;
    }
    var html = '<div class="qp-summary">识别到 <b>' + items.length + '</b> 份食物：</div>';
    html += '<div class="qp-table"><div class="qp-th">食物</div><div class="qp-th">克数</div><div class="qp-th">热量</div><div class="qp-th">蛋白</div><div class="qp-th">脂肪</div><div class="qp-th">碳水</div><div class="qp-th">数据源</div></div>';
    items.forEach(function (it, idx) {
      var matched = matchFoodInDb(it.name);
      var srcIcon = matched ? (matched.custom ? '🧑‍🌾' : '📖') : '🤖';
      var srcTxt = matched ? (matched.custom ? '食材库' : '内置库') : '豆包提供';
      html += '<div class="qp-tr" data-idx="' + idx + '">' +
        '<div class="qp-td">' + escape(it.name) + '</div>' +
        '<div class="qp-td">' + it.amount + 'g</div>' +
        '<div class="qp-td">' + it.energy + 'kcal</div>' +
        '<div class="qp-td">' + it.protein + 'g</div>' +
        '<div class="qp-td">' + it.fat + 'g</div>' +
        '<div class="qp-td">' + it.carb + 'g</div>' +
        '<div class="qp-td" style="font-size:11px">' + srcIcon + ' ' + srcTxt + '</div>' +
        '</div>';
    });
    html += '<div class="qp-total">合计：' + items.reduce(function (s, it) { return s + it.energy; }, 0) + ' kcal</div>';
    box.innerHTML = html;
    box.style.display = 'block';
    $('#qp-save-btn').style.display = 'inline-block';
    $('#qp-status').textContent = '✓ 已匹配食材库·点击保存按库计算';
  },
  saveQuickPaste: function () {
    var txt = $('#qp-text').value.trim();
    if (!txt) return;
    var items = parseNutritionText(txt);
    if (!items.length) { toast('请先解析'); return; }
    var meal = $('#qp-meal').value;
    var date = $('#qp-date').value;
    var arr = Store.get('diet', []);
    var libUsed = 0, dbUsed = 0, fallbackUsed = 0;
    items.forEach(function (it) {
      var matched = matchFoodInDb(it.name);
      var nutri, dbName;
      if (matched) {
        nutri = nutriForAmount(matched, it.amount);
        dbName = matched.name;
        if (matched.custom) libUsed++; else dbUsed++;
      } else {
        // 食材库/内置库都没找到，用豆包的数据
        nutri = { energy: it.energy, protein: it.protein, fat: it.fat, carb: it.carb, fiber: it.fiber, sodium: it.sodium };
        dbName = it.name;
        fallbackUsed++;
      }
      arr.push({
        id: uid(),
        date: date,
        meal: meal,
        name: dbName,
        amount: it.amount,
        energy: nutri.energy,
        protein: nutri.protein,
        fat: nutri.fat,
        carb: nutri.carb,
        fiber: nutri.fiber || 0,
        sodium: nutri.sodium || 0,
        source: matched ? (matched.custom ? '食材库' : '内置库') : '豆包'
      });
    });
    Store.set('diet', arr);
    /* 统一扣库存：用匹配后的食材库名（dbName）扣减 */
    var missList = [];
    var stockHits = [];
    items.forEach(function (it, idx) {
      var stName = arr[idx].name; /* 已保存的名字（匹配后=食材库名或豆包名） */
      var stRes = deductStock(stName, it.amount);
      if (stRes.ok) stockHits.push(stRes.matched);
      else missList.push(stRes.matched ? stRes.matched : stName);
    });
    if (stockHits.length) toast('已扣库存：' + stockHits.join('、'));
    if (missList.length) toast('⚠️ 未匹配库存：' + missList.join('、') + '（请去食材库核对名称）');
    this.renderSummary(); this.renderMeals();
    var msg = '✓ 保存完成';
    if (libUsed) msg += ' · ' + libUsed + '项来自食材库';
    if (dbUsed) msg += ' · ' + dbUsed + '项来自内置库';
    if (fallbackUsed) msg += ' · ' + fallbackUsed + '项使用豆包估算';
    $('#qp-text').value = '';
    $('#qp-result').style.display = 'none';
    $('#qp-save-btn').style.display = 'none';
    $('#qp-status').textContent = '';
    toast(msg);
  }
};

/* ---------- 体重体脂 ---------- */
var Body = {
  chartW: null, chartF: null,
  render: function () {
    var data = Store.get('bodyData', []);
    var last = data[data.length - 1];
    var prev = data[data.length - 2];
    /* 判断上次记录是否今天：不是的话显示日期标注，避免误认为今天已填 */
    var lastIsToday = last && last.date === today();
    var lastDateTag = last ? (lastIsToday ? '<span class="bc-tag today">今日</span>' : '<span class="bc-tag old">上次 ' + last.date.slice(5) + '</span>') : '<span class="bc-tag none">暂无记录</span>';
    var cards = [
      { label: '体重', val: last ? last.weight : null, unit: 'kg', delta: this.delta(last ? last.weight : null, prev ? prev.weight : null) },
      { label: '体脂率', val: last ? last.bodyFat : null, unit: '%', delta: this.delta(last ? last.bodyFat : null, prev ? prev.bodyFat : null) },
      { label: 'BMI', val: last ? last.bmi : null, unit: '', delta: this.delta(last ? last.bmi : null, prev ? prev.bmi : null) },
      { label: '肌肉量', val: last ? last.muscle : null, unit: 'kg', delta: this.delta(last ? last.muscle : null, prev ? prev.muscle : null) },
      { label: '骨量', val: last ? last.bone : null, unit: 'kg', delta: this.delta(last ? last.bone : null, prev ? prev.bone : null) },
      { label: '水分率', val: last ? last.water : null, unit: '%', delta: this.delta(last ? last.water : null, prev ? prev.water : null) },
      { label: '基础代谢', val: last ? last.bmr : null, unit: 'kcal', delta: this.delta(last ? last.bmr : null, prev ? prev.bmr : null) }
    ];
    $('#bodyCards').innerHTML = '<div class="body-date-tag">' + lastDateTag + (last ? '<span class="bc-note">数据更新：' + last.date + '</span>' : '') + '</div>' + cards.map(function (c) {
      return '<div class="body-card"><div class="bc-num">' + (c.val != null ? c.val : '--') + '<small>' + c.unit + '</small></div><div class="bc-label">' + c.label + '</div><div class="bc-delta">' + c.delta + '</div></div>';
    }).join('') || '<div class="empty-mini">暂无体测数据，点击右上角录入</div>';
    this.renderTable(data);
    this.renderCharts(data);
  },
  delta: function (cur, prev) {
    if (cur == null || prev == null) return '—';
    var d = (cur - prev).toFixed(1);
    return +d > 0 ? '<span style="color:#ef4444">↑' + d + '</span>' : +d < 0 ? '<span style="color:#10b981">↓' + Math.abs(d) + '</span>' : '持平';
  },
  renderTable: function (data) {
    var rows = data.slice().reverse();
    $('#bodyTable').innerHTML = rows.length ? '<table><thead><tr><th>日期</th><th>体重</th><th>体脂率</th><th>BMI</th><th>肌肉</th><th>骨量</th><th>水分</th><th>代谢</th><th></th></tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr><td>' + r.date + '</td><td>' + (r.weight != null ? r.weight : '-') + '</td><td>' + (r.bodyFat != null ? r.bodyFat : '-') + '</td><td>' + (r.bmi != null ? r.bmi : '-') + '</td><td>' + (r.muscle != null ? r.muscle : '-') + '</td><td>' + (r.bone != null ? r.bone : '-') + '</td><td>' + (r.water != null ? r.water : '-') + '</td><td>' + (r.bmr != null ? r.bmr : '-') + '</td><td><button class="btn sm danger" data-action="del-body" data-id="' + r.id + '">删</button></td></tr>';
      }).join('') + '</tbody></table>' : '<div class="empty-mini">暂无记录</div>';
  },
  renderCharts: function (data) {
    try {
      if (typeof Chart === 'undefined') return;
      var labels = data.map(function (d) { return fmtDate(d.date); });
      var w = data.map(function (d) { return d.weight; }), f = data.map(function (d) { return d.bodyFat; });
      if (this.chartW) this.chartW.destroy();
      if (this.chartF) this.chartF.destroy();
      var mkChart = function (ctx, label, arr, color) {
        return new Chart(ctx, { type: 'line', data: { labels: labels, datasets: [{ label: label, data: arr, borderColor: color, backgroundColor: color + '22', fill: true, tension: 0.35, pointRadius: 3, pointBackgroundColor: color }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: false } } } });
      };
      this.chartW = mkChart($('#weightChart'), '体重', w, '#06b6d4');
      this.chartF = mkChart($('#fatChart'), '体脂率', f, '#8b5cf6');
    } catch (e) { console.error('图表渲染失败:', e); }
  },
  add: function () {
    var self = this;
    var last = Store.get('bodyData', []).slice(-1)[0] || {};
    openModal('录入体测数据',
      '<div class="ocr-section">' +
        '<label style="font-weight:600;display:block;margin-bottom:8px">📷 拍照识别体脂秤数据</label>' +
        '<input type="file" id="bd-ocr-img" accept="image/*" hidden />' +
        '<button class="btn" id="bd-ocr-btn" style="width:100%">📷 拍照/上传识别</button>' +
        '<div class="img-preview" id="bd-ocr-preview" style="margin-top:8px"><img id="bd-ocr-imgel" /></div>' +
        '<div class="ocr-status" id="bd-ocr-status"></div>' +
        '<div class="hint">拍摄体脂秤显示屏，自动识别体重、体脂率等数据</div>' +
      '</div>' +
      '<div class="field"><label>测量日期</label><input type="date" id="bd-date" value="' + today() + '" /></div>' +
      '<div class="field-row-3"><div class="field"><label>体重(kg)</label><input type="number" step="0.1" id="bd-weight" value="' + (last.weight || '') + '" /></div><div class="field"><label>体脂率(%)</label><input type="number" step="0.1" id="bd-bodyFat" value="' + (last.bodyFat || '') + '" /></div><div class="field"><label>BMI</label><input type="number" step="0.1" id="bd-bmi" value="' + (last.bmi || '') + '" /></div></div>' +
      '<div class="field-row-3"><div class="field"><label>肌肉量(kg)</label><input type="number" step="0.1" id="bd-muscle" value="' + (last.muscle || '') + '" /></div><div class="field"><label>骨量(kg)</label><input type="number" step="0.1" id="bd-bone" value="' + (last.bone || '') + '" /></div><div class="field"><label>水分率(%)</label><input type="number" step="0.1" id="bd-water" value="' + (last.water || '') + '" /></div></div>' +
      '<div class="field"><label>基础代谢(kcal)</label><div style="display:flex;gap:8px"><input type="number" id="bd-bmr" value="' + (last.bmr || '') + '" style="flex:1" /><button class="btn sm" id="bd-bmr-auto" title="用 Katch-McArdle 公式自动计算">⚙ 自动算</button></div><div class="hint" id="bd-bmr-hint" style="margin-top:4px;font-size:11px;color:var(--c-body);font-weight:600"></div></div>' +
      '<div class="hint">也可对照体脂秤显示的数据逐项手动填入，留空的项会显示为"-"</div>',
      '<button class="btn" data-action="modal-cancel">取消</button><button class="btn primary" id="bd-save">保存</button>',
      function () {
        /* 基础代谢自动计算（Katch-McArdle 公式：BMR = 370 + 21.6 × 去脂体重） */
        var wInput = $('#bd-weight'), bfInput = $('#bd-bodyFat'), bmrInput = $('#bd-bmr'), bmrHint = $('#bd-bmr-hint');
        function calcBmrNow() {
          var w = +wInput.value || 0, bf = +bfInput.value || 0;
          if (w <= 0 || bf <= 0) { bmrHint.textContent = '需要体重和体脂率才能自动算'; return; }
          var lbm = w * (1 - bf / 100);
          var bmr = Math.round(370 + 21.6 * lbm);
          bmrHint.textContent = '按 Katch-McArdle 公式估算：' + bmr + ' kcal（点击"自动算"填入）';
          bmrInput.dataset.calc = bmr;
        }
        wInput.addEventListener('input', calcBmrNow);
        bfInput.addEventListener('input', calcBmrNow);
        $('#bd-bmr-auto').onclick = function () {
          var v = +bmrInput.dataset.calc || 0;
          if (v <= 0) { calcBmrNow(); v = +bmrInput.dataset.calc || 0; }
          if (v > 0) { bmrInput.value = v; toast('已按 Katch-McArdle 公式自动计算'); }
          else toast('请先填写体重和体脂率');
        };
        calcBmrNow();
        /* OCR 拍照识别体脂秤 */
        $('#bd-ocr-btn').onclick = function () { $('#bd-ocr-img').click(); };
        $('#bd-ocr-img').onchange = function (e) {
          var file = e.target.files[0]; if (!file) return;
          var preview = $('#bd-ocr-preview'), imgEl = $('#bd-ocr-imgel'), status = $('#bd-ocr-status');
          var reader = new FileReader();
          reader.onload = function () {
            imgEl.src = reader.result; preview.classList.add('show');
            status.innerHTML = '<span class="ocr-loading">⏳ 正在加载识别引擎…</span>';
            OCR.recognize(reader.result, function (st, prog) {
              var labels = { 'loading language traineddata': '加载中文语言包…', 'recognizing text': '正在识别文字…' };
              status.innerHTML = '<span class="ocr-loading">⏳ ' + (labels[st] || st) + ' ' + Math.round((prog || 0) * 100) + '%</span>';
            }, function (err, text) {
              if (err) { status.innerHTML = '<span class="ocr-error">⚠ 识别失败：' + (err.message || '网络错误') + '，请手动填写</span>'; return; }
              var p = OCR.parseBodyScale(text);
              var filled = [];
              if (p.weight != null) { $('#bd-weight').value = p.weight; filled.push('体重'); }
              if (p.bodyFat != null) { $('#bd-bodyFat').value = p.bodyFat; filled.push('体脂率'); }
              if (p.bmi != null) { $('#bd-bmi').value = p.bmi; filled.push('BMI'); }
              if (p.muscle != null) { $('#bd-muscle').value = p.muscle; filled.push('肌肉量'); }
              if (p.bone != null) { $('#bd-bone').value = p.bone; filled.push('骨量'); }
              if (p.water != null) { $('#bd-water').value = p.water; filled.push('水分率'); }
              if (p.bmr != null) { $('#bd-bmr').value = p.bmr; filled.push('基础代谢'); }
              if (filled.length) {
                status.innerHTML = '<span class="ocr-success">✅ 已识别并填入：' + filled.join('、') + '</span>';
                toast('识别成功，请核对后保存');
              } else {
                status.innerHTML = '<span class="ocr-error">⚠ 未识别到数据，请手动填写或重拍</span><details style="margin-top:6px"><summary>查看识别原文</summary><pre style="white-space:pre-wrap;font-size:11px;max-height:120px;overflow:auto">' + escape(text) + '</pre></details>';
              }
            });
          };
          reader.readAsDataURL(file);
        };
        /* 保存 */
        $('#bd-save').onclick = function () {
          var obj = { id: uid(), date: $('#bd-date').value, weight: +$('#bd-weight').value || null, bodyFat: +$('#bd-bodyFat').value || null, bmi: +$('#bd-bmi').value || null, muscle: +$('#bd-muscle').value || null, bone: +$('#bd-bone').value || null, water: +$('#bd-water').value || null, bmr: +$('#bd-bmr').value || null };
          if (obj.weight == null && obj.bodyFat == null) { toast('至少填一项数据'); return; }
          var d = Store.get('bodyData', []);
          d.push(obj); d.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
          Store.set('bodyData', d); closeModal(); self.render(); toast('已录入');
        };
      });
  },
  del: function (id) {
    var self = this;
    confirmDialog('删除体测记录', '确认删除该条体测记录？', function () {
      Store.set('bodyData', Store.get('bodyData', []).filter(function (x) { return x.id !== id; }));
      self.render(); toast('已删除');
    }, { danger: true, okText: '删除' });
  }
};

/* ---------- 课外提升 ---------- */
var Study = {
  render: function () { this.renderOverview(); this.renderList(); this.renderNotes(); },
  renderOverview: function () {
    var plans = Store.get('studyPlans', []);
    var done = plans.filter(function (p) { return p.done; }).length;
    var exam = Store.get('studyExamDate', '');
    var days = exam ? daysBetween(today(), exam) : null;
    $('#studyOverview').innerHTML =
      '<div class="so-card"><div class="so-num">' + done + '/' + plans.length + '</div><div class="so-label">已完成计划</div></div>' +
      '<div class="so-card"><div class="so-num">' + (plans.length ? Math.round(done / plans.length * 100) : 0) + '%</div><div class="so-label">总完成率</div></div>' +
      '<div class="so-card"><div class="so-num">' + (days != null ? days : '未设') + '</div><div class="so-label">' + (days !== null ? '距考试天数' : '点击设置考试日期') + '</div></div>' +
      '<div class="so-card"><div class="so-num">' + (exam || '—') + '</div><div class="so-label">考试日期</div></div>';
  },
  renderList: function () {
    var plans = Store.get('studyPlans', []);
    var self = this;
    $('#studyList').innerHTML = plans.length ? plans.map(function (p) {
      return '<div class="study-item ' + (p.done ? 'done' : '') + '" data-id="' + p.id + '"><div class="si-check" data-action="toggle-study" data-id="' + p.id + '">' + (p.done ? '✓' : '') + '</div>' +
        '<div class="si-info"><div class="si-title">' + escape(p.title) + '</div><div class="si-meta">' + fmtDate(p.planDate) + '</div></div>' +
        '<button class="si-del" data-action="del-study" data-id="' + p.id + '">✕</button></div>';
    }).join('') : '<div class="empty-mini">还没有学习计划</div>';
  },
  toggle: function (id) {
    var plans = Store.get('studyPlans', []);
    var p = plans.find(function (x) { return x.id === id; });
    if (p) { p.done = !p.done; Store.set('studyPlans', plans); this.renderOverview(); this.renderList(); }
  },
  del: function (id) {
    var self = this;
    confirmDialog('删除学习计划', '确认删除该学习计划？', function () {
      Store.set('studyPlans', Store.get('studyPlans', []).filter(function (p) { return p.id !== id; }));
      self.renderOverview(); self.renderList(); toast('已删除');
    }, { danger: true, okText: '删除' });
  },
  add: function () {
    var self = this;
    openModal('添加学习计划',
      '<div class="field"><label>学习内容</label><input id="st-title" placeholder="如：复习健康管理基础理论" /></div>' +
      '<div class="field"><label>计划日期</label><input type="date" id="st-date" value="' + today() + '" /></div>',
      '<button class="btn" data-action="modal-cancel">取消</button><button class="btn primary" id="st-save">添加</button>',
      function () {
        $('#st-save').onclick = function () {
          var v = $('#st-title').value.trim();
          if (!v) { toast('请填写内容'); return; }
          var p = Store.get('studyPlans', []);
          p.push({ id: uid(), title: v, planDate: $('#st-date').value, done: false });
          Store.set('studyPlans', p); closeModal(); self.renderOverview(); self.renderList(); toast('已添加');
        };
      });
  },
  setExam: function () {
    var self = this;
    openModal('设置健康管理师考试日期',
      '<div class="field"><label>考试日期</label><input type="date" id="ex-date" value="' + Store.get('studyExamDate', '') + '" /></div><div class="hint">设置后，总览页会显示倒计时</div>',
      '<button class="btn" data-action="modal-cancel">取消</button><button class="btn primary" id="ex-save">保存</button>',
      function () {
        $('#ex-save').onclick = function () {
          Store.set('studyExamDate', $('#ex-date').value);
          closeModal(); self.renderOverview(); toast('已设置');
        };
      });
  },
  renderNotes: function () {
    var notes = Store.get('knowledgeNotes', []);
    $('#knowledgeNotes').innerHTML = notes.length ? notes.map(function (n) {
      return '<div class="note-card"><button class="nc-del" data-action="del-knowledge" data-id="' + n.id + '">✕</button><div class="nc-body">' + escape(n.content) + '</div><div class="nc-date">' + fmtDate(n.created) + '</div></div>';
    }).join('') : '<div class="empty-mini">还没有笔记</div>';
  },
  addNote: function () {
    var self = this;
    openModal('记录知识笔记', '<div class="field"><label>笔记内容</label><textarea id="kn-content" style="min-height:120px" placeholder="知识点、易错点、记忆口诀…"></textarea></div>',
      '<button class="btn" data-action="modal-cancel">取消</button><button class="btn primary" id="kn-save">保存</button>',
      function () {
        $('#kn-save').onclick = function () {
          var v = $('#kn-content').value.trim();
          if (!v) { toast('内容不能为空'); return; }
          var n = Store.get('knowledgeNotes', []);
          n.unshift({ id: uid(), content: v, created: today() });
          Store.set('knowledgeNotes', n); closeModal(); self.renderNotes(); toast('已记录');
        };
      });
  },
  delNote: function (id) {
    var self = this;
    confirmDialog('删除笔记', '确认删除该知识笔记？', function () {
      Store.set('knowledgeNotes', Store.get('knowledgeNotes', []).filter(function (n) { return n.id !== id; }));
      self.renderNotes(); toast('已删除');
    }, { danger: true, okText: '删除' });
  }
};

/* ---------- 中级职称 ---------- */
var Title = {
  chart: null,
  render: function () { this.renderOverview(); this.renderTable(); this.renderAchievements(); this.renderChart(); },
  renderOverview: function () {
    var year = Store.get('titleYear', new Date().getFullYear());
    var courses = Store.get('courses', []).filter(function (c) { return c.year === year; });
    var hours = courses.reduce(function (s, c) { return s + (+c.hours || 0); }, 0);
    var pct = Math.min(hours / 120 * 100, 100);
    var byType = {};
    courses.forEach(function (c) { byType[c.type] = (byType[c.type] || 0) + (+c.hours || 0); });
    $('#titleOverview').innerHTML =
      '<div class="to-card" style="text-align:center"><div class="ring" style="--pct:' + pct.toFixed(0) + '"><i>' + hours + '<br><small style="font-size:11px;color:var(--ink-soft)">' + year + '年</small></i></div><div class="to-label">已完成 / 目标120课时</div></div>' +
      '<div class="to-card"><div class="to-num">' + hours + '<small>/' + (120 - hours > 0 ? 120 - hours : 0) + '剩余</small></div><div class="to-label">本年课时</div></div>' +
      '<div class="to-card"><div class="to-num">' + courses.length + '</div><div class="to-label">登记条数</div></div>' +
      '<div class="to-card"><div class="to-num">' + (byType['专业课'] || 0) + '<small>h</small></div><div class="to-label">专业课</div></div>' +
      '<div class="to-card"><div class="to-num">' + (byType['公需课'] || 0) + '<small>h</small></div><div class="to-label">公需课</div></div>' +
      '<div class="to-card"><div class="to-num">' + (byType['选修课'] || 0) + '<small>h</small></div><div class="to-label">选修课</div></div>';
  },
  renderTable: function () {
    var year = Store.get('titleYear', new Date().getFullYear());
    var rows = Store.get('courses', []).filter(function (c) { return c.year === year; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    $('#courseTable').innerHTML = rows.length ? '<table><thead><tr><th>日期</th><th>课程/活动</th><th>类型</th><th>课时</th><th>说明</th><th></th></tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr><td>' + r.date + '</td><td>' + escape(r.title) + '</td><td>' + r.type + '</td><td>' + r.hours + '</td><td>' + escape(r.note || '') + '</td><td><button class="btn sm danger" data-action="del-course" data-id="' + r.id + '">删</button></td></tr>';
      }).join('') + '</tbody></table>' : '<div class="empty-mini">本年暂无课时登记</div>';
  },
  renderChart: function () {
    try {
      if (typeof Chart === 'undefined') return;
      var year = Store.get('titleYear', new Date().getFullYear());
      var courses = Store.get('courses', []).filter(function (c) { return c.year === year; });
      var byType = {}; courses.forEach(function (c) { byType[c.type] = (byType[c.type] || 0) + (+c.hours || 0); });
      if (this.chart) this.chart.destroy();
      this.chart = new Chart($('#courseChart'), {
        type: 'doughnut',
        data: { labels: ['专业课', '公需课', '选修课', '其他'], datasets: [{ data: [byType['专业课'] || 0, byType['公需课'] || 0, byType['选修课'] || 0, byType['其他'] || 0], backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#cbd5e1'] }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
      });
    } catch (e) { console.error('图表渲染失败:', e); }
  },
  renderAchievements: function () {
    var list = Store.get('achievements', []);
    $('#achievementList').innerHTML = list.length ? list.map(function (a) {
      return '<div class="ach-item"><button class="ai-del" data-action="del-achievement" data-id="' + a.id + '">✕</button><div class="ai-title">' + escape(a.title) + '</div><div class="ai-meta">' + a.date + ' · ' + escape(a.desc || '') + '</div></div>';
    }).join('') : '<div class="empty-mini">暂无成果记录</div>';
  },
  addCourse: function () {
    var self = this;
    openModal('登记课时',
      '<div class="field"><label>日期</label><input type="date" id="cs-date" value="' + today() + '" /></div>' +
      '<div class="field"><label>课程/活动名称</label><input id="cs-title" placeholder="如：继续教育专业课培训" /></div>' +
      '<div class="field-row"><div class="field"><label>类型</label><select id="cs-type"><option>专业课</option><option>公需课</option><option>选修课</option><option>其他</option></select></div><div class="field"><label>课时(学时)</label><input type="number" step="0.5" id="cs-hours" value="4" /></div></div>' +
      '<div class="field"><label>说明</label><input id="cs-note" placeholder="颁发机构、证书编号等" /></div>',
      '<button class="btn" data-action="modal-cancel">取消</button><button class="btn primary" id="cs-save">保存</button>',
      function () {
        $('#cs-save').onclick = function () {
          var title = $('#cs-title').value.trim();
          if (!title) { toast('请填写名称'); return; }
          var c = Store.get('courses', []);
          c.push({ id: uid(), date: $('#cs-date').value, title: title, type: $('#cs-type').value, hours: +$('#cs-hours').value || 0, note: $('#cs-note').value.trim(), year: Store.get('titleYear', new Date().getFullYear()) });
          Store.set('courses', c); closeModal(); self.render(); toast('已登记');
        };
      });
  },
  delCourse: function (id) {
    var self = this;
    confirmDialog('删除课时记录', '确认删除该条课时记录？', function () {
      Store.set('courses', Store.get('courses', []).filter(function (c) { return c.id !== id; }));
      self.render(); toast('已删除');
    }, { danger: true, okText: '删除' });
  },
  addAchievement: function () {
    var self = this;
    openModal('添加成果',
      '<div class="field"><label>成果名称</label><input id="ac-title" placeholder="如：完成季度服装设计方案" /></div>' +
      '<div class="field"><label>日期</label><input type="date" id="ac-date" value="' + today() + '" /></div>' +
      '<div class="field"><label>说明</label><textarea id="ac-desc" placeholder="成果描述、影响、佐证等"></textarea></div>',
      '<button class="btn" data-action="modal-cancel">取消</button><button class="btn primary" id="ac-save">保存</button>',
      function () {
        $('#ac-save').onclick = function () {
          var title = $('#ac-title').value.trim();
          if (!title) { toast('请填写名称'); return; }
          var a = Store.get('achievements', []);
          a.unshift({ id: uid(), title: title, date: $('#ac-date').value, desc: $('#ac-desc').value.trim() });
          Store.set('achievements', a); closeModal(); self.renderAchievements(); toast('已添加');
        };
      });
  },
  delAchievement: function (id) {
    var self = this;
    confirmDialog('删除成果记录', '确认删除该条成果记录？', function () {
      Store.set('achievements', Store.get('achievements', []).filter(function (a) { return a.id !== id; }));
      self.renderAchievements(); toast('已删除');
    }, { danger: true, okText: '删除' });
  },
  pickYear: function () {
    var self = this;
    var cur = Store.get('titleYear', new Date().getFullYear());
    var years = [];
    for (var y = cur - 3; y <= cur + 3; y++) years.push(y);
    openModal('切换年份', '<p style="margin-bottom:12px">选择要查看的年度课时：</p><div class="field-row-3">' +
      years.map(function (y) { return '<button class="btn ' + (y === cur ? 'primary' : '') + '" style="margin-bottom:8px" data-year="' + y + '">' + y + '年</button>'; }).join('') + '</div>',
      '', function (box) {
        $$('[data-year]', box).forEach(function (b) {
          b.onclick = function () {
            Store.set('titleYear', +b.dataset.year);
            closeModal(); self.render(); toast('已切换到 ' + b.dataset.year + ' 年');
          };
        });
      });
  }
};

/* ---------- 运动打卡 ---------- */
var SPORT_TYPES = [['散步', '🚶'], ['慢跑', '🏃'], ['骑行', '🚴'], ['跳绳', '🪢'], ['瑜伽', '🧘'], ['力量训练', '🏋️'], ['拉伸', '🙆'], ['其他', '✨']];
var Sport = {
  render: function () { this.renderOverview(); this.renderMini(); this.renderBand(); this.renderCalendar(); },
  renderOverview: function () {
    var logs = Store.get('sportLogs', []);
    var streak = Dashboard.streak(logs);
    var t = today();
    var monthLogs = logs.filter(function (l) { return l.date.slice(0, 7) === t.slice(0, 7); });
    var todayLog = logs.find(function (l) { return l.date === t; });
    var cheer = streak === 0 ? '今天还没动起来，开始第一次打卡吧！' : streak < 3 ? '不错的开始，继续保持！' : streak < 7 ? '坚持一周就在眼前，加油！' : streak < 30 ? '你已是运动达人，状态火热！' : '惊人的毅力，你做到了！';
    var todayIcon = todayLog ? (SPORT_TYPES.find(function (s) { return s[0] === todayLog.type; }) || ['', '✨'])[1] : '💤';
    $('#sportOverview').innerHTML =
      '<div class="sp-card"><div class="sp-num">' + streak + '</div><div class="sp-label">连续打卡(天)</div></div>' +
      '<div class="sp-card"><div class="sp-num">' + Dashboard.weekCount(logs) + '</div><div class="sp-label">本周打卡(次)</div></div>' +
      '<div class="sp-card"><div class="sp-num">' + monthLogs.length + '</div><div class="sp-label">本月打卡(次)</div></div>' +
      '<div class="sp-card"><div class="sp-num">' + (todayLog ? '✓' : '—') + '</div><div class="sp-label">今日已打卡</div></div>' +
      '<div class="sp-card" style="grid-column:1/-1"><div style="font-size:30px">' + todayIcon + '</div><div class="sp-label">' + cheer + '</div></div>';
  },
  renderCalendar: function () {
    var now = new Date();
    var y = now.getFullYear(), m = now.getMonth();
    var first = new Date(y, m, 1);
    var startDow = (first.getDay() + 6) % 7;
    var days = new Date(y, m + 1, 0).getDate();
    var logs = Store.get('sportLogs', []);
    var logMap = {};
    logs.forEach(function (l) { if (l.date.slice(0, 7) === y + '-' + String(m + 1).padStart(2, '0')) logMap[l.date.slice(8)] = l; });
    var dows = ['一', '二', '三', '四', '五', '六', '日'];
    var html = dows.map(function (d) { return '<div class="cal-dow">' + d + '</div>'; }).join('');
    for (var i = 0; i < startDow; i++) html += '<div class="cal-cell other-month"></div>';
    var todayStr = today();
    for (var d = 1; d <= days; d++) {
      var ds = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      var lg = logMap[String(d)];
      html += '<div class="cal-cell ' + (ds === todayStr ? 'today' : '') + ' ' + (lg ? 'checked' : '') + '"><span>' + d + '</span>' + (lg ? '<span class="cc-dot" style="width:6px;height:6px;border-radius:50%;background:#fff"></span>' : '') + '</div>';
    }
    $('#sportCalendar').innerHTML = html;
  },
  check: function () {
    var self = this;
    var t = today();
    var existing = Store.get('sportLogs', []).find(function (l) { return l.date === t; });
    openModal('今日运动打卡',
      '<div class="field"><label>运动类型</label><div class="seg" id="sp-types" style="flex-wrap:wrap">' +
      SPORT_TYPES.map(function (s, i) { return '<button ' + (i === 0 ? 'class="active"' : '') + ' data-type="' + s[0] + '">' + s[1] + ' ' + s[0] + '</button>'; }).join('') + '</div></div>' +
      '<div class="field"><label>运动时长(分钟)</label><input type="number" id="sp-dur" value="30" min="1" /></div>' +
      '<div class="field"><label>感受/备注</label><input id="sp-note" placeholder="如：微微出汗，状态不错" /></div>' +
      (existing ? '<div class="hint">今日已打过卡，保存将更新记录</div>' : ''),
      '<button class="btn" data-action="modal-cancel">取消</button><button class="btn success" id="sp-save">打卡</button>',
      function (box) {
        var type = SPORT_TYPES[0][0];
        $$('#sp-types button', box).forEach(function (b) {
          b.onclick = function () { $$('#sp-types button', box).forEach(function (x) { x.classList.remove('active'); }); b.classList.add('active'); type = b.dataset.type; };
        });
        $('#sp-save').onclick = function () {
          var dur = +$('#sp-dur', box).value || 0;
          if (dur <= 0) { toast('请输入时长'); return; }
          var logs = Store.get('sportLogs', []).filter(function (l) { return l.date !== t; });
          logs.push({ date: t, type: type, duration: dur, note: $('#sp-note', box).value.trim() });
          logs.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
          Store.set('sportLogs', logs);
          closeModal(); self.render(); toast('打卡成功，真棒！');
        };
      });
  },
  renderMini: function () {
    var items = Store.get('sportMiniItems', []);
    var logs = Store.get('sportMiniLogs', []);
    var t = today();
    var doneSet = {};
    logs.filter(function (l) { return l.date === t; }).forEach(function (l) { doneSet[l.itemId] = true; });
    var self = this;
    $('#miniGrid').innerHTML = items.length ? items.map(function (it) {
      var done = doneSet[it.id];
      var streak = self.miniStreak(it.id, logs);
      return '<div class="mini-item ' + (done ? 'done' : '') + '"><button class="mi-del" data-action="mini-del" data-id="' + it.id + '">✕</button><div class="mi-name">' + escape(it.name) + '</div><div class="mi-target">目标 ' + it.target + ' 次/天</div>' +
        '<button class="mi-btn" data-action="mini-check" data-id="' + it.id + '">' + (done ? '✓ 今日已完成' : '打卡完成') + '</button>' +
        (streak ? '<div class="mi-streak">连续 ' + streak + ' 天</div>' : '') + '</div>';
    }).join('') : '<div class="empty-mini" style="grid-column:1/-1">还没有小动作，点右上角新增（如：踮脚尖30次）</div>';
  },
  miniStreak: function (id, logs) {
    var set = {};
    logs.filter(function (l) { return l.itemId === id; }).forEach(function (l) { set[l.date] = true; });
    var s = 0; var d = new Date();
    while (true) {
      var k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      if (set[k]) { s++; d.setDate(d.getDate() - 1); } else break;
    }
    return s;
  },
  toggleMini: function (id) {
    var t = today();
    var logs = Store.get('sportMiniLogs', []);
    var exists = logs.find(function (l) { return l.itemId === id && l.date === t; });
    if (exists) { logs = logs.filter(function (l) { return !(l.itemId === id && l.date === t); }); toast('已取消今日打卡'); }
    else { logs.push({ date: t, itemId: id }); toast('小动作打卡完成，真棒！'); }
    Store.set('sportMiniLogs', logs);
    this.renderMini();
  },
  addMini: function () {
    var self = this;
    openModal('新增小动作',
      '<div class="field"><label>动作名称</label><input id="mn-name" placeholder="如：踮脚尖、深蹲、靠墙静蹲" /></div>' +
      '<div class="field"><label>每日目标次数</label><input type="number" id="mn-target" value="30" min="1" /></div>' +
      '<div class="hint">久坐救星：每隔1小时做一组小动作，促进血液循环</div>',
      '<button class="btn" data-action="modal-cancel">取消</button><button class="btn primary" id="mn-save">添加</button>',
      function () {
        $('#mn-save').onclick = function () {
          var name = $('#mn-name').value.trim();
          if (!name) { toast('请填写名称'); return; }
          var items = Store.get('sportMiniItems', []);
          items.push({ id: uid(), name: name, target: +$('#mn-target').value || 1 });
          Store.set('sportMiniItems', items); closeModal(); self.renderMini(); toast('已添加小动作');
        };
      });
  },
  delMini: function (id) {
    var self = this;
    confirmDialog('删除小动作', '确认删除该小动作及其打卡记录？', function () {
      Store.set('sportMiniItems', Store.get('sportMiniItems', []).filter(function (i) { return i.id !== id; }));
      Store.set('sportMiniLogs', Store.get('sportMiniLogs', []).filter(function (l) { return l.itemId !== id; }));
      self.renderMini(); toast('已删除');
    }, { danger: true, okText: '删除' });
  },
  renderBand: function () {
    var data = Store.get('bandData', []);
    var last = data[data.length - 1];
    var cards = [
      { label: '步数', val: last ? last.steps : null, unit: '步' },
      { label: '静息心率', val: last ? last.heartRate : null, unit: 'bpm' },
      { label: '睡眠时长', val: last && last.sleep != null ? last.sleep : null, unit: 'h' },
      { label: '活动消耗', val: last ? last.calBurn : null, unit: 'kcal' }
    ];
    $('#bandGrid').innerHTML = last ? cards.map(function (c) {
      return '<div class="band-item"><div class="bi-num">' + (c.val != null ? c.val : '--') + '<small>' + c.unit + '</small></div><div class="bi-label">' + c.label + '</div></div>';
    }).join('') + '<div class="band-item"><div class="bi-num" style="font-size:16px">' + last.date.slice(5) + '</div><div class="bi-label">最近记录日期</div></div>' : '<div class="empty-mini" style="grid-column:1/-1">暂无手环数据，点右上角录入（数据来自华为运动健康App）</div>';
    this.renderBandChart(data);
  },
  renderBandChart: function (data) {
    try {
      if (typeof Chart === 'undefined') return;
      if (this.bandChart) this.bandChart.destroy();
      var ctx = $('#bandChart'); if (!ctx || data.length === 0) return;
      var recent = data.slice(-14);
      this.bandChart = new Chart(ctx, {
        type: 'line',
        data: { labels: recent.map(function (d) { return fmtDate(d.date); }), datasets: [
          { label: '步数', data: recent.map(function (d) { return d.steps; }), borderColor: '#ef4444', backgroundColor: '#ef444422', yAxisID: 'y', tension: 0.35 },
          { label: '心率', data: recent.map(function (d) { return d.heartRate; }), borderColor: '#06b6d4', backgroundColor: '#06b6d422', yAxisID: 'y1', tension: 0.35 }
        ] },
        options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { position: 'bottom' } }, scales: { y: { type: 'linear', position: 'left', title: { display: true, text: '步数' } }, y1: { type: 'linear', position: 'right', title: { display: true, text: '心率' }, grid: { drawOnChartArea: false } } } }
      });
    } catch (e) { console.error('图表渲染失败:', e); }
  },
  addBand: function () {
    var self = this;
    var last = Store.get('bandData', []).slice(-1)[0] || {};
    openModal('录入华为手环数据',
      '<div class="field"><label>日期</label><input type="date" id="ba-date" value="' + today() + '" /></div>' +
      '<div class="field-row-3"><div class="field"><label>步数</label><input type="number" id="ba-steps" value="' + (last.steps || '') + '" placeholder="如：8000" /></div><div class="field"><label>静息心率(bpm)</label><input type="number" id="ba-hr" value="' + (last.heartRate || '') + '" /></div><div class="field"><label>睡眠(小时)</label><input type="number" step="0.1" id="ba-sleep" value="' + (last.sleep || '') + '" /></div></div>' +
      '<div class="field"><label>活动消耗(kcal)</label><input type="number" id="ba-cal" value="' + (last.calBurn || '') + '" /></div>' +
      '<div class="hint">打开华为运动健康 App，把首页数据填入即可。</div>',
      '<button class="btn" data-action="modal-cancel">取消</button><button class="btn primary" id="ba-save">保存</button>',
      function () {
        $('#ba-save').onclick = function () {
          var obj = { id: uid(), date: $('#ba-date').value, steps: +$('#ba-steps').value || null, heartRate: +$('#ba-hr').value || null, sleep: +$('#ba-sleep').value || null, calBurn: +$('#ba-cal').value || null };
          if (obj.steps == null && obj.heartRate == null && obj.sleep == null && obj.calBurn == null) { toast('至少填一项'); return; }
          var d = Store.get('bandData', []);
          d.push(obj); d.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
          Store.set('bandData', d); closeModal(); self.renderBand(); toast('已录入');
        };
      });
  }
};

/* ---------- 导入导出（v2 格式，含布局） ---------- */
function importFromText(jsonStr) {
  try {
    var obj = JSON.parse(jsonStr);
    if (obj && obj.v === 2 && obj.data) {
      var cur = Store.load();
      var imp = obj.data;
      var merged = 0, skipped = 0;
      for (var key in imp) {
        if (cur[key] === undefined) { cur[key] = imp[key]; merged++; }
        else if (Array.isArray(cur[key]) && Array.isArray(imp[key])) {
          var existingIds = {};
          cur[key].forEach(function(item) { if (item.id) existingIds[item.id] = true; });
          imp[key].forEach(function(item) {
            if (item.id && !existingIds[item.id]) { cur[key].push(item); existingIds[item.id] = true; merged++; }
            else { skipped++; }
          });
        } else { cur[key] = imp[key]; merged++; }
      }
      Store._cache = cur; Store.save();
      localStorage.setItem(Layout.KEY, JSON.stringify(obj.layout || Layout.defaultCfg()));
      toast('导入合并完成 ✓ 新增 ' + merged + ' 项 · 跳过 ' + skipped + ' 条重复');
    } else if (obj && typeof obj === 'object') {
      Store._cache = obj; Store.save();
      toast('导入成功（旧格式）');
    } else { toast('文件格式有误'); return; }
    location.reload();
  } catch (err) { toast('解析失败，请检查内容'); }
}

function importFromClipboard() {
  openModal('从剪贴板导入',
    '<div class="hint" style="margin-bottom:10px">复制 JSON 文件内容粘贴到下方文本框：</div>' +
    '<textarea id="import-textarea" style="width:100%;min-height:120px;border:1px solid var(--line);border-radius:8px;padding:8px;font-size:12px;font-family:monospace;resize:vertical" placeholder="将 JSON 文件内容黏贴到这里…"></textarea>',
    '<button class="btn" data-action="modal-cancel">取消</button><button class="btn primary" id="import-text-btn">导入</button>',
    function () {
      $('#import-text-btn').onclick = function () {
        var txt = $('#import-textarea').value.trim();
        if (!txt) { toast('请先粘贴内容'); return; }
        closeModal();
        importFromText(txt);
      };
    }
  );
}

function exportData() {
  var payload = { v: 2, data: Store.load(), layout: Layout.cfg };
  var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = '个人工作台_' + today() + '.json';
  a.click();
  toast('已导出备份（含自定义布局）');
}

/* ---------- 同步助手（方案D：生成/粘贴同步码，零成本） ---------- */
var Sync = {
  open: function () {
    openModal('🔗 数据同步助手',
      '<div class="seg" id="syncMode">' +
        '<button class="active" data-mode="gen">📤 生成同步码</button>' +
        '<button data-mode="paste">📥 粘贴同步码</button>' +
      '</div>' +
      '<div id="sync-gen">' +
        '<div class="hint" style="margin-bottom:8px">点「生成」得到一串同步码，复制后发到微信「文件传输助手」，再到另一台设备粘贴</div>' +
        '<button class="btn primary" id="sync-gen-btn" style="width:100%;margin-bottom:8px">🔗 生成同步码</button>' +
        '<textarea id="sync-code-out" readonly style="width:100%;min-height:120px;border:1px solid var(--line);border-radius:8px;padding:8px;font-size:11px;font-family:monospace;resize:vertical" placeholder="同步码会显示在这里…"></textarea>' +
        '<button class="btn" id="sync-copy-btn" style="width:100%;margin-top:8px">📋 复制同步码</button>' +
      '</div>' +
      '<div id="sync-paste" style="display:none">' +
        '<div class="hint" style="margin-bottom:8px">把另一台设备生成的同步码粘贴到下面，点「合并同步」——两边的记录都会保留，不会丢</div>' +
        '<textarea id="sync-code-in" style="width:100%;min-height:120px;border:1px solid var(--line);border-radius:8px;padding:8px;font-size:11px;font-family:monospace;resize:vertical" placeholder="粘贴同步码…"></textarea>' +
        '<button class="btn primary" id="sync-merge-btn" style="width:100%;margin-top:8px">🔀 合并同步</button>' +
      '</div>',
      '<button class="btn" data-action="modal-cancel">关闭</button>',
      function () {
        /* 模式切换 */
        $('#syncMode').querySelectorAll('button').forEach(function (b) {
          b.onclick = function () {
            $('#syncMode').querySelectorAll('button').forEach(function (x) { x.classList.remove('active'); });
            b.classList.add('active');
            $('#sync-gen').style.display = b.dataset.mode === 'gen' ? '' : 'none';
            $('#sync-paste').style.display = b.dataset.mode === 'paste' ? '' : 'none';
          };
        });
        /* 生成 */
        $('#sync-gen-btn').onclick = function () {
          var code = Sync.encode(Store.load());
          $('#sync-code-out').value = code;
          toast('已生成，共 ' + code.length + ' 字符');
        };
        $('#sync-copy-btn').onclick = function () {
          var ta = $('#sync-code-out');
          if (!ta.value) { toast('请先生成同步码'); return; }
          ta.select(); document.execCommand('copy');
          toast('✅ 已复制，去微信发给另一台设备吧');
        };
        /* 合并 */
        $('#sync-merge-btn').onclick = function () {
          var code = $('#sync-code-in').value.trim();
          if (!code) { toast('请先粘贴同步码'); return; }
          var ok = Sync.merge(code);
          if (ok) { closeModal(); toast('✅ 同步完成！'); setTimeout(function () { location.reload(); }, 800); }
        };
      }
    );
  },
  /* 编码：数据 → JSON → 压缩 → 短码 */
  encode: function (data) {
    var json = JSON.stringify({ v: 2, ts: Date.now(), data: data });
    if (typeof LZString !== 'undefined' && LZString.compressToEncodedURIComponent) {
      return 'LZ.' + LZString.compressToEncodedURIComponent(json);
    }
    return 'B64.' + btoa(unescape(encodeURIComponent(json)));
  },
  /* 解码：短码 → 数据对象 */
  decode: function (code) {
    code = code.trim();
    if (code.indexOf('LZ.') === 0) {
      return JSON.parse(LZString.decompressFromEncodedURIComponent(code.slice(3)));
    }
    if (code.indexOf('B64.') === 0) {
      return JSON.parse(decodeURIComponent(escape(atob(code.slice(4)))));
    }
    return JSON.parse(code);
  },
  /* 合并：把同步码里的数据合并进本地（记录保留、不丢任何一条） */
  merge: function (code) {
    try {
      var obj = this.decode(code);
      if (!obj || !obj.data) { toast('同步码无效'); return false; }
      var cur = Store.load();
      var imp = obj.data;
      var merged = 0, skipped = 0;
      for (var key in imp) {
        if (cur[key] === undefined) {
          cur[key] = imp[key]; merged++;
        } else if (Array.isArray(cur[key]) && Array.isArray(imp[key])) {
          var existingIds = {};
          cur[key].forEach(function (item) { if (item && item.id) existingIds[item.id] = true; });
          imp[key].forEach(function (item) {
            if (item && item.id && !existingIds[item.id]) {
              cur[key].push(item);
              existingIds[item.id] = true;
              merged++;
            } else { skipped++; }
          });
        } else if (typeof cur[key] === 'object' && cur[key] !== null && typeof imp[key] === 'object' && imp[key] !== null && !Array.isArray(imp[key])) {
          /* 对象（如 dietGoals/userProfile）：浅合并，远端新值优先 */
          var before = JSON.stringify(cur[key]);
          for (var k2 in imp[key]) { cur[key][k2] = imp[key][k2]; }
          if (JSON.stringify(cur[key]) !== before) merged++;
        } else {
          cur[key] = imp[key]; merged++;
        }
      }
      Store._cache = cur; Store.save();
      return true;
    } catch (e) {
      console.error('同步失败', e);
      toast('⚠ 同步失败：' + (e.message || '数据格式有误'));
      return false;
    }
  }
};

/* ====================================================================
   健康档案模块
   —— 长期状况（终身生效）+ 短期状况（临时生效）
   —— 基于规则库生成「今日饮食建议」
   ==================================================================== */
var HEALTH_RULES = {
  '鼻炎': { icon: '🤧', good: ['橙子、猕猴桃、草莓（维C水果）', '生姜、红枣、桂圆（温性）', '姜茶'], bad: ['辣椒、花椒（辛辣）', '冰饮、冰淇淋（生冷）', '虾、蟹、贝、海鱼、海参（海鲜类）'] },
  '肠胃敏感': { icon: '🫃', good: ['小米粥、山药粥、瘦肉粥（易消化）', '山药、南瓜、蒸胡萝卜（蒸煮）'], bad: ['冰可乐、冰水（冷饮）', '炸鸡、油条（油腻）', '辣椒、火锅（辛辣）', '糯米、粽子（难消化）'] },
  '失眠': { icon: '😴', good: ['小米', '牛奶', '香蕉', '莲子'], bad: ['咖啡', '浓茶、红茶（茶多酚）', '晚餐过饱'] },
  '怕冷': { icon: '🧊', good: ['生姜', '羊肉', '红枣', '桂圆'], bad: ['冰饮料', '西瓜、凉拌菜（生冷瓜果）'] },
  '外痔疮': { icon: '🩸', good: ['西蓝花、菠菜、芹菜（高纤维）', '火龙果', '蜂蜜水'], bad: ['辣椒、麻辣烫（辛辣）', '白酒、啤酒（酒精）', '久坐后立即如厕'] },
  '眼睛干': { icon: '👀', good: ['胡萝卜', '蓝莓', '菠菜', '三文鱼、鲭鱼（深海鱼）'], bad: ['辣椒', '咖啡超2杯'] },
  '眼睛疼': { icon: '🔥', good: ['蓝莓', '枸杞', '菊花茶'], bad: ['炸鸡、薯条（油炸）', '辣椒', '长时间盯屏'] },
  '舌苔厚重': { icon: '👅', good: ['冬瓜', '薏米', '白萝卜', '绿茶'], bad: ['红烧肉、炸鸡（油腻）', '蛋糕、奶茶（甜食）', '白酒、啤酒（酒精）'] },
  '舌苔齿痕': { icon: '🦷', good: ['红豆薏米', '山药', '南瓜'], bad: ['冰淇淋、冷饮（生冷）', '西瓜、苦瓜（寒凉瓜果）'] }
};

/* 根据身高体重年龄性别计算每组30天个性化目标值 */
function computeGroupTargets() {
  var p = Store.get('userProfile', {}) || {};
  var h = +p.height || 165;
  var gender = p.gender || '女';
  var age = p.birthYear ? (new Date().getFullYear() - p.birthYear) : 30;
  /* 体重：取最近一次体测 */
  var bodyAll = Store.get('bodyData', []) || [];
  var weight = 55; /* 默认 */
  var bodyFat = 0;
  for (var i = bodyAll.length - 1; i >= 0; i--) {
    if (bodyAll[i].weight) { weight = +bodyAll[i].weight; break; }
  }
  for (var j = bodyAll.length - 1; j >= 0; j--) {
    if (bodyAll[j].bodyFat) { bodyFat = +bodyAll[j].bodyFat; break; }
  }
  /* BMR（Katch-McArdle 用去脂体重；Mifflin 用身高体重兜底） */
  var bmr = 0;
  if (bodyFat > 0) {
    var lbm = weight * (1 - bodyFat / 100);
    bmr = 370 + 21.6 * lbm;
  } else {
    bmr = (gender === '男')
      ? 10 * weight + 6.25 * h - 5 * age + 5
      : 10 * weight + 6.25 * h - 5 * age - 161;
  }
  var dailyKcal = Math.round(bmr * 1.35); /* 轻活动系数 */
  /* 各营养素 30 天目标（基于 RDA + 个性化调整） */
  var ironDay = (gender === '女' && age < 50) ? 18 : 8; /* 女性绝经前 18mg */
  var fiberDay = weight * 0.5; /* 0.5g/kg 体重 */
  return {
    weight: weight, height: h, age: age, bodyFat: bodyFat,
    bmr: Math.round(bmr), dailyKcal: dailyKcal,
    targets: {
      eyes: weight * 30,        /* 护眼食物建议日均 1g/kg → 30天克重 */
      iron: ironDay * 30,        /* 铁 mg */
      vitc: 100 * 30,             /* 维C mg */
      calcium: gender === '女' && age >= 50 ? 1200 * 30 : 1000 * 30, /* 钙 mg */
      fiber: Math.round(fiberDay) * 30  /* 纤维 g */
    }
  };
}

/* 替代组：功效相近、可选其一的食物 */
var ALT_GROUPS = [
  { id: 'eyes', name: '👀 护眼组', items: ['蓝莓', '枸杞', '胡萝卜', '菊花茶', '菠菜'] },
  { id: 'iron', name: '🩸 补铁组', items: ['菠菜', '黑木耳', '猪肝', '红枣', '瘦肉'] },
  { id: 'vitc', name: '🤧 维C组', items: ['橙子', '猕猴桃', '草莓', '番茄', '甜椒'] },
  { id: 'calcium', name: '🥛 钙质组', items: ['牛奶', '豆腐', '芝麻', '小鱼干', '酸奶'] },
  { id: 'fiber', name: '� 纤维组', items: ['西蓝花', '芹菜', '燕麦', '红薯', '糙米', '白萝卜', '莲藕', '玉米', '麸皮', '粗粮', '杂粮'] },
  { id: 'sleep', name: '😴 助眠组', items: ['牛奶', '香蕉', '莲子'] }
];

/* 各组食物的营养素含量（每100g） */
var GROUP_NUTRI = {
  eyes: { '蓝莓': 0, '枸杞': 0, '胡萝卜': 0, '菊花茶': 0, '菠菜': 0 },
  iron: { '菠菜': 2.9, '黑木耳': 97, '猪肝': 22, '红枣': 2.3, '瘦肉': 3 },
  vitc: { '橙子': 53, '猕猴桃': 62, '草莓': 47, '番茄': 19, '甜椒': 72 },
  calcium: { '牛奶': 104, '豆腐': 164, '芝麻': 780, '小鱼干': 880, '酸奶': 118 },
  fiber: { '西蓝花': 1.6, '芹菜': 1.4, '燕麦': 10, '红薯': 1.6, '糙米': 3.4, '白萝卜': 1.6, '莲藕': 2.2, '玉米': 2.9, '麸皮': 42, '粗粮': 5, '杂粮': 5 }
};

/* 通用健康食材池（100种内，按类别）——扩大"值得一试"候选，不依赖健康档案登记 */
var COMMON_GOOD_FOODS = [
  /* 优质蛋白 */
  '鸡蛋', '鸡胸肉', '瘦牛肉', '三文鱼', '鲭鱼', '鳕鱼', '虾', '豆腐', '豆浆', '鹰嘴豆', '扁豆', '猪里脊', '虾仁',
  /* 蔬菜 */
  '西蓝花', '菠菜', '芹菜', '胡萝卜', '番茄', '黄瓜', '冬瓜', '南瓜', '山药', '白萝卜', '莲藕', '芦笋', '紫甘蓝', '油菜', '生菜', '油麦菜', '娃娃菜', '苦瓜', '丝瓜', '茄子', '菌菇', '香菇', '金针菇', '木耳', '海带', '紫菜',
  /* 粗粮碳水 */
  '燕麦', '糙米', '小米', '藜麦', '红薯', '紫薯', '玉米', '荞麦', '薏米', '全麦面包',
  /* 水果（温和型为主） */
  '苹果', '梨', '蓝莓', '草莓', '猕猴桃', '橙子', '柚子', '木瓜', '香蕉', '火龙果', '葡萄', '樱桃', '桃子', '李子',
  /* 坚果种子 */
  '核桃', '杏仁', '腰果', '花生', '芝麻', '南瓜籽', '亚麻籽',
  /* 豆类 */
  '红豆', '绿豆', '黑豆', '黄豆',
  /* 茶饮滋补 */
  '红枣', '枸杞', '桂圆', '姜茶', '菊花茶', '绿茶', '蜂蜜', '莲子', '百合', '银耳',
  /* 优质脂肪 */
  '橄榄油', '牛油果', '深海鱼油'
];

/* 通用食材池的"温和属性"：标记哪些适合体质敏感（如脾胃虚弱） */
var FOOD_MILD = {
  '苹果': 1, '梨': 1, '南瓜': 1, '山药': 1, '小米': 1, '燕麦': 1, '红薯': 1, '胡萝卜': 1, '白萝卜': 1, '冬瓜': 1,
  '西蓝花': 1, '菠菜': 1, '豆腐': 1, '鸡蛋': 1, '鲈鱼': 1, '莲藕': 1, '银耳': 1, '百合': 1, '莲子': 1, '红枣': 1
};

var Health = {
  render: function () { this.renderAdvice(); this.renderLong(); this.renderHabitsList(); this.renderShort(); },
  renderLong: function () {
    var list = Store.get('healthLongTerm', []);
    var box = $('#healthLongList');
    if (!box) return;
    if (!list.length) { box.innerHTML = '<div class="empty-mini">还没有登记长期状况，点右上角「＋ 添加」</div>'; return; }
    box.innerHTML = list.map(function (h) {
      var rule = HEALTH_RULES[h.name];
      var ex = Store.get('healthExcludes', []).filter(function (x) { return x.longId === h.id; });
      return '<div class="health-item">' +
        '<div class="hi-head"><span class="hi-icon">' + (rule ? rule.icon : '📌') + '</span><b>' + escape(h.name) + '</b>' +
        '<span class="hi-tag">长期</span><div class="hi-ops">' +
        '<button class="dh-op" data-action="health-exclude" data-id="' + h.id + '" title="管理排除项">🚫</button>' +
        '<button class="dh-op del" data-action="del-health-long" data-id="' + h.id + '" title="删除">🗑</button>' +
        '</div></div>' +
        '<div class="hi-body">' +
        (rule ? '<div class="hi-row good">🤍 建议：' + escape(rule.good.join('、')) + '</div>' +
          '<div class="hi-row bad">🚫 忌口：' + escape(rule.bad.join('、')) + '</div>' : '<div class="hint">自定义状况，仅记录</div>') +
        (ex.length ? '<div class="hi-row exclude">❌ 已排除：' + escape(ex.map(function (x) { return x.name; }).join('、')) + '</div>' : '') +
        '</div></div>';
    }).join('');
  },
  renderShort: function () {
    var list = Store.get('healthShortTerm', []);
    var box = $('#healthShortList');
    if (!box) return;
    if (!list.length) { box.innerHTML = '<div class="empty-mini">没有短期状况。感冒、上火、过敏等临时情况可在这里登记</div>'; return; }
    var todayS = today();
    box.innerHTML = list.map(function (h) {
      var daysLeft = daysBetween(todayS, h.endDate);
      var expired = daysLeft < 0;
      var ex = Store.get('healthExcludes', []).filter(function (x) { return x.shortId === h.id; });
      return '<div class="health-item ' + (expired ? 'expired' : '') + '">' +
        '<div class="hi-head"><span class="hi-icon">🤒</span><b>' + escape(h.name) + '</b>' +
        '<span class="hi-tag ' + (expired ? 'exp' : '') + '">' + (expired ? '已到期' : '剩 ' + (daysLeft + 1) + ' 天') + '</span>' +
        '<div class="hi-ops">' +
        (expired ? '<button class="dh-op" data-action="health-long-done" data-id="' + h.id + '" title="已好转，关闭">✅ 好了</button>' : '<button class="dh-op" data-action="health-close-short" data-id="' + h.id + '" title="提前结束">⏹ 结束</button>') +
        '<button class="dh-op del" data-action="del-health-short" data-id="' + h.id + '" title="删除">🗑</button>' +
        '</div></div>' +
        '<div class="hi-body">' +
        '<div class="hi-row">📅 ' + h.startDate + ' ~ ' + h.endDate + '</div>' +
        (h.symptom ? '<div class="hi-row">🧩 症状：' + escape(h.symptom) + '</div>' : '') +
        (h.medicine ? '<div class="hi-row">💊 用药：' + escape(h.medicine) + '</div>' : '') +
        (h.bad ? '<div class="hi-row bad">🚫 忌口：' + escape(h.bad) + '</div>' : '') +
        (h.note ? '<div class="hi-row">📝 ' + escape(h.note) + '</div>' : '') +
        '</div></div>';
    }).join('');
  },
  /* 今日饮食建议 */
  renderAdvice: function () {
    var box = $('#healthAdvice') || $('#dietAdvice');
    var box2 = ($('#healthAdvice') && $('#dietAdvice')) ? $('#dietAdvice') : null;
    if (!box) return;
    var lines = [];
    var longs = Store.get('healthLongTerm', []);
    var shorts = Store.get('healthShortTerm', []);
    var excludes = Store.get('healthExcludes', []);
    var t = today();

    /* 长期状况提醒：从30天吃过的食物里分类"多吃/少吃"
       —— 内容都是你吃过的，对你好→多买多次；对你不好→吃完就不买 */
    var d30 = new Date(); d30.setDate(d30.getDate() - 29);
    var d30Str = d30.getFullYear() + '-' + pad2(d30.getMonth() + 1) + '-' + pad2(d30.getDate());
    var countMap = {};
    Store.get('diet', []).forEach(function (d) {
      if (!d.date || d.date < d30Str) return;
      countMap[d.name] = (countMap[d.name] || 0) + 1;
    });
    var eatenSet = Object.keys(countMap);

    /* 汇总规则 */
    var allGood = [], allBad = [];
    longs.forEach(function (h) {
      var rule = HEALTH_RULES[h.name];
      if (!rule) return;
      allGood = allGood.concat(rule.good);
      allBad = allBad.concat(rule.bad);
    });
    /* 排除项 + 习惯 → 不参与分类（已在喝的不用提醒） */
    var exNames = excludes.map(function (x) { return x.name; });
    var habitNames2 = Store.get('healthHabits', []).map(function (h) { return h.name; });
    var inHabits = function (g) {
      return habitNames2.some(function (hn) {
        if (hn.indexOf(g) !== -1 || g.indexOf(hn) !== -1) return true;
        if (g.length >= 2) {
          var chars = g.split('');
          return chars.every(function (c) { return hn.indexOf(c) !== -1; });
        }
        return false;
      });
    };
    var isExcluded = function (g) { return exNames.indexOf(g) !== -1 || inHabits(g); };

    /* 匹配某食物名是否命中关键词列表 */
    var matched = function (food, words) {
      return words.some(function (w) {
        w = w.replace(/[（(].*?[)）]/g, '').trim();
        if (!w) return false;
        /* 正向包含：食物名包含关键词才算（"胡萝卜丝炒肉"→胡萝卜 ✓）
           去掉反向（"萝卜"→胡萝卜 ✗ 误判） */
        if (food.indexOf(w) === -1) return false;
        /* 特例：麸皮不算燕麦 */
        if (w === '燕麦' && food.indexOf('麸皮') !== -1) return false;
        return true;
      });
    };
    /* 从"吃过的食物"中分类（不是从规则词推荐！） */
    var goodEaten = [], badEaten = [];
    eatenSet.forEach(function (f) {
      if (isExcluded(f)) return;
      if (matched(f, allBad)) {
        badEaten.push({ name: f, count: countMap[f] });
      } else if (matched(f, allGood)) {
        goodEaten.push({ name: f, count: countMap[f] });
      }
    });
    /* 按次数排序：吃得多排前面 */
    goodEaten.sort(function (a, b) { return b.count - a.count; });
    badEaten.sort(function (a, b) { return b.count - a.count; });
    /* 两个分类固定显示，没内容就标题后面为空 */
    lines.push({ icon: '✅', kind: 'good', text: '可以多吃：' + (goodEaten.length ? goodEaten.slice(0, 5).map(function (x) { return x.name + '（' + x.count + '次）'; }).join('、') : '') });
    lines.push({ icon: '❌', kind: 'bad', text: '建议少吃：' + (badEaten.length ? badEaten.slice(0, 5).map(function (x) { return x.name + '（' + x.count + '次）'; }).join('、') + '——吃完就不买了' : '') });

    /* 短期状况提醒：不显示病症名，只显示忌口 */
    shorts.forEach(function (h) {
      if (h.endDate < t) return; /* 已过期不再提醒 */
      var daysLeft = daysBetween(t, h.endDate);
      var parts = [];
      if (h.bad) parts.push('忌口：' + h.bad);
      if (h.medicine) parts.push('用药中：' + h.medicine);
      lines.push({ icon: '⏳', kind: 'bad', text: '近期注意（剩' + (daysLeft + 1) + '天）：' + (parts.join(' · ') || '好好休息') });
    });

    /* 结合今天的饮食记录：检测是否吃了忌口（简单关键词匹配） */
    var diet = Store.get('diet', []).filter(function (d) { return d.date === t; });
    if (diet.length) {
      var eaten = diet.map(function (d) { return d.name; }).join(' ');
      var allBad = [];
      longs.forEach(function (h) { var r = HEALTH_RULES[h.name]; if (r) allBad = allBad.concat(r.bad); });
      shorts.forEach(function (h) { if (h.endDate >= t && h.bad) allBad.push(h.bad); });
      var hit = allBad.filter(function (b) { return eaten.indexOf(b.replace(/[、，。]/g, '')) !== -1 || eaten.indexOf(b) !== -1; });
      if (hit.length) {
        lines.push({ icon: '⚠️', text: '今天吃的东西里有忌口提醒项：' + hit.join('、') + '，注意一下哦' });
      }
    }

    /* ===== 新增：30天食物采购分析 ===== */
    var purchaseHtml = this.renderPurchase();

    var html;
    if (!lines.length && !purchaseHtml) {
      html = '<div class="advice-empty">🎉 今日暂无特别提醒，吃好喝好～<br><span class="hint">在「🏥 健康档案」登记身体状况后，这里会自动生成建议</span></div>';
    } else {
      html = lines.map(function (l, i) {
        var cls = l.kind === 'good' ? ' good' : (l.kind === 'bad' ? ' bad' : '');
        return '<div class="advice-line' + cls + '">' +
          '<span class="al-ic">' + l.icon + '</span><span class="al-text">' + l.text + '</span></div>';
      }).join('') + purchaseHtml;
    }
    box.innerHTML = html;
    if (box2) box2.innerHTML = html;
  },
  /* ===== 30天食物采购分析（吃得多=买得多） ===== */
  renderPurchase: function () {
    var longs = Store.get('healthLongTerm', []);
    var shorts = Store.get('healthShortTerm', []);
    var excludes = Store.get('healthExcludes', []);
    var t = today();
    var d30 = new Date(); d30.setDate(d30.getDate() - 29);
    var d30Str = d30.getFullYear() + '-' + pad2(d30.getMonth() + 1) + '-' + pad2(d30.getDate());

    /* 统计最近30天每种食物吃了多少次 */
    var countMap = {};
    Store.get('diet', []).forEach(function (d) {
      if (!d.date || d.date < d30Str) return;
      countMap[d.name] = (countMap[d.name] || 0) + 1;
    });
    var eatenList = Object.keys(countMap); /* 30天内吃过的所有食物名 */

    /* 我的习惯：常吃/常喝的也算"已有"，不重复推荐 */
    var habits = Store.get('healthHabits', []);
    var habitNames = habits.map(function (h) { return h.name; });

    /* 汇总所有长期/短期状况的规则 */
    var allGood = [], allBad = [];
    longs.forEach(function (h) { var r = HEALTH_RULES[h.name]; if (r) { allGood = allGood.concat(r.good); allBad = allBad.concat(r.bad); } });
    shorts.forEach(function (h) { if (h.endDate >= t && h.bad) allBad = allBad.concat(h.bad.split(/[、，,]/)); });
    /* 用户排除项：从 good 里移除（永不推荐） */
    var exNames = excludes.map(function (x) { return x.name; });
    allGood = allGood.filter(function (g) { return exNames.indexOf(g) === -1; });

    /* 匹配：判断某食物名是否命中关键词列表（仅正向包含，避免"萝卜"误判"胡萝卜"） */
    var matched = function (food, words) {
      return words.some(function (w) {
        w = w.replace(/[（(].*?[)）]/g, '').trim(); /* 去掉括号注释 */
        if (!w) return false;
        if (food.indexOf(w) === -1) return false;
        /* 特例：麸皮不算燕麦 */
        if (w === '燕麦' && food.indexOf('麸皮') !== -1) return false;
        return true;
      });
    };
    /* 拆字匹配：习惯名里能拆出来的食材都算已有（用于子词级排除） */
    var inHabits = function (g) {
      return habitNames.some(function (hn) {
        if (hn.indexOf(g) !== -1 || g.indexOf(hn) !== -1) return true;
        if (g.length >= 2) {
          var chars = g.split('');
          return chars.every(function (c) { return hn.indexOf(c) !== -1; });
        }
        return false;
      });
    };
    var isExcluded = function (g) { return exNames.indexOf(g) !== -1 || inHabits(g); };
    /* 我的习惯里常吃的：从 good 里移除（已在喝/已常吃，不再推荐）
       —— 用"拆字匹配"：习惯名里能拆出来的食材都算已有
         例：习惯"红枣生姜枸杞茶" → 红枣✓ 生姜✓ 姜茶(姜+茶都在)✓ 枸杞✓ */
    if (habitNames.length) {
      allGood = allGood.filter(function (g) {
        return !habitNames.some(function (hn) {
          if (hn.indexOf(g) !== -1 || g.indexOf(hn) !== -1) return true;
          if (g.length >= 2) {
            var chars = g.split('');
            return chars.every(function (c) { return hn.indexOf(c) !== -1; });
          }
          return false;
        });
      });
    }

    var buyGood = [];   /* 🟢 值得多买：对你好且最近吃过 */
    var badEaten = [];  /* 🔴 忌口但最近吃过了 */
    var tryNew = [];    /* 🆕 没吃过但对你好 */
    var lowStock = [];  /* 🚨 库存快没了 */

    /* 食材库库存：用于"值得多买=有货可吃 / 值得一试=没货建议买" */
    var lib = Store.get('foodLib', []);

    eatenList.forEach(function (f) {
      if (matched(f, allBad)) {
        badEaten.push({ name: f, count: countMap[f] });
      } else if (matched(f, allGood)) {
        /* 只有"仓库有货"才进值得多买（能吃到） */
        var hasStock = lib.some(function (lf) { return (lf.stock || 0) > 0 && matched(lf.name, [f]); });
        if (hasStock) buyGood.push({ name: f, count: countMap[f] });
      }
    });
    /* 没吃过/没库存的推荐：把 allGood 按"、,，"拆成子词，子词单独判断 */
    var splitItems = function (s) {
      return s.split(/[、，,]/).map(function (x) { return x.replace(/[（(].*?[)）]/g, '').trim(); }).filter(function (x) { return x.length > 0; });
    };
    /* 候选池：通用食材池 + 规则词（合并去重），过滤排除项/习惯/限制/已吃/有货 */
    var habitRestricts = [];
    habits.forEach(function (hb) { if (hb.restrict) habitRestricts.push(hb.restrict); });
    var restricted = function (food) {
      return habitRestricts.some(function (r) {
        return r.split(/[、，,;；]/).some(function (w) {
          w = w.replace(/[（(].*?[)）]/g, '').trim();
          if (!w) return false;
          return food.indexOf(w) !== -1 || w.indexOf(food) !== -1;
        });
      });
    };
    /* 规则词候选（原有的） */
    allGood.forEach(function (g) {
      splitItems(g).forEach(function (sub) {
        if (isExcluded(sub)) return;
        if (inHabits(sub)) return;
        if (restricted(sub)) return;
        var inStock = lib.some(function (lf) { return (lf.stock || 0) > 0 && matched(lf.name, [sub]); });
        if (inStock) return;
        if (tryNew.indexOf(sub) === -1) tryNew.push(sub);
      });
    });
    /* 通用食材池候选（补充：未出现在规则里但营养好，且没被限制） */
    COMMON_GOOD_FOODS.forEach(function (f) {
      if (tryNew.indexOf(f) !== -1) return;
      if (isExcluded(f)) return;
      if (inHabits(f)) return;
      if (restricted(f)) return;
      var inStock = lib.some(function (lf) { return (lf.stock || 0) > 0 && matched(lf.name, [f]); });
      if (inStock) return;
      /* 已吃过的就不再"值得一试"（转为值得多买），但30天没吃过才推荐 */
      if (eatenList.some(function (e) { return matched(e, [f]); })) return;
      tryNew.push(f);
    });
    /* 低库存提醒：有货但低于阈值（stockLow） */
    lib.forEach(function (lf) {
      var s = lf.stock || 0;
      var low = lf.stockLow || 0;
      if (s > 0 && low > 0 && s <= low) {
        lowStock.push(lf.name + '（剩' + s + 'g）');
      }
    });
    /* ===== 营养分类摄入统计（5组） =====
       统计30天内每组食物吃了多少次 → 显示吃得好/吃少了/没吃
       吃得少的组 → 其食物优先排进"值得一试" */
    var altGroupsActive = ALT_GROUPS.filter(function (g) { return g.id !== 'sleep'; });
    var needs = computeGroupTargets();
    var groupTargets = needs.targets;
    var diet30 = Store.get('diet', []).filter(function (d) { return d.date && d.date >= d30Str; });
    var groupStats = altGroupsActive.map(function (grp) {
      var items = grp.items.filter(function (it) {
        if (isExcluded(it)) return false;
        if (inHabits(it)) return false;
        if (restricted(it)) return false;
        return true;
      });
      var target = groupTargets[grp.id] || 0;
      /* 统计30天内该组每种食物吃了多少克 + 营养素 */
      var eaten = [];
      var totalG = 0;
      var totalNutri = 0;
      var isWeight = (grp.id === 'eyes'); /* 护眼组用克重，其他用营养素 */
      var nutriTable = GROUP_NUTRI[grp.id] || {};
      items.forEach(function (it) {
        var g = 0;
        var dishList = [];
        diet30.forEach(function (d) {
          if (matched(d.name, [it])) {
            g += (+d.amount || 0);
            if (dishList.indexOf(d.name) === -1) dishList.push(d.name);
          }
        });
        if (g > 0) {
          var n = isWeight ? g : (g / 100) * (nutriTable[it] || 0);
          eaten.push({ name: it, gram: g, dishes: dishList });
          totalG += g;
          totalNutri += n;
        }
      });
      eaten.sort(function (a, b) { return b.gram - a.gram; });
      var actual = isWeight ? totalG : totalNutri;
      var pct = target > 0 ? Math.round(actual / target * 100) : 0;
      var level = pct >= 85 ? 'good' : (pct >= 40 ? 'low' : 'none');
      return { id: grp.id, name: grp.name, items: items, eaten: eaten, totalG: totalG, actual: actual, target: target, unit: isWeight ? 'g' : (grp.id === 'fiber' ? 'g' : 'mg'), pct: pct, level: level, isWeight: isWeight };
    });

    /* ===== 其他食物：未归入5组的（如实显示，不参与营养评判） =====
       复合调味食物（凉皮卷/汉堡/麻辣烫等一份不明量的）跳过不显示 */
    var COMPOSITE_FOODS = ['凉皮', '卷', '汉堡', '披萨', '三明治', '麻辣烫', '盖浇', '炒饭', '盒饭', '套餐', '米线', '螺蛳粉', '外卖', '快餐', '料理包', '预制菜', '火锅', '烧烤', '串', '拌饭', '便当', '蛋糕', '奶茶', '零食', '饼干', '薯片', '糖果', '冰淇淋'];
    var otherFoods = [];
    var eatenAllNames = {}; /* 已归组的食物名（含原菜名） */
    groupStats.forEach(function (gs) {
      gs.eaten.forEach(function (e) {
        e.dishes.forEach(function (dn) { eatenAllNames[dn] = true; });
      });
    });
    diet30.forEach(function (d) {
      if (eatenAllNames[d.name]) return;
      if (COMPOSITE_FOODS.some(function (cf) { return d.name.indexOf(cf) !== -1; })) return; /* 复合食物跳过 */
      var existing = otherFoods.find(function (o) { return o.name === d.name; });
      if (existing) existing.gram += (+d.amount || 0);
      else otherFoods.push({ name: d.name, gram: (+d.amount || 0) });
    });
    otherFoods.sort(function (a, b) { return b.gram - a.gram; });

    /* 吃得少的组 → 其未吃过的食物优先进入值得一试 */
    var weakFoods = [];
    groupStats.forEach(function (gs) {
      if (gs.level !== 'good') {
        gs.items.forEach(function (it) {
          if (weakFoods.indexOf(it) === -1) weakFoods.push(it);
        });
      }
    });
    tryNew.sort(function (a, b) {
      var aw = weakFoods.indexOf(a) !== -1 ? 0 : 1;
      var bw = weakFoods.indexOf(b) !== -1 ? 0 : 1;
      return aw - bw;
    });

    /* 渲染摄入统计（5组卡片已取消，仅保留计算用于弱组优先推荐） */
    var statHtml = '';
    /* 搭配提示：优先用仓库里有货/吃过的食材找搭配 */
    var pairs = Store.get('foodPairs', []);
    var pairHits = [];
    var eatenOrStock = function (name) {
      return eatenList.some(function (f) { return matched(f, [name]); }) ||
        lib.some(function (lf) { return (lf.stock || 0) > 0 && matched(lf.name, [name]); });
    };
    pairs.forEach(function (p) {
      if (eatenOrStock(p.a) && eatenOrStock(p.b) && pairHits.length < 3) pairHits.push(p);
    });

    var html = '';
    var hasAny = buyGood.length || badEaten.length || tryNew.length || lowStock.length || statHtml;
    if (hasAny) {
      html += '<div class="advice-sec-title">🛒 食物采购顾问 <span class="hint">（基于30天记录+库存）</span>' +
        (tryNew.length > 4 ? '<button class="btn sm alt-btn" data-action="rec-shuffle" style="float:right">🔄 换一批</button>' : '') +
        '<div style="clear:both"></div></div>';
      html += statHtml;
      if (lowStock.length) {
        html += '<div class="advice-line warn"><span class="al-ic">🚨</span><span class="al-text"><b>库存快没了，该补货：</b>' +
          lowStock.join('、') + '</span></div>';
      }
      if (badEaten.length) {
        html += '<div class="advice-line warn"><span class="al-ic">🔴</span><span class="al-text"><b>忌口却常吃：</b>' +
          badEaten.slice(0, 4).map(function (x) { return x.name + '（' + x.count + '次）'; }).join('、') + '，建议逐步减少</span></div>';
      }
      if (tryNew.length) {
        /* 换一批：按偏移量轮转取4个（吃得少的组优先排前面） */
        var offset = Store.get('recOffset', 0) || 0;
        var shown = [];
        if (tryNew.length <= 4) {
          shown = tryNew;
        } else {
          for (var k = 0; k < 4; k++) shown.push(tryNew[(offset + k) % tryNew.length]);
        }
        html += '<div class="advice-line good"><span class="al-ic">🆕</span><span class="al-text"><b>值得一试（没买过，建议入手）：</b>' +
          shown.join('、') + '</span></div>';
      }
      if (pairHits.length) {
        html += '<div class="advice-sec-title">🤝 搭配建议</div>';
        pairHits.forEach(function (p) {
          html += '<div class="advice-line"><span class="al-ic">🤝</span><span class="al-text"><b>' + escape(p.a) + ' + ' + escape(p.b) + '</b>：' + escape(p.tip) + '</span></div>';
        });
      }
    }
    return html;
  },
  /* 添加长期状况 */
  addLong: function () {
    var self = this;
    var opts = Object.keys(HEALTH_RULES).map(function (k) {
      return '<option value="' + k + '">' + HEALTH_RULES[k].icon + ' ' + k + '</option>';
    }).join('');
    openModal('添加长期状况',
      '<div class="field"><label>状况类型</label><select id="hl-name">' + opts + '</select></div>' +
      '<div class="hint">登记后，健康饮食页的「今日饮食建议」会持续按规则提醒</div>',
      '<button class="btn" data-action="modal-cancel">取消</button><button class="btn primary" id="hl-save">保存</button>',
      function () {
        $('#hl-save').onclick = function () {
          var name = $('#hl-name').value;
          var list = Store.get('healthLongTerm', []);
          if (list.some(function (h) { return h.name === name; })) { toast('已登记过该状况'); return; }
          list.push({ id: uid(), name: name, added: today() });
          Store.set('healthLongTerm', list);
          closeModal(); self.render(); toast('已登记「' + name + '」');
        };
      }
    );
  },
  /* 添加短期状况 */
  addShort: function () {
    var self = this;
    var t = today();
    openModal('添加短期状况',
      '<div class="field"><label>状况名称</label><input id="hs-name" placeholder="如：感冒、上火、过敏" /></div>' +
      '<div class="field"><label>症状描述</label><input id="hs-symptom" placeholder="如：流鼻涕、嗓子疼" /></div>' +
      '<div class="field"><label>用药</label><input id="hs-medicine" placeholder="如：感冒灵颗粒" /></div>' +
      '<div class="field"><label>饮食忌口</label><input id="hs-bad" placeholder="如：辛辣、油腻、海鲜" /></div>' +
      '<div class="field-row-2"><div class="field"><label>开始日期</label><input type="date" id="hs-start" value="' + t + '" /></div>' +
      '<div class="field"><label>预计结束</label><input type="date" id="hs-end" value="' + t + '" /></div></div>' +
      '<div class="hint">到期后会自动提醒你确认是否好转，好转则关闭记录</div>',
      '<button class="btn" data-action="modal-cancel">取消</button><button class="btn primary" id="hs-save">保存</button>',
      function () {
        $('#hs-save').onclick = function () {
          var name = $('#hs-name').value.trim();
          if (!name) { toast('请填写状况名称'); return; }
          var start = $('#hs-start').value || t;
          var end = $('#hs-end').value || t;
          if (end < start) { toast('结束日期不能早于开始日期'); return; }
          var list = Store.get('healthShortTerm', []);
          list.push({ id: uid(), name: name, symptom: $('#hs-symptom').value.trim(), medicine: $('#hs-medicine').value.trim(), bad: $('#hs-bad').value.trim(), startDate: start, endDate: end });
          Store.set('healthShortTerm', list);
          closeModal(); self.render(); toast('已添加短期状况');
        };
      }
    );
  },
  delLong: function (id) {
    var self = this;
    confirmDialog('删除长期状况', '确认删除该状况？其相关饮食建议将停止提醒。', function () {
      Store.set('healthLongTerm', Store.get('healthLongTerm', []).filter(function (h) { return h.id !== id; }));
      Store.set('healthExcludes', Store.get('healthExcludes', []).filter(function (x) { return x.longId !== id; }));
      self.render(); toast('已删除');
    }, { danger: true, okText: '删除' });
  },
  delShort: function (id) {
    var self = this;
    confirmDialog('删除短期状况', '确认删除该记录？', function () {
      Store.set('healthShortTerm', Store.get('healthShortTerm', []).filter(function (h) { return h.id !== id; }));
      self.render(); toast('已删除');
    }, { danger: true, okText: '删除' });
  },
  /* 提前结束短期状况 */
  closeShort: function (id) {
    var self = this;
    confirmDialog('提前结束', '确认提前结束该短期状况？结束后不再提醒。', function () {
      var list = Store.get('healthShortTerm', []);
      var h = list.find(function (x) { return x.id === id; });
      if (h) { h.endDate = today(); Store.set('healthShortTerm', list); }
      self.render(); toast('已结束');
    }, { danger: true, okText: '结束' });
  },
  /* 到期确认"已好转" */
  doneShort: function (id) {
    var self = this;
    confirmDialog('身体状况确认', '感冒等短期状况已到期，是否已好转？', function () {
      Store.set('healthShortTerm', Store.get('healthShortTerm', []).filter(function (h) { return h.id !== id; }));
      self.render(); toast('好，已关闭该记录 🎉');
    }, { okText: '已好转' });
  },
  /* 管理排除项 */
  toggleExclude: function (longId) {
    var self = this;
    var h = Store.get('healthLongTerm', []).find(function (x) { return x.id === longId; });
    if (!h) return;
    var rule = HEALTH_RULES[h.name];
    var list = Store.get('healthExcludes', []);
    var existing = list.filter(function (x) { return x.longId === longId; }).map(function (x) { return x.name; });
    var options = rule ? rule.good.map(function (g) {
      return '<label class="ex-item"><input type="checkbox" value="' + escape(g) + '" ' + (existing.indexOf(g) !== -1 ? 'checked' : '') + ' /> ' + escape(g) + '</label>';
    }).join('') : '';
    openModal('管理排除项 · ' + h.name,
      '<div class="hint" style="margin-bottom:10px">勾选你认为不适合的食物（如过敏），将永远不会出现在饮食建议里</div>' +
      (options || '<div class="hint">该状况没有预设建议食物</div>'),
      '<button class="btn" data-action="modal-cancel">取消</button><button class="btn primary" id="hex-save">保存</button>',
      function () {
        $('#hex-save').onclick = function () {
          var checked = [];
          document.querySelectorAll('#modalBox input[type=checkbox]:checked').forEach(function (c) { checked.push(c.value); });
          var newList = list.filter(function (x) { return x.longId !== longId; });
          checked.forEach(function (v) { newList.push({ id: uid(), longId: longId, name: v }); });
          Store.set('healthExcludes', newList);
          closeModal(); self.render(); toast('已更新排除项');
        };
      }
    );
  },
  /* ===== 我的习惯（记录外的习惯性食物/茶饮） ===== */
  renderHabitsList: function () {
    var box = $('#healthHabitsList');
    if (!box) return;
    var list = Store.get('healthHabits', []);
    if (!list.length) { box.innerHTML = '<div class="empty-mini">还没有登记习惯，比如每天上午的红枣姜茶、下午的陈皮茶…点右上角「＋ 添加」</div>'; return; }
    box.innerHTML = list.map(function (hb) {
      return '<div class="health-item"><div class="hi-head"><span class="hi-icon">🍵</span>' +
        '<b>' + escape(hb.name) + '</b>' +
        (hb.time ? '<span class="hi-tag">' + escape(hb.time) + '</span>' : '') +
        '<div class="hi-ops"><button class="dh-op del" data-action="del-health-habit" data-id="' + hb.id + '" title="删除">🗑</button></div>' +
        '</div>' +
        '<div class="hi-body">' +
        (hb.restrict ? '<div class="hi-row bad">🚫 限制：' + escape(hb.restrict) + '</div>' : '') +
        (hb.note ? '<div class="hi-row">📝 ' + escape(hb.note) + '</div>' : '') +
        '</div>' +
        '</div>';
    }).join('');
  },
  addHabit: function () {
    var self = this;
    openModal('添加习惯性食物/茶饮',
      '<div class="field"><label>名称</label><input id="hh-name" placeholder="如：红枣生姜枸杞茶" /></div>' +
      '<div class="field"><label>时段</label><input id="hh-time" placeholder="如：上午 / 下午2点 / 睡前" /></div>' +
      '<div class="field"><label>忌口/限制（选填）</label><input id="hh-restrict" placeholder="如：少吃水果、生冷（这些将不再推荐）" /></div>' +
      '<div class="field"><label>备注</label><input id="hh-note" placeholder="如：每天一杯 / 天冷时喝" /></div>' +
      '<div class="hint">登记后会在「今日饮食建议」中展示，并结合健康档案给出时段建议</div>',
      '<button class="btn" data-action="modal-cancel">取消</button><button class="btn primary" id="hh-save">保存</button>',
      function () {
        $('#hh-save').onclick = function () {
          var name = $('#hh-name').value.trim();
          if (!name) { toast('请填写名称'); return; }
          var list = Store.get('healthHabits', []);
          list.push({ id: uid(), name: name, time: $('#hh-time').value.trim(), restrict: $('#hh-restrict').value.trim(), note: $('#hh-note').value.trim() });
          Store.set('healthHabits', list);
          closeModal(); self.render(); toast('已添加习惯');
        };
      }
    );
  },
  delHabit: function (id) {
    var self = this;
    confirmDialog('删除习惯', '确认删除该习惯记录？', function () {
      Store.set('healthHabits', Store.get('healthHabits', []).filter(function (h) { return h.id !== id; }));
      self.render(); toast('已删除');
    }, { danger: true, okText: '删除' });
  },
  /* 换一批：偏移量+4，重新渲染推荐 */
  shuffleRec: function () {
    var offset = (Store.get('recOffset', 0) || 0) + 4;
    Store.set('recOffset', offset);
    this.render();
    toast('已换一批推荐');
  }
};

/* 文件导入（智能合并模式） */
$('#importInput').onchange = function (e) {
  var f = e.target.files[0]; if (!f) return;
  var r = new FileReader();
  r.onload = function () {
    try {
      var obj = JSON.parse(r.result);
      if (obj && obj.v === 2 && obj.data) {
        var cur = Store.load();
        var imp = obj.data;
        var merged = 0, skipped = 0;
        for (var key in imp) {
          if (cur[key] === undefined) {
            cur[key] = imp[key]; merged++;
          } else if (Array.isArray(cur[key]) && Array.isArray(imp[key])) {
            var existingIds = {};
            cur[key].forEach(function(item) { if (item.id) existingIds[item.id] = true; });
            imp[key].forEach(function(item) {
              if (item.id && !existingIds[item.id]) {
                cur[key].push(item);
                existingIds[item.id] = true;
                merged++;
              } else { skipped++; }
            });
          } else {
            cur[key] = imp[key]; merged++;
          }
        }
        Store._cache = cur; Store.save();
        localStorage.setItem(Layout.KEY, JSON.stringify(obj.layout || Layout.defaultCfg()));
        toast('导入合并完成 ✓ 新增 ' + merged + ' 项 · 跳过 ' + skipped + ' 条重复');
      } else {
        Store._cache = obj; Store.save();
        toast('导入成功');
      }
      location.reload();
    } catch (err) { toast('文件格式有误'); }
  };
  r.readAsText(f);
};

/* ---------- 修改工作台名称 ---------- */
function renameWorkbench() {
  var cur = Store.get('workbenchName', '个人工作台');
  openModal('修改工作台名称',
    '<div class="field"><label>名称</label><input id="wb-name-input" value="' + escape(cur) + '" placeholder="如：我的设计工作台" style="font-size:15px" /></div>' +
    '<div class="hint">显示在左上角工作台标题位置</div>',
    '<button class="btn" data-action="modal-cancel">取消</button><button class="btn primary" id="wb-name-save">保存</button>',
    function () {
      $('#wb-name-save').onclick = function () {
        var name = $('#wb-name-input').value.trim();
        if (!name) { toast('名称不能为空'); return; }
        Store.set('workbenchName', name);
        $('#brandTitleText').textContent = name;
        document.title = name;
        closeModal(); toast('已修改名称');
      };
    });
}

/* ---------- 全屏切换（点击隐藏浏览器UI，像真APP） ---------- */
function toggleFullscreen() {
  var el = document.documentElement;
  if (!document.fullscreenElement && !document.webkitFullscreenElement) {
    if (el.requestFullscreen) {
      el.requestFullscreen();
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
    } else {
      toast('您的浏览器不支持全屏模式');
      return;
    }
    toast('🔲 已进入全屏模式，点击返回键/上滑退出');
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  }
}
document.addEventListener('fullscreenchange', function() {
  var btn = $('#fullscreenBtn');
  if (!btn) return;
  btn.textContent = (document.fullscreenElement || document.webkitFullscreenElement) ? '⛶ 退出全屏' : '🔲 全屏';
});
document.addEventListener('webkitfullscreenchange', function() {
  var btn = $('#fullscreenBtn');
  if (!btn) return;
  btn.textContent = (document.fullscreenElement || document.webkitFullscreenElement) ? '⛶ 退出全屏' : '🔲 全屏';
});

/* ====================================================================
   启动序列
   ==================================================================== */
Store.initDefaults();
$('#brandTitleText').textContent = Store.get('workbenchName', '个人工作台');
document.title = Store.get('workbenchName', '个人工作台');
Layout.onNavigate = navigate;
Layout.init();
navigate('dashboard');
