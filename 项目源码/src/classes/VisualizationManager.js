/**
 * 可视化管理类
 * 负责可视化布局计算和渲染
 */
import * as d3 from 'd3'
import { NodeManager } from './NodeManager.js'

export class VisualizationManager {
  #nodeManager = null
  #svgWidth = 800
  #svgHeight = 600

  constructor(nodeManager) {
    this.#nodeManager = nodeManager
  }

  /**
   * 设置SVG尺寸
   * @param {number} width
   * @param {number} height
   */
  setSvgSize(width, height) {
    this.#svgWidth = width
    this.#svgHeight = height
  }

  /**
   * 渲染家族树
   * @param {Array} nodes
   * @returns {Object}
   */
  renderTree(nodes) {
    if (!nodes || nodes.length === 0) {
      return {
        nodes: [],
        links: []
      }
    }

    // 计算每个节点的世代
    nodes.forEach(node => {
      this.#calculateNodeGeneration(node, nodes)
    })

    // 转换为D3格式
    const root = d3.stratify()
      .id(d => d.id)
      .parentId(d => d.fatherId || d.motherId || null)
      (nodes)

    // 创建树布局
    const treeLayout = d3.tree()
      .size([this.#svgHeight - 100, this.#svgWidth - 100])
      .nodeSize([80, 100])

    // 递归计算节点位置
    treeLayout(root)

    // 更新节点位置
    const renderedNodes = root.descendants().map(d => {
      const node = nodes.find(n => n.id === d.id)
      if (node) {
        node.x = d.x
        node.y = d.y
      }
      return node
    })

    // 生成连接线
    const links = this.#generateLinks(nodes)

    return {
      nodes: renderedNodes,
      links
    }
  }

  /**
   * 计算节点世代
   * @private
   * @param {Object} node
   * @param {Array} nodes
   * @returns {number}
   */
  async #calculateNodeGeneration(node, nodes) {
    let generation = 1

    // 检查是否有父亲或母亲
    if (node.fatherId) {
      const father = nodes.find(n => n.id === node.fatherId)
      if (father) {
        generation = Math.max(generation, await this.#calculateNodeGeneration(father, nodes) + 1)
      }
    }

    if (node.motherId) {
      const mother = nodes.find(n => n.id === node.motherId)
      if (mother) {
        generation = Math.max(generation, await this.#calculateNodeGeneration(mother, nodes) + 1)
      }
    }

    node.generation = generation
    return generation
  }

  /**
   * 生成连接线
   * @private
   * @param {Array} nodes
   * @returns {Array}
   */
  #generateLinks(nodes) {
    const linkData = []

    nodes.forEach(node => {
      if (node.fatherId) {
        const father = nodes.find(n => n.id === node.fatherId)
        if (father) {
          linkData.push({
            id: `${father.id}-${node.id}`,
            source: { id: father.id, x: 0, y: 0 },
            target: { id: node.id, x: 0, y: 0 }
          })
        }
      }

      if (node.motherId) {
        const mother = nodes.find(n => n.id === node.motherId)
        if (mother) {
          linkData.push({
            id: `${mother.id}-${node.id}`,
            source: { id: mother.id, x: 0, y: 0 },
            target: { id: node.id, x: 0, y: 0 }
          })
        }
      }
    })

    return linkData
  }

  /**
   * 获取SVG尺寸
   * @returns {Object}
   */
  getSvgSize() {
    return {
      width: this.#svgWidth,
      height: this.#svgHeight
    }
  }
}
