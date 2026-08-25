export default function Loading() {
  return (
    <div className="min-h-screen animate-pulse bg-[var(--color-surface-muted)]" dir="rtl">
      <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-5">
        <div className="h-7 w-32 rounded-lg bg-slate-200" />
        <div className="hidden h-5 w-48 gap-3 sm:flex">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-5 flex-1 rounded bg-slate-200" />
          ))}
        </div>
        <div className="h-9 w-20 rounded-lg bg-slate-200" />
      </div>

      <div className="mx-auto max-w-6xl px-5 pt-10">
        <div className="h-4 w-28 rounded-full bg-slate-200" />
        <div className="mt-3 h-10 w-64 rounded-xl bg-slate-200" />
        <div className="mt-2 h-4 w-96 max-w-full rounded bg-slate-200" />
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 px-5 py-12 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-72 rounded-3xl bg-slate-200" />
        ))}
      </div>

      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 rounded-3xl bg-slate-200" />
          ))}
        </div>
      </div>
    </div>
  );
}
