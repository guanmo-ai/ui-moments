# Roomlight

参考 Sean Galt 的 [X 演示](https://x.com/seanaiux/status/2123079833278423065)与 [Glass Scenes 模板页](https://uberdesigner.ai/t/glass-scenes)。借鉴玻璃控件的边缘折射、根据场景切换环境光色、拖动调光。采用海岸背景、两列场景按钮和独立调光条。公开页的提示词和工程下载需要 Pro 订阅。本作品的代码、界面与背景素材独立制作。

用按钮切换 Daybreak、Reading、Cinema、Midnight。拖动当前场景的卡片或底部调光条，两种操作都会更新该场景。场景按钮上按上下方向键切换，左右方向键调整当前场景亮度。点击 Auto preview 轮播，手动操作时停止。支持系统减少动态效果设置；WebGL 不可用时，使用 CSS 实现基础灯光与半透明控件。

从仓库根目录运行 `python3 -m http.server 5173`，打开 `/gallery/roomlight/`。共享资源为 `assets/embed.js` 和 `assets/fonts/Geist-latin-wght.woff2`。代码采用仓库的 MIT 许可证，Geist 采用 [SIL OFL](../../assets/fonts/OFL-Geist.txt)。

[海岸背景](coast.webp)用内置 ImageGen 生成。以下为生成提示词。

> Use case: photorealistic-natural. Asset type: landscape background for a clear glass lighting-control interface. A quiet rugged coast viewed low from the edge of the sea, with a small wave sliding between broad slate rocks toward the camera. Open water to the horizon, a pearl-grey and dusty peach morning sky, low soft coastal haze. The far horizon is just above the middle, with the source of light well left of center behind a thin cloud. On the right half from mid-frame into the foreground, gently layered dark slate rocks and a few curved lace-thin surf lines give an optical lens visible details to bend. The lower-left foreground is quieter dark wet sand and shallow ripples for white overlaid text. Plenty of readable midtones that can be dimmed or relit; cool blue-grey ocean, charcoal stone, muted peach and pale silver, no green cast. Wide landscape 3:2, natural premium location photography with a real sense of depth, clean smooth tonal gradients, restrained color, fine sharp water texture, no grain or simulated film effects. No people, buildings, graphics, text, logo, or watermark.
