const navigation = [
  ['home', 'Home / Suggested', 'home'],
  ['drive', 'My Drive', 'hard_drive'],
  ['shared', 'Shared with me', 'people'],
  ['recent', 'Recent', 'schedule'],
  ['starred', 'Starred', 'star'],
  ['spam', 'Spam', 'report'],
  ['trash', 'Trash', 'delete']
];

export const renderSidebar = (currentView) => `
  <aside class="sidebar">
    <div>
      <div class="logo-area">
        <span class="material-icons" style="color: #ea4335; font-size: 28px;">folder</span>
        <span>DropLab</span>
      </div>
      <div class="new-btn-container">
        <button class="drive-btn" id="sidebar-new-btn" type="button">
          <span class="material-icons" style="color: #1fa463;">add</span> Upload files
        </button>
      </div>
      <ul class="nav-links">
        ${navigation.map(([view, label, icon]) => `
          <li class="nav-item ${currentView === view ? 'active' : ''}" data-view="${view}" tabindex="0" role="button">
            <span class="material-icons">${icon}</span> ${label}
          </li>
        `).join('')}
      </ul>
    </div>
    <div>
      <div class="storage-widget">
        <div class="storage-heading">Storage</div>
        <div id="storage-text">Loading storage...</div>
        <div class="storage-bar">
          <div class="storage-progress" id="storage-progress-bar"></div>
        </div>
        <div class="largest-files" id="largest-files"></div>
      </div>
      <button class="sidebar-logout" id="logout-btn" type="button">Sign out</button>
    </div>
  </aside>
`;
