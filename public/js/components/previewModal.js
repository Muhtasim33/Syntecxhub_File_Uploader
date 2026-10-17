export const renderPreviewModal = (fileId, fileName, onClose) => {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-card" style="width: 500px;">
      <div class="modal-header">${fileName}</div>
      <div style="display: flex; gap: 12px; margin-top: 16px;">
        <a href="/api/files/download/${fileId}" target="_blank" class="btn-primary" style="text-decoration: none; text-align: center; flex: 1;">Download</a>
        <button id="share-link-btn" class="btn-secondary" style="flex: 1;">Generate Share Link</button>
        <button id="delete-file-btn" class="btn-secondary" style="color: #d93025; border-color: #d93025; flex: 1;">Delete</button>
      </div>
      <div id="share-result" style="margin-top: 16px; font-size: 13px; color: #5f6368;"></div>
      <div class="modal-actions" style="margin-top: 20px;">
        <button type="button" class="btn-secondary" id="preview-close">Close</button>
      </div>
    </div>
  `;

  document.getElementById('modal-container').appendChild(overlay);
  document.getElementById('preview-close').onclick = () => overlay.remove();

  document.getElementById('share-link-btn').onclick = async () => {
    try {
      const { apiCall } = await import('../api.js');
      const res = await apiCall(`/share/${fileId}`, 'POST', { permission: 'view', expiresInDays: 7 });
      const fullUrl = `${window.location.origin}/api/share/${res.data.shareToken}`;
      document.getElementById('share-result').innerHTML = `Share Link: <a href="${fullUrl}" target="_blank">${fullUrl}</a>`;
    } catch (err) {
      alert('Could not generate share link');
    }
  };

  document.getElementById('delete-file-btn').onclick = async () => {
    if (confirm('Move this file to trash?')) {
      try {
        const { apiCall } = await import('../api.js');
        await apiCall(`/files/${fileId}`, 'DELETE');
        overlay.remove();
        window.location.reload();
      } catch (err) {
        alert('Failed to delete file');
      }
    }
  };
};