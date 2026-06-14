import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { parse } from 'smol-toml';

const env = import.meta.env as unknown as Record<string, string | undefined>;
const rootDir = process.cwd();
const blogDir = join(rootDir, 'blog');
const exampleDir = join(rootDir, 'example');
const userPublicDir = join(blogDir, 'public');
const defaultsPublicDir = join(rootDir, 'defaults', 'public');
const faviconExtensions = ['.ico', '.svg', '.png', '.webp'];

type TomlDocument = Record<string, unknown>;
type TomlSource = 'user' | 'example' | 'empty';

function readTomlFile(baseDir: string, relativePath: string): TomlDocument | undefined {
  const filePath = join(baseDir, relativePath);

  if (!existsSync(filePath)) {
    return undefined;
  }

  return parse(readFileSync(filePath, 'utf8')) as TomlDocument;
}

function readTomlSource(relativePath: string): { source: TomlSource; document: TomlDocument } {
  const userDocument = readTomlFile(blogDir, relativePath);

  if (userDocument) {
    return { source: 'user', document: userDocument };
  }

  const exampleDocument = readTomlFile(exampleDir, relativePath);

  if (exampleDocument) {
    return { source: 'example', document: exampleDocument };
  }

  return { source: 'empty', document: {} };
}

function readToml(relativePath: string): TomlDocument {
  return readTomlSource(relativePath).document;
}

function readTomlArray<T>(relativePath: string, key: string): T[] {
  const value = readToml(relativePath)[key];
  return Array.isArray(value) ? (value as T[]) : [];
}

function readEnv(key: string) {
  for (const value of [process.env[key], env[key]]) {
    const trimmed = value?.trim();

    if (trimmed) {
      return trimmed.replace(/\\n/g, '\n');
    }
  }

  return undefined;
}

export type SiteData = {
  title: string;
  subtitle: string;
  description: string;
  url: string;
  favicon: string;
  logo: string;
  darkLogo: string;
  showTitle: boolean;
  theme: {
    color: string;
  };
  author: {
    name: string;
    avatar: string;
    circleMask: boolean;
    description: string;
  };
};

export type TaxonomyItem = {
  slug: string;
  name: string;
  description?: string;
};

export type MenuItem = {
  label: string;
  href: string;
  target?: 'self' | 'blank' | '_self' | '_blank' | '' | null;
  fallback?: 'posts' | 'pages' | '' | null;
  sub?: MenuItem[];
};

export type LinkItem = {
  name: string;
  url: string;
  desc: string;
  icon?: string;
};

export type LinkGroup = {
  name: string;
  links: LinkItem[];
};

export type BannerItem = {
  image: string;
  href?: string;
};

function publicAssetExists(path: string) {
  if (!path.startsWith('/')) {
    return false;
  }

  const relativePath = path.slice(1);
  return existsSync(join(userPublicDir, relativePath)) || existsSync(join(defaultsPublicDir, relativePath));
}

function findUserFavicon() {
  if (!existsSync(userPublicDir)) {
    return undefined;
  }

  for (const extension of faviconExtensions) {
    const name = `favicon${extension}`;

    if (existsSync(join(userPublicDir, name))) {
      return `/${name}`;
    }
  }

  for (const extension of faviconExtensions) {
    const match = readdirSync(userPublicDir, { withFileTypes: true }).find((entry) => {
      const entryExtension = extname(entry.name).toLowerCase();
      const entryName = entry.name.slice(0, -entryExtension.length).toLowerCase();
      return entry.isFile() && entryName === 'favicon' && entryExtension === extension;
    });

    if (match) {
      return `/${match.name}`;
    }
  }

  return undefined;
}

function resolveConfiguredAsset(path: string | null | undefined) {
  if (!path) {
    return undefined;
  }

  const trimmed = path.trim();

  if (!trimmed) {
    return undefined;
  }

  if (/^(https?:)?\/\//.test(trimmed) || trimmed.startsWith('data:')) {
    return trimmed;
  }

  if (trimmed.startsWith('/')) {
    return publicAssetExists(trimmed) ? trimmed : undefined;
  }

  return trimmed;
}

function resolveFirstPublicAsset(candidates: string[]) {
  return candidates.find(publicAssetExists);
}

function resolveSiteLogo(configured?: string | null) {
  const logo = resolveConfiguredAsset(configured) ?? resolveFirstPublicAsset([
    '/logo.svg',
    '/logo.avif',
    '/logo.webp',
    '/logo.png',
    '/logo.jpg',
    '/logo.jpeg',
  ]);

  return logo ? { logo, custom: true } : { logo: '/default/default-logo.svg', custom: false };
}

function resolveSiteDarkLogo(configured: string | null | undefined, fallbackLogo: string, hasCustomLogo: boolean) {
  const darkLogo = resolveConfiguredAsset(configured) ?? resolveFirstPublicAsset([
    '/logo-dark.svg',
    '/logo-dark.avif',
    '/logo-dark.webp',
    '/logo-dark.png',
    '/logo-dark.jpg',
    '/logo-dark.jpeg',
  ]);

  return darkLogo ?? (hasCustomLogo ? fallbackLogo : '/default/default-logo-dark.svg');
}

function resolveAuthorAvatar(configured: string | null | undefined) {
  return resolveConfiguredAsset(configured) ?? resolveFirstPublicAsset([
    '/user.svg',
    '/user.avif',
    '/user.webp',
    '/user.png',
    '/user.jpg',
    '/user.jpeg',
  ]) ?? '/default/default-user.svg';
}

function resolveThemeColor(configured: string | null | undefined) {
  const trimmed = configured?.trim();

  if (trimmed && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed)) {
    return trimmed;
  }

  return '#2D96E4';
}

function resolveSiteUrl(configured: string | null | undefined) {
  const trimmed = configured?.trim();
  return trimmed || 'https://example.com';
}

function resolveFavicon() {
  return findUserFavicon() ?? '/favicon.ico';
}

function resolveFalseOnlyBoolean(configured: string | null | undefined, fallback: boolean) {
  const trimmed = configured?.trim().toLowerCase();

  if (!trimmed) {
    return fallback;
  }

  return trimmed !== 'false';
}

function resolveSiteData(): SiteData {
  const logoData = resolveSiteLogo(readEnv('BLOG_LOGO'));
  const logo = logoData.logo;
  const darkLogo = resolveSiteDarkLogo(readEnv('BLOG_LOGO_DARK'), logo, logoData.custom);

  return {
    title: readEnv('BLOG_TITLE') ?? 'XG-Blog',
    subtitle: readEnv('BLOG_SUBTITLE') ?? '记录与分享~ 使用纯静态 XG-Blog！',
    description: readEnv('BLOG_DESCRIPTION') ?? '这里填写站点描述，用于首页和 SEO。',
    url: resolveSiteUrl(readEnv('BLOG_URL')),
    favicon: resolveFavicon(),
    logo,
    darkLogo,
    showTitle: resolveFalseOnlyBoolean(readEnv('BLOG_SHOW_TITLE'), true),
    theme: {
      color: resolveThemeColor(readEnv('THEME_COLOR')),
    },
    author: {
      name: readEnv('BLOG_AUTHOR') ?? readEnv('BLOG_AUTHOR_NAME') ?? '博主昵称',
      avatar: resolveAuthorAvatar(readEnv('BLOG_AVATAR') ?? readEnv('BLOG_AUTHOR_AVATAR')),
      circleMask: resolveFalseOnlyBoolean(readEnv('BLOG_AVATAR_CIRCLE'), true),
      description: readEnv('BLOG_BIO') ?? readEnv('BLOG_AUTHOR_DESCRIPTION') ?? '这里填写博主简介。',
    },
  };
}

type LinkTomlItem = LinkItem & {
  group: string;
};

type BannerTomlItem = {
  image?: unknown;
  href?: unknown;
};

type HeadTomlItem = {
  html?: unknown;
};

function resolveLinkGroups(items: LinkTomlItem[]) {
  const groups = new Map<string, LinkItem[]>();

  for (const item of items) {
    groups.set(item.group, [
      ...(groups.get(item.group) ?? []),
      {
        name: item.name,
        url: item.url,
        desc: item.desc,
        icon: item.icon,
      },
    ]);
  }

  return [...groups.entries()].map(([name, links]) => ({ name, links }));
}

function normalizeDefaultPublicPath(path: string) {
  const defaultPublicPrefix = '/defaults/public/';

  if (path.startsWith(defaultPublicPrefix)) {
    return `/${path.slice(defaultPublicPrefix.length)}`;
  }

  return path;
}

function resolveBannerImage(value: unknown) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  if (/^(https?:)?\/\//.test(trimmed) || trimmed.startsWith('data:')) {
    return trimmed;
  }

  const publicPath = normalizeDefaultPublicPath(trimmed);
  return publicPath.startsWith('/') && publicAssetExists(publicPath) ? publicPath : undefined;
}

function resolveBannerHref(value: unknown) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
}

function resolveBannerData(): BannerItem[] {
  return readTomlArray<BannerTomlItem>('banner.toml', 'banner')
    .map((item) => {
      const image = resolveBannerImage(item.image);

      if (!image) {
        return undefined;
      }

      const href = resolveBannerHref(item.href);
      return href ? { image, href } : { image };
    })
    .filter((item): item is BannerItem => Boolean(item));
}

function resolveHeadData(): string[] {
  const value = readTomlFile(blogDir, 'head.toml')?.head;

  if (!Array.isArray(value)) {
    return [];
  }

  return (value as HeadTomlItem[])
    .map((item) => (typeof item.html === 'string' ? item.html.trim() : undefined))
    .filter((html): html is string => Boolean(html));
}

function hasIndexMarkdown(dir: string): boolean {
  if (!existsSync(dir)) {
    return false;
  }

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (hasIndexMarkdown(path)) {
        return true;
      }
    } else if (entry.isFile() && entry.name.toLowerCase() === 'index.md') {
      return true;
    }
  }

  return false;
}

function fallbackContentEnabled(fallback: MenuItem['fallback']) {
  if (fallback === 'posts') {
    return !hasIndexMarkdown(join(blogDir, 'posts'));
  }

  if (fallback === 'pages') {
    return !hasIndexMarkdown(join(blogDir, 'pages'));
  }

  return true;
}

function filterFallbackMenuItems(items: MenuItem[]): MenuItem[] {
  return items
    .filter((item) => fallbackContentEnabled(item.fallback))
    .map((item) => ({
      ...item,
      sub: item.sub ? filterFallbackMenuItems(item.sub) : undefined,
    }));
}

function resolveMenuData() {
  const { source, document } = readTomlSource('menu.toml');
  const items = Array.isArray(document.menu) ? (document.menu as MenuItem[]) : [];
  return source === 'example' ? filterFallbackMenuItems(items) : items;
}

export const siteData = resolveSiteData();
export const categoryData = readTomlArray<TaxonomyItem>('categories.toml', 'categories');
export const tagData = readTomlArray<TaxonomyItem>('tags.toml', 'tags');
export const menuData = resolveMenuData();
export const linkData = resolveLinkGroups(readTomlArray<LinkTomlItem>('links.toml', 'links'));
export const bannerData = resolveBannerData();
export const headData = resolveHeadData();
