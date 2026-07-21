// Bumped cache key to v3 so users pick up the new subcontractors.json
// (contact #2, coiOnFile, Recommended/DNU statuses, padded zips)
const LS_KEY = 'hpp-subs-v3';
const LS_KEY_RFQS = 'hpp-rfqs-v2';
const LS_KEY_PROJECTS = 'hpp-projects-v2';
const LS_KEY_PRICING = 'hpp-pricing-v2';

function migrate(sub) {
  // Build contacts[] from BOTH primary and secondary contact columns
  let contacts = sub.contacts;
  if (!contacts) {
    contacts = [];
    if (sub.contactName) {
      contacts.push({
        id: crypto.randomUUID(),
        name: sub.contactName,
        role: sub.position || 'Other',
        phone: sub.phone,
        cellPhone: sub.cellPhone,
        email: sub.email,
      });
    }
    if (sub.contactName2) {
      contacts.push({
        id: crypto.randomUUID(),
        name: sub.contactName2,
        role: sub.position2 || 'Other',
        phone: null,
        cellPhone: sub.cellPhone2,
        email: sub.email2,
      });
    }
  }

  return {
    ...sub,
    // Legacy status -> canonical
    status: sub.status === 'Do Not Use' ? 'DNU' : sub.status,
    businessStructure: sub.businessStructure || null,
    contacts,
    // Compliance flag added (spreadsheet column "COI on file")
    coiOnFile: sub.coiOnFile ?? false,
    // Second contact fields (kept as top-level too so form editing round-trips cleanly)
    contactName2: sub.contactName2 ?? null,
    position2:    sub.position2    ?? null,
    cellPhone2:   sub.cellPhone2   ?? null,
    email2:       sub.email2       ?? null,
    equipment: sub.equipment || [],
    licenses: sub.licenses || [],
    projectScales: sub.projectScales || [],
    attachments: sub.attachments || [],
  };
}

export async function loadSubs() {
  const cached = localStorage.getItem(LS_KEY);
  if (cached) {
    try { return JSON.parse(cached).map(migrate); }
    catch (e) { console.warn(e); }
  }
  // Wipe stale v1/v2 caches so the new JSON is authoritative
  localStorage.removeItem('hpp-subs-v1');
  localStorage.removeItem('hpp-subs-v2');

  const res = await fetch('/subcontractors.json');
  const data = (await res.json()).map(migrate);
  localStorage.setItem(LS_KEY, JSON.stringify(data));
  return data;
}
export function saveSubs(subs) { localStorage.setItem(LS_KEY, JSON.stringify(subs)); }

export function loadRfqs()      { try { return JSON.parse(localStorage.getItem(LS_KEY_RFQS) || '[]'); } catch { return []; } }
export function saveRfqs(v)     { localStorage.setItem(LS_KEY_RFQS, JSON.stringify(v)); }
export function loadProjects()  { try { return JSON.parse(localStorage.getItem(LS_KEY_PROJECTS) || '[]'); } catch { return []; } }
export function saveProjects(v) { localStorage.setItem(LS_KEY_PROJECTS, JSON.stringify(v)); }
export function loadPricing()   { try { return JSON.parse(localStorage.getItem(LS_KEY_PRICING) || '[]'); } catch { return []; } }
export function savePricing(v)  { localStorage.setItem(LS_KEY_PRICING, JSON.stringify(v)); }

export const SERVICE_TAXONOMY = [
  'Milling', 'Asphalt', 'Asphalt Plant', 'Concrete', 'Concrete Plant',
  'Sealcoat', 'Striping', 'Crack Fill', 'Patching', 'Testing'
];

// Statuses now match the spreadsheet exactly.
// Legacy statuses (Do Not Use, Unknown, Competitor) kept for backward compatibility.
export const STATUSES = [
  { key: 'Vetted',      label: 'Vetted',      color: '#1a5c38' },
  { key: 'Recommended', label: 'Recommended', color: '#0d9488' },
  { key: 'New',         label: 'New',         color: '#2563eb' },
  { key: 'DNU',         label: 'DNU',         color: '#dc2626' },
  { key: 'Unknown',     label: 'Unknown',     color: '#6b7280' },
  { key: 'Competitor',  label: 'Competitor',  color: '#b45309' },
];
export const BUSINESS_STRUCTURES = ['LLC','Corporation','S-Corp','Partnership','Sole Proprietor','Other'];
export const CONTACT_ROLES = ['Owner','Estimator','Accounting','Field Operations','Project Manager','Sales','Other'];
export const PROJECT_SCALES = ['< $20k','$20k–$100k','$100k–$300k','Capital (> $300k)'];
export const EQUIPMENT_TYPES = ['Paver','Mill','Roller','Distributor','Sweeper','Sealcoat Rig','Striper','Concrete Plant','Asphalt Plant','Other'];
export const LICENSE_TYPES = ['General Contractor','Paving','Concrete','DOT','State-Specific','Other'];
export const ATTACHMENT_TYPES = ['COI','W-9','MSA','Contract','License','Quote','Repair Map','Mix Design','Other'];
export const PRICING_CATEGORIES = ['Bollards','Striping','Patching','Sealcoat','Milling','Paving','Concrete Flatwork','Crack Fill','Signage','Other'];

export function statusColor(s) {
  const st = STATUSES.find(x => x.key === s);
  return st ? st.color : '#6b7280';
}
