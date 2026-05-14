import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDropzone } from 'react-dropzone';
import { Folder, File, UploadCloud, Trash2, Download, ChevronRight, CornerLeftUp } from 'lucide-react';

export default function FilesView() {
  const { token, user } = useAuth();
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const staffRoot = useMemo(() => {
    if (user?.role === 'ADMIN') return '/';
    const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ');
    return `/Staff${name ? `/${name}` : ''}`;
  }, [user]);

  const [currentPath, setCurrentPath] = useState(staffRoot);

  useEffect(() => {
    setCurrentPath(staffRoot);
  }, [staffRoot]);

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
    <div className="h-full flex flex-col space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-white tracking-tight mb-6">File Management</h2>
      </div>

      <div className="flex-1 bg-[#09090b] border border-white/[0.08] rounded-lg flex flex-col overflow-x-auto">
        
        <div {...getRootProps()} className={`p-8 border-b border-white/[0.08] border-dashed m-4 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors ${isDragActive ? 'bg-indigo-900/20 border-brand-teal' : 'bg-[#121214]/50 border-white/[0.12] hover:bg-[#121214]'}`}>
          <input {...getInputProps()} />
          <div className="p-4 bg-zinc-800 rounded-full mb-3">
            <UploadCloud className="w-8 h-8 text-brand-teal" />
          </div>
          <p className="text-white font-medium">Drag & Drop files here</p>
          <p className="text-zinc-500 text-sm mt-1">or click to browse from your computer</p>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div className="flex items-center text-[12px] font-medium text-zinc-400 mb-4">
            <button onClick={() => setCurrentPath(staffRoot)} className="hover:text-brand-teal">
              {user?.role === 'ADMIN' ? 'root' : 'My Files'}
            </button>
            {currentPath.substring(staffRoot === '/' ? 0 : staffRoot.length).split('/').filter(Boolean).map((part, i, arr) => (
              <React.Fragment key={i}>
                <ChevronRight className="w-4 h-4 mx-1" />
                <button 
                  onClick={() => setCurrentPath(staffRoot === '/' ? '/' + arr.slice(0, i + 1).join('/') : staffRoot + '/' + arr.slice(0, i + 1).join('/'))}
                  className={i === arr.length - 1 ? "text-brand-teal" : "hover:text-brand-teal"}
                >
                  {part}
                </button>
              </React.Fragment>
            ))}
          </div>

          <h3 className="text-lg font-medium text-white mb-4">Files & Folders</h3>
          
          {loading ? (
            <div className="text-center text-zinc-500">Loading files...</div>
          ) : (subfolders.length === 0 && currentFolderFiles.length === 0) ? (
            <div className="text-center text-zinc-500 py-12">
              <Folder className="w-12 h-12 mx-auto text-zinc-700 mb-3" />
              <p>Folder is empty.</p>
              {currentPath !== '/' && (
                <button 
                  onClick={navigateUp}
                  className="mt-4 flex items-center px-4 py-2 bg-zinc-800 border border-white/[0.12] hover:bg-zinc-700 text-white text-sm font-medium rounded-lg transition-colors mx-auto"
                >
                  <CornerLeftUp className="w-4 h-4 mr-2" />
                  Go back
                </button>
              )}
            </div>
          ) : (
            <div className="bg-[#121214] border border-white/[0.08] rounded-lg overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-400">
                <thead className="bg-[#121214] border-b border-white/[0.08] text-xs uppercase font-semibold text-zinc-500">
                  <tr>
                    <th className="px-4 py-4">Name</th>
                    <th className="px-4 py-4 w-32">Size</th>
                    <th className="px-4 py-4 w-48">Date Modified</th>
                    <th className="px-4 py-4 text-right w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {/* Parent Navigation */}
                  {currentPath !== '/' && (
                     <tr onClick={navigateUp} className="hover:bg-zinc-800/50 cursor-pointer transition-colors group text-white">
                        <td className="px-4 py-4 flex items-center space-x-3">
                          <div className="p-1.5 bg-zinc-800 rounded">
                            <CornerLeftUp className="w-4 h-4 text-zinc-400 group-hover:text-white" />
                          </div>
                          <span className="font-medium">..</span>
                        </td>
                        <td className="px-4 py-4 text-zinc-500">-</td>
                        <td className="px-4 py-4 text-zinc-500">-</td>
                        <td className="px-4 py-4"></td>
                     </tr>
                  )}

                  {/* Subfolders */}
                  {subfolders.map(folder => (
                    <tr key={folder} onClick={() => navigateTo(folder)} className="hover:bg-zinc-800/50 cursor-pointer transition-colors group text-white">
                      <td className="px-4 py-4 flex items-center space-x-3">
                        <div className="p-1.5 bg-indigo-900/40 rounded text-brand-teal group-hover:bg-indigo-500/20 group-hover:text-brand-teal">
                          <Folder className="w-4 h-4" />
                        </div>
                        <span className="font-medium">{folder}</span>
                      </td>
                      <td className="px-4 py-4 text-zinc-500">-</td>
                      <td className="px-4 py-4 text-zinc-500">-</td>
                      <td className="px-4 py-4"></td>
                    </tr>
                  ))}

                  {/* Files */}
                  {currentFolderFiles.map(f => (
                    <tr key={f.id} className="hover:bg-zinc-800/50 transition-colors group text-white">
                      <td className="px-4 py-4 flex items-center space-x-3">
                        <div className="p-1.5 bg-zinc-800 rounded">
                          <File className="w-4 h-4 text-zinc-400 group-hover:text-white" />
                        </div>
                        <span className="font-medium">{f.original_name}</span>
                      </td>
                      <td className="px-4 py-4 text-zinc-500">{(f.size / 1024).toFixed(1)} KB</td>
                      <td className="px-4 py-4 text-zinc-500">{new Date(f.created_at).toLocaleDateString()} {new Date(f.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); downloadFile(f.id, f.original_name); }} className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors" title="Download File">
                            <Download className="w-4 h-4" />
                          </button>
                          {(user?.role === 'ADMIN' || f.uploaded_by === user?.id) && (
                            <button onClick={(e) => { e.stopPropagation(); deleteFile(f.id); }} className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-700 rounded transition-colors" title="Delete File">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
