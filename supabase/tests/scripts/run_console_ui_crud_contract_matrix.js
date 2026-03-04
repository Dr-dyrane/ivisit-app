#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const CONSOLE_FRONTEND = path.resolve(ROOT, '..', 'ivisit-console', 'frontend');
const TYPES_FILE = path.join(ROOT, 'types', 'database.ts');

if (!fs.existsSync(CONSOLE_FRONTEND)) {
  console.error('[console-ui-crud-contract] Missing ivisit-console frontend path:', CONSOLE_FRONTEND);
  process.exit(1);
}

if (!fs.existsSync(TYPES_FILE)) {
  console.error('[console-ui-crud-contract] Missing type file:', TYPES_FILE);
  process.exit(1);
}

const UI_SURFACES = [
  {
    id: 'hospitals',
    table: 'hospitals',
    modal: 'src/components/modals/HospitalModal.jsx',
    page: 'src/components/pages/HospitalsPage.jsx',
    service: 'src/services/hospitalsService.js',
    createFn: 'createHospital',
    updateFn: 'updateHospital',
    dynamicUpdatePayload: true,
    uiOnlyFields: [
      'website',
      'place_id',
      'imported_from_google',
      'import_status',
      'reserved_beds',
      'total_beds',
      'hospital',
    ],
  },
  {
    id: 'doctors',
    table: 'doctors',
    modal: 'src/components/modals/DoctorModal.jsx',
    page: 'src/components/pages/DoctorsPage.jsx',
    service: 'src/services/doctorsService.js',
    createFn: 'createDoctor',
    updateFn: 'updateDoctor',
    dynamicUpdatePayload: true,
    skipPageWiring: true,
    uiOnlyFields: ['hospitals'],
  },
  {
    id: 'doctor_schedule_updates',
    table: 'doctors',
    modal: 'src/components/modals/StaffSchedulingModal.jsx',
    modalStateVar: 'newSchedule',
    modalSetStateVar: 'setNewSchedule',
    page: 'src/components/pages/HospitalsPage.jsx',
    service: 'src/services/staffSchedulingService.js',
    createFn: 'createStaffSchedule',
    updateFn: 'updateStaffSchedule',
    dynamicCreatePayload: true,
    skipPageWiring: true,
    ignoreModalDbFields: ['profile_id', 'hospital_id'],
    uiOnlyFields: [
      'date',
      'start_time',
      'end_time',
      'shift_type',
      'notes',
      'schedule_type',
      'doctor_id',
      'activeTab',
      'selectedStaff',
      'schedules',
      'staffList',
      'stats',
      'loading',
      'fetchingStaff',
    ],
  },
  {
    id: 'ambulances',
    table: 'ambulances',
    modal: 'src/components/modals/AmbulanceModal.jsx',
    page: 'src/components/pages/AmbulancesPage.jsx',
    service: 'src/services/ambulancesService.js',
    createFn: 'createAmbulance',
    updateFn: 'updateAmbulance',
    dynamicCreatePayload: true,
    dynamicUpdatePayload: true,
    skipPageWiring: true,
    uiOnlyFields: ['driver_id', 'eta', 'hospital', 'hospitals'],
  },
  {
    id: 'profiles',
    table: 'profiles',
    modal: 'src/components/modals/UserModal.jsx',
    page: 'src/components/pages/UsersPage.jsx',
    service: 'src/services/profilesService.js',
    createFn: 'createProfile',
    updateFn: 'updateProfile',
    dynamicUpdatePayload: true,
    uiOnlyFields: ['avatar_url', 'organization_name', 'profile_username', 'profile_role'],
  },
  {
    id: 'organizations',
    table: 'organizations',
    modal: 'src/components/pages/OrganizationsPage.jsx',
    modalStateVar: 'selectedOrg',
    modalSetStateVar: 'setSelectedOrg',
    page: 'src/components/pages/OrganizationsPage.jsx',
    service: 'src/services/organizationsService.js',
    createFn: 'saveOrganization',
    updateFn: 'saveOrganization',
  },
  {
    id: 'visits',
    table: 'visits',
    modal: 'src/components/modals/VisitModal.jsx',
    page: 'src/components/pages/VisitsPage.jsx',
    service: 'src/services/visitsService.js',
    createFn: 'createVisit',
    updateFn: 'updateVisit',
    dynamicCreatePayload: true,
    dynamicUpdatePayload: true,
    createKeysFromSet: 'VISIT_COLUMNS',
    updateKeysFromSet: 'VISIT_COLUMNS',
    uiOnlyFields: [
      'doctor',
      'visit_type',
      'hospital',
      'user_email',
      'estimated_duration',
      'insurance_covered',
      'preparation',
      'reason',
      'room_number',
      'profiles',
      'patient',
      'hospitals',
    ],
  },
  {
    id: 'service_pricing',
    table: 'service_pricing',
    modal: 'src/components/pages/PricingManagementPage.jsx',
    page: 'src/components/pages/PricingManagementPage.jsx',
    service: 'src/services/pricingService.js',
    createFn: 'saveServicePricing',
    updateFn: 'saveServicePricing',
    createKeysFromVar: 'payload',
    updateKeysFromVar: 'payload',
    uiOnlyFields: ['name', 'price', 'type', 'unit'],
  },
  {
    id: 'room_pricing',
    table: 'room_pricing',
    modal: 'src/components/pages/PricingManagementPage.jsx',
    page: 'src/components/pages/PricingManagementPage.jsx',
    service: 'src/services/pricingService.js',
    createFn: 'saveRoomPricing',
    updateFn: 'saveRoomPricing',
    createKeysFromVar: 'payload',
    updateKeysFromVar: 'payload',
    uiOnlyFields: ['name', 'price', 'type', 'unit'],
  },
  {
    id: 'insurance_policies',
    table: 'insurance_policies',
    modal: 'src/components/modals/InsuranceModal.jsx',
    page: 'src/components/pages/InsuranceManagementPage.jsx',
    service: 'src/services/insurancePoliciesService.js',
    createFn: 'createInsurancePolicy',
    updateFn: 'updateInsurancePolicy',
    dynamicCreatePayload: true,
    dynamicUpdatePayload: true,
    pageCreateAliases: ['createPolicy'],
    pageUpdateAliases: ['updatePolicy'],
    uiOnlyFields: ['providers', 'coverageTypes', 'statuses'],
  },
  {
    id: 'support_tickets',
    table: 'support_tickets',
    modal: 'src/components/modals/SupportTicketModal.jsx',
    page: 'src/components/pages/SupportTicketsPage.jsx',
    service: 'src/services/supportTicketsService.js',
    createFn: 'createSupportTicket',
    updateFn: 'updateSupportTicket',
    dynamicUpdatePayload: true,
    pageCreateAliases: ['createTicket'],
    pageUpdateAliases: ['updateTicket'],
  },
  {
    id: 'emergency_requests',
    table: 'emergency_requests',
    modal: 'src/components/modals/EmergencyRequestModal.jsx',
    page: 'src/components/pages/EmergencyRequestsPage.jsx',
    service: 'src/services/emergencyService.js',
    createFn: 'createEmergencyRequest',
    updateFn: 'updateEmergencyRequest',
    dynamicCreatePayload: true,
    dynamicUpdatePayload: true,
    skipPageWiring: true,
    uiOnlyFields: ['emergency_type', 'priority', 'location', 'latitude', 'longitude', 'description'],
  },
  {
    id: 'subscribers',
    table: 'subscribers',
    modal: 'src/components/modals/SubscriptionModal.jsx',
    page: 'src/components/pages/SubscriptionManagementPage.jsx',
    service: 'src/services/subscriptionService.js',
    createFn: 'createSubscriber',
    updateFn: 'updateSubscriber',
    dynamicCreatePayload: true,
    dynamicUpdatePayload: true,
    createKeysFromSet: 'WRITABLE_FIELDS',
    updateKeysFromSet: 'WRITABLE_FIELDS',
    uiOnlyFields: [
      'sendWelcomeEmail',
      'selectedSubscribers',
      'bulkEmailMode',
      'bulkEmailContent',
      'bulkEmailSubject',
      'bulkEmailRecipients',
      'customEmailSubject',
      'customEmailContent',
      'selectedSubscriberForEmail',
      'emailAction',
      'selectedEmailAction',
      'searchTerm',
      'selectAll',
    ],
  },
  {
    id: 'health_news',
    table: 'health_news',
    modal: 'src/components/modals/HealthNewsModal.jsx',
    page: 'src/components/pages/HealthNewsManagementPage.jsx',
    service: 'src/services/healthNewsService.js',
    createFn: 'createHealthNews',
    updateFn: 'updateHealthNews',
    dynamicCreatePayload: true,
    dynamicUpdatePayload: true,
    skipPageWiring: true,
  },
];

function nowIso() {
  return new Date().toISOString();
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function safeRead(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function uniq(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function escapeRegex(input) {
  return String(input || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function splitTopLevelComma(input) {
  const items = [];
  let current = '';
  let depthParen = 0;
  let depthBracket = 0;
  let depthBrace = 0;
  let quote = null;
  let escaped = false;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    current += ch;
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '(') depthParen += 1;
    if (ch === ')') depthParen = Math.max(0, depthParen - 1);
    if (ch === '[') depthBracket += 1;
    if (ch === ']') depthBracket = Math.max(0, depthBracket - 1);
    if (ch === '{') depthBrace += 1;
    if (ch === '}') depthBrace = Math.max(0, depthBrace - 1);
    if (ch === ',' && depthParen === 0 && depthBracket === 0 && depthBrace === 0) {
      items.push(current.slice(0, -1));
      current = '';
    }
  }
  if (current.trim()) items.push(current);
  return items;
}

function extractCallArgsText(sourceText, callStartIndex) {
  const openIndex = sourceText.indexOf('(', callStartIndex);
  if (openIndex < 0) return null;
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = openIndex; i < sourceText.length; i += 1) {
    const ch = sourceText[i];
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '(') depth += 1;
    if (ch === ')') {
      depth -= 1;
      if (depth === 0) {
        return sourceText.slice(openIndex + 1, i);
      }
    }
  }
  return null;
}

function extractFirstObjectLiteral(sourceText, fromIndex) {
  const maxSearch = Math.min(sourceText.length, fromIndex + 6000);
  let start = -1;
  let quote = null;
  let escaped = false;
  for (let i = fromIndex; i < maxSearch; i += 1) {
    const ch = sourceText[i];
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{') {
      start = i;
      break;
    }
  }
  if (start < 0) return null;
  let depth = 0;
  quote = null;
  escaped = false;
  for (let i = start; i < maxSearch; i += 1) {
    const ch = sourceText[i];
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return sourceText.slice(start, i + 1);
    }
  }
  return null;
}

function extractTopLevelObjectKeys(objectText) {
  if (!objectText || objectText[0] !== '{') return [];
  const keys = [];
  const inner = objectText.slice(1, -1);
  const parts = splitTopLevelComma(inner);
  for (const part of parts) {
    let segment = (part || '').trim();
    if (!segment || segment.startsWith('...')) continue;
    segment = segment
      .replace(/^\s*\/\/[^\n]*\n/gm, '')
      .replace(/^\s*\/\*[\s\S]*?\*\//gm, '')
      .trim();
    if (!segment) continue;

    const bareKeyMatch = /^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/.exec(segment);
    if (bareKeyMatch) {
      keys.push(bareKeyMatch[1]);
      continue;
    }

    const quotedKeyMatch = /^['"`]([^'"`]+)['"`]\s*:/.exec(segment);
    if (quotedKeyMatch && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(quotedKeyMatch[1])) {
      keys.push(quotedKeyMatch[1]);
    }
  }
  return uniq(keys);
}

function extractFunctionBody(sourceText, fnName) {
  const escaped = fnName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const declRe = new RegExp(`(?:export\\s+)?(?:async\\s+)?function\\s+${escaped}\\s*\\(`, 'm');
  const arrowRe = new RegExp(
    `(?:export\\s+)?(?:const|let|var)\\s+${escaped}\\s*=\\s*(?:async\\s*)?\\([^)]*\\)\\s*=>`,
    'm'
  );
  const match = declRe.exec(sourceText) || arrowRe.exec(sourceText);
  if (!match) return '';
  const open = sourceText.indexOf('{', match.index);
  if (open < 0) return '';
  let depth = 0;
  let quote = null;
  let escapedChar = false;
  for (let i = open; i < sourceText.length; i += 1) {
    const ch = sourceText[i];
    if (quote) {
      if (escapedChar) {
        escapedChar = false;
        continue;
      }
      if (ch === '\\') {
        escapedChar = true;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return sourceText.slice(open + 1, i);
    }
  }
  return '';
}

function extractSetConstantValues(sourceText, constName) {
  const escaped = constName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`const\\s+${escaped}\\s*=\\s*new\\s+Set\\s*\\(\\s*\\[([\\s\\S]*?)\\]\\s*\\)`, 'm');
  const match = re.exec(sourceText);
  if (!match) return [];
  const values = [];
  const valueRe = /['"`]([a-zA-Z0-9_]+)['"`]/g;
  let vm;
  while ((vm = valueRe.exec(match[1])) !== null) values.push(vm[1]);
  return uniq(values);
}

function extractObjectVarKeys(fnBody, varName) {
  if (!fnBody || !varName) return [];
  const escaped = escapeRegex(varName);
  const varRe = new RegExp(`(?:const|let|var)\\s+${escaped}\\s*=`, 'g');
  const match = varRe.exec(fnBody);
  if (!match) return [];
  const assignStart = match.index + match[0].length;
  const objectLiteral = extractFirstObjectLiteral(fnBody, assignStart);
  return extractTopLevelObjectKeys(objectLiteral);
}

function extractWritePayloadKeys(fnBody, operation) {
  if (!fnBody) return [];
  const keys = [];
  const opRe = new RegExp(`\\.${operation}\\s*\\(`, 'g');
  let m;
  while ((m = opRe.exec(fnBody)) !== null) {
    const args = extractCallArgsText(fnBody, m.index);
    if (!args) continue;
    const parts = splitTopLevelComma(args);
    const first = (parts[0] || '').trim();
    if (!first) continue;
    if (first.startsWith('{')) {
      keys.push(...extractTopLevelObjectKeys(extractFirstObjectLiteral(first, 0)));
      continue;
    }
    if (first.startsWith('[') && first.includes('{')) {
      keys.push(...extractTopLevelObjectKeys(extractFirstObjectLiteral(first, 0)));
      continue;
    }
    const varMatch = first.match(/^\[?\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\]?$/);
    if (!varMatch) continue;
    const varName = varMatch[1];
    const varRe = new RegExp(`(?:const|let|var)\\s+${varName}\\s*=`, 'g');
    const varDef = varRe.exec(fnBody);
    if (!varDef) continue;
    const assignStart = varDef.index + varDef[0].length;
    const assignmentText = fnBody.slice(assignStart).trimStart();

    if (assignmentText.startsWith('{') || assignmentText.startsWith('[')) {
      const objectLiteral = extractFirstObjectLiteral(fnBody, assignStart);
      keys.push(...extractTopLevelObjectKeys(objectLiteral));
      continue;
    }

    const fnCallMatch = /^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/.exec(assignmentText);
    if (!fnCallMatch) continue;
    const argsText = extractCallArgsText(assignmentText, 0);
    if (!argsText) continue;
    const argParts = splitTopLevelComma(argsText);
    const firstArg = (argParts[0] || '').trim();
    if (firstArg.startsWith('{')) {
      const firstObject = extractFirstObjectLiteral(firstArg, 0);
      keys.push(...extractTopLevelObjectKeys(firstObject));
      continue;
    }
    if (firstArg.startsWith('[') && firstArg.includes('{')) {
      const firstObject = extractFirstObjectLiteral(firstArg, 0);
      keys.push(...extractTopLevelObjectKeys(firstObject));
    }
  }
  return uniq(keys);
}

function extractModalFieldKeys(modalContent, options = {}) {
  const stateVar = options.stateVar || 'formData';
  const setStateVar = options.setStateVar || 'setFormData';
  const escapedStateVar = escapeRegex(stateVar);
  const escapedSetStateVar = escapeRegex(setStateVar);
  const keys = [];
  const add = (k) => {
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(k)) keys.push(k);
  };

  let m;
  const nameAttrRe = /name\s*=\s*['"`]([a-zA-Z0-9_]+)['"`]/g;
  while ((m = nameAttrRe.exec(modalContent)) !== null) add(m[1]);

  const handleChangeRe = /handleChange\(\s*['"`]([a-zA-Z0-9_]+)['"`]/g;
  while ((m = handleChangeRe.exec(modalContent)) !== null) add(m[1]);

  const setFormPrevRe = new RegExp(
    `${escapedSetStateVar}\\(\\s*prev\\s*=>\\s*\\(\\s*\\{\\s*\\.\\.\\.prev,\\s*([a-zA-Z0-9_]+)\\s*:`,
    'g'
  );
  while ((m = setFormPrevRe.exec(modalContent)) !== null) add(m[1]);

  const setFormDirectRe = new RegExp(
    `${escapedSetStateVar}\\(\\s*\\{\\s*\\.\\.\\.${escapedStateVar},\\s*([a-zA-Z0-9_]+)\\s*:`,
    'g'
  );
  while ((m = setFormDirectRe.exec(modalContent)) !== null) add(m[1]);

  const useStateRe = new RegExp(
    `const\\s*\\[\\s*${escapedStateVar}\\s*,\\s*${escapedSetStateVar}\\s*\\]\\s*=\\s*useState\\s*\\(`
  );
  const useStateMatch = useStateRe.exec(modalContent);
  if (useStateMatch) {
    const literal = extractFirstObjectLiteral(modalContent, useStateMatch.index);
    keys.push(...extractTopLevelObjectKeys(literal));
  }

  return uniq(keys).sort();
}

function findKeyBlock(sourceText, key, fromIndex = 0) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const keyRegex = new RegExp(`(^|[^a-zA-Z0-9_])['"\`]?${escaped}['"\`]?\\s*:\\s*\\{`, 'gm');
  keyRegex.lastIndex = fromIndex;
  const keyMatch = keyRegex.exec(sourceText);
  if (!keyMatch) return null;
  const keyStart = keyMatch.index + (keyMatch[1] || '').length;
  const openBraceIndex = sourceText.indexOf('{', keyStart);
  let depth = 0;
  let quote = null;
  let escapedChar = false;
  for (let i = openBraceIndex; i < sourceText.length; i += 1) {
    const ch = sourceText[i];
    if (quote) {
      if (escapedChar) {
        escapedChar = false;
        continue;
      }
      if (ch === '\\') {
        escapedChar = true;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return sourceText.slice(openBraceIndex, i + 1);
    }
  }
  return null;
}

function findKeyArrayBlock(sourceText, key, fromIndex = 0) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const keyRegex = new RegExp(`(^|[^a-zA-Z0-9_])['"\`]?${escaped}['"\`]?\\s*:\\s*\\[`, 'gm');
  keyRegex.lastIndex = fromIndex;
  const keyMatch = keyRegex.exec(sourceText);
  if (!keyMatch) return null;
  const keyStart = keyMatch.index + (keyMatch[1] || '').length;
  const open = sourceText.indexOf('[', keyStart);
  let depth = 0;
  let quote = null;
  let escapedChar = false;
  for (let i = open; i < sourceText.length; i += 1) {
    const ch = sourceText[i];
    if (quote) {
      if (escapedChar) {
        escapedChar = false;
        continue;
      }
      if (ch === '\\') {
        escapedChar = true;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '[') depth += 1;
    if (ch === ']') {
      depth -= 1;
      if (depth === 0) return sourceText.slice(open, i + 1);
    }
  }
  return null;
}

function extractTsObjectProps(objectText) {
  if (!objectText || objectText[0] !== '{') return [];
  const props = [];
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = 0; i < objectText.length; i += 1) {
    const ch = objectText[i];
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{') {
      depth += 1;
      continue;
    }
    if (ch === '}') {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (depth !== 1) continue;
    if (/[a-zA-Z_$]/.test(ch)) {
      let j = i + 1;
      while (j < objectText.length && /[a-zA-Z0-9_$]/.test(objectText[j])) j += 1;
      const key = objectText.slice(i, j);
      let optional = false;
      let k = j;
      while (k < objectText.length && /\s/.test(objectText[k])) k += 1;
      if (objectText[k] === '?') {
        optional = true;
        k += 1;
      }
      while (k < objectText.length && /\s/.test(objectText[k])) k += 1;
      if (objectText[k] === ':') props.push({ key, optional });
      i = j - 1;
    }
  }
  return props;
}

function parseRelationships(relationshipsArrayText) {
  if (!relationshipsArrayText) return [];
  const blocks = [];
  let quote = null;
  let escaped = false;
  let depth = 0;
  let start = -1;
  for (let i = 0; i < relationshipsArrayText.length; i += 1) {
    const ch = relationshipsArrayText[i];
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{') {
      if (depth === 0) start = i;
      depth += 1;
      continue;
    }
    if (ch === '}') {
      depth -= 1;
      if (depth === 0 && start >= 0) blocks.push(relationshipsArrayText.slice(start, i + 1));
    }
  }
  return blocks.map((block) => {
    const cols = [];
    const colsRe = /columns\s*:\s*\[([^\]]*)\]/m.exec(block);
    if (colsRe) {
      const cRe = /['"`]([a-zA-Z0-9_]+)['"`]/g;
      let cm;
      while ((cm = cRe.exec(colsRe[1])) !== null) cols.push(cm[1]);
    }
    const ref = /referencedRelation\s*:\s*['"`]([a-zA-Z0-9_]+)['"`]/m.exec(block);
    return { columns: uniq(cols), referenced_relation: ref?.[1] || null };
  });
}

function includesAny(content, candidates) {
  if (!content || !Array.isArray(candidates)) return false;
  return candidates.some((candidate) => typeof candidate === 'string' && candidate && content.includes(candidate));
}

function resolveTableMetaFromTypes(tableName, typeContent) {
  const publicBlock = findKeyBlock(typeContent, 'public');
  const tablesBlock = publicBlock ? findKeyBlock(publicBlock, 'Tables') : null;
  const tableBlock = tablesBlock ? findKeyBlock(tablesBlock, tableName) : null;
  if (!tableBlock) return { columns: [], required_insert_columns: [], relationships: [] };
  const rowBlock = findKeyBlock(tableBlock, 'Row');
  const insertBlock = findKeyBlock(tableBlock, 'Insert');
  const relationshipsBlock = findKeyArrayBlock(tableBlock, 'Relationships');
  const rowProps = extractTsObjectProps(rowBlock);
  const insertProps = extractTsObjectProps(insertBlock);
  return {
    columns: uniq(rowProps.map((p) => p.key)).sort(),
    required_insert_columns: uniq(insertProps.filter((p) => !p.optional).map((p) => p.key)).sort(),
    relationships: parseRelationships(relationshipsBlock),
  };
}

function run() {
  const startedAt = nowIso();
  console.log(`[console-ui-crud-contract] Starting at ${startedAt}`);

  const typeContent = safeRead(TYPES_FILE);
  const surfaces = [];

  for (const surface of UI_SURFACES) {
    const modalPath = path.join(CONSOLE_FRONTEND, surface.modal);
    const pagePath = path.join(CONSOLE_FRONTEND, surface.page);
    const servicePath = path.join(CONSOLE_FRONTEND, surface.service);

    const modalContent = safeRead(modalPath);
    const pageContent = safeRead(pagePath);
    const serviceContent = safeRead(servicePath);
    const tableMeta = resolveTableMetaFromTypes(surface.table, typeContent);

    const modalFields = extractModalFieldKeys(modalContent, {
      stateVar: surface.modalStateVar,
      setStateVar: surface.modalSetStateVar,
    });
    const createFnBody = extractFunctionBody(serviceContent, surface.createFn);
    const updateFnBody = extractFunctionBody(serviceContent, surface.updateFn);

    const staticCreateKeys = uniq([
      ...extractWritePayloadKeys(createFnBody, 'insert'),
      ...extractWritePayloadKeys(createFnBody, 'upsert'),
    ]);
    const staticUpdateKeys = uniq([
      ...extractWritePayloadKeys(updateFnBody, 'update'),
      ...extractWritePayloadKeys(updateFnBody, 'upsert'),
    ]);

    const createKeysFromSet = surface.createKeysFromSet
      ? extractSetConstantValues(serviceContent, surface.createKeysFromSet)
      : [];
    const updateKeysFromSet = surface.updateKeysFromSet
      ? extractSetConstantValues(serviceContent, surface.updateKeysFromSet)
      : [];
    const createKeysFromVar = surface.createKeysFromVar
      ? extractObjectVarKeys(createFnBody, surface.createKeysFromVar)
      : [];
    const updateKeysFromVar = surface.updateKeysFromVar
      ? extractObjectVarKeys(updateFnBody, surface.updateKeysFromVar)
      : [];

    const createKeys = uniq([...staticCreateKeys, ...createKeysFromSet, ...createKeysFromVar]).sort();
    const updateKeys = uniq([...staticUpdateKeys, ...updateKeysFromSet, ...updateKeysFromVar]).sort();

    const uiOnly = new Set(surface.uiOnlyFields || []);
    const ignoredModalDbFields = new Set(surface.ignoreModalDbFields || []);
    const tableColumns = new Set(tableMeta.columns || []);
    const persistedKnown = new Set([...createKeys, ...updateKeys]);
    const modalDbFields = modalFields.filter((f) => tableColumns.has(f));
    const modalUnknownFields = modalFields.filter((f) => !tableColumns.has(f) && !uiOnly.has(f));
    const modalDbFieldsNotPersisted = modalDbFields.filter(
      (f) => !persistedKnown.has(f) && !ignoredModalDbFields.has(f)
    );
    const missingRequiredCreateColumns = (tableMeta.required_insert_columns || [])
      .filter((c) => !createKeys.includes(c))
      .sort();
    const serviceUnknownColumns = uniq(
      [...createKeys, ...updateKeys].filter((k) => !tableColumns.has(k))
    ).sort();

    const relationColumns = uniq(
      (tableMeta.relationships || []).flatMap((r) => r.columns || [])
    ).sort();
    const missingRelationCreateColumns = relationColumns.filter(
      (col) => (tableMeta.required_insert_columns || []).includes(col) && !createKeys.includes(col)
    );

    const createCandidates = uniq([surface.createFn, ...(surface.pageCreateAliases || [])]);
    const updateCandidates = uniq([surface.updateFn, ...(surface.pageUpdateAliases || [])]);
    const createLinked = surface.skipPageWiring ? true : includesAny(pageContent, createCandidates);
    const updateLinked = surface.skipPageWiring ? true : includesAny(pageContent, updateCandidates);

    const risks = [];
    if (missingRequiredCreateColumns.length > 0 && !surface.dynamicCreatePayload) {
      risks.push('missing_required_create_columns');
    }
    if (tableMeta.columns.length > 0 && serviceUnknownColumns.length > 0) {
      risks.push('service_unknown_columns');
    }
    if (modalDbFieldsNotPersisted.length > 0 && !surface.dynamicUpdatePayload) {
      risks.push('modal_db_fields_not_persisted');
    }
    if (!surface.skipPageWiring && (!createLinked || !updateLinked)) {
      risks.push('page_service_wiring_gap');
    }

    surfaces.push({
      id: surface.id,
      table: surface.table,
      modal: surface.modal,
      page: surface.page,
      service: surface.service,
      create_fn: surface.createFn,
      update_fn: surface.updateFn,
      dynamic_create_payload: !!surface.dynamicCreatePayload,
      dynamic_update_payload: !!surface.dynamicUpdatePayload,
      modal_field_count: modalFields.length,
      modal_fields: modalFields,
      modal_unknown_fields: modalUnknownFields,
      modal_db_fields_not_persisted: modalDbFieldsNotPersisted,
      service_create_keys: createKeys,
      service_update_keys: updateKeys,
      table_columns: tableMeta.columns,
      required_insert_columns: tableMeta.required_insert_columns,
      missing_required_create_columns: missingRequiredCreateColumns,
      service_unknown_columns: serviceUnknownColumns,
      relationship_columns: relationColumns,
      missing_relation_create_columns: missingRelationCreateColumns,
      page_wiring: {
        skipped: !!surface.skipPageWiring,
        create_candidates: createCandidates,
        update_candidates: updateCandidates,
        create_linked: createLinked,
        update_linked: updateLinked,
      },
      risks,
    });
  }

  const summary = {
    surfaces: surfaces.length,
    surfaces_with_risks: surfaces.filter((s) => s.risks.length > 0).length,
    missing_required_create_columns: surfaces.filter(
      (s) => s.missing_required_create_columns.length > 0 && !s.dynamic_create_payload
    ).length,
    service_unknown_columns: surfaces.filter((s) => s.service_unknown_columns.length > 0).length,
    modal_db_fields_not_persisted: surfaces.filter(
      (s) => s.modal_db_fields_not_persisted.length > 0 && !s.dynamic_update_payload
    ).length,
    page_service_wiring_gaps: surfaces.filter((s) => !s.page_wiring.create_linked || !s.page_wiring.update_linked).length,
  };

  const report = {
    generated_at: nowIso(),
    source: 'run_console_ui_crud_contract_matrix.js',
    summary,
    surfaces,
  };

  const outDir = path.join(ROOT, 'supabase', 'tests', 'validation');
  ensureDir(outDir);
  const outFile = path.join(outDir, 'console_ui_crud_contract_matrix_report.json');
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));

  console.log(`[console-ui-crud-contract] Report written: ${outFile}`);
  console.log(
    `[console-ui-crud-contract] surfaces=${summary.surfaces} risks=${summary.surfaces_with_risks} missing_required_create_columns=${summary.missing_required_create_columns} service_unknown_columns=${summary.service_unknown_columns} modal_db_fields_not_persisted=${summary.modal_db_fields_not_persisted} page_wiring_gaps=${summary.page_service_wiring_gaps}`
  );
}

run();
