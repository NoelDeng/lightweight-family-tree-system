import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useDataStore } from './data.js'

export const useVisualizationStore = defineStore('visualization', () => {
  const dataStore = useDataStore()
  const selectedNodeId = ref(null)
  const viewMode = ref('tree') // 'tree' | 'cluster'
  const rootNodeId = ref(null)
  const zoomLevel = ref(1)
  const panX = ref(0)
  const panY = ref(0)

  const selectedNode = computed(() => {
    return dataStore.findNodeById(selectedNodeId.value)
  })

  const hasSelectedNode = computed(() => {
    return !!selectedNodeId.value
  })

  const currentViewNode = computed(() => {
    if (rootNodeId.value) {
      return dataStore.findNodeById(rootNodeId.value)
    }
    // 默认根节点：没有父亲和母亲的人
    const root = dataStore.findNodeById('root')
    return root || null
  })

  const setViewMode = (mode) => {
    viewMode.value = mode
  }

  const selectNode = (nodeId) => {
    selectedNodeId.value = nodeId
  }

  const clearSelection = () => {
    selectedNodeId.value = null
  }

  const setRootNode = (nodeId) => {
    rootNodeId.value = nodeId
  }

  const resetView = () => {
    rootNodeId.value = null
    selectedNodeId.value = null
    zoomLevel.value = 1
    panX.value = 0
    panY.value = 0
  }

  const zoomIn = () => {
    zoomLevel.value = Math.min(zoomLevel.value + 0.1, 3)
  }

  const zoomOut = () => {
    zoomLevel.value = Math.max(zoomLevel.value - 0.1, 0.3)
  }

  const setZoom = (level) => {
    zoomLevel.value = Math.max(0.3, Math.min(level, 3))
  }

  const setPan = (x, y) => {
    panX.value = x
    panY.value = y
  }

  return {
    selectedNodeId,
    viewMode,
    rootNodeId,
    zoomLevel,
    panX,
    panY,
    selectedNode,
    hasSelectedNode,
    currentViewNode,
    setViewMode,
    selectNode,
    clearSelection,
    setRootNode,
    resetView,
    zoomIn,
    zoomOut,
    setZoom,
    setPan
  }
})
