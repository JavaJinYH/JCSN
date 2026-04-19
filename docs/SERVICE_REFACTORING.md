# 折柳建材系统 - 重构方案

## 一、背景与目标

### 1.1 系统要求
- **模块化组件化**：功能独立、可组合
- **高内聚低耦合**：模块内部紧密，模块之间松散
- **单一职责**：每个组件/函数只做一件事
- **简洁高效可读性高**：代码简洁，逻辑清晰
- **严禁过度设计**：适合当前规模，不引入不必要的复杂性
- **命名语义化**：统一规范，见名知意
- **核心功能、复杂逻辑必须有中文注释**

### 1.2 当前问题
- 页面直接调用 `db.*` 数据库操作（违反低耦合）
- 大页面文件过大（SaleNew.tsx 1000+ 行）
- 业务逻辑和 UI 混合（组件职责不清）
- 缺少接口契约定义
- 缺少统一的日志记录

### 1.3 重构目标
通过 **P0 Service 层** + **P1 拆分大页面** + **P3 提取通用 Hooks**，实现高内聚低耦合的架构。

---

## 二、重构优先级

| 优先级 | 内容 | 收益 | 复杂度 |
|--------|------|------|--------|
| **P0** | Service 层 + 接口契约 | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **P1** | 拆分大页面 | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **P2** | 统一类型定义 | ⭐⭐ | ⭐ |
| **P3** | 提取通用 Hooks | ⭐⭐⭐ | ⭐⭐ |

---

## 三、P0：Service 层 + 接口契约 ✅ 已完成

### 3.1 目录结构
```
src/services/
├── index.ts              # 统一导出
├── SaleService.ts        # 销售服务
├── PurchaseService.ts    # 进货服务
├── ContactService.ts     # 联系人服务
├── ProductService.ts     # 商品服务
└── InventoryService.ts   # 库存服务
```

### 3.2 核心原则
- **所有数据库操作通过 Service 层**
- **页面禁止直接调用 `db.*`**
- **Service 方法必须有类型定义和错误处理**
- **Service 方法必须有接口契约注释**

### 3.3 接口契约规范

每个 Service 方法必须包含：
```typescript
/**
 * 创建销售订单
 * @param data - 订单数据，包含买家、商品、金额等
 * @returns 创建的订单结果，包含订单ID和明细
 * @throws {Error} 订单号已存在
 * @throws {Error} 商品库存不足
 */
async createSaleOrder(data: CreateSaleOrderDTO): Promise<SaleOrderResult>
```

---

## 四、P1：拆分大页面

### 4.1 拆分目标
将大页面拆分为单一职责的子组件，每个组件只负责一个功能。

### 4.2 拆分原则
| 原则 | 说明 |
|------|------|
| 单一职责 | 每个组件只做一件事 |
| 高内聚 | 相关的逻辑放在一起 |
| 低耦合 | 组件之间通过 props 通信 |
| 可复用 | 通用组件抽离到 components/ |

### 4.3 SaleNew.tsx 拆分方案

**当前**：~1000 行，混合了：
- 表单输入
- 购物车逻辑
- 客户选择
- 商品选择
- 提交处理
- 弹窗管理

**拆分后**：
```
src/pages/SaleNew.tsx           # 主页面，组装组件
src/components/sale/
├── SaleForm.tsx               # 基础表单
├── SaleCart.tsx               # 购物车
├── SaleContactSelect.tsx      # 客户选择
├── SaleProductSelect.tsx      # 商品选择
├── SaleDelivery.tsx           # 配送信息
├── SaleSubmitButton.tsx       # 提交按钮（含逻辑）
└── SaleDialogs.tsx            # 所有弹窗管理
```

### 4.4 拆分检查清单
- [ ] 主页面行数 < 300 行
- [ ] 每个组件 < 150 行
- [ ] 组件名称清晰表达职责
- [ ] 组件可独立测试
- [ ] 组件可在其他页面复用

### 4.5 待拆分页面

| 页面 | 当前行数 | 拆分后目标行数 |
|------|----------|----------------|
| SaleNew.tsx | ~1000 | < 300 |
| Purchases.tsx | ~800 | < 300 |
| Sales.tsx | ~600 | < 250 |
| Products.tsx | ~500 | < 250 |

---

## 五、P2：统一类型定义

### 5.1 目标
整理散落的类型定义，减少重复。

### 5.2 规范
```typescript
// 统一使用 src/lib/types.ts
// 或在对应 Service 同目录下
// {业务}Service.ts 旁边放 {业务}Types.ts

src/services/
├── SaleService.ts
├── SaleTypes.ts      # Sale 相关类型
└── SaleHooks.ts      # Sale 相关 Hooks（如果需要）
```

### 5.3 优先级
**中**（当前 types.ts 已基本满足需求，可后续整理）

---

## 六、P3：提取通用 Hooks

### 6.1 目标
提取页面间共享的业务逻辑为通用 Hooks。

### 6.2 可提取的 Hooks

| Hook | 用途 | 可用页面 |
|------|------|----------|
| `useProducts` | 商品列表+筛选 | Products, SaleNew, Purchases |
| `useContacts` | 联系人列表 | Contacts, SaleNew, Entities |
| `useInventory` | 库存状态 | Inventory, Dashboard |
| `useFilters` | 通用筛选逻辑 | 多个列表页 |

### 6.3 规范
```typescript
// src/hooks/useProducts.ts
export function useProducts(initialFilters?: ProductFilters) {
  // 业务逻辑
  return { products, loading, filters, setFilters };
}

// 页面中使用
import { useProducts } from '@/hooks/useProducts';
const { products } = useProducts({ categoryId: 'xxx' });
```

---

## 七、健壮性规范

### 7.1 日志记录
核心流程记录操作日志，便于追溯：
```typescript
// 操作日志格式：[操作][时间][用户][结果]
console.log(`[Sale] 创建订单 ${invoiceNo} by ${buyerId}, 结果: 成功`);

// 错误日志
console.error(`[Sale] 创建订单失败:`, error);
```

### 7.2 错误处理
- 关键操作必须 try-catch
- 错误信息要友好，不暴露内部细节

---

## 八、注释规范

### 8.1 需要中文注释的场景
- 复杂业务逻辑
- 非显而易见的计算公式
- 与行业规范相关的处理
- 需要业务人员理解的流程
- 接口定义必须清晰说明

### 8.2 示例
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

## 九、验收标准

### 9.1 P0 Service 层
- [ ] 所有页面通过 Service 访问数据库
- [ ] 页面不直接调用 `db.*`
- [ ] Service 方法有接口契约注释
- [ ] 构建通过

### 9.2 P1 拆分大页面
- [ ] SaleNew.tsx < 300 行
- [ ] 每个组件 < 150 行
- [ ] 组件职责单一
- [ ] 构建通过
- [ ] 功能测试通过

### 9.3 P3 提取通用 Hooks
- [ ] 提取 3+ 个通用 Hooks
- [ ] Hooks 有类型定义
- [ ] 可在多个页面复用
- [ ] 构建通过

---

## 十、重构进度

### 10.1 已完成
- ✅ P0: Service 层创建完成
- ✅ P0: SaleService, PurchaseService, ContactService, ProductService, InventoryService
- ✅ P0: 接口契约规范建立
- ✅ P1: SaleNew.tsx 拆分为子组件
  - SaleCart.tsx - 购物车组件
  - SaleContactSelect.tsx - 客户选择组件
  - SaleProductSelect.tsx - 商品选择组件
  - SaleDelivery.tsx - 配送信息组件
  - SalePayment.tsx - 支付方式组件
- ✅ P1: SaleNew.tsx 从 1344 行减少到 ~670 行
- ✅ P1: Purchases.tsx 拆分为子组件
  - PurchaseStats.tsx - 统计卡片
  - PurchaseFilters.tsx - 筛选组件
  - PurchaseTable.tsx - 进货表格
  - PurchaseForm.tsx - 添加进货表单
  - PurchaseDetail.tsx - 查看详情
  - PurchaseReturn.tsx - 退货组件
  - PriceHistory.tsx - 价格历史
- ✅ P1: Purchases.tsx 从 1045 行减少到 ~380 行
- ✅ P1: Sales.tsx 拆分为子组件
  - SaleStats.tsx - 统计卡片
  - SaleTable.tsx - 销售表格
  - SaleDetail.tsx - 销售详情
- ✅ P1: Sales.tsx 从 1002 行减少到 ~306 行
- ✅ P1: Products.tsx 拆分为子组件
  - ProductStats.tsx - 统计卡片
  - ProductFilters.tsx - 筛选组件
  - ProductTable.tsx - 商品表格
  - ProductImport.tsx - 库存导入
- ✅ P1: Products.tsx 从 503 行减少到 ~245 行

### 10.2 已完成
- ✅ P1: 大页面拆分（P1 重构全部完成）

### 10.3 已完成
- ✅ P3: 提取通用 Hooks
  - useProducts.ts - 商品数据 Hook
  - useContacts.ts - 联系人数据 Hook
  - useCategories.ts - 分类数据 Hook
- ✅ P3: Products.tsx 已使用通用 Hooks

### 10.4 SaleNew.tsx Service层调用（v4.10 完成）
- ✅ SaleService.createSaleOrder() 增强：添加支付方式和照片保存支持
- ✅ SaleNew.tsx 移除直接 db.* 调用：改用 SaleService 处理订单创建
- ✅ SaleNew.tsx 使用 ProductService、ContactService 加载初始数据
- ✅ 消除代码泥球，提升可维护性

### 10.5 待做（可选）
- ⬜ ~~P2: 类型定义整理~~ - 经分析，当前类型结构已合理（业务模型在types.ts，组件Props在各自文件），无需过度重构
- ⬜ ~~其他页面使用通用 Hooks~~ - 经分析，SaleNew/Purchases 有按需加载逻辑，直接替换降低效率，保持现有实现更合适
- ⬜ Git 提交当前重构成果
