# 折柳建材店管理系统 - 打包部署技术文档

| 项目 | 内容 |
|------|------|
| **文档版本** | v2.0 |
| **创建日期** | 2026-04-16 |
| **最后更新** | 2026-04-18 |
| **适用版本** | v4.7+ |
| **文档状态** | 正式发布 |

---

## 目录

1. [打包环境要求规范](#1-打包环境要求规范)
2. [打包操作详细步骤](#2-打包操作详细步骤)
3. [打包成果物验证标准与方法](#3-打包成果物验证标准与方法)
4. [目标笔记本电脑系统环境准备要求](#4-目标笔记本电脑系统环境准备要求)
5. [部署实施具体流程](#5-部署实施具体流程)
6. [部署后功能验证测试流程](#6-部署后功能验证测试流程)
7. [常见问题解决方案](#7-常见问题解决方案)
8. [文档更新与版本控制机制](#8-文档更新与版本控制机制)

---

## 1. 打包环境要求规范

### 1.1 支持的操作系统版本及架构要求

| 项目 | 要求 |
|------|------|
| **宿主操作系统** | Windows 10 (版本 1809+) / Windows 11 |
| **系统架构** | x64 (AMD64) |
| **最低内存** | 4 GB RAM |
| **最低磁盘空间** | 10 GB 可用空间 |
| **打包工具** | electron-builder 24.13.3 |

### 1.2 必要依赖软件清单

#### 1.2.1 Node.js 环境

| 项目 | 要求 |
|------|------|
| **版本** | Node.js 18.x 或 20.x LTS |
| **下载地址** | https://nodejs.org/dist/v20.10.0/node-v20.10.0-x64.msi |
| **验证命令** | `node -v` (应显示 v18.x.x 或 v20.x.x) |

#### 1.2.2 npm 包管理器

| 项目 | 要求 |
|------|------|
| **版本** | npm 9.x 或 10.x (随 Node.js 自动安装) |
| **验证命令** | `npm -v` |

#### 1.2.3 Prisma CLI

| 项目 | 要求 |
|------|------|
| **版本** | Prisma 5.22.0 |
| **安装方式** | `npm install prisma@5.22.0 --save-dev` |
| **验证命令** | `npx prisma --version` |

#### 1.2.4 Git (可选但推荐)

| 项目 | 要求 |
|------|------|
| **版本** | Git 2.x |
| **下载地址** | https://git-scm.com/download/win |
| **用途** | 版本管理、代码克隆 |

### 1.3 环境变量配置

#### 1.3.1 Windows 系统环境变量设置

```
变量名: PATH
值: C:\Program Files\nodejs\
添加方式:
  1. 右键"此电脑" → 属性 → 高级系统设置
  2. 点击"环境变量"
  3. 在"系统变量"中找到 PATH
  4. 点击"编辑" → "新建"
  5. 添加 C:\Program Files\nodejs\
  6. 确认保存
```

#### 1.3.2 验证环境配置

```powershell
# 执行以下命令验证环境
node -v
# 应输出: v18.19.0 或 v20.10.0

npm -v
# 应输出: 9.x.x 或 10.x.x

npx prisma --version
# 应输出: prisma 5.22.0
```

---

## 2. 打包操作详细步骤

### 2.1 打包命令序列

#### 2.1.1 完整打包命令

```powershell
# 1. 进入项目目录
cd d:\折柳建材

# 2. 安装依赖（如尚未安装）
npm install

# 3. 生成 Prisma Client（如有数据库变更）
npx prisma generate

# 4. 构建前端并打包 Electron 应用
npm run electron:build
```

#### 2.1.2 分步执行命令

```powershell
# 步骤 1: 安装依赖
npm install
# 参数说明:
#   - 无需额外参数
#   - 耗时约 3-5 分钟
#   - 成功标志: 显示 added XXX packages

# 步骤 2: 生成 Prisma Client
npx prisma generate
# 参数说明:
#   - 无需额外参数
#   - 成功标志: 显示 "Generated Prisma Client"

# 步骤 3: TypeScript 类型检查
npx tsc --noEmit
# 参数说明:
#   --noEmit: 仅检查类型，不输出文件
#   成功标志: 无错误输出

# 步骤 4: 构建前端资源
npm run build
# 参数说明:
#   - 执行 vite build
#   - 输出目录: dist/
#   成功标志: 显示 "built in Xms"

# 步骤 5: 打包 Electron 应用
npx electron-builder --win --x64
# 参数说明:
#   --win: 构建 Windows 版本
#   --x64: 目标架构 x64
#   成功标志: 显示 "Building electron-app for windows-x64 completed"

# 步骤 6: 查看打包产物
ls -la release/
```

### 2.2 相关配置文件修改

#### 2.2.1 package.json 应用元信息

**文件位置**: `d:\折柳建材\package.json`

```json
{
  "name": "jiancai-manager",
  "version": "1.0.0",
  "description": "折柳建材店管理系统",
  "author": "折柳建材",
  "build": {
    "appId": "com.zheliujiancai.manager",
    "productName": "折柳建材店管理系统",
    "directories": {
      "output": "release"
    },
    "win": {
      "target": [
        {
          "target": "nsis",
          "arch": ["x64"]
        }
      ],
      "icon": "public/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "perMachine": false,
      "allowToChangeInstallationDirectory": true,
      "installerIcon": "public/icon.ico",
      "uninstallerIcon": "public/icon.ico",
      "installerHeaderIcon": "public/icon.ico"
    },
    "files": [
      "dist/**/*",
      "electron/**/*",
      "node_modules/**/*",
      "package.json"
    ],
    "extraMetadata": {
      "main": "electron/main.js"
    }
  }
}
```

**修改注意事项**:
- `version`: 每次打包前必须更新版本号
- `productName`: 安装后显示的应用名称
- `appId`: 唯一标识，不应与其他应用重复

#### 2.2.2 创建应用图标 (可选)

```powershell
# 在项目根目录创建 public 文件夹
mkdir public

# 准备图标文件 (如无可用默认图标):
# - icon.ico: 256x256 像素，多分辨率图标
# - 可使用在线工具将 PNG 转换为 ICO
```

### 2.3 中间产物处理与临时文件清理

#### 2.3.1 清理命令

```powershell
# 清理 node_modules (重新安装依赖)
rmdir /s /q node_modules
# 或
npm cache clean --force

# 清理构建产物
rmdir /s /q dist
rmdir /s /q release

# 清理 Prisma 生成文件
rmdir /s /q prisma/client
```

#### 2.3.2 完整清理脚本

```powershell
# clean.bat - 清理所有构建产物
@echo off
echo 开始清理构建产物...

# 停止可能运行的 Electron 进程
taskkill /F /IM "electron.exe" 2>nul

# 清理目录
if exist node_modules rmdir /s /q node_modules
if exist dist rmdir /s /q dist
if exist release rmdir /s /q release
if exist prisma\client rmdir /s /q prisma\client

echo 清理完成!
pause
```

---

## 3. 打包成果物验证标准与方法

### 3.1 成果物完整性校验

#### 3.1.1 文件列表检查

```
release/
└── win-unpacked/
    ├── 折柳建材店管理系统.exe    # 主程序 (约 150-200 MB)
    ├── resources/
    │   └── app.asar            # 打包的应用代码 (约 50-100 MB)
    └── ...
```

#### 3.1.2 文件大小标准

| 文件/目录 | 预期大小 | 异常情况 |
|-----------|---------|----------|
| 折柳建材店管理系统.exe | 150-250 MB | 异常大或小 |
| resources/app.asar | 50-150 MB | 空文件或异常大 |
| release/ 目录总大小 | 200-400 MB | 总大小异常 |

#### 3.1.3 哈希值校验

```powershell
# 使用 PowerShell 计算 SHA256 哈希
Get-FileHash "release\win-unpacked\折柳建材店管理系统.exe" -Algorithm SHA256

# 预期输出格式:
# Algorithm : SHA256
# Hash      : A1B2C3D4E5F6... (64位十六进制字符串)
# Path      : release\win-unpacked\折柳建材店管理系统.exe
```

### 3.2 功能验证测试用例

#### 3.2.1 安装测试

| 测试编号 | 测试内容 | 预期结果 | 验证方法 |
|---------|---------|---------|---------|
| IT-01 | 执行安装程序 | 正常弹出安装向导 | 观察界面 |
| IT-02 | 选择安装目录 | 可自定义安装路径 | 点击浏览按钮 |
| IT-03 | 完成安装 | 无错误提示，安装成功 | 观察最终状态 |
| IT-04 | 启动应用 | 窗口正常显示 | 观察主界面 |

#### 3.2.2 核心功能测试

| 测试编号 | 测试内容 | 预期结果 | 验证方法 |
|---------|---------|---------|---------|
| FT-01 | 首页仪表盘加载 | 显示统计数据和图表 | 观察数据展示 |
| FT-02 | 商品列表查询 | 列表正常显示 | 点击商品管理菜单 |
| FT-03 | 新增销售单 | 可正常保存 | 创建测试销售单 |
| FT-04 | 客户管理 | 可正常添加客户 | 添加测试客户 |
| FT-05 | 照片上传功能 | 可选择并保存照片 | 上传测试照片 |
| FT-06 | 数据持久化 | 关闭后重新打开数据保留 | 重启应用验证 |

### 3.3 版本标识规则

#### 3.3.1 版本号命名规则

采用 **语义化版本 (Semantic Versioning)**:
```
主版本号.次版本号.修订号
  v        4        7        0
```

| 级别 | 变化条件 | 示例 |
|------|---------|------|
| **主版本号** | 重大架构变更、数据库迁移、不兼容的API变更 | v5.0.0 |
| **次版本号** | 新增功能模块、较大功能调整 | v4.8.0 |
| **修订号** | Bug修复、小幅优化、文档更新 | v4.7.1 |

#### 3.3.2 版本验证方法

```powershell
# 方式1: 查看应用内关于页面
# 启动应用 → 点击设置 → 关于

# 方式2: 查看可执行文件属性
# 右键 "折柳建材店管理系统.exe" → 属性 → 详细信息 → 产品版本
```

---

## 4. 目标笔记本电脑系统环境准备要求

### 4.1 操作系统版本要求

| 项目 | 最低要求 | 推荐配置 |
|------|---------|---------|
| **操作系统** | Windows 10 1809 (Build 17763) | Windows 10 22H2 或 Windows 11 |
| **系统类型** | x64 (64位) | x64 |
| **硬盘可用空间** | 2 GB | 5 GB 以上 |
| **内存** | 4 GB RAM | 8 GB RAM |

### 4.2 硬件资源最低配置

| 资源类型 | 最低配置 | 推荐配置 |
|---------|---------|---------|
| **CPU** | Intel Core i3 / AMD Ryzen 3 | Intel Core i5 / AMD Ryzen 5 |
| **内存** | 4 GB | 8 GB |
| **硬盘** | 10 GB 可用空间 | 256 GB SSD |
| **显示器** | 1280x720 | 1920x1080 |

### 4.3 网络环境要求

| 项目 | 要求 |
|------|------|
| **网络连接** | 首次安装需要网络下载依赖（离线安装包除外） |
| **内网环境** | 支持，无需互联网访问 |
| **防火墙** | 允许应用访问本地文件系统 |

### 4.4 权限设置要求

| 项目 | 要求 |
|------|------|
| **用户权限** | 标准用户或管理员均可 |
| **安装权限** | 安装时需要管理员权限或用户账户控制(UAC)批准 |
| **数据目录** | `%APPDATA%\jiancai-manager\` 目录需有写入权限 |

---

## 5. 部署实施具体流程

### 5.1 文件传输方式

#### 5.1.1 方式一：U盘拷贝（推荐）

**操作步骤**:
1. 在打包电脑上，将 `release` 文件夹完整拷贝到 U盘
2. 将U盘插入目标笔记本电脑
3. 将 `release` 文件夹拷贝到目标电脑的指定位置（如桌面）
4. 验证文件完整性

**验证方法**:
```powershell
# 在目标电脑上检查文件是否存在
dir "C:\Users\[用户名]\Desktop\release\win-unpacked\折柳建材店管理系统.exe"
```

#### 5.1.2 方式二：局域网共享

**操作步骤**:
1. 在打包电脑上设置共享文件夹
2. 在目标笔记本电脑上访问共享
3. 复制文件到本地

**命令示例**:
```powershell
# 映射网络驱动器
net use Z: \\打包电脑IP\share

# 复制文件
xcopy /E /I /Y Z:\release\*.* C:\折柳建材\
```

### 5.2 软件安装顺序

#### 5.2.1 安装步骤

```
步骤 1: 检查系统要求
    ↓
步骤 2: 安装应用
    ↓
步骤 3: 首次启动验证
    ↓
步骤 4: 数据迁移（如需要）
```

#### 5.2.2 详细安装操作

**步骤 1: 检查系统要求**

```powershell
# 检查 Windows 版本
winver

# 检查系统架构
echo %PROCESSOR_ARCHITECTURE%
# 应显示: AMD64
```

**步骤 2: 执行安装**

```powershell
# 方式 A: 使用 NSIS 安装向导
# 双击 "折柳建材店管理系统-Setup.exe"
# 按向导提示完成安装

# 方式 B: 便携版本（无需安装）
# 直接运行 release\win-unpacked\折柳建材店管理系统.exe
```

**步骤 3: 安装目录说明**

| 安装类型 | 默认位置 | 可自定义 |
|---------|---------|---------|
| 安装版 | `C:\Program Files\折柳建材店管理系统\` | 是 |
| 便携版 | 任意位置 | 是 |

### 5.3 数据迁移（如需要）

#### 5.3.1 迁移内容

| 数据类型 | 位置 | 迁移方式 |
|---------|------|---------|
| 数据库 | `%APPDATA%\jiancai-manager\prisma.db` | 文件复制 |
| 照片文件 | `%APPDATA%\jiancai-manager\photos\` | 文件夹复制 |
| 系统设置 | `%APPDATA%\jiancai-manager\` | 文件夹复制 |

#### 5.3.2 迁移操作

```powershell
# 1. 在旧电脑上备份数据
xcopy /E /I /Y "%APPDATA%\jiancai-manager" "D:\Backup\Zheliujiancai\"

# 2. 在新电脑上安装应用后，关闭应用

# 3. 复制数据到新电脑
xcopy /E /I /Y "D:\Backup\Zheliujiancai\*" "%APPDATA%\jiancai-manager\"

# 4. 启动应用验证
```

### 5.4 服务注册及自启动配置（可选）

#### 5.4.1 创建桌面快捷方式

```powershell
# 使用 PowerShell 创建快捷方式
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\折柳建材店管理系统.lnk")
$Shortcut.TargetPath = "C:\Program Files\折柳建材店管理系统\折柳建材店管理系统.exe"
$Shortcut.WorkingDirectory = "C:\Program Files\折柳建材店管理系统"
$Shortcut.Description = "折柳建材店管理系统"
$Shortcut.Save()
```

#### 5.4.2 配置开机自启动

```powershell
# 创建注册表项
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "折柳建材店管理系统" /t REG_SZ /d "\"C:\Program Files\折柳建材店管理系统\折柳建材店管理系统.exe\"" /f

# 删除自启动（如果不需要）
# reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "折柳建材店管理系统" /f
```

---

## 6. 部署后功能验证测试流程

### 6.1 系统启动验证

#### 6.1.1 启动测试步骤

| 步骤 | 操作 | 预期结果 |
|------|------|---------|
| 1 | 双击应用图标或快捷方式 | 应用窗口正常打开 |
| 2 | 等待加载（约5-10秒） | 显示主界面 |
| 3 | 观察标题栏 | 显示"折柳建材店管理系统" |
| 4 | 检查系统托盘 | 应用图标出现在托盘区 |

#### 6.1.2 启动日志检查

```powershell
# 应用日志位置
# %APPDATA%\jiancai-manager\logs\

# 查看最新日志
Get-Content "$env:APPDATA\jiancai-manager\logs\*.log" -Tail 50
```

### 6.2 核心功能测试用例

#### 6.2.1 功能测试清单

| 编号 | 功能模块 | 测试步骤 | 预期结果 |
|------|---------|---------|---------|
| T-01 | 首页仪表盘 | 启动应用 | 显示今日销售、库存预警等卡片 |
| T-02 | 商品管理 | 点击"商品管理" | 显示商品列表 |
| T-03 | 新增商品 | 点击"添加商品" | 弹出添加对话框 |
| T-04 | 销售开单 | 点击"销售管理"→"新增销售" | 打开销售开单页面 |
| T-05 | 客户管理 | 点击"客户管理" | 显示客户列表 |
| T-06 | 进货管理 | 点击"进货管理" | 显示进货记录 |
| T-07 | 数据保存 | 执行增删改操作后关闭应用 | 重启后数据保留 |

### 6.3 性能测试指标

#### 6.3.1 性能基准指标

| 指标 | 最低标准 | 良好标准 |
|------|---------|---------|
| 启动时间 | ≤ 15秒 | ≤ 8秒 |
| 页面切换 | ≤ 2秒 | ≤ 1秒 |
| 列表加载(1000条) | ≤ 3秒 | ≤ 2秒 |
| 内存占用(空闲) | ≤ 500MB | ≤ 300MB |

#### 6.3.2 性能测试方法

```powershell
# 测量启动时间
$start = Get-Date
Start-Process "C:\Program Files\折柳建材店管理系统\折柳建材店管理系统.exe"
Start-Sleep -Seconds 10
$end = Get-Date
$duration = ($end - $start).TotalSeconds
Write-Host "启动耗时: $duration 秒"

# 检查内存占用
Get-Process -Name "折柳建材店管理系统" | Select-Object WorkingSet64
```

### 6.4 日志检查及错误排查

#### 6.4.1 日志文件位置

```
%APPDATA%\jiancai-manager\logs\
├── main.log      # 主进程日志
├── error.log     # 错误日志
└── renderer.log  # 渲染进程日志
```

#### 6.4.2 常见错误关键字

| 关键字 | 可能的错误原因 |
|--------|---------------|
| `ECONNREFUSED` | 数据库连接失败 |
| `ENOENT` | 文件不存在 |
| `EACCES` | 权限不足 |
| `prisma.db` | 数据库文件问题 |

---

## 7. 常见问题解决方案

### 7.1 打包过程中可能出现的错误

#### 7.1.1 错误: `node: not found` 或 `npm: not found`

**原因**: Node.js 未正确安装或环境变量未配置

**解决方案**:
1. 重新安装 Node.js (推荐 v20 LTS)
2. 验证环境变量配置
3. 重启终端/电脑

```powershell
# 验证安装
where node
where npm
```

#### 7.1.2 错误: `electron-builder failed with exit code: 1`

**原因**: 可能是缺少依赖、磁盘空间不足或权限问题

**解决方案**:
1. 清理并重新安装依赖
```powershell
rmdir /s /q node_modules
npm install
```

2. 检查磁盘空间
```powershell
wmic logicaldisk get name,size,freespace
```

3. 以管理员身份运行终端

#### 7.1.3 错误: `Prisma Client not generated`

**解决方案**:
```powershell
npx prisma generate
```

### 7.2 部署过程中的常见问题

#### 7.2.1 错误: `应用程序无法启动，丢失 api-ms-win-xxx.dll`

**原因**: Windows 系统组件缺失

**解决方案**:
1. 安装 Visual C++ Redistributable
2. 更新 Windows 至最新版本

#### 7.2.2 错误: `应用程序配置不正确`

**解决方案**:
1. 确认是 64 位系统
2. 重新安装应用

#### 7.2.3 错误: `无法创建数据目录`

**原因**: 权限不足

**解决方案**:
1. 以管理员身份运行应用
2. 检查 %APPDATA% 目录权限

### 7.3 兼容性问题处理

#### 7.3.1 高DPI缩放问题

如果界面显示模糊，在应用的快捷方式属性中:
```
右键快捷方式 → 属性 → 兼容性 → 更改高DPI设置
→ 勾选"替代高DPI缩放行为"
```

#### 7.3.2 Windows Defender 拦截

如果杀毒软件拦截应用:
1. 将应用目录添加到白名单
2. 或暂时禁用实时保护进行测试

### 7.4 回滚机制及操作步骤

#### 7.4.1 回滚步骤

```
1. 关闭应用
2. 卸载当前版本 (通过控制面板 → 程序和功能)
3. 安装上一版本或使用便携版
4. 恢复数据备份 (如需要)
```

#### 7.4.2 数据备份恢复

```powershell
# 恢复步骤
1. 关闭应用
2. 备份当前数据 (可选)
3. 从备份复制数据
   xcopy /E /I /Y "备份路径\*" "%APPDATA%\jiancai-manager\"
4. 启动应用
```

---

## 8. 文档更新与版本控制机制

### 8.1 文档更新记录

| 版本 | 日期 | 变更内容 | 变更人 | 生效版本 |
|------|------|---------|--------|---------|
| v1.0 | 2026-04-16 | 初始版本创建 | 系统 | v3.5 |
| v2.0 | 2026-04-18 | 适配v4.7+版本，更新功能模块清单 | AI | v4.7+ |

### 8.2 版本号命名规则

本文档版本号与项目版本号保持同步，采用语义化版本:

```
主版本号.次版本号.修订号
```

### 8.3 更新内容记录格式

| 字段 | 说明 | 示例 |
|------|------|------|
| 版本 | 当前文档版本号 | v2.0 |
| 日期 | 变更日期 | 2026-04-18 |
| 变更内容 | 具体变更描述 | 适配v4.7+版本 |
| 变更人 | 变更操作人员 | AI |
| 生效版本 | 适用的项目版本 | v4.7+ |

---

## 附录

### 附录A: 快速检查清单

#### A.1 打包前检查

- [ ] Node.js 版本正确 (v18/v20)
- [ ] 已运行 `npm install`
- [ ] 已运行 `npx prisma generate`
- [ ] package.json 版本号已更新
- [ ] 磁盘空间充足 (>5GB)

#### A.2 部署前检查

- [ ] 目标电脑系统版本符合要求
- [ ] 硬件配置满足最低要求
- [ ] 有管理员安装权限
- [ ] 数据已备份 (如需要迁移)

#### A.3 部署后验证

- [ ] 应用可正常启动
- [ ] 核心功能测试通过
- [ ] 数据目录可正常写入
- [ ] 快捷方式创建完成

### 附录B: 关键路径速查

| 用途 | Windows 路径 |
|------|-------------|
| 应用数据目录 | `%APPDATA%\jiancai-manager\` |
| 数据库文件 | `%APPDATA%\jiancai-manager\prisma.db` |
| 照片存储 | `%APPDATA%\jiancai-manager\photos\` |
| 应用日志 | `%APPDATA%\jiancai-manager\logs\` |
| 安装目录 | `C:\Program Files\折柳建材店管理系统\` |

### 附录C: 功能模块清单 (v4.7+)

| 模块 | 文件 | 说明 |
|------|------|------|
| 首页仪表盘 | Dashboard.tsx | 统计数据展示 |
| 库存管理 | Inventory.tsx | 库存列表与预警 |
| 库存盘点 | InventoryCheck.tsx | 库存盘点功能 |
| 商品管理 | Products.tsx | 商品列表 |
| 添加商品 | ProductNew.tsx | 新增商品 |
| 编辑商品 | ProductEdit.tsx | 编辑商品 |
| 品牌管理 | Brands.tsx | 品牌维护 |
| 联系人管理 | Contacts.tsx | 联系人维护 |
| 结账主体 | Entities.tsx | 主体管理 |
| 项目管理 | Projects.tsx | 项目管理 |
| 客户管理 | Customers.tsx | 客户管理 |
| 进货管理 | Purchases.tsx | 进货记录 |
| 进货历史 | PurchaseHistory.tsx | 历史进货 |
| 销售管理 | Sales.tsx | 销售列表 |
| 新增销售 | SaleNew.tsx | 销售开单 |
| 销售草稿 | SaleDrafts.tsx | 草稿管理 |
| 回扣管理 | Rebates.tsx | 回扣记录 |
| 配送管理 | Deliveries.tsx | 配送管理 |
| 挂账结算 | Settlements.tsx | 结算管理 |
| 催账记录 | Collections.tsx | 催账管理 |
| 对账单 | Statements.tsx | 对账管理 |
| 照片管理 | PhotoManagement.tsx | 照片管理 |
| 报表统计 | Reports.tsx | 各类报表 |
| 审计日志 | AuditLogs.tsx | 操作日志 |
| 历史账单 | LegacyBills.tsx | 历史账单 |
| 系统设置 | Settings.tsx | 系统配置 |

---

*本文档由系统自动生成*
*最后更新: 2026-04-18*
