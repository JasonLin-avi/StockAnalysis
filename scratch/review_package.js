import { execSync }  from 'child_process';
import fs  from 'fs';
import path  from 'path';

if (process.argv.length < 4) {
  console.error("Usage: node review_package.js <BASE> <HEAD> [OUTFILE]");
  process.exit(2);
}

const base = process.argv[2];
const head = process.argv[3];

try {
  // Verify commits
  execSync(`git rev-parse --verify --quiet ${base}`);
  execSync(`git rev-parse --verify --quiet ${head}`);
} catch (e) {
  console.error(`Invalid BASE (${base}) or HEAD (${head}) commit.`);
  process.exit(2);
}

const defaultOutDir = path.resolve(__dirname, '../docs/.superpowers/sdd');
if (!fs.existsSync(defaultOutDir)) {
  fs.mkdirSync(defaultOutDir, { recursive: true });
}

const baseShort = execSync(`git rev-parse --short ${base}`).toString().trim();
const headShort = execSync(`git rev-parse --short ${head}`).toString().trim();

const outPath = process.argv[4]
  ? path.resolve(process.argv[4])
  : path.join(defaultOutDir, `review-${baseShort}..${headShort}.diff`);

const commitsList = execSync(`git log --oneline ${base}..${head}`).toString();
const statSummary = execSync(`git diff --stat ${base}..${head}`).toString();
const fullDiff = execSync(`git diff -U10 ${base}..${head}`).toString();

const content = [
  `# Review package: ${base}..${head}`,
  ``,
  `## Commits`,
  commitsList,
  `## Files changed`,
  statSummary,
  `## Diff`,
  fullDiff
].join('\n');

fs.writeFileSync(outPath, content, 'utf8');
const commitCount = execSync(`git rev-list --count ${base}..${head}`).toString().trim();
const bytes = fs.statSync(outPath).size;

console.log(`Wrote ${outPath}: ${commitCount} commit(s), ${bytes} bytes`);
