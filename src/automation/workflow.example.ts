#!/usr/bin/env node
/**
 * Workflow 使用示例
 * 演示如何使用 Workflow 类进行自动化测试
 */

import { Workflow } from './workflow.js';
import { HDC } from '../utils/hdc.js';
import type { WorkflowStep } from './workflow.js';

async function main() {
  const hdc = new HDC();
  const workflow = new Workflow(hdc);

  console.log('=== Workflow 自动化测试示例 ===\n');

  // 示例 1: 使用单独的方法
  console.log('示例 1: 启动应用并点击');
  const result1 = await workflow.launchAndTap(
    'com.example.app',
    'MainAbility',
    '登录'
  );
  console.log(`结果: ${result1.message}`);
  console.log();

  // 示例 2: 滚动查找并点击
  console.log('示例 2: 滚动查找并点击元素');
  const result2 = await workflow.scrollAndTap('更多选项', 5);
  console.log(`结果: ${result2.message}`);
  console.log();

  // 示例 3: 断言元素存在
  console.log('示例 3: 断言元素存在');
  const result3 = await workflow.assertExists('用户名');
  console.log(`结果: ${result3.message}`);
  console.log();

  // 示例 4: 断言文本相等
  console.log('示例 4: 断言文本相等');
  const result4 = await workflow.assertTextEquals('标题', '欢迎页');
  console.log(`结果: ${result4.message}`);
  console.log();

  // 示例 5: 执行完整的测试序列
  console.log('示例 5: 执行完整的测试序列');
  const testSteps: WorkflowStep[] = [
    // 启动应用
    {
      type: 'launchAndTap',
      bundleName: 'com.example.app',
      abilityName: 'MainAbility',
      targetText: '开始使用',
      timeout: 10000,
    },
    // 等待页面加载
    {
      type: 'waitFor',
      text: '首页',
      timeout: 5000,
    },
    // 断言关键元素存在
    {
      type: 'assertExists',
      text: '搜索框',
    },
    // 滚动查找目标
    {
      type: 'scrollAndTap',
      targetText: '设置',
      maxScrolls: 10,
    },
    // 断言页面标题
    {
      type: 'assertTextEquals',
      elementText: '页面标题',
      expectedText: '设置页面',
    },
    // 点击返回按钮
    {
      type: 'tap',
      text: '返回',
    },
    // 延迟等待
    {
      type: 'delay',
      ms: 1000,
    },
  ];

  const workflowResult = await workflow.runSequence(testSteps);

  console.log('\n=== 测试序列执行结果 ===');
  console.log(workflowResult.summary);
  console.log('\n详细步骤:');
  workflowResult.steps.forEach((step, index) => {
    console.log(`\n步骤 ${index + 1}:`);
    console.log(`  类型: ${step.step.type}`);
    console.log(`  状态: ${step.success ? '✓ 成功' : '✗ 失败'}`);
    console.log(`  消息: ${step.message}`);
    console.log(`  耗时: ${step.duration}ms`);
  });

  // 示例 6: 表单填写测试
  console.log('\n\n示例 6: 表单填写测试');
  const formSteps: WorkflowStep[] = [
    {
      type: 'tap',
      text: '用户名',
    },
    {
      type: 'inputText',
      text: 'testuser@example.com',
    },
    {
      type: 'tap',
      text: '密码',
    },
    {
      type: 'inputText',
      text: 'password123',
    },
    {
      type: 'tap',
      text: '登录',
    },
    {
      type: 'waitFor',
      text: '登录成功',
      timeout: 5000,
    },
  ];

  const formResult = await workflow.runSequence(formSteps);
  console.log(formResult.summary);

  // 示例 7: 列表滚动测试
  console.log('\n\n示例 7: 列表滚动测试');
  const listSteps: WorkflowStep[] = [
    {
      type: 'scrollAndTap',
      targetText: '第50项',
      maxScrolls: 20,
    },
    {
      type: 'assertExists',
      text: '详情页',
    },
  ];

  const listResult = await workflow.runSequence(listSteps);
  console.log(listResult.summary);

  console.log('\n=== 所有示例完成 ===');
}

// 运行示例
main().catch(console.error);
