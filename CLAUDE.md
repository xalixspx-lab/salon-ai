@AGENTS.md

## Git workflow (user-confirmed standing rule, updated 2026-09-23)

As of 2026-09-23 there are **two local copies** of this project on two different
machines, kept in sync through `origin main`. Because of that:

- **Before starting any work in a session** (first file edit or first git
  command), pull latest from `origin main` automatically — no need to ask the
  user first. This replaced the older single-machine rule that forbade
  automatic pulling; with two machines, pulling first is what keeps them from
  diverging.
- If the pull reports local changes that would be overwritten, stop and ask the
  user how to reconcile them rather than discarding anything.
- After any file edit made here, commit and push to `origin main` directly,
  without asking for confirmation first, unless the change touches the live
  database (migrations, data backfills/deletes) — for those, stop and confirm
  with the user first, same as before.
- If a push is rejected because the remote has commits this machine doesn't
  have (the other machine pushed first), pull/rebase and push again rather than
  force-pushing.
