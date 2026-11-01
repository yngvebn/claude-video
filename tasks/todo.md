# Make the repo public: projects out, private details scrubbed

- [x] Copy every project (with its `.cache`/`.build`/`output`) to a folder outside the repo; verify counts, sizes, checksums
- [x] `git init` there with one initial commit (private, no remote)
- [x] Move `projects/_template` to `template/`; `projects/` becomes fully git-ignored; `new` creates it when missing
- [x] Remove the projects from this repo; link `projects` to the new folder (local only)
- [x] Scrub names, events and private project pointers from CLAUDE.md, skills, references, tools, engine comments
- [x] README: everything a new user needs (install, skills, workflow, projects folder, ElevenLabs key, credits)
- [x] Verify: fresh clone → `new` + `build` + `qa` with `VOICE=none`; stills of a moved project through the link; private-terms grep over the tree
- [x] One root commit on an orphan branch `public`, pushed to a new public repo; the old repo stays private as the archive

## Review
Done. The projects (1470 files, 1.43 GB, checksums identical) live in their own private git repo outside this one,
linked in as `projects/`. The public tree is 116 files in a single root commit: no project, render or cache, and no
commit message from the old history. A fresh clone scaffolds, builds and QAs a kinetic project with `VOICE=none`,
and its `git status` stays clean. A moved project renders through the link unchanged.
