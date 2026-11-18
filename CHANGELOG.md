# 更新日志

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。网站随 `main` 持续发布，因此按日期记录。

## 2026-11-18（第二次更新）

### 新增
- **8 个无文字的图形交互**（`gallery/originals/visual.html`）：磁吸点阵、果冻方块、色轮、融合水滴、拉绳灯、抛硬币、涟漪画板、花朵开关。
- **6 个原创操作反馈**（`actions.html`）：复制按钮、点赞爆发、纸飞机发送、下载进度环、验证码、通知铃。
- **6 个原创表单控件**（`inputs.html`）：划线清单、石子评分、档位滑块、密码强度、标签输入、方案卡片。
- **8 款原创加载动效**（`gallery/loaders/motifs.mjs`）：潮环、叠块、节拍、浮字、点阵波、沙漏、文稿、时针。
- 首屏优先展示无文字的图形交互；图鉴共 198 个示例，其中原创 45 个。

### 调整
- 简化署名规则：参考想法的作品只在 `works.js` 的 `credit` 字段标注，CREDITS.md 不再逐条维护；通用交互模式不需要标注。

## 2026-11-18

### 新增
- **6 个原创控件**：墨滴开关、刻度旋钮、长按确认、滚轮步进器、翻页标签、潮汐进度（`gallery/originals/`），全部支持键盘、深浅主题与「减少动态效果」。
- [CREDITS.md](CREDITS.md)：集中列出所有上游仓库、字体、依赖与灵感来源。
- 英文版 [README.en.md](README.en.md)、贡献指南、行为准则、安全策略、issue 与 PR 模板。
- 原创控件的浏览器测试与目录测试。
- [docs/CODEX_HANDOFF.md](docs/CODEX_HANDOFF.md)：仓库审计结果与后续任务交接。

### 改进
- 首页重新设计：新增首屏徽标、统计面板、主次操作按钮与完整页脚。
- 图鉴与风格库共用同一套颜色令牌和导航，导航新增「原创」与 GitHub 入口。
- 更顺滑的体验：卡片与详情淡入、iframe 载入完成后再显示、深浅切换使用 View Transitions 交叉淡化、悬停阴影。
- 弹性控件嵌入画廊时与卡片舞台同色。
- 新的社交分享图与 README 预览图（深浅两版）。

## 2026-11 之前

早期提交记录见 [Git 历史](https://github.com/guanmo-ai/ui-moments/commits/main)：昼夜开关、光照场景、LDRS / Loading UI / SVG Spinners / Micron.js 集成、风格库与复刻提示词。
