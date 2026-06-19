import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  Plus,
  Trash2,
  Printer,
  Save,
  FileText,
  UploadCloud,
  File as FileIcon,
  X,
} from "lucide-react";
import { PDFDocument } from "pdf-lib";

export default function ClientDocumentsView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [templates, setTemplates] = useState<any[]>([]);
  const [clientDocuments, setClientDocuments] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);

  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);

  const [formFields, setFormFields] = useState<
    { name: string; type: string }[]
  >([]);
  const [formData, setFormData] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const signedInputRef = useRef<HTMLInputElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    fetchTemplates();
    fetchClientDocuments();
  }, [id, token]);

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/templates", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setTemplates(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchClientDocuments = async () => {
    try {
      const res = await fetch(`/api/clients/${id}/documents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setClientDocuments(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTemplateSelect = async (template: any) => {
    setSelectedTemplate(template);
    setFormFields([]);
    setFormData({});
    try {
      const res = await fetch(`/api/templates/${template.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        setPdfBytes(bytes);

        await parsePdfForm(bytes);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const parsePdfForm = async (bytes: Uint8Array) => {
    try {
      const pdfDoc = await PDFDocument.load(bytes);
      const form = pdfDoc.getForm();
      const fields = form.getFields();

      const extractedFields = fields.map((f) => ({
        name: f.getName(),
        type: f.constructor.name,
      }));

      setFormFields(extractedFields);

      // Initial Preview without any fill
      updatePreview(pdfDoc);
    } catch (e) {
      console.error("No PDF form or error parsing", e);
      // Still show preview even if no form
      const blob = new Blob([bytes], { type: "application/pdf" });
      setPreviewBlobUrl(URL.createObjectURL(blob));
    }
  };

  const handleFieldChange = async (name: string, value: string) => {
    const newFormData = { ...formData, [name]: value };
    setFormData(newFormData);

    if (!pdfBytes) return;
    try {
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const form = pdfDoc.getForm();

      Object.entries(newFormData).forEach(([fieldName, val]) => {
        try {
          const field = form.getField(fieldName);
          if (field) {
            if (field.constructor.name.includes("TextField")) {
              (field as any).setText(val);
            } else if (field.constructor.name.includes("CheckBox")) {
              if (val === "true") (field as any).check();
              else (field as any).uncheck();
            }
          }
        } catch (e) {}
      });

      // Need to flatten if we want to lock it, but for preview we can just render
      updatePreview(pdfDoc);
    } catch (e) {}
  };

  const updatePreview = async (pdfDoc: PDFDocument) => {
    const filledBytes = await pdfDoc.save();
    const blob = new Blob([filledBytes], { type: "application/pdf" });
    setPreviewBlobUrl(URL.createObjectURL(blob));
  };

  const handleUploadTemplate = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    const fd = new FormData();
    fd.append("file", file);

    setLoading(true);
    try {
      const res = await fetch("/api/templates/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (res.ok) {
        fetchTemplates();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteTemplate = async (templateId: number) => {
    if (!window.confirm("Delete this blank template for everyone?")) return;
    try {
      await fetch(`/api/templates/${templateId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchTemplates();
      if (selectedTemplate?.id === templateId) {
        setSelectedTemplate(null);
        setPreviewBlobUrl(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveAndPrint = async () => {
    if (!pdfBytes || !selectedTemplate) return;

    setLoading(true);
    try {
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const form = pdfDoc.getForm();

      Object.entries(formData).forEach(([fieldName, val]) => {
        try {
          const field = form.getField(fieldName);
          if (field) {
            if (field.constructor.name.includes("TextField")) {
              (field as any).setText(val);
            } else if (field.constructor.name.includes("CheckBox")) {
              if (val === "true") (field as any).check();
              else (field as any).uncheck();
            }
          }
        } catch (e) {}
      });

      form.flatten(); // Flatten so fields become standard text
      const finalPdfBytes = await pdfDoc.save();

      const blob = new Blob([finalPdfBytes], { type: "application/pdf" });

      // 1. Save to Client Backend
      const fd = new FormData();
      fd.append(
        "file",
        blob,
        `${selectedTemplate.name.replace(".pdf", "")}_Filled_${new Date().getTime()}.pdf`,
      );

      await fetch(`/api/clients/${id}/documents/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      fetchClientDocuments();

      // 2. Print
      const printUrl = URL.createObjectURL(blob);
      const printWindow = window.open(printUrl, "_blank");
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSigned = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    const fd = new FormData();
    fd.append("file", file);

    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${id}/documents/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (res.ok) {
        fetchClientDocuments();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      if (signedInputRef.current) signedInputRef.current.value = "";
    }
  };

  return (
    <div className="flex h-full h-[calc(100vh-64px)] overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 border-r border-border-subtle bg-brand-navy flex flex-col shrink-0">
        <div className="p-4 border-b border-border-subtle">
          <h2 className="text-lg font-bold text-white mb-4">
            Client Documents
          </h2>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center space-x-2 bg-brand-teal/10 text-brand-teal hover:bg-brand-teal/20 px-4 py-2 rounded-lg font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Upload New Template</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".pdf"
            onChange={handleUploadTemplate}
          />
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <h3 className="text-xs uppercase tracking-wider text-[#8B949E] font-semibold mb-3">
            Global Blank Templates
          </h3>
          {templates.map((tmpl) => (
            <div
              key={tmpl.id}
              onClick={() => handleTemplateSelect(tmpl)}
              className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors border max-w-full ${selectedTemplate?.id === tmpl.id ? "bg-brand-teal/10 border-brand-teal text-white" : "bg-brand-bg border-transparent hover:border-border-subtle text-[#8B949E]"}`}
            >
              <div className="flex items-center space-x-3 overflow-hidden">
                <FileIcon
                  className={`w-5 h-5 shrink-0 ${selectedTemplate?.id === tmpl.id ? "text-brand-teal" : ""}`}
                />
                <span className="text-sm font-medium truncate">
                  {tmpl.name}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteTemplate(tmpl.id);
                }}
                className="p-1.5 text-[#8B949E] hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Upload Signed Document Dropzone */}
        <div className="p-4 border-t border-border-subtle bg-[#0D1117]">
          <div
            onClick={() => signedInputRef.current?.click()}
            className="border-2 border-dashed border-border-subtle hover:border-brand-teal rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors text-center"
          >
            <UploadCloud className="w-8 h-8 text-[#8B949E] mb-2" />
            <span className="text-sm font-semibold text-[#8B949E]">
              Upload Signed Document
            </span>
            <span className="text-xs text-[#8B949E]/70 mt-1">
              Direct to client folder
            </span>
          </div>
          <input
            type="file"
            ref={signedInputRef}
            className="hidden"
            accept=".pdf"
            onChange={handleUploadSigned}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0D1117] relative">
        {selectedTemplate ? (
          <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
            {/* Left/Top PDF Viewer */}
            <div className="flex-1 flex flex-col">
              {/* Top Toolbar */}
              <div className="h-16 border-b border-border-subtle bg-brand-navy shrink-0 px-4 flex items-center justify-between">
                <h3 className="font-semibold text-white truncate max-w-lg">
                  {selectedTemplate.name}
                </h3>
                <button
                  onClick={handleSaveAndPrint}
                  disabled={loading}
                  className="flex items-center space-x-2 bg-brand-green/20 hover:bg-brand-green/30 text-brand-green border border-brand-green/30 px-4 py-2 rounded-lg font-bold transition-all shadow-sm"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Printer className="w-4 h-4" />
                  )}
                  <span>Save & Print</span>
                </button>
              </div>
              {/* IFrame Area */}
              <div className="flex-1 relative bg-neutral-800 p-4">
                {previewBlobUrl ? (
                  <iframe
                    src={`${previewBlobUrl}#toolbar=0&navpanes=0`}
                    className="w-full h-full rounded-lg shadow-xl bg-white"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-[#8B949E]">
                    Loading Preview...
                  </div>
                )}
              </div>
            </div>

            {/* Form Fields Panel */}
            {formFields.length > 0 && (
              <div className="w-80 border-l border-border-subtle bg-brand-navy flex flex-col shrink-0">
                <div className="p-4 border-b border-border-subtle bg-brand-bg">
                  <h4 className="font-semibold text-white">Fill Information</h4>
                  <p className="text-xs text-[#8B949E]">
                    Updates preview automatically
                  </p>
                </div>
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                  {formFields.map((f) => (
                    <div key={f.name}>
                      <label className="block text-xs font-medium text-[#8B949E] mb-1">
                        {f.name}
                      </label>
                      {f.type.includes("CheckBox") ? (
                        <select
                          value={formData[f.name] || ""}
                          onChange={(e) =>
                            handleFieldChange(f.name, e.target.value)
                          }
                          className="w-full bg-[#161B22] border border-border-subtle rounded-md px-3 py-2 text-white text-sm"
                        >
                          <option value="">Unchecked</option>
                          <option value="true">Checked</option>
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={formData[f.name] || ""}
                          onChange={(e) =>
                            handleFieldChange(f.name, e.target.value)
                          }
                          className="w-full bg-[#161B22] border border-border-subtle rounded-md px-3 py-2 text-white text-sm focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition-colors"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <FileText className="w-16 h-16 text-[#8B949E]/30 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">
              No Template Selected
            </h3>
            <p className="text-[#8B949E] max-w-md">
              Select a template from the sidebar to view it or fill out its form
              fields to print and save.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
