---
name: with-architecute-agent
description: Route explicit delegation requests to the built-in architecture-agent. Use when the user wants agent help for architecture, provider patterns, registry structure, cross-cutting type design, or consistency review work in this repo.
---

# With Architecture Agent

Spawn exactly one clean custom agent named `architecture-agent`.
Use only the user's current request as the delegated task.
Do not fork the full conversation history.
Do not rewrite, broaden, split, or add extra verification steps.
Wait for `architecture-agent` to finish.
Return the agent's result directly.
