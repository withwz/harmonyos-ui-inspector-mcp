# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个 MCP (Model Context Protocol) 服务器，用于查看鸿蒙系统 UI 状态。通过 `hidumper` 命令获取鸿蒙设备的窗口列表、UI 组件树、应用列表和截图。

## 开发命令

```bash
# 安装依赖
npm install

# 开发模式（监听文件变化自动编译）
npm run dev

# 编译 TypeScript
npm run build

# 启动 MCP 服务器（用于调试）
npm start
```

## 架构设计

### 整体结构

项目采用经典的解析器模式，将鸿蒙 hidumper 命令的文本输出解析为结构化数据：

```
src/
├── index.ts           # MCP 服务器入口，注册工具和处理请求
├── utils/
│   └── hdc.ts         # HDC 命令执行封装，调用 hidumper 和 snapshot_display
└── parsers/
    ├── windowManager.ts   # 解析 WindowManagerService 输出
    └── renderService.ts   # 解析 RenderService 输出（UI 树）
```

### 数据流

```
Claude Code → MCP Server → HDC 工具类 → hidumper 命令 → 鸿蒙设备
                                       ↓
                                  Parser 类 → 结构化数据 → Claude Code
```

### 核心类

1. **HDC** (`src/utils/hdc.ts`)
   - 封装所有 hdc shell 命令执行
   - 支持通过 `HDC_PATH` 环境变量配置 hdc 路径
   - 主要方法：`listWindows()`, `getUiTree()`, `listAbilities()`, `screenshot()`

2. **WindowManagerParser** (`src/parsers/windowManager.ts`)
   - 解析窗口列表的表格格式输出
   - 返回 `WindowInfo[]` 数组

3. **RenderServiceParser** (`src/parsers/renderService.ts`)
   - 解析 UI 组件树的层级结构（使用 `|` 符号表示层级）
   - 使用栈结构构建树形结构
   - 返回按 pid 分组的 `Map<number, UINode>`

## MCP 工具

| 工具名 | 功能 | 数据源 |
|--------|------|--------|
| `list_windows` | 列出所有窗口 | WindowManagerService |
| `get_ui_tree` | 获取 UI 组件树 | RenderService |
| `list_abilities` | 列出所有应用 | AbilityManagerService |
| `screenshot` | 获取设备截图 | snapshot_display |

## 关键技术细节

### UI 树解析 (`renderService.ts`)

UI 树解析是项目最复杂的部分，需要处理：

1. **深度计算**：通过 `|` 符号数量确定节点层级
2. **栈结构**：维护栈来追踪当前父节点
3. **正则匹配**：提取节点类型、ID、frameNodeId、modifiers 等属性

示例输入：
```
| pid[1937]
| | CanvasNode[8319351652356], parent[8319351652355], frameNodeId[1]
```

### HDC 命令缓冲区

由于 UI 树输出可能非常大，`hdc.ts` 中设置了 `maxBuffer: 10 * 1024 * 1024` (10MB)。

### 环境变量

- `HDC_PATH`：自定义 hdc 可执行文件路径（默认使用系统 PATH 中的 `hdc`）

## 类型定义

- `WindowInfo`：窗口信息（位置、尺寸、pid 等）
- `UINode`：UI 树节点（支持递归 children）
