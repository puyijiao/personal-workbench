/* ===== 个人工作台 主应用（业务逻辑） ===== */
/* 全局声明（非 IIFE），兼容 file:// 双击打开与 localhost 预览 */
/* 依赖：storage.js（Store/FOOD_DB/工具函数）、layout.js（UI 基础/Layout 编辑层） */
/* 加载顺序：storage.js → layout.js → app.js */

/* ---------- 路由 ---------- */
function navigate(target) {
  $$('.nav-item').forEach(function (n) { n.classList.toggle('active', n.dataset.target === target); });
  $$('.page').forEach(function (p) { p.classList.toggle('active', p.id === 'page-' + target); });
  var map = { dashboard: Dashboard, work: Work, diet: Diet, body: Body, study: Study, title: Title, sport: Sport };
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
      case 'edit-diet-goal': Diet.editGoal(); break;
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
      { ic: '⚖️', tag: '最新体重', num: lastBody ? lastBody.weight : '--', unit: 'kg', sub: lastBody ? '体脂率 ' + (lastBody.bodyFat || '--') + '%' : '暂无记录', c: 'var(--c-body)', bar: lastBody ? Math.min(lastBody.bodyFat || 0, 100) : 0, target: 'body' },
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

var Diet = {
  render: function () { this.renderSummary(); this.renderMeals(); this.renderFoodLib(); this.mountQuickPaste(); },
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
    confirmDialog('删除饮食记录', '确认删除该条饮食记录？', function () {
      Store.set('diet', Store.get('diet', []).filter(function (x) { return x.id !== id; }));
      self.renderSummary(); self.renderMeals(); toast('已删除');
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
          rec.amount = amt;
          rec.meal = $('#ef-meal').value;
          rec.energy = r.energy;
          rec.protein = r.protein;
          rec.fat = r.fat;
          rec.carb = r.carb;
          rec.fiber = r.fiber;
          rec.sodium = r.sodium;
          Store.set('diet', diet);
          closeModal(); self.renderSummary(); self.renderMeals(); toast('已修改克重为 ' + amt + 'g');
        };
      });
  },
  addFood: function (defaultMeal) {
    var self = this;
    openModal('添加食物',
      '<div class="seg" id="foodMode"><button class="active" data-mode="lib">🔍 食物库选择</button><button data-mode="photo">📷 拍照识别营养表</button></div>' +
      '<div class="field-row"><div class="field"><label>餐次</label><select id="fd-meal">' +
      MEALS.map(function (m) { return '<option value="' + m[0] + '" ' + (m[0] === defaultMeal ? 'selected' : '') + '>' + m[1] + '</option>'; }).join('') +
      '</select></div><div class="field"><label>日期</label><input type="date" id="fd-date" value="' + today() + '" /></div></div>' +
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
      if (basis === 100 && $('#fd-savelib', box) && $('#fd-savelib', box).checked) {
        var lib = Store.get('foodLib', []);
        if (!lib.some(function (f) { return f.name === name; })) {
          lib.push({ id: uid(), name: name, base: 100, energy: energy, energyKj: pj || Math.round(energy * 4.184), protein: +$('#fd-pprotein', box).value || 0, fat: +$('#fd-pfat', box).value || 0, carb: +$('#fd-pcarb', box).value || 0, fiber: fiber, sodium: +$('#fd-psodium', box).value || 0 });
          Store.set('foodLib', lib);
        } else { toast('食材库已有同名食材，未重复保存'); }
      }
    }
    closeModal(); this.renderSummary(); this.renderMeals(); this.renderFoodLib(); toast('已记录饮食');
  },
  renderFoodLib: function () {
    var lib = Store.get('foodLib', []);
    $('#foodLibList').innerHTML = lib.length ? lib.map(function (f) {
      var kj = f.energyKj != null ? f.energyKj : Math.round(f.energy * 4.184);
      return '<div class="note-card"><button class="nc-edit" data-action="edit-food-lib" data-id="' + f.id + '" title="修改">✎</button><button class="nc-del" data-action="del-food-lib" data-id="' + f.id + '" title="删除">✕</button><div class="nc-body" style="font-weight:600">' + escape(f.name) + '</div>' +
        '<div class="nc-date" style="font-size:11px">每100g：' + kj + 'kJ / ' + f.energy + 'kcal · 蛋' + (f.protein || 0) + 'g 脂' + (f.fat || 0) + 'g 碳' + (f.carb || 0) + 'g 纤' + (f.fiber || 0) + 'g 钠' + (f.sodium || 0) + 'mg</div></div>';
    }).join('') : '<div class="empty-mini">还没有自定义食材，拍照录入时勾选"保存到食材库"即可加入</div>';
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
      '<div class="field-row-3"><div class="field"><label>碳水(g)</label><input type="number" step="0.1" id="fl-carb" value="' + (pre.carb || '') + '" /></div><div class="field"><label>膳食纤维(g)</label><input type="number" step="0.1" id="fl-fiber" value="' + (pre.fiber || '') + '" /></div><div class="field"><label>钠(mg)</label><input type="number" step="0.1" id="fl-sodium" value="' + (pre.sodium || '') + '" /></div></div>',
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
          var lib = Store.get('foodLib', []);
          if (editing) {
            /* 修改模式：更新已有记录 */
            var item = lib.find(function (f) { return f.id === editId; });
            if (!item) { toast('食材不存在'); return; }
            if (name !== item.name && lib.some(function (f) { return f.name === name; })) { toast('已有同名食材'); return; }
            item.name = name;
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
            lib.push({ id: uid(), name: name, base: 100, energy: kcal, energyKj: kj, protein: +$('#fl-protein').value || 0, fat: +$('#fl-fat').value || 0, carb: +$('#fl-carb').value || 0, fiber: +$('#fl-fiber').value || 0, sodium: +$('#fl-sodium').value || 0 });
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
    var cards = [
      { label: '体重', val: last ? last.weight : null, unit: 'kg', delta: this.delta(last ? last.weight : null, prev ? prev.weight : null) },
      { label: '体脂率', val: last ? last.bodyFat : null, unit: '%', delta: this.delta(last ? last.bodyFat : null, prev ? prev.bodyFat : null) },
      { label: 'BMI', val: last ? last.bmi : null, unit: '', delta: this.delta(last ? last.bmi : null, prev ? prev.bmi : null) },
      { label: '肌肉量', val: last ? last.muscle : null, unit: 'kg', delta: this.delta(last ? last.muscle : null, prev ? prev.muscle : null) },
      { label: '骨量', val: last ? last.bone : null, unit: 'kg', delta: this.delta(last ? last.bone : null, prev ? prev.bone : null) },
      { label: '水分率', val: last ? last.water : null, unit: '%', delta: this.delta(last ? last.water : null, prev ? prev.water : null) },
      { label: '基础代谢', val: last ? last.bmr : null, unit: 'kcal', delta: this.delta(last ? last.bmr : null, prev ? prev.bmr : null) }
    ];
    $('#bodyCards').innerHTML = cards.map(function (c) {
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
      '<div class="field"><label>基础代谢(kcal)</label><input type="number" id="bd-bmr" value="' + (last.bmr || '') + '" /></div>' +
      '<div class="hint">也可对照体脂秤显示的数据逐项手动填入，留空的项会显示为"-"</div>',
      '<button class="btn" data-action="modal-cancel">取消</button><button class="btn primary" id="bd-save">保存</button>',
      function () {
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
