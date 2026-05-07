/**
 * 认证模块测试用例
 * 覆盖: TC01-TC05（密码设置、登录、错误密码、修改密码、清除数据）
 *
 * 对应策划书 §2.4 安全体系
 * - 访问控制: SHA-256 密码哈希验证，不存明文
 * - 会话管理: 登录后内存保持会话，关闭页面即失效
 * - 密码修改: 旧密钥解密 → 新密钥重新加密全部数据
 */

import { test, expect } from '@playwright/test'
import { FamilyTreeBrowserTester } from '../browser-tester.js'

let tester

test.describe('认证模块 (Auth)', () => {
  test.beforeEach(async ({ page }) => {
    tester = new FamilyTreeBrowserTester(page, 'http://localhost:3000')
    await tester.goto()
  })

  test('TC01: 首次设置管理员密码', async () => {
    // 验证处于未设置密码状态
    const isNotSet = await tester.isPasswordNotSet()
    expect(isNotSet, '应显示密码设置表单').toBe(true)

    // 设置密码
    const result = await tester.setupPassword('123456')
    expect(result.success, `设置密码失败: ${result.message}`).toBe(true)

    // 验证自动跳转到登录界面
    const loginVisible = await tester.isLoginFormVisible()
    expect(loginVisible, '设置密码后应跳转到登录界面').toBe(true)

    await tester.screenshot('tc01-password-set')
  })

  test('TC02: 正确密码登录', async () => {
    // 前置：检查是否已设置密码
    const isNotSet = await tester.isPasswordNotSet()
    if (isNotSet) {
      await tester.setupPassword('123456')
    }

    // 确认在登录界面
    const loginVisible = await tester.isLoginFormVisible()
    expect(loginVisible, '应在登录界面').toBe(true)

    // 使用正确密码登录
    const result = await tester.login('123456')
    expect(result.success, `登录失败: ${result.message}`).toBe(true)

    // 验证进入主界面
    const mainResult = await tester.waitForMainPage()
    expect(mainResult.success, `主界面未加载: ${mainResult.message}`).toBe(true)

    await tester.screenshot('tc02-login-success')
  })

  test('TC03: 错误密码登录', async () => {
    // 前置：确保已设置密码且在登录界面
    const isNotSet = await tester.isPasswordNotSet()
    if (isNotSet) {
      await tester.setupPassword('123456')
    }

    const loginVisible = await tester.isLoginFormVisible()
    expect(loginVisible, '应在登录界面').toBe(true)

    // 使用错误密码登录
    const result = await tester.login('wrongpassword')
    expect(result.success, '错误密码应登录失败').toBe(false)

    // 验证仍在登录界面（未进入主界面）
    const stillInLogin = await tester.isLoginFormVisible()
    expect(stillInLogin, '使用错误密码后应仍在登录界面').toBe(true)

    await tester.screenshot('tc03-login-failed')
  })

  test('TC04: 修改密码', async () => {
    // 前置：登录到主界面
    const isNotSet = await tester.isPasswordNotSet()
    if (isNotSet) {
      await tester.setupPassword('123456')
    }

    let result = await tester.login('123456')
    if (!result.success) {
      // 如果之前已登录（因测试顺序），跳过登录
      await tester.goto()
      const stillNotSet = await tester.isPasswordNotSet()
      if (stillNotSet) {
        await tester.setupPassword('123456')
      }
      result = await tester.login('123456')
    }
    expect(result.success, `需要先登录: ${result.message}`).toBe(true)

    // 退出到登录页执行修改密码
    await tester.logout()

    // 点击修改密码链接
    const changeResult = await tester.changePassword('123456', '654321')
    expect(changeResult.success, `修改密码失败: ${changeResult.message}`).toBe(true)

    // 验证弹窗关闭
    await tester.sleep(500)

    // 使用新密码登录
    const loginResult = await tester.login('654321')
    expect(loginResult.success, `新密码登录失败: ${loginResult.message}`).toBe(true)

    // 还原密码
    await tester.logout()
    await tester.changePassword('654321', '123456')

    await tester.screenshot('tc04-password-changed')
  })

  test('TC05: 清除所有数据', async () => {
    // 确保在登录界面
    const isNotSet = await tester.isPasswordNotSet()
    if (isNotSet) {
      await tester.setupPassword('123456')
    }

    const loginVisible = await tester.isLoginFormVisible()
    expect(loginVisible, '应在登录界面').toBe(true)

    // 点击"测试：清除所有数据"按钮
    const clearResult = await tester.clearAllData()
    expect(clearResult.success, `清除数据失败: ${clearResult.message}`).toBe(true)

    // 验证回到密码设置界面（数据库已清除）
    await tester.sleep(1000)
    const setupVisible = await tester.isPasswordNotSet()
    expect(setupVisible, '清除数据后应回到设置密码界面').toBe(true)

    await tester.screenshot('tc05-data-cleared')
  })
})
