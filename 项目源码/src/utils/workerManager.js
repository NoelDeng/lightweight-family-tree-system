/**
 * Web Worker 管理工具
 */

import generationWorker from '../workers/generationWorker.js'
import layoutWorker from '../workers/layoutWorker.js'

class WorkerManager {
  constructor() {
    this.workers = new Map()
    this.taskQueue = new Map()
    this.maxConcurrentTasks = 3
    this.activeTasks = 0
  }

  /**
   * 获取世代计算Worker
   */
  getGenerationWorker() {
    if (!this.workers.has('generation')) {
      this.workers.set('generation', generationWorker)
    }
    return this.workers.get('generation')
  }

  /**
   * 获取布局计算Worker
   */
  getLayoutWorker() {
    if (!this.workers.has('layout')) {
      this.workers.set('layout', layoutWorker)
    }
    return this.workers.get('layout')
  }

  /**
   * 计算节点世代（返回Promise）
   * @param {string} nodeId - 节点ID
   * @param {Array} nodes - 节点数组
   * @returns {Promise<number>} 世代数
   */
  async calculateGeneration(nodeId, nodes) {
    return new Promise((resolve, reject) => {
      const worker = this.getGenerationWorker()

      const handleMessage = (e) => {
        if (e.data.type === 'GENERATION_RESULT' && e.data.nodeId === nodeId) {
          worker.removeEventListener('message', handleMessage)
          resolve(e.data.generation)
        } else if (e.data.type === 'ERROR') {
          worker.removeEventListener('message', handleMessage)
          reject(new Error(e.data.error))
        }
      }

      worker.addEventListener('message', handleMessage)

      worker.postMessage({
        type: 'CALCULATE_GENERATION',
        data: { nodeId, nodes }
      })
    })
  }

  /**
   * 计算所有节点世代（返回Promise）
   * @param {Array} nodes - 节点数组
   * @returns {Promise<Object>} 世代映射
   */
  async calculateAllGenerations(nodes) {
    return new Promise((resolve, reject) => {
      const worker = this.getGenerationWorker()

      const handleMessage = (e) => {
        if (e.data.type === 'ALL_GENERATIONS_RESULT') {
          worker.removeEventListener('message', handleMessage)
          resolve(e.data.generations)
        } else if (e.data.type === 'ERROR') {
          worker.removeEventListener('message', handleMessage)
          reject(new Error(e.data.error))
        }
      }

      worker.addEventListener('message', handleMessage)

      worker.postMessage({
        type: 'CALCULATE_ALL_GENERATIONS',
        data: { nodes }
      })
    })
  }

  /**
   * 计算树布局（返回Promise）
   * @param {Array} nodes - 节点数组
   * @param {number} width - 画布宽度
   * @param {number} height - 画布高度
   * @returns {Promise<Object>} 位置映射
   */
  async calculateLayout(nodes, width = 800, height = 600) {
    return new Promise((resolve, reject) => {
      const worker = this.getLayoutWorker()

      const handleMessage = (e) => {
        if (e.data.type === 'LAYOUT_RESULT') {
          worker.removeEventListener('message', handleMessage)
          resolve(e.data.positions)
        } else if (e.data.type === 'ERROR') {
          worker.removeEventListener('message', handleMessage)
          reject(new Error(e.data.error))
        }
      }

      worker.addEventListener('message', handleMessage)

      worker.postMessage({
        type: 'CALCULATE_LAYOUT',
        data: { nodes, width, height }
      })
    })
  }

  /**
   * 批量计算世代（并行）
   * @param {Array} nodes - 节点数组
   * @param {Array} nodeIds - 节点ID数组
   * @returns {Promise<Object>} 世代映射
   */
  async calculateGenerationsBatch(nodes, nodeIds) {
    const promises = nodeIds.map(nodeId =>
      this.calculateGeneration(nodeId, nodes)
    )

    const results = await Promise.all(promises)

    const generations = {}
    nodeIds.forEach((nodeId, index) => {
      generations[nodeId] = results[index]
    })

    return generations
  }

  /**
   * 获取Worker状态
   */
  getWorkerStatus() {
    return {
      totalWorkers: this.workers.size,
      activeTasks: this.activeTasks,
      workerTypes: Array.from(this.workers.keys())
    }
  }

  /**
   * 清理Worker
   */
  cleanup() {
    this.workers.forEach(worker => {
      worker.terminate()
    })
    this.workers.clear()
    this.taskQueue.clear()
    this.activeTasks = 0
  }
}

// 创建全局实例
export default new WorkerManager()
