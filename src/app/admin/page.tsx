"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface IPOverview {
  ip_id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profile: any;
  files: {
    characters: string[];
    scenes: string[];
    blueprints: string[];
    runtime: string[];
    share: string[];
  };
}

export default function AdminDashboard() {
  const [ips, setIPs] = useState<string[]>([]);
  const [ipData, setIPData] = useState<Record<string, IPOverview>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIPs();
  }, []);

  async function loadIPs() {
    try {
      const res = await fetch("/api/data/_list");
      const data = await res.json();
      setIPs(data.ips || []);

      // Load details for each IP
      const details: Record<string, IPOverview> = {};
      for (const ipId of data.ips || []) {
        try {
          const detailRes = await fetch(`/api/data/${ipId}`);
          details[ipId] = await detailRes.json();
        } catch {
          // skip
        }
      }
      setIPData(details);
    } catch (err) {
      console.error("Failed to load IPs:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <Link
          href="/admin/pipeline"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          + New Pipeline
        </Link>
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-12">Loading...</div>
      ) : ips.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <div className="text-gray-500 text-lg">No IPs generated yet</div>
          <p className="text-gray-600 text-sm">
            Run the pipeline to transform a novel into interactive content
          </p>
          <Link
            href="/admin/pipeline"
            className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
          >
            Run Pipeline
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ips.map((ipId) => {
            const data = ipData[ipId];
            return (
              <Link
                key={ipId}
                href={`/admin/data/${ipId}`}
                className="block p-5 bg-[var(--surface)] border border-[var(--border)] rounded-xl hover:border-indigo-500/50 transition-colors"
              >
                <h3 className="font-semibold text-white text-lg">
                  {data?.profile?.title || ipId}
                </h3>
                {data?.profile?.title_short && (
                  <p className="text-sm text-gray-400 mt-1">
                    {data.profile.title_short}
                  </p>
                )}
                <div className="mt-3 flex gap-3 text-xs text-gray-500">
                  <span>
                    {data?.files?.blueprints?.length || 0} scenes
                  </span>
                  <span>
                    {data?.files?.characters?.length || 0} characters
                  </span>
                </div>
                {data?.profile?.genre_tags && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {data.profile.genre_tags
                      .slice(0, 3)
                      .map((tag: string) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 text-xs bg-indigo-600/20 text-indigo-300 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
