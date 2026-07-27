const fs = require('fs');
let code = fs.readFileSync('src/components/Settings/SettingsView.tsx', 'utf8');

const defaultSignature = `<table cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.5; max-width: 450px;">
  <tbody><tr>
    <td style="padding-bottom: 20px;">
      <span style="margin-bottom: 8px; display: block;">Best regards,</span><br>
      <strong style="font-size: 16px;">Matt Willis</strong><br>
      <span>Registered Nurse / Director</span><br>
      <strong style="color: #1a8cff; font-size: 14px;">Happy in the Home</strong><br>
      <span style="font-size: 13px; margin-top: 6px; display: block;">
        <a href="tel:0448909774" style="text-decoration: none; color: inherit;">0448909774</a> | 
        <a href="mailto:info@happyinthehome.org" style="color: #1a8cff; text-decoration: none;">info@happyinthehome.org</a>
      </span>
    </td>
  </tr>
  <tr>
    <td style="padding-bottom: 12px;">
      <img src="https://i.imgur.com/s6Z6Dhx.png" alt="Happy in the Home Logo" width="540" style="display: block; border: none; width: 600px; height: auto;">
    </td>
  </tr>
  <tr>
    <td>
      <span style="font-size: 12px; font-style: italic; line-height: 1.4; display: block; opacity: 0.8;">
        We acknowledge the Traditional Custodians of the Geraldton region, the Amangu people of the Yamatji Nation, and pay our respects to their Elders past, present, and emerging.
      </span>
    </td>
  </tr>
</tbody></table>`;

if (!code.includes("invoiceEmailSignature: `")) {
  code = code.replace(
    "hcInvoicePrefix: 'HC-',", 
    `hcInvoicePrefix: 'HC-',
    invoiceEmailSignature: \`${defaultSignature}\`,`
  );
}

const uiAnchor = `                <div>
                  <label className="block text-xs font-medium text-[#8B949E] mb-2">Invoicing Cycle Start Weekday</label>`;

const uiInject = `                <div className="col-span-2">
                  <label className="block text-xs font-medium text-[#8B949E] mb-2">Invoice Email Signature (HTML)</label>
                  <textarea
                    value={settings.invoiceEmailSignature}
                    onChange={e => setSettings({...settings, invoiceEmailSignature: e.target.value})}
                    className="w-full h-48 bg-brand-navy border border-border-subtle rounded-md px-3 py-2 text-xs text-[#E6EDF3] outline-none focus:ring-1 focus:ring-brand-teal transition-colors placeholder-[#8B949E] font-mono"
                    placeholder="Enter HTML signature..."
                  />
                  <p className="text-[10px] text-[#8B949E] mt-1">This signature is appended to the bottom of all invoice emails sent from the system.</p>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-[#8B949E] mb-2">Invoicing Cycle Start Weekday</label>`;

if (code.includes(uiAnchor) && !code.includes("Invoice Email Signature (HTML)")) {
  code = code.replace(uiAnchor, uiInject);
}

fs.writeFileSync('src/components/Settings/SettingsView.tsx', code);
console.log("Patched SettingsView");
