---
description: "Create PR, wait for CI, and merge to main"
---

# Ship: PR → CI → Merge

Ship the current branch to main autonomously.

## Steps

### 1. Pre-flight
- Run `npm run check` locally to catch issues before pushing
- If it fails, fix the issues first

### 2. Create PR
- Push the current branch with `-u`
- Create a PR to main using `gh pr create`
- Use a clear title and auto-generated summary from the commits
- Include "🤖 Generated with Claude Code" in the PR body

### 3. Wait for CI
- Check PR status with `gh pr checks <pr-number> --watch`
- If CI fails, read the logs, fix the issue, push again, and re-check
- Max 3 retry attempts before asking for human help

### 4. Merge
- Once CI is green, merge with `gh pr merge <pr-number> --squash --delete-branch`
- Confirm the merge succeeded

### 5. Cleanup
- Switch back to main and pull

Report the merged PR URL to the user when done.
