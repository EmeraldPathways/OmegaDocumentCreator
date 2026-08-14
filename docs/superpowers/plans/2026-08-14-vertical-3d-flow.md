# Vertical 3D Flow Repository Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generated repo-vizmap Isometric Overview with a readable, vertically scrolling 3D flow view while preserving the existing Readable Tree, search, selection, inspector, and relationship data.

**Architecture:** The bundled Python generator remains the single source for the self-contained HTML artifact. Its template will expose a `flowView` containing HTML node cards and an SVG connector layer; the existing visible-node traversal supplies both modes with the same collapsed/search-filtered hierarchy. A measured orthogonal connector renderer will draw parent-child paths and selected-node dependency paths after cards are laid out.

**Tech Stack:** Python 3 standard library generator, self-contained HTML, CSS, vanilla JavaScript, SVG connectors, PowerShell validation commands, Node.js syntax compilation.

## Global Constraints

- Keep the Readable Tree as the default mode and preserve its existing controls and inspector behavior.
- Replace the Isometric Overview rather than adding a third view; remove its button, SVG scene, pan/zoom state, renderer, and event handlers.
- Keep node names horizontal and readable; vertical scrolling handles expanded depth.
- Keep repository scanning, dependency detection, metadata fields, and output filename unchanged.
- Use only the existing generator and browser platform; do not add dependencies.
- Omit dependency connectors whose target is not currently visible, while retaining those relationships in the inspector lists.

---

### Task 1: Change the generated view shell from isometric to vertical flow

**Files:**
- Modify: `C:\Users\dubli\.codex\skills\repo-vizmap\scripts\repo_vizmap.py` — `HTML_TEMPLATE` CSS and markup.
- Regenerated later: `repo-vizmap.html`.

**Interfaces:**
- Produces the DOM IDs `flowMode`, `flowView`, `flowRows`, and `flowRelations` for the renderer in Task 2.
- Removes the DOM IDs `isoMode`, `isoView`, `isoMap`, `isoScene`, `isoConnectors`, and `isoNodes`.

- [ ] **Step 1: Replace the toolbar mode control and canvas markup**

Change the second mode control and view shell to this structure in `HTML_TEMPLATE`:

```html
<button class="modeButton" id="flowMode" type="button">3D FLOW</button>
<div class="view flowView hidden" id="flowView">
  <div class="flowRows" id="flowRows">
    <svg class="flowRelations" id="flowRelations" aria-hidden="true"></svg>
  </div>
</div>
```

Keep the Readable Tree markup, `SHOW FILE LINKS`, expand/collapse buttons, and hint text in place.

- [ ] **Step 2: Add the flow card and connector styles**

Add styles with these behaviors: `.flowView` scrolls in both directions when necessary; `.flowRows` is a positioned content surface with a readable minimum width; `.flowRow` reserves vertical space and indents by `--depth`; `.flowCard` has a solid front face, a small raised top edge, and a side shadow without rotating its text; `.flowRelations` is an absolute pointer-events-free SVG layer; selected, matched, directory, and file cards retain distinct visual states.

Use the existing palette and add no external fonts or assets. The card surface must keep full `node.name` and `node.path` text, wrapping the path only when the available width requires it.

- [ ] **Step 3: Update visible legend and accessibility labels**

Replace the legend text `ISOMETRIC = BIRD'S-EYE OVERVIEW` with `3D FLOW = TOP-TO-BOTTOM HIERARCHY` and give `flowView` an accessible label through its visible heading/hint copy.

- [ ] **Step 4: Run generator-template syntax validation**

Run:

```powershell
python -m py_compile 'C:\Users\dubli\.codex\skills\repo-vizmap\scripts\repo_vizmap.py'
```

Expected: exit code `0` and no syntax errors.

### Task 2: Implement the vertical flow renderer and remove isometric behavior

**Files:**
- Modify: `C:\Users\dubli\.codex\skills\repo-vizmap\scripts\repo_vizmap.py` — embedded JavaScript in `HTML_TEMPLATE`.

**Interfaces:**
- Consumes: `REPO_TREE`, `REPO_DEPS`, `visibleEntries()`, `parentByPath`, `depsFrom`, `depsTo`, `state.selected`, and `state.showLinks`.
- Produces: `renderFlow()`, `drawFlowLinks()`, and `setMode("flow")`; no `renderIso()` or isometric pointer/zoom state remains.

- [ ] **Step 1: Simplify view state and remove isometric-only functions**

Remove `hover`, `scale`, `panX`, `panY`, `drag`, and `moved` from `state`. Remove `isoProject`, `isoLayout`, `isoPoints`, `drawIsoBox`, `renderIso`, and the `isoMap` pointer/wheel listeners. Keep `mode`, `query`, `selected`, and `showLinks`.

- [ ] **Step 2: Add measured orthogonal hierarchy and dependency paths**

Implement the following renderer contract:

```javascript
function drawFlowLinks() {
  // Clear the SVG, measure visible cards relative to flowRows, then draw:
  // 1. solid parent-to-child paths for visible hierarchy edges;
  // 2. dashed blue/gold paths for at most 20 visible selected-node relations.
}

function renderFlow() {
  // Render visibleEntries() as .flowRow/.flowCard elements.
  // Set data-path and --depth on each row.
  // Attach directory toggle and card selection handlers.
  // Set content height, then call drawFlowLinks().
}
```

For each hierarchy edge, route from the parent card's lower center to the child card's upper center using a vertical midpoint and a short horizontal segment. For file links, route from the selected card toward each visible target with a dashed path, using blue for outgoing links and gold for incoming links. Skip missing cards instead of throwing.

- [ ] **Step 3: Wire mode changes and shared controls**

Update `select`, `setMode`, expand-all, collapse-all, initialization, and resize handlers so `mode === "flow"` calls `renderFlow()`. The toolbar must toggle `treeView` and `flowView`, mark `treeMode` or `flowMode` active, and never reference removed isometric IDs.

- [ ] **Step 4: Run embedded JavaScript compilation validation**

After the generator has produced an artifact in Task 3, compile its inline script without executing the page:

```powershell
node -e "const fs=require('fs');const h=fs.readFileSync('repo-vizmap.html','utf8');const s=h.match(/<script>([\\s\\S]*)<\\/script>/)[1];new Function(s);console.log('embedded JavaScript: OK')"
```

Expected: `embedded JavaScript: OK`.

### Task 3: Regenerate and validate the self-contained repository map

**Files:**
- Modify: `repo-vizmap.html` — generated artifact from the installed repo-vizmap skill.
- Verify: `C:\Users\dubli\.codex\skills\repo-vizmap\scripts\repo_vizmap.py`.

**Interfaces:**
- Consumes: the current repository root and the updated generator.
- Produces: a self-contained HTML map with the same repository metadata and dependency counts plus the new `3D FLOW` view.

- [ ] **Step 1: Generate the artifact**

Run from the repository root:

```powershell
python 'C:\Users\dubli\.codex\skills\repo-vizmap\scripts\repo_vizmap.py' --repo . --output .\repo-vizmap.html
```

Expected: JSON output naming `repo-vizmap.html` and reporting the current checkout's file, directory, and relationship counts. The same counts must be present in the generated `REPO_META` object; they may increase when this design and plan are included in the repository scan.

- [ ] **Step 2: Validate view replacement and retained data**

Run:

```powershell
$html = Get-Content -Raw -LiteralPath 'repo-vizmap.html'
if ($html -notmatch '3D FLOW|id="flowView"|id="flowRelations"') { throw '3D flow view is missing' }
if ($html -match 'ISOMETRIC OVERVIEW|id="isoView"|id="isoMap"|renderIso') { throw 'isometric view remains active' }
if ($html -notmatch 'const REPO_TREE=|const REPO_META=|const REPO_DEPS=') { throw 'embedded repository data is missing' }
Write-Output 'repo-vizmap structure: OK'
```

Expected: `repo-vizmap structure: OK`.

- [ ] **Step 3: Run the embedded JavaScript validation and inspect the final diff**

Run the Node compilation command from Task 2, then:

```powershell
git diff --stat -- 'repo-vizmap.html'
git status --short
```

Expected: the generated artifact is the only uncommitted generated output, the JavaScript compiles, and no unrelated repository files are modified.
