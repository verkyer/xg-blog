import { copyFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { loadEnv } from 'vite';

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

function readSiteUrl() {
  return readEnv('BLOG_URL') ?? defaultSite;
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

function notFoundRedirectsFile() {
  return {
    name: 'not-found-redirects-file',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        const outDir = fileURLToPath(dir);
        await writeFile(join(outDir, '_redirects'), '/* /404.html 404\n');
      },
    },
  };
}

export default defineConfig({
  site,
  publicDir: './blog/images',
  integrations: [sitemap(), sitemapXmlAlias(), notFoundRedirectsFile()],
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
