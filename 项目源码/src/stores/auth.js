import { defineStore } from 'pinia'
import { ref } from 'vue'
import { familyTreeManager } from '../classes/FamilyTreeManager.js'

export const useAuthStore = defineStore('auth', () => {
  const isLoggedIn = ref(false)
  const loading = ref(false)

  /**
   * 初始化数据库
   */
  async function initializeDatabase() {
    await familyTreeManager.openDatabase()
  }

  /**
   * 检查数据库是否已初始化
   * @returns {Promise<boolean>}
   */
  async function checkDatabaseInitialized() {
    try {
      await familyTreeManager.openDatabase()
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * 检查是否已设置密码
   * @returns {Promise<boolean>}
   */
  async function checkPasswordSet() {
    return await familyTreeManager.hasPasswordSet()
  }

  /**
   * 初始化认证状态
   * @returns {Promise<void>}
   */
  async function initAuth() {
    try {
      // 检查数据库是否已初始化
      const dbInitialized = await checkDatabaseInitialized()
      if (!dbInitialized) {
        console.log('数据库未初始化，需要设置管理员密码')
        return
      }

      // 检查是否已设置密码
      const passwordSet = await checkPasswordSet()
      if (!passwordSet) {
        console.log('未设置管理员密码，需要设置密码')
        return
      }

      // 数据库和密码都已设置，可以登录
      isLoggedIn.value = true
    } catch (error) {
      console.error('初始化认证状态失败:', error)
    }
  }

  /**
   * 设置管理员密码
   * @param {string} password
   * @returns {Promise<Object>}
   */
  async function setupAdminPassword(password) {
    const result = await familyTreeManager.setupAdminPassword(password)
    if (result.success) {
      isLoggedIn.value = true
    }
    return result
  }

  /**
   * 登录
   * @param {string} password
   * @returns {Promise<Object>}
   */
  async function login(password) {
    loading.value = true

    try {
      const result = await familyTreeManager.login(password)

      if (result.success) {
        isLoggedIn.value = true
      }

      return result
    } finally {
      loading.value = false
    }
  }

  /**
   * 修改密码
   * @param {string} oldPassword
   * @param {string} newPassword
   * @returns {Promise<Object>}
   */
  async function changePassword(oldPassword, newPassword) {
    const result = await familyTreeManager.changePassword(oldPassword, newPassword)
    if (result.success) {
      isLoggedIn.value = true
    }
    return result
  }

  /**
   * 退出登录
   */
  function logout() {
    isLoggedIn.value = false
  }

  return {
    isLoggedIn,
    loading,
    initializeDatabase,
    checkDatabaseInitialized,
    checkPasswordSet,
    initAuth,
    setupAdminPassword,
    login,
    changePassword,
    logout
  }
})
