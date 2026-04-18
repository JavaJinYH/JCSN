---
alwaysApply: true
---
# 折柳建材店管理系统 - 项目全局开发规则
**生效范围**：本项目所有AI生成代码、功能开发、业务逻辑

---

## 一、核心开发原则
1. **唯一基准**：所有代码必须严格遵循项目根目录 `SPEC.md` 定义的架构、界面、数据模型，禁止私自变更。
2. **文档先行**：涉及数据库结构、核心业务、功能模块的大规模更新，**必须先修改 `SPEC.md`**，标注版本号与更新日期，再编写代码。
3. **优先级**：水暖建材行业业务准确性 > 代码简洁性 > 代码性能。
4. **系统性思维**：同类问题出现两次及以上，必须建立通用规范防止复发，禁止"头痛医头"式临时修复。

---

## 二、代码编写规范
### 2.1 命名规范
- **同名不同义**：同一概念在不同文档中必须使用相同名称，禁止同一概念在不同文档中有不同叫法
- **通俗易懂**：客户端页面命名必须简单直白，使用业务人员能理解的词汇，禁止使用容易产生歧义的术语
- **技术术语**：仅在技术文档（Schema、代码注释）中使用技术术语，客户端展示必须翻译为业务语言

### 2.2 注释规范
- 禁止为代码添加中文注释，保持代码简洁性（移除原关键业务逻辑注释要求）

### 2.3 技术栈规范（与项目现有架构完全一致）
- 框架：Electron + React 18 + TypeScript
- 样式：TailwindCSS + shadcn/ui
- 数据库：Prisma ORM + SQLite
- 约束：仅使用项目现有依赖，不新增第三方库

### 2.4 开发规范
- UI 组件仅使用 `src/components/ui/` 下的 shadcn/ui 组件
- 数据库操作统一使用 Prisma，财务操作必须添加事务保证数据安全
- IPC 通信统一在 `electron/main.js` 的 registerDbHandlers() 中注册，渲染进程禁止直接操作数据库
- 当前版本暂未实现软删除，财务数据物理删除需谨慎操作
- 所有数据库操作必须添加异常捕获与用户提示

---

## 三、AI 生成代码规范
1. 优先匹配现有代码结构，不做大规模重构
2. 输出代码可直接运行，标注修改文件路径
3. 数据库变更自动提供 Prisma 迁移命令
4. 界面风格严格遵循 SPEC.md 设计规范，不修改配色、布局

---

## 四、禁止事项
1. 禁止使用 `electronAPI.db` 等 Trae 私有API
2. 禁止修改项目既定布局、配色、技术架构
3. 禁止编写复杂设计模式，代码简洁易懂为主
4. 当前版本暂未实现软删除，核心数据删除操作需谨慎评估
5. **禁止临时修复**：同类问题出现两次及以上，必须建立通用规范，禁止重复使用临时补丁
6. 绝对禁止在 Electron 项目中使用 `alert()` 函数，统一使用 toast 组件替代
7. **开发环境数据处理**：开发/测试环境下，数据库改造时数据丢失无需担心。迁移完成后统一由AI写入测试数据，无需为保护现有数据而顾虑改造进度。

---

## 五、白屏问题预防与调试规范

### 6.1 白屏问题常见原因（分类编号：WP-001）
| 编号 | 原因 | 预防措施 |
|------|------|----------|
| WP-001-A | Prisma Schema关系不完整 | 遵循双向关系原则 |
| WP-001-B | JavaScript运行时错误 | 使用Toast组件进行错误提示 |
| WP-001-C | 资源加载失败 | 检查文件路径 |
| WP-001-D | 状态初始化问题 | 规范useState用法 |

### 6.2 Prisma Schema修改规范
**必须遵循双向关系原则**：
```prisma
// 正确示例：两个模型都定义了对应关系
model Customer {
  id           String @id @default(cuid())
  categoryId   String?
  category     CustomerCategory? @relation(...)
}

model CustomerCategory {
  id        String @id @default(cuid())
  customers Customer[]  // 必须有反向关系
}
```

**修改Schema后必须执行**：
```bash
# 1. 验证Schema语法
npx prisma validate

# 2. 重新生成Client
npx prisma generate

# 3. 执行迁移（如需要）
npx prisma migrate dev --name 描述性名称

# 4. 验证构建
npm run build
```

### 6.3 错误提示配置规范
**高风险页面必须使用Toast组件进行错误提示**：
- 新增/编辑页面（如SaleNew、ProductNew）
- 复杂列表页面
- 涉及多个异步数据加载的页面

```tsx
// 错误提示示例
import { toast } from '@/components/Toast';

const loadData = async () => {
  try {
    setLoading(true);
    const data = await db.model.findMany({...});
    setData(data);
  } catch (error) {
    console.error('[ModuleName] 加载失败:', error);
    toast('数据加载失败，请刷新页面重试', 'error');
  } finally {
    setLoading(false);
  }
};
```

### 6.4 数据库查询防护规范
**loadData函数标准模板**：
```typescript
const loadData = async () => {
  try {
    setLoading(true);
    const data = await db.model.findMany({...});
    setData(data);
  } catch (error) {
    console.error('[ModuleName] 加载失败:', error);
    // 使用Toast组件替代alert
    toast('数据加载失败，请刷新页面重试', 'error');
  } finally {
    setLoading(false);
  }
};
```

### 6.5 调试与验证清单
修改任何页面后，验证以下项目：
- [ ] 页面正常渲染，无白屏
- [ ] 控制台无红色错误
- [ ] 网络请求无404/500错误
- [ ] 数据库操作返回正确数据
- [ ] 交互功能（按钮、表单）正常响应

---

## 六、Select组件使用规范

### 7.1 错误原因（分类编号：SEL-001）
shadcn/ui的`<Select>`组件要求`<SelectItem>`的`value`属性必须是**非空字符串**。空字符串`""`会导致以下错误：
```
A <Select.Item /> must have a value prop that is not an empty string.
```

### 7.2 正确用法
```tsx
// 错误示例
<SelectItem value="">无</SelectItem>

// 正确示例：使用 __none__ 作为空值占位符
<SelectItem value="__none__">无</SelectItem>
```

### 7.3 状态初始化规范
```tsx
// 错误：初始值为空字符串
const [selected, setSelected] = useState<string>('');

// 正确：初始值为 __none__
const [selected, setSelected] = useState<string>('__none__');
```

### 7.4 提交数据转换
```tsx
// 将 __none__ 转换为 null 或实际需要的空值
const handleSubmit = () => {
  const actualValue = selectedValue === '__none__' ? null : selectedValue;
  // 提交 actualValue
};
```

### 7.5 代码审查检查项
- [ ] 所有`<SelectItem>`都有非空`value`属性
- [ ] 状态初始值不是空字符串
- [ ] 表单提交时正确处理`__none__`值

---

## 七、下拉搜索组件规范（分类编号：SEL-002）

### 7.1 问题背景
**问题原因**：当选项数量较多（如联系人、结账主体、供应商等）时，普通的 `<Select>` 组件只能滚动选择，用户需要滚动很久才能找到目标选项，体验很差。

**典型症状**：
- 结账主体有100+个时，选择困难
- 供应商列表很长，只能滑动选择
- 联系人数量多时，选择效率低

### 7.2 解决方案：Combobox（可搜索下拉）

**使用场景**：选项数量 > 10 个时，必须使用可搜索的 Combobox 组件。

**shadcn/ui 组件**：`Command` 组件（配合 `Popover`）

### 7.3 正确用法

```tsx
// 使用 shadcn/ui 的 Command 组件实现可搜索下拉
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

// 示例：选择结账主体
const [open, setOpen] = useState(false);
const [selectedEntity, setSelectedEntity] = useState<string>('');
const [searchTerm, setSearchTerm] = useState('');

const filteredEntities = entities.filter(e =>
  e.name.toLowerCase().includes(searchTerm.toLowerCase())
);

return (
  <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild>
      <Button variant="outline" role="combobox" className="w-full justify-between">
        {selectedEntity
          ? entities.find(e => e.id === selectedEntity)?.name
          : "选择结账主体..."}
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-[400px] p-0">
      <Command>
        <CommandInput
          placeholder="搜索结账主体..."
          value={searchTerm}
          onValueChange={setSearchTerm}
        />
        <CommandList>
          <CommandEmpty>没有找到匹配的结账主体</CommandEmpty>
          <CommandGroup>
            {filteredEntities.map(entity => (
              <CommandItem
                key={entity.id}
                value={entity.id}
                onSelect={() => {
                  setSelectedEntity(entity.id);
                  setOpen(false);
                  setSearchTerm('');
                }}
              >
                {entity.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
);
```

### 7.4 必须使用搜索下拉的场景

| 场景 | 选项数量 | 原因 |
|------|---------|------|
| 选择结账主体 | >10 | 便于快速定位 |
| 选择供应商 | >10 | 便于快速定位 |
| 选择联系人/客户 | >10 | 便于快速定位 |
| 选择项目 | >10 | 便于快速定位 |
| 选择商品 | >10 | 便于快速定位 |

### 7.5 搜索下拉设计原则

1. **即时搜索**：用户输入时立即过滤，无需点击搜索按钮
2. **模糊匹配**：支持部分匹配，如输入"江城"能匹配"江城装饰有限公司"
3. **显示匹配提示**：高亮匹配的文字
4. **无结果提示**：当没有匹配项时显示友好提示
5. **键盘支持**：支持上下键选择，Enter确认，Esc关闭

### 7.6 代码审查检查项

- [ ] 选项 > 10 的场景使用 Combobox
- [ ] 支持输入搜索和即时过滤
- [ ] 无匹配结果时有友好提示
- [ ] 选择后正确更新状态
- [ ] 弹窗关闭后重置搜索词

---

## 八、重复性问题处理流程

### 8.1 问题分类体系
| 分类编号 | 类别 | 示例 |
|----------|------|------|
| WP-xxx | 白屏/渲染问题 | Schema关系、ErrorBoundary |
| SEL-xxx | Select组件问题 | 空字符串value |
| TYP-xxx | TypeScript类型问题 | 类型不匹配 |
| DB-xxx | 数据库操作问题 | 查询错误 |
| UIX-xxx | UI交互问题 | 按钮无响应 |

### 8.2 问题处理流程
```
发现问题
    ↓
判断是否为新问题？
    ↓是↓否
记录到规范 → 检查同类问题
添加临时修复    ↓
制定通用规范 ← 建立预防机制
添加到本章      ↓
验证并更新文档
```

### 8.3 规范更新触发条件
以下情况必须触发规范更新：
1. **同类问题出现2次及以上**：必须建立通用规范
2. **修复时间超过30分钟**：必须反思并建立预防机制
3. **涉及多个文件**：必须建立系统性解决方案

### 8.4 规范文档结构要求
每条规范必须包含：
1. **编号**：唯一标识符（类别-序号）
2. **错误原因**：根本原因分析
3. **正确代码示例**：可直接使用的正确代码
4. **错误代码示例**：常见错误写法
5. **预防措施**：如何在开发中避免
6. **验证清单**：检查要点列表

---

## 八、新增功能开发检查清单

### 9.1 Schema设计
- [ ] 遵循双向关系原则
- [ ] 运行`npx prisma validate`
- [ ] 运行`npx prisma generate`
- [ ] 验证构建`npm run build`

### 9.2 组件开发
- [ ] Select组件使用非空value（__none__占位）
- [ ] useState初始值正确初始化
- [ ] useEffect正确处理依赖
- [ ] 异步操作有try-catch保护

### 9.3 表单处理
- [ ] Select选项value不为空字符串
- [ ] 提交时正确转换__none__值
- [ ] 重置表单状态正确

### 9.4 页面级检查
- [ ] 使用Toast组件进行错误提示（如需要）
- [ ] 加载状态有用户提示
- [ ] 错误状态有友好界面
- [ ] 无白屏问题

---

## 九、Electron IPC 模型注册规范（分类编号：IPC-001）

### 10.1 问题背景
**问题原因**：当在 Prisma Schema 中添加新模型时，如果不在 `electron/main.js` 的 `registerDbHandlers()` 函数中注册该模型，前端调用 `db.xxx.create()` 等操作时会失败，因为没有对应的 IPC handler。

**典型症状**：
- 添加数据时报错："electronAPI.db 不可用" 或 "xxx 操作失败"
- 其他模块功能正常，唯独新模型相关操作失败
- 保存按钮点击无响应或报错

### 10.2 正确注册模型步骤
**步骤1**：检查 Prisma Schema 中的所有模型
```bash
grep "^model " prisma/schema.prisma
```

**步骤2**：检查 electron/main.js 中的 models 数组是否包含所有模型

**步骤3**：如果缺少模型，在 models 数组中添加缺失的模型名称
```javascript
// electron/main.js
function registerDbHandlers() {
  const models = [
    'category', 'product', 'customer', 'customerCategory', 'project',
    'sale', 'saleItem', 'payment', 'systemSetting', 'purchase',
    'rebate', 'deliveryFee', 'deliveryRecord',
    'accountReceivable', 'settlementAdjustment', 'paymentPlan', 'auditLog',
    'salePhoto', 'purchasePhoto', 'collectionRecord',
    'inventoryCheck', 'inventoryCheckItem',  // 新模型
    'saleSlip', 'saleSlipItem', 'customerFavoriteProduct', 'customerPhone'  // 补充新模型
  ];
  // ...
}
```

**步骤4**：重启 Electron 应用（不是刷新页面，需要完全重启）

### 10.3 代码审查检查项
- [ ] Prisma Schema 中新增模型已在 electron/main.js 注册
- [ ] 模型名称完全匹配（区分大小写）
- [ ] 重启应用后测试新模型的数据操作

### 10.4 常见错误对照表
| 错误信息 | 原因 | 解决方案 |
|----------|------|----------|
| "electronAPI.db 不可用" | preload.js 未正确加载 | 检查 preload.js 配置 |
| "xxx.create 失败" | 模型未在 IPC 注册 | 在 models 数组中添加模型 |
| "模型 undefined" | 模型名称拼写错误 | 检查大小写一致性 |

---

## 十、UI交互问题预防规范（分类编号：UIX-001）

### 11.1 UI交互问题常见原因
| 编号 | 原因 | 典型症状 | 预防措施 |
|------|------|----------|----------|
| UIX-001-A | Dialog/Overlay阻止点击 | 输入框无法聚焦 | 正确配置Dialog事件处理 |
| UIX-001-B | z-index层级冲突 | 元素被遮挡 | 确保Dialog z-index最高 |
| UIX-001-C | 状态更新时机问题 | 点击无响应 | 检查useState和事件处理顺序 |
| UIX-001-D | Radix UI事件冲突 | Select无法展开 | 正确传递事件处理器 |

### 11.2 Radix UI Dialog事件处理规范
**问题原因**：Radix UI Dialog 组件的 `onPointerDownOutside` 和 `onInteractOutside` 事件默认会阻止点击事件传播，导致输入框无法响应。

**正确用法**：
```tsx
// 使用受控模式管理Dialog状态
const [open, setOpen] = useState(false);

<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild>
    <Button>打开对话框</Button>
  </DialogTrigger>
  <DialogContent>
    {/* DialogContent已经处理了事件，不会阻止输入框 */}
    <Input />
  </DialogContent>
</Dialog>
```

### 11.3 DialogContent组件防护规范
如果DialogContent内部事件传播被意外阻止，检查以下几点：

1. **检查是否有覆盖层阻止点击**：
   - DialogOverlay应该有 `pointer-events: none` 或者完全不存在

2. **检查Dialog的open状态管理**：
   ```tsx
   // 错误：在Dialog外部使用State管理open状态，可能不同步
   const [dialogOpen, setDialogOpen] = useState(false);
   <Dialog>
     <DialogContent open={dialogOpen} onOpenChange={setDialogOpen}>
   ```

3. **检查z-index层级**：
   - DialogContent的z-index应该最高（50）
   - DialogOverlay的z-index应该低于Content但高于背景

### 11.4 事件调试清单
当发现UI交互问题时，按以下顺序检查：
- [ ] 打开浏览器开发者工具检查元素样式
- [ ] 检查z-index层级是否正确
- [ ] 检查是否有 `pointer-events: none` 阻止了点击
- [ ] 检查React组件状态是否正确更新
- [ ] 检查是否有JavaScript错误在控制台

### 11.5 代码审查检查项
- [ ] Dialog组件正确使用受控/非受控模式
- [ ] 输入框没有被其他元素遮挡
- [ ] z-index层级正确（Dialog > Overlay > Background）
- [ ] 没有意外添加的 `pointer-events: none`

---

## 十一、开发者职责

### 12.1 每次代码提交前必须检查
1. 运行`npm run build`确保构建通过
2. 检查控制台无错误
3. 确认没有使用空字符串value的SelectItem
4. 确认Schema修改后执行了validate和generate
5. **测试UI交互**：点击按钮、输入框、Select等是否正常响应
6. 确认没有使用alert()函数，全部替换为toast组件

### 12.2 发现新问题时的职责
1. 立即修复当前实例
2. 搜索项目中是否存在同类问题
3. 将问题及解决方案添加到本规范
4. 记录到规范文档备查

### 12.3 项目规格同步职责
**目的**：避免上下文压缩后丢失项目架构认知，确保新任务能快速准确上手。

**触发条件**：以下情况必须同步更新 `SPEC.md`：
1. 新增功能模块（涉及新页面、新数据模型）
2. 业务规则变更（水电费计算、返点规则、库存逻辑等）
3. 架构调整（IPC通信变更、数据库结构变化）
4. 较大阶段任务完成后

**同步内容**：
- 新架构、新数据模型 → 更新到 SPEC.md 架构/数据模型章节
- 新业务规则 → 更新到 SPEC.md 业务规则章节
- SPEC.md 定位：项目**当前实际状态**快照，不是任务清单

**不同步内容**：
- 迁移规划进度/任务清单（保持独立文档）
- 临时修复方案（只写入规范文档）
- 执行过程中的调试笔记

### 12.4 禁止行为
- 禁止只修复当前实例而不处理同类问题
- 禁止添加临时补丁而不建立规范
- 禁止在未验证的情况下提交代码
- 禁止使用alert()、confirm()、prompt()等同步阻塞函数

---

## 十二、错误反馈机制规范（分类编号：ERR-001）

### 13.1 问题背景
**问题原因**：系统发生错误时无任何提示，按钮点击无反应，用户无法得知操作状态，无法进行问题排查和解决。

**典型症状**：
- 点击保存按钮无响应
- 操作失败但界面无任何错误提示
- 用户不知道操作是否成功

### 13.2 Toast 通知组件使用规范
**组件位置**：`src/components/Toast.tsx`

**使用方式**：
```typescript
import { toast } from '@/components/Toast';

// 成功提示
toast('操作成功！', 'success');

// 错误提示
toast('保存失败，请重试', 'error');

// 警告提示
toast('数据验证失败', 'warning');

// 信息提示
toast('正在加载数据...', 'info');
```

**Toast 类型**：
| 类型 | 图标 | 颜色 | 适用场景 |
|------|------|------|----------|
| success | ✅ | 绿色 | 操作成功 |
| error | ❌ | 红色 | 操作失败、错误 |
| warning | ⚠️ | 黄色 | 警告、验证失败 |
| info | ℹ️ | 蓝色 | 信息提示 |

### 13.3 错误处理规范
**数据库操作错误处理模板**：
```typescript
const loadData = async () => {
  try {
    setLoading(true);
    const data = await db.model.findMany({...});
    setData(data);
  } catch (error) {
    console.error('[模块名] 加载失败:', error);
    toast('数据加载失败，请刷新页面重试', 'error');
  } finally {
    setLoading(false);
  }
};
```

**表单提交错误处理模板**：
```typescript
const handleSubmit = async () => {
  try {
    await db.model.create({...});
    toast('保存成功！', 'success');
    // 跳转或重置表单
  } catch (error) {
    console.error('保存失败:', error);
    toast('保存失败，请重试', 'error');
  }
};
```

### 13.4 必须添加错误提示的场景
| 场景 | 提示内容示例 |
|------|-------------|
| 数据加载失败 | "数据加载失败，请刷新页面重试" |
| 保存失败 | "保存失败，请重试" |
| 删除失败 | "删除失败，请重试" |
| 表单验证失败 | "请填写必填项" 或具体验证错误 |
| 网络错误 | "网络连接异常，请检查网络" |
| 权限不足 | "您没有权限执行此操作" |

### 13.5 错误日志规范
所有错误必须同时记录到控制台：
```typescript
catch (error) {
  console.error('[模块名] 操作描述失败:', error);
  toast('错误提示信息', 'error');
}
```

### 13.6 代码审查检查项
- [ ] 所有数据库操作都有 try-catch 包裹
- [ ] catch 块中有 console.error 记录错误日志
- [ ] catch 块中有 toast 提示用户
- [ ] 成功操作有 toast 成功提示
- [ ] 表单验证失败有 toast 警告提示

---

## 十三、同步阻塞函数规范（分类编号：ERR-002）

### 14.1 问题背景
**问题原因**：在 Electron 环境下，`alert()` 函数会被拦截并转换为同步 IPC 调用或 Electron 内部处理，导致主线程阻塞。

**典型症状**：
- Dialog 打开后输入框无法交互
- 第一次正常，第二次开始阻塞时间递增
- 阻塞时间呈指数增长（1秒 → 5秒 → 15秒 → ...）
- 直至页面完全卡死需要重启

**Bug 首次发现**：2026-04-16，配送管理页面

### 14.2 根本原因分析

**直接原因**：`alert()` 函数阻塞主线程

**深层机制**（推测）：
```
情况A：alert 被拦截并转为 IPC 同步调用
       renderer → IPC (sync) → main process → dialog.showMessageBox → 阻塞等待

情况B：alert 被包装为异步但存在回调累积
       每次 Dialog 打开/关闭时累加新的回调监听器
       回调链呈指数增长导致处理时间增长

情况C：alert 与 Radix UI Dialog 焦点管理冲突
       两者竞争主线程导致输入框事件无法及时处理
```

**为何第二次打开问题更严重**：
- Dialog 组件内部的 `onOpenAutoFocus` 和 `onClose` 事件处理累积
- 表单状态未重置导致受控组件额外重渲染
- `alert()` 的阻塞效果被 Radix Dialog 放大

### 14.3 错误代码示例
```typescript
// 错误：在 Electron 环境下使用 alert
const handleAddRecord = async () => {
  if (!recordFormData.recipientName.trim()) {
    alert('请输入收货人姓名');  // 阻塞主线程！
    return;
  }
  // ...
  alert('配送记录添加成功');  // 阻塞主线程！
};

// 错误：表单关闭时未重置，导致第二次打开异常
const handleCancel = () => {
  setShowAddRecordDialog(false);
  // 未重置 recordFormData，导致脏数据残留
};
```

### 14.4 正确代码示例
```typescript
// 正确：使用 toast 替代 alert
import { toast } from '@/components/Toast';

const handleAddRecord = async () => {
  if (!recordFormData.recipientName.trim()) {
    toast('请输入收货人姓名', 'warning');
    return;
  }
  // ...
  toast('配送记录添加成功', 'success');
};

// 正确：Dialog 关闭时自动重置表单
useEffect(() => {
  if (!showAddRecordDialog) {
    setRecordFormData({
      saleId: '',
      recipientName: '',
      recipientPhone: '',
      deliveryAddress: '',
      // ... 其他字段
    });
  }
}, [showAddRecordDialog]);
```

### 14.5 Dialog 条件渲染规范
**问题原因**：Dialog 组件总是挂载（非条件渲染）时，组件状态会累积，可能加剧阻塞问题。

**推荐模式**：条件渲染 + 表单重置
```tsx
// 推荐：在 Dialog 内容内部使用条件渲染
{showAddRecordDialog && (
  <Dialog open={showAddRecordDialog} onOpenChange={setShowAddRecordDialog}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>添加配送记录</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
        {/* 表单内容 */}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => setShowAddRecordDialog(false)}>
          取消
        </Button>
        <Button onClick={handleAddRecord}>保存</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)}
```

### 14.6 避免措施

1. **绝对禁止**：在 Electron 项目中使用 `alert()`
2. **强制替换**：所有用户提示必须使用 `toast()`
3. **表单重置**：Dialog 关闭时必须重置表单状态
4. **测试验证**：高频测试 Dialog 打开/关闭（连续10次以上）

### 14.7 排查清单
当遇到输入框无响应、按钮点击无反应时：
- [ ] 检查是否使用了 `alert()` 函数
- [ ] 检查 Dialog 关闭时是否重置了表单状态
- [ ] 检查是否存在条件渲染缺失
- [ ] 高频测试：连续打开/关闭 Dialog 10 次

### 14.8 变种问题识别

| 变种 | 识别特征 | 解决方案 |
|------|----------|----------|
| `confirm()` 阻塞 | 弹窗不出现但按钮卡死 | 替换为非阻塞确认组件 |
| `prompt()` 阻塞 | 输入框无法输入 | 使用 Dialog + Input 替代 |
| `window.alert` 覆盖 | 开发者工具无报错但卡死 | 全局搜索并替换 |
| 同步 IPC 调用 | 特定操作后开始卡死 | 检查 IPC 是否使用 invoke 而非 send |

---

## 十四、Dialog 表单状态管理规范（分类编号：UIX-002）

### 15.1 问题背景
**问题原因**：表单状态在 Dialog 关闭时未重置，导致第二次打开时出现脏数据和受控/非受控冲突。

**典型症状**：
- 第一次打开 Dialog 正常
- 第二次打开时输入框显示上次数据
- 输入框无法响应或响应异常
- 等待 10-20 秒后恢复正常

### 15.2 正确实现模板
```tsx
export function MyComponent() {
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    field1: '',
    field2: '',
    field3: '',
  });

  // Dialog 关闭时自动重置表单
  useEffect(() => {
    if (!showDialog) {
      setFormData({
        field1: '',
        field2: '',
        field3: '',
      });
    }
  }, [showDialog]);

  const handleSubmit = async () => {
    // 验证和提交逻辑
    setShowDialog(false);
  };

  return (
    <>
      <Button onClick={() => setShowDialog(true)}>打开</Button>

      {showDialog && (
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>标题</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input
                value={formData.field1}
                onChange={(e) => setFormData({ ...formData, field1: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                取消
              </Button>
              <Button onClick={handleSubmit}>保存</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
```

### 15.3 代码审查检查项
- [ ] Dialog 使用条件渲染 `{showDialog && <Dialog>}`
- [ ] 有 useEffect 监听 dialog 状态并在关闭时重置表单
- [ ] 表单重置包含所有字段
- [ ] 取消按钮正确关闭 Dialog（不依赖表单重置）

---

## 十五、alert 问题排查规范

### 15.1 查找所有 alert 调用
```bash
# 在 Windows PowerShell 中执行
cd "d:\折柳建材"
Select-String -Path "src\**\*.tsx" -Pattern "alert\(" -Recurse | Select-Object Path, LineNumber
```

### 15.2 批量替换为 toast
```typescript
// 替换规则：
// alert('消息')           → toast('消息', 'success')
// alert('错误信息')        → toast('错误信息', 'error')
// alert('验证失败')        → toast('验证失败', 'warning')
```

### 15.3 验证测试流程
1. 连续打开/关闭 Dialog 10 次
2. 每次打开后尝试输入
3. 确认输入框立即响应（无延迟）
4. 确认 toast 提示正常显示

---

## 十六、UI布局响应式设计规范（分类编号：UIX-003）

### 16.1 问题背景
**问题原因**：进货管理、销售开单等 Dialog 表单内容过长，当客户端窗口缩小时，内容被截断或溢出，导致无法操作。

**典型症状**：
- Dialog 高度固定，内容溢出
- 窗口缩小时，部分输入框消失
- 表单越长问题越严重

**Bug 首次发现**：2026-04-18，进货管理添加进货记录 Dialog

### 16.2 正确布局方案

**方案：内容区域可滚动**
```tsx
// 错误：DialogContent 高度固定，内容溢出
<DialogContent className="max-h-[600px]">
  <div>长表单内容...</div>  {/* 内容溢出被截断 */}
</DialogContent>

// 正确：内容区域可滚动
<DialogContent className="max-h-[90vh] overflow-y-auto">
  <div className="max-h-[calc(90vh-120px)] overflow-y-auto pr-2">
    长表单内容...  {/* 内容过多时可滚动 */}
  </div>
</DialogContent>
```

**方案：使用 ScrollArea 组件**
```tsx
import { ScrollArea } from '@/components/ui/scroll-area';

<DialogContent className="max-h-[90vh]">
  <ScrollArea className="h-[calc(90vh-120px)]">
    长表单内容...
  </ScrollArea>
</DialogContent>
```

### 16.3 布局设计原则

**高度自适应**：
- Dialog 高度使用 `max-h-[90vh]` 而非固定像素值
- 内容区域设置最大高度后允许滚动
- 头部和底部按钮区域固定

**响应式宽度**：
```tsx
// 正确：宽度响应式
<DialogContent className="w-[95vw] max-w-2xl">

// 表单内部布局
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {/* 窄屏时单列，宽屏时双列 */}
</div>
```

### 16.4 表单过长时的处理策略

| 场景 | 处理方式 |
|------|---------|
| 表单字段少（<10个） | 直接显示 |
| 表单字段中等（10-20个） | 分组 + 可滚动 |
| 表单字段多（>20个） | 分步骤向导（Wizard） |

### 16.5 代码审查检查项
- [ ] Dialog 内容区域可滚动
- [ ] 窗口缩小时所有输入框可见
- [ ] 表单不会溢出容器
- [ ] 按钮区域始终可见
- [ ] 测试窗口最小化到 800x600

### 16.6 侧边导航菜单响应式设计

**问题描述**：
- 左侧导航菜单在小窗口时被截断
- 底部菜单项（如"系统设置"和"报表统计"）可能看不见
- 导航菜单名称过长时会被截断

**典型症状**：
- 窗口缩小时，底部几个菜单项消失
- 菜单项文字被截断，只显示部分

**正确方案**：
```tsx
// 侧边栏使用可滚动
<aside className="h-screen overflow-y-auto">
  <nav className="flex flex-col h-full">
    {/* 导航项 */}
    <NavItem>首页</NavItem>
    <NavItem>进货管理</NavItem>
    {/* ... */}
    <NavItem className="mt-auto">系统设置</NavItem>
    <NavItem>报表统计</NavItem>
  </nav>
</aside>
```

**或者使用收缩式导航**：
- 小窗口时导航菜单收缩为图标模式
- 悬停或点击展开
- 保证所有菜单项可访问

**文字截断处理**：
```tsx
// 错误：文字过长被截断
<div className="truncate">这是一个很长的菜单名称</div>

// 正确：文字过长时换行或缩略
<div className="text-sm truncate" title="完整的菜单名称">
  完整名称
</div>
```

### 16.7 完整页面响应式设计原则

**最小支持宽度**：800x600

**布局原则**：
1. **内容区域**：可滚动 `overflow-y-auto`
2. **导航菜单**：高度100%，可滚动
3. **弹窗/对话框**：使用 `max-h-[90vh]`
4. **表格**：横向滚动 `overflow-x-auto`

**测试清单**：
- [ ] 窗口最小化到 800x600 时所有菜单项可见
- [ ] 窗口最小化到 800x600 时所有表单输入框可操作
- [ ] 侧边导航菜单有滚动条（如果需要）
- [ ] 表格横向滚动正常