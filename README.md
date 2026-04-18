# VS Code LS-DYNA extension
<img alt="Visual Studio Marketplace Version" src="https://img.shields.io/visual-studio-marketplace/v/ryanosullivan.lsdyna?style=for-the-badge">
<img alt="GitHub Actions" src="https://img.shields.io/github/actions/workflow/status/osullivryan/vscode-lsdyna/master_ci.yaml?branch=master&style=for-the-badge&label=CI">

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
![sidebar.png](./images/sidebar.png)

**Diagnostics**
- Lines exceeding 80 characters (excluding comments) are flagged as warnings

**Snippets**
- Tab-completable snippets for common LS-DYNA keywords

**LS-PrePost**
- Syntax highlighting for `.cfile` command files

### Settings

The extension respects standard VS Code settings. Some useful ones for LS-DYNA files:

| Setting | Default | Description |
|---|---|---|
| `editor.hover.enabled` | `true` | Show keyword and field hover tooltips |
| `editor.inlayHints.enabled` | `on` | Show resolved parameter values inline |
| `editor.codeLens` | `true` | Show "N references" above parameter definitions |
| `editor.wordWrap` | `off` | Word wrap (off by default for fixed-width columns) |

These can be scoped to LS-DYNA files only by adding them under `"[lsdyna]"` in your `settings.json`:

```json
"[lsdyna]": {
    "editor.hover.enabled": false,
    "editor.inlayHints.enabled": "off"
}
```

### Keyword Data

Snippets and hover documentation are generated from the [pydyna](https://github.com/ansys/pydyna) keyword database (`kwd.json`), which is maintained by Ansys and covers 3168 LS-DYNA keywords with full field definitions, types, defaults, and help text. This data is used at build time only — it is not bundled in the extension.

To regenerate after updating pydyna:

```bash
# Clone pydyna as a sibling of this repo (one-time setup)
git clone https://github.com/ansys/pydyna ../pydyna

# Regenerate snippets and hover field data
python keywords/generate_from_pydyna.py
```

This overwrites `snippets/lsdyna.json` and `keywords/field_data.json`.

### Contributing new Keywords

There are a few ways you can go about adding keywords or features:

1. Send me an email or message on Github with the desired keyword (and an example).
2. Make a pull request:
    1. Create a fork of the master.
    2. Clone [pydyna](https://github.com/ansys/pydyna) as a sibling directory (`../pydyna`).
    3. Run `python keywords/generate_from_pydyna.py` from the repo root to regenerate `snippets/lsdyna.json` from the full pydyna keyword database (3168 keywords).
    4. Create a new pull request to merge your branch into master.

### Contributors

- [osullivryan](https://github.com/osullivryan)
- [yshl](https://github.com/yshl)
- [maxiiss](https://github.com/maxiiss)

### Some References

[vim-lsdyna](https://github.com/gradzikb/vim-lsdyna)  
[DCHartlen's vscode extension](https://github.com/DCHartlen/LSDynaForVSCode)