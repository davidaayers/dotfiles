import { afterEach, beforeEach, expect, mock, test } from "bun:test"
import { EventEmitter } from "node:events"
import * as fs from "node:fs"
import * as childProcess from "node:child_process"

const writes: string[] = []
const hooks: { hook_event_name: string; session_id: string; cwd: string }[] = []
let paused = false
let config = { enabled: true, features: { title: true } }
let failSpawn = false
let holdSpawn = false
let aborted = false
const previousTerminal = process.env.TERM_PROGRAM
const appleScripts: string[][] = []
let clipboardInfo = "«class PNGf», 1024"
let failClipboardWrite = false

mock.module("node:fs", () => ({
  ...fs,
  existsSync: (path: string) => path.endsWith("/.paused") && paused,
  readFileSync: () => JSON.stringify(config),
  writeFileSync: (_path: string, value: string) => writes.push(value),
}))
mock.module("node:child_process", () => ({
  ...childProcess,
  execFileSync: (_file: string, args: string[]) => {
    appleScripts.push(args)
    if (args[1] === "clipboard info") return clipboardInfo
    if (failClipboardWrite) throw new Error("Clipboard export failed")
    return ""
  },
  spawnSync: () => ({ stdout: "ttys999" }),
  spawn: (_file: string, _args: string[], options: { signal: AbortSignal }) => {
    const proc = new EventEmitter() as EventEmitter & { stdin: EventEmitter & { end(value: string): void } }
    proc.stdin = Object.assign(new EventEmitter(), {
      end(value: string) {
        hooks.push(JSON.parse(value))
        if (!holdSpawn) queueMicrotask(() => proc.emit(failSpawn ? "error" : "close", failSpawn ? new Error("missing script") : 0))
      },
    })
    options.signal.addEventListener("abort", () => {
      aborted = true
      proc.emit("error", new Error("aborted"))
      proc.emit("close", null)
    }, { once: true })
    return proc
  },
}))

const chroma = (await import("../plugins/tab-chroma/tui.ts")).default
const nudge = (await import("../plugins/todo-nudge/index.ts")).default
const clipboard = (await import("../plugins/clipboard-image/index.ts")).default
const cleanups: (() => void)[] = []

async function settle() {
  for (let i = 0; i < 40; i++) await Promise.resolve()
}

function fixture(status = "idle", pending: unknown[] = []) {
  let listener: ((event: { details: unknown }) => void) | undefined
  let route: { type: string; sessionID?: string } = { type: "session", sessionID: "one" }
  const context = {
    location: { directory: "/project" },
    ui: { router: { current: () => route } },
    data: {
      location: { default: () => ({ directory: "/project" }) },
      session: {
        get: (sid: string) => ({ location: { directory: `/projects/${sid}` } }),
        status: () => status,
        permission: { list: () => pending },
      },
      listen: (callback: typeof listener) => {
        listener = callback
        return () => { listener = undefined }
      },
    },
  }
  const cleanup = chroma.setup(context as unknown as Parameters<typeof chroma.setup>[0])
  cleanups.push(cleanup)
  return {
    send: (type: string, data: Record<string, unknown> = {}) => listener?.({ details: { type, data: { sessionID: "one", ...data } } }),
    switch: (sid: string) => { route = { type: "session", sessionID: sid } },
    cleanup,
  }
}

beforeEach(() => {
  writes.length = 0
  hooks.length = 0
  paused = false
  config = { enabled: true, features: { title: true } }
  failSpawn = holdSpawn = aborted = false
  appleScripts.length = 0
  clipboardInfo = "«class PNGf», 1024"
  failClipboardWrite = false
  process.env.TERM_PROGRAM = "iTerm.app"
})
afterEach(async () => {
  cleanups.splice(0).forEach((cleanup) => cleanup())
  await settle()
  if (previousTerminal === undefined) delete process.env.TERM_PROGRAM
  else process.env.TERM_PROGRAM = previousTerminal
})

test("todo-nudge appends its policy pointer to each fresh agent context", async () => {
  let hook: ((event: { system: unknown[] }) => void) | undefined
  await nudge.setup({ session: { hook: async (kind: string, callback: typeof hook) => {
    expect(kind).toBe("context")
    hook = callback
  } } } as unknown as Parameters<typeof nudge.setup>[0])
  for (let i = 0; i < 2; i++) {
    const event = { system: [{ type: "text", text: "Existing instructions" }] }
    hook!(event)
    expect(event.system).toHaveLength(2)
    expect(event.system[1]).toEqual({ type: "text", text: expect.stringContaining("Todo List Currency") })
  }
})

test("resumed sessions initialize, then V2 tools, permissions, thinking and completion update the title", async () => {
  const f = fixture()
  await settle()
  expect(hooks.map((h) => h.hook_event_name)).toEqual(["SessionStart", "Stop"])
  expect(writes).toHaveLength(2)
  expect(hooks[0].cwd).toBe("/projects/one")
  expect(writes.at(-1)).toContain("one · done")
  f.send("session.execution.started")
  await settle()
  expect(writes.at(-1)).toContain("working")
  f.send("session.tool.input.started", { id: "call", name: "shell" })
  f.send("session.tool.called", { id: "call", input: { command: "cd repo && npm test" } })
  await settle()
  expect(writes.at(-1)).toContain("npm test")
  f.send("permission.asked")
  await settle()
  expect(hooks.at(-1)?.hook_event_name).toBe("PermissionRequest")
  expect(writes.at(-1)).toContain("needs approval")
  f.send("permission.replied")
  f.send("session.reasoning.started")
  await settle()
  expect(writes.at(-1)).toContain("thinking")
  f.send("session.execution.succeeded")
  await settle()
  expect(hooks.at(-1)?.hook_event_name).toBe("Stop")
  expect(writes.at(-1)).toContain("done")
})

test("background sessions do not repaint this terminal, switching sessions updates it", async () => {
  const f = fixture("running")
  await settle()
  const count = writes.length
  f.send("permission.asked", { sessionID: "other-terminal" })
  await settle()
  expect(writes).toHaveLength(count)
  f.switch("two")
  await Bun.sleep(300)
  expect(writes.at(-1)).toContain("two · working")
})

test("pause, disabled title and unsupported terminals suppress title output", async () => {
  paused = true
  const f = fixture()
  await settle()
  expect(writes).toHaveLength(0)
  paused = false
  config.features.title = false
  f.send("session.execution.started")
  await settle()
  expect(writes).toHaveLength(0)
  config.features.title = true
  process.env.TERM_PROGRAM = "unsupported"
  hooks.length = 0
  f.send("session.execution.succeeded")
  await settle()
  expect(writes).toHaveLength(0)
  expect(hooks).toHaveLength(0)
})

test("failed scripts are harmless and cleanup cancels pending work and subscriptions", async () => {
  failSpawn = true
  const f = fixture()
  await settle()
  expect(writes.at(-1)).toContain("done")
  holdSpawn = true
  f.send("session.execution.started")
  await settle()
  f.cleanup()
  expect(aborted).toBe(true)
  const count = writes.length
  f.send("permission.asked")
  f.switch("two")
  await Bun.sleep(300)
  expect(writes).toHaveLength(count)
})

test("pending approvals resume in permission state; failures and interruptions stop", async () => {
  const f = fixture("running", [{}])
  await settle()
  expect(hooks.at(-1)?.hook_event_name).toBe("PermissionRequest")
  expect(writes.at(-1)).toContain("needs approval")
  for (const type of ["session.execution.failed", "session.execution.interrupted"]) {
    f.send(type)
    await settle()
    expect(hooks.at(-1)?.hook_event_name).toBe("Stop")
    expect(writes.at(-1)).toContain("done")
  }
})

test("V2 read paths and terminal control characters are handled safely", async () => {
  const f = fixture()
  await settle()
  f.send("session.tool.input.started", { id: "read", name: "read" })
  f.send("session.tool.called", { id: "read", input: { path: "/repo/file.ts" } })
  await settle()
  expect(writes.at(-1)).toContain("reading file.ts")
  f.send("session.tool.input.started", { id: "shell", name: "shell" })
  f.send("session.tool.called", { id: "shell", input: { command: "echo \x1b]2;injected\x07" } })
  await settle()
  expect(writes.at(-1)?.match(/\x1b/g)).toHaveLength(1)
})

async function clipboardFixture(deny = false) {
  type Context = Parameters<typeof clipboard.setup>[0]
  type Editor = Parameters<Parameters<Context["tool"]["transform"]>[0]>[0]
  type Tool = Parameters<Editor["add"]>[0]
  let tool: Tool | undefined
  const permissions: unknown[] = []
  await clipboard.setup({
    tool: {
      transform: async (edit: (editor: Editor) => void) => {
        edit({ add: (value: Tool) => { tool = value } } as Editor)
      },
    },
    permission: {
      assert: async (request: unknown) => {
        permissions.push(request)
        if (deny) throw new Error("Permission denied")
      },
    },
  } as unknown as Context)
  if (!tool) throw new Error("Clipboard tool was not registered")
  const context = {
    sessionID: "one", agent: "build", messageID: "message", id: "clipboard-call",
  } as Parameters<typeof tool.execute>[1]
  return { tool, permissions, context }
}

test("clipboard tool registers with V2 and checks permission before exporting PNGs", async () => {
  const f = await clipboardFixture()
  expect(f.tool.name).toBe("clipboard_image")
  expect(f.tool.input).toEqual({ type: "object", properties: {}, additionalProperties: false })
  const result = await f.tool.execute({}, f.context)
  expect(f.permissions).toEqual([{
    sessionID: "one", agent: "build",
    source: { type: "tool", messageID: "message", id: "clipboard-call" },
    action: "clipboard_image", resources: ["*"], save: ["*"],
  }])
  expect(result.content).toMatch(/^Saved clipboard image to \/.+\/clipboard-image-[\da-f-]+\.png$/)
  expect(appleScripts).toHaveLength(2)
  expect(appleScripts[0]).toEqual(["-e", "clipboard info"])
  const script = appleScripts[1].join("\n")
  expect(script).toContain("set pngData to the clipboard as «class PNGf»")
  expect(script).toContain("close access outFile")
  const again = await f.tool.execute({}, f.context)
  expect(again.content).not.toBe(result.content)
})

test("clipboard tool skips export when no image exists", async () => {
  clipboardInfo = "«class utf8», 42"
  const f = await clipboardFixture()
  const result = await f.tool.execute({}, f.context)
  expect(result.content).toContain("does not currently contain an image")
  expect(appleScripts).toEqual([["-e", "clipboard info"]])
})

test("clipboard permission rejection prevents all clipboard access", async () => {
  const f = await clipboardFixture(true)
  await expect(f.tool.execute({}, f.context)).rejects.toThrow("Permission denied")
  expect(appleScripts).toHaveLength(0)
})

test("clipboard export failures propagate instead of reporting a nonexistent PNG", async () => {
  failClipboardWrite = true
  const f = await clipboardFixture()
  await expect(f.tool.execute({}, f.context)).rejects.toThrow("Clipboard export failed")
})
