export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="skeleton h-6 w-40 rounded-lg" />
        <div className="skeleton h-3.5 w-64 rounded-md" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="glass rounded-[24px] p-4 space-y-2">
            <div className="skeleton h-3 w-20 rounded" />
            <div className="skeleton h-6 w-14 rounded" />
            <div className="skeleton h-2.5 w-16 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass rounded-[24px] p-5 space-y-3 min-h-[220px]">
          <div className="skeleton h-4 w-28 rounded" />
          <div className="skeleton h-3 w-full rounded" />
          <div className="skeleton h-3 w-11/12 rounded" />
          <div className="skeleton h-3 w-9/12 rounded" />
          <div className="skeleton h-3 w-10/12 rounded" />
        </div>
        <div className="glass rounded-[24px] p-5 space-y-3 min-h-[220px]">
          <div className="skeleton h-4 w-32 rounded" />
          <div className="skeleton h-9 w-full rounded-xl" />
          <div className="skeleton h-9 w-full rounded-xl" />
          <div className="skeleton h-9 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
