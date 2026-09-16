const fs = require('fs');
let content = fs.readFileSync('src/components/AdminOnboarding/AdminOnboardingHub.tsx', 'utf8');

// 1. Rewrite handleAddStep
const handleAddStepRegex = /const handleAddStep = async \(\) => \{[\s\S]*?\} catch\(e\) \{\}\s*\};\s*const handleSaveStep = async \(id: number\) => \{[\s\S]*?\} catch\(e\) \{\}\s*\};/;
const handleAddStepReplacement = `const handleAddStep = () => {
    if (!selectedPositionId) return;
    const tempId = -Date.now();
    const newStep: any = {
      id: tempId,
      position_id: selectedPositionId,
      title: 'New Onboarding Step',
      description: '',
      media_url: '',
      requires_expiry: 0,
      expiry_years: 1,
      upload_required: 1,
      is_mandatory: 1
    };
    setSteps(prev => [...prev, newStep]);
    setIsEditing(tempId);
    setEditForm(newStep);
  };

  const handleSaveStep = async (id: number) => {
    try {
      if (id < 0) {
        // It's a new step, POST to create it
        const res = await fetch('/api/admin/onboarding-steps', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: \`Bearer \${token}\`
          },
          body: JSON.stringify(editForm)
        });
        const createdStep = await res.json();
        setSteps(prev => prev.map(s => s.id === id ? createdStep : s));
      } else {
        // Existing step, PUT to update
        await fetch(\`/api/admin/onboarding-steps/\${id}\`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: \`Bearer \${token}\`
          },
          body: JSON.stringify(editForm)
        });
        setSteps(prev => prev.map(s => s.id === id ? { ...s, ...editForm } as any : s));
      }
      setIsEditing(null);
    } catch(e) {}
  };

  const handleCancelEdit = (id: number) => {
    if (id < 0) {
      setSteps(prev => prev.filter(s => s.id !== id));
    }
    setIsEditing(null);
  };`;

content = content.replace(handleAddStepRegex, handleAddStepReplacement);

// 2. Rewrite the Cancel button onClick
const cancelRegex = /onClick=\{\(\) => setIsEditing\(null\)\}/;
const cancelReplacement = `onClick={() => handleCancelEdit(step.id)}`;
content = content.replace(cancelRegex, cancelReplacement);

fs.writeFileSync('src/components/AdminOnboarding/AdminOnboardingHub.tsx', content);
