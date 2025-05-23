import type {
	EditorOptions,
	PrismEditor,
	KeyCommandCallback,
	Language,
	InputCommandCallback,
	EditorEventMap,
	InputSelection,
	EditorExtension,
} from "./types.js"
import { highlightTokens, languages, tokenizeText, Grammar, TokenStream } from "./prism/index.js"
import { isClient } from "./utils/isClient.js"

/**
 * Creates a code editor using the specified container and options.
 * @param container Element to append the editor to or a selector.
 * This can also be a `ShadowRoot` or `DocumentFragment` for example.
 * If omitted, you must manually append the `scrollContainer` to the DOM.
 * @param options Options the editor is initialized with.
 * If omitted, the editor won't function until you call `setOptions`.
 * @param extensions Extensions added before the first render. You can still add extensions later.
 * @returns Object to interact with the created editor.
 */
const createEditor = (
	container?: ParentNode | string | null,
	options?: Partial<EditorOptions>,
	...extensions: EditorExtension[]
): PrismEditor => {
	let language: string
	let grammar: Grammar
	let prevLines: string[] = []
	let activeLine: HTMLDivElement
	let value = ""
	let activeLineNumber: number
	let removed = false
	let focused = false
	let handleSelectionChange = true
	let tokens: TokenStream = []
	let readOnly: boolean
	let lineCount = 0

	const scrollContainer = editorTemplate()
	const wrapper = <HTMLDivElement>scrollContainer.firstChild
	const lines = <HTMLCollectionOf<HTMLDivElement>>wrapper.children
	const overlays = lines[0]
	const textarea = <HTMLTextAreaElement>overlays.firstChild
	const currentOptions: EditorOptions = { language: "text", value }
	const currentExtensions = new Set(extensions)
	const listeners: {
		[P in keyof EditorEventMap]?: Set<EditorEventMap[P]>
	} = {}

	const setOptions = (options: Partial<EditorOptions>) => {
		Object.assign(currentOptions, options)
		value = options.value ?? value
		language = currentOptions.language

		if (!languages[language]) throw Error(`Language '${language}' has no grammar.`)

		readOnly = !!currentOptions.readOnly
		scrollContainer.style.tabSize = <any>currentOptions.tabSize || 2
		textarea.inputMode = readOnly ? "none" : ""
		textarea.setAttribute("aria-readonly", <any>readOnly)
		updateClassName()

		updateExtensions()
		if (grammar != (grammar = languages[language]) || value != textarea.value) {
			focusRelatedTarget()
			textarea.value = value
			textarea.selectionEnd = 0
			update()
		}
	}

	const update = () => {
		tokens = tokenizeText((value = textarea.value), grammar)
		dispatchEvent("tokenize", tokens, language, value)

		let newLines = highlightTokens(tokens).split("\n")
		let start = 0
		let end2 = lineCount
		let end1 = (lineCount = newLines.length)

		while (newLines[start] == prevLines[start] && start < end1) ++start
		while (end1 && newLines[--end1] == prevLines[--end2]);

		if (start == end1 && start == end2) lines[start + 1].innerHTML = newLines[start] + "\n"
		else {
			let insertStart = end2 < start ? end2 : start - 1
			let i = insertStart
			let newHTML = ""

			while (i < end1) newHTML += `<div class=pce-line aria-hidden=true>${newLines[++i]}\n</div>`
			for (i = end1 < start ? end1 : start - 1; i < end2; i++) lines[start + 1].remove()
			if (newHTML) lines[insertStart + 1].insertAdjacentHTML("afterend", newHTML)
			for (i = insertStart + 1; i < lineCount; ) lines[++i].setAttribute("data-line", <any>i)
			scrollContainer.style.setProperty(
				"--number-width",
				Math.ceil(Math.log10(lineCount + 1)) + ".001ch",
			)
		}

		dispatchEvent("update", value)
		dispatchSelection(true)
		if (handleSelectionChange) setTimeout(setTimeout, 0, () => (handleSelectionChange = true))

		prevLines = newLines
		handleSelectionChange = false
	}

	const updateExtensions = (newExtensions?: EditorExtension[]) => {
		;(newExtensions || currentExtensions).forEach(extension => {
			if (typeof extension == "object") {
				extension.update(self, currentOptions)
				if (newExtensions) currentExtensions.add(extension)
			} else {
				extension(self, currentOptions)
				if (!newExtensions) currentExtensions.delete(extension)
			}
		})
	}

	const updateClassName = ([start, end] = getInputSelection()) => {
		scrollContainer.className = `prism-code-editor language-${language}${
			currentOptions.lineNumbers == false ? "" : " show-line-numbers"
		} pce-${currentOptions.wordWrap ? "" : "no"}wrap${currentOptions.rtl ? " pce-rtl" : ""} pce-${
			start < end ? "has" : "no"
		}-selection${focused ? " pce-focus" : ""}${readOnly ? " pce-readonly" : ""}`
	}

	const getInputSelection = (): InputSelection => [
		textarea.selectionStart,
		textarea.selectionEnd,
		textarea.selectionDirection,
	]

	const keyCommandMap: Record<string, KeyCommandCallback | null> = {
		Escape() {
			textarea.blur()
		},
	}

	const inputCommandMap: Record<string, InputCommandCallback | null> = {}

	// Safari focuses the textarea if you change its selection or value programmatically
	const focusRelatedTarget = () =>
		isWebKit &&
		!focused &&
		addTextareaListener(
			self,
			"focus",
			e => {
				let relatedTarget = <HTMLElement>e.relatedTarget
				if (relatedTarget) relatedTarget.focus()
				else textarea.blur()
			},
			{ once: true },
		)

	const dispatchEvent = <T extends keyof EditorEventMap>(
		name: T,
		...args: Parameters<EditorEventMap[T]>
	) => {
		// @ts-expect-error
		listeners[name]?.forEach(handler => handler.apply(self, args))
		// @ts-expect-error
		currentOptions["on" + name[0].toUpperCase() + name.slice(1)]?.apply(self, args)
	}

	const dispatchSelection = (force?: boolean) => {
		if (force || handleSelectionChange) {
			const selection = getInputSelection()
			const newLine =
				lines[(activeLineNumber = numLines(value, 0, selection[selection[2] < "f" ? 0 : 1]))]

			if (newLine != activeLine) {
				activeLine?.classList.remove("active-line")
				newLine.classList.add("active-line")
				activeLine = newLine
			}
			updateClassName(selection)
			dispatchEvent("selectionChange", selection, value)
		}
	}

	const self: PrismEditor = {
		scrollContainer,
		wrapper,
		overlays,
		textarea,
		get activeLine() {
			return activeLine
		},
		get activeLineNumber() {
			return activeLineNumber
		},
		get value() {
			return value
		},
		options: currentOptions,
		get focused() {
			return focused
		},
		get removed() {
			return removed
		},
		get tokens() {
			return tokens
		},
		inputCommandMap,
		keyCommandMap,
		extensions: {},
		setOptions,
		update,
		getSelection: getInputSelection,
		setSelection(start, end = start, direction) {
			focusRelatedTarget()
			textarea.setSelectionRange(start, end, direction)
			dispatchSelection(true)
		},
		addExtensions(...extensions) {
			updateExtensions(extensions)
		},
		addListener(name, handler) {
			;(listeners[name] ||= new Set<any>()).add(handler)
		},
		removeListener(name, handler) {
			listeners[name]?.delete(handler)
		},
		remove() {
			scrollContainer.remove()
			removed = true
		},
	}

	addTextareaListener(self, "keydown", e => {
		keyCommandMap[e.key]?.(e, getInputSelection(), value) && preventDefault(e)
	})

	addTextareaListener(self, "beforeinput", e => {
		if (
			readOnly ||
			(e.inputType == "insertText" && inputCommandMap[e.data!]?.(e, getInputSelection(), value))
		)
			preventDefault(e)
	})
	addTextareaListener(self, "input", update)
	addTextareaListener(self, "blur", () => {
		selectionChange = null
		focused = false
		updateClassName()
	})
	addTextareaListener(self, "focus", () => {
		selectionChange = dispatchSelection
		focused = true
		updateClassName()
	})
	// For browsers that support selectionchange on textareas
	addTextareaListener(self, "selectionchange", e => {
		dispatchSelection()
		preventDefault(e)
	})

	getElement(container)?.append(scrollContainer)
	options && setOptions(options)
	return self
}

/**
 * Almost identical to {@link createEditor}, but instead of appending the editor to your
 * element, the editor replaces it.
 *
 * The `textContent` of the placeholder will be the code in the editor unless `options.value` is defined.
 * @param placeholder Node or selector which will be replaced by the editor.
 * @param options Options the editor is initialized with.
 * @param extensions Extensions added before the first render. You can still add extensions later.
 * @returns Object to interact with the created editor.
 */
const editorFromPlaceholder = (
	placeholder: string | ChildNode,
	options: Partial<EditorOptions>,
	...extensions: EditorExtension[]
) => {
	const el = getElement(placeholder)!
	const editor = createEditor(
		null,
		Object.assign({ value: el.textContent }, options),
		...extensions,
	)
	el.replaceWith(editor.scrollContainer)
	return editor
}


const createTemplate = <T extends Element = HTMLDivElement>(html: string) => {
	if (isClient()) {
		const templateEl = document.createElement("div")

		templateEl.innerHTML = html
		const node = templateEl.firstChild!
		return () => <T>node.cloneNode(true)
	}

	return () => <T>(<unknown>null)
}

const addTextareaListener = <T extends keyof HTMLElementEventMap>(
	editor: PrismEditor,
	type: T,
	listener: (this: HTMLTextAreaElement, ev: HTMLElementEventMap[T]) => any,
	options?: boolean | AddEventListenerOptions,
) => editor.textarea.addEventListener(type, listener, options)

const getElement = <T extends Node>(el?: T | string | null) => {
	if (isClient()) {
		return typeof el == "string" ? document.querySelector<HTMLElement>(el) : el;
	}
}


const userAgent = navigator.userAgent
const isMac = /Mac|iPhone|iPod|iPad/i.test(navigator.platform)
const isChrome = /Chrome\//.test(userAgent)
const isWebKit = !isChrome && /AppleWebKit\//.test(userAgent)

/**
 * Counts number of lines in the string between `start` and `end`.
 * If start and end are excluded, the whole string is searched.
 */
const numLines = (str: string, start = 0, end = Infinity) => {
	let count = 1
	for (; (start = str.indexOf("\n", start) + 1) && start <= end; count++);
	return count
}

/** Object storing all language specific behavior. */
const languageMap: Record<string, Language> = {}

const editorTemplate = /* @__PURE__ */ createTemplate(
	"<div><div class=pce-wrapper><div class=pce-overlays><textarea spellcheck=false autocapitalize=off autocomplete=off>",
)

const preventDefault = (e: Event) => {
	e.preventDefault()
	e.stopImmediatePropagation()
}

let selectionChange: null | (() => void)

if (isClient()) {
	document.addEventListener("selectionchange", () => selectionChange?.())
}

export {
	createEditor,
	languageMap,
	numLines,
	createTemplate,
	isMac,
	isChrome,
	isWebKit,
	getElement,
	preventDefault,
	editorFromPlaceholder,
	addTextareaListener,
}
