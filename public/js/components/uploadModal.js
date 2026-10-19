export const renderUploadModal = (folderId, onUploadSuccess) => {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-card">
      <div class="modal-header">Upload files</div>
      <form id="upload-form">
        <label class="upload-choice-label" for="file-input">Choose files</label>
        <input type="file" id="file-input" accept=".pdf,.doc,.docx,.xml,.ppt,.pptx,image/*,video/*" multiple style="margin-bottom: 16px; width: 100%;">
        <label class="upload-choice-label" for="folder-input">Choose a folder</label>
        <input type="file" id="folder-input" webkitdirectory directory multiple style="margin-bottom: 16px; width: 100%;">
        <p class="upload-help">PDF, Word, XML, PowerPoint, images, and videos. Up to 50 MB per file.</p>
        <p class="upload-progress" id="upload-progress" role="status"></p>
        <div class="modal-actions">
          <button type="button" class="btn-secondary" id="modal-cancel">Cancel</button>
          <button type="submit" class="btn-primary">Upload</button>
        </div>
      </form>
    </div>
  `;

  document.getElementById('modal-container').appendChild(overlay);

  document.getElementById('modal-cancel').onclick = () => overlay.remove();
  
  document.getElementById('upload-form').onsubmit = async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('file-input');
    const folderInput = document.getElementById('folder-input');
    const selectedFiles = [...fileInput.files, ...folderInput.files];
    const progress = document.getElementById('upload-progress');
    const submitButton = document.querySelector('#upload-form button[type="submit"]');
    if (!selectedFiles.length) {
      progress.textContent = 'Choose at least one file or folder.';
      return;
    }
    submitButton.disabled = true;
    try {
      const { apiCall } = await import('../api.js');
      const createdFolders = new Map();
      for (let index = 0; index < selectedFiles.length; index++) {
        const file = selectedFiles[index];
        let destinationFolderId = folderId || null;
        const relativePath = file.webkitRelativePath || '';
        const pathParts = relativePath.split('/').filter(Boolean).slice(0, -1);
        let folderPath = '';
        for (const folderName of pathParts) {
          folderPath = folderPath ? `${folderPath}/${folderName}` : folderName;
          if (!createdFolders.has(folderPath)) {
            const parentPath = folderPath.includes('/') ? folderPath.slice(0, folderPath.lastIndexOf('/')) : '';
            const parentFolderId = parentPath ? createdFolders.get(parentPath) : destinationFolderId;
            const result = await apiCall('/folders', 'POST', { name: folderName, parentFolderId });
            createdFolders.set(folderPath, result.data._id);
          }
          destinationFolderId = createdFolders.get(folderPath);
        }

        progress.textContent = `Uploading ${index + 1} of ${selectedFiles.length}…`;
        const formData = new FormData();
        formData.append('file', file);
        if (destinationFolderId) formData.append('folderId', destinationFolderId);
        await apiCall('/files/upload', 'POST', formData);
      }
      overlay.remove();
      await onUploadSuccess();
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
      submitButton.disabled = false;
    }
  };
};