/* ===== 数据存储层 + 食物库 ===== */
const Store = {
  KEY: 'workbench_data_v1',
  _cache: null,
  load() {
    if (this._cache) return this._cache;
    try {
      const raw = localStorage.getItem(this.KEY);
      this._cache = raw ? JSON.parse(raw) : {};
    } catch (e) { this._cache = {}; }
    return this._cache;
  },
  save() {
    try { localStorage.setItem(this.KEY, JSON.stringify(this.load())); }
    catch (e) { console.error('存储失败', e); }
  },
  get(key, def) {
    const d = this.load();
    return d[key] === undefined ? def : d[key];
  },
  set(key, val) {
    const d = this.load();
    d[key] = val;
    this.save();
  },
  export() { return JSON.stringify(this.load(), null, 2); },
  import(jsonStr) {
    try {
      const obj = JSON.parse(jsonStr);
      this._cache = obj;
      this.save();
      return true;
    } catch (e) { return false; }
  },
  // 初始化默认数据（仅首次）
  initDefaults() {
    const d = this.load();
    let changed = false;
    const defaults = {
      tasks: [{ id: uid(), title: '秋季新品设计稿', project: '春夏季系列', priority: 'high', status: 'doing', created: today(), deadline: '' },
              { id: uid(), title: '面料采购对接', project: '日常', priority: 'mid', status: 'todo', created: today(), deadline: '' }],
      workNotes: [{ id: uid(), content: '本季流行色：低饱和大地色系，搭配亮橙点缀', created: today() }],
      diet: [],
      bodyData: [],
      studyPlans: [{ id: uid(), title: '复习健康管理基础理论', planDate: today(), done: false },
                   { id: uid(), title: '学习慢性病管理章节', planDate: today(), done: false }],
      studyExamDate: '',
      knowledgeNotes: [{ id: uid(), content: '健康管理的核心：对健康危险因素进行监测、评估、干预', created: today() }],
      courses: [{ id: uid(), date: today(), title: '继续教育专业课', hours: 4, type: '专业课', year: new Date().getFullYear() }],
      achievements: [{ id: uid(), title: '完成季度服装设计方案', date: today(), desc: '主导完成春季系列设计，获部门好评' }],
      titleYear: new Date().getFullYear(),
      sportLogs: [],
      sportGoal: 3,
      workStyles: [],
      workDesigns: [],
      workGoal: 26,
      foodLib: [],
      foodLibCategories: ['🍗 蛋白质', '🌾 碳水', '🥑 优质脂肪', '🥦 膳食纤维', '🍰 甜点零食'],
      sportMiniItems: [{ id: uid(), name: '踮脚尖', target: 30 }],
      sportMiniLogs: [],
      bandData: [],
      dietGoals: { cal: 1150, protein: 60, fat: 35, carb: 145, fiber: 25 },
      workbenchName: '个人工作台'
    };
    for (const k in defaults) {
      if (d[k] === undefined) { d[k] = defaults[k]; changed = true; }
    }
    if (changed) this.save();
  }
};

/* 工具函数 */
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function nowTime() { const d = new Date(); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }
function pad2(n) { return n < 10 ? '0' + n : '' + n; }
/* 7天前的日期字符串（用于本周汇总） */
function weekAgoStr() {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function fmtDate(d) { return d ? d.slice(5) : '--'; }
function daysBetween(a, b) {
  const da = new Date(a), db = b ? new Date(b) : new Date();
  return Math.ceil((db - da) / 86400000);
}
function escape(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

/* ===== 常见食物营养库（每100g，能量单位 kcal） ===== */
const FOOD_DB = [
  // 主食
  {name:'米饭',cat:'主食',energy:116,protein:2.6,fat:0.3,carb:25.9,sodium:2},
  {name:'白馒头',cat:'主食',energy:223,protein:7,fat:1.1,carb:47,sodium:165},
  {name:'面条(煮)',cat:'主食',energy:110,protein:3.5,fat:0.1,carb:24.3,sodium:104},
  {name:'全麦面包',cat:'主食',energy:246,protein:9.6,fat:3.3,carb:45,sodium:400},
  {name:'小米粥',cat:'主食',energy:46,protein:1.4,fat:0.4,carb:8.4,sodium:4},
  {name:'红薯',cat:'主食',energy:86,protein:1.6,fat:0.1,carb:20,sodium:55},
  {name:'玉米(鲜)',cat:'主食',energy:112,protein:4,fat:1.2,carb:22.8,sodium:3},
  {name:'燕麦片',cat:'主食',energy:367,protein:15,fat:6.7,carb:61,sodium:7},
  // 肉禽蛋
  {name:'鸡蛋',cat:'肉蛋',energy:147,protein:12.5,fat:11.1,carb:1.2,sodium:131},
  {name:'鸡胸肉',cat:'肉蛋',energy:133,protein:30,fat:1.2,carb:0,sodium:34},
  {name:'瘦猪肉',cat:'肉蛋',energy:143,protein:20,fat:6.2,carb:1.5,sodium:57},
  {name:'瘦牛肉',cat:'肉蛋',energy:106,protein:20,fat:2.3,carb:1.2,sodium:53},
  {name:'猪里脊',cat:'肉蛋',energy:155,protein:20,fat:8,carb:0,sodium:43},
  {name:'鸭肉',cat:'肉蛋',energy:240,protein:15,fat:19.7,carb:0.2,sodium:69},
  {name:'虾(基围虾)',cat:'肉蛋',energy:101,protein:18,fat:1.4,carb:3.9,sodium:172},
  // 水产
  {name:'草鱼',cat:'水产',energy:113,protein:16.6,fat:5.2,carb:0,sodium:46},
  {name:'三文鱼',cat:'水产',energy:139,protein:17,fat:7.8,carb:0,sodium:59},
  {name:'带鱼',cat:'水产',energy:127,protein:18,fat:4.9,carb:3.1,sodium:150},
  {name:'鱿鱼',cat:'水产',energy:92,protein:15.6,fat:1.7,carb:2.5,sodium:134},
  // 蔬菜
  {name:'大白菜',cat:'蔬菜',energy:17,protein:1.5,fat:0.1,carb:3.2,sodium:57},
  {name:'西红柿',cat:'蔬菜',energy:18,protein:0.9,fat:0.2,carb:3.9,sodium:5},
  {name:'黄瓜',cat:'蔬菜',energy:15,protein:0.8,fat:0.2,carb:2.9,sodium:4.9},
  {name:'菠菜',cat:'蔬菜',energy:24,protein:2.6,fat:0.3,carb:4.5,sodium:85},
  {name:'生菜',cat:'蔬菜',energy:13,protein:1.4,fat:0.2,carb:2.1,sodium:32},
  {name:'西兰花',cat:'蔬菜',energy:36,protein:4.1,fat:0.6,carb:4.3,sodium:18.8},
  {name:'土豆',cat:'蔬菜',energy:76,protein:2,fat:0.1,carb:17.5,sodium:5},
  {name:'胡萝卜',cat:'蔬菜',energy:32,protein:1,fat:0.2,carb:8.1,sodium:71},
  {name:'茄子',cat:'蔬菜',energy:21,protein:1,fat:0.2,carb:4.9,sodium:5},
  {name:'豆角',cat:'蔬菜',energy:30,protein:2,fat:0.4,carb:5.7,sodium:4.6},
  // 豆制品
  {name:'豆腐',cat:'豆制品',energy:81,protein:8.1,fat:3.7,carb:4.2,sodium:7},
  {name:'豆浆(无糖)',cat:'豆制品',energy:15,protein:1.4,fat:0.7,carb:1.1,sodium:3},
  {name:'腐竹',cat:'豆制品',energy:459,protein:44,fat:21.7,carb:21.3,sodium:26},
  // 奶制品
  {name:'牛奶',cat:'奶制品',energy:54,protein:3,fat:3.2,carb:3.4,sodium:37},
  {name:'酸奶',cat:'奶制品',energy:72,protein:2.5,fat:2.7,carb:9.3,sodium:39},
  {name:'奶酪',cat:'奶制品',energy:328,protein:26,fat:24,carb:2.5,sodium:584},
  // 水果
  {name:'苹果',cat:'水果',energy:52,protein:0.3,fat:0.2,carb:13.8,sodium:1},
  {name:'香蕉',cat:'水果',energy:89,protein:1.1,fat:0.3,carb:22,sodium:1},
  {name:'橙子',cat:'水果',energy:47,protein:0.9,fat:0.1,carb:11.8,sodium:2},
  {name:'西瓜',cat:'水果',energy:30,protein:0.6,fat:0.2,carb:7.6,sodium:2},
  {name:'葡萄',cat:'水果',energy:43,protein:0.4,fat:0.2,carb:10.3,sodium:1},
  {name:'猕猴桃',cat:'水果',energy:56,protein:0.8,fat:0.6,carb:13,sodium:3},
  // 坚果零食
  {name:'核桃',cat:'坚果',energy:654,protein:15,fat:65,carb:14,sodium:2},
  {name:'杏仁',cat:'坚果',energy:578,protein:21,fat:50,carb:22,sodium:1},
  {name:'花生',cat:'坚果',energy:567,protein:26,fat:49,carb:16,sodium:18},
  // 油脂调味
  {name:'橄榄油',cat:'油脂',energy:899,protein:0,fat:99.9,carb:0,sodium:0},
  {name:'酱油',cat:'调味',energy:63,protein:5.6,fat:0.1,carb:10,sodium:5750},
];

// 能量单位换算
function kjToKcal(kj) { return +(kj / 4.184).toFixed(1); }
// 按 食用量(g) 与 每100g数值 换算
function scaleNutri(nutri, grams) {
  const r = grams / 100;
  return {
    energy: +(nutri.energy * r).toFixed(0),
    protein: +(nutri.protein * r).toFixed(1),
    fat: +(nutri.fat * r).toFixed(1),
    carb: +(nutri.carb * r).toFixed(1),
    fiber: +((nutri.fiber || 0) * r).toFixed(1),
    sodium: +(nutri.sodium * r).toFixed(0)
  };
}

// 给食物库补充膳食纤维(g/100g) 典型值，未列出的默认 0
const FIBER_PATCH = { '米饭':0.4, '白馒头':1.3, '面条(煮)':0.8, '全麦面包':7, '小米粥':0.4, '红薯':3, '玉米(鲜)':2.7, '燕麦片':5.3, '土豆':2.2, '胡萝卜':2.8, '菠菜':1.7, '西兰花':1.6, '茄子':1.3, '豆角':1.5, '生菜':1.3, '大白菜':0.8, '黄瓜':0.5, '西红柿':0.4, '豆腐':0.4, '苹果':2.4, '香蕉':2.6, '橙子':2.4, '西瓜':0.4, '葡萄':0.9, '猕猴桃':3, '核桃':6.7, '杏仁':12.5, '花生':8.5, '腐竹':1 };
FOOD_DB.forEach(f => { f.fiber = FIBER_PATCH[f.name] !== undefined ? FIBER_PATCH[f.name] : (f.fiber || 0); });

// 合并内置库与自定义食材库，供搜索选择
function allFoods() {
  const lib = Store.get('foodLib', []);
  return [...lib.map(f => ({ ...f, custom: true })), ...FOOD_DB];
}
// 按食物项与用量换算（兼容每100g / 每份两种基准）
function nutriForAmount(item, amount) {
  if (item.base === 1) {
    const f = amount;
    return { energy:+(item.energy*f).toFixed(0), protein:+(item.protein*f).toFixed(1), fat:+(item.fat*f).toFixed(1), carb:+(item.carb*f).toFixed(1), fiber:+((item.fiber||0)*f).toFixed(1), sodium:+(item.sodium*f).toFixed(0) };
  }
  return scaleNutri(item, amount);
}
