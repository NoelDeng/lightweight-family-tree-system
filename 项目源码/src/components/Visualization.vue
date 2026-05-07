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

    // ============================
    // 常量
    // ============================
    const VERTICAL_GAP = 140   // 世代间垂直间距
    const SPOUSE_GAP = 100     // 配偶节点水平间距
    const SUBTREE_GAP = 80     // 兄弟子树间水平间距
    const ROOT_GAP = 80        // 独立根节点树间水平间距
    const TOP_MARGIN = 60      // 顶部边距
    const NODE_HW = 32         // 节点水平半宽（rect width 64/2）
    const NODE_HH = 18         // 节点垂直半高（rect height 36/2）

    // ============================
    // 1. 构建索引
    // ============================
    const nodeById = new Map(data.map(n => [n.id, n]))

    // 计算世代
    const calcGen = (node, visited) => {
      if (node.generation != null) return node.generation
      if (visited.has(node.id)) return 0
      visited.add(node.id)
      const pId = node.fatherId || node.motherId
      if (!pId || !nodeById.has(pId)) return 1
      return calcGen(nodeById.get(pId), visited) + 1
    }
    data.forEach(n => { n.generation = calcGen(n, new Set()) })

    // 子女映射: parentId -> [childNodes]
    const childrenMap = new Map()
    for (const n of data) {
      const pId = n.fatherId || n.motherId
      if (pId && nodeById.has(pId)) {
        if (!childrenMap.has(pId)) childrenMap.set(pId, [])
        childrenMap.get(pId).push(n)
      }
    }

    // 配偶映射: nodeId -> [spouseNodes]（避免重复边）
    const spouseOf = new Map()
    for (const n of data) {
      if (!n.spouseIds || n.spouseIds.length === 0) continue
      for (const sid of n.spouseIds) {
        if (!nodeById.has(sid)) continue
        const key = n.id < sid ? `${n.id}-${sid}` : `${sid}-${n.id}`
        if (!spouseOf.has(key)) {
          spouseOf.set(key, [n.id, sid])
        }
      }
    }

    // 配偶邻接表
    const spouseAdj = new Map()
    for (const [a, b] of spouseOf.values()) {
      if (!spouseAdj.has(a)) spouseAdj.set(a, [])
      if (!spouseAdj.has(b)) spouseAdj.set(b, [])
      spouseAdj.get(a).push(b)
      spouseAdj.get(b).push(a)
    }

    // ============================
    // 2. 找根节点
    // ============================
    const existingIds = new Set(data.map(n => n.id))
    const naturalRoots = data.filter(n => !n.fatherId && !n.motherId)
    const orphans = data.filter(n => {
      if (!n.fatherId && !n.motherId) return false
      const pId = n.fatherId || n.motherId
      return pId && !existingIds.has(pId)
    })
    for (const o of orphans) { o.fatherId = null; o.motherId = null }
    const allRoots = [...naturalRoots, ...orphans]

    // ============================
    // 3. 递归布局（自底向上）
    // ============================
    const visited = new Set()

    /**
     * 布局一个节点及其配偶组、所有后代。
     * 返回：{ minX, maxX, nodes: [{id, x, y}] }
     * 坐标相对于 0（调用方负责平移）
     */
    const layoutSubtree = (nodeId) => {
      if (visited.has(nodeId)) return null
      visited.add(nodeId)

      const node = nodeById.get(nodeId)
      if (!node) return null

      // 找配偶组（BFS 全连通分量）
      const spouseGroup = [node]
      if (spouseAdj.has(nodeId)) {
        const queue = [nodeId]
        const spVisited = new Set([nodeId])
        while (queue.length > 0) {
          const cur = queue.shift()
          for (const nb of (spouseAdj.get(cur) || [])) {
            if (!spVisited.has(nb) && nodeById.has(nb)) {
              spVisited.add(nb)
              visited.add(nb)
              spouseGroup.push(nodeById.get(nb))
              queue.push(nb)
            }
          }
        }
      }

      // 收集配偶组所有成员的子女（去重）
      const allChildren = []
      const childIds = new Set()
      for (const m of spouseGroup) {
        const kids = childrenMap.get(m.id) || []
        for (const c of kids) {
          if (!visited.has(c.id) && !childIds.has(c.id)) {
            childIds.add(c.id)
            allChildren.push(c)
          }
        }
      }

      // 按出生日期排序（同父同母按长子→幼子）
      allChildren.sort((a, b) => {
        const da = a.birthDate || '9999-99-99'
        const db = b.birthDate || '9999-99-99'
        return da.localeCompare(db)
      })

      // 递归布局每个子女的子树
      const childSubtrees = []
      for (const c of allChildren) {
        const sub = layoutSubtree(c.id)
        if (sub) childSubtrees.push(sub)
      }

      // 将子女子树从左到右排列（相对坐标，起始于 0）
      let childCursorX = 0
      for (const sub of childSubtrees) {
        const shiftX = childCursorX - sub.minX
        for (const sn of sub.nodes) {
          sn.x += shiftX
        }
        childCursorX = sub.maxX + shiftX + SUBTREE_GAP
      }

      // 计算子女总范围的 X 中心
      let childrenCenterX = 0
      if (childSubtrees.length > 0) {
        const firstChild = childSubtrees[0]
        const lastChild = childSubtrees[childSubtrees.length - 1]
        childrenCenterX = (firstChild.minX + (firstChild.minX - firstChild.minX) + lastChild.maxX + (lastChild.maxX - lastChild.maxX)) / 2
        // 简化：取所有子节点 x 的中点
        const allChildX = []
        for (const sub of childSubtrees) {
          for (const sn of sub.nodes) {
            if (sn.x != null) allChildX.push(sn.x)
          }
        }
        if (allChildX.length > 0) {
          childrenCenterX = (Math.min(...allChildX) + Math.max(...allChildX)) / 2
        }
      }

      // 配偶组水平排列，居中于子女上方
      const gen = node.generation || 1
      const y = TOP_MARGIN + (gen - 1) * VERTICAL_GAP
      const spWidth = (spouseGroup.length - 1) * SPOUSE_GAP
      const spStartX = childrenCenterX - spWidth / 2

      for (let i = 0; i < spouseGroup.length; i++) {
        spouseGroup[i].x = spStartX + i * SPOUSE_GAP
        spouseGroup[i].y = y
      }

      // 收集本子树所有节点
      const allNodes = []
      for (const m of spouseGroup) {
        allNodes.push({ id: m.id, x: m.x, y: m.y })
      }
      for (const sub of childSubtrees) {
        for (const sn of sub.nodes) {
          allNodes.push(sn)
        }
      }

      // 计算本子树的 X 包围盒
      const allXs = allNodes.map(n => n.x)
      return {
        minX: Math.min(...allXs),
        maxX: Math.max(...allXs),
        nodes: allNodes
      }
    }

    // ============================
    // 4. 布局所有根节点树
    // ============================
    // 按世代排序（先处理低世代），同世代按出生日期
    allRoots.sort((a, b) => {
      if (a.generation !== b.generation) return a.generation - b.generation
      return (a.birthDate || '').localeCompare(b.birthDate || '')
    })

    const rootSubtrees = []
    for (const root of allRoots) {
      if (visited.has(root.id)) continue
      const sub = layoutSubtree(root.id)
      if (sub) rootSubtrees.push(sub)
    }

    // 将各根节点树从左到右排列
    let rootCursorX = 0
    for (const sub of rootSubtrees) {
      const shiftX = rootCursorX - sub.minX
      for (const sn of sub.nodes) {
        const dn = nodeById.get(sn.id)
        if (dn) {
          dn.x = sn.x + shiftX
          dn.y = sn.y
        }
      }
      rootCursorX = sub.maxX + shiftX + ROOT_GAP
    }

    // ============================
    // 5. 水平居中
    // ============================
    const allX = data.map(n => n.x).filter(x => x != null)
    if (allX.length > 0) {
      const minX = Math.min(...allX)
      const maxX = Math.max(...allX)
      const treeWidth = maxX - minX
      const centerX = svgWidth.value / 2
      data.forEach(n => {
        if (n.x != null) n.x = n.x - minX - treeWidth / 2 + centerX
      })
    }

    // ============================
    // 6. 生成连接线
    // ============================
    const newLinks = []

    // 亲子连线：从父节点底部 → 子节点顶部
    for (const n of data) {
      const pId = n.fatherId || n.motherId
      if (!pId) continue
      const parent = nodeById.get(pId)
      if (!parent || parent.x == null || n.x == null) continue
      newLinks.push({
        id: `parent-${pId}-${n.id}`,
        path: bezierCurve(parent.x, parent.y + NODE_HH, n.x, n.y - NODE_HH),
        isSpouse: false
      })

      // 如另一家长也存在且非同一配偶组，也画连线
      const otherPid = n.fatherId && n.motherId
        ? (pId === n.fatherId ? n.motherId : n.fatherId)
        : null
      if (otherPid && otherPid !== pId) {
        const otherParent = nodeById.get(otherPid)
        if (otherParent && otherParent.x != null) {
          newLinks.push({
            id: `parent-${otherPid}-${n.id}`,
            path: bezierCurve(otherParent.x, otherParent.y + NODE_HH, n.x, n.y - NODE_HH),
            isSpouse: false
          })
        }
      }
    }

    // 配偶连线（避免重复）
    const spouseLinkSet = new Set()
    for (const [aId, bId] of spouseOf.values()) {
      const a = nodeById.get(aId), b = nodeById.get(bId)
      if (!a || !b || a.x == null || b.x == null) continue
      const key = aId < bId ? `${aId}-${bId}` : `${bId}-${aId}`
      if (spouseLinkSet.has(key)) continue
      spouseLinkSet.add(key)
      newLinks.push({
        id: `spouse-${key}`,
        path: bezierCurve(a.x + NODE_HW, a.y, b.x - NODE_HW, b.y),
        isSpouse: true
      })
    }

    linkData.value = newLinks

    // ============================
    // 7. 初始视图居中
    // ============================
    const allY = data.map(n => n.y).filter(y => y != null)
    if (allX.length > 0 && allY.length > 0) {
      const bboxMinX = Math.min(...allX)
      const bboxMaxX = Math.max(...allX)
      const bboxMinY = Math.min(...allY)
      const bboxMaxY = Math.max(...allY)
      const bboxCX = (bboxMinX + bboxMaxX) / 2
      const bboxCY = (bboxMinY + bboxMaxY) / 2
      transform.value = {
        x: svgWidth.value / 2 - bboxCX,
        y: svgHeight.value / 2 - bboxCY
      }
    } else {
      transform.value = { x: 0, y: 0 }
    }
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
