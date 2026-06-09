import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'smol-toml';

const env = import.meta.env as unknown as Record<string, string | undefined>;
const blogDir = join(process.cwd(), 'blog');

type TomlDocument = Record<string, unknown>;

function readTomlFile(relativePath: string): TomlDocument | undefined {
  const filePath = join(blogDir, relativePath);

  if (!existsSync(filePath)) {
    return undefined;
  }

  return parse(readFileSync(filePath, 'utf8')) as TomlDocument;
}

function readToml(relativePath: string): TomlDocument {
  return readTomlFile(relativePath) ?? readTomlFile(join('example', relativePath)) ?? {};
}

function readTomlArray<T>(relativePath: string, key: string): T[] {
  const value = readToml(relativePath)[key];
  return Array.isArray(value) ? (value as T[]) : [];
}

function readMergedTomlArray<T extends { slug: string }>(relativePath: string, key: string): T[] {
  const items = [
    ...readTomlArray<T>(join('example', relativePath), key),
    ...readTomlArray<T>(relativePath, key),
  ];
  const bySlug = new Map<string, T>();

  for (const item of items) {
    bySlug.set(item.slug.trim().toLowerCase(), {
      ...item,
      slug: item.slug.trim().toLowerCase(),
    });
  }

  return [...bySlug.values()];
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
  children?: MenuItem[];
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

function publicAssetExists(path: string) {
  if (!path.startsWith('/')) {
    return false;
  }

  return existsSync(join(process.cwd(), 'blog', 'images', path.slice(1)));
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
  return resolveConfiguredAsset(configured) ?? resolveFirstPublicAsset([
    '/logo.svg',
    '/logo.avif',
    '/logo.webp',
    '/logo.png',
    '/logo.jpg',
    '/logo.jpeg',
    '/default-logo.svg',
    '/default-logo.avif',
    '/default-logo.webp',
    '/default-logo.png',
    '/default-logo.jpg',
    '/default-logo.jpeg',
  ]) ?? '/default-logo.svg';
}

function resolveSiteDarkLogo(configured: string | null | undefined, fallbackLogo: string) {
  return resolveConfiguredAsset(configured) ?? resolveFirstPublicAsset([
    '/logo-dark.svg',
    '/logo-dark.avif',
    '/logo-dark.webp',
    '/logo-dark.png',
    '/logo-dark.jpg',
    '/logo-dark.jpeg',
  ]) ?? fallbackLogo;
}

function resolveAuthorAvatar(configured: string | null | undefined, fallbackLogo: string) {
  return resolveConfiguredAsset(configured) ?? resolveFirstPublicAsset([
    '/user.svg',
    '/user.avif',
    '/user.webp',
    '/user.png',
    '/user.jpg',
    '/user.jpeg',
    '/default-user.svg',
    '/default-user.avif',
    '/default-user.webp',
    '/default-user.png',
    '/default-user.jpg',
    '/default-user.jpeg',
  ]) ?? fallbackLogo;
}

function resolveThemeColor(configured: string | null | undefined) {
  const trimmed = configured?.trim();

  if (trimmed && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed)) {
    return trimmed;
  }

  return '#6aa6c8';
}

function resolveSiteUrl(configured: string | null | undefined) {
  const trimmed = configured?.trim();
  return trimmed || 'https://www.xiaoge.org';
}

function resolveBoolean(configured: string | boolean | number | null | undefined, fallback: boolean) {
  if (typeof configured === 'boolean') {
    return configured;
  }

  if (typeof configured === 'number') {
    return configured !== 0;
  }

  const trimmed = configured?.trim().toLowerCase();

  if (!trimmed) {
    return fallback;
  }

  return !['false', '0', 'no', 'off'].includes(trimmed);
}

function resolveSiteData(): SiteData {
  const logo = resolveSiteLogo(readEnv('BLOG_LOGO'));
  const darkLogo = resolveSiteDarkLogo(readEnv('BLOG_LOGO_DARK'), logo);

  return {
    title: readEnv('BLOG_TITLE') ?? '示例博客',
    subtitle: readEnv('BLOG_SUBTITLE') ?? '记录与分享',
    description: readEnv('BLOG_DESCRIPTION') ?? '这里填写站点描述，用于首页和 SEO。',
    url: resolveSiteUrl(readEnv('BLOG_URL')),
    logo,
    darkLogo,
    showTitle: resolveBoolean(readEnv('BLOG_SHOW_TITLE'), true),
    theme: {
      color: resolveThemeColor(readEnv('THEME_COLOR')),
    },
    author: {
      name: readEnv('BLOG_AUTHOR') ?? readEnv('BLOG_AUTHOR_NAME') ?? '博主昵称',
      avatar: resolveAuthorAvatar(readEnv('BLOG_AVATAR') ?? readEnv('BLOG_AUTHOR_AVATAR'), logo),
      circleMask: resolveBoolean(readEnv('BLOG_AVATAR_CIRCLE'), true),
      description: readEnv('BLOG_BIO') ?? readEnv('BLOG_AUTHOR_DESCRIPTION') ?? '这里填写博主简介。',
    },
  };
}

type LinkTomlItem = LinkItem & {
  group: string;
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

export const siteData = resolveSiteData();
export const categoryData = readMergedTomlArray<TaxonomyItem>('categories.toml', 'categories');
export const tagData = readMergedTomlArray<TaxonomyItem>('tags.toml', 'tags');
export const menuData = readTomlArray<MenuItem>('menu.toml', 'menu');
export const linkData = resolveLinkGroups(readTomlArray<LinkTomlItem>('links.toml', 'links'));
