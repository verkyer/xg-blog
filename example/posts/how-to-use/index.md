---
title: "XG-Blog 基础食用方法"
slug: "how-to-use"
description: "XG-Blog 的基本使用流程。"
date: "2026-06-10"
categories:
  - "website"
tags:
  - "xg-blog"
  - "quick-start"
top: 0
comments: false
---

## 先说结论

你可以把 XG-Blog 理解成一个“帮你把 Markdown 文章整理成博客网站”的工具。

它不是那种点来点去的后台系统。你平时做的事很简单：

1. 改一下站点名字、描述这些基础信息。
2. 把文章写进 `blog/posts/`。
3. 需要单独页面时，把内容放进 `blog/pages/`。
4. 想放图片、头像、logo 之类的资源，就放进 `blog/public/`。
5. 本地看效果用 `npm run dev`，准备发布前跑一次 `npm run build`。

如果你本来就习惯用 Markdown 记笔记、写教程、写博客，那这套方式基本不会别扭。

## 内容结构

```text
.env            # 站点标题、描述、网址、作者信息（从 `.env.example` 复制）
blog/posts/     # 文章总目录（每一篇文章，一个子文件夹）
blog/pages/     # 自定义页面，比如：「关于」
blog/public/    # 图片、logo、favicon 这类公开资源
blog/*.toml     # 菜单、Banner、友链、分类、标签等配置
```

先把上面这几个位置认熟，已经够用了。

## 怎么写文章

最常见的做法就是：一篇文章一个文件夹，文件夹里放 `index.md`，需要配图就再放一个 `img/`。

```text
blog/posts/my-first-post/
├─ index.md
└─ img/
   └─ my-first-post-1.webp
```

`index.md` 开头那一段属性区，主要填标题、日期、分类、标签这些信息。后面就是正常写正文，和你平时写 Markdown 没什么区别。

如果你只是想“赶紧把第一篇发出来”，那就先把标题、日期、分类写好，正文能正常显示，已经够了。别一开始就想着把所有配置都调满。

## 部署

`npm run build` 之后，`dist/` 目录里就是完整的静态站点文件。

- **直接部署静态文件**：把 `dist/` 里的内容丢到任意静态服务器上就行（Nginx、Apache、OSS 等）。
- **Fork 仓库 + 平台自动部署**：把项目 fork 到自己的 GitHub / GitLab 仓库，然后连接到你喜欢的平台一键启动：
  - **Cloudflare Pages / Workers**：直接关联仓库，构建命令填 `npm run build`，输出目录填 `dist`，每次推送代码自动部署。
  - **EdgeOne Pages**：同样关联 Git 仓库，自动识别框架或手动配置构建命令和输出目录。
  - 其他支持静态站点的平台（Vercel、Netlify 等）也都是同样的套路。

不需要服务器，不需要运维，写完文章 git push 一下就能更新站点。

## 内容完善

- 菜单想改，就去看 `blog/menu.toml`。
- 首页 Banner 想换，就看 `blog/banner.toml`。
- 想加友情链接，就维护 `blog/links.toml`。
- 想补“关于我”之类的页面，就去 `blog/pages/` 新建目录。

> 模板都从 `example/` 里复制示例到 `blog/` 里，然后再改修改即可。

## 最后提醒

现在你看到的这篇文章，以及另一篇欢迎文，都是空站点时的示例内容。等你在 `blog/posts/` 里放进自己的正式文章后，这些示例文章就会自动退出，不会一直占着首页。
