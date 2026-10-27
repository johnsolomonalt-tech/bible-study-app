export default function WorkspaceLoading() {
  return (
    <main aria-busy="true" className="flex flex-1 items-center justify-center bg-bg p-6 text-fg">
      <div role="status" className="text-center">
        <p className="mb-3 font-serif text-2xl">Theologica</p>
        <p className="text-sm text-meta">Opening your study workspace…</p>
      </div>
    </main>
  );
}
