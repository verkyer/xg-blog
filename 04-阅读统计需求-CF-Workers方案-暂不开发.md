# 阅读统计需求（CF Workers 方案，暂不开发）

本文档由 `xiaoge-static-blog-plan.md` 和原 `03-评论阅读点赞需求-暂不开发.md` 拆分整理，用于记录小鸽志静态博客阅读统计的后续需求。阅读统计首期暂不开发，本文只作为未来设计依据。

## 1. 当前结论

阅读统计可以使用 Cloudflare Workers 实现，并且是评论、阅读、点赞三类互动功能中复杂度最低的一项。

推荐后续方案：

```text
Astro 静态文章页
    ↓
前端发送阅读事件
    ↓
Cloudflare Workers API
    ↓
Cloudflare D1 记录文章计数
    ↓
可选 KV 缓存展示数据
    ↓
可选 Workers Rate Limiting 限制异常请求
```

如果只需要站长自己看统计，不需要在页面展示阅读数，也可以优先考虑 Cloudflare Web Analytics 或 Workers Analytics Engine，而不是自建展示用计数接口。

## 2. 暂缓原因

阅读统计首期暂缓原因：

- 静态博客首期目标是 URL、内容、图片和 SEO。
- 阅读数需要定义 PV、UV、防刷和爬虫统计规则。
- 如果在页面展示阅读数，需要额外运行时 API。
- 旧站阅读数如果要保留，需要先导出并映射到文章 slug。

## 3. 功能范围草案

未来阅读统计可包含：

- 按文章 slug 统计总阅读数。
- 可选统计唯一访客数。
- 文章页展示阅读数。
- 首页或文章卡片展示阅读数。
- 旧阅读数导入。
- 防刷新刷量。
- 忽略常见搜索引擎爬虫。

首版建议只做：

```text
文章页阅读数展示
总 PV 计数
基础防刷
旧阅读数可选导入
```

不建议首版就做：

```text
复杂 UV 分析
实时在线人数
访问来源分析
用户路径分析
后台报表系统
```

## 4. 数据模型

推荐使用 D1 保存展示用计数。

### 4.1 post_views 表

```sql
CREATE TABLE post_views (
  post_slug TEXT PRIMARY KEY,
  views INTEGER NOT NULL DEFAULT 0,
  unique_views INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
```

### 4.2 post_view_events 表（可选）

如果需要更细的统计，可增加事件表：

```sql
CREATE TABLE post_view_events (
  id TEXT PRIMARY KEY,
  post_slug TEXT NOT NULL,
  visitor_hash TEXT,
  created_at TEXT NOT NULL
);
```

首版不建议长期保存完整事件，避免数据量增长过快。

## 5. API 草案

### 5.1 获取阅读数

```text
GET /api/views?postSlug={slug}
```

返回：

```json
{
  "postSlug": "racknerd-2026-04",
  "views": 1280,
  "uniqueViews": 960,
  "updatedAt": "2026-05-16T12:00:00+08:00"
}
```

### 5.2 增加阅读数

```text
POST /api/views
```

请求：

```json
{
  "postSlug": "racknerd-2026-04"
}
```

规则：

- 只接受合法文章 slug。
- 同一访客短时间重复访问不重复累加。
- 可通过 Cookie、本地存储、IP 哈希、User-Agent 哈希组合做基础去重。

## 6. 防刷和去重

建议策略：

- 忽略明显爬虫 User-Agent。
- 同一访客同一文章 30 分钟内只计一次。
- 同一 IP 短时间大量请求时限流。
- 前端延迟几秒再发送阅读事件，避免误计极短停留。
- 服务端只信任 slug，不信任前端传入的计数值。

建议前端逻辑：

```text
文章页加载
    ↓
等待 3-5 秒
    ↓
确认页面仍可见
    ↓
POST /api/views
```

## 7. 存储选择

### 7.1 D1

适合：

- 展示每篇文章阅读数。
- 导入旧阅读数。
- 后续做简单查询和排序。

### 7.2 KV

适合：

- 缓存热门文章阅读数。
- 减少频繁读取 D1。

不建议：

- 只用 KV 做强一致计数。
- 只用 KV 做复杂去重。

### 7.3 Durable Objects

如果后续访问量较高，可考虑用 Durable Objects 做单篇文章计数聚合，再批量写入 D1。但首版没有必要。

## 8. 旧阅读数迁移

如果旧站有阅读数，应导出：

```text
exports/interactions/views.json
```

建议格式：

```json
[
  {
    "postSlug": "racknerd-2026-04",
    "views": 1280,
    "uniqueViews": 0,
    "updatedAt": "2026-05-16T12:00:00+08:00"
  }
]
```

导入规则：

- 以文章 slug 作为唯一键。
- 无法确认 slug 的旧数据不导入。
- 导入后新统计在旧数基础上累加。

## 9. 前端集成要求

文章页未来可显示：

```text
阅读 1280
```

要求：

- API 失败时不影响正文显示。
- 不显示加载错误。
- 可显示空状态或隐藏阅读数。
- 不因统计接口变慢拖慢文章首屏。

## 10. 与其他模块边界

博客主体首期：

- 不依赖阅读数 API。
- 不因为阅读统计缺失导致构建失败。

本地编辑器首期：

- 不管理阅读数。
- 不修改阅读数。

评论和点赞：

- 使用独立 API。
- 不与阅读统计混用数据表。

## 11. 验收标准

首期暂不开发状态下：

- 静态博客不请求阅读统计 API。
- 页面没有阅读统计接口报错。
- 旧阅读数如有导出，独立保存，不影响文章迁移。

未来开发阅读统计时：

- 文章页可以展示阅读数。
- 刷新防刷规则生效。
- API 失败不影响文章阅读。
- 旧阅读数可导入。
- 统计数据可备份。

## 12. 官方参考

后续实现时优先参考 Cloudflare 官方文档：

- Cloudflare Workers 数据库连接：`https://developers.cloudflare.com/workers/databases/connecting-to-databases/`
- Cloudflare D1：`https://developers.cloudflare.com/d1/`
- D1 Workers Binding API：`https://developers.cloudflare.com/d1/worker-api/`
- Workers KV 工作机制：`https://developers.cloudflare.com/kv/concepts/how-kv-works/`
- Workers Rate Limiting API：`https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/`
- Durable Objects：`https://developers.cloudflare.com/durable-objects/`
