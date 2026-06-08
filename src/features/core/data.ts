import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';

const env = import.meta.env as unknown as Record<string, string | undefined>;
const dataDir = join(process.cwd(), 'blog', 'data');

function readYamlFile<T>(relativePath: string): T | undefined {
  const filePath = join(dataDir, relativePath);

  if (!existsSync(filePath)) {
    return undefined;
  }

  return YAML.parse(readFileSync(filePath, 'utf8')) as T;
}

function readExampleYaml<T>(relativePath: string): T {
  return YAML.parse(readFileSync(join(dataDir, 'example', relativePath), 'utf8')) as T;
}

function readYaml<T>(relativePath: string): T {
  return readYamlFile<T>(relativePath) ?? readExampleYaml<T>(relativePath);
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
  theme: {
    color: string;
  };
  author: {
    name: string;
    avatar: string;
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
  description: string;
  avatar?: string;
};

type RawSiteData = Omit<SiteData, 'subtitle' | 'url' | 'logo' | 'theme' | 'author'> & {
  subtitle?: string;
  url?: string | null;
  logo?: string | null;
  theme?: {
    color?: string | null;
    accent?: string | null;
  };
  author: {
    name: string;
    avatar?: string | null;
    description: string;
  };
};

type PartialRawSiteData = Partial<Omit<RawSiteData, 'theme' | 'author'>> & {
  theme?: RawSiteData['theme'];
  author?: Partial<RawSiteData['author']>;
};

function readSiteYaml() {
  const example = readExampleYaml<RawSiteData>('site.yaml');
  const user = readYamlFile<PartialRawSiteData>('site.yaml');

  if (!user) {
    return example;
  }

  return {
    ...example,
    ...user,
    theme: {
      ...example.theme,
      ...user.theme,
    },
    author: {
      ...example.author,
      ...user.author,
    },
  };
}

function publicAssetExists(path: string) {
  if (!path.startsWith('/')) {
    return false;
  }

  return existsSync(join(process.cwd(), 'blog', 'site', path.slice(1)));
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

function resolveAuthorAvatar(configured: string | null | undefined, fallbackLogo: string) {
  return resolveConfiguredAsset(configured) ?? resolveFirstPublicAsset([
    '/user.svg',
    '/user.avif',
    '/user.webp',
    '/user.png',
    '/user.jpg',
    '/user.jpeg',
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

function resolveSiteData(data: RawSiteData): SiteData {
  const logo = resolveSiteLogo(readEnv('BLOG_LOGO') ?? data.logo);

  return {
    title: readEnv('BLOG_TITLE') ?? data.title,
    subtitle: readEnv('BLOG_SUBTITLE') ?? data.subtitle ?? data.description,
    description: readEnv('BLOG_DESCRIPTION') ?? data.description,
    url: resolveSiteUrl(readEnv('BLOG_URL') ?? data.url),
    logo,
    theme: {
      color: resolveThemeColor(readEnv('THEME_COLOR') ?? data.theme?.color ?? data.theme?.accent),
    },
    author: {
      name: readEnv('BLOG_AUTHOR') ?? readEnv('BLOG_AUTHOR_NAME') ?? data.author.name,
      avatar: resolveAuthorAvatar(readEnv('BLOG_AVATAR') ?? readEnv('BLOG_AUTHOR_AVATAR') ?? data.author.avatar, logo),
      description: readEnv('BLOG_BIO') ?? readEnv('BLOG_AUTHOR_DESCRIPTION') ?? data.author.description,
    },
  };
}

export const siteData = resolveSiteData(readSiteYaml());
export const categoryData = readYaml<TaxonomyItem[]>('categories.yaml');
export const tagData = readYaml<TaxonomyItem[]>('tags.yaml');
export const menuData = readYaml<MenuItem[]>('menu.yaml');
export const linkData = readYaml<LinkItem[]>('links.yaml');
