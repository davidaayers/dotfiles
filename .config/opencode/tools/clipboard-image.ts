import { execFileSync } from "node:child_process"
import path from "node:path"
import { tool } from "@opencode-ai/plugin"

function clipboardHasImage(): boolean {
	const info = execFileSync("osascript", ["-e", "clipboard info"], {
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
	}).toString()
	return /PNGf|TIFF|JPEG|GIFf/.test(info)
}

export default tool({
	description:
		"Save the image currently on the system clipboard to a temporary PNG file and return its absolute path. Use this when the user pastes or copies an image/screenshot that you cannot view directly (e.g. a non-vision model), so a vision-capable subagent can read it via the returned path.",
	args: {},
	async execute() {
		if (!clipboardHasImage()) {
			return "ERROR: The clipboard does not currently contain an image. Ask the user to copy/capture a screenshot first, then retry."
		}
		const outPath = path.join("/tmp", `clipboard-image-${Date.now()}.png`)
		const script = [
			`set pngData to the clipboard as «class PNGf»`,
			`set outFile to open for access POSIX file "${outPath}" with write permission`,
			`write pngData to outFile`,
			`close access outFile`,
		]
		execFileSync("osascript", script.map((s) => ["-e", s]).flat(), {
			stdio: ["ignore", "pipe", "pipe"],
		})
		return `Saved clipboard image to ${outPath}`
	},
})
