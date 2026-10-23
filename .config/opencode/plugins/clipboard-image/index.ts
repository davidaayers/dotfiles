// Local macOS clipboard fallback; runs on the server's host, not a remote client.
import { execFileSync } from "node:child_process"
import { randomUUID } from "node:crypto"
import { tmpdir } from "node:os"
import path from "node:path"
import type { Plugin } from "@opencode/plugin"

export default {
  id: "clipboard-image",
  async setup(ctx) {
    await ctx.tool.transform((editor) => {
      editor.add({
        name: "clipboard_image",
        description:
          "Save an image from the OpenCode server host's macOS clipboard to a temporary PNG and return its absolute path. Use only for local sessions when normal image attachment is unavailable; this cannot read a remote client's clipboard.",
        input: { type: "object", properties: {}, additionalProperties: false },
        async execute(_input, context) {
          await ctx.permission.assert({
            sessionID: context.sessionID,
            agent: context.agent,
            source: { type: "tool", messageID: context.messageID, id: context.id },
            action: "clipboard_image",
            resources: ["*"],
            save: ["*"],
          })
          const info = execFileSync("osascript", ["-e", "clipboard info"], {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
          })
          if (!/PNGf|TIFF|JPEG|GIFf/.test(info)) {
            return { content: "ERROR: The clipboard does not currently contain an image. Ask the user to copy/capture a screenshot first, then retry." }
          }
          const outPath = path.join(tmpdir(), `clipboard-image-${randomUUID()}.png`)
          const script = [
            "set pngData to the clipboard as «class PNGf»",
            `set outFile to open for access POSIX file ${JSON.stringify(outPath)} with write permission`,
            "try",
            "write pngData to outFile",
            "on error errorMessage number errorNumber",
            "close access outFile",
            "error errorMessage number errorNumber",
            "end try",
            "close access outFile",
          ]
          execFileSync("osascript", script.flatMap((line) => ["-e", line]), {
            stdio: ["ignore", "pipe", "pipe"],
          })
          return { content: `Saved clipboard image to ${outPath}` }
        },
      })
    })
  },
} satisfies Plugin.Plugin
