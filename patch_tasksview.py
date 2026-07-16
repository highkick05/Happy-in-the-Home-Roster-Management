import re

with open("src/components/Tasks/TasksView.tsx", "r") as f:
    code = f.read()

# Modify onDragEnd
drag_end_pattern = re.compile(r'const onDragEnd = async \(result: any\) => \{.*?\n  \};\n', re.DOTALL)

new_drag_end = """const onDragEnd = async (result: any) => {
    if (!result.destination) return;
    const { source, destination, draggableId, type } = result;

    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    if (type === 'category') {
      const newCategories = Array.from(categories);
      const [removed] = newCategories.splice(source.index, 1);
      newCategories.splice(destination.index, 0, removed);
      setCategories(newCategories);

      try {
        await fetch('/api/tasks/categories/order', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ categoryIds: newCategories.map((c: any) => c.id) })
        });
        fetchData();
      } catch (err) {
        console.error(err);
        fetchData();
      }
      return;
    }

    const newCategoryId = destination.droppableId === 'null' ? null : parseInt(destination.droppableId, 10);
    const taskId = parseInt(draggableId, 10);

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, category_id: newCategoryId } : t));

    try {
      await fetch(`/api/tasks/${taskId}/category`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ category_id: newCategoryId })
      });
      fetchData();
    } catch (err) {
      console.error(err);
      fetchData(); // Revert on failure
    }
  };
"""

code = drag_end_pattern.sub(new_drag_end, code, count=1)

with open("src/components/Tasks/TasksView.tsx", "w") as f:
    f.write(code)
