import type { MetadataRoute } from "next";
import { getBlogPosts } from "@/lib/api";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://astral4gamer.com";
  let blogEntries: MetadataRoute.Sitemap = [];

  try {
    const posts = (await getBlogPosts({ per_page: 100 })).data;
    blogEntries = posts.filter((post) => {
      const source = `${post.title} ${post.excerpt} ${post.tournament?.title ?? ""} ${post.replay?.title ?? ""}`.toLowerCase();
      return !post.tournament && !post.replay && !/tournoi|tournament|duel|\b1v1\b|\bmatch\b|esport|e-sport|compétition|competition|classement|ranking|\blive\b|replay|highlight/.test(source);
    }).map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: post.published_at ? new Date(post.published_at) : new Date(),
      changeFrequency: "weekly",
      priority: 0.7
    }));
  } catch {
    blogEntries = [];
  }

  return [
    { url: baseUrl, lastModified: new Date(), priority: 1 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    ...blogEntries
  ];
}
