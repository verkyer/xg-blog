import { existsSync, readFileSync } from 'node:fs';
import { copyFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { loadEnv } from 'vite';
import YAML from 'yaml';

const mode = process.env.NODE_ENV ?? 'production';
const fileEnv = loadEnv(mode, process.cwd(), '');
const defaultSite = 'https://www.xiaoge.org';

function readEnv(key) {
  for (const value of [process.env[key], fileEnv[key]]) {
    const trimmed = value?.trim();

    if (trimmed) {
      return trimmed;
    }
  }

  return undefined;
}

function readYaml(relativePath) {
  const filePath = join(process.cwd(), 'blog', 'data', relativePath);

  if (!existsSync(filePath)) {
    return {};
  }

  return YAML.parse(readFileSync(filePath, 'utf8')) ?? {};
}

function readSiteUrl() {
  const userSite = readYaml('site.yaml');
  const exampleSite = readYaml(join('example', 'site.yaml'));

  for (const value of [readEnv('BLOG_URL'), userSite.url, exampleSite.url, defaultSite]) {
    const trimmed = typeof value === 'string' ? value.trim() : '';

    if (trimmed) {
      return trimmed;
    }
  }

  return defaultSite;
}

const site = readSiteUrl();

function sitemapXmlAlias() {
  return {
    name: 'sitemap-xml-alias',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        const outDir = fileURLToPath(dir);
        await copyFile(join(outDir, 'sitemap-index.xml'), join(outDir, 'sitemap.xml'));
      },
    },
  };
}

export default defineConfig({
  site,
  publicDir: './blog/site',
  integrations: [sitemap(), sitemapXmlAlias()],
  markdown: {
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      wrap: true,
    },
  },
});
