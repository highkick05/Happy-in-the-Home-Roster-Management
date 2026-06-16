import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDropzone } from 'react-dropzone';
import { 
  Folder, File, UploadCloud, Trash2, Download, ChevronRight, CornerLeftUp, 
  LayoutList, LayoutGrid, Columns, FileText, FileImage, FileBarChart2 
} from 'lucide-react';
import { useLocalStorage } from '../../hooks/useLocalStorage';

// 2. SMART THUMBNAIL ENGINE
const FileThumbnail = ({ file, size = 'sm', isFolder = false }: { file?: any, size?: 'sm' | 'lg' | 'xl', isFolder?: boolean }) => {
  const iconProps = {
    className: size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-10 h-10' : 'w-16 h-16',
    strokeWidth: 1.5
  };

  if (isFolder) {
    return <Folder {...iconProps} className={`${iconProps.className} fill-indigo-500/20 text-indigo-400`} />;
  }

  if (!file) {
    return <File {...iconProps} className={`${iconProps.className} text-zinc-400`} />;
  }

  const mimeType = (file.mime_type || '').toLowerCase();
  const originalName = (file.original_name || '').toLowerCase();
  
  const isImage = mimeType.startsWith('image/') || originalName.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  const isPdf = mimeType === 'application/pdf' || originalName.match(/\.pdf$/i);
  const isWord = mimeType.includes('wordprocessingml') || mimeType.includes('msword') || originalName.match(/\.(doc|docx)$/i);
  const isExcel = mimeType.includes('spreadsheetml') || mimeType.includes('excel') || originalName.match(/\.(xls|xlsx|csv)$/i);
  
  if (isImage) {
    // If the API supported direct auth'd URLs we'd use <img src="..." />
    // For now we use the icon with emerald accent
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
  return <File {...iconProps} className={`${iconProps.className} text-zinc-400`} />;
};

export default function FilesView() {
  const { token, user } = useAuth();
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 1. STATE MANAGEMENT & TOGGLES
  const [viewMode, setViewMode] = useLocalStorage<'list' | 'grid' | 'column'>('files_view_mode', 'list');
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null);

  const [columnWidth, setColumnWidth] = useLocalStorage('file_manager_col_width', 250);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      setColumnWidth(prev => {
        const newWidth = prev + e.movementX;
        return Math.max(150, Math.min(newWidth, 800)); 
      });
    };
    const handleMouseUp = () => setIsResizing(false);
    
    if (isResizing) {
       document.addEventListener('mousemove', handleMouseMove);
       document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
       document.removeEventListener('mousemove', handleMouseMove);
       document.removeEventListener('mouseup', handleMouseUp);
    }
  }, [isResizing, setColumnWidth]);

  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  useEffect(() => {
    let url = '';
    
    if (!selectedFileId || viewMode !== 'column') {
      setPreviewContent(null);
      setIsPreviewLoading(false);
      return;
    }
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const file = files.find(f => f.id === selectedFileId);
    if (!file) {
      setPreviewContent(null);
      setIsPreviewLoading(false);
      return;
    }
    
    const mimeType = (file.mime_type || '').toLowerCase();
    const originalName = (file.original_name || '').toLowerCase();
    const isImage = mimeType.startsWith('image/') || originalName.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    const isPdf = mimeType === 'application/pdf' || originalName.match(/\.pdf$/i);
    const isText = mimeType.startsWith('text/') || originalName.match(/\.(txt|md|csv|json)$/i);
    
    if (isImage || isPdf || isText) {
      setIsPreviewLoading(true);
      fetch(`/api/files/download/${file.id}?preview=true`, { headers: { Authorization: `Bearer ${token}` } })
        .then(async res => {
           if (!res.ok) throw new Error('Failed to fetch preview');
           const blob = await res.blob();
           return new Blob([blob], { type: file.mime_type || res.headers.get('content-type') || 'application/octet-stream' });
        })
        .then(blob => {
           url = window.URL.createObjectURL(blob);
           setPreviewContent(url);
           setIsPreviewLoading(false);
        })
        .catch(err => {
           console.error(err);
           setIsPreviewLoading(false);
        });
    } else {
       setPreviewContent(null);
    }
    
    return () => {
      if (url) window.URL.revokeObjectURL(url);
    }
  }, [selectedFileId, files, viewMode, token]);

  const staffRoot = useMemo(() => {
    if (user?.role === 'ADMIN') return '/';
    const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ');
    return `/Staff${name ? `/${name}` : ''}`;
  }, [user]);

  const [currentPath, setCurrentPath] = useLocalStorage('files_current_path', staffRoot);

  useEffect(() => {
    // Ensure the user doesn't end up in an unauthorized path from previous sessions
    if (user?.role !== 'ADMIN' && !currentPath.startsWith(staffRoot)) {
      setCurrentPath(staffRoot);
      setSelectedFileId(null);
    }
  }, [staffRoot, currentPath, setCurrentPath, user?.role]);

  // When path changes, clear selected file
  useEffect(() => {
    setSelectedFileId(null);
  }, [currentPath]);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/files', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        let f = await res.json();
        // ensure all files have a folder_path
        f = f.map((x: any) => ({ ...x, folder_path: x.folder_path || '/' }));
        setFiles(f);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    // For simplicity, we just take the first file here
    const file = acceptedFiles[0];
    
    let uploadPath = currentPath;
    if (user?.role !== 'ADMIN' && !currentPath.startsWith(staffRoot)) {
      uploadPath = staffRoot;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folderPath', uploadPath);
    
    try {
      setLoading(true);
      const res = await fetch(`/api/files?folderPath=${encodeURIComponent(uploadPath)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        fetchFiles();
      } else {
        alert('File upload failed');
      }
    } catch (e) {
      console.error(e);
      alert('File upload failed');
    } finally {
      setLoading(false);
    }
  }, [token, currentPath, user]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({ onDrop, noClick: true, noKeyboard: true });

  const downloadFile = async (id: number, filename: string) => {
    try {
      const res = await fetch(`/api/files/download/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        alert('Could not download file.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteFile = async (id: number) => {
    try {
      const res = await fetch(`/api/files/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchFiles();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const currentFolderFiles = useMemo(() => {
    return files.filter(f => {
      // Normalize paths
      const p1 = f.folder_path.replace(/\/+$/, '') || '/';
      const p2 = currentPath.replace(/\/+$/, '') || '/';
      return p1 === p2;
    });
  }, [files, currentPath]);

  const subfolders = useMemo(() => {
    const folders = new Set<string>();
    const cPath = currentPath.replace(/\/+$/, '') || '/';
    
    if (user?.role === 'ADMIN' && cPath === '/') {
      folders.add('Clients');
      folders.add('Staff');
      folders.add('Settings');
    }

    files.forEach(f => {
      const fPath = f.folder_path.replace(/\/+$/, '') || '/';
      if (fPath !== cPath && fPath.startsWith(cPath === '/' ? '/' : cPath + '/')) {
        const remaining = fPath.slice(cPath === '/' ? 1 : cPath.length + 1);
        const nextSegment = remaining.split('/')[0];
        if (nextSegment) {
          folders.add(nextSegment);
        }
      }
    });
    return Array.from(folders).sort();
  }, [files, currentPath, user]);

  const navigateUp = () => {
    if (currentPath === staffRoot) return;
    if (currentPath === '/') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    const newPath = '/' + parts.join('/');
    // Prevent staff from navigating above their root
    if (user?.role !== 'ADMIN' && !newPath.startsWith(staffRoot)) {
      setCurrentPath(staffRoot);
    } else {
      setCurrentPath(newPath);
    }
  };

  const navigateTo = (folder: string) => {
    const cPath = currentPath.replace(/\/+$/, '') || '/';
    setCurrentPath(cPath === '/' ? `/${folder}` : `${cPath}/${folder}`);
  };

  return (
    <div className="h-full flex flex-col flex-1 pb-10">
      <div className="flex justify-between items-start lg:items-center px-8 pt-8 pb-6 flex-col lg:flex-row gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Files</h2>
          <p className="text-zinc-400 text-sm mt-1">Manage documents, uploads, and media.</p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={open} className="flex items-center px-4 py-2 bg-brand-teal hover:bg-teal-400 text-black text-sm font-semibold rounded-lg transition-colors shadow-sm cursor-pointer">
            <UploadCloud className="w-4 h-4 mr-2" />
            Upload File
          </button>
          <div className="flex items-center bg-black/40 border border-white/10 rounded-lg p-1">
          <button 
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
            title="List View"
          >
            <LayoutList className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
            title="Grid View"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setViewMode('column')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'column' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
            title="Column View"
          >
            <Columns className="w-4 h-4" />
          </button>
          </div>
        </div>
      </div>

      <div {...getRootProps()} className="flex-1 px-8 flex flex-col min-h-0 relative">
        <input {...getInputProps()} />
        {isDragActive && (
          <div className="absolute inset-x-8 inset-y-0 z-50 bg-brand-teal/10 rounded-xl mb-10 border-2 border-dashed border-brand-teal flex flex-col items-center justify-center backdrop-blur-sm pointer-events-none">
             <div className="p-5 bg-brand-teal text-black rounded-full shadow-[0_0_20px_rgba(20,184,166,0.3)] animate-pulse mb-6">
               <UploadCloud className="w-10 h-10" />
             </div>
             <h3 className="text-2xl font-bold text-white tracking-tight drop-shadow-md">Drop files to upload</h3>
             <p className="text-brand-teal mt-2">Uploading to: {currentPath}</p>
          </div>
        )}

        <div className="flex-1 flex flex-col bg-[#111] border border-white/[0.08] rounded-xl shadow-lg ring-1 ring-white/[0.02] min-h-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.08] flex items-center bg-[#151515]">
            <div className="flex items-center text-sm font-medium text-zinc-400">
              <button onClick={() => setCurrentPath(staffRoot)} className="hover:text-brand-teal transition-colors flex items-center pr-2">
                <Folder className="w-4 h-4 text-brand-teal mr-2 fill-brand-teal/20" />
                {user?.role === 'ADMIN' ? 'Root Directory' : 'My Files'}
              </button>
              {currentPath.substring(staffRoot === '/' ? 0 : staffRoot.length).split('/').filter(Boolean).map((part, i, arr) => (
                <React.Fragment key={i}>
                  <ChevronRight className="w-4 h-4 mx-1 text-zinc-600" />
                  <button 
                    onClick={() => setCurrentPath(staffRoot === '/' ? '/' + arr.slice(0, i + 1).join('/') : staffRoot + '/' + arr.slice(0, i + 1).join('/'))}
                    className={`transition-colors pl-1 ${i === arr.length - 1 ? "text-white" : "hover:text-white"}`}
                  >
                    {part}
                  </button>
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="text-center text-zinc-500 py-12">Loading files...</div>
            ) : (subfolders.length === 0 && currentFolderFiles.length === 0) ? (
              <div className="text-center text-zinc-500 py-20 flex flex-col items-center justify-center h-full">
                <div className="w-20 h-20 bg-zinc-800/30 rounded-full flex items-center justify-center mb-4 text-zinc-600">
                  <Folder className="w-8 h-8" />
                </div>
                <p className="text-lg font-medium text-zinc-400">Folder is empty.</p>
                <p className="text-sm text-zinc-600 mt-1 max-w-xs text-center mb-6">Drop files above to upload them to this directory.</p>
                {currentPath !== '/' && (
                  <button 
                    onClick={navigateUp}
                    className="flex items-center px-5 py-2.5 bg-zinc-800/80 border border-white/[0.12] hover:bg-zinc-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <CornerLeftUp className="w-4 h-4 mr-2 text-brand-teal" />
                    Go back
                  </button>
                )}
              </div>
            ) : viewMode === 'list' ? (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[#0a0a0a] border-b border-white/[0.05] sticky top-0 z-10 backdrop-blur-md">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-32">Size</th>
                    <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-48">Date Modified</th>
                    <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-24 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {/* Parent Navigation */}
                  {currentPath !== '/' && (
                     <tr onClick={navigateUp} className="hover:bg-zinc-800/50 cursor-pointer transition-all group">
                        <td className="px-6 py-4 flex items-center space-x-4">
                          <div className="p-2 bg-zinc-800/80 rounded-lg group-hover:bg-brand-teal group-hover:text-white transition-colors duration-300">
                            <CornerLeftUp className="w-5 h-5 text-zinc-400 group-hover:text-white" />
                          </div>
                          <span className="font-semibold text-zinc-400 group-hover:text-white transition-colors">..</span>
                        </td>
                        <td className="px-6 py-4 text-zinc-500">-</td>
                        <td className="px-6 py-4 text-zinc-500">-</td>
                        <td className="px-6 py-4"></td>
                     </tr>
                  )}

                  {/* Subfolders */}
                  {subfolders.map(folder => (
                    <tr key={folder} onClick={() => navigateTo(folder)} className="hover:bg-zinc-800/40 cursor-pointer transition-all group">
                      <td className="px-6 py-4 flex items-center space-x-4">
                        <FileThumbnail isFolder size="sm" />
                        <span className="font-semibold text-zinc-200 group-hover:text-white transition-colors">{folder}</span>
                      </td>
                      <td className="px-6 py-4 text-zinc-500">-</td>
                      <td className="px-6 py-4 text-zinc-500">-</td>
                      <td className="px-6 py-4"></td>
                    </tr>
                  ))}

                  {/* Files */}
                  {currentFolderFiles.map(f => (
                    <tr key={f.id} className="hover:bg-zinc-800/30 transition-all group">
                      <td className="px-6 py-4 flex items-center space-x-4">
                        <FileThumbnail file={f} size="sm" />
                        <span className="font-medium text-zinc-300 group-hover:text-white transition-colors">{f.original_name}</span>
                      </td>
                      <td className="px-6 py-4 text-zinc-500 font-mono text-xs">{(f.size / 1024).toFixed(1)} KB</td>
                      <td className="px-6 py-4 text-zinc-500 text-sm">
                        {new Date(f.created_at).toLocaleDateString()} <span className="opacity-50 mx-1">•</span> {new Date(f.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); downloadFile(f.id, f.original_name); }} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-700/50 rounded-lg transition-all border border-transparent hover:border-white/10" title="Download File">
                            <Download className="w-4 h-4" />
                          </button>
                          {(user?.role === 'ADMIN' || f.uploaded_by === user?.id) && (
                            <button onClick={(e) => { e.stopPropagation(); deleteFile(f.id); }} className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all border border-transparent hover:border-red-500/20" title="Delete File">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : viewMode === 'grid' ? (
              <div className="p-4 grid gap-4 grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 2xl:grid-cols-14">
                {currentPath !== '/' && (
                  <div onClick={navigateUp} className="bg-zinc-800/30 rounded-lg border border-zinc-700/50 hover:bg-zinc-800 hover:border-zinc-500/50 cursor-pointer transition-all flex flex-col items-center justify-center p-4 group aspect-square">
                     <div className="p-2 bg-zinc-800/80 rounded-full group-hover:bg-brand-teal group-hover:text-white transition-colors duration-300 mb-2">
                       <CornerLeftUp className="w-5 h-5 text-zinc-400 group-hover:text-white" />
                     </div>
                     <span className="font-semibold text-zinc-400 group-hover:text-white transition-colors text-sm">..</span>
                  </div>
                )}
                {subfolders.map(folder => (
                  <div key={folder} onClick={() => navigateTo(folder)} className="bg-zinc-800/30 rounded-lg border border-zinc-700/50 hover:bg-zinc-800 hover:border-zinc-500/50 cursor-pointer transition-all flex flex-col items-center justify-center p-4 group aspect-square text-center">
                     <FileThumbnail isFolder size="lg" />
                     <span className="mt-3 font-semibold text-sm text-zinc-200 group-hover:text-white transition-colors max-w-full truncate px-1">{folder}</span>
                  </div>
                ))}
                {currentFolderFiles.map(f => (
                  <div key={f.id} onClick={() => {}} className="bg-zinc-800/30 rounded-lg border border-zinc-700/50 hover:bg-zinc-800 hover:border-zinc-500/50 transition-all flex flex-col items-center justify-center p-4 group aspect-square text-center relative">
                    <FileThumbnail file={f} size="lg" />
                    <span className="mt-3 font-medium text-zinc-300 group-hover:text-white transition-colors max-w-full truncate px-1 text-[13px]">{f.original_name}</span>
                    <span className="mt-1 text-[11px] text-zinc-500">{(f.size / 1024).toFixed(1)} KB</span>
                    
                    <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); downloadFile(f.id, f.original_name); }} className="p-1 bg-black/60 text-zinc-300 hover:text-white hover:bg-brand-teal rounded transition-colors backdrop-blur-sm shadow-sm" title="Download File">
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      {(user?.role === 'ADMIN' || f.uploaded_by === user?.id) && (
                        <button onClick={(e) => { e.stopPropagation(); deleteFile(f.id); }} className="p-1 bg-black/60 text-zinc-300 hover:text-white hover:bg-red-500 rounded transition-colors backdrop-blur-sm shadow-sm" title="Delete File">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
             <div className="flex h-full min-h-0 overflow-hidden divide-x divide-white/[0.05]">
                <div style={{ width: columnWidth }} className="flex flex-col border-r border-zinc-700 relative shrink-0">
                  <ul className="flex-1 overflow-y-auto py-2">
                    {currentPath !== '/' && (
                      <li onClick={navigateUp} className="px-4 py-2 hover:bg-zinc-800/50 cursor-pointer flex items-center text-sm font-medium text-zinc-400 group">
                        <CornerLeftUp className="w-4 h-4 mr-3 group-hover:text-white" />
                        <span className="group-hover:text-white">..</span>
                      </li>
                    )}
                    {subfolders.map(folder => (
                      <li key={folder} onClick={() => { navigateTo(folder); setSelectedFileId(null); }} className="px-4 py-2 hover:bg-zinc-800/50 cursor-pointer flex items-center text-sm font-medium text-zinc-200 group">
                        <FileThumbnail isFolder size="sm" />
                        <span className="ml-3 truncate">{folder}</span>
                        <ChevronRight className="w-4 h-4 ml-auto text-zinc-600 opacity-0 group-hover:opacity-100" />
                      </li>
                    ))}
                    {currentFolderFiles.map(f => (
                      <li key={f.id} onClick={() => setSelectedFileId(f.id)} className={`px-4 py-2 cursor-pointer flex items-center text-sm font-medium ${selectedFileId === f.id ? 'bg-brand-teal/10 text-brand-teal border-r-2 border-brand-teal' : 'hover:bg-zinc-800/50 text-zinc-300'} group`}>
                        <FileThumbnail file={f} size="sm" />
                        <span className="ml-3 truncate">{f.original_name}</span>
                      </li>
                    ))}
                  </ul>
                  {/* Resizer handle */}
                  <div 
                    className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-brand-teal/50 active:bg-brand-teal z-10 transition-colors"
                    onMouseDown={() => setIsResizing(true)}
                  />
                </div>
                
                <div className="flex-1 bg-black/20 flex flex-col min-w-[200px] overflow-hidden">
                  {selectedFileId ? (
                    (() => {
                      const file = currentFolderFiles.find(f => f.id === selectedFileId);
                      if (!file) return null;
                      
                      const mimeType = (file.mime_type || '').toLowerCase();
                      const originalName = (file.original_name || '').toLowerCase();
                      const isImage = mimeType.startsWith('image/') || originalName.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                      const isPdf = mimeType === 'application/pdf' || originalName.match(/\.pdf$/i);
                      const isText = mimeType.startsWith('text/') || originalName.match(/\.(txt|md|csv|json)$/i);
                      
                      return (
                        <div className="w-full h-full flex flex-col bg-[#0a0a0a] overflow-hidden">
                          <div className="flex-1 relative flex items-center justify-center bg-black/40 min-h-0 border-b border-white/[0.05]">
                            {isPreviewLoading ? (
                               <div className="text-zinc-500 flex flex-col items-center animate-pulse">
                                  <File className="w-12 h-12 mb-3 opacity-30" strokeWidth={1} />
                                  <p className="text-sm">Loading preview...</p>
                               </div>
                            ) : previewContent ? (
                               isImage ? (
                                 <img src={previewContent} alt={file.original_name} className="max-w-full max-h-full object-contain drop-shadow-md" />
                               ) : (
                                 <iframe src={previewContent} title={file.original_name} className="w-full h-full bg-white" />
                               )
                            ) : (
                               <div className="p-10 flex flex-col items-center">
                                 <div className="p-6 bg-zinc-800/80 rounded-full shadow-inner mb-6 flex items-center justify-center">
                                   <FileThumbnail file={file} size="xl" />
                                 </div>
                                 <p className="text-zinc-500 text-sm">No preview available for this file type.</p>
                               </div>
                            )}
                          </div>
                          
                          <div className="bg-[#111] p-6 shrink-0 flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-medium text-white mb-1 break-all">{file.original_name}</h3>
                              <p className="text-zinc-500 text-xs">
                                {new Date(file.created_at).toLocaleString()} <span className="opacity-40 mx-1">•</span> {(file.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                            <div className="flex items-center space-x-3 ml-4">
                              <button onClick={() => downloadFile(file.id, file.original_name)} className="px-5 flex items-center justify-center py-2 bg-brand-teal hover:bg-teal-400 text-black text-sm font-semibold rounded-lg transition-colors shadow-sm">
                                <Download className="w-4 h-4 mr-2" /> Download
                              </button>
                              {(user?.role === 'ADMIN' || file.uploaded_by === user?.id) && (
                                <button onClick={() => deleteFile(file.id)} className="px-5 flex items-center justify-center py-2 bg-zinc-800 hover:bg-red-500 hover:text-white text-zinc-300 text-sm font-semibold rounded-lg transition-colors">
                                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="text-zinc-600 flex flex-col items-center justify-center h-full">
                      <File className="w-16 h-16 mb-4 opacity-30" strokeWidth={1} />
                      <p className="text-sm">Select a file to preview</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
