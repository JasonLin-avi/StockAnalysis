const fs = require('fs');
const path = require('path');

function extractBrief(planFile, taskNum) {
  const repoRoot = path.resolve(__dirname, '..');
  const sddDir = path.join(repoRoot, '.superpowers', 'sdd');

  // Ensure sdd workspace directory exists
  if (!fs.existsSync(sddDir)) {
    fs.mkdirSync(sddDir, { recursive: true });
  }
  fs.writeFileSync(path.join(sddDir, '.gitignore'), '*\n');

  // Read plan file
  const fullPlanPath = path.resolve(repoRoot, planFile);
  if (!fs.existsSync(fullPlanPath)) {
    console.error(`Plan file not found: ${fullPlanPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(fullPlanPath, 'utf8');
  const lines = content.split(/\r?\n/);
  const outLines = [];
  let infence = false;
  let intask = false;

  const taskRegex = new RegExp(`^#+[ \\t]+Task[ \\t]+${taskNum}([^0-9]|$)`, 'i');

  for (const line of lines) {
    if (line.startsWith('```')) {
      infence = !infence;
    }

    if (!infence && /^#+[ \t]+Task[ \t]+[0-9]+/i.test(line)) {
      intask = taskRegex.test(line);
    }

    if (intask) {
      outLines.push(line);
    }
  }

  if (outLines.length === 0) {
    console.error(`Task ${taskNum} not found in ${planFile}`);
    process.exit(1);
  }

  const outFile = path.join(sddDir, `task-${taskNum}-brief.md`);
  fs.writeFileSync(outFile, outLines.join('\n') + '\n', 'utf8');
  console.log(`wrote ${outFile}: ${outLines.length} lines`);
}

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error("usage: node task_brief.js PLAN_FILE TASK_NUMBER");
  process.exit(1);
}

extractBrief(args[0], parseInt(args[1], 10));
