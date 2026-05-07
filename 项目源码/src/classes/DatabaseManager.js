/**
 * 数据库管理类
 * 负责IndexedDB的打开、操作和事务管理
 */
export class DatabaseManager {
  #dbName = 'FamilyTreeDB'
  #version = 2
  #db = null

  /**
   * 打开数据库
   * @returns {Promise<IDBDatabase>}
   */
  async open() {
    if (this.#db) {
      return this.#db
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.#dbName, this.#version)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.#db = request.result
        resolve(this.#db)
      }

      request.onupgradeneeded = (event) => {
        this.#onUpgradeNeeded(event.target.result)
      }
    })
  }

  /**
   * 数据库升级处理
   * @private
   * @param {IDBDatabase} db
   */
  #onUpgradeNeeded(db) {
    // 创建family节点表
    if (!db.objectStoreNames.contains('familyNodes')) {
      const nodeStore = db.createObjectStore('familyNodes', { keyPath: 'id' })
      nodeStore.createIndex('fatherId', 'fatherId', { unique: false })
      nodeStore.createIndex('motherId', 'motherId', { unique: false })
      nodeStore.createIndex('generation', 'generation', { unique: false })
    }

    // 创建设置表
    if (!db.objectStoreNames.contains('settings')) {
      db.createObjectStore('settings', { keyPath: 'key' })
    }

    // 创建用户表
    if (!db.objectStoreNames.contains('users')) {
      db.createObjectStore('users', { keyPath: 'id' })
    }
  }

  /**
   * 保存数据
   * @param {string} storeName
   * @param {Array} data
   * @returns {Promise<void>}
   */
  async save(storeName, data) {
    await this.open()

    return new Promise((resolve, reject) => {
      const transaction = this.#db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)

      // 清空现有数据
      const clearRequest = store.clear()
      clearRequest.onsuccess = async () => {
        // 批量插入数据
        const addRequests = data.map(item =>
          store.put(item)
        )

        Promise.all(addRequests)
          .then(() => resolve())
          .catch(reject)
      }

      clearRequest.onerror = () => reject(clearRequest.error)
    })
  }

  /**
   * 加载数据
   * @param {string} storeName
   * @returns {Promise<Array>}
   */
  async load(storeName) {
    await this.open()

    return new Promise((resolve, reject) => {
      const transaction = this.#db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 添加节点
   * @param {Object} node
   * @returns {Promise<string>}
   */
  async addNode(node) {
    await this.open()

    return new Promise((resolve, reject) => {
      const transaction = this.#db.transaction(['familyNodes'], 'readwrite')
      const store = transaction.objectStore('familyNodes')
      const request = store.add(node)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 更新节点
   * @param {Object} node
   * @returns {Promise<string>}
   */
  async updateNode(node) {
    await this.open()

    return new Promise((resolve, reject) => {
      const transaction = this.#db.transaction(['familyNodes'], 'readwrite')
      const store = transaction.objectStore('familyNodes')
      const request = store.put(node)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 删除节点
   * @param {string} id
   * @returns {Promise<void>}
   */
  async deleteNode(id) {
    await this.open()

    return new Promise((resolve, reject) => {
      const transaction = this.#db.transaction(['familyNodes'], 'readwrite')
      const store = transaction.objectStore('familyNodes')
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 根据ID查找节点
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async findNodeById(id) {
    await this.open()

    return new Promise((resolve, reject) => {
      const transaction = this.#db.transaction(['familyNodes'], 'readonly')
      const store = transaction.objectStore('familyNodes')
      const request = store.get(id)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 根据父亲ID查找子节点
   * @param {string} fatherId
   * @returns {Promise<Array>}
   */
  async findChildrenByFatherId(fatherId) {
    await this.open()

    return new Promise((resolve, reject) => {
      const transaction = this.#db.transaction(['familyNodes'], 'readonly')
      const store = transaction.objectStore('familyNodes')
      const index = store.index('fatherId')
      const request = index.getAll(fatherId)

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 根据母亲ID查找子节点
   * @param {string} motherId
   * @returns {Promise<Array>}
   */
  async findChildrenByMotherId(motherId) {
    await this.open()

    return new Promise((resolve, reject) => {
      const transaction = this.#db.transaction(['familyNodes'], 'readonly')
      const store = transaction.objectStore('familyNodes')
      const index = store.index('motherId')
      const request = index.getAll(motherId)

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 清空所有数据
   * @param {string} storeName
   * @returns {Promise<void>}
   */
  async clear(storeName) {
    await this.open()

    return new Promise((resolve, reject) => {
      const transaction = this.#db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 导出数据
   * @param {string} storeName
   * @returns {Promise<string>}
   */
  async export(storeName) {
    const data = await this.load(storeName)
    return JSON.stringify(data, null, 2)
  }

  /**
   * 导入数据
   * @param {string} storeName
   * @param {string} jsonString
   * @returns {Promise<Object>}
   */
  async import(storeName, jsonString) {
    try {
      const data = JSON.parse(jsonString)

      if (!Array.isArray(data)) {
        throw new Error('数据格式错误：必须是数组')
      }

      // 验证数据格式
      for (const node of data) {
        if (!node.id || !node.name) {
          throw new Error('节点缺少必要字段：id 或 name')
        }
      }

      await this.save(storeName, data)
      return { success: true }
    } catch (error) {
      return { success: false, message: error.message }
    }
  }
}
