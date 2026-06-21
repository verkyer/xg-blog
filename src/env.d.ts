/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly BLOG_TITLE?: string;
  readonly BLOG_SUBTITLE?: string;
  readonly SEO_DESCRIPTION?: string;
  readonly SEO_KEYWORDS?: string;
  readonly BLOG_URL?: string;
  readonly BEIAN?: string;
  readonly BEIAN_URL?: string;
  readonly BLOG_LOGO?: string;
  readonly BLOG_LOGO_DARK?: string;
  readonly BLOG_SHOW_TITLE?: string;
  readonly BLOG_AUTHOR?: string;
  readonly BLOG_AUTHOR_NAME?: string;
  readonly BLOG_AVATAR?: string;
  readonly BLOG_AUTHOR_AVATAR?: string;
  readonly BLOG_AVATAR_CIRCLE?: string;
  readonly BLOG_BIO?: string;
  readonly BLOG_AUTHOR_DESCRIPTION?: string;
  readonly THEME_COLOR?: string;
  readonly TWIKOO_ENV_ID?: string;
  readonly TWIKOO_JS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
