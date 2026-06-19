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
  const specificFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingForName, setUploadingForName] = useState<string | null>(null);

  const [dragCategory, setDragCategory] = useState<string | null>(null);

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

  const handleUploadSpecific = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!e.target.files || e.target.files.length === 0 || !uploadingForName)
      return;
    const file = e.target.files[0];

    // Create a new file with the target name to ensure it overwrites
    const newFile = new File([file], uploadingForName, { type: file.type });
    const fd = new FormData();
    fd.append("file", newFile);

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
      setUploadingForName(null);
      if (specificFileInputRef.current) specificFileInputRef.current.value = "";
    }
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

  const genericFileInputRef = useRef<HTMLInputElement>(null);
  const [genericUploadCategory, setGenericUploadCategory] =
    useState<string>("Main");

  const handleUploadGeneric = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!e.target.files || e.target.files.length === 0) return;
    uploadGenericFiles(e.target.files, genericUploadCategory);
    if (genericFileInputRef.current) genericFileInputRef.current.value = "";
  };

  const uploadGenericFiles = async (files: FileList, category: string) => {
    const file = files[0];
    const fd = new FormData();
    fd.append("file", file);
    fd.append("category", category);

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
    }
  };

  const handleDropToSection = (e: React.DragEvent, category: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCategory(null);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (category === "Required") {
        // Upload template
        const file = e.dataTransfer.files[0];
        const fd = new FormData();
        fd.append("file", file);
        fd.append("fundingType", clientFundingType);
        setLoading(true);
        fetch("/api/templates/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        })
          .then((res) => {
            if (res.ok) fetchTemplates(clientFundingType);
          })
          .finally(() => setLoading(false));
      } else {
        uploadGenericFiles(e.dataTransfer.files, category);
      }
    }
  };

  const handleDragEnter = (e: React.DragEvent, category: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCategory(category);
  };

  const handleDragLeave = (e: React.DragEvent, category: string) => {
    e.preventDefault();
    e.stopPropagation();
    // Only reset if dragging leaves the section
    if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget as Node))
      return;
    setDragCategory(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
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

    let category = "Main";
    if (editingFile.type === "document") {
      const doc = clientDocuments.find((d) => d.name === editingFile.name);
      if (doc) category = doc.category || "Main";
    }

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
          category,
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

  const handleDeleteDocument = async (docName: string) => {
    if (!window.confirm("Delete this document from the client's file?")) return;
    const doc = clientDocuments.find((d) => d.name === docName);
    const category = doc?.category || "Main";
    try {
      await fetch(
        `/api/clients/${id}/documents/${encodeURIComponent(docName)}?category=${category}`,
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
          <div
            onDragEnter={(e) => handleDragEnter(e, "Required")}
            onDragLeave={(e) => handleDragLeave(e, "Required")}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDropToSection(e, "Required")}
            className={`transition-colors rounded-lg border-2 ${dragCategory === "Required" ? "border-brand-teal bg-brand-teal/5" : "border-transparent"}`}
          >
            <h3 className="text-[10px] uppercase tracking-wider text-[#8B949E] font-semibold mb-2 flex items-center justify-between px-1 pt-1">
              <span>Required Documents</span>
            </h3>
            <div className="space-y-1 p-1">
              {templates.length === 0 && (
                <p className="text-xs text-[#8B949E]/70">
                  No templates found for {clientFundingType}
                </p>
              )}
              {templates.map((tmpl) => {
                const clientDoc = clientDocuments.find(
                  (d) => d.name === tmpl.name,
                );
                const isCompleted = !!clientDoc;
                const fileSource = isCompleted ? "document" : "template";

                return (
                  <div
                    key={tmpl.name}
                    onClick={() =>
                      isCompleted
                        ? handleDocumentSelect(clientDoc)
                        : handleTemplateSelect(tmpl)
                    }
                    className={`flex flex-col p-1.5 rounded-md cursor-pointer transition-colors border max-w-full text-[13px] ${selectedFile?.name === tmpl.name ? (isCompleted ? "bg-brand-purple/10 border-brand-purple text-white" : "bg-brand-teal/10 border-brand-teal text-white") : "bg-brand-bg border-transparent hover:border-border-subtle text-[#8B949E]"}`}
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
                      <div className="flex items-center justify-between group">
                        <div className="flex items-center space-x-3 overflow-hidden">
                          <FileIcon
                            className={`w-4 h-4 shrink-0 ${isCompleted ? "text-brand-purple" : "text-[#8B949E]"}`}
                          />
                          <span
                            className={`text-sm font-medium truncate ${isCompleted ? "text-white" : ""}`}
                            title={tmpl.name}
                          >
                            {tmpl.name}
                          </span>
                        </div>
                        <div className="flex items-center shrink-0 ml-2 space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setUploadingForName(tmpl.name);
                              specificFileInputRef.current?.click();
                            }}
                            className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-white/5 text-white hover:bg-white/10 rounded transition-colors"
                          >
                            {isCompleted ? "Replace" : "Upload"}
                          </button>
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
                );
              })}
            </div>
          </div>

          {/* Saved Documents */}
          <div
            onDragEnter={(e) => handleDragEnter(e, "Saved")}
            onDragLeave={(e) => handleDragLeave(e, "Saved")}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDropToSection(e, "Saved")}
            className={`transition-colors rounded-lg border-2 ${dragCategory === "Saved" ? "border-amber-500 bg-amber-500/5" : "border-transparent"}`}
          >
            <h3 className="text-[10px] uppercase tracking-wider text-[#8B949E] font-semibold mb-2 flex items-center justify-between px-1 pt-1">
              <span>Saved Documents</span>
              <button
                onClick={() => {
                  setGenericUploadCategory("Saved");
                  genericFileInputRef.current?.click();
                }}
                className="hover:text-white transition-colors title='Upload Saved Document'"
                title="Upload Saved Document"
              >
                <UploadCloud className="w-3.5 h-3.5" />
              </button>
            </h3>
            <div className="space-y-1 p-1">
              {clientDocuments.filter((d) => d.category === "Saved").length ===
                0 && (
                <p className="text-xs text-[#8B949E]/70">
                  No saved documents yet
                </p>
              )}
              {clientDocuments
                .filter((d) => d.category === "Saved")
                .map((doc) => (
                  <div
                    key={doc.name}
                    onClick={() => handleDocumentSelect(doc)}
                    className={`flex flex-col p-1.5 rounded-md cursor-pointer transition-colors border max-w-full text-[13px] ${selectedFile?.name === doc.name && selectedFile?.source === "document" ? "bg-amber-500/10 border-amber-500 text-white" : "bg-brand-bg border-transparent hover:border-border-subtle text-[#8B949E]"}`}
                  >
                    {editingFile?.name === doc.name &&
                    editingFile?.type === "document" ? (
                      <div className="flex items-center space-x-2">
                        <input
                          autoFocus
                          value={editNameValue}
                          onChange={(e) => setEditNameValue(e.target.value)}
                          className="flex-1 bg-[#161B22] text-white text-sm px-2 py-1 rounded border border-amber-500 focus:outline-none"
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
                      <div className="flex items-center justify-between group">
                        <div className="flex items-center space-x-3 overflow-hidden">
                          <FileText
                            className={`w-4 h-4 shrink-0 text-amber-500`}
                          />
                          <span
                            className="text-sm font-medium truncate text-white"
                            title={doc.name}
                          >
                            {doc.name}
                          </span>
                        </div>
                        <div className="flex items-center shrink-0 ml-2 space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
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

          {/* Completed Documents */}
          <div
            onDragEnter={(e) => handleDragEnter(e, "Completed")}
            onDragLeave={(e) => handleDragLeave(e, "Completed")}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDropToSection(e, "Completed")}
            className={`transition-colors rounded-lg border-2 ${dragCategory === "Completed" ? "border-brand-purple bg-brand-purple/5" : "border-transparent"}`}
          >
            <h3 className="text-[10px] uppercase tracking-wider text-[#8B949E] font-semibold mb-2 flex items-center justify-between px-1 pt-1">
              <span>Completed Documents</span>
              <button
                onClick={() => {
                  setGenericUploadCategory("Completed");
                  genericFileInputRef.current?.click();
                }}
                className="hover:text-white transition-colors title='Upload Signed Document'"
                title="Upload Signed Document"
              >
                <UploadCloud className="w-3.5 h-3.5" />
              </button>
            </h3>
            <div className="space-y-1 p-1">
              {clientDocuments.filter((d) => d.category === "Completed")
                .length === 0 && (
                <p className="text-xs text-[#8B949E]/70">
                  No completed documents yet
                </p>
              )}
              {clientDocuments
                .filter((d) => d.category === "Completed")
                .map((doc) => (
                  <div
                    key={doc.name}
                    onClick={() => handleDocumentSelect(doc)}
                    className={`flex flex-col p-1.5 rounded-md cursor-pointer transition-colors border max-w-full text-[13px] ${selectedFile?.name === doc.name && selectedFile?.source === "document" ? "bg-brand-purple/10 border-brand-purple text-white" : "bg-brand-bg border-transparent hover:border-border-subtle text-[#8B949E]"}`}
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
                      <div className="flex items-center justify-between group">
                        <div className="flex items-center space-x-3 overflow-hidden">
                          <FileText
                            className={`w-4 h-4 shrink-0 text-brand-purple`}
                          />
                          <span
                            className="text-sm font-medium truncate text-white"
                            title={doc.name}
                          >
                            {doc.name}
                          </span>
                        </div>
                        <div className="flex items-center shrink-0 ml-2 space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
          {/* Extra Documents (Fallback for any old unmapped files) */}
          {clientDocuments.filter(
            (d) =>
              d.category === "Main" &&
              !templates.some((t) => t.name === d.name),
          ).length > 0 && (
            <div>
              <h3 className="text-[10px] uppercase tracking-wider text-[#8B949E] font-semibold mb-2 flex items-center justify-between">
                <span>Extra Documents</span>
              </h3>
              <div className="space-y-1">
                {clientDocuments
                  .filter(
                    (d) =>
                      d.category === "Main" &&
                      !templates.some((t) => t.name === d.name),
                  )
                  .map((doc) => (
                    <div
                      key={doc.name}
                      onClick={() => handleDocumentSelect(doc)}
                      className={`flex flex-col p-1.5 rounded-md cursor-pointer transition-colors border max-w-full text-[13px] ${selectedFile?.name === doc.name && selectedFile?.source === "document" ? "bg-gray-500/10 border-gray-500 text-white" : "bg-brand-bg border-transparent hover:border-border-subtle text-[#8B949E]"}`}
                    >
                      {editingFile?.name === doc.name &&
                      editingFile?.type === "document" ? (
                        <div className="flex items-center space-x-2">
                          <input
                            autoFocus
                            value={editNameValue}
                            onChange={(e) => setEditNameValue(e.target.value)}
                            className="flex-1 bg-[#161B22] text-white text-sm px-2 py-1 rounded border border-gray-500 focus:outline-none"
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
                        <div className="flex items-center justify-between group">
                          <div className="flex items-center space-x-3 overflow-hidden">
                            <FileText
                              className={`w-4 h-4 shrink-0 text-gray-500`}
                            />
                            <span
                              className="text-sm font-medium truncate text-white"
                              title={doc.name}
                            >
                              {doc.name}
                            </span>
                          </div>
                          <div className="flex items-center shrink-0 ml-2 space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
          )}
        </div>

        <input
          type="file"
          ref={genericFileInputRef}
          className="hidden"
          accept=".pdf"
          onChange={handleUploadGeneric}
        />
        <input
          type="file"
          ref={specificFileInputRef}
          className="hidden"
          accept=".pdf"
          onChange={handleUploadSpecific}
        />

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
              <p
                className="text-[10px] text-[#8B949E] truncate ml-4 max-w-sm"
                title="Fill the form in the preview below and click 'Download PDF' to save your copy. Then drag it to the upload dropzone on the left to save to client files."
              >
                <strong className="text-white">Save:</strong> Fill viewer,
                download, then upload file.
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
