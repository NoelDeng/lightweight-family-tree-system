/**
 * 节点管理类
 * 负责族谱节点的增删改查和关系管理
 */
import { ValidationManager } from './ValidationManager.js'

export class NodeManager {
  #dataManager = null
  #validationManager = new ValidationManager()

  constructor(dataManager) {
    this.#dataManager = dataManager
  }

  /**
   * 添加节点
   * @param {Object} node
   * @returns {Promise<Object>}
   */
  async addNode(node) {
    // 验证数据
    const validation = this.#validationManager.validateNode(node)
    if (!validation.valid) {
      return { success: false, message: validation.errors[0] }
    }

    try {
      await this.#dataManager.addNode(node)
      return { success: true }
    } catch (error) {
      console.error('添加节点失败:', error)
      return { success: false, message: error.message }
    }
  }

  /**
   * 更新节点
   * @param {string} id
   * @param {Object} updatedNode
   * @returns {Promise<Object>}
   */
  async updateNode(id, updatedNode) {
    try {
      await this.#dataManager.updateNode({ ...updatedNode, id })
      return { success: true }
    } catch (error) {
      console.error('更新节点失败:', error)
      return { success: false, message: error.message }
    }
  }

  /**
   * 删除节点
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async deleteNode(id) {
    try {
      await this.#dataManager.deleteNode(id)
      return { success: true }
    } catch (error) {
      console.error('删除节点失败:', error)
      return { success: false, message: error.message }
    }
  }

  /**
   * 根据ID查找节点
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async findNodeById(id) {
    return await this.#dataManager.findNodeById(id)
  }

  /**
   * 根据父亲ID查找子节点
   * @param {string} fatherId
   * @returns {Promise<Array>}
   */
  async findChildrenByFatherId(fatherId) {
    return await this.#dataManager.findChildrenByFatherId(fatherId)
  }

  /**
   * 根据母亲ID查找子节点
   * @param {string} motherId
   * @returns {Promise<Array>}
   */
  async findChildrenByMotherId(motherId) {
    return await this.#dataManager.findChildrenByMotherId(motherId)
  }

  /**
   * 查找所有祖先
   * @param {string} nodeId
   * @returns {Promise<Array>}
   */
  async findAncestors(nodeId) {
    const ancestors = []
    let currentId = nodeId

    while (currentId) {
      const node = await this.findNodeById(currentId)
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

  /**
   * 查找所有后代
   * @param {string} nodeId
   * @returns {Promise<Array>}
   */
  async findDescendants(nodeId) {
    const descendants = []

    // 获取所有孩子
    const fatherChildren = await this.findChildrenByFatherId(nodeId)
    const motherChildren = await this.findChildrenByMotherId(nodeId)
    const children = fatherChildren.concat(motherChildren)

    for (const child of children) {
      descendants.push(child)
      descendants.push(...await this.findDescendants(child.id))
    }

    return descendants
  }

  /**
   * 计算世代
   * @param {Object} node
   * @returns {Promise<number>}
   */
  async calculateGeneration(node) {
    let generation = 1

    // 检查是否有父亲或母亲
    if (node.fatherId) {
      const father = await this.findNodeById(node.fatherId)
      if (father) {
        generation = Math.max(generation, await this.calculateGeneration(father) + 1)
      }
    }

    if (node.motherId) {
      const mother = await this.findNodeById(node.motherId)
      if (mother) {
        generation = Math.max(generation, await this.calculateGeneration(mother) + 1)
      }
    }

    return generation
  }

  /**
   * 验证数据完整性
   * @returns {Promise<Array>}
   */
  async validateData() {
    const familyData = await this.#dataManager.load('familyNodes')
    const errors = []

    for (const node of familyData) {
      // 检查ID唯一性
      const sameId = familyData.filter(n => n.id === node.id).length
      if (sameId > 1) {
        errors.push(`ID重复: ${node.id}`)
      }

      // 检查父亲ID是否存在
      if (node.fatherId && !await this.findNodeById(node.fatherId)) {
        errors.push(`父亲ID不存在: ${node.fatherId}`)
      }

      // 检查母亲ID是否存在
      if (node.motherId && !await this.findNodeById(node.motherId)) {
        errors.push(`母亲ID不存在: ${node.motherId}`)
      }

      // 检查循环引用
      const ancestors = await this.findAncestors(node.id)
      if (ancestors.includes(node)) {
        errors.push(`检测到循环引用: ${node.id}`)
      }
    }

    return errors
  }

  /**
   * 获取所有节点
   * @returns {Promise<Array>}
   */
  async getAllNodes() {
    return await this.#dataManager.load('familyNodes')
  }

  /**
   * 获取节点数量
   * @returns {Promise<number>}
   */
  async getNodeCount() {
    const nodes = await this.getAllNodes()
    return nodes.length
  }
}
