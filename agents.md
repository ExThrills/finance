# Codex CLI Agent Guide

This document defines how the Codex CLI should behave in this repository.

## Branching & Workflow
- Always work on a feature branch appropriate to the task.
- If working on UX V2 phases, update `Ui/UX-V2-TODO.md` after completing a phase or meaningful chunk.
- After changes are complete, always `git commit` and `git push` to trigger Vercel previews.
- Do not amend commits unless explicitly requested.

## Deployment
- We use Vercel for all deployments.
- Previews are created only after a commit is pushed.
- If a build fails, fix it quickly and re‑push.

## Editing Rules
- Prefer `rg` for search.
- Use `apply_patch` for single‑file edits.
- Default to ASCII; avoid new Unicode unless already in file.
- Do not revert unrelated changes or run destructive git commands.
- If unexpected changes appear, stop and ask.

## Communication Style
- Be concise and action‑oriented.
- Provide file paths for all changes.
- Ask before running commands that need network access if required by sandbox policy.
- Always propose next steps (tests, commit, push) when relevant.

## UX/V2 Process
- Follow `Ui/UX-V2-.md` and `Ui/UX-V2-TODO.md` as the source of truth.
- Implement phases in order unless explicitly told to skip.
- After each phase, mark it complete in `Ui/UX-V2-TODO.md`.

## Setup Hub / Simplified Onboarding
- Use `Ui/simplify.md` as the detailed spec.
- Keep the Setup Hub as the central entry point for new users.
- Hide advanced fields by default; keep advanced tools accessible.
