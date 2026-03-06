import type { DownloadsProps } from '@/types/blocks';

const fileIcons: Record<string, string> = {
  pdf: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zm-2.5 10.5v3h-1v-3H8v-1h4v1h-1.5zm4 .5c0 .83-.67 1.5-1.5 1.5h-.5v1h-1v-4h1.5c.83 0 1.5.67 1.5 1.5zm3 1.5c0 .83-.67 1.5-1.5 1.5H15v-4h1.5c.83 0 1.5.67 1.5 1.5v1z',
  doc: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm4 18H6V4h7v5h5v11z',
  gpx: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z',
  ical: 'M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z',
};

function getIcon(fileType?: string): string {
  return fileIcons[fileType ?? ''] ?? fileIcons.doc;
}

export default function Downloads({ headline, files }: DownloadsProps) {
  if (!files || files.length === 0) return null;

  return (
    <section className="py-12 sm:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {headline && (
          <h2 className="text-2xl sm:text-3xl font-heading font-bold mb-6">
            {headline}
          </h2>
        )}
        <div className="space-y-3">
          {files.map((file, idx) => (
            <a
              key={idx}
              href={file.url}
              download
              className="flex items-center gap-4 p-4 rounded-tenant border border-border hover:bg-surface transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 24 24">
                  <path d={getIcon(file.fileType)} />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                  {file.name}
                </p>
                {file.description && (
                  <p className="text-sm text-muted mt-0.5 truncate">{file.description}</p>
                )}
              </div>
              {(file.fileType || file.fileSize) && (
                <span className="text-xs text-muted uppercase flex-shrink-0">
                  {file.fileType}{file.fileSize ? ` (${file.fileSize})` : ''}
                </span>
              )}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
