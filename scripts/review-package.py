import sys
import subprocess
import os

def run_git(args):
    try:
        # Run git command and return output
        res = subprocess.run(["git"] + args, capture_output=True, text=True, encoding="utf-8", check=True)
        return res.stdout
    except subprocess.CalledProcessError as e:
        print(f"Git command failed: {' '.join(args)}\nError: {e.stderr}", file=sys.stderr)
        sys.exit(2)

def main():
    if len(sys.argv) < 3:
        print("Usage: python review-package.py <base> <head> [outfile]", file=sys.stderr)
        sys.exit(2)

    base = sys.argv[1]
    head = sys.argv[2]

    # Verify commits exist
    run_git(["rev-parse", "--verify", "--quiet", base])
    run_git(["rev-parse", "--verify", "--quiet", head])

    base_short = run_git(["rev-parse", "--short", base]).strip()
    head_short = run_git(["rev-parse", "--short", head]).strip()

    if len(sys.argv) >= 4:
        out_path = sys.argv[3]
    else:
        out_path = f".superpowers/sdd/review-{base_short}..{head_short}.diff"

    # Ensure parent dir exists
    out_dir = os.path.dirname(out_path)
    if out_dir and not os.path.exists(out_dir):
        os.makedirs(out_dir)

    # Get content
    commits_log = run_git(["log", "--oneline", f"{base}..{head}"])
    diff_stat = run_git(["diff", "--stat", f"{base}..{head}"])
    diff_content = run_git(["diff", "-U10", f"{base}..{head}"])

    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(f"# Review package: {base}..{head}\n\n")
        f.write("## Commits\n")
        f.write(commits_log + "\n")
        f.write("## Files changed\n")
        f.write(diff_stat + "\n")
        f.write("## Diff\n")
        f.write(diff_content + "\n")

    # Count commits
    commit_count = len(commits_log.strip().split("\n")) if commits_log.strip() else 0
    file_size = os.path.getsize(out_path)
    print(f"Wrote {out_path}: {commit_count} commit(s), {file_size} bytes")

if __name__ == "__main__":
    main()
