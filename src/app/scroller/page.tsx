import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import fs from "fs/promises";
import path from "path";
import SubmitClient, { type CarouselItemData as ClientCarouselItemData } from "./submit-client";

type CarouselItemData = { src: string; name: string };

function DemoCarousel({ items }: { items: CarouselItemData[] }) {
  return (
    <section className="relative mx-auto w-full overflow-hidden">
      <Carousel className="w-full" gutter={false} opts={{ align: "start", loop: true }}>
        <CarouselContent>
          {items.map((item, index) => (
            <CarouselItem key={index} className="basis-full">
              <div className="relative">
                <img src={item.src} alt={item.name} className="block h-auto w-full" />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-2 rounded-none bg-black/30 text-white shadow-none hover:bg-black/40" />
        <CarouselNext className="right-2 rounded-none bg-black/30 text-white shadow-none hover:bg-black/40" />
      </Carousel>
    </section>
  );
}

export default async function ScrollerPage() {
  const outputDirFs = path.join(process.cwd(), "public", "scroller", "new");

  let filenames: string[] = [];
  try {
    filenames = await fs.readdir(outputDirFs);
  } catch {
    filenames = [];
  }

  const imageFiles = filenames.filter((name) =>
    name.match(/\.(png|jpg|jpeg|webp|gif)$/i)
  );

  // Build metadata for sorting
  const fileMeta = await Promise.all(
    imageFiles.map(async (name) => {
      const fullPath = path.join(outputDirFs, name);
      const stat = await fs.stat(fullPath).catch(() => undefined);
      return { name, mtimeMs: stat?.mtimeMs ?? 0 };
    })
  );

  // Prefer new numeric filename pattern: <sectionIndex>_<imageIndex>.<ext>
  const numericMatches = fileMeta
    .map(({ name, mtimeMs }) => {
      const m = name.match(/^(\d+)_([0-9]+)\.(png|jpg|jpeg|webp|gif)$/i);
      if (!m) return undefined;
      return {
        sectionIdx: Number.parseInt(m[1]!, 10),
        imageIdx: Number.parseInt(m[2]!, 10),
        url: `/scroller/new/${name}`,
        mtimeMs,
      };
    })
    .filter(Boolean) as { sectionIdx: number; imageIdx: number; url: string; mtimeMs: number }[];

  let groupsWithNames: CarouselItemData[][] = [];

  if (numericMatches.length > 0) {
    // Group by sectionIdx
    const map = new Map<number, { src: string; name: string; imageIdx: number }[]>();
    for (const it of numericMatches) {
      const arr = map.get(it.sectionIdx) ?? [];
      arr.push({ src: it.url, name: `${it.sectionIdx}_${it.imageIdx}`, imageIdx: it.imageIdx });
      map.set(it.sectionIdx, arr);
    }
    const sectionIds = Array.from(map.keys()).sort((a, b) => a - b);
    groupsWithNames = sectionIds.map((sid) =>
      (map.get(sid) ?? []).sort((a, b) => a.imageIdx - b.imageIdx).map(({ src, name }) => ({ src, name }))
    );
  } else {
    // Fallback to legacy naming: <section-name>-<timestamp>-<index>.ext
    const sectionToItems = new Map<string, { url: string; idx: number; mtimeMs: number }[]>();
    for (const { name, mtimeMs } of fileMeta) {
      const noExt = name.replace(/\.[^.]+$/i, "");
      const parts = noExt.split("-");
      const rawIndexStr = parts[parts.length - 1] ?? "0";
      const sectionName = parts.length >= 3 ? parts.slice(0, -2).join("-") : parts.slice(0, -1).join("-");
      const idx = Number.parseInt(rawIndexStr, 10);
      const url = `/scroller/new/${name}`;
      const arr = sectionToItems.get(sectionName) ?? [];
      arr.push({ url, idx: Number.isFinite(idx) ? idx : 0, mtimeMs });
      sectionToItems.set(sectionName, arr);
    }

    const sectionsSorted = Array.from(sectionToItems.entries()).sort((a, b) => {
      const aMin = Math.min(...a[1].map((x) => x.mtimeMs));
      const bMin = Math.min(...b[1].map((x) => x.mtimeMs));
      if (aMin !== bMin) return aMin - bMin;
      return a[0].localeCompare(b[0]);
    });

    groupsWithNames = sectionsSorted.map(([_, items], groupIdx) =>
      items
        .sort((x, y) => (x.idx !== y.idx ? x.idx - y.idx : x.mtimeMs - y.mtimeMs))
        .map((x) => ({ src: x.url, name: `${groupIdx + 1}_${x.idx}` }))
    );
  }

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-white">
      <div className="mx-auto max-w-[1100px]">
        <SubmitClient groups={groupsWithNames as unknown as ClientCarouselItemData[][]} />
      </div>
    </main>
  );
}

