/**
 * 元素定位器工具
 * 重新导出 parsers/elementLocator 中的 ElementLocator 类
 * 保持向后兼容性
 */

export {
  ElementLocator,
  type Coordinates,
  type ElementMatch,
} from '../parsers/elementLocator.js';

// 为了方便使用，也导出 SearchConditions 类型
export type { SearchConditions } from '../parsers/elementLocator.js';
