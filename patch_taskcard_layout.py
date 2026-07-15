import re

with open("src/components/Tasks/TaskCard.tsx", "r") as f:
    code = f.read()

# First, remove imageAttachments from the middle of the card
old_images = """      {imageAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3 mt-1">
          {imageAttachments.map((img: any, idx: number) => (
            <a 
              key={idx}
              href={img.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="w-12 h-12 border border-border-subtle hover:border-brand-teal transition-colors"
            >
              <img src={img.url} alt={img.filename} className="w-full h-full object-cover" />
            </a>
          ))}
        </div>
      )}"""

code = code.replace(old_images, "")

# Now insert it at the very top of the card
old_start = """    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      onClick={onEdit}
      className={`group relative flex flex-col p-3 bg-[#1E293B] hover:bg-[#273548] border border-border-subtle rounded-none shadow-sm mb-3 cursor-pointer transition-all ${snapshot.isDragging ? 'shadow-xl ring-2 ring-brand-teal/50 rotate-2' : ''}`}
    >
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">"""

new_start = """    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      onClick={onEdit}
      className={`group relative flex flex-col p-0 bg-[#1E293B] hover:bg-[#273548] border border-border-subtle rounded-none shadow-sm mb-3 cursor-pointer transition-all ${snapshot.isDragging ? 'shadow-xl ring-2 ring-brand-teal/50 rotate-2' : ''}`}
    >
      {imageAttachments.length > 0 && (
        <div className="w-full">
          {imageAttachments.map((img: any, idx: number) => (
            <a 
              key={idx}
              href={img.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="block w-full border-b border-border-subtle"
            >
              <img src={img.url} alt={img.filename} className="w-full h-32 object-cover" />
            </a>
          ))}
        </div>
      )}
      <div className="flex flex-col p-3 flex-1">
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">"""

code = code.replace(old_start, new_start)

# Now close the padding div before the end of the card
old_end = """          </div>
        )}
      </div>
    </div>
  );
}"""

new_end = """          </div>
        )}
      </div>
      </div>
    </div>
  );
}"""

code = code.replace(old_end, new_end)

with open("src/components/Tasks/TaskCard.tsx", "w") as f:
    f.write(code)
