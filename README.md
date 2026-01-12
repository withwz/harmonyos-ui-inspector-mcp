# HarmonyOS RN UI Inspector MCP

一个用于查看鸿蒙系统 UI 的 MCP (Model Context Protocol) 服务器。通过 `hidumper` 命令获取鸿蒙设备的窗口列表、UI 组件树和截图。

## 功能

| 工具 | 功能 | 数据源 |
|------|------|--------|
| `list_windows` | 列出所有窗口 | WindowManagerService |
| `get_ui_tree` | 获取 UI 组件树 | RenderService |
| `list_abilities` | 列出所有应用 | AbilityManagerService |
| `screenshot` | 获取设备截图 | snapshot_display |

## 安装

```bash
npm install
npm run build
```

## 配置

### 方式一：项目级配置

在项目根目录创建 `.mcp.json`：

```json
{
  "mcpServers": {
    "harmonyos-ui": {
      "command": "node",
      "args": ["/absolute/path/to/harmonyos-rn-ui-inspector-mcp/server/dist/index.js"],
      "env": {
        "HDC_PATH": "/absolute/path/to/hdc"
      }
    }
  }
}
```

### 方式二：全局配置（推荐）

在 `~/Library/Application Support/Claude/claude_desktop_config.json` 中添加：

```json
{
  "mcpServers": {
    "harmonyos-ui": {
      "command": "node",
      "args": ["/absolute/path/to/harmonyos-rn-ui-inspector-mcp/server/dist/index.js"],
      "env": {
        "HDC_PATH": "/absolute/path/to/hdc"
      }
    }
  }
}
```

### ⚠️ 重要提示

1. **必须使用绝对路径**，相对路径不工作
2. **必须包含 `mcpServers` 顶层键**，否则配置无法解析
3. **配置修改后必须完全重启 Claude Code** 才能生效

## 开发

```bash
# 安装依赖
npm install

# 开发模式（监听文件变化）
npm run dev

# 编译
npm run build

# 启动服务器
npm start
```

## 使用

重启 Claude Code 后，在对话中直接使用 MCP 工具：

```
// 列出所有窗口
请帮我列出当前鸿蒙设备的所有窗口

// 获取 UI 组件树
请获取进程 31950 的 UI 组件树

// 截图
请帮我截取当前屏幕
```

## 技术栈

- Node.js + TypeScript
- MCP SDK `@modelcontextprotocol/sdk`
- hdc (HarmonyOS Device Connector)
- hidumper

## 参考资料

- [HiDumper 命令 - 华为开发者](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/hidumper)
- [OpenHarmony hidumper 文档](https://gitee.com/openharmony/docs/blob/OpenHarmony-5.0.3-Release/zh-cn/application-dev/dfx/hidumper.md)
- [MCP 协议](https://modelcontextprotocol.io/)

## License

MIT
