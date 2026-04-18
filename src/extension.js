const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

// --- Folding ---

class LsDynaFoldingProvider {
    provideFoldingRanges(document) {
        const ranges = [];
        let foldStart = -1;

        for (let i = 0; i < document.lineCount; i++) {
            if (/^\*/.test(document.lineAt(i).text)) {
                if (foldStart !== -1 && i - 1 > foldStart) {
                    ranges.push(new vscode.FoldingRange(foldStart, i - 1));
                }
                foldStart = i;
            }
        }

        if (foldStart !== -1 && document.lineCount - 1 > foldStart) {
            ranges.push(new vscode.FoldingRange(foldStart, document.lineCount - 1));
        }

        return ranges;
    }
}

// --- Symbol Provider ---

class LsdynaKeywordSymbolProvider {
    provideDocumentSymbols(document) {
        const symbols = [];
        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            if (line.text.startsWith('*')) {
                symbols.push(new vscode.DocumentSymbol(
                    line.text.trim(),
                    '',
                    vscode.SymbolKind.Property,
                    line.range,
                    line.range
                ));
            }
        }
        return symbols;
    }
}

// --- Document Link Provider ---

class LsdynaDocumentLinkProvider {
    provideDocumentLinks(document) {
        const searchPaths = getSearchPath(document);
        return findIncludeFileLines(document)
            .flatMap(({ lineIndex, startChar, fileName }) => {
                try {
                    const fullPath = searchFileFromPaths(fileName, searchPaths);
                    const range = new vscode.Range(lineIndex, startChar, lineIndex, startChar + fileName.length);
                    return [new vscode.DocumentLink(range, vscode.Uri.file(fullPath))];
                } catch (e) {
                    return [];
                }
            });
    }
}

// --- Helpers ---

function findIncludeFileLines(document) {
    const results = [];
    const lines = document.getText().split('\n');
    let keyword = '';
    let cardCount = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('$')) continue;
        if (line.startsWith('*')) {
            keyword = line.trim();
            cardCount = 0;
            continue;
        }

        cardCount++;

        let filenameCard = null;
        if (keyword === '*INCLUDE') {
            filenameCard = 1;
        } else if (keyword.startsWith('*INCLUDE_MULTISCALE_SPOTWELD')) {
            filenameCard = 2;
        } else if (keyword.startsWith('*INCLUDE') && !keyword.startsWith('*INCLUDE_PATH')) {
            filenameCard = 1;
        }

        if (filenameCard !== null && cardCount === filenameCard) {
            const fileName = line.trim();
            if (fileName) {
                results.push({ lineIndex: i, startChar: line.indexOf(fileName), fileName });
            }
        }
    }

    return results;
}

// --- Parameter helpers ---

function findParameterDefinitions(document) {
    const defs = new Map(); // UPPERCASE name -> { lineIndex, startChar, length, name }
    const lines = document.getText().split('\n');
    let inParamBlock = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('$')) continue;
        if (line.startsWith('*')) {
            const kw = line.trim();
            inParamBlock = kw === '*PARAMETER' || kw.startsWith('*PARAMETER_');
            continue;
        }
        if (!inParamBlock) continue;

        // Format: R  paramName  value  (type is single char R/I/C)
        const m = line.match(/^(\s*[RICric]\s+)(\w+)\s+(.*\S)/);
        if (m) {
            const startChar = m[1].length;
            const name = m[2];
            const value = m[3];
            defs.set(name.toUpperCase(), { lineIndex: i, startChar, length: name.length, name, value });
        }
    }
    return defs;
}

function findParameterReferences(document) {
    const defs = findParameterDefinitions(document);
    const refs = [];
    const lines = document.getText().split('\n');
    const ampPattern = /&(\w+)/g;
    let inExprBlock = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('$')) continue;
        if (line.startsWith('*')) {
            inExprBlock = line.trim().startsWith('*PARAMETER_EXPRESSION');
            continue;
        }

        // Standard &name references anywhere in the file
        ampPattern.lastIndex = 0;
        let m;
        while ((m = ampPattern.exec(line)) !== null) {
            refs.push({ name: m[1].toUpperCase(), lineIndex: i, startChar: m.index, length: m[0].length });
        }

        // Bare name references in *PARAMETER_EXPRESSION value expressions
        if (inExprBlock) {
            const defMatch = line.match(/^(\s*[RICric]\s+\w+\s+)/);
            if (defMatch) {
                const exprStart = defMatch[1].length;
                const barePattern = /\b([A-Za-z]\w*)\b/g;
                let bm;
                while ((bm = barePattern.exec(line.slice(exprStart))) !== null) {
                    const nameUpper = bm[1].toUpperCase();
                    if (defs.has(nameUpper)) {
                        refs.push({ name: nameUpper, lineIndex: i, startChar: exprStart + bm.index, length: bm[1].length });
                    }
                }
            }
        }
    }
    return refs;
}

function getParameterAtCursor(document, position) {
    const line = document.lineAt(position.line).text;

    // On a &reference
    const refRange = document.getWordRangeAtPosition(position, /&\w+/);
    if (refRange) {
        return { name: document.getText(refRange).slice(1), range: refRange };
    }

    // On a definition line under *PARAMETER*
    const lines = document.getText().split('\n');
    let keyword = '';
    for (let i = position.line; i >= 0; i--) {
        if (lines[i].startsWith('$')) continue;
        if (lines[i].startsWith('*')) { keyword = lines[i].trim(); break; }
    }
    if (keyword === '*PARAMETER' || keyword.startsWith('*PARAMETER_')) {
        const m = line.match(/^(\s*[RICric]\s+)(\w+)/);
        if (m) {
            const startChar = m[1].length;
            const name = m[2];
            const range = new vscode.Range(position.line, startChar, position.line, startChar + name.length);
            if (range.contains(position)) return { name, range };
        }
    }

    // Bare name reference in a *PARAMETER_EXPRESSION value (e.g. TEnd in "TEnd/100.0")
    if (keyword.startsWith('*PARAMETER_EXPRESSION')) {
        const defMatch = line.match(/^(\s*[RICric]\s+\w+\s+)/);
        if (defMatch && position.character >= defMatch[1].length) {
            const wordRange = document.getWordRangeAtPosition(position, /[A-Za-z]\w*/);
            if (wordRange) {
                const word = document.getText(wordRange);
                const defs = findParameterDefinitions(document);
                if (defs.has(word.toUpperCase())) {
                    return { name: word, range: wordRange };
                }
            }
        }
    }

    return null;
}

// --- Parameter providers ---

class LsdynaDefinitionProvider {
    provideDefinition(document, position) {
        const param = getParameterAtCursor(document, position);
        if (!param) return null;
        const def = findParameterDefinitions(document).get(param.name.toUpperCase());
        if (!def) return null;
        return new vscode.Location(document.uri, new vscode.Position(def.lineIndex, def.startChar));
    }
}

class LsdynaReferenceProvider {
    provideReferences(document, position, context) {
        const param = getParameterAtCursor(document, position);
        if (!param) return [];
        const nameUpper = param.name.toUpperCase();
        const locations = [];

        if (context.includeDeclaration) {
            const def = findParameterDefinitions(document).get(nameUpper);
            if (def) {
                locations.push(new vscode.Location(document.uri,
                    new vscode.Range(def.lineIndex, def.startChar, def.lineIndex, def.startChar + def.length)));
            }
        }

        for (const ref of findParameterReferences(document)) {
            if (ref.name === nameUpper) {
                locations.push(new vscode.Location(document.uri,
                    new vscode.Range(ref.lineIndex, ref.startChar, ref.lineIndex, ref.startChar + ref.length)));
            }
        }
        return locations;
    }
}

class LsdynaRenameProvider {
    prepareRename(document, position) {
        const param = getParameterAtCursor(document, position);
        if (!param) throw new Error('Cannot rename this symbol.');
        return param.range;
    }

    provideRenameEdits(document, position, newName) {
        const param = getParameterAtCursor(document, position);
        if (!param) return null;
        const nameUpper = param.name.toUpperCase();
        const edit = new vscode.WorkspaceEdit();

        const def = findParameterDefinitions(document).get(nameUpper);
        if (def) {
            edit.replace(document.uri,
                new vscode.Range(def.lineIndex, def.startChar, def.lineIndex, def.startChar + def.length),
                newName);
        }

        for (const ref of findParameterReferences(document)) {
            if (ref.name === nameUpper) {
                // replace just the name part after &
                edit.replace(document.uri,
                    new vscode.Range(ref.lineIndex, ref.startChar + 1, ref.lineIndex, ref.startChar + ref.length),
                    newName);
            }
        }
        return edit;
    }
}

// ---------------------------------------------------------------------------
// Keyword field hover
// ---------------------------------------------------------------------------

let _fieldData = null;

function getFieldData() {
    if (!_fieldData) {
        const dataPath = path.join(__dirname, '..', 'keywords', 'field_data.json');
        try {
            _fieldData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        } catch {
            _fieldData = {};
        }
    }
    return _fieldData;
}

function lookupKeyword(name) {
    const data = getFieldData();
    if (data[name]) return data[name];
    const tokens = name.split('_');
    for (let i = tokens.length - 1; i >= 1; i--) {
        const candidate = tokens.slice(0, i).join('_');
        if (data[candidate]) return data[candidate];
    }
    return null;
}

function keywordHoverMarkdown(kwName, entry) {
    const cards = entry.c;
    const lines = [`**\\*${kwName}**`];
    let cardNum = 1;
    for (const card of cards) {
        if (!card.length) continue;
        const isWide = card.length === 1 && card[0].w >= 40;
        if (isWide) {
            lines.push(`\n*Card ${cardNum} (title):* ${card[0].n}`);
        } else {
            const names = card.map(f => f.n).join(', ');
            lines.push(`\n*Card ${cardNum}:* ${names}`);
        }
        cardNum++;
    }
    if (entry.r) lines.push('\n*Last card repeats for each data row.*');
    return lines.join('\n');
}

class LsdynaFieldHoverProvider {
    provideHover(document, position) {
        const line = document.lineAt(position.line);
        const text = line.text;
        const trimmed = text.trimStart();

        // Hover on keyword lines
        if (trimmed.startsWith('*')) {
            const kwName = trimmed.slice(1).toUpperCase().split(/[\s,$]/)[0];
            if (!kwName) return null;
            const entry = lookupKeyword(kwName);
            if (!entry) return null;
            const md = new vscode.MarkdownString(keywordHoverMarkdown(kwName, entry));
            return new vscode.Hover(md);
        }

        // Skip comment lines
        if (trimmed.startsWith('$')) return null;

        // Find the enclosing keyword line
        let kwLine = null;
        for (let i = position.line - 1; i >= 0; i--) {
            const t = document.lineAt(i).text.trimStart();
            if (t.startsWith('*')) { kwLine = i; break; }
        }
        if (kwLine === null) return null;

        const kwText = document.lineAt(kwLine).text.trim();
        const kwName = kwText.slice(1).toUpperCase().split(/[\s,]/)[0];
        const entry = lookupKeyword(kwName);
        if (!entry) return null;

        // Count which card index this line is (skip comments between keyword and here)
        let cardIndex = 0;
        for (let i = kwLine + 1; i < position.line; i++) {
            const t = document.lineAt(i).text.trimStart();
            if (!t.startsWith('$') && t.length > 0) cardIndex++;
        }

        const cards = entry.c;
        // For repeating keywords, clamp to last card
        const clampedIndex = entry.r ? Math.min(cardIndex, cards.length - 1) : cardIndex;
        const card = cards[clampedIndex];
        if (!card || card.length === 0) return null;

        const col = position.character;
        const field = card.find(f => col >= f.p && col < f.p + f.w);
        if (!field) return null;

        const typeLabel = field.t ? ` *(${field.t})*` : '';
        const helpText = field.h ? `\n\n${field.h}` : '';
        const md = new vscode.MarkdownString(`**${field.n}**${typeLabel}${helpText}`);
        const range = new vscode.Range(position.line, field.p, position.line, field.p + field.w);
        return new vscode.Hover(md, range);
    }
}

class LsdynaParameterCodeLensProvider {
    provideCodeLenses(document) {
        const defs = findParameterDefinitions(document);
        const refs = findParameterReferences(document);
        const lenses = [];
        for (const [key, def] of defs) {
            const count = refs.filter(r => r.name === key).length;
            const pos = new vscode.Position(def.lineIndex, def.startChar);
            const range = new vscode.Range(pos, pos);
            lenses.push(new vscode.CodeLens(range, {
                title: count === 1 ? '1 reference' : `${count} references`,
                command: 'editor.action.findReferences',
                arguments: [document.uri, pos],
            }));
        }
        return lenses;
    }
}

class LsdynaInlayHintsProvider {
    provideInlayHints(document, range) {
        const defs = findParameterDefinitions(document);
        const hints = [];
        const pattern = /&(\w+)/g;

        for (let i = range.start.line; i <= range.end.line; i++) {
            const line = document.lineAt(i).text;
            if (line.startsWith('$')) continue;
            pattern.lastIndex = 0;
            let m;
            while ((m = pattern.exec(line)) !== null) {
                const def = defs.get(m[1].toUpperCase());
                if (def?.value) {
                    const hint = new vscode.InlayHint(
                        new vscode.Position(i, m.index + m[0].length),
                        ` = ${def.value}`,
                        vscode.InlayHintKind.Parameter
                    );
                    hints.push(hint);
                }
            }
        }
        return hints;
    }
}

function getSearchPath(document) {
    const textPath = path.dirname(document.uri.fsPath);
    const paths = [textPath];
    const lines = document.getText().split('\n');
    let keyword = '';
    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (!trimmed || trimmed.startsWith('$')) continue;
        if (trimmed.startsWith('*')) { keyword = trimmed; continue; }
        if (keyword === '*INCLUDE_PATH') {
            paths.push(trimmed);
        } else if (keyword === '*INCLUDE_PATH_RELATIVE') {
            paths.push(path.resolve(textPath, trimmed));
        }
    }
    return paths;
}

function startLineOfCurrentKeyword(lines, lineindex) {
    for (let i = lineindex; i >= 0; i--) {
        if (lines[i].startsWith('*')) return i;
    }
    throw new Error('Not on any keyword.');
}

function endLineOfCurrentKeyword(lines, lineindex) {
    for (let i = lineindex + 1; i < lines.length; i++) {
        if (lines[i].startsWith('*')) return i - 1;
    }
    return lines.length - 1;
}

function getFilenameFromCurrentCard(lines, lineindex) {
    if (lines[lineindex].startsWith('*')) lineindex++;
    while (!lines[lineindex].startsWith('*')) {
        if (lines[lineindex].startsWith('$')) { lineindex++; continue; }
        return lines[lineindex].trim();
    }
    throw new Error('No file to jump to.');
}

function getFileNameFromNthCard(lines, lineindex, nth) {
    let card = 1;
    for (let i = lineindex + 1; !lines[i].startsWith('*'); i++) {
        if (lines[i].startsWith('$')) continue;
        if (card === nth) return lines[i].trim();
        card++;
    }
    throw new Error('No file to jump to.');
}

function getFilenameFromKeyword(lines, lineindex) {
    const linestart = startLineOfCurrentKeyword(lines, lineindex);
    const keyword = lines[linestart].trim();
    if (keyword === '*INCLUDE') {
        return getFilenameFromCurrentCard(lines, lineindex);
    } else if (keyword.startsWith('*INCLUDE_PATH')) {
        throw new Error('This keyword does not have a filename card.');
    } else if (keyword.startsWith('*INCLUDE_MULTISCALE_SPOTWELD')) {
        return getFileNameFromNthCard(lines, linestart, 2);
    } else if (keyword.startsWith('*INCLUDE')) {
        return getFileNameFromNthCard(lines, linestart, 1);
    } else {
        throw new Error('This keyword is not supported.');
    }
}

function searchFileFromPaths(filePath, paths) {
    for (const searchPath of paths) {
        const fullPath = path.resolve(searchPath, filePath);
        if (fs.existsSync(fullPath)) return fullPath;
    }
    throw new Error(`${filePath} not found.`);
}

function findNextKeyword(lines, currentLine) {
    for (let i = currentLine + 1; i < lines.length; i++) {
        if (lines[i].startsWith('*')) return i;
    }
    throw new Error('No more keywords found.');
}

function findPreviousKeyword(lines, currentLine) {
    for (let i = currentLine - 1; i >= 0; i--) {
        if (lines[i].startsWith('*')) return i;
    }
    throw new Error('No previous keywords found.');
}

// --- Shared include traversal ---

function collectIncludeFiles(filePath, visited = new Set()) {
    if (visited.has(filePath) || !fs.existsSync(filePath)) return [];
    visited.add(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const fakeDoc = { getText: () => content, uri: { fsPath: filePath } };
    const searchPaths = getSearchPath(fakeDoc);
    const files = [filePath];
    for (const { fileName } of findIncludeFileLines(fakeDoc)) {
        try {
            files.push(...collectIncludeFiles(searchFileFromPaths(fileName, searchPaths), new Set(visited)));
        } catch (e) { /* unresolvable, skip */ }
    }
    return files;
}

// --- Include tree ---

class IncludeItem extends vscode.TreeItem {
    constructor(filePath, exists) {
        super(path.basename(filePath), vscode.TreeItemCollapsibleState.Collapsed);
        this.filePath = filePath;
        this.children = [];
        this.tooltip = filePath;
        this.iconPath = new vscode.ThemeIcon(exists ? 'file' : 'warning');
        if (!exists) this.description = 'not found';
        if (exists) {
            this.command = { command: 'vscode.open', title: 'Open', arguments: [vscode.Uri.file(filePath)] };
        }
    }
}

class LsdynaIncludeTreeProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.root = null;
    }

    scan() {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'lsdyna') {
            vscode.window.showWarningMessage('Open an LS-DYNA file first.');
            return;
        }
        this.root = this._buildItem(editor.document.uri.fsPath, new Set());
        this.root.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
        this._onDidChangeTreeData.fire(undefined);
    }

    _buildItem(filePath, visited) {
        const exists = fs.existsSync(filePath);
        const item = new IncludeItem(filePath, exists);

        if (!exists || visited.has(filePath)) {
            item.collapsibleState = vscode.TreeItemCollapsibleState.None;
            return item;
        }

        visited.add(filePath);
        const content = fs.readFileSync(filePath, 'utf8');
        const fakeDoc = { getText: () => content, uri: { fsPath: filePath } };
        const searchPaths = getSearchPath(fakeDoc);

        for (const { fileName } of findIncludeFileLines(fakeDoc)) {
            let childPath, childExists;
            try {
                childPath = searchFileFromPaths(fileName, searchPaths);
                childExists = true;
            } catch (e) {
                childPath = path.resolve(path.dirname(filePath), fileName);
                childExists = false;
            }
            item.children.push(this._buildItem(childPath, new Set(visited)));
        }

        item.collapsibleState = item.children.length > 0
            ? vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.None;

        return item;
    }

    getTreeItem(element) { return element; }
    getChildren(element) {
        if (!this.root) return [];
        return element ? element.children : [this.root];
    }
}

// --- Keyword index ---

class KeywordItem extends vscode.TreeItem {
    constructor(keyword) {
        super(keyword, vscode.TreeItemCollapsibleState.Collapsed);
        this.children = [];
        this.iconPath = new vscode.ThemeIcon('symbol-keyword');
    }
}

class KeywordUsageItem extends vscode.TreeItem {
    constructor(filePath, lineIndex, rootDir) {
        const rel = path.relative(rootDir, filePath);
        super(`${rel}  :${lineIndex + 1}`, vscode.TreeItemCollapsibleState.None);
        this.iconPath = new vscode.ThemeIcon('file');
        this.tooltip = `${filePath}:${lineIndex + 1}`;
        this.command = {
            command: 'extension.goToKeywordUsage',
            title: 'Go to keyword',
            arguments: [filePath, lineIndex],
        };
    }
}

class LsdynaKeywordIndexProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.roots = [];
        this._mode = 'local'; // 'local' | 'recursive'
    }

    _setMode(mode) {
        this._mode = mode;
        vscode.commands.executeCommand('setContext', 'lsdyna.keywordIndexMode', mode);
    }

    _buildRoots(filePaths, rootDir) {
        const keywordMap = new Map();
        for (const filePath of filePaths) {
            const lines = fs.existsSync(filePath)
                ? fs.readFileSync(filePath, 'utf8').split('\n')
                : filePath.split('\n'); // accept raw text for single-doc case
            for (let i = 0; i < lines.length; i++) {
                const trimmed = lines[i].trim();
                if (!trimmed.startsWith('*')) continue;
                const keyword = trimmed.slice(1);
                if (!keyword) continue;
                if (!keywordMap.has(keyword)) keywordMap.set(keyword, []);
                keywordMap.get(keyword).push({ filePath, lineIndex: i });
            }
        }
        return [...keywordMap.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([keyword, usages]) => {
                const item = new KeywordItem(keyword);
                item.children = usages.map(({ filePath, lineIndex }) =>
                    new KeywordUsageItem(filePath, lineIndex, rootDir)
                );
                return item;
            });
    }

    refreshFromDocument(document) {
        if (this._mode !== 'local') return;
        if (!document || document.languageId !== 'lsdyna') return;
        const filePath = document.uri.fsPath;
        const rootDir = path.dirname(filePath);
        const lines = document.getText().split('\n');
        const keywordMap = new Map();
        for (let i = 0; i < lines.length; i++) {
            const trimmed = lines[i].trim();
            if (!trimmed.startsWith('*')) continue;
            const keyword = trimmed.slice(1);
            if (!keyword) continue;
            if (!keywordMap.has(keyword)) keywordMap.set(keyword, []);
            keywordMap.get(keyword).push({ filePath, lineIndex: i });
        }
        this.roots = [...keywordMap.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([keyword, usages]) => {
                const item = new KeywordItem(keyword);
                item.children = usages.map(({ filePath, lineIndex }) =>
                    new KeywordUsageItem(filePath, lineIndex, rootDir)
                );
                return item;
            });
        this._onDidChangeTreeData.fire(undefined);
    }

    scan() {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'lsdyna') {
            vscode.window.showWarningMessage('Open an LS-DYNA file first.');
            return;
        }
        const rootFile = editor.document.uri.fsPath;
        const rootDir = path.dirname(rootFile);
        this.roots = this._buildRoots(collectIncludeFiles(rootFile), rootDir);
        this._setMode('recursive');
        this._onDidChangeTreeData.fire(undefined);
    }

    setLocal() {
        this._setMode('local');
        if (vscode.window.activeTextEditor) {
            this.refreshFromDocument(vscode.window.activeTextEditor.document);
        } else {
            this.roots = [];
            this._onDidChangeTreeData.fire(undefined);
        }
    }

    getTreeItem(element) { return element; }
    getChildren(element) {
        if (element) return element.children;
        return this.roots;
    }
}

// --- Activate ---

function activate(context) {
    context.subscriptions.push(
        vscode.languages.registerFoldingRangeProvider({ language: 'lsdyna' }, new LsDynaFoldingProvider())
    );

    context.subscriptions.push(
        vscode.languages.registerDocumentSymbolProvider({ language: 'lsdyna' }, new LsdynaKeywordSymbolProvider())
    );

    context.subscriptions.push(
        vscode.languages.registerDocumentLinkProvider({ language: 'lsdyna' }, new LsdynaDocumentLinkProvider())
    );

    context.subscriptions.push(
        vscode.languages.registerHoverProvider({ language: 'lsdyna' }, new LsdynaFieldHoverProvider())
    );
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider({ language: 'lsdyna' }, new LsdynaParameterCodeLensProvider())
    );
    context.subscriptions.push(
        vscode.languages.registerInlayHintsProvider({ language: 'lsdyna' }, new LsdynaInlayHintsProvider())
    );

    const includeTreeProvider = new LsdynaIncludeTreeProvider();
    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('lsdynaIncludeTree', includeTreeProvider)
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('extension.scanIncludeTree', () => includeTreeProvider.scan())
    );

    const keywordIndexProvider = new LsdynaKeywordIndexProvider();
    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('lsdynaKeywordIndex', keywordIndexProvider)
    );
    vscode.commands.executeCommand('setContext', 'lsdyna.keywordIndexMode', 'local');
    context.subscriptions.push(
        vscode.commands.registerCommand('extension.scanKeywordIndex', () => keywordIndexProvider.scan())
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('extension.keywordIndexSetLocal', () => keywordIndexProvider.setLocal())
    );

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => keywordIndexProvider.refreshFromDocument(editor?.document))
    );
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(e => {
            if (vscode.window.activeTextEditor?.document === e.document) {
                keywordIndexProvider.refreshFromDocument(e.document);
            }
        })
    );

    if (vscode.window.activeTextEditor) {
        keywordIndexProvider.refreshFromDocument(vscode.window.activeTextEditor.document);
    }
    context.subscriptions.push(
        vscode.commands.registerCommand('extension.goToKeywordUsage', (filePath, lineIndex) => {
            vscode.workspace.openTextDocument(filePath).then(doc => {
                const pos = new vscode.Position(lineIndex, 0);
                vscode.window.showTextDocument(doc, { selection: new vscode.Range(pos, pos) });
            });
        })
    );

    const diagnostics = vscode.languages.createDiagnosticCollection('lsdyna');
    context.subscriptions.push(diagnostics);

    function updateDiagnostics(document) {
        if (document.languageId !== 'lsdyna') return;
        const issues = [];
        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            if (!line.text.startsWith('$') && line.text.length > 80) {
                issues.push(new vscode.Diagnostic(
                    new vscode.Range(i, 80, i, line.text.length),
                    `Line exceeds 80 characters (${line.text.length}); LS-DYNA may truncate it`,
                    vscode.DiagnosticSeverity.Warning
                ));
            }
        }
        diagnostics.set(document.uri, issues);
    }

    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(doc => updateDiagnostics(doc))
    );
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(e => updateDiagnostics(e.document))
    );
    context.subscriptions.push(
        vscode.workspace.onDidCloseTextDocument(doc => diagnostics.delete(doc.uri))
    );
    vscode.workspace.textDocuments.forEach(updateDiagnostics);

    context.subscriptions.push(
        vscode.languages.registerDefinitionProvider({ language: 'lsdyna' }, new LsdynaDefinitionProvider())
    );
    context.subscriptions.push(
        vscode.languages.registerReferenceProvider({ language: 'lsdyna' }, new LsdynaReferenceProvider())
    );
    context.subscriptions.push(
        vscode.languages.registerRenameProvider({ language: 'lsdyna' }, new LsdynaRenameProvider())
    );

    // Decorations: green for resolved paths, yellow for missing ones
    const resolvedDecoration = vscode.window.createTextEditorDecorationType({
        color: new vscode.ThemeColor('textLink.foreground'),
    });
    const missingDecoration = vscode.window.createTextEditorDecorationType({
        color: new vscode.ThemeColor('editorWarning.foreground'),
        fontStyle: 'italic',
    });
    context.subscriptions.push(resolvedDecoration, missingDecoration);

    function updateDecorations(editor) {
        if (!editor || editor.document.languageId !== 'lsdyna') return;
        const searchPaths = getSearchPath(editor.document);
        const resolved = [];
        const missing = [];

        for (const { lineIndex, startChar, fileName } of findIncludeFileLines(editor.document)) {
            const range = new vscode.Range(lineIndex, startChar, lineIndex, startChar + fileName.length);
            try {
                searchFileFromPaths(fileName, searchPaths);
                resolved.push({ range });
            } catch (e) {
                missing.push({ range });
            }
        }

        editor.setDecorations(resolvedDecoration, resolved);
        editor.setDecorations(missingDecoration, missing);
    }

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => updateDecorations(editor))
    );
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            if (vscode.window.activeTextEditor?.document === event.document) {
                updateDecorations(vscode.window.activeTextEditor);
            }
        })
    );

    updateDecorations(vscode.window.activeTextEditor);

    function updateIncludeLineContext(editor) {
        if (!editor || editor.document.languageId !== 'lsdyna') {
            vscode.commands.executeCommand('setContext', 'lsdyna.onIncludeLine', false);
            return;
        }
        const currentLine = editor.selection.active.line;
        const onInclude = findIncludeFileLines(editor.document)
            .some(({ lineIndex }) => lineIndex === currentLine);
        vscode.commands.executeCommand('setContext', 'lsdyna.onIncludeLine', onInclude);
    }

    context.subscriptions.push(
        vscode.window.onDidChangeTextEditorSelection(e => updateIncludeLineContext(e.textEditor))
    );
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => updateIncludeLineContext(editor))
    );

    updateIncludeLineContext(vscode.window.activeTextEditor);

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.openIncludeFile', () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) return;
            const lines = editor.document.getText().split('\n');
            try {
                const fullPath = searchFileFromPaths(
                    getFilenameFromKeyword(lines, editor.selection.active.line),
                    getSearchPath(editor.document)
                );
                vscode.workspace.openTextDocument(fullPath).then(doc => vscode.window.showTextDocument(doc));
            } catch (error) {
                vscode.window.showErrorMessage(error.message);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.selectKeyword', () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) return;
            const lines = editor.document.getText().split('\n');
            const currentLine = editor.selection.active.line;
            try {
                const startLine = startLineOfCurrentKeyword(lines, currentLine);
                const endLine = endLineOfCurrentKeyword(lines, currentLine);
                editor.selection = new vscode.Selection(
                    new vscode.Position(startLine, 0),
                    new vscode.Position(endLine + 1, 0)
                );
            } catch (error) {
                vscode.window.showErrorMessage(error.message);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.jumpToNextKeyword', () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) return;
            const lines = editor.document.getText().split('\n');
            try {
                const nextLine = findNextKeyword(lines, editor.selection.active.line);
                const position = new vscode.Position(nextLine, 0);
                editor.selection = new vscode.Selection(position, position);
                editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
            } catch (error) {
                vscode.window.showErrorMessage(error.message);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.jumpToPreviousKeyword', () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) return;
            const lines = editor.document.getText().split('\n');
            try {
                const prevLine = findPreviousKeyword(lines, editor.selection.active.line);
                const position = new vscode.Position(prevLine, 0);
                editor.selection = new vscode.Selection(position, position);
                editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
            } catch (error) {
                vscode.window.showErrorMessage(error.message);
            }
        })
    );
}

function deactivate() {}

module.exports = { activate, deactivate };

// Exported for unit testing
module.exports._internals = {
    findParameterDefinitions,
    findParameterReferences,
    findIncludeFileLines,
    getSearchPath,
    getParameterAtCursor,
    startLineOfCurrentKeyword,
    endLineOfCurrentKeyword,
    getFilenameFromKeyword,
    searchFileFromPaths,
    findNextKeyword,
    findPreviousKeyword,
};
