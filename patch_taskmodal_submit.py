import re

with open("src/components/Tasks/TaskCard.tsx", "r") as f:
    code = f.read()

submit_code = """  const handleSubmit = (e: any) => {
    e.preventDefault();
    if (formData.status === 'In Progress' && formData.staff_ids.length === 0) {
      alert("Please assign at least one staff member when setting status to In Progress.");
      return;
    }
    onSave(formData);
  };"""

code = code.replace("""  const handleSubmit = (e: any) => {
    e.preventDefault();
    onSave(formData);
  };""", submit_code)

with open("src/components/Tasks/TaskCard.tsx", "w") as f:
    f.write(code)
