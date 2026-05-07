/**
 * IndexedDB 分片存储服务
 */

class ChunkStorage {
  constructor(dbName, storeName, chunkSize = 1000) {
    this.dbName = dbName
    this.storeName = storeName
    this.chunkSize = chunkSize
    this.db = null
  }

  /**
   * 打开数据库
   */
  async open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1)

      request.onerror = () => {
        reject(new Error('数据库打开失败'))
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = event.target.result
        // 创建对象存储
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' })
        }
      }
    })
  }

  /**
   * 保存数据（分片）
   * @param {Array} data - 数据数组
   * @returns {Promise<Array>} 分片ID数组
   */
  async saveChunks(data) {
    if (!this.db) {
      await this.open()
    }

    const chunks = []
    const chunkCount = Math.ceil(data.length / this.chunkSize)

    for (let i = 0; i < chunkCount; i++) {
      const chunk = data.slice(i * this.chunkSize, (i + 1) * this.chunkSize)

      const chunkId = `${this.storeName}-${i}`

      await this.saveChunk(chunkId, chunk)

      chunks.push({
        id: chunkId,
        index: i,
        count: chunk.length,
        totalChunks: chunkCount
      })
    }

    return chunks
  }

  /**
   * 保存单个分片
   * @param {string} chunkId - 分片ID
   * @param {Array} chunk - 分片数据
   * @returns {Promise<void>}
   */
  async saveChunk(chunkId, chunk) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)

      const request = store.put({
        id: chunkId,
        data: chunk,
        timestamp: Date.now()
      })

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error(`分片保存失败: ${chunkId}`))
    })
  }

  /**
   * 加载数据（合并分片）
   * @param {string} chunkId - 分片ID
   * @returns {Promise<Array>} 分片数据
   */
  async loadChunk(chunkId) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)

      const request = store.get(chunkId)

      request.onsuccess = () => {
        resolve(request.result?.data || [])
      }

      request.onerror = () => reject(new Error(`分片加载失败: ${chunkId}`))
    })
  }

  /**
   * 加载所有数据
   * @returns {Promise<Array>} 完整数据
   */
  async loadAllData() {
    if (!this.db) {
      await this.open()
    }

    const chunks = []
    const transaction = this.db.transaction([this.storeName], 'readonly')
    const store = transaction.objectStore(this.storeName)

    return new Promise((resolve, reject) => {
      const request = store.getAll()

      request.onsuccess = () => {
        const allData = request.result || []

        // 按索引排序
        allData.sort((a, b) => {
          const aIndex = parseInt(a.id.split('-')[1]) || 0
          const bIndex = parseInt(b.id.split('-')[1]) || 0
          return aIndex - bIndex
        })

        // 合并数据
        const mergedData = allData.reduce((acc, chunk) => {
          return acc.concat(chunk.data || [])
        }, [])

        resolve(mergedData)
      }

      request.onerror = () => reject(new Error('数据加载失败'))
    })
  }

  /**
   * 删除分片
   * @param {string} chunkId - 分片ID
   * @returns {Promise<void>}
   */
  async deleteChunk(chunkId) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)

      const request = store.delete(chunkId)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error(`分片删除失败: ${chunkId}`))
    })
  }

  /**
   * 清空所有数据
   * @returns {Promise<void>}
   */
  async clearAll() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)

      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error('清空数据失败'))
    })
  }

  /**
   * 获取分片信息
   * @returns {Promise<Array>} 分片信息数组
   */
  async getChunkInfo() {
    if (!this.db) {
      await this.open()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)

      const request = store.getAll()

      request.onsuccess = () => {
        const chunks = request.result || []
        resolve(chunks)
      }

      request.onerror = () => reject(new Error('获取分片信息失败'))
    })
  }

  /**
   * 获取数据统计
   * @returns {Promise<Object>} 统计信息
   */
  async getStats() {
    const chunkInfo = await this.getChunkInfo()

    const totalChunks = chunkInfo.length
    const totalRecords = chunkInfo.reduce((sum, chunk) => {
      return sum + (chunk.data?.length || 0)
    }, 0)

    const estimatedSize = totalRecords * 100 // 估算大小（字节）

    return {
      totalChunks,
      totalRecords,
      estimatedSize,
      chunkSize: this.chunkSize
    }
  }

  /**
   * 关闭数据库
   */
  close() {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}

export default ChunkStorage
