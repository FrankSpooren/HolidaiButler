import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { fetchBlog } from '@/lib/api';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const headersList = await headers();
  const tenantSlug = headersList.get('x-tenant-slug') ?? 'calpe';
  const locale = headersList.get('x-tenant-locale') ?? 'en';

  const blog = await fetchBlog(tenantSlug, slug, locale);
  if (!blog) return { title: 'Blog Not Found' };

  return {
    title: `${blog.metaTitle || blog.title} | CalpeTrip`,
    description: blog.metaDescription,
    openGraph: {
      title: blog.metaTitle || blog.title,
      description: blog.metaDescription,
      images: blog.image ? [blog.image] : undefined,
    },
  };
}

export default async function BlogDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const headersList = await headers();
  const tenantSlug = headersList.get('x-tenant-slug') ?? 'calpe';
  const locale = headersList.get('x-tenant-locale') ?? 'en';

  const blog = await fetchBlog(tenantSlug, slug, locale);
  if (!blog) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero image */}
      {blog.image && (
        <div
          className="h-64 md:h-80 bg-cover bg-center rounded-b-3xl"
          style={{ backgroundImage: `url(${blog.image})` }}
        />
      )}

      <article className="max-w-3xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <Link href="/blog" className="text-sm font-medium text-[var(--hb-primary,#5E8B7E)] no-underline hover:underline">
          ← Blog
        </Link>

        {/* Header */}
        <h1 className="text-2xl md:text-3xl font-extrabold leading-tight mt-3 mb-2 text-gray-900">
          {blog.title}
        </h1>
        <time className="text-sm text-gray-400 block mb-6">
          {new Date(blog.publishedAt || blog.createdAt).toLocaleDateString(
            locale === 'nl' ? 'nl-NL' : locale === 'de' ? 'de-DE' : locale === 'es' ? 'es-ES' : 'en-GB',
            { day: 'numeric', month: 'long', year: 'numeric' }
          )}
        </time>

        {/* Body (HTML from TipTap) */}
        <div
          className="prose prose-lg max-w-none
            prose-headings:text-gray-900 prose-headings:font-bold
            prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-3
            prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-2
            prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-4
            prose-a:text-[var(--hb-primary,#5E8B7E)] prose-a:font-medium prose-a:no-underline hover:prose-a:underline
            prose-strong:font-semibold
            prose-img:rounded-lg prose-img:my-4"
          dangerouslySetInnerHTML={{ __html: blog.body || '' }}
        />

        {/* Footer */}
        <div className="mt-10 pt-6 border-t border-gray-200">
          <Link href="/blog" className="text-sm font-medium text-[var(--hb-primary,#5E8B7E)] no-underline hover:underline">
            ← Back to all articles
          </Link>
        </div>
      </article>
    </div>
  );
}
