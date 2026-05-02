# Riknetus fork notes

This is a fork of [`Aarathron/n8n-nodes-amazon-selling-partner`](https://github.com/Aarathron/n8n-nodes-amazon-selling-partner). It exists to:

1. Track Aarathron's upstream development (the original is actively maintained).
2. Carry Riknetus-specific customisations on a separate `customized` branch, originally imported from [`cashelastest/n8n-nodes-amazon-api-selling-partner-customized`](https://github.com/cashelastest/n8n-nodes-amazon-api-selling-partner-customized) on 2026-05-02 during the offboarding of contractor Alex Vss.

## Branches

| Branch | Purpose |
|---|---|
| `main` | Tracks `Aarathron/main` (upstream verbatim) plus this `RIKNETUS.md`. Sync via the recipe below. |
| `customized` | Riknetus customisations applied on top of Aarathron@`fcd0b932` (v1.9.5). What King's n8n consumes via the npm package `n8n-nodes-amazon-sp-api`. |
| `develop` | Legacy single-init-commit at v1.9.5. Retained for history; do not commit here. |

## Pulling Aarathron updates into `main`

GitHub knows this is a fork (you'll see the "X commits behind" badge on github.com), but **your local clone does not know about Aarathron until you tell it**. One-time setup per clone:

```sh
git remote add upstream git@github.com:Aarathron/n8n-nodes-amazon-selling-partner.git
```

Then to sync:

```sh
git fetch upstream
git checkout main
git log --oneline main..upstream/main         # preview what's new
git merge upstream/main                       # fold it in
git push origin main
```

## Bringing upstream changes into `customized`

After updating `main` from upstream, merge or rebase `customized` onto it as needed:

```sh
git checkout customized
git merge main                                # or: git rebase main
# resolve any conflicts in our custom files
git push origin customized
```

Files with the most divergence from upstream (likely conflict points):
- `nodes/AmazonSellingPartner/AmazonSellingPartner.node.ts`
- `nodes/AmazonSellingPartner/helpers/SpApiRequest.ts`
- `nodes/AmazonSellingPartner/descriptions/Prices.description.ts` (Riknetus-only file)
- `nodes/AmazonSellingPartner/operations/Prices.operations.ts` (Riknetus-only file)
- `package.json`

## Publishing to npm

The customised code is published to npm as [`n8n-nodes-amazon-sp-api`](https://www.npmjs.com/package/n8n-nodes-amazon-sp-api), currently at v1.9.5 (joint maintainer with `alex-ov` until 2026-05-02 offboarding). Publish from the `customized` branch:

```sh
git checkout customized
npm version patch
npm publish
git push --follow-tags
```
