const fs = require('fs');
let content = fs.readFileSync('src/components/Files/FilesView.tsx', 'utf8');

const target = `<div className="flex items-center gap-2">
          <button onClick={open} className="flex items-center px-3 py-1.5 bg-brand-teal hover:bg-teal-400 text-black text-xs font-semibold rounded-md transition-colors shadow-sm cursor-pointer h-7">`;

const replacement = `<div className="flex items-center gap-2">
          {selectedFiles.length > 0 && (
            <button onClick={handleBulkDelete} className="flex items-center px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-semibold rounded-md transition-colors shadow-sm border border-red-500/20 cursor-pointer h-7">
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Delete Selected ({selectedFiles.length})
            </button>
          )}
          <button onClick={open} className="flex items-center px-3 py-1.5 bg-brand-teal hover:bg-teal-400 text-black text-xs font-semibold rounded-md transition-colors shadow-sm cursor-pointer h-7">`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync('src/components/Files/FilesView.tsx', content);
    console.log("Successfully inserted Delete Selected button!");
} else {
    console.log("Target not found!");
}
