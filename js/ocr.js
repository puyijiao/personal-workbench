/* ===== OCR 拍照识别工具（基于 Tesseract.js，懒加载） ===== */
/* 兼容 file:// 双击打开与 127.0.0.1/localhost 预览 */
/* 加载顺序：storage.js → layout.js → app.js → ocr.js */
/* Tesseract.js 仅在用户点击"拍照识别"时才从 CDN 懒加载 */
/* v2: 多CDN容错 + 显式路径 + 全局超时降级，解决加载卡死0% */
/* v3: 改用国内友好的 jsdelivr CDN + 加长超时 + 简化路径 */

var OCR = {
  _loading: null,   /* 懒加载回调队列 */

  /* 全局超时（毫秒）—— OCR 下载/识别超时后自动降级为手动填写 */
  TIMEOUT_MS: 90000,

  /* 主脚本 CDN 源 —— 按优先级依次尝试，任一成功即可 */
  SCRIPT_CDNS: [
    'https://cdn.jsdelivr.net/npm/tesseract.js@5.0.5/dist/tesseract.min.js',
    'https://unpkg.com/tesseract.js@5.0.5/dist/tesseract.min.js',
    'https://cdn.bootcdn.net/ajax/libs/tesseract.js/5.0.5/tesseract.min.js'
  ],

  /* Worker 脚本 / WASM 核心 / 语言数据路径 —— 全部用 jsdelivr 国内访问快 */
  WORKER_PATH: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.0.5/dist/worker.min.js',
  CORE_PATH:   'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.0.0',
  LANG_PATH:   'https://cdn.jsdelivr.net/npm/@tessdata/chi_sim',

  /* 懒加载 Tesseract.js 主脚本（多 CDN 自动容错 + 单源超时） */
  loadScript: function (cb) {
    if (typeof Tesseract !== 'undefined') { cb(); return; }
    if (this._loading) { this._loading.push(cb); return; }
    this._loading = [cb];
    this._tryLoadScript(0);
  },

  _tryLoadScript: function (idx) {
    var self = this;
    if (idx >= this.SCRIPT_CDNS.length) {
      /* 所有 CDN 源均失败 */
      var q = this._loading; this._loading = null;
      q.forEach(function (fn) { fn(new Error('OCR引擎加载失败，请检查网络后重试')); });
      return;
    }
    var s = document.createElement('script');
    s.src = this.SCRIPT_CDNS[idx];
    /* 单源超时：12 秒未加载成功则切换下一个 CDN */
    var timer = setTimeout(function () {
      s.onload = s.onerror = null;
      if (s.parentNode) s.parentNode.removeChild(s);
      self._tryLoadScript(idx + 1);
    }, 12000);
    s.onload = function () {
      clearTimeout(timer);
      var q = self._loading; self._loading = null;
      q.forEach(function (fn) { fn(); });
    };
    s.onerror = function () {
      clearTimeout(timer);
      if (s.parentNode) s.parentNode.removeChild(s);
      self._tryLoadScript(idx + 1);
    };
    document.head.appendChild(s);
  },

  /* 识别图片中的文字
   * @param {string} imageDataUrl - data URL 格式的图片
   * @param {function} onProgress - 进度回调 (status, progress)
   * @param {function} cb - 完成回调 (err, text)
   *
   * 内置 30 秒全局超时：若 CDN 下载卡死在 0%，自动回调错误，提示手动填写
   */
  recognize: function (imageDataUrl, onProgress, cb) {
    var self = this;
    var done = false;  /* 防止超时与正常完成双重回调 */

    /* 全局超时保护 */
    var timeoutId = setTimeout(function () {
      if (done) return;
      done = true;
      cb(new Error('识别超时，请检查网络或稍后重试'), '');
    }, self.TIMEOUT_MS);

    this.loadScript(function (err) {
      if (done) return;
      if (err) {
        done = true;
        clearTimeout(timeoutId);
        cb(err, '');
        return;
      }
      try {
        Tesseract.createWorker('chi_sim', 1, {
          workerPath: self.WORKER_PATH,
          corePath:   self.CORE_PATH,
          langPath:   self.LANG_PATH,
          logger: function (m) {
            if (!done && onProgress && m.status) onProgress(m.status, m.progress);
          }
        }).then(function (worker) {
          if (done) { try { worker.terminate(); } catch (e) {} return; }
          return worker.recognize(imageDataUrl).then(function (result) {
            if (done) return;
            done = true;
            clearTimeout(timeoutId);
            try { worker.terminate(); } catch (e) {}
            cb(null, result.data.text || '');
          });
        }).catch(function (e) {
          if (done) return;
          done = true;
          clearTimeout(timeoutId);
          cb(e, '');
        });
      } catch (e) {
        if (done) return;
        done = true;
        clearTimeout(timeoutId);
        cb(e, '');
      }
    });
  },

  /* ===== 营养成分表解析器 =====
   * 适配中国 GB 28050 预包装食品营养标签格式
   * 返回 { energy, energyKj, protein, fat, carb, sodium, fiber, basis }
   * basis: 100 = 每100g/ml, 1 = 每份
   */
  parseNutritionLabel: function (text) {
    var r = { energy: null, energyKj: null, protein: null, fat: null, carb: null, sodium: null, fiber: null, basis: 100 };

    /* 基准检测 */
    if (/每\s*份/.test(text) && !/每\s*100/.test(text)) r.basis = 1;

    /* 能量 / 热量 —— 支持 kJ 和 kcal 两种单位 */
    var ePatterns = [
      /能量[^\d]*([\d.]+)\s*(kJ|千焦)/i,
      /热量[^\d]*([\d.]+)\s*(kJ|千焦)/i,
      /能量[^\d]*([\d.]+)\s*(kcal|千卡|大卡)/i,
      /热量[^\d]*([\d.]+)\s*(kcal|千卡|大卡)/i,
      /能量[^\d]*([\d.]+)\s*(?:kJ|千焦)[^\d]*([\d.]+)\s*(?:kcal|千卡|大卡)/i
    ];
    for (var i = 0; i < ePatterns.length; i++) {
      var m = text.match(ePatterns[i]);
      if (m) {
        if (m.length >= 3 && m[2] && /kcal|千卡|大卡/i.test(m[2])) {
          r.energyKj = parseFloat(m[1]); r.energy = parseFloat(m[2]);
        } else if (/kJ|千焦/i.test(m[2] || '')) {
          r.energyKj = parseFloat(m[1]);
        } else {
          r.energy = parseFloat(m[1]);
        }
        break;
      }
    }

    /* 蛋白质 */
    var pMatch = text.match(/蛋白质[^\d]*([\d.]+)\s*g/i);
    if (pMatch) r.protein = parseFloat(pMatch[1]);

    /* 脂肪 */
    var fMatch = text.match(/脂肪[^\d]*([\d.]+)\s*g/i);
    if (fMatch) r.fat = parseFloat(fMatch[1]);

    /* 碳水化合物 */
    var cMatch = text.match(/碳水化合物[^\d]*([\d.]+)\s*g/i);
    if (cMatch) r.carb = parseFloat(cMatch[1]);

    /* 钠 */
    var sMatch = text.match(/钠[^\d]*([\d.]+)\s*mg/i);
    if (sMatch) r.sodium = parseFloat(sMatch[1]);

    /* 膳食纤维 */
    var fiMatch = text.match(/膳食纤维[^\d]*([\d.]+)\s*g/i);
    if (fiMatch) r.fiber = parseFloat(fiMatch[1]);

    return r;
  },

  /* ===== 体脂秤显示解析器 =====
   * 适配常见体脂秤 LCD 显示（华为、小米、有品等）
   * 返回 { weight, bodyFat, bmi, muscle, bone, water, bmr }
   */
  parseBodyScale: function (text) {
    var r = { weight: null, bodyFat: null, bmi: null, muscle: null, bone: null, water: null, bmr: null };

    /* 体重 (kg) */
    var wMatch = text.match(/体重[^\d]*([\d.]+)\s*kg/i);
    if (wMatch) r.weight = parseFloat(wMatch[1]);
    if (r.weight === null) {
      /* 无标签时尝试匹配 "XX.X kg" 格式 */
      var w2 = text.match(/([\d]{2,3}[.\d]?)\s*kg/i);
      if (w2) r.weight = parseFloat(w2[1]);
    }

    /* 体脂率 (%) */
    var bfMatch = text.match(/体脂[率]?[^\d]*([\d.]+)\s*%?/);
    if (bfMatch) r.bodyFat = parseFloat(bfMatch[1]);

    /* BMI */
    var bmiMatch = text.match(/BMI[^\d]*([\d.]+)/i);
    if (bmiMatch) r.bmi = parseFloat(bmiMatch[1]);

    /* 肌肉量 (kg) */
    var mMatch = text.match(/肌肉[量]?[^\d]*([\d.]+)\s*kg/i);
    if (mMatch) r.muscle = parseFloat(mMatch[1]);

    /* 骨量 (kg) */
    var bMatch = text.match(/骨[量骼]?[^\d]*([\d.]+)\s*kg/i);
    if (bMatch) r.bone = parseFloat(bMatch[1]);

    /* 水分率 (%) */
    var waMatch = text.match(/水分[率]?[^\d]*([\d.]+)\s*%?/);
    if (waMatch) r.water = parseFloat(waMatch[1]);

    /* 基础代谢 (kcal) */
    var bmrMatch = text.match(/(?:基础)?代谢[^\d]*([\d.]+)\s*k?cal/i);
    if (bmrMatch) r.bmr = parseFloat(bmrMatch[1]);

    return r;
  },

  /* ===== 将 FileReader 读取的文件转为 data URL ===== */
  fileToDataUrl: function (file, cb) {
    var r = new FileReader();
    r.onload = function () { cb(null, r.result); };
    r.onerror = function () { cb(new Error('文件读取失败'), ''); };
    r.readAsDataURL(file);
  }
};
