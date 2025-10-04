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
    
    // Create floaty edit button
    const floaty = document.createElement('div');
    floaty.className = 'floaty right edit';
    floaty.innerHTML = '<img src="icons/edit.png" alt="edit" class="icono gray icon small">';
    
    // Add click handler for edit button
    floaty.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleToolsMenu(itemIndex, floaty);
    });
    
    itemDiv.appendChild(input);
    itemDiv.appendChild(floaty);
    itemDivRow.appendChild(itemDiv);
    
    boardItemsSection.appendChild(itemDivRow);
}

function toolsMenuHTML(itemIndex) {
    const toolsContainer = document.createElement('div');
    toolsContainer.className = 'tools-container';
    toolsContainer.id = `tools-${itemIndex}`;
    
    const toolsDiv = document.createElement('div');
    toolsDiv.className = 'tools';

    const alignmentsSection = generateToolSection('Alignment', TEXT_TOOLS.alignments, (alignObj) => {
        return `
            <div class="conelem profile hover" data-action="changeAlignment" data-value="${alignObj.class}" data-item="${itemIndex}">
                <span class="letter small">${alignObj.icon}</span>
                <span class="fx-full">${alignObj.label}</span>
            </div>
        `;
    });
    // Generate sizes section
    const sizesSection = generateToolSection('Font Size', TEXT_TOOLS.sizes, (sizeObj) => {
        return `
            <div class="conelem profile hover" data-action="changeSize" data-value="${sizeObj.class}" data-item="${itemIndex}">
                <span class="letter small">${sizeObj.icon}</span>
                <span class="fx-full">${sizeObj.label}</span>
            </div>
        `;
    });
    
    // Generate colors section
    const colorsSection = generateToolSection('Color', TEXT_TOOLS.colors, (colorObj) => {
        return `
            <div class="conelem profile hover" data-action="changeColor" data-value="${colorObj.class}" data-item="${itemIndex}">
                <span class="letter small">C</span>
                <span class="fx-full ${colorObj.class}">${colorObj.label}</span>
            </div>
        `;
    });
    
    toolsDiv.innerHTML =  sizesSection + alignmentsSection + colorsSection  ;
    
    // Attach event listeners to all action buttons
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
                // Future feature: change text alignment
            }
            
            // Close menu after action
            closeAllToolsMenus();
        });
    });
    
    toolsContainer.appendChild(toolsDiv);
    return toolsContainer;
}

// Helper function to generate a tool section dynamically
function generateToolSection(title, items, itemTemplate) {
    let html = `<div class="section-title conelem"><span>${title}</span></div>`;
    items.forEach(item => {
        html += itemTemplate(item);
    });
    return html;
}

// Toggle tools menu visibility
function toggleToolsMenu(itemIndex, floatyElement) {
    // Close other open menus first
    closeAllToolsMenus();
    
    // Check if menu already exists
    let existingTools = floatyElement.querySelector('.tools-container');
    
    if (existingTools) {
        // Toggle visibility
        const toolsDiv = existingTools.querySelector('.tools');
        if (toolsDiv.style.display === 'flex') {
            toolsDiv.style.display = 'none';
        } else {
            toolsDiv.style.display = 'flex';
        }
    } else {
        // Create new menu
        const toolsMenu = toolsMenuHTML(itemIndex);
        floatyElement.appendChild(toolsMenu);
        const toolsDiv = toolsMenu.querySelector('.tools');
        toolsDiv.style.display = 'flex';
    }
}

// Close all open tools menus
function closeAllToolsMenus() {
    document.querySelectorAll('.tools').forEach(tool => {
        tool.style.display = 'none';
    });
}

function changeTextAlignment(itemIndex, alignClass) {
    const item = document.getElementById(`item-${itemIndex}`);
    if (item) {
        // Remove all alignment classes
        TEXT_TOOLS.alignments.forEach(align => {
            item.style.textAlign = '';
        });

        // Add new alignment class
        if (alignClass) {
            item.style.textAlign = alignClass;
        }
    }
}

// Change text size
function changeTextSize(itemIndex, sizeClass) {
    const item = document.getElementById(`item-${itemIndex}`);
    if (item) {
        // Remove all size classes
        TEXT_TOOLS.sizes.forEach(size => {
            item.classList.remove(size.class);
        });
        
        // Add new size class
        if (sizeClass) {
            item.classList.add(sizeClass);
        }
    }
}

// Change text color
function changeTextColor(itemIndex, colorClass) {
    const item = document.getElementById(`item-${itemIndex}`);
    if (item) {
        // Remove all color classes
        TEXT_TOOLS.colors.forEach(color => {
            if (color.class) {
                item.classList.remove(color.class);
            }
        });
        
        // Add new color class
        if (colorClass) {
            item.classList.add(colorClass);
        }
    }
}

// Close menus when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.floaty') && !e.target.closest('.tools')) {
        closeAllToolsMenus();
    }
});

window.addEventListener('load', () => {
    createTextItem('title');
});

// Expose functions for debugging/external use
window.CASCADE = {
    createTextItem,
    changeTextSize,
    changeTextColor,
    TEXT_TOOLS
};

// Create new normal text input when clicking below an unfocused input
document.addEventListener('click', (e) => {
    const activeInput = document.activeElement;
    const allInputs = Array.from(document.querySelectorAll('.item-element'));
    
    // Find the last input (lowest one visually)
    const lastInput = allInputs[allInputs.length - 1];
    if (!lastInput) return;

    const rect = lastInput.getBoundingClientRect();
    const clickY = e.clientY;
    const belowLast = clickY > rect.bottom;

    // If user clicks below last input AND not on any tool or floaty
    if (belowLast && !e.target.closest('.floaty') && !e.target.closest('.tools') && lastInput.value.trim() !== '') {
        // Prevent duplicates if last one is still focused
        if (activeInput && activeInput === lastInput) return;
        createTextItem();
    }
});
