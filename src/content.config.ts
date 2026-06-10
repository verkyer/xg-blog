import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const normalizeSlug = (value: string) => value.trim().toLowerCase();
const contentEntryId = ({ entry }: { entry: string }) =>
  entry.replace(/\\/g, '/').replace(/\/index(?:\.md)?$/, '').replace(/\.md$/, '');

const posts = defineCollection({
  loader: glob({
    pattern: ['blog/posts/**/index.md', 'example/posts/**/index.md'],
    base: './',
    generateId: contentEntryId,
  }),
  schema: z.object({
    title: z.string(),
    slug: z.string().nullish().transform((value) => value?.trim() || undefined),
    description: z.string(),
    date: z.coerce.date(),
    categories: z.array(z.string()).min(1).transform((items) => items.map(normalizeSlug)),
    tags: z.array(z.string()).default([]).transform((items) => items.map(normalizeSlug)),
    cover: z.string().optional(),
    top: z.number().optional().default(0),
    comments: z.boolean().optional().default(false),
  }),
});

const pages = defineCollection({
  loader: glob({
    pattern: ['blog/pages/*/index.md', 'example/pages/*/index.md'],
    base: './',
    generateId: contentEntryId,
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    comments: z.boolean().optional().default(false),
  }),
});

export const collections = { posts, pages };
