<template>
  <div class="import-dialog-overlay" @click="handleOverlayClick">
    <div class="import-dialog" @click.stop>
      <div class="dialog-header">
        <h3>导入数据</h3>
        <button class="close-btn" @click="handleClose">×</button>
      </div>

      <div class="dialog-content">
        <div class="form-group">
          <label for="importJson">JSON数据</label>
          <textarea
            id="importJson"
            v-model="importJson"
            rows="15"
            placeholder='请粘贴JSON数据，格式：[{"id":"xxx","name":"xxx","gender":"male","fatherId":"xxx","motherId":"xxx","spouseIds":[]...}]'
          ></textarea>
        </div>
        <div class="error-message" v-if="errorMessage">{{ errorMessage }}</div>
        <div class="success-message" v-if="successMessage">{{ successMessage }}</div>
      </div>

      <div class="dialog-footer">
        <button class="cancel-btn" @click="handleClose">取消</button>
        <button class="confirm-btn" @click="handleConfirm">确认导入</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { familyTreeManager } from '../classes/FamilyTreeManager.js'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'confirm'])

const importJson = ref('')
const errorMessage = ref('')
const successMessage = ref('')

const handleClose = () => {
  emit('close')
}

const handleOverlayClick = () => {
  handleClose()
}

const handleConfirm = () => {
  errorMessage.value = ''
  successMessage.value = ''

  try {
    if (!importJson.value.trim()) {
      errorMessage.value = '请输入JSON数据'
      return
    }

    const data = JSON.parse(importJson.value)

    if (!Array.isArray(data)) {
      throw new Error('数据格式错误：必须是数组')
    }

    for (const node of data) {
      if (!node.id || !node.name) {
        throw new Error('节点缺少必要字段：id 或 name')
      }
    }

    emit('confirm', data)
  } catch (error) {
    console.error('导入数据失败:', error)
    errorMessage.value = '导入失败: ' + error.message
  }
}

watch(() => props.visible, (newVal) => {
  if (!newVal) {
    importJson.value = ''
    errorMessage.value = ''
    successMessage.value = ''
  }
})
</script>

<style scoped>
.import-dialog-overlay {
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

.import-dialog {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 600px;
  max-width: 90vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dialog-header h3 {
  margin: 0;
  font-size: 20px;
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

.dialog-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.dialog-content .form-group {
  margin-bottom: 0;
}

.dialog-content textarea {
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

.dialog-content textarea:focus {
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

.dialog-footer {
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
