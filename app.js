/* XMA Shoot Pack — wizard engine.
   Loads pack definitions from window.XMA_PACKS, drives the step-by-step UI,
   autosaves to localStorage, and renders the final brief.
*/

const STORAGE_KEY = "xma_shoot_pack_v2";

// ---------- STATE ----------
const state = {
  projects: [],          // [{ id, name, createdAt, updatedAt }]
  briefs: [],            // [{ id, projectId, category, ..., data: {...} }]
  current: null,         // currently active brief (in wizard) — has projectId
  activeProjectId: null, // project being viewed in detail screen
  viewingBriefId: null,  // brief being viewed in printable view
  step: 0,
  screen: "projects",
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    state.projects = data.projects || [];
    state.briefs   = data.briefs   || [];
    state.current  = data.current  || null;
    state.activeProjectId = data.activeProjectId || null;
    state.step     = data.step     || 0;
    migrate();
  } catch (e) { console.error("Failed to load state:", e); }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    projects: state.projects,
    briefs: state.briefs,
    current: state.current,
    activeProjectId: state.activeProjectId,
    step: state.step,
  }));
  flashAutosave();
}

// Migrations: legacy briefs get a default project; old 3-section model data gets
// collapsed into the new single data.models[] array.
function migrate() {
  // project wrapping
  const orphans = state.briefs.filter(b => !b.projectId);
  if (state.current && !state.current.projectId) orphans.push(state.current);
  if (orphans.length > 0) {
    let defaultProject = state.projects.find(p => p.name === "My first project");
    if (!defaultProject) {
      defaultProject = {
        id: uid(),
        name: "My first project",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.projects.push(defaultProject);
    }
    orphans.forEach(b => { b.projectId = defaultProject.id; });
  }
  // model collapse
  state.briefs.forEach(migrateModelsForBrief);
  if (state.current) migrateModelsForBrief(state.current);
}

// ---------- PROJECT HELPERS ----------
function createProject(name) {
  const p = {
    id: uid(),
    name: (name || "").trim() || "Untitled project",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  state.projects.push(p);
  save();
  return p;
}

function getProject(id) { return state.projects.find(p => p.id === id); }

function projectShoots(projectId) {
  const arr = state.briefs.filter(b => b.projectId === projectId);
  if (state.current && !state.current.submitted && state.current.projectId === projectId
      && !arr.find(x => x.id === state.current.id)) {
    arr.unshift(state.current);
  }
  return arr.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}

function renameProject(id, name) {
  const p = getProject(id);
  if (!p) return;
  p.name = (name || "").trim() || "Untitled project";
  p.updatedAt = new Date().toISOString();
  save();
}

function deleteProject(id) {
  state.projects = state.projects.filter(p => p.id !== id);
  state.briefs = state.briefs.filter(b => b.projectId !== id);
  if (state.current?.projectId === id) { state.current = null; state.step = 0; }
  if (state.activeProjectId === id) state.activeProjectId = null;
  save();
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
  { id: "models",         title: "Models",              render: renderModels },
  { id: "setting",        title: "Setting, lighting, palette", render: ctx => renderFieldSection(ctx, ctx.pack.shared.setting) },
  { id: "motionAudio",    title: "Motion, camera & audio", render: ctx => renderFieldSection(ctx, ctx.pack.shared.motionAudio) },
  { id: "textBranding",   title: "On-screen text & branding", render: ctx => renderFieldSection(ctx, ctx.pack.shared.textBranding) },
  { id: "assets",         title: "Universal assets",    render: renderAssets },
  { id: "prompts",        title: "Generated prompts",   render: renderPrompts },
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
  if (name === "projects") renderProjects();
  if (name === "project")  renderProject();
  if (name === "wizard")   renderWizard();
  if (name === "brief")    renderBriefView();
  if (name === "qa")       renderQA();
  updateProjectCount();
  window.scrollTo({ top: 0, behavior: "instant" });
}

function updateProjectCount() {
  const el = document.getElementById("projectCount");
  if (el) el.textContent = state.projects.length;
}

// nav clicks
document.querySelectorAll(".navlink").forEach(nl => {
  nl.addEventListener("click", () => showScreen(nl.dataset.screen));
});
document.getElementById("brandHome").addEventListener("click", () => showScreen("projects"));

// ---------- PROJECTS LIST (landing) ----------
function renderProjects() {
  const list = document.getElementById("projectsList");
  const empty = document.getElementById("projectsEmpty");
  list.innerHTML = "";
  if (state.projects.length === 0) { empty.style.display = ""; }
  else {
    empty.style.display = "none";
    [...state.projects]
      .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))
      .forEach(p => {
        const shoots = projectShoots(p.id);
        const submittedCount = shoots.filter(s => s.submitted).length;
        const videoCount = shoots.reduce((acc, s) => acc + (Number(s.data?.identity?.videoCount) || 0), 0);
        const card = document.createElement("div");
        card.className = "brief-card";
        card.innerHTML = `
          <div class="bc-head">
            <h3>${escapeHtml(p.name)}</h3>
            <span class="pill pill-info">${shoots.length} shoot${shoots.length === 1 ? "" : "s"}</span>
          </div>
          <div class="bc-meta">
            ${submittedCount} submitted · ${videoCount} total videos · updated ${new Date(p.updatedAt).toLocaleDateString()}
          </div>
        `;
        card.addEventListener("click", () => { state.activeProjectId = p.id; save(); showScreen("project"); });
        list.appendChild(card);
      });
  }

  // resume strip — if an in-progress brief exists, link to its project
  const resume = document.getElementById("resumeStrip");
  if (state.current && !state.current.submitted) {
    const pack = XMA_PACKS[state.current.category];
    const proj = getProject(state.current.projectId);
    document.getElementById("resumeMeta").textContent =
      `${proj?.name || "Project"} — ${pack?.label || "Shoot"} — step ${state.step + 1}`;
    resume.hidden = false;
  } else {
    resume.hidden = true;
  }
}

document.getElementById("resumeContinue").addEventListener("click", () => showScreen("wizard"));
document.getElementById("resumeDiscard").addEventListener("click", () => {
  if (!confirm("Discard the in-progress shoot? This cannot be undone.")) return;
  // remove unsaved current brief from briefs list as well
  if (state.current) state.briefs = state.briefs.filter(b => b.id !== state.current.id);
  state.current = null; state.step = 0; save();
  renderProjects();
});

// ---------- SINGLE PROJECT DETAIL ----------
function renderProject() {
  const p = getProject(state.activeProjectId);
  if (!p) { showScreen("projects"); return; }

  const nameInput = document.getElementById("projectNameEdit");
  nameInput.value = p.name;
  nameInput.oninput = () => renameProject(p.id, nameInput.value);

  const allShoots = projectShoots(p.id);
  const readyCount = allShoots.filter(s => briefReadiness(s).label === "Ready for production").length;
  document.getElementById("projectMeta").innerHTML =
    `Created ${new Date(p.createdAt).toLocaleDateString()} · ${allShoots.length} shoot(s) · <b>${readyCount} ready for production</b>`;

  // shoots list
  const list = document.getElementById("shootsList");
  const empty = document.getElementById("shootsEmpty");
  list.innerHTML = "";
  const shoots = projectShoots(p.id);
  if (shoots.length === 0) empty.style.display = "";
  else {
    empty.style.display = "none";
    shoots.forEach(s => {
      const pack = XMA_PACKS[s.category];
      const r = briefReadiness(s);
      const status = `<span class="pill ${r.className}">${r.label}</span>`;
      const card = document.createElement("div");
      card.className = "brief-card";
      card.innerHTML = `
        <div class="bc-head">
          <h3>${pack?.icon || ""} ${escapeHtml(s.data?.identity?.businessName || pack?.label || "Untitled")}</h3>
          ${status}
        </div>
        <div class="bc-meta">
          ${escapeHtml(pack?.label || "")} · ${s.data?.identity?.videoCount || "?"} videos · updated ${new Date(s.updatedAt || s.createdAt).toLocaleDateString()}
        </div>
        <div style="margin-top: 10px; display: flex; gap: 6px; flex-wrap: wrap;">
          <button class="btn btn-ghost btn-sm" data-action="view">View / print</button>
          ${s.submitted ? "" : `<button class="btn btn-ghost btn-sm" data-action="resume">Resume</button>`}
          <button class="btn btn-ghost btn-sm" data-action="qa">Review videos</button>
          <button class="btn btn-ghost btn-sm" data-action="download">Download</button>
          <button class="btn btn-ghost btn-sm" data-action="delete">Delete</button>
        </div>
      `;
      card.querySelector('[data-action="view"]').addEventListener("click", () => openBriefView(s.id));
      card.querySelector('[data-action="qa"]').addEventListener("click", () => openQA(s.id));
      const resumeBtn = card.querySelector('[data-action="resume"]');
      if (resumeBtn) resumeBtn.addEventListener("click", () => {
        state.current = s;
        state.step = findResumeStep(s);
        save(); showScreen("wizard");
      });
      card.querySelector('[data-action="download"]').addEventListener("click", () => downloadBriefJson(s));
      card.querySelector('[data-action="delete"]').addEventListener("click", () =>
        confirmAction("Delete shoot?", `“${pack?.label || "Shoot"}” will be permanently removed.`, () => {
          state.briefs = state.briefs.filter(x => x.id !== s.id);
          if (state.current?.id === s.id) { state.current = null; state.step = 0; }
          save(); renderProject();
        }));
      list.appendChild(card);
    });
  }

  // category picker for adding new shoot
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
    card.addEventListener("click", () => startNewBrief(key, p.id));
    grid.appendChild(card);
  });
}

// project header buttons
document.getElementById("projectBack").addEventListener("click", () => showScreen("projects"));
document.getElementById("deleteProjectBtn").addEventListener("click", () => {
  const p = getProject(state.activeProjectId);
  if (!p) return;
  confirmAction("Delete project?", `“${p.name}” and all its shoots will be permanently removed.`, () => {
    deleteProject(p.id);
    showScreen("projects");
  });
});
document.getElementById("exportProjectBtn").addEventListener("click", () => {
  const p = getProject(state.activeProjectId);
  if (!p) return;
  const bundle = { project: p, shoots: projectShoots(p.id) };
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `xma_project_${p.name.replace(/[^a-z0-9]+/gi, "_")}_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
});

// new project modal
const newProjectModal = document.getElementById("newProjectModal");
function openNewProjectModal() {
  document.getElementById("newProjectName").value = "";
  newProjectModal.hidden = false;
  setTimeout(() => document.getElementById("newProjectName").focus(), 50);
}
document.getElementById("newProjectBtn").addEventListener("click", openNewProjectModal);
document.getElementById("newProjectTopBtn").addEventListener("click", openNewProjectModal);
document.getElementById("cancelProjectBtn").addEventListener("click", () => newProjectModal.hidden = true);
document.getElementById("createProjectBtn").addEventListener("click", () => {
  const name = document.getElementById("newProjectName").value;
  const p = createProject(name);
  newProjectModal.hidden = true;
  state.activeProjectId = p.id; save();
  showScreen("project");
});
document.getElementById("newProjectName").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("createProjectBtn").click();
});

function startNewBrief(category, projectId) {
  if (state.current && !state.current.submitted) {
    if (!confirm("You have an in-progress shoot. Starting a new one will discard the unsaved one. Continue?")) return;
  }
  state.current = {
    id: uid(),
    projectId,
    category,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    submitted: false,
    submittedAt: null,
    data: { videos: [], assets: {}, preflight: {} },
  };
  state.briefs.push(state.current);  // tracked from the start so the project shows it
  state.step = 0;
  // bump project updatedAt
  const proj = getProject(projectId);
  if (proj) { proj.updatedAt = new Date().toISOString(); }
  save();
  showScreen("wizard");
}

// ---------- WIZARD RENDERER ----------
function renderWizard() {
  if (!state.current) { showScreen("projects"); return; }
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
  alert("Saved. You can resume from this project's page any time.");
  if (state.current?.projectId) {
    state.activeProjectId = state.current.projectId;
    showScreen("project");
  } else {
    showScreen("projects");
  }
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

const OTHER = "Other (specify)";

// Option helpers — let pack options be either strings or objects { label, swatch, emoji, img }
const optLabel  = (o) => typeof o === "string" ? o : (o?.label ?? "");
const optSwatch = (o) => typeof o === "object" ? o.swatch : null;
const optEmoji  = (o) => typeof o === "object" ? o.emoji  : null;
const optImg    = (o) => typeof o === "object" ? o.img    : null;

function renderOptionPreview(option) {
  if (!option) return "";
  const sw = optSwatch(option), em = optEmoji(option), im = optImg(option);
  if (!sw && !em && !im) return "";
  let chunks = [];
  if (sw) chunks.push(`<span class="opt-swatch" style="background:${sw}"></span>`);
  if (em) chunks.push(`<span class="opt-emoji">${em}</span>`);
  if (im) chunks.push(`<img class="opt-img" src="${escapeAttr(im)}" alt="">`);
  return `<div class="field-preview">${chunks.join("")}<span>${escapeHtml(optLabel(option))}</span></div>`;
}

// Check a field's dependsOn condition against current dataObj
function fieldShouldShow(f, dataObj) {
  if (!f.dependsOn) return true;
  const dep = f.dependsOn;
  const val = dataObj[dep.key];
  if ("equals" in dep) return val === dep.equals;
  if ("notEquals" in dep) return val !== dep.notEquals;
  if ("notIn" in dep) return !dep.notIn.includes(val ?? "");
  if ("in" in dep) return dep.in.includes(val ?? "");
  if ("not" in dep) return val !== dep.not;
  return true;
}

function renderField(f, dataObj, onChange) {
  const wrap = document.createElement("div");
  wrap.className = "field";
  if (!fieldShouldShow(f, dataObj)) wrap.style.display = "none";

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
    input.addEventListener("input", () => { dataObj[f.key] = input.value; save(); onChange?.(f.key); });
    wrap.appendChild(input);
  }
  else if (f.type === "select") {
    input = document.createElement("select");
    const opts = [...f.options, OTHER];
    const currentVal = dataObj[f.key];
    input.innerHTML = `<option value="">— pick one —</option>` +
      opts.map(o => {
        const lab = optLabel(o);
        return `<option value="${escapeAttr(lab)}" ${currentVal === lab ? "selected" : ""}>${escapeHtml(lab)}</option>`;
      }).join("");
    wrap.appendChild(input);

    // visual preview of currently-selected option (swatch / emoji / img)
    const previewWrap = document.createElement("div");
    previewWrap.className = "preview-slot";
    const updatePreview = () => {
      const sel = opts.find(o => optLabel(o) === dataObj[f.key]);
      previewWrap.innerHTML = renderOptionPreview(sel);
    };
    updatePreview();
    wrap.appendChild(previewWrap);

    // free-text "Other" input
    const otherKey = f.key + "_other";
    const otherInput = document.createElement("input");
    otherInput.type = "text";
    otherInput.className = "field-other";
    otherInput.placeholder = "Type your own value…";
    otherInput.value = dataObj[otherKey] ?? "";
    otherInput.style.display = dataObj[f.key] === OTHER ? "block" : "none";
    otherInput.addEventListener("input", () => { dataObj[otherKey] = otherInput.value; save(); });
    wrap.appendChild(otherInput);

    input.addEventListener("change", () => {
      dataObj[f.key] = input.value;
      otherInput.style.display = input.value === OTHER ? "block" : "none";
      if (input.value !== OTHER) { delete dataObj[otherKey]; otherInput.value = ""; }
      updatePreview();
      save();
      onChange?.(f.key);
    });
  }
  else if (f.type === "multi") {
    input = document.createElement("div");
    input.className = "multi-options";
    const current = Array.isArray(dataObj[f.key]) ? dataObj[f.key] : [];
    f.options.forEach(o => {
      const lab = optLabel(o);
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip" + (current.includes(lab) ? " checked" : "");
      const em = optEmoji(o);
      chip.innerHTML = `${em ? `<span class="opt-emoji">${em}</span>` : ""}${escapeHtml(lab)}`;
      chip.addEventListener("click", () => {
        const arr = Array.isArray(dataObj[f.key]) ? dataObj[f.key] : [];
        const idx = arr.indexOf(lab);
        if (idx >= 0) arr.splice(idx, 1); else arr.push(lab);
        dataObj[f.key] = arr;
        chip.classList.toggle("checked", arr.includes(lab));
        save();
        onChange?.(f.key);
      });
      input.appendChild(chip);
    });
    wrap.appendChild(input);

    const otherKey = f.key + "_other";
    const otherInput = document.createElement("input");
    otherInput.type = "text";
    otherInput.className = "field-other";
    otherInput.placeholder = "Add your own (comma-separated)…";
    otherInput.value = dataObj[otherKey] ?? "";
    otherInput.addEventListener("input", () => { dataObj[otherKey] = otherInput.value; save(); });
    wrap.appendChild(otherInput);
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
      onChange?.(f.key);
    });
    wrap.appendChild(input);
  }

  if (f.help) {
    const help = document.createElement("div");
    help.className = "field-help";
    help.textContent = f.help;
    wrap.appendChild(help);
  }

  return wrap;
}

// Resolve a field's display value (handles Other and arrays)
function resolveFieldDisplay(dataObj, key, value) {
  if (Array.isArray(value)) {
    const extra = dataObj?.[key + "_other"];
    return [...value, ...(extra ? [extra] : [])].join(", ");
  }
  if (value === OTHER) {
    return dataObj?.[key + "_other"] || "(other — not specified)";
  }
  return String(value ?? "");
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

// ---------- MODELS ----------
// Each shoot can have multiple distinct models. A "model" is a complete person
// spec (identity + modesty + appearance + wardrobe). Each video then picks which
// models appear in it via a cast selector.
function ensureModels() {
  state.current.data.models = state.current.data.models || [];
  return state.current.data.models;
}

function defaultModelName(i) { return `Model ${i + 1}`; }

function addModel(seed) {
  const list = ensureModels();
  list.push({ id: uid(), name: defaultModelName(list.length), ...(seed || {}) });
  save();
}

function removeModel(id) {
  const list = ensureModels();
  state.current.data.models = list.filter(m => m.id !== id);
  // remove from any video cast assignments
  (state.current.data.videos || []).forEach(v => {
    if (Array.isArray(v.cast)) v.cast = v.cast.filter(cid => cid !== id);
  });
  save();
}

function renderModels(ctx) {
  const root = document.getElementById("wizardContent");
  const pack = ctx.pack;
  const section = pack.shared.models;
  const list = ensureModels();
  // start with one blank model if none yet
  if (list.length === 0) addModel();

  root.innerHTML = `
    <h2>${escapeHtml(section.title)}</h2>
    <p class="step-intro">${escapeHtml(section.intro)}</p>
    <div class="wizard-toolbar">
      <button class="btn btn-primary btn-sm" id="addModelBtn">+ Add another model</button>
      <button class="btn btn-ghost btn-sm" id="expandAllModels">Expand all</button>
      <button class="btn btn-ghost btn-sm" id="collapseAllModels">Collapse all</button>
    </div>
    <div id="modelsContainer"></div>
  `;

  const container = root.querySelector("#modelsContainer");

  function drawAll() {
    container.innerHTML = "";
    const data = ensureModels();
    data.forEach((m, i) => {
      const block = document.createElement("details");
      block.className = "video-block model-block";
      block.open = i === 0;
      block.innerHTML = `
        <summary>
          <span class="vb-num">${i + 1}</span>
          <span class="vb-label">${escapeHtml(m.name || defaultModelName(i))}</span>
          ${data.length > 1 ? `<button class="btn-link vb-del" title="Remove this model">Remove</button>` : ""}
        </summary>
        <div class="vb-body"></div>
      `;
      const body = block.querySelector(".vb-body");

      // Editable name at the top
      const nameWrap = document.createElement("div");
      nameWrap.className = "field";
      nameWrap.innerHTML = `
        <label class="field-label">Model name (shorthand) <span class="req">*</span></label>
        <input type="text" class="model-name" value="${escapeAttr(m.name || "")}" placeholder='e.g. "Mariam — Khaleeji hijabi", "Founder", "Hand model A"' />
        <div class="field-help">A label so you can pick this model on the Videos step. Doesn't need to be a real person's name.</div>
      `;
      const nameInput = nameWrap.querySelector(".model-name");
      nameInput.addEventListener("input", () => {
        m.name = nameInput.value;
        block.querySelector(".vb-label").textContent = m.name || defaultModelName(i);
        save();
      });
      body.appendChild(nameWrap);

      // All shared model fields — pass an onChange callback so dependent
      // fields (e.g. hijabStyle depending on hijab) re-render their visibility.
      const fieldNodes = new Map();
      const refreshDeps = () => {
        section.fields.forEach(f => {
          const node = fieldNodes.get(f.key);
          if (!node) return;
          node.style.display = fieldShouldShow(f, m) ? "" : "none";
        });
      };
      section.fields.forEach(f => {
        const node = renderField(f, m, () => refreshDeps());
        fieldNodes.set(f.key, node);
        body.appendChild(node);
      });

      // Remove button
      const delBtn = block.querySelector(".vb-del");
      if (delBtn) delBtn.addEventListener("click", (e) => {
        e.preventDefault(); e.stopPropagation();
        if (!confirm(`Remove "${m.name || defaultModelName(i)}"? It will also be removed from any videos it's assigned to.`)) return;
        removeModel(m.id);
        drawAll();
      });

      container.appendChild(block);
    });
  }

  drawAll();
  root.querySelector("#addModelBtn").addEventListener("click", () => { addModel(); drawAll(); });
  root.querySelector("#expandAllModels").addEventListener("click", () =>
    root.querySelectorAll("details.model-block").forEach(d => d.open = true));
  root.querySelector("#collapseAllModels").addEventListener("click", () =>
    root.querySelectorAll("details.model-block").forEach(d => d.open = false));
}

// Migrate old model data (modelModesty / modelAppearance / modelOther) into a single
// model in data.models on first load. Only runs once per brief.
function migrateModelsForBrief(b) {
  if (!b || !b.data) return;
  if (Array.isArray(b.data.models) && b.data.models.length > 0) return;
  const mm = b.data.modelModesty;
  const ma = b.data.modelAppearance;
  const mo = b.data.modelOther;
  if (!mm && !ma && !mo) return;
  const merged = { id: uid(), name: "Model 1", ...(mm || {}), ...(ma || {}), ...(mo || {}) };
  delete merged.hasModel;
  delete merged.modelCount;
  b.data.models = [merged];
  delete b.data.modelModesty;
  delete b.data.modelAppearance;
  delete b.data.modelOther;
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
    const models = ensureModels();
    container.innerHTML = "";
    list.forEach((meta, i) => {
      meta.cast = Array.isArray(meta.cast) ? meta.cast : [];
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
        <div class="field">
          <label class="field-label">Cast — which models appear?</label>
          <div class="multi-options cast-chips"></div>
          <div class="field-help">Leave empty if this video is product-only / hands-only. Models are defined on the Models step.</div>
        </div>
      `;
      card.querySelector(".vml-title").addEventListener("input", e => { meta.title = e.target.value; save(); });
      card.querySelector(".vml-desc").addEventListener("input", e => { meta.description = e.target.value; save(); });

      const castEl = card.querySelector(".cast-chips");
      if (models.length === 0) {
        castEl.innerHTML = `<span class="muted" style="font-size: 13px;">No models defined yet — add models on the <b>Models</b> step.</span>`;
      } else {
        models.forEach(mod => {
          const chip = document.createElement("button");
          chip.type = "button";
          chip.className = "chip" + (meta.cast.includes(mod.id) ? " checked" : "");
          chip.textContent = mod.name || "Untitled model";
          chip.addEventListener("click", () => {
            const idx = meta.cast.indexOf(mod.id);
            if (idx >= 0) meta.cast.splice(idx, 1); else meta.cast.push(mod.id);
            chip.classList.toggle("checked", meta.cast.includes(mod.id));
            save();
          });
          castEl.appendChild(chip);
        });
      }

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

// ---------- PROMPT BUILDER ----------
// Compiles every field the wizard collected into ready-to-paste prompts for
// AI video tools (Sora, Veo, Higgsfield, Runway, etc.). Two formats per video:
//   - Structured (sectioned, easier to edit)
//   - Paragraph (single dense block, drop straight into a prompt box)
// Plus per-model character prompts.

function describeModel(m) {
  if (!m) return "";
  const parts = [];
  if (m.ageRange)    parts.push(m.ageRange.toLowerCase());
  if (m.gender)      parts.push(m.gender.toLowerCase());
  if (m.bodyType)    parts.push(`${m.bodyType.toLowerCase()} build`);
  if (m.nationality) parts.push(`${m.nationality.toLowerCase()} look`);
  if (m.skinTone)    parts.push(`${m.skinTone.toLowerCase()} skin`);
  if (m.hair && m.hair !== "Covered (hijab)") parts.push(`${m.hair.toLowerCase()} hair`);
  if (m.hijab && m.hijab !== "No hijab") {
    parts.push(m.hijabStyle ? `${m.hijabStyle.toLowerCase()} ${m.hijab.toLowerCase()}` : m.hijab.toLowerCase());
  }
  if (m.modestyLevel && m.modestyLevel !== "Standard (no restrictions)") parts.push(m.modestyLevel.toLowerCase());
  if (m.wardrobe)    parts.push(`wearing ${m.wardrobe.toLowerCase()}`);
  if (m.makeup)      parts.push(`${m.makeup.toLowerCase()} makeup`);
  if (m.nailStyle)   parts.push(`${m.nailStyle.toLowerCase()} nails`);
  if (m.expression)  parts.push(`${m.expression.toLowerCase()} expression`);
  return parts.join(", ");
}

function describeProduct(productData, pack) {
  if (!productData) return "";
  const skipKeys = new Set(["_measurements","_photoFolder","_photo10Confirmed"]);
  const bits = [];
  (pack.product?.fields || []).forEach(f => {
    if (skipKeys.has(f.key)) return;
    const v = productData[f.key];
    if (!v || v === "" || (Array.isArray(v) && v.length === 0)) return;
    bits.push(`${f.label.toLowerCase()}: ${Array.isArray(v) ? v.join(", ").toLowerCase() : String(v).toLowerCase()}`);
  });
  return bits.join("; ");
}

function compilePrompts(brief) {
  const d = brief.data;
  const pack = XMA_PACKS[brief.category];
  const videos = d.videos || [];
  const setting = d.setting || {};
  const motion  = d.motionAudio || {};
  const branding = d.textBranding || {};

  const perVideo = videos.map((meta, i) => {
    const fmt      = d.format?.videos?.[i] || {};
    const creative = d.creative?.videos?.[i] || {};
    const product  = d.product?.videos?.[i]  || {};
    const cast     = (meta.cast || []).map(id => d.models?.find(m => m.id === id)).filter(Boolean);

    // structured
    const lines = [];
    lines.push(`# Video ${i + 1}${meta.title ? " — " + meta.title : ""}`);
    if (meta.description) lines.push(`Concept: ${meta.description}`);
    lines.push("");
    lines.push(`[FORMAT]`);
    if (fmt.aspectRatio?.length) lines.push(`- Aspect: ${Array.isArray(fmt.aspectRatio) ? fmt.aspectRatio.join(", ") : fmt.aspectRatio}`);
    if (fmt.duration?.length)    lines.push(`- Duration: ${Array.isArray(fmt.duration) ? fmt.duration.join(", ") : fmt.duration}`);
    if (fmt.platforms?.length)   lines.push(`- Platforms: ${(fmt.platforms || []).join(", ")}`);
    if (fmt.resolution)          lines.push(`- Resolution: ${fmt.resolution}`);

    lines.push("");
    lines.push(`[CREATIVE]`);
    if (creative.mood)      lines.push(`- Mood: ${creative.mood}`);
    if (creative.pacing)    lines.push(`- Pacing: ${creative.pacing}`);
    if (creative.hookStyle) lines.push(`- Hook: ${creative.hookStyle}`);
    if (creative.storyArc)  lines.push(`- Arc: ${creative.storyArc}`);
    if (creative.ending)    lines.push(`- Ending: ${creative.ending}`);
    if (creative.referenceLinks) lines.push(`- References: ${creative.referenceLinks.replace(/\n/g, " | ")}`);

    if (cast.length) {
      lines.push("");
      lines.push(`[CAST]`);
      cast.forEach(m => lines.push(`- ${m.name || "Model"}: ${describeModel(m)}`));
    } else {
      lines.push("");
      lines.push(`[CAST] Product-only — no human model.`);
    }

    lines.push("");
    lines.push(`[PRODUCT — ${pack.label}]`);
    const pd = describeProduct(product, pack);
    if (pd) lines.push(`- ${pd}`);
    if (product._measurements) lines.push(`- Measurements: ${product._measurements}`);
    if (product._photoFolder)  lines.push(`- Reference photo folder: ${product._photoFolder}`);

    lines.push("");
    lines.push(`[SCENE]`);
    if (setting.location) lines.push(`- Location: ${setting.location}`);
    if (setting.lighting) lines.push(`- Lighting: ${setting.lighting}`);
    if (setting.palette)  lines.push(`- Palette: ${setting.palette}`);

    lines.push("");
    lines.push(`[CAMERA & MOTION]`);
    if (motion.cameraMove)    lines.push(`- Camera: ${motion.cameraMove}`);
    if (motion.subjectMotion) lines.push(`- Subject motion: ${motion.subjectMotion}`);
    if (motion.speed)         lines.push(`- Speed: ${motion.speed}`);
    if (motion.focus)         lines.push(`- Focus: ${motion.focus}`);

    lines.push("");
    lines.push(`[AUDIO]`);
    if (motion.music)     lines.push(`- Music: ${motion.music}`);
    if (motion.voiceover && motion.voiceover !== "None") {
      lines.push(`- Voiceover: ${motion.voiceover}${motion.voiceoverLanguage ? ` (${motion.voiceoverLanguage})` : ""}`);
    }
    if (motion.captions)  lines.push(`- Captions: ${motion.captions}`);
    if (motion.sfx)       lines.push(`- SFX: ${motion.sfx}`);

    if (branding.headline || branding.cta || branding.offer || branding.logoPlacement) {
      lines.push("");
      lines.push(`[ON-SCREEN]`);
      if (branding.headline) lines.push(`- Headline: "${branding.headline}"`);
      if (branding.offer)    lines.push(`- Offer: ${branding.offer}`);
      if (branding.cta)      lines.push(`- CTA: ${branding.cta}`);
      if (branding.logoPlacement) lines.push(`- Logo: ${branding.logoPlacement}${branding.logoStyle ? " (" + branding.logoStyle + ")" : ""}`);
    }

    const structured = lines.join("\n");

    // paragraph version — single dense block
    const para = buildParagraphPrompt(brief, i, pack, fmt, creative, product, setting, motion, branding, cast);

    return { structured, paragraph: para, title: meta.title || `Video ${i + 1}` };
  });

  // per-model prompts (character descriptions, useful for prompting character AI)
  const modelPrompts = (d.models || []).map(m => ({
    name: m.name || "Model",
    text: describeModel(m),
  }));

  return { perVideo, modelPrompts };
}

function buildParagraphPrompt(brief, i, pack, fmt, creative, product, setting, motion, branding, cast) {
  const parts = [];
  const dur  = Array.isArray(fmt.duration) ? fmt.duration[0] : fmt.duration;
  const asp  = Array.isArray(fmt.aspectRatio) ? fmt.aspectRatio[0] : fmt.aspectRatio;
  const opener = [
    dur && dur.toLowerCase(),
    asp,
    creative.mood && creative.mood.toLowerCase(),
    "video"
  ].filter(Boolean).join(" ");
  if (opener) parts.push(`A ${opener}`);

  const meta = brief.data.videos?.[i];
  if (meta?.description) parts.push(meta.description.replace(/\.$/, ""));

  if (product?.productType) parts.push(`featuring ${product.productType.toLowerCase()}`);
  if (cast?.length) {
    const m = cast[0];
    const desc = describeModel(m);
    if (desc) parts.push(`with ${desc}`);
  }
  if (setting.location) parts.push(`in a ${setting.location.toLowerCase()}`);
  if (setting.lighting) parts.push(`under ${setting.lighting.toLowerCase()}`);
  if (setting.palette)  parts.push(`${setting.palette.toLowerCase()} palette`);
  if (motion.cameraMove) parts.push(`${motion.cameraMove.toLowerCase()} camera`);
  if (motion.speed && motion.speed !== "Real-time") parts.push(motion.speed.toLowerCase());
  if (motion.music && motion.music !== "None") parts.push(`${motion.music.toLowerCase()} music`);
  if (motion.voiceover && motion.voiceover !== "None") parts.push(`${motion.voiceover.toLowerCase()} voiceover${motion.voiceoverLanguage ? " in " + motion.voiceoverLanguage : ""}`);
  if (branding.headline) parts.push(`on-screen headline "${branding.headline}"`);
  if (branding.cta) parts.push(`call-to-action "${branding.cta}"`);
  return parts.join(", ") + ".";
}

async function copyToClipboard(text, btnEl) {
  try {
    await navigator.clipboard.writeText(text);
    if (btnEl) {
      const orig = btnEl.textContent;
      btnEl.textContent = "Copied ✓";
      btnEl.classList.add("copied");
      setTimeout(() => { btnEl.textContent = orig; btnEl.classList.remove("copied"); }, 1500);
    }
  } catch {
    alert("Clipboard blocked. Select & copy manually.");
  }
}

function renderPrompts(ctx) {
  const root = document.getElementById("wizardContent");
  const { perVideo, modelPrompts } = compilePrompts(state.current);
  root.innerHTML = `
    <h2>Generated prompts</h2>
    <p class="step-intro">
      Auto-built from everything you entered above. Paste these into your AI video tool (Sora, Veo,
      Higgsfield, Runway, etc.). Edit the prompt for fine-grained control — the form's job is to
      get you 80% of the way there.
    </p>
    <div class="callout">
      Two formats per video: <b>Structured</b> (easy to edit section-by-section) and
      <b>Paragraph</b> (single dense block, drop straight into a prompt box).
      Plus per-model <b>character prompts</b> below.
    </div>
    <div id="promptsContainer"></div>
  `;
  const container = root.querySelector("#promptsContainer");

  if (perVideo.length === 0) {
    container.innerHTML = `<div class="empty">No videos defined yet. Add videos in earlier steps to generate prompts.</div>`;
    return;
  }

  perVideo.forEach((p, idx) => {
    const block = document.createElement("div");
    block.className = "prompt-block";
    block.innerHTML = `
      <h3>${idx + 1}. ${escapeHtml(p.title)}</h3>
      <div class="prompt-pair">
        <div class="prompt-card">
          <div class="prompt-card-head">
            <span class="prompt-card-label">Structured</span>
            <button class="btn btn-ghost btn-sm copy-btn" data-text="structured">Copy</button>
          </div>
          <textarea readonly>${escapeHtml(p.structured)}</textarea>
        </div>
        <div class="prompt-card">
          <div class="prompt-card-head">
            <span class="prompt-card-label">Paragraph</span>
            <button class="btn btn-ghost btn-sm copy-btn" data-text="paragraph">Copy</button>
          </div>
          <textarea readonly>${escapeHtml(p.paragraph)}</textarea>
        </div>
      </div>
    `;
    block.querySelectorAll(".copy-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const which = btn.dataset.text;
        copyToClipboard(which === "structured" ? p.structured : p.paragraph, btn);
      });
    });
    container.appendChild(block);
  });

  if (modelPrompts.length) {
    const modBlock = document.createElement("div");
    modBlock.className = "prompt-block";
    modBlock.innerHTML = `
      <h3 style="margin-top: 18px;">Character prompts (one per model)</h3>
      <p class="muted" style="font-size: 13px; margin-bottom: 10px;">
        Use these to lock the character look in a character-consistency tool (Midjourney character refs, Higgsfield character, etc.).
      </p>
      <div id="modelPromptList"></div>
    `;
    container.appendChild(modBlock);
    const list = modBlock.querySelector("#modelPromptList");
    modelPrompts.forEach(mp => {
      const card = document.createElement("div");
      card.className = "prompt-card";
      card.innerHTML = `
        <div class="prompt-card-head">
          <span class="prompt-card-label">${escapeHtml(mp.name)}</span>
          <button class="btn btn-ghost btn-sm copy-btn">Copy</button>
        </div>
        <textarea readonly>${escapeHtml(mp.text || "(model spec is empty)")}</textarea>
      `;
      card.querySelector(".copy-btn").addEventListener("click", (e) =>
        copyToClipboard(mp.text, e.currentTarget));
      list.appendChild(card);
    });
  }

  // copy-all-at-once
  const allBtn = document.createElement("button");
  allBtn.className = "btn btn-primary";
  allBtn.style.marginTop = "18px";
  allBtn.textContent = "Copy ALL prompts (single text)";
  allBtn.addEventListener("click", () => {
    const all = perVideo.map(p => p.structured).join("\n\n---\n\n");
    const modelText = modelPrompts.length ? "\n\n---\nCHARACTER PROMPTS\n\n" + modelPrompts.map(m => `${m.name}: ${m.text}`).join("\n\n") : "";
    copyToClipboard(all + modelText, allBtn);
  });
  container.appendChild(allBtn);
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
  // ensure brief is in the briefs list
  const idx = state.briefs.findIndex(b => b.id === state.current.id);
  if (idx >= 0) state.briefs[idx] = state.current;
  else state.briefs.push(state.current);
  // bump parent project's updatedAt
  const proj = getProject(state.current.projectId);
  if (proj) proj.updatedAt = state.current.submittedAt;
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

// A shoot is "Ready for production" only if it was submitted AND every preflight
// item (universal + pack-specific) is ticked. Otherwise we surface "Brief incomplete"
// so nothing moves to production with missing critical info.
function briefReadiness(b) {
  if (!b) return { label: "—", className: "pill-muted" };
  if (!b.submitted) return { label: "In progress", className: "pill-warn" };
  const preflight = b.data?.preflight || {};
  const pack = XMA_PACKS[b.category];
  const universalCount = 7; // see UNIVERSAL_PREFLIGHT
  const expected = universalCount + (pack?.preflightExtras?.length || 0);
  const ticked = Object.values(preflight).filter(Boolean).length;
  if (ticked >= expected) return { label: "Ready for production", className: "pill-ok" };
  return { label: `Brief incomplete (${ticked}/${expected})`, className: "pill-bad" };
}

function findResumeStep(b) {
  for (let i = 0; i < WIZARD_STEPS.length; i++) {
    const step = WIZARD_STEPS[i];
    const data = b.data?.[step.id];
    if (!data || Object.keys(data).length === 0) return i;
  }
  return WIZARD_STEPS.length - 1;
}

// Import: accepts either a single brief, an array of briefs, or a project bundle
// (the format produced by Export project: { project, shoots }).
document.getElementById("importFile").addEventListener("change", async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    if (data && data.project && Array.isArray(data.shoots)) {
      // project bundle
      if (!data.project.id) data.project.id = uid();
      const existing = state.projects.findIndex(p => p.id === data.project.id);
      if (existing >= 0) state.projects[existing] = data.project; else state.projects.push(data.project);
      data.shoots.forEach(s => {
        s.projectId = data.project.id;
        const idx = state.briefs.findIndex(b => b.id === s.id);
        if (idx >= 0) state.briefs[idx] = s; else state.briefs.push(s);
      });
      alert(`Project "${data.project.name}" with ${data.shoots.length} shoot(s) imported.`);
    } else if (Array.isArray(data)) {
      data.forEach(d => importOneBrief(d));
      alert(`${data.length} brief(s) imported.`);
    } else {
      importOneBrief(data);
      alert("Brief imported.");
    }
    save();
    showScreen(state.screen);
  } catch { alert("Could not parse that file."); }
  e.target.value = "";
});

function importOneBrief(d) {
  if (!d.id) d.id = uid();
  if (!d.projectId) {
    // create a default project on the fly
    const p = createProject(d.data?.identity?.businessName || "Imported");
    d.projectId = p.id;
  }
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
  if (!b) { showScreen("projects"); return; }
  const pack = XMA_PACKS[b.category];
  const content = document.getElementById("briefContent");
  const d = b.data || {};

  const idn = d.identity || {};
  const kvBlock = (obj, section) => {
    if (!section || !section.fields) return Object.entries(obj || {}).filter(([k,v]) => v != null && v !== "" && !k.startsWith("_") && !k.endsWith("_other")).map(([k,v]) =>
      `<div class="kv"><div class="k">${escapeHtml(k)}</div><div class="v">${escapeHtml(resolveFieldDisplay(obj, k, v))}</div></div>`).join("");
    return section.fields.map(f => {
      const v = obj?.[f.key];
      const extra = obj?.[f.key + "_other"];
      if ((v == null || v === "" || (Array.isArray(v) && v.length === 0)) && !extra) return "";
      return `<div class="kv"><div class="k">${escapeHtml(f.label)}</div><div class="v">${escapeHtml(resolveFieldDisplay(obj, f.key, v))}</div></div>`;
    }).join("");
  };

  // helper: render a per-video section
  const meta = d.videos || [];
  const modelNameById = (id) => (d.models || []).find(m => m.id === id)?.name || "Unnamed model";
  const perVideoBlock = (sectionData, sectionConfig, extraRows) => {
    const vids = sectionData?.videos || [];
    if (!vids.length) return "<div class='muted'>(no entries)</div>";
    return vids.map((vid, i) => {
      const m = meta[i] || {};
      const title = m.title || `Video ${i + 1}`;
      const desc = m.description ? `<div class="video-summary-desc">${escapeHtml(m.description)}</div>` : "";
      const castLine = (Array.isArray(m.cast) && m.cast.length)
        ? `<div class="kv"><div class="k">Cast</div><div class="v">${escapeHtml(m.cast.map(modelNameById).join(" · "))}</div></div>`
        : "";
      const rows = sectionConfig.fields.map(f => {
        const v = vid?.[f.key];
        const extra = vid?.[f.key + "_other"];
        if ((v == null || v === "" || (Array.isArray(v) && v.length === 0)) && !extra) return "";
        return `<div class="kv"><div class="k">${escapeHtml(f.label)}</div><div class="v">${escapeHtml(resolveFieldDisplay(vid, f.key, v))}</div></div>`;
      }).join("");
      const extras = extraRows ? extraRows(vid) : "";
      return `<div class="video-summary">
        <h3>${i + 1}. ${escapeHtml(title)}</h3>
        ${desc}
        ${castLine}
        ${rows || "<div class='muted'>(no answers)</div>"}${extras}
      </div>`;
    }).join("");
  };

  const projName = getProject(b.projectId)?.name || "(no project)";
  const r = briefReadiness(b);
  let html = `
    <h1>${pack.icon} ${escapeHtml(idn.businessName || "Untitled")} — ${escapeHtml(pack.label)} Shoot Brief</h1>
    <div class="brief-meta">
      Project: <b>${escapeHtml(projName)}</b> · Brief ID: ${b.id} ·
      <span class="pill ${r.className}">${r.label}</span> ·
      ${b.submitted ? "Submitted " + new Date(b.submittedAt).toLocaleString() : "In progress"} ·
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
    <h2>6 · Models</h2>${
      (d.models && d.models.length)
        ? d.models.map((m, i) => `
          <div class="video-summary">
            <h3>${i + 1}. ${escapeHtml(m.name || `Model ${i + 1}`)}</h3>
            ${kvBlock(m, pack.shared.models)}
            ${(() => {
              // which videos this model appears in
              const apps = (d.videos || []).map((v, vi) =>
                (Array.isArray(v.cast) && v.cast.includes(m.id))
                  ? `Video ${vi + 1}${v.title ? " — " + v.title : ""}` : null
              ).filter(Boolean);
              return apps.length
                ? `<div class="kv"><div class="k">Appears in</div><div class="v">${escapeHtml(apps.join(" · "))}</div></div>`
                : `<div class="kv"><div class="k">Appears in</div><div class="v" style="color:var(--text-muted)">— not assigned to any video yet</div></div>`;
            })()}
          </div>
        `).join("")
        : "<div class='muted'>(no models defined)</div>"
    }
    <h2>7 · Setting / lighting / palette</h2>${kvBlock(d.setting, pack.shared.setting)}
    <h2>8 · Motion / camera / audio</h2>${kvBlock(d.motionAudio, pack.shared.motionAudio)}
    <h2>9 · On-screen text & branding</h2>${kvBlock(d.textBranding, pack.shared.textBranding)}
  `;

  if (d.assets && Object.keys(d.assets).length) {
    html += `<h2>10 · Universal asset checklist</h2><table><thead><tr><th>Asset</th><th>Sent?</th></tr></thead><tbody>`;
    Object.entries(d.assets).filter(([k]) => k !== "_dropLink").forEach(([k, v]) => {
      const label = k.startsWith("extra_") ? k.replace(/^extra_/, "").replace(/_/g, " ") : k;
      html += `<tr><td>${escapeHtml(label)}</td><td>${v ? "✓" : "—"}</td></tr>`;
    });
    html += `</tbody></table>`;
    if (d.assets._dropLink) html += `<div style="margin-top:8px;"><b>Asset drop:</b> ${escapeHtml(d.assets._dropLink)}</div>`;
  }

  if (d.preflight) {
    html += `<h2>11 · Pre-flight checklist</h2><table><thead><tr><th>Item</th><th>Confirmed</th></tr></thead><tbody>`;
    Object.entries(d.preflight).forEach(([k,v]) => html += `<tr><td>${escapeHtml(k)}</td><td>${v ? "✓" : "—"}</td></tr>`);
    html += `</tbody></table>`;
  }

  html += `
    <h2>Common faults this brief pre-empts</h2>
    <ul>${pack.faultsToAvoid.map(f => `<li style="margin: 4px 0; font-size: 13px;">${escapeHtml(f)}</li>`).join("")}</ul>

    <h2>Agreement &amp; signature</h2>
    <div class="agreement-box">
      <p style="margin: 0 0 10px;">
        This brief is the <b>working agreement</b> between the client and XMA Agency. Every decision recorded
        above has been reviewed and approved by the client. The team will produce videos that match this brief.
      </p>
      <p style="margin: 0 0 10px;">
        Any change requested by the client after sign-off — adding videos, switching products, changing models,
        rewriting hooks, swapping platforms — counts as <b>new scope</b> and may incur additional fees or extend
        the timeline. Revisions inside the agreed rounds remain free; out-of-scope changes are quoted separately.
      </p>
      <p style="margin: 0;">
        Approver named on this brief is the single point of sign-off. Confirmations from any other person on the
        client side will not be treated as approval.
      </p>
    </div>

    <div class="signature-grid">
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-cap">Client approver — name &amp; signature</div>
        <div class="sig-cap">Date: __________________</div>
      </div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-cap">XMA account manager — name &amp; signature</div>
        <div class="sig-cap">Date: __________________</div>
      </div>
    </div>
  `;

  content.innerHTML = html;
}

document.getElementById("briefBack").addEventListener("click", () => {
  const b = state.briefs.find(x => x.id === viewingBriefId) || state.current;
  if (b?.projectId) { state.activeProjectId = b.projectId; showScreen("project"); }
  else showScreen("projects");
});
document.getElementById("briefPrint").addEventListener("click", () => window.print());
document.getElementById("briefDownload").addEventListener("click", () => {
  const b = state.briefs.find(x => x.id === viewingBriefId) || state.current;
  if (b) downloadBriefJson(b);
});

// ---------- CREATOR REVIEW CHECKLIST (QA) ----------
// What the creator team checks before delivering a video to the client.
// Each watch focuses on ONE category — the "gorilla effect" means if you split
// your attention across everything at once, you'll miss the obvious.

const QA_CATEGORIES = [
  { title: "Pronunciation & audio quality", icon: "🎤", items: [
    "Product name pronounced correctly",
    "Accent / tone consistent through the scene",
    "Key terms & ingredients pronounced correctly",
    "No robotic / glitchy / metallic voice artifacts",
    "No mispronounced or swallowed words",
    "Pacing natural — not too fast / slow, correct pauses",
    "Volume consistent — not clipping, not too low",
    "Background music / SFX at the right level",
    "No abrupt audio cuts or pops",
  ]},
  { title: "Lip sync", icon: "👄", items: [
    "No delay between lips and sound",
    "Mouth shape matches the sound being made",
    "Lip sync stays clean through the FULL scene (not just the start)",
  ]},
  { title: "Model & body movement", icon: "🧍‍♀️", items: [
    "Body movement looks natural",
    "Hands correct — no melting, warping, morphing, or limp fingers",
    "Face same person throughout (identity consistency)",
    "Facial expression matches the scene & mood",
    "Eye direction / gaze makes sense",
    "Posture / gait believable",
  ]},
  { title: "Product handling", icon: "🤲", items: [
    "Hand wraps the product correctly",
    "Product doesn't float, teleport, or detach from the hand",
    "Product orientation stays consistent while held",
    "Handoffs between hands look believable",
    "Product physics — weight, tilt, motion — believable",
  ]},
  { title: "Product consistency", icon: "💎", items: [
    "Product size & shape consistent across cuts",
    "Product writing / brand logo legible & correct (not warped)",
    "Color (metal / shade / liquid) matches the reference",
    "Packaging matches the real-life packaging supplied",
    "No SKU mix-up — featured item is the one in the brief",
  ]},
  { title: "Scene & continuity", icon: "🎬", items: [
    "Setting matches the brief (location, palette, lighting mood)",
    "No continuity errors between cuts",
    "Aspect ratio is what was promised in the brief",
    "Duration is within the promised length",
    "On-screen text (headline, CTA, price) matches the brief exactly",
  ]},
];

let qaShootId = null;

function openQA(shootId) {
  qaShootId = shootId;
  showScreen("qa");
}

function renderQA() {
  const shoot = state.briefs.find(b => b.id === qaShootId);
  if (!shoot) { showScreen("projects"); return; }
  const project = getProject(shoot.projectId);
  const pack = XMA_PACKS[shoot.category];

  document.getElementById("qaTitle").textContent = `Creator review — ${shoot.data?.identity?.businessName || pack?.label || "Shoot"}`;
  document.getElementById("qaSubtitle").textContent =
    `${project?.name || "Project"} · ${pack?.label || ""} · ${(shoot.data?.videos || []).length} video(s)`;

  // ensure QA data structure exists per video
  shoot.qa = shoot.qa || { videos: [] };
  const videos = shoot.data?.videos || [];
  while (shoot.qa.videos.length < videos.length) shoot.qa.videos.push({ checks: {}, notes: "", status: "Pending review" });
  while (shoot.qa.videos.length > videos.length && shoot.qa.videos.length > 1) shoot.qa.videos.pop();

  const root = document.getElementById("qaContainer");
  root.innerHTML = "";

  if (videos.length === 0) {
    root.innerHTML = `<div class="empty">No videos in this shoot. Add videos in the wizard first.</div>`;
    return;
  }

  videos.forEach((vid, vi) => {
    const meta = videos[vi];
    const qaVid = shoot.qa.videos[vi];
    const block = document.createElement("div");
    block.className = "qa-video-block";
    block.innerHTML = `
      <div class="qa-vid-head">
        <h2>${vi + 1}. ${escapeHtml(meta.title || `Video ${vi + 1}`)}</h2>
        <div class="qa-status-wrap">
          <select class="qa-status">
            <option ${qaVid.status === "Pending review" ? "selected" : ""}>Pending review</option>
            <option ${qaVid.status === "Approved" ? "selected" : ""}>Approved</option>
            <option ${qaVid.status === "Needs rework" ? "selected" : ""}>Needs rework</option>
          </select>
        </div>
      </div>
      ${meta.description ? `<p class="muted" style="margin-bottom: 16px;">${escapeHtml(meta.description)}</p>` : ""}
      <div class="qa-progress muted" id="qaProgress_${vi}"></div>
      <div class="qa-categories" id="qaCats_${vi}"></div>
      <div class="field" style="margin-top: 14px;">
        <label class="field-label">Notes / issues to flag</label>
        <textarea class="qa-notes" rows="3" placeholder="What needs to be fixed before delivery?">${escapeHtml(qaVid.notes || "")}</textarea>
      </div>
    `;

    const cats = block.querySelector(`#qaCats_${vi}`);
    QA_CATEGORIES.forEach((cat, ci) => {
      const cTotal = cat.items.length;
      const cDone  = cat.items.filter(it => qaVid.checks[`${ci}_${it}`]).length;
      const det = document.createElement("details");
      det.className = "qa-category";
      det.open = cDone < cTotal; // open if incomplete
      det.innerHTML = `
        <summary>
          <span class="qa-cat-icon">${cat.icon}</span>
          <span class="qa-cat-title">${escapeHtml(cat.title)}</span>
          <span class="qa-cat-count">${cDone} / ${cTotal}</span>
        </summary>
        <ul class="checklist qa-checklist">
          ${cat.items.map(it => {
            const key = `${ci}_${it}`;
            const checked = !!qaVid.checks[key];
            return `<li>
              <input type="checkbox" id="qa_${vi}_${ci}_${escapeAttr(it).replace(/\s/g, "_")}" ${checked ? "checked" : ""} data-key="${escapeAttr(key)}"/>
              <label for="qa_${vi}_${ci}_${escapeAttr(it).replace(/\s/g, "_")}">${escapeHtml(it)}</label>
            </li>`;
          }).join("")}
        </ul>
      `;
      det.querySelectorAll("input[type=checkbox]").forEach(cb => {
        cb.addEventListener("change", () => {
          qaVid.checks[cb.dataset.key] = cb.checked;
          save();
          updateQaCounts(block, vi, qaVid);
        });
      });
      cats.appendChild(det);
    });

    block.querySelector(".qa-status").addEventListener("change", e => { qaVid.status = e.target.value; save(); paintStatus(block, qaVid.status); });
    block.querySelector(".qa-notes").addEventListener("input", e => { qaVid.notes = e.target.value; save(); });

    paintStatus(block, qaVid.status);
    root.appendChild(block);
    updateQaCounts(block, vi, qaVid);
  });
}

function updateQaCounts(block, vi, qaVid) {
  // update per-category counts
  QA_CATEGORIES.forEach((cat, ci) => {
    const cTotal = cat.items.length;
    const cDone  = cat.items.filter(it => qaVid.checks[`${ci}_${it}`]).length;
    const counts = block.querySelectorAll(".qa-cat-count");
    if (counts[ci]) counts[ci].textContent = `${cDone} / ${cTotal}`;
  });
  // overall progress
  const totalItems = QA_CATEGORIES.reduce((acc, c) => acc + c.items.length, 0);
  const totalDone = Object.values(qaVid.checks).filter(Boolean).length;
  const el = block.querySelector(`#qaProgress_${vi}`);
  if (el) el.textContent = `${totalDone} / ${totalItems} checks complete`;
}

function paintStatus(block, status) {
  const sel = block.querySelector(".qa-status");
  sel.style.background = status === "Approved" ? "#d1fae5"
                       : status === "Needs rework" ? "#fee2e2"
                       : "#fef3c7";
  sel.style.color = status === "Approved" ? "#065f46"
                  : status === "Needs rework" ? "#991b1b"
                  : "#92400e";
  sel.style.fontWeight = "600";
}

document.getElementById("qaBack").addEventListener("click", () => {
  const s = state.briefs.find(b => b.id === qaShootId);
  if (s?.projectId) { state.activeProjectId = s.projectId; showScreen("project"); }
  else showScreen("projects");
});
document.getElementById("qaPrintBtn").addEventListener("click", () => window.print());

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
showScreen("projects");
updateProjectCount();
