/**
 * UI 节点接口
 */
export interface UINode {
  id: string;
  type: string;
  name?: string;
  pid?: number;
  frameNodeId?: string;
  frameNodeTag?: string;
  parentId?: string;
  children: UINode[];
  properties: Record<string, any>;
}

/**
 * 解析 RenderService client 输出
 */
export class RenderServiceParser {
  /**
   * 解析 UI 组件树输出
   * @param output hidumper RenderService client 输出
   * @returns UI 节点数组（按 pid 分组）
   */
  static parse(output: string): Map<number, UINode> {
    const nodes = new Map<number, UINode>();
    const lines = output.split('\n');

    let currentPid: number | null = null;
    const stack: UINode[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      // 解析 pid 行: | pid[1937]
      const pidMatch = line.match(/\|\s*pid\[(\d+)\]/);
      if (pidMatch) {
        currentPid = parseInt(pidMatch[1]);
        // 创建根节点
        const rootNode: UINode = {
          id: `pid-${currentPid}`,
          type: 'ProcessRoot',
          pid: currentPid,
          children: [],
          properties: {},
        };
        nodes.set(currentPid, rootNode);
        stack.length = 0;
        stack.push(rootNode);
        continue;
      }

      // 解析节点行
      const depth = this.countDepth(line);
      if (depth > 0) {
        const node = this.parseNodeLine(line);
        if (node) {
          // 调整栈深度
          while (stack.length > depth) {
            stack.pop();
          }

          if (stack.length > 0) {
            const parent = stack[stack.length - 1];
            parent.children.push(node);
            node.parentId = parent.id;
          }

          stack.push(node);
        }
      }
    }

    return nodes;
  }

  /**
   * 计算行深度（通过 | 符号数量）
   */
  private static countDepth(line: string): number {
    let count = 0;
    for (const char of line) {
      if (char === '|') count++;
      else if (char !== ' ') break;
    }
    return count;
  }

  /**
   * 解析节点行
   * 示例: | CanvasNode[8319351652356], parent[8319351652355], frameNodeId[1]
   */
  private static parseNodeLine(line: string): UINode | null {
    // 提取节点类型和 ID
    const nodeTypeMatch = line.match(/\|\s*(\w+)\[(\d+)\]/);
    if (!nodeTypeMatch) return null;

    const type = nodeTypeMatch[1];
    const id = nodeTypeMatch[2];

    const node: UINode = {
      id: `${type}-${id}`,
      type: type,
      children: [],
      properties: {},
    };

    // 提取 parent
    const parentMatch = line.match(/parent\[(\d+)\]/);
    if (parentMatch) {
      node.parentId = parentMatch[1];
    }

    // 提取 frameNodeId
    const frameNodeIdMatch = line.match(/frameNodeId\[(\d+)\]/);
    if (frameNodeIdMatch) {
      node.frameNodeId = frameNodeIdMatch[1];
    }

    // 提取 frameNodeTag
    const frameNodeTagMatch = line.match(/frameNodeTag\[(\w+)\]/);
    if (frameNodeTagMatch) {
      node.frameNodeTag = frameNodeTagMatch[1];
    }

    // 提取 name
    const nameMatch = line.match(/name\[([^\]]+)\]/);
    if (nameMatch) {
      node.name = nameMatch[1];
    }

    // 提取 instanceId
    const instanceIdMatch = line.match(/instanceId\[(\-?\d+)\]/);
    if (instanceIdMatch) {
      node.properties.instanceId = instanceIdMatch[1];
    }

    // 提取 modifiers
    const modifiersMatch = line.match(/modifiers\[(.*?)\]/);
    if (modifiersMatch) {
      const modifiersStr = modifiersMatch[1];
      const modifiers = this.parseModifiers(modifiersStr);
      node.properties.modifiers = modifiers;
    }

    return node;
  }

  /**
   * 解析 modifiers 字符串
   */
  private static parseModifiers(modifiersStr: string): Record<string, any> {
    const modifiers: Record<string, any> = {};

    // 简单解析，按逗号分割
    const parts = modifiersStr.split(',').map(s => s.trim());

    for (const part of parts) {
      if (!part) continue;

      // BackgroundColor[RGBA-0x00000000, colorSpace: DISPLAY_P3]
      const bgMatch = part.match(/BackgroundColor\[(.+?)\]/);
      if (bgMatch) {
        modifiers.backgroundColor = bgMatch[1];
        continue;
      }

      // Bounds, Frame
      if (part === 'Bounds') {
        modifiers.bounds = true;
      } else if (part === 'Frame') {
        modifiers.frame = true;
      }
    }

    return modifiers;
  }

  /**
   * 获取指定 pid 的 UI 树
   */
  static getTreeByPid(output: string, pid: number): UINode | null {
    const trees = this.parse(output);
    return trees.get(pid) || null;
  }

  /**
   * 转换为 JSON 树结构
   */
  static toJSON(output: string): Record<number, object> {
    const trees = this.parse(output);
    const result: Record<number, object> = {};

    trees.forEach((node, pid) => {
      result[pid] = this.nodeToObject(node);
    });

    return result;
  }

  /**
   * 节点转普通对象（移除循环引用）
   */
  private static nodeToObject(node: UINode): object {
    return {
      id: node.id,
      type: node.type,
      name: node.name,
      pid: node.pid,
      frameNodeId: node.frameNodeId,
      frameNodeTag: node.frameNodeTag,
      properties: node.properties,
      children: node.children.map(child => this.nodeToObject(child)),
    };
  }

  /**
   * 获取 UI 树摘要信息
   */
  static getSummary(output: string): string {
    const trees = this.parse(output);

    const lines: string[] = ['## UI 树摘要\n'];
    lines.push(`\n总进程数: ${trees.size}\n`);

    for (const [pid, root] of trees) {
      const stats = this.countNodes(root);
      const typeStats = this.countByType(root);

      lines.push(`### 进程 ${pid}`);
      lines.push(`- 总节点数: ${stats.total}`);
      lines.push(`- 最大深度: ${stats.maxDepth}`);
      lines.push(`- 类型分布:`);

      for (const [type, count] of Object.entries(typeStats).sort((a, b) => b[1] - a[1])) {
        lines.push(`  - ${type}: ${count}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * 统计节点数量和最大深度
   */
  private static countNodes(node: UINode): { total: number; maxDepth: number } {
    let total = 0;
    let maxDepth = 0;

    const traverse = (n: UINode, depth: number) => {
      total++;
      maxDepth = Math.max(maxDepth, depth);
      for (const child of n.children) {
        traverse(child, depth + 1);
      }
    };

    traverse(node, 0);
    return { total, maxDepth };
  }

  /**
   * 按类型统计节点
   */
  private static countByType(node: UINode): Record<string, number> {
    const counts: Record<string, number> = {};

    const traverse = (n: UINode) => {
      counts[n.type] = (counts[n.type] || 0) + 1;
      for (const child of n.children) {
        traverse(child);
      }
    };

    traverse(node);
    return counts;
  }

  /**
   * 紧凑模式：只返回关键信息
   */
  static toCompactJSON(output: string, pid?: number, maxDepth: number = 50): string {
    const trees = this.parse(output);

    const result: Record<number, object> = {};
    const pids = pid ? [pid] : Array.from(trees.keys()).sort((a, b) => a - b);

    for (const currentPid of pids) {
      const node = trees.get(currentPid);
      if (node) {
        result[currentPid] = this.toCompactNode(node, 0, maxDepth);
      }
    }

    return JSON.stringify(result, null, 2);
  }

  /**
   * 节点转紧凑格式（只保留关键信息）
   */
  private static toCompactNode(node: UINode, depth: number, maxDepth: number): object {
    const obj: any = {
      type: node.type,
    };

    if (node.name) obj.name = node.name;
    if (node.frameNodeId) obj.frameNodeId = node.frameNodeId;
    if (node.frameNodeTag) obj.frameNodeTag = node.frameNodeTag;

    // 只在有子节点且未达到最大深度时递归
    if (node.children.length > 0 && depth < maxDepth) {
      obj.children = node.children.map(c => this.toCompactNode(c, depth + 1, maxDepth));
      if (obj.children.length === 0) delete obj.children;
    }

    return obj;
  }

  /**
   * 搜索节点
   */
  static searchNodes(
    output: string,
    options: {
      pid?: number;
      frameNodeTag?: string;
      nodeName?: string;
      nodeType?: string;
      maxResults?: number;
    } = {}
  ): string {
    const trees = this.parse(output);
    const results: Array<{ pid: number; path: string[]; node: any }> = [];

    const maxResults = options.maxResults || 50;

    for (const [pid, root] of trees) {
      if (options.pid && pid !== options.pid) continue;

      const search = (node: UINode, path: string[]) => {
        if (results.length >= maxResults) return;

        // 检查匹配条件
        let match = true;
        if (options.frameNodeTag && node.frameNodeTag !== options.frameNodeTag) match = false;
        if (options.nodeName && node.name && !node.name.includes(options.nodeName)) match = false;
        if (options.nodeType && node.type !== options.nodeType) match = false;

        if (match && (options.frameNodeTag || options.nodeName || options.nodeType)) {
          results.push({
            pid,
            path: [...path, node.type + (node.name ? `(${node.name})` : '')],
            node: {
              type: node.type,
              name: node.name,
              frameNodeId: node.frameNodeId,
              frameNodeTag: node.frameNodeTag,
            },
          });
        }

        for (const child of node.children) {
          search(child, [...path, node.type + (node.name ? `(${node.name})` : '')]);
        }
      };

      search(root, []);
      if (results.length >= maxResults) break;
    }

    // 格式化输出
    let resultText = `## 搜索结果 (${results.length} 个)\n\n`;
    for (const result of results) {
      resultText += `**PID ${result.pid}**\n`;
      resultText += `路径: ${result.path.join(' > ')}\n`;
      resultText += `- type: ${result.node.type}\n`;
      if (result.node.name) resultText += `- name: ${result.node.name}\n`;
      if (result.node.frameNodeId) resultText += `- frameNodeId: ${result.node.frameNodeId}\n`;
      if (result.node.frameNodeTag) resultText += `- frameNodeTag: ${result.node.frameNodeTag}\n`;
      resultText += '\n';
    }

    return resultText;
  }
}
