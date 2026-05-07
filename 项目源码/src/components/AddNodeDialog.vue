<template>
  <div class="add-node-dialog-overlay" @click="handleOverlayClick">
    <div class="add-node-dialog" @click.stop>
      <div class="dialog-header">
        <h3>{{ isEditMode ? '编辑节点' : '添加节点' }}</h3>
        <button class="close-btn" @click="handleClose">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="dialog-content">
        <div class="form-group">
          <label for="nodeName" class="required-label">姓名 <span class="required-mark">*</span></label>
          <input
            id="nodeName"
            v-model="formData.name"
            type="text"
            placeholder="请输入姓名"
            maxlength="50"
          />
        </div>

        <div class="form-group">
          <label for="nodeGender">性别</label>
          <select id="nodeGender" v-model="formData.gender">
            <option value="">请选择</option>
            <option value="male">男</option>
            <option value="female">女</option>
          </select>
        </div>

        <div class="form-group">
          <label for="nodeBirthDate">出生日期</label>
          <input
            id="nodeBirthDate"
            v-model="formData.birthDate"
            type="date"
          />
        </div>

        <div class="form-group">
          <label for="nodeFather">父亲</label>
          <select id="nodeFather" v-model="formData.fatherId">
            <option value="">无</option>
            <option v-for="node in maleNodes" :key="node.id" :value="node.id">
              {{ node.name }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label for="nodeMother">母亲</label>
          <select id="nodeMother" v-model="formData.motherId">
            <option value="">无</option>
            <option v-for="node in femaleNodes" :key="node.id" :value="node.id">
              {{ node.name }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label for="nodeSpouse">配偶（可选）</label>
          <div class="multi-select-container">
            <div v-for="(spouse, index) in formData.spouseIds" :key="index" class="multi-select-item">
              <select v-model="formData.spouseIds[index]">
                <option value="">无</option>
                <option v-for="node in availableNodes" :key="node.id" :value="node.id">
                  {{ node.name }}
                </option>
              </select>
              <button type="button" class="remove-btn" @click="removeSpouse(index)" v-if="formData.spouseIds.length > 1">×</button>
            </div>
            <button type="button" class="add-btn" @click="addSpouse">
              + 添加配偶
            </button>
          </div>
        </div>

        <div class="form-group">
          <label for="nodeBio">备注</label>
          <textarea
            id="nodeBio"
            v-model="formData.bio"
            rows="3"
            placeholder="请输入备注信息"
            maxlength="200"
          ></textarea>
        </div>
      </div>

      <div class="dialog-footer">
        <button class="cancel-btn" @click="handleClose">取消</button>
        <button class="confirm-btn" @click="handleConfirm" :disabled="!isFormValid">
          {{ isEditMode ? '确认修改' : '确认添加' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useDataStore } from '../stores/data.js'
import { generateId } from '../utils/helpers.js'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  parentNode: {
    type: Object,
    default: null
  },
  nodeToEdit: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'confirm', 'edit'])

const dataStore = useDataStore()

const isEditMode = computed(() => !!props.nodeToEdit)

const formData = ref({
  name: '',
  gender: '',
  birthDate: '',
  fatherId: '',
  motherId: '',
  spouseIds: [''],
  bio: ''
})

const isFormValid = computed(() => {
  return formData.value.name.trim().length > 0 &&
         formData.value.gender.trim().length > 0
})

const validateSpouseRelationships = () => {
  const spouseIds = formData.value.spouseIds.filter(id => id.trim() !== '')

  // 检查配偶不能是同一个人
  const uniqueSpouses = [...new Set(spouseIds)]
  if (uniqueSpouses.length !== spouseIds.length) {
    return { valid: false, error: '配偶不能重复选择' }
  }

  // 检查配偶不能是孩子
  if (props.parentNode) {
    const descendants = dataStore.findDescendants(props.parentNode.id)
    for (const spouseId of spouseIds) {
      if (descendants.some(d => d.id === spouseId)) {
        return { valid: false, error: '配偶不能是孩子' }
      }
    }
  }

  return { valid: true }
}

const availableNodes = computed(() => {
  if (props.parentNode) {
    const descendants = dataStore.findDescendants(props.parentNode.id)
    return dataStore.familyData.filter(node =>
      !descendants.includes(node)
    )
  }
  return dataStore.familyData
})

const maleNodes = computed(() => availableNodes.value.filter(n => n.gender === 'male'))
const femaleNodes = computed(() => availableNodes.value.filter(n => n.gender === 'female'))

const addSpouse = () => {
  if (formData.value.spouseIds.length < 5) {
    formData.value.spouseIds.push('')
  }
}

const removeSpouse = (index) => {
  if (formData.value.spouseIds.length > 1) {
    formData.value.spouseIds.splice(index, 1)
  }
}

const handleOverlayClick = () => {
  handleClose()
}

const handleClose = () => {
  emit('close')
}

const handleConfirm = () => {
  if (!isFormValid.value) return

  // 双向验证
  const spouseValidation = validateSpouseRelationships()
  if (!spouseValidation.valid) {
    alert(spouseValidation.error)
    return
  }

  const spouseIds = formData.value.spouseIds.filter(id => id.trim() !== '')

  if (isEditMode.value) {
    // 编辑模式
    const updatedNode = {
      id: props.nodeToEdit.id,
      name: formData.value.name.trim(),
      gender: formData.value.gender || '',
      birthDate: formData.value.birthDate || '',
      fatherId: formData.value.fatherId || null,
      motherId: formData.value.motherId || null,
      spouseIds: spouseIds.length > 0 ? spouseIds : null,
      bio: formData.value.bio.trim() || '',
      generation: props.nodeToEdit.generation
    }

    emit('edit', updatedNode)
  } else {
    // 添加模式
    const newNode = {
      id: generateId(),
      name: formData.value.name.trim(),
      gender: formData.value.gender || '',
      birthDate: formData.value.birthDate || '',
      fatherId: formData.value.fatherId || null,
      motherId: formData.value.motherId || null,
      spouseIds: spouseIds.length > 0 ? spouseIds : null,
      bio: formData.value.bio.trim() || '',
      generation: props.parentNode ? props.parentNode.generation + 1 : 1
    }

    emit('confirm', newNode)
  }

  handleClose()
}

watch(() => props.visible, (newVal) => {
  if (newVal) {
    if (isEditMode.value && props.nodeToEdit) {
      // 编辑模式：加载节点数据
      formData.value = {
        name: props.nodeToEdit.name || '',
        gender: props.nodeToEdit.gender || '',
        birthDate: props.nodeToEdit.birthDate || '',
        fatherId: props.nodeToEdit.fatherId || '',
        motherId: props.nodeToEdit.motherId || '',
        spouseIds: props.nodeToEdit.spouseIds && props.nodeToEdit.spouseIds.length > 0
          ? [...props.nodeToEdit.spouseIds]
          : [''],
        bio: props.nodeToEdit.bio || ''
      }
    } else {
      // 添加模式：清空表单
      formData.value = {
        name: '',
        gender: '',
        birthDate: '',
        fatherId: '',
        motherId: '',
        spouseIds: [''],
        bio: ''
      }
    }
  }
})
</script>

<style scoped>
.add-node-dialog-overlay {
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

.add-node-dialog {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 500px;
  max-width: 90vw;
  max-height: 80vh;
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
  padding: 4px;
  border-radius: 4px;
  transition: background 0.2s;
}

.close-btn:hover {
  background: #f1f5f9;
}

.dialog-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #4a5568;
  margin-bottom: 6px;
}

.required-label {
  color: #4a5568;
}

.required-mark {
  color: #e53e3e;
  font-weight: 600;
  font-size: 16px;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.3s;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #718096;
  box-shadow: 0 0 0 3px rgba(113, 128, 150, 0.2);
}

.form-group input::placeholder,
.form-group textarea::placeholder {
  color: #9ca3af;
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.multi-select-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.multi-select-item {
  display: flex;
  gap: 8px;
  align-items: center;
}

.multi-select-item select {
  flex: 1;
}

.remove-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: #ef4444;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.remove-btn:hover {
  background: #dc2626;
}

.add-btn {
  padding: 8px 12px;
  background: #e5e7eb;
  color: #374151;
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.3s;
}

.add-btn:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dialog-footer {
  padding: 20px 24px;
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
  transition: all 0.3s;
  border: none;
}

.cancel-btn {
  background: #f1f5f9;
  color: #475569;
}

.cancel-btn:hover {
  background: #e2e8f0;
}

.confirm-btn {
  background: linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%);
  color: white;
}

.confirm-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.confirm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
</style>
