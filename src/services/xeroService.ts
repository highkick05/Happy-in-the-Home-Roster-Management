import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import Holidays from 'date-holidays';
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';

export interface XeroSettings {
  xero_enabled: boolean;
  xero_auth_type: 'client_credentials' | 'oauth2' | 'manual';
  xero_client_id: string;
  xero_client_secret: string;
  xero_tenant_id: string;
  xero_tenant_name?: string;
  xero_access_token?: string;
  xero_refresh_token?: string;
  xero_token_expires_at?: number;
  xero_account_code: string;
  xero_invoice_status: 'AUTHORISED' | 'DRAFT' | 'SUBMITTED';
  xero_tax_type_gst: string;
  xero_tax_type_free: string;
  xero_sync_on_trilogy: boolean;
  xero_sync_on_email: boolean;
  xero_attach_pdf: boolean;
  xero_redirect_uri?: string;
  xero_shortcode?: string;
}

export function getXeroSettings(db: any): XeroSettings {
  try {
    const rows = db.prepare("SELECT key, value FROM settings WHERE key LIKE 'xero_%'").all() as any[];
    const map: Record<string, any> = {};
    for (const row of rows) {
      try {
        map[row.key] = JSON.parse(row.value);
      } catch {
        map[row.key] = row.value;
      }
    }

    return {
      xero_enabled: map.xero_enabled === true || map.xero_enabled === 'true' || map.xero_enabled === 1,
      xero_auth_type: map.xero_auth_type || 'oauth2',
      xero_client_id: (map.xero_client_id || '').trim(),
      xero_client_secret: (map.xero_client_secret || '').trim(),
      xero_tenant_id: (map.xero_tenant_id || '').trim(),
      xero_tenant_name: map.xero_tenant_name || '',
      xero_shortcode: map.xero_shortcode || '',
      xero_access_token: map.xero_access_token || '',
      xero_refresh_token: map.xero_refresh_token || '',
      xero_token_expires_at: map.xero_token_expires_at ? Number(map.xero_token_expires_at) : 0,
      xero_account_code: (map.xero_account_code || '200').trim(),
      xero_invoice_status: (map.xero_invoice_status || 'AUTHORISED') as any,
      xero_tax_type_gst: map.xero_tax_type_gst || 'OUTPUT',
      xero_tax_type_free: map.xero_tax_type_free || 'BASEXCLUDED',
      xero_sync_on_trilogy: map.xero_sync_on_trilogy !== false && map.xero_sync_on_trilogy !== 'false',
      xero_sync_on_email: map.xero_sync_on_email !== false && map.xero_sync_on_email !== 'false',
      xero_attach_pdf: map.xero_attach_pdf !== false && map.xero_attach_pdf !== 'false',
      xero_redirect_uri: map.xero_redirect_uri || '',
    };
  } catch (e: any) {
    console.error('[XERO] Error loading settings:', e);
    return {
      xero_enabled: false,
      xero_auth_type: 'client_credentials',
      xero_client_id: '',
      xero_client_secret: '',
      xero_tenant_id: '',
      xero_account_code: '200',
      xero_invoice_status: 'AUTHORISED',
      xero_tax_type_gst: 'OUTPUT',
      xero_tax_type_free: 'BASEXCLUDED',
      xero_sync_on_trilogy: true,
      xero_sync_on_email: true,
      xero_attach_pdf: true,
    };
  }
}

export function saveXeroSetting(db: any, key: string, value: any) {
  try {
    const valStr = typeof value === 'string' ? value : JSON.stringify(value);
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, valStr);
  } catch (e) {
    console.error(`[XERO] Error saving setting ${key}:`, e);
  }
}

/**
 * Obtains a valid Xero Access Token, automatically handling refresh or client_credentials.
 */
export async function getValidAccessToken(db: any, forcedSettings?: XeroSettings): Promise<{
  accessToken: string;
  tenantId: string;
  tenantName: string;
  settings: XeroSettings;
}> {
  const settings = forcedSettings || getXeroSettings(db);

  if (!settings.xero_client_id) {
    throw new Error('Xero Client ID is not configured in Settings.');
  }

  const now = Date.now();
  const tokenExpiresAt = settings.xero_token_expires_at || 0;
  const isExpiringSoon = tokenExpiresAt > 0 && tokenExpiresAt - now < 300 * 1000; // 5 min buffer

  // If we already have a valid token that isn't expiring soon, use it
  if (settings.xero_access_token && !isExpiringSoon && tokenExpiresAt > now) {
    let tenantId = settings.xero_tenant_id;
    let tenantName = settings.xero_tenant_name || '';

    // If tenantId is missing, resolve it from /connections
    if (!tenantId) {
      const connections = await getConnections(settings.xero_access_token);
      if (connections && connections.length > 0) {
        tenantId = connections[0].tenantId;
        tenantName = connections[0].tenantName || '';
        saveXeroSetting(db, 'xero_tenant_id', tenantId);
        saveXeroSetting(db, 'xero_tenant_name', tenantName);
        settings.xero_tenant_id = tenantId;
        settings.xero_tenant_name = tenantName;
      }
    }

    if (!tenantId) {
      throw new Error('No Xero Organisation/Tenant ID found for this account.');
    }

    return {
      accessToken: settings.xero_access_token,
      tenantId,
      tenantName,
      settings,
    };
  }

  // Need a new token
  if (settings.xero_auth_type === 'client_credentials') {
    if (!settings.xero_client_secret) {
      throw new Error('Xero Client Secret is required for Client Credentials authentication.');
    }

    const authHeader = 'Basic ' + Buffer.from(`${settings.xero_client_id}:${settings.xero_client_secret}`).toString('base64');
    
    // Attempt token request with required scopes (support both granular 2026+ and legacy broad scopes).
    // In Xero Custom Connections, omitting the scope parameter automatically requests all scopes approved for the connection in developer.xero.com.
    const scopesToTry = [
      '', // Omitting scope gets all approved scopes configured on the Custom Connection
      'accounting.invoices accounting.payments accounting.contacts accounting.settings.read accounting.attachments payroll.settings payroll.settings.read payroll.employees payroll.employees.read payroll.timesheets payroll.payruns payroll.payruns.read payroll.payslip payroll.payslip.read',
      'accounting.invoices accounting.invoices.read accounting.payments accounting.contacts accounting.settings.read accounting.attachments',
      'accounting.invoices accounting.contacts accounting.settings.read accounting.attachments payroll.settings payroll.settings.read payroll.employees payroll.employees.read payroll.timesheets payroll.payruns payroll.payruns.read payroll.payslip payroll.payslip.read',
      'accounting.invoices accounting.contacts accounting.settings.read accounting.attachments payroll.settings payroll.settings.read payroll.employees payroll.employees.read payroll.timesheets payroll.payruns payroll.payslip',
      'accounting.invoices accounting.contacts accounting.settings.read accounting.attachments payroll.settings payroll.settings.read payroll.employees payroll.employees.read payroll.timesheets',
      'accounting.invoices accounting.contacts accounting.settings.read accounting.attachments payroll.settings payroll.settings.read payroll.employees.read',
      'accounting.invoices accounting.contacts accounting.settings.read accounting.attachments payroll.settings payroll.settings.read',
      'accounting.invoices accounting.contacts accounting.settings.read accounting.attachments payroll.settings.read',
      'accounting.invoices accounting.contacts accounting.settings.read accounting.attachments payroll.settings',
      'accounting.invoices accounting.payments accounting.contacts accounting.settings.read accounting.attachments',
      'accounting.invoices accounting.contacts accounting.settings.read accounting.attachments',
      'accounting.invoices accounting.contacts accounting.attachments',
      'accounting.invoices accounting.contacts',
      'accounting.invoices',
      'accounting.transactions accounting.contacts accounting.settings accounting.attachments',
      'accounting.transactions accounting.contacts accounting.attachments',
      'accounting.transactions accounting.contacts',
      'accounting.transactions',
    ];

    let tokenRes: any = null;
    let tokenData: any = null;
    let lastErrDetail = '';

    for (const scopeStr of scopesToTry) {
      const bodyParams: Record<string, string> = {
        grant_type: 'client_credentials',
      };
      if (scopeStr) {
        bodyParams.scope = scopeStr;
      }

      tokenRes = await fetch('https://identity.xero.com/connect/token', {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(bodyParams).toString(),
      });

      tokenData = await tokenRes.json().catch(() => ({}));
      if (tokenRes.ok) {
        break;
      }
      lastErrDetail = tokenData.error_description || tokenData.error || tokenRes.statusText;
      // If error is invalid_client, stop immediately
      if (tokenData.error === 'invalid_client') {
        break;
      }
    }

    if (!tokenRes.ok) {
      if (tokenData.error === 'invalid_grant' || (lastErrDetail && String(lastErrDetail).toLowerCase().includes('client credentials scope validation failed'))) {
        throw new Error('Client credentials scope validation failed: Make sure your Custom Connection in Xero is approved, or switch to "OAuth 2.0 Web App" if your app was created as a Web App.');
      }
      throw new Error(`Xero Token Error (${tokenRes.status}): ${lastErrDetail}`);
    }

    const accessToken = tokenData.access_token;
    const expiresIn = Number(tokenData.expires_in) || 1800;
    const newExpiresAt = Date.now() + expiresIn * 1000;

    saveXeroSetting(db, 'xero_access_token', accessToken);
    saveXeroSetting(db, 'xero_token_expires_at', newExpiresAt);
    settings.xero_access_token = accessToken;
    settings.xero_token_expires_at = newExpiresAt;

    // Resolve tenant ID if accessible
    let tenantId = settings.xero_tenant_id;
    let tenantName = settings.xero_tenant_name || '';

    try {
      const connections = await getConnections(accessToken);
      if (connections && connections.length > 0) {
        tenantId = tenantId || connections[0].tenantId;
        tenantName = connections.find(c => c.tenantId === tenantId)?.tenantName || connections[0].tenantName || '';
        saveXeroSetting(db, 'xero_tenant_id', tenantId);
        saveXeroSetting(db, 'xero_tenant_name', tenantName);
        settings.xero_tenant_id = tenantId;
        settings.xero_tenant_name = tenantName;
      }
    } catch {}

    // For Custom Connections, tenantId is not strictly required because it is implicitly bound to one organisation
    if (!tenantId) {
      tenantId = '';
      tenantName = tenantName || 'Custom Connection';
    }

    return {
      accessToken,
      tenantId,
      tenantName,
      settings,
    };
  } else if (settings.xero_auth_type === 'oauth2') {
    // Refresh token flow
    if (!settings.xero_refresh_token) {
      throw new Error('Xero is not connected. Please click "Connect to Xero" in Settings to authorize your account.');
    }

    const authHeader = 'Basic ' + Buffer.from(`${settings.xero_client_id}:${settings.xero_client_secret}`).toString('base64');
    const tokenRes = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: settings.xero_refresh_token,
      }).toString(),
    });

    const tokenData = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok) {
      const errDetail = tokenData.error_description || tokenData.error || tokenRes.statusText;
      throw new Error(`Xero Refresh Error (${tokenRes.status}): ${errDetail}. Please reconnect to Xero.`);
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token || settings.xero_refresh_token;
    const expiresIn = Number(tokenData.expires_in) || 1800;
    const newExpiresAt = Date.now() + expiresIn * 1000;

    saveXeroSetting(db, 'xero_access_token', accessToken);
    saveXeroSetting(db, 'xero_refresh_token', refreshToken);
    saveXeroSetting(db, 'xero_token_expires_at', newExpiresAt);
    settings.xero_access_token = accessToken;
    settings.xero_refresh_token = refreshToken;
    settings.xero_token_expires_at = newExpiresAt;

    let tenantId = settings.xero_tenant_id;
    let tenantName = settings.xero_tenant_name || '';

    const connections = await getConnections(accessToken);
    if (connections && connections.length > 0) {
      tenantId = tenantId || connections[0].tenantId;
      tenantName = connections.find(c => c.tenantId === tenantId)?.tenantName || connections[0].tenantName || '';
      saveXeroSetting(db, 'xero_tenant_id', tenantId);
      saveXeroSetting(db, 'xero_tenant_name', tenantName);
      settings.xero_tenant_id = tenantId;
      settings.xero_tenant_name = tenantName;
    }

    if (!tenantId) {
      throw new Error('No accessible Xero Organisation/Tenant found for this account.');
    }

    return {
      accessToken,
      tenantId,
      tenantName,
      settings,
    };
  } else {
    // Manual mode
    if (!settings.xero_access_token) {
      throw new Error('Xero Access Token is not set in Settings.');
    }
    if (!settings.xero_tenant_id) {
      throw new Error('Xero Tenant ID is not set in Settings.');
    }

    return {
      accessToken: settings.xero_access_token,
      tenantId: settings.xero_tenant_id,
      tenantName: settings.xero_tenant_name || '',
      settings,
    };
  }
}

/**
 * Retrieves the list of authorized tenants from Xero.
 */
export async function getConnections(accessToken: string): Promise<Array<{
  id: string;
  tenantId: string;
  tenantType: string;
  tenantName: string;
}>> {
  try {
    const res = await fetch('https://api.xero.com/connections', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error('[XERO] Error fetching connections:', e);
    return [];
  }
}

/**
 * Retrieves Organisation details from Xero Accounting API.
 */
export async function getOrganisationDetails(accessToken: string, tenantId: string): Promise<any> {
  const res = await fetch('https://api.xero.com/api.xro/2.0/Organisation', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Xero-Tenant-Id': tenantId,
      'Accept': 'application/json',
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.Message || data?.error || `HTTP ${res.status}`);
  }

  return data?.Organisations?.[0] || data;
}

/**
 * Uploads a binary PDF attachment directly to a Xero Invoice.
 */
export async function uploadInvoiceAttachmentToXero(
  accessToken: string,
  tenantId: string,
  xeroInvoiceId: string,
  filename: string,
  pdfBuffer: Buffer
): Promise<{ success: boolean; attachmentId?: string; error?: string }> {
  try {
    const cleanFilename = encodeURIComponent(filename.replace(/[<>:"/\\|?*]/g, '_'));
    const url = `https://api.xero.com/api.xro/2.0/Invoices/${xeroInvoiceId}/Attachments/${cleanFilename}?IncludeOnline=true`;

    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Xero-Tenant-Id': tenantId,
        'Content-Type': 'application/pdf',
      },
      body: pdfBuffer,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.Message || data?.error || `HTTP ${res.status}`;
      console.warn(`[XERO] Attachment upload failed: ${msg}`);
      return { success: false, error: msg };
    }

    const attachmentId = data?.Attachments?.[0]?.AttachmentID;
    return { success: true, attachmentId };
  } catch (e: any) {
    console.error('[XERO] Exception uploading attachment:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Synchronizes an existing invoice record to Xero.
 */
export async function syncInvoiceToXero(
  db: any,
  invoiceId: number,
  options?: {
    force?: boolean;
    source?: 'trilogy' | 'email' | 'manual';
    getInvoiceDataHelpers?: {
      getShiftData?: (id: number) => any;
      getMergedData?: (row: any) => any;
      getRespiteData?: (id: number) => any;
      buildPdf?: (doc: any, data: any) => void;
    };
    pdfBuffer?: Buffer;
    filename?: string;
  }
): Promise<{
  success: boolean;
  skipped?: boolean;
  reason?: string;
  xeroInvoiceId?: string;
  invoiceNumber?: string;
  xeroAmountDue?: number;
  xeroDateString?: string;
  rateLimited?: boolean;
  tenantName?: string;
  attachmentUploaded?: boolean;
  error?: string;
}> {
  const settings = getXeroSettings(db);

  // If not forced, check enablement and trigger flags
  if (!options?.force) {
    if (!settings.xero_enabled) {
      return { success: true, skipped: true, reason: 'Xero integration is disabled in Settings.' };
    }
    if (options?.source === 'trilogy' && !settings.xero_sync_on_trilogy) {
      return { success: true, skipped: true, reason: 'Sync on Trilogy Care submission is turned off.' };
    }
    if (options?.source === 'email' && !settings.xero_sync_on_email) {
      return { success: true, skipped: true, reason: 'Sync on Email invoice is turned off.' };
    }
  }

  // 1. Fetch invoice row from DB
  const invoiceRow = db.prepare(`
    SELECT i.*, 
           s.start_time as shift_start_time,
           c.first_name, c.last_name, c.funding_type as client_funding_type,
           c.ndis_number, c.my_aged_care_id,
           p.company_name as provider_company_name,
           p.contact_name as provider_contact_name,
           p.email as provider_email,
           p.submission_method
    FROM invoices i
    JOIN clients c ON i.client_id = c.id
    LEFT JOIN providers p ON c.provider_id = p.id
    LEFT JOIN shifts s ON i.shift_id = s.id
    WHERE i.id = ?
  `).get(invoiceId) as any;

  if (!invoiceRow) {
    throw new Error(`Invoice #${invoiceId} not found.`);
  }

  // 2. Obtain valid token and tenant
  const { accessToken, tenantId, tenantName } = await getValidAccessToken(db, settings);

  const clientName = `${invoiceRow.first_name || ''} ${invoiceRow.last_name || ''}`.trim() || 'Client';
  let invoiceNumber = (invoiceRow.invoice_number || '').trim();
  if (!invoiceNumber) {
    const d = new Date(invoiceRow.shift_start_time || invoiceRow.created_at || Date.now());
    const yyyymmdd = !isNaN(d.getTime())
      ? `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
      : new Date().toISOString().slice(0, 10).replace(/-/g, '');
    invoiceNumber = `INV-${yyyymmdd}-${String(invoiceRow.shift_id || invoiceRow.id).padStart(4, '0')}`;
  }

  // 3. Resolve line items and amounts
  let lineItems: any[] = [];
  let isGstApplicable = false;
  let pdfBuffer: Buffer | null = options?.pdfBuffer || null;
  let filename: string = options?.filename || `${invoiceNumber}.pdf`;

  const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

  // Attempt to load existing PDF if not provided
  if (!pdfBuffer) {
    if (invoiceRow.file_path) {
      const clientNameSafe = clientName.replace(/[\\/\\]/g, '');
      const candidatePaths = [
        path.join(process.cwd(), 'invoices', invoiceRow.file_path),
        path.join(process.cwd(), 'invoices', `${invoiceId}.pdf`),
        path.join(UPLOADS_DIR, 'Clients', clientNameSafe, 'Invoices', invoiceRow.file_path),
      ];
      for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
          pdfBuffer = fs.readFileSync(p);
          filename = path.basename(invoiceRow.file_path);
          break;
        }
      }
    }
  }

  // If we have helper callbacks, gather structured data
  if (options?.getInvoiceDataHelpers) {
    const { getShiftData, getMergedData, getRespiteData, buildPdf } = options.getInvoiceDataHelpers;
    let data: any = null;

    try {
      if (invoiceRow.services_json && getMergedData) {
        data = getMergedData(invoiceRow);
      } else if (invoiceRow.respite_booking_id && getRespiteData) {
        data = getRespiteData(invoiceRow.respite_booking_id);
      } else if (invoiceRow.shift_id && getShiftData) {
        data = getShiftData(invoiceRow.shift_id);
      }
    } catch (helperErr) {
      console.warn('[XERO] Helper data resolution warning:', helperErr);
    }

    if (data) {
      if (Array.isArray(data.lineItems) && data.lineItems.length > 0) {
        lineItems = data.lineItems;
      }
      if (data.gstAmount && Number(data.gstAmount) > 0) {
        isGstApplicable = true;
      }
      if (data.invoiceNum) {
        if (!invoiceRow.invoice_number) {
          invoiceNumber = data.invoiceNum;
        }
        filename = `${data.invoiceNum}.pdf`;
      }

      // Generate PDF buffer if still missing and builder is available
      if (!pdfBuffer && buildPdf) {
        pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
          const doc = new PDFDocument({ margin: 50 });
          const chunks: any[] = [];
          doc.on('data', chunk => chunks.push(chunk));
          doc.on('end', () => resolve(Buffer.concat(chunks)));
          doc.on('error', reject);
          buildPdf(doc, data);
          doc.end();
        });
      }
    }
  }

  // Fallback: If line items could not be parsed, construct a clean single line item
  if (lineItems.length === 0) {
    const rawDateSource = invoiceRow.shift_start_time || invoiceRow.created_at;
    const lineDateStr = rawDateSource ? new Date(rawDateSource).toISOString().split('T')[0] : '';
    lineItems.push({
      serviceName: `Support Services - ${clientName}`,
      date: lineDateStr,
      qty: 1,
      rate: Number(invoiceRow.amount || 0),
      amount: Number(invoiceRow.amount || 0),
    });
  }

  // 4. Resolve Contact in Xero
  // For Trilogy Care (Home Care), contact is Trilogy Care with reference to Client
  // For NDIS / Plan Managers, contact is the Plan Manager / Provider Company or Client
  let contactName = '';
  let contactEmail = '';

  const isTrilogy = invoiceRow.submission_method === 'trilogy_form' || options?.source === 'trilogy';
  if (isTrilogy) {
    contactName = 'Trilogy Care';
    contactEmail = 'invoices@trilogycare.com.au';
  } else if (invoiceRow.provider_company_name) {
    contactName = invoiceRow.provider_company_name;
    contactEmail = invoiceRow.provider_email || '';
  } else {
    contactName = clientName;
  }

  // 5. Build Xero line items
  const xeroLineItems = lineItems.map((item: any) => {
    const descParts = [item.serviceName || 'Support Service'];
    if (item.date) descParts.push(`(${item.date}${item.time ? ' ' + item.time : ''})`);
    if (item.metadata) descParts.push(`- ${item.metadata}`);
    if (item.code) descParts.push(`[${item.code}]`);

    const qty = Number(item.qty || 1);
    const unitAmount = Number(item.rate !== undefined ? item.rate : (item.amount ? item.amount / qty : invoiceRow.amount));

    // Resolve GST status per individual line item, falling back to invoice-wide isGstApplicable
    let itemHasGst = isGstApplicable;
    if (item.hasGst !== undefined && item.hasGst !== null) {
      itemHasGst = Boolean(item.hasGst);
    } else if (item.gstType !== undefined && item.gstType !== null && item.gstType !== '') {
      itemHasGst = item.gstType === '10%' || item.gstType === '10' || item.gstType === 'GST 10%';
    } else if (item.gst !== undefined && item.gst !== null) {
      itemHasGst = Number(item.gst) > 0;
    }

    const taxType = itemHasGst
      ? (settings.xero_tax_type_gst || 'OUTPUT')
      : (settings.xero_tax_type_free || 'BASEXCLUDED');

    return {
      Description: descParts.join(' ').trim(),
      Quantity: qty,
      UnitAmount: parseFloat(unitAmount.toFixed(2)),
      AccountCode: settings.xero_account_code || '200',
      TaxType: taxType,
    };
  });

  // Calculate Dates (use original shift/invoice date when syncing historical SENT/PAID invoices)
  let baseInvoiceDate = new Date();
  if (invoiceRow.status === 'SENT' || invoiceRow.status === 'PAID') {
    const histDate = new Date(invoiceRow.shift_start_time || invoiceRow.created_at || Date.now());
    if (!isNaN(histDate.getTime())) {
      baseInvoiceDate = histDate;
    }
  }
  const dateStr = baseInvoiceDate.toISOString().split('T')[0];
  const dueDate = new Date(baseInvoiceDate.getTime());
  dueDate.setDate(dueDate.getDate() + 14);
  const dueDateStr = dueDate.toISOString().split('T')[0];

  const xeroInvoicePayload = {
    Invoices: [
      {
        Type: 'ACCREC',
        Contact: {
          Name: contactName,
          EmailAddress: contactEmail || undefined,
        },
        Date: dateStr,
        DueDate: dueDateStr,
        InvoiceNumber: invoiceNumber,
        Reference: `${clientName} - ${invoiceNumber}`,
        Status: (invoiceRow.status === 'SENT' || invoiceRow.status === 'PAID') ? 'AUTHORISED' : (settings.xero_invoice_status || 'AUTHORISED'),
        LineAmountTypes: 'Exclusive',
        LineItems: xeroLineItems,
      },
    ],
  };

  // 6. Post Invoice to Xero
  const createRes = await fetch('https://api.xero.com/api.xro/2.0/Invoices', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Xero-Tenant-Id': tenantId,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(xeroInvoicePayload),
  });

  const rawCreateText = await createRes.text().catch(() => '');
  let createData: any = {};
  try {
    createData = rawCreateText ? JSON.parse(rawCreateText) : {};
  } catch {}

  if (!createRes.ok) {
    if (createRes.status === 429) {
      const retryAfter = createRes.headers.get('Retry-After') || '60';
      console.warn(`[XERO] Rate limit (HTTP 429) reached creating invoice ${invoiceNumber} (Retry-After: ${retryAfter}s)`);
      throw new Error(`XERO_RATE_LIMIT: Xero API rate limit (60 calls/min) reached. Wait ${retryAfter}s and retry.`);
    }
    const errorMsg = createData?.Elements?.[0]?.ValidationErrors?.[0]?.Message ||
                     createData?.Message ||
                     createData?.Detail ||
                     createData?.error ||
                     `HTTP ${createRes.status}`;
    console.error(`[XERO] Error creating invoice ${invoiceNumber} in Xero (HTTP ${createRes.status}):`, rawCreateText || createData);
    throw new Error(`Xero Invoicing Error: ${errorMsg}`);
  }

  const createdInvoice = createData?.Invoices?.[0];
  const xeroInvoiceId = createdInvoice?.InvoiceID;

  if (!xeroInvoiceId) {
    throw new Error('Xero did not return an InvoiceID.');
  }

  // 7. Upload PDF Attachment if enabled and available
  let attachmentUploaded = false;
  if (settings.xero_attach_pdf && pdfBuffer && pdfBuffer.length > 0) {
    const attachRes = await uploadInvoiceAttachmentToXero(
      accessToken,
      tenantId,
      xeroInvoiceId,
      filename,
      pdfBuffer
    );
    attachmentUploaded = attachRes.success;
  }

  // 8. Update database record
  try {
    db.prepare(`
      UPDATE invoices 
      SET xero_invoice_id = ?, 
          xero_status = 'SYNCED', 
          xero_synced_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(xeroInvoiceId, invoiceId);
  } catch (dbErr: any) {
    console.warn('[XERO] Warning updating invoice database record:', dbErr.message);
  }

  return {
    success: true,
    xeroInvoiceId,
    invoiceNumber,
    xeroAmountDue: Number(createdInvoice?.AmountDue ?? createdInvoice?.Total ?? 0),
    xeroDateString: createdInvoice?.DateString ? String(createdInvoice.DateString).split('T')[0] : dateStr,
    tenantName,
    attachmentUploaded,
  };
}

/**
 * Creates and sends a diagnostic test invoice to Xero with a test PDF attachment.
 */
export async function sendTestInvoiceToXero(
  db: any,
  options?: {
    customAmount?: number;
    accountCode?: string;
    invoiceStatus?: 'AUTHORISED' | 'DRAFT';
  }
): Promise<{
  success: boolean;
  steps: Array<{ step: string; status: 'ok' | 'failed' | 'info'; detail?: string }>;
  xeroInvoiceId?: string;
  invoiceNumber?: string;
  xeroUrl?: string;
  tenantName?: string;
  totalAmount?: number;
  error?: string;
}> {
  const steps: Array<{ step: string; status: 'ok' | 'failed' | 'info'; detail?: string }> = [];

  try {
    const settings = getXeroSettings(db);

    steps.push({
      step: '1. Checking Configuration',
      status: 'ok',
      detail: `Auth Type: ${settings.xero_auth_type}, Client ID: ${settings.xero_client_id ? 'Configured' : 'Missing'}`,
    });

    if (!settings.xero_client_id) {
      throw new Error('Xero Client ID is not configured.');
    }

    steps.push({
      step: '2. Authenticating & Resolving Token',
      status: 'info',
      detail: 'Connecting to Xero Identity API...',
    });

    const { accessToken, tenantId, tenantName } = await getValidAccessToken(db, settings);

    steps.push({
      step: '2. Authenticating & Resolving Token',
      status: 'ok',
      detail: `Authenticated successfully. Organisation: "${tenantName}" (Tenant ID: ${tenantId.slice(0, 8)}...)`,
    });

    // Generate unique test invoice number
    const testInvNum = `TEST-XERO-${Date.now().toString().slice(-6)}`;
    const testAmount = options?.customAmount !== undefined ? options.customAmount : 10.00;
    const testStatus = options?.invoiceStatus || settings.xero_invoice_status || 'DRAFT';

    const testPayload = {
      Invoices: [
        {
          Type: 'ACCREC',
          Contact: {
            Name: 'Happy in the Home - Diagnostic Test Contact',
            EmailAddress: 'admin@happyinthehome.org',
          },
          Date: new Date().toISOString().split('T')[0],
          DueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
          InvoiceNumber: testInvNum,
          Reference: 'Diagnostic Test Connection',
          Status: testStatus,
          LineAmountTypes: 'Exclusive',
          LineItems: [
            {
              Description: 'Integration Diagnostic Test Line - NDIS/Home Care Portal Verification',
              Quantity: 1,
              UnitAmount: testAmount,
              AccountCode: options?.accountCode || settings.xero_account_code || '200',
              TaxType: settings.xero_tax_type_free || 'BASEXCLUDED',
            },
          ],
        },
      ],
    };

    steps.push({
      step: '3. Creating Test Invoice in Xero',
      status: 'info',
      detail: `Dispatching POST /Invoices (Number: ${testInvNum}, Amount: $${testAmount.toFixed(2)}, Status: ${testStatus})...`,
    });

    const createRes = await fetch('https://api.xero.com/api.xro/2.0/Invoices', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Xero-Tenant-Id': tenantId,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(testPayload),
    });

    const createData = await createRes.json().catch(() => ({}));
    if (!createRes.ok) {
      const err = createData?.Elements?.[0]?.ValidationErrors?.[0]?.Message || createData?.Message || `HTTP ${createRes.status}`;
      throw new Error(`Failed to create test invoice: ${err}`);
    }

    const createdInvoice = createData?.Invoices?.[0];
    const xeroInvoiceId = createdInvoice?.InvoiceID;

    steps.push({
      step: '3. Creating Test Invoice in Xero',
      status: 'ok',
      detail: `Invoice created successfully. Xero Invoice ID: ${xeroInvoiceId}`,
    });

    // 4. Generate sample PDF attachment
    steps.push({
      step: '4. Generating & Uploading Test PDF Attachment',
      status: 'info',
      detail: 'Creating in-memory test PDF attachment...',
    });

    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: any[] = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).text('Happy in the Home - Xero Diagnostic PDF', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`);
      doc.text(`Test Invoice Number: ${testInvNum}`);
      doc.text(`Xero Invoice ID: ${xeroInvoiceId}`);
      doc.text(`Organisation: ${tenantName}`);
      doc.moveDown();
      doc.text('This is a verified test PDF attachment uploaded automatically by the Happy in the Home Portal Xero Integration.');
      doc.end();
    });

    const attachResult = await uploadInvoiceAttachmentToXero(
      accessToken,
      tenantId,
      xeroInvoiceId,
      `${testInvNum}.pdf`,
      pdfBuffer
    );

    if (attachResult.success) {
      steps.push({
        step: '4. Generating & Uploading Test PDF Attachment',
        status: 'ok',
        detail: `Attachment uploaded successfully. Attachment ID: ${attachResult.attachmentId || 'verified'}`,
      });
    } else {
      steps.push({
        step: '4. Generating & Uploading Test PDF Attachment',
        status: 'failed',
        detail: `Warning: PDF attachment failed (${attachResult.error}). Invoice was created.`,
      });
    }

    const xeroUrl = `https://go.xero.com/AccountsReceivable/View.aspx?InvoiceID=${xeroInvoiceId}`;

    steps.push({
      step: '5. Verification Complete',
      status: 'ok',
      detail: `Xero API is operational. Direct Link: ${xeroUrl}`,
    });

    return {
      success: true,
      steps,
      xeroInvoiceId,
      invoiceNumber: testInvNum,
      xeroUrl,
      tenantName,
      totalAmount: testAmount,
    };
  } catch (e: any) {
    steps.push({
      step: 'Failed',
      status: 'failed',
      detail: e.message || 'Unknown error occurred during test.',
    });

    return {
      success: false,
      steps,
      error: e.message,
    };
  }
}

/**
 * Classifies a Xero earnings rate into a portal category:
 * 'Ordinary' | 'Penalty' | 'Overtime' | 'Allowance'
 */
export function classifyXeroEarningsRate(rate: { Name?: string; EarningsType?: string }): 'Ordinary' | 'Penalty' | 'Overtime' | 'Allowance' {
  const type = (rate.EarningsType || '').toUpperCase();
  const name = (rate.Name || '').toLowerCase();

  if (
    type.includes('ALLOWANCE') ||
    name.includes('allowance') ||
    name.includes('sleepover') ||
    name.includes('travel') ||
    name.includes('mileage') ||
    name.includes('transport') ||
    name.includes('meal') ||
    name.includes('kms') ||
    name.includes('km')
  ) {
    return 'Allowance';
  }
  if (
    type.includes('OVERTIME') ||
    name.includes('overtime') ||
    name.includes('o/t') ||
    name.includes('1.5x') ||
    name.includes('2.0x') ||
    name.includes('2x') ||
    name.includes('double time') ||
    name.includes('time and a half')
  ) {
    return 'Overtime';
  }
  if (
    type.includes('PENALTY') ||
    name.includes('penalty') ||
    name.includes('saturday') ||
    name.includes('sunday') ||
    name.includes('public holiday') ||
    name.includes('night') ||
    name.includes('evening') ||
    name.includes('weekend') ||
    name.includes('afternoon')
  ) {
    return 'Penalty';
  }
  if (
    type.includes('ORDINARY') ||
    name.includes('ordinary') ||
    name.includes('weekday') ||
    name.includes('standard') ||
    name.includes('base')
  ) {
    return 'Ordinary';
  }
  return 'Ordinary';
}

export interface XeroPayItemRecord {
  id: string;
  name: string;
  earningsType: string;
  rateType: string;
  typeOfUnits: string;
  ratePerUnit: number;
  multiplier: number;
  accrueLeave: boolean;
  isExemptFromTax: boolean;
  isExemptFromSuper: boolean;
  currentRecord: boolean;
  accountCode?: string;
  suggestedCategory: 'Ordinary' | 'Penalty' | 'Overtime' | 'Allowance';
}

export function isXeroRecordActive(r: any): boolean {
  if (!r) return false;
  // 1. Explicit booleans
  if (r.CurrentRecord === false || r.currentRecord === false) return false;
  if (r.IsActive === false || r.isActive === false) return false;

  // 2. String representations of false / inactive
  const cr = String(r.CurrentRecord ?? r.currentRecord ?? '').trim().toLowerCase();
  if (cr === 'false' || cr === '0' || cr === 'no') return false;

  const ia = String(r.IsActive ?? r.isActive ?? '').trim().toLowerCase();
  if (ia === 'false' || ia === '0' || ia === 'no') return false;

  const status = String(r.Status || r.status || '').trim().toUpperCase();
  if (status === 'INACTIVE' || status === 'ARCHIVED' || status === 'DELETED') return false;

  // 3. In Xero AU Payroll, when CurrentRecord is provided, it is true for active records
  if (r.CurrentRecord !== undefined || r.currentRecord !== undefined) {
    if (cr !== 'true' && cr !== '1' && cr !== '') return false;
  }

  return true;
}

/**
 * Fetches pay items directly from Xero Payroll API.
 */
export async function getXeroPayItems(db: any): Promise<{
  success: boolean;
  tenantName: string;
  tenantId: string;
  earningsRates: XeroPayItemRecord[];
  allowances?: any[];
  deductions?: any[];
  leaveTypes?: any[];
  reimbursements?: any[];
  error?: string;
  needsReconnect?: boolean;
}> {
  try {
    let auth = await getValidAccessToken(db);

    if (!auth.accessToken) {
      throw new Error('No valid Xero access token available. Please connect Xero in Settings.');
    }

    const buildHeaders = (token: string, tId: string) => {
      const h: Record<string, string> = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      };
      if (tId) {
        h['Xero-Tenant-Id'] = tId;
      }
      return h;
    };

    let headers = buildHeaders(auth.accessToken, auth.tenantId);

    // Try AU Payroll PayItems endpoint first (1.0)
    let res = await fetch('https://api.xero.com/payroll.xro/1.0/PayItems', {
      headers
    });

    // If 404, try 2.0 (NZ/UK)
    if (res.status === 404) {
      res = await fetch('https://api.xero.com/payroll.xro/2.0/PayItems', {
        headers
      });
    }

    // If 401 or 403, cached token might not have payroll.settings scope. Force refresh token and retry once!
    if (res.status === 401 || res.status === 403) {
      try {
        saveXeroSetting(db, 'xero_access_token', '');
        saveXeroSetting(db, 'xero_token_expires_at', 0);
        const forcedSettings = getXeroSettings(db);
        forcedSettings.xero_access_token = '';
        forcedSettings.xero_token_expires_at = 0;
        auth = await getValidAccessToken(db, forcedSettings);
        headers = buildHeaders(auth.accessToken, auth.tenantId);

        res = await fetch('https://api.xero.com/payroll.xro/1.0/PayItems', { headers });
        if (res.status === 404) {
          res = await fetch('https://api.xero.com/payroll.xro/2.0/PayItems', { headers });
        }
      } catch (retryErr) {
        console.warn('[XERO] Retry with fresh token error:', retryErr);
      }
    }

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const errMsg = errBody.Detail || errBody.Message || errBody.error || res.statusText;
      if (res.status === 401 || res.status === 403 || String(errMsg).toLowerCase().includes('scope') || String(errMsg).toLowerCase().includes('unauthorized')) {
        return {
          success: false,
          tenantName: auth.tenantName || 'Xero Organisation',
          tenantId: auth.tenantId || '',
          earningsRates: [],
          needsReconnect: true,
          error: "Xero Payroll permission (payroll.settings or payroll.settings.read) is required. In your Xero Developer Portal (developer.xero.com > Configuration > Scopes), check 'payroll.settings' or 'payroll.settings.read', click Save, and then click Sync from Xero again."
        };
      }
      throw new Error(`Xero Payroll API error (${res.status}): ${errMsg}`);
    }

    const data = await res.json();
    const rawPayItems = data.PayItems || data.payItems || data;
    const rawRates: any[] = (rawPayItems.EarningsRates || rawPayItems.earningsRates || [])
      .filter(isXeroRecordActive);

    const earningsRates: XeroPayItemRecord[] = rawRates.map((r: any) => {
      const rawRateType = String(r.RateType || r.rateType || '').trim();
      const rawMult = r.Multiplier !== undefined && r.Multiplier !== null ? Number(r.Multiplier) : (r.multiplier !== undefined && r.multiplier !== null ? Number(r.multiplier) : 0);
      const isMultiple = rawRateType.toUpperCase().includes('MULTIPLE') || 
                         rawRateType.toLowerCase().includes('multiple of employees ordinary earnings rate') ||
                         rawMult > 0;
      const mult = isMultiple ? (rawMult > 0 ? rawMult : 1.0) : 0;
      const displayRateType = isMultiple ? 'Multiple of Employees Ordinary Earnings Rate' : (rawRateType.toUpperCase() === 'RATEPERUNIT' ? 'Rate per Unit' : (rawRateType || 'Rate per Unit'));

      return {
        id: r.EarningsRateID || r.earningsRateID || r.Id || r.id || '',
        name: r.Name || r.name || 'Unnamed Rate',
        earningsType: r.EarningsType || r.earningsType || '',
        rateType: displayRateType,
        typeOfUnits: r.TypeOfUnits || r.typeOfUnits || 'Hours',
        ratePerUnit: Number(r.RatePerUnit || r.ratePerUnit || 0),
        multiplier: mult,
        accrueLeave: !!(r.AccrueLeave ?? r.accrueLeave),
        isExemptFromTax: !!(r.IsExemptFromTax ?? r.isExemptFromTax),
        isExemptFromSuper: !!(r.IsExemptFromSuper ?? r.isExemptFromSuper),
        currentRecord: true,
        accountCode: r.AccountCode || r.accountCode || '',
        suggestedCategory: classifyXeroEarningsRate(r)
      };
    });

    return {
      success: true,
      tenantName: auth.tenantName || 'Xero Organisation',
      tenantId: auth.tenantId || '',
      earningsRates,
      allowances: (rawPayItems.AllowanceRates || rawPayItems.allowanceRates || []).filter(isXeroRecordActive),
      deductions: (rawPayItems.DeductionTypes || rawPayItems.deductionTypes || []).filter(isXeroRecordActive),
      leaveTypes: (rawPayItems.LeaveTypes || rawPayItems.leaveTypes || []).filter(isXeroRecordActive),
      reimbursements: (rawPayItems.ReimbursementTypes || rawPayItems.reimbursementTypes || []).filter(isXeroRecordActive)
    };
  } catch (e: any) {
    return {
      success: false,
      tenantName: '',
      tenantId: '',
      earningsRates: [],
      error: e.message || 'Failed to fetch pay items from Xero'
    };
  }
}

export interface XeroEmployeeRecord {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  status: string;
  email?: string;
  ordinaryEarningsRateID?: string;
}

/**
 * Fetches employees directly from Xero Payroll API.
 */
export async function getXeroEmployees(db: any): Promise<{
  success: boolean;
  tenantName: string;
  tenantId: string;
  employees: XeroEmployeeRecord[];
  error?: string;
  needsReconnect?: boolean;
}> {
  try {
    let auth = await getValidAccessToken(db);

    if (!auth.accessToken) {
      throw new Error('No valid Xero access token available. Please connect Xero in Settings.');
    }

    const buildHeaders = (token: string, tId: string) => {
      const h: Record<string, string> = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      };
      if (tId) {
        h['Xero-Tenant-Id'] = tId;
      }
      return h;
    };

    let headers = buildHeaders(auth.accessToken, auth.tenantId);

    // Try AU Payroll Employees endpoint first (1.0)
    let res = await fetch('https://api.xero.com/payroll.xro/1.0/Employees', {
      headers
    });

    if (res.status === 404) {
      res = await fetch('https://api.xero.com/payroll.xro/2.0/Employees', {
        headers
      });
    }

    if (res.status === 401 || res.status === 403) {
      try {
        saveXeroSetting(db, 'xero_access_token', '');
        saveXeroSetting(db, 'xero_token_expires_at', 0);
        const forcedSettings = getXeroSettings(db);
        forcedSettings.xero_access_token = '';
        forcedSettings.xero_token_expires_at = 0;
        auth = await getValidAccessToken(db, forcedSettings);
        headers = buildHeaders(auth.accessToken, auth.tenantId);

        res = await fetch('https://api.xero.com/payroll.xro/1.0/Employees', { headers });
        if (res.status === 404) {
          res = await fetch('https://api.xero.com/payroll.xro/2.0/Employees', { headers });
        }
      } catch (retryErr) {
        console.warn('[XERO] Retry with fresh token error for employees:', retryErr);
      }
    }

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const errMsg = errBody.Detail || errBody.Message || errBody.error || res.statusText;
      if (res.status === 401 || res.status === 403 || String(errMsg).toLowerCase().includes('scope') || String(errMsg).toLowerCase().includes('unauthorized')) {
        return {
          success: false,
          tenantName: auth.tenantName || 'Xero Organisation',
          tenantId: auth.tenantId || '',
          employees: [],
          needsReconnect: true,
          error: "Xero Payroll permission (payroll.employees or payroll.employees.read) is required to view and link employees."
        };
      }
      throw new Error(`Xero Payroll API error (${res.status}): ${errMsg}`);
    }

    const data = await res.json();
    const rawList: any[] = data.Employees || data.employees || [];

    const employees: XeroEmployeeRecord[] = rawList.map((emp: any) => {
      const firstName = emp.FirstName || emp.firstName || '';
      const lastName = emp.LastName || emp.lastName || '';
      const name = `${firstName} ${lastName}`.trim() || emp.Name || 'Unknown Employee';
      return {
        id: emp.EmployeeID || emp.employeeID || emp.Id || emp.id || '',
        firstName,
        lastName,
        name,
        status: (emp.Status || emp.status || 'ACTIVE').toUpperCase(),
        email: emp.Email || emp.email || '',
        ordinaryEarningsRateID: emp.OrdinaryEarningsRateID || emp.ordinaryEarningsRateID || ''
      };
    });

    return {
      success: true,
      tenantName: auth.tenantName || 'Xero Organisation',
      tenantId: auth.tenantId || '',
      employees
    };
  } catch (e: any) {
    return {
      success: false,
      tenantName: '',
      tenantId: '',
      employees: [],
      error: e.message || 'Failed to fetch employees from Xero'
    };
  }
}

export interface XeroPayrollCalendar {
  id: string;
  name: string;
  calendarType: string;
  startDate?: string;
  paymentDate?: string;
}

export interface StaffPayRunBreakdown {
  staffId: number;
  portalName: string;
  email: string;
  xeroEmployeeId: string;
  xeroEmployeeName: string;
  isLinked: boolean;
  payCategoryId?: number | null;
  payCategoryName?: string;
  payRateWeekdayId: string;
  payRateWeekdayName: string;
  payRateSaturdayId: string;
  payRateSaturdayName: string;
  payRateSundayId: string;
  payRateSundayName: string;
  payRatePublicHolidayId: string;
  payRatePublicHolidayName: string;
  payRateNdisTravelId: string;
  payRateNdisTravelName: string;
  payRateHomeCareTravelId: string;
  payRateHomeCareTravelName: string;
  weekdayHours: number;
  saturdayHours: number;
  sundayHours: number;
  publicHolidayHours: number;
  totalHours: number;
  ndisTravelKm: number;
  ndisTravelPay: number;
  homeCareTravelKm: number;
  homeCareTravelHours: number;
  homeCareTravelPay: number;
  isReady: boolean;
  warnings: string[];
}

/**
 * Fetches payroll calendars configured in Xero AU Payroll (e.g. Fortnightly).
 */
export async function getXeroPayrollCalendars(db: any): Promise<{
  success: boolean;
  calendars: XeroPayrollCalendar[];
  needsReconnect?: boolean;
  error?: string;
}> {
  try {
    const auth = await getValidAccessToken(db);
    if (!auth.accessToken) {
      throw new Error('No valid Xero access token available. Please connect Xero in Settings.');
    }
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${auth.accessToken}`,
      'Accept': 'application/json',
    };
    if (auth.tenantId) {
      headers['Xero-Tenant-Id'] = auth.tenantId;
    }

    let res = await fetch('https://api.xero.com/payroll.xro/1.0/PayrollCalendars', { headers });
    if (res.status === 404) {
      res = await fetch('https://api.xero.com/payroll.xro/2.0/PayrollCalendars', { headers });
    }

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const errMsg = errBody.Detail || errBody.Message || errBody.error || res.statusText;
      if (res.status === 401 || res.status === 403 || String(errMsg).toLowerCase().includes('unauthorized') || String(errMsg).toLowerCase().includes('scope') || String(errMsg).toLowerCase().includes('authorizationunsuccessful')) {
        return {
          success: false,
          calendars: [],
          needsReconnect: true,
          error: `Xero Payroll authorization error (${res.status}): ${errMsg}. Please re-authorize Xero in Settings to grant payroll permissions.`
        };
      }
      throw new Error(`Xero Payroll Calendars API error (${res.status}): ${errMsg}`);
    }

    const data = await res.json();
    const rawList = data.PayrollCalendars || data.payrollCalendars || [];
    const calendars: XeroPayrollCalendar[] = rawList.map((c: any) => ({
      id: c.PayrollCalendarID || c.payrollCalendarID || c.Id || c.id || '',
      name: c.Name || c.name || 'Payroll Calendar',
      calendarType: (c.CalendarType || c.calendarType || 'FORTNIGHTLY').toUpperCase(),
      startDate: c.StartDate || c.startDate || '',
      paymentDate: c.PaymentDate || c.paymentDate || ''
    }));

    return {
      success: true,
      calendars
    };
  } catch (e: any) {
    const isAuthErr = String(e.message).includes('401') || String(e.message).toLowerCase().includes('authorizationunsuccessful') || String(e.message).toLowerCase().includes('unauthorized') || String(e.message).toLowerCase().includes('scope');
    return {
      success: false,
      calendars: [],
      needsReconnect: isAuthErr,
      error: e.message || 'Failed to fetch Xero payroll calendars'
    };
  }
}

/**
 * Aggregates all completed shifts and travel for the fortnight and prepares the pay run breakdown per staff.
 */
export function previewXeroPayRun(db: any, params: {
  startDate: string;
  endDate: string;
  staffId?: string;
}): {
  success: boolean;
  startDate: string;
  endDate: string;
  staff: StaffPayRunBreakdown[];
  totals: {
    weekdayHours: number;
    saturdayHours: number;
    sundayHours: number;
    publicHolidayHours: number;
    totalHours: number;
    ndisTravelKm: number;
    ndisTravelPay: number;
    homeCareTravelKm: number;
    homeCareTravelHours: number;
    homeCareTravelPay: number;
  };
} {
  const settingsRows = db.prepare("SELECT key, value FROM settings").all() as any[];
  const settingsMap: Record<string, any> = {};
  for (const row of settingsRows) {
    try { settingsMap[row.key] = JSON.parse(row.value); } catch { settingsMap[row.key] = row.value; }
  }

  const rawTz = settingsMap.timezone || "Australia/Perth";
  const timezone = typeof rawTz === "string" ? rawTz.replace(/['"]+/g, "") : rawTz;
  const state = settingsMap.state || "WA";
  const hd = new Holidays("AU", state);

  const startUtc = fromZonedTime(`${params.startDate}T00:00:00`, timezone).toISOString();
  const dateObj = new Date(params.endDate);
  dateObj.setUTCDate(dateObj.getUTCDate() + 1);
  const endNextDay = dateObj.toISOString().split('T')[0];
  const endUtc = fromZonedTime(`${endNextDay}T00:00:00`, timezone).toISOString();

  let query = `
    SELECT s.*,
           u.id as staff_user_id, u.first_name as staff_first_name, u.last_name as staff_last_name, u.email as staff_email,
           u.xero_employee_id, u.xero_employee_name,
           u.pay_category_id, u.position_id, u.primary_position,
           u.pay_rate_weekday_id, u.pay_rate_saturday_id, u.pay_rate_sunday_id, u.pay_rate_public_holiday_id,
           u.pay_rate_ndis_travel_id, u.pay_rate_home_care_travel_id,
           srv.name as service_name
    FROM shifts s
    JOIN users u ON s.staff_id = u.id
    LEFT JOIN services srv ON s.service_id = srv.id
    WHERE (s.status = 'COMPLETED' OR (s.status = 'CANCELLED' AND COALESCE(s.cancelled_pay_hours, 0) > 0))
      AND s.staff_id IS NOT NULL
      AND (s.custom_staff_name IS NULL OR s.custom_staff_name = '')
      AND s.start_time >= ?
      AND s.start_time < ?
  `;
  const qParams: any[] = [startUtc, endUtc];
  if (params.staffId) {
    query += " AND s.staff_id = ?";
    qParams.push(params.staffId);
  }
  query += " ORDER BY s.start_time ASC";

  const shifts = db.prepare(query).all(...qParams) as any[];

  // Load active pay items mapping
  const allPayItems = db.prepare("SELECT xero_earnings_rate_id, name FROM pay_items WHERE is_active = 1").all() as any[];
  const payItemMap = new Map<string, string>();
  for (const pi of allPayItems) {
    if (pi.xero_earnings_rate_id) payItemMap.set(pi.xero_earnings_rate_id, pi.name);
  }

  // Load Award Pay Category rules
  const allCatRules = db.prepare("SELECT category_id, rule_key, xero_earnings_rate_id, pay_item_name FROM pay_category_rules").all() as any[];
  const catRuleMap = new Map<number, Map<string, { id: string; name: string }>>();
  for (const cr of allCatRules) {
    if (!catRuleMap.has(cr.category_id)) catRuleMap.set(cr.category_id, new Map());
    catRuleMap.get(cr.category_id)!.set(cr.rule_key, { id: cr.xero_earnings_rate_id, name: cr.pay_item_name });
  }

  const staffMap = new Map<number, StaffPayRunBreakdown>();

  for (const shift of shifts) {
    const scheduledHrs = (new Date(shift.end_time).getTime() - new Date(shift.start_time).getTime()) / 3600000;
    const isCancelledPaid = shift.status === 'CANCELLED' && Number(shift.cancelled_pay_hours) > 0;
    const shiftHours = isCancelledPaid ? Math.max(0, Number(shift.cancelled_pay_hours)) : Math.max(0, scheduledHrs);

    const rosterT = new Date(shift.start_time);
    const ymd = formatInTimeZone(rosterT, timezone, 'yyyy-MM-dd');
    const weekdayStr = formatInTimeZone(rosterT, timezone, 'EEEE');
    const isPubHol = hd.isHoliday(new Date(ymd));

    let dayCategory = 'Weekday';
    if (isPubHol && isPubHol.some((h: any) => h.type === 'public')) {
      dayCategory = 'Public Holiday';
    } else if (weekdayStr === 'Saturday') {
      dayCategory = 'Saturday';
    } else if (weekdayStr === 'Sunday') {
      dayCategory = 'Sunday';
    }

    const isHomeCare = shift.funding_type === "HCP" || shift.funding_type === "Home Care" || shift.funding_type === "HOME_CARE";
    let parsedRouteLog: any = null;
    if (shift.transport_route_log) {
      try {
        parsedRouteLog = JSON.parse(shift.transport_route_log);
      } catch (e) {}
    }

    let calculatedMins = shift.provider_travel_minutes || 0;
    if (isHomeCare && calculatedMins === 0) {
      if (shift.travel_breakdown) {
        try {
          const breakdown = JSON.parse(shift.travel_breakdown);
          for (const b of breakdown) {
            const m = b.match(/\(([0-9.]+) mins\)/);
            if (m) calculatedMins += parseFloat(m[1]);
          }
        } catch(e) {}
      }
      if (calculatedMins === 0 && parsedRouteLog) {
        if (parsedRouteLog.homeCareTravel && parsedRouteLog.homeCareTravel.minutes !== undefined) {
          calculatedMins = parsedRouteLog.homeCareTravel.minutes;
        } else if (parsedRouteLog.homeCareTravel && parsedRouteLog.homeCareTravel.legs) {
          calculatedMins = parsedRouteLog.homeCareTravel.legs.reduce((sum: number, l: any) => sum + (l.durationMins || 0), 0);
        }
      }
    }

    let servicesArray: any[] = [];
    try { servicesArray = shift.services_json ? JSON.parse(shift.services_json) : []; } catch {}
    let hasProviderTravelService = false;
    let hasABTService = false;
    let providerTravelQtyOverride: number | null = null;
    for (const sData of servicesArray) {
      let sName = (sData.name || sData.customName || sData.serviceName || '').toLowerCase();
      if (!sName && sData.serviceId && !sData.isCustom && sData.serviceId !== 'custom' && !String(sData.serviceId).startsWith('custom')) {
        try {
          const srv = db.prepare("SELECT name FROM services WHERE id = ?").get(sData.serviceId) as any;
          if (srv && srv.name) {
            sName = srv.name.toLowerCase();
          }
        } catch (e) {}
      }
      const sCode = String(sData.serviceCode || '').toLowerCase();
      if (sName.includes('provider travel') || sName.includes('travel - provider') || sCode.includes('provider travel')) {
        hasProviderTravelService = true;
        if (providerTravelQtyOverride === null && sData.qtyOverride !== undefined && sData.qtyOverride !== '' && Number(sData.qtyOverride) > 0) {
          providerTravelQtyOverride = Number(sData.qtyOverride);
        }
      }
      if (sName.includes('activity based transport') || sName.includes('activity-based transport')) hasABTService = true;
    }

    let isCompanyVehicle = false;
    if (shift.vehicle_id) {
      const v = db.prepare('SELECT ownership FROM vehicles WHERE id = ?').get(shift.vehicle_id) as any;
      if (v && v.ownership === 'COMPANY') {
        isCompanyVehicle = true;
      }
    }

    const hcIntershiftKm = (shift.respite_booking_id || isCompanyVehicle) ? 0 : (Number(shift.provider_travel_km) || Number(shift.home_care_travel_km) || Number(parsedRouteLog?.homeCareTravel?.distance) || 0);
    const hcTransportKm = (shift.respite_booking_id || isCompanyVehicle || isCancelledPaid) ? 0 : (shift.abt_km || 0);
    const hcKm = hcIntershiftKm + hcTransportKm;
    const hcHrs = shift.respite_booking_id ? 0 : (calculatedMins / 60);
    const hcReimb = shift.respite_booking_id ? 0 : (shift.home_care_travel_total || 0);

    const effectiveProvKm = Number(shift.provider_travel_km) || providerTravelQtyOverride || Number(parsedRouteLog?.providerTravel?.distance) || 0;
    if (effectiveProvKm > 0 && (hasProviderTravelService || isCancelledPaid)) {
      hasProviderTravelService = true;
    }
    const provKm = isCompanyVehicle ? 0 : ((shift.respite_booking_id ? 0 : effectiveProvKm) * (hasProviderTravelService ? 1 : 0));
    const abtKm = isCompanyVehicle ? 0 : ((shift.respite_booking_id || isCancelledPaid ? 0 : shift.abt_km || 0) * (hasABTService ? 1 : 0));
    const ndisKm = provKm + abtKm;
    const ndisReimb = parseFloat((ndisKm * 0.99).toFixed(2));

    if (!staffMap.has(shift.staff_user_id)) {
      let effectivePayCatId: number | null = shift.pay_category_id ? Number(shift.pay_category_id) : null;
      let effectivePayCatName = '';

      // Fallback A: Match Xero employee ordinary rate to pay categories
      if (!effectivePayCatId && shift.xero_employee_id) {
        try {
          const xeroEmp = db.prepare("SELECT * FROM xero_employees WHERE id = ?").get(shift.xero_employee_id) as any;
          if (xeroEmp && xeroEmp.ordinary_earnings_rate_id) {
            const matchedCat = db.prepare("SELECT * FROM pay_categories WHERE is_active = 1 AND xero_earnings_rate_id = ?").get(xeroEmp.ordinary_earnings_rate_id) as any;
            if (matchedCat) {
              effectivePayCatId = matchedCat.id;
              effectivePayCatName = matchedCat.name;
              try { db.prepare("UPDATE users SET pay_category_id = ? WHERE id = ?").run(matchedCat.id, shift.staff_user_id); } catch(e) {}
            }
          }
        } catch(e) {}
      }

      // Fallback B: Match staff position to pay categories
      if (!effectivePayCatId && shift.primary_position) {
        try {
          const posCat = db.prepare("SELECT * FROM pay_categories WHERE is_active = 1 AND (LOWER(name) = LOWER(?) OR LOWER(name) LIKE '%' || LOWER(?) || '%') ORDER BY id ASC LIMIT 1").get(shift.primary_position, shift.primary_position) as any;
          if (posCat) {
            effectivePayCatId = posCat.id;
            effectivePayCatName = posCat.name;
            try { db.prepare("UPDATE users SET pay_category_id = ? WHERE id = ?").run(posCat.id, shift.staff_user_id); } catch(e) {}
          }
        } catch(e) {}
      }

      // Fallback C: Default to first active pay category if staff is linked to Xero
      if (!effectivePayCatId && shift.xero_employee_id) {
        try {
          const defaultCat = db.prepare("SELECT * FROM pay_categories WHERE is_active = 1 ORDER BY id ASC LIMIT 1").get() as any;
          if (defaultCat) {
            effectivePayCatId = defaultCat.id;
            effectivePayCatName = defaultCat.name;
            try { db.prepare("UPDATE users SET pay_category_id = ? WHERE id = ?").run(defaultCat.id, shift.staff_user_id); } catch(e) {}
          }
        } catch(e) {}
      }

      if (effectivePayCatId && !effectivePayCatName) {
        try {
          const catRec = db.prepare("SELECT name FROM pay_categories WHERE id = ?").get(effectivePayCatId) as any;
          if (catRec) effectivePayCatName = catRec.name;
        } catch(e) {}
      }

      const catRules = effectivePayCatId ? catRuleMap.get(effectivePayCatId) : null;

      let weekdayPayId = shift.pay_rate_weekday_id || catRules?.get('weekday')?.id || '';
      let saturdayPayId = shift.pay_rate_saturday_id || catRules?.get('saturday')?.id || '';
      let sundayPayId = shift.pay_rate_sunday_id || catRules?.get('sunday')?.id || '';
      let publicHolidayPayId = shift.pay_rate_public_holiday_id || catRules?.get('public_holiday')?.id || '';
      let ndisTravelPayId = shift.pay_rate_ndis_travel_id || catRules?.get('ndis_travel')?.id || '';
      let homeCareTravelPayId = shift.pay_rate_home_care_travel_id || catRules?.get('home_care_travel')?.id || '';

      // If weekday rate is still empty, fallback to Xero employee's ordinary rate or first active base pay item
      if (!weekdayPayId && shift.xero_employee_id) {
        try {
          const xeroEmp = db.prepare("SELECT ordinary_earnings_rate_id FROM xero_employees WHERE id = ?").get(shift.xero_employee_id) as any;
          if (xeroEmp && xeroEmp.ordinary_earnings_rate_id) {
            weekdayPayId = xeroEmp.ordinary_earnings_rate_id;
          }
        } catch(e) {}
      }
      if (!weekdayPayId) {
        try {
          const basePi = db.prepare("SELECT xero_earnings_rate_id FROM pay_items WHERE is_active = 1 AND (multiplier <= 1.0 OR multiplier IS NULL) AND TRIM(xero_earnings_rate_id) != '' ORDER BY id ASC LIMIT 1").get() as any;
          if (basePi) weekdayPayId = basePi.xero_earnings_rate_id;
        } catch(e) {}
      }

      // If Saturday rate is empty, fallback to pay item with saturday / 1.5x
      if (!saturdayPayId) {
        try {
          const satPi = db.prepare("SELECT xero_earnings_rate_id FROM pay_items WHERE is_active = 1 AND (LOWER(name) LIKE '%saturday%' OR LOWER(name) LIKE '%sat%') AND TRIM(xero_earnings_rate_id) != '' LIMIT 1").get() as any;
          if (satPi) saturdayPayId = satPi.xero_earnings_rate_id;
        } catch(e) {}
      }

      // If Sunday rate is empty, fallback to pay item with sunday / 2.0x
      if (!sundayPayId) {
        try {
          const sunPi = db.prepare("SELECT xero_earnings_rate_id FROM pay_items WHERE is_active = 1 AND (LOWER(name) LIKE '%sunday%' OR LOWER(name) LIKE '%sun%') AND TRIM(xero_earnings_rate_id) != '' LIMIT 1").get() as any;
          if (sunPi) sundayPayId = sunPi.xero_earnings_rate_id;
        } catch(e) {}
      }

      // If Public Holiday rate is empty, fallback to holiday pay item
      if (!publicHolidayPayId) {
        try {
          const pubPi = db.prepare("SELECT xero_earnings_rate_id FROM pay_items WHERE is_active = 1 AND (LOWER(name) LIKE '%public%holiday%' OR LOWER(name) LIKE '%pub%hol%' OR LOWER(name) LIKE '%holiday%') AND TRIM(xero_earnings_rate_id) != '' LIMIT 1").get() as any;
          if (pubPi) publicHolidayPayId = pubPi.xero_earnings_rate_id;
        } catch(e) {}
      }

      // Always resolve NDIS Travel (Vehicle Allowance (SCHADS) / Per Km) and Home Care Travel from active pay items
      if (!ndisTravelPayId) {
        try {
          const ndisPi = db.prepare("SELECT xero_earnings_rate_id FROM pay_items WHERE is_active = 1 AND LOWER(name) LIKE '%vehicle allowance (schads)%' AND TRIM(xero_earnings_rate_id) != '' LIMIT 1").get() as any
            || db.prepare("SELECT xero_earnings_rate_id FROM pay_category_rules WHERE rule_key = 'ndis_travel' AND TRIM(xero_earnings_rate_id) != '' LIMIT 1").get() as any
            || db.prepare("SELECT xero_earnings_rate_id FROM pay_items WHERE is_active = 1 AND (LOWER(rate_type) = 'km' OR LOWER(name) LIKE '%ndis%travel%' OR LOWER(name) LIKE '%ndis%km%' OR ((LOWER(name) LIKE '%vehicle%allowance%' OR LOWER(name) LIKE '%travel%') AND LOWER(name) NOT LIKE '%time%' AND LOWER(name) NOT LIKE '%home care%')) AND TRIM(xero_earnings_rate_id) != '' LIMIT 1").get() as any;
          if (ndisPi) ndisTravelPayId = ndisPi.xero_earnings_rate_id;
        } catch(e) {}
      }
      if (!homeCareTravelPayId) {
        try {
          const hcPi = db.prepare("SELECT xero_earnings_rate_id FROM pay_items WHERE is_active = 1 AND (LOWER(name) LIKE '%time travelled%' OR LOWER(name) LIKE '%base rate x time%' OR LOWER(name) LIKE '%home care%travel%' OR LOWER(name) LIKE '%hcp%travel%') AND TRIM(xero_earnings_rate_id) != '' LIMIT 1").get() as any
            || db.prepare("SELECT xero_earnings_rate_id FROM pay_category_rules WHERE rule_key = 'home_care_travel' AND TRIM(xero_earnings_rate_id) != '' LIMIT 1").get() as any
            || db.prepare("SELECT xero_earnings_rate_id FROM pay_items WHERE is_active = 1 AND (LOWER(name) LIKE '%home care%km%' OR LOWER(name) LIKE '%hcp%km%' OR (LOWER(name) LIKE '%travel%' AND LOWER(name) NOT LIKE '%ndis%' AND LOWER(name) NOT LIKE '%(schads)%')) AND TRIM(xero_earnings_rate_id) != '' LIMIT 1").get() as any;
          if (hcPi) homeCareTravelPayId = hcPi.xero_earnings_rate_id;
        } catch(e) {}
      }

      staffMap.set(shift.staff_user_id, {
        staffId: shift.staff_user_id,
        portalName: `${shift.staff_first_name} ${shift.staff_last_name}`.trim(),
        email: shift.staff_email || '',
        xeroEmployeeId: shift.xero_employee_id || '',
        xeroEmployeeName: shift.xero_employee_name || '',
        isLinked: !!(shift.xero_employee_id || shift.xero_employee_name),
        payCategoryId: effectivePayCatId,
        payCategoryName: effectivePayCatName,
        payRateWeekdayId: weekdayPayId,
        payRateWeekdayName: payItemMap.get(weekdayPayId) || catRules?.get('weekday')?.name || '',
        payRateSaturdayId: saturdayPayId,
        payRateSaturdayName: payItemMap.get(saturdayPayId) || catRules?.get('saturday')?.name || '',
        payRateSundayId: sundayPayId,
        payRateSundayName: payItemMap.get(sundayPayId) || catRules?.get('sunday')?.name || '',
        payRatePublicHolidayId: publicHolidayPayId,
        payRatePublicHolidayName: payItemMap.get(publicHolidayPayId) || catRules?.get('public_holiday')?.name || '',
        payRateNdisTravelId: ndisTravelPayId,
        payRateNdisTravelName: payItemMap.get(ndisTravelPayId) || catRules?.get('ndis_travel')?.name || '',
        payRateHomeCareTravelId: homeCareTravelPayId,
        payRateHomeCareTravelName: payItemMap.get(homeCareTravelPayId) || catRules?.get('home_care_travel')?.name || '',
        weekdayHours: 0,
        saturdayHours: 0,
        sundayHours: 0,
        publicHolidayHours: 0,
        totalHours: 0,
        ndisTravelKm: 0,
        ndisTravelPay: 0,
        homeCareTravelKm: 0,
        homeCareTravelHours: 0,
        homeCareTravelPay: 0,
        isReady: false,
        warnings: []
      });
    }

    const rec = staffMap.get(shift.staff_user_id)!;
    if (dayCategory === 'Public Holiday') rec.publicHolidayHours += shiftHours;
    else if (dayCategory === 'Saturday') rec.saturdayHours += shiftHours;
    else if (dayCategory === 'Sunday') rec.sundayHours += shiftHours;
    else rec.weekdayHours += shiftHours;

    if (isHomeCare) {
      rec.homeCareTravelKm += hcKm;
      rec.homeCareTravelHours += hcHrs;
      rec.homeCareTravelPay += hcReimb;
    } else {
      rec.ndisTravelKm += ndisKm;
      rec.ndisTravelPay += ndisReimb;
    }
  }

  const overallTotals = {
    weekdayHours: 0,
    saturdayHours: 0,
    sundayHours: 0,
    publicHolidayHours: 0,
    totalHours: 0,
    ndisTravelKm: 0,
    ndisTravelPay: 0,
    homeCareTravelKm: 0,
    homeCareTravelHours: 0,
    homeCareTravelPay: 0
  };

  const staffList: StaffPayRunBreakdown[] = Array.from(staffMap.values()).map(s => {
    s.weekdayHours = parseFloat(s.weekdayHours.toFixed(2));
    s.saturdayHours = parseFloat(s.saturdayHours.toFixed(2));
    s.sundayHours = parseFloat(s.sundayHours.toFixed(2));
    s.publicHolidayHours = parseFloat(s.publicHolidayHours.toFixed(2));
    s.totalHours = parseFloat((s.weekdayHours + s.saturdayHours + s.sundayHours + s.publicHolidayHours).toFixed(2));
    s.ndisTravelKm = parseFloat(s.ndisTravelKm.toFixed(2));
    s.ndisTravelPay = parseFloat(s.ndisTravelPay.toFixed(2));
    s.homeCareTravelKm = parseFloat(s.homeCareTravelKm.toFixed(2));
    s.homeCareTravelHours = parseFloat(s.homeCareTravelHours.toFixed(2));
    s.homeCareTravelPay = parseFloat(s.homeCareTravelPay.toFixed(2));

    const warnings: string[] = [];
    if (!s.xeroEmployeeId && !s.xeroEmployeeName) {
      warnings.push('Not linked to Xero Employee profile');
    }
    if (s.weekdayHours > 0 && !s.payRateWeekdayId) {
      warnings.push('Missing Weekday Pay Item');
    }
    if (s.saturdayHours > 0 && !s.payRateSaturdayId) {
      warnings.push('Missing Saturday Pay Item');
    }
    if (s.sundayHours > 0 && !s.payRateSundayId) {
      warnings.push('Missing Sunday Pay Item');
    }
    if (s.publicHolidayHours > 0 && !s.payRatePublicHolidayId) {
      warnings.push('Missing Public Holiday Pay Item');
    }
    if ((s.ndisTravelKm + s.homeCareTravelKm) > 0 && !s.payRateNdisTravelId) {
      warnings.push('Missing Travel Allowance KM Pay Item');
    }
    if (s.homeCareTravelHours > 0 && !s.payRateHomeCareTravelId) {
      warnings.push('Missing Home Care Travel Pay Item');
    }

    s.warnings = warnings;
    s.isReady = !!s.xeroEmployeeId && warnings.length === 0;

    overallTotals.weekdayHours += s.weekdayHours;
    overallTotals.saturdayHours += s.saturdayHours;
    overallTotals.sundayHours += s.sundayHours;
    overallTotals.publicHolidayHours += s.publicHolidayHours;
    overallTotals.totalHours += s.totalHours;
    overallTotals.ndisTravelKm += s.ndisTravelKm;
    overallTotals.ndisTravelPay += s.ndisTravelPay;
    overallTotals.homeCareTravelKm += s.homeCareTravelKm;
    overallTotals.homeCareTravelHours += s.homeCareTravelHours;
    overallTotals.homeCareTravelPay += s.homeCareTravelPay;

    return s;
  });

  return {
    success: true,
    startDate: params.startDate,
    endDate: params.endDate,
    staff: staffList,
    totals: {
      weekdayHours: parseFloat(overallTotals.weekdayHours.toFixed(2)),
      saturdayHours: parseFloat(overallTotals.saturdayHours.toFixed(2)),
      sundayHours: parseFloat(overallTotals.sundayHours.toFixed(2)),
      publicHolidayHours: parseFloat(overallTotals.publicHolidayHours.toFixed(2)),
      totalHours: parseFloat(overallTotals.totalHours.toFixed(2)),
      ndisTravelKm: parseFloat(overallTotals.ndisTravelKm.toFixed(2)),
      ndisTravelPay: parseFloat(overallTotals.ndisTravelPay.toFixed(2)),
      homeCareTravelKm: parseFloat(overallTotals.homeCareTravelKm.toFixed(2)),
      homeCareTravelHours: parseFloat(overallTotals.homeCareTravelHours.toFixed(2)),
      homeCareTravelPay: parseFloat(overallTotals.homeCareTravelPay.toFixed(2))
    }
  };
}

/**
 * Creates or populates a Draft Pay Run in Xero AU Payroll for the given fortnight.
 */
export function formatXeroDate(val?: string): string {
  if (!val) return '';
  const match = String(val).match(/\/Date\((\d+)([+-]\d+)?\)\//);
  if (match) {
    const timestamp = parseInt(match[1], 10);
    const d = new Date(timestamp);
    if (!isNaN(d.getTime())) {
      const day = String(d.getUTCDate()).padStart(2, '0');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[d.getUTCMonth()];
      const year = d.getUTCFullYear();
      return `${day} ${month} ${year}`;
    }
  }
  return val;
}

export async function createXeroDraftPayRun(db: any, params: {
  startDate: string;
  endDate: string;
  payrollCalendarId?: string;
  staffIds?: number[];
}): Promise<{
  success: boolean;
  needsReconnect?: boolean;
  payRunId?: string;
  payRunStatus?: string;
  periodStartDate?: string;
  periodEndDate?: string;
  paymentDate?: string;
  calendarName?: string;
  employeesUpdated?: number;
  warnings?: string[];
  staffSummary?: any[];
  error?: string;
}> {
  try {
    let auth = await getValidAccessToken(db);
    if (!auth.accessToken) {
      throw new Error('No valid Xero access token available. Please connect Xero in Settings.');
    }
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${auth.accessToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    if (auth.tenantId) {
      headers['Xero-Tenant-Id'] = auth.tenantId;
    }

    // Auto-refresh token if 401 occurs
    let hasRefreshed = false;
    const refreshTokenAndRetry = async () => {
      if (hasRefreshed) return false;
      hasRefreshed = true;
      try {
        saveXeroSetting(db, 'xero_access_token', '');
        saveXeroSetting(db, 'xero_token_expires_at', 0);
        const forcedSettings = getXeroSettings(db);
        forcedSettings.xero_access_token = '';
        forcedSettings.xero_token_expires_at = 0;
        auth = await getValidAccessToken(db, forcedSettings);
        headers['Authorization'] = `Bearer ${auth.accessToken}`;
        if (auth.tenantId) {
          headers['Xero-Tenant-Id'] = auth.tenantId;
        }
        return true;
      } catch (retryErr) {
        console.warn('[XERO_PAYRUN] Retry with fresh token error:', retryErr);
        return false;
      }
    };

    // 1. Calculate pay run breakdown
    const preview = previewXeroPayRun(db, { startDate: params.startDate, endDate: params.endDate });
    let eligibleStaff = preview.staff;
    if (params.staffIds && params.staffIds.length > 0) {
      eligibleStaff = eligibleStaff.filter(s => params.staffIds!.includes(s.staffId));
    }

    eligibleStaff = eligibleStaff.filter(s => !!s.xeroEmployeeId && (s.totalHours > 0 || s.ndisTravelKm > 0 || s.homeCareTravelHours > 0 || s.homeCareTravelKm > 0));

    if (eligibleStaff.length === 0) {
      throw new Error('No staff members with worked hours are linked to a Xero Employee profile. Please link staff members in their Staff Profile first.');
    }

    // 2. Fetch payroll calendars
    const calResult = await getXeroPayrollCalendars(db);
    if (!calResult.success || calResult.calendars.length === 0) {
      if (calResult.needsReconnect) {
        return {
          success: false,
          needsReconnect: true,
          error: calResult.error || 'Xero Payroll authorization expired. Please re-authorize Xero.'
        };
      }
      throw new Error(calResult.error || 'No Payroll Calendars found in Xero. Please set up a Payroll Calendar in Xero Payroll Settings.');
    }

    let targetCalendar = calResult.calendars.find(c => c.id === params.payrollCalendarId);
    if (!targetCalendar) {
      targetCalendar = calResult.calendars.find(c => c.calendarType === 'FORTNIGHTLY' || c.name.toLowerCase().includes('fortnight')) || calResult.calendars[0];
    }

    // 3. Find or Create Draft Pay Run in Xero
    let payRunId = '';
    let payRunObj: any = null;

    let draftRunsRes = await fetch('https://api.xero.com/payroll.xro/1.0/PayRuns?where=PayRunStatus=="DRAFT"', { headers });
    if ((draftRunsRes.status === 401 || draftRunsRes.status === 403) && (await refreshTokenAndRetry())) {
      draftRunsRes = await fetch('https://api.xero.com/payroll.xro/1.0/PayRuns?where=PayRunStatus=="DRAFT"', { headers });
    }
    if (draftRunsRes.ok) {
      const draftData = await draftRunsRes.json();
      const existingDrafts: any[] = draftData.PayRuns || [];
      const matchingDraft = existingDrafts.find(p => p.PayrollCalendarID === targetCalendar!.id);
      if (matchingDraft) {
        payRunId = matchingDraft.PayRunID;
        payRunObj = matchingDraft;
      }
    }

    if (!payRunId) {
      let createRes = await fetch('https://api.xero.com/payroll.xro/1.0/PayRuns', {
        method: 'POST',
        headers,
        body: JSON.stringify([{ PayrollCalendarID: targetCalendar.id }])
      });

      if ((createRes.status === 401 || createRes.status === 403) && (await refreshTokenAndRetry())) {
        createRes = await fetch('https://api.xero.com/payroll.xro/1.0/PayRuns', {
          method: 'POST',
          headers,
          body: JSON.stringify([{ PayrollCalendarID: targetCalendar.id }])
        });
      }

      if (!createRes.ok) {
        const errBody = await createRes.json().catch(() => ({}));
        const errMsg = errBody.Detail || errBody.Message || errBody.error || createRes.statusText;
        if (createRes.status === 401 || createRes.status === 403 || String(errMsg).toLowerCase().includes('authorizationunsuccessful') || String(errMsg).toLowerCase().includes('scope') || String(errMsg).toLowerCase().includes('unauthorized')) {
          return {
            success: false,
            needsReconnect: true,
            error: "Failed to create Draft Pay Run in Xero (401): AuthorizationUnsuccessful. Your Xero connection does not have the required Payroll Pay Runs permission ('payroll.payruns' and 'payroll.payslip'), or the authorized user lacks the 'Payroll Admin' role in Xero. Please re-authorize Xero to grant the updated payroll permissions."
          };
        }
        throw new Error(`Failed to create Draft Pay Run in Xero (${createRes.status}): ${errMsg}`);
      }

      const createData = await createRes.json();
      const createdRuns: any[] = createData.PayRuns || [];
      if (createdRuns.length > 0) {
        payRunId = createdRuns[0].PayRunID;
        payRunObj = createdRuns[0];
      }
    }

    if (!payRunId) {
      throw new Error('Could not initialize Pay Run ID in Xero.');
    }

    // 4. Retrieve full PayRun with Payslips
    const fullRunRes = await fetch(`https://api.xero.com/payroll.xro/1.0/PayRuns/${payRunId}`, { headers });
    let existingPayslips: any[] = [];
    if (fullRunRes.ok) {
      const fullData = await fullRunRes.json();
      payRunObj = fullData.PayRuns?.[0] || payRunObj;
      existingPayslips = payRunObj?.Payslips || [];
    }

    // Pre-fetch all earnings rates from Xero/DB so we have exact RatePerUnit, multipliers and rate types
    const payItemRatesMap = new Map<string, { ratePerUnit: number; multiplier: number; earningsType: string; isMultiple: boolean; rateType: string }>();
    let liveVehicleAllowanceId = '';
    try {
      const payItemsRes = await getXeroPayItems(db);
      if (payItemsRes.success && Array.isArray(payItemsRes.earningsRates)) {
        for (const er of payItemsRes.earningsRates) {
          const rawRateType = String(er.rateType || '').toUpperCase();
          const isMultiple = rawRateType.includes('MULTIPLE') || (er.multiplier !== undefined && er.multiplier > 0 && er.multiplier !== 1.0);
          payItemRatesMap.set(er.id, {
            ratePerUnit: er.ratePerUnit || 0,
            multiplier: er.multiplier || 1,
            earningsType: er.earningsType || '',
            rateType: er.rateType || '',
            isMultiple
          });
          const erNameLower = (er.name || '').toLowerCase();
          const erUnitsLower = (er.typeOfUnits || '').toLowerCase();
          if (erNameLower.includes('vehicle allowance (schads)') || (!liveVehicleAllowanceId && (erUnitsLower === 'km' || erUnitsLower === 'kilometres' || erUnitsLower === 'kilometers'))) {
            liveVehicleAllowanceId = er.id;
          }
        }
      }
      if (payItemsRes.success && Array.isArray(payItemsRes.allowances)) {
        for (const al of payItemsRes.allowances) {
          const id = al.EarningsRateID || al.earningsRateID || al.Id || al.id || '';
          if (id) {
            payItemRatesMap.set(id, {
              ratePerUnit: Number(al.RatePerUnit || al.ratePerUnit || 0),
              multiplier: 1,
              earningsType: 'Allowance',
              rateType: 'RatePerUnit',
              isMultiple: false
            });
          }
        }
      }
      const dbPayItems = db.prepare("SELECT xero_earnings_rate_id, default_rate, multiplier, rate_type FROM pay_items WHERE TRIM(xero_earnings_rate_id) != ''").all() as any[];
      for (const pi of dbPayItems) {
        if (!payItemRatesMap.has(pi.xero_earnings_rate_id)) {
          payItemRatesMap.set(pi.xero_earnings_rate_id, {
            ratePerUnit: Number(pi.default_rate || 0),
            multiplier: Number(pi.multiplier || 1),
            earningsType: '',
            rateType: pi.rate_type || '',
            isMultiple: (pi.multiplier && pi.multiplier > 1)
          });
        }
      }
    } catch (e) {
      console.warn('[XERO_PAYRUN] Could not load pay items map:', e);
    }

    // 5. Update each employee's payslip with their award hours & travel
    let employeesUpdated = 0;
    const staffSummary: any[] = [];
    const executionWarnings: string[] = [];

    for (const staff of eligibleStaff) {
      const effectiveNdisTravelId = staff.payRateNdisTravelId || liveVehicleAllowanceId;
      // Home Care Travel is calculated as a decimal fraction of an hour (time) * employee's hourly rate
      const targetEntries = [
        { id: staff.payRateWeekdayId, units: staff.weekdayHours, desc: 'Weekday', defaultRate: undefined, isHomeCareTravel: false },
        { id: staff.payRateSaturdayId, units: staff.saturdayHours, desc: 'Saturday', defaultRate: undefined, isHomeCareTravel: false },
        { id: staff.payRateSundayId, units: staff.sundayHours, desc: 'Sunday', defaultRate: undefined, isHomeCareTravel: false },
        { id: staff.payRatePublicHolidayId, units: staff.publicHolidayHours, desc: 'Public Holiday', defaultRate: undefined, isHomeCareTravel: false },
        { id: effectiveNdisTravelId, units: parseFloat((staff.ndisTravelKm + staff.homeCareTravelKm).toFixed(2)), desc: 'NDIS Travel', defaultRate: 1.05, isHomeCareTravel: false },
        { id: staff.payRateHomeCareTravelId, units: staff.homeCareTravelHours, desc: 'Home Care Travel', defaultRate: undefined, isHomeCareTravel: true },
      ].filter(e => !!e.id && e.units > 0);

      if (targetEntries.length === 0) {
        console.warn(`[XERO_PAYRUN] No valid target entries for ${staff.portalName} (${staff.totalHours} hrs)`);
        executionWarnings.push(`${staff.portalName}: Could not push ${staff.totalHours} hours to Xero because no Pay Category or Pay Items could be resolved. Please check staff pay category in Directory.`);
        staffSummary.push({
          staffName: staff.portalName,
          xeroEmployeeId: staff.xeroEmployeeId,
          status: 'SKIPPED',
          error: 'No Pay Category or Pay Items resolved'
        });
        continue;
      }

      const payslip = existingPayslips.find((p: any) => (p.EmployeeID || p.EmployeeId || p.employeeID) === staff.xeroEmployeeId);
      const payslipId = payslip?.PayslipID || payslip?.PayslipId || payslip?.id;

      try {
        let slipRes: any;
        let baseOrdinaryRate = 0;

        if (payslipId) {
          // 1. Fetch current draft payslip from Xero to preserve existing template lines & ordinary base rates
          let existingLines: any[] = [];
          try {
            const getSlipRes = await fetch(`https://api.xero.com/payroll.xro/1.0/Payslip/${payslipId}`, { headers });
            if (getSlipRes.ok) {
              const getSlipData = await getSlipRes.json();
              const psObj = getSlipData.Payslip || getSlipData.Payslips?.[0];
              if (psObj && Array.isArray(psObj.EarningsLines)) {
                existingLines = psObj.EarningsLines;
              }
            }
          } catch (getErr) {
            console.warn('[XERO_PAYRUN] Could not fetch detailed payslip:', getErr);
          }

          // Determine employee's base ordinary rate from existing template lines (excluding per-km vehicle allowance)
          const baseLine = existingLines.find((el: any) => el.EarningsRateID === staff.payRateWeekdayId && Number(el.RatePerUnit || 0) > 0)
            || existingLines.find((el: any) => Number(el.RatePerUnit || 0) > 5 && el.EarningsRateID !== effectiveNdisTravelId)
            || existingLines.find((el: any) => Number(el.RatePerUnit || 0) > 0 && el.EarningsRateID !== effectiveNdisTravelId);
          if (baseLine) baseOrdinaryRate = Number(baseLine.RatePerUnit);

          // If base rate not found on draft payslip, fetch employee PayTemplate from Xero
          if (!baseOrdinaryRate || isNaN(baseOrdinaryRate) || baseOrdinaryRate <= 0) {
            try {
              const empRes = await fetch(`https://api.xero.com/payroll.xro/1.0/Employees/${staff.xeroEmployeeId}`, { headers });
              if (empRes.ok) {
                const empData = await empRes.json();
                const empObj = empData.Employees?.[0] || empData.Employee;
                const tmplLines = empObj?.PayTemplate?.EarningsLines || [];
                const tmplBase = tmplLines.find((l: any) => l.EarningsRateID === staff.payRateWeekdayId && Number(l.RatePerUnit || 0) > 0)
                  || tmplLines.find((l: any) => Number(l.RatePerUnit || 0) > 5 && l.EarningsRateID !== effectiveNdisTravelId);
                if (tmplBase) {
                  baseOrdinaryRate = Number(tmplBase.RatePerUnit);
                }
              }
            } catch (empErr) {
              console.warn('[XERO_PAYRUN] Could not fetch employee template rate:', empErr);
            }
          }

          if (!baseOrdinaryRate || isNaN(baseOrdinaryRate) || baseOrdinaryRate <= 0) {
            const wkdayInfo = payItemRatesMap.get(staff.payRateWeekdayId);
            if (wkdayInfo && wkdayInfo.ratePerUnit > 0) {
              baseOrdinaryRate = wkdayInfo.ratePerUnit;
            }
          }

          if (!baseOrdinaryRate || isNaN(baseOrdinaryRate) || baseOrdinaryRate <= 0) {
            try {
              const pi = db.prepare("SELECT default_rate FROM pay_items WHERE xero_earnings_rate_id = ?").get(staff.payRateWeekdayId) as any;
              if (pi && pi.default_rate > 0) baseOrdinaryRate = Number(pi.default_rate);
            } catch(e) {}
          }

          if (!baseOrdinaryRate || isNaN(baseOrdinaryRate) || baseOrdinaryRate <= 0) {
            baseOrdinaryRate = 42.0;
          }

          // Clean existing lines so Xero does not reject RatePerUnit <= 0 or missing rates
          const finalLines: any[] = existingLines.map((el: any) => {
            const clean: any = {
              EarningsRateID: el.EarningsRateID,
              NumberOfUnits: el.NumberOfUnits !== undefined && el.NumberOfUnits !== null ? Number(el.NumberOfUnits) : 0
            };
            const rateVal = Number(el.RatePerUnit);
            if (!isNaN(rateVal) && rateVal > 0) {
              clean.RatePerUnit = rateVal;
            }
            const fixVal = Number(el.FixedAmount);
            if (!isNaN(fixVal) && fixVal > 0) {
              clean.FixedAmount = fixVal;
            }
            return clean;
          });

          // Helper to compute RatePerUnit for any shift entry
          const computeLineRate = (entry: typeof targetEntries[0]) => {
            const rateInfo = payItemRatesMap.get(entry.id);
            let rate = 0;

            if (rateInfo && rateInfo.ratePerUnit > 0) {
              rate = rateInfo.ratePerUnit;
            } else if (entry.isHomeCareTravel) {
              rate = baseOrdinaryRate > 0 ? baseOrdinaryRate : (rateInfo?.ratePerUnit || 0);
            } else if (entry.desc === 'NDIS Travel') {
              rate = (rateInfo && rateInfo.ratePerUnit > 0) ? rateInfo.ratePerUnit : 1.05;
            } else if (rateInfo && rateInfo.multiplier > 1 && baseOrdinaryRate > 0) {
              rate = parseFloat((baseOrdinaryRate * rateInfo.multiplier).toFixed(4));
            } else if (baseOrdinaryRate > 0) {
              if (entry.desc === 'Saturday') {
                const mult = (rateInfo?.multiplier && rateInfo.multiplier > 1) ? rateInfo.multiplier : 1.5;
                rate = parseFloat((baseOrdinaryRate * mult).toFixed(4));
              } else if (entry.desc === 'Sunday') {
                const mult = (rateInfo?.multiplier && rateInfo.multiplier > 1) ? rateInfo.multiplier : 2.0;
                rate = parseFloat((baseOrdinaryRate * mult).toFixed(4));
              } else if (entry.desc === 'Public Holiday') {
                const mult = (rateInfo?.multiplier && rateInfo.multiplier > 1) ? rateInfo.multiplier : 2.5;
                rate = parseFloat((baseOrdinaryRate * mult).toFixed(4));
              } else {
                rate = baseOrdinaryRate;
              }
            } else if (entry.defaultRate !== undefined && entry.defaultRate > 0) {
              rate = entry.defaultRate;
            }

            if (rate <= 0) {
              rate = baseOrdinaryRate > 0 ? baseOrdinaryRate : 42.0;
            }
            return Number(rate.toFixed(4));
          };

          // Merge target hours into existing template lines, or append new lines with required RatePerUnit
          for (const entry of targetEntries) {
            const lineRate = computeLineRate(entry);
            const existingIdx = finalLines.findIndex(l => l.EarningsRateID === entry.id);
            if (existingIdx >= 0) {
              finalLines[existingIdx].NumberOfUnits = Number(entry.units.toFixed(2));
              if (entry.desc === 'NDIS Travel' && finalLines[existingIdx].RatePerUnit > 0 && (!payItemRatesMap.get(entry.id)?.ratePerUnit)) {
                // Keep existing Xero template RatePerUnit (e.g. 1.05) on Vehicle Allowance (SCHADS)
              } else {
                finalLines[existingIdx].RatePerUnit = lineRate;
              }
            } else {
              // Not in template - dynamically append new EarningsLine to the payslip
              finalLines.push({
                EarningsRateID: entry.id,
                NumberOfUnits: Number(entry.units.toFixed(2)),
                RatePerUnit: lineRate
              });
            }
          }

          // Ensure every line in finalLines has a valid RatePerUnit so Xero never throws validation errors
          for (const fl of finalLines) {
            if ((!fl.RatePerUnit || fl.RatePerUnit <= 0) && (!fl.FixedAmount || fl.FixedAmount <= 0)) {
              const flRateInfo = payItemRatesMap.get(fl.EarningsRateID);
              if (flRateInfo && flRateInfo.ratePerUnit > 0) {
                fl.RatePerUnit = flRateInfo.ratePerUnit;
              } else if (baseOrdinaryRate > 0) {
                const mult = (flRateInfo?.multiplier && flRateInfo.multiplier > 1) ? flRateInfo.multiplier : 1.0;
                fl.RatePerUnit = parseFloat((baseOrdinaryRate * mult).toFixed(4));
              } else {
                fl.RatePerUnit = 42.0;
              }
            }
          }

          const arrayPayload = [{ PayslipID: payslipId, EarningsLines: finalLines }];
          const singlePayload = { PayslipID: payslipId, EarningsLines: finalLines };

          // Post to standard /payroll.xro/1.0/Payslip endpoint with arrayPayload
          slipRes = await fetch('https://api.xero.com/payroll.xro/1.0/Payslip', {
            method: 'POST',
            headers,
            body: JSON.stringify(arrayPayload)
          });
        } else {
          // If no pre-existing draft payslip summary was created by Xero
          const newLines: any[] = targetEntries.map(entry => {
            const rateInfo = payItemRatesMap.get(entry.id);
            let rate = 0;
            if (rateInfo && rateInfo.ratePerUnit > 0) {
              rate = rateInfo.ratePerUnit;
            } else if (entry.isHomeCareTravel) {
              rate = baseOrdinaryRate > 0 ? baseOrdinaryRate : (rateInfo?.ratePerUnit || 0);
            } else if (entry.desc === 'NDIS Travel') {
              rate = (rateInfo && rateInfo.ratePerUnit > 0) ? rateInfo.ratePerUnit : 0.99;
            } else if (rateInfo && rateInfo.multiplier > 1 && baseOrdinaryRate > 0) {
              rate = parseFloat((baseOrdinaryRate * rateInfo.multiplier).toFixed(4));
            } else if (baseOrdinaryRate > 0) {
              if (entry.desc === 'Saturday') {
                const mult = (rateInfo?.multiplier && rateInfo.multiplier > 1) ? rateInfo.multiplier : 1.5;
                rate = parseFloat((baseOrdinaryRate * mult).toFixed(4));
              } else if (entry.desc === 'Sunday') {
                const mult = (rateInfo?.multiplier && rateInfo.multiplier > 1) ? rateInfo.multiplier : 2.0;
                rate = parseFloat((baseOrdinaryRate * mult).toFixed(4));
              } else if (entry.desc === 'Public Holiday') {
                const mult = (rateInfo?.multiplier && rateInfo.multiplier > 1) ? rateInfo.multiplier : 2.5;
                rate = parseFloat((baseOrdinaryRate * mult).toFixed(4));
              } else {
                rate = baseOrdinaryRate;
              }
            } else if (entry.defaultRate !== undefined && entry.defaultRate > 0) {
              rate = entry.defaultRate;
            }

            if (rate <= 0) {
              rate = baseOrdinaryRate > 0 ? baseOrdinaryRate : 42.0;
            }

            return {
              EarningsRateID: entry.id,
              NumberOfUnits: Number(entry.units.toFixed(2)),
              RatePerUnit: Number(rate.toFixed(4))
            };
          });

          slipRes = await fetch('https://api.xero.com/payroll.xro/1.0/Payslip', {
            method: 'POST',
            headers,
            body: JSON.stringify([{ PayRunID: payRunId, EmployeeID: staff.xeroEmployeeId, EarningsLines: newLines }])
          });
        }

        if (slipRes && slipRes.ok) {
          employeesUpdated++;
          staffSummary.push({
            staffName: staff.portalName,
            xeroEmployeeId: staff.xeroEmployeeId,
            linesSent: targetEntries.length,
            status: 'SUCCESS'
          });
        } else {
          const rawText = await slipRes.text().catch(() => '');
          let errData: any = {};
          try {
            errData = JSON.parse(rawText);
          } catch (e) {}

          console.error(`[XERO_PAYRUN_ERROR] ${staff.portalName} (${staff.xeroEmployeeId}):`, rawText || JSON.stringify(errData));

          const valErrors: string[] = [];

          // Deep recursive extraction of all ValidationErrors across the entire Xero response tree
          const extractErrorsRecursive = (curr: any) => {
            if (!curr) return;
            if (Array.isArray(curr)) {
              for (const item of curr) extractErrorsRecursive(item);
              return;
            }
            if (typeof curr === 'object') {
              for (const [key, val] of Object.entries(curr)) {
                const k = key.toLowerCase();
                if (k.includes('validationerror') || k === 'errors' || k.includes('problem')) {
                  if (Array.isArray(val)) {
                    for (const v of val) {
                      if (typeof v === 'string') valErrors.push(v);
                      else if (v?.Message) valErrors.push(v.Message);
                      else if (v?.message) valErrors.push(v.message);
                      else if (typeof v === 'object') extractErrorsRecursive(v);
                    }
                  } else if (typeof val === 'string') {
                    valErrors.push(val);
                  } else if (typeof val === 'object') {
                    if ((val as any)?.Message) valErrors.push((val as any).Message);
                    else if ((val as any)?.message) valErrors.push((val as any).message);
                    else extractErrorsRecursive(val);
                  }
                } else if (k === 'message' && typeof val === 'string' && val !== 'A validation exception occurred') {
                  valErrors.push(val);
                } else {
                  extractErrorsRecursive(val);
                }
              }
            }
          };

          extractErrorsRecursive(errData);

          // XML regex if returned in XML format
          if (rawText && (rawText.startsWith('<') || rawText.includes('</'))) {
            const xmlMsgs = Array.from(rawText.matchAll(/<Message>(.*?)<\/Message>/g)).map(m => m[1]);
            for (const m of xmlMsgs) {
              if (m && m !== 'A validation exception occurred' && !valErrors.includes(m)) {
                valErrors.push(m);
              }
            }
          }

          let errMsg = '';
          const uniqueErrors = Array.from(new Set(valErrors.filter(Boolean)));
          if (uniqueErrors.length > 0) {
            errMsg = uniqueErrors.join('; ');
          } else if (errData.Detail) {
            errMsg = errData.Detail;
          } else if (errData.Message && errData.Message !== 'A validation exception occurred') {
            errMsg = errData.Message;
          } else if (errData.Type === 'ValidationException' || errData.Message === 'A validation exception occurred') {
            errMsg = "A validation exception occurred in Xero. Please check employee setup in Xero (ensure Tax Declaration, Superannuation Membership, and Pay Template are fully completed in Xero Payroll).";
          } else if (rawText && rawText.length < 150) {
            errMsg = rawText.trim();
          } else {
            errMsg = `Xero Validation Error (${slipRes.status})`;
          }

          executionWarnings.push(`${staff.portalName}: ${errMsg}`);
          staffSummary.push({
            staffName: staff.portalName,
            xeroEmployeeId: staff.xeroEmployeeId,
            status: 'FAILED',
            error: errMsg
          });
        }
      } catch (lineErr: any) {
        executionWarnings.push(`${staff.portalName}: ${lineErr.message}`);
      }
    }

    return {
      success: true,
      payRunId,
      payRunStatus: payRunObj?.PayRunStatus || 'DRAFT',
      periodStartDate: formatXeroDate(payRunObj?.PayRunPeriodStartDate) || params.startDate,
      periodEndDate: formatXeroDate(payRunObj?.PayRunPeriodEndDate) || params.endDate,
      paymentDate: formatXeroDate(payRunObj?.PaymentDate),
      calendarName: targetCalendar.name,
      employeesUpdated,
      warnings: executionWarnings,
      staffSummary
    };
  } catch (e: any) {
    const isAuthErr = String(e.message).includes('401') || 
      String(e.message).toLowerCase().includes('authorizationunsuccessful') || 
      String(e.message).toLowerCase().includes('unauthorized') ||
      String(e.message).toLowerCase().includes('scope');
    return {
      success: false,
      needsReconnect: isAuthErr,
      error: isAuthErr 
        ? "Failed to create Draft Pay Run in Xero (401): AuthorizationUnsuccessful. Your Xero connection is missing the Payroll Pay Runs permission ('payroll.payruns' and 'payroll.payslip'), or your user account lacks the 'Payroll Admin' role in Xero. Please re-authorize Xero to grant the required permissions."
        : (e.message || 'Failed to create Draft Pay Run in Xero')
    };
  }
}

/**
 * Helper to locate an invoice in Xero by xero_invoice_id or InvoiceNumber.
 */
async function findXeroInvoice(
  accessToken: string,
  tenantId: string,
  xeroInvoiceId?: string,
  invoiceNumber?: string
): Promise<any | null> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
    'Xero-Tenant-Id': tenantId,
    'Accept': 'application/json',
  };

  // 1. Try direct lookup by Xero InvoiceID UUID if stored
  if (xeroInvoiceId) {
    try {
      const res = await fetch(`https://api.xero.com/api.xro/2.0/Invoices/${encodeURIComponent(xeroInvoiceId)}`, { headers });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const inv = data?.Invoices?.[0];
        if (inv && inv.Status !== 'VOIDED' && inv.Status !== 'DELETED') {
          return inv;
        }
      }
    } catch (e) {
      console.warn('[XERO] Lookup by InvoiceID failed:', e);
    }
  }

  // 2. Try lookup by exact InvoiceNumber via query param InvoiceNumbers
  if (invoiceNumber) {
    try {
      const res = await fetch(
        `https://api.xero.com/api.xro/2.0/Invoices?InvoiceNumbers=${encodeURIComponent(invoiceNumber)}`,
        { headers }
      );
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const list = Array.isArray(data?.Invoices) ? data.Invoices : [];
        const match = list.find(
          (inv: any) =>
            inv.Status !== 'VOIDED' &&
            inv.Status !== 'DELETED' &&
            (!inv.Type || inv.Type === 'ACCREC')
        );
        if (match) return match;
      }
    } catch (e) {
      console.warn('[XERO] Lookup by InvoiceNumbers param failed:', e);
    }

    // 3. Fallback lookup using where filter
    try {
      const whereClause = `InvoiceNumber=="${invoiceNumber.replace(/"/g, '')}"`;
      const res = await fetch(
        `https://api.xero.com/api.xro/2.0/Invoices?where=${encodeURIComponent(whereClause)}`,
        { headers }
      );
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const list = Array.isArray(data?.Invoices) ? data.Invoices : [];
        const match = list.find(
          (inv: any) =>
            inv.Status !== 'VOIDED' &&
            inv.Status !== 'DELETED' &&
            (!inv.Type || inv.Type === 'ACCREC')
        );
        if (match) return match;
      }
    } catch (e) {
      console.warn('[XERO] Lookup by where InvoiceNumber failed:', e);
    }
  }

  return null;
}

/**
 * Resolves the target Bank Account (or payment-enabled account) in Xero for applying invoice payments.
 */
async function resolveXeroPaymentAccount(
  db: any,
  accessToken: string,
  tenantId: string
): Promise<{ AccountID: string; Code?: string; Name: string } | null> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
    'Xero-Tenant-Id': tenantId,
    'Accept': 'application/json',
  };

  // Load portal settings to check if a specific bank account is configured
  let portalBankAcc = '';
  let portalBankName = '';
  let preferredAccountId = '';
  let preferredAccountCode = '';
  try {
    const rows = db.prepare("SELECT key, value FROM settings WHERE key IN ('bankAcc', 'bankName', 'xero_payment_account_id', 'xero_payment_account_code')").all() as any[];
    for (const r of rows) {
      let val = r.value;
      try { val = JSON.parse(r.value); } catch {}
      if (r.key === 'bankAcc') portalBankAcc = String(val || '').replace(/[\s\-]/g, '');
      if (r.key === 'bankName') portalBankName = String(val || '').trim().toLowerCase();
      if (r.key === 'xero_payment_account_id') preferredAccountId = String(val || '').trim();
      if (r.key === 'xero_payment_account_code') preferredAccountCode = String(val || '').trim();
    }
  } catch {}

  const res = await fetch('https://api.xero.com/api.xro/2.0/Accounts', { headers });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.Message || `Failed to read Xero Chart of Accounts (HTTP ${res.status})`);
  }

  const data = await res.json().catch(() => ({}));
  const activeAccounts = (Array.isArray(data?.Accounts) ? data.Accounts : []).filter(
    (a: any) => a.Status === 'ACTIVE'
  );

  // 1. Check explicitly configured Xero payment account ID or Code
  if (preferredAccountId) {
    const match = activeAccounts.find((a: any) => a.AccountID === preferredAccountId);
    if (match) return { AccountID: match.AccountID, Code: match.Code, Name: match.Name };
  }
  if (preferredAccountCode) {
    const match = activeAccounts.find((a: any) => String(a.Code) === preferredAccountCode);
    if (match) return { AccountID: match.AccountID, Code: match.Code, Name: match.Name };
  }

  // 2. Check active BANK accounts
  const bankAccounts = activeAccounts.filter((a: any) => a.Type === 'BANK');
  if (bankAccounts.length > 0) {
    if (portalBankAcc) {
      const matchedByNum = bankAccounts.find((a: any) => {
        const xeroAccNum = String(a.BankAccountNumber || '').replace(/[\s\-]/g, '');
        return xeroAccNum && (xeroAccNum.endsWith(portalBankAcc) || portalBankAcc.endsWith(xeroAccNum));
      });
      if (matchedByNum) {
        return { AccountID: matchedByNum.AccountID, Code: matchedByNum.Code, Name: matchedByNum.Name };
      }
    }
    if (portalBankName) {
      const matchedByName = bankAccounts.find((a: any) =>
        String(a.Name || '').toLowerCase().includes(portalBankName)
      );
      if (matchedByName) {
        return { AccountID: matchedByName.AccountID, Code: matchedByName.Code, Name: matchedByName.Name };
      }
    }
    return { AccountID: bankAccounts[0].AccountID, Code: bankAccounts[0].Code, Name: bankAccounts[0].Name };
  }

  // 3. Fallback to any active account with EnablePaymentsToAccount === true
  const paymentEnabledAccounts = activeAccounts.filter((a: any) => a.EnablePaymentsToAccount === true);
  if (paymentEnabledAccounts.length > 0) {
    return {
      AccountID: paymentEnabledAccounts[0].AccountID,
      Code: paymentEnabledAccounts[0].Code,
      Name: paymentEnabledAccounts[0].Name,
    };
  }

  return null;
}

/**
 * Marks a matching Xero invoice as PAID by applying a Payment against it in Xero.
 */
export async function markInvoicePaidInXero(
  db: any,
  invoiceId: number,
  fallbackInvoiceNumber?: string
): Promise<{
  success: boolean;
  skipped?: boolean;
  alreadyPaid?: boolean;
  reason?: string;
  xeroInvoiceId?: string;
  invoiceNumber?: string;
  paymentId?: string;
  amountPaid?: number;
  accountName?: string;
  error?: string;
}> {
  try {
    const settings = getXeroSettings(db);
    if (!settings.xero_client_id) {
      return { success: false, skipped: true, reason: 'Xero is not configured.' };
    }

    const invoiceRow = db.prepare(`
      SELECT i.*, c.first_name, c.last_name
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      WHERE i.id = ?
    `).get(invoiceId) as any;

    if (!invoiceRow) {
      return { success: false, error: `Invoice #${invoiceId} not found.` };
    }

    const invoiceNumber = (invoiceRow.invoice_number || fallbackInvoiceNumber || '').trim();
    const xeroInvoiceId = (invoiceRow.xero_invoice_id || '').trim();

    if (!xeroInvoiceId && !invoiceNumber) {
      return { success: false, skipped: true, reason: 'No Invoice Number or Xero ID available.' };
    }

    const { accessToken, tenantId } = await getValidAccessToken(db, settings);

    let xeroInv = await findXeroInvoice(accessToken, tenantId, xeroInvoiceId, invoiceNumber);
    if (!xeroInv) {
      return {
        success: false,
        skipped: true,
        reason: `Invoice ${invoiceNumber || invoiceId} was not found in Xero.`,
      };
    }

    // Ensure local DB links to the discovered Xero InvoiceID
    if (xeroInv.InvoiceID && invoiceRow.xero_invoice_id !== xeroInv.InvoiceID) {
      try {
        db.prepare(`
          UPDATE invoices
          SET xero_invoice_id = ?,
              xero_status = 'SYNCED',
              xero_synced_at = COALESCE(xero_synced_at, CURRENT_TIMESTAMP)
          WHERE id = ?
        `).run(xeroInv.InvoiceID, invoiceId);
      } catch {}
    }

    // Check if already PAID in Xero
    const amountDue = Number(xeroInv.AmountDue ?? 0);
    if (xeroInv.Status === 'PAID' || (xeroInv.Status === 'AUTHORISED' && amountDue <= 0)) {
      return {
        success: true,
        alreadyPaid: true,
        xeroInvoiceId: xeroInv.InvoiceID,
        invoiceNumber: xeroInv.InvoiceNumber || invoiceNumber,
      };
    }

    // If invoice in Xero is still DRAFT or SUBMITTED, authorise it first so Xero allows a payment
    if (xeroInv.Status === 'DRAFT' || xeroInv.Status === 'SUBMITTED') {
      const authRes = await fetch('https://api.xero.com/api.xro/2.0/Invoices', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Xero-Tenant-Id': tenantId,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          Invoices: [
            {
              InvoiceID: xeroInv.InvoiceID,
              Status: 'AUTHORISED',
            },
          ],
        }),
      });
      if (authRes.ok) {
        const authData = await authRes.json().catch(() => ({}));
        if (authData?.Invoices?.[0]) {
          xeroInv = authData.Invoices[0];
        }
      }
    }

    // Resolve Xero Bank Account (or payment-enabled account)
    const paymentAccount = await resolveXeroPaymentAccount(db, accessToken, tenantId);
    if (!paymentAccount) {
      return {
        success: false,
        error: 'No active Bank Account (or payment-enabled account) found in Xero Chart of Accounts to record the payment.',
      };
    }

    // Determine payment date (in business timezone, and never earlier than Xero Invoice Date)
    let timezone = 'Australia/Perth';
    try {
      const tzRow = db.prepare("SELECT value FROM settings WHERE key = 'timezone'").get() as any;
      if (tzRow?.value) {
        timezone = String(tzRow.value).replace(/['"]+/g, '').trim() || 'Australia/Perth';
      }
    } catch {}

    const todayYmd = formatInTimeZone(new Date(), timezone, 'yyyy-MM-dd');
    let invDateYmd = '';
    if (xeroInv.DateString) {
      invDateYmd = String(xeroInv.DateString).split('T')[0];
    } else if (xeroInv.Date) {
      invDateYmd = formatXeroDate(xeroInv.Date);
    }
    const paymentDate = invDateYmd && invDateYmd > todayYmd ? invDateYmd : todayYmd;

    const finalAmountToPay = Number(xeroInv.AmountDue ?? xeroInv.Total ?? invoiceRow.amount ?? 0);
    if (finalAmountToPay <= 0) {
      return {
        success: true,
        alreadyPaid: true,
        xeroInvoiceId: xeroInv.InvoiceID,
        invoiceNumber: xeroInv.InvoiceNumber || invoiceNumber,
      };
    }

    const paymentPayload = {
      Payments: [
        {
          Invoice: { InvoiceID: xeroInv.InvoiceID },
          Account: { AccountID: paymentAccount.AccountID },
          Date: paymentDate,
          Amount: parseFloat(finalAmountToPay.toFixed(2)),
          Reference: `Paid - ${xeroInv.InvoiceNumber || invoiceNumber}`,
        },
      ],
    };

    const payRes = await fetch('https://api.xero.com/api.xro/2.0/Payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Xero-Tenant-Id': tenantId,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(paymentPayload),
    });

    const payData = await payRes.json().catch(() => ({}));
    if (!payRes.ok) {
      if (payRes.status === 401 || payRes.status === 403) {
        return {
          success: false,
          error: "Xero permission 'accounting.payments' is required to mark invoices as Paid in Xero. Please go to Settings > Xero Integration and click 'Re-authorize with Xero' once.",
        };
      }
      const valError =
        payData?.Elements?.[0]?.ValidationErrors?.[0]?.Message ||
        payData?.Message ||
        payData?.Detail ||
        `HTTP ${payRes.status}`;
      return {
        success: false,
        error: `Xero Payment Error: ${valError}`,
      };
    }

    const createdPayment = payData?.Payments?.[0];
    console.log(
      `[XERO] Marked invoice ${xeroInv.InvoiceNumber || invoiceNumber} as PAID in Xero ($${finalAmountToPay.toFixed(2)} -> ${paymentAccount.Name})`
    );

    return {
      success: true,
      xeroInvoiceId: xeroInv.InvoiceID,
      invoiceNumber: xeroInv.InvoiceNumber || invoiceNumber,
      paymentId: createdPayment?.PaymentID,
      amountPaid: finalAmountToPay,
      accountName: paymentAccount.Name,
    };
  } catch (e: any) {
    console.error('[XERO] Error marking invoice paid in Xero:', e);
    return {
      success: false,
      error: e.message || 'Failed to mark invoice as Paid in Xero.',
    };
  }
}

/**
 * Reverses/deletes the payment on a Xero invoice when it is unmarked as Paid in the portal,
 * returning the invoice to Awaiting Payment (AUTHORISED) in Xero.
 */
export async function unmarkInvoicePaidInXero(
  db: any,
  invoiceId: number,
  fallbackInvoiceNumber?: string
): Promise<{
  success: boolean;
  skipped?: boolean;
  reason?: string;
  paymentsDeleted?: number;
  error?: string;
}> {
  try {
    const settings = getXeroSettings(db);
    if (!settings.xero_client_id) {
      return { success: false, skipped: true, reason: 'Xero is not configured.' };
    }

    const invoiceRow = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId) as any;
    if (!invoiceRow) {
      return { success: false, error: `Invoice #${invoiceId} not found.` };
    }

    const invoiceNumber = (invoiceRow.invoice_number || fallbackInvoiceNumber || '').trim();
    const xeroInvoiceId = (invoiceRow.xero_invoice_id || '').trim();

    if (!xeroInvoiceId && !invoiceNumber) {
      return { success: false, skipped: true, reason: 'No Invoice Number or Xero ID available.' };
    }

    const { accessToken, tenantId } = await getValidAccessToken(db, settings);
    const xeroInv = await findXeroInvoice(accessToken, tenantId, xeroInvoiceId, invoiceNumber);
    if (!xeroInv) {
      return { success: false, skipped: true, reason: 'Invoice not found in Xero.' };
    }

    const payments = Array.isArray(xeroInv.Payments)
      ? xeroInv.Payments.filter((p: any) => p.PaymentID && p.Status !== 'DELETED')
      : [];

    if (payments.length === 0) {
      return { success: true, skipped: true, reason: 'No active payments on Xero invoice.' };
    }

    let paymentsDeleted = 0;
    for (const p of payments) {
      const delRes = await fetch(`https://api.xero.com/api.xro/2.0/Payments/${encodeURIComponent(p.PaymentID)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Xero-Tenant-Id': tenantId,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          Payments: [{ PaymentID: p.PaymentID, Status: 'DELETED' }],
        }),
      });
      if (delRes.ok) {
        paymentsDeleted++;
      }
    }

    return {
      success: true,
      paymentsDeleted,
    };
  } catch (e: any) {
    console.warn('[XERO] Error reversing payment in Xero:', e);
    return {
      success: false,
      error: e.message || 'Failed to reverse payment in Xero.',
    };
  }
}

/**
 * Checks all Xero "Awaiting Payment" (AUTHORISED / SUBMITTED) invoices against
 * the Portal's PAID invoices and marks all matching invoices as PAID in Xero.
 */
export async function reconcilePaidInvoicesWithXero(
  db: any
): Promise<{
  success: boolean;
  totalAwaitingInXero: number;
  matchedCount: number;
  markedPaidCount: number;
  paidInvoiceNumbers: string[];
  accountName?: string;
  errors: string[];
  error?: string;
}> {
  try {
    const settings = getXeroSettings(db);
    if (!settings.xero_client_id) {
      return {
        success: false,
        totalAwaitingInXero: 0,
        matchedCount: 0,
        markedPaidCount: 0,
        paidInvoiceNumbers: [],
        errors: [],
        error: 'Xero is not configured in Settings.',
      };
    }

    const { accessToken, tenantId } = await getValidAccessToken(db, settings);

    // 1. Fetch all Awaiting Payment (AUTHORISED / SUBMITTED) ACCREC invoices from Xero in one call
    const whereClause = 'Type=="ACCREC"';
    const xeroUrl = `https://api.xero.com/api.xro/2.0/Invoices?Statuses=AUTHORISED,SUBMITTED&where=${encodeURIComponent(whereClause)}`;
    const invRes = await fetch(xeroUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Xero-Tenant-Id': tenantId,
        'Accept': 'application/json',
      },
    });

    const invData = await invRes.json().catch(() => ({}));
    if (!invRes.ok) {
      throw new Error(invData?.Message || `Failed to fetch Awaiting Payment invoices from Xero (HTTP ${invRes.status})`);
    }

    const awaitingXeroInvoices = (Array.isArray(invData?.Invoices) ? invData.Invoices : []).filter(
      (xInv: any) => Number(xInv.AmountDue ?? 0) > 0 && xInv.Status !== 'PAID' && xInv.Status !== 'VOIDED' && xInv.Status !== 'DELETED'
    );

    if (awaitingXeroInvoices.length === 0) {
      return {
        success: true,
        totalAwaitingInXero: 0,
        matchedCount: 0,
        markedPaidCount: 0,
        paidInvoiceNumbers: [],
        errors: [],
      };
    }

    // 2. Load all PAID invoices from Portal DB
    let timezone = 'Australia/Perth';
    let hcPrefix = 'HC-';
    let ndisPrefix = 'INV-';
    try {
      const sRows = db.prepare("SELECT key, value FROM settings WHERE key IN ('timezone', 'hcInvoicePrefix', 'ndisInvoicePrefix')").all() as any[];
      for (const r of sRows) {
        let v = r.value;
        try { v = JSON.parse(r.value); } catch {}
        if (r.key === 'timezone' && v) timezone = String(v).replace(/['"]+/g, '').trim() || 'Australia/Perth';
        if (r.key === 'hcInvoicePrefix' && v) hcPrefix = String(v);
        if (r.key === 'ndisInvoicePrefix' && v) ndisPrefix = String(v);
      }
    } catch {}

    const portalPaidInvoices = db.prepare(`
      SELECT i.*, s.start_time as shift_start_time, s.funding_type as shift_funding_type, c.funding_type as client_funding_type
      FROM invoices i
      LEFT JOIN shifts s ON i.shift_id = s.id
      LEFT JOIN clients c ON i.client_id = c.id
      WHERE i.status = 'PAID'
    `).all() as any[];

    const paidByXeroId = new Map<string, any>();
    const paidByInvNum = new Map<string, any>();

    for (const pInv of portalPaidInvoices) {
      if (pInv.xero_invoice_id) {
        paidByXeroId.set(String(pInv.xero_invoice_id).trim().toLowerCase(), pInv);
      }
      if (pInv.invoice_number) {
        paidByInvNum.set(String(pInv.invoice_number).trim().toLowerCase(), pInv);
      } else {
        // Compute fallback invoice number if invoice_number was null
        try {
          const dt = new Date(pInv.shift_start_time || pInv.created_at || Date.now());
          const ymd = formatInTimeZone(dt, timezone, 'yyyyMMdd');
          const ft = pInv.shift_funding_type || pInv.client_funding_type || 'NDIS';
          const isHc = ft === 'HCP' || ft === 'Home Care' || ft === 'HOME_CARE';
          const prefix = isHc ? hcPrefix : ndisPrefix;
          const fallbackNum = `${prefix}${ymd}-${String(pInv.shift_id || pInv.id).padStart(4, '0')}`;
          paidByInvNum.set(fallbackNum.toLowerCase(), pInv);
        } catch {}
      }
    }

    // 3. Find all Xero Awaiting Payment invoices that are PAID in Portal
    const matchedPairs: Array<{ xeroInv: any; portalInv: any }> = [];
    for (const xInv of awaitingXeroInvoices) {
      const xId = String(xInv.InvoiceID || '').trim().toLowerCase();
      const xNum = String(xInv.InvoiceNumber || '').trim().toLowerCase();

      const matchedPortal = (xId && paidByXeroId.get(xId)) || (xNum && paidByInvNum.get(xNum));
      if (matchedPortal) {
        matchedPairs.push({ xeroInv: xInv, portalInv: matchedPortal });
      }
    }

    if (matchedPairs.length === 0) {
      return {
        success: true,
        totalAwaitingInXero: awaitingXeroInvoices.length,
        matchedCount: 0,
        markedPaidCount: 0,
        paidInvoiceNumbers: [],
        errors: [],
      };
    }

    // 4. Resolve Xero Payment Bank Account
    const paymentAccount = await resolveXeroPaymentAccount(db, accessToken, tenantId);
    if (!paymentAccount) {
      return {
        success: false,
        totalAwaitingInXero: awaitingXeroInvoices.length,
        matchedCount: matchedPairs.length,
        markedPaidCount: 0,
        paidInvoiceNumbers: [],
        errors: [],
        error: 'No active Bank Account (or payment-enabled account) found in Xero Chart of Accounts.',
      };
    }

    const todayYmd = formatInTimeZone(new Date(), timezone, 'yyyy-MM-dd');
    const paymentsToCreate: Array<{ payload: any; invoiceNumber: string; portalId: number; xeroId: string }> = [];

    for (const { xeroInv, portalInv } of matchedPairs) {
      // Ensure local DB links xero_invoice_id & xero_status = 'SYNCED'
      if (xeroInv.InvoiceID && (portalInv.xero_invoice_id !== xeroInv.InvoiceID || portalInv.xero_status !== 'SYNCED')) {
        try {
          db.prepare(`
            UPDATE invoices
            SET xero_invoice_id = ?,
                xero_status = 'SYNCED',
                xero_synced_at = COALESCE(xero_synced_at, CURRENT_TIMESTAMP)
            WHERE id = ?
          `).run(xeroInv.InvoiceID, portalInv.id);
        } catch {}
      }

      // If Xero invoice is SUBMITTED, authorise it first
      if (xeroInv.Status === 'SUBMITTED' || xeroInv.Status === 'DRAFT') {
        try {
          await fetch('https://api.xero.com/api.xro/2.0/Invoices', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Xero-Tenant-Id': tenantId,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({
              Invoices: [{ InvoiceID: xeroInv.InvoiceID, Status: 'AUTHORISED' }],
            }),
          });
        } catch {}
      }

      let invDateYmd = '';
      if (xeroInv.DateString) {
        invDateYmd = String(xeroInv.DateString).split('T')[0];
      } else if (xeroInv.Date) {
        invDateYmd = formatXeroDate(xeroInv.Date);
      }
      const paymentDate = invDateYmd && invDateYmd > todayYmd ? invDateYmd : todayYmd;
      const amountToPay = Number(xeroInv.AmountDue ?? xeroInv.Total ?? portalInv.amount ?? 0);
      const invNumLabel = xeroInv.InvoiceNumber || portalInv.invoice_number || `INV-${portalInv.id}`;

      if (amountToPay > 0) {
        paymentsToCreate.push({
          invoiceNumber: invNumLabel,
          portalId: portalInv.id,
          xeroId: xeroInv.InvoiceID,
          payload: {
            Invoice: { InvoiceID: xeroInv.InvoiceID },
            Account: { AccountID: paymentAccount.AccountID },
            Date: paymentDate,
            Amount: parseFloat(amountToPay.toFixed(2)),
            Reference: `Paid - ${invNumLabel}`,
          },
        });
      }
    }

    const paidInvoiceNumbers: string[] = [];
    const errors: string[] = [];

    // 5. Submit payments to Xero (batch first, fallback to individual if batch has validation error)
    const batchRes = await fetch('https://api.xero.com/api.xro/2.0/Payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Xero-Tenant-Id': tenantId,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        Payments: paymentsToCreate.map((p) => p.payload),
      }),
    });

    if (batchRes.ok) {
      for (const item of paymentsToCreate) {
        paidInvoiceNumbers.push(item.invoiceNumber);
      }
    } else if (batchRes.status === 401 || batchRes.status === 403) {
      return {
        success: false,
        totalAwaitingInXero: awaitingXeroInvoices.length,
        matchedCount: matchedPairs.length,
        markedPaidCount: 0,
        paidInvoiceNumbers: [],
        errors: [],
        error: "Xero permission 'accounting.payments' is required to mark invoices as Paid in Xero. Please go to Settings > Xero Integration and click 'Re-authorize with Xero' once.",
      };
    } else {
      // Fallback: submit one by one so valid invoices succeed even if one fails validation
      for (const item of paymentsToCreate) {
        try {
          const singleRes = await fetch('https://api.xero.com/api.xro/2.0/Payments', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Xero-Tenant-Id': tenantId,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({ Payments: [item.payload] }),
          });
          if (singleRes.ok) {
            paidInvoiceNumbers.push(item.invoiceNumber);
          } else {
            const errData = await singleRes.json().catch(() => ({}));
            const msg =
              errData?.Elements?.[0]?.ValidationErrors?.[0]?.Message ||
              errData?.Message ||
              `HTTP ${singleRes.status}`;
            errors.push(`${item.invoiceNumber}: ${msg}`);
          }
        } catch (sErr: any) {
          errors.push(`${item.invoiceNumber}: ${sErr.message}`);
        }
      }
    }

    return {
      success: true,
      totalAwaitingInXero: awaitingXeroInvoices.length,
      matchedCount: matchedPairs.length,
      markedPaidCount: paidInvoiceNumbers.length,
      paidInvoiceNumbers,
      accountName: paymentAccount.Name,
      errors,
    };
  } catch (e: any) {
    console.error('[XERO] Error reconciling paid invoices with Xero:', e);
    return {
      success: false,
      totalAwaitingInXero: 0,
      matchedCount: 0,
      markedPaidCount: 0,
      paidInvoiceNumbers: [],
      errors: [],
      error: e.message || 'Failed to reconcile Paid invoices with Xero.',
    };
  }
}

let isXeroTabFailsafeRunning = false;

/**
 * Background failsafe scanner triggered when viewing the "Sent" or "Paid" tabs.
 * - For "sent": Ensures all SENT portal invoices are uploaded to Xero as AUTHORISED ("Awaiting Payment") and linked with xero_invoice_id & xero_status = 'SYNCED'.
 * - For "paid": Ensures all PAID portal invoices (including older historical invoices not yet uploaded to Xero) are uploaded to Xero, linked with xero_invoice_id & xero_status = 'SYNCED', and marked as PAID in Xero.
 */
export async function runXeroTabFailsafe(
  db: any,
  tab: 'sent' | 'paid',
  getInvoiceDataHelpers?: {
    getShiftData?: (id: number) => any;
    getMergedData?: (row: any) => any;
    getRespiteData?: (id: number) => any;
    buildPdf?: (doc: any, data: any) => void;
  }
): Promise<{
  success: boolean;
  alreadyRunning?: boolean;
  skipped?: boolean;
  tab: 'sent' | 'paid';
  updatedCount: number;
  uploadedCount: number;
  linkedCount: number;
  markedPaidCount: number;
  remainingCount?: number;
  rateLimited?: boolean;
  needsReconnect?: boolean;
  syncedInvoiceNumbers: string[];
  errors: string[];
  error?: string;
}> {
  if (isXeroTabFailsafeRunning) {
    return {
      success: true,
      alreadyRunning: true,
      tab,
      updatedCount: 0,
      uploadedCount: 0,
      linkedCount: 0,
      markedPaidCount: 0,
      remainingCount: 0,
      syncedInvoiceNumbers: [],
      errors: [],
    };
  }

  isXeroTabFailsafeRunning = true;
  try {
    const settings = getXeroSettings(db);
    if (!settings.xero_client_id) {
      return {
        success: true,
        skipped: true,
        tab,
        updatedCount: 0,
        uploadedCount: 0,
        linkedCount: 0,
        markedPaidCount: 0,
        remainingCount: 0,
        syncedInvoiceNumbers: [],
        errors: [],
      };
    }

    const computePortalInvoiceNum = (inv: any): string => {
      if (inv.invoice_number && String(inv.invoice_number).trim()) {
        return String(inv.invoice_number).trim();
      }
      if (getInvoiceDataHelpers) {
        try {
          let d: any = null;
          if (inv.services_json && getInvoiceDataHelpers.getMergedData) {
            d = getInvoiceDataHelpers.getMergedData(inv);
          } else if (inv.respite_booking_id && getInvoiceDataHelpers.getRespiteData) {
            d = getInvoiceDataHelpers.getRespiteData(inv.respite_booking_id);
          } else if (inv.shift_id && getInvoiceDataHelpers.getShiftData) {
            d = getInvoiceDataHelpers.getShiftData(inv.shift_id);
          }
          if (d?.invoiceNum) return String(d.invoiceNum).trim();
        } catch {}
      }
      const dt = new Date(inv.shift_start_time || inv.created_at || Date.now());
      const yyyymmdd = !isNaN(dt.getTime())
        ? `${dt.getFullYear()}${String(dt.getMonth() + 1).padStart(2, '0')}${String(dt.getDate()).padStart(2, '0')}`
        : new Date().toISOString().slice(0, 10).replace(/-/g, '');
      return `INV-${yyyymmdd}-${String(inv.shift_id || inv.id).padStart(4, '0')}`;
    };

    const MAX_UPLOADS_PER_BATCH = 12; // ~24 API calls (Invoice + PDF Attachment), keeping well within Xero's 60 calls/min limit & avoiding HTTP timeouts
    const syncedInvoiceNumbers: string[] = [];
    const errors: string[] = [];
    let uploadedCount = 0;
    let linkedCount = 0;
    let markedPaidCount = 0;
    let remainingCount = 0;
    let rateLimited = false;
    let needsReconnect = false;

    if (tab === 'sent') {
      const unsyncedSent = db.prepare(`
        SELECT i.*, s.start_time as shift_start_time
        FROM invoices i
        LEFT JOIN shifts s ON i.shift_id = s.id
        WHERE i.status = 'SENT'
          AND (i.xero_status IS NULL OR i.xero_status != 'SYNCED' OR i.xero_invoice_id IS NULL OR i.xero_invoice_id = '')
        ORDER BY i.id DESC
      `).all() as any[];

      if (unsyncedSent.length === 0) {
        return {
          success: true,
          tab,
          updatedCount: 0,
          uploadedCount: 0,
          linkedCount: 0,
          markedPaidCount: 0,
          remainingCount: 0,
          syncedInvoiceNumbers: [],
          errors: [],
        };
      }

      const { accessToken, tenantId } = await getValidAccessToken(db, settings);

      // Fetch existing ACCREC invoices from Xero so we can link any already-uploaded ones first
      const xeroByNum = new Map<string, any>();
      const xeroById = new Map<string, any>();
      try {
        const listRes = await fetch(
          `https://api.xero.com/api.xro/2.0/Invoices?where=${encodeURIComponent('Type=="ACCREC"')}&summaryOnly=true`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Xero-Tenant-Id': tenantId,
              'Accept': 'application/json',
            },
          }
        );
        if (listRes.ok) {
          const listData = await listRes.json().catch(() => ({}));
          for (const xInv of Array.isArray(listData?.Invoices) ? listData.Invoices : []) {
            if (xInv.Status === 'VOIDED' || xInv.Status === 'DELETED') continue;
            if (xInv.InvoiceID) xeroById.set(String(xInv.InvoiceID).toLowerCase(), xInv);
            if (xInv.InvoiceNumber) xeroByNum.set(String(xInv.InvoiceNumber).trim().toLowerCase(), xInv);
          }
        }
      } catch {}

      const needUploadSent: Array<{ inv: any; invNum: string }> = [];

      for (const inv of unsyncedSent) {
        const invNum = computePortalInvoiceNum(inv);
        const existingXero =
          (inv.xero_invoice_id && xeroById.get(String(inv.xero_invoice_id).toLowerCase())) ||
          xeroByNum.get(invNum.toLowerCase());

        if (existingXero && existingXero.InvoiceID) {
          // If it's DRAFT or SUBMITTED in Xero, promote to AUTHORISED ("Awaiting Payment")
          if (existingXero.Status === 'DRAFT' || existingXero.Status === 'SUBMITTED') {
            try {
              await fetch('https://api.xero.com/api.xro/2.0/Invoices', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Xero-Tenant-Id': tenantId,
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                },
                body: JSON.stringify({
                  Invoices: [{ InvoiceID: existingXero.InvoiceID, Status: 'AUTHORISED' }],
                }),
              });
            } catch {}
          }
          db.prepare(`
            UPDATE invoices
            SET xero_invoice_id = ?,
                xero_status = 'SYNCED',
                xero_synced_at = COALESCE(xero_synced_at, CURRENT_TIMESTAMP),
                invoice_number = COALESCE(invoice_number, ?)
            WHERE id = ?
          `).run(existingXero.InvoiceID, invNum, inv.id);
          linkedCount++;
          syncedInvoiceNumbers.push(invNum);
        } else {
          needUploadSent.push({ inv, invNum });
        }
      }

      const batchSent = needUploadSent.slice(0, MAX_UPLOADS_PER_BATCH);
      remainingCount = Math.max(0, needUploadSent.length - batchSent.length);

      for (const { inv, invNum } of batchSent) {
        try {
          const syncRes = await syncInvoiceToXero(db, inv.id, {
            force: true,
            source: 'manual',
            getInvoiceDataHelpers,
          });
          if (syncRes.success && syncRes.xeroInvoiceId) {
            if (!inv.invoice_number && invNum) {
              try {
                db.prepare('UPDATE invoices SET invoice_number = COALESCE(invoice_number, ?) WHERE id = ?').run(invNum, inv.id);
              } catch {}
            }
            uploadedCount++;
            syncedInvoiceNumbers.push(syncRes.invoiceNumber || invNum);
          }
        } catch (upErr: any) {
          if (String(upErr.message).includes('XERO_RATE_LIMIT')) {
            rateLimited = true;
            remainingCount = needUploadSent.length - uploadedCount;
            break;
          }
          errors.push(`${invNum}: ${upErr.message}`);
        }
      }

      return {
        success: true,
        tab,
        updatedCount: uploadedCount + linkedCount,
        uploadedCount,
        linkedCount,
        markedPaidCount: 0,
        remainingCount,
        rateLimited,
        syncedInvoiceNumbers,
        errors,
      };
    }

    // --- TAB === 'paid' ---
    const allPaidPortal = db.prepare(`
      SELECT i.*, s.start_time as shift_start_time
      FROM invoices i
      LEFT JOIN shifts s ON i.shift_id = s.id
      WHERE i.status = 'PAID'
      ORDER BY i.id DESC
    `).all() as any[];

    if (allPaidPortal.length === 0) {
      return {
        success: true,
        tab,
        updatedCount: 0,
        uploadedCount: 0,
        linkedCount: 0,
        markedPaidCount: 0,
        remainingCount: 0,
        syncedInvoiceNumbers: [],
        errors: [],
      };
    }

    let { accessToken, tenantId } = await getValidAccessToken(db, settings);

    // Fetch ACCREC invoices from Xero:
    // 1) Specifically fetch all AUTHORISED, SUBMITTED, and DRAFT invoices so we never miss any unpaid invoice even if Xero has >100 total invoices
    // 2) Also fetch general ACCREC summary list to link any already-PAID Xero invoices
    const xeroByNum = new Map<string, any>();
    const xeroById = new Map<string, any>();
    const ingestXeroList = (invoicesArr: any[]) => {
      for (const xInv of Array.isArray(invoicesArr) ? invoicesArr : []) {
        if (xInv.Status === 'VOIDED' || xInv.Status === 'DELETED') continue;
        if (xInv.InvoiceID) xeroById.set(String(xInv.InvoiceID).toLowerCase(), xInv);
        if (xInv.InvoiceNumber) xeroByNum.set(String(xInv.InvoiceNumber).trim().toLowerCase(), xInv);
      }
    };

    try {
      const unpaidRes = await fetch(
        `https://api.xero.com/api.xro/2.0/Invoices?Statuses=AUTHORISED,SUBMITTED,DRAFT&where=${encodeURIComponent('Type=="ACCREC"')}&summaryOnly=true`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Xero-Tenant-Id': tenantId,
            'Accept': 'application/json',
          },
        }
      );
      if (unpaidRes.ok) {
        const unpaidData = await unpaidRes.json().catch(() => ({}));
        ingestXeroList(unpaidData?.Invoices);
      }
    } catch {}

    try {
      const listRes = await fetch(
        `https://api.xero.com/api.xro/2.0/Invoices?where=${encodeURIComponent('Type=="ACCREC"')}&summaryOnly=true`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Xero-Tenant-Id': tenantId,
            'Accept': 'application/json',
          },
        }
      );
      if (listRes.ok) {
        const listData = await listRes.json().catch(() => ({}));
        ingestXeroList(listData?.Invoices);
      }
    } catch {}

    type PaymentQueueItem = {
      xeroInvoiceId: string;
      invoiceNumber: string;
      amount: number;
      invoiceDateYmd: string;
      statusInXero: string;
    };

    const existingAwaitingPaymentQueue: PaymentQueueItem[] = [];
    const needUploadPaid: Array<{ inv: any; invNum: string; portalHistYmd: string }> = [];

    let timezone = 'Australia/Perth';
    try {
      const tzRow = db.prepare("SELECT value FROM settings WHERE key = 'timezone'").get() as any;
      if (tzRow?.value) {
        timezone = String(tzRow.value).replace(/['"]+/g, '').trim() || 'Australia/Perth';
      }
    } catch {}
    const todayYmd = formatInTimeZone(new Date(), timezone, 'yyyy-MM-dd');

    for (const inv of allPaidPortal) {
      const invNum = computePortalInvoiceNum(inv);
      const isLocallySynced = inv.xero_status === 'SYNCED' && Boolean(inv.xero_invoice_id);
      const existingXero =
        (inv.xero_invoice_id && xeroById.get(String(inv.xero_invoice_id).toLowerCase())) ||
        xeroByNum.get(invNum.toLowerCase());

      const rawHistDate = new Date(inv.shift_start_time || inv.created_at || Date.now());
      const portalHistYmd = !isNaN(rawHistDate.getTime())
        ? rawHistDate.toISOString().split('T')[0]
        : todayYmd;

      if (existingXero && existingXero.InvoiceID) {
        // Ensure local DB has xero_invoice_id and xero_status = 'SYNCED'
        if (!isLocallySynced || inv.xero_invoice_id !== existingXero.InvoiceID) {
          db.prepare(`
            UPDATE invoices
            SET xero_invoice_id = ?,
                xero_status = 'SYNCED',
                xero_synced_at = COALESCE(xero_synced_at, CURRENT_TIMESTAMP),
                invoice_number = COALESCE(invoice_number, ?)
            WHERE id = ?
          `).run(existingXero.InvoiceID, invNum, inv.id);
          linkedCount++;
          syncedInvoiceNumbers.push(invNum);
        }

        // Check if this Xero invoice is still "Awaiting Payment" (not PAID yet)
        const amtDue = Number(existingXero.AmountDue ?? existingXero.Total ?? inv.amount ?? 0);
        if (existingXero.Status !== 'PAID' && amtDue > 0) {
          let xDateYmd = portalHistYmd;
          if (existingXero.DateString) {
            xDateYmd = String(existingXero.DateString).split('T')[0];
          } else if (existingXero.Date) {
            xDateYmd = formatXeroDate(existingXero.Date) || portalHistYmd;
          }
          existingAwaitingPaymentQueue.push({
            xeroInvoiceId: existingXero.InvoiceID,
            invoiceNumber: existingXero.InvoiceNumber || invNum,
            amount: amtDue,
            invoiceDateYmd: xDateYmd,
            statusInXero: existingXero.Status,
          });
        }
      } else if (!isLocallySynced) {
        needUploadPaid.push({ inv, invNum, portalHistYmd });
      }
    }

    // Helper to apply payments in Xero for a queue of invoices
    let cachedPaymentAccount: { AccountID: string; Code?: string; Name: string } | null | undefined = undefined;
    let paymentScopeForbidden = false;

    const applyBatchPayments = async (queue: PaymentQueueItem[]) => {
      if (queue.length === 0 || paymentScopeForbidden || rateLimited) return;

      if (cachedPaymentAccount === undefined) {
        try {
          cachedPaymentAccount = await resolveXeroPaymentAccount(db, accessToken, tenantId);
        } catch (accErr: any) {
          console.error('[XERO] Error resolving Xero payment account:', accErr.message);
          errors.push(`Payment Account Error: ${accErr.message}`);
          cachedPaymentAccount = null;
        }
      }

      if (!cachedPaymentAccount) {
        if (!errors.some((e) => e.includes('Bank Account'))) {
          errors.push('No active Bank Account (or payment-enabled account) found in Xero Chart of Accounts to record payments.');
        }
        return;
      }

      // Promote any DRAFT/SUBMITTED invoices to AUTHORISED in a single batch call first
      const toAuthorise = queue.filter((q) => q.statusInXero === 'DRAFT' || q.statusInXero === 'SUBMITTED');
      if (toAuthorise.length > 0) {
        try {
          await fetch('https://api.xero.com/api.xro/2.0/Invoices?SummarizeErrors=false', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Xero-Tenant-Id': tenantId,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({
              Invoices: toAuthorise.map((q) => ({ InvoiceID: q.xeroInvoiceId, Status: 'AUTHORISED' })),
            }),
          });
        } catch {}
      }

      const paymentItems = queue.map((qItem) => {
        const payDate = qItem.invoiceDateYmd && qItem.invoiceDateYmd > todayYmd ? qItem.invoiceDateYmd : todayYmd;
        return {
          invoiceNumber: qItem.invoiceNumber,
          xeroInvoiceId: qItem.xeroInvoiceId,
          payload: {
            Invoice: { InvoiceID: qItem.xeroInvoiceId },
            Account: { AccountID: cachedPaymentAccount!.AccountID },
            Date: payDate,
            Amount: parseFloat(qItem.amount.toFixed(2)),
            Reference: `Paid - ${qItem.invoiceNumber}`,
          },
        };
      });

      const BATCH_SIZE = 25;
      for (let i = 0; i < paymentItems.length; i += BATCH_SIZE) {
        const chunk = paymentItems.slice(i, i + BATCH_SIZE);
        let batchRes = await fetch('https://api.xero.com/api.xro/2.0/Payments?SummarizeErrors=false', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Xero-Tenant-Id': tenantId,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ Payments: chunk.map((c) => c.payload) }),
        });

        // If 401/403 in client_credentials mode, force a fresh token once in case Custom Connection scopes were recently updated
        if ((batchRes.status === 401 || batchRes.status === 403) && settings.xero_auth_type === 'client_credentials') {
          try {
            saveXeroSetting(db, 'xero_token_expires_at', 0);
            const refreshed = await getValidAccessToken(db);
            accessToken = refreshed.accessToken;
            tenantId = refreshed.tenantId;
            batchRes = await fetch('https://api.xero.com/api.xro/2.0/Payments?SummarizeErrors=false', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Xero-Tenant-Id': tenantId,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
              body: JSON.stringify({ Payments: chunk.map((c) => c.payload) }),
            });
          } catch {}
        }

        if (batchRes.status === 401 || batchRes.status === 403) {
          const rawAuthErr = await batchRes.text().catch(() => '');
          console.error(`[XERO] HTTP ${batchRes.status} on POST /Payments (missing accounting.payments scope):`, rawAuthErr);
          paymentScopeForbidden = true;
          needsReconnect = true;
          errors.push(
            "Xero permission 'accounting.payments' is required to mark invoices as Paid in Xero. Please enable 'accounting.payments' in developer.xero.com and click 'Re-authorize with Xero' in Settings > Xero Integration."
          );
          return;
        }

        if (batchRes.status === 429) {
          console.warn('[XERO] Rate limit (HTTP 429) hit during POST /Payments');
          rateLimited = true;
          return;
        }

        const rawPayText = await batchRes.text().catch(() => '');
        let batchData: any = {};
        try {
          batchData = rawPayText ? JSON.parse(rawPayText) : {};
        } catch {}

        const returnedPayments: any[] = Array.isArray(batchData?.Payments) ? batchData.Payments : [];

        if (returnedPayments.length > 0) {
          for (let idx = 0; idx < returnedPayments.length; idx++) {
            const pElem = returnedPayments[idx];
            const sourceItem = chunk[idx] || chunk.find((c) => c.xeroInvoiceId === pElem?.Invoice?.InvoiceID);
            const hasErr =
              pElem?.HasErrors === true ||
              (Array.isArray(pElem?.ValidationErrors) && pElem.ValidationErrors.length > 0);

            if (!hasErr) {
              markedPaidCount++;
              if (sourceItem?.invoiceNumber) syncedInvoiceNumbers.push(sourceItem.invoiceNumber);
            } else if (sourceItem) {
              // Retry single item with fresh AmountDue from Xero in case GST rounding differed by 1 cent
              try {
                const freshInv = await findXeroInvoice(accessToken, tenantId, sourceItem.xeroInvoiceId, sourceItem.invoiceNumber);
                if (freshInv) {
                  if (freshInv.Status === 'PAID' || Number(freshInv.AmountDue ?? 0) <= 0) {
                    markedPaidCount++;
                    syncedInvoiceNumbers.push(sourceItem.invoiceNumber);
                    continue;
                  }
                  sourceItem.payload.Amount = parseFloat(Number(freshInv.AmountDue).toFixed(2));
                  if (freshInv.DateString) {
                    const fDate = String(freshInv.DateString).split('T')[0];
                    if (fDate > sourceItem.payload.Date) {
                      sourceItem.payload.Date = fDate;
                    }
                  }
                }
                const singleRes = await fetch('https://api.xro/2.0/Payments'.replace('api.xro', 'api.xero.com/api.xro'), {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Xero-Tenant-Id': tenantId,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                  },
                  body: JSON.stringify({ Payments: [sourceItem.payload] }),
                });
                if (singleRes.ok) {
                  markedPaidCount++;
                  syncedInvoiceNumbers.push(sourceItem.invoiceNumber);
                } else {
                  const errMsg =
                    pElem?.ValidationErrors?.[0]?.Message ||
                    `HTTP ${singleRes.status}`;
                  console.warn(`[XERO] Payment validation warning for ${sourceItem.invoiceNumber}: ${errMsg}`);
                  errors.push(`${sourceItem.invoiceNumber}: ${errMsg}`);
                }
              } catch (sErr: any) {
                errors.push(`${sourceItem.invoiceNumber}: ${sErr.message}`);
              }
            }
          }
        } else if (batchRes.ok) {
          markedPaidCount += chunk.length;
          for (const c of chunk) syncedInvoiceNumbers.push(c.invoiceNumber);
        } else {
          const msg =
            batchData?.Elements?.[0]?.ValidationErrors?.[0]?.Message ||
            batchData?.Message ||
            batchData?.Detail ||
            `HTTP ${batchRes.status}`;
          console.error(`[XERO] Batch payment error (HTTP ${batchRes.status}):`, rawPayText || batchData);
          errors.push(`Xero Payment Error: ${msg}`);
        }
      }
    };

    // STEP 1: Immediately mark all Paid portal invoices that ALREADY exist in Xero as Paid FIRST!
    // This ensures invoices already in Xero (e.g. top rows in Paid tab) are marked Paid in <2s before any heavy uploads run.
    if (existingAwaitingPaymentQueue.length > 0) {
      await applyBatchPayments(existingAwaitingPaymentQueue);
    }

    // If Xero rejected /Payments with 401/403 (missing accounting.payments scope), stop immediately and report clearly
    if (paymentScopeForbidden) {
      return {
        success: false,
        needsReconnect: true,
        tab,
        updatedCount: linkedCount + markedPaidCount,
        uploadedCount: 0,
        linkedCount,
        markedPaidCount,
        remainingCount: needUploadPaid.length,
        syncedInvoiceNumbers: Array.from(new Set(syncedInvoiceNumbers)),
        errors,
        error: errors[0] || "Xero permission 'accounting.payments' is required to mark invoices as Paid in Xero.",
      };
    }

    // STEP 2: Upload a safe rate-limited batch (up to 12) of older historical Paid invoices not yet in Xero, then immediately mark them Paid
    const batchPaidToUpload = needUploadPaid.slice(0, MAX_UPLOADS_PER_BATCH);
    remainingCount = Math.max(0, needUploadPaid.length - batchPaidToUpload.length);
    const newlyUploadedPaymentQueue: PaymentQueueItem[] = [];

    for (const { inv, invNum, portalHistYmd } of batchPaidToUpload) {
      if (rateLimited) break;
      try {
        const syncRes = await syncInvoiceToXero(db, inv.id, {
          force: true,
          source: 'manual',
          getInvoiceDataHelpers,
        });
        if (syncRes.success && syncRes.xeroInvoiceId) {
          if (!inv.invoice_number && invNum) {
            try {
              db.prepare('UPDATE invoices SET invoice_number = COALESCE(invoice_number, ?) WHERE id = ?').run(invNum, inv.id);
            } catch {}
          }
          uploadedCount++;
          syncedInvoiceNumbers.push(syncRes.invoiceNumber || invNum);
          const amt = Number(syncRes.xeroAmountDue || inv.amount || 0);
          if (amt > 0) {
            newlyUploadedPaymentQueue.push({
              xeroInvoiceId: syncRes.xeroInvoiceId,
              invoiceNumber: syncRes.invoiceNumber || invNum,
              amount: amt,
              invoiceDateYmd: syncRes.xeroDateString || portalHistYmd,
              statusInXero: 'AUTHORISED',
            });
          }
        }
      } catch (upErr: any) {
        if (String(upErr.message).includes('XERO_RATE_LIMIT')) {
          rateLimited = true;
          remainingCount = needUploadPaid.length - uploadedCount;
          break;
        }
        errors.push(`${invNum}: ${upErr.message}`);
      }
    }

    // Immediately mark the newly uploaded batch of Paid invoices as PAID in Xero
    if (newlyUploadedPaymentQueue.length > 0 && !paymentScopeForbidden) {
      await applyBatchPayments(newlyUploadedPaymentQueue);
    }

    return {
      success: !paymentScopeForbidden,
      needsReconnect,
      tab,
      updatedCount: uploadedCount + linkedCount + markedPaidCount,
      uploadedCount,
      linkedCount,
      markedPaidCount,
      remainingCount,
      rateLimited,
      syncedInvoiceNumbers: Array.from(new Set(syncedInvoiceNumbers)),
      errors,
      error: paymentScopeForbidden ? errors[0] : undefined,
    };
  } catch (e: any) {
    console.error(`[XERO] Tab failsafe (${tab}) error:`, e);
    return {
      success: false,
      tab,
      updatedCount: 0,
      uploadedCount: 0,
      linkedCount: 0,
      markedPaidCount: 0,
      remainingCount: 0,
      syncedInvoiceNumbers: [],
      errors: [],
      error: e.message || 'Xero failsafe check failed.',
    };
  } finally {
    isXeroTabFailsafeRunning = false;
  }
}

export async function bulkVoidAwaitingPaymentInvoicesInXero(db: any): Promise<{
  success: boolean;
  totalFound: number;
  voidedCount: number;
  failedCount: number;
  voidedInvoiceNumbers: string[];
  errors: string[];
  error?: string;
}> {
  try {
    const auth = await getValidAccessToken(db);
    const { accessToken, tenantId } = auth;

    let totalFound = 0;
    let voidedCount = 0;
    let failedCount = 0;
    const voidedInvoiceNumbers: string[] = [];
    const errors: string[] = [];
    const attemptedIds = new Set<string>();

    // Loop up to 10 passes in case Xero paginates >100 AUTHORISED invoices
    for (let pass = 0; pass < 10; pass++) {
      const listUrl = `https://api.xero.com/api.xro/2.0/Invoices?Statuses=AUTHORISED&where=${encodeURIComponent('Type=="ACCREC"')}&summaryOnly=true`;
      const listRes = await fetch(listUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Xero-Tenant-Id': tenantId,
          'Accept': 'application/json',
        },
      });

      if (!listRes.ok) {
        const errText = await listRes.text().catch(() => '');
        throw new Error(`Failed to fetch Awaiting Payment invoices from Xero (HTTP ${listRes.status}): ${errText.slice(0, 200)}`);
      }

      const listData = await listRes.json().catch(() => ({}));
      const allAuthorised = (Array.isArray(listData?.Invoices) ? listData.Invoices : []).filter(
        (inv: any) => inv.InvoiceID && inv.Status === 'AUTHORISED' && (!inv.Type || inv.Type === 'ACCREC') && !attemptedIds.has(inv.InvoiceID)
      );

      if (allAuthorised.length === 0) {
        break;
      }

      totalFound += allAuthorised.length;
      for (const inv of allAuthorised) {
        attemptedIds.add(inv.InvoiceID);
      }

      // Void in batches of 50 per POST request
      const BATCH_SIZE = 50;
      for (let i = 0; i < allAuthorised.length; i += BATCH_SIZE) {
        const chunk = allAuthorised.slice(i, i + BATCH_SIZE);
        const payload = {
          Invoices: chunk.map((inv: any) => ({
            InvoiceID: inv.InvoiceID,
            Status: 'VOIDED',
          })),
        };

        const voidRes = await fetch('https://api.xero.com/api.xro/2.0/Invoices?summarizeErrors=false', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Xero-Tenant-Id': tenantId,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (voidRes.status === 429) {
          errors.push('Xero API rate limit reached (60 calls/min). Please wait 60 seconds and click the button again to void remaining invoices.');
          break;
        }

        const voidData = await voidRes.json().catch(() => ({}));
        const returnedInvoices = Array.isArray(voidData?.Invoices) ? voidData.Invoices : [];

        if (returnedInvoices.length > 0) {
          for (let idx = 0; idx < returnedInvoices.length; idx++) {
            const rInv = returnedInvoices[idx];
            const srcInv = chunk[idx] || {};
            const invNum = rInv.InvoiceNumber || srcInv.InvoiceNumber || rInv.InvoiceID;
            if (rInv.HasErrors || (Array.isArray(rInv.ValidationErrors) && rInv.ValidationErrors.length > 0)) {
              failedCount++;
              const errMsg = rInv.ValidationErrors?.map((v: any) => v.Message).join('; ') || 'Could not void invoice';
              errors.push(`${invNum}: ${errMsg}`);
            } else if (rInv.Status === 'VOIDED') {
              voidedCount++;
              if (invNum) voidedInvoiceNumbers.push(invNum);
            }
          }
        } else if (voidRes.ok) {
          voidedCount += chunk.length;
          for (const c of chunk) {
            if (c.InvoiceNumber) voidedInvoiceNumbers.push(c.InvoiceNumber);
          }
        } else {
          failedCount += chunk.length;
          const msg = voidData?.Message || voidData?.Detail || `HTTP ${voidRes.status}`;
          errors.push(`Batch void error: ${msg}`);
        }
      }

      if (allAuthorised.length < 100) {
        break;
      }
    }

    // Clear Xero sync flags on local invoices table
    try {
      db.prepare(`
        UPDATE invoices
        SET xero_status = NULL,
            xero_invoice_id = NULL,
            xero_synced_at = NULL
        WHERE xero_status IS NOT NULL OR xero_invoice_id IS NOT NULL
      `).run();
    } catch {}

    return {
      success: true,
      totalFound,
      voidedCount,
      failedCount,
      voidedInvoiceNumbers,
      errors,
    };
  } catch (e: any) {
    console.error('[XERO] Error bulk voiding Awaiting Payment invoices:', e);
    return {
      success: false,
      totalFound: 0,
      voidedCount: 0,
      failedCount: 0,
      voidedInvoiceNumbers: [],
      errors: [e.message || 'Failed to bulk void Awaiting Payment invoices in Xero.'],
      error: e.message || 'Failed to bulk void Awaiting Payment invoices in Xero.',
    };
  }
}

