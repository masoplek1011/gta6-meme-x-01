// Entry program for the gta6-meme-x-01 bounty (Node 22, standard library only).
//
// The entry itself is an X post: a GTA 6 meme picturing the make.fun ghost,
// posted from a public account. This program does nothing with the meme; its
// only job is to hand the post's address to the grader by copying POST.json
// from the repository root into the output directory.
//
// Locally the two directories are given by the environment:
//   mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
// Inside the grader they default to /bot and /output. The program never
// writes anything back into the repository, which the grader mounts
// read-only, and it never touches the network or the clock.

import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const botDir = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const source = join(botDir, 'POST.json');
const target = join(outDir, 'POST.json');

// Read first so a missing or broken POST.json fails loudly instead of
// leaving a stale copy behind.
let postText: string;
try {
  postText = readFileSync(source, 'utf8');
} catch (err) {
  console.error(`cannot read POST.json in ${botDir}: ${(err as Error).message}`);
  process.exit(1);
}

const post = JSON.parse(postText) as { url?: unknown };
if (post === null || typeof post !== 'object' || Array.isArray(post)) {
  console.error('POST.json is not a JSON object');
  process.exit(1);
}
if (typeof post.url !== 'string' || !post.url.startsWith('https://')) {
  console.error('POST.json does not name an https post address');
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
try {
  copyFileSync(source, target);
} catch (err) {
  console.error(`cannot write POST.json into ${outDir}: ${(err as Error).message}`);
  process.exit(1);
}
