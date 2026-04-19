---
alwaysApply: true
---
# 折柳建材店管理系统 - 项目全局开发规则
**生效范围**：本项目所有AI生成代码、功能开发、业务逻辑

---

## 一、核心原则

### 1.1 系统架构要求
- **模块化组件化**：功能独立、可组合
- **高内聚低耦合**：模块内部紧密，模块之间松散
- **单一职责**：每个组件/函数只做一件事
- **简洁高效可读性高**：代码简洁，逻辑清晰
- **严禁过度设计**：适合当前规模，不引入不必要的复杂性
- **命名语义化**：统一规范，见名知意

### 1.2 开发原则
1. **低耦合架构**：页面不直接调用数据库，必须通过 Service 层
2. **唯一基准**：所有代码必须遵循 `docs/SPEC.md` 定义的架构
3. **文档先行**：数据库结构、核心业务变更必须先修改文档
4. **系统性思维**：同类问题出现两次及以上，必须建立通用规范

---

## 二、Service 层规范

### 2.1 强制要求
**所有数据库操作必须通过 Service 层，禁止页面直接调用 `db.*`**

### 2.2 Service 位置
```
src/services/
├── index.ts              # 统一导出
├── SaleService.ts        # 销售
├── PurchaseService.ts    # 进货
├── ContactService.ts     # 联系人
├── ProductService.ts     # 商品
└── InventoryService.ts   # 库存
```

### 2.3 正确用法
```typescript
// 正确：通过 Service 调用
import { SaleService } from '@/services';
await SaleService.createSaleOrder(data);

// 错误：直接调用数据库（禁止！）
await db.saleOrder.create({...});
```

### 2.4 代码审查
- [ ] 数据库操作在 Service 层
- [ ] 页面不直接调用 `db.*`
- [ ] Service 方法有类型定义
- [ ] 错误处理完整

---

## 三、组件拆分规范

### 3.1 拆分原则
| 原则 | 说明 |
|------|------|
| 单一职责 | 每个组件只做一件事 |
| 高内聚 | 相关的逻辑放在一起 |
| 低耦合 | 组件之间通过 props 通信 |
| 可复用 | 通用组件抽离到 components/ |

### 3.2 行数限制
- 主页面 < 300 行
- 子组件 < 150 行
- 组件名称清晰表达职责

### 3.3 审查清单
- [ ] 主页面行数 < 300
- [ ] 每个组件 < 150 行
- [ ] 组件职责单一
- [ ] 可在多个页面复用

---

## 四、注释规范

### 4.1 需要中文注释的场景
- 复杂业务逻辑
- 非显而易见的计算公式
- 与行业规范相关的处理
- 需要业务人员理解的流程
- 接口定义必须清晰说明

### 4.2 示例
```typescript
// ✅ 好的注释：解释为什么这样算
// 利润率低于 10% 时提示，确保利润空间
if (profitRate < 10) showWarning();

// ✅ 好的注释：说明业务规则
// 按最近进货价计算，市场波动商品按当日报价
const costPrice = isVolatile ? todayPrice : lastPurchasePrice;

// ❌ 坏的注释：显而易见的事情
items.forEach(item => ...);
```

---

## 五、代码风格规范

### 5.1 命名规范
| 类型 | 规范 | 示例 |
|------|------|------|
| 变量/函数 | 小写驼峰 | `handleSubmit`, `totalAmount` |
| 常量 | 大写下划线 | `MAX_RETRY_COUNT` |
| 组件 | 大写驼峰 | `SaleNew`, `InventoryCard` |
| 类型/接口 | PascalCase | `SaleOrderDTO`, `Contact` |

### 5.2 代码自解释
- 好的代码不需要过多注释
- 函数名要表达意图
```typescript
// ✅ 好：自解释
const isLowStock = stock < minStock;
const hasPermission = user.role === 'admin';

// ❌ 差：需要注释解释
let x = stock < minStock; // 是否低库存
```

### 5.3 统一规范
- 同一概念必须使用相同名称
- 客户端使用业务人员能理解的词汇
- 技术术语仅在 Schema/代码注释中使用

### 5.4 技术栈
- Electron + React 18 + TypeScript
- TailwindCSS + shadcn/ui
- Prisma ORM + SQLite

---

## 六、接口契约规范

### 6.1 Service 接口要求
每个 Service 方法必须包含：
- **输入参数**：类型定义
- **返回值**：类型定义
- **可能错误**：说明抛出什么错误

### 6.2 示例
```typescript
/**
 * 创建销售订单
 * @param data - 订单数据，包含买家、商品、金额等
 * @returns 创建的订单结果，包含订单ID和明细
 * @throws {Error} 订单号已存在
 * @throws {Error} 商品库存不足
 */
async createSaleOrder(data: CreateSaleOrderDTO): Promise<SaleOrderResult>

/**
 * 获取销售订单列表
 * @param filters - 筛选条件（可选）
 * @returns 订单列表，按时间倒序
 */
async getSaleOrders(filters?: SaleOrderFilters): Promise<SaleOrder[]>
```

### 6.3 输入输出规范
```typescript
// 输入验证
interface CreateSaleOrderDTO {
  buyerId: string;          // 必填
  totalAmount: number;      // 必填，正数
  items: OrderItemDTO[];   // 必填，非空数组
}

// 输出规范
interface SaleOrderResult {
  sale: SaleOrder;           // 创建的订单
  items: OrderItem[];       // 订单明细
  receivable?: Receivable; // 应收款（如有）
}
```

---

## 七、健壮性规范

### 7.1 错误处理
- 关键操作必须 try-catch
- 错误信息要友好，不暴露内部细节
- 不要用 alert()，用 toast 组件

```typescript
// ✅ 好：友好错误提示
try {
  await SaleService.createSaleOrder(data);
  toast('保存成功', 'success');
} catch (error) {
  toast('保存失败：' + error.message, 'error');
}

// ❌ 差：暴露内部错误
catch (error) {
  toast('数据库错误：' + error.stack, 'error'); // 暴露实现细节
}
```

### 7.2 日志记录
核心流程记录操作日志，便于追溯：
```typescript
// 操作日志格式：[操作][时间][结果]
console.log(`[Sale] 创建订单 ${invoiceNo} by ${buyerId}, 结果: 成功`);

// 错误日志
console.error(`[Sale] 创建订单失败:`, error);
```

### 7.3 异常规范
```typescript
// 自定义错误类型
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// 使用
if (!data.buyerId) {
  throw new ValidationError('买家不能为空');
}
```

---

## 八、安全性规范

### 8.1 输入验证
- 所有用户输入必须验证
- 数字类型检查范围
- 字符串检查长度

```typescript
// ✅ 好：验证输入
const quantity = parseInt(input);
if (isNaN(quantity) || quantity <= 0) {
  throw new ValidationError('数量必须是正数');
}

// ❌ 差：未验证
const quantity = parseInt(input);
stock -= quantity; // 可能导致库存为负
```

### 8.2 敏感数据处理
- 密码等敏感数据不记录日志
- 敏感操作需要二次确认

### 8.3 禁止事项
1. **禁止页面直接调用 `db.*`**，必须通过 Service
2. **禁止使用 `alert()`**，必须用 toast 组件
3. **禁止空字符串 value** 的 SelectItem，用 `__none__` 占位
4. **禁止临时补丁**，同类问题必须建立规范
5. **禁止私自修改**既定布局、配色、技术架构
6. **禁止代码泥球**，单个文件过大必须拆分
7. **禁止未验证的用户输入**直接用于数据库操作

---

## 九、Schema 规范

### 9.1 双向关系原则
```prisma
model Customer {
  id        String @id
  categoryId String?
  category   Category? @relation(...)
}

model Category {
  id        String @id
  customers Customer[]
}
```

### 9.2 修改后必须执行
```bash
npx prisma validate
npx prisma generate
npm run build
```

---

## 十、Select/Combobox 规范

### 10.1 Select value 不能为空
```tsx
<SelectItem value="__none__">无</SelectItem>
```

### 10.2 选项 > 10 个时用 Combobox
使用 `src/components/Combobox.tsx` 实现可搜索下拉

---

## 十一、Dialog 规范

### 11.1 表单状态重置
```typescript
useEffect(() => {
  if (!showDialog) {
    setFormData({ field1: '', field2: '' });
  }
}, [showDialog]);
```

### 11.2 条件渲染
```tsx
{showDialog && (
  <Dialog open={showDialog} onOpenChange={setShowDialog}>
  </Dialog>
)}
```

---

## 十二、响应式设计

### 12.1 最小支持宽度
800x600

### 12.2 Dialog 高度
```tsx
<DialogContent className="max-h-[90vh] overflow-y-auto">
```

---

## 十三、调试清单

修改任何页面后必须验证：
- [ ] 页面正常渲染，无白屏
- [ ] 控制台无红色错误
- [ ] 数据库操作返回正确数据
- [ ] 构建通过 `npm run build`

---

## 十四、提交前检查

1. `npm run build` 通过
2. 无红色控制台错误
3. Service 层调用（不是直接 db.*）
4. Schema 修改后执行了 validate 和 generate
5. 新功能有中文注释（复杂业务逻辑）
6. 关键操作有错误处理
7. 用户输入有验证

---

## 十五、Git 提交规范

### 15.1 提交格式（Conventional Commits）

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 15.2 Type 类型说明

| Type | 说明 | 示例 |
|------|------|------|
| feat | 新功能 | `feat(Sales): 添加销售单导出功能` |
| fix | Bug修复 | `fix(SaleNew): 修复利润率计算错误` |
| refactor | 重构（不改变功能） | `refactor(Sales): 拆分SaleStats组件` |
| docs | 文档更新 | `docs(SPEC): 更新数据模型说明` |
| style | 代码格式调整 | `style: 格式化import顺序` |
| perf | 性能优化 | `perf(Products): 优化商品列表加载速度` |
| test | 测试相关 | `test: 添加销售模块单元测试` |
| chore | 构建/工具变更 | `chore: 升级Prisma版本` |
| wip | 工作进行中 | `wip(SaleOrder): 开发新订单模型` |

### 15.3 Scope 作用域

使用受影响的主要模块名：

| Scope | 说明 |
|-------|------|
| 无scope | 跨多个模块或小改动 |
| Dashboard | 首页模块 |
| Inventory | 库存模块 |
| Sales | 销售模块 |
| Products | 商品模块 |
| Contacts | 联系人模块 |
| Purchases | 进货模块 |
| Customers | 旧客户管理模块 |
| Reports | 报表模块 |
| Settings | 系统设置模块 |
| Hooks | 自定义Hooks |
| Components | 通用组件 |
| Service | Service层 |
| Schema | 数据库模型 |
| SPEC | 项目规格文档 |

### 15.4 Commit Message 示例

```bash
# ✅ 好的提交信息
git commit -m "feat(Sales): 拆分销售统计组件"
git commit -m "fix(SaleNew): 修复亏本警告计算错误"
git commit -m "refactor(Products): 使用通用useProducts Hook"
git commit -m "docs(SPEC): 更新联系人-结账主体数据模型"
git commit -m "chore: 升级Electron到v28"

# ❌ 坏的提交信息
git commit -m "更新代码"
git commit -m "修复bug"
git commit -m "asdf"
```

### 15.5 分支命名规范

```
main                    # 主分支（稳定版本）
dev                     # 开发分支
feat/<feature-name>     # 功能分支
fix/<issue-name>        # 修复分支
refactor/<module-name>  # 重构分支
wip/<module-name>       # 工作进行中分支
```

### 15.6 如何回滚

**回滚单个提交**：
```bash
# 查看提交历史
git log --oneline

# 回滚指定提交（会创建新的回滚提交）
git revert <commit-hash>

# 回滚最近一次提交
git revert HEAD
```

**回滚到指定版本**：
```bash
# 回滚到指定版本（保留之后的提交）
git revert <commit-hash>

# 硬回滚到指定版本（慎用，会丢失之后的提交）
git reset --hard <commit-hash>
```

**查看远程同步状态**：
```bash
# 查看远程仓库
git remote -v

# 推送到远程
git push origin <branch-name>

# 强制推送（慎用）
git push --force origin <branch-name>
```

### 15.7 提交前自检清单

- [ ] `npm run build` 通过
- [ ] 无红色控制台错误
- [ ] 提交信息符合规范
- [ ] 只提交相关改动（避免混入无关修改）
- [ ] 代码通过 lint 检查（如有）
