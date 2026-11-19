// Renders a multi-panel GTA-style cover onto a canvas.
//
// A cover is a set of photo panels (each cropped and positioned by the user)
// plus a bold caption band along the foot, all under one colour grade. The
// drawing is resolution-independent: every panel is a fraction of the canvas,
// so the same state renders the 1080 x 1080, 1080 x 1350 and 1920 x 1080
// exports.

export const SIZES = {
  square: { w: 1080, h: 1080, label: '1080 × 1080' },
  portrait: { w: 1080, h: 1350, label: '1080 × 1350' },
  wide: { w: 1920, h: 1080, label: '1920 × 1080' },
};

export const GRADES = {
  sunset: {
    name: 'Sunset',
    filter: 'saturate(1.45) contrast(1.08)',
    top: 'rgba(255, 120, 60, 0.08)',
    bottom: 'rgba(200, 40, 120, 0.36)',
  },
  neon: {
    name: 'Neon Nights',
    filter: 'saturate(1.55) contrast(1.12)',
    top: 'rgba(90, 40, 200, 0.16)',
    bottom: 'rgba(255, 46, 136, 0.30)',
  },
  golden: {
    name: 'Golden Hour',
    filter: 'saturate(1.30) contrast(1.05)',
    top: 'rgba(255, 200, 90, 0.12)',
    bottom: 'rgba(255, 140, 40, 0.30)',
  },
  noir: {
    name: 'Mono Noir',
    filter: 'grayscale(1) contrast(1.28) brightness(1.06)',
    top: 'rgba(0, 0, 0, 0.04)',
    bottom: 'rgba(255, 180, 80, 0.10)',
  },
};

export const TEMPLATES = {
  triple: {
    name: 'Triple',
    panels: [
      { x: 0, y: 0, w: 1, h: 0.6 },
      { x: 0, y: 0.6, w: 0.5, h: 0.26 },
      { x: 0.5, y: 0.6, w: 0.5, h: 0.26 },
    ],
    caption: { y: 0.86, h: 0.14 },
  },
  quad: {
    name: 'Quad',
    panels: [
      { x: 0, y: 0, w: 0.5, h: 0.43 },
      { x: 0.5, y: 0, w: 0.5, h: 0.43 },
      { x: 0, y: 0.43, w: 0.5, h: 0.43 },
      { x: 0.5, y: 0.43, w: 0.5, h: 0.43 },
    ],
    caption: { y: 0.86, h: 0.14 },
  },
  hero: {
    name: 'Hero',
    panels: [{ x: 0, y: 0, w: 1, h: 0.86 }],
    caption: { y: 0.86, h: 0.14 },
  },
};

export const TITLE_STYLES = {
  gold: { name: 'Gold', from: '#fffbe8', to: '#ffd76a' },
  white: { name: 'White', from: '#ffffff', to: '#dfe0f2' },
  neon: { name: 'Neon Pink', from: '#ffe9f6', to: '#ff5ea8' },
};

/** A fresh editor state: three sample photos, one per panel, sunset grade. */
export function defaultState() {
  return {
    sizeKey: 'square',
    templateKey: 'triple',
    gradeKey: 'sunset',
    titleStyleKey: 'gold',
    title: 'SUNSET HEIST',
    subtitle: 'A COASTAL GETAWAY',
    photos: [null, null, null],
    panels: [
      { photo: 0, zoom: 1, dx: 0, dy: 0 },
      { photo: 1, zoom: 1, dx: 0, dy: 0 },
      { photo: 2, zoom: 1, dx: 0, dy: 0 },
    ],
    selectedPanel: 0,
  };
}

/** Panel rects of a template in canvas pixels. */
export function panelRects(templateKey, w, h) {
  return TEMPLATES[templateKey].panels.map((p) => ({
    x: p.x * w,
    y: p.y * h,
    w: p.w * w,
    h: p.h * h,
  }));
}

/** Index of the panel holding canvas point (x, y), or -1. */
export function panelAt(templateKey, w, h, x, y) {
  const rects = panelRects(templateKey, w, h);
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return i;
  }
  return -1;
}

/** Draws one photo into a panel rect, cover-fit, with the panel's zoom/pan. */
function drawPhoto(ctx, photo, rect, panel, grade) {
  const iw = photo.naturalWidth;
  const ih = photo.naturalHeight;
  const base = Math.max(rect.w / iw, rect.h / ih) * panel.zoom;
  const pw = iw * base;
  const ph = ih * base;
  const cx = rect.x + rect.w / 2 + panel.dx * rect.w;
  const cy = rect.y + rect.h / 2 + panel.dy * rect.h;
  ctx.save();
  ctx.filter = grade.filter;
  ctx.drawImage(photo, cx - pw / 2, cy - ph / 2, pw, ph);
  ctx.restore();
}

/** An empty panel: a dusk gradient with a prompt instead of a photo. */
function drawEmptyPanel(ctx, rect) {
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  g.addColorStop(0, '#3b1d5e');
  g.addColorStop(1, '#1a0b2e');
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = Math.max(2, rect.w * 0.004);
  ctx.setLineDash([rect.w * 0.02, rect.w * 0.015]);
  ctx.strokeRect(rect.x + rect.w * 0.06, rect.y + rect.h * 0.08, rect.w * 0.88, rect.h * 0.84);
  ctx.restore();
  const size = Math.max(14, rect.h * 0.09);
  ctx.font = `700 ${size}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.fillText('ADD A PHOTO', rect.x + rect.w / 2, rect.y + rect.h / 2 + size * 0.35);
}

/** The colour-grade wash over one panel: warm top, deep colour at the foot. */
function gradeWash(ctx, rect, grade) {
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  g.addColorStop(0, grade.top);
  g.addColorStop(1, grade.bottom);
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  const v = ctx.createRadialGradient(
    rect.x + rect.w / 2, rect.y + rect.h / 2, Math.min(rect.w, rect.h) * 0.35,
    rect.x + rect.w / 2, rect.y + rect.h / 2, Math.max(rect.w, rect.h) * 0.75,
  );
  v.addColorStop(0, 'rgba(0, 0, 0, 0)');
  v.addColorStop(1, 'rgba(10, 4, 24, 0.28)');
  ctx.fillStyle = v;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

/** Bold display lettering: thick dark outline, gradient fill, slight lean. */
function drawTitle(ctx, text, cx, baseline, size, style, maxWidth) {
  const font = (s) => `italic 900 ${s}px "Noto Sans Display", "Arial Black", "DejaVu Sans", sans-serif`;
  let s = size;
  ctx.font = font(s);
  while (ctx.measureText(text).width > maxWidth && s > 12) {
    s -= 2;
    ctx.font = font(s);
  }
  ctx.save();
  ctx.translate(cx, baseline);
  ctx.rotate(-0.018);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(24, 6, 36, 0.95)';
  ctx.lineWidth = Math.max(3, s * 0.16);
  ctx.strokeText(text, 0, 0);
  const g = ctx.createLinearGradient(0, -s, 0, s * 0.15);
  g.addColorStop(0, style.from);
  g.addColorStop(1, style.to);
  ctx.fillStyle = g;
  ctx.fillText(text, 0, 0);
  ctx.restore();
  return s;
}

/** Draws `state` onto the canvas at its own pixel size. */
export function drawCover(canvas, state) {
  const size = SIZES[state.sizeKey];
  const template = TEMPLATES[state.templateKey];
  const grade = GRADES[state.gradeKey];
  const style = TITLE_STYLES[state.titleStyleKey];
  const w = size.w;
  const h = size.h;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#1a0b2e';
  ctx.fillRect(0, 0, w, h);

  const rects = panelRects(state.templateKey, w, h);
  const gutter = Math.max(4, w * 0.006);
  rects.forEach((rect, i) => {
    const panel = state.panels[i];
    const photo = panel && panel.photo >= 0 ? state.photos[panel.photo] : null;
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    if (photo) drawPhoto(ctx, photo, rect, panel, grade);
    else drawEmptyPanel(ctx, rect);
    gradeWash(ctx, rect, grade);
    ctx.restore();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = gutter;
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    if (i === state.selectedPanel && canvas.dataset.editor === '1') {
      ctx.strokeStyle = '#ffd76a';
      ctx.lineWidth = gutter * 1.6;
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    }
  });

  // Caption band: dark gradient rising from the foot, title + subtitle.
  const band = template.caption;
  const bandY = band.y * h;
  const bandH = band.h * h;
  const bg = ctx.createLinearGradient(0, bandY - bandH * 0.5, 0, h);
  bg.addColorStop(0, 'rgba(16, 5, 28, 0)');
  bg.addColorStop(0.45, 'rgba(16, 5, 28, 0.72)');
  bg.addColorStop(1, 'rgba(16, 5, 28, 0.94)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, bandY - bandH * 0.5, w, bandH * 1.5);
  ctx.fillStyle = '#ffd76a';
  ctx.fillRect(w * 0.06, bandY + bandH * 0.06, w * 0.1, Math.max(3, h * 0.006));

  const title = (state.title || '').trim().toUpperCase();
  if (title) {
    const titleSize = drawTitle(ctx, title, w / 2, bandY + bandH * 0.62, h * 0.085, style, w * 0.9);
    void titleSize;
  }
  const subtitle = (state.subtitle || '').trim().toUpperCase();
  if (subtitle) {
    let sub = Math.max(12, h * 0.026);
    ctx.font = `700 ${sub}px "Noto Sans Display", "DejaVu Sans", sans-serif`;
    try { ctx.letterSpacing = `${Math.max(2, sub * 0.28)}px`; } catch { /* older canvas */ }
    while (ctx.measureText(subtitle).width > w * 0.86 && sub > 10) {
      sub -= 1;
      ctx.font = `700 ${sub}px "Noto Sans Display", "DejaVu Sans", sans-serif`;
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = sub * 0.4;
    ctx.fillText(subtitle, w / 2, bandY + bandH * 0.9);
    ctx.shadowBlur = 0;
    try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  }

  // Thin white poster frame.
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(3, w * 0.005);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
}
