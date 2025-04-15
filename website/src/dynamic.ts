import "./async.css"
import "prism-code-editor-lightweight/search.css"
import "prism-code-editor-lightweight/copy-button.css"
import "prism-code-editor-lightweight/code-folding.css"
import "prism-code-editor-lightweight/rtl-layout.css"
import "prism-code-editor-lightweight/autocomplete.css"
import "prism-code-editor-lightweight/autocomplete-icons.css"
import "prism-code-editor-lightweight/languages/clike"
import "prism-code-editor-lightweight/languages/css"
import "prism-code-editor-lightweight/languages/html"
import "prism-code-editor-lightweight/languages/jsx"
import "prism-code-editor-lightweight/languages/python"
import "prism-code-editor-lightweight/languages/xml"
import "prism-code-editor-lightweight/prism/languages/markup"
import "prism-code-editor-lightweight/prism/languages/css-extras"
import "prism-code-editor-lightweight/prism/languages/js-templates"
import "prism-code-editor-lightweight/prism/languages/jsdoc"
import "prism-code-editor-lightweight/prism/languages/regex"
import "prism-code-editor-lightweight/prism/languages/tsx"
import "prism-code-editor-lightweight/prism/languages/markdown"
import "prism-code-editor-lightweight/prism/languages/clike"
import "prism-code-editor-lightweight/prism/languages/python"
import { copyButton } from "prism-code-editor-lightweight/copy-button"
import { defaultCommands, editHistory } from "prism-code-editor-lightweight/commands"
import {
	highlightSelectionMatches,
	searchWidget,
	highlightCurrentWord,
} from "prism-code-editor-lightweight/search"
import { cursorPosition } from "prism-code-editor-lightweight/cursor"
import { markdownFolding, readOnlyCodeFolding } from "prism-code-editor-lightweight/code-folding"
import { matchTags } from "prism-code-editor-lightweight/match-tags"
import { highlightBracketPairs } from "prism-code-editor-lightweight/highlight-brackets"
import { addOverscroll, addTooltip } from "prism-code-editor-lightweight/tooltips"
import {
	autoComplete,
	AutoCompleteConfig,
	completeSnippets,
	fuzzyFilter,
	registerCompletions,
} from "prism-code-editor-lightweight/autocomplete"
import {
	completeIdentifiers,
	completeKeywords,
	globalReactAttributes,
	jsContext,
	jsDocCompletion,
	jsSnipets,
	jsxTagCompletion,
	reactTags,
} from "prism-code-editor-lightweight/autocomplete/javascript"
import {
	globalHtmlAttributes,
	htmlTags,
	markupCompletion,
} from "prism-code-editor-lightweight/autocomplete/markup"
import { cssCompletion } from "prism-code-editor-lightweight/autocomplete/css"

import { EditorOptions, PrismEditor, createEditor, editorFromPlaceholder } from "prism-code-editor-lightweight"
import { getClosestToken } from "prism-code-editor-lightweight/utils"
import { loadTheme } from "prism-code-editor-lightweight/themes"
import { editor, editors, placeholders, startOptions, style, wrapper } from "./index"
import { startCode } from "./examples1"
import { matchBrackets } from "prism-code-editor-lightweight/match-brackets"
import { indentGuides } from "prism-code-editor-lightweight/guides"
import { code } from "./examples2"

let currentOptions = startOptions
let scrollPos: [number, number] = [0, 0]
let activeEditor = 0
let editor1: PrismEditor

const tabs = wrapper.querySelectorAll(".tab")
const errorEl = <HTMLDivElement>wrapper.querySelector(".error")!
const errorMessage = <HTMLPreElement>errorEl.lastElementChild

const makeEditor = (add: boolean, options?: Partial<EditorOptions>) =>
	createEditor(add ? wrapper : undefined, options, matchBrackets(), indentGuides())

const runBtn = <HTMLButtonElement>document.getElementById("run")

const autocompleteConfig: AutoCompleteConfig = {
	filter: fuzzyFilter,
	explicitOnly: true,
}

const theme = <HTMLSelectElement>document.getElementById("themes"),
	addExtensions = (editor: PrismEditor) => {
		editor.addExtensions(
			searchWidget(),
			highlightSelectionMatches(),
			matchTags(),
			highlightBracketPairs(),
			defaultCommands(),
			cursorPosition(),
			editHistory(),
			autoComplete(autocompleteConfig),
		)
		editor.textarea.setAttribute("aria-label", "Code editor")
	},
	toggleActive = () => {
		if (!editor1) {
			addExtensions(
				(editor1 = makeEditor(true, {
					language: "html",
					value: startCode,
				})),
			)
		}
		for (const tab of tabs) tab.classList.toggle("active")
		const current = (activeEditor ? editor1 : editor).scrollContainer
		const newEditor = (activeEditor ? editor : editor1).scrollContainer
		newEditor.style.display = ""
		newEditor.scrollTo(...scrollPos)
		scrollPos = [current.scrollLeft, current.scrollTop]
		current.style.display = "none"

		if (!activeEditor) {
			runBtn.setAttribute("aria-hidden", "true")
			errorEl.setAttribute("aria-hidden", "true")
		} else runBtn.setAttribute("aria-hidden", <any>(currentOptions == editor.value))
		activeEditor = +!activeEditor
	}

const langs = ["typescript", "typescript", "typescript", "html", "javascript", "markdown"]

const addWordHighlight = (editor: PrismEditor) => {
	editor.addExtensions(
		highlightCurrentWord(
			start => !getClosestToken(editor, ".string,.comment,.keyword,.regex", 0, 0, start),
		),
	)
}

const inputs = ["readOnly", "wordWrap", "lineNumbers", "autocomplete"].map(
	id => <HTMLInputElement>document.getElementById(id)!,
)

const observer = new IntersectionObserver(entries =>
	entries.forEach(entry => {
		if (entry.isIntersecting) {
			const target = <HTMLElement>entry.target
			const index = [].indexOf.call(placeholders, <never>target)
			const editor = (editors[index] = editorFromPlaceholder(
				target,
				{
					readOnly: index > 5 || inputs[0].checked,
					wordWrap: inputs[1].checked,
					lineNumbers: inputs[2].checked,
					language: langs[index - 1],
					value: code[index - 1],
				},
				matchBrackets(),
				indentGuides(),
				copyButton(),
			))
			addExtensions(editor)
			if (index < 4 || index == 5) {
				addWordHighlight(editor)
			}
			if (index == 6) {
				const tooltip = document.createElement("div")
				const [show, hide] = addTooltip(editor, tooltip, false)
				const textarea = editor.textarea

				tooltip.className = "tooltip"
				tooltip.textContent = "Cannot edit read-only editor."

				textarea.addEventListener("beforeinput", () => show(), true)

				// Hiding the tooltip when a user moves the cursor or clicks on the textarea
				editor.options.onSelectionChange = hide
				textarea.addEventListener("click", hide)

				editor.addExtensions(readOnlyCodeFolding(markdownFolding))
				addOverscroll(editor)
			}
			observer.unobserve(target)
		}
	}),
)

placeholders.forEach((el, i) => i && observer.observe(el))

editor.options.onUpdate = code => runBtn.setAttribute("aria-hidden", <any>(currentOptions == code))

runBtn.onclick = () => {
	currentOptions = editor.value
	runBtn.setAttribute("aria-hidden", "true")
	let options: any
	try {
		options = Function(currentOptions + "\n;return options")() || {}
	} catch (error) {
		errorEl.removeAttribute("aria-hidden")
		errorMessage.textContent = <string>error
		return
	}

	let newEditor: PrismEditor
	try {
		newEditor = makeEditor(false, options)
	} catch (error) {
		errorEl.removeAttribute("aria-hidden")
		errorMessage.textContent = <string>error
		return
	}

	wrapper.append(newEditor.scrollContainer)
	editor1?.remove()
	addExtensions?.((editor1 = newEditor))
	toggleActive()
	newEditor.textarea.focus()
}

inputs.forEach(
	input =>
		(input.onchange = () => {
			if (input == inputs[3]) {
				autocompleteConfig.explicitOnly = !input.checked
			} else {
				let options = {
					[input.id]: input.checked,
				}
				editors.forEach((editor, i) => {
					if (input.id != "readOnly" || i < 8) editor.setOptions(options)
				})
			}
		}),
)
addExtensions(editor)
addExtensions(editors[0])
addWordHighlight(editors[0])
editors[0].addExtensions(copyButton())

theme.oninput = () => {
	loadTheme(theme.value.toLowerCase().replace(/ /g, "-")).then(theme => {
		style.textContent = theme!
	})
}
;(<HTMLDivElement>wrapper.firstElementChild).onclick = e => {
	if ((<HTMLElement>e.target).matches(".tab:not(.active)")) toggleActive()
}

registerCompletions(["javascript", "js", "jsx", "tsx", "typescript", "ts"], {
	context: jsContext,
	sources: [
		completeIdentifiers(),
		completeKeywords,
		jsDocCompletion,
		jsxTagCompletion(reactTags, globalReactAttributes),
		completeSnippets(jsSnipets),
	],
})

registerCompletions(["html", "markup"], {
	sources: [markupCompletion(htmlTags, globalHtmlAttributes)],
})

registerCompletions(["css"], {
	sources: [cssCompletion()],
})
