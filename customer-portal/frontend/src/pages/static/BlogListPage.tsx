import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { useDestination } from '../../shared/contexts/DestinationContext';
import { usePageMeta } from '../../shared/hooks/usePageMeta';
import { blogApi, type BlogSummary } from '../../shared/services/blog.api';
import analytics from '../../shared/utils/analytics';

export function BlogListPage() {
  const { language } = useLanguage();
  const destination = useDestination();
  const [blogs, setBlogs] = useState<BlogSummary[]>([]);
  const [loading, setLoading] = useState(true);

  usePageMeta({
    title: `Blog | ${destination?.name || 'CalpeTrip'}`,
    description: 'Travel stories, local tips and destination guides',
    path: '/blog',
  });

  useEffect(() => {
    setLoading(true);
    blogApi.getBlogs({ limit: 12, lang: language })
      .then(data => { setBlogs(data.blogs); analytics.blog_list_viewed(); })
      .catch(() => setBlogs([]))
      .finally(() => setLoading(false));
  }, [language]);

  return (
    <div style={{ minHeight: 'calc(100vh - 200px)', background: '#fff', fontFamily: "'Inter', sans-serif" }}>
      {/* Page title — clean, matches POI/Agenda style */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 0' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1a1a1a', margin: 0 }}>Blog</h1>
        <p style={{ fontSize: 15, color: '#9CA3AF', margin: '4px 0 24px' }}>
          {language === 'nl' ? 'Verhalen, tips & lokale inzichten' :
           language === 'de' ? 'Geschichten, Tipps & lokale Einblicke' :
           language === 'es' ? 'Historias, consejos y perspectivas locales' :
           'Stories, tips & local insights'}
        </p>
      </div>

      {/* Blog grid */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 48px' }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ background: '#f3f4f6', borderRadius: 12, height: 320, animation: 'pulse 2s infinite' }} />
            ))}
          </div>
        ) : blogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: '#9CA3AF' }}>
            <p style={{ fontSize: 18, fontWeight: 600 }}>
              {language === 'nl' ? 'Nog geen artikelen' : 'No articles yet'}
            </p>
            <p>{language === 'nl' ? 'Kom binnenkort terug voor reisverhalen en tips.' : 'Check back soon for travel stories and local tips.'}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {blogs.map(blog => (
              <Link
                to={`/blog/${blog.slug}`}
                key={blog.id}
                onClick={() => analytics.blog_card_clicked(blog.slug, blog.title)}
                style={{
                  background: '#fff',
                  borderRadius: 12,
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  border: '1px solid #f0f0f0',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'; }}
              >
                {/* Image */}
                <div style={{
                  height: 200,
                  backgroundImage: blog.image ? `url(${blog.image})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundColor: blog.image ? undefined : '#f3f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {!blog.image && <span style={{ fontSize: 48, opacity: 0.3 }}>📝</span>}
                </div>
                {/* Content */}
                <div style={{ padding: '16px 20px' }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.3, margin: '0 0 8px', color: '#1a1a1a' }}>{blog.title}</h3>
                  <p style={{
                    fontSize: 13, color: '#6B7280', lineHeight: 1.5, margin: 0,
                    display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
                  }}>{blog.excerpt}</p>
                  <time style={{ display: 'block', marginTop: 12, fontSize: 12, color: '#9CA3AF' }}>
                    {new Date(blog.publishedAt || blog.createdAt).toLocaleDateString(
                      language === 'nl' ? 'nl-NL' : language === 'de' ? 'de-DE' : language === 'es' ? 'es-ES' : 'en-GB',
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

export default BlogListPage;
