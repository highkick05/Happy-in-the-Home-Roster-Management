const fs = require('fs');
let code = fs.readFileSync('src/context/AuthContext.tsx', 'utf8');

code = code.replace(
  'logout: () => void;',
  'logout: () => void;\n  switchRole: (targetRole: "ADMIN" | "STAFF") => Promise<void>;'
);

const switchRoleImpl = `
  const switchRole = async (targetRole: "ADMIN" | "STAFF") => {
    if (!token) return;
    try {
      const res = await fetch('/api/switch-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: \`Bearer \${token}\`
        },
        body: JSON.stringify({ targetRole })
      });
      if (!res.ok) throw new Error('Failed to switch role');
      const data = await res.json();
      login(data.token, data.user, settings);
    } catch (error) {
      console.error(error);
      alert('Error switching roles');
    }
  };
`;

code = code.replace(
  'const updateSettings = (newSettings: any) => {',
  switchRoleImpl + '\n  const updateSettings = (newSettings: any) => {'
);

code = code.replace(
  '{{ user, settings, token, login, logout, updateSettings, isLoading }}',
  '{{ user, settings, token, login, logout, switchRole, updateSettings, isLoading }}'
);

fs.writeFileSync('src/context/AuthContext.tsx', code);
