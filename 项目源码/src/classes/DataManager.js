/**
 * 数据管理类
 * 负责族谱数据的加载、保存和管理
 */
import { DatabaseManager } from './DatabaseManager.js'

export class DataManager {
  #databaseManager = null

  constructor(databaseManager = null) {
    this.#databaseManager = databaseManager || new DatabaseManager()
  }

  /**
   * 加载族谱数据
   * @returns {Promise<Array>}
   */
  async loadFamilyData() {
    return await this.#databaseManager.load('familyNodes')
  }

  /**
   * 保存族谱数据
   * @param {Array} data
   * @returns {Promise<Object>}
   */
  async saveFamilyData(data) {
    try {
      await this.#databaseManager.save('familyNodes', data)
      return { success: true }
    } catch (error) {
      console.error('保存数据失败:', error)
      return { success: false, message: error.message }
    }
  }

  /**
   * 清空所有数据
   * @returns {Promise<Object>}
   */
  async clearAllData() {
    try {
      await this.#databaseManager.clear('familyNodes')
      return { success: true }
    } catch (error) {
      console.error('清空数据失败:', error)
      return { success: false, message: error.message }
    }
  }

  /**
   * 添加节点
   * @param {Object} node
   * @returns {Promise<Object>}
   */
  async addNode(node) {
    try {
      const data = await this.loadFamilyData()
      data.push(node)
      await this.saveFamilyData(data)
      return { success: true }
    } catch (error) {
      console.error('添加节点失败:', error)
      return { success: false, message: error.message }
    }
  }

  /**
   * 更新节点
   * @param {Object} node
   * @returns {Promise<Object>}
   */
  async updateNode(node) {
    try {
      const data = await this.loadFamilyData()
      const index = data.findIndex(n => n.id === node.id)
      if (index !== -1) {
        data[index] = node
        await this.saveFamilyData(data)
        return { success: true }
      }
      return { success: false, message: '节点不存在' }
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
      const data = await this.loadFamilyData()
      const filteredData = data.filter(n => n.id !== id)
      await this.saveFamilyData(filteredData)
      return { success: true }
    } catch (error) {
      console.error('删除节点失败:', error)
      return { success: false, message: error.message }
    }
  }

  /**
   * 导出数据
   * @returns {Promise<Object>}
   */
  async exportData() {
    try {
      const data = await this.loadFamilyData()
      const jsonString = JSON.stringify(data, null, 2)
      return { success: true, data: jsonString }
    } catch (error) {
      console.error('导出数据失败:', error)
      return { success: false, message: error.message }
    }
  }

  /**
   * 导入数据
   * @param {string} jsonString
   * @returns {Promise<Object>}
   */
  async importData(jsonString) {
    try {
      const result = await this.#databaseManager.import('familyNodes', jsonString)
      return result
    } catch (error) {
      console.error('导入数据失败:', error)
      return { success: false, message: error.message }
    }
  }

  /**
   * 获取节点数量
   * @returns {Promise<number>}
   */
  async getNodeCount() {
    const data = await this.loadFamilyData()
    return data.length
  }

  /**
   * 获取所有节点
   * @returns {Promise<Array>}
   */
  async getAllNodes() {
    return await this.loadFamilyData()
  }

  /**
   * 根据ID查找节点
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async findNodeById(id) {
    return await this.#databaseManager.findNodeById(id)
  }

  /**
   * 根据父亲ID查找子节点
   * @param {string} fatherId
   * @returns {Promise<Array>}
   */
  async findChildrenByFatherId(fatherId) {
    return await this.#databaseManager.findChildrenByFatherId(fatherId)
  }

  /**
   * 根据母亲ID查找子节点
   * @param {string} motherId
   * @returns {Promise<Array>}
   */
  async findChildrenByMotherId(motherId) {
    return await this.#databaseManager.findChildrenByMotherId(motherId)
  }

  /**
   * 加载指定存储的数据
   * @param {string} storeName
   * @returns {Promise<Array>}
   */
  async load(storeName) {
    return await this.#databaseManager.load(storeName)
  }
}
