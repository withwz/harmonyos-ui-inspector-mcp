# HarmonyOS RN UI Inspector MCP

一个用于查看鸿蒙系统 UI 的 MCP (Model Context Protocol) 服务器。通过 `hidumper` 命令获取鸿蒙设备的窗口列表、UI 组件树和截图。

## 功能

| 工具 | 功能 | 数据源 |
|------|------|--------|
| `list_windows` | 列出所有窗口 | WindowManagerService |
| `get_ui_tree` | 获取 UI 组件树 | RenderService |
| `list_abilities` | 列出所有应用 | AbilityManagerService |
| `screenshot` | 获取设备截图 | snapshot_display |

[更多功能查看](./docs/QUICK_REFERENCE.md)

## 安装

```bash
npm install -g harmonyos-rn-ui-mcp-server
```

## 配置

在 `~/.claude.json` 中添加：

```json
// 不要放在项目中，要放在根配置中
{
  "mcpServers": {
    "harmonyos-ui": {
      "command": "npx",
      "args": ["harmonyos-rn-ui-mcp-server"],
      "env": {
        "HDC_PATH": "${HDC_PATH}"
      }
    }
  }
}
```

配置修改后重启 Claude Code 即可。

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

开发模式配置
```json
// 不要放在项目中，要放在根配置中
  "mcpServers": {
    "harmonyos-ui": {
      "command": "node",
      "args": [
        "/xxxxxx/harmonyos-ui-inspector-mcp/dist/index.js"
      ],
      "env": {
        "HDC_PATH": "${HDC_PATH}"
      }
    }
  },
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
