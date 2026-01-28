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
      description: '获取鸿蒙系统 UI 组件树。支持多种模式：summary(摘要)、compact(紧凑)、full(完整)、search(搜索)',
      inputSchema: {
        type: 'object',
        properties: {
          pid: {
            type: 'number',
            description: '可选：指定进程 ID，只获取该进程的 UI 树',
          },
          format: {
            type: 'string',
            enum: ['summary', 'compact', 'full', 'text', 'search'],
            description: '可选：输出格式\n- summary: 摘要信息（推荐，数据量小）\n- compact: 紧凑 JSON（只包含关键信息）\n- full: 完整 JSON（数据量大）\n- text: 原始文本\n- search: 搜索模式（需配合搜索参数）',
          },
          maxDepth: {
            type: 'number',
            description: '可选：限制最大深度（仅 compact/full 模式有效，默认 50）',
          },
          // 搜索参数
          frameNodeTag: {
            type: 'string',
            description: '可选：按 frameNodeTag 搜索节点（仅 search 模式有效）',
          },
          nodeName: {
            type: 'string',
            description: '可选：按节点名称搜索（仅 search 模式有效）',
          },
          nodeType: {
            type: 'string',
            description: '可选：按节点类型搜索，如 CanvasNode、SurfaceNode（仅 search 模式有效）',
          },
          maxResults: {
            type: 'number',
            description: '可选：最大结果数（仅 search 模式有效，默认 50）',
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
        const format = (args?.format as string) || 'summary';
        const pid = args?.pid as number | undefined;
        const maxDepth = (args?.maxDepth as number) || 50;

        // 摘要模式（推荐，数据量小）
        if (format === 'summary') {
          const summary = RenderServiceParser.getSummary(output);
          return {
            content: [{ type: 'text', text: summary }],
          };
        }

        // 紧凑模式（只包含关键信息）
        if (format === 'compact') {
          const json = RenderServiceParser.toCompactJSON(output, pid, maxDepth);
          return {
            content: [{ type: 'text', text: json }],
          };
        }

        // 搜索模式
        if (format === 'search') {
          const frameNodeTag = args?.frameNodeTag as string | undefined;
          const nodeName = args?.nodeName as string | undefined;
          const nodeType = args?.nodeType as string | undefined;
          const maxResults = (args?.maxResults as number) || 50;

          if (!frameNodeTag && !nodeName && !nodeType) {
            return {
              content: [{ type: 'text', text: '搜索模式需要指定至少一个搜索参数：frameNodeTag、nodeName 或 nodeType' }],
              isError: true,
            };
          }

          const results = RenderServiceParser.searchNodes(output, {
            pid,
            frameNodeTag,
            nodeName,
            nodeType,
            maxResults,
          });
          return {
            content: [{ type: 'text', text: results }],
          };
        }

        // 原始文本模式
        if (format === 'text') {
          return {
            content: [{ type: 'text', text: output }],
          };
        }

        // 完整 JSON 模式（数据量大，默认使用摘要模式）
        const trees = RenderServiceParser.toJSON(output);
        const result = pid ? { [pid]: trees[pid as any] || {} } : trees;
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
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
