import re

def fix_file(file_path):
    with open(file_path, 'r') as f:
        text = f.read()

    # Extract the table portion
    table_start = text.find('<table')
    table_end = text.find('</table>') + len('</table>')

    if table_start != -1 and table_end != -1:
        table_html = text[table_start:table_end]
        
        # Decrease text-xs -> text-[11px]
        table_html = table_html.replace('text-xs', 'text-[11px]')
        # Decrease text-sm -> text-xs
        table_html = table_html.replace('text-sm', 'text-xs')
        # Decrease text-[11px] -> text-[10px] for headers
        # Wait, I previously changed text-xs uppercase to text-[11px] uppercase in TravelLogsView. 
        # I'll just change text-[11px] to text-[10px] if it's an uppercase header.
        
        # Re-replace text-[11px] uppercase
        table_html = table_html.replace('text-[11px] uppercase tracking-wider', 'text-[10px] uppercase tracking-wider')

        text = text[:table_start] + table_html + text[table_end:]
        
        with open(file_path, 'w') as f:
            f.write(text)

fix_file('src/components/TravelLogsView.tsx')
fix_file('src/components/VehiclesView.tsx')

