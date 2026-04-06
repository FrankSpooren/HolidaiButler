/**
 * Blog API Service — fetches published blogs from Content Studio
 */

const API_BASE = '/api/v1';

export interface BlogSummary {
  id: number;
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
  image: string | null;
  seoScore: number;
  publishedAt: string;
  createdAt: string;
}

export interface BlogDetail extends BlogSummary {
  body: string;
  bodyTranslations: Record<string, string>;
}

export interface BlogListResponse {
  blogs: BlogSummary[];
  total: number;
  limit: number;
  offset: number;
}

class BlogAPI {
  private getHeaders(): HeadersInit {
    return { 'Content-Type': 'application/json' };
  }

  async getBlogs(opts: { limit?: number; offset?: number; lang?: string; sort?: string; ids?: number[] } = {}): Promise<BlogListResponse> {
    const params = new URLSearchParams();
    if (opts.limit) params.set('limit', String(opts.limit));
    if (opts.offset) params.set('offset', String(opts.offset));
    if (opts.lang) params.set('lang', opts.lang);
    if (opts.sort) params.set('sort', opts.sort);
    if (opts.ids?.length) params.set('ids', opts.ids.join(','));

    const res = await fetch(`${API_BASE}/blogs?${params}`, { headers: this.getHeaders() });
    const data = await res.json();
    if (!data.success) throw new Error(data.error?.message || 'Failed to load blogs');
    return data.data;
  }

  async getBlog(slug: string, lang?: string): Promise<BlogDetail> {
    const params = lang ? `?lang=${lang}` : '';
    const res = await fetch(`${API_BASE}/blogs/${slug}${params}`, { headers: this.getHeaders() });
    const data = await res.json();
    if (!data.success) throw new Error(data.error?.message || 'Blog not found');
    return data.data;
  }
}

export const blogApi = new BlogAPI();
