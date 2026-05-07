/**
 * D3渲染优化工具
 */

/**
 * 优化后的渲染函数 - 使用requestAnimationFrame
 * @param {Function} renderFn - 渲染函数
 */
export function renderWithRAF(renderFn) {
  if (typeof requestAnimationFrame !== 'undefined') {
    requestAnimationFrame(() => {
      renderFn()
    })
  } else {
    // 回退到直接调用
    renderFn()
  }
}

/**
 * 冻结对象以优化渲染性能
 * @param {Object} obj - 要冻结的对象
 * @returns {Object} 冻结后的对象
 */
export function freezeObject(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  if (Array.isArray(obj)) {
    return Object.freeze([...obj])
  }

  return Object.freeze({ ...obj })
}

/**
 * 批量冻结对象数组
 * @param {Array} objects - 对象数组
 * @returns {Array} 冻结后的数组
 */
export function freezeObjectsArray(objects) {
  return objects.map(freezeObject)
}

/**
 * 优化D3选择器 - 减少重绘
 * @param {string} selector - 选择器
 * @param {Function} callback - 回调函数
 * @returns {Selection} D3选择器
 */
export function optimizedSelect(selector, callback) {
  const selection = d3.select(selector)

  if (typeof callback === 'function') {
    callback(selection)
  }

  return selection
}

/**
 * 使用CSS transform替代top/left进行动画
 * @param {string} selector - 选择器
 * @param {number} x - X坐标
 * @param {number} y - Y坐标
 */
export function animateWithTransform(selector, x, y) {
  optimizedSelect(selector).attr('transform', `translate(${x}, ${y})`)
}

/**
 * 减少DOM操作 - 批量更新
 * @param {Array} updates - 更新数据
 * @param {Function} enterUpdateExit - enter/update/exit函数
 */
export function batchUpdate(updates, enterUpdateExit) {
  const { enter, update, exit } = enterUpdateExit

  // 批量enter
  enter.merge(update).style('opacity', 1)

  // 批量exit
  exit.transition()
    .duration(250)
    .style('opacity', 0)
    .remove()
}

/**
 * 优化SVG渲染 - 使用CSS类
 * @param {string} selector - 选择器
 * @param {Object} styles - 样式对象
 */
export function applyStylesWithClass(selector, styles) {
  const svg = optimizedSelect(selector)

  // 创建样式表
  const styleId = `${selector}-styles`
  let styleElement = document.getElementById(styleId)

  if (!styleElement) {
    styleElement = document.createElement('style')
    styleElement.id = styleId
    svg.append(styleElement)
  }

  // 应用样式
  styleElement.textContent = Object.entries(styles)
    .map(([property, value]) => `${property}: ${value};`)
    .join(' ')
}

/**
 * 使用Web Worker进行复杂计算（可选）
 * @param {Function} computeFn - 计算函数
 * @returns {Promise<any>} 计算结果
 */
export async function computeInWorker(computeFn) {
  if (typeof Worker === 'undefined') {
    // 不支持Worker，直接计算
    return computeFn()
  }

  return new Promise((resolve, reject) => {
    try {
      const worker = new Worker(
        URL.createObjectURL(
          new Blob([`self.onmessage = (${computeFn.toString()})`], { type: 'application/javascript' })
        )
      )

      worker.onmessage = (e) => {
        resolve(e.data)
      }

      worker.onerror = (err) => {
        reject(err)
      }

      worker.postMessage()
    } catch (err) {
      reject(err)
    }
  })
}

/**
 * 性能监控工具
 */
export class RenderPerformanceMonitor {
  constructor() {
    this.metrics = {
      renderTime: 0,
      frameTime: 0,
      nodeCount: 0
    }
  }

  /**
   * 测量渲染时间
   * @param {Function} renderFn - 渲染函数
   * @returns {Promise<number>} 渲染时间（毫秒）
   */
  async measureRender(renderFn) {
    const start = performance.now()
    await renderFn()
    const end = performance.now()
    this.metrics.renderTime = end - start
    return this.metrics.renderTime
  }

  /**
   * 测量帧时间
   * @param {Function} renderFn - 渲染函数
   * @returns {Promise<number>} 帧时间（毫秒）
   */
  async measureFrame(renderFn) {
    const start = performance.now()
    await renderFn()
    const end = performance.now()
    this.metrics.frameTime = end - start
    return this.metrics.frametime
  }

  /**
   * 设置节点数量
   * @param {number} count - 节点数量
   */
  setNodeCount(count) {
    this.metrics.nodeCount = count
  }

  /**
   * 获取性能指标
   * @returns {Object} 性能指标对象
   */
  getMetrics() {
    return { ...this.metrics }
  }

  /**
   * 打印性能报告
   */
  printReport() {
    const { renderTime, frameTime, nodeCount } = this.metrics

    console.log('=== 渲染性能报告 ===')
    console.log(`节点数量: ${nodeCount}`)
    console.log(`渲染时间: ${renderTime.toFixed(2)}ms`)
    console.log(`帧时间: ${frameTime.toFixed(2)}ms`)

    if (renderTime < 16) {
      console.log('✅ 性能优秀')
    } else if (renderTime < 32) {
      console.log('✅ 性能良好')
    } else if (renderTime < 100) {
      console.log('⚠️ 性能一般')
    } else {
      console.log('❌ 性能较差')
    }
  }
}

// 创建全局性能监控实例
export const performanceMonitor = new RenderPerformanceMonitor()
