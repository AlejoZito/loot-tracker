# loot-tracker — project instructions

### Code comments

The failure this prevents: writing a comment that narrates the change I am making right now. That context is real, but it expires the instant the change merges — the defect it describes no longer exists, so the comment becomes a story about a problem no future reader can observe. It is a changelog entry in the wrong file, and a third copy of text already required in the commit body (3.b) and the PR description.

- *CC-1 (MUST NOT)* Write a comment describing a change, a fix, a defect, its cause, or what the code used to do. No "was/now/previously/instead of", no "this fixes", no "needed because otherwise", no "note that we no longer".

- *CC-2 (MUST)* Apply the survival test to every comment before writing it: would this still be true and useful to someone reading this file a year from now, who never saw the diff? If it only makes sense beside the diff, it is changelog — delete it and put it in the commit body.

- *CC-3 (MUST)* Default to zero comments. Declarative config — Terraform, DNS records, k8s manifests, CI YAML, Helm values — is self-describing and takes none. A resource named `dmarc-example-com` does not need a comment saying it is the DMARC record.

- *CC-4 (MAY)* Comment only when a future editor would actively break something without it: a non-obvious external constraint, a required out-of-band manual step, an invariant the surrounding code cannot show. One line. If it needs a paragraph it belongs in `plans/`, not inline.

- *CC-5 (MUST)* Before every commit, re-read the comment lines I added: `git diff --cached | grep '^+' | grep -E '#|//|/*'`. Each hit must pass CC-2 on its own. Deleting is always an acceptable outcome. "I already wrote it", "it is only one line", and "this one is genuinely useful" are not exemptions — the last one is the exact thought that precedes every violation.

- *CC-6 (MUST)* Applies to comments I edit as well as ones I add. When a change invalidates an existing comment, the default action is DELETE, not rewrite it into a new narrative.
