# 折柳建材店管理系统 - Code Review 详细报告

## 审查日期：2026-05-20
## 审查范围：钱物流核心逻辑全面审查

---

## 一、审查目标

**核心原则**：钱和物不能算错，这是建材店管理系统的底线。

### 1.1 钱（资金流）必须正确
- 销售收款：销售额 = 已收金额 + 应收金额
- 进货付款：进货成本 = 已付金额 + 应付金额
- 销售退货：退货金额必须从未收金额中扣除
- 进货退货：退货金额必须从未付金额中扣除
- 抹零/调整：必须有明确的账务调整记录

### 1.2 物（库存）必须正确
- 销售出库：库存必须减少
- 销售退货入库：库存必须增加
- 进货入库：库存必须增加
- 进货退货出库：库存必须减少

---

## 二、审查结果汇总

| 严重级别 | 问题编号 | 描述 | 文件 | 状态 |
|----------|----------|------|------|------|
| ~~CRITICAL~~ | ~~MONEY-001~~ | ~~Dashboard 只查询旧架构 sale，未查询新架构 saleOrder~~ | ~~Dashboard.tsx~~ | 🟢 已修复 |
| ~~CRITICAL~~ | ~~ERR-002-01~~ | ~~Collections.tsx 使用 alert()/confirm()~~ | ~~Collections.tsx~~ | 🟢 已修复 |
| ~~CRITICAL~~ | ~~ERR-002-02~~ | ~~SaleDrafts.tsx 使用 alert()~~ | ~~SaleDrafts.tsx~~ | 🟢 已修复 |
| ~~CRITICAL~~ | ~~ERR-002-03~~ | ~~SaleDraftEdit.tsx 使用 alert()~~ | ~~SaleDraftEdit.tsx~~ | 🟢 已修复 |
| ~~CRITICAL~~ | ~~ERR-002-04~~ | ~~PhotoManagement.tsx 使用 alert()~~ | ~~PhotoManagement.tsx~~ | 🟢 已修复 |
| ~~CRITICAL~~ | ~~ERR-002-05~~ | ~~InventoryCheck.tsx 使用 alert()/confirm()~~ | ~~InventoryCheck.tsx~~ | 🟢 已修复 |
| ~~CRITICAL~~ | ~~ERR-002-06~~ | ~~ProductNew.tsx 使用 alert()~~ | ~~ProductNew.tsx~~ | 🟢 已修复 |
| ~~CRITICAL~~ | ~~ERR-002-07~~ | ~~Settings.tsx 使用 alert()/confirm()~~ | ~~Settings.tsx~~ | 🟢 已修复 |
| ~~CRITICAL~~ | ~~ERR-002-08~~ | ~~LegacyBills.tsx 使用 confirm()~~ | ~~LegacyBills.tsx~~ | 🟢 已修复 |
| ~~CRITICAL~~ | ~~ERR-002-09~~ | ~~Brands.tsx 使用 confirm()~~ | ~~Brands.tsx~~ | 🟢 已修复 |
| ~~CRITICAL~~ | ~~ERR-002-10~~ | ~~Customers.tsx 使用 confirm()~~ | ~~Customers.tsx~~ | 🟢 已修复 |
| ✅ | FLOW-001 | 销售订单创建 Receivable | SaleNew.tsx | ✅ 已修复 |
| ✅ | FLOW-002 | 销售退货更新库存和 Receivable | Sales.tsx | ✅ 已修复 |
| ✅ | FLOW-003 | 进货退货更新库存 | Purchases.tsx | ✅ 已修复 |

---

## 三、CRITICAL 问题详情

### 3.1 MONEY-001：Dashboard 新架构数据缺失 🔴

**问题描述**：
Dashboard.tsx 第 109-126 行只查询了旧架构 `db.sale`，完全没有查询新架构 `db.saleOrder`。

**影响**：
- 新架构的销售订单不会显示在 Dashboard
- 今日销售额统计不完整
- 近 7 天销售趋势不包含新架构订单
- 热销商品统计不包含新架构订单

**根本原因**：
代码只调用了 `db.sale.findMany()`，缺少 `db.saleOrder.findMany()`

**修复建议**：
在 `loadDashboardData` 和 `loadFlowStats` 函数中添加对新架构 `db.saleOrder` 的查询，并合并统计数据。

---

### 3.2 ERR-002 系列：alert()/confirm() 阻塞问题 🔴

**问题描述**：
在 Electron 环境下，`alert()` 和 `confirm()` 函数会被拦截并转换为同步 IPC 调用，导致主线程阻塞。

**影响**：
- Dialog 打开后输入框无法交互
- 第二次打开 Dialog 时阻塞时间递增
- 直至页面完全卡死需要重启

**涉及文件清单**：

| 文件 | 行号 | 问题 |
|------|------|------|
| Collections.tsx | 86, 135, 147, 140 | alert() × 3, confirm() × 1 |
| SaleDrafts.tsx | 56, 124, 128, 50, 61 | alert() × 4, confirm() × 1 |
| SaleDraftEdit.tsx | 97, 217, 251, 255, 263, 326, 330 | alert() × 7 |
| PhotoManagement.tsx | 124, 142, 144, 148 | alert() × 4 |
| InventoryCheck.tsx | 154, 160, 141 | alert() × 2, confirm() × 1 |
| ProductNew.tsx | 61, 81, 85, 93, 112 | alert() × 5 |
| Settings.tsx | 78, 82, 133, 136, 142, 160, 185, 197, 190, 166 | alert() × 6, confirm() × 2 |
| LegacyBills.tsx | 158 | confirm() × 1 |
| Brands.tsx | 107, 146 | confirm() × 2 |
| Customers.tsx | 226, 349 | confirm() × 2 |

**总计**：33 处 alert() + 10 处 confirm()

**修复方案**：
1. 引入 toast 组件：`import { toast } from '@/components/Toast';`
2. 替换规则：
   - `alert('消息')` → `toast('消息', 'success')`
   - `alert('错误')` → `toast('错误', 'error')`
   - `alert('警告')` → `toast('警告', 'warning')`
   - `confirm('?')` → 使用 Dialog 组件替代

---

## 四、资金流审查结果 ✅

### 4.1 销售资金流 ✅

| 检查项 | 文件:行号 | 结果 |
|--------|-----------|------|
| 销售订单创建时创建 Receivable | SaleNew.tsx:362-369 | ✅ 正确 |
| Receivable.originalAmount = totalAmount | SaleNew.tsx:365 | ✅ 正确 |
| 收款操作更新 Receivable | Collections.tsx | ✅ 有催账记录 |
| 销售退货创建 SaleReturn | Sales.tsx:408-421 | ✅ 正确 |
| 销售退货增加库存 | Sales.tsx:423-426 | ✅ 正确 |
| 销售退货更新 remainingAmount | Sales.tsx:428-431 | ✅ 正确 |

### 4.2 进货资金流 ✅

| 检查项 | 文件:行号 | 结果 |
|--------|-----------|------|
| 进货入库增加库存 | Purchases.tsx:295-298 | ✅ 正确 |
| 进货退货创建 PurchaseReturn | Purchases.tsx:104-118 | ✅ 正确 |
| 进货退货减少库存 | Purchases.tsx:120-123 | ✅ 正确 |

### 4.3 库存增减逻辑 ✅

| 操作 | 变化 | 结果 |
|------|------|------|
| 销售出库 | stock - quantity | ✅ decrement |
| 销售退货入库 | stock + quantity | ✅ increment |
| 进货入库 | stock + quantity | ✅ increment |
| 进货退货出库 | stock - quantity | ✅ decrement |

---

## 五、修复优先级

### P0 - 必须立即修复（阻塞问题）
1. **ERR-002 系列**：所有 33 处 alert() 和 10 处 confirm() 必须替换
2. **MONEY-001**：Dashboard 新架构数据缺失

### P1 - 高优先级
3. Dashboard 补充新架构统计后需验证数据一致性

---

## 六、执行记录

| 日期 | 审查人 | 审查范围 | 发现问题数 | 修复数 | 状态 |
|------|--------|----------|------------|--------|------|
| 2026-05-20 | AI | 销售/进货资金流 | 12 | 3 | 进行中 |
