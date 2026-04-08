import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <nav className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-6">
              <Link
                href="/"
                className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent"
              >
                Spark
              </Link>
              <div className="flex gap-1">
                <Link
                  href="/admin"
                  className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-[var(--surface-light)] rounded-md transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/admin/pipeline"
                  className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-[var(--surface-light)] rounded-md transition-colors"
                >
                  Pipeline
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
