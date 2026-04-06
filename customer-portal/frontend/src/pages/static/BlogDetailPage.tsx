import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { useDestination } from '../../shared/contexts/DestinationContext';
import { usePageMeta } from '../../shared/hooks/usePageMeta';
import { blogApi, type BlogDetail } from '../../shared/services/blog.api';

export function BlogDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { language } = useLanguage();
  const destination = useDestination();
  const [blog, setBlog] = useState<BlogDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  usePageMeta({
    title: blog?.metaTitle || blog?.title || 'Blog',
    description: blog?.metaDescription || '',
    path: `/blog/${slug}`,
  });

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    blogApi.getBlog(slug, language)
      .then(data => setBlog(data))
      .catch(err => setError(err.message || 'Blog not found'))
      .finally(() => setLoading(false));
  }, [slug, language]);

  if (loading) {
    return (
      <div style={{ maxWidth: 760, margin: '48px auto', padding: '0 24px', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ width: '60%', height: 32, background: '#f3f4f6', borderRadius: 6, marginBottom: 16, animation: 'pulse 2s infinite' }} />
        <div style={{ width: '30%', height: 16, background: '#f3f4f6', borderRadius: 6, marginBottom: 32, animation: 'pulse 2s infinite' }} />
        <div style={{ width: '100%', height: 300, background: '#f3f4f6', borderRadius: 12, animation: 'pulse 2s infinite' }} />
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div style={{ maxWidth: 760, margin: '64px auto', padding: '0 24px', textAlign: 'center', fontFamily: "'Inter', sans-serif" }}>
        <h1 style={{ fontSize: 24, color: '#1a1a1a' }}>Blog not found</h1>
        <p style={{ color: '#9CA3AF' }}>{error || 'This article does not exist or has been removed.'}</p>
        <Link to="/blog" style={{ color: '#5E8B7E', textDecoration: 'none', fontWeight: 500 }}>← Back to blog</Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 200px)', background: '#fff', fontFamily: "'Inter', sans-serif" }}>
      {/* Hero image */}
      {blog.image && (
        <div style={{
          maxWidth: 760, margin: '0 auto', padding: '24px 24px 0',
        }}>
          <img src={blog.image} alt={blog.title} style={{
            width: '100%', height: 360, objectFit: 'cover', borderRadius: 12,
          }} />
        </div>
      )}

      <article style={{ maxWidth: 760, margin: '0 auto', padding: '24px 24px 64px' }}>
        {/* Breadcrumb */}
        <Link to="/blog" style={{ fontSize: 14, color: '#5E8B7E', textDecoration: 'none', fontWeight: 500 }}>
          ← Blog
        </Link>

        {/* Title */}
        <h1 style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.2, margin: '12px 0 8px', color: '#1a1a1a' }}>
          {blog.title}
        </h1>
        <time style={{ fontSize: 14, color: '#9CA3AF', display: 'block', marginBottom: 32 }}>
          {new Date(blog.publishedAt || blog.createdAt).toLocaleDateString(
            language === 'nl' ? 'nl-NL' : language === 'de' ? 'de-DE' : language === 'es' ? 'es-ES' : 'en-GB',
            { day: 'numeric', month: 'long', year: 'numeric' }
          )}
        </time>

        {/* Body (HTML from TipTap) */}
        <div
          dangerouslySetInnerHTML={{ __html: blog.body || '' }}
          style={{ fontSize: 17, lineHeight: 1.8, color: '#333' }}
          className="blog-body"
        />

        {/* Footer */}
        <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid #eee' }}>
          <Link to="/blog" style={{ fontSize: 14, color: '#5E8B7E', textDecoration: 'none', fontWeight: 500 }}>
            ← {language === 'nl' ? 'Terug naar alle artikelen' : 'Back to all articles'}
          </Link>
        </div>
      </article>

      {/* Inline styles for blog body HTML */}
      <style>{`
        .blog-body h2 { font-size: 22px; font-weight: 700; margin: 32px 0 12px; color: #1a1a1a; }
        .blog-body h3 { font-size: 18px; font-weight: 600; margin: 24px 0 8px; color: #333; }
        .blog-body p { margin: 0 0 16px; }
        .blog-body a { color: #5E8B7E; font-weight: 500; text-decoration: none; }
        .blog-body a:hover { text-decoration: underline; }
        .blog-body img { max-width: 100%; border-radius: 8px; margin: 16px 0; }
        .blog-body strong { font-weight: 600; }
        .blog-body em { font-style: italic; }
        .blog-body ul, .blog-body ol { padding-left: 24px; margin: 0 0 16px; }
        .blog-body li { margin-bottom: 4px; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );
}

export default BlogDetailPage;
