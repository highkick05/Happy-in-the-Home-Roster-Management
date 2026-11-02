import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  FolderOpen,
  FolderPlus,
  RefreshCw,
  ExternalLink,
  Edit2,
  FolderInput,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
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
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Info,
  Copy,
  Check,
  Monitor,
  FolderTree,
  Clock,
  User as UserIcon,
  Calendar as CalendarIcon,
  Database
} from "lucide-react";
import * as xlsx from "xlsx";
import mammoth from "mammoth";

interface SharePointItem {
  id: string;
  parentId?: string;
  name: string;
  relativePath?: string;
  parentSubpath?: string;
  size: number;
  webUrl: string;
  webDavUrl?: string;
  createdDateTime?: string;
  createdBy?: string;
  lastModifiedDateTime: string;
  lastModifiedBy?: string;
  isFolder: boolean;
  childCount?: number;
  mimeType?: string;
  fileExtension?: string;
  downloadUrl?: string;
  etag?: string;
}

type SortField = "name" | "type" | "lastModifiedDateTime" | "createdDateTime" | "lastModifiedBy" | "size";
type SortDirection = "asc" | "desc";
type FileCategoryFilter = "ALL" | "FOLDERS" | "PDF" | "WORD" | "EXCEL" | "IMAGE";

const formatFileSize = (bytes?: number) => {
  if (!bytes || isNaN(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(2)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
};

const formatDateTime = (iso?: string, includeTime = false) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  if (includeTime) {
    return d.toLocaleString("en-AU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }
  return d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

const getItemTypeLabel = (item: SharePointItem): string => {
  if (item.isFolder) return "Folder";
  const ext = (
    item.fileExtension ||
    (item.name.includes(".") ? item.name.split(".").pop() || "" : "")
  ).toLowerCase();
  const map: Record<string, string> = {
    pdf: "PDF Document",
    doc: "Word Document",
    docx: "Word Document",
    xls: "Excel Spreadsheet",
    xlsx: "Excel Spreadsheet",
    csv: "CSV Spreadsheet",
    ppt: "PowerPoint",
    pptx: "PowerPoint",
    jpg: "JPEG Image",
    jpeg: "JPEG Image",
    png: "PNG Image",
    gif: "GIF Image",
    webp: "WebP Image",
    txt: "Text Document",
    md: "Markdown",
    zip: "ZIP Archive"
  };
  return map[ext] || (ext ? `${ext.toUpperCase()} File` : "Document");
};

// Native Microsoft Office Desktop URI Scheme builder (opens directly in local Word / Excel / PowerPoint and auto-saves to SharePoint)
const getOfficeDesktopAppInfo = (
  item: SharePointItem,
  folderWebUrl?: string
): { protocolUrl: string; appLabel: string; badgeClass: string } | null => {
  if (item.isFolder) return null;

  // Office Desktop URI schemes (ms-word:ofe|u|, ms-excel:ofe|u|, ms-powerpoint:ofe|u|)
  // require the direct SharePoint document library URL (webDavUrl), NOT the WOPI /_layouts/15/Doc.aspx viewer URL.
  let directFileUrl = "";
  if (item.webDavUrl && !item.webDavUrl.includes("/_layouts/")) {
    directFileUrl = item.webDavUrl;
  } else if (folderWebUrl && !folderWebUrl.includes("/_layouts/")) {
    const relPath = (item.relativePath || item.name || "")
      .split("/")
      .filter(Boolean)
      .map((seg) => encodeURIComponent(seg))
      .join("/");
    directFileUrl = `${folderWebUrl.replace(/\/+$/, "")}/${relPath}`;
  } else if (item.webUrl && !item.webUrl.includes("/_layouts/")) {
    directFileUrl = item.webUrl.split("?")[0];
  } else if (item.webUrl) {
    directFileUrl = item.webUrl;
  }

  if (!directFileUrl) return null;

  const lower = item.name.toLowerCase();
  if (/\.(doc|docx|docm|dotx)$/i.test(lower)) {
    return {
      protocolUrl: `ms-word:ofe|u|${directFileUrl}`,
      appLabel: "Open in Word App",
      badgeClass: "text-blue-400 hover:bg-blue-500/15 border-blue-500/30"
    };
  }
  if (/\.(xls|xlsx|xlsm|xlsb|csv)$/i.test(lower)) {
    return {
      protocolUrl: `ms-excel:ofe|u|${directFileUrl}`,
      appLabel: "Open in Excel App",
      badgeClass: "text-emerald-400 hover:bg-emerald-500/15 border-emerald-500/30"
    };
  }
  if (/\.(ppt|pptx|pptm)$/i.test(lower)) {
    return {
      protocolUrl: `ms-powerpoint:ofe|u|${directFileUrl}`,
      appLabel: "Open in PowerPoint App",
      badgeClass: "text-amber-400 hover:bg-amber-500/15 border-amber-500/30"
    };
  }
  return null;
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
        className={`${iconProps.className} fill-amber-400/20 text-amber-400 shrink-0`}
      />
    );
  }

  if (!file) {
    return (
      <FileIcon {...iconProps} className={`${iconProps.className} text-zinc-400 shrink-0`} />
    );
  }

  const originalName = (file.name || "").toLowerCase();

  const isImage = originalName.match(
    /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|heic|heif|avif|tiff|tif)$/i
  );
  const isPdf = originalName.match(/\.pdf$/i);
  const isWord = originalName.match(/\.(doc|docx|docm|dotx)$/i);
  const isExcel = originalName.match(/\.(xls|xlsx|xlsm|csv)$/i);

  if (isImage) {
    return (
      <FileImage
        {...iconProps}
        className={`${iconProps.className} text-emerald-400 shrink-0`}
      />
    );
  }
  if (isPdf) {
    return (
      <FileText {...iconProps} className={`${iconProps.className} text-rose-500 shrink-0`} />
    );
  }
  if (isWord) {
    return (
      <FileText {...iconProps} className={`${iconProps.className} text-blue-400 shrink-0`} />
    );
  }
  if (isExcel) {
    return (
      <FileBarChart2
        {...iconProps}
        className={`${iconProps.className} text-green-500 shrink-0`}
      />
    );
  }

  return (
    <FileIcon {...iconProps} className={`${iconProps.className} text-zinc-400 shrink-0`} />
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
  // SHAREPOINT LOCAL SQLITE METADATA SYNC & ENHANCED FILE MANAGER STATE
  // ============================================================================
  const [spInitialLoading, setSpInitialLoading] = useState(true);
  const [spSyncingDelta, setSpSyncingDelta] = useState(false);
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
    folderItemId?: string;
    lastSyncedAt?: string | null;
  } | null>(null);
  const [spAvailableSiblingFolders, setSpAvailableSiblingFolders] = useState<string[]>([]);

  // Complete SQLite-cached tree for this client (enables 0ms subfolder navigation & global search)
  const [spAllItems, setSpAllItems] = useState<SharePointItem[]>([]);
  const [spLastSyncedAt, setSpLastSyncedAt] = useState<string | null>(null);

  // Navigation, Filtering, Sorting & Pagination
  const [currentSubpath, setCurrentSubpath] = useState<string>("");
  const [showFolderTree, setShowFolderTree] = useState<boolean>(true);
  const [expandedTreePaths, setExpandedTreePaths] = useState<Record<string, boolean>>({ "": true });
  const [driveViewMode, setDriveViewMode] = useState<"list" | "grid">("list");
  const [spSearchQuery, setSpSearchQuery] = useState("");
  const [searchAllSubfolders, setSearchAllSubfolders] = useState<boolean>(true);
  const [categoryFilter, setCategoryFilter] = useState<FileCategoryFilter>("ALL");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Selected SharePoint File for Details / Preview / Editing
  const [selectedSpItem, setSelectedSpItem] = useState<SharePointItem | null>(null);
  const [inspectorTab, setInspectorTab] = useState<"PREVIEW" | "DETAILS">("PREVIEW");
  const [spPreviewUrl, setSpPreviewUrl] = useState<string | null>(null);
  const [spPreviewLoading, setSpPreviewLoading] = useState(false);
  const [spTextContent, setSpTextContent] = useState<string | null>(null);
  const [isEditingSpText, setIsEditingSpText] = useState(false);
  const [savingSpText, setSavingSpText] = useState(false);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

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
  const [uploadProgressText, setUploadProgressText] = useState<string>("");
  const [spToast, setSpToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

  const syncInFlightRef = useRef(false);

  const showToast = useCallback((type: "success" | "error", text: string) => {
    setSpToast({ type, text });
    setTimeout(() => setSpToast(null), 4500);
  }, []);

  const applyServerSharePointPayload = useCallback((data: any) => {
    setSpConfigured(Boolean(data.configured));
    setSpFolderExists(Boolean(data.folderExists));
    if (data.clientInfo) {
      setSpClientInfo(data.clientInfo);
    }
    if (Array.isArray(data.availableFolders)) {
      setSpAvailableSiblingFolders(data.availableFolders);
    }
    if (Array.isArray(data.allItems)) {
      setSpAllItems(data.allItems);
    } else if (Array.isArray(data.items)) {
      setSpAllItems(data.items);
    } else {
      setSpAllItems([]);
    }
    if (data.lastSyncedAt !== undefined) {
      setSpLastSyncedAt(data.lastSyncedAt);
    }
  }, []);

  // Background Microsoft Graph Delta Sync (non-blocking)
  const triggerBackgroundDeltaSync = useCallback(
    async (options: { full?: boolean; silent?: boolean } = {}) => {
      if (!id || !token || syncInFlightRef.current) return;
      syncInFlightRef.current = true;
      setSpSyncingDelta(true);
      try {
        const res = await fetch(`/api/clients/${id}/sharepoint/sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            subpath: "",
            full: Boolean(options.full)
          })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          applyServerSharePointPayload(data);
          const stats = data.syncStats;
          if (!options.silent) {
            const changes = (stats?.added || 0) + (stats?.updated || 0) + (stats?.removed || 0);
            showToast(
              "success",
              changes > 0
                ? `Synced with SharePoint (${changes} change${changes === 1 ? "" : "s"} updated)`
                : "SharePoint metadata is up to date"
            );
          }
        } else if (!options.silent) {
          showToast("error", data.error || "Failed to sync with SharePoint");
        }
      } catch (err: any) {
        if (!options.silent) {
          showToast("error", err.message || "Error syncing with SharePoint");
        }
      } finally {
        syncInFlightRef.current = false;
        setSpSyncingDelta(false);
      }
    },
    [id, token, applyServerSharePointPayload, showToast]
  );

  // Instant Read from Local SQLite Cache on Client Load (<15ms) + Stale-While-Revalidate Delta Check
  const fetchSharePointFromLocalCache = useCallback(async () => {
    if (!id || !token) return;
    setSpInitialLoading(true);
    setSpError(null);
    try {
      const res = await fetch(`/api/clients/${id}/sharepoint/items`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (!res.ok) {
        setSpError(data.error || "Failed to load SharePoint folder.");
        setSpInitialLoading(false);
        return;
      }

      applyServerSharePointPayload(data);
      setSpInitialLoading(false);

      // Trigger silent background Graph Delta sync to pick up any external SharePoint/OneDrive edits
      if (data.configured) {
        triggerBackgroundDeltaSync({ silent: true });
      }
    } catch (err: any) {
      setSpError(err.message || "Network error loading SharePoint drive.");
      setSpInitialLoading(false);
    }
  }, [id, token, applyServerSharePointPayload, triggerBackgroundDeltaSync]);

  useEffect(() => {
    setCurrentSubpath("");
    setSelectedSpItem(null);
    setSpSearchQuery("");
    setCurrentPage(1);
    if (storageMode === "SHAREPOINT") {
      fetchSharePointFromLocalCache();
    }
    // Only reset subpath and reload cache when switching clients or storage mode
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, storageMode]);

  // Auto-sync delta when user returns to browser window after editing a file in Desktop Word / Excel / OneDrive
  useEffect(() => {
    if (storageMode !== "SHAREPOINT" || !spConfigured || !spFolderExists) return;
    const handleWindowFocus = () => {
      triggerBackgroundDeltaSync({ silent: true });
    };
    window.addEventListener("focus", handleWindowFocus);
    return () => window.removeEventListener("focus", handleWindowFocus);
  }, [storageMode, spConfigured, spFolderExists, triggerBackgroundDeltaSync]);

  // Reset pagination to page 1 when folder, search, or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [currentSubpath, spSearchQuery, categoryFilter, sortField, sortDirection, pageSize]);

  // Expand parent folders automatically in the Folder Tree when navigating
  useEffect(() => {
    if (!currentSubpath) return;
    const parts = currentSubpath.split("/").filter(Boolean);
    setExpandedTreePaths((prev) => {
      const next = { ...prev, "": true };
      let accum = "";
      for (const p of parts) {
        accum = accum ? `${accum}/${p}` : p;
        next[accum] = true;
      }
      return next;
    });
  }, [currentSubpath]);

  // All subfolders in the client's SharePoint directory (for Folder Tree & Move modal)
  const spAllSubfolders = useMemo(() => {
    return spAllItems
      .filter((it) => it.isFolder)
      .map((it) => ({
        id: it.id,
        name: it.name,
        path: it.relativePath || it.name,
        parentSubpath: it.parentSubpath || "",
        childCount: it.childCount || 0
      }))
      .sort((a, b) => a.path.localeCompare(b.path));
  }, [spAllItems]);

  // Items visible in the current view (either current folder or global search across all subfolders)
  const filteredAndSortedSpItems = useMemo(() => {
    const q = spSearchQuery.trim().toLowerCase();
    const baseList = spAllItems.filter((item) => {
      if (q && searchAllSubfolders) {
        if (!item.name.toLowerCase().includes(q) && !(item.relativePath || "").toLowerCase().includes(q)) {
          return false;
        }
      } else {
        if ((item.parentSubpath || "") !== currentSubpath) return false;
        if (q && !item.name.toLowerCase().includes(q)) return false;
      }

      if (categoryFilter === "FOLDERS") return item.isFolder;
      if (categoryFilter === "PDF") return !item.isFolder && /\.pdf$/i.test(item.name);
      if (categoryFilter === "WORD") return !item.isFolder && /\.(doc|docx|docm|dotx|txt|rtf)$/i.test(item.name);
      if (categoryFilter === "EXCEL") return !item.isFolder && /\.(xls|xlsx|xlsm|csv)$/i.test(item.name);
      if (categoryFilter === "IMAGE")
        return !item.isFolder && /\.(jpg|jpeg|png|gif|webp|svg|bmp|heic)$/i.test(item.name);
      return true;
    });

    const mult = sortDirection === "asc" ? 1 : -1;

    return [...baseList].sort((a, b) => {
      // Keep folders grouped at top when sorting by name, or sort normally
      if (a.isFolder !== b.isFolder) {
        return a.isFolder ? -1 : 1;
      }

      if (sortField === "name") {
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }) * mult;
      }
      if (sortField === "type") {
        return getItemTypeLabel(a).localeCompare(getItemTypeLabel(b)) * mult;
      }
      if (sortField === "size") {
        return ((a.size || 0) - (b.size || 0)) * mult;
      }
      if (sortField === "lastModifiedBy") {
        return (a.lastModifiedBy || "").localeCompare(b.lastModifiedBy || "") * mult;
      }
      if (sortField === "createdDateTime") {
        const tA = a.createdDateTime ? new Date(a.createdDateTime).getTime() : 0;
        const tB = b.createdDateTime ? new Date(b.createdDateTime).getTime() : 0;
        return (tA - tB) * mult;
      }
      // Default: lastModifiedDateTime
      const mA = a.lastModifiedDateTime ? new Date(a.lastModifiedDateTime).getTime() : 0;
      const mB = b.lastModifiedDateTime ? new Date(b.lastModifiedDateTime).getTime() : 0;
      return (mA - mB) * mult;
    });
  }, [
    spAllItems,
    currentSubpath,
    spSearchQuery,
    searchAllSubfolders,
    categoryFilter,
    sortField,
    sortDirection
  ]);

  // Pagination calculations
  const totalItemsCount = filteredAndSortedSpItems.length;
  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(totalItemsCount / pageSize)) : 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedSpItems = useMemo(() => {
    if (pageSize <= 0) return filteredAndSortedSpItems;
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredAndSortedSpItems.slice(start, start + pageSize);
  }, [filteredAndSortedSpItems, pageSize, safeCurrentPage]);

  const currentFolderStats = useMemo(() => {
    const foldersCount = filteredAndSortedSpItems.filter((i) => i.isFolder).length;
    const filesCount = filteredAndSortedSpItems.filter((i) => !i.isFolder).length;
    const totalBytes = filteredAndSortedSpItems.reduce((acc, i) => acc + (i.isFolder ? 0 : i.size || 0), 0);
    return { foldersCount, filesCount, totalBytes };
  }, [filteredAndSortedSpItems]);

  const handleSortColumn = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(field === "name" || field === "type" || field === "lastModifiedBy" ? "asc" : "desc");
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-zinc-600 inline ml-1 opacity-60 group-hover:opacity-100" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="w-3 h-3 text-brand-teal inline ml-1" />
    ) : (
      <ArrowDown className="w-3 h-3 text-brand-teal inline ml-1" />
    );
  };

  // Create the Client's Root Folder on SharePoint
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
      if (data.payload) {
        applyServerSharePointPayload(data.payload);
      } else {
        await fetchSharePointFromLocalCache();
      }
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
      if (data.payload) {
        applyServerSharePointPayload(data.payload);
      } else {
        await fetchSharePointFromLocalCache();
      }
    } catch (err: any) {
      showToast("error", err.message || "Failed to link SharePoint folder");
    } finally {
      setLinkingFolder(false);
    }
  };

  // Create a subfolder inside the current SharePoint directory (Write-Through to SQLite)
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
      if (data.item) {
        setSpAllItems((prev) => [...prev.filter((i) => i.id !== data.item.id), data.item]);
      }
      showToast("success", `Created folder "${newFolderName.trim()}"`);
      setNewFolderName("");
      setShowNewFolderModal(false);
    } catch (err: any) {
      showToast("error", err.message || "Failed to create subfolder");
    } finally {
      setCreatingSubfolder(false);
    }
  };

  // Upload files to current SharePoint folder (or a specific dropped subfolder) with Write-Through to SQLite
  const handleSpFileUploadToSubpath = useCallback(
    async (acceptedFiles: File[], targetSubpath = currentSubpath) => {
      if (!acceptedFiles.length || !id || !token) return;
      setSpUploading(true);
      let uploadedCount = 0;
      const newItems: SharePointItem[] = [];

      for (let idx = 0; idx < acceptedFiles.length; idx++) {
        const file = acceptedFiles[idx];
        setUploadProgressText(
          `Uploading ${idx + 1} of ${acceptedFiles.length}: ${file.name}...`
        );
        const formData = new FormData();
        formData.append("file", file);
        formData.append("subpath", targetSubpath);

        try {
          const res = await fetch(`/api/clients/${id}/sharepoint/upload`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(data.error || `Failed to upload ${file.name}`);
          }
          if (data.item) {
            newItems.push(data.item);
          }
          uploadedCount++;
        } catch (err: any) {
          showToast("error", err.message || `Error uploading ${file.name}`);
        }
      }

      setSpUploading(false);
      setUploadProgressText("");

      if (newItems.length > 0) {
        setSpAllItems((prev) => {
          const updatedIds = new Set(newItems.map((ni) => ni.id));
          return [...prev.filter((i) => !updatedIds.has(i.id)), ...newItems];
        });
      }

      if (uploadedCount > 0) {
        showToast(
          "success",
          `Uploaded ${uploadedCount} file${uploadedCount > 1 ? "s" : ""} to SharePoint${
            targetSubpath ? ` (${targetSubpath})` : ""
          }`
        );
        triggerBackgroundDeltaSync({ silent: true });
      }
    },
    [id, token, currentSubpath, showToast, triggerBackgroundDeltaSync]
  );

  const {
    getRootProps: getSpDropRootProps,
    getInputProps: getSpDropInputProps,
    isDragActive: isSpDragActive,
    open: openSpFileDialog
  } = useDropzone({
    onDrop: (files) => handleSpFileUploadToSubpath(files, currentSubpath),
    noClick: true,
    noKeyboard: true
  });

  // Rename file or folder on SharePoint (Optimistic + Write-Through to SQLite)
  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingItem || !renameValue.trim()) return;
    const cleanNewName = renameValue.trim();
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
          body: JSON.stringify({ name: cleanNewName })
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to rename item");

      if (data.item) {
        setSpAllItems((prev) => prev.map((it) => (it.id === renamingItem.id ? data.item : it)));
      }
      if (selectedSpItem?.id === renamingItem.id) {
        setSelectedSpItem((prev) => (prev ? { ...prev, name: cleanNewName } : null));
      }
      showToast("success", `Renamed to "${cleanNewName}"`);
      setRenamingItem(null);
      triggerBackgroundDeltaSync({ silent: true });
    } catch (err: any) {
      showToast("error", err.message || "Failed to rename item");
    } finally {
      setSavingRename(false);
    }
  };

  // Move file or folder to another folder inside the client's SharePoint directory (Optimistic + Write-Through)
  const executeMoveItem = async (item: SharePointItem, targetSubpathStr: string) => {
    const cleanDest = targetSubpathStr.replace(/^\/+|\/+$/g, "");
    if ((item.parentSubpath || "") === cleanDest) return;
    if (
      item.isFolder &&
      (cleanDest === item.relativePath || cleanDest.startsWith(`${item.relativePath}/`))
    ) {
      showToast("error", "Cannot move a folder inside itself");
      return;
    }

    // Optimistic local state update so drag-and-drop feels instantaneous
    const previousItems = spAllItems;
    const newRelPath = cleanDest ? `${cleanDest}/${item.name}` : item.name;
    setSpAllItems((prev) =>
      prev.map((it) => {
        if (it.id === item.id) {
          return { ...it, parentSubpath: cleanDest, relativePath: newRelPath };
        }
        if (
          item.isFolder &&
          it.relativePath &&
          item.relativePath &&
          it.parentSubpath &&
          (it.parentSubpath === item.relativePath ||
            it.parentSubpath.startsWith(`${item.relativePath}/`))
        ) {
          const updatedParentSub =
            it.parentSubpath === item.relativePath
              ? newRelPath
              : newRelPath + it.parentSubpath.slice(item.relativePath.length);
          const updatedRel = newRelPath + it.relativePath.slice(item.relativePath.length);
          return { ...it, parentSubpath: updatedParentSub, relativePath: updatedRel };
        }
        return it;
      })
    );

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
          body: JSON.stringify({ targetSubpath: cleanDest })
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to move item");
      showToast(
        "success",
        `Moved "${item.name}" to ${cleanDest ? cleanDest : spClientInfo?.folderName || "Root Folder"}`
      );
      setMovingItem(null);
      triggerBackgroundDeltaSync({ silent: true });
    } catch (err: any) {
      setSpAllItems(previousItems);
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

  // Delete file or folder on SharePoint (Optimistic + Write-Through)
  const handleDeleteSpItem = async (item: SharePointItem) => {
    if (!window.confirm(`Move "${item.name}" to the SharePoint Recycle Bin?`)) {
      return;
    }
    const previousItems = spAllItems;
    setSpAllItems((prev) =>
      prev.filter(
        (it) =>
          it.id !== item.id &&
          !(
            item.isFolder &&
            item.relativePath &&
            it.parentSubpath &&
            (it.parentSubpath === item.relativePath ||
              it.parentSubpath.startsWith(`${item.relativePath}/`))
          )
      )
    );
    if (selectedSpItem?.id === item.id) {
      setSelectedSpItem(null);
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
    } catch (err: any) {
      setSpAllItems(previousItems);
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

  const handleCopySharePointLink = (item: SharePointItem) => {
    if (!item.webUrl) return;
    navigator.clipboard.writeText(item.webUrl);
    setCopiedLinkId(item.id);
    showToast("success", `Copied SharePoint link for "${item.name}"`);
    setTimeout(() => setCopiedLinkId(null), 2000);
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
      if (data.item) {
        setSpAllItems((prev) => prev.map((it) => (it.id === selectedSpItem.id ? data.item : it)));
        setSelectedSpItem(data.item);
      }
      showToast("success", `Saved "${selectedSpItem.name}" to SharePoint`);
      setIsEditingSpText(false);
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
  }, [selectedSpItem?.id, id, token]);

  // Breadcrumb segments
  const breadcrumbs = useMemo(() => {
    if (!currentSubpath) return [];
    return currentSubpath.split("/").filter(Boolean);
  }, [currentSubpath]);

  const navigateToSubpath = (targetSub: string) => {
    setSelectedSpItem(null);
    setSpSearchQuery("");
    setCurrentSubpath(targetSub);
  };

  const navigateUpOneLevel = () => {
    if (!currentSubpath) return;
    setSelectedSpItem(null);
    const parts = currentSubpath.split("/").filter(Boolean);
    parts.pop();
    setCurrentSubpath(parts.join("/"));
  };

  // Recursive Folder Tree Renderer for Left Sidebar (supports Drag & Drop onto any folder!)
  const renderFolderTreeBranch = (parentPath: string, depth = 0) => {
    const childFolders = spAllSubfolders.filter((f) => f.parentSubpath === parentPath);
    if (childFolders.length === 0) return null;

    return (
      <div className={depth > 0 ? "pl-3 border-l border-white/[0.06] ml-2 space-y-0.5 mt-0.5" : "space-y-0.5"}>
        {childFolders.map((folder) => {
          const isCurrent = currentSubpath === folder.path;
          const hasSubfolders = spAllSubfolders.some((f) => f.parentSubpath === folder.path);
          const isExpanded = Boolean(expandedTreePaths[folder.path]);
          const isDragOver = dragOverTarget === `tree:${folder.path}`;

          return (
            <div key={folder.id}>
              <div
                onClick={() => navigateToSubpath(folder.path)}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOverTarget(`tree:${folder.path}`);
                }}
                onDragLeave={() => {
                  if (dragOverTarget === `tree:${folder.path}`) setDragOverTarget(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOverTarget(null);
                  const draggedJson = e.dataTransfer.getData("application/x-sp-item");
                  if (draggedJson) {
                    try {
                      const dragged = JSON.parse(draggedJson) as SharePointItem;
                      if (dragged.id !== folder.id) {
                        executeMoveItem(dragged, folder.path);
                      }
                    } catch {}
                  } else if (e.dataTransfer.files?.length) {
                    handleSpFileUploadToSubpath(Array.from(e.dataTransfer.files), folder.path);
                  }
                }}
                className={`group flex items-center justify-between px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                  isDragOver
                    ? "bg-brand-teal/25 ring-1 ring-brand-teal text-white"
                    : isCurrent
                    ? "bg-brand-teal/15 text-brand-teal font-semibold"
                    : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  {hasSubfolders ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedTreePaths((prev) => ({
                          ...prev,
                          [folder.path]: !prev[folder.path]
                        }));
                      }}
                      className="p-0.5 rounded hover:bg-white/10 text-zinc-500 hover:text-white shrink-0"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronRight className="w-3 h-3" />
                      )}
                    </button>
                  ) : (
                    <span className="w-4 shrink-0" />
                  )}
                  {isCurrent ? (
                    <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  ) : (
                    <Folder className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
                  )}
                  <span className="truncate" title={folder.name}>
                    {folder.name}
                  </span>
                </div>
                {folder.childCount > 0 && (
                  <span className="text-[10px] font-mono text-zinc-500 ml-1.5 shrink-0">
                    {folder.childCount}
                  </span>
                )}
              </div>
              {hasSubfolders && isExpanded && renderFolderTreeBranch(folder.path, depth + 1)}
            </div>
          );
        })}
      </div>
    );
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
              {storageMode === "SHAREPOINT" && spFolderExists && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-white/[0.04] border border-white/[0.08] text-zinc-400"
                  title={
                    spLastSyncedAt
                      ? `Local SQLite Cache • Last delta sync: ${formatDateTime(spLastSyncedAt, true)}`
                      : "Local SQLite Cache Active"
                  }
                >
                  <Database className="w-2.5 h-2.5 text-brand-teal" />
                  <span>
                    {spSyncingDelta
                      ? "Syncing Delta..."
                      : spLastSyncedAt
                      ? `Synced ${ new Date(spLastSyncedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }`
                      : "Local Cache Ready"}
                  </span>
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
                    Open in SharePoint / OneDrive <ExternalLink className="w-3 h-3" />
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
      {/* MODE 1: SHAREPOINT CLOUD DRIVE EXPLORER (SQLITE LOCAL SYNC)          */}
      {/* ==================================================================== */}
      {storageMode === "SHAREPOINT" ? (
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {spInitialLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-zinc-400">
              <RefreshCw className="w-8 h-8 animate-spin text-brand-teal mb-3" />
              <p className="text-sm font-medium text-white">Loading Client SharePoint Index...</p>
              <p className="text-xs text-zinc-500 mt-1">
                Indexing folder metadata into local SQLite cache for instant browsing
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
                    onClick={() => fetchSharePointFromLocalCache()}
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
                        <span>
                          Or Link to an Existing Folder in {(spClientInfo?.baseCategoryPath || "").replace(/\//g, "\\")}
                        </span>
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

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => triggerBackgroundDeltaSync({ full: true })}
                    disabled={spSyncingDelta}
                    className="text-xs text-zinc-400 hover:text-white inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${spSyncingDelta ? "animate-spin" : ""}`} />
                    <span>Re-check SharePoint Server</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Full SharePoint File Drive Explorer */
            <div
              {...getSpDropRootProps()}
              className="flex-1 flex flex-col overflow-hidden min-h-0 relative"
            >
              <input {...getSpDropInputProps()} />

              {/* Drag & Drop Upload Overlay */}
              {isSpDragActive && (
                <div className="absolute inset-0 z-40 bg-brand-teal/10 backdrop-blur-xs border-2 border-dashed border-brand-teal rounded-xl m-3 flex flex-col items-center justify-center pointer-events-none">
                  <UploadCloud className="w-14 h-14 text-brand-teal mb-2 animate-bounce" />
                  <p className="text-base font-semibold text-white">
                    Drop files to upload &amp; sync to SharePoint
                  </p>
                  <p className="text-xs text-brand-teal mt-1 font-mono">
                    {(spClientInfo?.fullSharePointPath || "").replace(/\//g, "\\")}
                    {currentSubpath ? `\\${currentSubpath.replace(/\//g, "\\")}` : ""}
                  </p>
                </div>
              )}

              {/* Drive Toolbar: Folder Tree Toggle, Breadcrumbs, Filters, Search, Actions */}
              <div className="px-4 sm:px-6 py-2.5 bg-[#141414] border-b border-white/[0.06] flex flex-col gap-2.5 shrink-0">
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  {/* Left: Sidebar Toggle + Breadcrumb Navigation */}
                  <div className="flex items-center gap-1 text-xs overflow-x-auto min-w-0 py-0.5">
                    <button
                      type="button"
                      onClick={() => setShowFolderTree((prev) => !prev)}
                      className={`p-1.5 mr-1 rounded-lg border transition-colors ${
                        showFolderTree
                          ? "bg-brand-teal/15 border-brand-teal/30 text-brand-teal"
                          : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
                      }`}
                      title="Toggle Folder Tree Sidebar"
                    >
                      <FolderTree className="w-3.5 h-3.5" />
                    </button>

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
                      onClick={() => navigateToSubpath("")}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverTarget("crumb:root");
                      }}
                      onDragLeave={() => {
                        if (dragOverTarget === "crumb:root") setDragOverTarget(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverTarget(null);
                        const draggedItemJson = e.dataTransfer.getData("application/x-sp-item");
                        if (draggedItemJson && currentSubpath !== "") {
                          try {
                            const item = JSON.parse(draggedItemJson) as SharePointItem;
                            executeMoveItem(item, "");
                          } catch {}
                        }
                      }}
                      className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 transition-colors ${
                        dragOverTarget === "crumb:root"
                          ? "bg-brand-teal/30 ring-1 ring-brand-teal text-white"
                          : !currentSubpath
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
                      const isDragOver = dragOverTarget === `crumb:${targetSub}`;
                      return (
                        <React.Fragment key={targetSub}>
                          <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                          <button
                            type="button"
                            onClick={() => navigateToSubpath(targetSub)}
                            onDragOver={(e) => {
                              e.preventDefault();
                              setDragOverTarget(`crumb:${targetSub}`);
                            }}
                            onDragLeave={() => {
                              if (dragOverTarget === `crumb:${targetSub}`) setDragOverTarget(null);
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              setDragOverTarget(null);
                              const draggedItemJson = e.dataTransfer.getData("application/x-sp-item");
                              if (draggedItemJson) {
                                try {
                                  const item = JSON.parse(draggedItemJson) as SharePointItem;
                                  executeMoveItem(item, targetSub);
                                } catch {}
                              }
                            }}
                            className={`px-2 py-1 rounded-md font-medium truncate max-w-[180px] transition-colors ${
                              isDragOver
                                ? "bg-brand-teal/30 ring-1 ring-brand-teal text-white"
                                : isLast
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
                    <div className="relative flex items-center">
                      <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={spSearchQuery}
                        onChange={(e) => setSpSearchQuery(e.target.value)}
                        placeholder={
                          searchAllSubfolders ? "Search all client files..." : "Filter current folder..."
                        }
                        className="bg-[#0a0a0a] border border-white/10 rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-brand-teal w-44 sm:w-56"
                      />
                      {spSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setSpSearchQuery("")}
                          className="absolute right-2 text-zinc-500 hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
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
                        title="Table View"
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
                          <span>{uploadProgressText || "Uploading..."}</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>Upload to SharePoint</span>
                        </>
                      )}
                    </button>

                    {/* Sync Delta Button */}
                    <button
                      type="button"
                      onClick={() => triggerBackgroundDeltaSync({ full: false, silent: false })}
                      disabled={spSyncingDelta}
                      className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-zinc-300 hover:text-white text-xs inline-flex items-center gap-1.5 transition-colors"
                      title="Run Microsoft Graph Delta Sync now"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${spSyncingDelta ? "animate-spin text-brand-teal" : ""}`} />
                      <span className="hidden xl:inline">Sync</span>
                    </button>
                  </div>
                </div>

                {/* Secondary Filter Bar: File Type Filters + Search Scope + Quick Summary */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/[0.04] text-[11px]">
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    {(
                      [
                        { id: "ALL", label: "All Items" },
                        { id: "FOLDERS", label: "Folders" },
                        { id: "PDF", label: "PDFs" },
                        { id: "WORD", label: "Word / Docs" },
                        { id: "EXCEL", label: "Excel / CSV" },
                        { id: "IMAGE", label: "Images" }
                      ] as Array<{ id: FileCategoryFilter; label: string }>
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setCategoryFilter(tab.id)}
                        className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
                          categoryFilter === tab.id
                            ? "bg-brand-teal/15 text-brand-teal border border-brand-teal/30"
                            : "text-zinc-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 text-zinc-400">
                    {spSearchQuery && (
                      <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-zinc-300">
                        <input
                          type="checkbox"
                          checked={searchAllSubfolders}
                          onChange={(e) => setSearchAllSubfolders(e.target.checked)}
                          className="rounded border-white/20 bg-black text-brand-teal focus:ring-0"
                        />
                        <span>Search all subfolders</span>
                      </label>
                    )}
                    <span className="font-mono text-[11px]">
                      {currentFolderStats.foldersCount} folder{currentFolderStats.foldersCount === 1 ? "" : "s"} •{" "}
                      {currentFolderStats.filesCount} file{currentFolderStats.filesCount === 1 ? "" : "s"} (
                      {formatFileSize(currentFolderStats.totalBytes)})
                    </span>
                  </div>
                </div>
              </div>

              {/* Main 3-Pane Body: Folder Tree Sidebar (Left) + File Table/Grid (Center) + Inspector/Preview (Right) */}
              <div className="flex-1 flex overflow-hidden min-h-0">
                {/* Pane 1: Collapsible Folder Tree Sidebar (Supports Drag-and-Drop Organization) */}
                {showFolderTree && (
                  <div className="w-56 xl:w-64 border-r border-white/[0.06] bg-[#0e0e0e] flex flex-col shrink-0 hidden md:flex overflow-hidden">
                    <div className="px-3.5 py-2.5 border-b border-white/[0.05] flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                      <span>Folder Structure</span>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {spAllSubfolders.length} subfolders
                      </span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                      {/* Root Participant Folder Node */}
                      <div
                        onClick={() => navigateToSubpath("")}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOverTarget("tree:root");
                        }}
                        onDragLeave={() => {
                          if (dragOverTarget === "tree:root") setDragOverTarget(null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragOverTarget(null);
                          const draggedJson = e.dataTransfer.getData("application/x-sp-item");
                          if (draggedJson) {
                            try {
                              const dragged = JSON.parse(draggedJson) as SharePointItem;
                              executeMoveItem(dragged, "");
                            } catch {}
                          } else if (e.dataTransfer.files?.length) {
                            handleSpFileUploadToSubpath(Array.from(e.dataTransfer.files), "");
                          }
                        }}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                          dragOverTarget === "tree:root"
                            ? "bg-brand-teal/25 ring-1 ring-brand-teal text-white"
                            : currentSubpath === ""
                            ? "bg-brand-teal/15 text-brand-teal font-semibold"
                            : "text-zinc-300 hover:text-white hover:bg-white/[0.04]"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FolderOpen className="w-4 h-4 text-brand-teal shrink-0" />
                          <span className="truncate font-medium">
                            {spClientInfo?.folderName || "Root Folder"}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500">
                          {spAllItems.filter((i) => (i.parentSubpath || "") === "").length}
                        </span>
                      </div>

                      {/* Recursive Subfolder Nodes */}
                      <div className="pl-2 pt-0.5">{renderFolderTreeBranch("", 0)}</div>
                    </div>
                    <div className="p-2.5 border-t border-white/[0.05] bg-black/20 text-[10px] text-zinc-500 leading-relaxed">
                      Tip: Drag any file or folder onto the folder tree to move it instantly.
                    </div>
                  </div>
                )}

                {/* Pane 2: Scrollable File Explorer + Pagination Bar */}
                <div className="flex-1 flex flex-col overflow-hidden min-h-0 min-w-0">
                  <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-5">
                    {paginatedSpItems.length === 0 ? (
                      <div
                        onClick={openSpFileDialog}
                        className="h-full min-h-[260px] border-2 border-dashed border-white/[0.08] hover:border-brand-teal/40 rounded-2xl flex flex-col items-center justify-center p-8 text-center cursor-pointer transition-colors"
                      >
                        <Folder className="w-12 h-12 text-zinc-600 mb-3" />
                        <p className="text-sm font-medium text-zinc-300">
                          {spSearchQuery || categoryFilter !== "ALL"
                            ? "No files or folders match your current filter"
                            : "This SharePoint folder is empty"}
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">
                          Drag &amp; drop files here from your computer, or click to upload to SharePoint
                        </p>
                      </div>
                    ) : driveViewMode === "list" ? (
                      <div className="bg-[#111] border border-white/[0.06] rounded-xl overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-10 bg-[#161616] border-b border-white/[0.07] text-[10px] font-semibold uppercase tracking-wider text-zinc-400 select-none">
                              <tr>
                                <th
                                  onClick={() => handleSortColumn("name")}
                                  className="py-2.5 px-4 cursor-pointer hover:text-white group"
                                >
                                  Name {renderSortIcon("name")}
                                </th>
                                <th
                                  onClick={() => handleSortColumn("type")}
                                  className="py-2.5 px-3 hidden xl:table-cell cursor-pointer hover:text-white group"
                                >
                                  Type {renderSortIcon("type")}
                                </th>
                                <th
                                  onClick={() => handleSortColumn("lastModifiedDateTime")}
                                  className="py-2.5 px-3 hidden sm:table-cell cursor-pointer hover:text-white group"
                                >
                                  Modified {renderSortIcon("lastModifiedDateTime")}
                                </th>
                                <th
                                  onClick={() => handleSortColumn("lastModifiedBy")}
                                  className="py-2.5 px-3 hidden md:table-cell cursor-pointer hover:text-white group"
                                >
                                  Modified By {renderSortIcon("lastModifiedBy")}
                                </th>
                                <th
                                  onClick={() => handleSortColumn("size")}
                                  className="py-2.5 px-3 hidden sm:table-cell text-right cursor-pointer hover:text-white group"
                                >
                                  Size {renderSortIcon("size")}
                                </th>
                                <th className="py-2.5 px-4 text-right">Quick Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.04] text-xs">
                              {paginatedSpItems.map((item) => {
                                const isSelected = selectedSpItem?.id === item.id;
                                const targetFolderPath = item.relativePath || item.name;
                                const isDragTarget = dragOverTarget === `row:${item.id}`;
                                const officeDesktop = getOfficeDesktopAppInfo(
                                  item,
                                  spClientInfo?.folderWebUrl
                                );

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
                                        setDragOverTarget(`row:${item.id}`);
                                      }
                                    }}
                                    onDragLeave={() => {
                                      if (dragOverTarget === `row:${item.id}`) setDragOverTarget(null);
                                    }}
                                    onDrop={(e) => {
                                      if (!item.isFolder) return;
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setDragOverTarget(null);
                                      const draggedJson = e.dataTransfer.getData("application/x-sp-item");
                                      if (draggedJson) {
                                        try {
                                          const dragged = JSON.parse(draggedJson) as SharePointItem;
                                          if (dragged.id !== item.id) {
                                            executeMoveItem(dragged, targetFolderPath);
                                          }
                                        } catch {}
                                      } else if (e.dataTransfer.files?.length) {
                                        handleSpFileUploadToSubpath(
                                          Array.from(e.dataTransfer.files),
                                          targetFolderPath
                                        );
                                      }
                                    }}
                                    onClick={() => {
                                      if (item.isFolder) {
                                        navigateToSubpath(targetFolderPath);
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
                                    <td className="py-2.5 px-4 max-w-[260px] sm:max-w-[360px]">
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
                                          <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                                            {item.isFolder && item.childCount !== undefined && (
                                              <span>
                                                {item.childCount} item{item.childCount === 1 ? "" : "s"}
                                              </span>
                                            )}
                                            {spSearchQuery &&
                                              searchAllSubfolders &&
                                              item.parentSubpath && (
                                                <span className="truncate text-brand-teal/80 font-mono">
                                                  in /{item.parentSubpath}
                                                </span>
                                              )}
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-3 text-zinc-400 hidden xl:table-cell whitespace-nowrap text-[11px]">
                                      {getItemTypeLabel(item)}
                                    </td>
                                    <td className="py-2.5 px-3 text-zinc-400 hidden sm:table-cell whitespace-nowrap">
                                      {formatDateTime(item.lastModifiedDateTime)}
                                    </td>
                                    <td className="py-2.5 px-3 text-zinc-400 hidden md:table-cell truncate max-w-[140px]">
                                      {item.lastModifiedBy || "SharePoint"}
                                    </td>
                                    <td className="py-2.5 px-3 text-zinc-400 hidden sm:table-cell text-right whitespace-nowrap font-mono text-[11px]">
                                      {item.isFolder
                                        ? `${item.childCount ?? 0} items`
                                        : formatFileSize(item.size)}
                                    </td>
                                    <td
                                      className="py-2.5 px-4 text-right whitespace-nowrap"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="inline-flex items-center gap-1">
                                        {/* 1-Click Open in Native Desktop Office 365 App (Word / Excel / PowerPoint) */}
                                        {officeDesktop && (
                                          <a
                                            href={officeDesktop.protocolUrl}
                                            className={`px-2 py-1 rounded border text-[10px] font-medium inline-flex items-center gap-1 transition-colors ${officeDesktop.badgeClass}`}
                                            title={`${officeDesktop.appLabel} (Edits save directly to SharePoint)`}
                                          >
                                            <Monitor className="w-3 h-3" />
                                            <span className="hidden 2xl:inline">
                                              {officeDesktop.appLabel}
                                            </span>
                                          </a>
                                        )}

                                        {item.webUrl && (
                                          <a
                                            href={item.webUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="p-1.5 text-zinc-400 hover:text-brand-teal hover:bg-brand-teal/10 rounded-md transition-colors"
                                            title={
                                              item.isFolder
                                                ? "Open Folder in SharePoint"
                                                : "Open in SharePoint / Office Online"
                                            }
                                          >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                          </a>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSelectedSpItem(item);
                                            setInspectorTab("DETAILS");
                                          }}
                                          className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                                          title="File Metadata & Details"
                                        >
                                          <Info className="w-3.5 h-3.5" />
                                        </button>
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
                                            setMoveTargetSubpath(item.parentSubpath || currentSubpath);
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
                      </div>
                    ) : (
                      /* Grid View (Supports Drag-and-Drop Organization) */
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {paginatedSpItems.map((item) => {
                          const isSelected = selectedSpItem?.id === item.id;
                          const targetFolderPath = item.relativePath || item.name;
                          const isDragTarget = dragOverTarget === `grid:${item.id}`;
                          const officeDesktop = getOfficeDesktopAppInfo(
                            item,
                            spClientInfo?.folderWebUrl
                          );

                          return (
                            <div
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
                                  setDragOverTarget(`grid:${item.id}`);
                                }
                              }}
                              onDragLeave={() => {
                                if (dragOverTarget === `grid:${item.id}`) setDragOverTarget(null);
                              }}
                              onDrop={(e) => {
                                if (!item.isFolder) return;
                                e.preventDefault();
                                e.stopPropagation();
                                setDragOverTarget(null);
                                const draggedJson = e.dataTransfer.getData("application/x-sp-item");
                                if (draggedJson) {
                                  try {
                                    const dragged = JSON.parse(draggedJson) as SharePointItem;
                                    if (dragged.id !== item.id) {
                                      executeMoveItem(dragged, targetFolderPath);
                                    }
                                  } catch {}
                                }
                              }}
                              onClick={() => {
                                if (item.isFolder) {
                                  navigateToSubpath(targetFolderPath);
                                } else {
                                  setSelectedSpItem(item);
                                }
                              }}
                              className={`group p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                                isDragTarget
                                  ? "bg-brand-teal/25 border-brand-teal"
                                  : isSelected
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
                                  {officeDesktop && (
                                    <a
                                      href={officeDesktop.protocolUrl}
                                      className="p-1 text-blue-400 hover:bg-blue-500/15 rounded"
                                      title={officeDesktop.appLabel}
                                    >
                                      <Monitor className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                  {item.webUrl && (
                                    <a
                                      href={item.webUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-1 text-zinc-400 hover:text-brand-teal rounded"
                                      title="Open in SharePoint"
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
                                      setMoveTargetSubpath(item.parentSubpath || currentSubpath);
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
                                  <span>{formatDateTime(item.lastModifiedDateTime)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Pagination & Status Footer Bar */}
                  <div className="px-4 sm:px-6 py-2.5 bg-[#121212] border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400 shrink-0">
                    <div className="flex items-center gap-3">
                      <span>
                        Showing{" "}
                        <strong className="text-white">
                          {totalItemsCount === 0
                            ? 0
                            : pageSize > 0
                            ? (safeCurrentPage - 1) * pageSize + 1
                            : 1}
                        </strong>
                        –
                        <strong className="text-white">
                          {pageSize > 0
                            ? Math.min(safeCurrentPage * pageSize, totalItemsCount)
                            : totalItemsCount}
                        </strong>{" "}
                        of <strong className="text-white">{totalItemsCount}</strong> items
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-zinc-500">Rows:</span>
                        <select
                          value={pageSize}
                          onChange={(e) => setPageSize(Number(e.target.value))}
                          className="bg-[#0a0a0a] border border-white/10 rounded px-2 py-0.5 text-xs text-white outline-none focus:border-brand-teal"
                        >
                          <option value={25}>25</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                          <option value={0}>All</option>
                        </select>
                      </div>
                    </div>

                    {pageSize > 0 && totalPages > 1 && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={safeCurrentPage <= 1}
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-zinc-300 disabled:opacity-30"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2 font-mono text-[11px]">
                          Page <strong className="text-white">{safeCurrentPage}</strong> of{" "}
                          <strong className="text-white">{totalPages}</strong>
                        </span>
                        <button
                          type="button"
                          disabled={safeCurrentPage >= totalPages}
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-zinc-300 disabled:opacity-30"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pane 3: Right File Preview, Office 365 Launcher & Metadata Inspector Drawer */}
                {selectedSpItem && (
                  <div className="w-full lg:w-[420px] xl:w-[480px] border-l border-white/[0.06] flex flex-col bg-[#0d0d0d] overflow-hidden min-h-0 shrink-0">
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
                            {getItemTypeLabel(selectedSpItem)} • {formatFileSize(selectedSpItem.size)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <div className="flex bg-[#0a0a0a] p-0.5 rounded-lg border border-white/10 text-[10px]">
                          <button
                            type="button"
                            onClick={() => setInspectorTab("PREVIEW")}
                            className={`px-2 py-1 rounded font-medium ${
                              inspectorTab === "PREVIEW"
                                ? "bg-brand-teal text-black font-semibold"
                                : "text-zinc-400 hover:text-white"
                            }`}
                          >
                            Preview
                          </button>
                          <button
                            type="button"
                            onClick={() => setInspectorTab("DETAILS")}
                            className={`px-2 py-1 rounded font-medium ${
                              inspectorTab === "DETAILS"
                                ? "bg-brand-teal text-black font-semibold"
                                : "text-zinc-400 hover:text-white"
                            }`}
                          >
                            Details
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedSpItem(null)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
                          title="Close Inspector"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Inspector Body: Preview Mode vs Metadata Details Mode */}
                    {inspectorTab === "DETAILS" ? (
                      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                        <div className="p-4 rounded-xl bg-[#141414] border border-white/[0.06] flex items-center gap-3.5">
                          <FileThumbnail file={selectedSpItem} size="lg" />
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-white break-all">
                              {selectedSpItem.name}
                            </div>
                            <div className="text-[11px] text-brand-teal mt-0.5">
                              {getItemTypeLabel(selectedSpItem)}
                            </div>
                          </div>
                        </div>

                        {/* Metadata Properties Card */}
                        <div className="rounded-xl bg-[#141414] border border-white/[0.06] divide-y divide-white/[0.05]">
                          <div className="px-3.5 py-2.5 flex items-center justify-between">
                            <span className="text-zinc-400 flex items-center gap-1.5">
                              <HardDrive className="w-3.5 h-3.5 text-zinc-500" /> File Size
                            </span>
                            <span className="font-mono text-white">
                              {formatFileSize(selectedSpItem.size)} (
                              {(selectedSpItem.size || 0).toLocaleString()} bytes)
                            </span>
                          </div>
                          <div className="px-3.5 py-2.5 flex items-center justify-between">
                            <span className="text-zinc-400 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-zinc-500" /> Last Modified
                            </span>
                            <span className="text-white">
                              {formatDateTime(selectedSpItem.lastModifiedDateTime, true)}
                            </span>
                          </div>
                          <div className="px-3.5 py-2.5 flex items-center justify-between">
                            <span className="text-zinc-400 flex items-center gap-1.5">
                              <UserIcon className="w-3.5 h-3.5 text-zinc-500" /> Modified By
                            </span>
                            <span className="text-white font-medium">
                              {selectedSpItem.lastModifiedBy || "SharePoint"}
                            </span>
                          </div>
                          <div className="px-3.5 py-2.5 flex items-center justify-between">
                            <span className="text-zinc-400 flex items-center gap-1.5">
                              <CalendarIcon className="w-3.5 h-3.5 text-zinc-500" /> Created Date
                            </span>
                            <span className="text-white">
                              {formatDateTime(selectedSpItem.createdDateTime, true)}
                            </span>
                          </div>
                          <div className="px-3.5 py-2.5 flex items-center justify-between">
                            <span className="text-zinc-400 flex items-center gap-1.5">
                              <UserIcon className="w-3.5 h-3.5 text-zinc-500" /> Created By
                            </span>
                            <span className="text-white">
                              {selectedSpItem.createdBy || selectedSpItem.lastModifiedBy || "SharePoint"}
                            </span>
                          </div>
                          <div className="px-3.5 py-2.5 space-y-1">
                            <div className="text-zinc-400">SharePoint Relative Path</div>
                            <div className="font-mono text-[11px] text-zinc-300 bg-black/40 p-2 rounded border border-white/5 break-all">
                              {(spClientInfo?.fullSharePointPath || "").replace(/\//g, "\\")}\
                              {(selectedSpItem.relativePath || selectedSpItem.name).replace(/\//g, "\\")}
                            </div>
                          </div>
                        </div>

                        {/* Quick Management Buttons inside Details */}
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopySharePointLink(selectedSpItem)}
                            className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-200 font-medium inline-flex items-center justify-center gap-1.5 transition-colors"
                          >
                            {copiedLinkId === selectedSpItem.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            <span>Copy SharePoint Link</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMovingItem(selectedSpItem);
                              setMoveTargetSubpath(selectedSpItem.parentSubpath || currentSubpath);
                            }}
                            className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-200 font-medium inline-flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <FolderInput className="w-3.5 h-3.5 text-amber-400" />
                            <span>Move to Folder...</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 relative flex flex-col items-center justify-center bg-black/40 overflow-hidden min-h-0">
                        {spPreviewLoading ? (
                          <div className="text-zinc-400 flex flex-col items-center">
                            <RefreshCw className="w-8 h-8 animate-spin text-brand-teal mb-2.5" />
                            <p className="text-xs">Streaming preview from SharePoint...</p>
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
                                <span>
                                  {savingSpText ? "Saving to SharePoint..." : "Save to SharePoint"}
                                </span>
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
                              Open this file directly in your desktop Office 365 app or SharePoint Online to view or co-edit in real time.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Drawer Footer Actions (Desktop Office 365 + SharePoint Online + Download) */}
                    <div className="p-3.5 bg-[#141414] border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2 shrink-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {(() => {
                          const desktopInfo = getOfficeDesktopAppInfo(
                            selectedSpItem,
                            spClientInfo?.folderWebUrl
                          );
                          if (!desktopInfo) return null;
                          return (
                            <a
                              href={desktopInfo.protocolUrl}
                              className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors"
                              title="Opens directly in your local installed Office 365 desktop app and auto-saves to SharePoint"
                            >
                              <Monitor className="w-3.5 h-3.5" />
                              <span>{desktopInfo.appLabel}</span>
                            </a>
                          );
                        })()}
                        {selectedSpItem.webUrl && (
                          <a
                            href={selectedSpItem.webUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-2 bg-brand-teal hover:bg-teal-400 text-black text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors shadow-xs"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>SharePoint Online</span>
                          </a>
                        )}
                        {spTextContent !== null && !isEditingSpText && inspectorTab === "PREVIEW" && (
                          <button
                            type="button"
                            onClick={() => setIsEditingSpText(true)}
                            className="px-2.5 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-medium rounded-lg inline-flex items-center gap-1.5 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit Text</span>
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
                <label className="block text-xs text-zinc-400 mb-1.5">
                  Folder Name {currentSubpath ? `(inside /${currentSubpath})` : ""}
                </label>
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
                  {spAllSubfolders
                    .filter(
                      (f) =>
                        f.id !== movingItem.id &&
                        !(
                          movingItem.isFolder &&
                          movingItem.relativePath &&
                          f.path.startsWith(`${movingItem.relativePath}/`)
                        )
                    )
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

