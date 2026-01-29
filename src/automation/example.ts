#!/usr/bin/env node
/**
 * UIController 使用示例
 * 演示如何使用智能点击控制器进行自动化操作
 */

import { UIController } from './controller.js';
import { HDC } from '../utils/hdc.js';

async function main() {
  // 创建控制器实例
  const hdc = new HDC();
  const controller = new UIController(hdc);

  console.log('=== UIController 自动化示例 ===\n');

  // 示例 1: 智能点击
  console.log('示例 1: 智能点击包含"设置"文字的元素');
  const result1 = await controller.smartTap('设置');
  console.log(`结果: ${result1.message}`);
  if (result1.success && result1.coordinates) {
    console.log(`点击坐标: (${result1.coordinates.x}, ${result1.coordinates.y})`);
  }
  console.log();

  // 示例 2: 等待元素
  console.log('示例 2: 等待"首页"元素出现（最多等待 5 秒）');
  const element = await controller.waitForElement('首页', 5000);
  if (element) {
    console.log(`找到元素: ${element.type}${element.name ? `(${element.name})` : ''}`);
  } else {
    console.log('元素未出现（超时）');
  }
  console.log();

  // 示例 3: 多条件查找
  console.log('示例 3: 查找类型为 Button 的元素');
  const buttons = await controller.findElements({ type: 'Button' });
  console.log(`找到 ${buttons.length} 个 Button 元素`);
  if (buttons.length > 0) {
    console.log(`第一个按钮: ${buttons[0].type}${buttons[0].name ? `(${buttons[0].name})` : ''}`);
  }
  console.log();

  // 示例 4: 输入文字（功能已移除 - uitest uiInput inputText 在当前设备上不可用）
  console.log('示例 4: 输入文字功能已移除');
  console.log();

  // 示例 5: 滑动屏幕
  console.log('示例 5: 向上滑动屏幕');
  const screenWidth = 1080;  // 根据实际设备调整
  const screenHeight = 2340; // 根据实际设备调整
  const swipeResult = await controller.swipe(
    screenWidth / 2,      // startX: 屏幕中心
    screenHeight - 200,   // startY: 接近底部
    screenWidth / 2,      // endX: 屏幕中心
    200,                  // endY: 接近顶部
    300                   // 持续时间 300ms
  );
  console.log(`滑动结果: ${swipeResult.message}`);
  console.log();

  // 示例 6: 组合操作 - 自动化流程
  console.log('示例 6: 自动化流程 - 打开应用并导航');
  try {
    // 点击应用图标
    const appResult = await controller.smartTap('我的应用');
    if (!appResult.success) {
      console.log('未找到应用图标');
      return;
    }
    console.log('✓ 已打开应用');

    // 等待加载完成
    const loaded = await controller.waitForElement('首页', 5000);
    if (loaded) {
      console.log('✓ 首页已加载');

      // 点击某个功能
      const featureResult = await controller.smartTap('个人中心');
      if (featureResult.success) {
        console.log('✓ 已进入个人中心');
      }
    }
  } catch (error) {
    console.error('自动化流程出错:', error);
  }

  console.log('\n=== 示例完成 ===');
}

// 运行示例
main().catch(console.error);
