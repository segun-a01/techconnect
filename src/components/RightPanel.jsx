function RightPanel() {
  const trendingTags = [
    "#react",
    "#supabase",
    "#careers",
    "#opensource",
    "#ai",
  ];

  return (
    <div className="hidden xl:block w-80 p-4 sticky top-0 h-screen">
      <div className="bg-[var(--color-surface)] rounded-2xl p-4">
        <h3 className="font-bold text-lg mb-3">Trending Tags</h3>
        <div className="flex flex-col gap-2">
          {trendingTags.map((tag) => (
            <span
              key={tag}
              className="text-[#7C6FF0] hover:underline cursor-pointer"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default RightPanel;
