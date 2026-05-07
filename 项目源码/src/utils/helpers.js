// 通用工具函数

// 生成唯一ID
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// 格式化日期
export function formatDate(dateString) {
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

// 格式化日期时间
export function formatDateTime(dateString) {
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

// 格式化性别
export function formatGender(gender) {
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

// 格式化世代
export function formatGeneration(generation) {
  return `第${generation}代`
}

// 截断文本
export function truncateText(text, maxLength) {
  if (!text) {
    return ''
  }

  if (text.length <= maxLength) {
    return text
  }

  return text.substring(0, maxLength) + '...'
}

// 节流函数
export function throttle(func, delay) {
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

// 防抖函数
export function debounce(func, delay) {
  let timeoutId
  return function (...args) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func.apply(this, args), delay)
  }
}

// 深度克隆对象
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime())
  }

  if (obj instanceof Array) {
    return obj.map(item => deepClone(item))
  }

  if (obj instanceof Object) {
    const clonedObj = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key])
      }
    }
    return clonedObj
  }

  return obj
}

// 数组去重
export function uniqueArray(array) {
  return [...new Set(array)]
}

// 按属性排序
export function sortByProperty(array, property, direction = 'asc') {
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

// 搜索过滤
export function filterBySearch(array, searchTerm, properties = []) {
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

// 计算世代
export function calculateGeneration(node, familyData) {
  let generation = 1

  // 检查是否有父亲或母亲
  if (node.fatherId) {
    const father = familyData.find(n => n.id === node.fatherId)
    if (father) {
      generation = Math.max(generation, calculateGeneration(father, familyData) + 1)
    }
  }

  if (node.motherId) {
    const mother = familyData.find(n => n.id === node.motherId)
    if (mother) {
      generation = Math.max(generation, calculateGeneration(mother, familyData) + 1)
    }
  }

  return generation
}

// 计算世代（带默认值）
export function calculateGenerationOrDefault(node, familyData) {
  const generation = calculateGeneration(node, familyData)
  return generation || 1
}

// 格式化JSON
export function formatJSON(obj, indent = 2) {
  return JSON.stringify(obj, null, indent)
}

// 获取文件扩展名
export function getFileExtension(filename) {
  if (!filename) {
    return ''
  }

  const parts = filename.split('.')
  return parts.length > 1 ? parts.pop().toLowerCase() : ''
}

// 下载文件
export function downloadFile(filename, content, mimeType = 'text/plain') {
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

// 复制到剪贴板
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return { success: true }
  } catch (error) {
    return { success: false, message: error.message }
  }
}
