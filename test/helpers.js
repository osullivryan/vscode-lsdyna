'use strict';

// Intercept require('vscode') before any module tries to load it
const Module = require('module');
const vscodeMock = require('./vscode-mock');
const _load = Module._load;
Module._load = function (request, parent, isMain) {
    if (request === 'vscode') return vscodeMock;
    return _load.call(this, request, parent, isMain);
};

const { Range, Position } = vscodeMock;

/**
 * Creates a minimal fake TextDocument from a string.
 * Supports getText(), lineAt(), lineCount, getWordRangeAtPosition(), and uri.fsPath.
 */
function fakeDoc(text, fsPath = '/test/file.k') {
    const lines = text.split('\n');
    return {
        getText(range) {
            if (!range) return text;
            const { start, end } = range;
            if (start.line === end.line) return lines[start.line].slice(start.character, end.character);
            return lines.slice(start.line, end.line + 1)
                .map((l, i, a) => i === 0 ? l.slice(start.character) : i === a.length - 1 ? l.slice(0, end.character) : l)
                .join('\n');
        },
        lineCount: lines.length,
        uri: { fsPath },
        lineAt: i => ({ text: lines[i], range: new Range(i, 0, i, lines[i].length) }),
        getWordRangeAtPosition(position, regex) {
            const line = lines[position.line];
            if (!line) return undefined;
            const re = new RegExp(regex.source, 'g');
            let match;
            while ((match = re.exec(line)) !== null) {
                const start = match.index;
                const end = start + match[0].length;
                if (position.character >= start && position.character <= end) {
                    return new Range(position.line, start, position.line, end);
                }
            }
            return undefined;
        },
    };
}

module.exports = { fakeDoc, vscodeMock };
