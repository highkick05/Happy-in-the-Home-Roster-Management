import React, { useState, useEffect, useRef, useCallback } from "react";
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
  ArrowLeft
} from "lucide-react";
import * as xlsx from 'xlsx';
import mammoth from 'mammoth';

const FileThumbnail = ({ file, size = 'sm' }: { file?: any, size?: 'sm' | 'lg' | 'xl' }) => {
  const iconProps = {
    className: size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-10 h-10' : 'w-16 h-16',
    strokeWidth: 1.5
  };

  if (!file) {
    return <FileIcon {...iconProps} className={`${iconProps.className} text-zinc-400`} />;
  }

  const originalName = (file.name || '').toLowerCase();
  
  const isImage = originalName.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|heic|heif|avif|tiff|tif)$/i);
  const isPdf = originalName.match(/\.pdf$/i);
  const isWord = originalName.match(/\.(doc|docx)$/i);
  const isExcel = originalName.match(/\.(xls|xlsx|csv)$/i);
  
  if (isImage) {
    return <FileImage {...iconProps} className={`${iconProps.className} text-emerald-400`} />;
  }
  if (isPdf) {
    return <FileText {...iconProps} className={`${iconProps.className} text-rose-500`} />;
  }
  if (isWord) {
    return <FileText {...iconProps} className={`${iconProps.className} text-blue-400`} />;
  }
  if (isExcel) {
    return <FileBarChart2 {...iconProps} className={`${iconProps.className} text-green-500`} />;
  }

  return <FileIcon {...iconProps} className={`${iconProps.className} text-zinc-400`} />;
};

export default function ClientDocumentsView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token, user } = useAuth();

  const [templates, setTemplates] = useState<any[]>([]);
  const [completedDocs, setCompletedDocs] = useState<any[]>([]);
  
  const [selectedFile, setSelectedFile] = useState<any | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  
  const [isUploading, setIsUploading] = useState(false);

  const fetchClientDocuments = async () => {
    try {
      const res = await fetch(`/api/clients/${id}/documents`, {
        headers: { Authorization: `Bearer ${token}` },
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

  const handleUpload = useCallback(async (acceptedFiles: File[], category: string) => {
    setIsUploading(true);
    for (const file of acceptedFiles) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", category);
      
      try {
        const res = await fetch(`/api/clients/${id}/documents/upload`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });
        if (!res.ok) throw new Error("Upload failed");
      } catch (err) {
        console.error("Upload error", err);
      }
    }
    setIsUploading(false);
    fetchClientDocuments();
  }, [id, token]);

  const { getRootProps: getRootPropsTemplates, getInputProps: getInputPropsTemplates, isDragActive: isDragActiveTemplates } = useDropzone({
    onDrop: (files) => handleUpload(files, "Templates"),
  });
  
  const { getRootProps: getRootPropsCompleted, getInputProps: getInputPropsCompleted, isDragActive: isDragActiveCompleted } = useDropzone({
    onDrop: (files) => handleUpload(files, "Completed"),
  });

  const deleteDocument = async (name: string, category: string) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    try {
      await fetch(
        `/api/clients/${id}/documents/${encodeURIComponent(name)}?category=${category}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
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

    const originalName = (selectedFile.name || '').toLowerCase();
    const isImage = originalName.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|heic|heif|avif|tiff|tif)$/i);
    const isPdf = originalName.match(/\.pdf$/i);
    const isText = originalName.match(/\.(txt|md|csv|json)$/i);
    const isWord = originalName.match(/\.(doc|docx)$/i);
    const isExcel = originalName.match(/\.(xls|xlsx|csv)$/i);

    if (isImage || isPdf || isText || isWord || isExcel) {
      setIsPreviewLoading(true);
      fetch(`/api/clients/${id}/documents/${encodeURIComponent(selectedFile.name)}/download?token=${token}`)
        .then(async res => {
           if (!res.ok) throw new Error('Failed to fetch preview');
           const blob = await res.blob();
           return blob;
        })
        .then(async blob => {
           let finalBlob = blob;
           
           if (isExcel) {
              try {
                const arrayBuffer = await blob.arrayBuffer();
                const workbook = xlsx.read(arrayBuffer, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const htmlString = xlsx.utils.sheet_to_html(workbook.Sheets[firstSheetName]);
                finalBlob = new Blob([
                  `<html><head><style>table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; } tr:nth-child(even){background-color: #f2f2f2;} body { font-family: sans-serif; padding: 20px; }</style></head><body>${htmlString}</body></html>`
                ], { type: 'text/html' });
              } catch (e) {
                console.error("Excel preview failed", e);
              }
           } else if (isWord) {
              try {
                const arrayBuffer = await blob.arrayBuffer();
                const result = await mammoth.convertToHtml({ arrayBuffer });
                finalBlob = new Blob([
                  `<html><head><style>body { font-family: sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; } img { max-width: 100%; }</style></head><body>${result.value}</body></html>`
                ], { type: 'text/html' });
              } catch (e) {
                console.error("Word preview failed", e);
              }
           }
           const url = window.URL.createObjectURL(finalBlob);
           setPreviewContent(url);
           setIsPreviewLoading(false);
        })
        .catch(err => {
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
      <div className="flex items-center space-x-3 truncate">
        <FileThumbnail file={file} size="sm" />
        <span className="text-sm font-medium text-white truncate">
          {file.name}
        </span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          deleteDocument(file.name, category);
        }}
        className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center px-6 py-4 border-b border-white/[0.05] bg-[#111] shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="mr-4 p-2 rounded-lg hover:bg-white/5 transition-colors text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-semibold text-white">Client Documents</h1>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Content Area (Two Columns) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Templates Column */}
          <div className="flex-1 flex flex-col p-6 border-r border-white/[0.05]">
            <h2 className="text-lg font-semibold text-white mb-4">Templates</h2>
            <div
              {...getRootPropsTemplates()}
              className={`flex-1 relative border-2 border-dashed rounded-xl flex flex-col overflow-hidden transition-colors ${
                isDragActiveTemplates
                  ? "border-brand-teal bg-brand-teal/5"
                  : "border-white/[0.1] hover:border-brand-teal/50"
              }`}
            >
              <input {...getInputPropsTemplates()} />
              
              {/* Background Dropzone Indicator */}
              {(templates.length === 0 || isDragActiveTemplates) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-zinc-500 pointer-events-none z-20" style={{backgroundColor: isDragActiveTemplates ? 'rgba(0,0,0,0.5)' : 'transparent'}}>
                  <UploadCloud className="w-16 h-16 mb-4 opacity-50" />
                  <p className="text-lg font-medium text-zinc-400 mb-2">Drag & Drop Templates Here</p>
                  <p className="text-sm">or click to select files</p>
                </div>
              )}
              
              {/* File List */}
              <div className="flex-1 overflow-y-auto p-4 z-10">
                 {templates.map(file => renderFileItem(file, "Templates"))}
              </div>
            </div>
          </div>

          {/* Completed Column */}
          <div className="flex-1 flex flex-col p-6 border-r border-white/[0.05]">
            <h2 className="text-lg font-semibold text-white mb-4">Completed Documents</h2>
            <div
              {...getRootPropsCompleted()}
              className={`flex-1 relative border-2 border-dashed rounded-xl flex flex-col overflow-hidden transition-colors ${
                isDragActiveCompleted
                  ? "border-brand-teal bg-brand-teal/5"
                  : "border-white/[0.1] hover:border-brand-teal/50"
              }`}
            >
              <input {...getInputPropsCompleted()} />
              
              {/* Background Dropzone Indicator */}
              {(completedDocs.length === 0 || isDragActiveCompleted) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-zinc-500 pointer-events-none z-20" style={{backgroundColor: isDragActiveCompleted ? 'rgba(0,0,0,0.5)' : 'transparent'}}>
                  <UploadCloud className="w-16 h-16 mb-4 opacity-50" />
                  <p className="text-lg font-medium text-zinc-400 mb-2">Drag & Drop Completed Documents Here</p>
                  <p className="text-sm">or click to select files</p>
                </div>
              )}
              
              {/* File List */}
              <div className="flex-1 overflow-y-auto p-4 z-10">
                 {completedDocs.map(file => renderFileItem(file, "Completed"))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Preview Panel */}
        <div className="w-[450px] lg:w-[600px] shrink-0 bg-[#0a0a0a] flex flex-col border-l border-white/[0.05]">
          {selectedFile ? (
             <div className="w-full h-full flex flex-col overflow-hidden">
                <div className="flex-1 relative flex items-center justify-center bg-black/40 min-h-0 border-b border-white/[0.05]">
                  {isPreviewLoading ? (
                     <div className="text-zinc-500 flex flex-col items-center animate-pulse">
                        <FileIcon className="w-12 h-12 mb-3 opacity-30" strokeWidth={1} />
                        <p className="text-sm">Loading preview...</p>
                     </div>
                  ) : previewContent ? (
                     (selectedFile.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|heic|heif|avif|tiff|tif)$/i)) ? (
                       <img src={previewContent} alt={selectedFile.name} className="max-w-full max-h-full object-contain drop-shadow-md" />
                     ) : (
                       <iframe src={previewContent} title={selectedFile.name} className="w-full h-full bg-white border-none" />
                     )
                  ) : (
                     <div className="p-10 flex flex-col items-center text-center">
                       <div className="p-6 bg-zinc-800/80 rounded-full shadow-inner mb-6 flex items-center justify-center">
                         <FileThumbnail file={selectedFile} size="xl" />
                       </div>
                       <h3 className="text-xl font-bold text-white mb-2">Preview Error</h3>
                       <p className="text-zinc-500 text-sm max-w-xs">Could not generate preview for this document. Please download the file to view or edit it.</p>
                     </div>
                  )}
                </div>
                
                <div className="bg-[#111] p-6 shrink-0 flex items-center justify-between">
                  <div className="flex-1 min-w-0 pr-4">
                    <h3 className="text-lg font-medium text-white mb-1 truncate" title={selectedFile.name}>{selectedFile.name}</h3>
                    <p className="text-zinc-500 text-xs truncate">
                       {selectedFile.category}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3 shrink-0">
                    <button 
                      onClick={() => downloadFile(selectedFile.name)} 
                      className="px-5 flex items-center justify-center py-2 bg-brand-teal hover:bg-teal-400 text-black text-sm font-semibold rounded-lg transition-colors shadow-sm"
                    >
                      <Download className="w-4 h-4 mr-2" /> Download
                    </button>
                  </div>
                </div>
             </div>
          ) : (
            <div className="text-zinc-600 flex flex-col items-center justify-center h-full">
              <FileIcon className="w-16 h-16 mb-4 opacity-30" strokeWidth={1} />
              <p className="text-sm">Select a file to preview</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
