'use strict';

class Position {
    constructor(line, character) { this.line = line; this.character = character; }
}

class Range {
    constructor(startLine, startChar, endLine, endChar) {
        this.start = new Position(startLine, startChar);
        this.end = new Position(endLine, endChar);
    }
    contains(pos) {
        if (pos.line < this.start.line || pos.line > this.end.line) return false;
        if (pos.line === this.start.line && pos.character < this.start.character) return false;
        if (pos.line === this.end.line && pos.character > this.end.character) return false;
        return true;
    }
}

module.exports = {
    Position,
    Range,
    Uri: { file: p => ({ fsPath: p }) },
    FoldingRange: class FoldingRange { constructor(s, e) { this.start = s; this.end = e; } },
    DocumentSymbol: class DocumentSymbol {},
    DocumentLink: class DocumentLink { constructor(r, t) { this.range = r; this.target = t; } },
    InlayHint: class InlayHint { constructor(p, l) { this.position = p; this.label = l; } },
    InlayHintKind: { Parameter: 2 },
    Diagnostic: class Diagnostic { constructor(r, m, s) { this.range = r; this.message = m; this.severity = s; } },
    DiagnosticSeverity: { Warning: 1 },
    SymbolKind: { Property: 6 },
    ThemeColor: class ThemeColor {},
    ThemeIcon: class ThemeIcon {},
    TreeItem: class TreeItem { constructor(l, s) { this.label = l; this.collapsibleState = s; } },
    TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
    EventEmitter: class EventEmitter { constructor() { this.event = null; } fire() {} },
    window: { activeTextEditor: null, showErrorMessage: () => {}, showWarningMessage: () => {} },
    workspace: { textDocuments: [], onDidOpenTextDocument: () => ({}), onDidChangeTextDocument: () => ({}), onDidCloseTextDocument: () => ({}) },
    languages: { registerFoldingRangeProvider: () => ({}), registerDocumentSymbolProvider: () => ({}), registerDocumentLinkProvider: () => ({}), registerInlayHintsProvider: () => ({}), registerDefinitionProvider: () => ({}), registerReferenceProvider: () => ({}), registerRenameProvider: () => ({}), createDiagnosticCollection: () => ({ set: () => {}, delete: () => {} }) },
    commands: { registerCommand: () => ({}), executeCommand: () => {} },
};
