# MCP 技术学习

## 什么是 MCP？

**MCP (Model Context Protocol)** 是 Claude 用于连接外部服务和 API 的协议。通过 MCP，Claude 可以使用外部工具来扩展能力。

## MCP 架构

```
┌─────────────────────────────────────────────────────┐
│                    Claude Client                    │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │    LLM       │◄─┤   MCP        │◄─┤  MCP Server │ │
│  │              │  │   Client     │  │  (stdio)    │ │
│  └──────────────┘  └──────────────┘  └──────┬──────┘ │
└─────────────────────────────────────────────────────┘
                                              │
                                         stdin/stdout
```

## MCP 服务器类型

### stdio (我们用这个)

本地进程通信，通过 stdin/stdout 交换 JSON-RPC 消息。

**优点**:
- 简单易实现
- 适合本地工具
- 无需网络配置

**配置示例** (.mcp.json):
```json
{
  "harmonyos-ui": {
    "command": "node",
    "args": ["${CLAUDE_PLUGIN_ROOT}/server/dist/index.js"],
    "env": {
      "HDC_PATH": "/path/to/hdc"
    }
  }
}
```

### SSE (Server-Sent Events)

云端服务，通过 HTTP 连接。

### HTTP/WebSocket

REST API 或实时通信。

---

## MCP 消息协议

### 服务器 → Claude (工具发现)

```json
{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "result": {
    "tools": [
      {
        "name": "list_windows",
        "description": "列出所有窗口",
        "inputSchema": {
          "type": "object",
          "properties": {}
        }
      }
    ]
  }
}
```

### Claude → 服务器 (工具调用)

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "list_windows",
    "arguments": {}
  }
}
```

### 服务器 → Claude (返回结果)

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "窗口列表数据..."
      }
    ]
  }
}
```

---

## Claude Code 插件集成

### 目录结构

```
~/.claude/plugins/harmonyos-rn-ui/
├── plugin.json           # 插件配置
├── .mcp.json            # MCP 服务器配置
├── server/
│   ├── src/
│   │   ├── index.ts     # MCP 服务器入口
│   │   └── tools/       # 工具实现
│   ├── package.json
│   └── tsconfig.json
└── commands/            # 可选：插件命令
```

### plugin.json

```json
{
  "name": "harmonyos-rn-ui",
  "version": "0.1.0",
  "description": "鸿蒙 UI 查看工具",
  "author": "your-name"
}
```

### .mcp.json

```json
{
  "harmonyos-ui": {
    "command": "node",
    "args": ["${CLAUDE_PLUGIN_ROOT}/server/dist/index.js"],
    "env": {
      "HDC_PATH": "${HDC_PATH:-hdc}",
      "LOG_LEVEL": "debug"
    }
  }
}
```

---

## MCP SDK 使用

### 安装依赖

```bash
npm install @modelcontextprotocol/sdk
npm install typescript @types/node --save-dev
```

### 服务器代码框架

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// 创建服务器
const server = new Server(
  {
    name: 'harmonyos-ui-server',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 注册工具列表
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'list_windows',
      description: '列出鸿蒙系统所有窗口',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
  ],
}));

// 注册工具调用处理
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'list_windows':
      // 执行命令获取窗口列表
      return { content: [{ type: 'text', text: '...' }] };
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// 启动服务器
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
```

---

## 环境变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `${CLAUDE_PLUGIN_ROOT}` | 插件目录绝对路径 | `/Users/xxx/.claude/plugins/harmonyos-rn-ui` |
| `${HDC_PATH}` | hdc 可执行文件路径 | `/path/to/hdc` |

---

## 调试技巧

1. **启用调试模式**: Claude Code 启动时加 `--debug` 参数
2. **查看 MCP 状态**: 在 Claude 中运行 `/mcp` 命令
3. **测试工具**: 确认工具在 `/mcp` 输出中出现后再使用

---

## 参考资料

- 官方文档: https://modelcontextprotocol.io/
- MCP SDK: `@modelcontextprotocol/sdk`
- 本地参考: `~/.claude/plugins/marketplaces/claude-plugins-official/plugins/plugin-dev/skills/mcp-integration/`
