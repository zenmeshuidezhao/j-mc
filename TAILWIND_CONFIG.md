# Tailwind CSS 配置说明

## 文件概述

`tailwind.config.cjs` 是 Tailwind CSS 的配置文件，用于自定义 Tailwind 的默认行为。

## 配置详解

### 1. content（内容路径）

```javascript
content: ['./index.html', './src/**/*.{vue,js,ts,html,css,scss}']
```

**作用**：指定 Tailwind 扫描哪些文件来提取使用的类名。

| 路径 | 说明 |
|------|------|
| `./index.html` | 入口 HTML 文件 |
| `./src/**/*.{vue,js,ts,html,css,scss}` | src 目录下所有相关文件 |

**原理**：Tailwind 会在构建时扫描这些文件，找出实际使用的类名，然后只生成这些类名的 CSS，从而减小文件体积。

### 2. darkMode（暗黑模式）

```javascript
darkMode: 'class'
```

**作用**：配置暗黑模式的触发方式。

| 值 | 说明 |
|------|------|
| `'media'` | 根据系统偏好自动切换（默认） |
| `'class'` | 根据元素上的 class 手动控制 |

**使用方式**：

```html
<!-- 在 html 或 body 上添加 dark 类 -->
<html class="dark">
  <!-- 子元素使用 dark: 前缀 -->
  <div class="bg-white dark:bg-gray-900">内容</div>
</html>
```

**切换示例**：

```javascript
// 切换暗黑模式
document.documentElement.classList.toggle('dark')
```

### 3. theme.extend（主题扩展）

```javascript
theme: {
  extend: {
    colors: {
      'primary': 'var(--primary)',
      'secondary': 'var(--secondary)',
      'tertiary': 'var(--tertiary)',
      'color': 'var(--color)',
      'accent-primary': 'var(--accent-primary)',
      'accent-primary-state': 'var(--accent-primary-state)',
    },
  },
}
```

**作用**：扩展默认主题，添加自定义颜色。

**特点**：使用 CSS 变量（`var(--xxx)`）作为颜色值，便于动态切换主题。

**使用方式**：

```html
<button class="bg-primary text-color hover:bg-accent-primary">
  按钮
</button>
```

**CSS 变量定义**（需要在全局 CSS 中设置）：

```css
:root {
  --primary: #3b82f6;
  --secondary: #64748b;
  --tertiary: #94a3b8;
  --color: #1e293b;
  --accent-primary: #10b981;
  --accent-primary-state: #059669;
}

/* 暗黑模式 */
.dark {
  --primary: #60a5fa;
  --secondary: #94a3b8;
  --color: #f1f5f9;
  /* ... */
}
```

## 完整配置示例

如果需要进一步扩展，可以添加以下配置：

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{vue,js,ts,html,css,scss}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'primary': 'var(--primary)',
        'secondary': 'var(--secondary)',
        'tertiary': 'var(--tertiary)',
        'color': 'var(--color)',
        'accent-primary': 'var(--accent-primary)',
        'accent-primary-state': 'var(--accent-primary-state)',
      },
      // 字体
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      // 间距
      spacing: {
        '128': '32rem',
      },
      // 动画
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  // 插件
  plugins: [],
}
```

## 注意事项

1. **文件后缀 `.cjs`**：使用 CommonJS 格式，适用于 Node.js 环境
2. **`extend` vs 直接配置**：使用 `extend` 保留默认值并添加新配置；直接写在 `theme` 下会覆盖默认值
3. **CSS 变量**：需要在项目的全局 CSS 文件中定义这些变量才能生效

## 项目问题

当前项目运行 `pnpm dev` 后页面显示空白，根本原因与 Tailwind 配置无关，而是：

1. 缺少 `vite.config.js`
2. `src/main.js` 文件为空