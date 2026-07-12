const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function getShortCommit(commit) {
  return execSync(`git rev-parse --short ${commit}`, { encoding: 'utf8' }).trim();
}

function generateReviewPackage(base, head) {
  const repoRoot = path.resolve(__dirname, '..');
  const sddDir = path.join(repoRoot, '.superpowers', 'sdd');

  if (!fs.existsSync(sddDir)) {
    fs.mkdirSync(sddDir, { recursive: true });
  }

  const shortBase = getShortCommit(base);
  const shortHead = getShortCommit(head);
  const outFile = path.join(sddDir, `review-${shortBase}..${shortHead}.diff`);

  const title = `# Review package: ${base}..${head}\n\n`;
  
  // Commits log
  const commitsHeader = `## Commits\n`;
  const commitsLog = execSync(`git log --oneline ${base}..${head}`, { encoding: 'utf8' });
  
  // Stat summary
  const filesHeader = `\n## Files changed\n`;
  const filesStat = execSync(`git diff --stat ${base}..${head}`, { encoding: 'utf8' });
  
  // Diff with U10 context
  const diffHeader = `\n## Diff\n`;
  const diffContent = execSync(`git diff -U10 ${base}..${head}`, { encoding: 'utf8' });

  const finalContent = title + commitsHeader + commitsLog + filesHeader + filesStat + diffHeader + diffContent;
  
  fs.writeFileSync(outFile, finalContent, 'utf8');
  
  const commitCount = execSync(`git rev-list --count ${base}..${head}`, { encoding: 'utf8' }).trim();
  console.log(`wrote ${outFile}: ${commitCount} commit(s), ${finalContent.length} bytes`);
}

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error("usage: node review_package.js BASE HEAD");
  process.exit(1);
}

generateReviewPackage(args[0], args[1]);
