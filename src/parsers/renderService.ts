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
    let currentNode: UINode | null = null;
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
}
