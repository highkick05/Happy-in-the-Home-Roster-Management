import re

def fix_file(file_path):
    with open(file_path, 'r') as f:
        text = f.read()

    text = text.replace(
        '<table className="w-full text-left text-sm whitespace-nowrap">',
        '<table className="w-full text-left text-xs whitespace-nowrap">'
    )
    
    text = text.replace(
        '<td className="px-6 py-4 text-zinc-500 text-sm">',
        '<td className="px-6 py-4 text-zinc-500 text-xs">'
    )

    with open(file_path, 'w') as f:
        f.write(text)

fix_file('src/components/Files/FilesView.tsx')
