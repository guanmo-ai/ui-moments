# 第三方代码与许可

本页保存上游许可证原文与接入细节。所有来源（含字体、依赖与灵感参考）的总览见 [CREDITS.md](CREDITS.md)。

## Astryx

- 作者为 Meta Platforms, Inc.，上游为 [meta/astryx](https://github.com/meta/astryx)。
- 稳定版 `0.7.16` 提供 165 个主示例和 559 个变体。预发布版 `0.7.17-canary.g72f2d7c` 提供 26 个图表示例和 29 个实验组件示例。UI Moments 提供嵌入、主题和本地数据与素材。
- [Astryx MIT 许可原文](gallery/astryx/vendor/astryx/LICENSE)与 [StyleX MIT 许可原文](gallery/astryx/vendor/stylex/LICENSE)原样保存在仓库。稳定版与 canary 分别附带实际打包的依赖许可，路径为 `gallery/astryx/dist/THIRD_PARTY_LICENSES.txt` 和 `gallery/astryx/experimental/dist/THIRD_PARTY_LICENSES.txt`。具体包版本和许可证出处见 [接入说明](gallery/astryx/README.md)。

## Fluent UI React 9.75.2

- Microsoft Corporation 的 [Fluent UI React](https://github.com/microsoft/fluentui/tree/4846275a92419b2dd0440a432df755dcdcd427c3) 提供 51 个表单、导航和反馈示例所用的原版组件。
- UI Moments 新增演示内容、图鉴嵌入和浅深主题适配。演示使用系统字体及 MIT 依赖包内的图标。
- [Microsoft MIT 许可证原文](gallery/fluent-ui/vendor/LICENSE)随源码保留。发布包的 `gallery/fluent-ui/dist/THIRD_PARTY_LICENSES.md` 包含实际打包依赖的完整许可。

## LDRS 1.1.9

- 原作者：Griffin Johnston / UI Ball
- 原仓库：https://github.com/GriffinJohnston/ldrs
- 原演示：https://uiball.com/ldrs/
- 许可：MIT，原文见 `gallery/loaders/vendor/ldrs/LICENSE`
- 来源：npm发布包ldrs@1.1.9，来源地址与SHA-512记录在 `gallery/loaders/vendor/source.json`
- 接入范围：44款动效的Web Components、React组件、CSS、类型及source maps，发布包原样保留
- 我们增加：分类预览、搜索、参数面板、独立HTML与React代码生成及复制、合集展示录屏
- 展示视频由原作动效录制，无配乐

项目根目录MIT声明用于本项目新增代码，不替代以下原作者声明。

### 上游原始许可证

MIT License

Copyright (c) 2022 Griffin Johnston

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Micron.js

- 原作者与仓库：[Webkul / Micron.js](https://github.com/webkul/micron/tree/c46d1bd8f0cadddc635692bd61a1a0b2effaf987)
- 原始演示：[Micron.js](https://webkul.github.io/micron/)
- 上游文件：`dist/css/micron.css` 原样保存于 `gallery/micron/vendor/micron/`
- 原始许可：[MIT · Webkul](gallery/micron/vendor/micron/LICENSE)
- UI Moments 提供按钮外观、点击与键盘触发、主题和 HTML 导出。导出的 HTML 保留上游 CSS 和完整许可。

## SVG Spinners

- 原作者与仓库：[Utkarsh Verma / SVG Spinners](https://github.com/n3r4zzurr0/svg-spinners/tree/abfa05c49acf005b8b1e0ef8eb25a67a7057eb20)
- 上游文件：46 种图形各有 CSS 和 SMIL 动画版，原 SVG 文件均保存在 `gallery/svg-spinners/vendor/svg-spinners/`
- 原始许可：[MIT · Utkarsh Verma](gallery/svg-spinners/vendor/svg-spinners/LICENSE)
- UI Moments 以 CSS 版提供同级画廊、尺寸、颜色、暂停和代码导出。HTML 和 React 示例保留原始 SVG 及完整许可。

## Geist / Geist Mono

界面使用自托管的Geist与Geist Mono字体，按SIL Open Font License 1.1分发；原文分别保留在 `assets/fonts/OFL-Geist.txt` 与 `assets/fonts/OFL-GeistMono.txt`。字体来源：https://github.com/vercel/geist-font 。

## 日期选择器运行依赖

已下架的日期选择器保留源码。独立构建时，React、React DOM 和 Scheduler 的 MIT 许可证写入 `gallery/date-picker/dist/THIRD_PARTY_LICENSES.md`。

## Loading UI（47个动效）

- 原作者：Bartosz Zagrodzki
- 原仓库：https://github.com/turbostarter/loading-ui
- 原演示：https://www.loading-ui.com/
- 固定提交：`1b5348c6d9c0f335fba728ec5af05de8b2b40845`
- 原组件、demo和工具文件原样保存在 `gallery/loading-ui/vendor/loading-ui/`，文件SHA-256见 `vendor/source.json`
- 我们补充：同级画廊、分类、中文说明、浅深主题、尺寸与颜色适配、暂停／离屏处理、独立HTML与TSX示例
- 每份导出保留原作者与完整许可；HTML运行依赖的完整许可另见 `gallery/loading-ui/dist/THIRD_PARTY_LICENSES.txt`
- 根目录MIT仅用于本站新增代码，不替换以下上游版权

### Loading UI 上游原始许可证

MIT License

Copyright (c) 2026 Bartosz Zagrodzki

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
