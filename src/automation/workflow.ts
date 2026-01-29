import { HDC } from '../utils/hdc.js';
import { UIController } from './controller.js';
import { UINode } from '../parsers/renderService.js';

/**
 * 工作流步骤类型
 */
export type WorkflowStep =
  | { type: 'launchAndTap'; bundleName: string; abilityName: string; targetText: string; timeout?: number }
  | { type: 'scrollAndTap'; targetText: string; maxScrolls?: number }
  | { type: 'assertExists'; text: string }
  | { type: 'assertTextEquals'; elementText: string; expectedText: string }
  | { type: 'tap'; text: string }
  | { type: 'inputText'; text: string; targetText?: string }
  | { type: 'swipe'; startX: number; startY: number; endX: number; endY: number; duration?: number }
  | { type: 'waitFor'; text: string; timeout?: number }
  | { type: 'delay'; ms: number };

/**
 * 工作流执行结果
 */
export interface WorkflowResult {
  success: boolean;
  steps: StepResult[];
  summary: string;
}

/**
 * 单步执行结果
 */
export interface StepResult {
  step: WorkflowStep;
  success: boolean;
  message: string;
  duration: number;
  element?: UINode;
}

/**
 * 自动化工作流类
 * 提供高级自动化操作，支持链式调用和批量执行
 */
export class Workflow {
  private uiController: UIController;
  private hdc: HDC;
  private results: StepResult[] = [];

  constructor(hdc?: HDC) {
    this.hdc = hdc || new HDC();
    this.uiController = new UIController(this.hdc);
  }

  /**
   * 启动应用并点击目标元素
   * @param bundleName 应用包名
   * @param abilityName Ability 名称
   * @param targetText 目标元素文字
   * @param timeout 超时时间（毫秒），默认 10000ms
   * @returns 执行结果
   */
  async launchAndTap(
    bundleName: string,
    abilityName: string,
    targetText: string,
    timeout: number = 10000
  ): Promise<StepResult> {
    const startTime = Date.now();
    const step: WorkflowStep = { type: 'launchAndTap', bundleName, abilityName, targetText, timeout };

    try {
      // 启动应用
      const launchCommand = `aa start -a ${abilityName} -b ${bundleName}`;
      await this.hdc.shell(launchCommand);

      // 等待应用启动并查找目标元素
      const element = await this.uiController.waitForElement(targetText, timeout);

      if (!element) {
        const result: StepResult = {
          step,
          success: false,
          message: `启动应用 ${bundleName}/${abilityName} 后，在 ${timeout}ms 内未找到目标元素 "${targetText}"`,
          duration: Date.now() - startTime,
        };
        this.results.push(result);
        return result;
      }

      // 点击目标元素
      const tapResult = await this.uiController.smartTap(targetText);

      const result: StepResult = {
        step,
        success: tapResult.success,
        message: tapResult.message,
        duration: Date.now() - startTime,
        element: tapResult.element,
      };
      this.results.push(result);
      return result;
    } catch (error) {
      const result: StepResult = {
        step,
        success: false,
        message: `启动应用并点击失败: ${error instanceof Error ? error.message : String(error)}`,
        duration: Date.now() - startTime,
      };
      this.results.push(result);
      return result;
    }
  }

  /**
   * 滚动查找并点击元素
   * @param targetText 目标元素文字
   * @param maxScrolls 最大滚动次数，默认 10 次
   * @returns 执行结果
   */
  async scrollAndTap(targetText: string, maxScrolls: number = 10): Promise<StepResult> {
    const startTime = Date.now();
    const step: WorkflowStep = { type: 'scrollAndTap', targetText, maxScrolls };

    try {
      // 获取屏幕尺寸用于滚动
      const screenInfo = await this.getScreenSize();
      const centerX = Math.round(screenInfo.width / 2);
      const startY = Math.round(screenInfo.height * 0.8);
      const endY = Math.round(screenInfo.height * 0.2);

      let found = false;
      let scrollCount = 0;
      let lastElement: UINode | undefined;

      while (scrollCount < maxScrolls && !found) {
        // 尝试查找并点击目标元素
        const tapResult = await this.uiController.smartTap(targetText);

        if (tapResult.success) {
          const result: StepResult = {
            step,
            success: true,
            message: `经过 ${scrollCount} 次滚动后找到并点击 "${targetText}"`,
            duration: Date.now() - startTime,
            element: tapResult.element,
          };
          this.results.push(result);
          return result;
        }

        // 未找到，执行滚动
        await this.uiController.swipe(centerX, startY, centerX, endY, 300);
        scrollCount++;

        // 等待 UI 更新
        await this.delay(500);
      }

      const result: StepResult = {
        step,
        success: false,
        message: `滚动 ${maxScrolls} 次后仍未找到目标元素 "${targetText}"`,
        duration: Date.now() - startTime,
      };
      this.results.push(result);
      return result;
    } catch (error) {
      const result: StepResult = {
        step,
        success: false,
        message: `滚动查找失败: ${error instanceof Error ? error.message : String(error)}`,
        duration: Date.now() - startTime,
      };
      this.results.push(result);
      return result;
    }
  }

  /**
   * 断言元素存在
   * @param text 目标文字
   * @returns 执行结果
   */
  async assertExists(text: string): Promise<StepResult> {
    const startTime = Date.now();
    const step: WorkflowStep = { type: 'assertExists', text };

    try {
      const elements = await this.uiController.findElements({ text });

      const success = elements.length > 0;
      const message = success
        ? `断言通过: 找到 ${elements.length} 个包含 "${text}" 的元素`
        : `断言失败: 未找到包含 "${text}" 的元素`;

      const result: StepResult = {
        step,
        success,
        message,
        duration: Date.now() - startTime,
        element: elements[0],
      };
      this.results.push(result);
      return result;
    } catch (error) {
      const result: StepResult = {
        step,
        success: false,
        message: `断言失败时发生错误: ${error instanceof Error ? error.message : String(error)}`,
        duration: Date.now() - startTime,
      };
      this.results.push(result);
      return result;
    }
  }

  /**
   * 断言文本相等
   * @param elementText 元素中的文字
   * @param expectedText 期望的文字
   * @returns 执行结果
   */
  async assertTextEquals(elementText: string, expectedText: string): Promise<StepResult> {
    const startTime = Date.now();
    const step: WorkflowStep = { type: 'assertTextEquals', elementText, expectedText };

    try {
      const elements = await this.uiController.findElements({ text: elementText });

      if (elements.length === 0) {
        const result: StepResult = {
          step,
          success: false,
          message: `断言失败: 未找到包含 "${elementText}" 的元素`,
          duration: Date.now() - startTime,
        };
        this.results.push(result);
        return result;
      }

      // 检查元素的实际文字是否与期望值相等
      const element = elements[0];
      const actualText = this.extractTextFromElement(element);
      const success = actualText === expectedText;

      const message = success
        ? `断言通过: "${actualText}" 等于 "${expectedText}"`
        : `断言失败: "${actualText}" 不等于 "${expectedText}"`;

      const result: StepResult = {
        step,
        success,
        message,
        duration: Date.now() - startTime,
        element,
      };
      this.results.push(result);
      return result;
    } catch (error) {
      const result: StepResult = {
        step,
        success: false,
        message: `断言失败时发生错误: ${error instanceof Error ? error.message : String(error)}`,
        duration: Date.now() - startTime,
      };
      this.results.push(result);
      return result;
    }
  }

  /**
   * 执行一系列自动化步骤
   * @param steps 工作流步骤数组
   * @returns 完整的执行结果
   */
  async runSequence(steps: WorkflowStep[]): Promise<WorkflowResult> {
    this.results = []; // 清空之前的结果
    const startTime = Date.now();

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      let result: StepResult;

      switch (step.type) {
        case 'launchAndTap':
          result = await this.launchAndTap(step.bundleName, step.abilityName, step.targetText, step.timeout);
          break;

        case 'scrollAndTap':
          result = await this.scrollAndTap(step.targetText, step.maxScrolls);
          break;

        case 'assertExists':
          result = await this.assertExists(step.text);
          break;

        case 'assertTextEquals':
          result = await this.assertTextEquals(step.elementText, step.expectedText);
          break;

        case 'tap': {
          const startTime = Date.now();
          const tapResult = await this.uiController.smartTap(step.text);
          result = {
            step,
            success: tapResult.success,
            message: tapResult.message,
            duration: Date.now() - startTime,
            element: tapResult.element,
          };
          this.results.push(result);
          break;
        }

        case 'inputText': {
          // 功能已移除 - uitest uiInput inputText 在当前设备上不可用
          result = {
            step,
            success: false,
            message: `inputText 功能已移除（uitest uiInput inputText 在当前设备上不可用）`,
            duration: 0,
          };
          this.results.push(result);
          break;
        }

        case 'swipe': {
          const startTime = Date.now();
          const swipeResult = await this.uiController.swipe(
            step.startX,
            step.startY,
            step.endX,
            step.endY,
            step.duration
          );
          result = {
            step,
            success: swipeResult.success,
            message: swipeResult.message,
            duration: Date.now() - startTime,
          };
          this.results.push(result);
          break;
        }

        case 'waitFor': {
          const startTime = Date.now();
          const element = await this.uiController.waitForElement(step.text, step.timeout);
          result = {
            step,
            success: element !== null,
            message: element ? `找到元素 "${step.text}"` : `等待超时，未找到元素 "${step.text}"`,
            duration: Date.now() - startTime,
            element: element || undefined,
          };
          this.results.push(result);
          break;
        }

        case 'delay': {
          const startTime = Date.now();
          await this.delay(step.ms);
          result = {
            step,
            success: true,
            message: `延迟 ${step.ms}ms`,
            duration: Date.now() - startTime,
          };
          this.results.push(result);
          break;
        }

        default:
          result = {
            step,
            success: false,
            message: `未知的步骤类型: ${(step as any).type}`,
            duration: 0,
          };
          this.results.push(result);
      }

      // 如果步骤失败且是断言类型，可以选择继续或停止
      // 这里选择继续执行，但可以添加配置选项
      if (!result.success && (step.type === 'assertExists' || step.type === 'assertTextEquals')) {
        // 断言失败，继续执行
      }
    }

    const totalDuration = Date.now() - startTime;
    const successCount = this.results.filter(r => r.success).length;
    const failureCount = this.results.length - successCount;

    return {
      success: failureCount === 0,
      steps: this.results,
      summary: `执行完成: ${this.results.length} 个步骤, ${successCount} 成功, ${failureCount} 失败, 总耗时 ${totalDuration}ms`,
    };
  }

  /**
   * 获取所有执行结果
   */
  getResults(): StepResult[] {
    return this.results;
  }

  /**
   * 清空执行结果
   */
  clearResults(): void {
    this.results = [];
  }

  /**
   * 获取屏幕尺寸
   */
  private async getScreenSize(): Promise<{ width: number; height: number }> {
    try {
      // 通过 hdc shell 获取屏幕尺寸
      const output = await this.hdc.shell('wm size');
      const match = output.match(/Physical size: (\d+)x(\d+)/);
      if (match) {
        return {
          width: parseInt(match[1]),
          height: parseInt(match[2]),
        };
      }
    } catch (error) {
      // 使用默认值
    }

    // 默认返回常见分辨率
    return { width: 1080, height: 2340 };
  }

  /**
   * 从元素中提取文字
   */
  private extractTextFromElement(element: UINode): string {
    // 尝试从不同的属性中提取文字
    if (element.name) {
      return element.name;
    }

    const modifiers = element.properties.modifiers as any;
    if (modifiers) {
      if (modifiers.text) {
        return modifiers.text;
      }
      if (modifiers.content) {
        return modifiers.content;
      }
    }

    return '';
  }

  /**
   * 延迟执行
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
