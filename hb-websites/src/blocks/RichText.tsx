import type { RichTextProps } from '@/types/blocks';
import { sanitizeHtml } from '@/lib/sanitize';

export default function RichText({ content }: RichTextProps) {
  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div
        className="prose prose-lg max-w-none
          prose-headings:font-heading prose-headings:text-foreground
          prose-p:text-foreground/80 prose-a:text-primary hover:prose-a:text-primary-dark
          prose-strong:text-foreground"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
      />
    </section>
  );
}
