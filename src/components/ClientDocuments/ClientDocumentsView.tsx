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
  Edit2,
  Download,
  Check,
} from "lucide-react";
import { useLocalStorage } from "../../hooks/useLocalStorage";

export default function ClientDocumentsView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [templates, setTemplates] = useState<any[]>([]);
  const [clientDocuments, setClientDocuments] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<any | null>(null);

  const [clientFundingType, setClientFundingType] = useState<string>("NDIS");

  const [sidebarWidth, setSidebarWidth] = useLocalStorage(
    "clientDocsSidebarWidth",
    320,
  );
  const [isResizing, setIsResizing] = useState(false);

  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const signedInputRef = useRef<HTMLInputElement>(null);

  const [editingFile, setEditingFile] = useState<{
    name: string;
    type: "template" | "document";
  } | null>(null);
  const [editNameValue, setEditNameValue] = useState("");

  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchClientDetails().then((fundingType) => {
      fetchTemplates(fundingType);
      fetchClientDocuments();
    });
  }, [id, token]);

  // Handle document drag resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = e.clientX;
      if (newWidth > 250 && newWidth < 600) {
        setSidebarWidth(newWidth);
      }
    };
    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, setSidebarWidth]);

  const fetchClientDetails = async () => {
    try {
      const res = await fetch(`/api/clients/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const fType =
          (data.funding_type || data.client?.funding_type) === "HCP" ||
          (data.funding_type || data.client?.funding_type) === "HOME_CARE" ||
          data.funding_type === "Home Care"
            ? "HCP"
            : "NDIS";
        setClientFundingType(fType);
        return fType;
      }
    } catch (e) {
      console.error(e);
    }
    return "NDIS";
  };

  const fetchTemplates = async (fundingType: string) => {
    try {
      const res = await fetch(`/api/templates?fundingType=${fundingType}`, {
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

  const handleTemplateSelect = (template: any) => {
    setSelectedFile({
      ...template,
      source: "template",
      viewUrl: `/api/templates/${encodeURIComponent(template.name)}/download?fundingType=${clientFundingType}&token=${token}`,
    });
  };

  const handleDocumentSelect = (doc: any) => {
    setSelectedFile({
      ...doc,
      source: "document",
      // Use the general files endpoint if mapped, else we would need a download endpoint for client docs.
      // Actually, wait, do we have a download endpoint for client docs? No, we didn't add one!
      // We can use the static uploads directory if we know the path.
      viewUrl: `/uploads/${encodeURIComponent(doc.clientName || "")}/Documents/${encodeURIComponent(doc.name)}`,
    });
    // Let's fix the viewUrl later if needed. Actually it's easier to just fetch it or create an object URL.
    loadDocumentPreview(doc.name);
  };

  const loadDocumentPreview = async (name: string) => {
    // To safely preview, we need to know the client's folder path. Unfortunately it's not exposed cleanly.
    // Let's add a quick download endpoint for client docs if it's missing, or we can just fetch and blob it.
    // We can fetch it by doing a GET to a new endpoint or the files endpoint.
    // Wait, earlier we used `res.json(documents)` which didn't include URLs.
  };

  const handleUploadTemplate = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    const fd = new FormData();
    fd.append("file", file);
    fd.append("fundingType", clientFundingType);

    setLoading(true);
    try {
      const res = await fetch("/api/templates/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (res.ok) {
        fetchTemplates(clientFundingType);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteTemplate = async (templateName: string) => {
    if (!window.confirm("Delete this blank template for everyone?")) return;
    try {
      await fetch(
        `/api/templates/${encodeURIComponent(templateName)}?fundingType=${clientFundingType}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      fetchTemplates(clientFundingType);
      if (selectedFile?.name === templateName) {
        setSelectedFile(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteDocument = async (docName: string) => {
    if (!window.confirm("Delete this document from the client's file?")) return;
    try {
      await fetch(
        `/api/clients/${id}/documents/${encodeURIComponent(docName)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      fetchClientDocuments();
      if (selectedFile?.name === docName) {
        setSelectedFile(null);
      }
    } catch (e) {
      console.error(e);
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

  const startRename = (name: string, type: "template" | "document") => {
    setEditingFile({ name, type });
    setEditNameValue(name.replace(".pdf", ""));
  };

  const saveRename = async () => {
    if (!editingFile || !editNameValue.trim()) return;

    const endpoint =
      editingFile.type === "template"
        ? "/api/templates/rename"
        : `/api/clients/${id}/documents/rename`;

    try {
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fundingType: clientFundingType,
          oldName: editingFile.name,
          newName: editNameValue.trim(),
        }),
      });

      if (res.ok) {
        if (editingFile.type === "template") fetchTemplates(clientFundingType);
        else fetchClientDocuments();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setEditingFile(null);
    }
  };

  // Utility to get a reliable url for iframe
  const getIframeUrl = () => {
    if (!selectedFile) return "";
    if (selectedFile.source === "template") {
      return `/api/templates/${encodeURIComponent(selectedFile.name)}/download?fundingType=${clientFundingType}&token=${token}#toolbar=1`;
    }
    return `/api/clients/${id}/documents/${encodeURIComponent(selectedFile.name)}/download?token=${token}#toolbar=1`;
  };

  return (
    <div className="flex h-full h-[calc(100vh-64px)] overflow-hidden">
      {/* Sidebar */}
      <div
        ref={sidebarRef}
        style={{ width: `${sidebarWidth}px` }}
        className="border-r border-border-subtle bg-brand-navy flex flex-col shrink-0 relative"
      >
        <div className="p-3 border-b border-border-subtle shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold text-white">Client Documents</h2>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-[#0D1117] text-[#8B949E] rounded">
              {clientFundingType}
            </span>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center space-x-1.5 bg-brand-teal/10 text-brand-teal hover:bg-brand-teal/20 px-2 py-1.5 rounded text-sm font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Upload Template</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".pdf"
            onChange={handleUploadTemplate}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Global Templates */}
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-[#8B949E] font-semibold mb-2 flex items-center justify-between">
              <span>Default Templates</span>
            </h3>
            <div className="space-y-1">
              {templates.length === 0 && (
                <p className="text-xs text-[#8B949E]/70">
                  No templates found for {clientFundingType}
                </p>
              )}
              {templates.map((tmpl) => (
                <div
                  key={tmpl.name}
                  onClick={() => handleTemplateSelect(tmpl)}
                  className={`flex flex-col p-1.5 rounded-md cursor-pointer transition-colors border max-w-full text-[13px] ${selectedFile?.name === tmpl.name && selectedFile?.source === "template" ? "bg-brand-teal/10 border-brand-teal text-white" : "bg-brand-bg border-transparent hover:border-border-subtle text-[#8B949E]"}`}
                >
                  {editingFile?.name === tmpl.name &&
                  editingFile?.type === "template" ? (
                    <div className="flex items-center space-x-2">
                      <input
                        autoFocus
                        value={editNameValue}
                        onChange={(e) => setEditNameValue(e.target.value)}
                        className="flex-1 bg-[#0D1117] text-white text-sm px-2 py-1 rounded border border-brand-teal focus:outline-none"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.key === "Enter" && saveRename()}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          saveRename();
                        }}
                        className="text-brand-green hover:text-white p-1"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingFile(null);
                        }}
                        className="text-red-400 hover:text-white p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 overflow-hidden">
                        <FileIcon
                          className={`w-4 h-4 shrink-0 ${selectedFile?.name === tmpl.name && selectedFile?.source === "template" ? "text-brand-teal" : ""}`}
                        />
                        <span
                          className="text-sm font-medium truncate"
                          title={tmpl.name}
                        >
                          {tmpl.name}
                        </span>
                      </div>
                      <div className="flex items-center shrink-0 ml-2 space-x-1 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startRename(tmpl.name, "template");
                          }}
                          className="p-1.5 text-[#8B949E] hover:text-white rounded-md transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTemplate(tmpl.name);
                          }}
                          className="p-1.5 text-[#8B949E] hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Client Specific Documents */}
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-[#8B949E] font-semibold mb-2">
              Saved Client Documents
            </h3>
            <div className="space-y-1">
              {clientDocuments.length === 0 && (
                <p className="text-xs text-[#8B949E]/70">
                  No saved documents yet.
                </p>
              )}
              {clientDocuments.map((doc) => (
                <div
                  key={doc.name}
                  onClick={() => handleDocumentSelect(doc)}
                  className={`flex flex-col p-1.5 rounded-md cursor-pointer transition-colors border max-w-full text-[13px] ${selectedFile?.name === doc.name && selectedFile?.source === "document" ? "bg-brand-purple/10 border-brand-purple text-white" : "bg-[#0D1117] border-border-subtle hover:border-brand-purple/50 text-[#8B949E]"}`}
                >
                  {editingFile?.name === doc.name &&
                  editingFile?.type === "document" ? (
                    <div className="flex items-center space-x-2">
                      <input
                        autoFocus
                        value={editNameValue}
                        onChange={(e) => setEditNameValue(e.target.value)}
                        className="flex-1 bg-[#161B22] text-white text-sm px-2 py-1 rounded border border-brand-purple focus:outline-none"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.key === "Enter" && saveRename()}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          saveRename();
                        }}
                        className="text-brand-green hover:text-white p-1"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingFile(null);
                        }}
                        className="text-red-400 hover:text-white p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 overflow-hidden">
                        <FileText
                          className={`w-4 h-4 shrink-0 ${selectedFile?.name === doc.name && selectedFile?.source === "document" ? "text-brand-purple" : ""}`}
                        />
                        <span
                          className="text-sm font-medium truncate"
                          title={doc.name}
                        >
                          {doc.name}
                        </span>
                      </div>
                      <div className="flex items-center shrink-0 ml-2 space-x-1 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startRename(doc.name, "document");
                          }}
                          className="p-1.5 text-[#8B949E] hover:text-white rounded-md transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDocument(doc.name);
                          }}
                          className="p-1.5 text-[#8B949E] hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Upload Signed Document Dropzone */}
        <div className="p-3 border-t border-border-subtle bg-[#0D1117] shrink-0">
          <div
            onClick={() => signedInputRef.current?.click()}
            className="border border-dashed border-border-subtle hover:border-brand-purple rounded p-3 flex flex-col items-center justify-center cursor-pointer transition-colors text-center bg-[#161B22]"
          >
            <UploadCloud className="w-4 h-4 text-[#8B949E] mb-1" />
            <span className="text-[11px] font-medium text-[#8B949E]">
              Upload Signed Document
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

        {/* Resize Handle */}
        <div
          onMouseDown={() => setIsResizing(true)}
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-brand-teal/50 active:bg-brand-teal z-10 transition-colors"
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0D1117] relative">
        {selectedFile ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Top Info Bar */}
            <div className="h-auto px-4 py-2 border-b border-border-subtle bg-[#161B22] shrink-0 flex flex-row items-center justify-between">
              <div className="flex items-center space-x-3">
                {selectedFile.source === "template" ? (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-brand-teal/20 text-brand-teal rounded">
                    Blank Template
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-brand-purple/20 text-brand-purple rounded">
                    Client Document
                  </span>
                )}
                <h3 className="text-sm font-semibold text-white truncate max-w-lg">
                  {selectedFile.name}
                </h3>
              </div>
              <p className="text-[10px] text-[#8B949E] truncate ml-4 max-w-sm" title="Fill the form in the preview below and click 'Download PDF' to save your copy. Then drag it to the upload dropzone on the left to save to client files.">
                 <strong className="text-white">Save:</strong> Fill viewer, download, then upload file.
              </p>
            </div>

            {/* IFrame Area */}
            <div className="flex-1 relative bg-[#0D1117]">
              <iframe
                key={selectedFile.name + selectedFile.source}
                src={getIframeUrl()}
                className="w-full h-full border-none bg-white"
                title="PDF Viewer"
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <FileText className="w-16 h-16 text-[#8B949E]/30 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">
              No Document Selected
            </h3>
            <p className="text-[#8B949E] max-w-md">
              Select a template from the sidebar to view it. You can fill out
              templates directly in the viewer, download them, and upload the
              saved copy directly to the client's file.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
