// tab-chroma: iTerm2 visual feedback for opencode.
//
// Adapts the Claude Code tab-chroma hook (JCPetrelli/TabChroma) to opencode's
// plugin event bus. opencode has no "hooks" system like Claude Code, so this
// plugin subscribes to opencode's bus events, translates them into the same
// JSON tab-chroma's hook mode expects, and pipes it to the vendored script.
// All theme/config/debounce logic and the actual color/badge iTerm2 escape
// sequences live in ~/.config/tab-chroma/tab-chroma.sh and are reused verbatim.
//
// The tab *title* is handled here instead of by the vendored script: opencode
// exposes richer per-event data (the active tool and its arguments), so the
// title can show what's actually happening ("bash npm test", "reading foo.ts")
// rather than the script's static "working". Keeping this logic in the plugin
// means the vendored script stays untouched — and safe from `tab-chroma update`.

import { writeFileSync, readFileSync, existsSync } from "node:fs"
import { spawnSync } from "node:child_process"

declare const Bun: any

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
  let pid: number | undefined = process.ppid
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

function describeTool(tool: string, input: any): string {
  const i = input && typeof input === "object" ? input : {}
  const str = (v: any) => (typeof v === "string" ? v : "")
  switch (tool) {
    case "bash":
      return str(i.command) ? `bash ${truncate(str(i.command), 40)}` : "bash"
    case "read":
      return str(i.filePath) ? `reading ${basename(str(i.filePath))}` : "reading"
    case "edit":
      return str(i.filePath) ? `editing ${basename(str(i.filePath))}` : "editing"
    case "write":
      return str(i.filePath) ? `writing ${basename(str(i.filePath))}` : "writing"
    case "apply_patch":
      return "applying patch"
    case "grep":
      return str(i.pattern) ? `grep ${truncate(str(i.pattern), 30)}` : "grep"
    case "glob":
      return str(i.pattern) ? `glob ${truncate(str(i.pattern), 30)}` : "glob"
    case "task":
      return str(i.description) ? `task ${truncate(str(i.description), 30)}` : "task"
    case "webfetch":
      return str(i.url) ? `fetch ${truncate(str(i.url), 30)}` : "fetching"
    case "websearch":
      return str(i.query) ? `search ${truncate(str(i.query), 30)}` : "web search"
    case "question":
      return "asking a question"
    case "skill":
      return str(i.name) ? `skill ${truncate(str(i.name), 20)}` : "loading skill"
    case "todowrite":
      return "updating todos"
    default:
      return tool
  }
}

// ─── color forwarding (unchanged tab-chroma protocol) ─────────────────────────

async function emit(hookEvent: HookEvent, sessionID: string, cwd: string) {
  const payload = JSON.stringify({
    hook_event_name: hookEvent,
    cwd: cwd || process.cwd(),
    session_id: sessionID,
  })

  try {
    const proc = Bun.spawn([SCRIPT], {
      stdin: "pipe",
      stdout: "ignore",
      stderr: "ignore",
    })
    proc.stdin.write(payload)
    proc.stdin.end()
    await proc.exited
  } catch {
    // Visual feedback is best-effort; never break opencode over a tab color.
  }
}

// ─── plugin ────────────────────────────────────────────────────────────────────

export default async ({ directory, client }: { directory: string; client: any }) => {
  const sessions = new Map<string, Session>()
  let lastTitle: string | null = null

  function log(level: string, message: string, extra?: Record<string, unknown>) {
    try {
      client?.app?.log?.({ body: { service: "tab-chroma", level, message, extra } })
    } catch {
      // logging is best-effort
    }
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
    if (title === lastTitle) return
    if (!titleActive()) return
    if (terminal() === "unsupported") return
    lastTitle = title
    try {
      writeFileSync(resolveDevice(), `\x1b]0;${title}\x07`)
    } catch {
      // Visual feedback is best-effort; never break opencode over a tab title.
    }
  }

  const cwdFor = (sid: string): string => sessions.get(sid)?.cwd ?? directory

  const setPhase = (sid: string, phase: Phase) => {
    const s = sessions.get(sid)
    if (s) s.phase = phase
  }

  const setActivity = (sid: string, activity: string | null) => {
    const s = sessions.get(sid)
    if (s) s.activity = activity
  }

  const phaseOf = (sid: string): Phase | undefined => sessions.get(sid)?.phase

  function updateTitle(sid: string) {
    const s = sessions.get(sid)
    if (!s) return
    const project = basename(s.cwd)
    const label =
      s.phase === "permission" ? "needs approval"
      : s.phase === "done" ? "done"
      : s.phase === "start" ? "starting"
      : (s.activity ?? "working")
    setTitle(project ? `◉ ${project} · ${label}` : `◉ ${label}`)
  }

  log("info", "opencode plugin loaded", {
    device: resolveDevice(),
    terminal: terminal(),
  })

  return {
    async event({ event }: { event: any }) {
      const props = event.properties ?? {}

      switch (event.type) {
        case "session.created": {
          const info = props.info ?? {}
          const cwd = info.directory || directory
          sessions.set(info.id, { cwd, activity: null, phase: "start" })
          await emit("SessionStart", info.id, cwd)
          updateTitle(info.id)
          break
        }
        case "session.status": {
          const sid = props.sessionID
          if (props.status?.type === "busy") {
            setPhase(sid, "working")
            await emit("PreToolUse", sid, cwdFor(sid))
            updateTitle(sid)
          } else if (props.status?.type === "idle") {
            setPhase(sid, "done")
            updateTitle(sid)
          }
          break
        }
        case "session.idle": {
          const sid = props.sessionID
          setActivity(sid, null)
          setPhase(sid, "done")
          await emit("Stop", sid, cwdFor(sid))
          updateTitle(sid)
          break
        }
        case "message.part.updated": {
          const part = props.part
          const sid = part?.sessionID
          if (!sid) break
          if (part.type === "tool") {
            setActivity(sid, describeTool(part.tool, part.state?.input))
          } else if (part.type === "text" || part.type === "reasoning") {
            setActivity(sid, "thinking")
          } else {
            break
          }
          if (phaseOf(sid) === "working") {
            updateTitle(sid)
          }
          break
        }
      }
    },

    async "permission.ask"(input: any) {
      const sid = input.sessionID
      if (sid) setPhase(sid, "permission")
      await emit("PermissionRequest", sid, cwdFor(sid))
      if (sid) updateTitle(sid)
    },
  }
}
