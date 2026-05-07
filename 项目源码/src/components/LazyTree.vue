<template>
  <div class="lazy-tree">
    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>

    <div v-else-if="error" class="error-container">
      <p>{{ error }}</p>
      <button class="retry-btn" @click="loadMore">重试</button>
    </div>

    <div v-else class="tree-content">
      <div v-if="visibleNodes.length === 0" class="empty-state">
        <p>暂无数据</p>
        <button class="add-node-btn" @click="$emit('add-node', null)">添加第一个节点</button>
      </div>

      <div v-else class="tree-root">
        <TreeNode
          v-for="node in visibleNodes"
          :key="node.id"
          :node="node"
          :depth="getNodeDepth(node.id)"
          :lazy-load="true"
          :expanded="expandedNodes.has(node.id)"
          @node-click="$emit('node-click', node)"
          @add-node="$emit('add-node', node)"
          @edit-node="$emit('edit-node', node)"
          @delete-node="$emit('delete-node', node)"
          @show-detail="$emit('show-detail', node)"
          @toggle-expand="handleToggleExpand"
        />
      </div>
    </div>

    <div v-if="hasMore" class="load-more-container">
      <button class="load-more-btn" @click="loadMore" :disabled="loading">
        <span v-if="loading" class="loading-spinner"></span>
        {{ loading ? '加载中...' : '加载更多' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import TreeNode from './TreeNode.vue'
import ChunkLoader from '../services/ChunkLoader.js'

const props = defineProps({
  allNodes: {
    type: Array,
    required: true
  },
  initialChunkSize: {
    type: Number,
    default: 50
  }
})

const emit = defineEmits([
  'node-click',
  'add-node',
  'edit-node',
  'delete-node',
  'load-more',
  'load-children',
  'show-detail',
  'expand-node'
])

const loading = ref(false)
const error = ref(null)

const chunkLoader = ref(null)
const visibleNodes = ref([])
const loadedChildren = ref(new Map())
const expandedNodes = ref(new Set())

const findNode = (nodeId) => {
  return props.allNodes.find(n => n.id === nodeId)
}

const getChildren = (nodeId) => {
  return props.allNodes.filter(n =>
    (n.fatherId === nodeId || n.motherId === nodeId)
  )
}

const hasMore = computed(() => {
  return chunkLoader.value ? chunkLoader.value.hasMore() : (visibleNodes.value.length < props.allNodes.length)
})

const getNodeDepth = (nodeId) => {
  let depth = 0
  let currentId = nodeId
  while (currentId) {
    const node = props.allNodes.find(n => n.id === currentId)
    if (!node || !node.fatherId && !node.motherId) break
    depth++
    currentId = node.fatherId || node.motherId
  }
  return depth
}

const loadChildren = async (nodeId) => {
  try {
    const children = getChildren(nodeId)
    loadedChildren.value.set(nodeId, children)
    emit('load-children', nodeId, children)
  } catch (err) {
    console.error('加载子节点失败:', err)
  }
}

const loadMore = async () => {
  if (loading.value) return
  if (props.allNodes.length === 0) return
  if (visibleNodes.value.length >= props.allNodes.length) return

  loading.value = true
  error.value = null

  try {
    if (!chunkLoader.value) {
      chunkLoader.value = new ChunkLoader(50)
      chunkLoader.value.splitIntoChunks(props.allNodes)
    }

    const nextChunkIndex = Math.floor(visibleNodes.value.length / 50)
    const chunk = await chunkLoader.value.loadChunk(nextChunkIndex)

    if (chunk && chunk.length > 0) {
      visibleNodes.value = [...visibleNodes.value, ...chunk]
    }
  } catch (err) {
    error.value = err.message
    console.error('加载更多节点失败:', err)
  } finally {
    loading.value = false
  }
}

const loadChunk = async (chunkIndex) => {
  if (!chunkLoader.value) {
    chunkLoader.value = new ChunkLoader(50)
    chunkLoader.value.splitIntoChunks(props.allNodes)
  }
  const chunk = await chunkLoader.value.loadChunk(chunkIndex)
  if (chunk && chunk.length > 0) {
    visibleNodes.value = [...visibleNodes.value, ...chunk]
  }
}

const handleToggleExpand = (nodeId) => {
  if (expandedNodes.value.has(nodeId)) {
    expandedNodes.value.delete(nodeId)
  } else {
    expandedNodes.value.add(nodeId)
  }
}

const expandNode = (nodeId) => {
  const parents = []
  let currentId = nodeId
  while (currentId) {
    const node = findNode(currentId)
    if (!node || !node.fatherId && !node.motherId) break
    parents.push(node.fatherId || node.motherId)
    currentId = node.fatherId || node.motherId
  }
  for (let i = parents.length - 1; i >= 0; i--) {
    expandedNodes.value.add(parents[i])
  }
  if (!visibleNodes.value.find(n => n.id === nodeId)) {
    const nodeIndex = props.allNodes.findIndex(n => n.id === nodeId)
    if (nodeIndex >= 0) {
      loadChunk(Math.floor(nodeIndex / 50))
    }
  }
}

onMounted(() => {
  if (props.allNodes.length > 0) {
    loadMore()
  }
})

watch(() => props.allNodes, (newNodes) => {
  if (newNodes.length === 0) {
    visibleNodes.value = []
    if (chunkLoader.value) chunkLoader.value.reset()
    return
  }
  if (chunkLoader.value) {
    chunkLoader.value.reset()
    chunkLoader.value.splitIntoChunks(newNodes)
  }
  visibleNodes.value = []
  loadMore()
})
</script>

<style scoped>
.lazy-tree {
  height: 100%;
  overflow-y: auto;
}

.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #64748b;
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

.tree-content {
  flex: 1;
  overflow-y: auto;
}

.tree-root {
  padding: 8px 0;
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
  padding: 10px 24px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s;
}

.add-node-btn:hover {
  background: #2563eb;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.load-more-container {
  padding: 16px;
  text-align: center;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
}

.load-more-btn {
  padding: 10px 24px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s;
}

.load-more-btn:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.load-more-btn:disabled {
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
  margin-right: 8px;
}

.retry-btn {
  padding: 8px 16px;
  background: #718096;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.3s;
}

.retry-btn:hover {
  background: #5a6574;
}
</style>
