# Docker Storage Rules for Local Dev

Docker.raw on macOS is a sparse virtual disk that grows when you build/pull images
but **never automatically shrinks** — even after you delete images. Left unchecked it
can balloon to hundreds of GB and fill your Mac.

## Required workflow

### Before any Docker work
```bash
docker system df          # check current usage — clean first if it looks high
```

### After every build / deploy / test run
```bash
docker system prune -a --volumes -f   # remove unused images, containers, volumes, networks
docker builder prune -a -f            # remove all build cache
```

### If you used docker compose
```bash
docker compose down --remove-orphans
```

### Full one-liner (run this whenever done with Docker for the day)
```bash
docker system prune -a --volumes -f && docker builder prune -a -f
```

---

## HandyCall deploy flow

The backend is deployed to Fly.io (`fly deploy` from repo root) — Docker is used
**only** for the Fly.io remote build, not for running services locally.

Because Fly builds remotely, you should never need large local images for this
project. After any `fly deploy` or local Docker experiment, run the full cleanup
above.

---

## Rules

1. **Check before you start** — if `docker system df` shows > 5 GB, clean first.
2. **Never leave stopped containers** — they keep layers alive and prevent pruning.
3. **Never leave dangling images** — tag images meaningfully or delete them.
4. **Build cache grows fast** — always run `docker builder prune -a -f` after builds.
5. **Volumes persist after prune unless you pass `--volumes`** — always pass it.
6. **Use slim base images** — `node:20-alpine` not `node:20`.
7. **Don't duplicate tags** — overwrite existing dev tags rather than creating new ones.

---

## Docker Desktop settings to configure once

Open **Docker Desktop → Settings → Resources → Advanced**:

| Setting | Recommended |
|---|---|
| Memory | 4 GB (or 6 GB if you run heavy containers) |
| Disk image size | **60 GB max** (current default is uncapped = disaster) |

Setting a disk cap prevents Docker.raw from ever exceeding that size. It will error
on builds before it can grow further, which is much better than silently filling your
SSD.

---

## Spotlight privacy (do this once)

Docker.raw getting indexed by Spotlight wastes CPU and battery constantly.

1. Open **System Settings → Siri & Spotlight → Spotlight Privacy**
2. Click **+** and add:
   - `~/Library/Containers/com.docker.docker`
   - `~/.docker`

This stops Spotlight from crawling Docker image layers.

---

## How to reclaim space when Docker.raw is already large

Docker prune removes the *contents* but the `.raw` file on disk doesn't shrink
automatically. To actually reclaim disk space:

1. Run full prune (removes all unused Docker data):
   ```bash
   docker system prune -a --volumes -f && docker builder prune -a -f
   ```
2. Open **Docker Desktop → Settings → Resources → Disk image location**
3. Click **"Move disk image"** to a new path — Docker will compact it during the move
   (or just use the **"Reclaim space"** button if your version shows it)

Alternatively: quit Docker Desktop, delete `~/Library/Containers/com.docker.docker/Data/vms/0/data/Docker.raw`,
and restart Docker. It will recreate a fresh, small image. All images/containers
will be gone (which is fine if you already pruned).
