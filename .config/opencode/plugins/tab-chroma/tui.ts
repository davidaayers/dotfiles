// tab-chroma: iTerm2 visual feedback for opencode.
//
// Adapts the Claude Code tab-chroma hook (JCPetrelli/TabChroma) to opencode's
// CLI event stream. This runs in the terminal client, not the shared server,
// so colors and titles reach the correct terminal. It translates events into the same
// JSON tab-chroma's hook mode expects, and pipes it to the vendored script.
// All theme/config/debounce logic and the actual color/badge iTerm2 escape
// sequences live in ~/.config/tab-chroma/tab-chroma.sh and are reused verbatim.
//
// The tab *title* is handled here instead of by the vendored script: opencode
// exposes richer per-event data (the active tool and its arguments), so the
// title can show what's actually happening ("npm test", "reading foo.ts")
// rather than the script's static "working". Keeping this logic in the plugin
// means the vendored script stays untouched — and safe from `tab-chroma update`.

import { writeFileSync, readFileSync, existsSync } from "node:fs"
import { spawn, spawnSync } from "node:child_process"
import type { Plugin } from "@opencode/plugin/tui"

const HOME = process.env.HOME ?? ""
const SCRIPT = `${HOME}/.config/tab-chroma/tab-chroma.sh`
const CONFIG = `${HOME}/.config/tab-chroma/config.json`
const PAUSED = `${HOME}/.config/tab-chroma/.paused`

// The Claude Code hook event names tab-chroma understands (see its state_map).
type HookEvent = "SessionStart" | "PreToolUse" | "Stop" | "PermissionRequest"

type Phase = "start" | "working" | "done" | "permission"

type Session = {
  cwd: string
  activity: string | null
  phase: Phase
}

// ─── terminal detection (mirrors tab-chroma.sh) ────────────────────────────────

function terminal(): "iterm2" | "apple-terminal" | "unsupported" {
  const p = process.env.TERM_PROGRAM ?? ""
  if (p === "iTerm.app") return "iterm2"
  if (p === "Apple_Terminal") return "apple-terminal"
  return "unsupported"
}

// ─── output device resolution ─────────────────────────────────────────────────
// Resolve the real pty by walking up the process tree to the nearest ancestor
// that owns one, falling back to /dev/tty. Mirrors tab-chroma.sh's
// resolve_output_device so the title reaches the same terminal its colors do.
// Cached: it can't change for the life of the process.

let cachedDevice: string | null = null

function runSync(args: string[]): string {
  try {
    const r = spawnSync(args[0], args.slice(1), { encoding: "utf8" })
    return (r.stdout ?? "").trim()
  } catch {
    return ""
  }
}

function resolveDevice(): string {
  if (cachedDevice) return cachedDevice
  let pid: number | undefined = process.pid
  for (let i = 0; i < 10 && pid && pid > 1; i++) {
    const tty = runSync(["ps", "-o", "tty=", "-p", String(pid)])
    if (/^(ttys\d+|pts\/\d+|tty\d+)/.test(tty)) {
      cachedDevice = `/dev/${tty}`
      return cachedDevice
    }
    pid = parseInt(runSync(["ps", "-o", "ppid=", "-p", String(pid)]), 10)
    if (Number.isNaN(pid)) break
  }
  cachedDevice = "/dev/tty"
  return cachedDevice
}

// ─── activity description ──────────────────────────────────────────────────────

function basename(p: string): string {
  if (!p) return ""
  const clean = p.endsWith("/") ? p.slice(0, -1) : p
  const idx = clean.lastIndexOf("/")
  return idx >= 0 ? clean.slice(idx + 1) : clean
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max - 1) + "…"
}

// Reduce a shell command to a short, readable summary: strip leading
// cd/pushd chains, collapse whitespace, and keep the primary command.
function cleanCommand(cmd: string): string {
  let c = cmd.replace(/\s+/g, " ").trim()
  while (/^(?:cd|pushd)\s+[^\s&;|]+\s*(?:&&|;)/.test(c)) {
    c = c.replace(/^(?:cd|pushd)\s+[^\s&;|]+\s*(?:&&|;)\s*/, "")
  }
  return c.split(/\s*(?:&&|\|\||;|\|)\s*/)[0]
}

function describeTool(tool: string, input: unknown): string {
  const i = input && typeof input === "object" ? input as Record<string, unknown> : {}
  const str = (v: unknown) => (typeof v === "string" ? v : "")
  switch (tool) {
    case "bash":
    case "shell": {
      const cmd = cleanCommand(str(i.command))
      return cmd ? truncate(cmd, 28) : "running command"
    }
    case "read":
      return str(i.path ?? i.filePath) ? `reading ${basename(str(i.path ?? i.filePath))}` : "reading"
    case "edit":
      return str(i.filePath) ? `editing ${basename(str(i.filePath))}` : "editing"
    case "write":
      return str(i.filePath) ? `writing ${basename(str(i.filePath))}` : "writing"
    case "apply_patch":
    case "patch":
      return "applying patch"
    case "grep":
      return str(i.pattern) ? `grep ${truncate(str(i.pattern), 30)}` : "grep"
    case "glob":
      return str(i.pattern) ? `glob ${truncate(str(i.pattern), 30)}` : "glob"
    case "task":
    case "subagent":
      return str(i.description) ? `task ${truncate(str(i.description), 30)}` : "task"
    case "webfetch":
      return str(i.url) ? `fetch ${truncate(str(i.url), 30)}` : "fetching"
    case "websearch":
      return str(i.query) ? `search ${truncate(str(i.query), 30)}` : "web search"
    case "question":
      return "asking a question"
    case "skill":
      return str(i.id ?? i.name) ? `skill ${truncate(str(i.id ?? i.name), 20)}` : "loading skill"
    case "todowrite":
      return "updating todos"
    default:
      return tool
  }
}

// ─── color forwarding (unchanged tab-chroma protocol) ─────────────────────────

async function emit(hookEvent: HookEvent, sessionID: string, cwd: string, signal: AbortSignal) {
  const payload = JSON.stringify({
    hook_event_name: hookEvent,
    cwd: cwd || process.cwd(),
    session_id: sessionID,
  })

  try {
    await new Promise<void>((resolve) => {
      const proc = spawn(SCRIPT, [], { stdio: ["pipe", "ignore", "ignore"], signal })
      proc.on("error", () => resolve())
      proc.on("close", () => resolve())
      proc.stdin.on("error", () => {})
      proc.stdin.end(payload)
    })
  } catch {
    // Visual feedback is best-effort; never break opencode over a tab color.
  }
}

// ─── plugin ────────────────────────────────────────────────────────────────────

function setup(ctx: Plugin.Context) {
  const directory = ctx.location?.directory ?? ctx.data.location.default().directory
  const sessions = new Map<string, Session>()
  const tools = new Map<string, Map<string, string>>()
  let lastTitle: string | null = null
  const controller = new AbortController()
  let queue = Promise.resolve()
  let selected: string | undefined

  const active = () => {
    const route = ctx.ui.router.current()
    return route.type === "session" ? route.sessionID : undefined
  }

  function titleActive(): boolean {
    try {
      if (existsSync(PAUSED)) return false
      const cfg = JSON.parse(readFileSync(CONFIG, "utf8"))
      if (cfg.enabled === false) return false
      return cfg.features?.title !== false
    } catch {
      return true
    }
  }

  function setTitle(title: string) {
    title = title.replace(/[\x00-\x1f\x7f-\x9f]/g, " ")
    if (title === lastTitle) return
    if (!titleActive()) return
    if (terminal() === "unsupported") return
    lastTitle = title
    try {
      writeFileSync(resolveDevice(), `\x1b]0;${title}\x07`)
    } catch (e) {
      console.debug("tab-chroma: title write failed", String(e))
    }
  }

  // Lazily create a session entry so title tracking works even when
  // `session.created` never fires (e.g. a resumed session).
  const ensure = (sid: string): Session => {
    let s = sessions.get(sid)
    if (!s) {
      s = { cwd: ctx.data.session.get(sid)?.location.directory ?? directory, activity: null, phase: "working" }
      sessions.set(sid, s)
    }
    return s
  }

  function updateTitle(sid: string) {
    const s = ensure(sid)
    const project = basename(s.cwd)
    const label =
      s.phase === "permission" ? "needs approval"
      : s.phase === "done" ? "done"
      : s.phase === "start" ? "starting"
      : (s.activity ?? "working")
    setTitle(project ? `◉ ${project} · ${label}` : `◉ ${label}`)
  }

  // Serialize script writes so a slow "working" update cannot overwrite "done".
  function forward(sid: string, hook?: HookEvent) {
    queue = queue.then(async () => {
      if (controller.signal.aborted || active() !== sid) return
      if (hook && terminal() !== "unsupported") {
        await emit(hook, sid, ensure(sid).cwd, controller.signal)
        // The shared script can write its own static title. Reapply our detailed
        // title even when its text is unchanged from the previous event.
        lastTitle = null
      }
      if (!controller.signal.aborted && active() === sid) updateTitle(sid)
    }).catch((error) => console.debug("tab-chroma: update failed", String(error)))
  }

  function selectSession() {
    const sid = active()
    if (sid === selected) return
    selected = sid
    if (!sid) return
    const session = ensure(sid)
    session.phase = ctx.data.session.permission.list(sid)?.length ? "permission"
      : ctx.data.session.status(sid) === "running" ? "working" : "done"
    forward(sid, "SessionStart")
    forward(sid, session.phase === "permission" ? "PermissionRequest" : session.phase === "working" ? "PreToolUse" : "Stop")
  }

  const unsubscribe = ctx.data.listen(({ details }) => {
    if (details.type === "session.deleted") {
      sessions.delete(details.data.sessionID)
      tools.delete(details.data.sessionID)
      return
    }
    if (!("sessionID" in details.data)) return
    const sid = details.data.sessionID
    if (sid !== active()) return
    const session = ensure(sid)
    switch (details.type) {
      case "session.execution.started":
        session.phase = "working"
        session.activity = null
        forward(sid, "PreToolUse")
        break
      case "session.execution.succeeded":
      case "session.execution.failed":
      case "session.execution.interrupted":
        session.phase = "done"
        session.activity = null
        tools.delete(sid)
        forward(sid, "Stop")
        break
      case "permission.asked":
        session.phase = "permission"
        forward(sid, "PermissionRequest")
        break
      case "permission.replied":
        session.phase = "working"
        forward(sid, "PreToolUse")
        break
      case "session.tool.input.started": {
        let names = tools.get(sid)
        if (!names) tools.set(sid, names = new Map())
        names.set(details.data.id, details.data.name)
        break
      }
      case "session.tool.called": {
        const name = tools.get(sid)?.get(details.data.id) ?? "tool"
        session.phase = "working"
        session.activity = describeTool(name, details.data.input)
        forward(sid)
        break
      }
      case "session.text.started":
      case "session.reasoning.started":
        if (session.phase === "working") {
          session.activity = "thinking"
          forward(sid)
        }
        break
    }
  })
  // Router reads are reactive in a view, but setup itself is not a view.
  const timer = setInterval(selectSession, 250)
  selectSession()
  return () => {
    clearInterval(timer)
    unsubscribe()
    controller.abort()
    sessions.clear()
    tools.clear()
  }
}

export default { id: "tab-chroma", setup } satisfies Plugin.Definition
