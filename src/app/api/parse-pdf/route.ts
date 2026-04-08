import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Only PDF files are supported" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);

    // Dynamic import to avoid bundling issues
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

    const pdf = await pdfjsLib.getDocument({
      data,
      useSystemFonts: true,
      disableFontFace: true,
    }).promise;

    const textParts: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((item: any) => item.str)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((item: any) => item.str)
        .join(" ");
      if (pageText.trim()) {
        textParts.push(pageText);
      }
    }

    const fullText = textParts.join("\n\n");

    if (!fullText.trim()) {
      return NextResponse.json(
        {
          error:
            "No text could be extracted from this PDF. It may be image-based (scanned). Please try a text-based PDF or convert it to .txt first.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      text: fullText,
      pages: pdf.numPages,
      characters: fullText.length,
    });
  } catch (err) {
    console.error("PDF parse error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to parse PDF",
      },
      { status: 500 }
    );
  }
}
