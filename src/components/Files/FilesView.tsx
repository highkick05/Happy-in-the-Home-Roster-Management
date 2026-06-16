import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDropzone } from 'react-dropzone';
import { Folder, File, UploadCloud, Trash2, Download, ChevronRight, CornerLeftUp } from 'lucide-react';
import { useLocalStorage } from '../../hooks/useLocalStorage';

export default function FilesView() {
  const { token, user } = useAuth();
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
    }
  }, [staffRoot, currentPath, setCurrentPath, user?.role]);

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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

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
      <div className="flex justify-between items-center px-8 pt-8 pb-6">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Files</h2>
          <p className="text-zinc-400 text-sm mt-1">Manage documents, uploads, and media.</p>
        </div>
      </div>

      <div className="flex-1 px-8 flex flex-col min-h-0">
        
        <div {...getRootProps()} className={`relative overflow-hidden p-10 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group shrink-0 ${isDragActive ? 'bg-brand-teal/5 border-brand-teal' : 'bg-black/20 border-white/10 hover:bg-[#1A1A1A] hover:border-white/20'}`}>
          <input {...getInputProps()} />
          <div className="absolute inset-0 bg-gradient-to-b from-brand-teal/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          
          <div className={`p-4 rounded-full mb-4 shadow-lg transition-transform duration-300 ${isDragActive ? 'bg-brand-teal text-white scale-110' : 'bg-[#222] text-brand-teal shadow-[0_0_20px_rgba(20,184,166,0.1)] group-hover:scale-105'}`}>
            <UploadCloud className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Upload Files</h3>
          <p className="text-zinc-400 text-sm max-w-sm text-center">
            Drag & drop files here to upload to the current directory, or click to browse from your computer.
          </p>
        </div>

        <div className="mt-8 flex-1 flex flex-col bg-[#111] border border-white/[0.08] rounded-xl shadow-lg ring-1 ring-white/[0.02] min-h-0 overflow-hidden">
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
            ) : (
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
                        <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400 group-hover:bg-indigo-500/20 group-hover:scale-110 transition-all duration-300">
                          <Folder className="w-5 h-5 fill-indigo-500/20" />
                        </div>
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
                        <div className="p-2 bg-zinc-800/50 border border-white/5 rounded-lg text-zinc-400 group-hover:text-white group-hover:scale-110 transition-all duration-300">
                          <File className="w-5 h-5" />
                        </div>
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
