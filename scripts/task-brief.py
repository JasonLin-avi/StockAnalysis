import sys
import os

def main():
    if len(sys.argv) < 3:
        print("Usage: python task-brief.py <plan_file> <task_number> [output_file]", file=sys.stderr)
        sys.exit(2)

    plan_path = sys.argv[1]
    task_num = sys.argv[2]
    
    if not os.path.exists(plan_path):
        print(f"No such plan file: {plan_path}", file=sys.stderr)
        sys.exit(2)
        
    if len(sys.argv) >= 4:
        out_path = sys.argv[3]
    else:
        out_path = f".superpowers/sdd/task-{task_num}-brief.md"

    # Ensure parent dir exists
    out_dir = os.path.dirname(out_path)
    if out_dir and not os.path.exists(out_dir):
        os.makedirs(out_dir)

    with open(plan_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    task_lines = []
    in_fence = False
    in_task = False
    target_heading = f"### Task {task_num}:"

    for line in lines:
        stripped = line.strip()
        if stripped.startswith("```"):
            in_fence = not in_fence
            
        if not in_fence and stripped.startswith("### Task "):
            # Check if this matches our target task number
            # Format could be "### Task N: Name"
            parts = stripped.split()
            if len(parts) >= 3:
                curr_num = parts[2].replace(":", "")
                if curr_num == task_num:
                    in_task = True
                else:
                    in_task = False
                    
        if in_task:
            task_lines.append(line)

    if not task_lines:
        print(f"Task {task_num} not found in {plan_path}", file=sys.stderr)
        sys.exit(3)

    with open(out_path, 'w', encoding='utf-8') as f:
        f.writelines(task_lines)

    print(f"Wrote {out_path}: {len(task_lines)} lines")

if __name__ == "__main__":
    main()
