window.__ModuleLoader__.load({
	id: "dsh-loomy-connect",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/entry-id.ts
		/**
		* Identity shared by the host and browser halves.
		*
		* `LOOMY_ENTRY_ID` is the cordis patch entry id in `cordis.patch.yml`, which
		* also becomes the settings namespace in DSH 0.2.1. The browser half keys the
		* provider card and the row configuration page by it, so changing the patch id
		* without changing this constant silently unhooks both.
		*/
		/** Package name, used as the bundle key on the Plugins page. */
		const LOOMY_PACKAGE = "dsh-loomy-connect";
		/** Profile entry id declared by `cordis.patch.yml`. */
		const LOOMY_ENTRY_ID = "llm-loomy";
		//#endregion
		//#region src/client/card-css.ts
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
		const STYLE_TAG_ID = "dsh-loomy-connect/LoomyCard.module.css";
		/** Prefix keeping every rule out of the official (hashed) class namespace. */
		const CSS = {
			card: "dlc_card",
			cardOpen: "dlc_cardOpen",
			header: "dlc_header",
			headText: "dlc_headText",
			name: "dlc_name",
			description: "dlc_description",
			chevron: "dlc_chevron",
			chevronOpen: "dlc_chevronOpen",
			body: "dlc_body",
			section: "dlc_section",
			heading: "dlc_heading",
			row: "dlc_row",
			status: "dlc_status",
			tiles: "dlc_tiles",
			tile: "dlc_tile",
			tileLabel: "dlc_tileLabel",
			tileValue: "dlc_tileValue",
			tileHint: "dlc_tileHint",
			text: "dlc_text",
			hint: "dlc_hint",
			error: "dlc_error",
			list: "dlc_list",
			listItem: "dlc_listItem",
			listMain: "dlc_listMain",
			listName: "dlc_listName",
			listNote: "dlc_listNote",
			listMeta: "dlc_listMeta",
			pill: "dlc_pill",
			refreshInner: "dlc_refreshInner",
			refreshSpin: "dlc_refreshSpin",
			tabs: "dlc_tabs",
			tab: "dlc_tab",
			tabActive: "dlc_tabActive",
			ctx: "dlc_ctx",
			table: "dlc_table",
			tableHeader: "dlc_tableHeader",
			tableRow: "dlc_tableRow",
			tableCell: "dlc_tableCell",
			dash: "dlc_dash",
			page: "dlc_page",
			panel: "dlc_panel",
			statusBar: "dlc_statusBar",
			statusBarText: "dlc_statusBarText",
			statusBarMeta: "dlc_statusBarMeta",
			field: "dlc_field",
			fieldLabel: "dlc_fieldLabel",
			input: "dlc_input",
			actions: "dlc_actions"
		};
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
`;
		/**
		* Install the card stylesheet once per document.
		*
		* Called at module scope, so it runs while the module loader materializes this
		* bundle — the same moment the official bundles inject theirs, which is what
		* lets the loader inventory and dispose the tag with the module.
		*/
		function ensureLoomyCardStyles() {
			if (typeof document === "undefined") return;
			if (document.querySelector(`style[data-plugin-css=${JSON.stringify(STYLE_TAG_ID)}]`) !== null) return;
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-loomy-connect";
			tag.dataset.pluginCss = STYLE_TAG_ID;
			tag.textContent = STYLESHEET;
			document.head.appendChild(tag);
		}
		ensureLoomyCardStyles();
		//#endregion
		//#region src/client/LoomyAccountPanel.tsx
		/**
		* Account, points and model table for the full-page surfaces.
		*
		* The component is presentational: the page owns the status transport, so a
		* single poll feeds everything below.
		*/
		/** Map our transport outcome onto the primitive's state vocabulary. */
		function dotState$1(status) {
			switch (status) {
				case "signed-in": return "done";
				case "error": return "error";
				default: return "idle";
			}
		}
		function formatNumber$1(value) {
			return new Intl.NumberFormat(void 0).format(value);
		}
		function formatTime(ms) {
			return new Intl.DateTimeFormat(void 0, {
				dateStyle: "medium",
				timeStyle: "short"
			}).format(new Date(ms));
		}
		/**
		* The rate or promo Loomy appends to a model name — `…（x3.0）`, `…（限时免费）`.
		*
		* Mirrors the tags `catalog.ts` parses, anchored to the end so a name that
		* legitimately contains parentheses keeps them.
		*/
		const NAME_TAG = /[（(]\s*(?:x\s*[0-9]+(?:\.[0-9]+)?|[^（）()]*免费[^（）()]*)\s*[）)]\s*$/u;
		/** The model name without the rate tag, which the table shows in its own column. */
		function modelName(name) {
			return name.replace(NAME_TAG, "").trim();
		}
		/** Loomy's own spelling, one decimal: 3 → `x3.0`, 3.3 → `x3.3`. */
		function formatRate(rate) {
			return `x${Number.isInteger(rate) ? rate.toFixed(1) : rate}`;
		}
		/** Compact token count: 262144 → `262K`, 1_048_576 → `1M`. */
		function formatContext(value) {
			if (value >= 1e6) {
				const millions = value / 1e6;
				return `${Math.round(millions * 10) / 10}M`;
			}
			if (value >= 1e3) return `${Math.round(value / 1e3)}K`;
			return String(value);
		}
		/** Localize the promotional label, falling back to Loomy's own wording. */
		function promoLabel(promo, t) {
			return /免费/u.test(promo) ? t("badgeLimitedFree") : promo;
		}
		function renderModelRow(model, t) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: CSS.tableRow,
				role: "row",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: CSS.tableCell,
						role: "gridcell",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: CSS.listName,
							children: modelName(model.name)
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: CSS.tableCell,
						role: "gridcell",
						children: model.contextWindow === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: CSS.ctx,
							children: t("modelsContextNone")
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: CSS.ctx,
							children: formatContext(model.contextWindow)
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: CSS.tableCell,
						role: "gridcell",
						children: model.rate === void 0 && model.promo === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: CSS.dash,
							children: "—"
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: CSS.listMeta,
							children: [model.rate === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: CSS.pill,
								children: formatRate(model.rate)
							}), model.promo === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: CSS.pill,
								children: promoLabel(model.promo, t)
							})]
						})
					})
				]
			}, model.id);
		}
		/** One labelled number: the permanent or the daily-gift balance. */
		function PointsTile({ label, value, hint }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: CSS.tile,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: CSS.tileLabel,
						children: label
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: CSS.tileValue,
						children: formatNumber$1(value)
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: CSS.tileHint,
						children: hint
					})
				]
			});
		}
		/** Sign-in state, points and the reachable model list. */
		function LoomyAccountPanel({ t, status, busy, onRefresh }) {
			/** Which of the two tabs (积分 / 模型) is showing. */
			const [tab, setTab] = (0, react.useState)("account");
			const label = status.status === "signed-in" ? status.account === void 0 ? t("signedIn") : t("signedInAs", { account: status.account }) : status.status === "error" ? t("requestFailed") : t("signedOut");
			const rawUpdatedAt = status.status === "signed-in" ? status.points?.updatedAt : void 0;
			const updatedMs = rawUpdatedAt === void 0 ? void 0 : Date.parse(rawUpdatedAt);
			const models = status.status === "signed-in" ? status.models : void 0;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: CSS.panel,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: CSS.section,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: CSS.row,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: CSS.status,
								role: "status",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: dotState$1(status.status) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: label })]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								size: "sm",
								disabled: busy,
								onClick: onRefresh,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: CSS.refreshInner,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutlineMedium, { className: busy ? CSS.refreshSpin : void 0 }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: busy ? t("refreshing") : t("refresh") })]
								})
							})]
						})
					}),
					status.status === "signed-in" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: CSS.tabs,
						role: "tablist",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							role: "tab",
							"aria-selected": tab === "account",
							className: tab === "account" ? `${CSS.tab} ${CSS.tabActive}` : CSS.tab,
							onClick: () => setTab("account"),
							children: t("tabPoints")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							role: "tab",
							"aria-selected": tab === "models",
							className: tab === "models" ? `${CSS.tab} ${CSS.tabActive}` : CSS.tab,
							onClick: () => setTab("models"),
							children: t("tabModels")
						})]
					}), tab === "account" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: CSS.section,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
								className: CSS.heading,
								children: t("pointsHeading")
							}),
							status.points === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: CSS.text,
								children: t("pointsUnavailable")
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: CSS.tiles,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PointsTile, {
										label: t("permanentPoints"),
										value: status.points.permanent,
										hint: t("permanentPointsHint")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PointsTile, {
										label: t("dailyPoints"),
										value: status.points.daily,
										hint: t("dailyPointsHint")
									})]
								}),
								updatedMs === void 0 || Number.isNaN(updatedMs) ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: CSS.hint,
									children: t("updatedAt", { time: formatTime(updatedMs) })
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: CSS.hint,
									children: t("pointsSourceHint")
								})
							] }),
							status.pointsError === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: CSS.error,
								children: t("pointsError", { message: status.pointsError })
							})
						]
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: CSS.section,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: CSS.row,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
								className: CSS.heading,
								children: t("modelsHeading")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
								tone: "neutral",
								children: t("modelsTag", { count: status.modelCount })
							})]
						}), models === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: CSS.table,
							role: "grid",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: CSS.tableHeader,
									role: "row",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											role: "columnheader",
											children: t("modelsColModel")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											role: "columnheader",
											children: t("modelsColContext")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											role: "columnheader",
											children: t("modelsColBill")
										})
									]
								}),
								models.filter((model) => model.image !== true).map((model) => renderModelRow(model, t)),
								models.filter((model) => model.image === true).map((model) => renderModelRow(model, t))
							]
						})]
					})] }) : null,
					status.status === "signed-out" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: CSS.text,
						children: t("signedOutHint")
					}) : null,
					status.status === "error" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: CSS.error,
						children: status.message
					}) : null
				]
			});
		}
		//#endregion
		//#region src/status-paths.ts
		/** Node-free constants and types shared by the Host and browser halves. */
		/** Plugin-owned status endpoint consumed by its browser half. */
		const LOOMY_STATUS_PATH = "/plugins/dsh-loomy-connect/status";
		//#endregion
		//#region src/client/use-loomy-status.ts
		/** Shared status transport for every browser surface this plugin contributes. */
		/** Shortest time the refresh control stays visibly busy. */
		const MIN_BUSY_MS = 600;
		/**
		* Poll the host status route.
		*
		* `pollMs` is optional: the compact provider card fetches once and refreshes
		* on demand, while the two full pages keep the account fresh in the background
		* only while the account is signed in.
		*/
		function useLoomyStatus(t, options = {}) {
			const { pollMs } = options;
			const [status, setStatus] = (0, react.useState)({ status: "signed-out" });
			const [busy, setBusy] = (0, react.useState)(false);
			const mounted = (0, react.useRef)(true);
			(0, react.useEffect)(() => {
				mounted.current = true;
				return () => {
					mounted.current = false;
				};
			}, []);
			const load = (0, react.useCallback)(async (signal, force = false) => {
				try {
					const response = await fetch(force ? `${LOOMY_STATUS_PATH}?refresh=1` : LOOMY_STATUS_PATH, {
						headers: { accept: "application/json" },
						credentials: "same-origin",
						...signal === void 0 ? {} : { signal }
					});
					const value = await response.json().catch(() => void 0);
					if (!response.ok) throw new Error(`HTTP ${response.status}`);
					if (mounted.current && signal?.aborted !== true && value !== void 0) setStatus(value);
				} catch (error) {
					if (mounted.current && signal?.aborted !== true) setStatus({
						status: "error",
						message: error instanceof Error ? error.message : t("requestFailed")
					});
				}
			}, [t]);
			const refresh = (0, react.useCallback)(async (force = false) => {
				setBusy(true);
				const started = Date.now();
				try {
					await load(void 0, force);
				} finally {
					const elapsed = Date.now() - started;
					if (elapsed < MIN_BUSY_MS) await new Promise((resolve) => window.setTimeout(resolve, MIN_BUSY_MS - elapsed));
					if (mounted.current) setBusy(false);
				}
			}, [load]);
			(0, react.useEffect)(() => {
				const controller = new AbortController();
				load(controller.signal);
				return () => {
					controller.abort();
				};
			}, [load]);
			(0, react.useEffect)(() => {
				if (pollMs === void 0 || status.status !== "signed-in") return;
				const controller = new AbortController();
				const timer = window.setInterval(() => {
					load(controller.signal);
				}, pollMs);
				return () => {
					window.clearInterval(timer);
					controller.abort();
				};
			}, [
				load,
				pollMs,
				status.status
			]);
			return {
				status,
				busy,
				refresh
			};
		}
		//#endregion
		//#region src/client/LoomyPluginPage.tsx
		/** Account, points and model table, with the page supplying the chrome. */
		function LoomyPluginPage({ t }) {
			const { status, busy, refresh } = useLoomyStatus(t, { pollMs: 6e4 });
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: CSS.page,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: CSS.text,
					children: t("intro")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LoomyAccountPanel, {
					t,
					status,
					busy,
					onRefresh: () => void refresh(true)
				})]
			});
		}
		//#endregion
		//#region src/client/LoomyStatusBar.tsx
		function dotState(status) {
			switch (status) {
				case "signed-in": return "done";
				case "error": return "error";
				default: return "idle";
			}
		}
		function formatNumber(value) {
			return new Intl.NumberFormat(void 0).format(value);
		}
		/** One line: sign-in state, permanent balance, refresh. */
		function LoomyStatusBar({ t }) {
			const { status, busy, refresh } = useLoomyStatus(t, { pollMs: 6e4 });
			const label = status.status === "signed-in" ? status.account === void 0 ? t("signedIn") : t("signedInAs", { account: status.account }) : status.status === "error" ? t("requestFailed") : t("signedOut");
			const permanent = status.status === "signed-in" ? status.points?.permanent : void 0;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: CSS.statusBar,
				role: "status",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: dotState(status.status) }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: CSS.statusBarText,
						children: label
					}),
					permanent === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: CSS.statusBarMeta,
						children: t("statusPoints", { value: formatNumber(permanent) })
					}),
					status.status === "signed-in" ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: CSS.statusBarMeta,
						children: t("signedOutHint")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "outline",
						size: "sm",
						disabled: busy,
						onClick: () => void refresh(true),
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: CSS.refreshInner,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutlineMedium, { className: busy ? CSS.refreshSpin : void 0 }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: busy ? t("refreshing") : t("refresh") })]
						})
					})
				]
			});
		}
		//#endregion
		//#region src/client/LoomyRowConfig.tsx
		/**
		* The `llm-loomy` row page on the Plugins screen: the two path overrides DSH
		* 0.2.x lets this plugin write, plus a compact status line.
		*
		* DSH 0.2.x only passes an editable form to `plugins.row.config`; the bundle
		* page is read-only. Writes go through `form.mutate`, which fences on the
		* revision the page read and persists into the profile patch.
		*/
		function textField(value) {
			return typeof value === "string" ? value : "";
		}
		/** Path overrides for non-standard Loomy installations. */
		function LoomyRowConfig({ t, form }) {
			const section = form?.state.value ?? {};
			const [authFile, setAuthFile] = (0, react.useState)("");
			const [configFile, setConfigFile] = (0, react.useState)("");
			const [dirty, setDirty] = (0, react.useState)(false);
			const [saving, setSaving] = (0, react.useState)(false);
			const [message, setMessage] = (0, react.useState)(void 0);
			(0, react.useEffect)(() => {
				if (dirty) return;
				setAuthFile(textField(section.authFile));
				setConfigFile(textField(section.configFile));
			}, [
				section.authFile,
				section.configFile,
				dirty
			]);
			const editable = form !== void 0 && form.state.status === "ready" && form.state.writable;
			const save = async () => {
				if (form === void 0) return;
				setSaving(true);
				setMessage(void 0);
				const ops = [];
				const auth = authFile.trim();
				const config = configFile.trim();
				ops.push(auth === "" ? {
					op: "unset",
					path: ["authFile"]
				} : {
					op: "set",
					path: ["authFile"],
					value: auth
				});
				ops.push(config === "" ? {
					op: "unset",
					path: ["configFile"]
				} : {
					op: "set",
					path: ["configFile"],
					value: config
				});
				try {
					const accepted = await form.mutate(ops, form.state.revision);
					setMessage(accepted ? t("saved") : t("saveFailed"));
					if (accepted) setDirty(false);
				} catch {
					setMessage(t("saveFailed"));
				} finally {
					setSaving(false);
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: CSS.page,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(LoomyStatusBar, { t }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: CSS.section,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
							className: CSS.heading,
							children: t("configPaths")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: CSS.hint,
							children: t("configHint")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: CSS.field,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
								className: CSS.fieldLabel,
								htmlFor: "dlc-auth-file",
								children: t("authFile")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								id: "dlc-auth-file",
								className: CSS.input,
								value: authFile,
								placeholder: t("authFileHint"),
								disabled: !editable || saving,
								onChange: (event) => {
									setDirty(true);
									setMessage(void 0);
									setAuthFile(event.target.value);
								}
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: CSS.field,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
								className: CSS.fieldLabel,
								htmlFor: "dlc-config-file",
								children: t("configFile")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								id: "dlc-config-file",
								className: CSS.input,
								value: configFile,
								placeholder: t("configFileHint"),
								disabled: !editable || saving,
								onChange: (event) => {
									setDirty(true);
									setMessage(void 0);
									setConfigFile(event.target.value);
								}
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: CSS.actions,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "primary",
									size: "sm",
									disabled: !editable || saving || !dirty,
									onClick: () => void save(),
									children: saving ? t("saving") : t("save")
								}),
								form === void 0 || form.state.status === "unavailable" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: CSS.hint,
									children: t("namespaceUnavailable")
								}) : null,
								message === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: CSS.hint,
									children: message
								})
							]
						})
					]
				})]
			});
		}
		//#endregion
		//#region src/client/locales.ts
		/** Plugin-card copy registered under the settings.loomy locale namespace. */
		const en = {
			title: "DSH Loomy Connect",
			intro: "Use the models included in the Loomy desktop app directly in DSH — zero configuration, ready out of the box.",
			expand: "Expand",
			collapse: "Collapse",
			loading: "Loading account…",
			signedOut: "Not signed in",
			signedOutHint: "Sign in once in the Loomy desktop app; this plugin follows that sign-in automatically.",
			signedInAs: "Signed in as {account}",
			signedIn: "Signed in",
			pointsHeading: "Points",
			permanentPoints: "Permanent points",
			permanentPointsHint: "Long-lived balance",
			dailyPoints: "Daily gift points",
			dailyPointsHint: "Refilled to 5000 on each daily sign-in",
			updatedAt: "Updated {time}",
			pointsSourceHint: "Read from Loomy’s own cache; the numbers move when Loomy refreshes it.",
			pointsUnavailable: "No points snapshot yet — open Loomy once and it will appear here.",
			pointsError: "Points unavailable: {message}",
			tabPoints: "Points",
			tabModels: "Models",
			modelsHeading: "Models",
			modelsTag: "{count} chat models",
			modelsContext: "Context {size}",
			modelsContextUnknown: "Context not provided",
			modelsColModel: "Model",
			modelsColContext: "Context",
			modelsColBill: "Billing",
			modelsContextNone: "Not provided",
			badgeLimitedFree: "Limited-time free",
			refresh: "Refresh",
			refreshing: "Refreshing…",
			requestFailed: "Request failed",
			statusPoints: "Points {value}",
			configPaths: "Path overrides",
			configHint: "Leave blank to use the platform default. Changes apply immediately.",
			authFile: "Auth session file",
			authFileHint: "Auto-detected when blank",
			configFile: "Model catalog file",
			configFileHint: "Auto-detected when blank",
			save: "Save",
			saving: "Saving…",
			saved: "Saved",
			saveFailed: "Save failed",
			namespaceUnavailable: "Configuration is read-only right now."
		};
		const zh = {
			title: "DSH Loomy Connect",
			intro: "在 DSH 中直接使用 Loomy 桌面 App 包含的模型，开箱即用，无需额外配置。",
			expand: "展开",
			collapse: "收起",
			loading: "正在读取账号…",
			signedOut: "未登录",
			signedOutHint: "在 Loomy 桌面 App 里登录一次即可，插件会自动跟随当前登录的账号。",
			signedInAs: "已登录：{account}",
			signedIn: "已登录",
			pointsHeading: "积分余额",
			permanentPoints: "永久积分",
			permanentPointsHint: "长期有效的积分",
			dailyPoints: "每日赠送积分",
			dailyPointsHint: "每日登录后刷新为 5000",
			updatedAt: "更新于 {time}",
			pointsSourceHint: "积分读自 Loomy 本地缓存，Loomy 刷新后这里才会变化。",
			pointsUnavailable: "还没有积分快照 —— 打开一次 Loomy 后这里就会显示。",
			pointsError: "积分查询失败：{message}",
			tabPoints: "积分",
			tabModels: "模型",
			modelsHeading: "模型",
			modelsTag: "{count} 个可对话",
			modelsContext: "上下文 {size}",
			modelsContextUnknown: "上下文未提供",
			modelsColModel: "模型",
			modelsColContext: "上下文",
			modelsColBill: "计费",
			modelsContextNone: "—",
			badgeLimitedFree: "限时免费",
			refresh: "刷新",
			refreshing: "正在刷新…",
			requestFailed: "请求失败",
			statusPoints: "积分 {value}",
			configPaths: "路径覆盖",
			configHint: "留空则使用平台默认路径；保存后立即生效。",
			authFile: "登录态文件",
			authFileHint: "留空自动探测",
			configFile: "模型清单文件",
			configFileHint: "留空自动探测",
			save: "保存",
			saving: "正在保存…",
			saved: "已保存",
			saveFailed: "保存失败",
			namespaceUnavailable: "当前配置为只读。"
		};
		//#endregion
		//#region src/client/index.tsx
		/** Stable browser-plugin name. */
		const name = "dsh-loomy-connect-client";
		/**
		* Client services required by the contributions. The three slot declarers are
		* named in the package's `dsh.client.inject` list, so cordis has materialized
		* them before this plugin's fiber starts.
		*/
		const inject = ["slots", "locale"];
		const LOCALE_NAMESPACE = "settings.loomy";
		/**
		* Register card copy and the three Loomy surfaces.
		*
		* Each registration is wrapped separately: a DSH slot-API change on one
		* surface degrades to a `console.error` instead of throwing into the loader
		* and taking the provider channel down with it.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(LOCALE_NAMESPACE, {
				zh,
				en
			}), "dsh-loomy-connect: settings copy");
			const t = ctx.locale.bind(LOCALE_NAMESPACE);
			const injected = () => ({ t });
			try {
				ctx.slots.inject("plugins.bundle.config", () => ctx.slots.register({
					name: "plugins.bundle.config",
					key: LOOMY_PACKAGE,
					locale: LOCALE_NAMESPACE,
					inject: injected
				}, LoomyPluginPage));
			} catch (error) {
				console.error("[dsh-loomy-connect] bundle configuration page failed to load:", error);
			}
			try {
				ctx.slots.inject("plugins.row.config", () => ctx.slots.register({
					name: "plugins.row.config",
					key: `${LOOMY_PACKAGE}#${LOOMY_ENTRY_ID}`,
					locale: LOCALE_NAMESPACE,
					inject: injected
				}, LoomyRowConfig));
			} catch (error) {
				console.error("[dsh-loomy-connect] row configuration page failed to load:", error);
			}
			try {
				ctx.slots.inject("settings.models.provider-card", () => ctx.slots.register({
					name: "settings.models.provider-card",
					key: LOOMY_ENTRY_ID,
					locale: LOCALE_NAMESPACE,
					inject: injected
				}, LoomyStatusBar));
			} catch (error) {
				console.error("[dsh-loomy-connect] provider status bar failed to load:", error);
			}
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});
