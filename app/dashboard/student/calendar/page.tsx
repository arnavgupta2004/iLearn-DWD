export default function StudentCalendarPage() {
  return (
    <div className="h-full flex flex-col items-center justify-center p-8">
      <div
        className="rounded-2xl border p-12 text-center max-w-md"
        style={{ borderColor: "#e5eaf5", background: "#fafbff" }}
      >
        <p className="text-6xl mb-4">📅</p>
        <h1 className="text-2xl font-extrabold mb-2" style={{ color: "#1a2b5e" }}>
          Calendar
        </h1>
        <p className="text-gray-400 text-sm">
          Coming soon. Check back later.
        </p>
      </div>
    </div>
  );
}
