# ui-moments

好的界面，往往赢在某一个瞬间。这里收集这样的瞬间：每一个都能直接上手玩，附一段录屏，并写清灵感来自谁、我们改进了哪里。

**在线体验：[guanmo-ai.github.io/ui-moments](https://guanmo-ai.github.io/ui-moments/)**

[![作品预览](assets/og.jpg)](https://guanmo-ai.github.io/ui-moments/)

## 作品

| 作品 | 说明 | 灵感来源 |
| --- | --- | --- |
| [44款加载动效 · LDRS](gallery/ldrs/) | 搜索、分类、调整参数；复制独立 HTML 或 React 示例 | [Griffin Johnston / UI Ball](https://github.com/GriffinJohnston/ldrs)，完整集成，MIT |
| [昼夜开关](gallery/day-night-toggle/) | 像素点沿螺旋重组成月亮，轮廓光绕拨钮转一圈，可以拖到一半停住 | [@kaolti](https://x.com/kaolti/status/2119151022014894260) |
| [调光旋钮](gallery/light-scenes/) | 光从旋钮出发，按距离依次照亮每张卡片 | [@chetaslua](https://x.com/chetaslua/status/2119353034165891308) |
| [海平线](gallery/light-scenes/) | 拖动时间，太阳落下，灯塔和窗户依次亮起 | [@chetaslua](https://x.com/chetaslua/status/2119353034165891308) |
| [浦肯野花园](gallery/light-scenes/) | 光变暗时红花最先消失，萤火虫不受影响 | 原创 |
| [霓虹招牌](gallery/light-scenes/) | 天黑到 50 lux 以下，招牌带着闪烁依次点亮 | 原创 |
| [色温台灯](gallery/light-scenes/) | 拖动色温，整页纸面跟着变暖 | [@chetaslua](https://x.com/chetaslua/status/2119353034165891308) |

每个作品是一个不依赖构建的 HTML 文件，下载后用浏览器直接打开即可。

## 本地运行

```bash
npm run dev        # 打开 http://localhost:5173
```

## 录制视频

支持逐帧录制的作品内置录制模式：画面由虚拟时钟逐帧推进，光标操作由脚本控制，所以每次录出来的视频完全一样，不掉帧。

```bash
npm install
npm run record:toggle          # out/day-night-toggle.mp4，2880×2160，60fps
npm run record:light-scenes    # out/light-scenes.mp4，2880×1800，60fps
```

需要 Node.js 20+ 和 ffmpeg。用法见 [tools/record.js](tools/record.js) 开头的说明。

## 新增作品

1. 在 `gallery/<作品名>/` 放入 `index.html`、预览视频、封面图和 `README.md`（写明灵感来源和改进点）。
2. 在 [gallery/works.js](gallery/works.js) 里加一项，首页会自动出现。

## 参考与署名

我们会参考别人的作品，也会把参考了谁写清楚。规则见 [参考与署名](docs/attribution.md)。

## 许可

本项目新增代码以 [MIT](LICENSE) 许可发布。第三方实现保留原作者版权和原始许可证，见 [第三方声明](THIRD_PARTY_NOTICES.md)。

## LDRS 集成

44款加载动效完整收录于 `gallery/ldrs/`，使用原样保存的 LDRS 1.1.9 发布包，在线预览无需第三方 CDN。可搜索、分类、调整每款支持的参数，复制或下载独立 HTML 与 React 示例；每份示例保留完整 MIT 许可。详见 [集成说明](gallery/ldrs/README.md)。

检查：`npm run test:ldrs`。LDRS页面不需要构建，通过静态服务器运行即可。
