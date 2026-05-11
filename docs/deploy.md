# Deploy guide

There is no server. "Deploy" is "push to `main`, GitHub Pages serves `docs/`".

## First-time setup

The repo was scaffolded with Pages enabled on `main` + `/docs`. If you ever need to re-enable it from scratch:

```bash
gh api -X POST repos/baditaflorin/castle-archive-memory-vault/pages \
  -f source[branch]=main \
  -f source[path]=/docs
```

The live URL is `https://baditaflorin.github.io/castle-archive-memory-vault/`.

## Regular publish

1. `git pull origin main`
2. Make changes.
3. `npm run lint && npm test && npm run build && npm run smoke`
4. `git add . && git commit -m "feat(scope): ..."`
5. `git push`. The `pre-push` hook runs the four steps above for you.
6. Wait ~60 seconds. The new build is live.

The build output (`docs/index.html`, `docs/assets/*`, `docs/coi-serviceworker.js`, `docs/404.html`, `docs/icon.svg`) **must** be committed — that's what GitHub Pages serves. The markdown docs in `docs/` (ADRs, this guide, etc.) coexist with the built assets.

## Rolling back

The site is whatever `main/docs` contains. To roll back:

```bash
git revert <bad-commit-sha>
git push
```

GitHub Pages picks up the revert within ~60 s. **Do not force-push** to roll back — it rewrites history every contributor depends on.

## Custom domain (not v1)

When the time comes:

1. Add a `CNAME` file at the repo root containing the apex / subdomain.
2. Configure DNS:
   - For an apex (e.g. `vault.example.com`): `ALIAS` or `ANAME` to `baditaflorin.github.io`, **or** four `A` records to GitHub's Pages IPs (documented at https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site).
   - For a sub-subdomain: a single `CNAME` to `baditaflorin.github.io`.
3. Set `VITE_BASE=/` and rebuild — the asset paths become root-relative.
4. Update the service-worker scope (it must match the new base).

Document the change in a follow-on ADR (Mode A → custom-domain Mode A).

## Disaster recovery

There is no state to recover on the server side. Each user's vault is stored locally, so backups happen on the device.

If the repo itself is lost: GitHub keeps it. If your local clone is lost: `git clone` again. The "production" data lives in users' browsers and is opaque to us by design.

## Verifying a deploy

After a push:

```bash
curl -sSf https://baditaflorin.github.io/castle-archive-memory-vault/ | head -5
curl -sSf https://baditaflorin.github.io/castle-archive-memory-vault/coi-serviceworker.js | head -3
curl -sSf "https://baditaflorin.github.io/castle-archive-memory-vault/assets/$(grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' docs/index.html | head -1 | cut -d/ -f2)" | head -3
```

If all three return content (not a 404), you're live.
