const TEXT_TOOLS = {
    sizes: [
        { id: 'title', label: 'Heading 1', class: 'title', icon: 'H1' },
        { id: 'heading2', label: 'Heading 2', class: 'heading2', icon: 'H2' },
        { id: 'heading3', label: 'Heading 3', class: 'heading3', icon: 'H3' },
        { id: 'normal', label: 'Normal', class: 'normal-text', icon: 'T' }
    ],
    colors: [
        { id: 'default', label: 'Default', class: '' },
        { id: 'red', label: 'Red', class: 'text-rainbow-red' },
        { id: 'blue', label: 'Blue', class: 'text-rainbow-blue' },
        { id: 'green', label: 'Green', class: 'text-rainbow-green' },
        { id: 'yellow', label: 'Yellow', class: 'text-rainbow-yellow' },
        { id: 'purple', label: 'Purple', class: 'text-rainbow-purple' },
        { id: 'orange', label: 'Orange', class: 'text-rainbow-orange' },
        { id: 'pink', label: 'Pink', class: 'text-rainbow-pink' }
    ],
    alignments: [
        { id: 'left', label: 'Left', class: 'text-left', icon: 'L' },
        { id: 'center', label: 'Center', class: 'text-center', icon: 'C' },
        { id: 'right', label: 'Right', class: 'text-right', icon: 'R' }
    ]
};

const NOTE_TOOLS = {
    embeds: [
        {
            img: 'icons/image.png',
            label: 'Google',
            action: 'Google Drive'
        }
    ]
} ;


const boardItemsSection = document.getElementById('boardItems');

function createTextItem(type) {
    const itemDivRow = document.createElement('div');
    itemDivRow.className = 'board-item-row';
    
    const itemDiv = document.createElement('div');
    itemDiv.className = 'item';
    
    const itemIndex = document.querySelectorAll('.item').length + 1;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.id = `item-${itemIndex}`;
    input.className = `simple item-element ${type || 'normal-text'}`;
    input.placeholder = type === 'title' ? 'Board name' : 'Type something...';
    input.dataset.itemIndex = itemIndex;
    input.autocomplete = 'off';
    
    const floaty = document.createElement('div');
    floaty.className = 'floaty right edit';
    floaty.innerHTML = '<img src="icons/edit.png" alt="edit" class="icono gray icon small">';
    
    floaty.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleToolsMenu(itemIndex, floaty);
    });
    
    itemDiv.appendChild(floaty);
    itemDiv.appendChild(input);
    itemDivRow.appendChild(itemDiv);
    
    boardItemsSection.appendChild(itemDivRow);
}

function removeLastTextItem() {
    const allRows = document.querySelectorAll('.board-item-row');
    if (allRows.length > 0) {
        const lastRow = allRows[allRows.length - 1];
        lastRow.parentNode.removeChild(lastRow);
    }
}

function toolsMenuHTML(itemIndex) {
    const toolsContainer = document.createElement('div');
    toolsContainer.className = 'tools-container dn';
    toolsContainer.id = `tools-${itemIndex}`;
    
    const toolsDiv = document.createElement('div');
    toolsDiv.className = 'tools taboff';


    toolsDiv.innerHTML = '<div class="cursor-ui-helper"></div>';
    const alignmentsSection = generateToolSection('Alignment', TEXT_TOOLS.alignments, (alignObj) => {
        return `
            <div class="conelem profile hover" data-action="changeAlignment" data-value="${alignObj.class}" data-item="${itemIndex}">
                <span class="letter small">${alignObj.icon}</span>
                <span class="fx-full">${alignObj.label}</span>
            </div>
        `;
    });
    
    const sizesSection = generateToolSection('Font Size', TEXT_TOOLS.sizes, (sizeObj) => {
        return `
            <div class="conelem profile hover" data-action="changeSize" data-value="${sizeObj.class}" data-item="${itemIndex}">
                <span class="letter small">${sizeObj.icon}</span>
                <span class="fx-full">${sizeObj.label}</span>
            </div>
        `;
    });
    
    const colorsSection = generateToolSection('Color', TEXT_TOOLS.colors, (colorObj) => {
        return `
            <div class="conelem profile hover" data-action="changeColor" data-value="${colorObj.class}" data-item="${itemIndex}">
                <span class="letter small">C</span>
                <span class="fx-full ${colorObj.class}">${colorObj.label}</span>
            </div>
        `;
    });
    
    toolsDiv.innerHTML += sizesSection + alignmentsSection + colorsSection;
    
    toolsDiv.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = btn.dataset.action;
            const value = btn.dataset.value;
            const itemIdx = btn.dataset.item;
            
            if (action === 'changeSize') {
                changeTextSize(itemIdx, value);
            } else if (action === 'changeColor') {
                changeTextColor(itemIdx, value);
            } else if (action === 'changeAlignment') {
                changeTextAlignment(itemIdx, value);
            }
            
            closeAllToolsMenus();
        });
    });
    
    toolsContainer.appendChild(toolsDiv);
    return toolsContainer;
}

function generateToolSection(title, items, itemTemplate) {
    let html = `<div class="section-title conelem"><span>${title}</span></div>`;
    items.forEach(item => {
        html += itemTemplate(item);
    });
    return html;
}

// ✅ FIXED SECTION — Proper toggle logic using .dn
function toggleToolsMenu(itemIndex, floatyElement) {
    closeAllToolsMenus();

    let existingTools = floatyElement.querySelector('.tools-container');
    if (existingTools) {
        existingTools.classList.toggle('dn');
    } else {
        const toolsMenu = toolsMenuHTML(itemIndex);
        floatyElement.appendChild(toolsMenu);
        requestAnimationFrame(() => {
            toolsMenu.classList.remove('dn');
        });
    }
}

function closeAllToolsMenus() {
    document.querySelectorAll('.tools-container').forEach(menu => {
        menu.classList.add('dn');
    });
}

// Close menus when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.floaty') && !e.target.closest('.tools-container')) {
        closeAllToolsMenus();
    }
});

function changeTextAlignment(itemIndex, alignClass) {
    const item = document.getElementById(`item-${itemIndex}`);
    if (item) {
        TEXT_TOOLS.alignments.forEach(align => {
            item.classList.remove(align.class);
        });
        if (alignClass) item.classList.add(alignClass);
    }
    closeAllToolsMenus();
}

function changeTextSize(itemIndex, sizeClass) {
    const item = document.getElementById(`item-${itemIndex}`);
    if (item) {
        TEXT_TOOLS.sizes.forEach(size => {
            item.classList.remove(size.class);
        });
        if (sizeClass) item.classList.add(sizeClass);
    }
    closeAllToolsMenus();
}

function changeTextColor(itemIndex, colorClass) {
    const item = document.getElementById(`item-${itemIndex}`);
    if (item) {
        TEXT_TOOLS.colors.forEach(color => {
            if (color.class) item.classList.remove(color.class);
        });
        if (colorClass) item.classList.add(colorClass);
    }
    closeAllToolsMenus(); 
}

window.addEventListener('load', () => {
    createTextItem('title');
});

window.CASCADE = {
    createTextItem,
    changeTextSize,
    changeTextColor,
    TEXT_TOOLS
};

// Create new normal text input when clicking below last input
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

// Enter = new item, Backspace = delete empty item
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const activeElement = document.activeElement;
        if (activeElement && activeElement.classList.contains('item-element') && activeElement.value.trim() !== '') {
            e.preventDefault();
            createTextItem();
            const allInputs = document.querySelectorAll('.item-element');
            const lastInput = allInputs[allInputs.length - 1];
            if (lastInput) lastInput.focus();
        }
    }

    if (e.key === 'Backspace') {
        const activeElement = document.activeElement;
        const allInputs = document.querySelectorAll('.item');
        if (
            activeElement &&
            activeElement.classList.contains('item-element') &&
            activeElement.value.trim() === '' &&
            allInputs.length > 1
        ) {
            e.preventDefault();
            removeLastTextItem();
            const updatedInputs = document.querySelectorAll('.item-element');
            const lastInput = updatedInputs[updatedInputs.length - 1];
            if (lastInput) lastInput.focus();
        }
    }
});
