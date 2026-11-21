# Fluent UI 交互示例

主图鉴收录 51 个 [Microsoft Fluent UI React](https://github.com/microsoft/fluentui/tree/4846275a92419b2dd0440a432df755dcdcd427c3) 原版组件的交互示例。在图鉴搜索 `Fluent UI` 可以查看全部。UI Moments 编写了演示内容，适配卡片尺寸、浅深主题和图鉴的动效控制。

组件包固定为 `@fluentui/react-components@9.75.2`，其余依赖由 `package-lock.json` 固定。Microsoft 版权和 MIT 许可原文见 [vendor/LICENSE](vendor/LICENSE)，构建结果的 `dist/THIRD_PARTY_LICENSES.md` 收录实际打包依赖的许可。演示采用系统字体，使用的图标随开源组件依赖分发。

## 收录范围

按 [Fluent 2 组件目录](https://fluent2.microsoft.design/components/web/react) 和固定版本的实际导出核对。51 个示例覆盖 44 个上游组件包，包含可选卡片、头像组的展开、排序数据表、侧栏导航、加载状态切换，以及仍可在该版本运行的 Alert 和虚拟列表。按钮、抽屉、标签等具有不同操作方式的变体也有独立示例。

静态 Avatar、Badge、Divider、Image、Persona 和 Text 随复合组件使用时属于演示内容。Label 随表单控件展示。Info Button 使用 v9 入口导出的 `react-infolabel` 实现。Provider、Portal、定位和动效等基础工具通过使用它们的组件体现。组件的触发器、面板、列表项等插槽随所属示例展示。

在本目录执行 `npm ci --ignore-scripts` 和 `npm run dev`。独立复制源码时保留仓库结构中的 [assets/embed.js](../../assets/embed.js)。开发地址通过 `?sample=drawer` 等查询参数选择示例，完整条目和上游链接见 [catalog.mjs](catalog.mjs)。
