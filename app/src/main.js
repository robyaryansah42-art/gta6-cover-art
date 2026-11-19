// Wires the page: pick photos, choose a layout and grade, crop and position
// each panel, edit the caption, export the cover as a PNG. A `?shot=` query
// sets up a fixed scene for a screenshot instead (./shots.js).
import { drawCover, defaultState, panelAt, panelRects, SIZES, GRADES, TEMPLATES, TITLE_STYLES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const state = defaultState();
canvas.dataset.editor = '1';

const SAMPLES = ['boulevard', 'pier', 'skyline'];

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function say(text) {
  status.textContent = text;
}

function redraw() {
  drawCover(canvas, state);
  syncPanelControls();
}

/** Refreshes the per-panel controls from the selected panel. */
function syncPanelControls() {
  const label = document.getElementById('panel-label');
  if (state.selectedPanel < 0) {
    label.textContent = 'No panel selected';
    return;
  }
  const panel = state.panels[state.selectedPanel];
  const photoSelect = document.getElementById('panel-photo');
  const zoom = document.getElementById('panel-zoom');
  const panX = document.getElementById('panel-x');
  const panY = document.getElementById('panel-y');
  const count = TEMPLATES[state.templateKey].panels.length;
  label.textContent = `Panel ${state.selectedPanel + 1} of ${count}`;
  photoSelect.value = String(panel.photo);
  zoom.value = String(Math.round(panel.zoom * 100));
  document.getElementById('zoom-value').textContent = `${Math.round(panel.zoom * 100)}%`;
  panX.value = String(Math.round(panel.dx * 100));
  panY.value = String(Math.round(panel.dy * 100));
  document.querySelectorAll('#panels [data-panel]').forEach((b) => {
    b.classList.toggle('active', Number(b.dataset.panel) === state.selectedPanel);
  });
}

function buildButtons(containerId, entries, current, onPick) {
  const box = document.getElementById(containerId);
  box.innerHTML = '';
  Object.entries(entries).forEach(([key, value]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = value.name ?? value.label ?? key;
    b.dataset.key = key;
    b.classList.toggle('active', key === current);
    b.addEventListener('click', () => {
      onPick(key);
      box.querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b));
    });
    box.appendChild(b);
  });
}

function rebuildPanelButtons() {
  const box = document.getElementById('panels');
  box.innerHTML = '';
  TEMPLATES[state.templateKey].panels.forEach((_p, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = `Panel ${i + 1}`;
    b.dataset.panel = String(i);
    b.classList.toggle('active', i === state.selectedPanel);
    b.addEventListener('click', () => {
      state.selectedPanel = i;
      redraw();
    });
    box.appendChild(b);
  });
  // Keep one panel state per template slot; grow the list when needed.
  while (state.panels.length < TEMPLATES[state.templateKey].panels.length) {
    state.panels.push({ photo: state.panels.length % 3, zoom: 1, dx: 0, dy: 0 });
  }
  if (state.selectedPanel >= TEMPLATES[state.templateKey].panels.length) state.selectedPanel = 0;
}

buildButtons('templates', TEMPLATES, state.templateKey, (key) => {
  state.templateKey = key;
  rebuildPanelButtons();
  redraw();
});
buildButtons('grades', GRADES, state.gradeKey, (key) => {
  state.gradeKey = key;
  redraw();
});
buildButtons('title-styles', TITLE_STYLES, state.titleStyleKey, (key) => {
  state.titleStyleKey = key;
  redraw();
});
buildButtons('sizes', SIZES, state.sizeKey, (key) => {
  state.sizeKey = key;
  redraw();
});
rebuildPanelButtons();

// Photos: upload slots plus the three bundled samples.
document.querySelectorAll('[data-photo-slot]').forEach((input) => {
  input.addEventListener('change', async (e) => {
    const slot = Number(input.dataset.photoSlot);
    const file = e.target.files[0];
    if (!file) return;
    try {
      state.photos[slot] = await loadImage(URL.createObjectURL(file));
      say(`Photo ${slot + 1} loaded: ${file.name}`);
      redraw();
    } catch {
      say('That file could not be read as an image.');
    }
  });
});
document.querySelectorAll('[data-sample]').forEach((button) => {
  button.addEventListener('click', async () => {
    const slot = Number(button.dataset.sample);
    try {
      state.photos[slot] = await loadImage(`samples/${SAMPLES[slot]}.jpg`);
      say(`Sample photo ${slot + 1} loaded (${SAMPLES[slot]}).`);
      redraw();
    } catch {
      say('The sample photo could not be loaded.');
    }
  });
});

// Caption.
document.getElementById('caption').addEventListener('input', (e) => {
  state.title = e.target.value;
  redraw();
});
document.getElementById('subtitle').addEventListener('input', (e) => {
  state.subtitle = e.target.value;
  redraw();
});

// Selected panel: photo, zoom, pan, reset.
document.getElementById('panel-photo').addEventListener('change', (e) => {
  state.panels[state.selectedPanel].photo = Number(e.target.value);
  redraw();
});
document.getElementById('panel-zoom').addEventListener('input', (e) => {
  state.panels[state.selectedPanel].zoom = Number(e.target.value) / 100;
  redraw();
});
document.getElementById('panel-x').addEventListener('input', (e) => {
  state.panels[state.selectedPanel].dx = Number(e.target.value) / 100;
  redraw();
});
document.getElementById('panel-y').addEventListener('input', (e) => {
  state.panels[state.selectedPanel].dy = Number(e.target.value) / 100;
  redraw();
});
document.getElementById('panel-fit').addEventListener('click', () => {
  const panel = state.panels[state.selectedPanel];
  panel.zoom = 1;
  panel.dx = 0;
  panel.dy = 0;
  redraw();
  say(`Panel ${state.selectedPanel + 1} reset to fit.`);
});

// Click a panel to select it; drag it to move its photo.
let drag = null;
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * canvas.width,
    y: ((e.clientY - r.top) / r.height) * canvas.height,
  };
}
canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const hit = panelAt(state.templateKey, canvas.width, canvas.height, p.x, p.y);
  if (hit < 0) return;
  state.selectedPanel = hit;
  const rect = panelRects(state.templateKey, canvas.width, canvas.height)[hit];
  drag = { x: p.x, y: p.y, rect, panel: state.panels[hit] };
  canvas.setPointerCapture(e.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const panel = drag.panel;
  panel.dx += (p.x - drag.x) / drag.rect.w;
  panel.dy += (p.y - drag.y) / drag.rect.h;
  panel.dx = Math.max(-0.6, Math.min(0.6, panel.dx));
  panel.dy = Math.max(-0.6, Math.min(0.6, panel.dy));
  drag.x = p.x;
  drag.y = p.y;
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('pointercancel', () => { drag = null; });

// Export: render the same state at full size and download the PNG.
document.getElementById('export').addEventListener('click', () => {
  const size = SIZES[state.sizeKey];
  const off = document.createElement('canvas');
  const shotState = { ...state, selectedPanel: -1 };
  drawCover(off, shotState);
  off.toBlob((blob) => {
    if (!blob) {
      say('Export failed in this browser.');
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cover-${size.w}x${size.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    say(`Saved cover-${size.w}x${size.h}.png`);
  }, 'image/png');
});

// Screenshot scenes (?shot=cover|editor) load the bundled samples, then paint.
const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), async (scene) => {
    state.templateKey = scene.template;
    state.gradeKey = scene.grade;
    state.sizeKey = scene.size;
    state.title = scene.title;
    state.subtitle = scene.subtitle;
    state.titleStyleKey = scene.titleStyle;
    rebuildPanelButtons();
    buildButtons('templates', TEMPLATES, state.templateKey, () => {});
    buildButtons('grades', GRADES, state.gradeKey, () => {});
    buildButtons('sizes', SIZES, state.sizeKey, () => {});
    const loaded = await Promise.all(SAMPLES.map((name) => loadImage(`samples/${name}.jpg`)));
    state.photos = loaded;
    state.panels = TEMPLATES[state.templateKey].panels.map((_p, i) => ({
      photo: i % 3,
      zoom: 1,
      dx: scene.pan?.[i]?.dx ?? 0,
      dy: scene.pan?.[i]?.dy ?? 0,
    }));
    // The scene's chosen sample goes in the hero (first) panel.
    const heroPhoto = SAMPLES.indexOf(scene.photo);
    if (heroPhoto >= 0) state.panels[0].photo = heroPhoto;
    state.selectedPanel = scene.select;
    redraw();
  });
} else {
  // First run: load the bundled samples so the preview is alive at once.
  Promise.all(SAMPLES.map((name) => loadImage(`samples/${name}.jpg`))).then((loaded) => {
    state.photos = loaded;
    redraw();
    say('Samples loaded. Upload your own photos to replace them.');
  }).catch(() => {
    redraw();
    say('Upload a photo to begin.');
  });
  redraw();
}
