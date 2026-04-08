import fs from "fs/promises";
import path from "path";

const DATA_ROOT = path.join(process.cwd(), "data");

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
  const filepath = path.join(DATA_ROOT, ipId, subpath);
  await fs.mkdir(path.dirname(filepath), { recursive: true });
  await fs.writeFile(filepath, JSON.stringify(data, null, 2), "utf-8");
}

export async function readJSON<T = unknown>(
  ipId: string,
  subpath: string
): Promise<T> {
  const filepath = path.join(DATA_ROOT, ipId, subpath);
  const content = await fs.readFile(filepath, "utf-8");
  return JSON.parse(content) as T;
}

export async function writeText(
  ipId: string,
  subpath: string,
  text: string
): Promise<void> {
  const filepath = path.join(DATA_ROOT, ipId, subpath);
  await fs.mkdir(path.dirname(filepath), { recursive: true });
  await fs.writeFile(filepath, text, "utf-8");
}

export async function readText(
  ipId: string,
  subpath: string
): Promise<string> {
  const filepath = path.join(DATA_ROOT, ipId, subpath);
  return fs.readFile(filepath, "utf-8");
}

export async function writeAsset(
  ipId: string,
  imageId: string,
  buffer: Buffer
): Promise<void> {
  const filepath = path.join(DATA_ROOT, ipId, "assets", `${imageId}.png`);
  await fs.mkdir(path.dirname(filepath), { recursive: true });
  await fs.writeFile(filepath, buffer);
}

export async function listIPs(): Promise<string[]> {
  try {
    const entries = await fs.readdir(DATA_ROOT, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

export async function fileExists(
  ipId: string,
  subpath: string
): Promise<boolean> {
  try {
    await fs.access(path.join(DATA_ROOT, ipId, subpath));
    return true;
  } catch {
    return false;
  }
}

export async function listFiles(
  ipId: string,
  subdir: string
): Promise<string[]> {
  try {
    const dirPath = path.join(DATA_ROOT, ipId, subdir);
    const entries = await fs.readdir(dirPath);
    return entries;
  } catch {
    return [];
  }
}
