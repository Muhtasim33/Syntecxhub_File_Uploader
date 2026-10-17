export const renderUploadModal = (onClose, onUploadSuccess) => {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-card">
      <div class="modal-header">Upload File</div>
      <form id="upload-form">
        <input type="file" id="file-input" required style="margin-bottom: 16px; width: 100%;">
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
    if (fileInput.files.length === 0) return;

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    try {
      const { apiCall } = await import('../api.js');
      await apiCall('/files/upload', 'POST', formData, true);
      overlay.remove();
      onUploadSuccess();
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
    }
  };
};