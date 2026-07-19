import re

with open('src/App.tsx', 'r') as f:
    text = f.read()

target = """  const getNavClasses = ({ isActive }: { isActive: boolean }) => {
    return `flex items-center px-3 py-1.5 text-xs font-semibold tracking-wide transition-all duration-200 rounded-lg ${"""
replacement = """  const getNavClasses = ({ isActive }: { isActive: boolean }) => {
    return `flex items-center px-3 py-1 text-[11px] font-semibold tracking-wide transition-all duration-200 rounded-lg ${"""

text = text.replace(target, replacement)

with open('src/App.tsx', 'w') as f:
    f.write(text)

