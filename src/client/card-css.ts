/**
 * Card chrome for the Plugin configuration contribution.
 *
 * DSH ships the official card shell (`PluginCard`) inside
 * `@deepseek-ai/dsh-client-ui-settings-plugins`, but that package exports only
 * `apply`/`inject` at runtime — the component itself is package-private. The
 * class names below are a deliberate, literal copy of that shell's CSS module
 * (`PluginCard.module.css`, MIT) so a third-party card is indistinguishable
 * from a first-party one: same 16px radius, same hairline border, same
 * hover/open background swap, same `.16s` chevron rotation.
 *
 * The owner of the stylesheet is this plugin, and its tag id is namespaced to
 * this plugin, so a DSH release that restyles the official shell cannot leave
 * this card half-styled: the two simply drift.
 */

/** Stable tag id; mirrors how the official bundles tag their own stylesheets. */
const STYLE_TAG_ID = 'dsh-loomy-connect/LoomyCard.module.css'

/** Prefix keeping every rule out of the official (hashed) class namespace. */
export const CSS = {
  card: 'dlc_card',
  cardOpen: 'dlc_cardOpen',
  header: 'dlc_header',
  headText: 'dlc_headText',
  name: 'dlc_name',
  description: 'dlc_description',
  chevron: 'dlc_chevron',
  chevronOpen: 'dlc_chevronOpen',
  body: 'dlc_body',
  section: 'dlc_section',
  heading: 'dlc_heading',
  row: 'dlc_row',
  status: 'dlc_status',
  tiles: 'dlc_tiles',
  tile: 'dlc_tile',
  tileLabel: 'dlc_tileLabel',
  tileValue: 'dlc_tileValue',
  tileHint: 'dlc_tileHint',
  text: 'dlc_text',
  hint: 'dlc_hint',
  error: 'dlc_error',
  list: 'dlc_list',
  listItem: 'dlc_listItem',
  listMain: 'dlc_listMain',
  listName: 'dlc_listName',
  listNote: 'dlc_listNote',
  listMeta: 'dlc_listMeta',
  pill: 'dlc_pill',
  refreshInner: 'dlc_refreshInner',
  refreshSpin: 'dlc_refreshSpin',
  tabs: 'dlc_tabs',
  tab: 'dlc_tab',
  tabActive: 'dlc_tabActive',
  ctx: 'dlc_ctx',
  table: 'dlc_table',
  tableHeader: 'dlc_tableHeader',
  tableRow: 'dlc_tableRow',
  tableCell: 'dlc_tableCell',
  dash: 'dlc_dash',
  page: 'dlc_page',
  panel: 'dlc_panel',
  statusBar: 'dlc_statusBar',
  statusBarText: 'dlc_statusBarText',
  statusBarMeta: 'dlc_statusBarMeta',
  field: 'dlc_field',
  fieldLabel: 'dlc_fieldLabel',
  input: 'dlc_input',
  actions: 'dlc_actions',
} as const

const STYLESHEET = `
.dlc_card{border:.5px solid var(--dsw-alias-border-l4);background:var(--dsw-alias-bg-layer-3);border-radius:16px;list-style:none;transition:border-color .16s,background .16s}
.dlc_card:hover{border-color:var(--dsw-alias-label-dimmed)}
.dlc_cardOpen{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-label-dimmed)}
.dlc_header{appearance:none;width:100%;font:inherit;color:inherit;text-align:left;cursor:pointer;background:0 0;border:0;border-radius:12px;align-items:center;gap:12px;padding:14px 16px;display:flex}
.dlc_header:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}
.dlc_headText{flex-direction:column;flex:1;gap:4px;min-width:0;display:flex}
.dlc_name{color:var(--dsw-alias-label-primary);font-size:15px;font-weight:600;line-height:1.4}
.dlc_description{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:1.5}
.dlc_chevron{color:var(--dsw-alias-label-tertiary);flex:none;transition:transform .16s}
.dlc_chevronOpen{transform:rotate(180deg)}
.dlc_body{border-top:.5px solid var(--dsw-alias-border-l2);margin:0 16px;padding-bottom:8px}
.dlc_section{flex-direction:column;gap:6px;padding:12px 0;display:flex}
.dlc_section+.dlc_section{border-top:.5px solid var(--dsw-alias-border-l2)}
.dlc_heading{color:var(--dsw-alias-label-primary);margin:0;font-size:13px;font-weight:500;line-height:1.5}
.dlc_row{align-items:center;gap:12px;flex-wrap:wrap;justify-content:space-between;display:flex}
.dlc_status{align-items:center;gap:8px;color:var(--dsw-alias-label-primary);font-size:13px;font-weight:500;line-height:1.5;display:flex}
.dlc_tiles{flex-wrap:wrap;gap:12px;display:flex}
.dlc_tile{box-sizing:border-box;flex:1 1 180px;min-width:0;padding:12px 14px;border:.5px solid var(--dsw-alias-border-l4);border-radius:8px;background:var(--dsw-alias-bg-layer-3)}
.dlc_tileLabel{align-items:center;gap:6px;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:1.5;display:flex}
.dlc_tileValue{margin-top:6px;color:var(--dsw-alias-label-primary);font-size:24px;font-weight:600;line-height:1.25}
.dlc_tileHint{margin-top:2px;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1.5}
.dlc_text{color:var(--dsw-alias-label-secondary);margin:0;font-size:13px;line-height:1.5}
.dlc_hint{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:1.5}
/* The official shell's equivalent rule names --dsw-alias-label-error, which no
   shipped theme defines (the text silently inherits). Use a token that exists. */
.dlc_error{color:var(--dsw-alias-state-error-primary);margin:0;font-size:12px;line-height:1.5}
.dlc_list{margin:8px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px}
.dlc_listItem{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
.dlc_listMain{display:flex;align-items:baseline;gap:6px;min-width:0}
.dlc_listName{color:var(--dsw-alias-label-secondary);font-size:13px;line-height:1.5;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dlc_listNote{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1.5;flex:none}
.dlc_listMeta{display:inline-flex;align-items:center;gap:6px;flex:none}
/* Rate and promotion read as the same kind of thing — what a call costs — so
   they share one chip. Tabular figures stop the digits from drifting. */
.dlc_pill{padding:1px 8px;border-radius:999px;font-size:11px;line-height:18px;white-space:nowrap;font-variant-numeric:tabular-nums;background:var(--dsw-alias-state-success-subtle,rgba(34,160,107,.12));color:var(--dsw-alias-state-success-primary,#22a06b)}
.dlc_refreshInner{display:inline-flex;align-items:center;gap:6px}
.dlc_refreshSpin{animation:dlc_spin .7s linear infinite}
@keyframes dlc_spin{to{transform:rotate(360deg)}}
/* Two-tab switch (账户 / 模型). Plain buttons styled to the shell tokens — the
   official settings shell ships no public tab primitive, and the card already
   copies the shell chrome rather than importing it, so this stays consistent. */
.dlc_tabs{display:flex;gap:4px;padding:10px 0 2px;border-top:.5px solid var(--dsw-alias-border-l2);margin-top:2px}
.dlc_tab{appearance:none;font:inherit;cursor:pointer;background:0 0;border:0;color:var(--dsw-alias-label-tertiary);font-size:13px;font-weight:500;line-height:1.5;padding:6px 12px;border-radius:8px}
.dlc_tab:hover{background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-secondary)}
.dlc_tabActive{background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary)}
.dlc_ctx{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1.5;white-space:nowrap;font-variant-numeric:tabular-nums}
/* Models tab as a grid table: name / context / billing land in their own
   columns; image generators simply sort last instead of carrying a type
   chip, so the name column keeps the full width. The table is a vertical
   stack of per-row grids — the row grids share the same three-column track,
   which is what keeps header and rows aligned. */
.dlc_table{--dlc-cols:minmax(0,1fr) 84px 96px;margin:8px 0 0;display:flex;flex-direction:column}
.dlc_tableHeader{align-items:center;display:grid;color:var(--dsw-alias-label-tertiary);font-size:12px;font-weight:500;line-height:1.5;padding:8px;text-align:left;column-gap:12px;grid-template-columns:var(--dlc-cols)}
.dlc_tableRow{align-items:center;display:grid;border-bottom:.5px solid var(--dsw-alias-border-l2);padding:5px 8px;column-gap:12px;grid-template-columns:var(--dlc-cols)}
.dlc_tableRow:last-child{border-bottom:0}
.dlc_tableCell{align-items:center;display:flex;gap:6px;min-width:0;text-align:left;justify-content:flex-start}
.dlc_tableCell>.dlc_listName{flex:1 1 auto;min-width:0;overflow-wrap:anywhere;white-space:normal}
/* Context and billing are numbers, so their cells — and the header cells above
   them — hug the right edge. The header spans need the flex context too, or
   justify-content would have no effect on them. */
.dlc_tableHeader>span{align-items:center;display:flex;min-width:0}
.dlc_tableHeader>span+span{align-items:center;display:flex;min-width:0;justify-content:flex-end}
.dlc_tableRow>.dlc_tableCell+span,.dlc_tableRow>.dlc_tableCell+.dlc_tableCell{justify-content:flex-end}
.dlc_dash{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1.5}
/* DSH 0.2.x has no single card shell to copy: the bundle page, the row page
   and the provider-card seat are three different hosts, so the contributions
   share a plain vertical rhythm instead of the old list-item chrome. */
.dlc_page{display:flex;flex-direction:column;gap:16px;min-width:0}
.dlc_panel{display:flex;flex-direction:column;gap:12px;min-width:0}
.dlc_statusBar{align-items:center;gap:8px;flex-wrap:wrap;display:flex;padding:0;min-width:0}
.dlc_statusBar>button{margin-left:auto;flex:none}
.dlc_statusBarText{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:500;line-height:1.5}
.dlc_statusBarMeta{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1.5;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dlc_field{display:flex;flex-direction:column;gap:6px;min-width:0}
.dlc_fieldLabel{color:var(--dsw-alias-label-secondary);font-size:13px;line-height:1.5}
.dlc_input{box-sizing:border-box;width:100%;height:36px;padding:0 12px;border-radius:8px;border:.5px solid var(--dsw-alias-border-l4);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;outline:none}
.dlc_input:focus{border-color:var(--dsw-alias-state-business-primary);box-shadow:inset 0 0 0 .5px var(--dsw-alias-state-business-primary)}
.dlc_input:disabled{opacity:.6;cursor:not-allowed}
.dlc_actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
`

/**
 * Install the card stylesheet once per document.
 *
 * Called at module scope, so it runs while the module loader materializes this
 * bundle — the same moment the official bundles inject theirs, which is what
 * lets the loader inventory and dispose the tag with the module.
 */
export function ensureLoomyCardStyles(): void {
  if (typeof document === 'undefined') return
  if (document.querySelector(`style[data-plugin-css=${JSON.stringify(STYLE_TAG_ID)}]`) !== null) return
  const tag = document.createElement('style')
  tag.dataset.plugin = 'dsh-loomy-connect'
  tag.dataset.pluginCss = STYLE_TAG_ID
  tag.textContent = STYLESHEET
  document.head.appendChild(tag)
}

ensureLoomyCardStyles()
