// ============================================================
// CASCADE - HTML Templates
// ============================================================

export const TEMPLATES = {
  /**
   * New board template - clean starting state
   */
  newBoard: `
    <div class="board-controls">
      <div class="share-container">
        <button class="btn btn-secondary js-share-btn">
          <span>Share</span>
        </button>
      </div>
    </div>

    <div class="cover">
      <div class="cover-icon js-change-icon" id="change-icon">
        <span class="icon-display"></span>
      </div>
      <div class="cover-settings">
        <button class="btn btn-secondary js-add-cover-btn">
          <span>Add cover</span>
        </button>
        <button class="btn btn-secondary js-add-icon-btn">
          <span>Add Icon</span>
        </button>
      </div>
    </div>

    <div class="board-items" id="boardItems">
      <div class="board-item-row" id="item-row-1" data-row-id="1">
        <div class="floaty left add js-add-block-btn" data-row="1">
          <img src="icons/add.png" alt="add" class="icon">
        </div>
        <div class="item">
          <div class="floaty left edit js-edit-btn" data-row="1">
            <img src="icons/edit.png" alt="edit" class="icon">
          </div>
          <div 
            class="item-element title empty" 
            contenteditable="true"
            data-placeholder="Title"
            data-row="1"
            data-print-mode="board"
            data-content=""
          ></div>
        </div>
      </div>
    </div>

    <div class="add-note-container">
      <button class="btn-add-note js-add-note-btn" id="add-note">
        <img src="icons/add.png" alt="add" class="icon small">
        <span class="tx-secondary">Note</span>
      </button>
    </div>
  `,

  /**
   * Loading state template
   */
  loadingBoard: `
    <div class="cover">
      <div class="cover-icon loading"></div>
      <div class="cover-settings">
        <div class="btn loading" style="width: 80px;"></div>
        <div class="btn loading" style="width: 70px;"></div>
      </div>
    </div>

    <div class="board-items" id="boardItems">
      <div class="board-item-row loading">
        <div class="item">
          <div class="item-element title loading" style="width: 200px; height: 32px;"></div>
        </div>
      </div>
      <div class="board-item-row loading">
        <div class="item">
          <div class="item-element loading" style="width: 100%; height: 20px;"></div>
        </div>
      </div>
      <div class="board-item-row loading">
        <div class="item">
          <div class="item-element loading" style="width: 80%; height: 20px;"></div>
        </div>
      </div>
    </div>

    <div class="add-note-container">
      <div class="btn-add-note loading" style="width: 80px; height: 32px;"></div>
    </div>
  `,

  /**
   * Empty board fallback
   */
  emptyBoard: `
    <div class="empty-state p-8 text-center">
      <p class="tx-secondary">No content yet. Start typing!</p>
    </div>
  `,

  /**
   * Collaborator item in share modal
   */
  collaborator: (email, role = 'can-view') => `
    <div class="collaborator-item" data-email="${email}">
      <div class="collab-avatar">
        <span>${email[0].toUpperCase()}</span>
      </div>
      <span class="collab-email fx-full">${email}</span>
      <select class="collab-role" data-email="${email}">
        <option value="can-view" ${role === 'can-view' ? 'selected' : ''}>View only</option>
        <option value="can-edit" ${role === 'can-edit' ? 'selected' : ''}>Can edit</option>
      </select>
      <button class="btn-icon remove-collab-btn" data-email="${email}" aria-label="Remove collaborator">
        <img src="icons/delete.png" class="icon small" alt="">
      </button>
    </div>
  `,

  /**
   * Board item in sidebar
   */
  boardItem: (id, title, isSelected = false) => `
    <div class="board-item hover ${isSelected ? 'selected' : ''}" data-board-id="${id}">
      <div class="icono gray">
        <img src="icons/dfr_1.png" class="icon" alt="">
      </div>
      <span class="board-title fx-full">${title.slice(0, 15)}</span>
      <button class="btn-icon delete-board-btn" data-board-id="${id}" aria-label="Delete board">
        <img src="icons/delete.png" class="icon" alt="">
      </button>
    </div>
  `,

  /**
   * Text block row
   */
  textRow: (id, placeholder = 'Type something...') => `
    <div class="board-item-row" id="item-row-${id}" data-row-id="${id}">
      <div class="floaty left add js-add-block-btn" data-row="${id}">
        <img src="icons/add.png" alt="add" class="icon">
      </div>
      <div class="item">
        <div class="floaty left edit js-edit-btn" data-row="${id}">
          <img src="icons/edit.png" alt="edit" class="icon">
        </div>
        <div 
          class="item-element empty" 
          contenteditable="true"
          data-placeholder="${placeholder}"
          data-row="${id}"
          data-print-mode="board"
          data-content=""
        ></div>
      </div>
    </div>
  `,

  /**
   * Callout block
   */
  callout: (id, color = 'gray') => `
    <div class="board-item-row" id="item-row-${id}" data-row-id="${id}">
      <div class="floaty left add js-add-block-btn" data-row="${id}">
        <img src="icons/add.png" alt="add" class="icon">
      </div>
      <div class="item">
        <div class="floaty left edit js-edit-btn" data-row="${id}">
          <img src="icons/edit.png" alt="edit" class="icon">
        </div>
        <div class="callout bg-notion-${color}">
          <span class="callout-icon">💡</span>
          <div 
            class="item-element callout-content empty" 
            contenteditable="true"
            data-placeholder="Type here..."
            data-row="${id}"
            data-print-mode="board"
            data-content=""
          ></div>
        </div>
      </div>
    </div>
  `,

  /**
   * Checkbox/checklist item
   */
  checklist: (id) => `
    <div class="board-item-row" id="item-row-${id}" data-row-id="${id}">
      <div class="floaty left add js-add-block-btn" data-row="${id}">
        <img src="icons/add.png" alt="add" class="icon">
      </div>
      <div class="item checklist-item">
        <div class="floaty left edit js-edit-btn" data-row="${id}">
          <img src="icons/edit.png" alt="edit" class="icon">
        </div>
        <input type="checkbox" class="checklist-checkbox" id="check-${id}">
        <div 
          class="item-element checklist-text empty" 
          contenteditable="true"
          data-placeholder="To-do"
          data-row="${id}"
          data-print-mode="board"
          data-content=""
        ></div>
      </div>
    </div>
  `,

  /**
   * Separator/divider
   */
  separator: (id) => `
    <div class="board-item-row separator-row" id="item-row-${id}" data-row-id="${id}">
      <div class="floaty left add js-add-block-btn" data-row="${id}">
        <img src="icons/add.png" alt="add" class="icon">
      </div>
      <div class="item">
        <div class="floaty left edit js-edit-btn" data-row="${id}">
          <img src="icons/edit.png" alt="edit" class="icon">
        </div>
        <hr class="separator">
      </div>
    </div>
  `,

  /**
   * Link block
   */
  link: (id, url = '', label = '') => `
    <div class="board-item-row" id="item-row-${id}" data-row-id="${id}">
      <div class="floaty left add js-add-block-btn" data-row="${id}">
        <img src="icons/add.png" alt="add" class="icon">
      </div>
      <div class="item" data-block-type="link" data-url="${url}">
        <div class="floaty left edit js-edit-btn" data-row="${id}">
          <img src="icons/edit.png" alt="edit" class="icon">
        </div>
        <div class="item__content item__content--link" contenteditable="true" data-placeholder="Link text..." data-url="${url}">${label || url}</div>
      </div>
    </div>
  `,

  /**
   * Dropdown/toggle block
   */
  dropdown: (id) => `
    <div class="board-item-row dropdown-row" id="item-row-${id}" data-row-id="${id}">
      <div class="floaty left add js-add-block-btn" data-row="${id}">
        <img src="icons/add.png" alt="add" class="icon">
      </div>
      <div class="item dropdown-container">
        <div class="floaty left edit js-edit-btn" data-row="${id}">
          <img src="icons/edit.png" alt="edit" class="icon">
        </div>
        <div class="dropdown-header js-toggle-dropdown" data-row="${id}">
          <img src="icons/arrow.png" class="icon small dropdown-arrow" alt="">
          <div 
            class="item-element dropdown-title empty" 
            contenteditable="true"
            data-placeholder="Toggle title"
            data-row="${id}"
            data-print-mode="board"
            data-content=""
          ></div>
        </div>
        <div class="dropdown-content hidden" data-parent="${id}">
          <!-- Nested items go here -->
        </div>
      </div>
    </div>
  `,

  /**
   * Group block (for grouping related items)
   */
  group: (id, color = 'gray') => `
    <div class="board-item-row group-row" id="item-row-${id}" data-row-id="${id}">
      <div class="floaty left add js-add-block-btn" data-row="${id}">
        <img src="icons/add.png" alt="add" class="icon">
      </div>
      <div class="item group-container bg-notion-${color}">
        <div class="floaty left edit js-edit-btn" data-row="${id}">
          <img src="icons/edit.png" alt="edit" class="icon">
        </div>
        <div class="group-header">
          <div 
            class="item-element group-title empty" 
            contenteditable="true"
            data-placeholder="Group name"
            data-row="${id}"
            data-print-mode="board"
            data-content=""
          ></div>
        </div>
        <div class="group-content" data-parent="${id}">
          <!-- Nested items go here -->
        </div>
      </div>
    </div>
  `
};

// For backwards compatibility
export const CASCADE_HTMLS = {
  new: TEMPLATES.newBoard,
  loadingBoard: TEMPLATES.loadingBoard
};

// ============================================================
// STRUCTURED DATA TEMPLATES (for new serialization system)
// ============================================================

/**
 * Add structured data templates to TEMPLATES object
 * These are used instead of HTML strings for better serialization
 */
TEMPLATES.newBoardData = {
  rows: [
    {
      id: 'row-initial',
      blocks: [
        {
          type: 'text',
          id: 'block-title',
          content: '',
          props: {
            variant: 'title',
            size: 'full',
            color: null,
            align: null,
            placeholder: 'Title'
          }
        }
      ]
    }
  ],
  cover: null,
  icon: null
};

TEMPLATES.emptyBoardData = {
  rows: [],
  cover: null,
  icon: null
};

/**
 * Generate a new board data structure with a custom title
 */
TEMPLATES.createBoardData = (title = '') => ({
  rows: [
    {
      id: `row-${Date.now()}`,
      blocks: [
        {
          type: 'text',
          id: `block-${Date.now()}`,
          content: title,
          props: {
            variant: 'title',
            size: 'full',
            color: null,
            align: null,
            placeholder: 'Title'
          }
        }
      ]
    }
  ],
  cover: null,
  icon: null
});
