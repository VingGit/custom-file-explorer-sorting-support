import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const allowNewRevision = process.argv.includes("--allow-new-revision");
const upstreamArgument = process.argv.slice(2).find((argument) => !argument.startsWith("--"));
const upstreamRoot = path.resolve(
  projectRoot,
  upstreamArgument ?? path.join("node_modules", "obsidian-custom-sort"),
);
const compatibility = JSON.parse(
  fs.readFileSync(path.join(projectRoot, ".github", "upstream-compatibility.json"), "utf8"),
);

function fail(message) {
  console.error(`Upstream compatibility check failed: ${message}`);
  process.exitCode = 1;
}

function read(relativePath) {
  const absolutePath = path.join(upstreamRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    fail(`required file is missing: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(absolutePath, "utf8");
}

const manifestText = read("manifest.json");
const packageText = read("package.json");
const parserSource = read(path.join("src", "custom-sort", "sorting-spec-processor.ts"));
const typeSource = read(path.join("src", "custom-sort", "custom-sort-types.ts"));
if (process.exitCode) process.exit();

const manifest = JSON.parse(manifestText);
const packageManifest = JSON.parse(packageText);
if (manifest.version !== packageManifest.version) {
  fail(
    `manifest version ${manifest.version} differs from package version ${packageManifest.version}`,
  );
}

const requiredParserContracts = [
  "export class SortingSpecProcessor",
  "parseSortSpecFromText",
  "export interface SortSpecsCollection",
  "sortSpecByPath",
  "sortSpecByName",
  "sortSpecByWildcard",
];
for (const contract of requiredParserContracts) {
  if (!parserSource.includes(contract))
    fail(`parser API no longer contains ${JSON.stringify(contract)}`);
}

const requiredTypeContracts = [
  "export enum CustomSortGroupType",
  "export enum CustomSortOrder",
  "export interface CustomSortSpec",
  "export interface CustomSortGroup",
  "DEFAULT_METADATA_FIELD_FOR_SORTING",
  "itemsToHide",
  "priorityOrder",
];
for (const contract of requiredTypeContracts) {
  if (!typeSource.includes(contract))
    fail(`type API no longer contains ${JSON.stringify(contract)}`);
}

let revision;
if (fs.existsSync(path.join(upstreamRoot, ".git"))) {
  revision = execFileSync("git", ["-C", upstreamRoot, "rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
} else {
  const lock = JSON.parse(fs.readFileSync(path.join(projectRoot, "package-lock.json"), "utf8"));
  const resolved = lock.packages?.["node_modules/obsidian-custom-sort"]?.resolved ?? "";
  revision = resolved.match(/#([0-9a-f]{40})$/i)?.[1];
}

if (!revision) fail("could not determine the tested upstream revision");
if (!allowNewRevision && revision !== compatibility.expectedCommit) {
  fail(`revision changed from ${compatibility.expectedCommit} to ${revision}`);
}
if (!allowNewRevision && manifest.version !== compatibility.expectedVersion) {
  fail(`version changed from ${compatibility.expectedVersion} to ${manifest.version}`);
}

if (!process.exitCode) {
  console.log(
    `Upstream parser API is compatible at ${revision ?? "unknown revision"} (version ${manifest.version}).`,
  );
}
