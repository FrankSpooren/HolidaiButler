import { headers } from 'next/headers';
import Link from 'next/link';
import type { Metadata } from 'next';
import { fetchBlogs } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Blog | CalpeTrip',
  description: 'Travel stories, local tips and destination guides for Calpe and the Costa Blanca.',
};

export default async function BlogListPage() {
  const headersList = await headers();
  const tenantSlug = headersList.get('x-tenant-slug') ?? 'calpe';
  const locale = headersList.get('x-tenant-locale') ?? 'en';

  const blogs = await fetchBlogs(tenantSlug, locale);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[var(--hb-primary,#5E8B7E)] to-[var(--hb-secondary,#7FA594)] py-12 px-6 text-center text-white rounded-b-3xl">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Blog</h1>
        <p className="mt-2 text-white/90 text-lg">Stories, tips & local insights</p>
      </div>

      {/* Grid */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {blogs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-xl font-semibold mb-2">No articles yet</p>
            <p>Check back soon for travel stories and local tips.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogs.map(blog => (
              <Link
                key={blog.id}
                href={`/blog/${blog.slug}`}
                className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 no-underline text-inherit"
              >
                {/* Image */}
                <div
                  className="h-44 bg-cover bg-center"
                  style={{
                    backgroundImage: blog.image
                      ? `url(${blog.image})`
                      : `linear-gradient(135deg, var(--hb-primary,#5E8B7E)44, var(--hb-secondary,#7FA594)44)`,
                  }}
                >
                  {!blog.image && (
                    <div className="h-full flex items-center justify-center text-4xl">📝</div>
                  )}
                </div>
                {/* Body */}
                <div className="p-4">
                  <h3 className="text-base font-bold leading-snug mb-2 text-gray-900">{blog.title}</h3>
                  <p className="text-sm text-gray-500 line-clamp-3">{blog.excerpt}</p>
                  <time className="block mt-3 text-xs text-gray-400">
                    {new Date(blog.publishedAt || blog.createdAt).toLocaleDateString(
                      locale === 'nl' ? 'nl-NL' : locale === 'de' ? 'de-DE' : locale === 'es' ? 'es-ES' : 'en-GB',
                      { day: 'numeric', month: 'long', year: 'numeric' }
                    )}
                  </time>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
