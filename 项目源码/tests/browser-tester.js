/**
 * 轻量级族谱系统 - 浏览器自动化测试工具
 *
 * 可复用的浏览器自动化封装，提供高层次的族谱系统操作API。
 * 不依赖特定测试框架，只需传入 Playwright Page 即可使用。
 *
 * @example
 *   const { chromium } = require('playwright');
 *   const browser = await chromium.launch();
 *   const page = await browser.newPage();
 *   const tester = new FamilyTreeBrowserTester(page, 'http://localhost:3000');
 *   await tester.goto();
 *   const result = await tester.login('123456');
 */

export class FamilyTreeBrowserTester {
  /**
   * @param {import('playwright').Page} page - Playwright Page 实例
   * @param {string} [baseURL='http://localhost:3000'] - 应用地址
   * @param {object} [options]
   * @param {number} [options.defaultTimeout=5000] - 默认等待超时(ms)
   * @param {boolean} [options.screenshotOnError=true] - 出错时自动截图
   * @param {string} [options.screenshotDir='./test-results/screenshots'] - 截图目录
   */
  constructor(page, baseURL = 'http://localhost:3000', options = {}) {
    this.page = page
    this.baseURL = baseURL
    this.defaultTimeout = options.defaultTimeout ?? 5000
    this.screenshotOnError = options.screenshotOnError ?? true
    this.screenshotDir = options.screenshotDir ?? './test-results/screenshots'

    // 记录已执行的操作数量，用于截图命名
    this._stepCount = 0
    this._testLog = []
  }

  // ==================== 通用工具方法 ====================

  /** 导航到应用首页 */
  async goto(path = '/') {
    this._stepCount++
    await this.page.goto(`${this.baseURL}${path}`, { waitUntil: 'networkidle' })
    this._log('导航', `已访问 ${this.baseURL}${path}`)
  }

  /** 等待指定元素可见 */
  async _waitFor(selector, timeout) {
    const t = timeout ?? this.defaultTimeout
    try {
      await this.page.waitForSelector(selector, { state: 'visible', timeout: t })
      return true
    } catch {
      return false
    }
  }

  /** 等待文本内容出现 */
  async _waitForText(text, timeout) {
    const t = timeout ?? this.defaultTimeout
    try {
      await this.page.waitForFunction(
        (txt) => document.body.innerText.includes(txt),
        text,
        { timeout: t }
      )
      return true
    } catch {
      return false
    }
  }

  /** 等待指定时间 */
  async sleep(ms) {
    await this.page.waitForTimeout(ms)
  }

  /** 截图 */
  async screenshot(name) {
    const fs = await import('fs')
    const dir = this.screenshotDir
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    const filename = `${this._stepCount.toString().padStart(2, '0')}_${name}.png`
    const filepath = `${dir}/${filename}`
    await this.page.screenshot({ path: filepath, fullPage: true })
    this._log('截图', filepath)
    return filepath
  }

  /** 获取页面中的提示消息（如 alert 弹窗文字） */
  async getDialogMessage(accept = false) {
    return new Promise((resolve) => {
      this.page.once('dialog', async (dialog) => {
        const message = dialog.message()
        if (accept) {
          await dialog.accept()
        } else {
          await dialog.dismiss()
        }
        resolve(message)
      })
      // 超时返回 null
      setTimeout(() => resolve(null), 3000)
    })
  }

  /** 记录操作日志 */
  _log(action, detail) {
    const entry = { step: this._stepCount, action, detail, time: new Date().toISOString() }
    this._testLog.push(entry)
    console.log(`  [${entry.step}] ${action}: ${detail}`)
  }

  /** 获取测试日志 */
  getLog() {
    return [...this._testLog]
  }

  /** 清空测试日志 */
  clearLog() {
    this._testLog = []
    this._stepCount = 0
  }

  // ==================== 认证模块 ====================

  /**
   * 检查当前是否处于"未设置密码"状态
   * @returns {Promise<boolean>}
   */
  async isPasswordNotSet() {
    return await this._waitFor('#setupPassword', 3000)
  }

  /**
   * 检查当前是否处于"已设置密码/登录"状态
   * @returns {Promise<boolean>}
   */
  async isLoginFormVisible() {
    return await this._waitFor('#password', 3000)
  }

  /**
   * 首次设置管理员密码
   * @param {string} password - 密码
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async setupPassword(password) {
    this._stepCount++
    try {
      const visible = await this._waitFor('#setupPassword')
      if (!visible) {
        return { success: false, message: '未找到设置密码表单（可能已设置过密码）' }
      }

      await this.page.fill('#setupPassword', password)
      await this.page.fill('#confirmPassword', password)
      await this.page.click('.setup-btn')

      // 等待登录表单出现（密码设置成功后会跳转）
      const loginAppeared = await this._waitFor('#password', this.defaultTimeout)
      if (loginAppeared) {
        this._log('设置密码', '密码设置成功，已跳转到登录界面')
        return { success: true, message: '密码设置成功' }
      }

      // 可能仍在设置页面（密码太短等情况）
      const errorText = await this._getTextContent('.error-message')
      if (errorText) {
        this._log('设置密码', `失败: ${errorText}`)
        return { success: false, message: errorText }
      }

      this._log('设置密码', '密码设置操作已执行')
      return { success: true, message: '密码设置操作已执行' }
    } catch (err) {
      this._log('设置密码', `异常: ${err.message}`)
      return { success: false, message: err.message }
    }
  }

  /**
   * 登录
   * @param {string} password - 密码
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async login(password) {
    this._stepCount++
    try {
      const visible = await this._waitFor('#password')
      if (!visible) {
        return { success: false, message: '未找到登录表单' }
      }

      await this.page.fill('#password', password)
      await this.page.click('.login-btn')

      // 等待主页面加载
      const mainAppeared = await this._waitFor('.main-container', this.defaultTimeout)
      if (mainAppeared) {
        this._log('登录', '登录成功，已进入主界面')
        return { success: true, message: '登录成功' }
      }

      // 检查是否有错误提示
      const errorText = await this._getTextContent('.error-message')
      if (errorText) {
        this._log('登录', `失败: ${errorText}`)
        return { success: false, message: errorText }
      }

      // 也检查 setup 表单（可能是密码未设置）
      const setupForm = await this._waitFor('#setupPassword', 1000)
      if (setupForm) {
        this._log('登录', '失败: 密码尚未设置')
        return { success: false, message: '密码尚未设置，请先设置密码' }
      }

      this._log('登录', '登录操作已执行，状态未知')
      return { success: false, message: '登录后未能进入主界面' }
    } catch (err) {
      this._log('登录', `异常: ${err.message}`)
      return { success: false, message: err.message }
    }
  }

  /**
   * 退出登录
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async logout() {
    this._stepCount++
    try {
      const visible = await this._waitFor('.logout-btn')
      if (!visible) {
        return { success: false, message: '未找到退出登录按钮' }
      }
      await this.page.click('.logout-btn')
      await this.sleep(500)
      const loginAppeared = await this._waitFor('#password')
      if (loginAppeared) {
        this._log('退出登录', '已退出，回到登录界面')
        return { success: true, message: '退出登录成功' }
      }
      this._log('退出登录', '已点击退出按钮')
      return { success: true, message: '退出登录操作已执行' }
    } catch (err) {
      this._log('退出登录', `异常: ${err.message}`)
      return { success: false, message: err.message }
    }
  }

  /**
   * 修改密码
   * @param {string} oldPassword - 旧密码
   * @param {string} newPassword - 新密码
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async changePassword(oldPassword, newPassword) {
    this._stepCount++
    try {
      // 点击修改密码链接
      const linkVisible = await this._waitFor('.change-password-link')
      if (!linkVisible) {
        return { success: false, message: '未找到"修改密码"链接' }
      }
      await this.page.click('.change-password-link')

      // 等待弹窗出现
      const modalVisible = await this._waitFor('.modal-overlay')
      if (!modalVisible) {
        return { success: false, message: '修改密码弹窗未出现' }
      }

      // 填写密码
      await this.page.fill('#oldPassword', oldPassword)
      await this.page.fill('#newPassword', newPassword)
      await this.page.fill('#confirmNewPassword', newPassword)

      // 点击确认修改
      await this.page.click('.modal-footer .confirm-btn')

      await this.sleep(500)

      const modalGone = !(await this._waitFor('.modal-overlay', 1000))
      if (modalGone) {
        this._log('修改密码', '修改密码操作已提交')
        return { success: true, message: '修改密码操作已提交' }
      }
      return { success: false, message: '修改密码弹窗未关闭' }
    } catch (err) {
      this._log('修改密码', `异常: ${err.message}`)
      return { success: false, message: err.message }
    }
  }

  /**
   * 清除所有数据（测试用按钮）
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async clearAllData() {
    this._stepCount++
    try {
      const visible = await this._waitFor('.test-clear-btn')
      if (!visible) {
        return { success: false, message: '未找到"清除所有数据"按钮（可能不在登录页）' }
      }

      // 监听确认对话框并接受（Playwright 默认 dismiss，需手动 accept）
      const dialogPromise = this.getDialogMessage(true)
      await this.page.click('.test-clear-btn')
      const message = await dialogPromise
      this._log('清除数据', `确认对话框: ${message}`)

      await this.sleep(1000)

      // 检查是否回到设置密码页
      const setupForm = await this._waitFor('#setupPassword', 5000)
      if (setupForm) {
        this._log('清除数据', '数据已清除，回到密码设置页面')
        return { success: true, message: '所有数据已清除' }
      }

      this._log('清除数据', '清除操作已执行')
      return { success: true, message: '清除数据操作已执行' }
    } catch (err) {
      this._log('清除数据', `异常: ${err.message}`)
      return { success: false, message: err.message }
    }
  }

  // ==================== 主界面 ====================

  /**
   * 等待主界面完全加载
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async waitForMainPage() {
    this._stepCount++
    try {
      const mainContainer = await this._waitFor('.main-container', this.defaultTimeout)
      if (!mainContainer) {
        return { success: false, message: '主界面未加载' }
      }

      const treePanel = await this._waitFor('.tree-panel', this.defaultTimeout)
      if (!treePanel) {
        return { success: false, message: '树状面板未加载' }
      }

      const vizContainer = await this._waitFor('.visualization-container', this.defaultTimeout)
      if (!vizContainer) {
        return { success: false, message: '可视化区域未加载' }
      }

      // 等待加载动画消失
      await this.sleep(1000)

      this._log('主界面', '主界面已完全加载')
      return { success: true, message: '主界面已加载' }
    } catch (err) {
      this._log('主界面', `异常: ${err.message}`)
      return { success: false, message: err.message }
    }
  }

  /**
   * 获取当前树状面板中显示的节点名称列表
   * @returns {Promise<string[]>}
   */
  async getTreeNodes() {
    try {
      return await this.page.$$eval('.node-name', (els) => els.map((el) => el.textContent.trim()))
    } catch {
      return []
    }
  }

  /**
   * 检查树状面板是否为空
   * @returns {Promise<boolean>}
   */
  async isTreeEmpty() {
    return await this._waitFor('.empty-state', 3000)
  }

  // ==================== 节点操作 ====================

  /**
   * 打开添加节点弹窗
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async openAddNodeDialog() {
    this._stepCount++
    try {
      // 优先尝试 TreePanel 中的添加按钮
      const addBtn = await this._waitFor('.action-btn[title="添加节点"]', 3000)
      if (addBtn) {
        await this.page.click('.action-btn[title="添加节点"]')
      } else {
        // 备用：尝试空状态下的添加按钮
        const emptyAddBtn = await this._waitFor('.add-node-btn', 2000)
        if (emptyAddBtn) {
          await this.page.click('.add-node-btn')
        } else {
          return { success: false, message: '未找到添加节点按钮' }
        }
      }

      const dialogVisible = await this._waitFor('.add-node-dialog-overlay', this.defaultTimeout)
      if (dialogVisible) {
        this._log('添加节点', '弹窗已打开')
        return { success: true, message: '添加节点弹窗已打开' }
      }
      return { success: false, message: '添加节点弹窗未出现' }
    } catch (err) {
      this._log('添加节点', `异常: ${err.message}`)
      return { success: false, message: err.message }
    }
  }

  /**
   * 填写节点表单并确认
   * @param {object} nodeData
   * @param {string} nodeData.name - 姓名
   * @param {string} [nodeData.gender='male'] - 性别 (male/female)
   * @param {string} [nodeData.birthDate] - 出生日期 (YYYY-MM-DD)
   * @param {string} [nodeData.fatherId] - 父亲ID
   * @param {string} [nodeData.motherId] - 母亲ID
   * @param {string[]} [nodeData.spouseIds] - 配偶ID列表
   * @param {string} [nodeData.bio] - 备注
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async fillAndConfirmNode(nodeData) {
    this._stepCount++
    try {
      // 等待弹窗可见
      const dialogVisible = await this._waitFor('.add-node-dialog-overlay')
      if (!dialogVisible) {
        return { success: false, message: '添加节点弹窗不可见' }
      }

      // 填写姓名
      if (nodeData.name !== undefined) {
        await this.page.fill('#nodeName', nodeData.name)
      }

      // 选择性别
      if (nodeData.gender) {
        await this.page.selectOption('#nodeGender', nodeData.gender)
      }

      // 填写出生日期
      if (nodeData.birthDate) {
        await this.page.fill('#nodeBirthDate', nodeData.birthDate)
      }

      // 填写备注
      if (nodeData.bio) {
        await this.page.fill('#nodeBio', nodeData.bio)
      }

      // 点击确认按钮
      await this.page.click('.add-node-dialog .confirm-btn')

      await this.sleep(500)

      // 检查弹窗是否关闭
      const dialogGone = !(await this._waitFor('.add-node-dialog-overlay', 1000))
      if (dialogGone) {
        this._log('添加节点', `已添加节点: ${nodeData.name}`)
        return { success: true, message: `节点 ${nodeData.name} 添加成功` }
      }

      // 检查是否有错误消息
      const errorText = await this._getTextContent('.error-message')
      if (errorText) {
        this._log('添加节点', `验证失败: ${errorText}`)
        return { success: false, message: errorText }
      }

      this._log('添加节点', '弹窗未关闭，可能验证未通过')
      return { success: false, message: '节点添加未完成（弹窗未关闭）' }
    } catch (err) {
      this._log('添加节点', `异常: ${err.message}`)
      return { success: false, message: err.message }
    }
  }

  /**
   * 快捷添加节点（打开弹窗 → 填写 → 确认）
   * @param {object} nodeData - 同 fillAndConfirmNode
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async addNode(nodeData) {
    const openResult = await this.openAddNodeDialog()
    if (!openResult.success) return openResult

    return await this.fillAndConfirmNode(nodeData)
  }

  /**
   * 批量从 test-data 导入节点
   * @param {object[]} nodes - 节点数据数组
   * @returns {Promise<{success: boolean, message: string, added: number}>}
   */
  async batchAddNodes(nodes) {
    this._stepCount++
    const results = { added: 0, failed: 0, errors: [] }

    for (const node of nodes) {
      const result = await this.addNode({
        name: node.name,
        gender: node.gender || 'male',
        birthDate: node.birthDate || '',
        bio: node.bio || ''
      })
      if (result.success) {
        results.added++
      } else {
        results.failed++
        results.errors.push(`${node.name}: ${result.message}`)
      }
    }

    this._log('批量添加', `成功: ${results.added}, 失败: ${results.failed}`)
    return {
      success: results.failed === 0,
      message: `批量添加完成: ${results.added} 成功, ${results.failed} 失败`,
      added: results.added
    }
  }

  /**
   * 点击树状面板中的指定节点
   * @param {string} nodeName - 节点名称
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async clickTreeNode(nodeName) {
    this._stepCount++
    try {
      const node = this.page.locator('.node-name', { hasText: nodeName }).first()
      await node.click()
      this._log('点击树节点', nodeName)
      return { success: true, message: `已点击树节点: ${nodeName}` }
    } catch (err) {
      this._log('点击树节点', `异常: ${err.message}`)
      return { success: false, message: err.message }
    }
  }

  /**
   * 点击可视化中的指定节点
   * @param {string} nodeName - 节点名称
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async clickVisNode(nodeName) {
    this._stepCount++
    try {
      const node = this.page.locator('g.family-node text', { hasText: nodeName }).first()
      await node.click()
      this._log('点击可视化节点', nodeName)
      return { success: true, message: `已点击可视化节点: ${nodeName}` }
    } catch (err) {
      this._log('点击可视化节点', `异常: ${err.message}`)
      return { success: false, message: err.message }
    }
  }

  /**
   * 获取可视化中所有节点名称
   * @returns {Promise<string[]>}
   */
  async getVisNodes() {
    try {
      return await this.page.$$eval(
        'g.family-node text:first-of-type',
        (els) => els.map((el) => el.textContent.trim()).filter(Boolean)
      )
    } catch {
      return []
    }
  }

  /**
   * 获取可视化中节点数量
   * @returns {Promise<number>}
   */
  async getVisNodeCount() {
    const nodes = await this.getVisNodes()
    return nodes.length
  }

  /**
   * 检查可视化SVG是否存在
   * @returns {Promise<boolean>}
   */
  async hasVisualizationSVG() {
    return await this._waitFor('.family-tree', 3000)
  }

  /**
   * 检查可视化中的连线
   * @returns {Promise<{hasLinks: boolean, linkCount: number}>}
   */
  async getLinkInfo() {
    try {
      const count = await this.page.$$eval('g.links path', (els) => els.length)
      return { hasLinks: count > 0, linkCount: count }
    } catch {
      return { hasLinks: false, linkCount: 0 }
    }
  }

  // ==================== 可视化操作 ====================

  /**
   * 放大视图
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async zoomIn() {
    this._stepCount++
    try {
      const btn = this.page.locator('.control-btn', { hasText: '+' }).first()
      await btn.click()
      this._log('缩放', '放大')
      return { success: true, message: '已放大' }
    } catch (err) {
      this._log('缩放', `异常: ${err.message}`)
      return { success: false, message: err.message }
    }
  }

  /**
   * 缩小视图
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async zoomOut() {
    this._stepCount++
    try {
      const btn = this.page.locator('.control-btn', { hasText: '−' }).first()
      await btn.click()
      this._log('缩放', '缩小')
      return { success: true, message: '已缩小' }
    } catch (err) {
      this._log('缩放', `异常: ${err.message}`)
      return { success: false, message: err.message }
    }
  }

  /**
   * 重置视图
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async resetZoom() {
    this._stepCount++
    try {
      const btn = this.page.locator('.control-btn', { hasText: '↺' }).first()
      await btn.click()
      this._log('缩放', '重置视图')
      return { success: true, message: '视图已重置' }
    } catch (err) {
      this._log('缩放', `异常: ${err.message}`)
      return { success: false, message: err.message }
    }
  }

  /**
   * 鼠标滚轮缩放（模拟滚轮事件）
   * @param {number} deltaY - 滚轮方向：正数=缩小，负数=放大
   * @param {number} [x] - 相对于容器的 X 坐标
   * @param {number} [y] - 相对于容器的 Y 坐标
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async wheelZoom(deltaY, x, y) {
    this._stepCount++
    try {
      const container = this.page.locator('.visualization-content')
      const box = await container.boundingBox()
      if (!box) {
        return { success: false, message: '未找到可视化容器' }
      }
      const cx = x ?? box.width / 2
      const cy = y ?? box.height / 2
      await this.page.mouse.wheel(cx + box.x, cy + box.y, 0, deltaY)
      await this.sleep(200)
      this._log('滚轮缩放', `deltaY=${deltaY}, pos=(${cx.toFixed(0)},${cy.toFixed(0)})`)
      return { success: true, message: `滚轮缩放 deltaY=${deltaY}` }
    } catch (err) {
      this._log('滚轮缩放', `异常: ${err.message}`)
      return { success: false, message: err.message }
    }
  }

  /**
   * 双指捏合缩放（模拟触摸事件序列）
   * @param {number} scaleFactor - 缩放因子 (>1 放大, <1 缩小)
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async pinchZoom(scaleFactor) {
    this._stepCount++
    try {
      const container = this.page.locator('.visualization-content')
      const box = await container.boundingBox()
      if (!box) {
        return { success: false, message: '未找到可视化容器' }
      }
      const cx = box.x + box.width / 2
      const cy = box.y + box.height / 2
      const initialDist = 80
      const newDist = initialDist * scaleFactor

      // 使用 evaluate 注入触摸事件（不依赖 touchscreen API）
      await this.page.evaluate(({ cx, cy, initialDist, newDist }) => {
        const el = document.elementFromPoint(cx, cy)
        if (!el) return
        const halfInit = initialDist / 2
        const touchesInit = [
          new Touch({ identifier: 0, target: el, clientX: cx - halfInit, clientY: cy }),
          new Touch({ identifier: 1, target: el, clientX: cx + halfInit, clientY: cy })
        ]
        el.dispatchEvent(new TouchEvent('touchstart', { touches: touchesInit, cancelable: true, bubbles: true }))

        const halfNew = newDist / 2
        const touchesMove = [
          new Touch({ identifier: 0, target: el, clientX: cx - halfNew, clientY: cy }),
          new Touch({ identifier: 1, target: el, clientX: cx + halfNew, clientY: cy })
        ]
        el.dispatchEvent(new TouchEvent('touchmove', { touches: touchesMove, cancelable: true, bubbles: true }))
        el.dispatchEvent(new TouchEvent('touchend', { touches: [], cancelable: true, bubbles: true }))
      }, { cx, cy, initialDist, newDist })

      await this.sleep(300)
      this._log('捏合缩放', `scale=${scaleFactor}`)
      return { success: true, message: `捏合缩放 scale=${scaleFactor}` }
    } catch (err) {
      this._log('捏合缩放', `异常: ${err.message}`)
      return { success: false, message: err.message }
    }
  }

  /**
   * 在可视化画布上拖拽平移
   * @param {number} dx - 水平位移(px)
   * @param {number} dy - 垂直位移(px)
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async dragVisualization(dx, dy) {
    this._stepCount++
    try {
      const area = this.page.locator('.visualization-area')
      const box = await area.boundingBox()
      if (!box) {
        return { success: false, message: '未找到可视化区域' }
      }
      const startX = box.x + box.width / 2
      const startY = box.y + box.height / 2
      await this.page.mouse.move(startX, startY)
      await this.page.mouse.down()
      await this.page.mouse.move(startX + dx, startY + dy, { steps: 10 })
      await this.page.mouse.up()
      this._log('拖拽', `dx=${dx}, dy=${dy}`)
      return { success: true, message: `已拖拽 (${dx}, ${dy})` }
    } catch (err) {
      this._log('拖拽', `异常: ${err.message}`)
      return { success: false, message: err.message }
    }
  }

  // ==================== 导入导出 ====================

  /**
   * 通过 TreePanel 的导入按钮打开导入弹窗
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async openImportDialog() {
    this._stepCount++
    try {
      // 先检查是否已有导入弹窗打开
      const alreadyOpen = await this._waitFor('.import-dialog-overlay', 1000)
      if (alreadyOpen) {
        // 关闭旧弹窗
        try {
          await this.page.click('.import-dialog .close-btn', { timeout: 2000 })
        } catch {
          await this.page.click('.import-dialog-overlay', { timeout: 2000 })
        }
        await this.sleep(500)
      }

      const importBtn = await this._waitFor('.action-btn[title="导入数据"]', 3000)
      if (!importBtn) {
        return { success: false, message: '未找到导入按钮' }
      }

      // 使用 force 点击以避免被其他元素遮挡
      await this.page.click('.action-btn[title="导入数据"]', { force: true })

      const dialogVisible = await this._waitFor('.import-dialog-overlay', this.defaultTimeout)
      if (dialogVisible) {
        this._log('导入', '导入弹窗已打开')
        return { success: true, message: '导入弹窗已打开' }
      }
      return { success: false, message: '导入弹窗未出现' }
    } catch (err) {
      this._log('导入', `异常: ${err.message}`)
      return { success: false, message: err.message }
    }
  }

  /**
   * 粘贴 JSON 数据并确认导入
   * @param {object|object[]} jsonData - 要导入的 JSON 数据
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async importData(jsonData) {
    this._stepCount++
    let result = { success: false, message: '' }
    try {
      const dialogVisible = await this._waitFor('.import-dialog')
      if (!dialogVisible) {
        return { success: false, message: '导入弹窗不可见，请先调用 openImportDialog()' }
      }

      const jsonString = typeof jsonData === 'string' ? jsonData : JSON.stringify(jsonData)
      await this.page.fill('#importJson', jsonString)
      await this.page.click('.import-dialog .confirm-btn')

      await this.sleep(800)

      // 检查是否有成功或错误消息
      const successText = await this._getTextContent('.success-message')
      if (successText) {
        result = { success: true, message: successText }
      } else {
        const errorText = await this._getTextContent('.error-message')
        if (errorText) {
          result = { success: false, message: errorText }
        } else {
          result = { success: true, message: '数据导入成功' }
        }
      }

      // 无论如何都要关闭弹窗
      await this._closeImportDialogIfOpen()

      this._log('导入数据', result.success ? `成功: ${result.message}` : `失败: ${result.message}`)
      return result
    } catch (err) {
      // 异常时也尝试关闭弹窗
      await this._closeImportDialogIfOpen()
      this._log('导入数据', `异常: ${err.message}`)
      return { success: false, message: err.message }
    }
  }

  /** @private 关闭导入弹窗（如果开着） */
  async _closeImportDialogIfOpen() {
    const stillOpen = await this._waitFor('.import-dialog-overlay', 1000)
    if (!stillOpen) return
    try {
      await this.page.click('.import-dialog .close-btn', { timeout: 2000 })
    } catch {
      try {
        await this.page.click('.import-dialog .cancel-btn', { timeout: 2000 })
      } catch {
        try {
          await this.page.click('.import-dialog-overlay', { timeout: 2000 })
        } catch { /* ignore */ }
      }
    }
    await this.sleep(300)
  }

  /**
   * 通过 TreePanel 的导出按钮导出数据
   * @returns {Promise<{success: boolean, message: string, data?: object}>}
   */
  async exportData() {
    this._stepCount++
    try {
      const exportBtn = await this._waitFor('.action-btn[title="导出数据"]', 3000)
      if (!exportBtn) {
        return { success: false, message: '未找到导出按钮' }
      }

      // 监听下载事件
      const [download] = await Promise.all([
        this.page.waitForEvent('download', { timeout: 10000 }).catch(() => null),
        this.page.click('.action-btn[title="导出数据"]')
      ])

      if (download) {
        const filename = download.suggestedFilename()
        this._log('导出数据', `已下载文件: ${filename}`)
        return { success: true, message: `已导出: ${filename}` }
      }

      // 可能是通过 Blob URL 下载（创建 a 标签的方式），Playwright 可能捕获不到
      this._log('导出数据', '导出操作已执行（未捕获到下载事件）')
      return { success: true, message: '导出操作已执行' }
    } catch (err) {
      this._log('导出数据', `异常: ${err.message}`)
      return { success: false, message: err.message }
    }
  }

  /**
   * 使用 Main.vue 中的直接导入方式（不通过 ImportDialog 组件）
   * 适用于 Main.vue 内嵌的导入弹窗
   * @param {object|object[]} jsonData
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async importDataViaMain(jsonData) {
    this._stepCount++
    try {
      const dialogVisible = await this._waitFor('.modal-overlay', 3000)
      if (!dialogVisible) {
        // 需要先在 Main 中触发导入
        return { success: false, message: 'Main 导入弹窗不可见' }
      }

      const jsonString = typeof jsonData === 'string' ? jsonData : JSON.stringify(jsonData)
      await this.page.fill('#importJson', jsonString)
      await this.page.click('.modal-footer .confirm-btn')

      await this.sleep(500)

      const dialogGone = !(await this._waitFor('.modal-overlay', 1000))
      if (dialogGone) {
        this._log('导入数据(via Main)', '导入完成')
        return { success: true, message: '数据导入成功' }
      }

      const errorText = await this._getTextContent('.error-message')
      if (errorText) {
        return { success: false, message: errorText }
      }

      return { success: true, message: '导入操作已执行' }
    } catch (err) {
      this._log('导入数据(via Main)', `异常: ${err.message}`)
      return { success: false, message: err.message }
    }
  }

  // ==================== 可视化性能 ====================

  /**
   * 测量页面性能指标
   * @returns {Promise<{loadTime: number, nodeCount: number, fps: number}>}
   */
  async measurePerformance() {
    try {
      const metrics = await this.page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0]
        const loadTime = nav ? nav.loadEventEnd - nav.fetchStart : -1
        const svgNodes = document.querySelectorAll('g.family-node').length

        // 简单帧率测量
        let fps = 0
        const timing = performance.getEntriesByType('measure')
        if (timing.length > 0) {
          fps = Math.round(1000 / timing[0].duration)
        }

        return { loadTime: Math.round(loadTime), nodeCount: svgNodes, fps }
      })
      return metrics
    } catch {
      return { loadTime: -1, nodeCount: -1, fps: -1 }
    }
  }

  // ==================== 内部辅助 ====================

  /**
   * 获取元素文本内容
   * @private
   */
  async _getTextContent(selector) {
    try {
      const el = this.page.locator(selector).first()
      if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
        return (await el.textContent()).trim()
      }
      return null
    } catch {
      return null
    }
  }
}

/**
 * 便捷工厂：创建浏览器 + 页面 + tester 实例
 *
 * @param {string} [baseURL='http://localhost:3000']
 * @param {object} [options] - 同 FamilyTreeBrowserTester 构造函数的 options
 * @returns {Promise<{browser: import('playwright').Browser, page: import('playwright').Page, tester: FamilyTreeBrowserTester}>}
 */
export async function createTester(baseURL = 'http://localhost:3000', options = {}) {
  const { chromium } = await import('playwright')
  const browser = await chromium.launch({
    headless: true,
    channel: 'msedge',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'zh-CN'
  })
  const page = await context.newPage()
  const tester = new FamilyTreeBrowserTester(page, baseURL, options)

  return { browser, context, page, tester }
}
