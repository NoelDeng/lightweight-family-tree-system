<template>
  <div class="tree-panel">
    <div class="tree-panel-header">
      <h2>族谱树</h2>
      <div class="tree-panel-actions">
        <button class="action-btn" @click="handleAddNode" title="添加节点">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
        <button class="action-btn" @click="handleRefresh" title="刷新">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 4v6h-6"></path>
            <path d="M1 20v-6h6"></path>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
        </button>
        <button class="action-btn" @click="handleImport" title="导入数据">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
        </button>
        <button class="action-btn" @click="handleExport" title="导出数据">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </button>
      </div>
    </div>

    <div class="tree-panel-content">
      <div v-if="loading" class="loading-container">
        <div class="spinner"></div>
        <p>加载中...</p>
      </div>

      <div v-else-if="error" class="error-container">
        <p>{{ error }}</p>
        <button class="retry-btn" @click="handleRefresh">重试</button>
      </div>

      <div v-else class="tree-container">
        <div v-if="familyData.length === 0" class="empty-state">
          <p>暂无数据</p>
          <button class="add-node-btn" @click="handleAddNode">添加第一个节点</button>
        </div>

        <div v-else class="tree-root">
          <LazyTree
            :all-nodes="familyData"
            :initial-chunk-size="50"
            @node-click="handleNodeClick"
            @add-node="handleAddNode"
            @edit-node="handleEditNode"
            @delete-node="handleDeleteNode"
            @load-children="handleLoadChildren"
            @show-detail="handleShowDetail"
          />
        </div>
      </div>
    </div>
    <AddNodeDialog
      v-if="showAddNodeDialog"
      :visible="showAddNodeDialog"
      :parent-node="selectedNodeForAdd"
      @close="showAddNodeDialog = false"
      @confirm="handleNodeAdded"
    />
    <ImportDialog
      v-if="showImportDialog"
      :visible="showImportDialog"
      @close="showImportDialog = false"
      @confirm="handleImportData"
    />
    <NodeDetailDialog
      v-if="showDetailDialog"
      :visible="showDetailDialog"
      :node-id="selectedNodeId"
      @close="showDetailDialog = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useDataStore } from '../stores/data.js'
import { useVisualizationStore } from '../stores/visualization.js'
import { familyTreeManager } from '../classes/FamilyTreeManager.js'
import AddNodeDialog from './AddNodeDialog.vue'
import ImportDialog from './ImportDialog.vue'
import NodeDetailDialog from './NodeDetailDialog.vue'
import LazyTree from './LazyTree.vue'

const dataStore = useDataStore()
const visualizationStore = useVisualizationStore()

const emit = defineEmits(['edit-node', 'delete-node'])

const loading = ref(false)
const error = ref(null)
const showAddNodeDialog = ref(false)
const selectedNodeForAdd = ref(null)
const showImportDialog = ref(false)
const showDetailDialog = ref(false)
const selectedNodeId = ref(null)

const familyData = computed(() => dataStore.familyData)

const loadFamilyData = async () => {
  loading.value = true
  error.value = null

  try {
    await dataStore.loadFamilyData()
  } catch (err) {
    error.value = err.message
    console.error('加载族谱数据失败:', err)
  } finally {
    loading.value = false
  }
}

const handleNodeClick = (node) => {
  visualizationStore.selectNode(node.id)
}

const handleAddNode = (node) => {
  selectedNodeForAdd.value = node
  showAddNodeDialog.value = true
}

const handleEditNode = (node) => {
  emit('edit-node', node)
}

const handleDeleteNode = (node) => {
  emit('delete-node', node)
}

const handleShowDetail = (node) => {
  selectedNodeId.value = node.id
  showDetailDialog.value = true
}

const handleNodeAdded = async (newNode) => {
  console.log('节点添加成功:', newNode)
  try {
    const result = await dataStore.addNode(newNode)
    if (result.success) {
      console.log('节点添加到数据库成功')
    } else {
      console.error('节点添加失败:', result.message)
      alert('节点添加失败: ' + result.message)
    }
  } catch (err) {
    console.error('节点添加异常:', err)
    alert('节点添加异常: ' + err.message)
  }
}

const handleLoadChildren = (nodeId, children) => {
  console.log('加载子节点:', nodeId, children.length)
}

const handleRefresh = () => {
  loadFamilyData()
}

const handleImport = () => {
  showImportDialog.value = true
}

const handleExport = async () => {
  try {
    const result = await familyTreeManager.exportData()
    if (result.success) {
      const blob = new Blob([result.data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `家族谱_${new Date().toLocaleString('zh-CN').replace(/[\/:]/g, '-')}.json`
      a.click()
      URL.revokeObjectURL(url)
    } else {
      alert('导出失败: ' + result.message)
    }
  } catch (error) {
    console.error('导出数据失败:', error)
    alert('导出失败: ' + error.message)
  }
}

const handleImportData = async (jsonData) => {
  try {
    const result = await familyTreeManager.importData(JSON.stringify(jsonData))
    if (result.success) {
      await loadFamilyData()
      alert('导入成功！')
    } else {
      alert('导入失败: ' + result.message)
    }
  } catch (error) {
    console.error('导入数据失败:', error)
    alert('导入失败: ' + error.message)
  }
}

onMounted(() => {
  loadFamilyData()
})
</script>

<style scoped>
.tree-panel {
  background: #f8fafc;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* 移动端适配 */
@media (max-width: 767px) {
  .tree-panel {
    height: 40vh;
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
  }

  .tree-panel-header {
    padding: 12px;
  }

  .tree-panel-header h2 {
    font-size: 16px;
  }

  .tree-panel-actions {
    gap: 4px;
  }

  .action-btn {
    padding: 6px;
  }

  .tree-panel-content {
    padding: 12px;
  }
}

/* 平板适配 */
@media (min-width: 768px) and (max-width: 1024px) {
  .tree-panel {
    width: 300px;
  }

  .tree-panel-header h2 {
    font-size: 16px;
  }
}

/* 桌面适配 */
@media (min-width: 1025px) {
  .tree-panel {
    width: 350px;
  }

  .tree-panel-header h2 {
    font-size: 18px;
  }
}

.tree-panel-header {
  padding: 16px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.tree-panel-header h2 {
  font-size: 18px;
  color: #4a5568;
  margin: 0;
  font-weight: 600;
}

.tree-panel-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
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

.action-btn:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.tree-panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
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

.retry-btn {
  padding: 8px 16px;
  background: #718096;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 12px;
}

.retry-btn:hover {
  background: #5a6574;
}

.tree-container {
  flex: 1;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #94a3b8;
  text-align: center;
}

.empty-state p {
  margin: 0 0 16px 0;
}

.add-node-btn {
  padding: 10px 20px;
  background: #718096;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.add-node-btn:hover {
  background: #5a6574;
}

/* 响应式适配 */

/* 桌面端 (>1024px) */
@media (min-width: 1025px) {
  .tree-panel {
    width: 300px;
  }

  .tree-panel-header h2 {
    font-size: 20px;
  }

  .tree-panel-content {
    padding: 20px;
  }
}

/* 平板端 (768px - 1024px) */
@media (min-width: 768px) and (max-width: 1024px) {
  .tree-panel {
    width: 280px;
  }

  .tree-panel-header {
    padding: 14px;
  }

  .tree-panel-content {
    padding: 14px;
  }
}

/* 移动端 (<768px) */
@media (max-width: 767px) {
  .tree-panel {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
    max-height: 40vh;
  }

  .tree-panel-header {
    padding: 12px;
  }

  .tree-panel-header h2 {
    font-size: 16px;
  }

  .tree-panel-content {
    padding: 12px;
  }

  .action-btn {
    padding: 6px;
  }

  .action-btn svg {
    width: 18px;
    height: 18px;
  }
}
</style>
