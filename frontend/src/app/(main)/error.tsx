'use client';

export default function WorkspaceError({ unstable_retry }: { unstable_retry: () => void }) {
  return (
    <main className="flex flex-1 items-center justify-center bg-bg p-6 text-fg">
      <div role="alert" className="max-w-md rounded-2xl border border-border-soft bg-surface p-8 text-center">
        <p className="mb-3 text-sm font-medium text-meta">Theologica</p>
        <h1 className="mb-3 font-serif text-2xl">Let’s reopen your workspace</h1>
        <p className="mb-6 text-sm leading-relaxed text-fg-2">Something interrupted this view. Try again, or reload the page if the problem continues.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={unstable_retry} className="min-h-11 rounded-xl bg-fg px-5 py-3 text-sm font-semibold text-bg">Try again</button>
          <button type="button" onClick={() => window.location.reload()} className="min-h-11 rounded-xl border border-border-soft px-5 py-3 text-sm">Reload page</button>
        </div>
      </div>
    </main>
  );
}
