# Workflow 自动化工作流模块

## 概述

`Workflow` 类是一个高级自动化测试框架，用于 HarmonyOS 应用的 UI 自动化测试。它提供了简洁的 API 来执行复杂的自动化操作序列。

## 特性

- **应用启动与交互**: 一键启动应用并执行点击操作
- **智能滚动查找**: 自动滚动屏幕查找目标元素
- **断言验证**: 支持元素存在性和文本内容验证
- **序列执行**: 支持批量执行测试步骤并生成详细报告
- **结果追踪**: 记录每个步骤的执行结果、耗时和状态

## 安装

```typescript
import { Workflow } from './automation/workflow.js';
import { HDC } from './utils/hdc.js';
```

## 快速开始

### 创建 Workflow 实例

```typescript
const hdc = new HDC();
const workflow = new Workflow(hdc);
```

### 基本使用

#### 1. 启动应用并点击

```typescript
const result = await workflow.launchAndTap(
  'com.example.app',      // bundleName
  'MainAbility',          // abilityName
  '登录',                  // targetText
  10000                    // timeout (可选)
);

console.log(result.message);
console.log('成功:', result.success);
console.log('耗时:', result.duration);
```

#### 2. 滚动查找并点击

```typescript
const result = await workflow.scrollAndTap(
  '更多选项',  // targetText
  10           // maxScrolls (可选，默认 10)
);
```

#### 3. 断言元素存在

```typescript
const result = await workflow.assertExists('用户名');
if (result.success) {
  console.log('元素存在');
} else {
  console.log('元素不存在');
}
```

#### 4. 断言文本相等

```typescript
const result = await workflow.assertTextEquals(
  '页面标题',    // elementText
  '设置页面'     // expectedText
);
```

## 高级用法

### 执行测试序列

使用 `runSequence` 方法执行一系列自动化步骤：

```typescript
const steps: WorkflowStep[] = [
  // 1. 启动应用
  {
    type: 'launchAndTap',
    bundleName: 'com.example.app',
    abilityName: 'MainAbility',
    targetText: '开始使用',
    timeout: 10000,
  },
  // 2. 等待页面加载
  {
    type: 'waitFor',
    text: '首页',
    timeout: 5000,
  },
  // 3. 断言关键元素存在
  {
    type: 'assertExists',
    text: '搜索框',
  },
  // 4. 点击按钮
  {
    type: 'tap',
    text: '设置',
  },
  // 5. 输入文字
  {
    type: 'inputText',
    text: 'test@example.com',
    targetText: '邮箱',
  },
  // 6. 滑动屏幕
  {
    type: 'swipe',
    startX: 540,
    startY: 2000,
    endX: 540,
    endY: 500,
    duration: 300,
  },
  // 7. 延迟等待
  {
    type: 'delay',
    ms: 1000,
  },
];

const result = await workflow.runSequence(steps);

// 查看执行结果
console.log(result.summary);
console.log('总成功:', result.steps.filter(s => s.success).length);
console.log('总失败:', result.steps.filter(s => !s.success).length);

// 查看每个步骤的详细信息
result.steps.forEach((step, index) => {
  console.log(`步骤 ${index + 1}:`, step.message);
});
```

## 支持的步骤类型

### 1. `launchAndTap`
启动应用并点击目标元素

```typescript
{
  type: 'launchAndTap',
  bundleName: string,      // 应用包名
  abilityName: string,     // Ability 名称
  targetText: string,      // 目标元素文字
  timeout?: number,        // 超时时间（毫秒）
}
```

### 2. `scrollAndTap`
滚动查找并点击元素

```typescript
{
  type: 'scrollAndTap',
  targetText: string,      // 目标元素文字
  maxScrolls?: number,     // 最大滚动次数
}
```

### 3. `assertExists`
断言元素存在

```typescript
{
  type: 'assertExists',
  text: string,            // 目标文字
}
```

### 4. `assertTextEquals`
断言文本相等

```typescript
{
  type: 'assertTextEquals',
  elementText: string,     // 元素中的文字
  expectedText: string,    // 期望的文字
}
```

### 5. `tap`
点击元素

```typescript
{
  type: 'tap',
  text: string,            // 目标文字
}
```

### 6. `inputText`
输入文字

```typescript
{
  type: 'inputText',
  text: string,            // 要输入的文字
  targetText?: string,     // 可选：先点击的目标元素
}
```

### 7. `swipe`
滑动屏幕

```typescript
{
  type: 'swipe',
  startX: number,          // 起始 X 坐标
  startY: number,          // 起始 Y 坐标
  endX: number,            // 结束 X 坐标
  endY: number,            // 结束 Y 坐标
  duration?: number,       // 滑动持续时间（毫秒）
}
```

### 8. `waitFor`
等待元素出现

```typescript
{
  type: 'waitFor',
  text: string,            // 目标文字
  timeout?: number,        // 超时时间（毫秒）
}
```

### 9. `delay`
延迟执行

```typescript
{
  type: 'delay',
  ms: number,              // 延迟毫秒数
}
```

## 实际应用示例

### 示例 1: 登录流程测试

```typescript
const loginTest: WorkflowStep[] = [
  {
    type: 'launchAndTap',
    bundleName: 'com.example.app',
    abilityName: 'MainAbility',
    targetText: '登录',
  },
  {
    type: 'inputText',
    text: 'user@example.com',
    targetText: '邮箱',
  },
  {
    type: 'inputText',
    text: 'password123',
    targetText: '密码',
  },
  {
    type: 'tap',
    text: '登录按钮',
  },
  {
    type: 'waitFor',
    text: '登录成功',
    timeout: 5000,
  },
  {
    type: 'assertExists',
    text: '用户中心',
  },
];

const result = await workflow.runSequence(loginTest);
console.log(result.summary);
```

### 示例 2: 列表滚动测试

```typescript
const listTest: WorkflowStep[] = [
  {
    type: 'launchAndTap',
    bundleName: 'com.example.app',
    abilityName: 'MainAbility',
    targetText: '列表',
  },
  {
    type: 'scrollAndTap',
    targetText: '第100项',
    maxScrolls: 20,
  },
  {
    type: 'assertExists',
    text: '详情页',
  },
];

const result = await workflow.runSequence(listTest);
```

### 示例 3: 表单填写测试

```typescript
const formTest: WorkflowStep[] = [
  {
    type: 'tap',
    text: '用户名',
  },
  {
    type: 'inputText',
    text: 'testuser',
  },
  {
    type: 'tap',
    text: '手机号',
  },
  {
    type: 'inputText',
    text: '13800138000',
  },
  {
    type: 'tap',
    text: '提交',
  },
  {
    type: 'waitFor',
    text: '提交成功',
    timeout: 3000,
  },
];

const result = await workflow.runSequence(formTest);
```

## API 参考

### Workflow 类

#### 构造函数

```typescript
constructor(hdc?: HDC)
```

创建 Workflow 实例。

- `hdc`: 可选的 HDC 实例，如果不提供会自动创建

#### 方法

##### `launchAndTap(bundleName, abilityName, targetText, timeout?)`

启动应用并点击目标元素。

##### `scrollAndTap(targetText, maxScrolls?)`

滚动查找并点击元素。

##### `assertExists(text)`

断言元素存在。

##### `assertTextEquals(elementText, expectedText)`

断言文本相等。

##### `runSequence(steps)`

执行一系列自动化步骤。

##### `getResults()`

获取所有执行结果。

##### `clearResults()`

清空执行结果。

## 类型定义

### WorkflowStep

工作流步骤的联合类型。

### WorkflowResult

```typescript
interface WorkflowResult {
  success: boolean;         // 整体是否成功
  steps: StepResult[];      // 每个步骤的结果
  summary: string;          // 执行摘要
}
```

### StepResult

```typescript
interface StepResult {
  step: WorkflowStep;       // 步骤定义
  success: boolean;         // 是否成功
  message: string;          // 结果消息
  duration: number;         // 执行耗时（毫秒）
  element?: UINode;         // 找到的元素（如果有）
}
```

## 注意事项

1. **设备连接**: 确保 HarmonyOS 设备已通过 hdc 连接
2. **屏幕尺寸**: 滑动操作会自动获取屏幕尺寸，如果获取失败会使用默认值 1080x2340
3. **超时设置**: 建议为 `launchAndTap` 和 `waitFor` 设置合理的超时时间
4. **滚动次数**: `scrollAndTap` 的默认最大滚动次数为 10，可根据需要调整
5. **元素定位**: 确保目标元素的文字在屏幕上可见且可识别

## 错误处理

每个方法都会返回包含 `success` 和 `message` 字段的结果对象：

```typescript
const result = await workflow.launchAndTap(...);

if (!result.success) {
  console.error('执行失败:', result.message);
  // 处理错误
}
```

## 性能优化建议

1. 使用 `runSequence` 批量执行步骤，而不是单独调用
2. 在步骤之间合理使用 `delay` 等待 UI 更新
3. 为 `waitFor` 设置合适的超时时间，避免过长的等待
4. 使用 `assertExists` 和 `assertTextEquals` 进行快速验证

## 相关模块

- `UIController`: 底层 UI 控制器
- `HDC`: HarmonyOS 设备通信工具
- `ElementLocator`: 元素定位器
- `RenderServiceParser`: UI 树解析器
