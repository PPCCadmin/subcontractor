// Bumped cache key to v4 to force reload after status/rating changes
const LS_KEY = 'hpp-subs-v4';
const LS_KEY_RFQS = 'hpp-rfqs-v2';
const LS_KEY_PROJECTS = 'hpp-projects-v2';
const LS_KEY_PRICING = 'hpp-pricing-v2';

function migrate(sub) {
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

  let status = sub.status;
  if (status === 'Do Not Use') status = 'DNU';
  if (status === 'Unknown' || status === 'Competitor' || !status) status = 'New';

  return {
    ...sub,
    status,
    businessStructure: sub.businessStructure || null,
    contacts,
    coiOnFile: sub.coiOnFile ?? false,
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
  localStorage.removeItem('hpp-subs-v1');
  localStorage.removeItem('hpp-subs-v2');
  localStorage.removeItem('hpp-subs-v3');

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
  { key: 'Vetted',      label: 'Vetted',      color: '#1a5c38' },
  { key: 'Recommended', label: 'Recommended', color: '#ca8a04' },
  { key: 'New',         label: 'New',         color: '#2563eb' },
  { key: 'DNU',         label: 'DNU',         color: '#dc2626' },
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