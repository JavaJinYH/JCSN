# 折柳建材店管理系统

一个专业的建材店管理系统，支持商品管理、销售管理、库存管理、报表统计等功能。

## 功能特点

- 🏪 **商品管理** - 商品分类、品牌管理、规格管理
- 💰 **销售管理** - 销售订单、销售退货、销售小票
- 📦 **进货管理** - 进货订单、进货退货、供应商管理
- 📊 **库存管理** - 库存盘点、库存预警
- 📈 **报表统计** - 销售报表、利润分析、库存报表
- 👥 **联系人管理** - 客户、供应商、联系人分类
- 📱 **移动端访问** - 支持手机端访问
- 📝 **服务预约** - 安装服务、维修服务预约管理
- 💾 **数据备份** - 一键备份和恢复数据

## 技术栈

- **前端**: React 18 + TypeScript + Vite
- **UI组件**: Tailwind CSS + Radix UI
- **数据库**: SQLite + Prisma ORM
- **桌面端**: Electron
- **图表库**: Recharts
- **状态管理**: Zustand
- **表单验证**: Zod
- **日期处理**: Day.js

## 快速开始

### 安装依赖

```bash
npm install
```

### 初始化数据库

```bash
npm run prisma:generate
```

### 开发模式

```bash
npm run dev
```

### 构建应用

```bash
npm run electron:build
```

## 项目结构

```
.
├── src/
│   ├── components/    # 通用组件
│   ├── lib/         # 工具函数和计算逻辑
│   ├── pages/       # 页面组件
│   ├── services/    # 业务逻辑层
│   └── styles/      # 样式文件
├── prisma/         # 数据库模型
├── electron/       # Electron主进程
└── public/         # 静态资源
```

## 数据库管理

### 生成数据库

```bash
npm run prisma:generate
```

### 数据库迁移

```bash
npm run prisma:migrate
```

### 清空数据

```bash
npm run db:clear
```

### 填充测试数据

```bash
npm run db:seed
```

## 数据备份和恢复

系统内置数据备份和恢复功能：
- 一键备份所有数据为 JSON 文件
- 从备份文件恢复数据
- 支持重建照片索引

## 版本

v1.0.0

## 许可证

MIT
