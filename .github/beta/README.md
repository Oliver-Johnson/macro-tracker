# Beta channel

The beta app at beta.macroslog.co.uk is built from the `beta` branch of this repo.
Every push to `beta` runs `.github/workflows/publish-beta.yml`, which builds the site
with `build.sh` and pushes it to the `Oliver-Johnson/MacrosLog-beta` repo. That repo
only exists because GitHub Pages serves one site per repo; don't edit it by hand, as
the next publish overwrites it.

## Day to day

- Work on beta features on the `beta` branch (or on branches merged into it).
- Bring fixes from the live app into the beta: merge `master` into `beta`.
- Ship beta features to everyone: merge `beta` (or cherry-pick the commits) into `master`.
- Leave the version line alone on `beta`. The publish stamps it as
  `Version <publish date>.<run number>-beta`, and sets the beta's own domain and manifest
  from this folder, so a merge into `master` never carries beta settings with it.

## One-time setup

The workflow needs write access to MacrosLog-beta through a deploy key:

1. On a computer, run:
   `ssh-keygen -t ed25519 -N "" -C "macroslog beta publish" -f macroslog-beta-key`
2. In **MacrosLog-beta** → Settings → Deploy keys → Add deploy key: paste the contents of
   `macroslog-beta-key.pub` and tick **Allow write access**.
3. In **macro-tracker** → Settings → Secrets and variables → Actions → New repository
   secret: name it `BETA_DEPLOY_KEY` and paste the contents of `macroslog-beta-key`.
4. Delete both key files.
