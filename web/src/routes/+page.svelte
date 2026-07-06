<script>
	/** @type {import('./$types').PageData} */

	let styles = $state([]);
	let templates = $state([]);
	let selectedStyle = $state('tokyo-night');
	let selectedTemplate = $state('icon');
	let description = $state('');
	let count = $state(1);
	let generating = $state(false);
	let results = $state([]);
	let error = $state('');
	let toast = $state('');
	let stylePreviewColors = $state([]);
	let models = $state([]);
	let selectedModel = $state('');
	let providerErrors = $state([]);
	let settingsOpen = $state(false);
	let providerSettings = $state([]);
	let providerSettingsSource = $state('none');
	let providerSettingsEditable = $state(true);
	let providerConfigPath = $state('');
	let settingsDraft = $state([]);
	let settingsSaving = $state(false);
	let newProviderDraft = $state(blankProvider());

	function showToast(msg) {
		toast = msg;
		setTimeout(() => toast = '', 3000);
	}

	async function loadData() {
		try {
			const [sRes, tRes, mRes, aiRes] = await Promise.all([
				fetch('/api/styles'),
				fetch('/api/templates'),
				fetch('/api/models'),
				fetch('/api/settings/ai'),
			]);
			const s = await sRes.json();
			const t = await tRes.json();
			if (s.success) {
				styles = s.styles;
				updatePreview();
			}
			if (t.success) templates = t.templates;
			if (mRes.ok) {
				const m = await mRes.json();
				if (m.success) {
					models = m.models;
					selectedModel = m.default_model || m.models[0]?.id || '';
					providerErrors = m.provider_errors || [];
				}
			} else {
				models = [];
				selectedModel = '';
				showToast('Models unavailable — using template fallback');
			}
			if (aiRes.ok) {
				const settings = await aiRes.json();
				if (settings.success) {
					providerSettings = settings.providers;
					providerSettingsSource = settings.source;
					providerSettingsEditable = settings.editable;
					providerConfigPath = settings.configPath;
					settingsDraft = settings.providers.map(providerToDraft);
				}
			} else {
				providerSettings = [];
				providerSettingsEditable = false;
				settingsDraft = [];
				showToast('Provider settings unavailable');
			}
		} catch (e) {
			models = [];
			selectedModel = '';
			showToast('Failed to load — is the API running?');
		}
	}

	function updatePreview() {
		const s = styles.find(s => s.name === selectedStyle);
		if (s?.tokens?.colors) {
			stylePreviewColors = Object.values(s.tokens.colors);
		}
	}

	async function generate() {
		if (!description.trim()) { showToast('Describe what you want to generate'); return; }
		generating = true;
		error = '';
		results = [];
		try {
			const res = await fetch('/api/generate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					style_name: selectedStyle,
					template: selectedTemplate,
					description: description.trim(),
					count,
					model: selectedModel || undefined
				})
			});
			const data = await res.json();
			if (data.success) {
				results = data.results.map(r => ({
					...r,
					_dataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(r.svg)}`
				}));
				showToast(`✨ ${results.length} SVG${results.length > 1 ? 's' : ''} generated`);
			} else {
				showToast(data.error || 'Generation failed');
			}
		} catch (e) {
			showToast('Something went wrong');
		} finally {
			generating = false;
		}
	}

	function download(svg, name) {
		const blob = new Blob([svg], { type: 'image/svg+xml' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url; a.download = name; a.click();
		URL.revokeObjectURL(url);
		showToast(`⬇ Downloaded ${name}`);
	}

	async function copy(text) {
		await navigator.clipboard.writeText(text);
		showToast('📋 Copied to clipboard');
	}

	function providerToDraft(p) {
		return {
			id: p.id,
			name: p.name,
			baseUrl: p.baseUrl,
			apiKey: '',
			hasApiKey: p.hasApiKey,
			clearApiKey: false,
			models: (p.models || []).join(', '),
			defaultModel: p.defaultModel || ''
		};
	}

	function blankProvider() {
		return {
			id: 'local',
			name: 'Local OpenAI-Compatible',
			baseUrl: 'http://localhost:11434/v1',
			apiKey: '',
			hasApiKey: false,
			clearApiKey: false,
			models: 'llama3.2',
			defaultModel: 'llama3.2'
		};
	}
	function openProviderSettings() { settingsOpen = true; }
	function closeProviderSettings() { settingsOpen = false; }
	function resetNewProviderDraft() { newProviderDraft = blankProvider(); }
	function addProviderFromComposer() {
		settingsDraft = [...settingsDraft, { ...newProviderDraft }];
		resetNewProviderDraft();
	}

	function removeProvider(index) {
		settingsDraft = settingsDraft.filter((_, i) => i !== index);
	}
	function reloadProviderSettings() {
		settingsDraft = providerSettings.map(providerToDraft);
		resetNewProviderDraft();
	}

	async function saveProviderSettings() {
		settingsSaving = true;
		try {
			const res = await fetch('/api/settings/ai', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					providers: settingsDraft.map(p => ({
						id: p.id.trim(),
						name: p.name.trim(),
						baseUrl: p.baseUrl.trim(),
						apiKey: p.apiKey.trim() || undefined,
						clearApiKey: p.clearApiKey,
						models: p.models.split(',').map(m => m.trim()).filter(Boolean),
						defaultModel: p.defaultModel.trim() || undefined
					}))
				})
			});
			const data = await res.json();
			if (data.success) {
				await loadData();
				closeProviderSettings();
				resetNewProviderDraft();
				showToast('Provider settings saved');
			} else {
				showToast(data.error || 'Failed to save provider settings');
			}
		} catch (e) {
			showToast('Failed to save provider settings');
		} finally {
			settingsSaving = false;
		}
	}

	$effect(() => { loadData(); });
</script>

<div class="page">
	<!-- Background decoration -->
	<div class="bg-glow"></div>
	<div class="bg-grid"></div>

	<!-- Toast -->
	{#if toast}
		<div class="toast" class:show={toast !== ''}>{toast}</div>
	{/if}

	<!-- Header -->
	<header>
		<div class="logo">
			<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5">
				<path d="M12 2L2 7v10l10 5 10-5V7l-10-5z" stroke="#C67A45" fill="#C67A45" fill-opacity="0.2"/>
				<circle cx="12" cy="12" r="3" stroke="#C67A45"/>
				<path d="M12 9v6M9 12h6" stroke="#C67A45" stroke-width="2"/>
			</svg>
			<span>SVG Forge</span>
		</div>
		<p class="tagline">Generate consistent SVG assets with handcrafted design styles</p>
	</header>

	<main>
		<!-- Controls -->
		<section class="controls-card">
			<div class="controls-head">
				<div>
					<span class="controls-eyebrow">Generator</span>
					<p>Choose style, template, model, and provider settings.</p>
				</div>
				<button class="ghost-btn" onclick={openProviderSettings}>Provider settings</button>
			</div>
			<div class="fields">
				<div class="field">
					<label>Style</label>
					<div class="select-wrap">
						<select bind:value={selectedStyle} onchange={updatePreview}>
							{#each styles as s}
								<option value={s.name}>{s.name}</option>
							{/each}
						</select>
						{#if stylePreviewColors.length > 0}
							<div class="swatches">
								{#each stylePreviewColors as c}
									<span class="swatch" style="background:{c}" title={c}></span>
								{/each}
							</div>
						{/if}
					</div>
				</div>

				<div class="field">
					<label>Template</label>
					<div class="select-wrap">
						<select bind:value={selectedTemplate}>
							{#each templates as t}
								<option value={t.name}>{t.name}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="field">
					<label>Model</label>
					<div class="select-wrap">
						<select bind:value={selectedModel} disabled={models.length === 0}>
							{#if models.length === 0}
								<option value="">Template fallback</option>
							{:else}
								{#each models as m}
									<option value={m.id}>{m.label}</option>
								{/each}
							{/if}
						</select>
					</div>
				</div>

				<div class="field big">
					<label>Description</label>
					<input type="text" bind:value={description}
						placeholder="e.g. notification bell icon"
						onkeydown={(e) => e.key === 'Enter' && generate()} />
				</div>

				<div class="field narrow">
					<label>Variants</label>
					<div class="count-wrap">
						<button class="count-btn" onclick={() => count = Math.max(1, count - 1)} disabled={count <= 1}>−</button>
						<span class="count-val">{count}</span>
						<button class="count-btn" onclick={() => count = Math.min(5, count + 1)} disabled={count >= 5}>+</button>
					</div>
				</div>
			</div>

			<button class="gen-btn" onclick={generate} disabled={generating}>
				{#if generating}
					<span class="spinner"></span>
					Forging...
				{:else}
					<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M12 3v18M3 12h18" stroke-linecap="round"/>
					</svg>
					Generate
				{/if}
			</button>

		</section>

		<!-- Results -->
		{#if results.length > 0}
			<section class="results-section">
				<div class="results-bar">
					<h2>{results.length} result{results.length > 1 ? 's' : ''}</h2>
					<button class="ghost-btn" onclick={() => results.forEach(r => download(r.svg, r.name))}>
						⬇ Download all
					</button>
				</div>

				<div class="results-grid">
					{#each results as r}
						<div class="result-card">
							<div class="preview">
								<img src={r._dataUrl} alt={r.name} loading="lazy" />
							</div>
							<div class="card-body">
								<div class="card-meta">
									<span class="card-name">{r.name}</span>
									<div class="card-tags">
										<span class="tag">{r.style}</span>
										<span class="tag">{r.template}</span>
									{#if r.model}
										<span class="tag">{r.model}</span>
									{/if}
									</div>
								</div>
								<div class="card-actions">
									<button class="icon-btn" onclick={() => download(r.svg, r.name)} title="Download">
										<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
									</button>
									<button class="icon-btn" onclick={() => copy(r.svg)} title="Copy SVG">
										<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
									</button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</section>
		{:else if !generating}
			<!-- Empty state -->
			<section class="empty-state">
				<div class="empty-icon">
					<svg viewBox="0 0 80 80" width="80" height="80" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3">
						<rect x="10" y="10" width="60" height="60" rx="8" stroke-dasharray="4 3"/>
						<circle cx="28" cy="32" r="4"/>
						<path d="M20 52l12-12 8 8 12-16 16 20"/>
					</svg>
				</div>
				<h3>Ready to create</h3>
				<p>Pick a style, describe what you need, and generate SVG assets that match perfectly.</p>
			</section>
		{/if}

		<!-- Loading skeleton -->
		{#if generating && results.length === 0}
			<section class="results-grid" style="margin-top:1.5rem">
				{#each Array(count) as _}
					<div class="skeleton-card">
						<div class="skeleton-preview"></div>
						<div style="padding:0.75rem;display:flex;flex-direction:column;gap:0.5rem">
							<div class="skeleton-line" style="width:70%"></div>
							<div class="skeleton-line" style="width:40%"></div>
						</div>
					</div>
				{/each}
			</section>
		{/if}
	</main>

	<footer>
		<span>SVG Forge</span>
		<span class="sep">·</span>
		<span>Built with Bun + Hono + SvelteKit</span>
	</footer>
</div>

{#if settingsOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="settings-modal-backdrop" onclick={closeProviderSettings} onkeydown={(e) => e.key === 'Enter' && closeProviderSettings()} role="presentation"></div>
	<div class="settings-modal" role="dialog" aria-modal="true" aria-labelledby="provider-settings-title">
		<div class="settings-modal-card">
			<div class="settings-modal-head">
				<div>
					<h2 class="settings-modal-title" id="provider-settings-title">Provider settings</h2>
					<p class="settings-modal-meta">OpenAI-compatible endpoints and API keys</p>
					<div class="settings-summary">
						<span>Source: {providerSettingsSource}</span>
						<span>File: {providerConfigPath}</span>
					</div>
				</div>
				<button class="settings-modal-close" onclick={closeProviderSettings} aria-label="Close">&#x2715;</button>
			</div>

			{#if !providerSettingsEditable}
				<p class="settings-note">Provider settings are controlled by environment variables on the API server. Remove AI_PROVIDERS or OPENAI_API_KEY to edit in this panel.</p>
			{/if}

			{#each providerErrors as err}
				<div class="provider-error">{err.provider}: {err.error}</div>
			{/each}

			<!-- Composer -->
			<div class="settings-composer">
				<div class="settings-composer-row">
					<div class="field">
						<label for="new-provider-id">Provider ID</label>
						<input id="new-provider-id" type="text" bind:value={newProviderDraft.id} disabled={!providerSettingsEditable} />
					</div>
					<div class="field">
						<label for="new-provider-base-url">Base URL</label>
						<input id="new-provider-base-url" type="text" bind:value={newProviderDraft.baseUrl} disabled={!providerSettingsEditable} />
					</div>
				</div>
				<div class="settings-composer-row">
					<div class="field">
						<label for="new-provider-api-key">API key</label>
						<input id="new-provider-api-key" type="password" bind:value={newProviderDraft.apiKey} disabled={!providerSettingsEditable} />
					</div>
					<div class="field composer-action">
						<button class="secondary-btn" onclick={addProviderFromComposer}
							disabled={!providerSettingsEditable || !newProviderDraft.id.trim() || !newProviderDraft.baseUrl.trim()}>Add provider</button>
					</div>
				</div>
			</div>

			<!-- Provider list -->
			<div class="settings-provider-list">
				{#each settingsDraft as p, i}
					<div class="provider-editor">
						<div class="provider-editor-head">
							<span>Provider {i + 1}</span>
							<button class="danger-btn" onclick={() => removeProvider(i)} disabled={!providerSettingsEditable}>Remove</button>
						</div>
						<div class="settings-fields">
							<div class="settings-fields-row">
								<div class="field">
									<label for="provider-{i}-id">Provider ID</label>
									<input id="provider-{i}-id" type="text" bind:value={settingsDraft[i].id} disabled={!providerSettingsEditable} />
								</div>
								<div class="field">
									<label for="provider-{i}-name">Name</label>
									<input id="provider-{i}-name" type="text" bind:value={settingsDraft[i].name} disabled={!providerSettingsEditable} />
								</div>
							</div>
							<div class="field">
								<label for="provider-{i}-base-url">Base URL</label>
								<input id="provider-{i}-base-url" type="text" bind:value={settingsDraft[i].baseUrl} disabled={!providerSettingsEditable} />
							</div>
							<div class="field">
								<label for="provider-{i}-api-key">API Key</label>
								<input id="provider-{i}-api-key" type="password" bind:value={settingsDraft[i].apiKey}
									placeholder={settingsDraft[i].hasApiKey ? 'Saved key present — leave blank to keep' : 'Optional API key'}
									disabled={!providerSettingsEditable} />
								{#if settingsDraft[i].hasApiKey}
									<div class="checkbox-row">
										<input id="provider-{i}-clear-key" type="checkbox" bind:checked={settingsDraft[i].clearApiKey} disabled={!providerSettingsEditable} />
										<label for="provider-{i}-clear-key">Clear saved API key</label>
									</div>
								{/if}
							</div>
							<div class="settings-fields-row">
								<div class="field">
									<label for="provider-{i}-models">Models</label>
									<input id="provider-{i}-models" type="text" bind:value={settingsDraft[i].models}
										placeholder="llama3.2, gpt-4, ..."
										disabled={!providerSettingsEditable} />
									<span class="field-hint">Comma-separated model ids</span>
								</div>
								<div class="field">
									<label for="provider-{i}-default-model">Default model</label>
									<input id="provider-{i}-default-model" type="text" bind:value={settingsDraft[i].defaultModel} disabled={!providerSettingsEditable} />
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>

			<div class="settings-actions">
				<button class="secondary-btn" onclick={reloadProviderSettings} disabled={!providerSettingsEditable}>Reload</button>
				<button class="secondary-btn" onclick={saveProviderSettings} disabled={!providerSettingsEditable || settingsSaving}>Save providers</button>
			</div>
		</div>
	</div>
{/if}

<svelte:window onkeydown={(e) => e.key === 'Escape' && settingsOpen && closeProviderSettings()} />

<style>
	/* ─── Reset ──────────────────────────── */
	/* ─── Tokens ──────────────────────────── */
	:global(:root) {
		--bg: #15110f;
		--bg-soft: #1b1613;
		--surface: rgba(43, 34, 28, 0.78);
		--surface-strong: rgba(52, 41, 33, 0.9);
		--control-bg: #201915;
		--preview-bg: #171311;
		--border: rgba(239, 228, 212, 0.08);
		--border-soft: rgba(239, 228, 212, 0.05);
		--border-accent: rgba(198, 122, 69, 0.28);
		--text: #efe4d4;
		--text-muted: #b59d84;
		--text-dim: #7d6856;
		--placeholder: #69584a;
		--accent: #c67a45;
		--accent-strong: #df9861;
		--accent-soft: rgba(198, 122, 69, 0.12);
		--accent-glow: rgba(198, 122, 69, 0.08);
		--grid-dot: rgba(239, 228, 212, 0.03);
		--button-from: #9f6038;
		--button-to: #c67a45;
		--button-text: #fff4e8;
		--skeleton: rgba(239, 228, 212, 0.05);
	}
	:global(*) { margin:0; padding:0; box-sizing:border-box; }
	:global(body) {
		font-family: 'Instrument Sans', system-ui, sans-serif;
		background:var(--bg);
		color:var(--text);
		min-height:100vh;
		overflow-x:hidden;
	}

	/* ─── Background ─────────────────────── */
	.page { position:relative; max-width:880px; margin:0 auto; padding:2rem 1rem; min-height:100vh; }
	.bg-glow {
		position:fixed; top:-30vh; left:50%; translate:-50% 0;
		width:800px; height:800px;
		background:radial-gradient(circle, var(--accent-glow) 0%, transparent 70%);
		pointer-events:none; z-index:0;
	}
	.bg-grid {
		position:fixed; inset:0;
		background-image:radial-gradient(var(--grid-dot) 1px, transparent 1px);
		background-size:32px 32px;
		pointer-events:none; z-index:0;
	}
	header, main, footer { position:relative; z-index:1; }

	/* ─── Toast ──────────────────────────── */
	.toast {
		position:fixed; bottom:2rem; left:50%; translate:-50% 0;
		background:var(--surface-strong); border:1px solid var(--border-accent);
		border-radius:10px; padding:0.6rem 1.2rem;
		font-size:0.85rem; color:var(--text);
		z-index:100; pointer-events:none;
		opacity:0; translate:-50% 1rem;
		transition:all 0.3s cubic-bezier(0.16,1,0.3,1);
		box-shadow:0 8px 32px rgba(0,0,0,0.4);
	}
	.toast.show { opacity:1; translate:-50% 0; }

	/* ─── Header ─────────────────────────── */
	header { text-align:center; margin-bottom:2.5rem; }
	.logo {
		display:flex; align-items:center; justify-content:center; gap:0.5rem;
		font-size:1.5rem; font-weight:700; margin-bottom:0.4rem;
	}
	.tagline { color:var(--text-muted); font-size:0.9rem; }

	/* ─── Controls ───────────────────────── */
	.controls-card {
		background:var(--surface);
		backdrop-filter:blur(12px);
		border:1px solid var(--border-soft);
		border-radius:16px;
		padding:1.25rem;
	}
	.fields { display:flex; flex-wrap:wrap; gap:0.75rem; align-items:end; }
	.field { flex:1; min-width:140px; }
	.field.big { flex:2; min-width:200px; }
	.field.narrow { flex:0 0 auto; min-width:100px; }
	.field label {
		display:block; font-size:0.65rem; font-weight:600;
		text-transform:uppercase; letter-spacing:0.08em;
		color:var(--text-muted); margin-bottom:0.35rem;
	}

	.select-wrap { position:relative; }
	.select-wrap select {
		width:100%; padding:0.55rem 0.75rem;
		background:var(--control-bg); border:1px solid var(--border);
		border-radius:10px; color:var(--text); font-size:0.85rem;
		font-family:'Instrument Sans', system-ui, sans-serif;
		appearance:none; cursor:pointer;
		transition:border-color 0.2s;
	}
	.select-wrap select:focus { outline:none; border-color:var(--accent); }

	.swatches {
		display:flex; gap:3px; margin-top:0.4rem;
	}
	.swatch {
		width:14px; height:14px; border-radius:50%;
		border:1px solid var(--border);
		transition:transform 0.15s;
	}
	.swatch:hover { transform:scale(1.3); z-index:2; }

	.field input {
		width:100%; padding:0.55rem 0.75rem;
		background:var(--control-bg); border:1px solid var(--border);
		border-radius:10px; color:var(--text); font-size:0.85rem;
		font-family:'Instrument Sans', system-ui, sans-serif;
		transition:border-color 0.2s;
	}
	.field input:focus { outline:none; border-color:var(--accent); }
	.field input::placeholder { color:var(--placeholder); }

	.count-wrap {
		display:flex; align-items:center; gap:0.25rem;
		background:var(--control-bg); border:1px solid var(--border);
		border-radius:10px; padding:0.15rem;
	}
	.count-btn {
		width:32px; height:32px; border:none; border-radius:8px;
		background:transparent; color:var(--text-dim);
		font-size:1.1rem; cursor:pointer; display:flex;
		align-items:center; justify-content:center;
		font-family:inherit;
		transition:background 0.15s;
	}
	.count-btn:hover:not(:disabled) { background:var(--accent-soft); color:var(--accent); }
	.count-btn:disabled { opacity:0.3; cursor:not-allowed; }
	.count-val {
		min-width:24px; text-align:center; font-size:0.9rem;
		font-weight:500;
	}

	/* ─── Generate Button ────────────────── */
	.gen-btn {
		width:100%; margin-top:0.85rem;
		padding:0.65rem; border:none; border-radius:10px;
		background:linear-gradient(135deg, var(--button-from), var(--button-to));
		color:var(--button-text); font-size:0.9rem; font-weight:600;
		font-family:inherit;
		cursor:pointer; display:flex; align-items:center; justify-content:center; gap:0.5rem;
		transition:opacity 0.2s, transform 0.15s;
	}
	.gen-btn:hover:not(:disabled) { opacity:0.9; }
	.gen-btn:active:not(:disabled) { transform:scale(0.98); }
	.gen-btn:disabled { opacity:0.5; cursor:not-allowed; }

	/* Spinner */
	.spinner {
		width:16px; height:16px;
		border:2px solid rgba(255,255,255,0.3);
		border-top-color:white; border-radius:50%;
		animation:spin 0.6s linear infinite;
	}
	@keyframes spin { to { rotate:360deg; } }

	/* ─── Results ────────────────────────── */
	.results-section { margin-top:2rem; }
	.results-bar {
		display:flex; justify-content:space-between; align-items:center;
		margin-bottom:0.75rem;
	}
	.results-bar h2 { font-size:1rem; font-weight:600; }

	.ghost-btn {
		padding:0.35rem 0.85rem; border:1px solid var(--border);
		border-radius:8px; background:transparent;
		color:var(--text-dim); font-size:0.8rem; font-family:inherit;
		cursor:pointer; transition:all 0.15s;
	}
	.ghost-btn:hover { background:var(--accent-soft); color:var(--accent); }

	.results-grid {
		display:grid;
		grid-template-columns:repeat(auto-fill, minmax(180px, 1fr));
		gap:0.75rem;
	}

	.result-card {
		background:var(--surface);
		border:1px solid var(--border-soft);
		border-radius:12px; overflow:hidden;
		transition:border-color 0.2s, transform 0.15s;
	}
	.result-card:hover { border-color:var(--border-accent); transform:translateY(-1px); }

	.preview {
		background:var(--preview-bg); padding:1rem;
		display:flex; align-items:center; justify-content:center;
		min-height:100px;
	}
	.preview img { max-width:100%; max-height:80px; transition:transform 0.2s; }
	.preview img:hover { transform:scale(1.1); }

	.card-body { padding:0.65rem; }
	.card-meta { display:flex; flex-direction:column; gap:0.35rem; margin-bottom:0.5rem; }
	.card-name { font-size:0.7rem; color:var(--text-dim); word-break:break-all; }
	.card-tags { display:flex; gap:0.25rem; flex-wrap:wrap; }
	.tag {
		font-size:0.55rem; font-weight:500;
		background:var(--accent-soft); color:var(--accent);
		padding:0.1rem 0.4rem; border-radius:4px;
	}
	.card-actions { display:flex; gap:0.25rem; justify-content:flex-end; }

	.icon-btn {
		width:28px; height:28px; border:none; border-radius:6px;
		background:transparent; color:var(--text-dim);
		display:flex; align-items:center; justify-content:center;
		cursor:pointer; transition:all 0.15s;
	}
	.icon-btn:hover { background:var(--accent-soft); color:var(--accent); }

	/* ─── Empty State ────────────────────── */
	.empty-state {
		text-align:center; padding:4rem 1rem;
	}
	.empty-icon { margin-bottom:1rem; }
	.empty-state h3 { font-size:1.1rem; font-weight:600; margin-bottom:0.35rem; }
	.empty-state p { color:var(--text-muted); font-size:0.85rem; max-width:360px; margin:0 auto; }

	/* ─── Skeleton ───────────────────────── */
	.skeleton-card {
		background:var(--surface);
		border:1px solid var(--border-soft);
		border-radius:12px; overflow:hidden;
	}
	.skeleton-preview {
		height:100px; background:var(--skeleton);
		animation:pulse 1.5s ease-in-out infinite;
	}
	.skeleton-line {
		height:10px; border-radius:4px; background:var(--skeleton);
		animation:pulse 1.5s ease-in-out infinite;
	}
	@keyframes pulse {
		0%,100% { opacity:0.3; }
		50% { opacity:0.6; }
	}

	/* ─── Footer ─────────────────────────── */
	footer {
		text-align:center; margin-top:3rem; padding:1.5rem;
		color:var(--text-dim); font-size:0.75rem; display:flex;
		align-items:center; justify-content:center; gap:0.5rem;
	}
	footer .sep { color:var(--text-dim); }

	/* ─── Settings Panel ─────────────────── */
	.controls-head {
		display:flex; justify-content:space-between; align-items:flex-start;
		margin-bottom:0.85rem; gap:0.5rem;
	}
	.controls-head p {
		margin:0; font-size:0.75rem; color:var(--text-muted);
	}
	.controls-eyebrow {
		font-size:0.65rem; font-weight:600; text-transform:uppercase;
		letter-spacing:0.08em; color:var(--text-dim); display:block; margin-bottom:0.15rem;
	}

	/* ─── Settings Modal ─────────────── */
	.settings-modal-backdrop {
		position:fixed; inset:0; z-index:50;
		background:rgba(0,0,0,0.6);
	}
	.settings-modal {
		position:fixed; inset:0; z-index:51;
		display:flex; align-items:center; justify-content:center;
		padding:1rem;
		pointer-events:none;
	}
	.settings-modal-card {
		background:var(--surface-strong);
		border:1px solid var(--border);
		border-radius:16px;
		width:100%; max-width:600px;
		max-height:85vh;
		overflow-y:auto;
		padding:1.25rem;
		pointer-events:auto;
		box-shadow:0 16px 48px rgba(0,0,0,0.5);
	}
	.settings-modal-head {
		display:flex; justify-content:space-between; align-items:flex-start;
		gap:1rem; margin-bottom:1rem;
	}
	.settings-modal-title {
		font-size:1.1rem; font-weight:600; margin:0;
	}
	.settings-modal-meta {
		font-size:0.75rem; color:var(--text-muted); margin:0.15rem 0 0.5rem;
	}
	.settings-modal-close {
		width:28px; height:28px; border:none; border-radius:6px;
		background:transparent; color:var(--text-dim);
		font-size:1rem; cursor:pointer; display:flex;
		align-items:center; justify-content:center; flex-shrink:0;
		transition:all 0.15s;
	}
	.settings-modal-close:hover { background:var(--accent-soft); color:var(--accent); }

	.settings-composer {
		margin-bottom:1rem; padding-bottom:1rem;
		border-bottom:1px solid var(--border);
		display:flex; flex-direction:column; gap:0.5rem;
	}
	.settings-composer-row {
		display:flex; gap:0.5rem;
	}
	.settings-composer-row .field {
		flex:1; min-width:0;
	}
	.settings-composer-row .field.composer-action {
		flex:0 0 auto; display:flex; align-items:end;
	}
	.settings-composer-row .secondary-btn {
		white-space:nowrap; padding:0.5rem 0.85rem;
	}

	.settings-provider-list {
		margin-bottom:0.75rem;
	}

	.settings-fields-row {
		display:flex; gap:0.5rem;
	}
	.settings-fields-row .field {
		flex:1; min-width:0;
	}

	.settings-summary {
		display:flex; gap:1rem; flex-wrap:wrap;
		font-size:0.7rem; color:var(--text-dim); margin-bottom:0.75rem;
	}

	@media (max-width: 500px) {
		.settings-composer-row { flex-direction:column; }
		.settings-fields-row { flex-direction:column; }
		.settings-modal-card { padding:1rem; }
	}

	.settings-note {
		font-size:0.75rem; color:var(--accent); margin-bottom:0.75rem;
		padding:0.5rem 0.75rem; background:var(--accent-soft);
		border-radius:8px;
	}

	.provider-editor {
		background:var(--control-bg); border:1px solid var(--border);
		border-radius:10px; padding:0.75rem; margin-bottom:0.65rem;
	}
	.provider-editor-head {
		display:flex; justify-content:space-between; align-items:center;
		margin-bottom:0.5rem;
	}
	.provider-editor-head span {
		font-size:0.8rem; font-weight:600;
	}
	.settings-fields {
		display:flex; flex-direction:column; gap:0.5rem;
	}
	.settings-fields .field {
		min-width:0;
	}
	.settings-fields .field input {
		width:100%; padding:0.5rem 0.65rem;
		background:var(--bg); border:1px solid var(--border);
		border-radius:8px; color:var(--text); font-size:0.8rem;
		font-family:'Instrument Sans', system-ui, sans-serif;
		transition:border-color 0.2s;
	}
	.settings-fields .field input:focus {
		outline:none; border-color:var(--accent);
	}
	.settings-fields .field input::placeholder {
		color:var(--placeholder);
	}
	.settings-fields .field input:disabled {
		opacity:0.5; cursor:not-allowed;
	}
	.settings-fields .field label {
		font-size:0.6rem; margin-bottom:0.2rem;
	}
	.field-hint {
		font-size:0.6rem; color:var(--text-dim); margin-top:0.15rem; display:block;
	}

	.checkbox-row {
		display:flex; align-items:center; gap:0.35rem; margin-top:0.35rem;
	}
	.checkbox-row input[type="checkbox"] {
		width:auto; cursor:pointer;
	}
	.checkbox-row label {
		font-size:0.7rem; color:var(--text-muted); cursor:pointer; margin:0;
	}

	.provider-error {
		font-size:0.75rem; color:#e74c3c; margin-bottom:0.5rem;
		padding:0.35rem 0.6rem; background:rgba(231,76,60,0.1);
		border-radius:6px;
	}

	.settings-actions {
		display:flex; gap:0.5rem; flex-wrap:wrap; margin-top:0.75rem;
	}
	.secondary-btn {
		padding:0.4rem 0.75rem; border:1px solid var(--border);
		border-radius:8px; background:var(--control-bg);
		color:var(--text); font-size:0.78rem; font-family:inherit;
		cursor:pointer; transition:all 0.15s;
	}
	.secondary-btn:hover:not(:disabled) { background:var(--accent-soft); color:var(--accent); }
	.secondary-btn:disabled { opacity:0.4; cursor:not-allowed; }

	.danger-btn {
		padding:0.25rem 0.6rem; border:1px solid rgba(231,76,60,0.3);
		border-radius:6px; background:transparent;
		color:#e74c3c; font-size:0.7rem; font-family:inherit;
		cursor:pointer; transition:all 0.15s;
	}
	.danger-btn:hover:not(:disabled) { background:rgba(231,76,60,0.1); }
	.danger-btn:disabled { opacity:0.4; cursor:not-allowed; }
</style>
