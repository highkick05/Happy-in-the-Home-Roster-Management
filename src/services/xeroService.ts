import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

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
    
    // Attempt token request with required scopes (support both granular 2026+ and legacy broad scopes)
    const scopesToTry = [
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
      tokenRes = await fetch('https://identity.xero.com/connect/token', {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          scope: scopeStr,
        }).toString(),
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
