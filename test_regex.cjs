const regexStr = (folder_path) => (folder_path || '/').replace(/^\\/+/, '');
console.log("For /Clients:", regexStr("/Clients"));
