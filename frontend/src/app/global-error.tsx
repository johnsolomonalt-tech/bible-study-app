'use client';

export default function GlobalError({ unstable_retry }: { unstable_retry: () => void }) {
  // Root failures must remain readable even when the application stylesheet fails.
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#141413', color: '#faf9f5', fontFamily: 'system-ui, sans-serif' }}>
        <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, boxSizing: 'border-box' }}>
          <div role="alert" style={{ maxWidth: 440, textAlign: 'center' }}>
            <p>Theologica</p>
            <h1>We couldn’t open the app</h1>
            <p style={{ color: '#b0aea5', lineHeight: 1.6 }}>Please try again. If this keeps happening, reload the page.</p>
            <button type="button" onClick={unstable_retry} style={{ padding: '12px 20px', margin: 8, borderRadius: 8, cursor: 'pointer' }}>Try again</button>
            <button type="button" onClick={() => window.location.reload()} style={{ padding: '12px 20px', margin: 8, borderRadius: 8, cursor: 'pointer' }}>Reload page</button>
          </div>
        </main>
      </body>
    </html>
  );
}
