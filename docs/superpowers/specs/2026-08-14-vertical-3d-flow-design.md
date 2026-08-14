# Vertical 3D Flow Repository Map

## Goal

Replace the current Isometric Overview in the repo-vizmap artifact with a vertical flow view that keeps repository names readable while retaining a restrained 3D visual treatment.

## Approved design

The existing Readable Tree remains the default hierarchy view. The second mode becomes `3D FLOW` and is a vertically scrollable, top-to-bottom hierarchy:

- The repository root starts at the top.
- Expanded directories add content below their parent rather than widening or re-projecting the whole map.
- Every visible node is a raised card with a flat, horizontal label, a small top/side depth treatment, and enough spacing for the full filename and relative path.
- Hierarchy connectors are solid, orthogonal paths from a parent card to its visible children.
- Detected file relationships remain optional. When `SHOW FILE LINKS` is enabled and a node is selected, only that node's visible imports/uses and dependents are drawn as thin dashed blue/gold paths.
- Search, selection, inspector lists, expand/collapse controls, and metadata remain shared with the Readable Tree.

The Isometric Overview button, SVG scene, pan/zoom behavior, and isometric labels are removed. The new mode is intentionally page-like: scrolling handles depth, while the cards provide only subtle visual depth.

## Implementation boundary

The change is confined to the repo-vizmap skill's bundled generator and the regenerated `repo-vizmap.html` artifact. Repository scanning, node data, dependency detection, and metadata formats remain unchanged.

The generated page will contain a scrollable `flowView` with a positioned content layer and SVG connector layer. The renderer will use the existing visible-node calculation so collapsed folders, search reveal, selection, and relationship filtering behave consistently in both modes. Connector coordinates are measured after cards render, which keeps paths aligned when the viewport is resized or the tree is expanded.

## Interaction and failure behavior

- Clicking a card selects it and updates the existing inspector.
- Clicking a directory toggle expands or collapses only that directory.
- `EXPAND ALL` and `COLLAPSE ALL` affect both hierarchy modes.
- A collapsed or non-visible dependency target is omitted from the connector layer; it remains available in the inspector relationship list.
- If no nodes match search, the flow view shows the same empty state as the Readable Tree.
- A capped tree continues to use the existing metadata warning and search behavior.

## Verification

The generator will be run against the current repository. Validation will check that:

1. the generated artifact contains `3D FLOW` and no active Isometric Overview controls or renderer;
2. the embedded tree, metadata, and dependency JSON remain present and parseable;
3. the generator exits successfully and reports the expected file/directory/link counts;
4. the generated JavaScript passes syntax validation and the markup contains the flow view, card, hierarchy connector, and dependency-link hooks.

