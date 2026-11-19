// Fixed scenes for screenshots: ?shot=editor shows the page with a sample
// photo loaded; ?shot=cover shows the cover alone. The query picks the
// template, grade, size, caption and subtitle. window.__shotReady is set
// once the scene has painted, so a screenshot runner can wait on it.
export async function runShot(shot, query, setup) {
  const scene = {
    template: query.get('template') ?? 'triple',
    grade: query.get('grade') ?? 'sunset',
    size: query.get('size') ?? 'wide',
    title: query.get('caption') ?? 'Sunset Heist',
    subtitle: query.get('subtitle') ?? 'A COASTAL GETAWAY',
    titleStyle: query.get('titleStyle') ?? 'gold',
    // The hero (first) panel uses this sample; the other panels cycle the rest.
    photo: query.get('photo') ?? 'pier',
    // Cover shots show no selection outline; editor shots select panel 1.
    select: shot === 'editor' ? 0 : -1,
    // Optional per-panel pan, e.g. pan0=10,-5 (percent of panel size).
    pan: [0, 1, 2, 3].map((i) => {
      const raw = query.get(`pan${i}`);
      if (!raw) return { dx: 0, dy: 0 };
      const [dx, dy] = raw.split(',').map(Number);
      return { dx: (dx || 0) / 100, dy: (dy || 0) / 100 };
    }),
  };
  if (shot === 'cover') document.body.classList.add('shot-cover');
  await setup(scene);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
