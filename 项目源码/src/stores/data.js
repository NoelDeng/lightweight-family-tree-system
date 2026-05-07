import { defineStore } from 'pinia'
import { ref } from 'vue'
import { familyTreeManager } from '../classes/FamilyTreeManager.js'

export const useDataStore = defineStore('data', () => {
  const familyData = ref([])
  const loading = ref(false)
  const error = ref(null)

  // 加载族谱数据
  const loadFamilyData = async () => {
    loading.value = true
    error.value = null

    try {
      const data = await familyTreeManager.loadFamilyData()
      familyData.value = data || []
      return familyData.value
    } catch (err) {
      error.value = err.message
      console.error('加载族谱数据失败:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  // 添加节点
  const addNode = async (node) => {
    try {
      const result = await familyTreeManager.addNode(node)
      if (result.success) {
        await loadFamilyData()
      }
      return result
    } catch (err) {
      error.value = err.message
      return { success: false, message: err.message }
    }
  }

  // 更新节点
  const updateNode = async (id, updatedNode) => {
    try {
      const result = await familyTreeManager.updateNode(id, updatedNode)
      if (result.success) {
        await loadFamilyData()
      }
      return result
    } catch (err) {
      error.value = err.message
      return { success: false, message: err.message }
    }
  }

  // 删除节点
  const deleteNode = async (id) => {
    try {
      const result = await familyTreeManager.deleteNode(id)
      if (result.success) {
        await loadFamilyData()
      }
      return result
    } catch (err) {
      error.value = err.message
      return { success: false, message: err.message }
    }
  }

  // 根据ID查找节点
  const findNodeById = (id) => {
    return familyData.value.find(node => node.id === id)
  }

  // 根据父亲ID查找所有子节点
  const findChildrenByFatherId = (fatherId) => {
    return familyData.value.filter(node => node.fatherId === fatherId)
  }

  // 根据母亲ID查找所有子节点
  const findChildrenByMotherId = (motherId) => {
    return familyData.value.filter(node => node.motherId === motherId)
  }

  // 查找所有祖先
  const findAncestors = (nodeId) => {
    const ancestors = []
    let currentId = nodeId

    while (currentId) {
      const node = findNodeById(currentId)
      if (!node) break

      ancestors.unshift(node)

      if (node.fatherId) {
        currentId = node.fatherId
      } else if (node.motherId) {
        currentId = node.motherId
      } else {
        break
      }
    }

    return ancestors
  }

  // 查找所有后代
  const findDescendants = (nodeId) => {
    const descendants = []
    const children = findChildrenByFatherId(nodeId).concat(
      findChildrenByMotherId(nodeId)
    )

    for (const child of children) {
      descendants.push(child)
      descendants.push(...findDescendants(child.id))
    }

    return descendants
  }

  // 验证数据完整性
  const validateData = () => {
    const errors = []

    familyData.value.forEach(node => {
      // 检查ID唯一性
      const sameId = familyData.value.filter(n => n.id === node.id).length
      if (sameId > 1) {
        errors.push(`ID重复: ${node.id}`)
      }

      // 检查父亲ID是否存在
      if (node.fatherId && !findNodeById(node.fatherId)) {
        errors.push(`父亲ID不存在: ${node.fatherId}`)
      }

      // 检查母亲ID是否存在
      if (node.motherId && !findNodeById(node.motherId)) {
        errors.push(`母亲ID不存在: ${node.motherId}`)
      }

      // 检查循环引用
      const ancestors = findAncestors(node.id)
      if (ancestors.includes(node)) {
        errors.push(`检测到循环引用: ${node.id}`)
      }
    })

    return errors
  }

  return {
    familyData,
    loading,
    error,
    loadFamilyData,
    addNode,
    updateNode,
    deleteNode,
    findNodeById,
    findChildrenByFatherId,
    findChildrenByMotherId,
    findAncestors,
    findDescendants,
    validateData
  }
})
