<template>
  <div class="worker-demo">
    <h2>Web Worker 性能对比</h2>

    <div class="control-panel">
      <button @click="testMainThread" :disabled="loading">
        <span v-if="loading" class="loading-spinner"></span>
        主线程计算（{{ mainThreadTime }}ms）
      </button>

      <button @click="testWorkerThread" :disabled="loading">
        <span v-if="loading" class="loading-spinner"></span>
        Worker计算（{{ workerThreadTime }}ms）
      </button>

      <button @click="testLargeDataset" :disabled="loading">
        <span v-if="loading" class="loading-spinner"></span>
        1000节点测试
      </button>
    </div>

    <div v-if="result" class="result-panel">
      <h3>结果</h3>
      <div class="metrics">
        <div>
          <span>世代数: {{ result.generation }}</span>
        </div>
        <div>
          <span>世代数: {{ Object.keys(result.generations).length }}个节点</span>
        </div>
        <div>
          <span>布局节点: {{ Object.keys(result.layout).length }}个节点</span>
        </div>
      </div>
    </div>

    <div v-if="performance" class="performance-panel">
      <h3>性能对比</h3>
      <div class="performance-metrics">
        <div class="metric">
          <span>主线程时间:</span>
          <strong>{{ performance.mainThread }}ms</strong>
        </div>
        <div class="metric">
          <span>Worker时间:</span>
          <strong>{{ performance.workerThread }}ms</strong>
        </div>
        <div class="metric">
          <span>性能提升:</span>
          <strong :class="performanceImprovementClass">
            {{ performance.improvement }}%
          </strong>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import WorkerManager from '../utils/workerManager.js'

const loading = ref(false)
const mainThreadTime = ref(0)
const workerThreadTime = ref(0)
const result = ref(null)
const performance = ref(null)

const performanceImprovement = computed(() => {
  if (!performance.value) return 0
  return ((performance.value.mainThread - performance.value.workerThread) / performance.value.mainThread * 100).toFixed(1)
})

const performanceImprovementClass = computed(() => {
  if (!performance.value) return ''
  const improvement = parseFloat(performanceImprovement.value)
  if (improvement > 50) return 'text-green-600'
  if (improvement > 30) return 'text-yellow-600'
  return 'text-red-600'
})

// 生成测试数据
const generateTestNodes = (count) => {
  const nodes = []

  for (let i = 0; i < count; i++) {
    nodes.push({
      id: `node-${i}`,
      name: `节点${i}`,
      gender: i % 2 === 0 ? 'male' : 'female',
      birthYear: 1900 + (i % 100),
      fatherId: i > 0 ? `node-${Math.floor(i / 2)}` : null,
      motherId: i > 1 ? `node-${Math.floor(i / 2)}` : null
    })
  }

  return nodes
}

// 主线程计算世代
const calculateGenerationMainThread = (nodeId, nodes) => {
  const start = performance.now()

  let depth = 0
  let currentId = nodeId

  while (currentId) {
    const node = nodes.find(n => n.id === currentId)
    if (!node || !node.fatherId && !node.motherId) break

    depth++
    currentId = node.fatherId || node.motherId
  }

  const end = performance.now()
  return { generation: depth, time: end - start }
}

// 测试主线程计算
const testMainThread = async () => {
  loading.value = true

  try {
    const nodes = generateTestNodes(100)
    const nodeId = nodes[0].id

    const result = calculateGenerationMainThread(nodeId, nodes)
    mainThreadTime.value = result.time
    result.value = { generation: result.generation }
  } catch (err) {
    console.error('主线程计算失败:', err)
  } finally {
    loading.value = false
  }
}

// 测试Worker计算
const testWorkerThread = async () => {
  loading.value = true

  try {
    const nodes = generateTestNodes(100)
    const nodeId = nodes[0].id

    const start = performance.now()
    const genResult = await WorkerManager.calculateGeneration(nodeId, nodes)
    const end = performance.now()

    workerThreadTime.value = end - start
    result.value = { generation: genResult }
  } catch (err) {
    console.error('Worker计算失败:', err)
  } finally {
    loading.value = false
  }
}

// 测试大数据集
const testLargeDataset = async () => {
  loading.value = true

  try {
    const nodes = generateTestNodes(1000)
    const start = performance.now()

    // 主线程计算
    const mainThreadResult = calculateGenerationMainThread(nodes[0].id, nodes)
    mainThreadTime.value = mainThreadResult.time

    // Worker计算
    const workerStart = performance.now()
    const workerResult = await WorkerManager.calculateGeneration(nodes[0].id, nodes)
    const workerEnd = performance.now()

    workerThreadTime.value = workerEnd - workerStart
    result.value = { generation: workerResult }

    // 性能对比
    performance.value = {
      mainThread: mainThreadResult.time,
      workerThread: workerEnd - workerStart,
      improvement: ((mainThreadResult.time - (workerEnd - workerStart)) / mainThreadResult.time * 100).toFixed(1)
    }
  } catch (err) {
    console.error('大数据集测试失败:', err)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.worker-demo {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

h2 {
  color: #1e3a8a;
  margin-bottom: 20px;
}

.control-panel {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

button {
  padding: 12px 24px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 8px;
}

button:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

button:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.loading-spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.result-panel,
.performance-panel {
  background: #f8fafc;
  border-radius: 12px;
  padding: 20px;
  margin-top: 20px;
}

h3 {
  color: #4a5568;
  margin: 0 0 16px 0;
  font-size: 16px;
}

.metrics {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.metric {
  padding: 12px;
  background: white;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metric span {
  color: #64748b;
  font-size: 14px;
}

.metric strong {
  color: #1e3a8a;
  font-size: 16px;
}

.performance-metrics {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.performance-metric {
  flex: 1;
  min-width: 200px;
  padding: 16px;
  background: white;
  border-radius: 8px;
}

.performance-metric span {
  display: block;
  color: #64748b;
  font-size: 12px;
  margin-bottom: 8px;
}

.performance-metric strong {
  display: block;
  color: #1e3a8a;
  font-size: 24px;
  font-weight: 600;
}

.text-green-600 {
  color: #16a34a !important;
}

.text-yellow-600 {
  color: #ca8a04 !important;
}

.text-red-600 {
  color: #dc2626 !important;
}
</style>
