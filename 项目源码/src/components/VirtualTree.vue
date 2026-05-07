<template>
  <RecycleScroller
    :items="visibleNodes"
    :item-size="80"
    key-field="id"
    v-slot="{ item }"
    class="virtual-tree"
    @scroll="handleScroll"
  >
    <div class="node-item">
      <TreeNode
        :node="item"
        :depth="getNodeDepth(item.id)"
        @node-click="handleNodeClick"
        @add-node="handleAddNode"
        @edit-node="handleEditNode"
        @delete-node="handleDeleteNode"
      />
    </div>
  </RecycleScroller>

  <div v-if="hasMore" class="load-more-container">
    <button class="load-more-btn" @click="loadMore" :disabled="loading">
      <span v-if="loading" class="loading-spinner"></span>
      {{ loading ? '加载中...' : '加载更多' }}
    </button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import RecycleScroller from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import TreeNode from './TreeNode.vue'
import { useDataStore } from '../stores/data.js'

const props = defineProps({
  visibleNodes: {
    type: Array,
    required: true
  },
  maxVisible: {
    type: Number,
    default: 100
  },
  chunkSize: {
    type: Number,
    default: 50
  }
})

const emit = defineEmits([
  'node-click',
  'add-node',
  'edit-node',
  'delete-node',
  'load-more'
])

const dataStore = useDataStore()

const loading = ref(false)
const visibleCount = ref(props.maxVisible)

const hasMore = computed(() => {
  return props.visibleNodes.length >= props.maxVisible
})

const visibleNodes = computed(() => {
  return props.visibleNodes.slice(0, visibleCount.value)
})

const getNodeDepth = (nodeId) => {
  // 计算节点深度
  let depth = 0
  let currentId = nodeId

  while (currentId) {
    const node = dataStore.findNodeById(currentId)
    if (!node || !node.fatherId && !node.motherId) break

    depth++
    currentId = node.fatherId || node.motherId
  }

  return depth
}

const handleNodeClick = (node) => {
  emit('node-click', node)
}

const handleAddNode = (node) => {
  emit('add-node', node)
}

const handleEditNode = (node) => {
  emit('edit-node', node)
}

const handleDeleteNode = (node) => {
  emit('delete-node', node)
}

const loadMore = async () => {
  if (loading.value || !hasMore.value) return

  loading.value = true

  try {
    // 加载更多节点
    const allNodes = await dataStore.loadFamilyData()

    if (allNodes.length > visibleCount.value) {
      visibleCount.value += props.chunkSize
      emit('load-more', visibleCount.value)
    }
  } catch (err) {
    console.error('加载更多节点失败:', err)
  } finally {
    loading.value = false
  }
}

const handleScroll = (e) => {
  // 滚动到顶部时加载更多
  if (e.target.scrollTop === 0 && hasMore.value) {
    loadMore()
  }
}

onMounted(() => {
  // 初始加载
  if (hasMore.value) {
    loadMore()
  }
})
</script>

<style scoped>
.virtual-tree {
  height: 100%;
  overflow-y: auto;
}

.node-item {
  padding: 8px 0;
  border-bottom: 1px solid #e5e7eb;
}

.load-more-container {
  padding: 16px;
  text-align: center;
  background: #f8fafc;
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

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
