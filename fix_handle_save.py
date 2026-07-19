import re

def update_file(filepath):
    with open(filepath, 'r') as f:
        text = f.read()

    text = text.replace(
        "const { token, user } = useAuth();",
        "const { token, user, updateUser } = useAuth();"
    )

    text = text.replace(
        """      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update profile');
      }
      
      setSuccessMsg('Profile updated successfully.');
      setFormData(prev => ({ ...prev, password: '' }));""",
        """      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update profile');
      }
      
      if (user) {
        updateUser({
          ...user,
          firstName: formData.firstName,
          lastName: formData.lastName,
          avatarUrl: formData.avatarUrl,
        });
      }

      setSuccessMsg('Profile updated successfully.');
      setFormData(prev => ({ ...prev, password: '' }));"""
    )

    with open(filepath, 'w') as f:
        f.write(text)

update_file('src/components/Profile/ProfileView.tsx')
