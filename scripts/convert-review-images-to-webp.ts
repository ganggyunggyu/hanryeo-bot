import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";

const DEFAULT_ROOTS = [
  process.cwd(),
  path.resolve(process.cwd(), "한려담원_리뷰사진"),
  path.resolve(process.cwd(), "images"),
  path.resolve(process.cwd(), "review-images"),
];

const CONVERT_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);
const SKIP_EXTENSIONS = new Set([".webp"]);
const ONLY_NUMBERED = process.env.ONLY_NUMBERED !== "false";
const OVERWRITE = process.env.OVERWRITE === "true";
const DRY_RUN = process.env.DRY_RUN === "true";
const VERBOSE = process.env.VERBOSE === "true";

const MAX_SIZE = Number(process.env.MAX_SIZE ?? 1280);
const QUALITY = Number(process.env.QUALITY ?? 80);

const parseRoots = (): string[] => {
  const raw = process.env.IMAGE_DIRS;
  if (!raw) return DEFAULT_ROOTS;
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .map((value) => (path.isAbsolute(value) ? value : path.resolve(process.cwd(), value)));
};

const shouldConvertFile = (fileName: string): boolean => {
  const ext = path.extname(fileName).toLowerCase();
  if (SKIP_EXTENSIONS.has(ext)) return false;
  if (!CONVERT_EXTENSIONS.has(ext)) return false;

  if (!ONLY_NUMBERED) return true;
  return /^(\d+)[-_]/.test(fileName);
};

const getOutputPath = (inputPath: string): string => {
  const parsed = path.parse(inputPath);
  return path.join(parsed.dir, `${parsed.name}.webp`);
};

const isUpToDate = (inputPath: string, outputPath: string): boolean => {
  try {
    const inputStat = fs.statSync(inputPath);
    const outputStat = fs.statSync(outputPath);
    return outputStat.mtimeMs >= inputStat.mtimeMs;
  } catch {
    return false;
  }
};

const convertToWebp = (inputPath: string, outputPath: string): { before: number; after: number } => {
  const tempPng = path.join(
    os.tmpdir(),
    `hanryeo-webp-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.png`,
  );

  try {
    execFileSync(
      "sips",
      ["-s", "format", "png", "-Z", String(MAX_SIZE), inputPath, "--out", tempPng],
      { stdio: "ignore" },
    );

    execFileSync(
      "cwebp",
      ["-q", String(QUALITY), "-m", "6", "-mt", tempPng, "-o", outputPath],
      { stdio: "ignore" },
    );

    const before = fs.statSync(inputPath).size;
    const after = fs.statSync(outputPath).size;
    return { before, after };
  } finally {
    try {
      fs.unlinkSync(tempPng);
    } catch {
      // ignore
    }
  }
};

const run = (): void => {
  const roots = parseRoots();

  let scanned = 0;
  let converted = 0;
  let skipped = 0;
  let failed = 0;
  let totalBefore = 0;
  let totalAfter = 0;

  const failures: Array<{ input: string; error: string }> = [];

  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    if (!fs.statSync(root).isDirectory()) continue;

    const entries = fs.readdirSync(root, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!shouldConvertFile(entry.name)) continue;

      scanned += 1;
      const inputPath = path.join(root, entry.name);
      const outputPath = getOutputPath(inputPath);

      if (!OVERWRITE && fs.existsSync(outputPath) && isUpToDate(inputPath, outputPath)) {
        skipped += 1;
        continue;
      }

      if (DRY_RUN) {
        converted += 1;
        continue;
      }

      try {
        const { before, after } = convertToWebp(inputPath, outputPath);
        converted += 1;
        totalBefore += before;
        totalAfter += after;
        if (VERBOSE) {
          console.log(`OK ${path.relative(process.cwd(), inputPath)} -> ${path.relative(process.cwd(), outputPath)} (${before} -> ${after})`);
        }
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        failures.push({ input: inputPath, error: message });
      }
    }
  }

  console.log(JSON.stringify({ scanned, converted, skipped, failed, totalBefore, totalAfter }, null, 2));
  if (failures.length > 0) {
    console.log(JSON.stringify({ failures }, null, 2));
  }
};

run();

