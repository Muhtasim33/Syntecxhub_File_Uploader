import { apiCall } from './api.js';
import { initAuth } from './auth.js';
import { renderSidebar } from './components/sidebar.js';
import { renderFileGrid } from './components/fileGrid.js';
import { renderUploadModal } from './components/uploadModal.js';
import { renderPreviewModal } from './components/previewModal.js';

let currentView = 'drive';
let folders = [];
let files = [];

const loadData = async () => {
  try {
    const [foldersRes, filesRes, analyticsRes] = await Promise.all([
      apiCall('/folders'),
      apiCall('/files'),
      apiCall('/analytics/storage')
    ]);

    folders = foldersRes?.data || [];
    files = filesRes?.data || [];

    // Update analytics storage widget data
    window.storageStats = analyticsRes?.data || { totalSize: 0 };
  } catch (err) {
    console.error('Failed to fetch user data', err);
  }
};

const render = () => {
  const appContainer = document.getElementById('app');
  if (!appContainer) return;

  appContainer.innerHTML = `
    ${renderSidebar(currentView)}
    <main class="main-content">
      <header class="top-bar">
        <div class="search-bar">
          <span class="material-icons" style="color: var(--text-secondary);">search</span>
          <input type="text" placeholder="Search in Drive">
        </div>
      </header>
      ${renderFileGrid(folders, files)}
    </main>
  `;

  // Attach Event Listeners safely
  const newBtn = document.getElementById('sidebar-new-btn');
  if (newBtn) {
    newBtn.onclick = () => {
      renderUploadModal(null, async () => {
        await loadData();
        render();
      });
    };
  }

  document.querySelectorAll('.file-card').forEach(card => {
    card.onclick = () => {
      const fileId = card.getAttribute('data-id');
      const fileName = card.getAttribute('data-name');
      if (fileId && fileName) {
        renderPreviewModal(fileId, fileName);
      }
    };
  });

  // Render storage widget details if available
  if (window.storageStats) {
    const totalSizeMB = (window.storageStats.totalSize / (1024 * 1024)).toFixed(2);
    const maxMB = 5120; // 5 GB
    const percentage = Math.min(100, (window.storageStats.totalSize / (maxMB * 1024 * 1024)) * 100).toFixed(1);
    
    const storageTextEl = document.getElementById('storage-text');
    const progressBarEl = document.getElementById('storage-progress-bar');
    if (storageTextEl) storageTextEl.innerText = `${totalSizeMB} MB of 5 GB used`;
    if (progressBarEl) progressBarEl.style.width = `${percentage}%`;
  }
};

// Function called after successful authentication
const startApp = async () => {
  await loadData();
  render();
};

// Initialize app with authentication check
document.addEventListener('DOMContentLoaded', () => {
  initAuth(startApp);
});