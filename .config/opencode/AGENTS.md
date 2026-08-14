# Global Rules

## Vision Task Delegation

For any task involving images, screenshots, diagrams, or visual analysis (reading an image, analyzing a screenshot, verifying rendered output), delegate to the `vision` subagent instead of handling it directly.

Subagents start with a fresh context, so an image pasted into the parent session is never forwarded to them. If the image was saved to a file (e.g. referenced by a path in the conversation), pass that path to the `vision` subagent so it can read the file itself.

If the user pastes/copies an image that you cannot view directly (e.g. "this model does not support image input", or no image part is visible to you), first call the `clipboard-image` tool, which saves the current clipboard image to a temp PNG and returns its path. Then delegate analysis to the `vision` subagent with that path. Do not try to read the image yourself.
