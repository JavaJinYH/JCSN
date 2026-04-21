# 折柳建材项目 - 脚本说明

## 解决 Windows 终端中文乱码问题

本项目已集成编码自动设置方案，无需手动配置。

### 通用解决方案

1. **所有新增的 Node.js 脚本**，请在第一行引入编码模块：
   ```javascript
   require('../scripts/set-encoding');
   ```

2. **现有脚本已更新**：
   - `prisma/seed.js` - 测试数据生成
   - `prisma/clear-data.js` - 清空数据库
   - `prisma/cleanup-duplicate-walk-in.js` - 清理重复散客

### npm 命令（推荐使用）

```bash
# 生成测试数据
npm run db:seed

# 清理重复散客
npm run db:cleanup-walkin

# 清空数据库
npm run db:clear
```

### 技术原理

`set-encoding.js` 模块会自动检测 Windows 平台，并调用 `chcp 65001` 命令设置终端编码为 UTF-8，从而解决中文乱码问题。
