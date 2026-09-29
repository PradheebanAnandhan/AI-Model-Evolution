// Next's static export names client-router segment files by replacing "/" in the segment path
// with ".", but on Windows the path uses "\", so the files land in nested folders
// (explore/__next.explore/__PAGE__.txt) instead of the dot-joined names the router requests
// (explore/__next.explore.__PAGE__.txt). This flattens them; on other platforms it finds nothing to do.
import fs from "node:fs";
import path from "node:path";

const outDir = path.join(process.cwd(), "out");

function filesUnder(dir: string, prefix: string[] = []): string[][] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? filesUnder(path.join(dir, e.name), [...prefix, e.name]) : [[...prefix, e.name]],
  );
}

let moved = 0;
function visit(dir: string) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const full = path.join(dir, entry.name);
    if (entry.name.startsWith("__next.")) {
      for (const parts of filesUnder(full)) {
        fs.renameSync(path.join(full, ...parts), path.join(dir, [entry.name, ...parts].join(".")));
        moved++;
      }
      fs.rmSync(full, { recursive: true, force: true });
    } else if (entry.name !== "_next") {
      visit(full);
    }
  }
}

if (fs.existsSync(outDir)) {
  visit(outDir);
  if (moved) console.log(`fix-export-segments: flattened ${moved} segment files`);
}
