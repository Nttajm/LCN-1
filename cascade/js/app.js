import {
    saveNotes,
    loadBoard
} from './backend.js';

import {
    CASCADE_HTMLS,
} from './htmls.js';

let printMode = 'board'; // or 'page'
let listmode = ''; // or 'numbered'
let boardItemsSection = null;
let boardId = await loadBoard();

let inputFocusHistory = [];
const globalEventListeners = [];

let covers = [
'covers/cover1.jpg',
'covers/cover2.png',
];

let randomIcons = [
'🏞️', '📘', '📗', '📕', '📒', '📓', '📔', '📚', '🖼️', '🎨', '🎭', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🪕', '🎻', '📷', '📹', '🎥', '📺', '💻', '🖥️', '🖨️', '⌨️', '🖱️', '🖲️', '💡', '🔦', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️'
]



document.addEventListener("DOMContentLoaded", async () => {
    await loadBoard();
});



document.addEventListener('DOMContentLoaded', () => {
    boardItemsSection = document.getElementById('boardItems');
    const boardContainer = document.querySelector('.board-content');
    boardContainer.innerHTML = '';
    boardContainer.innerHTML = loadingStates();
    const DEFAULT = {
        'settings': [
            { id: 'delete', icon: '🗑️', class: 'delete', label: 'Delete', action: 'delete' }
        ],
    };

    const resizeTools = {
        'Resize': [
            { id: 'resize50', icon: '↔️', class: 'resize50', label: '1/2', action: 'resize' },
            { id: 'resize25', icon: '↔️', class: 'resize25', label: '1/4', action: 'resize' },
            { id: 'resize75', icon: '↔️', class: 'resize75', label: '3/4', action: 'resize' },
            { id: 'resize100', icon: '↔️', class: 'resize100', label: '4/4', action: 'resize' },
        ],
    };

    const TEXT_TOOLS = {
        'settings': [
            { id: 'delete', icon: '🗑️', class: 'delete', label: 'Delete', action: 'delete' }
        ],
        'Size': [
            { id: 'title', label: 'Heading 1', class: 'title', icon: 'H1' },
            { id: 'heading2', label: 'Heading 2', class: 'heading2', icon: 'H2' },
            { id: 'heading3', label: 'Heading 3', class: 'heading3', icon: 'H3' },
            { id: 'normal', label: 'Normal', class: 'normal-text', icon: 'T' }
        ],'Alignments': [
            { id: 'left', label: 'Left', class: 'text-left', icon: 'L' },
            { id: 'center', label: 'Center', class: 'text-center', icon: 'C' },
            { id: 'right', label: 'Right', class: 'text-right', icon: 'R' }
        ],
        'Color': [
            { id: 'default', label: 'Default', class: '', icon: 'A', adjClass: true },
            { id: 'red', label: 'Red', class: 'text-rainbow-red', icon: 'A', adjClass: true },
            { id: 'blue', label: 'Blue', class: 'text-rainbow-blue', icon: 'A', adjClass: true },
            { id: 'green', label: 'Green', class: 'text-rainbow-green', icon: 'A', adjClass: true },
            { id: 'yellow', label: 'Yellow', class: 'text-rainbow-yellow', icon: 'A', adjClass: true },
            { id: 'purple', label: 'Purple', class: 'text-rainbow-purple', icon: 'A', adjClass: true },
            { id: 'orange', label: 'Orange', class: 'text-rainbow-orange', icon: 'A', adjClass: true },
            { id: 'pink', label: 'Pink', class: 'text-rainbow-pink', icon: 'A', adjClass: true }
        ],
    };

    const BACKGROUND_TOOLS = {
        'Background': [
            { id: 'bg-default', label: 'No Background', class: '', icon: '□', adjClass: false },
            { id: 'bg-red', label: 'Red Background', class: 'bg-rainbow-red', icon: '■', adjClass: false },
            { id: 'bg-blue', label: 'Blue Background', class: 'bg-rainbow-blue', icon: '■', adjClass: false },
            { id: 'bg-green', label: 'Green Background', class: 'bg-rainbow-green', icon: '■', adjClass: false },
            { id: 'bg-yellow', label: 'Yellow Background', class: 'bg-rainbow-yellow', icon: '■', adjClass: false },
            { id: 'bg-purple', label: 'Purple Background', class: 'bg-rainbow-purple', icon: '■', adjClass: false },
            { id: 'bg-orange', label: 'Orange Background', class: 'bg-rainbow-orange', icon: '■', adjClass: false },
            { id: 'bg-pink', label: 'Pink Background', class: 'bg-rainbow-pink', icon: '■', adjClass:false }
        ],
    };

    const ANCHOR_TEXT_TOOLS = {
        'settings': [
            { id: 'delete', icon:'🗑️' ,class:'delete' ,label:'Delete' ,action:'delete' },
            { id: 'edit', icon: '✏️', class: 'edit', label: 'Edit Link', action: 'edit' }
        ],
        'Color': [
            { id: 'default', label: 'Default', class: '', icon: 'A', adjClass: true},
            { id: 'red', label: 'Red', class: 'text-rainbow-red', icon: 'A', adjClass: true },
            { id: 'blue', label: 'Blue', class: 'text-rainbow-blue', icon: 'A', adjClass: true },
            { id: 'green', label: 'Green', class: 'text-rainbow-green', icon: 'A', adjClass: true },
            { id: 'yellow', label: 'Yellow', class: 'text-rainbow-yellow', icon: 'A', adjClass: true },
            { id: 'purple', label: 'Purple', class: 'text-rainbow-purple', icon: 'A', adjClass: true },
            { id: 'orange', label: 'Orange', class: 'text-rainbow-orange', icon: 'A', adjClass: true },
            { id: 'pink', label: 'Pink', class: 'text-rainbow-pink', icon: 'A', adjClass: true }
        ],
        // 'background': [
        //     { id: 'bg-default', label: 'No Background', class: '', icon: '□', adjClass: true },
        //     { id: 'bg-red', label: 'Red Background', class: 'bg-notion-red', icon: '■', adjClass: true },
        //     { id: 'bg-orange', label: 'Orange Background', class: 'bg-notion-orange', icon: '■', adjClass: true },
        //     { id: 'bg-yellow', label: 'Yellow Background', class: 'bg-notion-yellow', icon: '■', adjClass: true },
        //     { id: 'bg-green', label: 'Green Background', class: 'bg-notion-green', icon: '■', adjClass: true },
        //     { id: 'bg-blue', label: 'Blue Background', class: 'bg-notion-blue', icon: '■', adjClass: true },
        //     { id: 'bg-purple', label: 'Purple Background', class: 'bg-notion-purple', icon: '■', adjClass: true },
        //     { id: 'bg-pink', label: 'Pink Background', class: 'bg-notion-pink', icon: '■', adjClass: true },
        //     { id: 'bg-brown', label: 'Brown Background', class: 'bg-notion-brown', icon: '■', adjClass: true },
        //     { id: 'bg-gray', label: 'Gray Background', class: 'bg-gray-50', icon: '■', adjClass: true }
        // ],
        'Alignments': [
            { id: 'left', label: 'Left', class: 'text-left', icon: 'L' },
            { id: 'center', label: 'Center', class: 'text-center', icon: 'C' },
            { id: 'right', label: 'Right', class: 'text-right', icon: 'R' }
        ]
    };

    const ADD_DROP_BLOCKS = {
        'text': [
            { id: 'normal', icon: 'T', class: 'normal-text', label: 'Text', action: 'normal', drop: true },
            { id: 'checklist', icon: '☐', class: 'checklist-block', label: 'Checklist', drop: true, action: 'checklist' },
        ],
        'Note Block': [
            {id: 'separator', icon: '─', class: 'separator', label: 'Separator', action: 'separator'},
        ],
        'Media': [
            { id: 'link', icon: '🔗', class: 'link', label: 'Link', action: 'link', drop: true },
            { id: 'image', icon: '🖼️', class: 'image', label: 'Image', action: 'image', drop: true },
            { id: 'video', icon: '🎥', class: 'video', label: 'Video', action: 'video', drop: true }
        ],
        'Embed': [
            { id: 'gcal', img: 'appicons/gcal.png', class: 'embed', label: 'Google Calendar', drop: true },
            { id: 'yt', img: 'appicons/yt.png', class: 'embed', label: 'YouTube', action: 'youtube', drop: true }
        ]
    }

    const ADD_BLOCKS = {
        
        'text': [ 
            { id: 'normal', icon: 'T', class: 'normal-text', label: 'Text', action: 'normal' },
            { id: 'checklist', icon: '☐', class: 'checklist-block', label: 'Checklist', drop: true, action: 'checklist' },
            { id: 'callout', icon: '💡', class: 'callout', label: 'Callout', action: 'callout' }
        ],
        'Note Block': [
            {id: 'separator', icon: '─', class: 'separator', label: 'Separator', action: 'separator'},
            { id: 'dropdown', icon: '▼', class: 'note-block', label: 'Drop down' , action: 'dropdown' },
            { id: 'group', icon: '▭', class: 'group', label: 'Group', action: 'group' }
        ],
        'Media': [
            { id: 'link', icon: '🔗', class: 'link', label: 'Link', action: 'link' },
            { id: 'image', icon: '🖼️', class: 'image', label: 'Image', action: 'image' },
            { id: 'video', icon: '🎥', class: 'video', label: 'Video', action: 'video' }
        ],
        'Embed': [
            { id: 'gcal', img: 'appicons/gcal.png', class: 'embed', label: 'Google Calendar' },
            { id: 'yt', img: 'appicons/yt.png', class: 'embed', label: 'YouTube', action: 'youtube' }
        ]
    }

    const CHANGE_ICON_TOOLS = {
        'Icon Settings': [
            { id: 'edit', icon: '✏️', class: 'edit', label: 'Add emoji or Letter', action: 'edit-icon' },
        ]
    };

    // load initial item
    
        recognizeElems();
        syncInputToDataContent();
        initEmptyInputs();
        initLinkers();
        initHiders();
        initAddNoteBtns();
    // addEventListenerGroup();


    function loadingStates() {
        return CASCADE_HTMLS.loadingBoard;
    }

function createRow(itemIndex = 'none') {
    // only make row if printMode is 'board'
    if (printMode !== 'board') return null;

    itemIndex = itemIndex + 2;
    const itemDivRow = document.createElement('div');
    itemDivRow.className = `board-item-row js-drop-content-${itemIndex}`;
    itemDivRow.id = `item-row-${itemIndex}`;

    const floaty = createAddToRowFloaty(itemIndex);
    itemDivRow.appendChild(floaty);

    return itemDivRow;
}

function theUsual(index) {
    closeAllToolsMenus();

    const input = document.getElementById(`item-input-${index}`);
    if (input) {
        input.addEventListener('focus', () => {
            printMode = input.dataset.printMode || 'board';
        });
    }
}

    // create items
    function createTextItem(type = 'normal-text', toBoard = true) {
        const itemIndex = document.querySelectorAll('.item').length + 1;
        const itemDivRow = createRow(itemIndex);

        const itemDiv = document.createElement('div');
        itemDiv.className = 'item'; 


        const input = document.createElement('input');
        input.type = 'text';
        input.id = `item-input-${itemIndex}`;
        input.className = `simple item-element fx-full ${type || 'normal-text'}`;
        input.placeholder = type === 'title' ? 'Title' : 'Type something...';
        input.dataset.itemIndex = itemIndex;
        input.autocomplete = 'off';
        input.focus();

        input.dataset.printMode = printMode;

         if (checkList() === 'checkList') {
        const holder = document.createElement('div');
        holder.className = 'holder';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'simple-checkbox';

        holder.appendChild(checkbox);
        holder.appendChild(input);

        itemDiv.appendChild(createFloaty(itemIndex, 'edit'));
        itemDiv.appendChild(holder);

        checkbox.addEventListener('change', () => {
            input.classList.toggle('strike', checkbox.checked);
        });
        } else {
            input.value = checkList();
            const floaty = createFloaty(itemIndex, 'edit');
            itemDiv.appendChild(floaty);
            itemDiv.appendChild(input);
        }

        if (itemDivRow) {
            itemDivRow.appendChild(itemDiv);
            appendItemToBoard(itemDivRow);
        } 
        else {
            appendItemToBoard(itemDiv);
        }

        initEmptyInputs();
        theUsual(itemIndex);
        return itemDiv;
     }

     function createCallOut(type = 'normal-text', toBoard = true) {
        const itemIndex = document.querySelectorAll('.item').length + 1;
        const itemDivRow = createRow(itemIndex);

        const itemDiv = document.createElement('div');
        itemDiv.className = 'item callout';


        const input = document.createElement('input');
        input.type = 'text';
        input.id = `item-input-${itemIndex}`;
        input.className = `simple item-element fx-full ${type || 'normal-text'}`;
        input.placeholder = type === 'title' ? 'Title' : 'Type something...';
        input.dataset.itemIndex = itemIndex;
        input.autocomplete = 'off';
        input.value = '💡 ';
        input.dataset.content = '💡 ';
        input.focus();

        input.dataset.printMode = printMode;

         if (checkList() === 'checkList') {
        const holder = document.createElement('div');
        holder.className = 'holder';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'simple-checkbox';

        holder.appendChild(checkbox);
        holder.appendChild(input);

        itemDiv.appendChild(createFloaty(itemIndex, 'edit'));
        itemDiv.appendChild(holder);

        checkbox.addEventListener('change', () => {
            input.classList.toggle('strike', checkbox.checked);
        });
        } else {
            input.value = checkList();
            const floaty = createFloaty(itemIndex, 'edit');
            itemDiv.appendChild(floaty);
            itemDiv.appendChild(input);
        }

        if (itemDivRow) {
            itemDivRow.appendChild(itemDiv);
            appendItemToBoard(itemDivRow);
        } 
        else {
            appendItemToBoard(itemDiv);
        }

        initEmptyInputs();
        theUsual(itemIndex);
        return itemDiv;
     }

     function createCheckListItem() {
        const itemIndex = document.querySelectorAll('.item').length + 1;
        const itemDivRow = createRow(itemIndex);

        // Checklist item structure
        const itemDiv = document.createElement('div');
        itemDiv.className = 'item';

        const holder = document.createElement('div');
        holder.className = 'holder';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'simple-checkbox';

        const input = document.createElement('input');
        input.type = 'text';
        input.id = `item-input-${itemIndex}`;
        input.className = 'simple item-element normal-text empty';
        input.placeholder = 'Type something...';
        input.dataset.itemIndex = itemIndex;
        input.autocomplete = 'off';
        input.focus();

        holder.appendChild(checkbox);
        holder.appendChild(input);

        const floaty = createFloaty(itemIndex, 'edit');
        itemDiv.appendChild(floaty);
        itemDiv.appendChild(holder);

        checkbox.addEventListener('change', () => {
            input.classList.toggle('strike', checkbox.checked);
            });

        if (itemDivRow) {
            itemDivRow.appendChild(itemDiv);
            appendItemToBoard(itemDivRow);
        } else {
            appendItemToBoard(itemDiv);
        }

        theUsual(itemIndex);


        listmode = 'checkList';
    }

     function checkList() {
        if (listmode === 'dash') {
            return '- ';
        } else if (listmode === 'bullet') {
            return '• ';
        } else if (listmode === 'quote') {
            return '➤ ';
        } else {
            return listmode;
        }
     }


     function createNewIdenticalInput() {
        const activeElementInput = document.activeElement;
        if (activeElementInput && activeElementInput.classList.contains('item-element')) {
            const currentType = Array.from(activeElementInput.classList).find(cls => ['normal-text', 'title', 'heading2', 'heading3'].includes(cls)) || 'normal-text';
            createTextItem(currentType);
            const allInputs = document.querySelectorAll('.item-element');
            allInputs[allInputs.length - 1].focus();
        }
    }

        function createSeparator() {
            const itemDivRow = createRow();

            const itemIndex = document.querySelectorAll('.item').length + 1;

            const itemDiv = document.createElement('div');
            itemDiv.className = 'item';

            const floaty = createFloaty(itemIndex, 'simple');
            itemDiv.appendChild(floaty);

            const hr = document.createElement('hr');
            itemDiv.appendChild(hr);


            if (itemDivRow) {
                itemDivRow.appendChild(itemDiv);
                appendItemToBoard(itemDivRow);
            } else {
                appendItemToBoard(itemDiv);
            }
            syncInputToDataContent();
        }

     
function createAnchorTextItem(type = 'normal-text', link = '#', name = '') {
        const itemIndex = document.querySelectorAll('.item').length + 1;
        const itemDivRow = createRow(itemIndex);

        const itemDiv = document.createElement('div');
        itemDiv.className = 'item';


        const input = document.createElement('input');
        input.type = 'text';
        input.id = `item-input-${itemIndex}`;
        input.className = `simple item-element ${type || 'normal-text'} board-link cur `;
        input.placeholder = 'link description...';
        input.dataset.itemIndex = itemIndex;
        input.autocomplete = 'off';
        input.value = name;
        if (link && !/^https?:\/\//i.test(link)) {
            link = 'https://' + link;
        }
        input.setAttribute('data-link', link);

        input.dataset.printMode = printMode;

        const floaty = createFloaty(itemIndex, 'anchor');

        itemDiv.appendChild(floaty);
        itemDiv.appendChild(input);
        
        if (itemDivRow) {
            itemDivRow.appendChild(itemDiv);
            appendItemToBoard(itemDivRow);
        } 
        else {
            appendItemToBoard(itemDiv);
        }
        syncInputToDataContent();
     }


// prompters 
function promptForLink(container) {
    // resolve container at call time (safer than using it in the default param)
    container = container || document.getElementById('boardItems');
    // fallback if container still not found
    if (!container) container = document.body;

    // use a numeric index and add an 'a' suffix for uniqueness
    const indexNum = document.querySelectorAll('.item').length + 1;
    const index = `${indexNum}a`;

    // try to create a row (may return null if printMode !== 'board')
    const row = createRow(index);

    // append the row (or a safe fallback element) to the board
    if (row) {
        appendItemToBoard(row);
    } else {
        // create a minimal wrapper so we have a place to render prompt
        const wrapper = document.createElement('div');
        wrapper.className = `board-item-row js-drop-content-${index}`;
        container.appendChild(wrapper);
    }

    // determine the actual row element we should render into
    const actualRow = row || container.lastElementChild;
    if (!actualRow) return; // nothing we can do

    const renderPrompt = (placeholder, buttonText, onSubmit) => {
        actualRow.innerHTML = `
            <div class="await">
                <input type="text" class="prompt-input" placeholder="${placeholder}">
                <button type="button" class="go btn-sm">${buttonText}</button>
                <button type="button" class="cancel btn-sm">🗑️</button>
            </div>
        `;

        const input = actualRow.querySelector('.prompt-input');
        const goBtn = actualRow.querySelector('.go');
        const cancelBtn = actualRow.querySelector('.cancel');

        const cleanup = () => {
            if (actualRow && actualRow.parentNode) actualRow.parentNode.removeChild(actualRow);
        };

        goBtn.addEventListener('click', (ev) => {
            ev.preventDefault();
            const val = input.value.trim();
            if (!val) {
                return alert('Please enter something.');
            }
            onSubmit(val);
        });

        cancelBtn.addEventListener('click', (ev) => {
            ev.preventDefault();
            cleanup();
        });

        input.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter') {
                ev.preventDefault();
                goBtn.click();
            } else if (ev.key === 'Escape') {
                ev.preventDefault();
                cancelBtn.click();
            }
        });

        input.focus();
    };

    // two-step prompt: link -> name
    renderPrompt('Type or paste link...', '➔', (link) => {
        // normalize link quickly
        const normalizedLink = (/^https?:\/\//i.test(link)) ? link : `https://${link}`;
        renderPrompt('Enter a name for the link...', 'Save', (name) => {
            // remove prompt row and create actual anchor item
            if (actualRow && actualRow.parentNode) actualRow.parentNode.removeChild(actualRow);
            createAnchorTextItem('link', normalizedLink, name);
            syncInputToDataContent();
        });
    });
}



    function createResizeable(index) {
        const sizable = document.createElement('div');
        sizable.className = 'resizable js-uni-tools resize';
        sizable.id = `resizeable-${index}`;
        return sizable;
    }

    // create floaty edit button
    function createFloaty(itemIndex, action = 'edit', position = 'left') {
        const floaty = document.createElement('div');
        floaty.className = `floaty ${position} ${action} js-uni-tools`;
        floaty.innerHTML = `<img src="icons/edit.png" alt="${action}" class="icono gray icon">`;
        floaty.dataset.item = itemIndex;
        return floaty;
    }

    function createAddToRowFloaty(itemIndex, action = 'add', position = 'left') {
        const floaty = document.createElement('div');
        floaty.className = `floaty ${position} ${action} js-uni-tools js-add-note-btn`;
        floaty.id = `add-dropdown-${itemIndex}`;
        floaty.innerHTML = `<img src="icons/add.png" alt="${action}" class="icono gray icon">`;
        floaty.dataset.item = itemIndex;
        return floaty;
    }

    // Build tools menu
    function openConElemTools(tools, itemIndex) {
    const toolsContainer = document.createElement('div');
    toolsContainer.className = 'tools-container dn';

    const toolsDiv = document.createElement('div');
    toolsDiv.className = 'tools taboff';

    const cursorGap = document.createElement('div');
    cursorGap.className = 'cursor-gap';
    toolsContainer.appendChild(cursorGap);

    Object.entries(tools).forEach(([sectionName, sectionItems]) => {
        const sectionHTML = [`<div class="section-title conelem"><span>${sectionName}</span></div>`];
        sectionItems.forEach(tool => {
            sectionHTML.push(
                genColElement(
                    tool.icon,
                    tool.img,
                    tool.label,
                    tool.class,
                    itemIndex,
                    tool.action ? tool.action : sectionName,
                    tool.adjClass ? tool.class : ''
                )
            );
        });
        toolsDiv.innerHTML += sectionHTML.join('');
    });

    toolsContainer.appendChild(toolsDiv);
    return toolsContainer;
}


    function genColElement(icon, img, label, colorClass, itemIndex, sectionName, adjClass = '') {
        const iconHtml = img ? `<img src="${img}" alt="${label}" class="icono icon small">` : `<span class="letter small">${icon}</span>`;
        return `
            <div class="conelem profile hover js-trigger-action" 
                 data-action="${sectionName}" 
                 data-value="${colorClass}" 
                 data-item="${itemIndex}">
                ${iconHtml}
                <span class="fx-full ${adjClass}">${label}</span>
            </div>`;
    }

    

    function createDropdown() {
    let index = document.querySelectorAll('.item').length + 1;

    const itemDivRow = createRow(index);

    const itemDiv = document.createElement('div');
    itemDiv.className = `dropdown item fl-c g-5 js-set-print-mode`;
    itemDiv.id = `item-${index}`;
    index += Math.random().toString(36).substring(2, 5);
    itemDiv.dataset.setPrintMode = index;


    itemDiv.innerHTML = `
            <div class="drop-name fl-r g-5 fx-full">
                <img src="icons/dropdown.png" alt="dropdown" data-target="dd-hide-${index}" class="hide-part icono gray icon drop-icon btn-space hover" />
                <input type="text" class="drop-input item-element simple heading3 js-set-print-mode" data-set-print-mode=${index} placeholder="Name" />
            </div>
            <div class="drop-content dd-hide-${index} js-drop-content-${index}" id="drop-content-${index}"></div>
            <div class="js-add-note-btn addNote js-uni-tools add-drop nAvoid dd-hide-${index}" id="add-dropdown-${index}">
                <img src="icons/add.png" alt="add" class="icono gray icon small">
            </div>
    `;

    if (itemDivRow) {
        itemDivRow.appendChild(itemDiv);
        appendItemToBoard(itemDivRow);
    } else {
        appendItemToBoard(itemDiv);
    }
    
}



function createGroup() {
    let index = document.querySelectorAll('.item').length + 1;

    const itemDivRow = createRow(index);

    const itemDiv = document.createElement('div');
    itemDiv.className = `group item fl-c g-5 js-set-print-mode`;
    itemDiv.id = `item-${index}`;
    index += Math.random().toString(36).substring(2, 5);
    itemDiv.dataset.setPrintMode = index;
    const textItem = createTextItem();

    const groupContent = document.createElement('div');
    groupContent.className = `group-content fx-full js-drop-content-${index} fl-c`;
    groupContent.id = `group-content-${index}`;
    groupContent.appendChild(textItem);
    itemDiv.appendChild(groupContent);

    itemDiv.addEventListener('click', (e) => {
        printMode = index;
    });

    itemDiv.addEventListener('focus', (e) => {
        printMode = index;
    });


    if (itemDivRow) {
        itemDivRow.appendChild(itemDiv);
        appendItemToBoard(itemDivRow);
    } else {
        appendItemToBoard(itemDiv);
    }

}

function turnToChecklist(itemIndex) {
    const row = document.getElementById(`item-row-${itemIndex}`);
    if (!row) return;
    const itemDiv = row.querySelector('.item');
    if (!itemDiv) return;
    const oldInput = itemDiv.querySelector('.item-element');
    if (!oldInput) return;

    // Preserve value and classes
    const value = oldInput.value;
    const inputClasses = oldInput.className;
    const inputId = oldInput.id;
    const inputDataset = { ...oldInput.dataset };

    // Remove old input
    oldInput.remove();

    // Create holder
    const holder = document.createElement('div');
    holder.className = 'holder';

    // Create checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'simple-checkbox';

    // Create new input
    const newInput = document.createElement('input');
    newInput.type = 'text';
    newInput.id = inputId;
    newInput.className = inputClasses;
    newInput.placeholder = 'Type something...';
    newInput.value = value;
    Object.entries(inputDataset).forEach(([k, v]) => newInput.dataset[k] = v);
    newInput.autocomplete = 'off';

    // Add strike-through toggle
    checkbox.addEventListener('change', () => {
        newInput.classList.toggle('strike', checkbox.checked);
    });

    // Append to holder and itemDiv
    holder.appendChild(checkbox);
    holder.appendChild(newInput);

    // Remove any existing holder to avoid duplicates
    const existingHolder = itemDiv.querySelector('.holder');
    if (existingHolder) existingHolder.remove();

    itemDiv.appendChild(holder);

    // Optionally focus the input
    newInput.focus();
}

const allCheckboxes = document.querySelectorAll('.simple-checkbox');
allCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
        const input = checkbox.closest('.board-item-row')?.querySelector('.item-element');
        if (input) {
            input.classList.toggle('strike', checkbox.checked);
        }
    });
});


    // Event delegation for floaty (edit) button clicks
    registerListener(document, 'click', (e) => {
        const u_Tool = e.target.closest('.js-uni-tools');
        if (u_Tool) {
            e.stopPropagation();
            closeAllToolsMenus();

            u_Tool.classList.toggle('active');


            const itemIndex = u_Tool.dataset.item;
            let existing = u_Tool.querySelector('.tools-container');
            if (existing) {
            existing.classList.toggle('dn');
            return;
            }

            if (u_Tool.classList.contains('simple')) {
            const toolsMenu = openConElemTools(DEFAULT, itemIndex);
            u_Tool.appendChild(toolsMenu);
            requestAnimationFrame(() => toolsMenu.classList.remove('dn'));
            }

            if (u_Tool.classList.contains('edit')) {
            const toolsMenu = openConElemTools(TEXT_TOOLS, itemIndex);
            u_Tool.appendChild(toolsMenu);
            requestAnimationFrame(() => toolsMenu.classList.remove('dn'));
            }

            if (u_Tool.classList.contains('add')) {
            const toolsMenu = openConElemTools(ADD_BLOCKS, itemIndex);
            u_Tool.appendChild(toolsMenu);
            requestAnimationFrame(() => toolsMenu.classList.remove('dn'));
            }


            if (u_Tool.classList.contains('add-drop')) {
            const toolsMenu = openConElemTools(ADD_DROP_BLOCKS, itemIndex);
            u_Tool.appendChild(toolsMenu);
            requestAnimationFrame(() => toolsMenu.classList.remove('dn'));
            }

            if (u_Tool.classList.contains('anchor')) {
            const toolsMenu = openConElemTools(ANCHOR_TEXT_TOOLS, itemIndex);
            u_Tool.appendChild(toolsMenu);
            requestAnimationFrame(() => toolsMenu.classList.remove('dn'));
            }

            if (u_Tool.classList.contains('edit-icon')) {
            const toolsMenu = openConElemTools(CHANGE_ICON_TOOLS, itemIndex);
            u_Tool.appendChild(toolsMenu);
            requestAnimationFrame(() => toolsMenu.classList.remove('dn'));
            }
        }
        });

    // Event delegation for all .js-trigger-action clicks
    registerListener(document, 'click', (e) => {
        const trigger = e.target.closest('.js-trigger-action');
        if (!trigger) return;

        const action = trigger.dataset.action;
        const value = trigger.dataset.value;
        const itemIndex = trigger.dataset.item;

        if (action === 'Size') changeTextSize(itemIndex, value);
        if (action === 'Color') changeTextColor(itemIndex, value);
        if (action === 'Alignments') changeTextAlignment(itemIndex, value);
        if (action === 'Background') changeTextBackground(itemIndex, value);
    

        if (action === 'normal') createTextItem('normal-text');
        if (action === 'title') createTextItem('title');
        if (action === 'heading2') createTextItem('heading2');
        if (action === 'heading3') createTextItem('heading3');
        if (action === 'checklist') createCheckListItem();
        if (action === 'delete') {
            // Try to remove row, item, or input by itemIndex
            const row = document.getElementById(`item-row-${itemIndex}`);
            if (row) return row.remove();

            const item = document.getElementById(`item-${itemIndex}`);
            if (item) return item.remove();

            const input = document.getElementById(`item-input-${itemIndex}`);
            if (input) {
                const itemEl = input.closest('.item');
                const rowEl = input.closest('.board-item-row');
                if (rowEl) {
                    const itemsInRow = rowEl.querySelectorAll('.item');
                    return (itemEl && itemsInRow.length > 1) ? itemEl.remove() : rowEl.remove();
                }
                return itemEl ? itemEl.remove() : input.remove();
            }

            // Fallback: remove closest .item or .board-item-row from floaty
            const floaty = document.querySelector(`.floaty[data-item="${itemIndex}"]`);
            if (floaty) (floaty.closest('.item') || floaty.closest('.board-item-row'))?.remove();
        }

        if (action === 'separator') {
            createSeparator();
        }
        if (action === 'link') {
            promptForLink();
        }

        if (action === 'callout') {
            createCallOut();
        }

        if (action === 'dropdown') {
            createDropdown();
        }

        if (action === 'group') {
            createGroup();
        }

        if (action === 'edit') {
            focusInput(itemIndex);
        }

        if (action === 'yotube') {
            alert('YouTube embed feature coming soon!');
        }

        if (action === 'edit-icon') {
            focusIconInput();
        }


        closeAllToolsMenus();
    });


    // Helpers
    function closeAllToolsMenus() {
        document.querySelectorAll('.tools-container').forEach(menu => {
            menu.classList.add('dn');
        });
    }

    // Change functions
    function changeTextSize(itemIndex, sizeClass) {
        const input = document.getElementById(`item-input-${itemIndex}`);
        if (!input) return;
        TEXT_TOOLS['Size'].forEach(s => input.classList.remove(s.class));
        if (sizeClass) input.classList.add(sizeClass);
    }

    function changeTextColor(itemIndex, colorClass) {
        const input = document.getElementById(`item-input-${itemIndex}`);
        if (!input) return;
        TEXT_TOOLS['Color'].forEach(c => {
            if (c.class) input.classList.remove(c.class);
        });
        if (colorClass) input.classList.add(colorClass);
    }

    function changeTextBackground(itemIndex, bgClass) {
        const input = document.getElementById(`item-input-${itemIndex}`);
        if (!input) return;
        TEXT_TOOLS['background'].forEach(b => {
            if (b.class) input.classList.remove(b.class);
        });
        if (bgClass) input.classList.add(bgClass);
    }

    function changeTextAlignment(itemIndex, alignClass) {
        const input = document.getElementById(`item-input-${itemIndex}`);
        if (!input) return;
        TEXT_TOOLS['Alignments'].forEach(a => input.classList.remove(a.class));
        if (alignClass) input.classList.add(alignClass);
    }

    function focusInput(itemIndex) {
        const input = document.getElementById(`item-input-${itemIndex}`);
        if (input) input.focus();
    }

    // Add new item when clicking below last input
    registerListener(document, 'click', (e) => {
        const boardContainer = document.querySelector('.board-content');
        const activeInput = document.activeElement;
        const allInputs = Array.from(document.querySelectorAll('.item-element'));
        const lastInput = allInputs[allInputs.length - 1];
        if (!lastInput) return;

        const boardItemChildren = Array.from(boardContainer.children);

        const rect = lastInput.getBoundingClientRect();
        const clickY = e.clientY;
        const belowLast = clickY > rect.bottom;

        if (
            belowLast &&
            !e.target.closest('.floaty') &&
            !e.target.closest('.board-item-row') &&
            !e.target.closest('.extra_elems') &&
            !lastInput.classList.contains('empty')
        ) {
            if (activeInput && activeInput === lastInput) return;
            createTextItem();
        }
    });

    // Enter + Backspace shortcuts
    registerListener(document, 'keydown', (e) => {
          saveNotes();

        if (
            (e.key === 'ArrowDown' || e.key === 'ArrowUp') &&
            document.activeElement.classList.contains('item-element')
        ) {
            const allInputs = Array.from(document.querySelectorAll('.item-element'));
            const currentIndex = allInputs.indexOf(document.activeElement);
            if (e.key === 'ArrowDown' && currentIndex < allInputs.length - 1) {
                e.preventDefault();
                allInputs[currentIndex + 1].focus();
            }
            if (e.key === 'ArrowUp' && currentIndex > 0) {
                e.preventDefault();
                allInputs[currentIndex - 1].focus();
            }
        }

        const activeElementInput = document.activeElement;

        // if (activeElementInput.scrollWidth > activeElementInput.clientWidth) {
        //     createNewIdenticalInput();
        // }


        if (e.key === 'Enter') {
            const activeElement = document.activeElement;
            if (activeElement && activeElement.classList.contains('item-element') && activeElement.value.trim() !== '') {
                e.preventDefault();
                if (!printMode || printMode === 'none' || !document.querySelector(`.js-drop-content-${printMode}`)) {
                        printMode = 'board';
                    }
                if (listmode === 'checkList') {
                    createCheckListItem();
                } else {
                    createTextItem();
                }
                // Focus on the newly created input
                if (printMode != 'board') {
                    const inputsWithin = document.querySelectorAll(`.js-drop-content-${printMode} .item-element`);
                    if (inputsWithin.length > 0) {
                        inputsWithin[inputsWithin.length - 1].focus();
                    }
                } else{
                    const allInputs = document.querySelectorAll('.item-element');
                    const lastInput = allInputs[allInputs.length - 1];
                    if (lastInput) lastInput.focus();
                }
            }

            if (activeElement && activeElement.value.trim() === '') {
                const existingMenu = activeElement.parentElement.querySelector('.tools-container');
                if (!existingMenu) {
                    const toolsMenu = openConElemTools(ADD_BLOCKS, 'lol');
                    activeElement.parentElement.appendChild(toolsMenu);
                    requestAnimationFrame(() => toolsMenu.classList.remove('dn'));
                } else {
                    existingMenu.classList.toggle('dn');
                }
            }

        }


        if (e.key === 'Backspace') {
            const activeElement = document.activeElement;
            if (
                activeElement &&
                activeElement.classList.contains('item-element') &&
                activeElement.value.trim() === ''
            ) {
                e.preventDefault();
               activeElement.closest('.item')?.remove();
                deleteEmptyRows();

                focusInputLatest();
            }
        }
    });

    // genrations



    // icons stuff


    function focusIconInput() {
        const iconInput = document.getElementById('icon-input');
        if (iconInput) {
            iconInput.removeAttribute('readonly');
            iconInput.focus();

            // Handler to set readonly back
            function setReadonlyBack() {
                iconInput.setAttribute('readonly', true);
                iconInput.removeEventListener('blur', setReadonlyBack);
                iconInput.removeEventListener('keydown', onEnter);
            }

            function onEnter(e) {
                if (e.key === 'Enter') {
                    setReadonlyBack();
                }
            }

            iconInput.addEventListener('blur', setReadonlyBack);
            iconInput.addEventListener('keydown', onEnter);
        }
    }



    registerListener(document, 'keydown', (e) => {
        if (e.shiftKey && e.key === 'A') {
            e.preventDefault(); // Prevent the letter from being typed in the input
            createTextItem();
            focusInputLatest();
        }
    });

    

    function focusInputLatest() {
        let allInputs;
        const contentDiv = document.querySelector(`.js-drop-content-${printMode}`);
        const contentDivInputs = contentDiv ? contentDiv.querySelectorAll('.item-element') : [];
        if (printMode != 'board' && contentDiv) {
            allInputs = contentDiv ? contentDiv.querySelectorAll('.item-element') : [];
            if (contentDivInputs.length < 1) {
                allInputs = document.querySelectorAll('.item-element');
            }
        } else {
            allInputs = document.querySelectorAll('.item-element');
        }
        const aiLength = allInputs.length;
        const latest = allInputs[aiLength - 1];
        if (latest) {
            latest.focus();
        }
    }

    // Always reset printMode to 'board' when focusing a top-level input
document.addEventListener('focusin', e => {
    if (e.target.classList.contains('item-element') && !e.target.closest('.js-drop-content-')) {
        printMode = 'board';
    }
});


    function addIcon() {
        const iconInput = document.getElementById('icon-input');
        if (iconInput) {
            iconInput.classList.remove('dn');
            iconInput.classList.add('hasIcon');
            const randomIcon = randomIcons[Math.floor(Math.random() * randomIcons.length)];
            iconInput.value = randomIcon;
            recognizeElems();
        }
    }




        const addIconBtn = document.querySelector('.add-icon-btn');
    if (addIconBtn) {
        registerListener(addIconBtn, 'click', () => {
            addIcon();
        });
    } else {
        console.warn('addIconBtn not found');
    }



    function addCover(imgUrl) {
  const coverElem = document.querySelector('.cover');

  imgUrl = imgUrl || covers[Math.floor(Math.random() * covers.length)];

  if (coverElem) {
    coverElem.style.backgroundImage = `url('${imgUrl}')`;
  }
}

const coverBtn = document.querySelector('.add-cover-btn');
if (coverBtn) {
    coverBtn.addEventListener('click', () => {
        addCover();
        coverBtn.innerHTML = 'Change cover';
        coverBtn.classList.remove('add-cover-btn');
        coverBtn.removeEventListener('click', this);
        coverBtn.classList.add('js-uni-tools', 'edit');
    });
}




reapplyAllEventListeners();
syncInputToDataContent(); // re-syncs input values to dataset.content
initEmptyInputs();

});


registerListener(document, 'keydown', e => {
    if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        alert('Notes saved!');
    }
});

function appendItemToBoard(itemDivRow) {
  const boardItemsSection = document.getElementById('boardItems');
  if (!boardItemsSection) return;

  if (printMode && printMode !== 'board') {
    const dropdownContent = document.querySelector(`.js-drop-content-${printMode}`);
    if (dropdownContent) {
      dropdownContent.appendChild(itemDivRow);
      return;
    }
  }
  boardItemsSection.appendChild(itemDivRow);
  deleteEmptyRows();
  setTimeout(() => addEventListenerGroup(), 10);
}



// =========== Additional Features ===========

registerListener(document, 'click', (e) => {
        addEventListenerGroup();
    if (!e.target.closest('.js-uni-tools') && !e.target.closest('.tools-container')) {
        closeAllToolsMenus();
    }
});



export function addEventListenerGroup() {
     recognizeElems();
    syncInputToDataContent();
        initEmptyInputs();
        initLinkers();
        initHiders();
        initAddNoteBtns();
    const allSetPrintBtns = document.querySelectorAll('.js-set-print-mode');
    allSetPrintBtns.forEach(btn => {
    btn.addEventListener('input', () => {
        const targetIndex = btn.dataset.setPrintMode;
        printMode = targetIndex;
    });
});
deleteEmptyRows();
adjustBoardRowsizes();
// initfocusHistory();

}

function deleteEmptyRows() {
    deleteEmptyGroups();
    document.querySelectorAll('.board-item-row').forEach(row => {
        const items = row.querySelectorAll('.item');
        if (items.length === 0) {
            row.remove();
        }
    });

}

function initfocusHistory() {
    const allInputs = document.querySelectorAll('.item-element');
    allInputs.forEach(input => {
        input.addEventListener('focus', () => {
            focusHistory.push(input.dataset.itemIndex);
        });
    });
}

function adjustBoardRowsizes() {
    document.querySelectorAll('.board-item-row').forEach(row => {
        const items = Array.from(row.querySelectorAll('.item'));
        row.classList.remove('resizable-row', 'js-items-50', 'js-items-33', 'js-items-25');

        items.forEach(it => it.classList.remove('resizeable', 'resizable'));

        const count = items.length;
        if (count === 0) return;

        items.forEach((it, idx) => {
            if (idx > 1) it.classList.add('resizeable');
        });

        if (count === 2) {
            row.classList.add('resizable-row', 'js-items-40');
        } else if (count === 3) {
            row.classList.add('resizable-row', 'js-items-33');
        } else if (count >= 4) {
            row.classList.add('resizable-row', 'js-items-25');
        }
    });
}

function deleteEmptyGroups() {
    document.querySelectorAll('.group').forEach(group => {
        const groupContent = group.querySelector('.group-content');
        if (groupContent && groupContent.querySelectorAll('.item').length === 0) {
            group.remove();
        }
    });
}

function initAddNoteBtns() {
    const allAddNoteBtns = document.querySelectorAll('.js-add-note-btn');
    allAddNoteBtns.forEach(btn => {
            registerListener(btn, 'click', () => {
                const itemID = btn.id;
                if (itemID === 'add-note') {
                    printMode = 'board';
                } else {
                    const itemIndex = itemID.split('-').pop();
                    printMode = itemIndex;
                    console.log('Set printMode to:', printMode);
                }
            });
        });
    }

// =========== Additional Features ===========

function closeAllToolsMenus() {
    document.querySelectorAll('.tools-container').forEach(menu => {
        menu.classList.add('dn');
        const allFloaties = document.querySelectorAll('.floaty');
        allFloaties.forEach(floaty => floaty.classList.remove('active'));
    });
}


function initLinkers() {
    const linkers = document.querySelectorAll('[data-link]');
    linkers.forEach(linker => {
        linker.addEventListener('click', (e) => {
            const url = linker.dataset.link;
            if (url) {
                window.open(url, '_blank');
                e.preventDefault();
                e.stopPropagation();
            }
        });
    });
}

function initHiders() {
    const hiders = document.querySelectorAll('.hide-part');
    hiders.forEach(hider => {
        hider.addEventListener('click', () => {
            const targetId = hider.dataset.target;
            if (!targetId) return;
            const targetElems = document.querySelectorAll(`.${targetId}`);
            targetElems.forEach(targetElem => {
                targetElem.classList.toggle('dn');
            });
            hider.classList.toggle('active');
        });
    });
}

// Call these after DOM is ready or after dynamic content is added
initLinkers();
initHiders();

function initEmptyInputs() {
    document.querySelectorAll('.item-element').forEach(input => {
        const checkEmpty = () => {
            if (input.value.trim() === '') {
                input.classList.add('empty');
            } else {
                input.classList.remove('empty');
            }
        };
        input.classList.add('empty');
        input.removeEventListener('input', checkEmpty); // Prevent duplicate listeners
        input.addEventListener('input', checkEmpty);
        checkEmpty();
    });
}


initEmptyInputs();


// Sync input value to data-content on keydown
function syncInputToDataContent() {
    registerListener(document, 'keydown', (e) => {
        const activeElement = document.activeElement;
        if (activeElement && activeElement.classList.contains('item-element')) {
            setTimeout(() => {
                activeElement.setAttribute('data-content', activeElement.value);
            }, 0);
        }
    });

    // On DOMContentLoaded, set input value from data-content if present
        document.querySelectorAll('.item-element[data-content]').forEach(input => {
            if (input.dataset.content) {
                input.value = input.dataset.content;
            }
        });
}

// Call the function to enable syncing

// detectors 
// Dynamic bullet/marker detector
const BULLET_MARKERS = [
    { trigger: '-', replace: '• ', mode: 'bullet' },
    { trigger: '*', replace: '• ', mode: 'checklist' },
    { trigger: '>', replace: '➤', mode: 'quote' },
    
    // Add more markers here in the future, e.g. { trigger: '*', replace: '• ' }
];
registerListener(document, 'keydown', (e) => {
    const activeElement = document.activeElement;

    if (
        activeElement &&
        activeElement.classList.contains('item-element')
    ) {
        // Bullet marker on space
        if (e.key === ' ') {
            for (const marker of BULLET_MARKERS) {
                const trimmedValue = activeElement.value.trim();
                if (trimmedValue.endsWith(marker.trigger)) {

                    const cursorPos = activeElement.selectionStart;

                    const before = activeElement.value.substring(0, cursorPos - marker.trigger.length);
                    const after = activeElement.value.substring(cursorPos);
                    activeElement.value = before + marker.replace + after;

                    activeElement.selectionStart = activeElement.selectionEnd = before.length + marker.replace.length;

                    listmode = marker.mode;
                    e.preventDefault();
                    break;
                }
            }
        }
        // Cancel bullet if Enter is pressed and only marker is present
        if (e.key === 'Enter') {
            if (activeElement.value.trim() === '') {
                listmode = '';
                // let other handlers proceed
                return;
            }
            for (const marker of BULLET_MARKERS) {
                if (activeElement.value.trim() === marker.replace.trim()) {
                    activeElement.value = '';
                    listmode = '';
                    e.preventDefault();
                    break;
                }
            }
        }
    }
});



function recognizeElems() {
    const iconInput = document.getElementById('icon-input');
    const addIconBtn = document.querySelector('.add-icon-btn');

    if (iconInput && iconInput.classList.contains('hasIcon')) {
        addIconBtn.classList.add('dn');
    }
}

function addListener(elements, event, handler) {
    if (NodeList.prototype.isPrototypeOf(elements) || Array.isArray(elements)) {
        elements.forEach(element => {
            if (element) element.addEventListener(event, handler);
        });
    } else if (elements) {
        elements.addEventListener(event, handler);
    }
}

document.getElementById('add-note').addEventListener('click', () => {
    printMode = 'board'; // reset back to default
});

function registerListener(target, event, handler, options) {
    target.addEventListener(event, handler, options);
    globalEventListeners.push({ target, event, handler, options });
}


export function reapplyAllEventListeners() {
    globalEventListeners.forEach(({ target, event, handler, options }) => {
        target.removeEventListener(event, handler, options);
        target.addEventListener(event, handler, options);
    });
    // console.log('All global listeners reapplied.');
    // console.log('Total listeners reapplied:', globalEventListeners.length);
    addEventListenerGroup();
} // ensures empty class works correctly



    const observer = new MutationObserver(() => {
        reapplyAllEventListeners();
    });
    observer.observe(document.body, { childList: true, subtree: true });

// setInterval(() => {
//     console.log('Current printMode:', printMode);
// }, 500);



