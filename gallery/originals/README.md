# 原创控件 · UI Moments Originals

打开 [交互页](index.html) 可以同时操作六个控件；`index.html#<id>` 只显示其中一个。主画廊通过 `?embed=ui&sample=<id>` 分别嵌入。

| 控件 | ID | 交互 | 无障碍 |
| --- | --- | --- | --- |
| 墨滴开关 | `ink-switch` | 拨钮里的墨滴落进轨道并晕开，关闭时沿原路收回 | `role="switch"`，空格 / 回车 |
| 刻度旋钮 | `detent-dial` | 围绕旋钮拖动，指针被最近的刻度吸住，松手弹回 | `role="slider"`，方向键、PageUp/PageDown、Home/End |
| 长按确认 | `hold-confirm` | 按住填满才执行，中途松手快速退回，轻点给出提示 | 按住空格 / 回车；状态写入 `aria-live` |
| 滚轮步进器 | `odometer-stepper` | 每一位数字朝变化方向滚动，长按加速，到边界轻顶 | `role="spinbutton"`，方向键、PageUp/PageDown、Home/End |
| 翻页标签 | `leaf-tabs` | 选中底卡像一页纸翻到新标签，柱形依次生长 | `tablist` / `tab` / `tabpanel`，方向键与 Home/End |
| 潮汐进度 | `tide-progress` | 液面按弹簧追上目标，变化越快晃得越厉害，数字随液面反色 | 按钮 `aria-label` 报告当前进度 |

## 来源

六个控件的构思、造型、动效与代码均由 UI Moments 原创，没有参考特定作品，也没有使用第三方代码、字体以外的素材或依赖。字体 Geist 按 SIL OFL 1.1 自托管，见 [assets/fonts](../../assets/fonts/)。源码按项目 [MIT 许可证](../../LICENSE) 提供。

## 设计约定

- 颜色与画廊一致：深色底 `#1c1e27`、强调色 `#bcc4ff`；浅色底 `#f1f2f8`、强调色 `#434eaa`。危险操作单独使用红色。
- 舞台使用 `container-type: size`，控件按卡片尺寸整体缩放；指针坐标始终用实际几何计算，缩放后仍然准确。
- 嵌入画廊时由 [embed.js](../../assets/embed.js) 同步主题与离屏状态。`data-gallery-active="false"` 时停止过渡和 canvas 绘制。
- 开启「减少动态效果」时保留全部功能，只去掉形变、晃动与滚动动画。

## 新增一个原创控件

1. 在 `index.html` 的 `.samples` 中加一个 `<section class="sample" id="<id>">`，控件放在 `.stage > .widget` 里。
2. 脚本写在独立的 `{ ... }` 块中，动画前先检查 `motionEnabled()`。
3. 在 [gallery/works.js](../works.js) 的 `originalControls` 中登记，并运行 `npm test`。
