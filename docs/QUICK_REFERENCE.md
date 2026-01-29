# HarmonyOS UI Inspector MCP - 快速参考

## MCP 工具速查表

| 工具名 | 功能 | 必需参数 |
|--------|------|----------|
| `list_windows` | 列出所有窗口 | 无 |
| `get_ui_tree` | 获取 UI 组件树 | 无（可选：format, pid, maxDepth...） |
| `list_abilities` | 列出所有应用 | 无 |
| `screenshot` | 截图 | 无（可选：outputPath） |
| `tap` | 点击屏幕 | x, y |
| `swipe` | 滑动屏幕 | x1, y1, x2, y2（可选：duration） |
| `press_key` | 按键 | code |
| `smart_tap` | 智能点击 | text（可选：pid） |
| `start_app` | 启动应用 | bundleName（可选：abilityName） |
| `stop_app` | 停止应用 | bundleName |
| `restart_app` | 重启应用 | bundleName（可选：abilityName） |
| `get_app_status` | 获取应用状态 | bundleName |

---

## get_ui_tree 输出模式

```typescript
// 摘要模式（推荐，数据量小）
{ format: 'summary' }

// 紧凑 JSON 模式
{ format: 'compact', pid: 1937, maxDepth: 50 }

// 完整 JSON 模式（数据量大）
{ format: 'full' }

// 原始文本模式
{ format: 'text' }

// 搜索模式
{ format: 'search', nodeName: '登录', nodeType: 'Text' }
```

---

## 常用按键名称

| 名称 | 功能 |
|------|------|
| Home | HOME 键 |
| Back | 返回键 |
| Power | 电源键 |

---

## 典型操作示例

### 启动应用并点击
```
1. start_app { bundleName: "com.example.app" }
2. [等待 2-3 秒]
3. tap { x: 540, y: 1200 }
4. screenshot { }
```

### 搜索并点击元素
```
1. get_ui_tree { format: "search", nodeName: "登录" }
2. tap { x: <从搜索结果获取>, y: <从搜索结果获取> }
```

### 滚动列表
```
1. screenshot { }
2. swipe { x1: 540, y1: 1800, x2: 540, y2: 600, duration: 300 }
3. screenshot { }
```

---

## 默认值汇总

| 参数 | 默认值 |
|------|--------|
| screenshot.outputPath | /tmp/screenshot.jpeg |
| swipe.duration | 300ms |
| get_ui_tree.format | summary |
| get_ui_tree.maxDepth | 50 |
| get_ui_tree.maxResults | 50 |
| start_app.abilityName | bundleName.MainAbility |
