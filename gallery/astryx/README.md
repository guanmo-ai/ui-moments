# Astryx 组件接入

搜索 `Astryx` 可在现有图鉴找到 779 个示例，也可以按具体组件名搜索。详情保留上游链接、版本和 MIT 许可。

| 来源 | 数量 | 版本与覆盖范围 |
| --- | ---: | --- |
| 官方主示例 | 165 | `0.7.16` 的全部可用主示例，包括按钮、表单、导航、表格、弹层与聊天组件 |
| 官方变体 | 559 | 同版 CLI 发行包的可用附加示例，已作为主示例接入的两个模板各计一次 |
| 图表 | 26 | `0.7.17-canary.g72f2d7c` 的 Storybook 示例，包括柱线图、区间、K 线、拖选、缩放、雷达、饼图、桑基、3D、WebGL 和 Vega |
| 实验组件 | 29 | 同一 canary 的 Storybook 示例，包括代码编辑、评论、日程、深层导航、标签栏、差异对比与穿梭列表 |

## 来源与适配

- 作者为 Meta Platforms, Inc.。稳定版的[发布记录](https://github.com/meta/astryx/commit/3fcee8b8a559c41735064b2560fc9d358c99919b)、[主示例路径](showcases.mjs)、[变体路径](variants.mjs)和[依赖锁文件](package-lock.json)记录了使用的版本和来源。日期范围、底部弹层和命令面板沿用本站原组件演示，Complex Selector 与 Drawer Header 采用同版本的其他官方例子。
- 图表与实验组件来自[固定的 canary 提交](https://github.com/meta/astryx/commit/72f2d7caa92427a619a2ee2472d8606f0208ef06)和同版本 npm 包。[选用清单](experimental/stories.mjs)指定了 Storybook 示例，[依赖锁文件](experimental/package-lock.json)保存每个发行包的校验值。原始 Storybook 源码和许可证保存在 [vendor/astryx](experimental/vendor/astryx/)。canary 使用独立构建入口，既有主示例继续使用 `0.7.16`。
- UI Moments 提供画廊嵌入、卡片布局和深浅主题。演示素材使用本站图片、姓名缩写头像和本地数据。引用演示省去站外图标。编译会处理官方示例里的 StyleX。图表交互使用本地示例数据，区间拖选的折线示例用连续坐标保留月份标签。示例在接近视口或打开详情时才加载。
- 稳定版和 canary 分别生成随网站分发的 `dist/THIRD_PARTY_LICENSES.txt`。文件包含实际打包的依赖许可证。Astryx 和 StyleX 的 MIT 原文也保存在 [vendor](vendor/)。

在仓库根目录运行 `npm run setup` 安装锁定依赖，然后运行 `npm run dev` 构建并打开图鉴。
