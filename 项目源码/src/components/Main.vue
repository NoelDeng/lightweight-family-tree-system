<template>
  <div class="app-wrapper">
    <header class="top-bar">
      <h1 class="app-title">族谱系统</h1>
      <button class="logout-btn" @click="handleLogout">退出登录</button>
    </header>
    <div class="main-container">
      <TreePanel
        @node-click="handleNodeClick"
        @add-node="handleAddNode"
        @edit-node="handleEditNode"
        @delete-node="handleDeleteNode"
      />
      <Visualization
        @node-click="handleNodeClick"
        @add-node="handleAddNode"
      />
      <AddNodeDialog
        v-if="showAddNodeDialog"
        :visible="showAddNodeDialog"
        :parent-node="selectedNodeForAdd"
        @close="showAddNodeDialog = false"
        @confirm="handleNodeAdded"
      />
      <AddNodeDialog
        v-if="showEditNodeDialog"
        :visible="showEditNodeDialog"
        :node-to-edit="selectedNodeForEdit"
        @close="showEditNodeDialog = false"
        @edit="handleNodeEdited"
      />
    </div>
  </div>

  <!-- Import Dialog -->
  <div v-if="showImportDialog" class="modal-overlay" @click="showImportDialog = false">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>导入数据</h3>
        <button class="close-btn" @click="showImportDialog = false">×</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label for="importJson">JSON数据</label>
          <textarea
            id="importJson"
            v-model="importJson"
            rows="15"
            placeholder='请粘贴JSON数据，格式：[{"id":"xxx","name":"xxx","gender":"male","fatherId":"xxx","motherId":"xxx","spouseIds":[]...}]'
          ></textarea>
        </div>
        <div class="error-message" v-if="importError">{{ importError }}</div>
        <div class="success-message" v-if="importSuccess">{{ importSuccess }}</div>
      </div>
      <div class="modal-footer">
        <button class="cancel-btn" @click="showImportDialog = false">取消</button>
        <button class="confirm-btn" @click="handleImportData">确认导入</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import TreePanel from './TreePanel.vue'
import Visualization from './Visualization.vue'
import AddNodeDialog from './AddNodeDialog.vue'
import { useDataStore } from '../stores/data.js'
import { useVisualizationStore } from '../stores/visualization.js'
import { familyTreeManager } from '../classes/FamilyTreeManager.js'

const emit = defineEmits(['logout'])
const dataStore = useDataStore()
const visualizationStore = useVisualizationStore()

const showAddNodeDialog = ref(false)
const selectedNodeForAdd = ref(null)

const showEditNodeDialog = ref(false)
const selectedNodeForEdit = ref(null)

// Import dialog
const showImportDialog = ref(false)
const importJson = ref('')
const importError = ref('')
const importSuccess = ref('')

const handleNodeClick = (node) => {
  visualizationStore.selectNode(node.id)
}

const handleAddNode = (node) => {
  selectedNodeForAdd.value = node
  showAddNodeDialog.value = true
}

const handleEditNode = (node) => {
  selectedNodeForEdit.value = node
  showEditNodeDialog.value = true
}

const handleNodeEdited = async (updatedNode) => {
  try {
    const result = await familyTreeManager.updateNode(updatedNode.id, updatedNode)
    if (result.success) {
      await dataStore.loadFamilyData()
      await visualizationStore.renderTree()
    } else {
      alert('修改失败: ' + result.message)
    }
  } catch (error) {
    console.error('修改节点失败:', error)
    alert('修改失败: ' + error.message)
  }
}

const handleDeleteNode = (node) => {
  if (confirm(`确定要删除节点"${node.name}"吗？此操作不可恢复。`)) {
    familyTreeManager.deleteNode(node.id)
      .then(result => {
        if (result.success) {
          dataStore.loadFamilyData()
          visualizationStore.renderTree()
        } else {
          alert('删除失败: ' + result.message)
        }
      })
      .catch(error => {
        console.error('删除节点失败:', error)
        alert('删除失败: ' + error.message)
      })
  }
}

const handleNodeAdded = async (newNode) => {
  try {
    const result = await familyTreeManager.addNode(newNode)
    if (result.success) {
      await dataStore.loadFamilyData()
      await visualizationStore.renderTree()
    } else {
      alert('添加失败: ' + result.message)
    }
  } catch (error) {
    console.error('添加节点失败:', error)
    alert('添加失败: ' + error.message)
  }
}

const handleImportData = async () => {
  importError.value = ''
  importSuccess.value = ''

  try {
    if (!importJson.value.trim()) {
      importError.value = '请输入JSON数据'
      return
    }

    // Parse JSON
    const data = JSON.parse(importJson.value)

    // Validate data format
    if (!Array.isArray(data)) {
      throw new Error('数据格式错误：必须是数组')
    }

    for (const node of data) {
      if (!node.id || !node.name) {
        throw new Error('节点缺少必要字段：id 或 name')
      }
    }

    // Save to database
    const result = await familyTreeManager.saveFamilyData(data)

    if (result.success) {
      importSuccess.value = '成功导入 ' + data.length + ' 个节点！'
      showImportDialog.value = false

      // Refresh interface
      await dataStore.loadFamilyData()
      await visualizationStore.renderTree()

      // Clear input
      importJson.value = ''

      // Hide success message after 3 seconds
      setTimeout(() => {
        importSuccess.value = ''
      }, 3000)
    } else {
      throw new Error(result.message || '导入失败')
    }
  } catch (error) {
    console.error('导入数据失败:', error)
    importError.value = '导入失败: ' + error.message
  }
}

const handleLogout = () => {
  emit('logout')
}
</script>

<style scoped>
.app-wrapper {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 48px;
  background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
  color: white;
  flex-shrink: 0;
}

.app-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.logout-btn {
  padding: 6px 16px;
  background: rgba(255, 255, 255, 0.15);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.3s;
}

.logout-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}

.main-container {
  display: flex;
  flex: 1;
  flex-direction: row;
  overflow: hidden;
}

@media (min-width: 1025px) {
  .main-container {
    flex-direction: row;
  }
}

@media (min-width: 768px) and (max-width: 1024px) {
  .main-container {
    flex-direction: row;
  }
}

@media (max-width: 767px) {
  .main-container {
    flex-direction: column;
  }

  .tree-panel {
    height: 40vh;
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
  }

  .visualization {
    height: 60vh;
  }
}

/* 平板适配 */
@media (min-width: 768px) and (max-width: 1024px) {
  .tree-panel {
    width: 300px;
  }

  .visualization {
    flex: 1;
  }
}

/* 桌面适配 */
@media (min-width: 1025px) {
  .tree-panel {
    width: 350px;
  }

  .visualization {
    flex: 1;
  }
}

/* Import Dialog Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 600px;
  max-width: 90vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: #1e3a8a;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 28px;
  color: #6b7280;
  transition: color 0.2s;
  line-height: 1;
}

.close-btn:hover {
  color: #1f2937;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.modal-body .form-group {
  margin-bottom: 0;
}

.modal-body textarea {
  width: 100%;
  padding: 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  font-family: monospace;
  resize: vertical;
  min-height: 200px;
  box-sizing: border-box;
}

.modal-body textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.error-message {
  margin-top: 12px;
  padding: 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #dc2626;
  font-size: 14px;
}

.success-message {
  margin-top: 12px;
  padding: 12px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  color: #16a34a;
  font-size: 14px;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.cancel-btn,
.confirm-btn {
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.3s;
}

.cancel-btn {
  background: #f3f4f6;
  color: #374151;
}

.cancel-btn:hover {
  background: #e5e7eb;
}

.confirm-btn {
  background: linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%);
  color: white;
}

.confirm-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}
</style>
