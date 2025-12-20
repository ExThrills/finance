# Deployment Process (Vercel)

This document captures the exact deployment workflow for this project.

## Previews
- We use Vercel for all deployments.
- Vercel creates a preview deployment only after changes are committed and pushed.
- Local changes do not generate a preview until they are in a pushed commit.

## Standard Flow
1. Create or switch to a feature branch.
2. Make changes and verify locally as needed.
3. Commit the changes.
4. Push the branch to the remote.
5. Wait for Vercel to generate the preview deployment.

## Notes
- If there is no new commit pushed, there will be no new preview.
- Keep commits scoped so previews map cleanly to changes.
