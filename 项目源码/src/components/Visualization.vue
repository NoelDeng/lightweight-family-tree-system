<template>
  <div class="visualization-container">
    <div class="visualization-header">
      <h2>家族树</h2>
      <div class="visualization-controls">
        <button class="control-btn" @click="handleZoomIn" title="放大">+</button>
        <button class="control-btn" @click="handleZoomOut" title="缩小">−</button>
        <button class="control-btn" @click="handleResetView" title="重置">↺</button>
      </div>
    </div>

    <div class="visualization-content" ref="containerRef">
      <div v-if="loading" class="loading-container">
        <div class="spinner"></div>
        <p>加载中...</p>
      </div>

      <div v-else-if="error" class="error-container">
        <p>{{ error }}</p>
      </div>

      <div v-else class="visualization-area" ref="areaRef">
        <svg
          v-if="hasData"
          ref="svgRef"
          :width="svgWidth"
          :height="svgHeight"
          class="family-tree"
          @click="handleSvgClick"
        >
          <g :transform="`translate(${transform.x}, ${transform.y}) scale(${zoom})`">
            <!-- 连接线 -->
            <g class="links">
              <path
                v-for="link in linkData"
                :key="link.id"
                :d="link.path"
                :stroke="link.isSpouse ? '#f59e0b' : '#2563eb'"
                :stroke-width="link.isSpouse ? 1.5 : 2"
                :stroke-dasharray="link.isSpouse ? '5,3' : 'none'"
                fill="none"
                stroke-linecap="round"
                :opacity="link.isSpouse ? 0.8 : 0.7"
              />
            </g>

            <!-- 节点 -->
            <g class="nodes">
              <g
                v-for="node in nodes"
                :key="node.id"
                :transform="`translate(${node.x},${node.y})`"
                class="family-node"
                @click.stop="handleNodeClick(node)"
              >
                <!-- 节点矩形背景 -->
                <rect
                  x="-32"
                  y="-18"
                  width="64"
                  height="36"
                  rx="8"
                  :fill="isSelected(node.id) ? '#3b82f6' : (node.gender === 'female' ? '#fce7f3' : '#dbeafe')"
                  :stroke="isSelected(node.id) ? '#1d4ed8' : (node.gender === 'female' ? '#ec4899' : '#3b82f6')"
                  stroke-width="1.5"
                  class="node-rect"
                />
                <text
                  x="0"
                  y="-2"
                  text-anchor="middle"
                  :fill="node.gender === 'female' ? '#be185d' : '#1e3a8a'"
                  font-size="12"
                  font-weight="600"
                >{{ node.name }}</text>
                <text
                  x="0"
                  y="12"
                  text-anchor="middle"
                  fill="#64748b"
                  font-size="9"
                >{{ node.generation ? '第' + node.generation + '代' : '' }}</text>
              </g>
            </g>
          </g>
        </svg>

        <div v-else class="empty-state">
          <p>暂无数据</p>
          <button class="add-node-btn" @click="handleAddNode">添加节点</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, shallowRef } from 'vue'
import * as d3 from 'd3'
import { useDataStore } from '../stores/data.js'
import { useVisualizationStore } from '../stores/visualization.js'
import { memoize, batchCacheNodes } from '../utils/performance.js'

const emit = defineEmits(['add-node', 'edit-node', 'delete-node', 'node-click'])

// 节点矩形半高
const NODE_H = 18

/**
 * 三次贝塞尔曲线路径：从 (x1, y1) 到 (x2, y2)
 * 控制点垂直偏移形成平滑 S 曲线
 */
const bezierCurve = (x1, y1, x2, y2) => {
  const midY = (y1 + y2) / 2
  return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`
}

const dataStore = useDataStore()
const visualizationStore = useVisualizationStore()

const containerRef = ref(null)
const areaRef = ref(null)
const svgRef = ref(null)

const loading = ref(false)
const error = ref(null)
const isRendering = ref(false)

const familyData = shallowRef([])
const linkData = ref([])
const zoom = ref(1)

const svgWidth = ref(800)
const svgHeight = ref(600)
const transform = ref({ x: 0, y: 0 })

const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })

// 双指触控缩放状态
let pinchStartDistance = 0
let pinchStartZoom = 1
let pinchCenter = { x: 0, y: 0 }

const getTouchDistance = (touches) => {
  return Math.hypot(
    touches[0].clientX - touches[1].clientX,
    touches[0].clientY - touches[1].clientY
  )
}

const hasData = computed(() => familyData.value.length > 0)

const calculateGenerationOrDefault = memoize((node, allNodes) => {
  if (node.generation !== undefined && node.generation !== null) return node.generation
  if (!node.fatherId && !node.motherId) return 1
  const parent = allNodes.find(n => n.id === node.fatherId || n.id === node.motherId)
  if (parent) return calculateGenerationOrDefault(parent, allNodes) + 1
  return 1
}, 10 * 60 * 1000)

const nodes = computed(() => familyData.value)

const renderTree = () => {
  if (!hasData.value) return
  if (isRendering.value) return

  isRendering.value = true

  try {
    const data = dataStore.familyData
    batchCacheNodes(data)

    // 计算世代
    data.forEach(node => {
      node.generation = calculateGenerationOrDefault(node, data)
    })

    // 处理多根节点（包括孤儿节点：parent ID 在 data 中不存在的节点）
    const existingIds = new Set(data.map(n => n.id))
    const naturalRoots = data.filter(node => !node.fatherId && !node.motherId)
    const orphans = data.filter(node => {
      if (!node.fatherId && !node.motherId) return false // 已是自然根节点
      const parentId = node.fatherId || node.motherId
      return parentId && !existingIds.has(parentId)
    })
    // 将所有孤儿节点的 parent 清空，使其成为根节点
    for (const orphan of orphans) {
      orphan.fatherId = null
      orphan.motherId = null
    }
    const allRoots = [...naturalRoots, ...orphans]
    let stratifyData
    if (allRoots.length > 1) {
      const virtualRoot = { id: '__virtual_root__', name: '', fatherId: null, motherId: null, generation: 0, _virtual: true }
      stratifyData = [virtualRoot, ...data.map(n => {
        if (!n.fatherId && !n.motherId) return { ...n, fatherId: '__virtual_root__' }
        return n
      })]
    } else {
      stratifyData = data
    }

    const root = d3.stratify()
      .id(d => d.id)
      .parentId(d => d.fatherId || d.motherId || null)
      (stratifyData)

    const treeLayout = d3.tree()
      .nodeSize([80, 140])

    treeLayout(root)

    // 更新节点位置：D3 y轴翻转为 root 在最下方
    const bottomY = svgHeight.value - 80
    root.descendants().forEach(d => {
      const node = data.find(n => n.id === d.id)
      if (node) {
        node.x = d.x
        node.y = bottomY - d.y
      }
    })

    // 水平居中偏移（基于所有节点的包围盒）
    const xs = data.map(n => n.x).filter(x => x != null)
    const minX = Math.min(...xs), maxX = Math.max(...xs)
    const treeWidth = maxX - minX
    const centerX = svgWidth.value / 2
    data.forEach(node => {
      if (node.x != null) node.x = node.x - minX - treeWidth / 2 + centerX
    })

    // === 配偶分组布局（BFS 连通分量） ===
    const SPOUSE_GAP = 100  // 配偶节点中心间距（节点宽64）

    // 构建配偶关系邻接表（双向）
    const spouseAdj = new Map()
    for (const node of data) {
      if (!node.spouseIds || node.spouseIds.length === 0) continue
      if (!spouseAdj.has(node.id)) spouseAdj.set(node.id, new Set())
      for (const sid of node.spouseIds) {
        spouseAdj.get(node.id).add(sid)
        if (!spouseAdj.has(sid)) spouseAdj.set(sid, new Set())
        spouseAdj.get(sid).add(node.id)
      }
    }

    // BFS 查找所有连通分量
    const visited = new Set()
    const spouseGroups = []

    for (const node of data) {
      if (visited.has(node.id)) continue
      if (!spouseAdj.has(node.id)) continue

      const group = []
      const queue = [node.id]
      visited.add(node.id)

      while (queue.length > 0) {
        const currentId = queue.shift()
        const currentNode = data.find(n => n.id === currentId)
        if (currentNode) group.push(currentNode)

        for (const neighborId of (spouseAdj.get(currentId) || [])) {
          if (!visited.has(neighborId)) {
            visited.add(neighborId)
            queue.push(neighborId)
          }
        }
      }

      if (group.length > 1) spouseGroups.push(group)
    }

    // 调整配偶位置：组内所有配偶同一水平线（y 取组内最高世代即最小 y 值），横向排列
    for (const group of spouseGroups) {
      // 按原始 x 坐标排序保持视觉顺序
      group.sort((a, b) => a.x - b.x)
      // 所有配偶对齐到同一 y（取原始 y 的最小值，即最高世代的位置）
      const unifiedY = Math.min(...group.map(n => n.y))
      // 以组成员原始 x 的中点为基准居中排列
      const origCenterX = group.reduce((sum, n) => sum + n.x, 0) / group.length
      const totalWidth = (group.length - 1) * SPOUSE_GAP
      const startX = origCenterX - totalWidth / 2

      for (let i = 0; i < group.length; i++) {
        group[i].x = startX + i * SPOUSE_GAP
        group[i].y = unifiedY
      }
    }

    // === 生成连接线 ===
    const newLinks = []

    // 亲子连线
    root.links()
      .filter(l => l.source.id !== '__virtual_root__')
      .forEach(l => {
        const src = data.find(n => n.id === l.source.id)
        const tgt = data.find(n => n.id === l.target.id)
        if (!src || !tgt || src.x == null || tgt.x == null) return
        newLinks.push({
          id: `parent-${l.source.id}-${l.target.id}`,
          path: bezierCurve(src.x, src.y - NODE_H, tgt.x, tgt.y + NODE_H),
          isSpouse: false
        })
      })

    // 配偶连线
    for (const group of spouseGroups) {
      for (let i = 0; i < group.length - 1; i++) {
        const a = group[i], b = group[i + 1]
        newLinks.push({
          id: `spouse-${a.id}-${b.id}`,
          path: bezierCurve(a.x + 32, a.y, b.x - 32, b.y),
          isSpouse: true
        })
      }
    }

    linkData.value = newLinks

    // === 计算初始平移使视图居中 ===
    const allX = data.map(n => n.x).filter(x => x != null)
    const allY = data.map(n => n.y).filter(y => y != null)
    const bboxMinX = Math.min(...allX), bboxMaxX = Math.max(...allX)
    const bboxMinY = Math.min(...allY), bboxMaxY = Math.max(...allY)
    const bboxCX = (bboxMinX + bboxMaxX) / 2
    const bboxCY = (bboxMinY + bboxMaxY) / 2
    transform.value = {
      x: svgWidth.value / 2 - bboxCX,
      y: svgHeight.value / 2 - bboxCY
    }

    transform.value = { x: 0, y: 0 }
  } catch (err) {
    console.error('renderTree 异常:', err)
  } finally {
    isRendering.value = false
  }
}

const isSelected = (nodeId) => visualizationStore.selectedNodeId === nodeId

const handleNodeClick = (node) => {
  visualizationStore.selectNode(node.id)
  emit('node-click', node)
}

const handleSvgClick = (event) => {
  if (event.target.tagName === 'svg' || event.target.classList.contains('visualization-area')) {
    visualizationStore.clearSelection()
  }
}

const handleZoomIn = () => { zoom.value = Math.min(zoom.value + 0.15, 3) }
const handleZoomOut = () => { zoom.value = Math.max(zoom.value - 0.15, 0.3) }
const handleResetView = () => {
  zoom.value = 1
  transform.value = { x: 0, y: 0 }
  renderTree()
}
const handleAddNode = () => emit('add-node', null)

// 鼠标滚轮缩放（以光标位置为锚点）
const handleWheel = (event) => {
  if (event.target.closest('.family-node')) return // 节点上不缩放
  event.preventDefault()

  const container = containerRef.value
  if (!container) return

  const rect = container.getBoundingClientRect()
  const cursorX = event.clientX - rect.left
  const cursorY = event.clientY - rect.top

  const delta = event.deltaY > 0 ? -0.1 : 0.1
  const oldZoom = zoom.value
  const newZoom = Math.max(0.3, Math.min(3, oldZoom + delta))
  if (newZoom === oldZoom) return

  // 光标下的 SVG 坐标（缩放前）
  const svgX = (cursorX - transform.value.x) / oldZoom
  const svgY = (cursorY - transform.value.y) / oldZoom

  zoom.value = newZoom
  transform.value = {
    x: cursorX - svgX * newZoom,
    y: cursorY - svgY * newZoom
  }
}

// 移动端触摸事件（扩展双指捏合缩放）
const handleTouchMove = (event) => {
  if (event.touches.length === 2) {
    // 双指捏合缩放
    event.preventDefault()
    const newDist = getTouchDistance(event.touches)
    const scale = newDist / pinchStartDistance
    const newZoom = Math.max(0.3, Math.min(3, pinchStartZoom * scale))

    const container = containerRef.value
    if (!container) return
    const rect = container.getBoundingClientRect()
    const cx = pinchCenter.x - rect.left
    const cy = pinchCenter.y - rect.top

    const svgX = (cx - transform.value.x) / pinchStartZoom
    const svgY = (cy - transform.value.y) / pinchStartZoom

    zoom.value = newZoom
    transform.value = {
      x: cx - svgX * newZoom,
      y: cy - svgY * newZoom
    }
  } else if (event.touches.length === 0) {
    isDragging.value = false
  }
}

const handleTouchStart = (event) => {
  if (event.touches.length === 2) {
    isDragging.value = false
    pinchStartDistance = getTouchDistance(event.touches)
    pinchStartZoom = zoom.value
    pinchCenter = {
      x: (event.touches[0].clientX + event.touches[1].clientX) / 2,
      y: (event.touches[0].clientY + event.touches[1].clientY) / 2
    }
  }
}

const loadFamilyData = async () => {
  loading.value = true
  error.value = null
  try {
    const data = await dataStore.loadFamilyData()
    familyData.value = data || []
    if (!isRendering.value) renderTree()
  } catch (err) {
    error.value = err.message
    console.error('加载族谱数据失败:', err)
  } finally {
    loading.value = false
  }
}

// 拖拽
const handleMouseDown = (event) => {
  if (event.target.closest('.family-node')) return
  isDragging.value = true
  dragStart.value = { x: event.clientX - transform.value.x, y: event.clientY - transform.value.y }
  event.preventDefault()
}

const handleMouseMove = (event) => {
  if (!isDragging.value) return
  transform.value = { x: event.clientX - dragStart.value.x, y: event.clientY - dragStart.value.y }
}

const handleMouseUp = () => { isDragging.value = false }

onMounted(() => {
  loadFamilyData()
  window.addEventListener('resize', () => {
    if (containerRef.value) {
      svgWidth.value = containerRef.value.clientWidth || 800
      svgHeight.value = containerRef.value.clientHeight || 600
      renderTree()
    }
  })
  if (containerRef.value) {
    containerRef.value.addEventListener('mousedown', handleMouseDown)
    containerRef.value.addEventListener('wheel', handleWheel, { passive: false })
    containerRef.value.addEventListener('touchstart', handleTouchStart, { passive: false })
    containerRef.value.addEventListener('touchmove', handleTouchMove, { passive: false })
  }
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
})

onUnmounted(() => {
  if (containerRef.value) {
    containerRef.value.removeEventListener('mousedown', handleMouseDown)
    containerRef.value.removeEventListener('wheel', handleWheel)
    containerRef.value.removeEventListener('touchstart', handleTouchStart)
    containerRef.value.removeEventListener('touchmove', handleTouchMove)
  }
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)
})

watch(() => dataStore.familyData.length, (newLength, oldLength) => {
  if (newLength !== oldLength) loadFamilyData()
})
</script>

<style scoped>
.visualization-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #f8fafc;
  overflow: hidden;
}

/* 移动端适配 */
@media (max-width: 767px) {
  .visualization-container {
    height: 60vh;
  }

  .visualization-header {
    padding: 12px;
  }

  .visualization-header h2 {
    font-size: 16px;
  }

  .visualization-controls {
    gap: 4px;
  }

  .control-btn {
    padding: 6px;
  }

  .visualization-content {
    min-height: 400px;
  }
}

/* 平板适配 */
@media (min-width: 768px) and (max-width: 1024px) {
  .visualization-content {
    min-height: 500px;
  }
}

/* 桌面适配 */
@media (min-width: 1025px) {
  .visualization-content {
    min-height: 600px;
  }
}

.visualization-header {
  padding: 20px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.visualization-header h2 {
  font-size: 20px;
  color: #2d3748;
  margin: 0;
}

.visualization-controls {
  display: flex;
  gap: 8px;
}

.control-btn {
  padding: 8px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-btn:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.visualization-content {
  flex: 1;
  overflow: auto;
  position: relative;
  touch-action: none;
}

.loading-container,
.error-container {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #64748b;
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e2e8f0;
  border-top-color: #718096;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to {
    transform: rotate(360deg)
  }
}

.visualization-area {
  width: 100%;
  height: 100%;
  min-height: 600px;
}

.family-tree {
  width: 100%;
  height: 100%;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #94a3b8;
  text-align: center;
}

.empty-state p {
  margin: 0 0 16px 0;
}

.add-node-btn {
  padding: 10px 20px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.add-node-btn:hover {
  background: #2563eb;
}

.node-circle {
  transition: all 0.3s;
  cursor: pointer;
}

.node-circle:hover {
  stroke-width: 3;
}

/* 响应式适配 */

/* 桌面端 (>1024px) */
@media (min-width: 1025px) {
  .visualization-container {
    flex: 1;
  }

  .visualization-header {
    padding: 20px;
  }

  .visualization-header h2 {
    font-size: 20px;
  }

  .visualization-controls {
    gap: 8px;
  }

  .control-btn {
    padding: 8px;
  }

  .control-btn svg {
    width: 20px;
    height: 20px;
  }

  .visualization-area {
    min-height: 600px;
  }
}

/* 平板端 (768px - 1024px) */
@media (min-width: 768px) and (max-width: 1024px) {
  .visualization-container {
    flex: 1;
  }

  .visualization-header {
    padding: 16px;
  }

  .visualization-header h2 {
    font-size: 18px;
  }

  .visualization-controls {
    gap: 6px;
  }

  .control-btn {
    padding: 6px;
  }

  .control-btn svg {
    width: 18px;
    height: 18px;
  }

  .visualization-area {
    min-height: 500px;
  }
}

/* 移动端 (<768px) */
@media (max-width: 767px) {
  .visualization-container {
    flex: 1;
  }

  .visualization-header {
    padding: 12px;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .visualization-header h2 {
    font-size: 16px;
  }

  .visualization-controls {
    width: 100%;
    justify-content: flex-end;
  }

  .control-btn {
    padding: 6px;
    border-radius: 6px;
  }

  .control-btn svg {
    width: 16px;
    height: 16px;
  }

  .visualization-area {
    min-height: 400px;
  }

  .family-tree {
    font-size: 10px;
  }

  .node-circle {
    r: 20;
  }

  .node-circle text {
    font-size: 10px;
  }

  .node-circle text:last-child {
    font-size: 8px;
  }
}
</style>
