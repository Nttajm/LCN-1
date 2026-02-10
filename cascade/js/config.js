/**
 * ==========================================================================
 * CASCADE - Configuration & Constants
 * ==========================================================================
 * All tool menus, block types, and configuration constants.
 */

// ==========================================================================
// RANDOM ICONS & COVERS
// ==========================================================================

export const RANDOM_ICONS = [
  '🏞️', '📘', '📗', '📕', '📒', '📓', '📔', '📚', '🖼️', '🎨', 
  '🎭', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', 
  '🪕', '🎻', '📷', '📹', '🎥', '📺', '💻', '🖥️', '🖨️', '⌨️', 
  '🖱️', '🖲️', '💡', '🔦', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️'
];

export const COVER_IMAGES = [
  'covers/cover1.jpg',
  'covers/cover2.png',
    'covers/cover3.png',
    'covers/cover4.png',
    'covers/cover5.png',
    'covers/cover6.png',
    'covers/cover7.png',
    'covers/cover8.png',
    'covers/cover9.jpeg',
    'covers/cover10.png',
];

// ==========================================================================
// BULLET MARKERS (for auto-formatting)
// ==========================================================================

export const BULLET_MARKERS = [
  { trigger: '-', replace: '• ', mode: 'bullet' },
  { trigger: '*', replace: '• ', mode: 'checklist' },
  { trigger: '>', replace: '➤ ', mode: 'quote' },
];

// ==========================================================================
// TOOL MENUS
// ==========================================================================

export const TOOLS = {
  // Default settings (appears in all menus)
  DEFAULT: {
    'Actions': [
      { id: 'delete', icon: '🗑️', label: 'Delete', action: 'delete' }
    ]
  },

  // Text formatting tools
  TEXT: {
    'Actions': [
      { id: 'delete', icon: '🗑️', label: 'Delete', action: 'delete' }
    ],
    'Size': [
      { id: 'title', icon: 'H1', label: 'Heading 1', class: 'item__content--title', action: 'size' },
      { id: 'heading2', icon: 'H2', label: 'Heading 2', class: 'item__content--h2', action: 'size' },
      { id: 'heading3', icon: 'H3', label: 'Heading 3', class: 'item__content--h3', action: 'size' },
      { id: 'normal', icon: 'T', label: 'Normal', class: 'item__content--text', action: 'size' }
    ],
    'Alignment': [
      { id: 'left', icon: '⬅', label: 'Left', class: 'text-left', action: 'align' },
      { id: 'center', icon: '⬌', label: 'Center', class: 'text-center', action: 'align' },
      { id: 'right', icon: '➡', label: 'Right', class: 'text-right', action: 'align' }
    ],
    'Color': {
      tabs: true,
      'Text color': [
        { id: 'default', icon: 'A', label: 'Default text', class: '', action: 'color', colorClass: '' },
        { id: 'gray', icon: 'A', label: 'Gray text', class: 'text-gray', action: 'color', colorClass: 'text-gray' },
        { id: 'brown', icon: 'A', label: 'Brown text', class: 'text-brown', action: 'color', colorClass: 'text-brown' },
        { id: 'orange', icon: 'A', label: 'Orange text', class: 'text-orange', action: 'color', colorClass: 'text-orange' },
        { id: 'yellow', icon: 'A', label: 'Yellow text', class: 'text-yellow', action: 'color', colorClass: 'text-yellow' },
        { id: 'green', icon: 'A', label: 'Green text', class: 'text-green', action: 'color', colorClass: 'text-green' },
        { id: 'blue', icon: 'A', label: 'Blue text', class: 'text-blue', action: 'color', colorClass: 'text-blue' },
        { id: 'purple', icon: 'A', label: 'Purple text', class: 'text-purple', action: 'color', colorClass: 'text-purple' },
        { id: 'pink', icon: 'A', label: 'Pink text', class: 'text-pink', action: 'color', colorClass: 'text-pink' },
        { id: 'red', icon: 'A', label: 'Red text', class: 'text-red', action: 'color', colorClass: 'text-red' }
      ],
      'Background': [
        { id: 'bg-default', icon: '▨', label: 'Default background', class: '', action: 'color', colorClass: '' },
        { id: 'bg-gray', icon: '▨', label: 'Gray background', class: 'bg-notion-gray', action: 'color', colorClass: 'bg-notion-gray' },
        { id: 'bg-brown', icon: '▨', label: 'Brown background', class: 'bg-notion-brown', action: 'color', colorClass: 'bg-notion-brown' },
        { id: 'bg-orange', icon: '▨', label: 'Orange background', class: 'bg-notion-orange', action: 'color', colorClass: 'bg-notion-orange' },
        { id: 'bg-yellow', icon: '▨', label: 'Yellow background', class: 'bg-notion-yellow', action: 'color', colorClass: 'bg-notion-yellow' },
        { id: 'bg-green', icon: '▨', label: 'Green background', class: 'bg-notion-green', action: 'color', colorClass: 'bg-notion-green' },
        { id: 'bg-blue', icon: '▨', label: 'Blue background', class: 'bg-notion-blue', action: 'color', colorClass: 'bg-notion-blue' },
        { id: 'bg-purple', icon: '▨', label: 'Purple background', class: 'bg-notion-purple', action: 'color', colorClass: 'bg-notion-purple' },
        { id: 'bg-pink', icon: '▨', label: 'Pink background', class: 'bg-notion-pink', action: 'color', colorClass: 'bg-notion-pink' },
        { id: 'bg-red', icon: '▨', label: 'Red background', class: 'bg-notion-red', action: 'color', colorClass: 'bg-notion-red' }
      ]
    }
  },

  // Link-specific tools
  LINK: {
    'Actions': [
      { id: 'delete', icon: '🗑️', label: 'Delete', action: 'delete' },
      { id: 'edit-link', icon: '✏️', label: 'Edit Link', action: 'edit-link' }
    ],
    'Color': {
      tabs: true,
      'Text color': [
        { id: 'default', icon: 'A', label: 'Default text', class: '', action: 'color', colorClass: '' },
        { id: 'blue', icon: 'A', label: 'Blue text', class: 'text-blue', action: 'color', colorClass: 'text-blue' },
        { id: 'green', icon: 'A', label: 'Green text', class: 'text-green', action: 'color', colorClass: 'text-green' },
        { id: 'red', icon: 'A', label: 'Red text', class: 'text-red', action: 'color', colorClass: 'text-red' }
      ],
      'Background': [
        { id: 'bg-default', icon: '▨', label: 'Default background', class: '', action: 'color', colorClass: '' },
        { id: 'bg-blue', icon: '▨', label: 'Blue background', class: 'bg-notion-blue', action: 'color', colorClass: 'bg-notion-blue' },
        { id: 'bg-green', icon: '▨', label: 'Green background', class: 'bg-notion-green', action: 'color', colorClass: 'bg-notion-green' },
        { id: 'bg-red', icon: '▨', label: 'Red background', class: 'bg-notion-red', action: 'color', colorClass: 'bg-notion-red' }
      ]
    }
  },

  // Add block menu (main)
  ADD_BLOCKS: {
    'Text': [
      { id: 'text', icon: 'T', label: 'Text', action: 'add-text' },
      { id: 'checklist', icon: '☐', label: 'Checklist', action: 'add-checklist' },
      { id: 'callout', icon: '💡', label: 'Callout', action: 'add-callout' },
      { id: 'quote', icon: '❝', label: 'Quote', action: 'add-quote' }
    ],
    'Structure': [
      { id: 'separator', icon: '─', label: 'Divider', action: 'add-separator' },
      { id: 'dropdown', icon: '▼', label: 'Toggle', action: 'add-dropdown' },
      { id: 'group', icon: '▭', label: 'Group', action: 'add-group' },
      { id: 'gallery', icon: '☷', label: 'Gallery', action: 'add-gallery' },
      { id: 'ftable', icon: '☰', label: 'Formatted Table', action: 'add-ftable' }
    ],
    'Media': [
      { id: 'link', icon: '🔗', label: 'Link', action: 'add-link' },
      { id: 'image', icon: '🖼️', label: 'Image', action: 'add-image' },
      { id: 'video', icon: '🎥', label: 'Video', action: 'add-video' }
    ],
    'Embed': [
      { id: 'youtube', img: 'appicons/yt.png', label: 'YouTube', action: 'add-youtube' },
      { id: 'gcal', img: 'appicons/gcal.png', label: 'Google Calendar', action: 'add-gcal' }
    ]
  },

  // Add block menu (inside dropdown/group)
  ADD_BLOCKS_NESTED: {
    'Text': [
      { id: 'text', icon: 'T', label: 'Text', action: 'add-text' },
      { id: 'checklist', icon: '☐', label: 'Checklist', action: 'add-checklist' },
      { id: 'quote', icon: '❝', label: 'Quote', action: 'add-quote' }
    ],
    'Structure': [
      { id: 'separator', icon: '─', label: 'Divider', action: 'add-separator' }
    ],
    'Media': [
      { id: 'link', icon: '🔗', label: 'Link', action: 'add-link' }
    ],
    'Embed': [
      { id: 'gcal', img: 'appicons/gcal.png', label: 'Google Calendar', action: 'add-gcal' }
    ]
  },

  // Icon settings
  ICON: {
    'Icon': [
      { id: 'edit-icon', icon: '✏️', label: 'Change Icon', action: 'edit-icon' },
      { id: 'remove-icon', icon: '🗑️', label: 'Remove Icon', action: 'remove-icon' }
    ]
  },

  // Formatted Table block tools
  FTABLE: {
    'Actions': [
      { id: 'delete', icon: '🗑️', label: 'Delete', action: 'delete' }
    ]
  },

  // Google Calendar block tools
  GCAL: {
    'Actions': [
      { id: 'delete', icon: '🗑️', label: 'Delete', action: 'delete' },
      { id: 'reconnect', icon: '🔄', label: 'Reconnect Calendar', action: 'gcal-reconnect' }
    ],
    'Size': [
      { id: 'full', icon: '▭', label: 'Full width', class: 'gcal--full', action: 'gcal-size' },
      { id: 'three-quarter', icon: '▭', label: '3/4 width', class: 'gcal--three-quarter', action: 'gcal-size' },
      { id: 'half', icon: '▭', label: '1/2 width', class: 'gcal--half', action: 'gcal-size' },
      { id: 'quarter', icon: '▭', label: '1/4 width', class: 'gcal--quarter', action: 'gcal-size' }
    ],
    'Height': [
      { id: 'tall', icon: '↕', label: 'Tall (600px)', class: 'gcal--tall', action: 'gcal-height' },
      { id: 'medium', icon: '↕', label: 'Medium (400px)', class: 'gcal--medium', action: 'gcal-height' },
      { id: 'short', icon: '↕', label: 'Short (300px)', class: 'gcal--short', action: 'gcal-height' }
    ],
    'Background': [
      { id: 'bg-default', icon: '▨', label: 'Default', class: '', action: 'gcal-bg', colorClass: '' },
      { id: 'bg-gray', icon: '▨', label: 'Gray', class: 'gcal-bg--gray', action: 'gcal-bg', colorClass: 'gcal-bg--gray' },
      { id: 'bg-blue', icon: '▨', label: 'Blue', class: 'gcal-bg--blue', action: 'gcal-bg', colorClass: 'gcal-bg--blue' },
      { id: 'bg-green', icon: '▨', label: 'Green', class: 'gcal-bg--green', action: 'gcal-bg', colorClass: 'gcal-bg--green' },
      { id: 'bg-yellow', icon: '▨', label: 'Yellow', class: 'gcal-bg--yellow', action: 'gcal-bg', colorClass: 'gcal-bg--yellow' },
      { id: 'bg-red', icon: '▨', label: 'Red', class: 'gcal-bg--red', action: 'gcal-bg', colorClass: 'gcal-bg--red' },
      { id: 'bg-purple', icon: '▨', label: 'Purple', class: 'gcal-bg--purple', action: 'gcal-bg', colorClass: 'gcal-bg--purple' }
    ]
  },

  // Board settings menu
  BOARD_SETTINGS: {
    'Background': [
      { id: 'bg-default', icon: '▨', label: 'Default', class: '', action: 'board-bg', colorClass: '' },
      { id: 'bg-gray', icon: '▨', label: 'Gray', class: 'board-bg--gray', action: 'board-bg', colorClass: 'board-bg--gray' },
      { id: 'bg-brown', icon: '▨', label: 'Brown', class: 'board-bg--brown', action: 'board-bg', colorClass: 'board-bg--brown' },
      { id: 'bg-orange', icon: '▨', label: 'Orange', class: 'board-bg--orange', action: 'board-bg', colorClass: 'board-bg--orange' },
      { id: 'bg-yellow', icon: '▨', label: 'Yellow', class: 'board-bg--yellow', action: 'board-bg', colorClass: 'board-bg--yellow' },
      { id: 'bg-green', icon: '▨', label: 'Green', class: 'board-bg--green', action: 'board-bg', colorClass: 'board-bg--green' },
      { id: 'bg-blue', icon: '▨', label: 'Blue', class: 'board-bg--blue', action: 'board-bg', colorClass: 'board-bg--blue' },
      { id: 'bg-purple', icon: '▨', label: 'Purple', class: 'board-bg--purple', action: 'board-bg', colorClass: 'board-bg--purple' },
      { id: 'bg-pink', icon: '▨', label: 'Pink', class: 'board-bg--pink', action: 'board-bg', colorClass: 'board-bg--pink' },
      { id: 'bg-red', icon: '▨', label: 'Red', class: 'board-bg--red', action: 'board-bg', colorClass: 'board-bg--red' }
    ]
  }
};

// ==========================================================================
// SIZE CLASSES (for easy removal)
// ==========================================================================

export const SIZE_CLASSES = [
  'item__content--title',
  'item__content--h2', 
  'item__content--h3',
  'item__content--text'
];

export const COLOR_CLASSES = [
  'text-red', 'text-blue', 'text-green', 'text-yellow',
  'text-purple', 'text-orange', 'text-pink', 'text-brown', 'text-gray'
];

export const ALIGN_CLASSES = [
  'text-left', 'text-center', 'text-right'
];

export const BG_CLASSES = [
  'bg-notion-red', 'bg-notion-blue', 'bg-notion-green', 'bg-notion-yellow',
  'bg-notion-purple', 'bg-notion-orange', 'bg-notion-pink', 'bg-notion-brown', 'bg-notion-gray'
];

export const BOARD_BG_CLASSES = [
  'board-bg--gray', 'board-bg--brown', 'board-bg--orange', 'board-bg--yellow',
  'board-bg--green', 'board-bg--blue', 'board-bg--purple', 'board-bg--pink', 'board-bg--red'
];
