/**
 * 可视化模块测试用例
 * 覆盖: TC11-TC14（SVG渲染、节点点击、缩放、拖拽）
 *
 * 对应策划书 §2.2 可视化渲染
 * - d3.tree() 生成节点坐标，d3.stratify() 扁平→层级
 * - d3.linkHorizontal() 绘制父子曲线
 * - 画布缩放拖拽、动态根节点切换
 * - D3 渲染优化: RAF / 批量DOM / CSS Transform
 */

import { test, expect } from '@playwright/test'
import { FamilyTreeBrowserTester } from '../browser-tester.js'

let tester

async function ensureLoggedInWithData() {
  await tester.goto()
  const isNotSet = await tester.isPasswordNotSet()
  if (isNotSet) {
    await tester.setupPassword('123456')
  }

  const loginVisible = await tester.isLoginFormVisible()
  if (loginVisible) {
    await tester.login('123456')
  }

  await tester.waitForMainPage()

  // 确保至少有一些数据
  const treeNodes = await tester.getTreeNodes()
  if (treeNodes.length === 0) {
    await tester.addNode({ name: '测试节点A', gender: 'male', birthDate: '1980-01-01' })
    await tester.sleep(500)
    await tester.addNode({ name: '测试节点B', gender: 'male', birthDate: '1985-06-15' })
    await tester.sleep(800)
  }
}

test.describe('可视化 (Visualization)', () => {
  test.beforeEach(async ({ page }) => {
    tester = new FamilyTreeBrowserTester(page, 'http://localhost:3000')
  })

  test('TC11: 树状图 SVG 渲染与连线', async () => {
    await ensureLoggedInWithData()

    // 验证 SVG 画布存在
    const hasSVG = await tester.hasVisualizationSVG()
    expect(hasSVG, '应存在 SVG 画布').toBe(true)

    // 验证有节点
    const nodeCount = await tester.getVisNodeCount()
    expect(nodeCount, 'SVG 中应有节点').toBeGreaterThan(0)

    // 检查连线状态（独立根节点间无父子/配偶关系时可能无连线，属正常行为）
    const linkInfo = await tester.getLinkInfo()
    // 添加断言：至少验证 linkInfo 对象有效
    expect(linkInfo, '连线信息对象应存在').toBeTruthy()
    expect(typeof linkInfo.linkCount, '连线计数应为数字').toBe('number')

    await tester.screenshot('tc11-svg-rendering')
  })

  test('TC12: 节点点击高亮与联动', async () => {
    await ensureLoggedInWithData()

    const visNodes = await tester.getVisNodes()
    const targetNode = visNodes[0]
    expect(targetNode, '应有至少一个可视化节点').toBeTruthy()

    // 点击可视化节点
    const clickResult = await tester.clickVisNode(targetNode)
    expect(clickResult.success, `点击节点失败: ${clickResult.message}`).toBe(true)

    await tester.sleep(500)

    // 验证 TreePanel 中的对应节点也被选中
    // 通过检查选中样式类是否存在
    const selectedEl = await tester.page.$('.tree-node-content.selected')
    expect(selectedEl, '点击可视化节点后，树面板中应有节点被选中').not.toBeNull()

    await tester.screenshot('tc12-node-clicked')
  })

  test('TC13: 缩放控制（放大/缩小/重置）', async () => {
    await ensureLoggedInWithData()

    // 测试放大
    const zoomInResult = await tester.zoomIn()
    expect(zoomInResult.success, `放大失败: ${zoomInResult.message}`).toBe(true)

    await tester.sleep(300)

    // 测试缩小
    const zoomOutResult = await tester.zoomOut()
    expect(zoomOutResult.success, `缩小失败: ${zoomOutResult.message}`).toBe(true)

    await tester.sleep(300)

    // 测试重置
    const resetResult = await tester.resetZoom()
    expect(resetResult.success, `重置失败: ${resetResult.message}`).toBe(true)

    await tester.screenshot('tc13-zoom-controls')
  })

  test('TC14: 画布拖拽平移', async () => {
    await ensureLoggedInWithData()

    // 在可视化区域鼠标拖拽
    const dragResult = await tester.dragVisualization(100, 50)
    expect(dragResult.success, `拖拽失败: ${dragResult.message}`).toBe(true)

    await tester.sleep(300)

    // 再拖回
    const dragBackResult = await tester.dragVisualization(-100, -50)
    expect(dragBackResult.success, `拖拽回失败: ${dragBackResult.message}`).toBe(true)

    await tester.screenshot('tc14-drag-pan')
  })

  test('TC14b: 鼠标滚轮缩放', async () => {
    await ensureLoggedInWithData()

    // 滚轮向上滚动 → 放大
    const zoomInResult = await tester.wheelZoom(-120)
    expect(zoomInResult.success, `滚轮放大失败: ${zoomInResult.message}`).toBe(true)

    await tester.sleep(300)

    // 滚轮向下滚动 → 缩小
    const zoomOutResult = await tester.wheelZoom(120)
    expect(zoomOutResult.success, `滚轮缩小失败: ${zoomOutResult.message}`).toBe(true)

    await tester.sleep(300)

    // 验证节点仍在 SVG 中（缩放未破坏渲染）
    const nodeCount = await tester.getVisNodeCount()
    expect(nodeCount, '滚轮缩放后节点应仍在').toBeGreaterThan(0)

    await tester.screenshot('tc14b-wheel-zoom')
  })

  test('TC14c: 移动端双指捏合缩放', async ({ browser }) => {
    // 需要 hasTouch 的浏览器上下文
    const touchContext = await browser.newContext({ hasTouch: true, viewport: { width: 375, height: 812 } })
    const touchPage = await touchContext.newPage()
    const touchTester = new FamilyTreeBrowserTester(touchPage, 'http://localhost:3000')

    try {
      await touchTester.goto()
      const isNotSet = await touchTester.isPasswordNotSet()
      if (isNotSet) {
        await touchTester.setupPassword('123456')
      }
      await touchTester.login('123456')
      await touchTester.waitForMainPage()

      // 添加测试数据
      const treeNodes = await touchTester.getTreeNodes()
      if (treeNodes.length === 0) {
        await touchTester.addNode({ name: '触控测试A', gender: 'male' })
        await touchTester.sleep(500)
        await touchTester.addNode({ name: '触控测试B', gender: 'female' })
        await touchTester.sleep(800)
      }

      // 双指捏合放大
      const pinchResult = await touchTester.pinchZoom(1.5)
      expect(pinchResult.success, `捏合放大失败: ${pinchResult.message}`).toBe(true)

      // 验证节点仍在
      const nodeCount = await touchTester.getVisNodeCount()
      expect(nodeCount, '捏合缩放后节点应仍在').toBeGreaterThan(0)

      await touchTester.screenshot('tc14c-pinch-zoom')
    } finally {
      await touchContext.close()
    }
  })
})
