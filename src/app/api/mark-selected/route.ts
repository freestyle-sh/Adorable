import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

function isSafeFilename(name: string): boolean {
  return !name.includes("..") && !name.includes("/") && !name.includes("\\");
}

function appendSelectedSuffix(filename: string): string {
  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex === -1) {
    // no extension
    return filename.endsWith("_selected") ? filename : `${filename}_selected`;
  }
  const base = filename.slice(0, dotIndex);
  const ext = filename.slice(dotIndex);
  if (base.endsWith("_selected")) return filename;
  return `${base}_selected${ext}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const files: unknown = (body as any)?.files;
    if (!Array.isArray(files) || files.some((f) => typeof f !== "string")) {
      return NextResponse.json({ error: "Invalid 'files' payload" }, { status: 400 });
    }

    const outputDir = path.join(process.cwd(), "public", "scroller", "new");
    const results: { old: string; new: string }[] = [];

    for (const f of files as string[]) {
      const filename = f.split("/").pop() || f; // allow full path or filename
      if (!isSafeFilename(filename)) continue;
      const fromPath = path.join(outputDir, filename);
      const toName = appendSelectedSuffix(filename);
      const toPath = path.join(outputDir, toName);
      try {
        // if already exists as selected, skip rename but include mapping
        try {
          await fs.access(fromPath);
          if (fromPath !== toPath) {
            await fs.rename(fromPath, toPath);
          }
        } catch {
          // fromPath missing, maybe already renamed; ensure toPath exists
          await fs.access(toPath);
        }
        results.push({ old: filename, new: toName });
      } catch (e) {
        // skip failures but continue
      }
    }

    return NextResponse.json({ updated: results });
  } catch (e) {
    return NextResponse.json({ error: "Failed to mark selected files" }, { status: 500 });
  }
}


