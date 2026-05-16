# 评论系统需求（CF Workers 方案，暂不开发）

本文档由 `xiaoge-static-blog-plan.md` 和原 `03-评论阅读点赞需求-暂不开发.md` 拆分整理，用于记录小鸽志静态博客评论系统的后续需求。评论功能首期暂不开发，本文只作为未来设计依据。

## 1. 当前结论

评论系统可以使用 Cloudflare Workers 实现，但不建议在静态博客首期上线时同步开发。

推荐后续方案：

```text
Astro 静态文章页
    ↓
前端评论组件
    ↓
Cloudflare Workers API
    ↓
Cloudflare D1 存评论数据
    ↓
Cloudflare Turnstile + Workers Rate Limiting + 审核
```

推荐原因：

- Workers 适合提供轻量 API。
- D1 适合保存结构化评论数据。
- Turnstile 可以降低垃圾评论提交。
- Workers Rate Limiting 可以在 API 层做提交频率限制。
- 评论审核、状态流转、回复关系适合用 SQL 表达。
- 与 Cloudflare 部署链路一致，不需要额外 VPS。

首期处理策略：

```text
暂不显示真实评论表单
暂不请求评论 API
仅保留 comments 字段
可预留评论组件挂载点
```

## 2. 暂缓原因

评论系统比阅读数和点赞更复杂，暂缓原因：

- 需要评论审核流程。
- 需要反垃圾策略。
- 需要处理隐私数据。
- 需要管理后台或审核入口。
- 需要迁移旧评论时做字段映射和数据清洗。
- 如果实现不完整，容易产生垃圾评论、接口滥用和前端报错。

## 3. 文章字段预留

文章 frontmatter 可以继续保留：

```yaml
comments: true
```

字段含义：

- `true`：未来允许显示评论区。
- `false`：未来不显示评论区。
- 空值或不填写：默认允许评论。

首期行为：

- 只保存字段。
- 不渲染评论提交表单。
- 不加载评论列表。
- 不请求评论 API。

## 4. 功能范围草案

未来评论系统可包含：

- 文章页展示评论列表。
- 访客提交评论。
- 访客回复评论。
- 评论待审核。
- 评论通过、拒绝、删除。
- 评论数量展示。
- 按文章 slug 关联评论。
- 管理员审核入口。
- 反垃圾校验。
- 评论数据备份。

首版建议只做：

```text
评论列表
评论提交
待审核
管理员审核
评论数量
```

不建议首版就做：

```text
用户账号
邮件通知
多级深层回复
点赞评论
富文本编辑
头像系统
```

## 5. 数据模型

推荐使用 Cloudflare D1。

### 5.1 comments 表

```sql
CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  post_slug TEXT NOT NULL,
  parent_id TEXT,
  author_name TEXT NOT NULL,
  author_email_hash TEXT,
  author_website TEXT,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  ip_hash TEXT,
  user_agent_hash TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### 5.2 索引

```sql
CREATE INDEX idx_comments_post_status_created
ON comments (post_slug, status, created_at);

CREATE INDEX idx_comments_parent
ON comments (parent_id);
```

### 5.3 状态

```text
pending   待审核
approved  已通过
rejected  已拒绝
spam      垃圾评论
deleted   已删除
```

## 6. API 草案

Workers API 建议独立域名或路径：

```text
https://api.xiaoge.org/comments
```

也可以绑定到同站路径：

```text
https://www.xiaoge.org/api/comments
```

### 6.1 获取评论列表

```text
GET /api/comments?postSlug={slug}
```

返回规则：

- 只返回 `approved` 评论。
- 默认按时间正序。
- 支持分页。
- 不返回邮箱、IP、User-Agent 等敏感信息。

### 6.2 提交评论

```text
POST /api/comments
```

请求字段：

```json
{
  "postSlug": "racknerd-2026-04",
  "parentId": null,
  "authorName": "访客昵称",
  "authorEmail": "user@example.com",
  "authorWebsite": "https://example.com",
  "content": "评论内容",
  "turnstileToken": "token"
}
```

提交后默认状态：

```text
pending
```

### 6.3 管理员审核

```text
GET  /api/admin/comments?status=pending
POST /api/admin/comments/{id}/approve
POST /api/admin/comments/{id}/reject
POST /api/admin/comments/{id}/delete
```

管理员接口要求：

- 必须鉴权。
- 不应暴露在无保护的公开入口。
- 操作必须记录更新时间。

## 7. 反垃圾要求

评论系统必须具备：

- Turnstile 校验。
- IP 哈希后限流。
- User-Agent 哈希后辅助判断。
- 单 IP 短时间提交限制。
- 内容长度限制。
- 链接数量限制。
- 重复内容限制。
- 敏感词过滤。
- 默认待审核。

建议限制：

```text
单条评论最少 2 字，最多 2000 字
单条评论最多 2 个链接
同一 IP 1 分钟最多 1 条
同一文章同一 IP 10 分钟最多 3 条
```

## 8. 隐私要求

不得公开：

- 访客邮箱原文。
- 访客 IP 原文。
- 完整 User-Agent 原文。
- Turnstile token。

建议做法：

- 邮箱只保存哈希。
- IP 只保存哈希。
- User-Agent 只保存哈希。
- 管理员界面也不展示原始敏感信息。

## 9. 前端集成要求

文章页未来可加载评论组件：

```text
src/components/Comments.astro
src/components/CommentForm.tsx
src/components/CommentList.tsx
```

渲染规则：

- `comments: false` 时不显示评论组件。
- API 不可用时静默降级，不影响正文阅读。
- 评论提交成功后提示“已提交，等待审核”。
- 未审核评论不在公开页面显示。

首期暂不开发时：

- 不挂载真实评论组件。
- 不显示无效空表单。
- 不请求不存在的 API。

## 10. 旧评论迁移

如果旧站评论重要，需要单独导出。

建议备份：

```text
exports/interactions/comments.json
```

迁移前需要确认：

- 旧评论与文章 slug 的对应关系。
- 评论层级关系。
- 评论时间格式。
- 评论作者字段。
- 是否保留邮箱哈希。
- 是否全部设为 `approved`，或重新审核。

## 11. 与其他模块边界

博客主体首期只需要：

- 保留 `comments` 字段。
- 不依赖评论 API 构建。
- 不因为评论缺失导致页面报错。

本地编辑器首期只需要：

- 支持编辑 `comments` 字段。
- 不管理评论列表。
- 不做评论审核。

点赞和阅读统计：

- 不与评论表混在一起。
- 使用独立表和独立 API。

## 12. 验收标准

首期暂不开发状态下：

- 静态博客可以在没有评论 API 的情况下正常构建。
- 文章页不显示无效评论表单。
- 页面控制台没有评论接口报错。
- `comments` 字段可以被保留。

未来开发评论系统时：

- 评论提交默认进入待审核。
- 公开接口只返回已审核评论。
- Turnstile 校验生效。
- 管理员接口有鉴权。
- 敏感信息不公开。
- 评论数据可备份。

## 13. 官方参考

后续实现时优先参考 Cloudflare 官方文档：

- Cloudflare Workers 数据库连接：`https://developers.cloudflare.com/workers/databases/connecting-to-databases/`
- Cloudflare D1：`https://developers.cloudflare.com/d1/`
- D1 Workers Binding API：`https://developers.cloudflare.com/d1/worker-api/`
- Cloudflare Turnstile 服务端校验：`https://developers.cloudflare.com/turnstile/get-started/server-side-validation/`
- Workers Rate Limiting API：`https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/`
