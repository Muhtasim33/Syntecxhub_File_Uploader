import { apiCall } from './api.js';
import { initAuth } from './auth.js';
import { renderSidebar } from './components/sidebar.js';
import { renderFileGrid } from './components/fileGrid.js';
import { renderUploadModal } from './components/uploadModal.js';
import { renderPreviewModal } from './components/previewModal.js';

let currentView = 'home';
let folderStack = [];
let sharedFolderStack = [];
let sharedFolderShareId = null;
let activeSharedToken = null;
let activeSharedFolder = null;
let folders = [];
let files = [];
let sharedItems = [];
let searchTerm = '';
let searchTimer;
let fileMenuDismissHandler;
let fileMenuEscapeHandler;

const loadData = async () => {
  const view = currentView;
  const folderView = view === 'shared-folder' ? 'all' : view;
  const folderParams = new URLSearchParams({ view: folderView });
  if (view === 'drive' && folderStack.length) {
    folderParams.set('parentFolderId', folderStack[folderStack.length - 1]._id);
  }
  if (searchTerm) folderParams.set('search', searchTerm);

  if (view === 'shared-folder') {
    const folderId = sharedFolderStack.length
      ? sharedFolderStack[sharedFolderStack.length - 1]._id
      : activeSharedFolder?._id;
    const result = await apiCall(
      `/share/${encodeURIComponent(sharedFolderShareId)}/folder${folderId ? `?folderId=${encodeURIComponent(folderId)}` : ''}`
    );
    folders = result.data?.folders || [];
    files = result.data?.files || [];
    activeSharedFolder = result.data?.currentFolder || activeSharedFolder;
    sharedItems = [];
    return;
  }

  const fileParams = new URLSearchParams();
  if (['home', 'drive', 'recent', 'starred', 'trash'].includes(view)) {
    fileParams.set('view', view);
  }
  if (view === 'drive' && folderStack.length) {
    fileParams.set('folderId', folderStack[folderStack.length - 1]._id);
  }
  if (searchTerm) fileParams.set('search', searchTerm);

  const shouldLoadOwnedFiles = ['home', 'drive', 'recent', 'starred', 'trash'].includes(view);
  const requests = [
    apiCall(`/folders?${folderParams.toString()}`),
    shouldLoadOwnedFiles ? apiCall(`/files?${fileParams.toString()}`) : Promise.resolve({ data: [] }),
    apiCall('/analytics/storage')
  ];

  if (view === 'shared' || view === 'home') {
    requests.push(apiCall('/share/shared-with-me'));
  } else if (view === 'spam') {
    requests.push(apiCall('/share/shared-with-me?spam=true'));
  }

  const [foldersRes, filesRes, analyticsRes, sharedRes] = await Promise.all(requests);
  folders = foldersRes?.data || [];
  files = filesRes?.data || [];
  window.storageStats = analyticsRes?.data || { totalSize: 0, storageLimit: 0, largestFiles: [] };
  sharedItems = sharedRes?.data || [];
};

const openCreateFolder = () => {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="create-folder-title">
      <h2 class="modal-header" id="create-folder-title">New folder</h2>
      <form id="create-folder-form">
        <label class="folder-name-label" for="new-folder-name">Folder name</label>
        <input id="new-folder-name" name="name" maxlength="255" required autofocus>
        <p class="folder-form-error" id="folder-form-error" role="alert"></p>
        <div class="modal-actions">
          <button type="button" class="btn-secondary" id="cancel-create-folder">Cancel</button>
          <button type="submit" class="btn-primary" id="submit-create-folder">Create</button>
        </div>
      </form>
    </section>
  `;
  document.getElementById('modal-container').appendChild(overlay);
  const nameInput = overlay.querySelector('#new-folder-name');
  nameInput.focus();
  overlay.querySelector('#cancel-create-folder').onclick = () => overlay.remove();
  overlay.querySelector('#create-folder-form').onsubmit = async event => {
    event.preventDefault();
    const name = nameInput.value.trim();
    if (!name) {
      nameInput.setCustomValidity('Enter a folder name.');
      nameInput.reportValidity();
      return;
    }
    nameInput.setCustomValidity('');
    const submit = overlay.querySelector('#submit-create-folder');
    const errorMessage = overlay.querySelector('#folder-form-error');
    const parentFolderId = folderStack.length ? folderStack[folderStack.length - 1]._id : null;
    submit.disabled = true;
    errorMessage.textContent = '';
    try {
      await apiCall('/folders', 'POST', { name, parentFolderId });
      overlay.remove();
      await loadData();
      render();
    } catch (error) {
      errorMessage.textContent = error.message || 'Could not create folder.';
      submit.disabled = false;
    }
  };
};

const openRenameFile = (fileId, fileName) => {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="rename-file-title">
      <h2 class="modal-header" id="rename-file-title">Rename file</h2>
      <form id="rename-file-form">
        <label class="folder-name-label" for="rename-file-name">File name</label>
        <input id="rename-file-name" name="name" maxlength="255" required>
        <p class="folder-form-error" id="rename-file-error" role="alert"></p>
        <div class="modal-actions">
          <button type="button" class="btn-secondary" id="cancel-rename-file">Cancel</button>
          <button type="submit" class="btn-primary" id="submit-rename-file">Save</button>
        </div>
      </form>
    </section>
  `;
  document.getElementById('modal-container').appendChild(overlay);
  const nameInput = overlay.querySelector('#rename-file-name');
  nameInput.value = fileName;
  nameInput.focus();
  nameInput.select();
  overlay.querySelector('#cancel-rename-file').onclick = () => overlay.remove();
  overlay.querySelector('#rename-file-form').onsubmit = async event => {
    event.preventDefault();
    const name = nameInput.value.trim();
    if (!name) {
      nameInput.setCustomValidity('Enter a file name.');
      nameInput.reportValidity();
      return;
    }
    nameInput.setCustomValidity('');
    const submit = overlay.querySelector('#submit-rename-file');
    const errorMessage = overlay.querySelector('#rename-file-error');
    submit.disabled = true;
    errorMessage.textContent = '';
    try {
      await apiCall(`/files/${encodeURIComponent(fileId)}`, 'PATCH', { name });
    } catch (error) {
      errorMessage.textContent = error.message || 'Could not rename file.';
      submit.disabled = false;
      return;
    }

    overlay.remove();
    try {
      await loadData();
      render();
    } catch (error) {
      alert(`File renamed, but the view could not refresh: ${error.message}`);
    }
  };
};

const render = () => {
  if (fileMenuDismissHandler) {
    document.removeEventListener('click', fileMenuDismissHandler);
    document.removeEventListener('keydown', fileMenuEscapeHandler);
  }
  const appContainer = document.getElementById('app');
  if (!appContainer) return;

  const folderPath = currentView === 'shared-folder' ? sharedFolderStack : folderStack;
  appContainer.innerHTML = `
    ${renderSidebar(currentView)}
    <main class="main-content">
      <header class="top-bar">
        <label class="search-bar" for="drive-search">
          <span class="material-icons" style="color: var(--text-secondary);">search</span>
          <input id="drive-search" type="search" value="${searchTerm.replace(/"/g, '&quot;')}" placeholder="Search files and folders" autocomplete="off">
        </label>
      </header>
      ${renderFileGrid(folders, files, currentView, {
        sharedItems,
        folderStack: folderPath,
        sharedFolderName: activeSharedFolder?.name
      })}
    </main>
  `;

  document.querySelectorAll('.nav-item').forEach(item => {
    const navigate = async () => {
      const view = item.getAttribute('data-view');
      if (!view || view === currentView) return;
      currentView = view;
      folderStack = [];
      sharedFolderStack = [];
      sharedFolderShareId = null;
      activeSharedFolder = null;
      activeSharedToken = null;
      searchTerm = '';
      try {
        await loadData();
        render();
      } catch (error) {
        alert(`Could not load ${view}: ${error.message}`);
      }
    };
    item.onclick = navigate;
    item.onkeydown = event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        navigate();
      }
    };
  });

  const upload = () => renderUploadModal(
    currentView === 'drive' && folderStack.length ? folderStack[folderStack.length - 1]._id : null,
    async () => {
      await loadData();
      render();
    }
  );
  document.getElementById('sidebar-new-btn').onclick = upload;
  document.getElementById('upload-current-folder-btn')?.addEventListener('click', upload);
  document.getElementById('create-folder-btn')?.addEventListener('click', openCreateFolder);

  document.getElementById('logout-btn').onclick = () => {
    localStorage.removeItem('token');
    window.location.reload();
  };

  document.querySelectorAll('[data-folder-depth]').forEach(button => {
    button.onclick = async () => {
      const depth = Number(button.dataset.folderDepth);
      if (currentView === 'shared-folder') {
        sharedFolderStack = sharedFolderStack.slice(0, depth);
      } else {
        folderStack = folderStack.slice(0, depth);
      }
      try {
        await loadData();
        render();
      } catch (error) {
        alert(`Could not open folder: ${error.message}`);
      }
    };
  });

  document.querySelectorAll('.folder-card, .shared-folder-card').forEach(card => {
    card.onclick = async () => {
      const folderId = card.dataset.folderId;
      const name = card.dataset.folderName;
      if (currentView === 'trash') return;
      if (currentView === 'shared' || currentView === 'home') {
        const share = sharedItems.find(item => item.itemType === 'folder' && item.folderId?._id === folderId);
        if (!share) return;
        currentView = 'shared-folder';
        sharedFolderShareId = share._id;
        activeSharedFolder = share.folderId;
        activeSharedToken = share.shareToken;
        sharedFolderStack = [];
      } else if (currentView === 'shared-folder') {
        sharedFolderStack.push({ _id: folderId, name });
      } else {
        try {
          await apiCall(`/folders/${encodeURIComponent(folderId)}/activity`, 'PATCH');
        } catch (error) {
          alert(`Could not open folder: ${error.message}`);
          return;
        }
        if (currentView !== 'drive') {
          currentView = 'drive';
          folderStack = [];
        }
        folderStack.push({ _id: folderId, name });
      }
      try {
        await loadData();
        render();
      } catch (error) {
        alert(`Could not open folder: ${error.message}`);
      }
    };
  });

  document.querySelectorAll('.file-card').forEach(card => {
    card.onclick = () => {
      if (currentView === 'shared-folder') {
        const fileUrl = `/api/share/folder/${encodeURIComponent(activeSharedToken)}/files/${encodeURIComponent(card.dataset.id)}`;
        window.open(fileUrl, '_blank', 'noopener');
        return;
      }
      renderPreviewModal(card.dataset.id, card.dataset.name, card.dataset.mimetype, async action => {
        if (action === 'opened') {
          await apiCall(`/files/${encodeURIComponent(card.dataset.id)}/activity`, 'PATCH');
        } else {
          await loadData();
          render();
        }
      });
    };
  });

  document.querySelectorAll('.file-menu-toggle').forEach(toggle => {
    toggle.onclick = event => {
      event.stopPropagation();
      const options = toggle.nextElementSibling;
      const shouldOpen = options.hidden;
      document.querySelectorAll('.file-menu-options').forEach(menu => {
        menu.hidden = true;
        menu.previousElementSibling.setAttribute('aria-expanded', 'false');
      });
      options.hidden = !shouldOpen;
      toggle.setAttribute('aria-expanded', String(shouldOpen));
    };
  });

  fileMenuDismissHandler = event => {
    if (event.target.closest('.file-menu')) return;
    document.querySelectorAll('.file-menu-options').forEach(menu => {
      menu.hidden = true;
      menu.previousElementSibling.setAttribute('aria-expanded', 'false');
    });
  };
  fileMenuEscapeHandler = event => {
    if (event.key !== 'Escape') return;
    document.querySelectorAll('.file-menu-options').forEach(menu => {
      menu.hidden = true;
      menu.previousElementSibling.setAttribute('aria-expanded', 'false');
    });
  };
  document.addEventListener('click', fileMenuDismissHandler);
  document.addEventListener('keydown', fileMenuEscapeHandler);

  document.querySelectorAll('[data-file-action]').forEach(button => {
    button.onclick = async event => {
      event.stopPropagation();
      const card = button.closest('.file-card');
      const fileId = card.dataset.id;
      const fileName = card.dataset.name;
      const mimeType = card.dataset.mimetype;
      button.closest('.file-menu-options').hidden = true;
      button.closest('.file-menu-options').previousElementSibling.setAttribute('aria-expanded', 'false');

      switch (button.dataset.fileAction) {
        case 'rename':
          openRenameFile(fileId, fileName);
          break;
        case 'preview':
          renderPreviewModal(fileId, fileName, mimeType, async action => {
            if (action === 'opened') {
              await apiCall(`/files/${encodeURIComponent(fileId)}/activity`, 'PATCH');
            } else {
              await loadData();
              render();
            }
          });
          break;
        case 'download': {
          try {
            const { downloadFile } = await import('./api.js');
            await downloadFile(`/files/download/${encodeURIComponent(fileId)}`, fileName);
          } catch (error) {
            alert(`Could not download file: ${error.message}`);
          }
          break;
        }
        case 'trash':
          if (!confirm('Move this file to Trash?')) return;
          try {
            await apiCall(`/files/${encodeURIComponent(fileId)}`, 'DELETE');
          } catch (error) {
            alert(`Could not move file to Trash: ${error.message}`);
            return;
          }
          try {
            await loadData();
            render();
          } catch (error) {
            alert(`File moved to Trash, but the view could not refresh: ${error.message}`);
          }
          break;
        default:
          break;
      }
    };
  });

  document.querySelectorAll('.item-star-btn').forEach(button => {
    button.onclick = async event => {
      event.stopPropagation();
      try {
        const endpoint = button.dataset.type === 'folder' ? '/folders' : '/files';
        await apiCall(`${endpoint}/${encodeURIComponent(button.dataset.id)}/star`, 'PATCH');
        await loadData();
        render();
      } catch (error) {
        alert(`Could not update starred item: ${error.message}`);
      }
    };
  });

  document.querySelectorAll('.share-folder-btn').forEach(button => {
    button.onclick = async event => {
      event.stopPropagation();
      const email = window.prompt('Enter the email address of the account to share this folder with:');
      if (!email?.trim()) return;
      try {
        await apiCall(`/share/${encodeURIComponent(button.dataset.id)}`, 'POST', {
          itemType: 'folder',
          recipientEmail: email.trim()
        });
        alert('Folder shared.');
      } catch (error) {
        alert(`Could not share folder: ${error.message}`);
      }
    };
  });

  document.querySelectorAll('.item-trash-btn').forEach(button => {
    button.onclick = async event => {
      event.stopPropagation();
      if (!confirm('Move this item and its contents to Trash?')) return;
      try {
        const endpoint = button.dataset.type === 'folder' ? '/folders' : '/files';
        await apiCall(`${endpoint}/${encodeURIComponent(button.dataset.id)}`, 'DELETE');
        await loadData();
        render();
      } catch (error) {
        alert(`Could not move item to Trash: ${error.message}`);
      }
    };
  });

  document.querySelectorAll('.restore-file-btn, .restore-folder-btn').forEach(button => {
    button.onclick = async event => {
      event.stopPropagation();
      try {
        const isFolder = button.classList.contains('restore-folder-btn');
        await apiCall(`/${isFolder ? 'folders' : 'files'}/${encodeURIComponent(button.dataset.id)}/restore`, 'PATCH');
        await loadData();
        render();
      } catch (error) {
        alert(`Could not restore item: ${error.message}`);
      }
    };
  });

  document.querySelectorAll('.permanently-delete-btn').forEach(button => {
    button.onclick = async event => {
      event.stopPropagation();
      if (!confirm('Permanently delete this file? This cannot be undone.')) return;
      try {
        await apiCall(`/files/${encodeURIComponent(button.dataset.id)}/permanent`, 'DELETE');
        await loadData();
        render();
      } catch (error) {
        alert(`Could not permanently delete file: ${error.message}`);
      }
    };
  });

  document.querySelectorAll('.spam-btn, .unspam-btn').forEach(button => {
    button.onclick = async event => {
      event.stopPropagation();
      try {
        await apiCall(`/share/${encodeURIComponent(button.dataset.id)}/spam`, 'PATCH');
        await loadData();
        render();
      } catch (error) {
        alert(`Could not update spam status: ${error.message}`);
      }
    };
  });

  const search = document.getElementById('drive-search');
  search.oninput = () => {
    searchTerm = search.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
      try {
        await loadData();
        render();
        const refreshedSearch = document.getElementById('drive-search');
        refreshedSearch.focus();
        refreshedSearch.setSelectionRange(searchTerm.length, searchTerm.length);
      } catch (error) {
        alert(`Search failed: ${error.message}`);
      }
    }, 250);
  };

  const storageStats = window.storageStats;
  if (storageStats) {
    const used = storageStats.totalSize || 0;
    const limit = storageStats.storageLimit || 0;
    const percentage = limit ? Math.min(100, used / limit * 100) : 0;
    const storageText = document.getElementById('storage-text');
    const progressBar = document.getElementById('storage-progress-bar');
    const largestFiles = document.getElementById('largest-files');
    storageText.textContent = `${formatSize(used)} of ${formatSize(limit)} used`;
    progressBar.style.width = `${percentage.toFixed(1)}%`;
    largestFiles.innerHTML = (storageStats.largestFiles || []).map(file => `
      <div class="largest-file-row" title="${escapeHtml(file.originalName)}">
        <span>${escapeHtml(file.originalName)}${file.isTrashed ? ' (Trash)' : ''}</span><strong>${formatSize(file.size)}</strong>
      </div>`).join('');
  }
};

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));

const formatSize = bytes => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / (1024 ** index)).toFixed(index ? 1 : 0)} ${units[index]}`;
};

const startApp = async () => {
  await loadData();
  render();
};

document.addEventListener('DOMContentLoaded', () => {
  initAuth(startApp);
});
