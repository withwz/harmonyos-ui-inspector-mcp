/**
 * 窗口信息接口
 */
export interface WindowInfo {
  name: string;
  displayId: number;
  pid: number;
  winId: number;
  type: number;
  mode: number;
  flag: number;
  zOrder: number;
  orientation: number;
  rect: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

/**
 * 解析 WindowManagerService 输出
 */
export class WindowManagerParser {
  /**
   * 解析窗口列表输出
   * @param output hidumper 输出
   * @returns 窗口信息数组
   */
  static parse(output: string): WindowInfo[] {
    const lines = output.split('\n');
    const windows: WindowInfo[] = [];

    // 找到表头和数据行
    let dataStartIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('WindowName')) {
        dataStartIndex = i + 1;
        break;
      }
    }

    if (dataStartIndex === -1) {
      return windows;
    }

    // 解析数据行
    for (let i = dataStartIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('---') || line.startsWith('Focus')) {
        continue;
      }

      const window = this.parseLine(line);
      if (window) {
        windows.push(window);
      }
    }

    return windows;
  }

  /**
   * 解析单行窗口数据
   */
  private static parseLine(line: string): WindowInfo | null {
    // 示例行:
    // rnsurface0           0         31950   61    1    1    0    102  0           [ 0    0    1316 2832 ]
    const parts = line.split(/\s+/);

    if (parts.length < 9) {
      return null;
    }

    // 提取矩形信息 [ x y w h ]
    const rectMatch = line.match(/\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/);
    if (!rectMatch) {
      return null;
    }

    return {
      name: parts[0],
      displayId: parseInt(parts[1]) || 0,
      pid: parseInt(parts[2]) || 0,
      winId: parseInt(parts[3]) || 0,
      type: parseInt(parts[4]) || 0,
      mode: parseInt(parts[5]) || 0,
      flag: parseInt(parts[6]) || 0,
      zOrder: parseInt(parts[7]) || 0,
      orientation: parseInt(parts[8]) || 0,
      rect: {
        x: parseInt(rectMatch[1]) || 0,
        y: parseInt(rectMatch[2]) || 0,
        w: parseInt(rectMatch[3]) || 0,
        h: parseInt(rectMatch[4]) || 0,
      },
    };
  }

  /**
   * 查找特定窗口
   */
  static findWindow(windows: WindowInfo[], name: string): WindowInfo | undefined {
    return windows.find(w => w.name === name);
  }

  /**
   * 按进程 ID 过滤窗口
   */
  static filterByPid(windows: WindowInfo[], pid: number): WindowInfo[] {
    return windows.filter(w => w.pid === pid);
  }

  /**
   * 获取可见窗口
   */
  static getVisibleWindows(windows: WindowInfo[]): WindowInfo[] {
    return windows.filter(w => w.mode === 1);
  }
}
