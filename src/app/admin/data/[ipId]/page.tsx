"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function IPDataViewer() {
  const params = useParams();
  const ipId = params.ipId as string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>("");

  useEffect(() => {
    fetch(`/api/data/${ipId}`)
      .then((res) => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [ipId]);

  async function loadFile(path: string) {
    setSelectedFileName(path);
    try {
      const res = await fetch(`/api/data/${ipId}?file=${path}`);
      const fileData = await res.json();
      setSelectedFile(fileData);
    } catch (err) {
      console.error(err);
      setSelectedFile({ error: "Failed to load file" });
    }
  }

  if (loading)
    return <div className="text-gray-400 py-12 text-center">Loading...</div>;
  if (!data)
    return <div className="text-red-400 py-12 text-center">IP not found</div>;

  const profile = data.profile;
  const files = data.files;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {profile?.title || ipId}
          </h1>
          {profile?.title_short && (
            <p className="text-gray-400">{profile.title_short}</p>
          )}
        </div>
        <Link
          href="/admin"
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg">
          <div className="text-2xl font-bold text-indigo-400">
            {files?.characters?.length || 0}
          </div>
          <div className="text-xs text-gray-500">Characters</div>
        </div>
        <div className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg">
          <div className="text-2xl font-bold text-purple-400">
            {files?.blueprints?.length || 0}
          </div>
          <div className="text-xs text-gray-500">Scenes</div>
        </div>
        <div className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg">
          <div className="text-2xl font-bold text-green-400">
            {files?.runtime?.length || 0}
          </div>
          <div className="text-xs text-gray-500">Runtime Prompts</div>
        </div>
        <div className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg">
          <div className="text-2xl font-bold text-yellow-400">
            {files?.share?.length || 0}
          </div>
          <div className="text-xs text-gray-500">Share Templates</div>
        </div>
      </div>

      {/* Genre tags */}
      {profile?.genre_tags && (
        <div className="flex flex-wrap gap-2">
          {profile.genre_tags.map((tag: string) => (
            <span
              key={tag}
              className="px-3 py-1 text-sm bg-indigo-600/20 text-indigo-300 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* File browser */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Files</h2>

          <FileSection
            title="Core"
            files={[
              { name: "ip_profile.json", path: "ip_profile.json" },
              { name: "scene_graph.json", path: "scene_graph.json" },
            ]}
            onSelect={loadFile}
            selectedPath={selectedFileName}
          />

          <FileSection
            title="Characters"
            files={(files?.characters || []).map((f: string) => ({
              name: f,
              path: `characters/${f}`,
            }))}
            onSelect={loadFile}
            selectedPath={selectedFileName}
          />

          <FileSection
            title="Scenes"
            files={(files?.scenes || []).map((f: string) => ({
              name: f,
              path: `scenes/${f}`,
            }))}
            onSelect={loadFile}
            selectedPath={selectedFileName}
          />

          <FileSection
            title="Blueprints"
            files={(files?.blueprints || []).map((f: string) => ({
              name: f,
              path: `blueprints/${f}`,
            }))}
            onSelect={loadFile}
            selectedPath={selectedFileName}
          />

          <FileSection
            title="Social"
            files={(files?.share || []).map((f: string) => ({
              name: f,
              path: `share/${f}`,
            }))}
            onSelect={loadFile}
            selectedPath={selectedFileName}
          />
        </div>

        {/* File viewer */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-white mb-3">
            {selectedFileName || "Select a file to view"}
          </h2>
          {selectedFile ? (
            <pre className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-lg overflow-auto max-h-[600px] text-xs text-gray-300 font-mono">
              {JSON.stringify(selectedFile, null, 2)}
            </pre>
          ) : (
            <div className="p-8 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-gray-500 text-center">
              Click a file to view its contents
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FileSection({
  title,
  files,
  onSelect,
  selectedPath,
}: {
  title: string;
  files: { name: string; path: string }[];
  onSelect: (path: string) => void;
  selectedPath: string;
}) {
  if (files.length === 0) return null;
  return (
    <div>
      <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
        {title}
      </h3>
      <div className="space-y-0.5">
        {files.map((f) => (
          <button
            key={f.path}
            onClick={() => onSelect(f.path)}
            className={`w-full text-left px-2 py-1.5 text-sm rounded transition-colors ${
              selectedPath === f.path
                ? "bg-indigo-600/20 text-indigo-300"
                : "text-gray-400 hover:text-white hover:bg-[var(--surface-light)]"
            }`}
          >
            {f.name}
          </button>
        ))}
      </div>
    </div>
  );
}
