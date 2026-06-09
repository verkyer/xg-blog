---
title: "示例页面"
description: "一个用于验证自定义页面结构、正文样式和图片引用的示例页面。"
comments: false
---

这是一个自定义页面示例，用来确认 `blog/pages/{slug}/index.md` 的目录结构、页面属性区和正文图片都能正常工作。

![示例页面配图](./img/demo-page-1.svg)

## 页面正文

页面适合放关于、项目介绍、联系方式或固定说明内容。它不会出现在文章归档里，也不需要写日期、分类、标签和封面。

## 常见内容

- 可以使用普通段落、列表和表格。
- 图片建议放在当前页面目录的 `img/` 里。
- 多个页面共用的图片可以放在 `blog/public/`。

| 项目 | 示例 |
| --- | --- |
| 页面路径 | `/demo-page` |
| 模板位置 | `example/pages/demo-page/index.md` |
| 用户页面位置 | `blog/pages/{slug}/index.md` |
| 图片路径 | `./img/demo-page-1.svg` |
