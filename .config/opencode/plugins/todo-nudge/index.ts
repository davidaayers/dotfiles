// todo-nudge: keep the visible todo list current (V2 server plugin).
//
// Small/fast models tend to drop the AGENTS.md todo rule: it lives at the top of the
// system prompt (far from the current turn), and todowrite costs a full-list resend.
// This plugin re-appends a terse reminder on every agent-loop request, so the
// instruction is always the most recent thing the model reads. It is model-agnostic,
// adds no visible output, and never blocks a tool call.

import type { Plugin } from "@opencode/plugin"

// Policy lives in AGENTS.md; this is a pointer, not a second copy of its rules.
const REMINDER =
  "Apply the global AGENTS.md Todo List Currency rule to the current task; " +
  "keep the visible list aligned with actual progress and scope."

export default {
  id: "todo-nudge",
  async setup(ctx) {
    await ctx.session.hook("context", (event) => {
      event.system.push({ type: "text", text: REMINDER })
    })
  },
} satisfies Plugin.Plugin
