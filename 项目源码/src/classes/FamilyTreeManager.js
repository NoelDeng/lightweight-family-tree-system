/**
 * 家族树总管理类
 * 暴露所有功能接口
 */
import { DatabaseManager } from './DatabaseManager.js'
import { EncryptionManager } from './EncryptionManager.js'
import { ValidationManager } from './ValidationManager.js'
import { NodeManager } from './NodeManager.js'
import { VisualizationManager } from './VisualizationManager.js'
import { HelperManager } from './HelperManager.js'
import { AuthManager } from './AuthManager.js'
import { DataManager } from './DataManager.js'

export class FamilyTreeManager {
  // 管理器实例
  #databaseManager = null
  #encryptionManager = null
  #validationManager = null
  #nodeManager = null
  #visualizationManager = null
  #helperManager = null
  #authManager = null
  #dataManager = null

  constructor() {
    // 共享同一个 DatabaseManager 实例
    this.#databaseManager = new DatabaseManager()
    this.#dataManager = new DataManager(this.#databaseManager)
    this.#encryptionManager = new EncryptionManager()
    this.#validationManager = new ValidationManager()
    this.#nodeManager = new NodeManager(this.#dataManager)
    this.#visualizationManager = new VisualizationManager(this.#nodeManager)
    this.#helperManager = new HelperManager()
    this.#authManager = new AuthManager(this.#databaseManager)
  }

  // ========== 数据库管理 ==========

  /**
   * 打开数据库
   * @returns {Promise<IDBDatabase>}
   */
  async openDatabase() {
    return await this.#databaseManager.open()
  }

  /**
   * 保存数据
   * @param {string} storeName
   * @param {Array} data
   * @returns {Promise<void>}
   */
  async saveDatabase(storeName, data) {
    await this.#databaseManager.save(storeName, data)
  }

  /**
   * 加载数据
   * @param {string} storeName
   * @returns {Promise<Array>}
   */
  async loadDatabase(storeName) {
    return await this.#databaseManager.load(storeName)
  }

  /**
   * 导出数据
   * @param {string} storeName
   * @returns {Promise<string>}
   */
  async exportDatabase(storeName) {
    return await this.#databaseManager.export(storeName)
  }

  /**
   * 导入数据
   * @param {string} storeName
   * @param {string} jsonString
   * @returns {Promise<Object>}
   */
  async importDatabase(storeName, jsonString) {
    return await this.#databaseManager.import(storeName, jsonString)
  }

  // ========== 认证管理 ==========

  /**
   * 设置管理员密码
   * @param {string} password
   * @returns {Promise<Object>}
   */
  async setupAdminPassword(password) {
    return await this.#authManager.setupAdminPassword(password)
  }

  /**
   * 验证登录
   * @param {string} password
   * @returns {Promise<Object>}
   */
  async login(password) {
    return await this.#authManager.login(password)
  }

  /**
   * 检查是否已设置密码
   * @returns {Promise<boolean>}
   */
  async hasPasswordSet() {
    return await this.#authManager.hasPasswordSet()
  }

  /**
   * 修改管理员密码
   * @param {string} oldPassword
   * @param {string} newPassword
   * @returns {Promise<Object>}
   */
  async changePassword(oldPassword, newPassword) {
    return await this.#authManager.changePassword(oldPassword, newPassword)
  }

  // ========== 数据管理 ==========

  /**
   * 加载族谱数据
   * @returns {Promise<Array>}
   */
  async loadFamilyData() {
    return await this.#dataManager.loadFamilyData()
  }

  /**
   * 保存族谱数据
   * @param {Array} data
   * @returns {Promise<Object>}
   */
  async saveFamilyData(data) {
    return await this.#dataManager.saveFamilyData(data)
  }

  /**
   * 清空所有数据
   * @returns {Promise<Object>}
   */
  async clearAllData() {
    return await this.#dataManager.clearAllData()
  }

  /**
   * 导出数据
   * @returns {Promise<Object>}
   */
  async exportData() {
    return await this.#dataManager.exportData()
  }

  /**
   * 导入数据
   * @param {string} jsonString
   * @returns {Promise<Object>}
   */
  async importData(jsonString) {
    return await this.#dataManager.importData(jsonString)
  }

  /**
   * 获取节点数量
   * @returns {Promise<number>}
   */
  async getNodeCount() {
    return await this.#dataManager.getNodeCount()
  }

  // ========== 节点管理 ==========

  /**
   * 添加节点
   * @param {Object} node
   * @returns {Promise<Object>}
   */
  async addNode(node) {
    return await this.#nodeManager.addNode(node)
  }

  /**
   * 更新节点
   * @param {string} id
   * @param {Object} updatedNode
   * @returns {Promise<Object>}
   */
  async updateNode(id, updatedNode) {
    return await this.#nodeManager.updateNode(id, updatedNode)
  }

  /**
   * 删除节点
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async deleteNode(id) {
    return await this.#nodeManager.deleteNode(id)
  }

  /**
   * 根据ID查找节点
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async findNodeById(id) {
    return await this.#nodeManager.findNodeById(id)
  }

  /**
   * 根据父亲ID查找子节点
   * @param {string} fatherId
   * @returns {Promise<Array>}
   */
  async findChildrenByFatherId(fatherId) {
    return await this.#nodeManager.findChildrenByFatherId(fatherId)
  }

  /**
   * 根据母亲ID查找子节点
   * @param {string} motherId
   * @returns {Promise<Array>}
   */
  async findChildrenByMotherId(motherId) {
    return await this.#nodeManager.findChildrenByMotherId(motherId)
  }

  /**
   * 查找所有祖先
   * @param {string} nodeId
   * @returns {Promise<Array>}
   */
  async findAncestors(nodeId) {
    return await this.#nodeManager.findAncestors(nodeId)
  }

  /**
   * 查找所有后代
   * @param {string} nodeId
   * @returns {Promise<Array>}
   */
  async findDescendants(nodeId) {
    return await this.#nodeManager.findDescendants(nodeId)
  }

  /**
   * 计算世代
   * @param {Object} node
   * @returns {Promise<number>}
   */
  async calculateGeneration(node) {
    return await this.#nodeManager.calculateGeneration(node)
  }

  /**
   * 验证数据完整性
   * @returns {Promise<Array>}
   */
  async validateData() {
    return await this.#nodeManager.validateData()
  }

  // ========== 可视化管理 ==========

  /**
   * 设置SVG尺寸
   * @param {number} width
   * @param {number} height
   */
  setSvgSize(width, height) {
    this.#visualizationManager.setSvgSize(width, height)
  }

  /**
   * 渲染家族树
   * @param {Array} nodes
   * @returns {Promise<Object>}
   */
  async renderTree(nodes) {
    return this.#visualizationManager.renderTree(nodes)
  }

  /**
   * 获取SVG尺寸
   * @returns {Promise<Object>}
   */
  getSvgSize() {
    return this.#visualizationManager.getSvgSize()
  }

  // ========== 工具管理 ==========

  /**
   * 生成唯一ID
   * @returns {string}
   */
  static generateId() {
    return HelperManager.generateId()
  }

  /**
   * 格式化日期
   * @param {string} dateString
   * @returns {string}
   */
  static formatDate(dateString) {
    return HelperManager.formatDate(dateString)
  }

  /**
   * 格式化日期时间
   * @param {string} dateString
   * @returns {string}
   */
  static formatDateTime(dateString) {
    return HelperManager.formatDateTime(dateString)
  }

  /**
   * 格式化性别
   * @param {string} gender
   * @returns {string}
   */
  static formatGender(gender) {
    return HelperManager.formatGender(gender)
  }

  /**
   * 格式化世代
   * @param {number} generation
   * @returns {string}
   */
  static formatGeneration(generation) {
    return HelperManager.formatGeneration(generation)
  }

  /**
   * 截断文本
   * @param {string} text
   * @param {number} maxLength
   * @returns {string}
   */
  static truncateText(text, maxLength) {
    return HelperManager.truncateText(text, maxLength)
  }

  /**
   * 深度克隆对象
   * @param {Object} obj
   * @returns {Object}
   */
  static deepClone(obj) {
    return HelperManager.deepClone(obj)
  }

  /**
   * 数组去重
   * @param {Array} array
   * @returns {Array}
   */
  static uniqueArray(array) {
    return HelperManager.uniqueArray(array)
  }

  /**
   * 按属性排序
   * @param {Array} array
   * @param {string} property
   * @param {string} direction
   * @returns {Array}
   */
  static sortByProperty(array, property, direction = 'asc') {
    return HelperManager.sortByProperty(array, property, direction)
  }

  /**
   * 搜索过滤
   * @param {Array} array
   * @param {string} searchTerm
   * @param {Array} properties
   * @returns {Array}
   */
  static filterBySearch(array, searchTerm, properties = []) {
    return HelperManager.filterBySearch(array, searchTerm, properties)
  }

  /**
   * 格式化JSON
   * @param {Object} obj
   * @param {number} indent
   * @returns {string}
   */
  static formatJSON(obj, indent = 2) {
    return HelperManager.formatJSON(obj, indent)
  }

  /**
   * 下载文件
   * @param {string} filename
   * @param {string} content
   * @param {string} mimeType
   */
  static downloadFile(filename, content, mimeType = 'text/plain') {
    HelperManager.downloadFile(filename, content, mimeType)
  }

  /**
   * 复制到剪贴板
   * @param {string} text
   * @returns {Promise<Object>}
   */
  static async copyToClipboard(text) {
    return await HelperManager.copyToClipboard(text)
  }
}

// 导出单例
export const familyTreeManager = new FamilyTreeManager()
