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
import { UIController } from './automation/controller.js';

// 创建 HDC 实例
const hdc = new HDC();
// 创建 UIController 实例
const uiController = new UIController(hdc);

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
    {
      name: 'tap',
      description: '点击屏幕指定位置',
      inputSchema: {
        type: 'object',
        properties: {
          x: {
            type: 'number',
            description: 'X 坐标',
          },
          y: {
            type: 'number',
            description: 'Y 坐标',
          },
        },
        required: ['x', 'y'],
      },
    },
    {
      name: 'swipe',
      description: '滑动操作',
      inputSchema: {
        type: 'object',
        properties: {
          x1: {
            type: 'number',
            description: '起始 X 坐标',
          },
          y1: {
            type: 'number',
            description: '起始 Y 坐标',
          },
          x2: {
            type: 'number',
            description: '结束 X 坐标',
          },
          y2: {
            type: 'number',
            description: '结束 Y 坐标',
          },
          duration: {
            type: 'number',
            description: '滑动持续时间（毫秒），默认 300ms',
          },
        },
        required: ['x1', 'y1', 'x2', 'y2'],
      },
    },
    {
      name: 'press_key',
      description: '按键操作',
      inputSchema: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: '按键名称（如: Back/Home/Power）',
          },
        },
        required: ['code'],
      },
    },
    {
      name: 'text',
      description: '⚠️ 在焦点处输入文字（注意：当前 HarmonyOS 版本上不可用）',
      inputSchema: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: '要输入的文字',
          },
        },
        required: ['text'],
      },
    },
    {
      name: 'smart_tap',
      description: '根据文字自动点击目标元素',
      inputSchema: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: '目标文字',
          },
          pid: {
            type: 'number',
            description: '可选：指定进程 ID，用于限定搜索范围',
          },
        },
        required: ['text'],
      },
    },
    {
      name: 'start_app',
      description: '启动鸿蒙应用',
      inputSchema: {
        type: 'object',
        properties: {
          bundleName: {
            type: 'string',
            description: '应用包名（如：com.example.app）',
          },
          abilityName: {
            type: 'string',
            description: '可选：Ability 名称（如：MainAbility），如果不指定则使用包名.MainAbility',
          },
        },
        required: ['bundleName'],
      },
    },
    {
      name: 'stop_app',
      description: '停止鸿蒙应用',
      inputSchema: {
        type: 'object',
        properties: {
          bundleName: {
            type: 'string',
            description: '应用包名（如：com.example.app）',
          },
        },
        required: ['bundleName'],
      },
    },
    {
      name: 'restart_app',
      description: '重启鸿蒙应用',
      inputSchema: {
        type: 'object',
        properties: {
          bundleName: {
            type: 'string',
            description: '应用包名（如：com.example.app）',
          },
          abilityName: {
            type: 'string',
            description: '可选：Ability 名称（如：MainAbility），如果不指定则使用包名.MainAbility',
          },
        },
        required: ['bundleName'],
      },
    },
    {
      name: 'get_app_status',
      description: '获取鸿蒙应用状态信息',
      inputSchema: {
        type: 'object',
        properties: {
          bundleName: {
            type: 'string',
            description: '应用包名（如：com.example.app）',
          },
        },
        required: ['bundleName'],
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

      case 'tap': {
        const x = args?.x as number;
        const y = args?.y as number;

        if (x === undefined || y === undefined) {
          return {
            content: [{ type: 'text', text: '错误：缺少必需参数 x 或 y' }],
            isError: true,
          };
        }

        const output = await hdc.tap(x, y);

        return {
          content: [{ type: 'text', text: `成功点击坐标 (${x}, ${y})\n${output}` }],
        };
      }

      case 'swipe': {
        const x1 = args?.x1 as number;
        const y1 = args?.y1 as number;
        const x2 = args?.x2 as number;
        const y2 = args?.y2 as number;
        const duration = (args?.duration as number) || 300;

        if (x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) {
          return {
            content: [{ type: 'text', text: '错误：缺少必需参数 x1, y1, x2 或 y2' }],
            isError: true,
          };
        }

        const output = await hdc.swipe(x1, y1, x2, y2, duration);

        return {
          content: [{ type: 'text', text: `成功从 (${x1}, ${y1}) 滑动到 (${x2}, ${y2})，持续 ${duration}ms\n${output}` }],
        };
      }

      case 'press_key': {
        const code = args?.code as string;

        if (code === undefined) {
          return {
            content: [{ type: 'text', text: '错误：缺少必需参数 code' }],
            isError: true,
          };
        }

        const output = await hdc.pressKey(code);

        return {
          content: [{ type: 'text', text: `成功按键: ${code}\n${output}` }],
        };
      }

      case 'text': {
        const text = args?.text as string;

        if (text === undefined) {
          return {
            content: [{ type: 'text', text: '错误：缺少必需参数 text' }],
            isError: true,
          };
        }

        const output = await hdc.inputText(text);

        return {
          content: [{ type: 'text', text: `成功输入文字: "${text}"\n${output}` }],
        };
      }

      case 'smart_tap': {
        const text = args?.text as string;
        const pid = args?.pid as number | undefined;

        if (text === undefined) {
          return {
            content: [{ type: 'text', text: '错误：缺少必需参数 text' }],
            isError: true,
          };
        }

        const result = await uiController.smartTap(text, pid);

        if (result.success) {
          let responseText = result.message;
          if (result.coordinates) {
            responseText += `\n坐标: (${result.coordinates.x}, ${result.coordinates.y})`;
          }
          if (result.element) {
            responseText += `\n元素类型: ${result.element.type}${result.element.name ? ` (${result.element.name})` : ''}`;
          }
          // 如果有候选列表，显示前几个相似结果
          if (result.candidates && result.candidates.length > 1) {
            responseText += `\n\n其他相似结果 (共 ${result.candidates.length - 1} 个):`;
            for (let i = 1; i < Math.min(4, result.candidates.length); i++) {
              const cand = result.candidates[i];
              responseText += `\n  ${i}. ${cand.element.type}${cand.element.name ? `(${cand.element.name})` : ''} - 匹配度: ${cand.score}%`;
            }
          }
          return {
            content: [{ type: 'text', text: responseText }],
          };
        } else {
          let responseText = result.message;
          // 显示候选列表帮助调试
          if (result.candidates && result.candidates.length > 0) {
            responseText += `\n\n找到的相似元素 (共 ${result.candidates.length} 个):`;
            for (let i = 0; i < Math.min(5, result.candidates.length); i++) {
              const cand = result.candidates[i];
              responseText += `\n  ${i + 1}. ${cand.element.type}${cand.element.name ? `(${cand.element.name})` : ''} - 匹配度: ${cand.score}%`;
            }
          } else {
            responseText += `\n提示: 请确认文字是否正确，或尝试使用更模糊的搜索词`;
          }
          return {
            content: [{ type: 'text', text: responseText }],
            isError: true,
          };
        }
      }

      case 'start_app': {
        const bundleName = args?.bundleName as string;
        const abilityName = args?.abilityName as string | undefined;

        if (bundleName === undefined) {
          return {
            content: [{ type: 'text', text: '错误：缺少必需参数 bundleName' }],
            isError: true,
          };
        }

        const result = await hdc.startApp(bundleName, abilityName);

        if (result.success) {
          return {
            content: [{ type: 'text', text: result.message }],
          };
        } else {
          return {
            content: [{ type: 'text', text: result.message }],
            isError: true,
          };
        }
      }

      case 'stop_app': {
        const bundleName = args?.bundleName as string;

        if (bundleName === undefined) {
          return {
            content: [{ type: 'text', text: '错误：缺少必需参数 bundleName' }],
            isError: true,
          };
        }

        const result = await hdc.stopApp(bundleName);

        if (result.success) {
          return {
            content: [{ type: 'text', text: result.message }],
          };
        } else {
          return {
            content: [{ type: 'text', text: result.message }],
            isError: true,
          };
        }
      }

      case 'restart_app': {
        const bundleName = args?.bundleName as string;
        const abilityName = args?.abilityName as string | undefined;

        if (bundleName === undefined) {
          return {
            content: [{ type: 'text', text: '错误：缺少必需参数 bundleName' }],
            isError: true,
          };
        }

        const result = await hdc.restartApp(bundleName, abilityName);

        if (result.success) {
          return {
            content: [{ type: 'text', text: result.message }],
          };
        } else {
          return {
            content: [{ type: 'text', text: result.message }],
            isError: true,
          };
        }
      }

      case 'get_app_status': {
        const bundleName = args?.bundleName as string;

        if (bundleName === undefined) {
          return {
            content: [{ type: 'text', text: '错误：缺少必需参数 bundleName' }],
            isError: true,
          };
        }

        const result = await hdc.getAppStatus(bundleName);

        if (result.success) {
          let responseText = `## 应用状态: ${bundleName}\n\n`;
          responseText += `运行状态: ${result.isRunning ? '运行中' : '未运行'}\n\n`;

          if (result.abilities.length > 0) {
            responseText += `### Abilities (${result.abilities.length})\n\n`;
            responseText += '| Ability 名称 | 状态 |\n';
            responseText += '|-------------|------|\n';
            for (const ability of result.abilities) {
              responseText += `| ${ability.name} | ${ability.state} |\n`;
            }
          } else {
            responseText += `未找到该应用的 Ability 实例\n`;
          }

          responseText += `\n${result.message}`;

          return {
            content: [{ type: 'text', text: responseText }],
          };
        } else {
          return {
            content: [{ type: 'text', text: result.message }],
            isError: true,
          };
        }
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

  // 添加优雅关闭处理
  const shutdown = async (signal: string) => {
    console.error(`\n收到 ${signal} 信号，正在关闭服务器...`);
    try {
      // 这里可以添加清理逻辑，例如关闭连接等
      console.error('服务器已优雅关闭');
      process.exit(0);
    } catch (error) {
      console.error('关闭服务器时出错:', error);
      process.exit(1);
    }
  };

  // 监听进程信号
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
