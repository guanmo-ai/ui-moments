# LDRS · 44款加载动效

完整集成 [LDRS](https://github.com/GriffinJohnston/ldrs) 1.1.9，原作者为 **Griffin Johnston / UI Ball**，MIT许可。44款动画保留原实现；UI Moments负责浏览和使用体验。

## 在线体验

https://guanmo-ai.github.io/ui-moments/gallery/ldrs/

本地在仓库根目录运行 `python3 -m http.server 5173 --bind 127.0.0.1`，打开 `/gallery/ldrs/`。无需构建或CDN。

## 使用

- 按英文名称、中文描述搜索，按环形、圆点、线条、几何筛选。
- 点击任意动效，调整它支持的颜色、尺寸、周期、线条粗细、长度或轨道透明度。
- 复制或下载 **HTML + CSS**：是独立页面，无外部依赖，用浏览器打开即可；使用现代浏览器原生声明式Shadow DOM隔离样式。
- 复制或下载 **React**：先安装 `npm install ldrs@1.1.9`，示例包含组件与对应CSS导入。
- 每份生成代码均保留原作者、仓库来源及完整MIT许可；卡片上的复制按钮直接复制默认HTML示例。
- 支持浅深背景、键盘操作和减少动态效果；搜索后仍可打开全部匹配项。

## 第三方实现与我们的工作

原作提供44款动画的CSS/SVG与组件实现。`vendor/ldrs/`完整保存npm发布包，包含Web Components、React组件、类型及source maps，没有改写其中的文件。版本、tarball与SHA-512见 `vendor/source.json`。

UI Moments新增分类、中文说明、参数调整、代码生成/复制/下载及响应式界面；HTML导出保留原作实际渲染的标记与样式。`preview.mp4`为4:5、1080×1350、60fps、12秒无配乐合集，覆盖44款动效。

## 检查

运行 `npm run test:ldrs`。完整许可见 [原始LICENSE](vendor/ldrs/LICENSE) 和 [第三方声明](../../THIRD_PARTY_NOTICES.md)。后续引入新的库时，各自记录来源、固定版本、接入范围及许可证，不替换上游署名。
