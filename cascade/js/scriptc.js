
let printMode = 'board'; // or 'page'
let listmode = ''; // or 'numbered'
const boardItemsSection = document.getElementById('boardItems');

let covers = [
'covers/cover1.jpg',
'covers/cover2.png',
];

let randomIcons = [
'🏞️', '📘', '📗', '📕', '📒', '📓', '📔', '📚', '🖼️', '🎨', '🎭', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🪕', '🎻', '📷', '📹', '🎥', '📺', '💻', '🖥️', '🖨️', '⌨️', '🖱️', '🖲️', '💡', '🔦', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️'
]
document.addEventListener('DOMContentLoaded', () => {

    const DEFAULT = {
        'settings': [
            { id: 'delete', icon: '🗑️', class: 'delete', label: 'Delete', action: 'delete' }
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
            { id: 'checklist', icon: '☐', class: 'checklist-block', label: 'Checklist', action: 'checklist', drop: true },
        ],
        'Note Block': [
            { id: 'separator', icon: '─', class: 'separator', label: 'Separator', action: 'separator' },
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
            { id: 'checklist', icon: '☐', class: 'checklist-block', label: 'Checklist', action: 'checklist' },
        ],
        'Note Block': [
            { id: 'separator', icon: '─', class: 'separator', label: 'Separator', action: 'separator' },
            { id: 'note', icon: '▼', class: 'note-block', label: 'Drop down' , action: 'dropdown' },
            { id: 'section', icon: '▢', class: 'section-block', label: 'Section' , action: 'section' },
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

        createTextItem('title');
    function createRow(itemIndex) {
        const itemDivRow = document.createElement('div');
        itemDivRow.className = `board-item-row js-drop-content-${itemIndex}`;
        itemDivRow.id = `item-row-${itemIndex}`;

        if (printMode === 'board') {
            const floaty = createAddToRowFloaty(itemIndex);
            itemDivRow.appendChild(floaty);
        }
        return itemDivRow;
    }




    // create items
    function createTextItem(type = 'normal-text', toBoard = true) {
        const itemIndex = document.querySelectorAll('.item').length + 1;
        const itemDivRow = createRow(itemIndex);

        const itemDiv = document.createElement('div');
        itemDiv.className = 'item';

        itemDivRow.id = `item-row-${itemIndex}`;

        const input = document.createElement('input');
        input.type = 'text';
        input.id = `item-input-${itemIndex}`;
        input.className = `simple item-element fx-full ${type || 'normal-text'}`;
        input.placeholder = type === 'title' ? 'Title' : 'Type something...';
        input.dataset.itemIndex = itemIndex;
        input.autocomplete = 'off';

        input.value = checkList();

        const floaty = createFloaty(itemIndex, 'edit');

        itemDiv.appendChild(floaty);
        itemDiv.appendChild(input);
        itemDivRow.appendChild(itemDiv);
        appendItemToBoard(itemDivRow);
        initEmptyInputs(); // Ensure new inputs are initialized
     }

     function checkList() {
        if (listmode === 'dash') {
            return '- ';
        } else if (listmode === 'bullet') {
            return '• ';
        } else if (listmode === 'numbered') {
            
        } else {
            return '';
        }
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

        holder.appendChild(checkbox);
        holder.appendChild(input);

        const floaty = createFloaty(itemIndex, 'edit');
        itemDiv.appendChild(floaty);
        itemDiv.appendChild(holder);

        itemDivRow.appendChild(itemDiv);
        appendItemToBoard(itemDivRow);
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
        const itemDivRow = document.createElement('div');
        itemDivRow.className = 'board-item-row';
        itemDivRow.innerHTML = `
                    <div class="item">
                    </div>`;

                    
        const itemIndex = document.querySelectorAll('.item').length + 1;
        itemDivRow.id = `item-row-${itemIndex}`;
        const floaty = createFloaty(itemIndex, 'simple');
        const itemDiv = itemDivRow.querySelector('.item');
        itemDiv.appendChild(floaty);
        appendItemToBoard(itemDivRow); 

        const hr = document.createElement('hr');
        itemDivRow.querySelector('.item').appendChild(hr);
        }

     
function createAnchorTextItem(type = 'normal-text', link = '#', name = '') {
        const itemDivRow = document.createElement('div');
        itemDivRow.className = 'board-item-row';

        const itemDiv = document.createElement('div');
        itemDiv.className = 'item';

        const itemIndex = document.querySelectorAll('.item').length + 1;
        itemDivRow.id = `item-row-${itemIndex}`;

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

        const floaty = createFloaty(itemIndex, 'anchor');

        itemDiv.appendChild(floaty);
        itemDiv.appendChild(input);
        itemDivRow.appendChild(itemDiv);
        appendItemToBoard(itemDivRow);
        syncInputToDataContent();
     }


// prompters 
function promptForLink(container = document.getElementById('boardItems')) {
    const row = document.createElement('div');
    row.className = 'board-item-row';
    appendItemToBoard(row);


    const removePrompt = () => row.remove();

    const prompt = (placeholder, btnText, next) => {
        row.innerHTML = `
            <div class="await">
                <input type="text" class="prompt-input" placeholder="${placeholder}">
                <button class="go btn-sm">${btnText}</button>
                <button class="cancel btn-sm">🗑️</button>
            </div>`;
        const input = row.querySelector('.prompt-input');
        row.querySelector('.go').onclick = () => {
            const val = input.value.trim();
            if (!val) return alert('Please enter something.');
            next(val);
        };
        row.querySelector('.cancel').onclick = removePrompt;
        input.focus();
    };

    let link = '';
    prompt('Type or paste link...', '➔', val => {
        link = val;
        prompt('Enter a name for the link...', 'Save', name => {
            removePrompt();
            createAnchorTextItem('link', link, name);
            syncInputToDataContent();
        });
    });
}

    function createResizeable(index) {
        const sizable = document.createElement('div');
        sizable.className = 'resizable';
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


    // Single tool button
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
    const index = document.querySelectorAll('.item').length + 1;

    const itemDivRow = createRow(index);

    itemDivRow.innerHTML = `
        <div class="dropdown item fl-c g-5" id="item-${index}">
            <div class="drop-name fl-r g-5 fx-full">
                <img src="icons/dropdown.png" alt="dropdown" data-target="dd-hide-${index}" class="hide-part icono gray icon drop-icon btn-space hover" />
                <input type="text" class="drop-input item-element simple heading3" placeholder="Name" />
            </div>
            <div class="drop-content dd-hide-${index} js-drop-content-${index}" id="drop-content-${index}"></div>
            <div class="js-add-note-btn addNote js-uni-tools add-drop nAvoid dd-hide-${index}" id="add-dropdown-${index}">
                <img src="icons/add.png" alt="add" class="icono gray icon small">
            </div>
        </div>
    `;

    appendItemToBoard(itemDivRow);
}

// function createSectionItem() {
//     const index = document.querySelectorAll('.item').length + 1;
    
//     const itemDivRow = document.createElement('div');
//     itemDivRow.className = 'board-item-row';    


// }

    

    // Event delegation for floaty (edit) button clicks
    document.addEventListener('click', (e) => {
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
    document.addEventListener('click', (e) => {
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
        if (action === 'delete') {
            const row = document.getElementById(`item-row-${itemIndex}`);
            if (row) row.remove();
        }

        if (action === 'separator') {
            createSeparator();
        }

        if (action === 'checklist') {
            createCheckListItem();
        }

        if (action === 'link') {
            promptForLink();
        }

        if (action === 'dropdown') {
            createDropdown();
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
    document.addEventListener('click', (e) => {
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
    document.addEventListener('keydown', (e) => {
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

        if (activeElementInput.scrollWidth > activeElementInput.clientWidth) {
            createNewIdenticalInput();
        }


        if (e.key === 'Enter') {
            const activeElement = document.activeElement;
            if (activeElement && activeElement.classList.contains('item-element') && activeElement.value.trim() !== '') {
                e.preventDefault();
                createTextItem();
                const allInputs = document.querySelectorAll('.item-element');
                allInputs[allInputs.length - 1].focus();
            }
        }

        if (e.key === 'Backspace') {
            const activeElement = document.activeElement;
            const allInputs = document.querySelectorAll('.item-element');
            if (
                activeElement &&
                activeElement.classList.contains('item-element') &&
                activeElement.value.trim() === ''
            ) {
                e.preventDefault();
                const parentRow = activeElement.closest('.board-item-row');
                if (parentRow) {
                    const inputIndex = Array.from(allInputs).indexOf(activeElement);
                    parentRow.remove();
                    const updatedInputs = document.querySelectorAll('.item-element');
                    if (updatedInputs.length > inputIndex) {
                        updatedInputs[inputIndex].focus();
                    } else if (updatedInputs.length > 0) {
                        updatedInputs[updatedInputs.length - 1].focus();
                    }
                }
            }
        }
    });


    // icons stuff

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


    const addIconBtn = document.querySelector('.add-icon-btn');
    if (addIconBtn) {
        addIconBtn.addEventListener('click', () => {
            addIcon();
        });
    }


});

     function appendItemToBoard(itemDivRow) {
        if (printMode != 'board') {
            const dropdownContent = document.querySelector(`.js-drop-content-${printMode}`);
            if (dropdownContent) {
                dropdownContent.appendChild(itemDivRow);
            } else {
                boardItemsSection.appendChild(itemDivRow);
            }
        } else {
            boardItemsSection.appendChild(itemDivRow);
        }
    } 

// =========== Additional Features ===========

document.addEventListener('click', (e) => {
        addEventListenerGroup();
    if (!e.target.closest('.js-uni-tools') && !e.target.closest('.tools-container')) {
        closeAllToolsMenus();
    }
});



function addEventListenerGroup() {
     recognizeElems();
    syncInputToDataContent();
        initEmptyInputs();
        initLinkers();
        initHiders();
        initAddNoteBtns();

}

function initItemBoardSized(index) {
    
}

function initAddNoteBtns() {
    const allAddNoteBtns = document.querySelectorAll('.js-add-note-btn');
    allAddNoteBtns.forEach(btn => {
            btn.addEventListener('click', () => {
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



function addCover(imgUrl) {
  const coverElem = document.querySelector('.cover');

  imgUrl = imgUrl || covers[Math.floor(Math.random() * covers.length)];

  if (coverElem) {
    coverElem.style.backgroundImage = `url('${imgUrl}')`;
  }
}

const coverBtn = document.querySelector('.add-cover-btn');
if (coverBtn) {
    coverBtn.addEventListener('click', () => addCover());
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
    document.addEventListener('keydown', (e) => {
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
    // Add more markers here in the future, e.g. { trigger: '*', replace: '• ' }
];
document.addEventListener('keydown', (e) => {
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
                    // Remove the marker and insert the bullet
                    const cursorPos = activeElement.selectionStart;
                    // Remove marker from value before cursor
                    const before = activeElement.value.substring(0, cursorPos - marker.trigger.length);
                    const after = activeElement.value.substring(cursorPos);
                    activeElement.value = before + marker.replace + after;
                    // Set cursor after bullet
                    activeElement.selectionStart = activeElement.selectionEnd = before.length + marker.replace.length;
                    // Switch listmode to corresponding
                    listmode = marker.mode;
                    e.preventDefault();
                    break;
                }
            }
        }
        // Cancel bullet if Enter is pressed and only marker is present
        if (e.key === 'Enter') {
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



