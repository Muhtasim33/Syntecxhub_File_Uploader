export const renderSidebar = (currentView, onNavigate, onOpenUpload) => {
  return `
    <aside class="sidebar">
      <div>
        <div class="logo-area">
          <span class="material-icons" style="color: #ea4335; font-size: 28px;">folder</span>
          <span>Drive Clone</span>
        </div>
        <div class="new-btn-container">
          <button class="drive-btn" id="sidebar-new-btn">
            <span class="material-icons" style="color: #1fa463;">add</span> New Upload
          </button>
        </div>
        <ul class="nav-links">
          <li class="nav-item ${currentView === 'drive' ? 'active' : ''}" data-view="drive">
            <span class="material-icons">hard_drive</span> My Drive
          </li>
          <li class="nav-item ${currentView === 'shared' ? 'active' : ''}" data-view="shared">
            <span class="material-icons">schedule</span> Recent / Share
          </li>
          <li class="nav-item ${currentView === 'trash' ? 'active' : ''}" data-view="trash">
            <span class="material-icons">delete</span> Trash
          </li>
        </ul>
      </div>
      <div class="storage-widget">
        <div style="font-weight: 500; margin-bottom: 4px;">Storage</div>
        <div id="storage-text">Loading storage...</div>
        <div class="storage-bar">
          <div class="storage-progress" id="storage-progress-bar"></div>
        </div>
      </div>
    </aside>
  `;
};