const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[character]));

const formatSize = bytes => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / (1024 ** index)).toFixed(index ? 1 : 0)} ${units[index]}`;
};

const fileIcon = mimeType => {
  if (mimeType?.startsWith('image/')) return 'image';
  if (mimeType?.startsWith('video/')) return 'movie';
  if (mimeType?.includes('pdf')) return 'picture_as_pdf';
  return 'insert_drive_file';
};

const renderFolders = (folders, view, readOnly = false) => folders.length
  ? folders.map(folder => `
      <article class="folder-card item-card" data-folder-id="${escapeHtml(folder._id)}" data-folder-name="${escapeHtml(folder.name)}">
        <span class="material-icons item-icon">folder</span>
        <span class="item-name">${escapeHtml(folder.name)}</span>
        ${view === 'trash'
          ? `<button class="item-action restore-folder-btn" type="button" data-id="${escapeHtml(folder._id)}">Restore</button>`
          : readOnly ? '' : `<button class="item-action item-star-btn" type="button" data-type="folder" data-id="${escapeHtml(folder._id)}" aria-label="Toggle starred">${folder.isStarred ? '★' : '☆'}</button>
             <button class="item-action share-folder-btn" type="button" data-id="${escapeHtml(folder._id)}">Share</button>
             <button class="item-action item-trash-btn" type="button" data-type="folder" data-id="${escapeHtml(folder._id)}" aria-label="Move ${escapeHtml(folder.name)} to trash">⋯</button>`}
      </article>
    `).join('')
  : '<p class="empty-state">No folders here yet.</p>';

const renderFiles = (files, view, readOnly = false) => files.length
  ? files.map(file => `
      <article class="file-card item-card" data-id="${escapeHtml(file._id)}" data-name="${escapeHtml(file.originalName)}" data-mimetype="${escapeHtml(file.mimeType)}">
        <span class="material-icons item-icon">${fileIcon(file.mimeType)}</span>
        <span class="item-details">
          <span class="item-name">${escapeHtml(file.originalName)}</span>
          <span class="item-meta">${formatSize(file.size)}</span>
        </span>
        ${view === 'trash'
          ? `<button class="item-action restore-file-btn" type="button" data-id="${escapeHtml(file._id)}">Restore</button>
             <button class="item-action permanently-delete-btn" type="button" data-id="${escapeHtml(file._id)}" aria-label="Delete permanently">×</button>`
          : readOnly ? '' : `<button class="item-action item-star-btn" type="button" data-type="file" data-id="${escapeHtml(file._id)}" aria-label="Toggle starred">${file.isStarred ? '★' : '☆'}</button>
             <button class="item-action item-trash-btn" type="button" data-type="file" data-id="${escapeHtml(file._id)}" aria-label="Move to trash">⋯</button>`}
      </article>
    `).join('')
  : `<p class="empty-state">${view === 'trash' ? 'Trash is empty.' : 'No files to show.'}</p>`;

const renderSharedItems = (items, isSpam) => items.length
  ? items.map(share => {
      const item = share.itemType === 'folder' ? share.folderId : share.fileId;
      const name = share.itemType === 'folder' ? item?.name : item?.originalName;
      const sender = share.sharedBy?.email || share.sharedBy?.name || 'Another user';
      const shareLink = share.itemType === 'file' ? `/api/share/${encodeURIComponent(share.shareToken)}` : '';
      return `
        <article class="shared-card item-card ${share.itemType === 'folder' ? 'shared-folder-card' : ''}" ${shareLink ? `data-shared-url="${shareLink}"` : ''} ${share.itemType === 'folder' ? `data-folder-id="${escapeHtml(item?._id)}" data-folder-name="${escapeHtml(name || '')}"` : ''} data-share-id="${escapeHtml(share._id)}">
          <span class="material-icons item-icon">${share.itemType === 'folder' ? 'folder_shared' : fileIcon(item?.mimeType)}</span>
          <span class="item-details">
            <span class="item-name">${escapeHtml(name || 'Unavailable item')}</span>
            <span class="item-meta">Shared by ${escapeHtml(sender)}</span>
          </span>
          ${isSpam
            ? `<button class="item-action unspam-btn" type="button" data-id="${escapeHtml(share._id)}">Not spam</button>`
            : `<button class="item-action spam-btn" type="button" data-id="${escapeHtml(share._id)}">Report spam</button>
               ${shareLink ? `<a class="item-action open-share-link" href="${shareLink}" target="_blank" rel="noopener">Open</a>` : ''}`}
        </article>
      `;
    }).join('')
  : `<p class="empty-state">${isSpam ? 'No spam items.' : 'Nothing has been shared with you yet.'}</p>`;

export const renderFileGrid = (folders, files, view, options = {}) => {
  const viewNames = {
    home: 'Suggested for you',
    drive: 'My Drive',
    shared: 'Shared with me',
    recent: 'Recent',
    starred: 'Starred',
    spam: 'Spam',
    trash: 'Trash',
    'shared-folder': options.sharedFolderName || 'Shared folder'
  };
  const isShared = view === 'shared' || view === 'spam';
  const isTrash = view === 'trash';
  const isDrive = view === 'drive';
  const isSharedFolder = view === 'shared-folder';
  const readOnly = isSharedFolder;
  const foldersMarkup = isShared ? '' : `
    <section class="drive-section">
      <h2 class="section-title">${isTrash ? 'Folders in trash' : 'Folders'}</h2>
      <div class="grid-container">${renderFolders(folders, view, readOnly)}</div>
    </section>`;
  const filesMarkup = isShared ? '' : `
    <section class="drive-section">
      <h2 class="section-title">${view === 'home' ? 'Files you may need' : isTrash ? 'Files in trash' : 'Files'}</h2>
      <div class="grid-container">${renderFiles(files, view, readOnly)}</div>
    </section>`;
  const sharedMarkup = isShared || view === 'home' ? `
    <section class="drive-section">
      <div class="section-heading">
        <h2 class="section-title">${view === 'spam' ? 'Spam' : view === 'home' ? 'Recently shared with you' : 'Shared with me'}</h2>
      </div>
      <div class="grid-container">${renderSharedItems(view === 'home' ? (options.sharedItems || []).slice(0, 4) : options.sharedItems || [], view === 'spam')}</div>
    </section>` : '';
  const breadcrumb = isDrive || isSharedFolder ? `
    <div class="drive-breadcrumb">
      <button type="button" class="breadcrumb-root" data-folder-depth="0">${isSharedFolder ? 'Shared folder' : 'My Drive'}</button>
      ${(options.folderStack || []).map((folder, index) => `
        <span aria-hidden="true">›</span>
        <button type="button" data-folder-depth="${index + 1}">${escapeHtml(folder.name)}</button>
      `).join('')}
    </div>` : '';

  return `
    <div class="content-body">
      ${breadcrumb}
      <div class="view-heading">
        <div>
          <h1>${viewNames[view] || 'My Drive'}</h1>
        </div>
        ${isDrive ? `
          <div class="drive-heading-actions">
            <button class="btn-secondary" id="create-folder-btn" type="button">New folder</button>
            <button class="btn-primary" id="upload-current-folder-btn" type="button">Upload files</button>
          </div>
        ` : ''}
      </div>
      ${foldersMarkup}
      ${filesMarkup}
      ${sharedMarkup}
    </div>
  `;
};
