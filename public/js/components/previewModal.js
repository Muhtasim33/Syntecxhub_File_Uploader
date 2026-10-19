export const renderPreviewModal = (fileId, fileName, onActivity) => {
  const safeName = String(fileName).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-card" style="width: 500px;">
      <div class="modal-header">${safeName}</div>
      <div style="display: flex; gap: 12px; margin-top: 16px;">
        <button id="download-file-btn" class="btn-primary" type="button" style="flex: 1;">Download</button>
        <button id="star-file-btn" class="btn-secondary" type="button" style="flex: 1;">Star</button>
        <button id="delete-file-btn" class="btn-secondary" style="color: #d93025; border-color: #d93025; flex: 1;">Delete</button>
      </div>
      <div class="share-invite">
        <label for="share-recipient-email">Share with an account</label>
        <div><input id="share-recipient-email" type="email" placeholder="person@example.com"><button id="share-with-user-btn" class="btn-secondary" type="button">Share</button></div>
      </div>
      <button id="share-link-btn" class="btn-secondary share-link-button" type="button">Create a link</button>
      <div id="share-result" style="margin-top: 16px; font-size: 13px; color: #5f6368;"></div>
      <div class="modal-actions" style="margin-top: 20px;">
        <button type="button" class="btn-secondary" id="preview-close">Close</button>
      </div>
    </div>
  `;

  document.getElementById('modal-container').appendChild(overlay);
  document.getElementById('preview-close').onclick = () => overlay.remove();
  Promise.resolve(onActivity?.('opened')).catch(error => {
    console.error('Could not record file activity:', error);
  });

  document.getElementById('download-file-btn').onclick = async () => {
    try {
      const { downloadFile } = await import('../api.js');
      await downloadFile(`/files/download/${encodeURIComponent(fileId)}`, fileName);
    } catch (error) {
      document.getElementById('share-result').textContent = error.message || 'Could not download this file.';
    }
  };

  const share = async (recipientEmail = '') => {
    try {
      const { apiCall } = await import('../api.js');
      const res = await apiCall(`/share/${encodeURIComponent(fileId)}`, 'POST', {
        permission: 'view',
        expiresInDays: 30,
        recipientEmail: recipientEmail || undefined
      });
      const fullUrl = `${window.location.origin}/api/share/${res.data.shareToken}`;
      const result = document.getElementById('share-result');
      result.textContent = recipientEmail ? `Shared with ${recipientEmail}. Link: ` : 'Share link: ';
      const link = document.createElement('a');
      link.href = fullUrl;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = fullUrl;
      result.appendChild(link);

      const copyButton = document.createElement('button');
      copyButton.className = 'btn-secondary copy-share-link';
      copyButton.type = 'button';
      copyButton.textContent = 'Copy link';
      copyButton.onclick = async () => {
        try {
          await navigator.clipboard.writeText(fullUrl);
        } catch (error) {
          const temporaryInput = document.createElement('textarea');
          temporaryInput.value = fullUrl;
          temporaryInput.setAttribute('readonly', '');
          temporaryInput.style.position = 'fixed';
          temporaryInput.style.opacity = '0';
          document.body.appendChild(temporaryInput);
          temporaryInput.select();
          const copied = document.execCommand('copy');
          temporaryInput.remove();
          if (!copied) {
            throw new Error('Clipboard access was denied. Select and copy the link above.');
          }
        }
        copyButton.textContent = 'Copied';
      };
      result.append(' ', copyButton);
    } catch (error) {
      document.getElementById('share-result').textContent = error.message || 'Could not share this file.';
    }
  };

  document.getElementById('share-link-btn').onclick = () => share();
  document.getElementById('share-with-user-btn').onclick = () => {
    const emailInput = document.getElementById('share-recipient-email');
    if (!emailInput.reportValidity() || !emailInput.value.trim()) {
      emailInput.focus();
      return;
    }
    share(emailInput.value.trim());
  };

  document.getElementById('star-file-btn').onclick = async () => {
    try {
      const { apiCall } = await import('../api.js');
      const result = await apiCall(`/files/${encodeURIComponent(fileId)}/star`, 'PATCH');
      document.getElementById('star-file-btn').textContent = result.data.isStarred ? 'Starred' : 'Star';
    } catch (error) {
      document.getElementById('share-result').textContent = error.message || 'Could not update starred status.';
    }
  };

  document.getElementById('delete-file-btn').onclick = async () => {
    if (confirm('Move this file to trash?')) {
      try {
        const { apiCall } = await import('../api.js');
        await apiCall(`/files/${fileId}`, 'DELETE');
        overlay.remove();
        await onActivity?.('deleted');
      } catch (err) {
        alert('Failed to delete file');
      }
    }
  };
};