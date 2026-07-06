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

	function showToast(msg) {
		toast = msg;
		setTimeout(() => toast = '', 3000);
	}

	async function loadData() {
		try {
			const [sRes, tRes] = await Promise.all([
				fetch('/api/styles'),
				fetch('/api/templates')
			]);
			const s = await sRes.json();
			const t = await tRes.json();
			if (s.success) {
				styles = s.styles;
				updatePreview();
			}
			if (t.success) templates = t.templates;
		} catch (e) {
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
					count
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
				<path d="M12 2L2 7v10l10 5 10-5V7l-10-5z" stroke="#A78BFA" fill="#A78BFA" fill-opacity="0.2"/>
				<circle cx="12" cy="12" r="3" stroke="#A78BFA"/>
				<path d="M12 9v6M9 12h6" stroke="#A78BFA" stroke-width="2"/>
			</svg>
			<span>SVG Forge</span>
		</div>
		<p class="tagline">Generate consistent SVG assets with handcrafted design styles</p>
	</header>

	<main>
		<!-- Controls -->
		<section class="controls-card">
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

<style>
	/* ─── Reset ──────────────────────────── */
	:global(*) { margin:0; padding:0; box-sizing:border-box; }
	:global(body) {
		font-family: 'Instrument Sans', system-ui, sans-serif;
		background:#0a0a0f;
		color:#e2e8f0;
		min-height:100vh;
		overflow-x:hidden;
	}

	/* ─── Background ─────────────────────── */
	.page { position:relative; max-width:880px; margin:0 auto; padding:2rem 1rem; min-height:100vh; }
	.bg-glow {
		position:fixed; top:-30vh; left:50%; translate:-50% 0;
		width:800px; height:800px;
		background:radial-gradient(circle, rgba(167,139,250,0.06) 0%, transparent 70%);
		pointer-events:none; z-index:0;
	}
	.bg-grid {
		position:fixed; inset:0;
		background-image:radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px);
		background-size:32px 32px;
		pointer-events:none; z-index:0;
	}
	header, main, footer { position:relative; z-index:1; }

	/* ─── Toast ──────────────────────────── */
	.toast {
		position:fixed; bottom:2rem; left:50%; translate:-50% 0;
		background:#1e1b2e; border:1px solid rgba(167,139,250,0.2);
		border-radius:10px; padding:0.6rem 1.2rem;
		font-size:0.85rem; color:#d8d0f0;
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
	.tagline { color:#64748b; font-size:0.9rem; }

	/* ─── Controls ───────────────────────── */
	.controls-card {
		background:rgba(30,27,46,0.6);
		backdrop-filter:blur(12px);
		border:1px solid rgba(255,255,255,0.06);
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
		color:#64748b; margin-bottom:0.35rem;
	}

	.select-wrap { position:relative; }
	.select-wrap select {
		width:100%; padding:0.55rem 0.75rem;
		background:#0f0f1a; border:1px solid rgba(255,255,255,0.08);
		border-radius:10px; color:#e2e8f0; font-size:0.85rem;
		font-family:'Instrument Sans', system-ui, sans-serif;
		appearance:none; cursor:pointer;
		transition:border-color 0.2s;
	}
	.select-wrap select:focus { outline:none; border-color:#A78BFA; }

	.swatches {
		display:flex; gap:3px; margin-top:0.4rem;
	}
	.swatch {
		width:14px; height:14px; border-radius:50%;
		border:1px solid rgba(255,255,255,0.08);
		transition:transform 0.15s;
	}
	.swatch:hover { transform:scale(1.3); z-index:2; }

	.field input {
		width:100%; padding:0.55rem 0.75rem;
		background:#0f0f1a; border:1px solid rgba(255,255,255,0.08);
		border-radius:10px; color:#e2e8f0; font-size:0.85rem;
		font-family:'Instrument Sans', system-ui, sans-serif;
		transition:border-color 0.2s;
	}
	.field input:focus { outline:none; border-color:#A78BFA; }
	.field input::placeholder { color:#475569; }

	.count-wrap {
		display:flex; align-items:center; gap:0.25rem;
		background:#0f0f1a; border:1px solid rgba(255,255,255,0.08);
		border-radius:10px; padding:0.15rem;
	}
	.count-btn {
		width:32px; height:32px; border:none; border-radius:8px;
		background:transparent; color:#94a3b8;
		font-size:1.1rem; cursor:pointer; display:flex;
		align-items:center; justify-content:center;
		font-family:inherit;
		transition:background 0.15s;
	}
	.count-btn:hover:not(:disabled) { background:rgba(167,139,250,0.1); color:#A78BFA; }
	.count-btn:disabled { opacity:0.3; cursor:not-allowed; }
	.count-val {
		min-width:24px; text-align:center; font-size:0.9rem;
		font-weight:500;
	}

	/* ─── Generate Button ────────────────── */
	.gen-btn {
		width:100%; margin-top:0.85rem;
		padding:0.65rem; border:none; border-radius:10px;
		background:linear-gradient(135deg, #7c3aed, #a78bfa);
		color:white; font-size:0.9rem; font-weight:600;
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
		padding:0.35rem 0.85rem; border:1px solid rgba(255,255,255,0.08);
		border-radius:8px; background:transparent;
		color:#94a3b8; font-size:0.8rem; font-family:inherit;
		cursor:pointer; transition:all 0.15s;
	}
	.ghost-btn:hover { background:rgba(255,255,255,0.05); color:#e2e8f0; }

	.results-grid {
		display:grid;
		grid-template-columns:repeat(auto-fill, minmax(180px, 1fr));
		gap:0.75rem;
	}

	.result-card {
		background:rgba(30,27,46,0.5);
		border:1px solid rgba(255,255,255,0.06);
		border-radius:12px; overflow:hidden;
		transition:border-color 0.2s, transform 0.15s;
	}
	.result-card:hover { border-color:rgba(167,139,250,0.2); transform:translateY(-1px); }

	.preview {
		background:#0a0a0f; padding:1rem;
		display:flex; align-items:center; justify-content:center;
		min-height:100px;
	}
	.preview img { max-width:100%; max-height:80px; transition:transform 0.2s; }
	.preview img:hover { transform:scale(1.1); }

	.card-body { padding:0.65rem; }
	.card-meta { display:flex; flex-direction:column; gap:0.35rem; margin-bottom:0.5rem; }
	.card-name { font-size:0.7rem; color:#94a3b8; word-break:break-all; }
	.card-tags { display:flex; gap:0.25rem; flex-wrap:wrap; }
	.tag {
		font-size:0.55rem; font-weight:500;
		background:rgba(167,139,250,0.1); color:#A78BFA;
		padding:0.1rem 0.4rem; border-radius:4px;
	}
	.card-actions { display:flex; gap:0.25rem; justify-content:flex-end; }

	.icon-btn {
		width:28px; height:28px; border:none; border-radius:6px;
		background:transparent; color:#64748b;
		display:flex; align-items:center; justify-content:center;
		cursor:pointer; transition:all 0.15s;
	}
	.icon-btn:hover { background:rgba(167,139,250,0.1); color:#A78BFA; }

	/* ─── Empty State ────────────────────── */
	.empty-state {
		text-align:center; padding:4rem 1rem;
	}
	.empty-icon { margin-bottom:1rem; }
	.empty-state h3 { font-size:1.1rem; font-weight:600; margin-bottom:0.35rem; }
	.empty-state p { color:#64748b; font-size:0.85rem; max-width:360px; margin:0 auto; }

	/* ─── Skeleton ───────────────────────── */
	.skeleton-card {
		background:rgba(30,27,46,0.3);
		border:1px solid rgba(255,255,255,0.04);
		border-radius:12px; overflow:hidden;
	}
	.skeleton-preview {
		height:100px; background:rgba(255,255,255,0.03);
		animation:pulse 1.5s ease-in-out infinite;
	}
	.skeleton-line {
		height:10px; border-radius:4px; background:rgba(255,255,255,0.05);
		animation:pulse 1.5s ease-in-out infinite;
	}
	@keyframes pulse {
		0%,100% { opacity:0.3; }
		50% { opacity:0.6; }
	}

	/* ─── Footer ─────────────────────────── */
	footer {
		text-align:center; margin-top:3rem; padding:1.5rem;
		color:#334155; font-size:0.75rem; display:flex;
		align-items:center; justify-content:center; gap:0.5rem;
	}
	footer .sep { color:#1e293b; }
</style>
