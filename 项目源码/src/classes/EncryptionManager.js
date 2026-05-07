/**
 * 加密管理类
 * 负责数据加密、解密和密码哈希
 */
export class EncryptionManager {
  #keyLength = 256
  #iterations = 100000

  /**
   * 从密码派生密钥
   * @param {string} password
   * @param {string} salt
   * @returns {Promise<CryptoKey>}
   * @private
   */
  async #deriveKey(password, salt) {
    const encoder = new TextEncoder()
    const passwordData = encoder.encode(password)
    const saltData = encoder.encode(salt)

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordData,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    )

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltData,
        iterations: this.#iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: this.#keyLength },
      false,
      ['encrypt', 'decrypt']
    )
  }

  /**
   * 生成随机盐
   * @returns {Promise<string>}
   * @private
   */
  async #generateSalt() {
    const array = new Uint8Array(16)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }

  /**
   * 加密数据
   * @param {Object} data
   * @param {string} password
   * @returns {Promise<Object>}
   */
  async encrypt(data, password) {
    try {
      const salt = await this.#generateSalt()
      const iv = new Uint8Array(12)
      crypto.getRandomValues(iv)

      const key = await this.#deriveKey(password, salt)
      const encoder = new TextEncoder()
      const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoder.encode(JSON.stringify(data))
      )

      // 组合盐、IV和加密数据（hex 字符串拼接）
      const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('')
      const encryptedHex = Array.from(new Uint8Array(encryptedData)).map(b => b.toString(16).padStart(2, '0')).join('')

      return {
        success: true,
        data: salt + ivHex + encryptedHex,
        salt
      }
    } catch (error) {
      console.error('加密失败:', error)
      return { success: false, message: error.message }
    }
  }

  /**
   * 解密数据
   * @param {string} encryptedDataHex
   * @param {string} password
   * @returns {Promise<Object>}
   */
  async decrypt(encryptedDataHex, password) {
    try {
      const salt = encryptedDataHex.substring(0, 32)
      const ivHex = encryptedDataHex.substring(32, 56)
      const encryptedDataHex = encryptedDataHex.substring(56)

      const saltData = Uint8Array.from(salt.match(/.{1,2}/g).map(byte => parseInt(byte, 16)))
      const iv = Uint8Array.from(ivHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)))
      const encryptedData = Uint8Array.from(encryptedDataHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)))

      const key = await this.#deriveKey(password, salt)

      const decryptedData = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encryptedData
      )

      const decoder = new TextDecoder()
      const jsonData = decoder.decode(decryptedData)

      return {
        success: true,
        data: JSON.parse(jsonData)
      }
    } catch (error) {
      console.error('解密失败:', error)
      return { success: false, message: '解密失败，密码可能错误' }
    }
  }

  /**
   * 加密敏感字段
   * @param {string} value
   * @param {string} password
   * @returns {Promise<string|null>}
   */
  async encryptSensitiveField(value, password) {
    const result = await this.encrypt(value, password)
    return result.success ? result.data : null
  }

  /**
   * 解密敏感字段
   * @param {string} encryptedValue
   * @param {string} password
   * @returns {Promise<Object>}
   */
  async decryptSensitiveField(encryptedValue, password) {
    const result = await this.decrypt(encryptedValue, password)
    return result.success ? result.data : null
  }

  /**
   * 生成密码哈希
   * @param {string} password
   * @returns {Promise<string>}
   */
  async hashPassword(password) {
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hash = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hash))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  /**
   * 验证密码
   * @param {string} password
   * @param {string} hash
   * @returns {Promise<boolean>}
   */
  async verifyPassword(password, hash) {
    const hashedPassword = await this.hashPassword(password)
    return hashedPassword === hash
  }
}
