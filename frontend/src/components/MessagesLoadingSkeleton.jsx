function MessagesLoadingSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-5 px-6">
      {[...Array(6)].map((_, index) => (
        <div key={index} className={`flex ${index % 2 === 0 ? "justify-start" : "justify-end"}`}>
          <div
            className="skeleton h-11 rounded-2xl"
            style={{ width: `${35 + ((index * 17) % 30)}%` }}
          />
        </div>
      ))}
    </div>
  );
}
export default MessagesLoadingSkeleton;
