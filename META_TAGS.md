# HTML Meta 标签说明

本文档说明 `index.html` 中各类 meta 标签的作用。

## 基础配置

| Meta 标签 | 作用 |
|-----------|------|
| `<meta charset="utf-8" />` | 字符编码，确保中文等非 ASCII 字符正常显示 |
| `<meta name="viewport" ... />` | 响应式布局，让页面在移动设备上正确缩放 |
| `<meta http-equiv="x-ua-compatible" content="ie=edge" />` | 强制 IE 使用最新渲染模式 |

## SEO 优化

| Meta 标签 | 作用 |
|-----------|------|
| `<meta name="title" ... />` | 页面标题，搜索引擎结果中显示 |
| `<meta name="description" ... />` | 页面描述，显示在搜索结果摘要中 |
| `<meta name="keywords" ... />` | 关键词，现代搜索引擎已不太重视 |
| `<meta name="robots" content="index,follow" />` | 允许搜索引擎索引页面并跟踪链接 |
| `<link rel="sitemap" ... />` | 站点地图位置 |
| `<link rel="manifest" ... />` | PWA 清单文件 |

## Open Graph (社交分享)

用于控制链接在社交媒体（微信、Facebook、LinkedIn 等）上分享时的预览卡片样式。

```html
<meta property="og:url" content="页面URL" />
<meta property="og:type" content="website" />
<meta property="og:title" content="分享卡片标题" />
<meta property="og:description" content="分享卡片描述" />
<meta property="og:image" content="分享卡片图片" />
```

## Twitter Card

Twitter 专用的分享卡片配置。

```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" ... />
<meta name="twitter:description" ... />
<meta name="twitter:image" ... />
```

## 移动端 / PWA

### iOS

| Meta 标签 | 作用 |
|-----------|------|
| `<meta name="apple-mobile-web-app-capable" content="yes" />` | 允许添加到主屏幕后全屏运行 |
| `<meta name="apple-mobile-web-app-title" ... />` | 主屏幕图标下的名称 |
| `<meta name="apple-mobile-web-app-status-bar-style" ... />` | 状态栏样式 |
| `<link rel="apple-touch-icon" ... />` | 主屏幕图标 |

### Android

| Meta 标签 | 作用 |
|-----------|------|
| `<meta name="theme-color" content="#000" />` | 浏览器地址栏颜色 |
| `<meta name="mobile-web-app-capable" content="yes" />` | PWA 支持 |

## 其他

- `<link rel="icon" ... />` - 网站 favicon
- `<meta name="google-site-verification" ... />` - Google 站长验证

## 注意事项

这些 meta 标签主要用于 SEO 和社交分享，不影响开发服务器运行。页面无法显示的根本原因是：

1. 缺少 `vite.config.js` 配置文件
2. `src/main.js` 文件为空，未初始化 Vue 应用