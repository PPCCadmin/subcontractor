// Bumped cache key to v5 to force reload after BU-visibility model was added
const LS_KEY = 'hpp-subs-v5';
const LS_KEY_RFQS = 'hpp-rfqs-v2';
const LS_KEY_PROJECTS = 'hpp-projects-v2';

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
    // BU visibility: true = force visible to BUs, false = force hidden,
    // null/undefined = auto-derive from service categories (see isVisibleToBUs)
    visibleToBUs: sub.visibleToBUs ?? null,
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
  localStorage.removeItem('hpp-subs-v4');
  const res = await fetch('/subcontractors.json');
  const data = (await res.json()).map(migrate);
  localStorage.setItem(LS_KEY, JSON.stringify(data));
  return data;
}

export function saveSubs(subs)  { localStorage.setItem(LS_KEY, JSON.stringify(subs)); }
export function loadRfqs()      { try { return JSON.parse(localStorage.getItem(LS_KEY_RFQS) || '[]'); } catch { return []; } }
export function saveRfqs(v)     { localStorage.setItem(LS_KEY_RFQS, JSON.stringify(v)); }
export function loadProjects()  { try { return JSON.parse(localStorage.getItem(LS_KEY_PROJECTS) || '[]'); } catch { return []; } }
export function saveProjects(v) { localStorage.setItem(LS_KEY_PROJECTS, JSON.stringify(v)); }

export const SERVICE_TAXONOMY = [
  'Milling', 'Asphalt', 'Asphalt Plant', 'Concrete', 'Concrete Plant',
  'Aggregate', 'Trucking', 'Dumping',
  'Sealcoat', 'Striping', 'Crack Fill', 'Patching', 'Testing'
];

// -----------------------------------------------------------------------------
// BU vs HPS access model
// One combined data store. Subcontractor *trade* records (asphalt crews,
// sealcoat, striping, etc.) are HPS-only and proprietary. Business Units only
// get the material/supplier categories below (plants, trucking, aggregate,
// dumping). This keeps a single record per vendor while controlling who sees it.
// -----------------------------------------------------------------------------
export const BU_VISIBLE_SERVICES = [
  'Asphalt Plant', 'Concrete Plant', 'Aggregate', 'Trucking', 'Dumping'
];

// Should this vendor be visible to Business-Unit users?
export function isVisibleToBUs(sub) {
  if (sub.visibleToBUs === true)  return true;   // explicit override: show
  if (sub.visibleToBUs === false) return false;  // explicit override: hide
  const svcs = sub.canonicalServices || [];
  return svcs.some(s => BU_VISIBLE_SERVICES.includes(s));
}

// Filter the full store down to what a given role is allowed to see.
export function visibleSubsForRole(subs, role) {
  if (role === 'bu') return subs.filter(isVisibleToBUs);
  return subs; // 'admin' and 'hps' see everything
}

export const BUSINESS_STRUCTURES = ['LLC','Corporation','S-Corp','Partnership','Sole Proprietor','Other'];
export const CONTACT_ROLES = ['Owner','Estimator','Accounting','Field Operations','Project Manager','Sales','Other'];
export const PROJECT_SCALES = ['< $20k','$20k–$100k','$100k–$300k','Capital (> $300k)'];
export const EQUIPMENT_TYPES = ['Paver','Mill','Roller','Distributor','Sweeper','Sealcoat Rig','Striper','Concrete Plant','Asphalt Plant','Truck','Other'];
export const LICENSE_TYPES = ['General Contractor','Paving','Concrete','DOT','State-Specific','Other'];
export const ATTACHMENT_TYPES = ['COI','W-9','MSA','Contract','License','Quote','Repair Map','Mix Design','Other'];

export const STATUSES = [
  { key: 'Vetted',      label: 'Vetted',      color: '#1a5c38' },
  { key: 'Recommended', label: 'Recommended', color: '#ca8a04' },
  { key: 'New',         label: 'New',         color: '#2563eb' },
  { key: 'DNU',         label: 'DNU',         color: '#dc2626' },
];

export function statusColor(s) {
  const st = STATUSES.find(x => x.key === s);
  return st ? st.color : '#6b7280';
}
