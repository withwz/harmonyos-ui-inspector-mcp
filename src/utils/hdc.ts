import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// 常量定义
const DEFAULT_BUFFER_SIZE = 10 * 1024 * 1024; // 10MB buffer
const DEFAULT_COMMAND_TIMEOUT = 30000; // 默认命令超时 30 秒
const MAX_COORDINATE_VALUE = 100000; // 坐标最大值（用于验证）
const DEFAULT_SCREEN_WIDTH = 905; // 默认显示宽度
const DEFAULT_SCREEN_HEIGHT = 2000; // 默认显示高度
const DEFAULT_RESTART_DELAY = 500; // 重启应用延迟（毫秒）

/**
 * 验证器类
 * 提供输入验证功能
 */
class Validator {
  /**
   * 验证 bundleName 格式
   * 只允许字母、数字、点、下划线
   */
  static validateBundleName(bundleName: string): void {
    if (!bundleName || typeof bundleName !== 'string') {
      throw new Error('bundleName 必须是非空字符串');
    }
    if (!/^[a-zA-Z0-9._]+$/.test(bundleName)) {
      throw new Error(`bundleName 格式无效: ${bundleName}`);
    }
  }

  /**
   * 验证 abilityName 格式
   */
  static validateAbilityName(abilityName: string): void {
    if (!abilityName || typeof abilityName !== 'string') {
      throw new Error('abilityName 必须是非空字符串');
    }
    if (!/^[a-zA-Z0-9._]+$/.test(abilityName)) {
      throw new Error(`abilityName 格式无效: ${abilityName}`);
    }
  }

  /**
   * 验证坐标值
   */
  static validateCoordinate(value: number, name: string): void {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error(`${name} 必须是有效数字`);
    }
    if (value < 0 || value > MAX_COORDINATE_VALUE) {
      throw new Error(`${name} 超出合理范围 [0, ${MAX_COORDINATE_VALUE}]`);
    }
  }

  /**
   * 验证按键名称
   */
  static validateKeyName(key: string): void {
    if (!key || typeof key !== 'string') {
      throw new Error('按键名称必须是非空字符串');
    }
  }

  /**
   * 验证文件路径
   */
  static validateFilePath(path: string): void {
    if (!path || typeof path !== 'string') {
      throw new Error('文件路径必须是非空字符串');
    }
  }
}

/**
 * 日志记录器
 */
class Logger {
  private static isDebugMode = process.env.DEBUG === 'true';

  static debug(message: string, ...args: unknown[]): void {
    if (this.isDebugMode) {
      console.error(`[DEBUG] ${message}`, ...args);
    }
  }

  static info(message: string, ...args: unknown[]): void {
    console.error(`[INFO] ${message}`, ...args);
  }

  static warn(message: string, ...args: unknown[]): void {
    console.error(`[WARN] ${message}`, ...args);
  }

  static error(message: string, ...args: unknown[]): void {
    console.error(`[ERROR] ${message}`, ...args);
  }
}

/**
 * HDC 命令执行工具
 */
export class HDC {
  private hdcPath: string;

  constructor(hdcPath?: string) {
    // 从环境变量获取 hdc 路径，或使用默认的 'hdc'
    this.hdcPath = hdcPath || process.env.HDC_PATH || 'hdc';
    Logger.debug(`HDC 初始化完成，路径: ${this.hdcPath}`);
  }

  /**
   * 执行 hdc shell 命令
   * @param command 要执行的命令
   * @param timeout 超时时间（毫秒）
   * @returns 命令输出
   */
  async shell(command: string, timeout: number = DEFAULT_COMMAND_TIMEOUT): Promise<string> {
    const fullCommand = `${this.hdcPath} shell "${command}"`;
    Logger.debug(`执行命令: ${fullCommand}`);

    try {
      const { stdout, stderr } = await execAsync(fullCommand, {
        encoding: 'utf-8',
        maxBuffer: DEFAULT_BUFFER_SIZE,
        timeout,
      });

      if (stderr && !stdout) {
        Logger.error(`命令执行失败: ${stderr}`);
        throw new Error(`HDC command failed: ${stderr}`);
      }

      Logger.debug(`命令执行成功`);
      return stdout;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      Logger.error(`命令执行异常: ${errorMsg}`);
      throw new Error(`HDC shell command failed: ${errorMsg}`);
    }
  }

  /**
   * 执行 hidumper 命令
   * @param service 服务名称
   * @param args 参数
   * @returns 命令输出
   */
  async hidumper(service: string, args: string): Promise<string> {
    return this.shell(`hidumper -s ${service} -a '${args}'`);
  }

  /**
   * 获取窗口列表
   */
  async listWindows(): Promise<string> {
    return this.shell(`hidumper -s WindowManagerService -a -a`);
  }

  /**
   * 获取屏幕分辨率
   * @returns 屏幕分辨率 {width, height}
   * @throws 如果无法获取分辨率则抛出错误
   */
  async getScreenResolution(): Promise<{ width: number; height: number }> {
    try {
      const output = await this.listWindows();
      const lines = output.split('\n');

      // 查找最大的窗口尺寸作为屏幕分辨率
      let maxWidth = 0;
      let maxHeight = 0;

      for (const line of lines) {
        // 匹配位置信息: [ x    y    w    h    ]
        const rectMatch = line.match(/\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+\]/);
        if (rectMatch) {
          const w = parseInt(rectMatch[3]);
          const h = parseInt(rectMatch[4]);
          if (w > maxWidth) maxWidth = w;
          if (h > maxHeight) maxHeight = h;
        }
      }

      if (maxWidth > 0 && maxHeight > 0) {
        Logger.debug(`获取屏幕分辨率: ${maxWidth}x${maxHeight}`);
        return { width: maxWidth, height: maxHeight };
      }

      throw new Error('无法从窗口列表中解析屏幕分辨率');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      Logger.error(`获取屏幕分辨率失败: ${errorMsg}`);
      throw new Error(`Failed to get screen resolution: ${errorMsg}`);
    }
  }

  /**
   * 将显示坐标转换为屏幕坐标
   * @param displayX 显示尺寸中的 X 坐标
   * @param displayY 显示尺寸中的 Y 坐标
   * @param displayWidth 显示宽度（默认 905）
   * @param displayHeight 显示高度（默认 2000）
   * @returns 实际屏幕坐标
   */
  async convertToScreenCoordinates(
    displayX: number,
    displayY: number,
    displayWidth: number = DEFAULT_SCREEN_WIDTH,
    displayHeight: number = DEFAULT_SCREEN_HEIGHT
  ): Promise<{ x: number; y: number }> {
    try {
      const resolution = await this.getScreenResolution();
      const scaleX = resolution.width / displayWidth;
      const scaleY = resolution.height / displayHeight;

      return {
        x: Math.round(displayX * scaleX),
        y: Math.round(displayY * scaleY),
      };
    } catch (error) {
      Logger.error('坐标转换失败，使用原始坐标');
      // 如果无法获取分辨率，返回原始坐标
      return { x: Math.round(displayX), y: Math.round(displayY) };
    }
  }

  /**
   * 获取 UI 组件树
   * 使用更长的超时时间，因为 UI 树可能很大
   */
  async getUiTree(): Promise<string> {
    Logger.debug('开始获取 UI 树...');
    return this.hidumper('RenderService', 'client');
  }

  /**
   * 获取应用列表
   */
  async listAbilities(): Promise<string> {
    return this.shell(`hidumper -s AbilityManagerService`);
  }

  /**
   * 截图
   * @param remotePath 远程保存路径
   * @param localPath 本地保存路径
   */
  async screenshot(remotePath: string, localPath: string): Promise<string> {
    Validator.validateFilePath(remotePath);
    Validator.validateFilePath(localPath);

    Logger.debug(`截图到 ${remotePath}`);
    await this.shell(`snapshot_display -f ${remotePath}`);

    Logger.debug(`从设备拉取截图到 ${localPath}`);
    const { stdout } = await execAsync(
      `${this.hdcPath} file recv ${remotePath} ${localPath}`,
      {
        encoding: 'utf-8',
        timeout: DEFAULT_COMMAND_TIMEOUT,
      }
    );

    Logger.info('截图完成');
    return stdout;
  }

  /**
   * 点击屏幕指定位置
   * @param x X坐标
   * @param y Y坐标
   */
  async tap(x: number, y: number): Promise<string> {
    Validator.validateCoordinate(x, 'x');
    Validator.validateCoordinate(y, 'y');

    Logger.debug(`点击坐标 (${x}, ${y})`);
    return await this.shell(`uitest uiInput click ${Math.round(x)} ${Math.round(y)}`);
  }

  /**
   * 滑动操作
   * @param x1 起始X坐标
   * @param y1 起始Y坐标
   * @param x2 结束X坐标
   * @param y2 结束Y坐标
   * @param duration 持续时间（毫秒），默认300ms
   */
  async swipe(x1: number, y1: number, x2: number, y2: number, duration: number = 300): Promise<string> {
    Validator.validateCoordinate(x1, 'x1');
    Validator.validateCoordinate(y1, 'y1');
    Validator.validateCoordinate(x2, 'x2');
    Validator.validateCoordinate(y2, 'y2');

    if (typeof duration !== 'number' || duration < 0) {
      throw new Error('duration 必须是非负数');
    }

    Logger.debug(`滑动从 (${x1}, ${y1}) 到 (${x2}, ${y2})`);
    // velocity: 200-40000, default 600. 映射 duration(ms) 到 velocity
    const velocity = Math.max(200, Math.min(40000, Math.round(duration * 100)));
    return await this.shell(
      `uitest uiInput swipe ${Math.round(x1)} ${Math.round(y1)} ${Math.round(x2)} ${Math.round(y2)} ${velocity}`
    );
  }

  /**
   * 按键操作
   * @param key 按键名称（Back/Home/Power）或按键代码
   */
  async pressKey(key: string): Promise<string> {
    Validator.validateKeyName(key);
    Logger.debug(`按键: ${key}`);
    return await this.shell(`uitest uiInput keyEvent ${key}`);
  }

  /**
   * 启动应用
   * @param bundleName 应用包名
   * @param abilityName Ability名称（可选）
   * @returns 启动结果
   */
  async startApp(bundleName: string, abilityName?: string): Promise<{ success: boolean; message: string }> {
    try {
      Validator.validateBundleName(bundleName);
      if (abilityName) {
        Validator.validateAbilityName(abilityName);
      }

      let command: string;
      if (abilityName) {
        command = `aa start -a ${abilityName} -b ${bundleName}`;
      } else {
        // 如果没有指定 ability，使用包名作为默认的 ability
        command = `aa start -a ${bundleName}.MainAbility -b ${bundleName}`;
      }

      Logger.info(`启动应用: ${bundleName}${abilityName ? ` (${abilityName})` : ''}`);
      const stdout = await this.shell(command);

      // 检查是否包含成功标记
      if (stdout.includes('start ability successfully') || stdout.includes('successfully')) {
        return {
          success: true,
          message: `App ${bundleName}${abilityName ? ` (${abilityName})` : ''} started successfully`,
        };
      }

      // 即使没有明确的成功标记，如果没有错误，也认为成功
      return {
        success: true,
        message: `App ${bundleName}${abilityName ? ` (${abilityName})` : ''} start command executed`,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      Logger.error(`启动应用失败: ${errorMsg}`);
      return {
        success: false,
        message: `Failed to start app ${bundleName}${abilityName ? ` (${abilityName})` : ''}: ${errorMsg}`,
      };
    }
  }

  /**
   * 停止应用
   * @param bundleName 应用包名
   * @returns 停止结果
   */
  async stopApp(bundleName: string): Promise<{ success: boolean; message: string }> {
    try {
      Validator.validateBundleName(bundleName);

      const command = `aa force-stop ${bundleName}`;
      Logger.info(`停止应用: ${bundleName}`);
      const stdout = await this.shell(command);

      return {
        success: true,
        message: `App ${bundleName} stopped successfully`,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      Logger.error(`停止应用失败: ${errorMsg}`);
      return {
        success: false,
        message: `Failed to stop app ${bundleName}: ${errorMsg}`,
      };
    }
  }

  /**
   * 获取应用状态
   * @param bundleName 应用包名
   * @returns 应用状态信息
   */
  async getAppStatus(bundleName: string): Promise<{
    success: boolean;
    isRunning: boolean;
    abilities: Array<{ name: string; state: string }>;
    message: string;
  }> {
    try {
      Validator.validateBundleName(bundleName);

      const command = 'aa dump -a';
      const stdout = await this.shell(command);

      // 解析 ability list 输出
      const lines = stdout.split('\n');
      const abilities: Array<{ name: string; state: string }> = [];
      let isRunning = false;

      // 查找目标应用的 abilities
      let currentBundle = '';
      let currentAbility = '';
      let currentState = '';

      for (const line of lines) {
        const trimmedLine = line.trim();

        // 解析 bundle name
        const bundleMatch = trimmedLine.match(/bundle name \[([^\]]+)\]/);
        if (bundleMatch) {
          currentBundle = bundleMatch[1];
          continue;
        }

        // 解析 main name (ability name)
        const mainMatch = trimmedLine.match(/main name \[([^\]]+)\]/);
        if (mainMatch) {
          currentAbility = mainMatch[1];
          continue;
        }

        // 解析 state
        const stateMatch = trimmedLine.match(/state #(\w+)/);
        if (stateMatch) {
          currentState = stateMatch[1];

          // 如果当前 bundle 匹配目标应用
          if (currentBundle === bundleName && currentAbility && currentState) {
            abilities.push({
              name: currentAbility,
              state: currentState,
            });

            // 判断是否在运行
            if (
              currentState === 'ACTIVE' ||
              currentState === 'ACTIVATING' ||
              currentState === 'BACKGROUND' ||
              currentState === 'FOREGROUND'
            ) {
              isRunning = true;
            }

            // 重置
            currentAbility = '';
            currentState = '';
          }
          continue;
        }
      }

      if (abilities.length === 0) {
        return {
          success: true,
          isRunning: false,
          abilities: [],
          message: `No abilities found for ${bundleName}. The app may not be installed or running.`,
        };
      }

      return {
        success: true,
        isRunning,
        abilities,
        message: `Found ${abilities.length} ability(ies) for ${bundleName}. App is ${isRunning ? 'running' : 'not running'}.`,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      Logger.error(`获取应用状态失败: ${errorMsg}`);
      return {
        success: false,
        isRunning: false,
        abilities: [],
        message: `Failed to get app status for ${bundleName}: ${errorMsg}`,
      };
    }
  }

  /**
   * 重启应用
   * @param bundleName 应用包名
   * @param abilityName Ability名称（可选）
   * @returns 重启结果
   */
  async restartApp(bundleName: string, abilityName?: string): Promise<{ success: boolean; message: string }> {
    try {
      Validator.validateBundleName(bundleName);
      if (abilityName) {
        Validator.validateAbilityName(abilityName);
      }

      // 先停止应用
      const stopResult = await this.stopApp(bundleName);

      if (!stopResult.success) {
        return {
          success: false,
          message: `Failed to restart app ${bundleName}: Could not stop the app. ${stopResult.message}`,
        };
      }

      // 等待一小段时间确保应用完全停止
      await new Promise((resolve) => setTimeout(resolve, DEFAULT_RESTART_DELAY));

      // 再启动应用
      const startResult = await this.startApp(bundleName, abilityName);

      if (!startResult.success) {
        return {
          success: false,
          message: `Failed to restart app ${bundleName}: App stopped but could not start. ${startResult.message}`,
        };
      }

      return {
        success: true,
        message: `App ${bundleName}${abilityName ? ` (${abilityName})` : ''} restarted successfully`,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      Logger.error(`重启应用失败: ${errorMsg}`);
      return {
        success: false,
        message: `Failed to restart app ${bundleName}: ${errorMsg}`,
      };
    }
  }
}

// 默认导出单例
export default new HDC();
