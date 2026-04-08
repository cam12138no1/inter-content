import { NextRequest, NextResponse } from "next/server";
import { readJSON, listIPs, listFiles, fileExists } from "@/lib/data/storage";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ipId: string }> }
) {
  const { ipId } = await params;

  // List all IPs if ipId is "_list"
  if (ipId === "_list") {
    const ips = await listIPs();
    return NextResponse.json({ ips });
  }

  // Check if specific file requested
  const searchParams = request.nextUrl.searchParams;
  const file = searchParams.get("file");

  if (file) {
    try {
      const data = await readJSON(ipId, file);
      return NextResponse.json(data);
    } catch {
      return NextResponse.json(
        { error: `File not found: ${file}` },
        { status: 404 }
      );
    }
  }

  // Return overview of all files
  try {
    const hasProfile = await fileExists(ipId, "ip_profile.json");
    if (!hasProfile) {
      return NextResponse.json(
        { error: `IP not found: ${ipId}` },
        { status: 404 }
      );
    }

    const profile = await readJSON(ipId, "ip_profile.json");
    const characters = await listFiles(ipId, "characters");
    const scenes = await listFiles(ipId, "scenes");
    const blueprints = await listFiles(ipId, "blueprints");
    const runtimeFiles = await listFiles(ipId, "runtime");
    const shareFiles = await listFiles(ipId, "share");

    return NextResponse.json({
      ip_id: ipId,
      profile,
      files: {
        characters,
        scenes,
        blueprints,
        runtime: runtimeFiles,
        share: shareFiles,
      },
    });
  } catch {
    return NextResponse.json(
      { error: `Error reading IP data: ${ipId}` },
      { status: 500 }
    );
  }
}
