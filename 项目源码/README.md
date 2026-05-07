# 轻量级族谱可视化系统 - Vue3版本

基于Vue3 + Vite + D3.js的轻量级本地化族谱可视化系统

## 技术栈

- Vue 3 (Composition API)
- Vite
- Pinia
- D3.js 7
- Tailwind CSS
- IndexedDB
- Web Crypto API

## 项目结构

```
项目源码/
├── src/
│   ├── components/      # Vue组件
│   │   ├── Login.vue
│   │   ├── Main.vue
│   │   ├── TreePanel.vue
│   │   ├── Visualization.vue
│   │   └── DataImportExport.vue
│   ├── views/           # 页面
│   ├── stores/          # Pinia状态管理
│   ├── services/        # 业务逻辑层
│   ├── utils/           # 工具函数
│   └── main.js          # 应用入口
├── public/
├── index.html
├── vite.config.js
└── package.json
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

## 功能特性

### 已完成

- ✅ Vue3 + Vite 项目初始化
- ✅ Tailwind CSS 配置
- ✅ 登录界面
- ✅ 主界面布局

### 待开发

- ⏳ IndexedDB 数据层
- ⏳ 数据加密服务
- ⏳ 树状面板组件
- ⏳ 可视化组件
- ⏳ 双向联动
- ⏳ 数据导入/导出

## 开发计划

详见项目文档/任务拆分.md

## 许可证

MIT
