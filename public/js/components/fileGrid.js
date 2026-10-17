export const renderFileGrid = (folders, files) => {
  return `
    <div class="content-body">
      <div class="section-title">Folders</div>
      <div class="grid-container" id="folders-grid">
        ${folders.length === 0 ? '<p style="color: #5f6368; font-size: 14px;">No folders found.</p>' : 
          folders.map(folder => `
            <div class="folder-card" data-id="${folder._id}">
              <span class="material-icons" style="color: #5f6368;">folder</span>
              <span>${folder.name}</span>
            </div>
          `).join('')}
      </div>

      <div class="section-title" style="margin-top: 32px;">Files</div>
      <div class="grid-container" id="files-grid">
        ${files.length === 0 ? '<p style="color: #5f6368; font-size: 14px;">No files uploaded yet.</p>' : 
          files.map(file => `
            <div class="file-card" data-id="${file._id}" data-name="${file.filename}" data-mimetype="${file.mimeType}">
              <span class="material-icons" style="color: #1a73e8;">insert_drive_file</span>
              <span>${file.filename}</span>
            </div>
          `).join('')}
      </div>
    </div>
  `;
};