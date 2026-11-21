const storageKey = 'ui-moments-language';
const changeEvent = 'ui-moments:language';
let language = 'en';

const chinese = {
  'UI Moments · Interactive UI Gallery': 'UI Moments · 界面交互图鉴',
  'Style Library · UI Moments': '风格库 · UI Moments',
  'Loading Animations · UI Moments': '加载动效 · UI Moments',
  'Play with interactive UI examples, compare styles, and customize and export loading animations.': '体验 UI 交互、比较组件风格，自定义并导出加载动效。',
  'Try the same UI component in Original, Memphis, Bauhaus, and Pixel styles.': '体验同一个组件的原版、孟菲斯、包豪斯和像素风格。',
  'Preview and customize 44 loaders, then copy standalone HTML or React code.': '预览和调整 44 款加载动效，复制独立 HTML 或 React 代码。',
  'Switch to Simplified Chinese': '切换为简体中文',
  'Switch to English': '切换为英文',
  'Switch to light mode': '切换浅色模式',
  'Switch to dark mode': '切换深色模式',
  'UI Moments home': 'UI Moments 首页',
  'Skip to the gallery': '跳到画廊',
  'Skip to components and styles': '跳到组件与风格选择',
  'Site': '站点导航',
  'Gallery': '画廊',
  'Style Library': '风格库',
  'Loading Animations': '加载动效',
  'Loaders': '加载动效',
  'Follow @guanmo_ai ↗': '关注 @guanmo_ai ↗',
  'GitHub repository': 'GitHub 源码',
  'Interactive UI Gallery': '界面交互图鉴',
  'Explore': '浏览',
  'Explore {count} live UI examples.': '体验 {count} 个可直接操作的 UI 示例。',
  'Try Jelly Cube': '试试 Jelly Cube',
  'UI components': 'UI 组件',
  'Live UI components': '实时 UI 组件',
  'Filter by category': '按组件类别筛选',
  'Search UI': '搜索 UI',
  'Search': '搜索',
  'Pause motion': '暂停动效',
  'Play motion': '播放动效',
  'Pause {name} preview': '暂停 {name} 预览',
  'Retry {name} preview': '重试 {name} 预览',
  'Favorites': '收藏',
  'Save component': '收藏组件',
  'Remove from favorites': '取消收藏',
  'Columns': '列数',
  '4 columns': '4 列',
  '5 columns': '5 列',
  '6 columns': '6 列',
  'Filter by preview motion': '按预览动效筛选',
  'All previews': '全部预览',
  'Animated previews': '动态预览',
  'Static previews': '静态预览',
  'Shape': '形态',
  'Effect': '效果',
  'All UI': '全部 UI',
  'All examples': '全部作品',
  'All': '全部',
  'Controls': '交互控件',
  'Click Effects': '点击反馈',
  'Click effect': '点击效果',
  'Loading': '加载动效',
  'Color': '颜色',
  'All effects': '全部效果',
  'All shapes': '全部形态',
  'Bounce': '回弹',
  'Swing': '摆动',
  'Flash': '闪动',
  'Rings': '环形',
  'Dots': '圆点',
  'Lines': '线条',
  'Geometry': '几何',
  'Text': '文字',
  'Characters': '字符',
  'Icons': '图标',
  'States': '状态',
  'Switch': '开关',
  'Slider': '滑块',
  'Segmented control': '分段控件',
  'Bookmark button': '收藏按钮',
  'Button': '按钮',
  'Dial': '旋钮',
  'Stepper': '步进器',
  'Tabs': '标签页',
  'Progress': '进度',
  'Checkbox': '复选框',
  'Rating': '评分',
  'Input': '输入框',
  'Radio cards': '单选卡片',
  'Pointer effect': '指针反馈',
  'Drag': '拖动',
  'drag': '拖动',
  'Card': '卡片',
  'Color picker': '颜色选择器',
  'Carousel': '轮播',
  'Icon': '图标',
  'List': '列表',
  'Menu': '菜单',
  'Rhythm': '节奏',
  'Pagination': '分页',
  'Tab bar': '标签栏',
  'Accordion': '折叠面板',
  'Dashboard': '仪表盘',
  'Lighting': '灯光',
  'Date range': '日期范围',
  'Overlay': '浮层',
  'Search panel': '搜索面板',
  'Drawer': '抽屉',
  'Popover': '弹出提示',
  'Notification': '通知',
  'Disclosure': '展开面板',
  'Combobox': '组合框',
  'Dropdown': '下拉框',
  'Dialog': '对话框',
  'Number input': '数字输入框',
  'Field': '表单字段',
  'Radio': '单选',
  'Select': '选择框',
  'Tags': '标签',
  'Navigation': '导航',
  'Table': '表格',
  'Toolbar': '工具栏',
  'Loading state': '加载状态',
  'Tooltip': '工具提示',
  'Tree': '树形列表',
  'Loader': '加载指示器',
  'Details': '详情',
  'Retry details': '重试详情',
  'Loading details': '详情加载中',
  'No components match your search.': '没有匹配的组件。',
  'No components match these filters.': '当前筛选没有匹配的组件。',
  'No favorites yet.': '还没有收藏的组件。',
  '{count} components': '{count} 个组件',
  'Preview failed. Click to retry.': '预览加载失败，点击重试。',
  'Preview unavailable': '预览暂不可用',
  '{name} details could not load. Try again.': '{name} 详情加载失败，请重试。',
  '{name} could not load. Try again.': '{name} 加载失败，请重试。',
  '{name} interactive preview': '{name} 交互预览',
  '{name} enlarged preview': '{name} 放大预览',
  'Interactive component': '交互组件',
  'An open-source gallery of UI interactions and motion.': '开源的 UI 交互与动效图鉴。',
  'Project': '项目',
  'Contribute': '参与贡献',
  'Changelog': '更新日志',
  'Credits': '致谢',
  'Community': '社区',
  'Report an issue': '反馈问题',
  'Suggest a component': '推荐组件',
  'Sources and licenses': '来源与许可',
  'Source and license': '来源与许可',
  'Source': '来源',
  'MIT license': 'MIT 许可证',
  'MIT license.': '采用 MIT 许可证。',
  'Project code': '项目代码',
  '· Third-party work retains its original license': '· 第三方作品保留原始许可证',
  'Close animation details': '关闭动效详情',
  'Close component details': '关闭组件详情',
  'Animation preview': '动效预览',
  'Animation settings': '动效设置',
  'Reset': '恢复默认',
  'Size': '尺寸',
  'Duration': '周期',
  'Stroke width': '线条粗细',
  'Arc length': '线段长度',
  'Track opacity': '轨道透明度',
  'Code': '代码',
  'Code format': '代码格式',
  'Standalone HTML': '独立 HTML',
  'Download HTML': '下载 HTML',
  'Download TSX': '下载 TSX',
  'Download JSX': '下载 JSX',
  'Copy code': '复制代码',
  'Copy HTML': '复制 HTML',
  'Copy HTML for {name}': '复制 {name} 的 HTML',
  'Save as an .html file and open it in a browser.': '保存为 .html 文件后即可在浏览器中打开。',
  'Save as an .html file and open it offline in a browser.': '保存为 .html 文件，即可在浏览器中离线打开。',
  'Use this JSX in a React project.': '在 React 项目中使用这段 JSX。',
  'Install the specified version of LDRS in your React project.': '在 React 项目中安装示例指定的 LDRS 版本。',
  'Includes the upstream React component and example usage. Requires Tailwind CSS 4.': '包含上游 React 组件和用法示例，需要 Tailwind CSS 4。',
  'Save as .tsx and import into a React project.': '保存为 .tsx 后，在 React 项目中导入。',
  'Example code': '示例代码',
  'View license': '查看许可证',
  'Integration and preview by UI Moments.': '由 UI Moments 整合并提供预览。',
  'The example includes the original LDRS attribution and MIT license.': '示例保留 LDRS 原作者署名和 MIT 许可证。',
  'Inspiration ↗': '灵感来源 ↗',
  'Upstream repository ↗': '上游仓库 ↗',
  'View source ↗': '查看源码 ↗',
  'Open demo ↗': '打开演示 ↗',
  'Retry loading': '重新加载',
  'Copied with attribution and license': '已复制，包含署名与许可证',
  'Select and copy the code manually': '请选中代码并手动复制',
  'Copy prompt': '复制提示词',
  'View prompt': '查看提示词',
  'Paste into Codex, Cursor, or Claude Code.': '粘贴到 Codex、Cursor 或 Claude Code。',
  'Component prompt': '组件提示词',
  'Prompt copied': '已复制提示词',
  'Select and copy the prompt manually': '请选中提示词并手动复制',
  'Copied': '已复制',
  'Pick a component and try it in four styles.': '选择一个组件，体验四种不同的风格。',
  'Components and styles': '组件与风格',
  'Component': '组件',
  'Style': '风格',
  'Original': '原版',
  'Memphis': '孟菲斯',
  'Bauhaus': '包豪斯',
  'Pixel': '像素风',
  'The gallery appearance follows the active light or dark theme.': '画廊原版外观，跟随当前深浅主题。',
  'Candy colors, offset shapes, and hard shadows.': '糖果色、错位几何图形与硬边投影。',
  'Red squares, blue circles, yellow triangles, and thick lines on unbleached paper.': '原色方块、圆形、三角形与粗线条，配未经漂白的纸色。',
  'Pixel grids, stepped outlines, and a limited arcade palette.': '像素网格、阶梯轮廓和有限的街机色板。',
  'View in gallery ↗': '在画廊中查看 ↗',
  'Memphis and Bauhaus palettes from': '孟菲斯与包豪斯配色来源',
  'Pick a loader, adjust its color and timing, and copy the code.': '选择一个加载动效，调整颜色和节奏，再复制代码。',
  'Filter animations': '筛选动效',
  'Animation categories': '动效分类',
  'Search animations': '搜索动效',
  'Search loaders': '搜索加载动效',
  '44 loading animations': '44 款加载动效',
  'No loaders match your search.': '没有匹配的加载动效。',
  '{name} preview and code': '{name} 的预览与代码',
  'The loaders use': '加载动效使用',
  'by Griffin Johnston / UI Ball, under the MIT license. The original implementation and copyright notice are included.': '由 Griffin Johnston / UI Ball 开发，采用 MIT 许可证。本站保留原始实现和版权声明。',
  'Original license': '原始许可证',
  'Integration notes': '集成说明',
};

export function translate(message, values, locale = language) {
  const text = locale === 'zh-CN' ? (Object.hasOwn(chinese, message) ? chinese[message] : message) : message;
  return values ? text.replace(/\{(\w+)\}/g, (token, key) => values[key] ?? token) : text;
}

export function onLanguageChange(listener) {
  document.addEventListener(changeEvent, listener);
}

export function setupLanguage() {
  const button = document.getElementById('language');
  if (!button) return;
  const label = button.querySelector('span');
  const fields = [...document.querySelectorAll('[data-i18n]')].flatMap(element =>
    element.dataset.i18n.split(' ').map(field => ({
      element, field, message: field === 'text' ? element.textContent.trim() : element.getAttribute(field),
    }))
  );

  function show(next) {
    language = next === 'zh-CN' ? 'zh-CN' : 'en';
    document.documentElement.lang = language;
    for (const {element, field, message} of fields) {
      const text = translate(message);
      if (field === 'text') {
        if (element.textContent.trim() !== text) element.textContent = text;
      } else if (element.getAttribute(field) !== text) element.setAttribute(field, text);
    }
    const target = language === 'en' ? 'zh-CN' : 'en';
    label.lang = target;
    label.textContent = target === 'en' ? 'EN' : '中文';
    button.title = translate(target === 'en' ? 'Switch to English' : 'Switch to Simplified Chinese');
    button.setAttribute('aria-label', button.title);
    document.dispatchEvent(new Event(changeEvent));
  }

  let saved;
  try { saved = localStorage.getItem(storageKey); } catch {}
  show(saved);
  button.hidden = false;
  button.addEventListener('click', () => {
    show(language === 'en' ? 'zh-CN' : 'en');
    try { localStorage.setItem(storageKey, language); } catch {}
  });
  addEventListener('storage', event => {
    if (event.key === storageKey && event.newValue !== language) show(event.newValue);
  });
}
