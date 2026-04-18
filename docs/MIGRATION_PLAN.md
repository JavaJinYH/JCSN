# 折柳建材 - 人员架构全面迁移规划

**生成日期**: 2026-04-17
**版本**: v2.1

---

## 一、业务需求梳理

### 1.0 迁移准则

**命名一致性原则**：迁移过程中发现现有系统存在命名问题（如同一概念有不同叫法），必须一并修正，确保客户端展示、技术文档、代码命名三方一致。

### 1.1 水暖建材店人员角色

| 角色 | contactType | 说明 | 典型场景 |
|------|------------|------|---------|
| 散客/业主 | `customer` | 普通购买客户 | 张三来买水管 |
| 水电工 | `plumber` | 有返点的介绍人 | 老刘介绍客户 |
| 其他 | `other` | 其他人员 | 临时工等 |

> 注意：公司/装修公司是 Entity（结账主体），不是 Contact。Contact 是人，Entity 是组织。

**供应商不再是联系人**，而是独立的 Supplier 模块。

**Contact.name 字段**：
- 对客户：填个人姓名
- 对个人主体（包工头）：填个人姓名

### 1.2 核心业务场景

#### 场景1: 供应商（独立模块）

供应商是独立模块，不再是联系人。

进货时选择供应商：
```
进货单
├── 供应商: [选择供应商 ▼]
│            └── 某管道批发公司
│            └── 联系人: 张三 138xxxx
└── ...
```

**Supplier 可以关联 Contact**（作为供应商的负责人/联系人）

#### 场景3: 年终催账

**按项目催** - 找项目负责人催
```
Project: 某小区水管改造
  负责人: 李四
  累计欠款: ¥12,000
  销售单数: 5笔
```

**按个人催** - 找具体人催
```
Contact: 张三 138xxxx
  累计欠款: ¥3,000
  涉及项目: 2个
```

#### 场景4: 夫妻店操作员（记忆辅助）
- 金先生开的单 → operatorName = "金先生"
- 毛女士开的单 → operatorName = "毛女士"

**作用**：帮助记忆"当时谁开的单、处理的这笔业务"，不是用来统计收入

---

## 二、Contact + Entity + BizProject 架构

### 2.1 三个核心维度

| 维度 | 说明 | 催款对象 |
|-----|------|---------|
| **Contact** | 人（散客/水电工/老板） | 直接催个人 |
| **Entity** | 结账主体（个人/公司/政府） | 催款对象 |
| **BizProject** | 项目/地址 | 催项目负责人 |

### 2.2 关系图

```
┌─────────────────────────────────────────────────────────────────┐
│                      Contact（人）                               │
│                                                                 │
│   • 散客、水电工、公司老板、员工等                             │
│   • contactType: customer/plumber/company/other                │
│   • 通过 ContactEntityRole 关联 Entity                         │
│   • 通过 ContactProjectRole 关联 BizProject                    │
└─────────────────────────────────────────────────────────────────┘
          │                              │
          │ 属于公司/组织                 │ 属于项目
          ▼                              ▼
┌─────────────────────────┐    ┌─────────────────────────────────┐
│    Entity（公司/组织）    │    │         BizProject（项目）       │
│                          │    │                                 │
│   某装修公司              │    │   某小区水管改造                │
│   ├── 负责人: 王二狗      │◄──┤   ├── 属于 Entity: 某装修公司   │
│   ├── 员工: 李四          │    │   ├── 负责人: 王二狗            │
│   └── 多个 BizProject    │    │   └── 多个 SaleOrder           │
│                          │    │                                 │
└─────────────────────────┘    └─────────────────────────────────┘
```

### 2.3 欠款统计

**核心原则**：谁欠我钱就盯着谁催，各维度都要有明细可核对

**三个维度**：

```
按付款人（Contact）统计：
├── 张三 欠: ¥3,000
│   └── 明细：销售单 #S001 ¥1,000, #S005 ¥2,000
└── 李四（水电工）欠: ¥5,000
    └── 明细：销售单 #S003 ¥5,000

按公司/Entity统计：
├── 某装修公司 欠: ¥50,000
│   ├── 负责人: 王二狗
│   ├── 项目数: 5个
│   └── 明细：项目A ¥30,000, 项目B ¥20,000
└── 某装修队 欠: ¥20,000
    └── 明细：项目C ¥20,000

按项目统计：
├── 某小区水管改造 欠: ¥12,000
│   └── 明细：销售单 #S002 ¥12,000
└── 某酒店装修 欠: ¥8,000
    └── 明细：销售单 #S004 ¥8,000
```

**重要**：三个维度统计的是同一笔钱，只是展示角度不同。每个维度都要有明细，方便核对。

**页面设计**：
- 默认显示"总欠款 ¥XXX"
- 点击维度展开明细
- 明细包含：销售单编号、金额、日期

### 2.4 Entity 作用重新定义

**Entity = 公司/组织/个人（结账主体维度）**

- 用于统计某主体（公司/包工头/个人）累计欠多少
- 催款时找 Entity 的负责人
- 账目挂在结账主体下，方便催款

**Entity支持三种类型**：
| 主体类型 | entityType | 说明 | 示例 |
|---------|-----------|------|------|
| 公司 | `company` | 正式注册公司 | 某装修公司、某工程队 |
| 施工队 | `team` | 包工头/施工队 | 张三工程队、李四施工队 |
| 个人 | `personal` | 个人主体 | 业主个人 |

**Entity与Contact的关系**：
- Entity可以关联一个Contact（作为负责人/联系人）
- 这个Contact既是Entity的负责人，也是联系人
- Entity下的项目、单子都归到这个主体下

**Entity添加流程优化**：
1. 添加Entity时：
   - 主体类型 = 公司 / 个人
   - 主体名称 = 公司名或包工头名字
   - 关联联系人 = 搜索选择Contact（可选）
2. 这样包工头可以作为Entity：
   - 同时是Contact（联系人）
   - 下面的项目、单子都归到这个主体下

**新增销售页面付款主体选择优化**：
- 付款主体下拉框**分开两个**：
  - Entity（公司/主体）下拉框：支持输入搜索匹配
  - Contact（个人）下拉框：支持输入搜索匹配
- 用户输入时自动模糊匹配

### 2.5 销售单角色定义

SaleOrder 上的 Contact 角色：

| 字段 | 角色 | 说明 |
|-----|------|------|
| buyerId | 购货人 | 买材料的人/业主 |
| payerId | 付款人 | 实际付款的人 |
| introducerId | 介绍人 | 水电工等介绍生意的人 |
| pickerId | 提货人 | 来提货的人 |

**同一个 Contact 在不同销售单上可以是不同角色**

### 2.6 销售单人员字段定义

SaleOrder 上的人员字段：

| 字段 | 来源 | 性质 | 说明 |
|-----|------|------|------|
| buyerId | Contact选择 或 直接填写 | 可选 | 购货人（可填代称，如"某公司新员工"） |
| payerId | Contact选择 | 可选 | 付款人（催款对象） |
| introducerId | Contact选择 | 可选 | 介绍人（熟人，用于返点） |
| pickerName | 直接填写 | 可选 | 提货人姓名 |
| pickerPhone | 直接填写 | 可选 | 提货人电话 |
| operatorName | 写死选择 | 必填 | 操作员：金先生/毛女士（记忆辅助） |

**设计原则**：所有人员字段都是可选的，只要不影响欠账清算即可

**三种场景**：
| 场景 | 购货人 | 付款人 | 说明 |
|-----|-------|-------|------|
| 正宗散客 | 可空 | 可空 | 买完付清就走，什么都不知道 |
| 挂靠散客 | 填代称或选联系人 | 可选 | 说是挂在某联系人身上的 |
| 熟客 | 选择联系人 | 可选 | 从联系人列表选 |

**核心目的**：欠账清算时能找到人

### 2.7 销售单配送费设计

**金额字段**：

| 字段 | 说明 |
|-----|------|
| 商品总价 | 自动计算 |
| 配送费 | **可选，点按钮添加，可修改或清零** |
| 应收总额 | 商品总价 + 配送费 |
| 已收金额 | 收款时填写 |
| 欠款 | 应收总额 - 已收金额 |

**操作流程**：
1. 选择商品 → 商品总价自动计算
2. 点[添加配送费] → 输入配送费金额（可改可清零）
3. 应收总额 = 商品总价 + 配送费
4. 收款 → 已收金额
5. 欠款 = 应收总额 - 已收金额

**配送费灵活性**：
```
情况1：不收配送费
  商品总价: ¥1000
  配送费: ¥0（清零）
  应收总额: ¥1000

情况2：正常收配送费
  商品总价: ¥1000
  配送费: ¥50
  应收总额: ¥1050

情况3：少收配送费（灵活调整）
  商品总价: ¥1000
  配送费: ¥30（改少了）
  应收总额: ¥1030
```

**销售单配送一体化**：
- 勾选"需要配送" → 填写配送地址
- 配送信息：地址、配货人联系方式
- 自动生成配送任务

### 2.8 销售单安装模块

**业务场景**：
- 爸爸卖门锁、马桶等需要安装的商品
- 需要上门安装服务

**安装流程**：
```
1. 销售单勾选"需要安装"
2. 选择/填写安装人员（爸爸/第三方水电工）
3. 预约安装时间（默认同步送货时间，可修改）
4. 安装完成后标记"已完成"
```

**SaleOrder 模型新增字段**：
```prisma
model SaleOrder {
  // ... 现有字段

  // 安装相关（新增）
  needInstallation  Boolean @default(false)  // 是否需要安装
  installerName    String?                   // 安装人员姓名
  installerPhone   String?                   // 安装人员电话
  installationDate DateTime?                 // 预约安装时间
  installationStatus String?                 // 安装状态：pending/completed
}
```

**安装记录管理**：
```
安装管理页面（可复用配送管理结构）：
├── 待安装列表
│   └── 销售单、安装人员、时间、地址
├── 已完成列表
└── 新增安装记录

安装记录：
├── 关联销售单
├── 安装人员（爸爸/第三方）
├── 安装时间（可编辑）
├── 状态：待安装 / 已完成
└── 备注
```

**与配送的关系**：
- 配送和安装可以独立
- 可以同时需要配送和安装
- 安装时间默认同步送货时间，但可单独修改

### 2.9 手机号变更处理

**核心原则**：Contact.id 唯一不变，手机号可变更

| 字段 | 作用 | 可变性 |
|-----|------|-------|
| `id` | 系统唯一ID | 永远不变 |
| `code` | 内部编号（如 C001） | 永远不变 |
| `name` | 姓名 | 可改 |
| `primaryPhone` | 主手机 | 可变更 |
| `phones` | 其他电话 | 可增减 |

**换号处理流程**：
```
老赖王二狗换号了：138xxxx → 139xxxx

1. 编辑联系人 王二狗
2. 更新 primaryPhone: 139xxxx
3. 系统内 id/code 不变
4. 所有历史销售记录、欠款记录不受影响
```

### 2.10 联系人代码（code）生成规则

```typescript
// 新增联系人时自动生成
const generateContactCode = async (db) => {
  const lastContact = await db.contact.findFirst({
    orderBy: { code: 'desc' },
  });

  if (!lastContact) return 'C001';

  const lastNum = parseInt(lastContact.code.replace('C', ''));
  return `C${String(lastNum + 1).padStart(3, '0')}`;
  // C001 → C002 → C003 ... → C999 → C1000
};
```

---

## 三、Schema 修改清单

### 3.1 Contact 模型（增强）

```prisma
model Contact {
  id           String   @id @default(cuid())
  code        String   @unique  // 内部编号 C001
  name         String
  primaryPhone String?           // 主手机（可变更，不再唯一）
  address      String?
  remark       String?
  contactType  String   @default("customer")  // customer/plumber/company/other
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  phones              ContactPhone[]
  entityRoles         ContactEntityRole[]  // 在 Entity（公司）中的角色
  projectRoles        ContactProjectRole[] // 在项目中的角色
  ordersAsBuyer      SaleOrder[]
  ordersAsPayer      SaleOrder[]
  ordersAsIntroducer SaleOrder[]
  ordersAsPicker     SaleOrder[]
  personalEntity     Entity?              // 如果是个人主体
  rebatesAsPlumber   Rebate[]
  purchasesAsSupplier Purchase[]
  receivables        AccountReceivable[]
}
```

### 3.2 ContactEntityRole 模型（Entity公司角色）

```prisma
model ContactEntityRole {
  id         String   @id @default(cuid())
  contactId  String
  contact    Contact  @relation(fields: [contactId], references: [id], onDelete: Cascade)
  entityId   String
  entity     Entity  @relation(fields: [entityId], references: [id], onDelete: Cascade)

  // role 枚举: boss(老板)/finance(财务)/procurement(采购)/other
  role      String
  isDefault Boolean  @default(false)  // 默认催款人
  remark    String?
  createdAt DateTime @default(now())

  @@unique([contactId, entityId, role])
}
```

### 3.3 Entity 模型（公司/组织）

```prisma
model Entity {
  id           String   @id @default(cuid())
  name         String                              // 公司/组织名称
  type         String   @default("company")        // company/team/personal
  contactId   String?  // 个人主体关联的 Contact
  contact     Contact? @relation(fields: [contactId], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  contactRoles ContactEntityRole[]
  projects     BizProject[]
}
```

### 3.4 BizProject 模型（项目）

```prisma
model BizProject {
  id           String   @id @default(cuid())
  name         String                              // 项目名称/地址
  entityId     String?  // 所属公司
  entity       Entity?  @relation(fields: [entityId], references: [id])
  status       String   @default("active")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  contactRoles ContactProjectRole[]
  saleOrders  SaleOrder[]
  receivables AccountReceivable[]
}
```

### 3.5 ContactProjectRole 模型（项目角色）

```prisma
model ContactProjectRole {
  id         String   @id @default(cuid())
  contactId  String
  contact    Contact  @relation(fields: [contactId], references: [id], onDelete: Cascade)
  projectId  String
  project    BizProject @relation(fields: [projectId], references: [id], onDelete: Cascade)

  // role 枚举: projectOwner(负责人)/paymentContact(付款联系人)/construction(施工)/other
  role      String
  isDefault Boolean  @default(false)  // 默认催款人
  remark    String?
  createdAt DateTime @default(now())

  @@unique([contactId, projectId, role])
}
```

### 3.6 AccountReceivable 模型（支持三维度统计）

```prisma
model AccountReceivable {
  id           String    @id @default(cuid())
  contactId   String    // 找谁催
  contact      Contact   @relation(fields: [contactId], references: [id], onDelete: Cascade)

  projectId    String?   // 属于哪个项目
  project      BizProject? @relation(fields: [projectId], references: [id], onDelete: SetNull)

  entityId    String?   // 属于哪个公司（便于按公司统计）
  entity       Entity?   @relation(fields: [entityId], references: [id], onDelete: SetNull)

  originalAmount Float
  paidAmount    Float     @default(0)
  remainingAmount Float
  agreedPaymentDate DateTime?
  isOverdue    Boolean   @default(false)
  overdueDays  Int       @default(0)
  status       String    @default("pending")
  settlementDate DateTime?
  remark       String?
  collectionRecords CollectionRecord[]
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}
```

### 3.7 SaleOrder 模型（增加操作员+配送费）

```prisma
model SaleOrder {
  id               String   @id @default(cuid())
  invoiceNo        String?
  writtenInvoiceNo String?
  saleDate         DateTime @default(now())

  operatorName     String?  // "金先生" 或 "毛女士"（记忆辅助）

  buyerId          String
  buyer            Contact  @relation("BuyerContact", fields: [buyerId], references: [id])
  payerId          String?
  payer            Contact? @relation("PayerContact", fields: [payerId], references: [id])
  introducerId     String?
  introducer       Contact? @relation("IntroducerContact", fields: [introducerId], references: [id])
  pickerName       String?
  pickerPhone      String?
  projectId        String?
  project          BizProject? @relation(fields: [projectId], references: [id])

  // 商品金额
  totalAmount      Float   // 商品总价

  // 配送相关
  deliveryFee      Float   @default(0)  // 配送费（可修改或清零）
  deliveryAddress  String?              // 配送地址
  needDelivery    Boolean @default(false) // 是否需要配送

  // 金额结算
  receivableAmount Float   // 应收总额 = totalAmount + deliveryFee
  paidAmount       Float   @default(0)  // 已收金额
  writeOffAmount   Float   @default(0)  // 核销金额
  status           String  @default("completed")
  remark          String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  items     OrderItem[]
  payments  OrderPayment[]
  receivables Receivable[]
  photos    SaleOrderPhoto[]
}
```

### 3.8 Purchase 模型（供应商改为Contact）

```prisma
model Purchase {
  id           String    @id @default(cuid())
  productId   String
  product      Product   @relation(fields: [productId], references: [id], onDelete: Cascade)
  quantity     Int
  unitPrice    Float
  totalAmount  Float
  supplierId   String?   // 改为Supplier
  supplier     Supplier? @relation(fields: [supplierId], references: [id], onDelete: SetNull)
  supplierName String?   // 保留字符串（兼容旧数据）
  purchaseDate DateTime  @default(now())
  remark       String?
  batchNo      String?
  photos       PurchasePhoto[]
  createdAt    DateTime  @default(now())
}
```

### 3.9 Rebate 模型（plumberId改为Contact）

```prisma
model Rebate {
  id           String    @id @default(cuid())
  saleId       String
  sale         SaleOrder @relation(fields: [saleId], references: [id], onDelete: Cascade)
  plumberId    String?   // 改为Contact（水电工）
  plumber      Contact?  @relation("RebatePlumber", fields: [plumberId], references: [id], onDelete: SetNull)
  supplierName String
  rebateAmount Float
  rebateType   String    @default("cash")
  rebateRate   Float     @default(0)
  recordedAt   DateTime  @default(now())
  remark       String?
  isHidden     Boolean   @default(false)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}
```

### 3.10 待废弃模型（保留历史数据）

以下模型在迁移后不再新增数据，但保留历史记录：
- `Customer` - 迁移到 Contact
- `Sale` - 旧架构销售单
- `CustomerCategory`
- `CustomerPhone`
- `CustomerFavoriteProduct`

---

## 四、contactType 枚举值

| 值 | 名称 | 说明 |
|----|------|------|
| `customer` | 散客/业主 | 普通购买客户 |
| `plumber` | 水电工 | 有返点的介绍人 |
| `company` | 装修公司 | 装修公司员工/负责人 |
| `other` | 其他 | 其他人员 |

---

## 五、供应商模块（独立于 Contact）

### 5.1 供应商独立原因

**原设计**：供应商作为 Contact 的一种类型（contactType='supplier'）
**问题**：
- 供应商和客户是两个完全不同维度
- 供应商是"我欠他钱"，客户是"他欠我钱"
- 一个人同时是供应商和客户的情况极少
- 独立模块更清晰，方便扩展（如供应商联系人管理）

**新设计**：Supplier 独立模块，可关联 Contact（作为负责人）

### 5.2 Supplier 模型设计

```prisma
model Supplier {
  id           String   @id @default(cuid())
  code        String   @unique  // 内部编号：G001（G代表供应商）
  name         String                   // 供应商公司名称
  contactId   String?  // 关联的联系人（负责人）
  contact     Contact? @relation(fields: [contactId], references: [id], onDelete: SetNull)
  phone       String?                   // 联系电话
  address     String?                   // 地址
  remark      String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  purchases   Purchase[]  // 进货记录
}
```

**字段说明**：
| 字段 | 说明 |
|-----|------|
| code | 供应商编号，如 G001 |
| name | 供应商公司名称 |
| contactId | 可选关联联系人（负责人/业务员） |
| phone | 联系电话（冗余存储，方便查看） |

### 5.3 供应商列表页面设计

```
供应商管理页面：
├── 搜索框（按名称/电话搜索）
├── 新增供应商按钮
├── 供应商列表
│   ├── 编号 | 名称 | 联系人 | 电话 | 操作
│   ├── G001 | 某管道批发 | 张三 | 138xxxx | 编辑/删除
│   └── G002 | 某五金工具 | 李四 | 139xxxx | 编辑/删除
└── 点击行查看详情/进货历史

新增/编辑供应商 Dialog：
├── 供应商名称: [输入]
├── 联系人: [选择联系人，可选]
├── 联系电话: [输入]
├── 地址: [输入]
└── 备注: [输入]
```

### 5.4 进货单关联供应商

```prisma
model Purchase {
  id           String    @id @default(cuid())
  productId   String
  product      Product   @relation(fields: [productId], references: [id], onDelete: Cascade)
  quantity     Int
  unitPrice    Float
  totalAmount  Float
  supplierId   String    // 改为Supplier（供应商）
  supplier     Supplier  @relation(fields: [supplierId], references: [id], onDelete: SetNull)
  supplierName String?   // 保留字符串（兼容旧数据）
  purchaseDate DateTime  @default(now())
  remark       String?
  batchNo      String?
  photos       PurchasePhoto[]
  createdAt    DateTime  @default(now())
}
```

### 5.5 进货退货需求（Placeholder）

**业务场景**：
```
向供应商进了10盘电线
↓
发现质量问题，退了2盘
↓
进货退货单：数量 -2盘
↓
库存减少2盘
↓
应付款减少
```

**待细化**：
- 退货流程与销售退货类似
- 需关联原进货单
- 金额计算基于原进货单价
- 影响库存和应付款

**后续细化内容**：
- 退货审批流程（是否需要）
- 退货原因记录
- 与供应商的往来对账

---

## 六、评分系统设计

### 5.1 评分核心原则

**评分 = 能带来多少净利润**

```
净利润 = 销售收入 - 成本 - 返点支出
```

**返点不是优点，返点是成本！**

### 5.2 评分维度

| 维度 | 指标 | 说明 |
|-----|------|------|
| **销售贡献** | 一年销售额、总利润 | 核心指标 |
| **付款信用** | 平均付款天数、逾期率 | 是否及时付款 |
| **介绍贡献** | 介绍了多少单生意 | 不算返点金额 |
| **交易频次** | 交易次数、涉及品类数 | 活跃度 |

### 5.3 评分展示（点击分数时显示详情）

```
王二狗 - 综合评分: 85分

┌─────────────────────────────────────────┐
│ 销售贡献          ████████████░░  75分  │
│   年销售额: ¥120,000                    │
│   年利润: ¥36,000                       │
│                                         │
│ 付款信用          ██████████████  90分  │
│   平均付款: 15天                         │
│   逾期次数: 0次                          │
│                                         │
│ 介绍贡献          █████████░░░░░  60分  │
│   介绍单数: 5单                          │
│   返点支出: ¥1,200（已计入成本）          │
│                                         │
│ 交易频次          ████████████░░  80分  │
│   交易次数: 12次                         │
│   涉及品类: 8种                          │
└─────────────────────────────────────────┘
```

### 5.4 返点处理

**方案**：返点金额计入成本，降低综合评分

```
返点支出: ¥1,200 → 计入成本
实际净利润 = ¥36,000 - ¥1,200 = ¥34,800
```

### 5.5 评分计算（实时）

评分基于所有涉及该 Contact 的 SaleOrder **实时计算**，不存储固定值

---

## 六、商品多品牌+多规格管理

### 6.1 业务场景

```
商品: 开关插座
├── 品牌: 公牛
│   ├── 规格: 10A  - ¥15/个
│   └── 规格: 16A  - ¥18/个
├── 品牌: 正泰
│   ├── 规格: 10A  - ¥12/个
│   └── 规格: 16A  - ¥14/个
└── 品牌: 得力
    ├── 规格: 10A  - ¥10/个
    └── 规格: 16A  - ¥12/个
```

### 6.2 品牌显示的地方

品牌应贯穿所有涉及商品的地方：

| 模块 | 品牌显示场景 |
|-----|------------|
| **商品档案** | 添加商品时选择品牌、规格 |
| **进货管理** | 选择商品/规格时显示品牌 |
| **销售管理** | 选择商品/规格时显示品牌 |
| **项目管理** | 查看项目商品清单时显示品牌 |
| **库存查询** | 查看库存时显示品牌 |

### 6.3 Schema 设计

```prisma
model Brand {
  id    String @id @default(cuid())
  name  String @unique  // "公牛"、"正泰"、"得力"

  specs ProductSpec[]
}

model ProductSpec {
  id         String   @id @default(cuid())
  productId  String   // 关联商品
  product    Product  @relation(...)
  brandId    String   // 关联品牌
  brand      Brand   @relation(...)

  name       String   // 规格: "10A"、"16A"、"20mm"

  unit       String   // 单位

  // 价格
  salePrice  Float

  // 多单位
  purchaseUnit String?
  purchaseRatio Float?

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@unique([productId, brandId, name])  // 同一商品同品牌同规格唯一
}
```

### 6.4 开单流程

```
1. 选择客户
2. 选择商品 → 显示品牌列表
3. 选择品牌 → 显示该品牌规格列表
4. 选择规格 → 自动填入该品牌+规格的价格
5. 填写数量 → 计算金额
```

---

## 七、商品多单位管理

### 7.1 业务场景

| 商品 | 进货单位 | 进货换算 | 销售单位 | 说明 |
|-----|---------|---------|---------|------|
| 电线 | 盘 | 1盘=100米 | 米 | 整盘进，零卖 |
| PPR管 | 根 | 1根=4米 | 米 | 整根进，按米卖 |
| 螺丝 | 盒 | 1盒=100个 | 个 | 整盒进，零卖 |

### 7.2 商品档案字段扩展

```prisma
model Product {
  // 现有字段
  id           String @id @default(cuid())
  name         String
  categoryId   String
  // 删除写死的成本价和销售价
  // costPrice: Float  // 删除
  // salePrice: Float   // 删除

  // 新增字段
  purchaseUnit   String  // 进货单位：如"盘"、"根"、"吨"
  purchaseRatio  Float   // 进货换算：1进货单位=多少销售单位
  saleUnit      String  // 销售单位：如"米"、"个"

  // 动态价格参考
  lastPurchasePrice Float?  // 最近一次进货价（自动更新）
  referencePrice   Float?  // 参考销售价

  // 库存
  inventoryCount Float   @default(0)  // 按销售单位存储
}
```

### 7.3 开单逻辑

**进货时**：
```
进货数量: 10盘
自动换算: 10盘 × 100米/盘 = 1000米
库存增加: +1000米
```

**销售时**：
```
销售数量: 20米
自动换算: 20米 ÷ 100米/盘 = 0.2盘
库存扣减: 1000米 - 20米 = 980米
显示: 销售了20米
```

### 7.4 库存显示

```
商品: 电线
├── 库存: 1000米（10盘）
├── 进货单位: 盘
├── 销售单位: 米
└── 换算: 1盘=100米
```

---

## 八、价格管理体系

### 8.1 业务背景（简化版）

**核心原则**：夫妻小店定价就是协商的，没有固定规则。系统只需要：
1. 提供参考价（爸妈手动设置）
2. 记忆客户历史价格
3. 记住最近进价
4. 开单时如果成交价低于进价，给个警告

**不需要**：毛利率系数、最低售价计算、权限控制等复杂逻辑。

---

### 8.2 Product 模型字段变更

```prisma
model Product {
  // 删除写死的固定价格
  // costPrice: Float  // 删除
  // salePrice: Float // 删除

  // 新增动态价格字段
  lastPurchasePrice: Float?  // 最近一次进货价（进货单保存后自动更新）
  referencePrice: Float?      // 参考销售价（爸妈手动设置）
  // lastTransactionPrice 不需要，每次销售后自动记忆到 CustomerPrice 表即可
}
```

**字段说明**：
| 字段 | 作用 | 如何获取 |
|-----|------|---------|
| lastPurchasePrice | 最近进价 | 每次进货单保存后，自动更新为本次进货单价 |
| referencePrice | 参考售价 | 爸妈在商品管理页面手动填写，开单时自动带入 |

---

### 8.3 新增 CustomerPrice 表（客户价格记忆）

```prisma
model CustomerPrice {
  id            String   @id @default(cuid())
  customerId    String   // 关联 Contact.id（不是 Customer.id！）
  productId     String   // 关联 Product.id
  lastPrice     Float    // 该客户上次购买此商品的价格
  transactionCount Int   @default(1) // 购买次数
  updatedAt     DateTime @updatedAt

  @@unique([customerId, productId]) // 一个客户一个商品只有一条记录
}
```

**作用**：记住每个客户每个商品的购买价格，下次开单自动带入。

---

### 8.4 SaleItem 订单明细新增字段

```prisma
model SaleItem {
  // 现有字段保留
  // id, saleId, productId, quantity, unitPrice, costPriceSnapshot, sellingPriceSnapshot, subtotal

  // 新增：下单时的参考价快照（用于后续价格追溯）
  referencePriceSnapshot: Float?  // 下单时商品的参考售价
}
```

---

### 8.5 价格来源与更新规则

| 价格类型 | 说明 | 更新时机 |
|---------|------|---------|
| 最近进价 | 最近一次进货的单价 | 每次创建进货单并保存后，自动更新对应商品的 `lastPurchasePrice` |
| 参考售价 | 爸妈手动设置的价格 | 在商品管理页面手动编辑，修改后立即生效 |
| 客户历史价 | 该客户上次购买此商品的价格 | 销售单状态变为"已完成"时，自动更新 `CustomerPrice` 表 |

---

### 8.6 销售开单时价格填充逻辑

**场景**：在 SaleNew.tsx 选择客户 + 商品后

```
步骤1：确定默认销售单价
├── 如果该客户之前买过这个商品（CustomerPrice 有记录）
│   └── 默认填入：customerPrice.lastPrice（客户上次购买价）
├── 否则
│   └── 默认填入：product.referencePrice（商品参考售价）
└── 如果参考售价也没有，默认填入 0，让爸妈手动填写

步骤2：显示价格提示（悬浮在单价输入框右侧）
├── 上次：¥12/个（该客户上次成交价，有则显示）
├── 参考：¥15/个（商品参考售价，有则显示）
└── 进价：¥10/个（商品最近进价，有则显示）

步骤3：爸妈可以手动修改成交价
```

---

### 8.7 防亏本警告机制（简化版）

**场景**：爸妈把成交价改得太低，低于成本价

**实现逻辑**：
```
1. SaleItem.costPriceSnapshot 已经在销售单创建时记录了成本价快照
2. 当用户修改 unitPrice 时：
   - 计算：costPriceSnapshot × quantity
   - 如果 订单总价 < Σ(costPriceSnapshot × quantity)，则弹出警告
3. 警告内容：
   - 标题："确认亏本？"
   - 内容："成交价低于进价，当前订单预计亏损 ¥XX"
   - 按钮："确认" / "取消"
4. 警告不阻止提交，只起提醒作用（夫妻小店可能愿意做亏本生意拉客户）
```

**注意**：与第十四章 14.1 应付金额编辑 中的亏本警告逻辑**相同**，使用同一个警告组件。

---

### 8.8 进货开单时价格逻辑

```
选择商品后：
├── 最近一次进货价：¥150/盘（显示参考）
├── 本次进货单价：[填写 ¥160]
└── 保存后：
    └── 自动更新 Product.lastPurchasePrice = ¥160
```

---

### 8.9 销售完成后价格记忆

**触发时机**：销售单状态变为"已完成"

```
自动执行：
1. 遍历该销售单的所有 OrderItem
2. 对每个 (customerId, productId, unitPrice) 组合：
   - 如果 CustomerPrice 已存在 → 更新 lastPrice + transactionCount+1
   - 如果不存在 → 创建新记录
3. 注意：customerId 来自 Sale.customerId（购货人）
```

---

### 8.10 商品管理页面价格展示

**Products.tsx 列表页显示**：
| 列名 | 数据来源 |
|-----|---------|
| 最近进价 | product.lastPurchasePrice |
| 参考售价 | product.referencePrice |
| 库存 | product.stock |

**ProductEdit.tsx 编辑页**：
- 可以手动修改 referencePrice
- lastPurchasePrice 只读（由进货单自动更新）

---

### 8.11 待确认问题（已确认）

**已在第十四章 14.1 确定**：
- Sale 表新增 `costTotal` 字段（成本总价快照）
- 销售单创建时计算并存储
- 亏本警告时使用此字段判断

---

### 8.12 整单议价功能（可选，作为15.1应付金额编辑的补充）

**场景**：爸妈和客户谈好了最终总价，但不想一个个改商品单价

**功能**：
1. 在销售单底部增加"整单议价"按钮
2. 点击后弹出对话框，输入"最终整单总价"
3. 系统自动按比例反算每个商品的单价：
   ```
   原总价 = Σ(单价 × 数量)
   折扣比例 = 最终总价 / 原总价
   新单价 = 原单价 × 折扣比例（保留2位小数）
   ```
4. 反算完成后，自动更新所有商品行的单价
5. 爸妈也可以手动再调整个别商品单价

**注意**：此功能与15.1应付金额直接编辑功能**二选一实现**，或者作为补充。先实现15.1的应付金额直接编辑，此功能可后续迭代。

---

## 九、销售退货管理

### 9.1 业务场景

```
原销售：
├── 电线
│   ├── 销售数量: 10盘
│   ├── 销售单价: ¥200/盘
│   └── 小计: ¥2000
└── 项目: 某业主

退货时（客户退了20米）：
→ 退货数量: 20米（按销售单位）
→ 销售单价: ¥2/米（从原销售单获取，不是当前售价！）
→ 金额: 20米 × ¥2/米 = ¥40
→ 库存: +20米（自动换算成进货单位存储）
→ 欠款: -¥40（从欠款中扣除）
```

### 9.2 退货原则

**退货必须关联原销售单**，因为：
- 才知道当初买了什么、多少、多少钱
- 才能获取**销售时的单价**（不是当前售价！）
- 退货不能超过原购买数量
- 金额计算清晰
- 归属项目明确（通过原销售单的项目）

**退货单位**：按销售单位填写（如20米），系统自动换算

### 9.3 退货流程

```
1. 打开原销售单
2. 点击"退货"
3. 选择要退的商品
4. 填写退货数量（按销售单位：如20米）
5. 系统自动：
   - 获取原销售时的单价（不是当前售价！）
   - 计算退货金额 = 退货数量 × 原单价
   - 库存增加（自动单位换算：20米 ÷ 100 = 0.2盘）
   - 欠款减少（或退款）
6. 生成退货记录
```

### 9.4 退货单 Schema

```prisma
model SaleReturn {
  id           String   @id @default(cuid())
  saleOrderId  String   // 关联原销售单
  saleOrder    SaleOrder @relation(...)
  returnDate   DateTime @default(now())
  items        SaleReturnItem[]
  totalAmount  Float   // 退货总金额
  remark       String?
  createdAt    DateTime @default(now())
}

model SaleReturnItem {
  id            String   @id @default(cuid())
  saleReturnId  String
  saleReturn    SaleReturn @relation(...)

  productId     String
  product       Product @relation(...)

  // 退货数量（按销售单位）
  returnQuantity Float  // 20米
  // 销售时的单价（从原销售单复制，不是当前售价！）
  unitPrice     Float  // ¥2/米
  // 小计
  amount        Float  // ¥40

  createdAt    DateTime @default(now())
}
```

### 9.5 退货影响

| 影响项 | 说明 |
|-------|------|
| 库存 | 增加退货数量（自动单位换算：20米 ÷ 100 = 0.2盘） |
| 欠款 | 从欠款中扣除（如果未付清） |
| 应收 | 减少应收金额（如果已付款需要退款） |
| 项目 | 关联到原销售单的项目 |

---

## 十、销售单状态管理

### 10.1 销售单状态

| 状态 | 说明 | 可否编辑 | 可否作废/删除 |
|-----|------|---------|--------------|
| draft（草稿） | 暂存 | ✅ 可编辑 | ✅ 可删除 |
| pending（待确认） | 待确认 | ✅ 可编辑 | ✅ 可作废 |
| completed（已完成） | 已完成 | ❌ 不可编辑 | ❌ 只能退货 |
| cancelled（已作废） | 已作废 | ❌ 不可编辑 | ❌ 不可操作 |

### 10.2 暂存功能

**场景**：
```
客户选了一半商品
↓
有急事要走
↓
点"暂存"
↓
下次来 → 找到暂存的单 → 继续编辑
```

**实现**：
- 开单页面有"暂存"按钮
- 暂存后 status = "draft"
- 可在销售管理里找到草稿单
- 点击"继续编辑"

### 10.3 作废功能

**场景**：
```
单据开错了
↓
点击"作废"
↓
填写作废原因
↓
确认作废
↓
生成作废记录，金额不计入统计
```

**已完成单据的修改**：
- 不能直接编辑
- 只能退货（退多余的货）
- 或重新开一张正确的单

---

## 十一、进货价格历史 + 缺货处理

### 11.1 进货价格历史记录

#### 11.1.1 业务场景
- 爸妈想知道上次在某个供应商那里进货是什么价格
- 方便对比不同供应商的价格

#### 11.1.2 技术方案
**商品详情页增加"进货历史"标签页**

```
商品详情页：
├── 基本信息
├── 价格设置
├── 库存信息
└── 进货历史（新增标签页）

进货历史表格：
| 日期 | 供应商 | 单价 | 数量 | 小计 |
|------|--------|------|------|------|
| 2026-01-15 | 某管道批发 | ¥150/盘 | 10盘 | ¥1500 |
| 2026-02-20 | 某管道批发 | ¥155/盘 | 8盘 | ¥1240 |

价格趋势图：
└── 折线图：X轴日期，Y轴单价
    └── 每条线代表一个供应商
```

**Schema 变更**：
- Purchase.supplierId 已关联 Contact（供应商）
- Purchase.unitPrice 已记录每次进货单价
- 查询时按 productId + supplierId 分组展示

#### 11.1.3 验证清单
- [ ] 商品详情页有"进货历史"标签页
- [ ] 显示日期、供应商、单价、数量、小计
- [ ] 有折线图显示价格趋势

---

### 11.2 缺货商品批量生成进货单

#### 11.2.1 业务场景
- 库存预警显示多个商品缺货
- 不想一个个录进货单
- 勾选缺货商品，一键生成进货单

#### 11.2.2 技术方案
**在库存预警页面增加"生成进货单"按钮**

```
库存预警页面（Inventory.tsx）：
├── 商品列表（库存低于预警线的商品）
│   └── 每行有勾选框
├── 勾选多个商品
├── 点击"生成进货单"按钮
└── 弹出 Dialog

生成进货单 Dialog：
├── 勾选的商品列表（表格）
│   ├── 商品名称
│   ├── 供应商（下拉选择，每个商品单独选）
│   ├── 进货数量（输入框）
│   └── 单价（自动带入最近一次进货价，可修改）
├── 所有商品选择同一个供应商（批量填充）
└── 确认生成

生成逻辑：
1. 创建一个进货单草稿（status='draft'）
2. 每个勾选的商品作为一条 PurchaseItem
3. 跳转到进货单编辑页面继续完善
```

**供应商来源**：
- 独立的 Supplier 模块
- Dialog 中下拉选择，每个商品可单独选择供应商

#### 11.2.3 验证清单
- [ ] 库存预警页面有"生成进货单"按钮
- [ ] 可勾选多个商品
- [ ] 每个商品可单独选择供应商
- [ ] 点击生成后跳转到进货单编辑页面
- [ ] 进货单包含所有勾选的商品

---

### 11.3 操作日志功能

#### 11.3.1 业务场景
- 记录所有重要操作（增删改）
- 操作可追溯：谁、什么时候、做了什么
- 方便排查问题：比如销售单被误删，可以查到是谁删的

#### 11.3.2 已有模型
```prisma
model AuditLog {
  id         String   @id @default(cuid())
  actionType String   // 操作类型：create/update/delete
  entityType String   // 实体类型：sale/customer/product
  entityId   String   // 实体ID
  oldValue   String?  // 修改前的值
  newValue   String?  // 修改后的值
  operatorId String?  // 操作人ID
  ipAddress  String?
  timestamp  DateTime @default(now())
}
```

#### 11.3.3 需要记录的操作

**必须记录**：
| 操作 | 内容 |
|------|------|
| 删除销售单 | 销售单编号、操作人、时间 |
| 修改销售单 | 销售单编号、修改内容、操作人、时间 |
| 删除客户 | 客户名称、操作人、时间 |
| 删除商品 | 商品名称、操作人、时间 |
| 坏账处理 | 客户名称、减免金额、操作人、时间 |

**自动记录**：
- 所有 delete 操作
- 涉及金额/债务修改的操作

**可选记录**（降低噪音）：
- 创建操作（价值较低）
- 查询操作（价值低）

#### 11.3.4 页面设计

**操作日志页面**（新增）：
```
操作日志页面：
├── 筛选条件
│   ├── 操作类型（创建/修改/删除）
│   ├── 实体类型（销售单/客户/商品）
│   ├── 操作人
│   └── 时间范围
│
└── 日志列表
    ├── 时间、操作人、动作、实体描述
    └── 如：2026-04-18 14:30 金先生 删除了销售单 #S20260418001
```

**验证清单**：
- [ ] 删除销售单时有日志记录
- [ ] 日志包含：时间、操作人、操作内容、实体信息
- [ ] 可按操作类型、实体类型、操作人筛选
- [ ] 日志不可删除（只增）

---

## 十二、前端改造清单

### 12.0 Dashboard.tsx（首页）

#### 12.0.1 数据备份与恢复功能

**功能概述**：
- 一键备份：首页点击按钮，生成ZIP包备份到U盘
- 一键恢复：软件重装后，从备份ZIP恢复数据

**一键备份**：
- 首页增加"数据备份"按钮（突出显示）
- 点击弹出系统文件夹选择框，用户选择保存位置（U盘等）
- 自动生成文件名：`折柳建材_备份_YYYY-MM-DD_HH-mm.zip`
- 备份内容（ZIP包）：
  - `prisma/dev.db`（数据库文件）
  - `photos/`（照片文件夹）
- **按钮下方提示**："备份期间请勿进行其他操作"
- 提示"备份成功"或"备份失败"

**一键恢复**：
- 系统设置页面增加"数据恢复"按钮
- **按钮下方提示**："恢复期间请勿进行其他操作，恢复后需重启应用"
- 点击弹出文件选择框，选择之前备份的ZIP文件
- 恢复流程：
  ```
  1. 检查数据库是否被占用（如正在运行）
  2. 关闭数据库连接
  3. 解压ZIP到临时目录
  4. 备份当前数据（以防万一）
  5. 替换数据库文件和photos文件夹
  6. 提示"恢复成功，请重启应用"
  7. 自动重启或提示手动重启
  ```

**使用场景**：
```
场景：软件打包给父母使用后，电脑坏了

1. 重新安装软件（折柳建材.exe）
2. 首次运行，引导设置
3. 点击"数据恢复"
4. 选择U盘中的备份文件（折柳建材_备份_2026-04-18.zip）
5. 自动恢复数据库和照片
6. 正常开始使用，所有数据完整保留
```

**备份文件格式**：
```
折柳建材_备份_2026-04-18_14-30.zip
├── dev.db          # SQLite数据库
└── photos/         # 照片文件夹
    ├── sale_xxx.jpg
    └── purchase_xxx.jpg
```

**技术方案**：

**1. 使用库**：
- `archiver` + `extract-zip`：创建和解压ZIP
- 或直接用Node.js内置的zlib（无需额外安装）

**2. Electron IPC通信**：
```javascript
// electron/main.js 注册handler
ipcMain.handle('backup-database', async (event, targetPath) => {
  // 1. 关闭SQLite连接
  await closeDbConnection();

  // 2. 创建ZIP
  const zip = archiver('zip');
  zip.file('prisma/dev.db', { name: 'dev.db' });
  zip.directory('photos/', 'photos');
  await zip.writeZip(targetPath);

  return { success: true };
});

ipcMain.handle('restore-database', async (event, zipPath) => {
  // 1. 关闭SQLite连接
  await closeDbConnection();

  // 2. 解压到临时目录
  await extract(zipPath, { dir: 'temp_restore' });

  // 3. 备份当前数据
  await copy('prisma/dev.db', `backup_${Date.now()}.db`);

  // 4. 替换文件
  await copy('temp_restore/dev.db', 'prisma/dev.db');
  await copy('temp_restore/photos', 'photos');

  // 5. 清理临时目录
  await remove('temp_restore');

  return { success: true, needRestart: true };
});
```

**3. 前端调用**：
```typescript
// 备份
const handleBackup = async () => {
  const { filePath } = await dialog.showSaveDialog({
    defaultPath: `折柳建材_备份_${dayjs().format('YYYY-MM-DD_HH-mm')}.zip`
  });
  if (filePath) {
    await window.electronAPI.backupDatabase(filePath);
    toast('备份成功！', 'success');
  }
};

// 恢复
const handleRestore = async () => {
  const { filePaths } = await dialog.showOpenDialog({
    filters: [{ name: 'ZIP', extensions: ['zip'] }]
  });
  if (filePaths[0]) {
    const result = await window.electronAPI.restoreDatabase(filePaths[0]);
    if (result.needRestart) {
      toast('恢复成功，即将重启...', 'success');
      // 自动重启应用
    }
  }
};
```

**4. 数据库锁定问题**：
- SQLite在Windows上文件锁定：`prisma/dev.db`被连接时无法覆盖
- 解决方案：Prisma连接使用`connection_limit=1`，恢复前执行`db.$disconnect()`

**5. 注意事项**：
- 备份/恢复期间禁止操作数据库
- 恢复前自动备份当前数据（防误操作）
- ZIP内不要压缩太狠，影响速度

**验证清单**：
- [ ] 备份生成ZIP包包含数据库和照片
- [ ] 备份文件名格式正确
- [ ] 恢复时能正确解压并覆盖数据
- [ ] 恢复后所有数据（客户、商品、销售记录、照片）完整
- [ ] 恢复后应用能正常启动

#### 12.0.2 照片存储路径修复

**问题描述**：
- photoUtils.ts使用 `process.cwd()` 获取路径
- 打包成Electron应用后，路径会变化
- 导致照片不知道存在哪去了

**当前代码问题**（photoUtils.ts 第32行）：
```javascript
const uploadDir = path.join(process.cwd(), PHOTO_UPLOAD_DIR);
```

**修复方案**：
- 使用固定相对路径：`./photos`
- photos文件夹放在项目根目录下
- 数据库文件在 `prisma/dev.db`
- 两者在同一项目目录下，备份时一起打包

**修复后结构**：
```
折柳建材/
├── prisma/
│   └── dev.db          # 数据库文件
├── photos/              # 照片文件夹（新建）
│   ├── sale_xxx.jpg    # 销售单照片
│   └── purchase_xxx.jpg # 进货单照片
├── src/
├── package.json
└── ...
```

**验证清单**：
- [ ] 照片保存在项目目录下的photos文件夹
- [ ] 备份时photos文件夹一起打包
- [ ] 恢复备份后照片能正常显示

### 12.1 Contacts.tsx

- 添加 contactType 筛选（下拉选择）
- 添加/编辑联系人时选择类型
- 列表显示 contactType 标签
- 添加联系人代码（code）显示

### 12.2 SaleNew.tsx

- 添加操作员选择（金先生/毛女士 写死二选一）
- Contact 选择器显示 contactType
- 添加配送费按钮（可添加/修改/清零）
- 勾选"需要配送" → 填写配送地址
- 应收总额自动计算 = 商品总价 + 配送费

### 12.2.1 付款主体选择优化

**问题描述**：
- 当前付款主体只能选Entity里添加的，联系人不能用
- 需要同时支持Entity和Contact作为付款主体

**优化方案**：
- 付款主体下拉框分开两个：
  - Entity（公司/主体）下拉框：支持输入搜索匹配
  - Contact（个人）下拉框：支持输入搜索匹配
- 两个框都支持模糊匹配搜索

### 12.2.2 新增销售页面项目选择

**问题描述**：
- 新增销售页面有"结账主体与项目"模块
- 付款主体可以选，但项目选不了
- 需要支持选择/关联项目

**优化方案**：
- 项目选择器：支持搜索、选择项目
- 项目可关联Entity（所属主体）
- 不选项目时，销售单也可以正常创建

### 12.2.3 销售单照片显示Bug修复

**问题描述**：
- Sales.tsx 销售记录详情弹窗中，照片显示条件写死为 `source === 'legacy'`
- 导致新销售单的照片无法显示
- 进货管理的照片显示正常（有照片就显示）

**当前代码问题**（Sales.tsx 第789行）：
```tsx
// 错误：只显示legacy来源的照片
{selectedSale.source === 'legacy' && selectedSale.photos && ...}

// 进货管理是正确的写法：
{selectedPurchase.photos && selectedPurchase.photos.length > 0 && ...}
```

**修复方案**：
```tsx
// 改为和进货管理一致的判断逻辑
{selectedSale.photos && selectedSale.photos.length > 0 && (
  // 照片显示逻辑
)}
```

**验证清单**：
- [ ] 新销售单添加照片后，在销售记录详情能看到
- [ ] 照片点击能正常放大查看
- [ ] 进货单照片显示不受影响

### 12.3 Rebates.tsx

- 水电工选择器改为 Contact
- 筛选 contactType = 'plumber'

### 12.4 Purchases.tsx

- 供应商选择改为 Supplier
- 添加送货人字段（可选）
- **批量添加商品优化**：支持一次添加多种商品

### 12.5 欠款统计（改名自Statements.tsx）

**模块改名**：Statements.tsx → 欠款统计

**页面结构（Tab切换）**：
```
欠款统计页面：
├── Tab1：我应收（别人欠我）
│   ├── 按联系人汇总
│   ├── 按公司汇总（Entity）
│   └── 按项目汇总
│
└── Tab2：我应付（我欠供应商）
    └── 按供应商汇总
```

**Tab1：我应收**
- 按 Contact 显示：联系人、累计欠款、涉及项目数
- 按 Entity 显示：公司名称、负责人、累计欠款、项目数
- 按 Project 显示：项目名称/地址、负责人、累计欠款

**Tab2：我应付（新增）**
- 按供应商（Supplier）汇总
- 显示：供应商名称、应付总额、已还金额、剩余欠款
- 点击供应商查看应付明细

**Entity保留**：Entity是"结账主体"，用于统计"这笔账挂在谁名下"，可以是个人、公司或政府单位。

### 12.6 Projects.tsx

- 显示项目的联系人角色（负责人、付款联系人）
- 添加/编辑项目时选择联系人角色
- 项目可关联 Entity（所属公司）

### 12.7 Entities.tsx（公司管理）

- 保留 Entity（公司/组织）管理页面
- 查看公司下的联系人角色
- 查看公司累计欠款

### 12.8 配送管理模块（简化）

- 销售单勾选"需要配送"后自动生成配送任务
- 配送管理只显示待执行/执行中的配送任务
- 配送完成后标记完成

### 12.9 挂账结算模块（具体还款操作）

**定位**：欠款统计是汇总页面，挂账结算是具体还款操作页面

**功能**：
1. 查看某个具体客户/公司的欠款明细和还款记录
2. 记录还款操作
3. 坏账处理

**页面操作**：
```
客户：张三
├── 欠款总金额: ¥50,000
├── 已还金额:  ¥30,000
├── 剩余欠款:  ¥20,000
│
还款记录:
├── 2026-01-15 ¥10,000 转账
├── 2026-02-20 ¥20,000 现金
└── ...

新增还款:
├── 还款金额: [输入]
├── 还款时间: [自动填今天]
├── 支付方式: [现金/转账/微信/支付宝]
└── 备注: [可选]

坏账处理按钮:（点击弹出 Dialog，输入最终实收金额+原因）
```

**注意**：坏账处理在14.2章节定义

### 12.10 采购管理（Purchases.tsx）

- 供应商选择 Supplier
- 进货时记录：商品、数量、单价、应付金额
- 是否付款：勾选已付/未付

### 12.11 供应商应付账款

**说明**：此功能已整合到12.5欠款统计的Tab2"我应付"中，在那里统一按供应商汇总显示"我欠供应商多少钱"。

**本章节保留供应商应付账款的还款操作**：
- 还款金额
- 还款时间（自动填今天）
- 支付方式（现金/转账/微信/支付宝）
- 备注

---

## 十三、执行步骤

### 第一阶段：Schema 修改

1. 修改 prisma/schema.prisma
2. Contact 添加 code 和 contactType
3. SaleOrder 添加 operatorName + deliveryFee + needDelivery + deliveryAddress
4. AccountReceivable 添加 entityId
5. Brand 模型（品牌管理）
6. ProductSpec 添加 brandId（多品牌支持）
7. Product 删除 costPrice/salePrice，添加 lastPurchasePrice/referencePrice（动态价格）
8. Product 添加 purchaseUnit + purchaseRatio + saleUnit（多单位支持）
9. SaleReturn + SaleReturnItem（退货管理）
10. 执行 `npx prisma validate`
11. 执行 `npx prisma generate`
12. 执行 `npx prisma migrate dev --name enhance_contact_architecture`

### 第二阶段：数据迁移

1. Customer → Contact（添加 contactType）
2. Purchase.supplierName → supplierId 匹配到 Supplier（新建Supplier或匹配）
3. Rebate.plumberId 迁移到 Contact
4. 补充 Entity 和 BizProject 关联

### 第三阶段：前端改造

1. Contacts.tsx - 添加类型筛选、代码显示
2. SaleNew.tsx - 添加操作员选择 + 配送费 + 配送信息
3. Rebates.tsx - Contact 选择器
4. Purchases.tsx - Contact 选择器 + 批量添加优化
5. Statements.tsx - 三维度统计
6. Projects.tsx - 项目关联公司
7. Entities.tsx - 公司管理
8. 配送管理模块 - 简化，自动关联
9. 删除 Customers.tsx 客户管理页面
10. 其他页面清理 Customer 引用
11. Products.tsx - 添加多规格（ProductSpec）、多单位、动态价格字段
12. SaleNew.tsx/Purchases.tsx - 开单时自动单位换算、多规格选择
13. SaleNew.tsx - 选择商品后自动加载规格列表、选择规格后自动填入价格
14. 开单时自动带出客户历史购买价
13. SaleReturn.tsx - 退货管理（关联原销售单）
14. 销售单详情页添加"退货"按钮

### 第四阶段：测试验证

1. 测试新增联系人（各种类型）
2. 测试新增销售单（选择操作员 + 配送费）
3. 测试新增采购单（选择供应商 + 送货人）
4. 测试返点记录
5. 测试欠款统计三维度显示
6. 测试评分详情显示
7. 测试商品多单位换算（进货10盘自动换算成米）
8. 测试商品多规格（PPR弯头20mm/25mm/32mm）
9. 测试销售退货（退货后库存增加、金额退还）
10. 测试自动带出客户历史购买价
11. 测试销售单暂存（草稿）
12. 测试销售单作废

---

## 十四、迁移策略

### 13.1 历史数据处理

- **Customer → Contact**: 添加 contactType（根据原 customerType 映射）
- **Purchase.supplierName → supplierId**: 新建 Supplier 并匹配，不匹配则保留字符串
- **Rebate.plumberId**: 改为关联 Contact

### 13.2 废弃计划

- Entities.tsx: 保留（公司管理页面）
- Entity 模型: 保留（用于公司维度统计）
- Customers.tsx: 删除，迁移到 Contacts.tsx
- Customer 模型: 保留历史数据

### 13.3 供应商设计（已独立为Supplier模块）

**供应商已独立为 Supplier 模块，不再是 Contact。详见第五章。**

---

## 十五、应付金额编辑 + 坏账处理

### 14.1 应付金额直接可编辑

#### 14.1.1 业务场景
- 抹零只是辅助功能，最终以店主意愿为准
- 店主和客户协商后，可能直接减免一个整数金额
- 系统应该支持直接编辑最终应付金额，而不是只能通过折扣率/抹零来调整

#### 14.1.2 技术方案
**前端 SaleNew.tsx 改造**：
1. 保留折扣率、抹零按钮（辅助功能）
2. 新增"应付金额"字段为**可编辑Input**
3. 计算逻辑：
   - `subtotal = Σ(商品单价 × 数量)`
   - `折扣后金额 = subtotal - 折扣 - 抹零`
   - `应付金额 = [可编辑，用户直接输入]`
4. 当用户编辑应付金额时，禁用折扣率/抹零控件（或记录手工调整标记）

#### 14.1.3 亏本警告逻辑
**场景**：店主把应付金额改得太低，低于成本价

**实现方案**：
1. 在数据库记录该订单的**成本总价**（订单创建时计算）
2. 当应付金额 < 成本总价 时，弹出警告：
   - 标题："确认亏本？"
   - 内容："抹零后低于成本价，当前亏损 ¥XX"
   - 按钮："确认" / "取消"
3. 警告不阻止提交，只提示（因为夫妻小店可能愿意做亏本生意拉客户）

**Schema 变更**：
```prisma
model Sale {
  // 现有字段
  totalAmount: Float    // 应付金额（可手工调整）
  costTotal: Float      // 成本总价（快照，订单创建时计算）
  // ...
}
```

#### 14.1.4 验证清单
- [ ] 应付金额可直接编辑
- [ ] 编辑应付金额后，折扣率/抹零控件需提示已禁用或忽略
- [ ] 应付金额低于成本价时弹出警告
- [ ] 警告可选择确认或取消
- [ ] 历史订单成本总价正确记录

---

### 14.2 坏账处理

#### 14.2.1 业务场景
- 老赖追不回来钱，爸妈主观觉得这笔账要不回来了
- 没有审批流程，操作员（爸妈）说了算
- 需要记录坏账，但保留历史可追溯

#### 14.2.2 场景区分
| 场景 | 说明 | 系统处理 |
|------|------|---------|
| 分批次还款 | 客户欠很多钱，答应慢慢还 | 正常还款记录 |
| 彻底坏账 | 老赖追不回来，只能同意少还 | 坏账处理 |

#### 14.2.3 技术方案
**新增模型**：
```prisma
model BadDebtWriteOff {
  id              String   @id @default(cuid())
  customerId      String   // 客户
  saleId          String?  // 关联销售单（可选）
  originalAmount  Float    // 原欠款金额
  writtenOffAmount Float  // 坏账减免金额
  finalAmount     Float    // 最终实收金额
  reason          String? // 坏账原因
  operatorNote    String? // 操作员备注
  createdAt       DateTime @default(now())
  createdBy       String   // 操作员
}
```

**还款流程改造**：
1. 在"挂账结算"页面，客户还款时新增选项：
   - 正常还款：全额还款
   - 坏账处理：输入最终实收金额 + 坏账原因
2. 点击"坏账处理"后：
   - 创建 `BadDebtWriteOff` 记录
   - 更新 `AccountReceivable` 状态为"已坏账"
   - 剩余未还金额标记为已豁免

**页面改造**：
1. 客户详情页：显示"历史坏账记录"标签页
2. 挂账结算页：
   - 还款按钮旁边新增"坏账处理"按钮
   - 点击弹出 Dialog：输入最终实收金额 + 坏账原因

#### 14.2.4 验证清单
- [ ] 挂账结算页有"坏账处理"按钮
- [ ] 坏账处理 Dialog 可输入实收金额和原因
- [ ] 坏账记录正确保存到 BadDebtWriteOff 表
- [ ] 客户详情页显示历史坏账记录
- [ ] 坏账处理后原欠款标记为已处理

---

## 十六、老数据迁移

### 15.1 迁移概述

**背景**：系统启用前，爸妈已有多年的老客户、老库存、老账单。这些数据电子化难度大，需要灵活处理。

**核心原则**：
1. 可选项 > 必填项：老数据很多信息记不清，不要强制录入
2. 已录的算数：录一半不想录了，已录入的数据保留
3. 历史隔离：老数据与新数据分开，老数据不强制参与利润统计
4. 连通不分支：老商品和老客户最终都要和现有模块连通，不搞独立分支

---

### 15.2 老商品迁移（初始库存导入）

#### 15.2.1 业务场景
- 刚启用系统，需要把仓库里现有的货都录进去
- 商品多、批量录入
- 可能不知道进价（老货记不清了）
- 不需要供应商信息

#### 15.2.2 技术方案
**新增功能：在商品管理页面增加"导入初始库存"按钮**

```
商品管理页面（Products.tsx）：
├── 批量导入按钮 → 导入初始库存
├── 批量设置参考售价
└── 正常商品列表

导入初始库存 Dialog：
├── 方式1：逐个录入
│   └── 商品选择/新建 + 数量 + 参考售价（进价可选）
│
└── 方式2：批量导入
    └── Excel模板下载
    └── 填好后上传
    └── 字段：商品名称、品牌、规格、数量、参考售价（进价可选）
```

**导入逻辑**：
1. 如果商品已存在 → 累加库存数量
2. 如果商品不存在 → 先创建商品档案，再设置初始库存
3. 进价：可选填，留空则后续用进货单补充
4. 参考售价：可选填，后续开单自动带入

#### 15.2.3 老库存成本处理
**三种处理方式**：
| 情况 | 进价设置 | 利润显示 |
|------|---------|---------|
| 记得大概进价 | 爸妈估算一个填入 | 正常计算利润 |
| 完全不记得进价 | 填0或留空 | 利润显示0 |
| 不想算了 | 只记数量 | 不参与利润统计 |

**说明**：进价填0/留空不影响销售，只是利润显示为0。后续进货后，新批次自动用新进价。

#### 15.2.4 验证清单
- [ ] 商品管理页面有"导入初始库存"按钮
- [ ] 支持逐个录入（商品+数量+售价）
- [ ] 支持批量Excel导入
- [ ] 导入时商品已存在则累加库存
- [ ] 商品不存在则自动创建
- [ ] 进价可选，不强制

---

### 15.3 老欠款迁移

#### 15.3.1 业务场景
- 老客户纸质账单电子化
- 账单完整度不一：有的知道项目明细，有的只记得总账
- 工作量大，爸妈可能做一半不想做

#### 15.3.2 迁移方式
**方式A：按项目逐单录入（详细信息）**
```
客户：XXX
├── 项目A
│   ├── 账单1：日期2023-01-01，金额5000，已付2000，未付3000
│   └── 账单2：日期2023-03-15，金额3000，已付3000，已结清
└── 项目B
    └── 账单3：日期2024-06-01，金额8000，已付0，未付8000
```

**方式B：只记总账（简化信息）**
```
客户：XXX
├── 总欠款：¥15000
├── 已付：¥5000
└── 未付：¥10000
```

#### 15.3.3 技术方案
**新增功能：历史账单迁移页面**

```
历史账单迁移页面（独立功能，可从联系人详情进入）：
├── 客户选择（关联已有联系人或新建）
├── 账单列表
│   ├── 日期（可选）
│   ├── 项目（可选）
│   ├── 总金额（必填）
│   ├── 已付（可选）
│   ├── 未付（自动计算）
│   └── 状态（正常/坏账）
├── 新增按钮
└── 批量导入
```

**录入规则**：
| 字段 | 新建账单 | 老历史迁移 |
|-----|---------|-----------|
| 客户 | 必填 | 必填 |
| 日期 | 必填 | 可选 |
| 项目 | 必填 | 可选 |
| 商品明细 | 必填 | 可选 |
| 总金额 | 必填 | 必填 |
| 已付/未付 | 自动计算 | 可选 |
| 进价 | 必填 | 可选 |

**容错机制**：
- 页面关闭后已录入数据保留
- 爸妈可以随时回来继续录入
- 不想录了，剩余的只记"谁欠多少总账"

#### 15.3.4 老欠款与新欠款的区别
| 类型 | 参与利润统计 | 关联项目 | 关联商品明细 |
|------|-------------|---------|-------------|
| 新欠款 | 参与 | 必须 | 必须 |
| 老欠款 | 不参与 | 可选 | 可选 |

**原因**：老数据不完整，强行统计利润不准确。老欠款只管"谁欠多少"，不管赚了多少。

#### 15.3.5 验证清单
- [ ] 有历史账单迁移入口（联系人详情页）
- [ ] 支持逐个录入老账单
- [ ] 支持批量导入老账单
- [ ] 项目、商品明细为可选字段
- [ ] 录一半关闭页面，已录入数据保留
- [ ] 老欠款与新欠款在界面上有区分

---

### 15.4 老客户迁移

**注意**：Customers.tsx 客户管理页面将废弃，所有客户统一迁移到 Contacts.tsx

**迁移规则**：
- Customer → Contact（添加 contactType）
- 根据原 customerType 映射：
  - 普通客户 → contactType='customer'
  - 水电工 → contactType='plumber'
  - 装修公司 → contactType='company'
  - 供应商 → 独立 Supplier 模块（不再映射到 Contact）

---

## 十七、验证清单

- [ ] Schema 修改后 validate 通过
- [ ] migrate 执行成功
- [ ] Contacts.tsx 类型筛选正常
- [ ] SaleNew.tsx 操作员选择正常
- [ ] Rebates.tsx 水电工选择正常
- [ ] Purchases.tsx 供应商选择正常
- [ ] 欠款统计页面Tab切换正常（我应收/我应付）
- [ ] 欠款统计-我应收（按联系人/按公司/按项目）显示正常
- [ ] 欠款统计-我应付（按供应商汇总）显示正常
- [ ] 挂账结算页面还款操作正常
- [ ] 评分详情显示正常
- [ ] 商品多品牌显示正常
- [ ] 商品多规格显示正常
- [ ] 商品多单位换算正常
- [ ] 销售退货功能正常
- [ ] 原有销售数据显示正常

---

## 十八、执行管理规范

### 18.1 分步执行策略

#### 18.1.1 执行阶段总览

| 阶段 | 名称 | 包含模块 | 预计复杂度 | 依赖关系 |
|------|------|---------|-----------|---------|
| **Phase 1** | Schema 基础改造 | Contact增强、Entity、BizProject、关系模型 | 中 | 无（起点） |
| **Phase 2** | 数据迁移核心 | Customer→Contact、Supplier模块、Purchase关联 | 高 | Phase 1 |
| **Phase 3** | 前端基础改造 | Contacts.tsx、SaleNew.tsx基础功能、Rebates.tsx | 中 | Phase 1+2 |
| **Phase 4** | 核心业务页面 | 欠款统计、Projects.tsx、Entities.tsx、配送管理 | 高 | Phase 3 |
| **Phase 5** | 商品体系重构 | Brand、ProductSpec、多单位、动态价格 | 高 | Phase 1 |
| **Phase 6** | 高级功能 | 销售退货、坏账处理、应付金额编辑 | 中 | Phase 3+4 |
| **Phase 7** | 增强功能 | 操作日志、进货历史、评分系统、初始库存导入 | 中 | Phase 4 |
| **Phase 8** | 基础设施 | 数据备份恢复、照片路径修复 | 低 | 无 |
| **Phase 9** | 集成测试 | 全流程测试、老数据验证 | 高 | Phase 1-8 |

#### 18.1.2 详细任务拆分

**Phase 1: Schema 基础改造**

| 任务ID | 任务名称 | 验证标准 | 状态 |
|--------|---------|---------|------|
| P1-T1 | Contact模型添加code、contactType | `npx prisma validate` 通过 | ⬜ |
| P1-T2 | 创建Entity模型（公司/组织） | 模型存在且关系正确 | ⬜ |
| P1-T3 | 创建BizProject模型（项目） | 模型存在且关系正确 | ⬜ |
| P1-T4 | 创建ContactEntityRole模型 | 双向关系正确 | ⬜ |
| P1-T5 | 创建ContactProjectRole模型 | 双向关系正确 | ⬜ |
| P1-T6 | 创建Supplier模型 | 模型存在且与Contact关联 | ⬜ |
| P1-T7 | AccountReceivable添加entityId字段 | 字段存在 | ⬜ |
| P1-T8 | 执行`npx prisma migrate dev --name phase1_schema` | 迁移成功 | ⬜ |
| P1-T9 | 执行`npm run build` | 构建通过 | ⬜ |

**Phase 2: 数据迁移核心**

| 任务ID | 任务名称 | 验证标准 | 状态 |
|--------|---------|---------|------|
| P2-T1 | Customer数据导出脚本 | 脚本能正确读取Customer数据 | ⬜ |
| P2-T2 | Customer→Contact迁移脚本 | Contact数据完整、contactType正确 | ⬜ |
| P2-T3 | 供应商数据→Supplier迁移 | Supplier数据完整 | ⬜ |
| P2-T4 | Purchase关联Supplier | 进货单能正确显示供应商 | ⬜ |
| P2-T5 | Rebate关联Contact | 返点记录正确 | ⬜ |
| P2-T6 | 数据完整性验证 | 所有关联数据无断裂 | ⬜ |

**Phase 3: 前端基础改造**

| 任务ID | 任务名称 | 验证标准 | 状态 |
|--------|---------|---------|------|
| P3-T1 | Contacts.tsx添加类型筛选 | 筛选正常、列表正确显示 | ⬜ |
| P3-T2 | Contacts.tsx添加code显示 | 联系人代码正确显示 | ⬜ |
| P3-T3 | SaleNew.tsx添加操作员选择 | 金先生/毛女士二选一正常 | ⬜ |
| P3-T4 | SaleNew.tsx添加配送费 | 配送费可添加/修改/清零 | ⬜ |
| P3-T5 | SaleNew.tsx添加配送信息 | 需要配送时地址填写正常 | ⬜ |
| P3-T6 | Rebates.tsx改为Contact选择 | 水电工选择正常 | ⬜ |
| P3-T7 | Purchases.tsx改为Supplier选择 | 供应商选择正常 | ⬜ |

**Phase 4: 核心业务页面**

| 任务ID | 任务名称 | 验证标准 | 状态 |
|--------|---------|---------|------|
| P4-T1 | 欠款统计Tab1-按联系人 | 联系人维度统计正确 | ⬜ |
| P4-T2 | 欠款统计Tab1-按公司 | Entity维度统计正确 | ⬜ |
| P4-T3 | 欠款统计Tab1-按项目 | BizProject维度统计正确 | ⬜ |
| P4-T4 | 欠款统计Tab2-我应付 | 供应商应付统计正确 | ⬜ |
| P4-T5 | Projects.tsx项目关联公司 | 项目能关联Entity | ⬜ |
| P4-T6 | Entities.tsx公司管理 | 公司CRUD正常 | ⬜ |
| P4-T7 | 配送管理模块 | 配送任务生成和完成正常 | ⬜ |

**Phase 5: 商品体系重构**

| 任务ID | 任务名称 | 验证标准 | 状态 |
|--------|---------|---------|------|
| P5-T1 | 创建Brand模型 | 模型存在 | ⬜ |
| P5-T2 | 创建ProductSpec模型 | 品牌-规格关系正确 | ⬜ |
| P5-T3 | Product删除costPrice/salePrice | 字段已删除 | ⬜ |
| P5-T4 | Product添加多单位字段 | 单位换算正确 | ⬜ |
| P5-T5 | Product添加动态价格字段 | 最近进价自动更新 | ⬜ |
| P5-T6 | Products.tsx多规格显示 | 品牌规格选择正常 | ⬜ |
| P5-T7 | CustomerPrice模型 | 客户价格记忆正常 | ⬜ |
| P5-T8 | 开单自动带出历史价格 | 价格自动填充正确 | ⬜ |

**Phase 6: 高级功能**

| 任务ID | 任务名称 | 验证标准 | 状态 |
|--------|---------|---------|------|
| P6-T1 | SaleReturn退货模型 | 退货流程正常 | ⬜ |
| P6-T2 | 退货库存回滚 | 库存正确增加 | ⬜ |
| P6-T3 | 退货金额退还 | 欠款正确减少 | ⬜ |
| P6-T4 | BadDebtWriteOff坏账模型 | 坏账处理流程正常 | ⬜ |
| P6-T5 | 应付金额直接编辑 | 应付金额可修改 | ⬜ |
| P6-T6 | 亏本警告机制 | 低于成本价时警告 | ⬜ |

**Phase 7: 增强功能**

| 任务ID | 任务名称 | 验证标准 | 状态 |
|--------|---------|---------|------|
| P7-T1 | AuditLog操作日志 | 操作记录正确 | ⬜ |
| P7-T2 | 进货价格历史 | 价格历史显示正确 | ⬜ |
| P7-T3 | 评分系统前端 | 评分计算和显示正确 | ⬜ |
| P7-T4 | 初始库存导入 | 批量导入正常 | ⬜ |
| P7-T5 | 历史账单迁移 | 老账单导入正常 | ⬜ |

**Phase 8: 基础设施**

| 任务ID | 任务名称 | 验证标准 | 状态 |
|--------|---------|---------|------|
| P8-T1 | 数据备份功能 | ZIP生成正确 | ⬜ |
| P8-T2 | 数据恢复功能 | 数据恢复完整 | ⬜ |
| P8-T3 | 照片路径修复 | 照片显示正常 | ⬜ |

**Phase 9: 集成测试**

| 任务ID | 任务名称 | 验证标准 | 状态 |
|--------|---------|---------|------|
| P9-T1 | 全流程测试 | 无白屏、无错误 | ⬜ |
| P9-T2 | 老数据兼容性 | 历史数据显示正常 | ⬜ |
| P9-T3 | 构建验证 | `npm run build`通过 | ⬜ |

#### 18.1.3 启动新任务继续执行流程

当需要启动新任务继续执行时：

1. **提供上下文**：告诉新的AI会话以下信息
   - 当前完成阶段（如：已完成Phase 3，正在执行Phase 4）
   - 上次任务ID（如：正在执行P4-T3）
   - 遇到的问题（如有）
   - 下一步要做什么

2. **状态文件**：在项目中创建状态跟踪文件
   ```bash
   # 创建状态文件
   migration_status.json
   ```

3. **状态文件格式**：
   ```json
   {
     "version": "v2.1",
     "lastUpdated": "2026-04-18",
     "currentPhase": "Phase 4",
     "currentTask": "P4-T3",
     "completedPhases": ["Phase 1", "Phase 2", "Phase 3"],
     "completedTasks": ["P1-T1", "P1-T2", ..., "P4-T2"],
     "nextSteps": ["完成P4-T3", "开始P4-T4"],
     "notes": "P4-T3遇到xxx问题，解决方案是xxx"
   }
   ```

4. **启动新任务时的模板**：
   ```
   请继续执行人员架构迁移项目。
   
   当前状态：
   - 已完成阶段：Phase 1, Phase 2, Phase 3
   - 当前执行：Phase 4 - P4-T3（欠款统计Tab1-按公司）
   - 下一步：完成P4-T3后执行P4-T4
   
   请先读取 migration_status.json 获取完整状态，
   然后继续执行。
   ```

### 18.2 任务中断应急预案

#### 18.2.1 中断类型分类

| 中断类型 | 识别特征 | 立即行动 |
|---------|---------|---------|
| **强制停止（Ctrl+C/超时）** | 任务未完成，文件可能未保存 | 检查文件完整性 |
| **对话轮次耗尽** | 达到对话上限，需要新会话 | 保存状态，准备新会话 |
| **应用崩溃** | Electron应用无响应 | 重启应用，检查数据 |
| **AI断连** | 网络问题或服务中断 | 等待恢复，重新连接 |

#### 18.2.2 强制停止后的处理流程

**立即检查清单**：

```
1. 文件完整性检查
   ├── 运行 git status 查看哪些文件被修改
   ├── 检查修改的文件是否完整（无截断）
   └── 如果文件损坏，从git恢复：git checkout -- file

2. 数据库状态检查
   ├── 检查是否有未完成的迁移
   ├── 运行 npx prisma validate 验证Schema
   └── 如果Schema损坏，执行 git checkout -- prisma/schema.prisma

3. 构建验证
   ├── 运行 npm run build 检查是否能构建
   └── 如果构建失败，根据错误信息修复

4. 应用状态检查
   ├── 重启Electron应用
   ├── 检查首页是否正常
   └── 测试基本功能（新增联系人等）
```

**常见问题处理**：

| 问题 | 解决方案 |
|------|---------|
| 文件修改一半被中断 | `git checkout -- <file>` 恢复，然后重新执行该任务 |
| 数据库Schema被改坏 | `git checkout -- prisma/schema.prisma` 恢复，重新执行Schema任务 |
| Prisma Client不同步 | 运行 `npx prisma generate` 重新生成 |
| 迁移文件损坏 | `git checkout -- prisma/migrations/` 恢复，运行 `npx prisma migrate dev` |
| 前端页面报错 | 检查import和组件是否完整，修复后重新构建 |

#### 18.2.3 预防措施

1. **每次重要操作前**：
   - 提交当前进度：`git add . && git commit -m "WIP: 任务描述"`
   - 或至少：`git stash` 暂存

2. **Schema修改后**：
   - 立即执行 `npx prisma validate`
   - 确认通过后再继续

3. **前端代码修改后**：
   - 立即运行 `npm run build`
   - 确认构建通过后再继续

4. **长时间任务分割**：
   - 每个小任务控制在30分钟以内
   - 大任务拆分成小任务执行

### 18.3 对话轮次耗尽应对机制

#### 18.3.1 对话耗尽前的准备工作

当对话即将达到上限时：

1. **立即保存当前状态**到 `migration_status.json`：
   ```json
   {
     "version": "v2.1",
     "lastUpdated": "2026-04-18T15:30:00",
     "currentPhase": "Phase 4",
     "currentTask": "P4-T3",
     "currentAction": "正在实现按公司统计的欠款明细展示",
     "completedPhases": ["Phase 1", "Phase 2", "Phase 3"],
     "completedTasks": ["P1-T1", "P1-T2", ..., "P4-T2"],
     "inProgressFiles": [
       "src/pages/Statements.tsx",
       "src/components/DebtSummary.tsx"
     ],
     "nextSteps": [
       "1. 完成P4-T3的欠款明细表格",
       "2. 添加按公司维度的小计行",
       "3. 测试Tab切换正常"
     ],
     "pendingChanges": [
       "Statements.tsx中欠款明细Dialog还未完成",
       "需要添加公司维度的小计计算逻辑"
     ],
     "notes": "P4-T3遇到Select组件value为空字符串的bug，已按规范修复"
   }
   ```

2. **Git提交当前进度**：
   ```bash
   git add .
   git commit -m "WIP: Phase 4 P4-T3 进行中 - 欠款按公司统计"
   ```

3. **在对话结束时**：
   - 明确告知用户当前进度和下一步
   - 提醒用户新会话需要提供的信息

#### 18.3.2 新会话启动模板

用户在新会话中可以使用以下模板：

```
请继续执行折柳建材的人员架构迁移项目。

【当前状态】
- 已完成阶段：Phase 1, Phase 2, Phase 3
- 当前执行：Phase 4 - P4-T3（欠款统计Tab1-按公司维度）
- 下一步：完成P4-T3

【项目路径】
d:\折柳建材

【状态文件】
请先读取 d:\折柳建材\migration_status.json 获取完整状态

【迁移规划】
请先读取 d:\折柳建材\MIGRATION_PLAN.md 的第十八章获取执行规范

【下一步任务】
根据状态文件中的 nextSteps 继续执行。
如果 nextSteps 明确，按顺序执行。
如果不明确，从当前任务继续。

【当前遇到的问题】（如有）
xxx
```

#### 18.3.3 状态文件恢复流程

新会话启动后：

1. **立即读取状态文件**：
   ```bash
   cat d:\折柳建材\migration_status.json
   ```

2. **检查git状态**：
   ```bash
   git status
   git log --oneline -5
   ```

3. **验证完整性**：
   - 检查 inProgressFiles 中的文件是否存在
   - 运行 `npm run build` 验证构建

4. **根据状态继续执行**：
   - 如果有 pendingChanges，先处理这些
   - 然后按 nextSteps 顺序继续

### 18.4 状态追踪文件

在项目根目录创建 `migration_status.json`：

```json
{
  "version": "v2.1",
  "lastUpdated": "",
  "currentPhase": "",
  "currentTask": "",
  "currentAction": "",
  "completedPhases": [],
  "completedTasks": [],
  "inProgressFiles": [],
  "nextSteps": [],
  "pendingChanges": [],
  "notes": ""
}
```

**更新时机**：
- 每个Phase完成后
- 每个任务完成后
- 对话耗尽前
- 遇到重大问题/解决方案记录

### 18.5 快速恢复检查清单

当需要快速恢复工作时，按顺序执行：

```
□ 1. 读取 migration_status.json
□ 2. 运行 git status 检查状态
□ 3. 运行 npx prisma validate 验证Schema
□ 4. 运行 npm run build 验证构建
□ 5. 根据 nextSteps 继续执行
□ 6. 每个小任务完成后更新状态文件
```

### 18.6 关键原则

1. **小步快跑**：每个任务尽量小，控制在30分钟内
2. **频繁保存**：每完成一个小任务就 git commit
3. **状态同步**：每次对话结束前更新 migration_status.json
4. **验证优先**：Schema修改后立即 validate + generate + build
5. **文档记录**：遇到问题和解决方案都要记录到 migration_status.json 的 notes 字段
