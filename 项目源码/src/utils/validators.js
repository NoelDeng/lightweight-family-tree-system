// 数据验证工具函数

// 验证姓名
export function validateName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, message: '姓名不能为空' }
  }

  if (name.trim().length === 0) {
    return { valid: false, message: '姓名不能为空' }
  }

  if (name.length > 50) {
    return { valid: false, message: '姓名不能超过50个字符' }
  }

  return { valid: true }
}

// 验证出生日期
export function validateBirthDate(dateString) {
  if (!dateString) {
    return { valid: true }
  }

  const date = new Date(dateString)
  const now = new Date()

  if (isNaN(date.getTime())) {
    return { valid: false, message: '日期格式错误' }
  }

  if (date > now) {
    return { valid: false, message: '出生日期不能晚于今天' }
  }

  return { valid: true }
}

// 验证ID格式
export function validateId(id) {
  if (!id || typeof id !== 'string') {
    return { valid: false, message: 'ID不能为空' }
  }

  if (id.trim().length === 0) {
    return { valid: false, message: 'ID不能为空' }
  }

  if (id.length > 50) {
    return { valid: false, message: 'ID不能超过50个字符' }
  }

  return { valid: true }
}

// 验证ID唯一性
export function validateIdUnique(id, existingIds) {
  if (!existingIds.includes(id)) {
    return { valid: true }
  }

  return { valid: false, message: 'ID已存在' }
}

// 验证必填字段
export function validateRequired(value, fieldName) {
  if (!value || (typeof value === 'string' && value.trim().length === 0)) {
    return { valid: false, message: `${fieldName}不能为空` }
  }

  return { valid: true }
}

// 验证数字范围
export function validateNumberRange(value, min, max) {
  const num = Number(value)

  if (isNaN(num)) {
    return { valid: false, message: '请输入有效的数字' }
  }

  if (num < min || num > max) {
    return { valid: false, message: `请输入${min}到${max}之间的数字` }
  }

  return { valid: true }
}

// 验证邮箱
export function validateEmail(email) {
  if (!email) {
    return { valid: true }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { valid: false, message: '邮箱格式错误' }
  }

  return { valid: true }
}

// 验证手机号
export function validatePhone(phone) {
  if (!phone) {
    return { valid: true }
  }

  const phoneRegex = /^1[3-9]\d{9}$/
  if (!phoneRegex.test(phone)) {
    return { valid: false, message: '手机号格式错误' }
  }

  return { valid: true }
}

// 验证日期格式
export function validateDateFormat(dateString) {
  if (!dateString) {
    return { valid: true }
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(dateString)) {
    return { valid: false, message: '日期格式应为YYYY-MM-DD' }
  }

  const date = new Date(dateString)
  return isNaN(date.getTime()) ? { valid: false, message: '日期格式错误' } : { valid: true }
}

// 综合验证函数
export function validateNode(node, existingIds = []) {
  const errors = []

  // 验证ID
  const idValidation = validateId(node.id)
  if (!idValidation.valid) {
    errors.push(idValidation.message)
  }

  const idUniqueValidation = validateIdUnique(node.id, existingIds)
  if (!idUniqueValidation.valid) {
    errors.push(idUniqueValidation.message)
  }

  // 验证姓名
  const nameValidation = validateName(node.name)
  if (!nameValidation.valid) {
    errors.push(nameValidation.message)
  }

  // 验证出生日期
  if (node.birthDate) {
    const birthDateValidation = validateBirthDate(node.birthDate)
    if (!birthDateValidation.valid) {
      errors.push(birthDateValidation.message)
    }
  }

  // 验证日期格式
  if (node.birthDate) {
    const dateValidation = validateDateFormat(node.birthDate)
    if (!dateValidation.valid) {
      errors.push(dateValidation.message)
    }
  }

  // 验证父亲ID
  if (node.fatherId) {
    const fatherIdValidation = validateId(node.fatherId)
    if (!fatherIdValidation.valid) {
      errors.push(fatherIdValidation.message)
    }
  }

  // 验证母亲ID
  if (node.motherId) {
    const motherIdValidation = validateId(node.motherId)
    if (!motherIdValidation.valid) {
      errors.push(motherIdValidation.message)
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
