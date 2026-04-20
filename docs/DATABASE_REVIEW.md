# 数据库审查报告

**生成时间**: 2026-04-20
**审查范围**: Prisma Schema + SQLite 数据库

---

## 一、Schema 结构概览

### 1.1 当前数据模型

| 序号 | 模型名称 | 说明 | 关联表 |
|------|----------|------|--------|
| 1 | Category | 商品分类 | Product |
| 2 | Product | 商品信息 | Category, OrderItem, Purchase |
| 3 | Brand | 品牌 | ProductSpec |
| 4 | ProductSpec | 商品规格 | Product, Brand |
| 5 | CustomerPrice | 客户专属价 | Contact, Product |
| 6 | Contact | 联系人/客户 | 多表关联 |
| 7 | ContactPhone | 联系人电话 | Contact |
| 8 | Supplier | 供应商 | Purchase, PurchaseOrder |
| 9 | Entity | 挂靠主体 | SaleOrder, BizProject |
| 10 | BizProject | 工程项目 | SaleOrder |
| 11 | ContactEntityRole | 联系人-主体角色 | Contact, Entity |
| 12 | ContactProjectRole | 联系人-项目角色 | Contact, BizProject |
| 13 | SaleOrder | 销售订单 | Contact, Entity, OrderItem, OrderPayment |
| 14 | OrderItem | 订单明细 | SaleOrder, Product |
| 15 | OrderPayment | 订单支付记录 | SaleOrder |
| 16 | SaleReturn | 销售退货 | SaleOrder |
| 17 | SaleReturnItem | 退货明细 | SaleReturn, Product |
| 18 | SaleSlip | 销售草稿 | Contact |
| 19 | SaleSlipItem | 草稿明细 | SaleSlip |
| 20 | Receivable | 应收款 | SaleOrder |
| 21 | Rebate | 返点记录 | SaleOrder, Contact |
| 22 | DeliveryRecord | 配送记录 | SaleOrder |
| 23 | PaymentPlan | 还款计划 | Contact |
| 24 | CollectionRecord | 催款记录 | Contact, Receivable |
| 25 | CreditRecord | 信用记录 | Contact |
| 26 | BadDebtWriteOff | 坏账核销 | Contact, SaleOrder |
| 27 | PurchaseOrder | 采购订单 | Supplier |
| 28 | Purchase | 采购明细 | PurchaseOrder, Product, Supplier |
| 29 | PurchaseReturn | 采购退货 | Purchase |
| 30 | PurchaseReturnItem | 采购退货明细 | PurchaseReturn, Product |
| 31 | InventoryCheck | 库存盘点 | InventoryCheckItem |
| 32 | InventoryCheckItem | 盘点明细 | InventoryCheck, Product |
| 33 | DeliveryFee | 配送费用配置 | - |
| 34 | AuditLog | 操作日志 | - |
| 35 | SaleOrderPhoto | 销售单照片 | SaleOrder |
| 36 | PurchasePhoto | 采购单照片 | Purchase |
| 37 | CustomerCategory | 客户分类 | Contact |
| 38 | SystemSetting | 系统设置 | - |

**总计**: 38 个模型

---

## 二、发现的问题

### 2.1 命名不一致问题 ⚠️

| 问题 | SaleSlip | SaleOrder |
|------|-----------|-----------|
| 购货人字段 | `buyerCustomerId` | `buyerId` |
| 付款人字段 | `payerCustomerId` | `payerId` |
| 介绍人字段 | `introducerCustomerId` | `introducerId` |
| 取货人字段 | `pickerCustomerId` | `pickerId` |

**问题说明**: `SaleSlip` 使用 `*CustomerId` 后缀，而 `SaleOrder` 使用 `*Id` 后缀。两者都关联到 `Contact` 表，但命名风格不统一。

**建议**: 考虑统一命名规范，但需注意这会影响大量代码改动。

### 2.2 Product 表缺少 code 字段 ⚠️

| 表 | 是否有 code 字段 |
|----|------------------|
| Contact | ✅ 有 (`code String @unique`) |
| Supplier | ✅ 有 (`code String @unique`) |
| Product | ❌ 无 |

**问题说明**: 商品表没有商品编码字段，而联系人和供应商都有。这导致无法通过编码快速识别商品。

**建议**: 可接受现状（商品名+品牌+规格组合可唯一标识），或后续版本添加 `code` 字段。

### 2.3 已删除/废弃的表 ⚠️

在本次修复中，已删除以下已废弃的表：

| 废弃表名 | 说明 | 状态 |
|----------|------|------|
| Sale | 旧销售订单表 | 已删除，数据迁移到 SaleOrder |
| SaleItem | 旧订单明细表 | 已删除，数据迁移到 OrderItem |
| Customer | 旧客户表 | 已删除，数据迁移到 Contact |
| Project | 旧项目表 | 已删除，数据迁移到 BizProject |
| CustomerCategory | 旧客户分类 | 已删除（与新建 CustomerCategory 冲突） |

**注意**: 数据库已被重置，这些表的数据已丢失。如果有历史数据需要保留，请从备份恢复。

---

## 三、数据一致性检查

### 3.1 当前状态

由于数据库已重置，当前状态：

| 数据类型 | 数量 |
|----------|------|
| 商品 | 0 |
| 联系人 | 2 (系统内置) |
| 销售订单 | 0 |
| 订单明细 | 0 |
| 挂靠主体 | 0 |
| 供应商 | 0 |
| 应收款 | 0 |
| 草稿 | 0 |

### 3.2 异常数据检测（基于空数据库）

脚本可检测以下异常：

```javascript
// 1. 编码重复
- Contact.code 重复
- Supplier.code 重复
- SaleOrder.invoiceNo 重复

// 2. 数值异常
- 商品参考价为 0 或负数
- 商品库存为负数
- 订单金额为 0
- 已付金额大于总金额
- 应收款剩余金额为负
- 订单明细小计不一致 (quantity * unitPrice != subtotal)

// 3. 数据重复
- 商品名称+品牌+规格组合重复
- 联系人名称重复
- 手机号重复

// 4. 外键完整性
- 供应商类型联系人未迁移到 Supplier 表
```

---

## 四、Schema 审查结论

### 4.1 结构评价

| 维度 | 评分 | 说明 |
|------|------|------|
| 完整性 | ⭐⭐⭐⭐ | 38个模型覆盖主要业务场景 |
| 一致性 | ⭐⭐⭐ | SaleSlip/SaleOrder 命名不一致 |
| 规范性 | ⭐⭐⭐⭐ | 大部分遵循 Prisma 最佳实践 |
| 可维护性 | ⭐⭐⭐⭐ | 关系清晰，外键约束完善 |

### 4.2 需要关注的问题

1. **SaleSlip 与 SaleOrder 命名不一致** - 建议统一，但需要较大改动
2. **Product 缺少 code 字段** - 可接受，建议通过名称+品牌+规格标识
3. **数据库已重置** - 所有业务数据已清空，需要重新录入

### 4.3 建议

1. **短期**: 暂不修改 schema，保持现状
2. **中期**: 统一 SaleSlip 和 SaleOrder 的字段命名
3. **长期**: 考虑为商品添加编码系统

---

## 五、附录：检测脚本

检测脚本位置: `scripts/db-check.js`

使用方法:
```bash
node scripts/db-check.js
```

可检测的异常类型:
- 编码/名称重复
- 数值型字段异常（0、负数、不一致）
- 外键完整性问题
- 无效的枚举值

---

**报告生成**: 数据库审查工具
**下一步行动**: 根据业务需要决定是否恢复历史数据
