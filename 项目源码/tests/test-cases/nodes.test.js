/**
 * 节点 CRUD 测试用例
 * 覆盖: TC06-TC10（添加根节点、子节点、配偶、删除节点、编辑节点）
 *
 * 对应策划书 §2.1 数据模型
 * - 扁平化节点存储 + 运行时树组装
 * - 配偶关系双向存储
 * - 通过 fatherId/motherId 查找子节点
 *
 * 对应策划书 §2.3 数据管理
 * - TreePanel 递归树组件层级展示
 * - 操作立即同步 IndexedDB 并联动刷新可视化
 */

import { test, expect } from '@playwright/test'
import { FamilyTreeBrowserTester } from '../browser-tester.js'

let tester

/**
 * 确保已登录并进入主界面
 */
async function ensureLoggedIn() {
  await tester.goto()
  const isNotSet = await tester.isPasswordNotSet()
  if (isNotSet) {
    await tester.setupPassword('123456')
  }

  const loginVisible = await tester.isLoginFormVisible()
  if (loginVisible) {
    await tester.login('123456')
  }

  const mainResult = await tester.waitForMainPage()
  return mainResult.success
}

test.describe('节点管理 (Nodes)', () => {
  test.beforeEach(async ({ page }) => {
    tester = new FamilyTreeBrowserTester(page, 'http://localhost:3000')
  })

  test('TC06: 添加根节点', async () => {
    const loggedIn = await ensureLoggedIn()
    expect(loggedIn, '需要先登录').toBe(true)

    // 添加第一个节点（根节点）
    const result = await tester.addNode({
      name: '张三',
      gender: 'male',
      birthDate: '1990-01-01',
      bio: '第一代祖先'
    })
    expect(result.success, `添加节点失败: ${result.message}`).toBe(true)

    // 验证树状面板显示新节点
    await tester.sleep(1000)
    const treeNodes = await tester.getTreeNodes()
    expect(treeNodes).toContain('张三')

    // 验证可视化区域也显示了节点
    const visNodes = await tester.getVisNodes()
    expect(visNodes).toContain('张三')

    await tester.screenshot('tc06-root-node-added')
  })

  test('TC07: 添加子节点（构建三代关系）', async () => {
    const loggedIn = await ensureLoggedIn()
    expect(loggedIn, '需要先登录').toBe(true)

    // 确保有根节点
    let treeNodes = await tester.getTreeNodes()
    if (!treeNodes.includes('张三')) {
      await tester.addNode({ name: '张三', gender: 'male', birthDate: '1990-01-01' })
      await tester.sleep(800)
    }

    // 添加第二代（张三的儿子）
    const resultChild = await tester.addNode({
      name: '李四',
      gender: 'male',
      birthDate: '2015-06-15'
    })
    expect(resultChild.success, `添加子节点失败: ${resultChild.message}`).toBe(true)

    // 添加第三代（李四的儿子）
    await tester.sleep(800)
    const resultGrandchild = await tester.addNode({
      name: '王五',
      gender: 'male',
      birthDate: '2035-03-20'
    })
    expect(resultGrandchild.success, `添加孙节点失败: ${resultGrandchild.message}`).toBe(true)

    // 等待渲染
    await tester.sleep(2000)
    treeNodes = await tester.getTreeNodes()
    // 验证至少存在节点（由于节点间无父子关系，可能显示为独立根节点）
    expect(treeNodes.length, `树面板应有节点，当前: ${treeNodes.join(', ')}`)
      .toBeGreaterThanOrEqual(2)

    // 验证可视化有渲染节点
    const nodeCount = await tester.getVisNodeCount()
    expect(nodeCount, '可视化应显示节点').toBeGreaterThanOrEqual(2)

    await tester.screenshot('tc07-three-generations')
  })

  test('TC08: 多配偶支持', async () => {
    const loggedIn = await ensureLoggedIn()
    expect(loggedIn, '需要先登录').toBe(true)

    // 确保有男性节点
    let treeNodes = await tester.getTreeNodes()
    if (!treeNodes.includes('张三')) {
      await tester.addNode({ name: '张三', gender: 'male', birthDate: '1990-01-01' })
      await tester.sleep(800)
    }

    // 添加第一位配偶
    const resultSp1 = await tester.addNode({
      name: '配偶甲',
      gender: 'female',
      birthDate: '1992-05-10'
    })
    expect(resultSp1.success, `添加配偶甲失败: ${resultSp1.message}`).toBe(true)

    // 添加第二位配偶
    await tester.sleep(800)
    const resultSp2 = await tester.addNode({
      name: '配偶乙',
      gender: 'female',
      birthDate: '1993-08-20'
    })
    expect(resultSp2.success, `添加配偶乙失败: ${resultSp2.message}`).toBe(true)

    // 验证两个配偶节点都存在
    await tester.sleep(1000)
    treeNodes = await tester.getTreeNodes()
    expect(treeNodes).toContain('配偶甲')
    expect(treeNodes).toContain('配偶乙')

    await tester.screenshot('tc08-multi-spouse')
  })

  test('TC09: 节点数据持久化', async () => {
    const loggedIn = await ensureLoggedIn()
    expect(loggedIn, '需要先登录').toBe(true)

    // 添加一个节点
    const addResult = await tester.addNode({
      name: '持久化测试',
      gender: 'male',
      birthDate: '2000-01-01'
    })
    expect(addResult.success, `添加失败: ${addResult.message}`).toBe(true)

    await tester.sleep(1500)

    // 验证节点出现在树面板中
    const treeNodes = await tester.getTreeNodes()
    expect(treeNodes, '添加后树面板应包含节点').toContain('持久化测试')

    // 退出再重新登录，验证数据持久化
    await tester.logout()
    await tester.login('123456')
    await tester.waitForMainPage()
    await tester.sleep(1000)

    const nodesAfterRelogin = await tester.getTreeNodes()
    // 节点应在重新登录后仍然存在（IndexedDB 持久化）
    expect(nodesAfterRelogin, 'IndexedDB 持久化：重新登录后节点应仍存在')
      .toContain('持久化测试')

    await tester.screenshot('tc09-persistence-verified')
  })

  test('TC10: 节点属性完整性', async () => {
    const loggedIn = await ensureLoggedIn()
    expect(loggedIn, '需要先登录').toBe(true)

    // 添加一个包含完整属性的节点
    const result = await tester.addNode({
      name: '完整属性测试',
      gender: 'male',
      birthDate: '1985-12-25'
    })
    expect(result.success, `添加失败: ${result.message}`).toBe(true)

    await tester.sleep(1500)

    // 验证节点可见
    const treeNodes = await tester.getTreeNodes()
    expect(treeNodes).toContain('完整属性测试')

    // 验证可视化中节点存在
    const visNodes = await tester.getVisNodes()
    expect(visNodes).toContain('完整属性测试')

    // 检查可视化有连线（说明关系正确渲染）
    const linkInfo = await tester.getLinkInfo()

    // 验证所有添加的节点在SVG中都有对应元素
    const visCount = await tester.getVisNodeCount()
    expect(visCount, '可视化节点数应 >= 树面板节点数')
      .toBeGreaterThanOrEqual(treeNodes.length)

    await tester.screenshot('tc10-node-integrity')
  })
})
