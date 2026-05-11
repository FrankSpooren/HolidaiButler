/**
 * Bare layout for /preview — NO site header, nav, footer, or chatbot.
 * Preview iframe shows only the wireframe block renderer.
 */
export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
