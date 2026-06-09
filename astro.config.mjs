import { existsSync, readdirSync } from 'node:fs';
import { copyFile, cp, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { extname, isAbsolute, join, relative, resolve } from 'node:path';
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
const rootDir = process.cwd();
const userPublicDir = join(rootDir, 'blog', 'public');
const defaultsPublicDir = join(rootDir, 'defaults', 'public');
const faviconExtensions = ['.ico', '.svg', '.png', '.webp'];

function contentType(filePath) {
  const typeByExtension = {
    '.avif': 'image/avif',
    '.css': 'text/css; charset=utf-8',
    '.gif': 'image/gif',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.webp': 'image/webp',
    '.xml': 'application/xml; charset=utf-8',
  };

  return typeByExtension[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

function isInsideDir(parent, child) {
  const path = relative(parent, child);
  return path === '' || (!path.startsWith('..') && !isAbsolute(path));
}

function findUserFavicon() {
  if (!existsSync(userPublicDir)) {
    return undefined;
  }

  for (const extension of faviconExtensions) {
    const name = `favicon${extension}`;

    if (existsSync(join(userPublicDir, name))) {
      return name;
    }
  }

  for (const extension of faviconExtensions) {
    const match = readdirSync(userPublicDir, { withFileTypes: true }).find((entry) => {
      const entryExtension = extname(entry.name).toLowerCase();
      const entryName = entry.name.slice(0, -entryExtension.length).toLowerCase();
      return entry.isFile() && entryName === 'favicon' && entryExtension === extension;
    });

    if (match) {
      return match.name;
    }
  }

  return undefined;
}

async function copyMissing(sourceDir, targetDir, shouldSkip, baseDir = sourceDir) {
  if (!existsSync(sourceDir)) {
    return;
  }

  await mkdir(targetDir, { recursive: true });

  for (const entry of await readdir(sourceDir, { withFileTypes: true })) {
    const source = join(sourceDir, entry.name);
    const target = join(targetDir, entry.name);

    if (entry.isDirectory()) {
      await copyMissing(source, target, shouldSkip, baseDir);
    } else if (entry.isFile() && !shouldSkip?.(relative(baseDir, source).replace(/\\/g, '/')) && !existsSync(target)) {
      await copyFile(source, target);
    }
  }
}

async function copyPublicAssets(outDir) {
  const userFavicon = findUserFavicon();
  await copyMissing(
    defaultsPublicDir,
    outDir,
    (relativePath) => Boolean(userFavicon) && relativePath.toLowerCase() === 'favicon.ico',
  );

  if (existsSync(userPublicDir)) {
    await cp(userPublicDir, outDir, { recursive: true, force: true });
  }
}

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

function publicAssetOverlay() {
  return {
    name: 'public-asset-overlay',
    hooks: {
      'astro:server:setup': ({ server }) => {
        server.middlewares.use(async (request, response, next) => {
          if (request.method !== 'GET' && request.method !== 'HEAD') {
            next();
            return;
          }

          const url = new URL(request.url ?? '/', 'http://localhost');
          const relativePath = decodeURIComponent(url.pathname).replace(/^\/+/, '');

          if (!relativePath || relativePath.endsWith('/')) {
            next();
            return;
          }

          const userFile = resolve(userPublicDir, relativePath);

          if (isInsideDir(userPublicDir, userFile) && existsSync(userFile)) {
            next();
            return;
          }

          if (relativePath.toLowerCase() === 'favicon.ico' && findUserFavicon()) {
            next();
            return;
          }

          const defaultsFile = resolve(defaultsPublicDir, relativePath);

          if (!isInsideDir(defaultsPublicDir, defaultsFile)) {
            next();
            return;
          }

          try {
            const info = await stat(defaultsFile);

            if (!info.isFile()) {
              next();
              return;
            }

            response.statusCode = 200;
            response.setHeader('Content-Type', contentType(defaultsFile));

            if (request.method === 'HEAD') {
              response.end();
              return;
            }

            response.end(await readFile(defaultsFile));
          } catch {
            next();
          }
        });
      },
      'astro:build:done': async ({ dir }) => {
        await copyPublicAssets(fileURLToPath(dir));
      },
    },
  };
}

export default defineConfig({
  site,
  publicDir: './blog/public',
  integrations: [sitemap(), sitemapXmlAlias(), notFoundRedirectsFile(), publicAssetOverlay()],
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
