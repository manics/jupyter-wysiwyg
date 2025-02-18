import { CodeEditor } from "@jupyterlab/codeeditor";
import { IMarkdownCellModel, MarkdownCell } from "@jupyterlab/cells";
import { UUID } from "@lumino/coreutils";
import { Signal } from "@lumino/signaling";
import { IDisposable, DisposableDelegate } from "@lumino/disposable";
import { ArrayExt } from '@lumino/algorithm';
import { EditorWidget } from "./factory";

// Import TinyMCE
import TinyMCE from "tinymce";
import 'tinymce/icons/default';                 // Default icons are required for TinyMCE 5.3 or above
import 'tinymce/themes/silver';                 // A theme is also required
import 'tinymce/skins/ui/oxide/skin.css';       // Import the skin
import 'tinymce/plugins/advlist';               // Import plugins
import 'tinymce/plugins/code';
import 'tinymce/plugins/emoticons';
import 'tinymce/plugins/emoticons/js/emojis';
import 'tinymce/plugins/link';
import 'tinymce/plugins/lists';
import 'tinymce/plugins/table';
// import contentUiCss from 'tinymce/skins/ui/oxide/content.css'; // Import content CSS
// import contentCss from 'tinymce/skins/content/default/content.css';

export class TinyMCEEditor implements CodeEditor.IEditor {
    constructor(options: TinyMCEEditor.IOptions, markdownModel: IMarkdownCellModel, defaultEditor: any) {
        this.defaultEditor = defaultEditor;

        this.host = options.host;
        this.host.classList.add("jp-RenderedHTMLCommon");
        this.host.classList.add('jp-TinyMCE');
        this.host.addEventListener('focus', this.blur, true);
        this.host.addEventListener('blur', this.focus, true);
        this.host.addEventListener('scroll', this.scroll, true);

        this._uuid = options.uuid || UUID.uuid4();

        this._model = options.model;
        this.is_markdown = (markdownModel.metadata.get("markdownMode") as boolean);
        if (!!this.is_markdown) this.is_markdown = false;
        this._view = new TinyMCEView(this.host, this.model);
    }

    static DEFAULT_NUMBER: number = 0;
    private _model: CodeEditor.IModel;
    private _uuid = '';
    private _is_disposed = false;
    private _keydownHandlers = new Array<CodeEditor.KeydownHandler>();
    private _selection_style: CodeEditor.ISelectionStyle;
    private _view: TinyMCEView;
    public is_markdown = false;
    readonly charWidth: number;
    readonly edgeRequested = new Signal<this, CodeEditor.EdgeLocation>(this);
    readonly host: HTMLElement;
    readonly isDisposed: boolean;
    readonly lineHeight: number;
    public defaultEditor: any;

    // Getters
    get view() { return this._view; }
    get uuid() { return this._uuid; }
    get is_disposed() { return this._is_disposed; }
    get model() { return this._model; }
    get lineCount() { return TinyMCEEditor.DEFAULT_NUMBER; }
    get selectionStyle() { return this._selection_style; }
    get doc() { return new DummyDoc(); }

    // Setters
    set uuid(value) { this._uuid = value; }
    set selectionStyle(value) { this._selection_style = value; }

    blur(): void { if (this._view) this.defaultEditor.blur(); }
    focus(): void { if (this._view) this.defaultEditor.focus(); }

    syncFromCodeMirror() {
        if (this.model.value.text !== this._view.tinymce.getContent() &&
            (this.host.querySelector('.tox-tinymce') as HTMLElement).style.display === 'none') {
            this._view.tinymce.setContent(this._view._getRenderText(this.host, this.model));
        }
    }

    addKeydownHandler(handler: (instance: CodeEditor.IEditor, event: KeyboardEvent) => boolean): IDisposable {
        this._keydownHandlers.push(handler);
        return new DisposableDelegate(() => {
            ArrayExt.removeAllWhere(this._keydownHandlers, val => val === handler);
        });
    }

    dispose(): void {
        if (this._is_disposed) return;
        this._is_disposed = true;
        this.host.removeEventListener('focus', this.focus, true);
        this.host.removeEventListener('focus', this.blur, true);
        this.host.removeEventListener('focus', this.scroll, true);
        Signal.clearData(this);
    }

    // Called when a markdown cell is either first rendered or toggled into editor mode
    refresh(): void {
        this.defaultEditor.refresh();
        const active_cell = EditorWidget.instance().tracker.activeCell;
        if (active_cell instanceof MarkdownCell && !active_cell.rendered && EditorWidget.instance().no_side_button()) {
            active_cell.editor.focus();
            EditorWidget.instance().render_side_button();
        }
    }

    // This is a dummy implementation that prevents an error in the console
    getCursorPosition(): CodeEditor.IPosition {
        return this.defaultEditor.getCursorPosition();
    }

    // This is a dummy implementation that prevents an error in the console
    getCursor(): CodeEditor.IPosition {
        return this.getCursorPosition();
    }

    // Empty stubs necessary to implement CodeEditor.IEditor, full integration may require implementing these methods
    clearHistory(): void { this.defaultEditor.clearHistory(); }
    scroll(): void { this.defaultEditor.scroll(); }
    getCoordinateForPosition(position: CodeEditor.IPosition): CodeEditor.ICoordinate { return this.defaultEditor.getCoordinateForPosition(position); }
    getLine(line: number): string | undefined { return this.defaultEditor.getLine(line); }
    getOffsetAt(position: CodeEditor.IPosition): number { return this.defaultEditor.getOffsetAt(position); }
    getOption<K extends keyof CodeEditor.IConfig>(option: K): CodeEditor.IConfig[K] { return this.defaultEditor.getOption(option); }
    getPositionAt(offset: number): CodeEditor.IPosition | undefined { return this.defaultEditor.getPositionAt(offset); }
    getPositionForCoordinate(coordinate: CodeEditor.ICoordinate): CodeEditor.IPosition | null { return undefined; }
    getSelection(): CodeEditor.IRange { return this.defaultEditor.getSelection(); }
    getSelections(): CodeEditor.IRange[] { return this.defaultEditor.getSelections(); }
    getTokenForPosition(position: CodeEditor.IPosition): CodeEditor.IToken { return this.defaultEditor.getTokenForPosition(position); }
    getTokens(): CodeEditor.IToken[] { return []; }
    hasFocus(): boolean { return this.defaultEditor.hasFocus(); }
    newIndentedLine(): void {}
    operation(func: Function): void {}
    redo(): void { this.defaultEditor.redo(); }
    removeOverlay(overlay: any): void {}
    resizeToFit(): void { this.defaultEditor.resizeToFit(); }
    revealPosition(position: CodeEditor.IPosition): void {}
    revealSelection(selection: CodeEditor.IRange): void {}
    setCursorPosition(position: CodeEditor.IPosition): void {}
    setOption<K extends keyof CodeEditor.IConfig>(option: K, value: CodeEditor.IConfig[K]): void {}
    setOptions(options: Partial<CodeEditor.IConfig>): void { this.defaultEditor.setOptions(options); }
    setSelection(selection: CodeEditor.IRange): void { this.defaultEditor.setSelection(selection); }
    setSelections(selections: CodeEditor.IRange[]): void { this.defaultEditor.setSelections(selections); }
    setSize(size: CodeEditor.IDimension | null): void { this.defaultEditor.setSize(size); }
    undo(): void { this.defaultEditor.undo(); }
    firstLine() { return this.defaultEditor.firstLine(); }
    lastLine() { return this.defaultEditor.lastLine(); }
}

/**
 * Dummy implementation prevents errors in search functionality
 */
class DummyDoc {
    sliceString(from: any, to: any) { return ''; }
    toString() { return ''; }
    get length() { return 0; }
    lineAt(index: any) { return ''; }
    line(index: any) { return ''; }
    firstLine() { return ''; }
    lastLine() { return ''; }
    getSelection() { return ''; }
    getRange(start: any, end: any) { return ''; }
    removeOverlay(overlay: any): void {}
}

export namespace TinyMCEEditor {
    export interface IOptions extends CodeEditor.IOptions { config?: Partial<IConfig>; }
    export interface IConfig extends CodeEditor.IConfig {}
}

export class TinyMCEView {
    public tinymce:any = null;

    constructor(host: HTMLElement, model: CodeEditor.IModel) {
        // Create the wrapper for TinyMCE
        const wrapper = document.createElement("div");
        host.appendChild(wrapper);

        // Wait for cell initialization before initializing editor
        setTimeout(() => {
            wrapper.innerHTML = this._getRenderText(host, model);

            try {
                TinyMCE.init({
                    target: wrapper,
                    skin: false,
                    content_css: false,
                    // content_style: contentUiCss.toString() + '\n' + contentCss.toString(),
                    branding: false,
                    contextmenu: false,
                    elementpath: false,
                    menubar: false,
                    height: 300,
                    resize: false,
                    plugins: 'emoticons lists link code',
                    toolbar: 'styleselect fontsizeselect | bold italic underline strikethrough | subscript superscript | link forecolor backcolor emoticons | bullist numlist outdent indent blockquote | code',
                    init_instance_callback: (editor: any) => {
                        // editor.on('change', () => model.value.text = editor.getContent());
                        editor.on('keyup', () => {
                            model.value.text = editor.getContent();
                        });
                    }
                }).then(editor => {
                    if (!editor.length) return; // If no valid editors, do nothing
                    editor[0].on("focus", () => {
                        const index = this.get_cell_index(model);
                        if (index !== null)
                            EditorWidget.instance().tracker.currentWidget.content.activeCellIndex = index;
                    });

                    // Hide TinyMCE by default
                    setTimeout(() => {
                        (host.querySelector('.tox-tinymce') as HTMLElement).style.display = 'none';
                    }, 200);

                    // Set the TinyMCE instance
                    this.tinymce = editor[0];

                    return editor;
                });
            }
            catch (e) {
                console.log("TinyMCE threw an error: " + e);
            }
        }, 500);
    }

    _getRenderText(host:HTMLElement, model: CodeEditor.IModel) {
        // Special case to remove anchor links before loading
        const render_node = host?.parentElement?.querySelector('.jp-MarkdownOutput');
        if (render_node) render_node.querySelectorAll('.jp-InternalAnchorLink').forEach(e => e.remove());
        return render_node?.innerHTML || model.value.text;
    }

    blur() {}

    focus() {}

    get_cell_index(model: CodeEditor.IModel) {
        const id = model.modelDB.basePath;
        const all_cells = EditorWidget.instance().tracker.currentWidget.content.widgets;
        for (let i = 0; i < all_cells.length; i++) {
            const cell = all_cells[i];
            const cell_id = cell.model.modelDB.basePath;
            if (id === cell_id) return i;
        }
        return null;
    }
}
