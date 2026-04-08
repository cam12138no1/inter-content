import fs from "fs/promises";
import path from "path";

// On Vercel, use /tmp (writable). Locally, use ./data
const DATA_ROOT = process.env.VERCEL
  ? path.join("/tmp", "spark-data")
  : path.join(process.cwd(), "data");

// In-memory cache for Vercel (since /tmp is ephemeral per invocation)
const memoryStore = new Map<string, string>();

function getFilePath(ipId: string, subpath: string): string {
  return path.join(DATA_ROOT, ipId, subpath);
}

export async function ensureDirectories(ipId: string): Promise<void> {
  const subdirs = [
    "characters",
    "scenes",
    "social",
    "blueprints",
    "runtime",
    "share",
    "assets",
  ];
  for (const sub of subdirs) {
    await fs.mkdir(path.join(DATA_ROOT, ipId, sub), { recursive: true });
  }
}

export async function writeJSON(
  ipId: string,
  subpath: string,
  data: unknown
): Promise<void> {
  const filepath = getFilePath(ipId, subpath);
  const content = JSON.stringify(data, null, 2);

  // Always write to memory store
  memoryStore.set(`${ipId}/${subpath}`, content);

  // Also write to filesystem
  try {
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    await fs.writeFile(filepath, content, "utf-8");
  } catch {
    // On Vercel, filesystem writes may fail across invocations
    // Memory store serves as fallback within the same invocation
  }
}

export async function readJSON<T = unknown>(
  ipId: string,
  subpath: string
): Promise<T> {
  const key = `${ipId}/${subpath}`;

  // Check memory store first
  const cached = memoryStore.get(key);
  if (cached) {
    return JSON.parse(cached) as T;
  }

  // Fall back to filesystem
  const filepath = getFilePath(ipId, subpath);
  const content = await fs.readFile(filepath, "utf-8");
  memoryStore.set(key, content);
  return JSON.parse(content) as T;
}

export async function writeText(
  ipId: string,
  subpath: string,
  text: string
): Promise<void> {
  const filepath = getFilePath(ipId, subpath);
  memoryStore.set(`${ipId}/${subpath}`, text);

  try {
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    await fs.writeFile(filepath, text, "utf-8");
  } catch {
    // Memory store fallback
  }
}

export async function readText(
  ipId: string,
  subpath: string
): Promise<string> {
  const key = `${ipId}/${subpath}`;

  const cached = memoryStore.get(key);
  if (cached) return cached;

  const filepath = getFilePath(ipId, subpath);
  const content = await fs.readFile(filepath, "utf-8");
  memoryStore.set(key, content);
  return content;
}

export async function writeAsset(
  ipId: string,
  imageId: string,
  buffer: Buffer
): Promise<void> {
  const filepath = path.join(DATA_ROOT, ipId, "assets", `${imageId}.png`);
  try {
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    await fs.writeFile(filepath, buffer);
  } catch {
    // Asset writes may fail on Vercel
  }
}

export async function listIPs(): Promise<string[]> {
  // Collect from memory store
  const memoryIPs = new Set<string>();
  for (const key of memoryStore.keys()) {
    const ipId = key.split("/")[0];
    if (ipId) memoryIPs.add(ipId);
  }

  // Also check filesystem
  try {
    const entries = await fs.readdir(DATA_ROOT, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory()) memoryIPs.add(e.name);
    }
  } catch {
    // Directory may not exist
  }

  return Array.from(memoryIPs);
}

export async function fileExists(
  ipId: string,
  subpath: string
): Promise<boolean> {
  const key = `${ipId}/${subpath}`;
  if (memoryStore.has(key)) return true;

  try {
    await fs.access(getFilePath(ipId, subpath));
    return true;
  } catch {
    return false;
  }
}

export async function listFiles(
  ipId: string,
  subdir: string
): Promise<string[]> {
  const files = new Set<string>();

  // From memory store
  const prefix = `${ipId}/${subdir}/`;
  for (const key of memoryStore.keys()) {
    if (key.startsWith(prefix)) {
      files.add(key.slice(prefix.length));
    }
  }

  // From filesystem
  try {
    const dirPath = path.join(DATA_ROOT, ipId, subdir);
    const entries = await fs.readdir(dirPath);
    for (const e of entries) files.add(e);
  } catch {
    // Directory may not exist
  }

  return Array.from(files);
}
