# HarmonyOS UI Inspector MCP - 项目架构

## 项目概述

这是一个基于 **Model Context Protocol (MCP)** 的服务器，用于查看和控制鸿蒙 (HarmonyOS) 系统的 UI 状态。通过 `hidumper` 命令获取鸿蒙设备的窗口列表、UI 组件树、应用列表，并支持截图和自动化 UI 交互操作。

## 技术栈

- **语言**: TypeScript 5.7+
- **运行时**: Node.js (ES Modules)
- **协议**: Model Context Protocol SDK v1.0.4
- **构建工具**: tsc (TypeScript Compiler)

## 项目结构

```
harmonyos-ui-Inspector-mcp/
├── src/
│   ├── index.ts                    # MCP 服务器入口
│   │
│   ├── utils/                      # 工具类层
│   │   └── hdc.ts                  # HDC 命令执行封装
│   │
│   ├── parsers/                    # 解析器层
│   │   ├── windowManager.ts        # 窗口管理器解析
│   │   ├── renderService.ts        # UI 树解析
│   │   └── elementLocator.ts       # 元素定位器
│   │
│   └── automation/                 # 自动化层
│       ├── controller.ts           # UI 控制器
│       ├── elementLocator.ts       # 元素定位器导出
│       ├── workflow.ts             # 工作流引擎
│       ├── index.ts                # 自动化模块导出
│       ├── example.ts              # 使用示例
│       └── workflow.example.ts     # 工作流示例
│
├── docs/                           # 文档
│   ├── ARCHITECTURE.md             # 架构文档 (本文件)
│   ├── FEATURES.md                 # 功能列表
│   └── QUICK_REFERENCE.md          # 快速参考
│
├── dist/                           # 编译输出目录
├── package.json                    # 项目配置
├── tsconfig.json                   # TypeScript 配置
└── .mcp.json                       # MCP 服务器配置
```

## 核心架构

### 三层架构设计

```
┌─────────────────────────────────────────────────────┐
│                  MCP Server Layer                   │
│                    (src/index.ts)                   │
│  - 注册 MCP 工具                                      │
│  - 处理工具调用请求                                    │
│  - 格式化输出结果                                      │
└───────────────────┬─────────────────────────────────┘
                    │
┌───────────────────┴─────────────────────────────────┐
│               Automation Layer                      │
│    (src/automation/controller.ts, workflow.ts)       │
│  - UIController: 高级 UI 控制逻辑                      │
│  - Workflow: 自动化工作流引擎                         │
│  - ElementLocator: 智能元素定位                       │
└───────────────────┬─────────────────────────────────┘
                    │
┌───────────────────┴─────────────────────────────────┐
│                  Parser Layer                       │
│  (src/parsers/windowManager.ts, renderService.ts)   │
│  - WindowManagerParser: 解析窗口列表                  │
│  - RenderServiceParser: 解析 UI 树                    │
│  - ElementLocator: 元素搜索和定位                      │
└───────────────────┬─────────────────────────────────┘
                    │
┌───────────────────┴─────────────────────────────────┐
│                   Utils Layer                       │
│                 (src/utils/hdc.ts)                  │
│  - HDC: 命令执行封装                                  │
│  - Validator: 输入验证                               │
│  - Logger: 日志记录                                  │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
              HarmonyOS Device
              (hdc shell commands)
```

## 数据流

### 典型的 UI 查询流程

```
Claude Code
    │
    ├─ 1. 调用 MCP 工具 (如: get_ui_tree)
    │
    ▼
MCP Server (index.ts)
    │
    ├─ 2. 接收工具请求
    │
    ▼
HDC (utils/hdc.ts)
    │
    ├─ 3. 执行 hidumper 命令
    │
    ▼
HarmonyOS Device
    │
    ├─ 4. 返回原始文本输出
    │
    ▼
Parser (parsers/renderService.ts)
    │
    ├─ 5. 解析文本为结构化数据
    │
    ▼
MCP Server
    │
    ├─ 6. 格式化输出
    │
    ▼
Claude Code (获得结构化 UI 数据)
```

### 自动化操作流程

```
Claude Code
    │
    ├─ 1. 请求操作 (如: smart_tap)
    │
    ▼
UIController (automation/controller.ts)
    │
    ├─ 2. 获取 UI 树
    │
    ▼
ElementLocator (parsers/elementLocator.ts)
    │
    ├─ 3. 搜索目标元素
    │
    ▼
UIController
    │
    ├─ 4. 提取元素坐标
    │
    ▼
HDC (utils/hdc.ts)
    │
    ├─ 5. 执行点击命令
    │
    ▼
HarmonyOS Device
    │
    └─ 6. 执行操作并返回结果
```

## 核心模块详解

### 1. MCP Server Layer (`src/index.ts`)

**职责**: MCP 协议服务器，工具注册和请求路由

**主要功能**:
- 注册 13 个 MCP 工具
- 处理工具调用请求
- 参数验证和错误处理
- 结果格式化

**暴露的工具**:
| 工具名 | 功能 | 输入参数 |
|--------|------|----------|
| `list_windows` | 列出所有窗口 | - |
| `get_ui_tree` | 获取 UI 组件树 | pid?, format?, maxDepth? |
| `list_abilities` | 列出所有应用 | - |
| `screenshot` | 获取截图 | outputPath? |
| `tap` | 点击屏幕 | x, y |
| `swipe` | 滑动屏幕 | x1, y1, x2, y2, duration? |
| `press_key` | 按键操作 | code |
| `smart_tap` | 智能点击 | text, pid? |
| `start_app` | 启动应用 | bundleName, abilityName? |
| `stop_app` | 停止应用 | bundleName |
| `restart_app` | 重启应用 | bundleName, abilityName? |
| `get_app_status` | 获取应用状态 | bundleName |

### 2. Utils Layer (`src/utils/hdc.ts`)

**职责**: 底层命令执行和基础设施

**核心类**:

#### `HDC` 类
```typescript
class HDC {
  // 执行 hdc shell 命令
  async shell(command: string, timeout?: number): Promise<string>

  // 窗口和 UI 操作
  async listWindows(): Promise<string>
  async getUiTree(): Promise<string>
  async listAbilities(): Promise<string>
  async screenshot(remotePath: string, localPath: string): Promise<string>

  // 输入操作
  async tap(x: number, y: number): Promise<string>
  async swipe(x1, y1, x2, y2, duration): Promise<string>
  async pressKey(key: string): Promise<string>

  // 应用管理
  async startApp(bundleName: string, abilityName?: string): Promise<Result>
  async stopApp(bundleName: string): Promise<Result>
  async restartApp(bundleName: string, abilityName?: string): Promise<Result>
  async getAppStatus(bundleName: string): Promise<AppStatus>
}
```

#### `Validator` 类
- 输入参数验证
- 防止命令注入
- 坐标范围检查

#### `Logger` 类
- 结构化日志记录
- 支持 debug/info/warn/error 级别
- 通过 `DEBUG=true` 环境变量启用调试日志

### 3. Parser Layer (`src/parsers/`)

**职责**: 解析 hidumper 原始输出为结构化数据

#### `WindowManagerParser`
```typescript
class WindowManagerParser {
  // 解析窗口列表
  static parse(output: string): WindowInfo[]
}

interface WindowInfo {
  name: string      // 窗口名称
  pid: number       // 进程 ID
  winId: number     // 窗口 ID
  type: string      // 窗口类型
  zOrder: number    // Z 轴顺序
  rect: Rect        // 位置和尺寸
}
```

#### `RenderServiceParser`
```typescript
class RenderServiceParser {
  // 解析 UI 树为 JSON
  static toJSON(output: string): Map<number, UINode>

  // 解析为紧凑 JSON
  static toCompactJSON(output: string, pid?: number, maxDepth?: number): string

  // 生成摘要信息
  static getSummary(output: string): string

  // 搜索节点
  static searchNodes(output: string, options: SearchOptions): string
}

interface UINode {
  id: string              // 节点 ID
  type: string            // 节点类型
  name?: string           // 节点名称
  pid?: number            // 进程 ID
  frameNodeId?: string    // 框架节点 ID
  frameNodeTag?: string   // 框架节点标签
  parentId?: string       // 父节点 ID
  properties: Record<string, unknown>  // 属性
  children: UINode[]      // 子节点
}
```

#### `ElementLocator`
```typescript
class ElementLocator {
  // 基础搜索方法
  static findNodeByText(uiTree: string, text: string): UINode[]
  static findNodeByTag(uiTree: string, tag: string): UINode[]
  static findNodesByName(uiTree: string, name: string): UINode[]

  // 高级搜索方法（带评分）
  static findByText(rootNode: UINode, text: string, exactMatch?: boolean): ElementMatch[]
  static findByProperty(rootNode: UINode, propertyName: string, propertyValue: unknown): ElementMatch[]
  static findByType(rootNode: UINode, type: string): ElementMatch[]
  static findByConditions(rootNode: UINode, conditions: SearchConditions): ElementMatch[]

  // 坐标提取
  static getCoordinates(node: UINode): Coordinates | null

  // 辅助方法
  static getBestMatch(matches: ElementMatch[]): ElementMatch | null
  static formatPath(path: string[]): string
}

interface Coordinates {
  x: number
  y: number
  width: number
  height: number
}

interface ElementMatch {
  node: UINode
  path: string[]
  score: number  // 匹配度 0-100
}
```

### 4. Automation Layer (`src/automation/`)

**职责**: 高级 UI 自动化控制

#### `UIController` 类
```typescript
class UIController {
  // 智能点击
  async smartTap(text: string, pid?: number): Promise<TapResult>

  // 点击元素
  async tapElement(node: UINode): Promise<TapResult>

  // 等待元素
  async waitForElement(text: string, timeout?: number, pid?: number): Promise<UINode | null>

  // 查找元素
  async findElements(conditions: SearchConditions, pid?: number): Promise<UINode[]>

  // 滑动操作
  async swipe(startX: number, startY: number, endX: number, endY: number, duration?: number): Promise<Result>
}
```

#### `Workflow` 类
```typescript
class Workflow {
  // 高级操作
  async launchAndTap(bundleName: string, abilityName: string, targetText: string, timeout?: number): Promise<StepResult>
  async scrollAndTap(targetText: string, maxScrolls?: number): Promise<StepResult>

  // 断言
  async assertExists(text: string): Promise<StepResult>
  async assertTextEquals(elementText: string, expectedText: string): Promise<StepResult>

  // 执行工作流
  async runSequence(steps: WorkflowStep[]): Promise<WorkflowResult>

  // 结果管理
  getResults(): StepResult[]
  clearResults(): void
}

type WorkflowStep =
  | { type: 'launchAndTap'; bundleName: string; abilityName: string; targetText: string; timeout?: number }
  | { type: 'scrollAndTap'; targetText: string; maxScrolls?: number }
  | { type: 'assertExists'; text: string }
  | { type: 'assertTextEquals'; elementText: string; expectedText: string }
  | { type: 'tap'; text: string }
  | { type: 'swipe'; startX: number; startY: number; endX: number; endY: number; duration?: number }
  | { type: 'waitFor'; text: string; timeout?: number }
  | { type: 'delay'; ms: number }
```

## 关键技术实现

### 1. UI 树解析算法

使用**栈结构**解析层级化的 UI 树文本：

```typescript
// 输入格式示例:
// | pid[1937]
// | | CanvasNode[8319351652356], parent[8319351652355]
// | | | TextNode[8319351652357]

// 解析逻辑:
const stack: UINode[] = [];
for (const line of lines) {
  const depth = countDepth(line); // 通过 | 符号数量计算深度
  const node = parseNodeLine(line);

  while (stack.length > depth) {
    stack.pop(); // 回退到父层级
  }

  if (stack.length > 0) {
    stack[stack.length - 1].children.push(node); // 添加为子节点
  }

  stack.push(node); // 入栈
}
```

### 2. 智能元素定位

使用**多维度匹配 + 评分机制**：

```typescript
interface ElementMatch {
  node: UINode
  path: string[]      // 元素路径
  score: number       // 匹配度分数 (0-100)
}

// 评分规则:
// - 精确匹配: 100 分
// - 前缀匹配: 80 分
// - 包含匹配: 60 分
// - 多条件匹配: 累加后归一化
```

### 3. 坐标提取策略

多层次降级策略：

```typescript
// 优先级 1: modifiers.boundsData (结构化数据)
if (modifiers.boundsData) return modifiers.boundsData

// 优先级 2: modifiers.bounds 字符串解析
if (typeof modifiers.bounds === 'string') {
  const match = bounds.match(/\[(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\]/)
  if (match) return parseBounds(match)
}

// 优先级 3: properties.position
if (properties.position) return parsePosition(properties.position)

// 兜底: 返回 null，无法提取坐标
return null
```

### 4. 错误处理策略

**分层错误处理**：

1. **Utils 层**: 抛出异常，记录详细日志
2. **Parser 层**: 返回空结果或抛出解析异常
3. **Controller 层**: 捕获异常，返回 `{ success: boolean, message: string }`
4. **MCP 层**: 捕获异常，返回 `{ isError: true, content: [...] }`

**重试机制**：
- 最大重试次数: 3 次
- 可重试错误: 网络超时、设备无响应
- 不可重试错误: 参数错误、命令格式错误

### 5. 输入验证

**验证规则**：

```typescript
class Validator {
  // bundleName/abilityName: 只允许字母、数字、点、下划线
  static validateBundleName(name: string) {
    if (!/^[a-zA-Z0-9._]+$/.test(name)) {
      throw new Error(`格式无效: ${name}`)
    }
  }

  // 坐标: 必须是有效数字，且在合理范围内
  static validateCoordinate(value: number, name: string) {
    if (value < 0 || value > 100000) {
      throw new Error(`${name} 超出范围`)
    }
  }
}
```

## 并发安全

当前实现**不是并发安全的**：

- `hdc` 和 `uiController` 是单例
- 多个 MCP 工具同时调用可能导致状态混乱
- 特别是 `screenshot` 和其他操作并发时

**建议使用方式**：
- 串行调用工具
- 或在使用者层面控制并发

## 性能考虑

### 优化点

1. **命令超时**: 默认 30 秒，防止挂起
2. **缓冲区大小**: 10MB，处理大型 UI 树
3. **日志级别**: 生产环境只记录 error/warn
4. **解析缓存**: 可选的短期缓存（未实现）

### 性能瓶颈

1. **UI 树解析**: O(n) 复杂度，大型树较慢
2. **网络 I/O**: 每次操作都需要 hdc 命令
3. **字符串操作**: 频繁的 split/match

## 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `HDC_PATH` | hdc 可执行文件路径 | `hdc` |
| `DEBUG` | 启用调试日志 | `false` |

## 使用示例

### 1. 作为 MCP 服务器使用

```bash
# 安装
npm install
npm run build

# 配置 Claude Desktop
# 在 ~/.claude/desktop_config.json 中添加:
{
  "mcpServers": {
    "harmonyos-ui": {
      "command": "node",
      "args": ["/path/to/harmonyos-ui-Inspector-mcp/dist/index.js"]
    }
  }
}
```

### 2. 直接使用自动化 API

```typescript
import { HDC, UIController, ElementLocator } from 'harmonyos-rn-ui-mcp-server'

// 创建实例
const hdc = new HDC()
const controller = new UIController(hdc)

// 智能点击
await controller.smartTap('设置')

// 等待元素
const element = await controller.waitForElement('完成', 10000)

// 查找元素
const elements = await controller.findElements({
  text: '按钮',
  type: 'Button'
})
```

### 3. 使用工作流

```typescript
import { Workflow } from 'harmonyos-rn-ui-mcp-server'

const workflow = new Workflow()

// 执行自动化测试
const result = await workflow.runSequence([
  { type: 'launchAndTap', bundleName: 'com.example.app', abilityName: 'MainAbility', targetText: '首页' },
  { type: 'waitFor', text: '加载完成', timeout: 5000 },
  { type: 'assertExists', text: '用户信息' },
  { type: 'scrollAndTap', targetText: '设置' },
  { type: 'tap', text: '退出' }
])

console.log(result.summary)
```

## 扩展指南

### 添加新的 MCP 工具

1. 在 `src/index.ts` 的工具列表中注册
2. 在 `CallToolRequestSchema` handler 中添加处理逻辑
3. 如需底层支持，在 `HDC` 类中添加方法
4. 如需解析，在 Parser 层添加解析器

### 添加新的自动化操作

1. 在 `UIController` 中添加方法
2. 在 `Workflow` 中添加对应的步骤类型
3. 在 `runSequence` 的 switch 中添加处理逻辑

### 支持新的 HarmonyOS 版本

1. 测试 `hidumper` 输出格式
2. 更新 Parser 正则表达式
3. 更新文档说明

## 依赖关系图

```
index.ts (MCP Server)
  ├── HDC (utils/hdc.ts)
  │   └── child_process.exec
  │
  ├── WindowManagerParser (parsers/windowManager.ts)
  │   └── HDC.listWindows()
  │
  ├── RenderServiceParser (parsers/renderService.ts)
  │   └── HDC.getUiTree()
  │
  └── UIController (automation/controller.ts)
      ├── HDC
      ├── RenderServiceParser
      └── ElementLocator (parsers/elementLocator.ts)
          └── RenderServiceParser

Workflow (automation/workflow.ts)
  ├── HDC
  ├── UIController
  └── ElementLocator
```

## 总结

这个项目采用清晰的**三层架构**设计：

1. **MCP Server Layer**: 协议适配和工具暴露
2. **Automation Layer**: 高级业务逻辑
3. **Parser Layer**: 数据解析和结构化
4. **Utils Layer**: 底层命令执行和基础设施

每一层职责明确，便于维护和扩展。通过 TypeScript 的类型系统保证了代码的健壮性，通过完善的错误处理和日志记录保证了系统的可观测性。
