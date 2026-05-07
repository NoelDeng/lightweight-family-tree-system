/**
 * 性能优化工具函数
 */

/**
 * 防抖函数 - 延迟执行，只在停止触发后执行一次
 * @param {Function} fn - 要防抖的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
export function debounce(fn, delay = 300) {
  let timer = null

  return function (...args) {
    if (timer) {
      clearTimeout(timer)
    }

    timer = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}

/**
 * 节流函数 - 固定时间间隔执行，防止频繁调用
 * @param {Function} fn - 要节流的函数
 * @param {number} interval - 时间间隔（毫秒）
 * @returns {Function} 节流后的函数
 */
export function throttle(fn, interval = 300) {
  let lastTime = 0
  let timer = null

  return function (...args) {
    const now = Date.now()

    if (now - lastTime >= interval) {
      fn.apply(this, args)
      lastTime = now
    } else {
      if (timer) {
        clearTimeout(timer)
      }

      timer = setTimeout(() => {
        fn.apply(this, args)
        lastTime = Date.now()
      }, interval - (now - lastTime))
    }
  }
}

/**
 * 缓存函数 - 缓存函数结果
 * @param {Function} fn - 要缓存的函数
 * @param {number} ttl - 缓存时间（毫秒），默认5分钟
 * @returns {Function} 带缓存的函数
 */
export function memoize(fn, ttl = 5 * 60 * 1000) {
  const cache = new Map()

  return function (...args) {
    const key = JSON.stringify(args)

    if (cache.has(key)) {
      const { value, timestamp } = cache.get(key)

      // 检查缓存是否过期
      if (Date.now() - timestamp < ttl) {
        return value
      }

      cache.delete(key)
    }

    const value = fn.apply(this, args)
    cache.set(key, {
      value,
      timestamp: Date.now()
    })

    return value
  }
}

/**
 * 节点ID缓存
 */
class NodeCache {
  constructor() {
    this.cache = new Map()
  }

  set(id, node) {
    this.cache.set(id, node)
  }

  get(id) {
    return this.cache.get(id)
  }

  has(id) {
    return this.cache.has(id)
  }

  clear() {
    this.cache.clear()
  }

  get size() {
    return this.cache.size
  }
}

export const nodeCache = new NodeCache()

/**
 * 节点查找优化
 * @param {string} id - 节点ID
 * @returns {Object|null} 节点对象
 */
export function findNodeByIdOptimized(id) {
  if (!id) return null

  // 先查缓存
  const cached = nodeCache.get(id)
  if (cached) {
    return cached
  }

  // 查询并缓存
  // 注意：这里需要从某个地方获取dataStore或直接访问
  // 实际使用时需要传入dataStore实例
  return null
}

/**
 * 批量缓存节点
 * @param {Array} nodes - 节点数组
 */
export function batchCacheNodes(nodes) {
  nodes.forEach(node => {
    if (node && node.id) {
      nodeCache.set(node.id, node)
    }
  })
}

/**
 * 批量清除缓存
 */
export function clearNodeCache() {
  nodeCache.clear()
}

/**
 * 深度冻结对象（优化渲染性能）
 * @param {Object} obj - 要冻结的对象
 * @returns {Object} 冻结后的对象
 */
export function deepFreeze(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return obj
  }

  Object.keys(obj).forEach(key => {
    const value = obj[key]
    if (typeof value === 'object' && value !== null) {
      deepFreeze(value)
    }
  })

  return Object.freeze(obj)
}

/**
 * 浅冻结对象（优化渲染性能）
 * @param {Object} obj - 要冻结的对象
 * @returns {Object} 冻结后的对象
 */
export function shallowFreeze(obj) {
  if (Array.isArray(obj)) {
    return Object.freeze([...obj])
  }
  return Object.freeze({ ...obj })
}
