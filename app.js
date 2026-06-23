/* XMA Shoot Pack — wizard engine.
   Loads pack definitions from window.XMA_PACKS, drives the step-by-step UI,
   autosaves to localStorage, and renders the final brief.
*/

const STORAGE_KEY = "xma_shoot_pack_v2";

// ---------- STATE ----------
const state = {
  briefs: [],        // submitted + in-progress saved briefs
  current: null,     // currently active brief (in wizard)
  step: 0,
  screen: "welcome",
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    state.briefs  = data.briefs  || [];
    state.current = data.current || null;
    state.step    = data.step    || 0;
  } catch (e) { console.error("Failed to load state:", e); }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    briefs: state.briefs,
    current: state.current,
    step: state.step,
  }));
  flashAutosave();
}

let autosaveTimer = null;
function flashAutosave() {
  const el = document.getElementById("autosaveNote");
  if (!el) return;
  el.textContent = "Saving…";
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => { el.textContent = "Autosaved ✓"; }, 300);
}

function uid() { return Math.random().toString(36).slice(2, 10); }

// ---------- WIZARD STEP DEFINITIONS ----------
// Format / Creative / Product are PER-VIDEO. The other shared sections (model, setting,
// motion/audio, text/branding) stay batch-wide since they're usually consistent.
const WIZARD_STEPS = [
  { id: "identity",       title: "Project identity",    render: ctx => renderFieldSection(ctx, ctx.pack.shared.identity) },
  { id: "videos",         title: "Your videos",         render: renderVideosList },
  { id: "format",         title: "Format — per video",  render: ctx => renderPerVideoSection(ctx, ctx.pack.shared.format) },
  { id: "creative",       title: "Creative — per video",render: ctx => renderPerVideoSection(ctx, ctx.pack.shared.creative) },
  { id: "product",        title: "Product — per video", render: renderProductPerVideo },
  { id: "modelModesty",   title: "Model — modesty & cultural", render: ctx => renderFieldSection(ctx, ctx.pack.shared.modelModesty) },
  { id: "modelAppearance",title: "Model — appearance",  render: ctx => renderFieldSection(ctx, ctx.pack.shared.modelAppearance) },
  { id: "modelOther",     title: "Model — other",       render: ctx => renderFieldSection(ctx, ctx.pack.shared.modelOther) },
  { id: "setting",        title: "Setting, lighting, palette", render: ctx => renderFieldSection(ctx, ctx.pack.shared.setting) },
  { id: "motionAudio",    title: "Motion, camera & audio", render: ctx => renderFieldSection(ctx, ctx.pack.shared.motionAudio) },
  { id: "textBranding",   title: "On-screen text & branding", render: ctx => renderFieldSection(ctx, ctx.pack.shared.textBranding) },
  { id: "assets",         title: "Universal assets",    render: renderAssets },
  { id: "preflight",      title: "Pre-flight & submit", render: renderPreflight },
];

// ---------- SCREEN ROUTING ----------
function showScreen(name) {
  state.screen = name;
  document.querySelectorAll(".screen").forEach(s => {
    s.hidden = s.id !== "screen-" + name;
  });
  document.querySelectorAll(".navlink").forEach(nl => {
    nl.classList.toggle("active", nl.dataset.screen === name);
  });
  if (name === "welcome")   renderWelcome();
  if (name === "list")      renderBriefList();
  if (name === "wizard")    renderWizard();
  if (name === "brief")     renderBriefView();
  updateBriefCount();
  window.scrollTo({ top: 0, behavior: "instant" });
}

function updateBriefCount() {
  const el = document.getElementById("briefCount");
  if (el) el.textContent = state.briefs.length;
}

// nav clicks
document.querySelectorAll(".navlink").forEach(nl => {
  nl.addEventListener("click", () => showScreen(nl.dataset.screen));
});
document.getElementById("brandHome").addEventListener("click", () => showScreen("welcome"));

// ---------- WELCOME / CATEGORY PICKER ----------
function renderWelcome() {
  const grid = document.getElementById("categoryGrid");
  grid.innerHTML = "";
  Object.entries(XMA_PACKS).forEach(([key, pack]) => {
    const card = document.createElement("button");
    card.className = "category-card";
    card.innerHTML = `
      <div class="icon">${pack.icon}</div>
      <h3>${pack.label}</h3>
      <div class="tagline">${pack.tagline}</div>
    `;
    card.addEventListener("click", () => startNewBrief(key));
    grid.appendChild(card);
  });

  // resume strip — if there's an in-progress (non-submitted) current
  const resume = document.getElementById("resumeStrip");
  if (state.current && !state.current.submitted) {
    const pack = XMA_PACKS[state.current.category];
    document.getElementById("resumeMeta").textContent =
      `${pack?.label || "Brief"} — ${state.current.data?.identity?.businessName || "Untitled"} — step ${state.step + 1}`;
    resume.hidden = false;
  } else {
    resume.hidden = true;
  }
}

document.getElementById("resumeContinue").addEventListener("click", () => {
  showScreen("wizard");
});
document.getElementById("resumeDiscard").addEventListener("click", () => {
  if (!confirm("Discard the in-progress brief? This cannot be undone.")) return;
  state.current = null; state.step = 0; save();
  renderWelcome();
});

function startNewBrief(category) {
  if (state.current && !state.current.submitted) {
    if (!confirm("You have an in-progress brief. Starting a new one will discard it. Continue?")) return;
  }
  state.current = {
    id: uid(),
    category,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    submitted: false,
    submittedAt: null,
    data: { videoMap: [], assets: {}, preflight: {} },
  };
  state.step = 0;
  save();
  showScreen("wizard");
}

// ---------- WIZARD RENDERER ----------
function renderWizard() {
  if (!state.current) { showScreen("welcome"); return; }
  const pack = XMA_PACKS[state.current.category];
  const step = WIZARD_STEPS[state.step];
  const ctx = { pack, brief: state.current };

  document.getElementById("wizardCategory").textContent = `${pack.icon} ${pack.label}`;
  document.getElementById("wizardStepLabel").textContent = `Step ${state.step + 1} of ${WIZARD_STEPS.length}`;
  document.getElementById("progressFill").style.width = `${((state.step + 1) / WIZARD_STEPS.length) * 100}%`;

  const content = document.getElementById("wizardContent");
  content.innerHTML = "";
  step.render(ctx, content);

  document.getElementById("wizardBack").disabled = state.step === 0;
  const nextBtn = document.getElementById("wizardNext");
  nextBtn.textContent = state.step === WIZARD_STEPS.length - 1 ? "Submit brief →" : "Next →";
}

document.getElementById("wizardBack").addEventListener("click", () => {
  if (state.step > 0) { state.step--; save(); renderWizard(); }
});
document.getElementById("wizardNext").addEventListener("click", () => {
  // Navigation is unblocked — required-field markers (* and CRITICAL) are guidance only.
  if (state.step < WIZARD_STEPS.length - 1) {
    state.step++; save(); renderWizard();
  } else {
    submitBrief();
  }
});
document.getElementById("wizardSaveExit").addEventListener("click", () => {
  save();
  alert("Saved. You can resume later from the welcome screen or Saved briefs.");
  showScreen("welcome");
});

// ---------- FIELD RENDERER ----------
function renderFieldSection(ctx, section) {
  const root = document.getElementById("wizardContent");
  root.innerHTML = `
    <h2>${section.title}</h2>
    <p class="step-intro">${section.intro || ""}</p>
    <div id="sectionFields"></div>
  `;
  const target = root.querySelector("#sectionFields");
  // store data for this section under brief.data[sectionKey]
  // we infer the sectionKey from current wizard step id
  const stepId = WIZARD_STEPS[state.step].id;
  ctx.brief.data[stepId] = ctx.brief.data[stepId] || {};
  const data = ctx.brief.data[stepId];

  section.fields.forEach(f => target.appendChild(renderField(f, data)));
}

function renderField(f, dataObj) {
  const wrap = document.createElement("div");
  wrap.className = "field";

  const label = document.createElement("label");
  label.className = "field-label";
  label.innerHTML = `
    ${escapeHtml(f.label)}
    ${f.required ? '<span class="req">*</span>' : ""}
    ${f.critical ? '<span class="crit">CRITICAL</span>' : ""}
  `;
  wrap.appendChild(label);

  let input;
  if (f.type === "textarea") {
    input = document.createElement("textarea");
    input.rows = 3;
    if (f.placeholder) input.placeholder = f.placeholder;
    input.value = dataObj[f.key] ?? "";
    input.addEventListener("input", () => { dataObj[f.key] = input.value; save(); });
  }
  else if (f.type === "select") {
    input = document.createElement("select");
    input.innerHTML = `<option value="">— pick one —</option>` +
      f.options.map(o => `<option ${dataObj[f.key] === o ? "selected" : ""}>${escapeHtml(o)}</option>`).join("");
    input.addEventListener("change", () => { dataObj[f.key] = input.value; save(); });
  }
  else if (f.type === "multi") {
    input = document.createElement("div");
    input.className = "multi-options";
    const current = Array.isArray(dataObj[f.key]) ? dataObj[f.key] : [];
    f.options.forEach(o => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip" + (current.includes(o) ? " checked" : "");
      chip.textContent = o;
      chip.addEventListener("click", () => {
        const arr = Array.isArray(dataObj[f.key]) ? dataObj[f.key] : [];
        const idx = arr.indexOf(o);
        if (idx >= 0) arr.splice(idx, 1); else arr.push(o);
        dataObj[f.key] = arr;
        chip.classList.toggle("checked", arr.includes(o));
        save();
      });
      input.appendChild(chip);
    });
  }
  else { // text, number, date, email
    input = document.createElement("input");
    input.type = f.type;
    if (f.placeholder) input.placeholder = f.placeholder;
    if (f.min != null) input.min = f.min;
    input.value = dataObj[f.key] ?? "";
    input.addEventListener("input", () => {
      dataObj[f.key] = f.type === "number" ? (input.value === "" ? "" : Number(input.value)) : input.value;
      save();
    });
  }
  wrap.appendChild(input);

  if (f.help) {
    const help = document.createElement("div");
    help.className = "field-help";
    help.textContent = f.help;
    wrap.appendChild(help);
  }

  return wrap;
}

// ---------- VALIDATION ----------
function validateStep(step, pack) {
  const missing = [];
  // Field sections (have a config object)
  let section = null;
  if (step.id === "product") section = pack.product;
  else if (pack.shared[step.id]) section = pack.shared[step.id];

  if (section) {
    const data = state.current.data[step.id] || {};
    section.fields.forEach(f => {
      if (!f.required) return;
      const val = data[f.key];
      const empty = val == null || val === "" || (Array.isArray(val) && val.length === 0);
      if (empty) missing.push(f.label);
    });
  }
  return missing;
}

// ---------- PER-VIDEO RENDERER ----------
// Generic: turns a SHARED section into N video accordion blocks.
function renderPerVideoSection(ctx, section) {
  const root = document.getElementById("wizardContent");
  const stepId = WIZARD_STEPS[state.step].id;
  ctx.brief.data[stepId] = ctx.brief.data[stepId] || { videos: [] };
  const target = videoCount();
  const videos = ctx.brief.data[stepId].videos;
  while (videos.length < target) videos.push({});
  while (videos.length > target && videos.length > 1) videos.pop();

  root.innerHTML = `
    <h2>${escapeHtml(section.title)}</h2>
    <p class="step-intro">${escapeHtml(section.intro || "")}</p>
    <p class="muted" style="margin-bottom: 12px;">
      One block per video. Edit each individually, or use <b>Copy first → all</b> to apply the first video's answers to every video at once.
    </p>
    <div class="wizard-toolbar">
      <button class="btn btn-primary btn-sm" id="addVideoHere">+ Add video</button>
      <button class="btn btn-ghost btn-sm" id="copyFirstAll">Copy first → all</button>
      <button class="btn btn-ghost btn-sm" id="expandAllBlocks">Expand all</button>
      <button class="btn btn-ghost btn-sm" id="collapseAllBlocks">Collapse all</button>
    </div>
    <div id="perVideoContainer"></div>
  `;
  drawVideoBlocks(root, section, videos, null, () => renderPerVideoSection(ctx, section));

  root.querySelector("#addVideoHere").addEventListener("click", () => {
    addVideo();
    renderPerVideoSection(ctx, section);
  });
  root.querySelector("#copyFirstAll").addEventListener("click", () => {
    if (!videos[0]) return;
    if (!confirm(`Copy Video 1's answers to all ${videos.length} videos? This overwrites existing answers.`)) return;
    for (let i = 1; i < videos.length; i++) videos[i] = JSON.parse(JSON.stringify(videos[0]));
    save();
    drawVideoBlocks(root, section, videos, null, () => renderPerVideoSection(ctx, section));
  });
  root.querySelector("#expandAllBlocks").addEventListener("click", () =>
    root.querySelectorAll("details.video-block").forEach(d => d.open = true));
  root.querySelector("#collapseAllBlocks").addEventListener("click", () =>
    root.querySelectorAll("details.video-block").forEach(d => d.open = false));
}

function ensureVideoMeta(count) {
  state.current.data.videos = state.current.data.videos || [];
  const list = state.current.data.videos;
  while (list.length < count) list.push({ title: "", description: "" });
  while (list.length > count && list.length > 1) list.pop();
  return list;
}

function videoLabel(i) {
  const meta = (state.current.data.videos || [])[i];
  return meta?.title ? `${i + 1}. ${meta.title}` : `Video ${i + 1}`;
}

// ---------- ADD / REMOVE VIDEO (synced across every per-video step) ----------
const PER_VIDEO_STEPS = ["format", "creative", "product"];

function videoCount() {
  return Math.max(1, (state.current.data.videos || []).length || Number(state.current.data.identity?.videoCount) || 1);
}

function addVideo() {
  const d = state.current.data;
  d.videos = d.videos || [];
  d.videos.push({ title: "", description: "" });
  PER_VIDEO_STEPS.forEach(k => {
    d[k] = d[k] || { videos: [] };
    d[k].videos = d[k].videos || [];
    d[k].videos.push({});
  });
  d.identity = d.identity || {};
  d.identity.videoCount = d.videos.length;
  save();
}

function removeVideo(i) {
  const d = state.current.data;
  if ((d.videos || []).length <= 1) {
    alert("You need at least one video.");
    return;
  }
  d.videos.splice(i, 1);
  PER_VIDEO_STEPS.forEach(k => {
    if (d[k] && Array.isArray(d[k].videos)) d[k].videos.splice(i, 1);
  });
  d.identity = d.identity || {};
  d.identity.videoCount = d.videos.length;
  save();
}

function drawVideoBlocks(root, section, videos, extraRenderer, redraw) {
  const container = root.querySelector("#perVideoContainer");
  container.innerHTML = "";
  const metaList = ensureVideoMeta(videos.length);

  videos.forEach((vid, i) => {
    const meta = metaList[i];
    const block = document.createElement("details");
    block.className = "video-block";
    block.open = i === 0;
    block.innerHTML = `
      <summary>
        <span class="vb-num">${i + 1}</span>
        <span class="vb-label">${escapeHtml(videoLabel(i))}</span>
        ${videos.length > 1 ? `<button class="btn-link vb-del" title="Remove this video">Remove</button>` : ""}
      </summary>
      <div class="vb-body"></div>
    `;
    const body = block.querySelector(".vb-body");

    // shared title — editable from any per-video step
    const titleWrap = document.createElement("div");
    titleWrap.className = "field";
    titleWrap.innerHTML = `
      <label class="field-label">Video title (shared across all steps)</label>
      <input type="text" class="vid-title-inline" value="${escapeAttr(meta.title)}" placeholder="e.g. Hero ring reveal" />
    `;
    titleWrap.querySelector(".vid-title-inline").addEventListener("input", e => {
      meta.title = e.target.value;
      block.querySelector(".vb-label").textContent = videoLabel(i);
      save();
    });
    body.appendChild(titleWrap);

    // step-specific fields
    section.fields.forEach(f => body.appendChild(renderField(f, vid)));
    if (extraRenderer) extraRenderer(vid, body, i);

    // per-block remove
    const delBtn = block.querySelector(".vb-del");
    if (delBtn) delBtn.addEventListener("click", (e) => {
      e.preventDefault(); e.stopPropagation();
      if (!confirm(`Remove Video ${i + 1}? Its answers in all steps will be deleted.`)) return;
      removeVideo(i);
      if (redraw) redraw();
    });

    container.appendChild(block);
  });
}

// ---------- "YOUR VIDEOS" STEP ----------
// Dedicated step right after Identity — name every video and write a one-liner
// describing what should happen. Title & description are reused as the label of
// each per-video block in Format / Creative / Product.
function renderVideosList(ctx) {
  const root = document.getElementById("wizardContent");
  const count = videoCount();
  ensureVideoMeta(count);
  // also make sure every per-video step has matching rows
  PER_VIDEO_STEPS.forEach(k => {
    state.current.data[k] = state.current.data[k] || { videos: [] };
    while (state.current.data[k].videos.length < count) state.current.data[k].videos.push({});
    while (state.current.data[k].videos.length > count && state.current.data[k].videos.length > 1) state.current.data[k].videos.pop();
  });

  root.innerHTML = `
    <h2>Your videos</h2>
    <p class="step-intro">
      Give each video a title and a short description. Add or remove videos any time —
      Format / Creative / Product will automatically stay in sync.
    </p>
    <div id="videosListContainer"></div>
    <div style="margin-top: 14px; display: flex; gap: 8px;">
      <button class="btn btn-primary btn-sm" id="addVideoBtn">+ Add another video</button>
    </div>
  `;

  function draw() {
    const container = root.querySelector("#videosListContainer");
    const list = state.current.data.videos;
    container.innerHTML = "";
    list.forEach((meta, i) => {
      const card = document.createElement("div");
      card.className = "video-meta-card";
      card.innerHTML = `
        <div class="vmc-head">
          <span class="vb-num">${i + 1}</span>
          <span class="vmc-num">Video ${i + 1}</span>
          ${list.length > 1 ? `<button class="btn-link vmc-del" title="Remove this video">Remove</button>` : ""}
        </div>
        <div class="field">
          <label class="field-label">Title</label>
          <input type="text" class="vml-title" value="${escapeAttr(meta.title)}" placeholder="e.g. Hero ring reveal · Founder testimonial · Before & after" />
        </div>
        <div class="field">
          <label class="field-label">Description — what should happen in this video?</label>
          <textarea rows="3" class="vml-desc" placeholder="2–3 lines: the moment, the mood, the message. e.g. 'Close-up of the rose-gold solitaire spinning on a marble plinth, sparkle catches the light, ends on logo + CTA.'">${escapeHtml(meta.description)}</textarea>
        </div>
      `;
      card.querySelector(".vml-title").addEventListener("input", e => { meta.title = e.target.value; save(); });
      card.querySelector(".vml-desc").addEventListener("input", e => { meta.description = e.target.value; save(); });
      const del = card.querySelector(".vmc-del");
      if (del) del.addEventListener("click", () => {
        if (!confirm(`Remove Video ${i + 1}? All its Format, Creative, and Product answers will be deleted.`)) return;
        removeVideo(i);
        draw();
      });
      container.appendChild(card);
    });
  }
  draw();

  root.querySelector("#addVideoBtn").addEventListener("click", () => {
    addVideo();
    draw();
  });
}

// ---------- PRODUCT — PER VIDEO (incl. measurements + 10-photo requirement) ----------
function renderProductPerVideo(ctx) {
  const root = document.getElementById("wizardContent");
  const pack = ctx.pack;
  state.current.data.product = state.current.data.product || { videos: [] };
  const target = videoCount();
  const videos = state.current.data.product.videos;
  while (videos.length < target) videos.push({});
  while (videos.length > target && videos.length > 1) videos.pop();

  const measurementHint = pack.sizingRows.map(r => `<b>${escapeHtml(r.item)}</b> (${escapeHtml(r.units)})`).join(" · ");

  root.innerHTML = `
    <h2>${escapeHtml(pack.product.title)} — per video</h2>
    <p class="step-intro">${escapeHtml(pack.product.intro)}</p>
    <div class="callout callout-warn">
      <b>What we need for every product:</b><br/>
      1) Exact measurements (so AI doesn't render the wrong scale)<br/>
      2) <b>At least 10 reference photos</b> with a <b>known object next to it</b> for scale —
         a coin, a ruler, a finger, a credit card. This is how we know the real-life size.
    </div>
    <p class="muted" style="font-size: 12px; margin-bottom: 14px;">
      <b>What to measure for ${escapeHtml(pack.label)}:</b> ${measurementHint}
    </p>
    <div class="wizard-toolbar">
      <button class="btn btn-primary btn-sm" id="addVideoHere">+ Add video</button>
      <button class="btn btn-ghost btn-sm" id="copyFirstAll">Copy first → all</button>
      <button class="btn btn-ghost btn-sm" id="expandAllBlocks">Expand all</button>
      <button class="btn btn-ghost btn-sm" id="collapseAllBlocks">Collapse all</button>
    </div>
    <div id="perVideoContainer"></div>
  `;

  drawVideoBlocks(root, pack.product, videos, (vid, body, idx) => {
    // append per-video extras: measurements, photos folder, photo confirmation
    const extras = document.createElement("div");
    extras.className = "per-video-extras";
    extras.innerHTML = `
      <div class="field">
        <label class="field-label">Measurements for this product <span class="req">*</span></label>
        <textarea rows="2" class="vid-measurements" placeholder="e.g. Ring band 3mm wide, US size 6.5, diamond 0.5ct, 5mm round"></textarea>
        <div class="field-help">Be exact. Wrong scale on screen is a top reshoot trigger.</div>
      </div>
      <div class="field">
        <label class="field-label">
          Photo folder link <span class="crit">CRITICAL</span>
        </label>
        <input type="text" class="vid-photo-link" placeholder="Google Drive / iCloud / Dropbox folder URL" />
        <div class="field-help">Folder must contain <b>at least 10 photos</b> of this exact product, each with a known scale object next to it.</div>
      </div>
      <div class="field">
        <label class="checkbox-line">
          <input type="checkbox" class="vid-photo-confirm" />
          <span>I confirm <b>10+ photos</b> have been uploaded to that folder, each showing a <b>known scale object</b> (coin / ruler / finger / credit card).</span>
        </label>
      </div>
    `;
    body.appendChild(extras);

    const m = extras.querySelector(".vid-measurements");
    const p = extras.querySelector(".vid-photo-link");
    const c = extras.querySelector(".vid-photo-confirm");
    m.value = vid._measurements || "";
    p.value = vid._photoFolder || "";
    c.checked = !!vid._photo10Confirmed;
    m.addEventListener("input", () => { vid._measurements = m.value; save(); });
    p.addEventListener("input", () => { vid._photoFolder = p.value; save(); });
    c.addEventListener("change", () => { vid._photo10Confirmed = c.checked; save(); });
  }, () => renderProductPerVideo(ctx));

  root.querySelector("#addVideoHere").addEventListener("click", () => {
    addVideo();
    renderProductPerVideo(ctx);
  });
  root.querySelector("#copyFirstAll").addEventListener("click", () => {
    if (!videos[0]) return;
    if (!confirm(`Copy Video 1's product details to all ${videos.length} videos? This overwrites existing answers.`)) return;
    for (let i = 1; i < videos.length; i++) videos[i] = JSON.parse(JSON.stringify(videos[0]));
    save(); renderProductPerVideo(ctx);
  });
  root.querySelector("#expandAllBlocks").addEventListener("click", () =>
    root.querySelectorAll("details.video-block").forEach(d => d.open = true));
  root.querySelector("#collapseAllBlocks").addEventListener("click", () =>
    root.querySelectorAll("details.video-block").forEach(d => d.open = false));
}

// ---------- ASSETS STEP ----------
const UNIVERSAL_ASSETS = [
  { key: "logo",         label: "Logo files (vector + PNG, light & dark)" },
  { key: "brandGuide",   label: "Brand guidelines (colors, fonts, tone)" },
  { key: "productImages",label: "Hi-res product images (multiple angles, clean background)" },
  { key: "measurements", label: "Product measurements (filled above)" },
  { key: "references",   label: "2–3 reference video links (entered in Creative step)" },
  { key: "dosDonts",     label: "Do / don't list (visual + messaging boundaries)" },
  { key: "copy",         label: "Final on-screen copy (exact text, offers, prices)" },
];

function renderAssets(ctx) {
  const root = document.getElementById("wizardContent");
  const pack = ctx.pack;
  state.current.data.assets = state.current.data.assets || {};
  const data = state.current.data.assets;

  root.innerHTML = `
    <h2>Assets to send us</h2>
    <p class="step-intro">
      Production cannot start until we receive and verify the required assets. Tick each as you send them
      (you can mark some now and finish later — autosaved).
    </p>
    <h3>Universal (always required)</h3>
    <ul class="checklist" id="universalAssets"></ul>
    <h3 style="margin-top: 22px;">${pack.label}-specific</h3>
    <ul class="checklist" id="extraAssets"></ul>
    <div class="field" style="margin-top: 22px;">
      <label class="field-label">Where will you send these? (link to Drive folder / WhatsApp thread / email)</label>
      <input type="text" id="assetDropLink" placeholder="e.g. https://drive.google.com/..." />
    </div>
  `;

  function fillList(id, items) {
    const list = document.getElementById(id);
    list.innerHTML = "";
    items.forEach(item => {
      const key = item.key || ("extra_" + (item.asset || "").replace(/\s/g, "_"));
      const checked = !!data[key];
      const li = document.createElement("li");
      li.innerHTML = `
        <input type="checkbox" id="ck_${key}" ${checked ? "checked" : ""}/>
        <label for="ck_${key}">
          <b>${escapeHtml(item.label || item.asset)}</b>
          ${item.spec ? `<div class="muted" style="font-size:12px;">${escapeHtml(item.spec)} — ${escapeHtml(item.why || "")}</div>` : ""}
        </label>
      `;
      li.querySelector("input").addEventListener("change", e => { data[key] = e.target.checked; save(); });
      list.appendChild(li);
    });
  }
  fillList("universalAssets", UNIVERSAL_ASSETS);
  fillList("extraAssets", pack.assetExtras);

  const linkInp = document.getElementById("assetDropLink");
  linkInp.value = data._dropLink || "";
  linkInp.addEventListener("input", () => { data._dropLink = linkInp.value; save(); });
}

// ---------- PRE-FLIGHT CHECKLIST STEP ----------
const UNIVERSAL_PREFLIGHT = [
  { key: "aspect",      label: "Aspect ratio(s) confirmed per video", critical: true },
  { key: "references",  label: "2–3 reference videos collected", critical: true },
  { key: "hook",        label: "Hook style chosen per video", critical: true },
  { key: "modesty",     label: "Hijab / modesty / cultural fit confirmed (not assumed)", critical: true },
  { key: "photos10",    label: "10+ photos per product uploaded, each with a scale reference object", critical: true },
  { key: "measurements",label: "Exact measurements provided for every product", critical: true },
  { key: "approver",    label: "Single approver named", critical: true },
];

function renderPreflight(ctx) {
  const root = document.getElementById("wizardContent");
  const pack = ctx.pack;
  state.current.data.preflight = state.current.data.preflight || {};
  const data = state.current.data.preflight;

  root.innerHTML = `
    <h2>Pre-flight checklist & submit</h2>
    <p class="step-intro">
      Final check. Every <span class="pill pill-bad">CRITICAL</span> item must be ticked before production
      can start. You can submit now and tick the rest as you go — we just need them all before we render.
    </p>
    <ul class="checklist" id="preflightList"></ul>
    <div class="callout callout-warn" style="margin-top: 18px;">
      <b>Your declaration:</b> by submitting, you confirm the single approver named in this brief has reviewed
      and approved every decision above. We'll match the final output against this brief — any change after
      submit triggers a revision cycle.
    </div>
  `;

  const all = [
    ...UNIVERSAL_PREFLIGHT,
    ...pack.preflightExtras.map(label => ({ key: label, label, critical: true })),
  ];
  const list = root.querySelector("#preflightList");
  all.forEach(item => {
    const checked = !!data[item.key];
    const li = document.createElement("li");
    li.className = item.critical ? "critical" : "";
    li.innerHTML = `
      <input type="checkbox" id="pf_${escapeAttr(item.key)}" ${checked ? "checked" : ""}/>
      <label for="pf_${escapeAttr(item.key)}">${escapeHtml(item.label)}</label>
    `;
    li.querySelector("input").addEventListener("change", e => { data[item.key] = e.target.checked; save(); });
    list.appendChild(li);
  });
}

// ---------- SUBMIT ----------
function submitBrief() {
  if (!state.current) return;
  state.current.submitted = true;
  state.current.submittedAt = new Date().toISOString();
  state.current.updatedAt = state.current.submittedAt;
  // move into briefs list (or update existing)
  const idx = state.briefs.findIndex(b => b.id === state.current.id);
  if (idx >= 0) state.briefs[idx] = state.current;
  else state.briefs.push(state.current);
  save();
  showScreen("submitted");
}

document.getElementById("viewBriefBtn").addEventListener("click", () => {
  showScreen("brief");
});
document.getElementById("downloadBriefBtn").addEventListener("click", () => {
  if (state.current) downloadBriefJson(state.current);
});
document.getElementById("emailBriefBtn").addEventListener("click", () => {
  if (!state.current) return;
  const subj = encodeURIComponent(`Shoot brief — ${state.current.data?.identity?.businessName || "client"}`);
  const body = encodeURIComponent(
    `Hi XMA team,\n\nMy shoot brief is attached / linked. Brief ID: ${state.current.id}\n\nPlease confirm receipt.\n\n— ${state.current.data?.identity?.contactName || ""}\n`
  );
  window.location.href = `mailto:hello@xma.agency?subject=${subj}&body=${body}`;
});

// ---------- SAVED BRIEFS LIST ----------
function renderBriefList() {
  const list = document.getElementById("briefList");
  const empty = document.getElementById("briefEmpty");
  list.innerHTML = "";
  const items = [...state.briefs].sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  if (state.current && !state.current.submitted) {
    items.unshift(state.current);
  }
  if (items.length === 0) { empty.style.display = ""; return; }
  empty.style.display = "none";

  items.forEach(b => {
    const pack = XMA_PACKS[b.category];
    const card = document.createElement("div");
    card.className = "brief-card";
    const status = b.submitted
      ? `<span class="pill pill-ok">Submitted</span>`
      : `<span class="pill pill-warn">In progress</span>`;
    card.innerHTML = `
      <div class="bc-head">
        <h3>${pack?.icon || ""} ${escapeHtml(b.data?.identity?.businessName || "Untitled")}</h3>
        ${status}
      </div>
      <div class="bc-meta">
        ${escapeHtml(pack?.label || "")} · ${b.data?.identity?.videoCount || "?"} videos · updated ${new Date(b.updatedAt || b.createdAt).toLocaleDateString()}
      </div>
      <div style="margin-top: 10px; display: flex; gap: 6px;">
        <button class="btn btn-ghost btn-sm" data-action="view">View / print</button>
        ${b.submitted ? "" : `<button class="btn btn-ghost btn-sm" data-action="resume">Resume</button>`}
        <button class="btn btn-ghost btn-sm" data-action="download">Download</button>
        <button class="btn btn-ghost btn-sm" data-action="delete">Delete</button>
      </div>
    `;
    card.querySelector('[data-action="view"]').addEventListener("click", () => openBriefView(b.id));
    const resumeBtn = card.querySelector('[data-action="resume"]');
    if (resumeBtn) resumeBtn.addEventListener("click", () => {
      state.current = b;
      // figure out step roughly — find first step missing data
      state.step = findResumeStep(b);
      save(); showScreen("wizard");
    });
    card.querySelector('[data-action="download"]').addEventListener("click", () => downloadBriefJson(b));
    card.querySelector('[data-action="delete"]').addEventListener("click", () =>
      confirmAction("Delete brief?", `“${b.data?.identity?.businessName || "Untitled"}” will be permanently removed.`, () => {
        state.briefs = state.briefs.filter(x => x.id !== b.id);
        if (state.current?.id === b.id) { state.current = null; state.step = 0; }
        save(); renderBriefList(); updateBriefCount();
      }));
    list.appendChild(card);
  });
}

function findResumeStep(b) {
  for (let i = 0; i < WIZARD_STEPS.length; i++) {
    const step = WIZARD_STEPS[i];
    const data = b.data?.[step.id];
    if (!data || Object.keys(data).length === 0) return i;
  }
  return WIZARD_STEPS.length - 1;
}

document.getElementById("newBriefBtn").addEventListener("click", () => showScreen("welcome"));
document.getElementById("importBriefBtn").addEventListener("click", () => document.getElementById("importFile").click());
document.getElementById("importFile").addEventListener("change", async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    if (Array.isArray(data)) data.forEach(d => importOneBrief(d));
    else importOneBrief(data);
    save(); renderBriefList(); updateBriefCount();
    alert("Brief imported.");
  } catch { alert("Could not parse that file."); }
  e.target.value = "";
});

function importOneBrief(d) {
  if (!d.id) d.id = uid();
  const idx = state.briefs.findIndex(b => b.id === d.id);
  if (idx >= 0) state.briefs[idx] = d; else state.briefs.push(d);
}

// ---------- BRIEF VIEW (printable) ----------
let viewingBriefId = null;
function openBriefView(id) {
  viewingBriefId = id;
  showScreen("brief");
}

function renderBriefView() {
  const b = state.briefs.find(x => x.id === viewingBriefId) || state.current;
  if (!b) { showScreen("list"); return; }
  const pack = XMA_PACKS[b.category];
  const content = document.getElementById("briefContent");
  const d = b.data || {};

  const idn = d.identity || {};
  const kvBlock = (obj, section) => {
    if (!section || !section.fields) return Object.entries(obj || {}).filter(([k,v]) => v != null && v !== "" && !k.startsWith("_")).map(([k,v]) =>
      `<div class="kv"><div class="k">${escapeHtml(k)}</div><div class="v">${escapeHtml(formatVal(v))}</div></div>`).join("");
    return section.fields.map(f => {
      const v = obj?.[f.key];
      if (v == null || v === "" || (Array.isArray(v) && v.length === 0)) return "";
      return `<div class="kv"><div class="k">${escapeHtml(f.label)}</div><div class="v">${escapeHtml(formatVal(v))}</div></div>`;
    }).join("");
  };

  // helper: render a per-video section
  const meta = d.videos || [];
  const perVideoBlock = (sectionData, sectionConfig, extraRows) => {
    const vids = sectionData?.videos || [];
    if (!vids.length) return "<div class='muted'>(no entries)</div>";
    return vids.map((vid, i) => {
      const m = meta[i] || {};
      const title = m.title || `Video ${i + 1}`;
      const desc = m.description ? `<div class="video-summary-desc">${escapeHtml(m.description)}</div>` : "";
      const rows = sectionConfig.fields.map(f => {
        const v = vid?.[f.key];
        if (v == null || v === "" || (Array.isArray(v) && v.length === 0)) return "";
        return `<div class="kv"><div class="k">${escapeHtml(f.label)}</div><div class="v">${escapeHtml(formatVal(v))}</div></div>`;
      }).join("");
      const extras = extraRows ? extraRows(vid) : "";
      return `<div class="video-summary">
        <h3>${i + 1}. ${escapeHtml(title)}</h3>
        ${desc}
        ${rows || "<div class='muted'>(no answers)</div>"}${extras}
      </div>`;
    }).join("");
  };

  let html = `
    <h1>${pack.icon} ${escapeHtml(idn.businessName || "Untitled")} — ${escapeHtml(pack.label)} Shoot Brief</h1>
    <div class="brief-meta">
      Brief ID: ${b.id} · Status: ${b.submitted ? "Submitted " + new Date(b.submittedAt).toLocaleString() : "In progress"} ·
      ${idn.videoCount || "?"} videos · Tier: ${escapeHtml(idn.tier || "—")} · Deadline: ${escapeHtml(idn.deadline || "—")}
    </div>

    <h2>1 · Identity</h2>${kvBlock(d.identity, pack.shared.identity)}
    <h2>2 · Videos</h2>${
      (d.videos && d.videos.length)
        ? `<ol class="brief-video-list">${d.videos.map(v =>
            `<li><b>${escapeHtml(v.title || "(untitled)")}</b>${v.description ? `<div class="muted">${escapeHtml(v.description)}</div>` : ""}</li>`
          ).join("")}</ol>`
        : "<div class='muted'>(no titles set)</div>"
    }
    <h2>3 · Format — per video</h2>${perVideoBlock(d.format, pack.shared.format)}
    <h2>4 · Creative — per video</h2>${perVideoBlock(d.creative, pack.shared.creative)}
    <h2>5 · Product — per video (${escapeHtml(pack.label)})</h2>${perVideoBlock(d.product, pack.product, (vid) => {
      let extra = "";
      if (vid._measurements) extra += `<div class="kv"><div class="k">Measurements</div><div class="v">${escapeHtml(vid._measurements)}</div></div>`;
      if (vid._photoFolder)  extra += `<div class="kv"><div class="k">Photo folder</div><div class="v">${escapeHtml(vid._photoFolder)}</div></div>`;
      extra += `<div class="kv"><div class="k">10+ photos w/ scale ref</div><div class="v">${vid._photo10Confirmed ? "✓ confirmed" : "— not confirmed"}</div></div>`;
      return extra;
    })}
    <h2>6 · Model — modesty</h2>${kvBlock(d.modelModesty, pack.shared.modelModesty)}
    <h2>7 · Model — appearance</h2>${kvBlock(d.modelAppearance, pack.shared.modelAppearance)}
    <h2>8 · Model — other</h2>${kvBlock(d.modelOther, pack.shared.modelOther)}
    <h2>9 · Setting / lighting / palette</h2>${kvBlock(d.setting, pack.shared.setting)}
    <h2>10 · Motion / camera / audio</h2>${kvBlock(d.motionAudio, pack.shared.motionAudio)}
    <h2>11 · On-screen text & branding</h2>${kvBlock(d.textBranding, pack.shared.textBranding)}
  `;

  if (d.assets && Object.keys(d.assets).length) {
    html += `<h2>12 · Universal asset checklist</h2><table><thead><tr><th>Asset</th><th>Sent?</th></tr></thead><tbody>`;
    Object.entries(d.assets).filter(([k]) => k !== "_dropLink").forEach(([k, v]) => {
      const label = k.startsWith("extra_") ? k.replace(/^extra_/, "").replace(/_/g, " ") : k;
      html += `<tr><td>${escapeHtml(label)}</td><td>${v ? "✓" : "—"}</td></tr>`;
    });
    html += `</tbody></table>`;
    if (d.assets._dropLink) html += `<div style="margin-top:8px;"><b>Asset drop:</b> ${escapeHtml(d.assets._dropLink)}</div>`;
  }

  if (d.preflight) {
    html += `<h2>13 · Pre-flight checklist</h2><table><thead><tr><th>Item</th><th>Confirmed</th></tr></thead><tbody>`;
    Object.entries(d.preflight).forEach(([k,v]) => html += `<tr><td>${escapeHtml(k)}</td><td>${v ? "✓" : "—"}</td></tr>`);
    html += `</tbody></table>`;
  }

  html += `
    <h2>Common faults this brief pre-empts</h2>
    <ul>${pack.faultsToAvoid.map(f => `<li style="margin: 4px 0; font-size: 13px;">${escapeHtml(f)}</li>`).join("")}</ul>
  `;

  content.innerHTML = html;
}

document.getElementById("briefBack").addEventListener("click", () => showScreen("list"));
document.getElementById("briefPrint").addEventListener("click", () => window.print());
document.getElementById("briefDownload").addEventListener("click", () => {
  const b = state.briefs.find(x => x.id === viewingBriefId) || state.current;
  if (b) downloadBriefJson(b);
});

// ---------- DOWNLOAD HELPER ----------
function downloadBriefJson(b) {
  const pack = XMA_PACKS[b.category];
  const name = (b.data?.identity?.businessName || "brief").replace(/[^a-z0-9]+/gi, "_");
  const blob = new Blob([JSON.stringify(b, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `xma_${pack?.label?.toLowerCase() || "brief"}_${name}_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
}

// ---------- CONFIRM MODAL ----------
let confirmFn = null;
function confirmAction(title, body, onOk) {
  document.getElementById("confirmTitle").textContent = title;
  document.getElementById("confirmBody").textContent = body || "";
  confirmFn = onOk;
  document.getElementById("confirmModal").hidden = false;
}
document.getElementById("confirmCancel").addEventListener("click", () => document.getElementById("confirmModal").hidden = true);
document.getElementById("confirmOk").addEventListener("click", () => {
  document.getElementById("confirmModal").hidden = true;
  if (confirmFn) confirmFn();
  confirmFn = null;
});
document.querySelectorAll(".modal-close").forEach(btn => {
  btn.addEventListener("click", () => {
    const id = btn.dataset.close;
    if (id) document.getElementById(id).hidden = true;
  });
});
document.querySelectorAll(".modal").forEach(m => m.addEventListener("click", e => {
  if (e.target === m) m.hidden = true;
}));
document.addEventListener("keydown", e => {
  if (e.key === "Escape") document.querySelectorAll(".modal").forEach(m => m.hidden = true);
});

// ---------- HELPERS ----------
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function escapeAttr(s) { return escapeHtml(s).replace(/`/g, "&#96;"); }
function formatVal(v) {
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

// ---------- INIT ----------
load();
document.querySelectorAll(".modal").forEach(m => { m.hidden = true; });
showScreen("welcome");
updateBriefCount();
