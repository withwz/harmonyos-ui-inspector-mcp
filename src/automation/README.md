# UI Automation Controller

智能点击控制器，用于 HarmonyOS 应用的自动化 UI 交互操作。

## 功能特性

- **智能元素定位**：通过文本、类型、属性等多种方式查找 UI 元素
- **自动点击**：根据元素文字内容自动执行点击操作
- **元素等待**：等待特定元素出现后再执行操作
- **文本输入**：支持向指定元素输入文字
- **滑动操作**：支持屏幕滑动操作

## 核心类

### UIController

主要的控制器类，提供所有自动化操作方法。

#### 构造函数

```typescript
constructor(hdc?: HDC)
```

参数：
- `hdc` - 可选的 HDC 实例，如果不提供则自动创建

#### 主要方法

##### smartTap

根据文字智能点击目标元素。

```typescript
async smartTap(text: string, pid?: number): Promise<{
  success: boolean;
  message: string;
  element?: UINode;
  coordinates?: { x: number; y: number };
}>
```

参数：
- `text` - 目标文字
- `pid` - 可选的进程 ID，用于限定搜索范围

返回：
- `success` - 是否成功
- `message` - 结果消息
- `element` - 找到的元素（如果成功）
- `coordinates` - 点击坐标（如果成功）

**示例：**
```typescript
const controller = new UIController();

// 点击包含"登录"文字的按钮
const result = await controller.smartTap('登录');
if (result.success) {
  console.log(`成功点击坐标: (${result.coordinates.x}, ${result.coordinates.y})`);
} else {
  console.error(result.message);
}
```

##### tapElement

点击指定的 UI 元素。

```typescript
async tapElement(node: UINode): Promise<{
  success: boolean;
  message: string;
  coordinates?: { x: number; y: number };
}>
```

**示例：**
```typescript
// 先查找元素
const elements = await controller.findElements({ text: '设置' });
if (elements.length > 0) {
  const result = await controller.tapElement(elements[0]);
  console.log(result.message);
}
```

##### waitForElement

等待元素出现。

```typescript
async waitForElement(
  text: string,
  timeout: number = 10000,
  pid?: number
): Promise<UINode | null>
```

参数：
- `text` - 目标文字
- `timeout` - 超时时间（毫秒），默认 10000ms
- `pid` - 可选的进程 ID

返回：
- 找到的元素，超时返回 null

**示例：**
```typescript
// 等待"加载完成"文字出现，最多等待 5 秒
const element = await controller.waitForElement('加载完成', 5000);
if (element) {
  console.log('元素已出现');
} else {
  console.log('等待超时');
}
```

##### findElements

根据多个条件查找元素。

```typescript
async findElements(
  conditions: {
    text?: string;
    type?: string;
    properties?: Record<string, any>;
  },
  pid?: number
): Promise<UINode[]>
```

**示例：**
```typescript
// 查找类型为 Button 且包含"提交"文字的元素
const buttons = await controller.findElements({
  text: '提交',
  type: 'Button'
});

// 查找具有特定属性的元素
const inputs = await controller.findElements({
  type: 'TextField',
  properties: {
    'editable': 'true'
  }
});
```

##### inputText

向指定元素输入文字。

```typescript
async inputText(text: string, element?: UINode): Promise<{
  success: boolean;
  message: string;
}>
```

**示例：**
```typescript
// 先点击输入框再输入文字
const inputElements = await controller.findElements({ type: 'TextField' });
if (inputElements.length > 0) {
  const result = await controller.inputText('Hello World', inputElements[0]);
  console.log(result.message);
}

// 直接输入到当前焦点元素
await controller.inputText('直接输入');
```

##### swipe

滑动屏幕。

```typescript
async swipe(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  duration: number = 300
): Promise<{
  success: boolean;
  message: string;
}>
```

**示例：**
```typescript
// 向上滑动（从屏幕底部滑到顶部）
const screenWidth = 1080;
const screenHeight = 2340;
await controller.swipe(
  screenWidth / 2,      // startX: 屏幕中心
  screenHeight - 200,   // startY: 接近底部
  screenWidth / 2,      // endX: 屏幕中心
  200,                  // endY: 接近顶部
  300                   // 持续时间 300ms
);
```

### ElementLocator

元素定位器工具类，提供更丰富的元素查找功能。

#### 静态方法

##### findByText

按文本查找元素。

```typescript
static findByText(
  rootNode: UINode,
  text: string,
  exactMatch: boolean = false
): ElementMatch[]
```

##### findByProperty

按属性查找元素。

```typescript
static findByProperty(
  rootNode: UINode,
  propertyName: string,
  propertyValue: any
): ElementMatch[]
```

##### findByType

按类型查找元素。

```typescript
static findByType(rootNode: UINode, type: string): ElementMatch[]
```

##### findByConditions

按多个条件查找元素（AND 逻辑）。

```typescript
static findByConditions(
  rootNode: UINode,
  conditions: {
    text?: string;
    type?: string;
    properties?: Record<string, any>;
  }
): ElementMatch[]
```

##### getBestMatch

获取最佳匹配（得分最高的元素）。

```typescript
static getBestMatch(matches: ElementMatch[]): ElementMatch | null
```

## 使用示例

### 完整的自动化流程示例

```typescript
import { UIController } from './automation/controller.js';
import { HDC } from './utils/hdc.js';

// 创建控制器
const hdc = new HDC();
const controller = new UIController(hdc);

async function automateLogin() {
  try {
    // 1. 等待登录按钮出现
    console.log('等待登录按钮...');
    const loginButton = await controller.waitForElement('登录', 5000);
    if (!loginButton) {
      console.error('未找到登录按钮');
      return;
    }

    // 2. 点击用户名输入框
    console.log('点击用户名输入框...');
    const usernameResult = await controller.smartTap('用户名');
    if (!usernameResult.success) {
      console.error('点击用户名输入框失败');
      return;
    }

    // 3. 输入用户名
    console.log('输入用户名...');
    await controller.inputText('myusername');

    // 4. 点击密码输入框
    console.log('点击密码输入框...');
    const passwordResult = await controller.smartTap('密码');
    if (!passwordResult.success) {
      console.error('点击密码输入框失败');
      return;
    }

    // 5. 输入密码
    console.log('输入密码...');
    await controller.inputText('mypassword');

    // 6. 点击登录按钮
    console.log('点击登录按钮...');
    const loginResult = await controller.smartTap('登录');
    if (!loginResult.success) {
      console.error('点击登录按钮失败');
      return;
    }

    console.log('登录流程完成');

  } catch (error) {
    console.error('自动化流程出错:', error);
  }
}

// 执行自动化
automateLogin();
```

### 高级查找示例

```typescript
// 查找所有按钮
const buttons = await controller.findElements({ type: 'Button' });

// 查找包含"确认"文字的可点击元素
const confirmElements = await controller.findElements({
  text: '确认',
  properties: {
    'clickable': 'true'
  }
});

// 使用 ElementLocator 直接操作
import { ElementLocator, RenderServiceParser } from './parsers/renderService.js';

const uiTreeOutput = await hdc.getUiTree();
const trees = RenderServiceParser.parse(uiTreeOutput);

for (const [pid, root] of trees) {
  // 查找特定类型的元素
  const matches = ElementLocator.findByType(root, 'Image');

  // 获取最佳匹配
  const best = ElementLocator.getBestMatch(matches);
  if (best) {
    console.log('最佳匹配路径:', ElementLocator.formatPath(best.path));
  }
}
```

## 注意事项

1. **坐标提取**：确保 UI 树中包含正确的 bounds 信息，否则无法提取坐标
2. **元素查找**：使用多个条件组合查找可以提高准确性
3. **等待机制**：对于动态加载的内容，建议使用 `waitForElement` 而不是直接查找
4. **错误处理**：所有方法都返回结果对象，需要检查 `success` 字段
5. **性能考虑**：频繁获取 UI 树可能影响性能，建议合理设置缓存策略

## 依赖关系

- `HDC` - 与设备通信的工具类
- `RenderServiceParser` - 解析 UI 树的解析器
- `ElementLocator` - 元素定位工具

## 扩展开发

可以通过继承 `UIController` 类来扩展功能：

```typescript
class MyController extends UIController {
  async customTap() {
    // 自定义点击逻辑
  }

  async waitForAndTap(text: string, timeout: number = 10000) {
    const element = await this.waitForElement(text, timeout);
    if (element) {
      return await this.tapElement(element);
    }
    return { success: false, message: '元素未出现' };
  }
}
```
