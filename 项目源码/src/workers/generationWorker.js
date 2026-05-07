/**
 * Web Worker - 世代计算
 */

// 世代计算函数
function calculateGeneration(nodeId, nodes, depth = 0) {
  const node = nodes.find(n => n.id === nodeId)

  if (!node) {
    return depth
  }

  // 如果没有父节点，返回当前深度
  if (!node.fatherId && !node.motherId) {
    return depth
  }

  // 递归计算父节点世代
  const fatherGen = node.fatherId
    ? calculateGeneration(node.fatherId, nodes, depth + 1)
    : depth

  const motherGen = node.motherId
    ? calculateGeneration(node.motherId, nodes, depth + 1)
    : depth

  // 返回较大的世代
  return Math.max(fatherGen, motherGen)
}

// 处理消息
self.onmessage = function(e) {
  const { type, data } = e.data

  switch (type) {
    case 'CALCULATE_GENERATION':
      const result = calculateGeneration(data.nodeId, data.nodes)
      self.postMessage({
        type: 'GENERATION_RESULT',
        nodeId: data.nodeId,
        generation: result
      })
      break

    case 'CALCULATE_ALL_GENERATIONS':
      const generations = {}
      data.nodes.forEach(node => {
        const gen = calculateGeneration(node.id, data.nodes)
        generations[node.id] = gen
      })
      self.postMessage({
        type: 'ALL_GENERATIONS_RESULT',
        generations
      })
      break

    default:
      self.postMessage({
        type: 'ERROR',
        error: 'Unknown message type'
      })
  }
}
