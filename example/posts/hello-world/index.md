---
title: "欢迎使用 XG-Blog 静态博客~"
slug: "hello-world"
description: "一篇用于介绍 XG-Blog 项目定位、核心特性和快速上手方式的欢迎文章。"
date: "2026-06-09"
categories:
  - "website"
tags:
  - "xg-blog"
  - "astro"
  - "static-blog"
cover: "./img/cover.webp"
top: 1
comments: true
---

## 欢迎使用 XG-Blog

XG-Blog 是一个基于 Astro 的静态博客程序，适合想用 Markdown 持续写作、又不想把时间花在复杂后台上的用户。你只需要维护文章、页面和少量配置，其余页面生成、分类归档、RSS 与站内搜索等工作都交给构建流程完成。

![XG-Blog 内容组织示意图](./img/hello-world-1.svg)

## 为什么用它

| 能力 | 说明 |
| --- | --- |
| Markdown 写作 | 文章和自定义页面都直接写在本地文件里，内容清晰，迁移成本低。 |
| 分类与标签 | 通过 frontmatter 维护分类、标签，站点会自动生成对应归档页。 |
| 站内搜索 | 内置基于 `Pagefind` 的全文搜索，适合内容逐步积累后的检索需求。 |
| TOML 配置 | 菜单、Banner、友链、分类显示名等内容可以通过 TOML 文件维护。 |
| 自定义页面 | 除文章外，还可以在 `blog/pages/` 增加关于页、导航页等页面。 |
| 静态输出 | 支持 RSS、sitemap 和静态构建，部署方式简单，适合 Cloudflare 等平台。 |
| 主题体验 | 支持浅色 / 深色主题切换，也支持调整站点主题色。 |

## 快速上手

1. 复制 `.env.example` 为 `.env`，填写站点标题、描述、网址等基础信息。
2. 在 `blog/` 目录维护自己的内容和配置，比如文章、页面、公开资源以及 TOML 文件。
3. 本地预览时运行 `npm run dev`，检查首页、文章页和配置是否符合预期。
4. 准备发布前运行 `npm run build`，确认构建、归档和搜索索引都能正常生成。

## 内容放在哪里

```text
blog/
├─ posts/      # 正式文章；每篇文章一个文件夹
├─ pages/      # 自定义页面；每页一个文件夹
├─ public/     # 公开资源；构建后输出到站点根目录
├─ *.toml      # 菜单、Banner、友链、分类、标签等配置
└─ ...

.env           # 站点基础信息配置
example/       # 空站点时使用的示例内容
```

如果你刚开始搭站，优先关注 `blog/posts/`、`blog/pages/`、`blog/public/` 和 `.env` 这几个位置即可。`example/` 是兜底示例目录，用来保证空站点也能正常显示结构和样式。

## 开始写第一篇文章

当你在 `blog/posts/` 中加入自己的第一篇正式文章后，这篇示例文章就不会再参与生成。也就是说，XG-Blog 会先用这篇欢迎文帮你完成空站点展示，等你开始真正写作后，它会自动让位给你的正式内容。
