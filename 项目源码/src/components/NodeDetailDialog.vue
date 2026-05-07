<template>
  <div v-if="visible" class="modal-overlay" @click="handleClose">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>节点详情</h3>
        <button class="close-btn" @click="handleClose">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <div v-if="loading" class="loading-container">
          <div class="spinner"></div>
          <p>加载中...</p>
        </div>

        <div v-else-if="error" class="error-container">
          <p>{{ error }}</p>
          <button class="retry-btn" @click="loadNodeDetail">重试</button>
        </div>

        <div v-else-if="node" class="node-detail">
          <div class="detail-item">
            <label>姓名：</label>
            <span class="detail-value">{{ node.name }}</span>
          </div>

          <div class="detail-item">
            <label>ID：</label>
            <span class="detail-value">{{ node.id }}</span>
          </div>

          <div class="detail-item">
            <label>性别：</label>
            <span class="detail-value">{{ formatGender(node.gender) }}</span>
          </div>

          <div class="detail-item">
            <label>世代：</label>
            <span class="detail-value">{{ formatGeneration(node.generation) }}</span>
          </div>

          <div class="detail-item">
            <label>出生日期：</label>
            <span class="detail-value">{{ formatDate(node.birthDate) }}</span>
          </div>

          <div class="detail-item">
            <label>父亲：</label>
            <span class="detail-value">{{ node.fatherId ? 'ID: ' + node.fatherId : '无' }}</span>
          </div>

          <div class="detail-item">
            <label>母亲：</label>
            <span class="detail-value">{{ node.motherId ? 'ID: ' + node.motherId : '无' }}</span>
          </div>

          <div class="detail-item">
            <label>配偶：</label>
            <span class="detail-value">{{ node.spouseIds && node.spouseIds.length > 0 ? node.spouseIds.join(', ') : '无' }}</span>
          </div>

          <div class="detail-item">
            <label>备注：</label>
            <span class="detail-value">{{ node.bio || '无' }}</span>
          </div>
        </div>

        <div v-else class="empty-state">
          <p>节点不存在</p>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="handleClose">关闭</button>
        <button class="btn btn-primary" @click="handleEdit" v-if="node">编辑</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { familyTreeManager } from '../classes/FamilyTreeManager.js'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  nodeId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['close', 'edit'])

const loading = ref(false)
const error = ref(null)
const node = ref(null)

const loadNodeDetail = async () => {
  loading.value = true
  error.value = null

  try {
    node.value = await familyTreeManager.findNodeById(props.nodeId)
  } catch (err) {
    error.value = err.message
    console.error('加载节点详情失败:', err)
  } finally {
    loading.value = false
  }
}

const handleClose = () => {
  emit('close')
}

const handleEdit = () => {
  emit('edit', node.value)
}

const formatGender = (gender) => {
  if (!gender) return '未知'
  return gender === 'male' ? '男' : '女'
}

const formatGeneration = (generation) => {
  if (!generation) return '1代'
  return generation + '代'
}

const formatDate = (dateString) => {
  if (!dateString) return '未知'
  return familyTreeManager.formatDate(dateString)
}

watch(() => props.nodeId, (newId) => {
  if (newId && props.visible) {
    loadNodeDetail()
  }
}, { immediate: true })

watch(() => props.visible, (newVisible) => {
  if (newVisible && !node.value) {
    loadNodeDetail()
  }
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    transform: translateY(-50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 20px;
  color: #2d3748;
  font-weight: 600;
}

.close-btn {
  padding: 4px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: #718096;
  transition: color 0.3s;
}

.close-btn:hover {
  color: #2d3748;
}

.close-btn svg {
  width: 24px;
  height: 24px;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
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

.node-detail {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
}

.detail-item label {
  font-weight: 600;
  color: #4a5568;
  min-width: 80px;
  flex-shrink: 0;
}

.detail-value {
  color: #2d3748;
  word-break: break-all;
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
  margin: 0;
}

.modal-footer {
  padding: 20px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s;
}

.btn-secondary {
  background: #e2e8f0;
  color: #4a5568;
}

.btn-secondary:hover {
  background: #cbd5e1;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

/* 响应式适配 */

/* 桌面端 (>1024px) */
@media (min-width: 1025px) {
  .modal-content {
    max-width: 600px;
  }

  .detail-item {
    padding: 16px;
  }
}

/* 平板端 (768px - 1024px) */
@media (min-width: 768px) and (max-width: 1024px) {
  .modal-content {
    max-width: 500px;
  }

  .detail-item {
    padding: 12px;
  }
}

/* 移动端 (<768px) */
@media (max-width: 767px) {
  .modal-content {
    width: 95%;
    max-height: 90vh;
  }

  .modal-header {
    padding: 16px;
  }

  .modal-header h3 {
    font-size: 18px;
  }

  .modal-body {
    padding: 16px;
  }

  .detail-item {
    padding: 10px;
    gap: 8px;
  }

  .detail-item label {
    min-width: 70px;
    font-size: 13px;
  }

  .detail-value {
    font-size: 14px;
  }

  .modal-footer {
    padding: 16px;
  }

  .btn {
    padding: 8px 16px;
    font-size: 13px;
  }
}
</style>
