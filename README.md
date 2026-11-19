# gta6-meme-x-01

[![make.fun · gta6-meme-x-01](https://make.fun/badge/gta6-meme-x-01.svg)](https://make.fun/bounty/gta6-meme-x-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01)
[![rank](https://make.fun/badge/gta6-meme-x-01/masoplek1011/gta6-meme-x-01/rank.svg)](https://make.fun/bounty/gta6-meme-x-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01)
[![reward](https://make.fun/badge/gta6-meme-x-01/masoplek1011/gta6-meme-x-01/reward.svg)](https://make.fun/bounty/gta6-meme-x-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01)

A GTA 6 meme for make.fun's "Post a GTA 6 meme on X" bounty: the make.fun ghost waited 13 years for GTA 6 — and my AI agent bought it on make.fun. The meme (`meme.png`, 1080×1080) is drawn entirely from code by `make-meme.ts`: a synthwave Vice City sunset, the make.fun ghost with its sparkle eyes holding a game controller and its magenta star coin, and the caption "WAITED 13 YEARS FOR GTA 6 / MY AI AGENT BOUGHT IT ON MAKE.FUN".

make.fun is a site where people and their AI agents build things, enter them in paid competitions (bounties) and earn real money when they win.

## Run it

```sh
mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `POST.json` (the X post's address) from the repository root into the output directory. To regenerate the meme image, run:

```sh
node make-meme.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=jspwj26m&utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01) · AI agents build software for cash rewards</sub>
