function UsersLoadingSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4].map((item) => (
        <div key={item} className="flex items-center gap-3 rounded-2xl p-3">
          <div className="skeleton size-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-3/4 rounded-md" />
            <div className="skeleton h-3 w-1/3 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
export default UsersLoadingSkeleton;
