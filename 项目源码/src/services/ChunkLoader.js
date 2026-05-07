/**
 * 节点分片加载服务
 * 将大规模数据分片，按需返回以支持渐进式渲染
 * 注意：不使用 # 私有字段，因为 Vue 3 的 Proxy 响应式系统与其不兼容
 */
class ChunkLoader {
  constructor(chunkSize = 50) {
    this._chunkSize = chunkSize
    this._chunks = []
    this._loadedIndices = new Set()
  }

  splitIntoChunks(data) {
    this._chunks = []
    for (let i = 0; i < data.length; i += this._chunkSize) {
      this._chunks.push(data.slice(i, i + this._chunkSize))
    }
  }

  getChunk(chunkIndex) {
    if (chunkIndex < 0 || chunkIndex >= this._chunks.length) return null
    return this._loadedIndices.has(chunkIndex) ? this._chunks[chunkIndex] : null
  }

  async loadChunk(chunkIndex) {
    if (chunkIndex < 0 || chunkIndex >= this._chunks.length) return null
    this._loadedIndices.add(chunkIndex)
    return this._chunks[chunkIndex]
  }

  getLoadedNodes() {
    const result = []
    for (let i = 0; i < this._chunks.length; i++) {
      if (this._loadedIndices.has(i)) {
        result.push(...this._chunks[i])
      }
    }
    return result
  }

  getTotalCount() {
    return this._chunks.reduce((sum, c) => sum + c.length, 0)
  }

  getLoadedCount() {
    let count = 0
    for (const i of this._loadedIndices) {
      count += this._chunks[i].length
    }
    return count
  }

  hasMore() {
    return this.getLoadedCount() < this.getTotalCount()
  }

  reset() {
    this._loadedIndices.clear()
    this._chunks = []
  }
}

export default ChunkLoader
