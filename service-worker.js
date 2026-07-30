/* ===== 桃子工作台 - 离线缓存服务 ===== */
/* 版本号：更新代码时一起改，触发旧缓存清理 */
var CACHE_NAME = 'workbench-v1';

/* 需要离线缓存的文件（首次安装时预存） */
var PRECACHE_FILES = [
  '/personal-workbench/',
  '/personal-workbench/index.html',
  '/personal-workbench/manifest.json',
  '/personal-workbench/icon-192.png',
  '/personal-workbench/icon-512.png',
  '/personal-workbench/css/style.css',
  '/personal-workbench/js/storage.js',
  '/personal-workbench/js/layout.js',
  '/personal-workbench/js/app.js',
  '/personal-workbench/js/ocr.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.min.css'
];

/* 安装：预缓存静态文件 */
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE_FILES);
    })
  );
});

/* 激活：清理旧版本缓存 */
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
            .map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

/* 请求：缓存优先，离线秒开 */
self.addEventListener('fetch', function (event) {
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request).then(function (res) {
        if (!res || res.status !== 200 || res.type !== 'basic') return res;
        var clone = res.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, clone);
        });
        return res;
      });
    })
  );
});