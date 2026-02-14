import { UINode } from './renderService.js';

/**
 * 节点坐标接口
 */
export interface Coordinates {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 元素匹配接口
 */
export interface ElementMatch {
  node: UINode;
  path: string[];
  score: number; // 匹配度分数（0-100）
}

/**
 * 查找条件接口
 */
export interface SearchConditions {
  text?: string;
  type?: string;
  properties?: Record<string, unknown>;
}

/**
 * 元素定位器类
 * 用于在 UI 树中查找和定位节点
 */
export class ElementLocator {
  /**
   * 按文字搜索节点（兼容旧接口）
   * @param uiTree UI 树字符串输出
   * @param text 要搜索的文字
   * @returns 匹配的节点数组
   */
  static findNodeByText(uiTree: string, text: string): UINode[] {
    const trees = this.parseUITree(uiTree);
    const results: UINode[] = [];

    for (const [, root] of trees) {
      this.searchByText(root, text, results);
    }

    return results;
  }

  /**
   * 按标签搜索节点
   * @param uiTree UI 树字符串输出
   * @param tag frameNodeTag 标签
   * @returns 匹配的节点数组
   */
  static findNodeByTag(uiTree: string, tag: string): UINode[] {
    const trees = this.parseUITree(uiTree);
    const results: UINode[] = [];

    for (const [, root] of trees) {
      this.searchByTag(root, tag, results);
    }

    return results;
  }

  /**
   * 按名称搜索节点
   * @param uiTree UI 树字符串输出
   * @param name 节点名称
   * @returns 匹配的节点数组
   */
  static findNodesByName(uiTree: string, name: string): UINode[] {
    const trees = this.parseUITree(uiTree);
    const results: UINode[] = [];

    for (const [, root] of trees) {
      this.searchByName(root, name, results);
    }

    return results;
  }

  /**
   * 按文本查找元素（高级接口）
   * @param rootNode 根节点
   * @param text 要查找的文本
   * @param exactMatch 是否精确匹配（默认 false，使用包含匹配）
   * @returns 匹配的元素列表
   */
  static findByText(
    rootNode: UINode,
    text: string,
    exactMatch: boolean = false
  ): ElementMatch[] {
    const results: ElementMatch[] = [];
    this.searchTextWithScore(rootNode, text, [], results, exactMatch);
    return results;
  }

  /**
   * 按属性查找元素
   * @param rootNode 根节点
   * @param propertyName 属性名
   * @param propertyValue 属性值
   * @returns 匹配的元素列表
   */
  static findByProperty(
    rootNode: UINode,
    propertyName: string,
    propertyValue: unknown
  ): ElementMatch[] {
    const results: ElementMatch[] = [];
    this.searchProperty(rootNode, propertyName, propertyValue, [], results);
    return results;
  }

  /**
   * 按类型查找元素
   * @param rootNode 根节点
   * @param type 节点类型
   * @returns 匹配的元素列表
   */
  static findByType(rootNode: UINode, type: string): ElementMatch[] {
    const results: ElementMatch[] = [];
    this.searchType(rootNode, type, [], results);
    return results;
  }

  /**
   * 按多个条件查找元素（AND 逻辑）
   * @param rootNode 根节点
   * @param conditions 查找条件
   * @returns 匹配的元素列表
   */
  static findByConditions(
    rootNode: UINode,
    conditions: SearchConditions
  ): ElementMatch[] {
    const results: ElementMatch[] = [];

    this.searchWithConditions(rootNode, conditions, [], results);

    // 按匹配度排序
    results.sort((a, b) => b.score - a.score);

    return results;
  }

  /**
   * 获取最佳匹配（得分最高的元素）
   * @param matches 匹配列表
   * @returns 最佳匹配，如果没有匹配返回 null
   */
  static getBestMatch(matches: ElementMatch[]): ElementMatch | null {
    if (matches.length === 0) return null;

    // 按分数降序排序
    matches.sort((a, b) => b.score - a.score);

    return matches[0];
  }

  /**
   * 格式化元素路径
   * @param path 路径数组
   * @returns 格式化的路径字符串
   */
  static formatPath(path: string[]): string {
    return path.join(' > ');
  }

  /**
   * 获取节点坐标
   * 从 Bounds 或其他位置属性提取坐标信息
   * @param node UI 节点
   * @returns 坐标信息，如果未找到则返回 null
   */
  static getCoordinates(node: UINode): Coordinates | null {
    // 尝试从 properties.modifiers 中获取 bounds 信息
    if (node.properties?.modifiers) {
      const modifiers = node.properties.modifiers as ModifierInfo;

      // 如果有具体的 bounds 数值
      if (modifiers.boundsData) {
        return modifiers.boundsData as Coordinates;
      }

      // 尝试解析 bounds 字符串格式: [x, y, width, height]
      if (typeof modifiers.bounds === 'string') {
        const boundsMatch = modifiers.bounds.match(/\[(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\]/);
        if (boundsMatch) {
          return {
            x: parseInt(boundsMatch[1]),
            y: parseInt(boundsMatch[2]),
            width: parseInt(boundsMatch[3]),
            height: parseInt(boundsMatch[4]),
          };
        }
      }
    }

    // 尝试从 properties 中获取位置信息
    if (node.properties?.position) {
      const pos = node.properties.position as PositionInfo;
      if (pos.x !== undefined && pos.y !== undefined) {
        return {
          x: Number(pos.x),
          y: Number(pos.y),
          width: pos.width ? Number(pos.width) : 0,
          height: pos.height ? Number(pos.height) : 0,
        };
      }
    }

    // 尝试从 frameNodeTag 推断（某些组件有默认位置）
    // 这需要根据实际 UI 框架的具体实现来补充

    return null;
  }

  /**
   * 解析 UI 树字符串
   * 使用 RenderServiceParser 的解析逻辑
   */
  private static parseUITree(uiTree: string): Map<number, UINode> {
    const nodes = new Map<number, UINode>();
    const lines = uiTree.split('\n');

    let currentPid: number | null = null;
    const stack: UINode[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      // 解析 pid 行: | pid[1937]
      const pidMatch = line.match(/\|\s*pid\[(\d+)\]/);
      if (pidMatch) {
        currentPid = parseInt(pidMatch[1]);
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
   */
  private static parseNodeLine(line: string): UINode | null {
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

    const parentMatch = line.match(/parent\[(\d+)\]/);
    if (parentMatch) {
      node.parentId = parentMatch[1];
    }

    const frameNodeIdMatch = line.match(/frameNodeId\[(\d+)\]/);
    if (frameNodeIdMatch) {
      node.frameNodeId = frameNodeIdMatch[1];
    }

    const frameNodeTagMatch = line.match(/frameNodeTag\[(\w+)\]/);
    if (frameNodeTagMatch) {
      node.frameNodeTag = frameNodeTagMatch[1];
    }

    const nameMatch = line.match(/name\[([^\]]+)\]/);
    if (nameMatch) {
      node.name = nameMatch[1];
    }

    const instanceIdMatch = line.match(/instanceId\[(\-?\d+)\]/);
    if (instanceIdMatch) {
      node.properties.instanceId = instanceIdMatch[1];
    }

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
  private static parseModifiers(modifiersStr: string): ModifierInfo {
    const modifiers: ModifierInfo = {};
    const parts = modifiersStr.split(',').map(s => s.trim());

    for (const part of parts) {
      if (!part) continue;

      const bgMatch = part.match(/BackgroundColor\[(.+?)\]/);
      if (bgMatch) {
        modifiers.backgroundColor = bgMatch[1];
        continue;
      }

      if (part === 'Bounds') {
        modifiers.bounds = true;
      } else if (part === 'Frame') {
        modifiers.frame = true;
      }
    }

    return modifiers;
  }

  /**
   * 递归搜索包含指定文字的节点（旧接口）
   */
  private static searchByText(node: UINode, text: string, results: UINode[]): void {
    // 检查节点的 name 属性
    if (node.name && node.name.includes(text)) {
      results.push(node);
    }

    // 递归检查子节点
    for (const child of node.children) {
      this.searchByText(child, text, results);
    }
  }

  /**
   * 递归搜索指定 tag 的节点
   */
  private static searchByTag(node: UINode, tag: string, results: UINode[]): void {
    if (node.frameNodeTag === tag) {
      results.push(node);
    }

    for (const child of node.children) {
      this.searchByTag(child, tag, results);
    }
  }

  /**
   * 递归搜索指定名称的节点
   */
  private static searchByName(node: UINode, name: string, results: UINode[]): void {
    if (node.name === name) {
      results.push(node);
    }

    for (const child of node.children) {
      this.searchByName(child, name, results);
    }
  }

  /**
   * 递归搜索文本（高级接口，带评分）
   */
  private static searchTextWithScore(
    node: UINode,
    text: string,
    path: string[],
    results: ElementMatch[],
    exactMatch: boolean
  ): void {
    const currentPath = [...path, this.getNodeLabel(node)];

    // 检查节点名称
    if (node.name) {
      const match = exactMatch
        ? node.name.toLowerCase() === text.toLowerCase()
        : node.name.toLowerCase().includes(text.toLowerCase());

      if (match) {
        results.push({
          node,
          path: currentPath,
          score: this.calculateScore(node, text),
        });
      }
    }

    // 递归搜索子节点
    for (const child of node.children) {
      this.searchTextWithScore(child, text, currentPath, results, exactMatch);
    }
  }

  /**
   * 递归搜索属性
   */
  private static searchProperty(
    node: UINode,
    propertyName: string,
    propertyValue: unknown,
    path: string[],
    results: ElementMatch[]
  ): void {
    const currentPath = [...path, this.getNodeLabel(node)];

    // 检查属性
    if (node.properties && node.properties[propertyName] === propertyValue) {
      results.push({
        node,
        path: currentPath,
        score: 100,
      });
    }

    // 递归搜索子节点
    for (const child of node.children) {
      this.searchProperty(child, propertyName, propertyValue, currentPath, results);
    }
  }

  /**
   * 递归搜索类型
   */
  private static searchType(
    node: UINode,
    type: string,
    path: string[],
    results: ElementMatch[]
  ): void {
    const currentPath = [...path, this.getNodeLabel(node)];

    // 检查类型
    if (node.type === type) {
      results.push({
        node,
        path: currentPath,
        score: 80,
      });
    }

    // 递归搜索子节点
    for (const child of node.children) {
      this.searchType(child, type, currentPath, results);
    }
  }

  /**
   * 按多个条件搜索
   */
  private static searchWithConditions(
    node: UINode,
    conditions: SearchConditions,
    path: string[],
    results: ElementMatch[]
  ): void {
    const currentPath = [...path, this.getNodeLabel(node)];
    let score = 0;
    let matchCount = 0;
    const totalConditions =
      (conditions.text ? 1 : 0) +
      (conditions.type ? 1 : 0) +
      (conditions.properties ? Object.keys(conditions.properties).length : 0);

    // 检查文本
    if (conditions.text) {
      if (node.name && node.name.toLowerCase().includes(conditions.text.toLowerCase())) {
        score += 30;
        matchCount++;
      }
    }

    // 检查类型
    if (conditions.type) {
      if (node.type === conditions.type) {
        score += 20;
        matchCount++;
      }
    }

    // 检查属性
    if (conditions.properties) {
      for (const [key, value] of Object.entries(conditions.properties)) {
        if (node.properties && node.properties[key] === value) {
          score += 25;
          matchCount++;
        }
      }
    }

    // 如果至少匹配一个条件，添加到结果
    if (matchCount > 0) {
      // 根据匹配比例调整分数
      score = Math.round((score / totalConditions) * (matchCount / totalConditions) * 100);
      score = Math.min(100, score);

      results.push({
        node,
        path: currentPath,
        score,
      });
    }

    // 递归搜索子节点
    for (const child of node.children) {
      this.searchWithConditions(child, conditions, currentPath, results);
    }
  }

  /**
   * 获取节点标签（用于路径显示）
   */
  private static getNodeLabel(node: UINode): string {
    if (node.name) {
      return `${node.type}(${node.name})`;
    }
    return node.type;
  }

  /**
   * 计算匹配度分数
   * 使用更智能的评分算法，包括编辑距离
   */
  private static calculateScore(node: UINode, text: string): number {
    let score = 0;

    if (!node.name) {
      return score;
    }

    const nodeName = node.name.toLowerCase();
    const searchText = text.toLowerCase();

    // 1. 精确匹配 - 100分
    if (nodeName === searchText) {
      return 100;
    }

    // 2. 完全包含 - 85分
    if (nodeName.includes(searchText) || searchText.includes(nodeName)) {
      return 85;
    }

    // 3. 前缀匹配 - 75分
    if (nodeName.startsWith(searchText)) {
      return 75;
    }

    // 4. 后缀匹配 - 70分
    if (nodeName.endsWith(searchText)) {
      return 70;
    }

    // 5. 使用编辑距离进行模糊匹配
    const distance = this.levenshteinDistance(nodeName, searchText);
    const maxLength = Math.max(nodeName.length, searchText.length);
    const similarity = 1 - distance / maxLength;

    // 如果相似度大于 60%，给予相应分数
    if (similarity >= 0.6) {
      score = Math.round(similarity * 60);
    }

    return score;
  }

  /**
   * 计算两个字符串之间的编辑距离（Levenshtein 距离）
   * 用于模糊匹配算法
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;

    // 创建二维数组
    const dp: number[][] = [];
    for (let i = 0; i <= m; i++) {
      dp[i] = [];
      for (let j = 0; j <= n; j++) {
        dp[i][j] = 0;
      }
    }

    // 初始化第一行和第一列
    for (let i = 0; i <= m; i++) {
      dp[i][0] = i;
    }
    for (let j = 0; j <= n; j++) {
      dp[0][j] = j;
    }

    // 动态规划计算
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,      // 删除
            dp[i][j - 1] + 1,      // 插入
            dp[i - 1][j - 1] + 1   // 替换
          );
        }
      }
    }

    return dp[m][n];
  }
}

/**
 * Modifier 信息接口
 */
interface ModifierInfo {
  backgroundColor?: string;
  bounds?: boolean | string;
  boundsData?: Coordinates;
  frame?: boolean;
}

/**
 * 位置信息接口
 */
interface PositionInfo {
  x?: number | string;
  y?: number | string;
  width?: number | string;
  height?: number | string;
}
