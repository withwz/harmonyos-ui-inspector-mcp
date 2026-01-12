#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { HDC } from './utils/hdc.js';
import { WindowManagerParser } from './parsers/windowManager.js';
import { RenderServiceParser } from './parsers/renderService.js';

// 创建 HDC 实例
const hdc = new HDC();

// 创建 MCP 服务器
const server = new Server(
  {
    name: 'harmonyos-rn-ui-server',
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
      description: '列出鸿蒙系统所有窗口及其信息（名称、进程ID、位置、尺寸等）',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'get_ui_tree',
      description: '获取鸿蒙系统 UI 组件树，包含所有应用的 UI 节点层级结构',
      inputSchema: {
        type: 'object',
        properties: {
          pid: {
            type: 'number',
            description: '可选：指定进程 ID，只获取该进程的 UI 树',
          },
          format: {
            type: 'string',
            enum: ['json', 'text'],
            description: '可选：输出格式，json 或 text（默认 json）',
          },
        },
      },
    },
    {
      name: 'list_abilities',
      description: '列出鸿蒙系统所有应用（Ability）及其状态',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'screenshot',
      description: '获取鸿蒙设备截图',
      inputSchema: {
        type: 'object',
        properties: {
          outputPath: {
            type: 'string',
            description: '本地保存路径（默认 /tmp/screenshot.jpeg）',
          },
        },
      },
    },
  ],
}));

// 注册工具调用处理
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'list_windows': {
        const output = await hdc.listWindows();
        const windows = WindowManagerParser.parse(output);

        // 格式化输出
        let result = `## 窗口列表 (${windows.length} 个)\n\n`;
        result += '| 窗口名 | PID | WinId | 类型 | Z轴 | 位置 |\n';
        result += '|--------|-----|-------|------|-----|------|\n';

        for (const win of windows) {
          result += `| ${win.name} | ${win.pid} | ${win.winId} | ${win.type} | ${win.zOrder} | [${win.rect.x}, ${win.rect.y}, ${win.rect.w}x${win.rect.h}] |\n`;
        }

        return {
          content: [{ type: 'text', text: result }],
        };
      }

      case 'get_ui_tree': {
        const output = await hdc.getUiTree();
        const format = (args?.format as string) || 'json';

        if (format === 'text') {
          // 返回原始文本
          return {
            content: [{ type: 'text', text: output }],
          };
        }

        // JSON 格式
        const pid = args?.pid as number | undefined;
        if (pid) {
          const tree = RenderServiceParser.getTreeByPid(output, pid);
          if (!tree) {
            return {
              content: [{ type: 'text', text: `未找到进程 ${pid} 的 UI 树` }],
            };
          }
          return {
            content: [{ type: 'text', text: JSON.stringify(tree, null, 2) }],
          };
        }

        const trees = RenderServiceParser.toJSON(output);
        return {
          content: [{ type: 'text', text: JSON.stringify(trees, null, 2) }],
        };
      }

      case 'list_abilities': {
        const output = await hdc.listAbilities();

        // 解析并格式化输出
        let result = `## 应用列表\n\n`;
        result += '```\n' + output + '\n```\n';

        return {
          content: [{ type: 'text', text: result }],
        };
      }

      case 'screenshot': {
        const outputPath = (args?.outputPath as string) || '/tmp/screenshot.jpeg';
        const output = await hdc.screenshot('/data/local/tmp/screenshot.jpeg', outputPath);

        return {
          content: [{ type: 'text', text: `截图已保存到: ${outputPath}\n${output}` }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: 'text', text: `错误: ${errorMessage}` }],
      isError: true,
    };
  }
});

// 启动服务器
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('HarmonyOS RN UI MCP Server running');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
