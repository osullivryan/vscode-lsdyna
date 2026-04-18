# VS Code LS-DYNA extension
<img alt="Visual Studio Marketplace Version" src="https://img.shields.io/visual-studio-marketplace/v/ryanosullivan.lsdyna?style=for-the-badge">
<img alt="GitHub Workflow Status" src="https://img.shields.io/github/workflow/status/osullivryan/vscode-lsdyna/Release Vscode Plugin?style=for-the-badge">

## Integrates [LS-DYNA](https://www.lstc.com/) into VS Code.

This extension integrates LS-DYNA formatting, keyword snippets, and language tooling into VS Code.

### Example
![](images/Example.gif)

### Features

**Syntax & Navigation**
- Syntax highlighting for `.k`, `.key`, and `.dyna` files
- Keyword folding — each `*KEYWORD` block collapses independently
- Jump to next/previous keyword: `Ctrl+Alt+Down` / `Ctrl+Alt+Up`
- Select the current keyword block via the right-click context menu
- Word wrap off by default for fixed-width column alignment

**Include Files**
- `*INCLUDE` filenames are highlighted green (resolved) or red (missing)
- Right-click an include filename → **Open \*INCLUDE File**, or Ctrl/Cmd+Click
- Resolves `*INCLUDE_PATH`, `*INCLUDE_PATH_RELATIVE`, and `../` style relative paths

**Parameters**
- Go to Definition and Find All References for `&parameter` names (Ctrl/Cmd+Click)
- Rename parameter across the file (F2)
- Inlay hints show the resolved value of each `&parameter` reference inline
- "N references" CodeLens above each parameter definition — click to open the References panel
- Bare variable names in `*PARAMETER_EXPRESSION` values are highlighted the same color as `&param` references

**Sidebar Panel**
- **Include Tree** — recursively scans all `*INCLUDE` files and displays them as a tree; click any entry to open the file
- **Keyword Index** — shows all keywords used in the current file (local mode) or the full include tree (recursive mode); toggle between modes with the toolbar buttons

**Diagnostics**
- Lines exceeding 80 characters (excluding comments) are flagged as warnings

**Snippets**
- Tab-completable snippets for common LS-DYNA keywords

**LS-PrePost**
- Syntax highlighting for `.cfile` command files

### Contributing new Keywords

There are a few ways you can go about adding keywords or features:

1. Send me an email or message on Github with the desired keyword (and an example).
2. Make a pull request:
    1. Create a fork of the master.
    2. Add your new keyword(s) under the `keywords/` directory.
    3. Run `python keywords/process_keywords.py` from the repo root to regenerate `snippets/lsdyna.json`.
    4. Create a new pull request to merge your branch into master.

### Some References

[vim-lsdyna](https://github.com/gradzikb/vim-lsdyna)  
[DCHartlen's vscode extension](https://github.com/DCHartlen/LSDynaForVSCode)