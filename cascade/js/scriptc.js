const TEXT_TOOLS = {
    'Size': [
        { id: 'title', label: 'Heading 1', class: 'title', icon: 'H1' },
        { id: 'heading2', label: 'Heading 2', class: 'heading2', icon: 'H2' },
        { id: 'heading3', label: 'Heading 3', class: 'heading3', icon: 'H3' },
        { id: 'normal', label: 'Normal', class: 'normal-text', icon: 'T' }
    ],
    'Color': [
        { id: 'default', label: 'Default', class: '' },
        { id: 'red', label: 'Red', class: 'text-rainbow-red' },
        { id: 'blue', label: 'Blue', class: 'text-rainbow-blue' },
        { id: 'green', label: 'Green', class: 'text-rainbow-green' },
        { id: 'yellow', label: 'Yellow', class: 'text-rainbow-yellow' },
        { id: 'purple', label: 'Purple', class: 'text-rainbow-purple' },
        { id: 'orange', label: 'Orange', class: 'text-rainbow-orange' },
        { id: 'pink', label: 'Pink', class: 'text-rainbow-pink' }
    ],
    'Alignments': [
        { id: 'left', label: 'Left', class: 'text-left', icon: 'L' },
        { id: 'center', label: 'Center', class: 'text-center', icon: 'C' },
        { id: 'right', label: 'Right', class: 'text-right', icon: 'R' }
    ]
};

const boardItemsSection = document.getElementById('boardItems');

// create items
function createTextItem(type = 'normal-text') {
    const itemDivRow = document.createElement('div');
    itemDivRow.className = 'board-item-row';

    const itemDiv = document.createElement('div');
    itemDiv.className = 'item';

    const itemIndex = document.querySelectorAll('.item').length + 1;
    itemDivRow.id = `item-row-${itemIndex}`;

    const input = document.createElement('input');
    input.type = 'text';
    input.id = `item-input-${itemIndex}`;
    input.className = `simple item-element ${type || 'normal-text'}`;
    input.placeholder = type === 'title' ? 'Title' : 'Type something...';
    input.dataset.itemIndex = itemIndex;
    input.autocomplete = 'off';

    const floaty = createFloaty(itemIndex, 'edit');

    itemDiv.appendChild(floaty);
    itemDiv.appendChild(input);
    itemDivRow.appendChild(itemDiv);
    boardItemsSection.appendChild(itemDivRow);
}

// create floaty edit button
function createFloaty(itemIndex, action) {
    const floaty = document.createElement('div');
    floaty.className = 'floaty right edit';
    floaty.innerHTML = '<img src="icons/edit.png" alt="edit" class="icono gray icon small">';

    floaty.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllToolsMenus();

        let existing = floaty.querySelector('.tools-container');
        if (existing) {
            existing.classList.toggle('dn');
            return;
        }

        const toolsMenu = openConElemTools(TEXT_TOOLS, itemIndex);
        floaty.appendChild(toolsMenu);
        requestAnimationFrame(() => toolsMenu.classList.remove('dn'));
    });

    return floaty;
}

// build tools menu
function openConElemTools(tools, itemIndex) {
    const toolsContainer = document.createElement('div');
    toolsContainer.className = 'tools-container dn';

    const toolsDiv = document.createElement('div');
    toolsDiv.className = 'tools taboff';

    Object.entries(tools).forEach(([sectionName, sectionItems]) => {
        const sectionHTML = [`<div class="section-title conelem"><span>${sectionName}</span></div>`];
        sectionItems.forEach(tool => {
            sectionHTML.push(genColElement(tool.icon, tool.label, tool.class, itemIndex, sectionName));
        });
        toolsDiv.innerHTML += sectionHTML.join('');
    });

    toolsContainer.appendChild(toolsDiv);
    return toolsContainer;
}

// single tool button
function genColElement(icon, label, colorClass, itemIndex, sectionName) {
    return `
        <div class="conelem profile hover js-trigger-action" 
             data-action="${sectionName}" 
             data-value="${colorClass}" 
             data-item="${itemIndex}">
            <span class="letter small">${icon}</span>
            <span class="fx-full">${label}</span>
        </div>`;
}

// event delegation for all actions
document.addEventListener('click', (e) => {
    const trigger = e.target.closest('.js-trigger-action');
    if (trigger) {
        const action = trigger.dataset.action;
        const value = trigger.dataset.value;
        const itemIndex = trigger.dataset.item;

        if (action === 'Size') changeTextSize(itemIndex, value);
        if (action === 'Color') changeTextColor(itemIndex, value);
        if (action === 'Alignments') changeTextAlignment(itemIndex, value);

        closeAllToolsMenus();
    } else {
        console.warn(`Input with index ${itemIndex} not found.`);
    }

    if (!e.target.closest('.floaty') && !e.target.closest('.tools-container')) {
        closeAllToolsMenus();
    }
});

// helpers
function closeAllToolsMenus() {
    document.querySelectorAll('.tools-container').forEach(menu => {
        menu.classList.add('dn');
    });
}

function forEachAddEvent(selector, event, handler) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
        el.addEventListener(event, handler);
    });
}

// change functions
function changeTextSize(itemIndex, sizeClass) {
    const input = document.getElementById(`item-input-${itemIndex}`);
    if (input) {
        TEXT_TOOLS['Size'].forEach(s => input.classList.remove(s.class));
        if (sizeClass) input.classList.add(sizeClass);
    } else {
        console.warn(`Input with index ${itemIndex} not found.`);
    }
}


function changeTextColor(itemIndex, colorClass) {
    const input = document.getElementById(`item-input-${itemIndex}`);
    if (input) {
        TEXT_TOOLS['Color'].forEach(c => input.classList.remove(c.class));
        if (colorClass) input.classList.add(colorClass);
    } else {
        console.warn(`Input with index ${itemIndex} not found.`);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const input = document.querySelector(`[data-item="1"]`);
        input.classList.add('text-rainbow-red');
    
});

function changeTextAlignment(itemIndex, alignClass) {
    const input = document.getElementById(`item-input-${itemIndex}`);
    if (input) {
        TEXT_TOOLS['Alignments'].forEach(a => input.classList.remove(a.class));
        if (alignClass) input.classList.add(alignClass);
    }
}

// new item logic
document.addEventListener('click', (e) => {
    const activeInput = document.activeElement;
    const allInputs = Array.from(document.querySelectorAll('.item-element'));
    const lastInput = allInputs[allInputs.length - 1];
    if (!lastInput) return;

    const rect = lastInput.getBoundingClientRect();
    const clickY = e.clientY;
    const belowLast = clickY > rect.bottom;

    if (belowLast && !e.target.closest('.floaty') && !e.target.closest('.tools-container') && lastInput.value.trim() !== '') {
        if (activeInput && activeInput === lastInput) return;
        createTextItem();
    }
});

// Enter + Backspace shortcuts
document.addEventListener('keydown', (e) => {
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
            activeElement.value.trim() === '' &&
            allInputs.length > 1
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

// load default title
window.addEventListener('load', () => {
    createTextItem('title');
});

