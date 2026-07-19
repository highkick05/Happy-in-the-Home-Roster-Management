import re

with open('src/index.css', 'r') as f:
    text = f.read()

css_to_add = """
.rbc-event, .rbc-event-content {
  font-size: 10px !important;
  font-weight: 600 !important;
  letter-spacing: 0.025em !important;
}

.rbc-event-label {
  font-size: 9px !important;
  font-weight: 500 !important;
  opacity: 0.9;
}

.rbc-time-slot {
  font-size: 11px !important;
  font-weight: 500 !important;
  color: #a1a1aa !important;
}

.rbc-time-header-cell .rbc-header {
  font-size: 11px !important;
  font-weight: 600 !important;
  padding: 4px 0 !important;
}
"""

if '.rbc-event-label {' not in text:
    text = text + css_to_add

with open('src/index.css', 'w') as f:
    f.write(text)
