# 性能验证

发布包按页面构建带内容指纹的 JavaScript。页面预载静态依赖，交互预览和第三方示例在需要时加载。首页按段布局，搜索仍覆盖完整目录。快速滚动时推迟新预览的初始化，已操作过的交互保留状态。

```sh
npm run setup
npm run build
npm run package:site
npm run test:performance
npm run test:browser
```

`test:performance` 核对发布包中的初始模块数量、gzip 大小和 Roomlight 紧凑背景图体积。浏览器测试从 GitHub Pages 形式的子路径加载发布包，覆盖远处卡片、慢资源重试、连续调参和导出一致性。两类检查都在 CI 中执行。

评估速度时，用相同的浏览器、视口、CPU 和网络条件，对比修改前后的全新浏览器上下文。首页、风格库和动效库分别记录首屏和首个可操作预览，另外测量长距离滚动与连续调参。至少跑三轮，报告中位数和明显波动。CI 以可复现的大小与请求约束为准，耗时用于本地对照。
