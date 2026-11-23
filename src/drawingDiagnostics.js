// Quality-1: opt-in, bounded measurements. Never store project data or stroke points.
export function createDrawingDiagnostics({ enabled = false, now = () => performance.now(), limit = 240 } = {}) {
  const samples = [];
  const counts = Object.create(null);
  function measure(label, work) {
    if (!enabled) return work();
    const start = now();
    try { return work(); }
    finally {
      const durationMs = Math.max(0, now() - start);
      counts[label] = (counts[label] || 0) + 1;
      samples.push({ label, durationMs });
      if (samples.length > limit) samples.splice(0, samples.length - limit);
    }
  }
  function snapshot() {
    const summaries = {};
    for (const {label, durationMs} of samples) {
      const current = summaries[label] ??= {samples:0,totalMs:0,maxMs:0};
      current.samples++;
      current.totalMs += durationMs;
      current.maxMs = Math.max(current.maxMs, durationMs);
    }
    return { enabled, counts:{...counts}, recent:Object.fromEntries(Object.entries(summaries).map(([key,val]) => [key, {...val,averageMs:val.totalMs/val.samples}])) };
  }
  function reset() { samples.length = 0; for (const key of Object.keys(counts)) delete counts[key]; }
  return { measure, snapshot, reset };
}
