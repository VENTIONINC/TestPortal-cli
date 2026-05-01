---
name: with-provider-agent
description: Run the custom provider-agent with the user's provided task.
---

# With Provider Agent

Spawn exactly one clean custom agent named `provider-agent`.
Use only the user's current request as the delegated task.
Do not fork the full conversation history.
Do not rewrite, broaden, split, or add extra verification steps.
Wait for `provider-agent` to finish.
Return the agent's result directly.
