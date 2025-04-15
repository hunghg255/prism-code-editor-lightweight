export const code = [
	`// index.ts
import "prism-code-editor-lightweight/prism/languages/markup"
import "prism-code-editor-lightweight/prism/languages/css-extras"
import "prism-code-editor-lightweight/prism/languages/javascript"

import { createEditor } from "prism-code-editor-lightweight"
import { matchBrackets } from "prism-code-editor-lightweight/match-brackets"
import { indentGuides } from "prism-code-editor-lightweight/guides"

// Importing styles
import "prism-code-editor-lightweight/layout.css"
import "prism-code-editor-lightweight/scrollbar.css"
import "prism-code-editor-lightweight/themes/github-dark.css"

export const editor = createEditor(
  "#editor",
  { language: "html" },
  indentGuides(),
  matchBrackets(),
)

import('./extensions')`,

	`// extensions.ts
import "prism-code-editor-lightweight/search.css"
import "prism-code-editor-lightweight/copy-button.css"
import "prism-code-editor-lightweight/languages"

import { searchWidget, highlightSelectionMatches } from "prism-code-editor-lightweight/search"
import { defaultCommands, editHistory } from "prism-code-editor-lightweight/commands"
import { cursorPosition } from "prism-code-editor-lightweight/cursor"
import { copyButton } from "prism-code-editor-lightweight/copy-button"
import { matchTags } from "prism-code-editor-lightweight/match-tags"
import { highlightBracketPairs } from "prism-code-editor-lightweight/highlight-brackets"
import { editor } from "./index"

editor.addExtensions(
  highlightSelectionMatches(),
  searchWidget(),
  defaultCommands(),
  copyButton(),
  matchTags(),
  highlightBracketPairs(),
  cursorPosition(),
  editHistory(),
)`,

	`import {
  addBasicEditor, PrismEditorElement
} from "prism-code-editor-lightweight/web-component"

// Adds a web component with the specified name
addBasicEditor("prism-editor")

const editorElement = document.querySelector<PrismEditorElement>("prism-editor")

// Add a listener for when the editor finishes loading
editorElement.addEventListener("ready", () => console.log("ready"))

// The editor can be accessed from the element
console.log(editorElement.editor)`,

	`<style>
  prism-editor {
    display: grid;
    height: 30em;
    overflow: hidden;
  }
</style>
<prism-editor
  language="javascript"
  theme="vs-code-dark"
  tab-size="4" word-wrap
  line-numbers insert-spaces
>
  The editors initial code goes here
</prism-editor>`,

	`import { createEditor } from "prism-code-editor-lightweight"
const editor = createEditor("#editor", { language: "html" })

// Adding the word highlighting extension
import { highlightCurrentWord } from "prism-code-editor-lightweight/search"
import { getClosestToken } from "prism-code-editor-lightweight/utils"

// Filter away words starting inside a string, comment, keyword or regex token
const selector = ".string, .comment, .keyword, .regex"
const filter = start => !getClosestToken(editor, selector, 0, 0, start)

editor.addExtensions(
  highlightCurrentWord(filter)
)

// Dynamically importing themes inline
import { loadTheme } from "prism-code-editor-lightweight/themes"

const isDark = matchMedia("(prefers-color-scheme: dark)").matches

loadTheme(isDark ? "github-dark" : "github-light").then(theme => {
  console.log(theme)
})

// Adding custom language behavior
import { languageMap } from "prism-code-editor-lightweight"

languageMap.whatever = {
  comments: {
    line: "//",
    block: ["/*", "*/"]
  },
  autoIndent: [
    // Whether to indent
    ([start], value) => /[([{][^\\n)\\]}]*$/.test(value.slice(0, start)),
    // Whether to add an extra line
    ([start, end], value) => /\\[]|\\(\\)|{}/.test(value[start - 1] + value[end])
  ]
}`,

	`## How to add

To add code-folding, you must import it along with its styles.

\`\`\`javascript
import { readOnlyCodeFolding } from "prism-code-editor-lightweight/code-folding"
import "prism-code-editor-lightweight/code-folding.css"
\`\`\`

This will allow folding of square- and curly brackets and XML/HTML tags.
But to do so, bracket matching and tag matching must be added to the editor,
preferably *before* the code folding.

<h2 align="center">
  Try folding this element!
</h2>

\`\`\`javascript
import { createEditor } from "prism-code-editor-lightweight"
import { matchBrackets } from "prism-code-editor-lightweight/match-brackets"
import { matchTags } from "prism-code-editor-lightweight/match-tags"

const editor = createEditor(
  "#my-editor",
  {
    language: "html",
    readOnly: true,
    value: "<div>\\n  test\\n</div>"
  },
  matchBrackets(),
  matchTags(),
  readOnlyCodeFolding()
)
\`\`\`

## Styling

You probably want to give extra space for the fold gutters. Use the custom
property \`--editor__bg-fold\` to change the folding arrow color.

\`\`\`css
.prism-code-editor {
  --number-spacing: 1.5em;
}
\`\`\`

## Adding extra providers

You can add any number of folding range providers. These providers are simply a
function returning an array of tuples containing the start and end position for
the fold. Just pass it to the \`readOnlyCodeFolding\` extension to add it.

\`\`\`typescript
import {
  readOnlyCodeFolding, markdownFolding,
  blockCommentFolding, FoldingRangeProvider
} from "prism-code-editor-lightweight/code-folding"

const myProvider: FoldingRangeProvider = editor => [
  [5, 20], [10, 15]
]

readOnlyCodeFolding(myProvider, markdownFolding, blockCommentFolding)
\`\`\`

The \`markdownFolding\` provider adds folding of both titles and code blocks
in markdown, and the \`blockCommentFolding\` adds folding of multiline block
comments. In order for the comment folding to work for a language, the language
specific behavior needs to be defined in the language map. Either import the
behavior from \`prism-code-editor-lightweight/languages/*\` or define it yourself.

## Read-only setup

If you don't care about customization, you can use the read-only setup instead.

\`\`\`javascript
import { readonlyEditor } from "prism-code-editor-lightweight/setups"
\`\`\`
`,
]
