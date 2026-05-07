<template>
  <div class="tree-node">
    <div
      class="tree-node-content"
      :class="{ 'selected': isSelected }"
      @click="handleNodeClick"
    >
      <div class="node-info">
        <span class="node-name">{{ node.name }}</span>
        <span class="node-generation">{{ node.generation || 1 }}代</span>
      </div>

      <div class="node-actions">
        <button class="node-action-btn" @click.stop="handleExpand" title="展开/收起">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
        <button class="node-action-btn" @click.stop="handleAddChild" title="添加子节点">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
        <button class="node-action-btn" @click.stop="handleEdit" title="编辑">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="node-action-btn" @click.stop="handleShowDetail" title="详情">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        </button>
        <button class="node-action-btn delete" @click.stop="handleDelete" title="删除">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    </div>

    <div v-if="expanded" class="tree-children">
      <TreeNode
        v-for="child in children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        @node-click="handleNodeClick"
        @add-node="handleAddNode"
        @edit-node="handleEditNode"
        @delete-node="handleDeleteNode"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useDataStore } from '../stores/data.js'
import { useVisualizationStore } from '../stores/visualization.js'

const props = defineProps({
  node: {
    type: Object,
    required: true
  },
  depth: {
    type: Number,
    default: 0
  },
  lazyLoad: {
    type: Boolean,
    default: false
  },
  children: {
    type: Array,
    default: () => []
  },
  expanded: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['node-click', 'add-node', 'edit-node', 'delete-node', 'show-detail', 'toggle-expand'])

const dataStore = useDataStore()
const visualizationStore = useVisualizationStore()

const expanded = ref(!props.lazyLoad)

const isSelected = computed(() => {
  return visualizationStore.selectedNodeId === props.node.id
})

const children = computed(() => {
  // 如果是懒加载模式，使用传入的子节点
  if (props.lazyLoad) {
    return props.children
  }
  // 否则从数据存储中获取
  return dataStore.findChildrenByFatherId(props.node.id).concat(
    dataStore.findChildrenByMotherId(props.node.id)
  )
})

const handleNodeClick = () => {
  emit('node-click', props.node)
  visualizationStore.selectNode(props.node.id)
}

const handleExpand = () => {
  expanded.value = !expanded.value
}

const handleAddChild = () => {
  emit('add-node', props.node)
}

const handleEdit = () => {
  emit('edit-node', props.node)
}

const handleShowDetail = () => {
  emit('show-detail', props.node)
}

const handleDelete = () => {
  emit('delete-node', props.node)
}

const handleAddNode = (node) => {
  emit('add-node', node)
}

const handleEditNode = (node) => {
  emit('edit-node', node)
}

const handleDeleteNode = (node) => {
  emit('delete-node', node)
}
</script>

<style scoped>
.tree-node {
  margin-left: 20px;
}

.tree-node-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 4px;
}

.tree-node-content:hover {
  background: #f1f5f9;
}

.tree-node-content.selected {
  background: #e2e8f0;
  border-left: 3px solid #718096;
}

.node-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.node-name {
  font-weight: 600;
  color: #2d3748;
}

.node-generation {
  font-size: 12px;
  color: #64748b;
  background: #e2e8f0;
  padding: 2px 8px;
  border-radius: 12px;
}

.node-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.tree-node-content:hover .node-actions {
  opacity: 1;
}

.node-action-btn {
  padding: 4px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.node-action-btn:hover {
  background: #f1f5f9;
}

.node-action-btn.delete:hover {
  background: #fed7d7;
  border-color: #fca5a5;
}

.tree-children {
  margin-left: 16px;
  border-left: 2px solid #e2e8f0;
  padding-left: 8px;
}

/* 响应式适配 */

/* 桌面端 (>1024px) */
@media (min-width: 1025px) {
  .tree-node {
    margin-left: 20px;
  }

  .tree-node-content {
    padding: 8px 12px;
  }

  .node-name {
    font-size: 14px;
  }

  .node-generation {
    font-size: 12px;
  }

  .tree-children {
    margin-left: 16px;
    border-left-width: 2px;
    padding-left: 8px;
  }
}

/* 平板端 (768px - 1024px) */
@media (min-width: 768px) and (max-width: 1024px) {
  .tree-node {
    margin-left: 16px;
  }

  .tree-node-content {
    padding: 6px 10px;
  }

  .node-name {
    font-size: 13px;
  }

  .node-generation {
    font-size: 11px;
  }

  .tree-children {
    margin-left: 12px;
    border-left-width: 2px;
    padding-left: 6px;
  }
}

/* 移动端 (<768px) */
@media (max-width: 767px) {
  .tree-node {
    margin-left: 12px;
  }

  .tree-node-content {
    padding: 4px 8px;
    min-height: 32px;
  }

  .node-name {
    font-size: 12px;
  }

  .node-generation {
    font-size: 10px;
    padding: 1px 6px;
  }

  .tree-children {
    margin-left: 10px;
    border-left-width: 1px;
    padding-left: 4px;
  }

  .tree-children .tree-node {
    margin-left: 10px;
  }

  .node-actions {
    opacity: 1;
  }

  .node-action-btn {
    padding: 2px;
    border-radius: 4px;
  }

  .node-action-btn svg {
    width: 14px;
    height: 14px;
  }
}
</style>
