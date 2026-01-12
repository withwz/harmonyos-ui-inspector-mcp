import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * HDC 命令执行工具
 */
export class HDC {
  private hdcPath: string;

  constructor(hdcPath?: string) {
    // 从环境变量获取 hdc 路径，或使用默认的 'hdc'
    this.hdcPath = hdcPath || process.env.HDC_PATH || 'hdc';
  }

  /**
   * 执行 hdc shell 命令
   * @param command 要执行的命令
   * @returns 命令输出
   */
  async shell(command: string): Promise<string> {
    const fullCommand = `${this.hdcPath} shell "${command}"`;
    const { stdout, stderr } = await execAsync(fullCommand, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
    });

    if (stderr && !stdout) {
      throw new Error(`HDC command failed: ${stderr}`);
    }

    return stdout;
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
    return this.hidumper('WindowManagerService', '-a');
  }

  /**
   * 获取 UI 组件树
   */
  async getUiTree(): Promise<string> {
    return this.hidumper('RenderService', 'client');
  }

  /**
   * 获取应用列表
   */
  async listAbilities(): Promise<string> {
    return this.hidumper('AbilityManagerService', '-a');
  }

  /**
   * 截图
   * @param remotePath 远程保存路径
   * @param localPath 本地保存路径
   */
  async screenshot(remotePath: string, localPath: string): Promise<string> {
    await this.shell(`snapshot_display -f ${remotePath}`);
    const { stdout } = await execAsync(
      `${this.hdcPath} file recv ${remotePath} ${localPath}`,
      { encoding: 'utf-8' }
    );
    return stdout;
  }
}

// 默认导出单例
export default new HDC();
