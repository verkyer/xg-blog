# 点赞需求（CF Workers 方案，暂不开发）

本文档由 `xiaoge-static-blog-plan.md` 和原 `03-评论阅读点赞需求-暂不开发.md` 拆分整理，用于记录小鸽志静态博客点赞功能的后续需求。点赞功能首期暂不开发，本文只作为未来设计依据。

## 1. 当前结论

点赞功能可以使用 Cloudflare Workers 实现。推荐使用 Workers 提供 API，D1 保存点赞计数和访客点赞记录，必要时使用 Turnstile 或限流降低刷赞。

推荐后续方案：

```text
Astro 静态文章页
    ↓
点赞按钮
    ↓
Cloudflare Workers API
    ↓
Cloudflare D1 存点赞计数和访客记录
    ↓
Workers Rate Limiting / Turnstile / 去重
```

点赞复杂度低于评论，高于阅读统计。主要难点是防重复点赞和防刷。

## 2. 暂缓原因

点赞首期暂缓原因：

- 静态博客首期重点是内容迁移和 URL 保持。
- 点赞需要运行时 API 和数据存储。
- 需要定义是否允许取消点赞。
- 需要防止重复点赞和刷赞。
- 旧站点赞数如果要保留，需要先导出并映射到文章 slug。

## 3. 功能范围草案

未来点赞功能可包含：

- 文章页点赞按钮。
- 展示点赞数。
- 同一访客同一文章只能点赞一次。
- 可选取消点赞。
- 旧点赞数导入。
- 基础防刷。

首版建议只做：

```text
文章页点赞
点赞数展示
同一访客去重
不支持取消点赞
旧点赞数可选导入
```

不建议首版就做：

```text
用户登录后点赞
点赞排行榜
点赞通知
评论点赞
复杂风控系统
```

## 4. 数据模型

推荐使用 D1。

### 4.1 post_likes 表

```sql
CREATE TABLE post_likes (
  post_slug TEXT PRIMARY KEY,
  likes INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
```

### 4.2 post_like_visitors 表

用于限制重复点赞：

```sql
CREATE TABLE post_like_visitors (
  id TEXT PRIMARY KEY,
  post_slug TEXT NOT NULL,
  visitor_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (post_slug, visitor_hash)
);
```

索引：

```sql
CREATE INDEX idx_post_like_visitors_post
ON post_like_visitors (post_slug);
```

## 5. API 草案

### 5.1 获取点赞数

```text
GET /api/likes?postSlug={slug}
```

返回：

```json
{
  "postSlug": "racknerd-2026-04",
  "likes": 86,
  "liked": false,
  "updatedAt": "2026-05-16T12:00:00+08:00"
}
```

说明：

- `likes` 为文章总点赞数。
- `liked` 表示当前访客是否已点赞。

### 5.2 提交点赞

```text
POST /api/likes
```

请求：

```json
{
  "postSlug": "racknerd-2026-04"
}
```

成功返回：

```json
{
  "postSlug": "racknerd-2026-04",
  "likes": 87,
  "liked": true
}
```

重复点赞返回：

```json
{
  "postSlug": "racknerd-2026-04",
  "likes": 87,
  "liked": true,
  "message": "already_liked"
}
```

## 6. 去重和防刷

访客标识建议组合：

```text
匿名 visitorId Cookie
IP 哈希
User-Agent 哈希
```

基础规则：

- 同一 `postSlug + visitorHash` 只能点赞一次。
- 同一 IP 短时间大量点赞时限流。
- 服务端只接受文章 slug，不接受前端传入的点赞数。
- 可选对异常请求启用 Turnstile。

注意：

- 不登录状态无法做到绝对准确去重。
- Cookie 被清除后可能重复点赞。
- IP 和 User-Agent 只能用于辅助判断，不能公开保存原文。

## 7. 是否支持取消点赞

首版建议不支持取消点赞。

原因：

- 数据逻辑更简单。
- UI 更清晰。
- 避免频繁增减计数。

如果未来支持取消点赞，需要增加：

```text
DELETE /api/likes
```

并允许删除 `post_like_visitors` 中的访客记录，同时减少 `post_likes.likes`。

## 8. 存储选择

### 8.1 D1

适合：

- 保存每篇文章点赞数。
- 保存访客点赞去重记录。
- 导入旧点赞数。
- 保证 `postSlug + visitorHash` 唯一约束。

### 8.2 KV

适合：

- 缓存点赞数。
- 减少页面读取 D1 的次数。

不建议：

- 单独用 KV 做去重和强一致计数。

### 8.3 Durable Objects

如果后续点赞请求量较高，可使用 Durable Objects 聚合计数，再写入 D1。首版没有必要。

## 9. 旧点赞数迁移

如果旧站有点赞数，应导出：

```text
exports/interactions/likes.json
```

建议格式：

```json
[
  {
    "postSlug": "racknerd-2026-04",
    "likes": 86,
    "updatedAt": "2026-05-16T12:00:00+08:00"
  }
]
```

导入规则：

- 以文章 slug 作为唯一键。
- 无法确认 slug 的旧点赞数据不导入。
- 导入后新点赞在旧数基础上累加。

## 10. 前端集成要求

文章页未来可显示：

```text
赞 86
```

交互要求：

- 已点赞状态需要有明确视觉反馈。
- 点赞请求失败时不影响正文阅读。
- 重复点击不能重复累加。
- API 不可用时可以隐藏点赞按钮。

首期暂不开发时：

- 不显示可点击点赞按钮。
- 不请求点赞 API。
- 不出现控制台报错。

## 11. 与其他模块边界

博客主体首期：

- 不依赖点赞 API。
- 不因为点赞功能缺失导致构建失败。

本地编辑器首期：

- 不管理点赞数。
- 不修改点赞数据。

评论和阅读统计：

- 使用独立 API。
- 不与点赞数据混用表。

## 12. 验收标准

首期暂不开发状态下：

- 静态博客不请求点赞 API。
- 页面不显示无效点赞按钮。
- 页面控制台没有点赞接口报错。
- 旧点赞数如有导出，独立保存，不影响文章迁移。

未来开发点赞功能时：

- 文章页可以展示点赞数。
- 同一访客重复点赞不会重复计数。
- API 失败不影响文章阅读。
- 旧点赞数可导入。
- 点赞数据可备份。

## 13. 官方参考

后续实现时优先参考 Cloudflare 官方文档：

- Cloudflare Workers 数据库连接：`https://developers.cloudflare.com/workers/databases/connecting-to-databases/`
- Cloudflare D1：`https://developers.cloudflare.com/d1/`
- D1 Workers Binding API：`https://developers.cloudflare.com/d1/worker-api/`
- Cloudflare Turnstile 服务端校验：`https://developers.cloudflare.com/turnstile/get-started/server-side-validation/`
- Workers KV 工作机制：`https://developers.cloudflare.com/kv/concepts/how-kv-works/`
- Workers Rate Limiting API：`https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/`
- Durable Objects：`https://developers.cloudflare.com/durable-objects/`
