/**
 * Service Worker 缓存配置
 */

// 缓存名称
const CACHE_NAME = 'family-tree-v1'

// 静态资源列表
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/assets/main.js',
  '/assets/main.css',
  '/assets/favicon.ico'
]

// 数据缓存策略
const DATA_CACHE_NAME = 'family-tree-data-v1'

/**
 * 安装Service Worker
 */
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...')

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching static assets...')
      return cache.addAll(STATIC_CACHE_URLS)
    })
  )

  self.skipWaiting()
})

/**
 * 激活Service Worker
 */
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...')

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return name !== CACHE_NAME && name !== DATA_CACHE_NAME
          })
          .map((name) => {
            console.log('[Service Worker] Deleting old cache:', name)
            return caches.delete(name)
          })
      )
    })
  )

  self.clients.claim()
})

/**
 * 拦截fetch请求
 */
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // API请求
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request))
    return
  }

  // 静态资源 - Cache First策略
  if (request.method === 'GET' && request.headers.get('accept').includes('text/html')) {
    event.respondWith(handleHTMLRequest(request))
    return
  }

  // 其他静态资源 - Cache First策略
  if (request.method === 'GET') {
    event.respondWith(handleStaticRequest(request))
    return
  }

  // 其他请求 - Network First策略
  event.respondWith(handleNetworkRequest(request))
})

/**
 * 处理API请求
 */
async function handleApiRequest(request) {
  try {
    // 尝试从缓存获取
    const cache = await caches.open(DATA_CACHE_NAME)
    const cachedResponse = await cache.match(request)

    if (cachedResponse) {
      console.log('[Service Worker] Serving from cache:', request.url)
      return cachedResponse
    }

    // 缓存未命中，从网络获取
    const networkResponse = await fetch(request)

    // 只缓存成功的GET请求
    if (networkResponse.ok && request.method === 'GET') {
      const cloneResponse = networkResponse.clone()
      cache.put(request, cloneResponse)
      console.log('[Service Worker] Cached:', request.url)
    }

    return networkResponse
  } catch (error) {
    console.error('[Service Worker] API request failed:', error)

    // API请求失败，尝试从缓存返回
    const cache = await caches.open(DATA_CACHE_NAME)
    const cachedResponse = await cache.match(request)

    if (cachedResponse) {
      return cachedResponse
    }

    // 返回错误响应
    return new Response(JSON.stringify({ error: 'Network error' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

/**
 * 处理HTML请求 - Network First策略
 */
async function handleHTMLRequest(request) {
  try {
    // 先尝试从网络获取
    const networkResponse = await fetch(request)

    if (networkResponse.ok) {
      const cloneResponse = networkResponse.clone()
      // 缓存HTML响应
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, cloneResponse)
      return networkResponse
    }
  } catch (error) {
    console.error('[Service Worker] HTML request failed:', error)
  }

  // 网络失败，尝试从缓存返回
  const cachedResponse = await caches.match(request)

  if (cachedResponse) {
    console.log('[Service Worker] Serving HTML from cache')
    return cachedResponse
  }

  // 缓存也没有，返回错误
  return new Response('Offline - Content not available', {
    status: 503,
    statusText: 'Service Unavailable'
  })
}

/**
 * 处理静态资源请求 - Cache First策略
 */
async function handleStaticRequest(request) {
  try {
    // 先尝试从缓存获取
    const cache = await caches.open(CACHE_NAME)
    const cachedResponse = await cache.match(request)

    if (cachedResponse) {
      console.log('[Service Worker] Serving static asset from cache:', request.url)
      return cachedResponse
    }

    // 缓存未命中，从网络获取
    const networkResponse = await fetch(request)

    if (networkResponse.ok) {
      const cloneResponse = networkResponse.clone()
      cache.put(request, cloneResponse)
      console.log('[Service Worker] Cached static asset:', request.url)
    }

    return networkResponse
  } catch (error) {
    console.error('[Service Worker] Static request failed:', error)

    // 静态资源失败，返回错误
    return new Response('Asset not found', {
      status: 404,
      statusText: 'Not Found'
    })
  }
}

/**
 * 处理网络请求 - Network First策略
 */
async function handleNetworkRequest(request) {
  try {
    const networkResponse = await fetch(request)
    return networkResponse
  } catch (error) {
    console.error('[Service Worker] Network request failed:', error)

    return new Response('Network error', {
      status: 503,
      statusText: 'Service Unavailable'
    })
  }
}

/**
 * 同步数据到Service Worker
 */
export async function syncDataToCache(data) {
  try {
    const cache = await caches.open(DATA_CACHE_NAME)

    // 清空旧数据
    await cache.keys().then((keys) => {
      return Promise.all(keys.map((key) => cache.delete(key)))
    })

    // 存储新数据
    const dataString = JSON.stringify(data)
    const dataResponse = new Response(dataString, {
      headers: { 'Content-Type': 'application/json' }
    })

    await cache.put(new Request('/api/data', { method: 'POST' }), dataResponse)

    console.log('[Service Worker] Data synced successfully')
    return true
  } catch (error) {
    console.error('[Service Worker] Data sync failed:', error)
    return false
  }
}

/**
 * 从Service Worker获取数据
 */
export async function getDataFromCache() {
  try {
    const cache = await caches.open(DATA_CACHE_NAME)
    const response = await cache.match('/api/data')

    if (response) {
      const data = await response.json()
      console.log('[Service Worker] Data retrieved from cache')
      return data
    }

    return null
  } catch (error) {
    console.error('[Service Worker] Data retrieval failed:', error)
    return null
  }
}

/**
 * 清空缓存
 */
export async function clearCache() {
  try {
    await caches.delete(CACHE_NAME)
    await caches.delete(DATA_CACHE_NAME)
    console.log('[Service Worker] Cache cleared')
    return true
  } catch (error) {
    console.error('[Service Worker] Cache clear failed:', error)
    return false
  }
}
