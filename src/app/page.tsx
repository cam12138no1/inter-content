import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="text-center space-y-8 px-6">
        <div className="space-y-3">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Spark
          </h1>
          <p className="text-lg text-gray-400">
            Interactive Content Engine
          </p>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Transform novels into shareable interactive H5 content with AI-powered pipeline
          </p>
        </div>
        <div className="flex gap-4 justify-center">
          <Link
            href="/admin"
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
          >
            Admin Dashboard
          </Link>
          <Link
            href="/admin/pipeline"
            className="px-6 py-3 border border-indigo-600 text-indigo-400 hover:bg-indigo-600/10 rounded-lg font-medium transition-colors"
          >
            Run Pipeline
          </Link>
        </div>
      </div>
    </div>
  );
}
