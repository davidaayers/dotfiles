// tab-chroma: iTerm2 visual feedback for opencode.
//
// Adapts the Claude Code tab-chroma hook (JCPetrelli/TabChroma) to opencode's
// plugin event bus. opencode has no "hooks" system like Claude Code, so this
// plugin subscribes to opencode's bus events, translates them into the same
// JSON tab-chroma's hook mode expects, and pipes it to the vendored script.
// All theme/config/debounce logic and the actual iTerm2 escape sequences live
// in ~/.config/tab-chroma/tab-chroma.sh and are reused verbatim.

declare const Bun: any

const HOME = process.env.HOME ?? ""
const SCRIPT = `${HOME}/.config/tab-chroma/tab-chroma.sh`

// The Claude Code hook event names tab-chroma understands (see its
// state_map). We reuse them directly rather than reimplementing states.
type HookEvent = "SessionStart" | "PreToolUse" | "Stop" | "PermissionRequest"

function emit(hookEvent: HookEvent, sessionID: string, cwd: string) {
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
  } catch {
    // Visual feedback is best-effort; never break opencode over a tab color.
  }
}

export default async ({ directory }: { directory: string }) => {
  const sessionCwd = new Map<string, string>()

  return {
    async event({ event }: { event: any }) {
      const props = event.properties ?? {}

      switch (event.type) {
        case "session.created": {
          const info = props.info ?? {}
          const cwd = info.directory || directory
          sessionCwd.set(info.id, cwd)
          emit("SessionStart", info.id, cwd)
          break
        }
        case "session.status": {
          if (props.status?.type === "busy") {
            emit(
              "PreToolUse",
              props.sessionID,
              sessionCwd.get(props.sessionID) || directory,
            )
          }
          break
        }
        case "session.idle": {
          emit(
            "Stop",
            props.sessionID,
            sessionCwd.get(props.sessionID) || directory,
          )
          break
        }
      }
    },

    async "permission.ask"(input: any) {
      emit(
        "PermissionRequest",
        input.sessionID,
        sessionCwd.get(input.sessionID) || directory,
      )
    },
  }
}
