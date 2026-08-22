# Live Workspace Mode

GitPet has two modes, and confusing them is the most common source of
"nothing happened when I clicked Confirm".

| Mode | Repository data | Approved actions |
|---|---|---|
| **Sandbox** (default) | Bundled fixture scenarios | **Simulated.** Nothing on disk changes. |
| **Live Workspace** | A real repository, read live | Run for real — only if writes are enabled. |

The app starts in **Sandbox**. Toggle **Live Workspace** in the top bar to
switch. In Sandbox, approving an action animates a state transition and reports
success; that is a simulation, and the transcript now says so explicitly.

---

## Enabling real actions

Two settings in `.env`, then restart:

```bash
# The repository GitPet reads and acts on. Without this it inspects whatever
# directory the server was started from — usually the GitPet checkout itself,
# not the project you meant.
GITPET_WORKSPACE_ROOT="/absolute/path/to/your/repo"

# Actions are refused unless this is exactly "true".
GITPET_ALLOW_WRITES=true
```

Confirm both took effect:

```bash
curl -s localhost:3000/api/health | jq '{writesEnabled, workspaceRoot}'
```

```json
{ "writesEnabled": true, "workspaceRoot": "/absolute/path/to/your/repo" }
```

When you switch to Live Workspace, Byte states which repository is in scope and
whether actions can run, so a read-only server is distinguishable from a broken
one.

---

## Why writes are off by default

The live scanner is read-only by design. Enabling writes lets GitPet modify a
real working tree, so it is an explicit opt-in rather than a default. Once
enabled, four things still stand between a suggestion and your repository:

1. **The safety policy**, re-evaluated at execution time — a `block` verdict is
   refused regardless of what the client asked for.
2. **argv execution**, never a shell, so metacharacters are inert.
3. **Explicit approval** — nothing runs without a click.
4. **Fail-stop chains** — a failed step skips the rest rather than compounding.

Destructive operations are refused outright: `push --force` without
`--force-with-lease`, `reset --hard`, `clean`, `branch -D`, `stash drop`,
`stash clear`, and history rewriting.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| "Simulated in Sandbox Mode" in the transcript | You are in Sandbox. Toggle Live Workspace. |
| "Live Workspace is read-only on this server" | `GITPET_ALLOW_WRITES` is not `true`, or the server was not restarted. |
| Byte describes the wrong repository | `GITPET_WORKSPACE_ROOT` is unset, so it is scanning the GitPet checkout. |
| "Workspace is not inside an active Git repository" | `GITPET_WORKSPACE_ROOT` points somewhere that is not a git work tree. |
| A command is refused with a `block` verdict | Working as intended — the finding explains which rule fired. |
| Actions blocked with "a rebase is in progress" | Resolve or `git rebase --abort` first; only continue/skip/abort are safe mid-operation. |
