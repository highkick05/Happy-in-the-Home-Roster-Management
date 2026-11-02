import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useDropzone } from "react-dropzone";
import {
  FileText,
  UploadCloud,
  File as FileIcon,
  X,
  Download,
  Trash2,
  FileImage,
  FileBarChart2,
  ArrowLeft,
  Folder,
  FolderPlus,
  RefreshCw,
  ExternalLink,
  Edit2,
  FolderInput,
  ChevronRight,
  CornerLeftUp,
  Search,
  LayoutList,
  LayoutGrid,
  Cloud,
  HardDrive,
  AlertCircle,
  CheckCircle2,
  Settings,
  Link2,
  Save,
  Plus,
  Eye
} from "lucide-react";
import * as xlsx from "xlsx";
import mammoth from "mammoth";

interface SharePointItem {
  id: string;
  name: string;
  size: number;
  webUrl: string;
  lastModifiedDateTime: string;
  lastModifiedBy?: string;
  isFolder: boolean;
  childCount?: number;
  mimeType?: string;
  downloadUrl?: string;
}

const formatFileSize = (bytes?: number) => {
  if (!bytes || isNaN(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
};

const FileThumbnail = ({
  file,
  size = "sm",
  isFolder = false
}: {
  file?: any;
  size?: "sm" | "lg" | "xl";
  isFolder?: boolean;
}) => {
  const iconProps = {
    className:
      size === "sm" ? "w-5 h-5" : size === "lg" ? "w-10 h-10" : "w-16 h-16",
    strokeWidth: 1.5
  };

  if (isFolder || file?.isFolder) {
    return (
      <Folder
        {...iconProps}
        className={`${iconProps.className} fill-amber-400/20 text-amber-400`}
      />
    );
  }

  if (!file) {
    return (
      <FileIcon {...iconProps} className={`${iconProps.className} text-zinc-400`} />
    );
  }

  const originalName = (file.name || "").toLowerCase();

  const isImage = originalName.match(
    /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|heic|heif|avif|tiff|tif)$/i
  );
  const isPdf = originalName.match(/\.pdf$/i);
  const isWord = originalName.match(/\.(doc|docx)$/i);
  const isExcel = originalName.match(/\.(xls|xlsx|csv)$/i);

  if (isImage) {
    return (
      <FileImage
        {...iconProps}
        className={`${iconProps.className} text-emerald-400`}
      />
    );
  }
  if (isPdf) {
    return (
      <FileText {...iconProps} className={`${iconProps.className} text-rose-500`} />
    );
  }
  if (isWord) {
    return (
      <FileText {...iconProps} className={`${iconProps.className} text-blue-400`} />
    );
  }
  if (isExcel) {
    return (
      <FileBarChart2
        {...iconProps}
        className={`${iconProps.className} text-green-500`}
      />
    );
  }

  return (
    <FileIcon {...iconProps} className={`${iconProps.className} text-zinc-400`} />
  );
};

export default function ClientDocumentsView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token, user } = useAuth();

  // Mode toggle: SharePoint Drive vs Local Storage (Templates & Completed)
  const [storageMode, setStorageMode] = useState<"SHAREPOINT" | "LOCAL">("SHAREPOINT");

  // ============================================================================
  // PROTECTED LOCAL DOCUMENTS STATE & HANDLERS (Templates & Completed Documents)
  // ============================================================================
  const [templates, setTemplates] = useState<any[]>([]);
  const [completedDocs, setCompletedDocs] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<any | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fetchClientDocuments = async () => {
    try {
      const res = await fetch(`/api/clients/${id}/documents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch documents");
      const docs = await res.json();

      const temps = docs.filter((d: any) => d.category === "Templates");
      const comps = docs.filter((d: any) => d.category === "Completed");

      setTemplates(temps);
      setCompletedDocs(comps);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchClientDocuments();
  }, [id, token]);

  const handleUpload = useCallback(
    async (acceptedFiles: File[], category: string) => {
      setIsUploading(true);
      for (const file of acceptedFiles) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("category", category);

        try {
          const res = await fetch(`/api/clients/${id}/documents/upload`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`
            },
            body: formData
          });
          if (!res.ok) throw new Error("Upload failed");
        } catch (err) {
          console.error("Upload error", err);
        }
      }
      setIsUploading(false);
      fetchClientDocuments();
    },
    [id, token]
  );

  const {
    getRootProps: getRootPropsTemplates,
    getInputProps: getInputPropsTemplates,
    isDragActive: isDragActiveTemplates
  } = useDropzone({
    onDrop: (files) => handleUpload(files, "Templates")
  });

  const {
    getRootProps: getRootPropsCompleted,
    getInputProps: getInputPropsCompleted,
    isDragActive: isDragActiveCompleted
  } = useDropzone({
    onDrop: (files) => handleUpload(files, "Completed")
  });

  const deleteDocument = async (name: string, category: string) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    try {
      await fetch(
        `/api/clients/${id}/documents/${encodeURIComponent(name)}?category=${category}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      fetchClientDocuments();
      if (selectedFile?.name === name && selectedFile?.category === category) {
        setSelectedFile(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const downloadFile = (name: string) => {
    const url = `/api/clients/${id}/documents/${encodeURIComponent(name)}/download?token=${token}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  useEffect(() => {
    if (!selectedFile) {
      setPreviewContent(null);
      setIsPreviewLoading(false);
      return;
    }

    const originalName = (selectedFile.name || "").toLowerCase();
    const isImage = originalName.match(
      /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|heic|heif|avif|tiff|tif)$/i
    );
    const isPdf = originalName.match(/\.pdf$/i);
    const isText = originalName.match(/\.(txt|md|csv|json)$/i);
    const isWord = originalName.match(/\.(doc|docx)$/i);
    const isExcel = originalName.match(/\.(xls|xlsx|csv)$/i);

    if (isImage || isPdf || isText || isWord || isExcel) {
      setIsPreviewLoading(true);
      fetch(
        `/api/clients/${id}/documents/${encodeURIComponent(selectedFile.name)}/download?token=${token}`
      )
        .then(async (res) => {
          if (!res.ok) throw new Error("Failed to fetch preview");
          const blob = await res.blob();
          return blob;
        })
        .then(async (blob) => {
          let finalBlob = blob;

          if (isExcel) {
            try {
              const arrayBuffer = await blob.arrayBuffer();
              const workbook = xlsx.read(arrayBuffer, { type: "array" });
              const firstSheetName = workbook.SheetNames[0];
              const htmlString = xlsx.utils.sheet_to_html(
                workbook.Sheets[firstSheetName]
              );
              finalBlob = new Blob(
                [
                  `<html><head><style>table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; } tr:nth-child(even){background-color: #f2f2f2;} body { font-family: sans-serif; padding: 20px; }</style></head><body>${htmlString}</body></html>`
                ],
                { type: "text/html" }
              );
            } catch (e) {
              console.error("Excel preview failed", e);
            }
          } else if (isWord) {
            try {
              const arrayBuffer = await blob.arrayBuffer();
              const result = await mammoth.convertToHtml({ arrayBuffer });
              finalBlob = new Blob(
                [
                  `<html><head><style>body { font-family: sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; } img { max-width: 100%; }</style></head><body>${result.value}</body></html>`
                ],
                { type: "text/html" }
              );
            } catch (e) {
              console.error("Word preview failed", e);
            }
          }
          const url = window.URL.createObjectURL(finalBlob);
          setPreviewContent(url);
          setIsPreviewLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setIsPreviewLoading(false);
        });
    } else {
      setPreviewContent(null);
      setIsPreviewLoading(false);
    }
  }, [selectedFile, id, token]);

  const renderFileItem = (file: any, category: string) => (
    <div
      key={file.name + category}
      onClick={(e) => {
        e.stopPropagation();
        setSelectedFile(file);
      }}
      className={`flex items-center justify-between p-3 mb-2 rounded-lg cursor-pointer transition-colors ${
        selectedFile?.name === file.name && selectedFile?.category === category
          ? "bg-brand-teal/20 border border-brand-teal/50"
          : "bg-[#111] hover:bg-zinc-800 border border-transparent"
      }`}
    >
      <div className="flex items-center space-x-3 truncate min-w-0 flex-1 mr-2">
        <FileThumbnail file={file} size="sm" />
        <span className="text-xs font-medium text-white truncate" title={file.name}>
          {file.name}
        </span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          deleteDocument(file.name, category);
        }}
        className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors shrink-0"
        title="Delete Document"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  // ============================================================================
  // SHAREPOINT CLOUD DRIVE STATE & HANDLERS
  // ============================================================================
  const [spLoading, setSpLoading] = useState(true);
  const [spError, setSpError] = useState<string | null>(null);
  const [spConfigured, setSpConfigured] = useState(true);
  const [spFolderExists, setSpFolderExists] = useState(false);
  const [spClientInfo, setSpClientInfo] = useState<{
    id: number;
    name: string;
    fundingType: string;
    status?: string;
    baseCategoryPath: string;
    folderName: string;
    fullSharePointPath: string;
    folderWebUrl?: string;
  } | null>(null);
  const [spAvailableSiblingFolders, setSpAvailableSiblingFolders] = useState<string[]>([]);
  const [spItems, setSpItems] = useState<SharePointItem[]>([]);
  const [spAllClientFolders, setSpAllClientFolders] = useState<
    Array<{ id: string; name: string; path: string }>
  >([]);
  const [currentSubpath, setCurrentSubpath] = useState<string>("");
  const [driveViewMode, setDriveViewMode] = useState<"list" | "grid">("list");
  const [spSearchQuery, setSpSearchQuery] = useState("");

  // Selected SharePoint File for Preview / Editing
  const [selectedSpItem, setSelectedSpItem] = useState<SharePointItem | null>(null);
  const [spPreviewUrl, setSpPreviewUrl] = useState<string | null>(null);
  const [spPreviewLoading, setSpPreviewLoading] = useState(false);
  const [spTextContent, setSpTextContent] = useState<string | null>(null);
  const [isEditingSpText, setIsEditingSpText] = useState(false);
  const [savingSpText, setSavingSpText] = useState(false);

  // Modals & Action States
  const [creatingClientFolder, setCreatingClientFolder] = useState(false);
  const [selectedLinkFolder, setSelectedLinkFolder] = useState("");
  const [linkingFolder, setLinkingFolder] = useState(false);

  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingSubfolder, setCreatingSubfolder] = useState(false);

  const [renamingItem, setRenamingItem] = useState<SharePointItem | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [savingRename, setSavingRename] = useState(false);

  const [movingItem, setMovingItem] = useState<SharePointItem | null>(null);
  const [moveTargetSubpath, setMoveTargetSubpath] = useState<string>("");
  const [savingMove, setSavingMove] = useState(false);

  const [spUploading, setSpUploading] = useState(false);
  const [spToast, setSpToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setSpToast({ type, text });
    setTimeout(() => setSpToast(null), 4500);
  };

  const fetchSharePointDrive = useCallback(
    async (subpath = currentSubpath) => {
      if (!id || !token) return;
      setSpLoading(true);
      setSpError(null);
      try {
        const res = await fetch(
          `/api/clients/${id}/sharepoint/items?subpath=${encodeURIComponent(subpath)}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        const data = await res.json();

        if (!res.ok) {
          setSpError(data.error || "Failed to load SharePoint folder.");
          setSpLoading(false);
          return;
        }

        setSpConfigured(Boolean(data.configured));
        setSpFolderExists(Boolean(data.folderExists));
        if (data.clientInfo) {
          setSpClientInfo(data.clientInfo);
        }
        if (Array.isArray(data.availableFolders)) {
          setSpAvailableSiblingFolders(data.availableFolders);
        }
        if (Array.isArray(data.items)) {
          setSpItems(data.items);
        } else {
          setSpItems([]);
        }
        if (Array.isArray(data.allSubfolders)) {
          setSpAllClientFolders(data.allSubfolders);
        }
      } catch (err: any) {
        setSpError(err.message || "Network error loading SharePoint drive.");
      } finally {
        setSpLoading(false);
      }
    },
    [id, token, currentSubpath]
  );

  useEffect(() => {
    if (storageMode === "SHAREPOINT") {
      fetchSharePointDrive(currentSubpath);
    }
  }, [storageMode, currentSubpath, fetchSharePointDrive]);

  // Create the Client's Root Folder on SharePoint (General\NDIS\Participant Files\<Name> or General\SAH\Clients\<Name>)
  const handleCreateClientRootFolder = async () => {
    if (!id || !token) return;
    setCreatingClientFolder(true);
    try {
      const res = await fetch(`/api/clients/${id}/sharepoint/init-folder`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create folder on SharePoint");
      showToast("success", `Created SharePoint folder "${data.folderName}"`);
      await fetchSharePointDrive("");
    } catch (err: any) {
      showToast("error", err.message || "Could not create SharePoint folder");
    } finally {
      setCreatingClientFolder(false);
    }
  };

  // Link to an existing folder in the parent SharePoint directory
  const handleLinkExistingFolder = async () => {
    if (!id || !token || !selectedLinkFolder) return;
    setLinkingFolder(true);
    try {
      const res = await fetch(`/api/clients/${id}/sharepoint/link-folder`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ folderName: selectedLinkFolder })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to link folder");
      showToast("success", `Linked to SharePoint folder "${selectedLinkFolder}"`);
      setCurrentSubpath("");
      await fetchSharePointDrive("");
    } catch (err: any) {
      showToast("error", err.message || "Failed to link SharePoint folder");
    } finally {
      setLinkingFolder(false);
    }
  };

  // Create a subfolder inside the current SharePoint directory
  const handleCreateSubfolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    setCreatingSubfolder(true);
    try {
      const res = await fetch(`/api/clients/${id}/sharepoint/folders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          subpath: currentSubpath,
          folderName: newFolderName.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create subfolder");
      showToast("success", `Created folder "${newFolderName.trim()}"`);
      setNewFolderName("");
      setShowNewFolderModal(false);
      await fetchSharePointDrive(currentSubpath);
    } catch (err: any) {
      showToast("error", err.message || "Failed to create subfolder");
    } finally {
      setCreatingSubfolder(false);
    }
  };

  // Upload files to current SharePoint folder
  const handleSpFileUpload = useCallback(
    async (acceptedFiles: File[]) => {
      if (!acceptedFiles.length || !id || !token) return;
      setSpUploading(true);
      let uploadedCount = 0;
      for (const file of acceptedFiles) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("subpath", currentSubpath);

        try {
          const res = await fetch(`/api/clients/${id}/sharepoint/upload`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `Failed to upload ${file.name}`);
          }
          uploadedCount++;
        } catch (err: any) {
          showToast("error", err.message || `Error uploading ${file.name}`);
        }
      }
      setSpUploading(false);
      if (uploadedCount > 0) {
        showToast(
          "success",
          `Uploaded ${uploadedCount} file${uploadedCount > 1 ? "s" : ""} to SharePoint`
        );
        await fetchSharePointDrive(currentSubpath);
      }
    },
    [id, token, currentSubpath, fetchSharePointDrive]
  );

  const {
    getRootProps: getSpDropRootProps,
    getInputProps: getSpDropInputProps,
    isDragActive: isSpDragActive,
    open: openSpFileDialog
  } = useDropzone({
    onDrop: handleSpFileUpload,
    noClick: true,
    noKeyboard: true
  });

  // Rename file or folder on SharePoint
  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingItem || !renameValue.trim()) return;
    setSavingRename(true);
    try {
      const res = await fetch(
        `/api/clients/${id}/sharepoint/items/${encodeURIComponent(renamingItem.id)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ name: renameValue.trim() })
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to rename item");
      showToast("success", `Renamed to "${renameValue.trim()}"`);
      if (selectedSpItem?.id === renamingItem.id) {
        setSelectedSpItem((prev) => (prev ? { ...prev, name: renameValue.trim() } : null));
      }
      setRenamingItem(null);
      await fetchSharePointDrive(currentSubpath);
    } catch (err: any) {
      showToast("error", err.message || "Failed to rename item");
    } finally {
      setSavingRename(false);
    }
  };

  // Move file or folder to another folder inside the client's SharePoint directory
  const executeMoveItem = async (item: SharePointItem, targetSubpathStr: string) => {
    setSavingMove(true);
    try {
      const res = await fetch(
        `/api/clients/${id}/sharepoint/items/${encodeURIComponent(item.id)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ targetSubpath: targetSubpathStr })
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to move item");
      showToast(
        "success",
        `Moved "${item.name}" to ${targetSubpathStr ? targetSubpathStr : "Client Root Folder"}`
      );
      if (selectedSpItem?.id === item.id) {
        setSelectedSpItem(null);
      }
      setMovingItem(null);
      await fetchSharePointDrive(currentSubpath);
    } catch (err: any) {
      showToast("error", err.message || "Failed to move item");
    } finally {
      setSavingMove(false);
    }
  };

  const handleMoveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movingItem) return;
    await executeMoveItem(movingItem, moveTargetSubpath);
  };

  // Delete file or folder on SharePoint
  const handleDeleteSpItem = async (item: SharePointItem) => {
    if (
      !window.confirm(
        `Move "${item.name}" to the SharePoint Recycle Bin?`
      )
    ) {
      return;
    }
    try {
      const res = await fetch(
        `/api/clients/${id}/sharepoint/items/${encodeURIComponent(item.id)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete item");
      }
      showToast("success", `Deleted "${item.name}" from SharePoint`);
      if (selectedSpItem?.id === item.id) {
        setSelectedSpItem(null);
      }
      await fetchSharePointDrive(currentSubpath);
    } catch (err: any) {
      showToast("error", err.message || "Failed to delete item");
    }
  };

  // Download file from SharePoint
  const handleDownloadSpItem = (item: SharePointItem) => {
    const url = `/api/clients/${id}/sharepoint/items/${encodeURIComponent(item.id)}/content?download=1&name=${encodeURIComponent(item.name)}&token=${token}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = item.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Save in-portal edited text file directly back to SharePoint
  const handleSaveSpTextContent = async () => {
    if (!selectedSpItem || spTextContent === null) return;
    setSavingSpText(true);
    try {
      const res = await fetch(
        `/api/clients/${id}/sharepoint/items/${encodeURIComponent(selectedSpItem.id)}/content`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "text/plain;charset=utf-8",
            Authorization: `Bearer ${token}`
          },
          body: spTextContent
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save changes to SharePoint");
      showToast("success", `Saved "${selectedSpItem.name}" to SharePoint`);
      setIsEditingSpText(false);
      await fetchSharePointDrive(currentSubpath);
    } catch (err: any) {
      showToast("error", err.message || "Failed to save file to SharePoint");
    } finally {
      setSavingSpText(false);
    }
  };

  // Load Preview when a SharePoint file is selected
  useEffect(() => {
    if (!selectedSpItem || selectedSpItem.isFolder) {
      setSpPreviewUrl(null);
      setSpTextContent(null);
      setIsEditingSpText(false);
      setSpPreviewLoading(false);
      return;
    }

    const nameLower = (selectedSpItem.name || "").toLowerCase();
    const isImage = Boolean(
      nameLower.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|heic|heif|avif|tiff|tif)$/i)
    );
    const isPdf = Boolean(nameLower.match(/\.pdf$/i));
    const isText = Boolean(nameLower.match(/\.(txt|md|csv|json|log)$/i));
    const isWord = Boolean(nameLower.match(/\.(doc|docx)$/i));
    const isExcel = Boolean(nameLower.match(/\.(xls|xlsx)$/i));

    if (!isImage && !isPdf && !isText && !isWord && !isExcel) {
      setSpPreviewUrl(null);
      setSpTextContent(null);
      setSpPreviewLoading(false);
      return;
    }

    let revokedUrl: string | null = null;
    setSpPreviewLoading(true);
    setIsEditingSpText(false);

    fetch(
      `/api/clients/${id}/sharepoint/items/${encodeURIComponent(selectedSpItem.id)}/content?token=${token}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    )
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load file preview from SharePoint");
        return await res.blob();
      })
      .then(async (blob) => {
        if (isText) {
          const text = await blob.text();
          setSpTextContent(text);
        } else {
          setSpTextContent(null);
        }

        let finalBlob = blob;
        if (isExcel) {
          try {
            const arrayBuffer = await blob.arrayBuffer();
            const workbook = xlsx.read(arrayBuffer, { type: "array" });
            const firstSheetName = workbook.SheetNames[0];
            const htmlString = xlsx.utils.sheet_to_html(
              workbook.Sheets[firstSheetName]
            );
            finalBlob = new Blob(
              [
                `<html><head><style>table { border-collapse: collapse; width: 100%; font-size: 13px; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; } tr:nth-child(even){background-color: #f8fafc;} body { font-family: system-ui, sans-serif; padding: 20px; color: #0f172a; }</style></head><body>${htmlString}</body></html>`
              ],
              { type: "text/html" }
            );
          } catch (e) {
            console.error("Excel preview conversion error:", e);
          }
        } else if (isWord) {
          try {
            const arrayBuffer = await blob.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer });
            finalBlob = new Blob(
              [
                `<html><head><style>body { font-family: system-ui, sans-serif; padding: 32px; max-width: 800px; margin: 0 auto; line-height: 1.6; color: #0f172a; } img { max-width: 100%; }</style></head><body>${result.value}</body></html>`
              ],
              { type: "text/html" }
            );
          } catch (e) {
            console.error("Word preview conversion error:", e);
          }
        } else if (isPdf) {
          finalBlob = new Blob([blob], { type: "application/pdf" });
        }

        const url = window.URL.createObjectURL(finalBlob);
        revokedUrl = url;
        setSpPreviewUrl(url);
        setSpPreviewLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setSpPreviewUrl(null);
        setSpPreviewLoading(false);
      });

    return () => {
      if (revokedUrl) window.URL.revokeObjectURL(revokedUrl);
    };
  }, [selectedSpItem, id, token]);

  // Filtered SharePoint items (Folders first, then alphabetical)
  const filteredSpItems = useMemo(() => {
    const q = spSearchQuery.trim().toLowerCase();
    return [...spItems]
      .filter((item) => !q || item.name.toLowerCase().includes(q))
      .sort((a, b) => {
        if (a.isFolder && !b.isFolder) return -1;
        if (!a.isFolder && b.isFolder) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [spItems, spSearchQuery]);

  // Breadcrumb segments
  const breadcrumbs = useMemo(() => {
    if (!currentSubpath) return [];
    return currentSubpath.split("/").filter(Boolean);
  }, [currentSubpath]);

  const navigateToSubfolder = (folderName: string) => {
    setSelectedSpItem(null);
    const nextPath = currentSubpath ? `${currentSubpath}/${folderName}` : folderName;
    setCurrentSubpath(nextPath);
  };

  const navigateUpOneLevel = () => {
    if (!currentSubpath) return;
    setSelectedSpItem(null);
    const parts = currentSubpath.split("/").filter(Boolean);
    parts.pop();
    setCurrentSubpath(parts.join("/"));
  };

  return (
    <div className="flex flex-col h-full flex-1 overflow-hidden bg-[#0a0a0a]">
      {/* Top Notification Toast */}
      {spToast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl border shadow-xl flex items-center gap-2.5 text-xs font-medium transition-all ${
            spToast.type === "success"
              ? "bg-emerald-950/95 border-emerald-500/40 text-emerald-200"
              : "bg-red-950/95 border-red-500/40 text-red-200"
          }`}
        >
          {spToast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{spToast.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-3.5 border-b border-white/[0.06] bg-[#111] shrink-0 gap-3">
        <div className="flex items-center min-w-0">
          <button
            onClick={() => navigate(`/clients/${id}`)}
            className="mr-3.5 p-2 rounded-lg hover:bg-white/5 transition-colors text-zinc-400 hover:text-white shrink-0"
            title="Back to Client Profile"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold text-white truncate">
                {spClientInfo?.name ? `${spClientInfo.name} — Documents` : "Client Documents"}
              </h1>
              {spClientInfo?.fundingType && (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-brand-teal/15 text-brand-teal border border-brand-teal/30">
                  {spClientInfo.fundingType === "NDIS" ? "NDIS Participant" : "Home Care (SAH)"}
                </span>
              )}
              {spClientInfo?.status === "SUSPENDED" && (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-red-500/15 text-red-400 border border-red-500/30">
                  Suspended
                </span>
              )}
            </div>
            {spClientInfo?.fullSharePointPath && storageMode === "SHAREPOINT" && (
              <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5 font-mono truncate">
                <Cloud className="w-3.5 h-3.5 text-brand-teal shrink-0" />
                <span className="truncate">
                  SharePoint: {spClientInfo.fullSharePointPath.replace(/\//g, "\\")}
                </span>
                {spClientInfo.folderWebUrl && (
                  <a
                    href={spClientInfo.folderWebUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-brand-teal hover:underline font-sans ml-1 shrink-0"
                  >
                    Open in SharePoint <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Storage Mode Switcher */}
        <div className="flex items-center gap-1.5 bg-[#0a0a0a] p-1 rounded-lg border border-white/[0.07] shrink-0">
          <button
            type="button"
            onClick={() => setStorageMode("SHAREPOINT")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
              storageMode === "SHAREPOINT"
                ? "bg-brand-teal text-black font-semibold shadow-xs"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>SharePoint Drive</span>
          </button>
          <button
            type="button"
            onClick={() => setStorageMode("LOCAL")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
              storageMode === "LOCAL"
                ? "bg-white/15 text-white font-semibold"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Local Templates &amp; Completed</span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MODE 1: SHAREPOINT CLOUD DRIVE EXPLORER                              */}
      {/* ==================================================================== */}
      {storageMode === "SHAREPOINT" ? (
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {spLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-zinc-400">
              <RefreshCw className="w-8 h-8 animate-spin text-brand-teal mb-3" />
              <p className="text-sm font-medium text-white">Syncing with SharePoint Online...</p>
              <p className="text-xs text-zinc-500 mt-1">
                Resolving participant folder &amp; loading files
              </p>
            </div>
          ) : !spConfigured ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="max-w-lg w-full bg-[#111] border border-white/[0.08] rounded-2xl p-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-brand-teal/10 border border-brand-teal/20 flex items-center justify-center mx-auto text-brand-teal">
                  <Cloud className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">
                    SharePoint Online Is Not Connected Yet
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                    Connect your Microsoft SharePoint site in <strong>Settings &rarr; SharePoint</strong> to automatically map NDIS participants to{" "}
                    <code className="text-brand-teal">General\NDIS\Participant Files</code> and Home Care clients to{" "}
                    <code className="text-brand-teal">General\SAH\Clients</code>.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem("settings_active_tab", JSON.stringify("SHAREPOINT"));
                      navigate("/settings");
                    }}
                    className="px-4 py-2 bg-brand-teal hover:bg-teal-400 text-black font-semibold rounded-lg text-xs inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Open SharePoint Settings</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStorageMode("LOCAL")}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-lg text-xs transition-colors"
                  >
                    Use Local Storage Instead
                  </button>
                </div>
              </div>
            </div>
          ) : spError ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="max-w-lg w-full bg-[#111] border border-red-500/20 rounded-2xl p-6 text-center space-y-4">
                <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
                <div>
                  <h2 className="text-base font-semibold text-white">
                    SharePoint Connection Issue
                  </h2>
                  <p className="text-xs text-red-300/90 mt-1.5">{spError}</p>
                </div>
                <div className="flex items-center justify-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => fetchSharePointDrive(currentSubpath)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-lg text-xs font-medium inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Retry
                  </button>
                  {user?.role === "ADMIN" && (
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.setItem("settings_active_tab", JSON.stringify("SHAREPOINT"));
                        navigate("/settings");
                      }}
                      className="px-4 py-2 bg-brand-teal/15 hover:bg-brand-teal/25 text-brand-teal border border-brand-teal/30 rounded-lg text-xs font-medium inline-flex items-center gap-1.5"
                    >
                      <Settings className="w-3.5 h-3.5" /> Check SharePoint Settings
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : !spFolderExists ? (
            /* Client / Participant Folder Does Not Exist Yet on SharePoint */
            <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
              <div className="max-w-xl w-full bg-[#111] border border-white/[0.08] rounded-2xl p-6 space-y-5">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                    <FolderPlus className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-white">
                      SharePoint Folder Not Set Up Yet for {spClientInfo?.name}
                    </h2>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      We checked{" "}
                      <code className="text-brand-teal bg-white/5 px-1.5 py-0.5 rounded">
                        {(spClientInfo?.baseCategoryPath || "").replace(/\//g, "\\")}
                      </code>{" "}
                      on SharePoint, and no folder named{" "}
                      <strong className="text-white">&ldquo;{spClientInfo?.folderName}&rdquo;</strong>{" "}
                      exists yet.
                    </p>
                  </div>
                </div>

                {/* Option 1: 1-Click Create Folder on SharePoint */}
                <div className="p-4 rounded-xl bg-[#0a0a0a] border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-white">
                      Create New SharePoint Folder
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5 font-mono">
                      {(spClientInfo?.fullSharePointPath || "").replace(/\//g, "\\")}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateClientRootFolder}
                    disabled={creatingClientFolder}
                    className="px-4 py-2 bg-brand-teal hover:bg-teal-400 text-black font-semibold rounded-lg text-xs inline-flex items-center gap-1.5 shrink-0 transition-colors disabled:opacity-50"
                  >
                    {creatingClientFolder ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <FolderPlus className="w-3.5 h-3.5" />
                        <span>Create Folder on SharePoint</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Option 2: Link to an Existing Folder if named differently */}
                {spAvailableSiblingFolders.length > 0 && (
                  <div className="p-4 rounded-xl bg-[#0a0a0a] border border-white/[0.06] space-y-3">
                    <div>
                      <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                        <Link2 className="w-3.5 h-3.5 text-brand-teal" />
                        <span>Or Link to an Existing Folder in {(spClientInfo?.baseCategoryPath || "").replace(/\//g, "\\")}</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        If this participant&apos;s folder already exists on SharePoint under a slightly different spelling, select it below:
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <select
                        value={selectedLinkFolder}
                        onChange={(e) => setSelectedLinkFolder(e.target.value)}
                        className="flex-1 bg-[#111] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-brand-teal"
                      >
                        <option value="">Select an existing SharePoint folder...</option>
                        {spAvailableSiblingFolders.map((folderName) => (
                          <option key={folderName} value={folderName}>
                            {folderName}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleLinkExistingFolder}
                        disabled={!selectedLinkFolder || linkingFolder}
                        className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white font-medium rounded-lg text-xs inline-flex items-center justify-center gap-1.5 shrink-0 transition-colors disabled:opacity-40"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        <span>{linkingFolder ? "Linking..." : "Link Folder"}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Full SharePoint File Drive Explorer */
            <div
              {...getSpDropRootProps()}
              className="flex-1 flex flex-col overflow-hidden min-h-0 relative"
            >
              <input {...getSpDropInputProps()} />

              {/* Drag & Drop Overlay */}
              {isSpDragActive && (
                <div className="absolute inset-0 z-40 bg-brand-teal/10 backdrop-blur-xs border-2 border-dashed border-brand-teal rounded-xl m-3 flex flex-col items-center justify-center pointer-events-none">
                  <UploadCloud className="w-14 h-14 text-brand-teal mb-2 animate-bounce" />
                  <p className="text-base font-semibold text-white">
                    Drop files to upload directly to SharePoint
                  </p>
                  <p className="text-xs text-brand-teal mt-1 font-mono">
                    {(spClientInfo?.fullSharePointPath || "").replace(/\//g, "\\")}
                    {currentSubpath ? `\\${currentSubpath.replace(/\//g, "\\")}` : ""}
                  </p>
                </div>
              )}

              {/* Drive Toolbar: Breadcrumbs, Search, Actions */}
              <div className="px-6 py-3 bg-[#141414] border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-3 shrink-0">
                {/* Breadcrumb Navigation */}
                <div className="flex items-center gap-1 text-xs overflow-x-auto min-w-0 py-0.5">
                  {currentSubpath && (
                    <button
                      type="button"
                      onClick={navigateUpOneLevel}
                      className="p-1.5 mr-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
                      title="Up one folder"
                    >
                      <CornerLeftUp className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSpItem(null);
                      setCurrentSubpath("");
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const draggedItemJson = e.dataTransfer.getData("application/x-sp-item");
                      if (draggedItemJson && currentSubpath !== "") {
                        try {
                          const item = JSON.parse(draggedItemJson) as SharePointItem;
                          executeMoveItem(item, "");
                        } catch {}
                      }
                    }}
                    className={`px-2 py-1 rounded-md font-medium flex items-center gap-1.5 transition-colors ${
                      !currentSubpath
                        ? "bg-brand-teal/15 text-brand-teal font-semibold"
                        : "text-zinc-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Folder className="w-3.5 h-3.5 text-brand-teal" />
                    <span>{spClientInfo?.folderName || "Participant Root"}</span>
                  </button>

                  {breadcrumbs.map((segment, index) => {
                    const targetSub = breadcrumbs.slice(0, index + 1).join("/");
                    const isLast = index === breadcrumbs.length - 1;
                    return (
                      <React.Fragment key={targetSub}>
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSpItem(null);
                            setCurrentSubpath(targetSub);
                          }}
                          className={`px-2 py-1 rounded-md font-medium truncate max-w-[180px] transition-colors ${
                            isLast
                              ? "bg-brand-teal/15 text-brand-teal font-semibold"
                              : "text-zinc-400 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          {segment}
                        </button>
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Right Drive Controls */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={spSearchQuery}
                      onChange={(e) => setSpSearchQuery(e.target.value)}
                      placeholder="Filter folder..."
                      className="bg-[#0a0a0a] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-brand-teal w-40 sm:w-48"
                    />
                  </div>

                  {/* List / Grid View Toggle */}
                  <div className="flex items-center bg-[#0a0a0a] p-0.5 rounded-lg border border-white/10">
                    <button
                      type="button"
                      onClick={() => setDriveViewMode("list")}
                      className={`p-1.5 rounded-md transition-colors ${
                        driveViewMode === "list"
                          ? "bg-white/15 text-white"
                          : "text-zinc-500 hover:text-zinc-300"
                      }`}
                      title="List View"
                    >
                      <LayoutList className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDriveViewMode("grid")}
                      className={`p-1.5 rounded-md transition-colors ${
                        driveViewMode === "grid"
                          ? "bg-white/15 text-white"
                          : "text-zinc-500 hover:text-zinc-300"
                      }`}
                      title="Grid View"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* New Folder Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setNewFolderName("");
                      setShowNewFolderModal(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-medium text-white inline-flex items-center gap-1.5 transition-colors"
                  >
                    <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
                    <span>New Folder</span>
                  </button>

                  {/* Upload Files Button */}
                  <button
                    type="button"
                    onClick={openSpFileDialog}
                    disabled={spUploading}
                    className="px-3.5 py-1.5 rounded-lg bg-brand-teal hover:bg-teal-400 text-black text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
                  >
                    {spUploading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Upload to SharePoint</span>
                      </>
                    )}
                  </button>

                  {/* Refresh Button */}
                  <button
                    type="button"
                    onClick={() => fetchSharePointDrive(currentSubpath)}
                    className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-zinc-300 hover:text-white transition-colors"
                    title="Refresh from SharePoint"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Main Split Body: File Explorer (Left) + Preview/Editor (Right) */}
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden min-h-0">
                {/* Left Explorer Pane */}
                <div
                  className={`${
                    selectedSpItem ? "lg:col-span-7 border-r border-white/[0.06]" : "lg:col-span-12"
                  } flex flex-col overflow-y-auto min-h-0 p-4 sm:p-6`}
                >
                  {filteredSpItems.length === 0 ? (
                    <div
                      onClick={openSpFileDialog}
                      className="flex-1 min-h-[280px] border-2 border-dashed border-white/[0.08] hover:border-brand-teal/40 rounded-2xl flex flex-col items-center justify-center p-8 text-center cursor-pointer transition-colors"
                    >
                      <Folder className="w-12 h-12 text-zinc-600 mb-3" />
                      <p className="text-sm font-medium text-zinc-300">
                        {spSearchQuery
                          ? "No files or folders match your search"
                          : "This SharePoint folder is empty"}
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">
                        Drag &amp; drop files here, click to upload, or click &ldquo;New Folder&rdquo; above
                      </p>
                    </div>
                  ) : driveViewMode === "list" ? (
                    <div className="bg-[#111] border border-white/[0.06] rounded-xl overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-white/[0.06] text-[10px] font-semibold uppercase tracking-wider text-zinc-400 bg-white/[0.02]">
                            <th className="py-2.5 px-4">Name</th>
                            <th className="py-2.5 px-3 hidden sm:table-cell">Modified</th>
                            <th className="py-2.5 px-3 hidden md:table-cell">Modified By</th>
                            <th className="py-2.5 px-3 hidden sm:table-cell text-right">Size</th>
                            <th className="py-2.5 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04] text-xs">
                          {filteredSpItems.map((item) => {
                            const isSelected = selectedSpItem?.id === item.id;
                            const isDragTarget = dragOverFolderId === item.id;
                            return (
                              <tr
                                key={item.id}
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.setData(
                                    "application/x-sp-item",
                                    JSON.stringify(item)
                                  );
                                }}
                                onDragOver={(e) => {
                                  if (item.isFolder) {
                                    e.preventDefault();
                                    setDragOverFolderId(item.id);
                                  }
                                }}
                                onDragLeave={() => {
                                  if (dragOverFolderId === item.id) setDragOverFolderId(null);
                                }}
                                onDrop={(e) => {
                                  if (!item.isFolder) return;
                                  e.preventDefault();
                                  setDragOverFolderId(null);
                                  const draggedJson = e.dataTransfer.getData("application/x-sp-item");
                                  if (draggedJson) {
                                    try {
                                      const dragged = JSON.parse(draggedJson) as SharePointItem;
                                      if (dragged.id !== item.id) {
                                        const targetSub = currentSubpath
                                          ? `${currentSubpath}/${item.name}`
                                          : item.name;
                                        executeMoveItem(dragged, targetSub);
                                      }
                                    } catch {}
                                  }
                                }}
                                onClick={() => {
                                  if (item.isFolder) {
                                    navigateToSubfolder(item.name);
                                  } else {
                                    setSelectedSpItem(item);
                                  }
                                }}
                                className={`cursor-pointer transition-colors ${
                                  isDragTarget
                                    ? "bg-brand-teal/25 ring-1 ring-brand-teal"
                                    : isSelected
                                    ? "bg-brand-teal/15"
                                    : "hover:bg-white/[0.04]"
                                }`}
                              >
                                <td className="py-2.5 px-4 max-w-[260px] sm:max-w-[340px]">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <FileThumbnail
                                      file={item}
                                      size="sm"
                                      isFolder={item.isFolder}
                                    />
                                    <div className="min-w-0 flex-1">
                                      <div
                                        className="font-medium text-white truncate"
                                        title={item.name}
                                      >
                                        {item.name}
                                      </div>
                                      {item.isFolder && item.childCount !== undefined && (
                                        <div className="text-[10px] text-zinc-500">
                                          {item.childCount} item{item.childCount === 1 ? "" : "s"}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-zinc-400 hidden sm:table-cell whitespace-nowrap">
                                  {item.lastModifiedDateTime
                                    ? new Date(item.lastModifiedDateTime).toLocaleDateString(
                                        "en-AU",
                                        {
                                          day: "2-digit",
                                          month: "short",
                                          year: "numeric"
                                        }
                                      )
                                    : "—"}
                                </td>
                                <td className="py-2.5 px-3 text-zinc-400 hidden md:table-cell truncate max-w-[140px]">
                                  {item.lastModifiedBy || "SharePoint"}
                                </td>
                                <td className="py-2.5 px-3 text-zinc-400 hidden sm:table-cell text-right whitespace-nowrap font-mono text-[11px]">
                                  {item.isFolder ? "Folder" : formatFileSize(item.size)}
                                </td>
                                <td
                                  className="py-2.5 px-4 text-right whitespace-nowrap"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="inline-flex items-center gap-1">
                                    {item.webUrl && (
                                      <a
                                        href={item.webUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-1.5 text-zinc-400 hover:text-brand-teal hover:bg-brand-teal/10 rounded-md transition-colors"
                                        title={
                                          item.isFolder
                                            ? "Open Folder in SharePoint"
                                            : "Edit / Open in SharePoint (Office Online)"
                                        }
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </a>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRenamingItem(item);
                                        setRenameValue(item.name);
                                      }}
                                      className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                                      title="Rename"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setMovingItem(item);
                                        setMoveTargetSubpath(currentSubpath);
                                      }}
                                      className="p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-amber-400/10 rounded-md transition-colors"
                                      title="Move to Folder..."
                                    >
                                      <FolderInput className="w-3.5 h-3.5" />
                                    </button>
                                    {!item.isFolder && (
                                      <button
                                        type="button"
                                        onClick={() => handleDownloadSpItem(item)}
                                        className="p-1.5 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-md transition-colors"
                                        title="Download"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteSpItem(item)}
                                      className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    /* Grid View */
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {filteredSpItems.map((item) => {
                        const isSelected = selectedSpItem?.id === item.id;
                        return (
                          <div
                            key={item.id}
                            onClick={() => {
                              if (item.isFolder) {
                                navigateToSubfolder(item.name);
                              } else {
                                setSelectedSpItem(item);
                              }
                            }}
                            className={`group p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                              isSelected
                                ? "bg-brand-teal/15 border-brand-teal/50"
                                : "bg-[#111] border-white/[0.06] hover:border-white/20"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-3">
                              <FileThumbnail
                                file={item}
                                size="lg"
                                isFolder={item.isFolder}
                              />
                              <div
                                className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {item.webUrl && (
                                  <a
                                    href={item.webUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1 text-zinc-400 hover:text-brand-teal rounded"
                                    title="Edit in SharePoint"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRenamingItem(item);
                                    setRenameValue(item.name);
                                  }}
                                  className="p-1 text-zinc-400 hover:text-white rounded"
                                  title="Rename"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMovingItem(item);
                                    setMoveTargetSubpath(currentSubpath);
                                  }}
                                  className="p-1 text-zinc-400 hover:text-amber-400 rounded"
                                  title="Move"
                                >
                                  <FolderInput className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            <div>
                              <div
                                className="text-xs font-medium text-white truncate"
                                title={item.name}
                              >
                                {item.name}
                              </div>
                              <div className="text-[10px] text-zinc-500 mt-0.5 flex items-center justify-between">
                                <span>
                                  {item.isFolder
                                    ? `${item.childCount ?? 0} items`
                                    : formatFileSize(item.size)}
                                </span>
                                <span>
                                  {item.lastModifiedDateTime
                                    ? new Date(
                                        item.lastModifiedDateTime
                                      ).toLocaleDateString("en-AU")
                                    : ""}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right File Preview & Live Edit Drawer */}
                {selectedSpItem && (
                  <div className="lg:col-span-5 flex flex-col bg-[#0d0d0d] overflow-hidden min-h-0">
                    {/* Drawer Header */}
                    <div className="px-4 py-3 bg-[#141414] border-b border-white/[0.06] flex items-center justify-between gap-2 shrink-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileThumbnail file={selectedSpItem} size="sm" />
                        <div className="min-w-0">
                          <h3
                            className="text-xs font-semibold text-white truncate"
                            title={selectedSpItem.name}
                          >
                            {selectedSpItem.name}
                          </h3>
                          <p className="text-[10px] text-zinc-400">
                            {formatFileSize(selectedSpItem.size)} • Synced with SharePoint
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedSpItem(null)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
                        title="Close Preview"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Preview / Editor Body */}
                    <div className="flex-1 relative flex flex-col items-center justify-center bg-black/40 overflow-hidden min-h-0">
                      {spPreviewLoading ? (
                        <div className="text-zinc-400 flex flex-col items-center">
                          <RefreshCw className="w-8 h-8 animate-spin text-brand-teal mb-2.5" />
                          <p className="text-xs">Loading preview from SharePoint...</p>
                        </div>
                      ) : isEditingSpText && spTextContent !== null ? (
                        <div className="w-full h-full flex flex-col p-3">
                          <textarea
                            value={spTextContent}
                            onChange={(e) => setSpTextContent(e.target.value)}
                            className="w-full flex-1 bg-[#111] border border-white/15 rounded-lg p-3 text-xs text-white font-mono outline-none focus:border-brand-teal resize-none"
                          />
                          <div className="flex items-center justify-end gap-2 pt-2.5">
                            <button
                              type="button"
                              onClick={() => setIsEditingSpText(false)}
                              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-zinc-300"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveSpTextContent}
                              disabled={savingSpText}
                              className="px-3.5 py-1.5 rounded-lg bg-brand-teal hover:bg-teal-400 text-black font-semibold text-xs inline-flex items-center gap-1.5"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>{savingSpText ? "Saving to SharePoint..." : "Save to SharePoint"}</span>
                            </button>
                          </div>
                        </div>
                      ) : spPreviewUrl ? (
                        selectedSpItem.name
                          .toLowerCase()
                          .match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|heic|heif|avif|tiff|tif)$/i) ? (
                          <img
                            src={spPreviewUrl}
                            alt={selectedSpItem.name}
                            className="max-w-full max-h-full object-contain p-4"
                          />
                        ) : (
                          <iframe
                            src={spPreviewUrl}
                            title={selectedSpItem.name}
                            className="w-full h-full bg-white border-none block"
                          />
                        )
                      ) : (
                        <div className="p-8 text-center space-y-3 max-w-xs">
                          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto">
                            <FileThumbnail file={selectedSpItem} size="lg" />
                          </div>
                          <h4 className="text-sm font-semibold text-white">
                            {selectedSpItem.name}
                          </h4>
                          <p className="text-xs text-zinc-400">
                            Open this file directly in SharePoint Office Online to view or co-edit in real time.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Drawer Footer Actions */}
                    <div className="p-3.5 bg-[#141414] border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2 shrink-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {selectedSpItem.webUrl && (
                          <a
                            href={selectedSpItem.webUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3.5 py-2 bg-brand-teal hover:bg-teal-400 text-black text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors shadow-xs"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Edit in SharePoint / Office Online</span>
                          </a>
                        )}
                        {spTextContent !== null && !isEditingSpText && (
                          <button
                            type="button"
                            onClick={() => setIsEditingSpText(true)}
                            className="px-3 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-medium rounded-lg inline-flex items-center gap-1.5 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Quick Edit Text</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDownloadSpItem(selectedSpItem)}
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
                          title="Download File"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSpItem(selectedSpItem)}
                          className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                          title="Delete File"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ==================================================================== */
        /* MODE 2: PROTECTED LOCAL TEMPLATES & COMPLETED DOCUMENTS              */
        /* ==================================================================== */
        <div className="grid grid-cols-1 lg:grid-cols-3 flex-1 overflow-hidden min-h-0 w-full">
          {/* Templates Column */}
          <div className="flex flex-col min-w-0 min-h-0 p-4 lg:p-6 border-b lg:border-b-0 lg:border-r border-white/[0.05] overflow-hidden">
            <h2 className="text-lg font-semibold text-white mb-4 shrink-0">Templates</h2>
            <div
              {...getRootPropsTemplates()}
              className={`flex-1 relative border-2 border-dashed rounded-xl flex flex-col overflow-hidden min-h-0 transition-colors ${
                isDragActiveTemplates
                  ? "border-brand-teal bg-brand-teal/5"
                  : "border-white/[0.1] hover:border-brand-teal/50"
              }`}
            >
              <input {...getInputPropsTemplates()} />

              {/* Background Dropzone Indicator */}
              {(templates.length === 0 || isDragActiveTemplates) && (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-zinc-500 pointer-events-none z-20"
                  style={{
                    backgroundColor: isDragActiveTemplates ? "rgba(0,0,0,0.5)" : "transparent"
                  }}
                >
                  <UploadCloud className="w-16 h-16 mb-4 opacity-50" />
                  <p className="text-lg font-medium text-zinc-400 mb-2">
                    Drag &amp; Drop Templates Here
                  </p>
                  <p className="text-sm">or click to select files</p>
                </div>
              )}

              {/* File List */}
              <div className="flex-1 overflow-y-auto p-4 z-10 min-h-0">
                {templates.map((file) => renderFileItem(file, "Templates"))}
              </div>
            </div>
          </div>

          {/* Completed Column */}
          <div className="flex flex-col min-w-0 min-h-0 p-4 lg:p-6 border-b lg:border-b-0 lg:border-r border-white/[0.05] overflow-hidden">
            <h2 className="text-lg font-semibold text-white mb-4 shrink-0">
              Completed Documents
            </h2>
            <div
              {...getRootPropsCompleted()}
              className={`flex-1 relative border-2 border-dashed rounded-xl flex flex-col overflow-hidden min-h-0 transition-colors ${
                isDragActiveCompleted
                  ? "border-brand-teal bg-brand-teal/5"
                  : "border-white/[0.1] hover:border-brand-teal/50"
              }`}
            >
              <input {...getInputPropsCompleted()} />

              {/* Background Dropzone Indicator */}
              {(completedDocs.length === 0 || isDragActiveCompleted) && (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-zinc-500 pointer-events-none z-20"
                  style={{
                    backgroundColor: isDragActiveCompleted ? "rgba(0,0,0,0.5)" : "transparent"
                  }}
                >
                  <UploadCloud className="w-16 h-16 mb-4 opacity-50" />
                  <p className="text-lg font-medium text-zinc-400 mb-2">
                    Drag &amp; Drop Completed Documents Here
                  </p>
                  <p className="text-sm">or click to select files</p>
                </div>
              )}

              {/* File List */}
              <div className="flex-1 overflow-y-auto p-4 z-10 min-h-0">
                {completedDocs.map((file) => renderFileItem(file, "Completed"))}
              </div>
            </div>
          </div>

          {/* Right Preview Panel */}
          <div className="flex flex-col min-w-0 min-h-0 bg-[#0a0a0a] overflow-hidden">
            {selectedFile ? (
              <div className="w-full h-full flex flex-col overflow-hidden min-w-0 min-h-0">
                <div className="flex-1 relative flex items-center justify-center bg-black/40 min-h-0 min-w-0 border-b border-white/[0.05] overflow-hidden">
                  {isPreviewLoading ? (
                    <div className="text-zinc-500 flex flex-col items-center animate-pulse">
                      <FileIcon className="w-12 h-12 mb-3 opacity-30" strokeWidth={1} />
                      <p className="text-sm">Loading preview...</p>
                    </div>
                  ) : previewContent ? (
                    selectedFile.name
                      .toLowerCase()
                      .match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|heic|heif|avif|tiff|tif)$/i) ? (
                      <img
                        src={previewContent}
                        alt={selectedFile.name}
                        className="max-w-full max-h-full object-contain drop-shadow-md"
                      />
                    ) : (
                      <iframe
                        src={previewContent}
                        title={selectedFile.name}
                        className="w-full h-full bg-white border-none block"
                      />
                    )
                  ) : (
                    <div className="p-10 flex flex-col items-center text-center">
                      <div className="p-6 bg-zinc-800/80 rounded-full shadow-inner mb-6 flex items-center justify-center">
                        <FileThumbnail file={selectedFile} size="xl" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">Preview Error</h3>
                      <p className="text-zinc-500 text-sm max-w-xs">
                        Could not generate preview for this document. Please download the file to view or edit it.
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-[#111] p-4 lg:p-6 shrink-0 flex items-center justify-between min-w-0 gap-3">
                  <div className="flex-1 min-w-0">
                    <h3
                      className="text-base font-medium text-white mb-0.5 truncate"
                      title={selectedFile.name}
                    >
                      {selectedFile.name}
                    </h3>
                    <p className="text-zinc-500 text-xs truncate">{selectedFile.category}</p>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => downloadFile(selectedFile.name)}
                      className="px-4 py-2 bg-brand-teal hover:bg-teal-400 text-black text-xs font-semibold rounded-lg transition-colors shadow-sm flex items-center justify-center"
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" /> Download
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-zinc-600 flex flex-col items-center justify-center h-full min-h-[300px]">
                <FileIcon className="w-16 h-16 mb-4 opacity-30" strokeWidth={1} />
                <p className="text-sm">Select a file to preview</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: Create New SharePoint Subfolder                               */}
      {/* ==================================================================== */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-white/10 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-amber-400" />
                <span>Create New SharePoint Folder</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowNewFolderModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateSubfolder} className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Folder Name</label>
                <input
                  type="text"
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. Service Agreements 2026"
                  className="w-full bg-[#0a0a0a] border border-white/15 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-brand-teal"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewFolderModal(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newFolderName.trim() || creatingSubfolder}
                  className="px-4 py-1.5 rounded-lg bg-brand-teal hover:bg-teal-400 text-black font-semibold text-xs disabled:opacity-50"
                >
                  {creatingSubfolder ? "Creating..." : "Create Folder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: Rename File or Folder                                         */}
      {/* ==================================================================== */}
      {renamingItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-white/10 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-brand-teal" />
                <span>Rename {renamingItem.isFolder ? "Folder" : "File"} on SharePoint</span>
              </h3>
              <button
                type="button"
                onClick={() => setRenamingItem(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleRenameSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">New Name</label>
                <input
                  type="text"
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/15 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-brand-teal"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenamingItem(null)}
                  className="px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!renameValue.trim() || savingRename}
                  className="px-4 py-1.5 rounded-lg bg-brand-teal hover:bg-teal-400 text-black font-semibold text-xs disabled:opacity-50"
                >
                  {savingRename ? "Saving..." : "Rename"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: Move File or Folder to Another Folder                         */}
      {/* ==================================================================== */}
      {movingItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-white/10 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <FolderInput className="w-4 h-4 text-amber-400" />
                <span>Move &ldquo;{movingItem.name}&rdquo;</span>
              </h3>
              <button
                type="button"
                onClick={() => setMovingItem(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleMoveSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">
                  Destination Folder in {spClientInfo?.folderName}
                </label>
                <select
                  value={moveTargetSubpath}
                  onChange={(e) => setMoveTargetSubpath(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/15 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-brand-teal"
                >
                  <option value="">
                    / ({spClientInfo?.folderName} Root Folder)
                  </option>
                  {spAllClientFolders
                    .filter((f) => f.id !== movingItem.id)
                    .map((folder) => (
                      <option key={folder.id} value={folder.path}>
                        /{folder.path}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMovingItem(null)}
                  className="px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingMove}
                  className="px-4 py-1.5 rounded-lg bg-brand-teal hover:bg-teal-400 text-black font-semibold text-xs disabled:opacity-50"
                >
                  {savingMove ? "Moving..." : "Move Here"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
