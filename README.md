# XG-BLOG 静态博客

这是一个 Astro 静态博客项目。`blog/` 放用户自己的站点内容，`example/` 放可复制的模板和兜底示例，`defaults/` 放程序使用的缺省公开资源，`src/` 放页面模板和功能实现。

## 目录结构

```text
./
├─ blog/                         # 用户站点内容
│  ├─ posts/                     # 用户文章；每篇文章一个文件夹
│  ├─ pages/                     # 用户自定义页面；每页一个文件夹
│  ├─ public/                    # 用户公开资源；构建后输出到站点根目录
│  ├─ menu.toml                  # 从 example/menu.toml 复制后修改
│  ├─ categories.toml            # 从 example/categories.toml 复制后修改
│  ├─ tags.toml                  # 从 example/tags.toml 复制后修改
│  ├─ links.toml                 # 从 example/links.toml 复制后修改
│  └─ banner.toml                # 从 example/banner.toml 复制后修改
├─ example/                      # 可复制模板，也作为空内容时的兜底示例
│  ├─ posts/hello-world/
│  ├─ pages/demo-page/
│  ├─ public/
│  ├─ menu.toml
│  ├─ categories.toml
│  ├─ tags.toml
│  ├─ links.toml
│  └─ banner.toml
├─ defaults/public/              # 程序缺省公开资源，不是用户内容模板
│  ├─ favicon.ico
│  └─ default/
│     ├─ default-logo.svg
│     ├─ default-logo-dark.svg
│     ├─ default-user.svg
│     ├─ default-cover.webp
│     └─ default-banner.webp
├─ src/                          # Astro 路由、组件、样式和核心逻辑
├─ .env.example                  # 模板，复制为 .env 后作为用户变量自定义修改
├─ astro.config.mjs
└─ package.json
```

`.gitkeep` 只是占位文件，用来让空目录保留在项目里。写入真实文章、页面或资源后，不需要管它。

如果是新站点，可以把 `example/` 复制一份并重命名为 `blog/`，再在 `blog/` 里维护自己的内容。用户资产主要是 `blog/` 和 `.env`；以后从上游同步功能更新时，尽量只让项目代码、缺省资源和示例模板变动，可以减少和用户内容的冲突。

## 配置顺序

站点基础信息来自环境变量：

1. 部署平台或系统环境变量优先。
2. 本地开发时复制 `.env.example` 为 `.env`，再修改 `.env`。
3. 没有配置时使用代码里的默认值，默认值见下方环境变量表。

`.env.example` 只是示例文件，程序不会直接把它当作本地配置读取。

内容配置使用 TOML：

| 文件 | 用途 | 使用方式 |
| --- | --- | --- |
| `blog/menu.toml` | 导航菜单 | 从 `example/menu.toml` 复制后修改；不存在时使用示例文件 |
| `blog/categories.toml` | 分类显示名和描述 | 从 `example/categories.toml` 复制后修改；不存在时使用示例文件 |
| `blog/tags.toml` | 标签显示名 | 从 `example/tags.toml` 复制后修改；不存在时使用示例文件 |
| `blog/links.toml` | 友链数据 | 从 `example/links.toml` 复制后修改；不存在时使用示例文件 |
| `blog/banner.toml` | 首页 banner | 从 `example/banner.toml` 复制后修改；不存在时使用示例文件 |

`blog/*.toml` 只要存在，就会完全替换 `example/*.toml`。分类和标签会先从文章属性区自动收集；TOML 主要用于改显示名称和描述。

首页 banner 使用 `[[banner]]` 数组，图片建议放在 `blog/public/`，配置构建后的根路径：

```toml
[[banner]]
image = "/assets/banner.webp"
href = "/"
```

## 示例内容

示例文章和示例页面只在对应用户目录没有内容时启用：

| 用户目录 | 兜底目录 | 规则 |
| --- | --- | --- |
| `blog/posts/` | `example/posts/` | `blog/posts/` 没有任何 `index.md` 时，构建示例文章 |
| `blog/pages/` | `example/pages/` | `blog/pages/` 没有任何 `index.md` 时，构建示例页面 |

只要用户添加自己的文章或页面，对应的示例内容就不会再生成。导航菜单可从 `example/menu.toml` 复制为 `blog/menu.toml` 后按自己的内容维护。

## 文章示例

完整规则见 [文章内容结构要求.md](文章内容结构要求.md)。

```text
blog/posts/
└─ post-slug/
   ├─ index.md
   └─ img/
      ├─ cover.webp
      └─ post-slug-1.webp
```

Markdown 文件开头两条 `---` 之间是属性区，用来写标题、日期、分类、封面等信息。属性区后面就是文章正文。

```md
---
title: "文章标题"
slug: "post-slug" # 当值为空或没有这个属性，默认使用文章文件夹名称
description: "文章摘要。"
date: "2026-06-09"
categories:
  - "website"
tags:
  - "astro"
  - "markdown"
cover: "./img/cover.webp"
top: 0
comments: false
---

这里写文章正文第一段，说明这篇文章要记录的内容。

## 小标题

正文可以继续写段落、列表、引用和代码块。

![文章配图](./img/post-slug-1.webp)
```

封面读取顺序：

1. 属性区里的 `cover`。
2. `img/cover.*`。
3. 文章根目录的 `cover.*`。
4. `img/{slug}-1.*`。
5. `/default/default-cover.webp`。

## 页面示例

完整规则见 [页面结构需求.md](页面结构需求.md)。

```text
blog/pages/
└─ about/
   ├─ index.md
   └─ img/
      └─ about-1.webp
```

自定义页面只支持一级路径，文件夹名就是 URL，例如 `blog/pages/about/index.md` 会生成 `/about`。

```md
---
title: "关于"
description: "关于这个站点和内容方向。"
date: "2026-06-09"
comments: false
---

这里写页面正文。页面正文同样支持 Markdown。

## 页面小标题

页面和文章一样，会根据 `##`、`###`、`####` 自动生成右侧目录。

![页面配图](./img/about-1.webp)
```

页面不要写 `slug`、`categories`、`tags`、`cover`、`top`，这些字段只属于文章。

## 公开资源

`blog/public/` 是用户公开资源目录，构建后会输出到站点根目录，并支持二级目录。

| 文件位置 | 使用路径 | 用途 |
| --- | --- | --- |
| `blog/public/logo.png` | `/logo.png` | 站点 logo |
| `blog/public/logo-dark.png` | `/logo-dark.png` | 深色模式 logo |
| `blog/public/user.webp` | `/user.webp` | 作者头像 |
| `blog/public/favicon.svg` | `/favicon.svg` | 自定义 favicon |
| `blog/public/assets/banner.webp` | `/assets/banner.webp` | 可复用公开图片 |
| `blog/public/robots.txt` | `/robots.txt` | 覆盖默认 robots |
| `blog/public/404.html` | `/404.html` | 覆盖默认 404 页面 |

如果存在 `blog/public/favicon.ico`、`favicon.svg`、`favicon.png` 或 `favicon.webp`，构建时不会输出缺省 `/favicon.ico`，页面会引用用户自己的 favicon。

缺省资源位于 `defaults/public/`，构建后路径如下：

| 文件位置 | 使用路径 |
| --- | --- |
| `defaults/public/favicon.ico` | `/favicon.ico` |
| `defaults/public/default/default-logo.svg` | `/default/default-logo.svg` |
| `defaults/public/default/default-logo-dark.svg` | `/default/default-logo-dark.svg` |
| `defaults/public/default/default-user.svg` | `/default/default-user.svg` |
| `defaults/public/default/default-cover.webp` | `/default/default-cover.webp` |
| `defaults/public/default/default-banner.webp` | `/default/default-banner.webp` |

如果不在 `.env` 中配置 logo 或头像，站点会先按约定从 `blog/public/` 查找 `/logo.*`、`/logo-dark.*`、`/user.*`，找不到时再使用环境变量表中的默认路径。也可以在 `.env` 中把 `BLOG_LOGO`、`BLOG_LOGO_DARK`、`BLOG_AVATAR` 设置为 `/logo.png`、`/logo-dark.png`、`/user.webp` 这类路径。

## 环境变量

| 变量 | 默认值 | 用途 |
| --- | --- | --- |
| `BLOG_TITLE` | `XG-Blog` | 站点标题 |
| `BLOG_SUBTITLE` | `记录与分享~ 使用纯静态 XG-Blog！` | 站点副标题 |
| `BLOG_DESCRIPTION` | `这里填写站点描述，用于首页和 SEO。` | SEO 描述 |
| `BLOG_URL` | `https://example.com` | 正式站点 URL；影响 sitemap、RSS、robots |
| `BLOG_LOGO` | 先匹配 `/logo.*`，否则 `/default/default-logo.svg` | logo 路径 |
| `BLOG_LOGO_DARK` | 先匹配 `/logo-dark.*`，否则 `/default/default-logo-dark.svg` | 深色模式 logo 路径 |
| `BLOG_SHOW_TITLE` | `true` | 是否显示站点标题；设置为 `false` 关闭 |
| `THEME_COLOR` | `#2D96E4` | 主题色，必须是 3 位或 6 位十六进制颜色 |
| `BLOG_AUTHOR` | `博主昵称` | 首页作者名称 |
| `BLOG_AVATAR` | 先匹配 `/user.*`，否则 `/default/default-user.svg` | 作者头像 |
| `BLOG_AVATAR_CIRCLE` | `true` | 是否将作者头像裁成圆形；无变量或空值时开启，设置为 `false` 关闭 |
| `BLOG_BIO` | `这里填写博主简介。` | 首页作者简介 |

## 构建检查

```powershell
npm.cmd run build
```
 
文章 frontmatter 中的 `categories` 和 `tags` 建议统一写成带引号字符串，例如 `- "website"`、`- "astro"`，可避免纯数字 slug 被 YAML 解析成 number。

构建成功后，空用户内容会看到示例文章和示例页面；添加自己的文章或页面后，对应示例会自动消失。
