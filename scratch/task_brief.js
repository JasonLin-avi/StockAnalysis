const fs = require('fs');
const path = require('path');

if (process.argv.length < 4) {
  console.error("Usage: node task_brief.js <PLAN_FILE> <TASK_NUMBER> [OUTFILE]");
  process.exit(2);
}

const planPath = path.resolve(process.argv[2]);
const taskNum = process.argv[3];

if (!fs.existsSync(planPath)) {
  console.error(`No such plan file: ${planPath}`);
  process.exit(2);
}

const content = fs.readFileSync(planPath, 'utf8');
const lines = content.split(/\r?\n/);

let infence = false;
let intask = false;
const outputLines = [];

const taskHeaderRegex = new RegExp(`^#+[ \\t]+Task[ \\t]+${taskNum}([^0-9]|$)`, 'i');
const generalTaskHeaderRegex = /^#+[ \t]+Task[ \t]+[0-9]+/i;

for (const line of lines) {
  if (line.trim().startsWith('```')) {
    infence = !infence;
  }
  
  if (!infence && generalTaskHeaderRegex.test(line)) {
    intask = taskHeaderRegex.test(line);
  }
  
  if (intask) {
    outputLines.push(line);
  }
}

if (outputLines.length === 0) {
  console.error(`Task ${taskNum} not found in ${planPath}`);
  process.exit(3);
}

// Ensure .superpowers/sdd directory exists
const defaultOutDir = path.join(path.dirname(planPath), '../../.superpowers/sdd');
if (!fs.existsSync(defaultOutDir)) {
  fs.mkdirSync(defaultOutDir, { recursive: true });
}

const outPath = process.argv[4] 
  ? path.resolve(process.argv[4]) 
  : path.join(defaultOutDir, `task-${taskNum}-brief.md`);

fs.writeFileSync(outPath, outputLines.join('\n'), 'utf8');
console.log(`Wrote ${outPath}: ${outputLines.length} lines`);
