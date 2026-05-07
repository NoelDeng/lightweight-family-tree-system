/**
 * 工具管理类
 * 提供通用工具函数
 */
export class HelperManager {
  /**
   * 生成唯一ID
   * @returns {string}
   */
  static generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  /**
   * 格式化日期
   * @param {string} dateString
   * @returns {string}
   */
  static formatDate(dateString) {
    if (!dateString) {
      return ''
    }

    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  /**
   * 格式化日期时间
   * @param {string} dateString
   * @returns {string}
   */
  static formatDateTime(dateString) {
    if (!dateString) {
      return ''
    }

    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  /**
   * 格式化性别
   * @param {string} gender
   * @returns {string}
   */
  static formatGender(gender) {
    const genderMap = {
      'male': '男',
      'female': '女',
      'other': '其他',
      '1': '男',
      '0': '女',
      '2': '其他'
    }
    return genderMap[gender] || gender
  }

  /**
   * 格式化世代
   * @param {number} generation
   * @returns {string}
   */
  static formatGeneration(generation) {
    return `第${generation}代`
  }

  /**
   * 截断文本
   * @param {string} text
   * @param {number} maxLength
   * @returns {string}
   */
  static truncateText(text, maxLength) {
    if (!text) {
      return ''
    }

    if (text.length <= maxLength) {
      return text
    }

    return text.substring(0, maxLength) + '...'
  }

  /**
   * 节流函数
   * @param {Function} func
   * @param {number} delay
   * @returns {Function}
   */
  static throttle(func, delay) {
    let lastCall = 0
    return function (...args) {
      const now = new Date().getTime()
      if (now - lastCall < delay) {
        return
      }
      lastCall = now
      return func.apply(this, args)
    }
  }

  /**
   * 防抖函数
   * @param {Function} func
   * @param {number} delay
   * @returns {Function}
   */
  static debounce(func, delay) {
    let timeoutId
    return function (...args) {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => func.apply(this, args), delay)
    }
  }

  /**
   * 深度克隆对象
   * @param {Object} obj
   * @returns {Object}
   */
  static deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime())
    }

    if (obj instanceof Array) {
      return obj.map(item => this.deepClone(item))
    }

    if (obj instanceof Object) {
      const clonedObj = {}
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = this.deepClone(obj[key])
        }
      }
      return clonedObj
    }

    return obj
  }

  /**
   * 数组去重
   * @param {Array} array
   * @returns {Array}
   */
  static uniqueArray(array) {
    return [...new Set(array)]
  }

  /**
   * 按属性排序
   * @param {Array} array
   * @param {string} property
   * @param {string} direction
   * @returns {Array}
   */
  static sortByProperty(array, property, direction = 'asc') {
    return [...array].sort((a, b) => {
      const aValue = a[property]
      const bValue = b[property]

      if (aValue < bValue) {
        return direction === 'asc' ? -1 : 1
      }

      if (aValue > bValue) {
        return direction === 'asc' ? 1 : -1
      }

      return 0
    })
  }

  /**
   * 搜索过滤
   * @param {Array} array
   * @param {string} searchTerm
   * @param {Array} properties
   * @returns {Array}
   */
  static filterBySearch(array, searchTerm, properties = []) {
    if (!searchTerm) {
      return array
    }

    const term = searchTerm.toLowerCase()

    return array.filter(item => {
      return properties.some(property => {
        const value = String(item[property] || '').toLowerCase()
        return value.includes(term)
      })
    })
  }

  /**
   * 格式化JSON
   * @param {Object} obj
   * @param {number} indent
   * @returns {string}
   */
  static formatJSON(obj, indent = 2) {
    return JSON.stringify(obj, null, indent)
  }

  /**
   * 获取文件扩展名
   * @param {string} filename
   * @returns {string}
   */
  static getFileExtension(filename) {
    if (!filename) {
      return ''
    }

    const parts = filename.split('.')
    return parts.length > 1 ? parts.pop().toLowerCase() : ''
  }

  /**
   * 下载文件
   * @param {string} filename
   * @param {string} content
   * @param {string} mimeType
   */
  static downloadFile(filename, content, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  /**
   * 复制到剪贴板
   * @param {string} text
   * @returns {Promise<Object>}
   */
  static async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text)
      return { success: true }
    } catch (error) {
      return { success: false, message: error.message }
    }
  }
}
