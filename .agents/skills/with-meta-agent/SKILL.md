---
name: with-meta-agent
description: Route explicit delegation requests to the built-in meta-agent. Use when the user wants agent help for skill design, agent configuration, workflow metadata, or other meta-level Codex setup work in this repo.
---

# With Meta Agent

Spawn exactly one clean custom agent named `meta-agent`.
Use only the user's current request as the delegated task.
Do not fork the full conversation history.
Do not rewrite, broaden, split, or add extra verification steps.
Wait for `meta-agent` to finish.
Return the agent's result directly.
