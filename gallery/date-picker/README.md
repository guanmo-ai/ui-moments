# 日期选择器

UI Moments 实现的基础日期选择器。画廊卡片显示周视图，并可前后切换周。放大后显示完整月份和相邻日期，尺寸较低时自动切回周视图。

按方向键移动焦点，Home / End 跳到周首 / 周末，Page Up / Down 翻月，Enter 或空格选中。点击「今天」回到浏览器本地日期。

在仓库根目录运行 `npm run setup` 后可用 `npm run dev:date` 单独调试。组件入口是 `src/components/DatePicker.tsx`，日期计算在 `src/lib/calendar.ts`。外观复用仓库的 `assets/style-tokens.css`，构建会将样式一起打包。

日期选择的构思来自 [Uberdesigner Holiday Calendar](https://uberdesigner.ai/) 的本地实验。这里的 React 组件、样式和日期逻辑由 UI Moments 编写。
