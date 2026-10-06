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
      'accounting.invoices accounting.contacts accounting.settings.read accounting.attachments payroll.settings payroll.settings.read payroll.employees payroll.employees.read payroll.timesheets payroll.payruns payroll.payruns.read payroll.payslip payroll.payslip.read',
      'accounting.invoices accounting.contacts accounting.settings.read accounting.attachments payroll.settings payroll.settings.read payroll.employees payroll.employees.read payroll.timesheets payroll.payruns payroll.payslip',
      'accounting.invoices accounting.contacts accounting.settings.read accounting.attachments payroll.settings payroll.settings.read payroll.employees payroll.employees.read payroll.timesheets',
      'accounting.invoices accounting.contacts accounting.settings.read accounting.attachments payroll.settings payroll.settings.read payroll.employees.read',
      'accounting.invoices accounting.contacts accounting.settings.read accounting.attachments payroll.settings payroll.settings.read',
      'accounting.invoices accounting.contacts accounting.settings.read accounting.attachments payroll.settings.read',
      'accounting.invoices accounting.contacts accounting.settings.read accounting.attachments payroll.settings',
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
           c.first_name, c.last_name, c.funding_type as client_funding_type,
           c.ndis_number, c.my_aged_care_id,
           p.company_name as provider_company_name,
           p.contact_name as provider_contact_name,
           p.email as provider_email,
           p.submission_method
    FROM invoices i
    JOIN clients c ON i.client_id = c.id
    LEFT JOIN providers p ON c.provider_id = p.id
    WHERE i.id = ?
  `).get(invoiceId) as any;

  if (!invoiceRow) {
    throw new Error(`Invoice #${invoiceId} not found.`);
  }

  // 2. Obtain valid token and tenant
  const { accessToken, tenantId, tenantName } = await getValidAccessToken(db, settings);

  const clientName = `${invoiceRow.first_name || ''} ${invoiceRow.last_name || ''}`.trim() || 'Client';
  const invoiceNumber = invoiceRow.invoice_number || `INV-${invoiceId}`;

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
          filename = invoiceRow.file_path;
          break;
        }
      }
    }
  }

  // If we have helper callbacks, gather structured data
  if (options?.getInvoiceDataHelpers) {
    const { getShiftData, getMergedData, getRespiteData, buildPdf } = options.getInvoiceDataHelpers;
    let data: any = null;

    if (invoiceRow.services_json && getMergedData) {
      data = getMergedData(invoiceRow);
    } else if (invoiceRow.respite_booking_id && getRespiteData) {
      data = getRespiteData(invoiceRow.respite_booking_id);
    } else if (invoiceRow.shift_id && getShiftData) {
      data = getShiftData(invoiceRow.shift_id);
    }

    if (data) {
      if (Array.isArray(data.lineItems) && data.lineItems.length > 0) {
        lineItems = data.lineItems;
      }
      if (data.gstAmount && Number(data.gstAmount) > 0) {
        isGstApplicable = true;
      }
      if (data.invoiceNum) {
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
    lineItems.push({
      serviceName: `Support Services - ${clientName}`,
      date: invoiceRow.created_at ? new Date(invoiceRow.created_at).toISOString().split('T')[0] : '',
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

    return {
      Description: descParts.join(' ').trim(),
      Quantity: qty,
      UnitAmount: parseFloat(unitAmount.toFixed(2)),
      AccountCode: settings.xero_account_code || '200',
      TaxType: isGstApplicable ? (settings.xero_tax_type_gst || 'OUTPUT') : (settings.xero_tax_type_free || 'BASEXCLUDED'),
    };
  });

  // Calculate Dates
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const dueDate = new Date();
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
        Status: settings.xero_invoice_status || 'AUTHORISED',
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

  const createData = await createRes.json().catch(() => ({}));

  if (!createRes.ok) {
    const errorMsg = createData?.Elements?.[0]?.ValidationErrors?.[0]?.Message ||
                     createData?.Message ||
                     createData?.error ||
                     `HTTP ${createRes.status}`;
    console.error('[XERO] Error creating invoice in Xero:', createData);
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
    const rawRates: any[] = rawPayItems.EarningsRates || rawPayItems.earningsRates || [];

    const earningsRates: XeroPayItemRecord[] = rawRates.map((r: any) => ({
      id: r.EarningsRateID || r.earningsRateID || r.Id || r.id || '',
      name: r.Name || r.name || 'Unnamed Rate',
      earningsType: r.EarningsType || r.earningsType || '',
      rateType: r.RateType || r.rateType || 'RATEPERUNIT',
      typeOfUnits: r.TypeOfUnits || r.typeOfUnits || 'Hours',
      ratePerUnit: Number(r.RatePerUnit || r.ratePerUnit || 0),
      multiplier: Number(r.Multiplier || r.multiplier || 1),
      accrueLeave: !!(r.AccrueLeave ?? r.accrueLeave),
      isExemptFromTax: !!(r.IsExemptFromTax ?? r.isExemptFromTax),
      isExemptFromSuper: !!(r.IsExemptFromSuper ?? r.isExemptFromSuper),
      currentRecord: r.CurrentRecord !== false && r.currentRecord !== false,
      accountCode: r.AccountCode || r.accountCode || '',
      suggestedCategory: classifyXeroEarningsRate(r)
    }));

    return {
      success: true,
      tenantName: auth.tenantName || 'Xero Organisation',
      tenantId: auth.tenantId || '',
      earningsRates,
      allowances: rawPayItems.AllowanceRates || rawPayItems.allowanceRates || [],
      deductions: rawPayItems.DeductionTypes || rawPayItems.deductionTypes || [],
      leaveTypes: rawPayItems.LeaveTypes || rawPayItems.leaveTypes || [],
      reimbursements: rawPayItems.ReimbursementTypes || rawPayItems.reimbursementTypes || []
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
           u.pay_rate_weekday_id, u.pay_rate_saturday_id, u.pay_rate_sunday_id, u.pay_rate_public_holiday_id,
           u.pay_rate_ndis_travel_id, u.pay_rate_home_care_travel_id,
           srv.name as service_name
    FROM shifts s
    JOIN users u ON s.staff_id = u.id
    LEFT JOIN services srv ON s.service_id = srv.id
    WHERE s.status = 'COMPLETED'
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

  const staffMap = new Map<number, StaffPayRunBreakdown>();

  for (const shift of shifts) {
    let scheduledHrs = (new Date(shift.end_time).getTime() - new Date(shift.start_time).getTime()) / 3600000;
    let hours = Math.max(0, scheduledHrs);
    if (shift.actual_start_time && shift.actual_finish_time) {
      let actualHrs = (new Date(shift.actual_finish_time).getTime() - new Date(shift.actual_start_time).getTime()) / 3600000;
      if (actualHrs > 0.01) hours = actualHrs;
    }

    let servicesArray: any[] = [];
    try { servicesArray = shift.services_json ? JSON.parse(shift.services_json) : []; } catch {}
    for (const sData of servicesArray) {
      if (sData.qtyOverride !== undefined && sData.qtyOverride !== "" && Number(sData.qtyOverride) > 0) {
        hours = Number(sData.qtyOverride);
        break;
      }
    }

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
    let ndisKm = 0;
    let ndisReimb = 0;
    let hcKm = 0;
    let hcHrs = 0;
    let hcReimb = 0;

    if (isHomeCare) {
      hcKm = shift.home_care_travel_km || shift.provider_travel_km || 0;
      hcHrs = (shift.provider_travel_minutes || 0) / 60;
      hcReimb = shift.home_care_travel_total || 0;
    } else {
      const provKm = shift.provider_travel_km || 0;
      const abtKm = shift.abt_km || 0;
      ndisKm = provKm + abtKm;
      ndisReimb = parseFloat((ndisKm * 0.99).toFixed(2));
    }

    if (!staffMap.has(shift.staff_user_id)) {
      staffMap.set(shift.staff_user_id, {
        staffId: shift.staff_user_id,
        portalName: `${shift.staff_first_name} ${shift.staff_last_name}`.trim(),
        email: shift.staff_email || '',
        xeroEmployeeId: shift.xero_employee_id || '',
        xeroEmployeeName: shift.xero_employee_name || '',
        isLinked: !!(shift.xero_employee_id || shift.xero_employee_name),
        payRateWeekdayId: shift.pay_rate_weekday_id || '',
        payRateWeekdayName: payItemMap.get(shift.pay_rate_weekday_id) || '',
        payRateSaturdayId: shift.pay_rate_saturday_id || '',
        payRateSaturdayName: payItemMap.get(shift.pay_rate_saturday_id) || '',
        payRateSundayId: shift.pay_rate_sunday_id || '',
        payRateSundayName: payItemMap.get(shift.pay_rate_sunday_id) || '',
        payRatePublicHolidayId: shift.pay_rate_public_holiday_id || '',
        payRatePublicHolidayName: payItemMap.get(shift.pay_rate_public_holiday_id) || '',
        payRateNdisTravelId: shift.pay_rate_ndis_travel_id || '',
        payRateNdisTravelName: payItemMap.get(shift.pay_rate_ndis_travel_id) || '',
        payRateHomeCareTravelId: shift.pay_rate_home_care_travel_id || '',
        payRateHomeCareTravelName: payItemMap.get(shift.pay_rate_home_care_travel_id) || '',
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
    if (dayCategory === 'Public Holiday') rec.publicHolidayHours += hours;
    else if (dayCategory === 'Saturday') rec.saturdayHours += hours;
    else if (dayCategory === 'Sunday') rec.sundayHours += hours;
    else rec.weekdayHours += hours;

    rec.ndisTravelKm += ndisKm;
    rec.ndisTravelPay += ndisReimb;
    rec.homeCareTravelKm += hcKm;
    rec.homeCareTravelHours += hcHrs;
    rec.homeCareTravelPay += hcReimb;
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
    if (s.ndisTravelKm > 0 && !s.payRateNdisTravelId) {
      warnings.push('Missing NDIS Travel Pay Item');
    }
    if (s.homeCareTravelKm > 0 && !s.payRateHomeCareTravelId) {
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

    eligibleStaff = eligibleStaff.filter(s => !!s.xeroEmployeeId && (s.totalHours > 0 || s.ndisTravelKm > 0 || s.homeCareTravelKm > 0));

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

    // 5. Update each employee's payslip with their award hours & travel
    let employeesUpdated = 0;
    const staffSummary: any[] = [];
    const executionWarnings: string[] = [];

    for (const staff of eligibleStaff) {
      const earningsLines: any[] = [];

      if (staff.weekdayHours > 0 && staff.payRateWeekdayId) {
        earningsLines.push({ EarningsRateID: staff.payRateWeekdayId, NumberOfUnits: staff.weekdayHours });
      }
      if (staff.saturdayHours > 0 && staff.payRateSaturdayId) {
        earningsLines.push({ EarningsRateID: staff.payRateSaturdayId, NumberOfUnits: staff.saturdayHours });
      }
      if (staff.sundayHours > 0 && staff.payRateSundayId) {
        earningsLines.push({ EarningsRateID: staff.payRateSundayId, NumberOfUnits: staff.sundayHours });
      }
      if (staff.publicHolidayHours > 0 && staff.payRatePublicHolidayId) {
        earningsLines.push({ EarningsRateID: staff.payRatePublicHolidayId, NumberOfUnits: staff.publicHolidayHours });
      }
      if (staff.ndisTravelKm > 0 && staff.payRateNdisTravelId) {
        earningsLines.push({ EarningsRateID: staff.payRateNdisTravelId, NumberOfUnits: staff.ndisTravelKm });
      }
      if (staff.homeCareTravelKm > 0 && staff.payRateHomeCareTravelId) {
        earningsLines.push({ EarningsRateID: staff.payRateHomeCareTravelId, NumberOfUnits: staff.homeCareTravelKm });
      }

      if (earningsLines.length === 0) continue;

      const payslip = existingPayslips.find((p: any) => p.EmployeeID === staff.xeroEmployeeId);

      try {
        let slipRes: any;
        if (payslip && payslip.PayslipID) {
          slipRes = await fetch(`https://api.xero.com/payroll.xro/1.0/Payslip/${payslip.PayslipID}`, {
            method: 'POST',
            headers,
            body: JSON.stringify([{ EarningsLines: earningsLines }])
          });
        } else {
          slipRes = await fetch('https://api.xero.com/payroll.xro/1.0/Payslip', {
            method: 'POST',
            headers,
            body: JSON.stringify([{ PayRunID: payRunId, EmployeeID: staff.xeroEmployeeId, EarningsLines: earningsLines }])
          });
        }

        if (slipRes && slipRes.ok) {
          employeesUpdated++;
          staffSummary.push({
            staffName: staff.portalName,
            xeroEmployeeId: staff.xeroEmployeeId,
            linesSent: earningsLines.length,
            status: 'SUCCESS'
          });
        } else {
          const errData = await slipRes.json().catch(() => ({}));
          const errMsg = errData.Detail || errData.Message || 'Failed to update payslip';
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
      periodStartDate: payRunObj?.PayRunPeriodStartDate || params.startDate,
      periodEndDate: payRunObj?.PayRunPeriodEndDate || params.endDate,
      paymentDate: payRunObj?.PaymentDate,
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


