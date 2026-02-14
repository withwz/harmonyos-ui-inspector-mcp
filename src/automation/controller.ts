import { HDC } from '../utils/hdc.js';
import { RenderServiceParser, UINode } from '../parsers/renderService.js';
import { ElementLocator, SearchConditions } from './elementLocator.js';

// 常量定义
const DEFAULT_POLL_INTERVAL = 500; // 默认轮询间隔（毫秒）
const DEFAULT_WAIT_TIMEOUT = 10000; // 默认等待超时（毫秒）
const DEFAULT_SWIPE_DURATION = 300; // 默认滑动持续时间（毫秒）
const MAX_RETRY_COUNT = 3; // 最大重试次数

/**
 * 智能点击控制器
 * 用于自动化 UI 交互操作
 */
export class UIController {
  private hdc: HDC;

  constructor(hdc?: HDC) {
    this.hdc = hdc || new HDC();
  }

  /**
   * 根据文字智能点击目标元素
   * @param text 目标文字
   * @param pid 可选的进程 ID，用于限定搜索范围
   * @returns 点击结果信息
   */
  async smartTap(text: string, pid?: number): Promise<{
    success: boolean;
    message: string;
    element?: UINode;
    coordinates?: { x: number; y: number };
    candidates?: Array<{ element: UINode; score: number }>;
  }> {
    try {
      // 获取 UI 树
      const uiTreeOutput = await this.hdc.getUiTree();

      // 查找包含目标文字的节点
      const matches = this.findElementsByTextWithScore(uiTreeOutput, text, pid);

      if (matches.length === 0) {
        return {
          success: false,
          message: `未找到包含文字 "${text}" 的元素`,
          candidates: [],
        };
      }

      // 选择第一个匹配的元素（得分最高）
      const targetMatch = matches[0];
      const targetElement = targetMatch.node;

      // 提取元素坐标
      const coordinates = this.extractCenterCoordinates(targetElement);

      if (!coordinates) {
        return {
          success: false,
          message: `无法提取元素坐标`,
          element: targetElement,
          candidates: matches.map(m => ({ element: m.node, score: m.score })),
        };
      }

      // 执行点击
      await this.tapAt(coordinates.x, coordinates.y);

      return {
        success: true,
        message: `成功点击包含文字 "${text}" 的元素 (匹配度: ${targetMatch.score}%)`,
        element: targetElement,
        coordinates,
        candidates: matches.map(m => ({ element: m.node, score: m.score })),
      };
    } catch (error) {
      return {
        success: false,
        message: `点击失败: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * 点击指定的 UI 元素
   * @param node UI 节点
   * @returns 点击结果信息
   */
  async tapElement(node: UINode): Promise<{
    success: boolean;
    message: string;
    coordinates?: { x: number; y: number };
  }> {
    try {
      const coordinates = this.extractCenterCoordinates(node);

      if (!coordinates) {
        return {
          success: false,
          message: `无法提取元素坐标: ${node.type}${node.name ? `(${node.name})` : ''}`,
        };
      }

      await this.tapAt(coordinates.x, coordinates.y);

      return {
        success: true,
        message: `成功点击元素 ${node.type}${node.name ? `(${node.name})` : ''}`,
        coordinates,
      };
    } catch (error) {
      return {
        success: false,
        message: `点击元素失败: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * 在指定坐标执行点击
   * @param x X 坐标
   * @param y Y 坐标
   */
  private async tapAt(x: number, y: number): Promise<void> {
    await this.hdc.tap(Math.round(x), Math.round(y));
  }

  /**
   * 等待元素出现
   * @param text 目标文字
   * @param timeout 超时时间（毫秒），默认 10000ms
   * @param pid 可选的进程 ID
   * @returns 找到的元素，超时返回 null
   */
  async waitForElement(
    text: string,
    timeout: number = DEFAULT_WAIT_TIMEOUT,
    pid?: number
  ): Promise<UINode | null> {
    const startTime = Date.now();
    let retryCount = 0;

    while (Date.now() - startTime < timeout) {
      try {
        const uiTreeOutput = await this.hdc.getUiTree();
        const elements = this.findElementsByText(uiTreeOutput, text, pid);

        if (elements.length > 0) {
          return elements[0];
        }
      } catch (error) {
        retryCount++;
        if (retryCount >= MAX_RETRY_COUNT) {
          // 达到最大重试次数，抛出错误
          throw new Error(`等待元素失败，已重试 ${MAX_RETRY_COUNT} 次: ${error instanceof Error ? error.message : String(error)}`);
        }
        // 记录错误但继续重试
        console.warn(`查找元素时出错（第 ${retryCount} 次）: ${error instanceof Error ? error.message : String(error)}`);
      }

      // 等待下次检查
      await new Promise(resolve => setTimeout(resolve, DEFAULT_POLL_INTERVAL));
    }

    return null;
  }

  /**
   * 在 UI 树中查找包含指定文字的元素
   * @param uiTreeOutput UI 树输出
   * @param text 目标文字
   * @param pid 可选的进程 ID
   * @returns 匹配的元素列表
   */
  private findElementsByText(uiTreeOutput: string, text: string, pid?: number): UINode[] {
    const trees = RenderServiceParser.parse(uiTreeOutput);
    const allMatches: Array<{ node: UINode; score: number }> = [];

    for (const [currentPid, root] of trees) {
      if (pid && currentPid !== pid) continue;

      // 使用 ElementLocator 进行更智能的搜索
      const matches = ElementLocator.findByText(root, text, false);
      allMatches.push(...matches.map(m => ({ node: m.node, score: m.score })));
    }

    // 按匹配度排序，返回最佳匹配
    allMatches.sort((a, b) => b.score - a.score);
    return allMatches.map(m => m.node);
  }

  /**
   * 在 UI 树中查找包含指定文字的元素（带评分）
   * @param uiTreeOutput UI 树输出
   * @param text 目标文字
   * @param pid 可选的进程 ID
   * @returns 匹配的元素列表（包含分数）
   */
  private findElementsByTextWithScore(
    uiTreeOutput: string,
    text: string,
    pid?: number
  ): Array<{ node: UINode; score: number }> {
    const trees = RenderServiceParser.parse(uiTreeOutput);
    const allMatches: Array<{ node: UINode; score: number }> = [];

    for (const [currentPid, root] of trees) {
      if (pid && currentPid !== pid) continue;

      // 使用 ElementLocator 进行更智能的搜索
      const matches = ElementLocator.findByText(root, text, false);
      allMatches.push(...matches.map(m => ({ node: m.node, score: m.score })));
    }

    // 按匹配度排序，返回最佳匹配
    allMatches.sort((a, b) => b.score - a.score);
    return allMatches;
  }

  /**
   * 根据多个条件查找元素
   * @param conditions 查找条件
   * @param pid 可选的进程 ID
   * @returns 找到的元素列表，按匹配度排序
   */
  async findElements(
    conditions: SearchConditions,
    pid?: number
  ): Promise<UINode[]> {
    const uiTreeOutput = await this.hdc.getUiTree();
    const trees = RenderServiceParser.parse(uiTreeOutput);
    const allMatches: Array<{ node: UINode; score: number }> = [];

    for (const [currentPid, root] of trees) {
      if (pid && currentPid !== pid) continue;

      const matches = ElementLocator.findByConditions(root, conditions);
      allMatches.push(...matches.map(m => ({ node: m.node, score: m.score })));
    }

    // 按匹配度排序
    allMatches.sort((a, b) => b.score - a.score);
    return allMatches.map(m => m.node);
  }

  /**
   * 提取元素的中心坐标
   * 使用统一的 ElementLocator.getCoordinates 方法
   * @param node UI 节点
   * @returns 坐标信息，如果无法提取返回 null
   */
  private extractCenterCoordinates(node: UINode): { x: number; y: number } | null {
    const coords = ElementLocator.getCoordinates(node);

    if (!coords) {
      return null;
    }

    // 返回中心点坐标
    return {
      x: coords.x + coords.width / 2,
      y: coords.y + coords.height / 2,
    };
  }

  /**
   * 获取元素的可点击区域
   * @param node UI 节点
   * @returns 可点击区域信息
   */
  private getClickableBounds(node: UINode): {
    left: number;
    top: number;
    right: number;
    bottom: number;
  } | null {
    const coords = ElementLocator.getCoordinates(node);

    if (!coords) {
      return null;
    }

    return {
      left: coords.x,
      top: coords.y,
      right: coords.x + coords.width,
      bottom: coords.y + coords.height,
    };
  }

  /**
   * 输入文字功能已移除（uitest uiInput inputText 在当前设备上不可用）
   */

  /**
   * 滑动屏幕
   * @param startX 起始 X 坐标
   * @param startY 起始 Y 坐标
   * @param endX 结束 X 坐标
   * @param endY 结束 Y 坐标
   * @param duration 滑动持续时间（毫秒）
   */
  async swipe(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    duration: number = DEFAULT_SWIPE_DURATION
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      await this.hdc.swipe(
        Math.round(startX),
        Math.round(startY),
        Math.round(endX),
        Math.round(endY),
        duration
      );

      return {
        success: true,
        message: `成功滑动从 (${startX}, ${startY}) 到 (${endX}, ${endY})`,
      };
    } catch (error) {
      return {
        success: false,
        message: `滑动失败: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}
