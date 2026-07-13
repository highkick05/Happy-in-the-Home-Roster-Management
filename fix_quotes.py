import sys

with open('src/components/Invoicing/QuotesView.tsx', 'r') as f:
    lines = f.readlines()

# Extract lines 565 to 599 (0-indexed, so 566 to 600)
extracted = lines[565:600]

# Remove them
del lines[565:600]

# Now find where "  });" is for the end of filteredQuotes.
# It should be around line 565+5 = 570 now.
for i in range(565, min(580, len(lines))):
    if "  });" in lines[i]:
        insert_idx = i + 1
        break

# Insert the extracted lines
for idx, line in enumerate(extracted):
    lines.insert(insert_idx + idx, line)

with open('src/components/Invoicing/QuotesView.tsx', 'w') as f:
    f.writelines(lines)

