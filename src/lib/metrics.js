// Days between date and today (positive = future, negative = past)
export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr); const now = new Date();
  return Math.floor((d - now) / (1000 * 60 * 60 * 24));
}

export function expiryStatus(dateStr) {
  const d = daysUntil(dateStr);
  if (d === null) return 'missing';
  if (d < 0) return 'expired';
  if (d <= 30) return 'expiring';
  return 'ok';
}

// Overall compliance status per sub
export function complianceStatus(sub) {
  const dates = [sub.coiGL, sub.coiAuto, sub.coiWC];
  const anyMissing = dates.some(d => !d) || !sub.w9OnFile;
  const statuses = dates.map(expiryStatus);
  if (statuses.includes('expired')) return 'non-compliant';
  if (anyMissing) return 'pending';
  if (statuses.includes('expiring')) return 'expiring';
  return 'compliant';
}

export function subHitRate(subId, rfqs) {
  let invited = 0, awarded = 0;
  for (const r of rfqs) {
    const inv = (r.invitees || []).find(i => i.subId === subId);
    if (!inv) continue;
    invited++;
    if (inv.awarded) awarded++;
  }
  return { invited, awarded, rate: invited ? awarded / invited : null };
}

export function subAvgRating(subId, projects) {
  const list = projects.filter(p => p.subId === subId && p.rating);
  if (!list.length) return null;
  const scores = list.map(p => {
    const r = p.rating;
    const vals = [r.quality, r.schedule, r.safety, r.communication].filter(v => v != null);
    return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null;
  }).filter(v => v != null);
  if (!scores.length) return null;
  return scores.reduce((a,b)=>a+b,0)/scores.length;
}

// Compute median + std deviation for pricing anomaly detection
export function pricingStats(items) {
  if (!items.length) return null;
  const prices = items.map(i => +i.unitPrice).filter(p => !isNaN(p)).sort((a,b)=>a-b);
  if (!prices.length) return null;
  const med = prices[Math.floor(prices.length/2)];
  const mean = prices.reduce((a,b)=>a+b,0)/prices.length;
  const variance = prices.reduce((a,b)=>a+(b-mean)**2,0)/prices.length;
  const std = Math.sqrt(variance);
  return { median: med, mean, std, min: prices[0], max: prices[prices.length-1], count: prices.length };
}

export function isPricingAnomaly(item, allItems) {
  const same = allItems.filter(i => i.category === item.category && i.region === item.region);
  if (same.length < 3) return false;
  const stats = pricingStats(same);
  if (!stats || !stats.std) return false;
  const z = Math.abs((+item.unitPrice - stats.mean) / stats.std);
  return z > 2;
}
