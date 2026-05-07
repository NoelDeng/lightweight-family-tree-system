/**
 * 认证管理类
 * 负责用户认证和密码管理
 */
import { DatabaseManager } from './DatabaseManager.js'
import { EncryptionManager } from './EncryptionManager.js'

export class AuthManager {
  #databaseManager = null
  #encryptionManager = null

  constructor(databaseManager = null) {
    this.#databaseManager = databaseManager || new DatabaseManager()
    this.#encryptionManager = new EncryptionManager()
  }

  /**
   * 初始化数据库
   * @returns {Promise<void>}
   */
  async initializeDatabase() {
    await this.#databaseManager.open()
  }

  /**
   * 设置管理员密码
   * @param {string} password
   * @returns {Promise<Object>}
   */
  async setupAdminPassword(password) {
    try {
      const hashedPassword = await this.#encryptionManager.hashPassword(password)

      const adminUser = {
        id: 'admin',
        passwordHash: hashedPassword
      }

      await this.#databaseManager.save('users', [adminUser])
      return { success: true, message: '管理员密码设置成功' }
    } catch (error) {
      console.error('设置管理员密码失败:', error)
      return { success: false, message: '设置失败' }
    }
  }

  /**
   * 验证登录
   * @param {string} password
   * @returns {Promise<Object>}
   */
  async login(password) {
    try {
      const storedHash = await this.#getStoredPasswordHash()

      if (!storedHash) {
        return { success: false, message: '请先设置管理员密码' }
      }

      const hashedPassword = await this.#encryptionManager.hashPassword(password)

      if (hashedPassword === storedHash) {
        return { success: true }
      } else {
        return { success: false, message: '密码错误' }
      }
    } catch (error) {
      console.error('登录失败:', error)
      return { success: false, message: '登录失败' }
    }
  }

  /**
   * 检查是否已设置密码
   * @returns {Promise<boolean>}
   */
  async hasPasswordSet() {
    try {
      const storedHash = await this.#getStoredPasswordHash()
      return !!storedHash
    } catch (error) {
      console.error('检查密码设置失败:', error)
      return false
    }
  }

  /**
   * 获取存储的密码哈希
   * @private
   * @returns {Promise<string|null>}
   */
  async #getStoredPasswordHash() {
    try {
      const users = await this.#databaseManager.load('users')
      return users.find(u => u.id === 'admin')?.passwordHash || null
    } catch (error) {
      console.error('获取密码哈希失败:', error)
      return null
    }
  }

  /**
   * 修改管理员密码
   * @param {string} oldPassword
   * @param {string} newPassword
   * @returns {Promise<Object>}
   */
  async changePassword(oldPassword, newPassword) {
    try {
      // 验证旧密码
      const storedHash = await this.#getStoredPasswordHash()
      if (!storedHash) {
        return { success: false, message: '未设置旧密码' }
      }

      const hashedOldPassword = await this.#encryptionManager.hashPassword(oldPassword)
      if (hashedOldPassword !== storedHash) {
        return { success: false, message: '旧密码错误' }
      }

      // 设置新密码
      const hashedNewPassword = await this.#encryptionManager.hashPassword(newPassword)
      const adminUser = {
        id: 'admin',
        passwordHash: hashedNewPassword
      }

      await this.#databaseManager.save('users', [adminUser])
      return { success: true, message: '密码修改成功' }
    } catch (error) {
      console.error('修改密码失败:', error)
      return { success: false, message: '修改失败' }
    }
  }
}
