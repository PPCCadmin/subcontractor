const LS_KEY = 'hpp-subs-v2';
const LS_KEY_RFQS = 'hpp-rfqs-v2';
const LS_KEY_PROJECTS = 'hpp-projects-v2';
const LS_KEY_PRICING = 'hpp-pricing-v2';

function migrate(sub) {
  return {
    ...sub,
    businessStructure: sub.businessStructure || null,
    contacts: sub.contacts || (sub.contactName ? [{
      id: crypto.randomUUID(),
      name: sub.contactName, role: sub.position || 'Other',
      phone: sub.phone, cellPhone: sub.cellPhone, email: sub.email
    }] : []),
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
  // Fallback to old v1 key for existing users
  const oldCache = localStorage.getItem('hpp-subs-v1');
  if (oldCache) {
    try {
      const migrated = JSON.parse(oldCache).map(migrate);
      localStorage.setItem(LS_KEY, JSON.stringify(migrated));
      return migrated;
    } catch (e) {}
  }
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
export const STATUSES = [
  { key: 'Vetted',     label: 'Vetted',      color: '#1a5c38' },
  { key: 'New',        label: 'New',         color: '#2563eb' },
  { key: 'Unknown',    label: 'Unknown',     color: '#6b7280' },
  { key: 'Do Not Use', label: 'Do Not Use',  color: '#dc2626' },
  { key: 'Competitor', label: 'Competitor',  color: '#b45309' }
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
