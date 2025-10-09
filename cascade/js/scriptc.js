document.addEventListener('DOMContentLoaded', () => {
    const TEXT_TOOLS = {
        'Size': [
            { id: 'title', label: 'Heading 1', class: 'title', icon: 'H1' },
            { id: 'heading2', label: 'Heading 2', class: 'heading2', icon: 'H2' },
            { id: 'heading3', label: 'Heading 3', class: 'heading3', icon: 'H3' },
            { id: 'normal', label: 'Normal', class: 'normal-text', icon: 'T' }
        ],
        'Color': [
            { id: 'default', label: 'Default', class: '', icon: 'A' },
            { id: 'red', label: 'Red', class: 'text-rainbow-red', icon: 'A' },
            { id: 'blue', label: 'Blue', class: 'text-rainbow-blue', icon: 'A' },
            { id: 'green', label: 'Green', class: 'text-rainbow-green', icon: 'A' },
            { id: 'yellow', label: 'Yellow', class: 'text-rainbow-yellow', icon: 'A' },
            { id: 'purple', label: 'Purple', class: 'text-rainbow-purple', icon: 'A' },
            { id: 'orange', label: 'Orange', class: 'text-rainbow-orange', icon: 'A' },
            { id: 'pink', label: 'Pink', class: 'text-rainbow-pink', icon: 'A' }
        ],
        'Alignments': [
            { id: 'left', label: 'Left', class: 'text-left', icon: 'L' },
            { id: 'center', label: 'Center', class: 'text-center', icon: 'C' },
            { id: 'right', label: 'Right', class: 'text-right', icon: 'R' }
        ]
    };


    const ADD_BLOCKS = {
        'Note Block': [
            { id: 'note', icon: '▼', class: 'note-block', label: 'Drop down' },
            { id: 'checklist', icon: '☐', class: 'checklist-block', label: 'Checklist' }
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

    const boardItemsSection = document.getElementById('boardItems');

    // load initial item
    createTextItem('title');

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
        floaty.className = 'floaty right edit js-uni-tools';
        floaty.innerHTML = '<img src="icons/edit.png" alt="edit" class="icono gray icon small">';
        floaty.dataset.item = itemIndex;
        return floaty;
    }

    // Build tools menu
    function openConElemTools(tools, itemIndex) {
        const toolsContainer = document.createElement('div');
        toolsContainer.className = 'tools-container dn';

        const toolsDiv = document.createElement('div');
        toolsDiv.className = 'tools taboff';

        Object.entries(tools).forEach(([sectionName, sectionItems]) => {
            const sectionHTML = [`<div class="section-title conelem"><span>${sectionName}</span></div>`];
            sectionItems.forEach(tool => {
                sectionHTML.push(genColElement( icon = tool.icon, img = tool.img, label = tool.label, colorClass = tool.class, itemIndex = itemIndex, tool.action ? tool.action : sectionName ));
            });
            toolsDiv.innerHTML += sectionHTML.join('');
        });

        toolsContainer.appendChild(toolsDiv);
        return toolsContainer;
    }

    // Single tool button
    function genColElement(icon, img, label, colorClass, itemIndex, sectionName) {
        const iconHtml = img ? `<img src="${img}" alt="${label}" class="icono icon small">` : `<span class="letter small">${icon}</span>`;
        return `
            <div class="conelem profile hover js-trigger-action" 
                 data-action="${sectionName}" 
                 data-value="${colorClass}" 
                 data-item="${itemIndex}">
                ${iconHtml}
                <span class="fx-full">${label}</span>
            </div>`;
    }

    // Event delegation for floaty (edit) button clicks
    document.addEventListener('click', (e) => {
        const floaty = e.target.closest('.js-uni-tools');
        if (floaty) {
            e.stopPropagation();
            closeAllToolsMenus();

            const itemIndex = floaty.dataset.item;
            let existing = floaty.querySelector('.tools-container');
            if (existing) {
                existing.classList.toggle('dn');
                return;
            }

            if (floaty.classList.contains('edit')) {
                const toolsMenu = openConElemTools(TEXT_TOOLS, itemIndex);
                floaty.appendChild(toolsMenu);
                requestAnimationFrame(() => toolsMenu.classList.remove('dn'));
            }

            if (floaty.classList.contains('add')) {
                const toolsMenu = openConElemTools(ADD_BLOCKS, itemIndex);
                floaty.appendChild(toolsMenu);
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

        if (action === 'link') {
            promptForLink();
        }



        if (action === 'yotube') {
            alert('YouTube embed feature coming soon!');
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

    function changeTextAlignment(itemIndex, alignClass) {
        const input = document.getElementById(`item-input-${itemIndex}`);
        if (!input) return;
        TEXT_TOOLS['Alignments'].forEach(a => input.classList.remove(a.class));
        if (alignClass) input.classList.add(alignClass);
    }

    // Add new item when clicking below last input
    document.addEventListener('click', (e) => {
        const activeInput = document.activeElement;
        const allInputs = Array.from(document.querySelectorAll('.item-element'));
        const lastInput = allInputs[allInputs.length - 1];
        if (!lastInput) return;

        if (lastInput.classList.contains('nAvoid')) return;

        const rect = lastInput.getBoundingClientRect();
        const clickY = e.clientY;
        const belowLast = clickY > rect.bottom;

        if (belowLast && !e.target.closest('.floaty') && !e.target.closest('.tools-container') && lastInput.value.trim() !== '' && !e.target.classList.contains('nAvoid')) {
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
});


document.addEventListener('click', (e) => {
    if (!e.target.closest('.js-uni-tools') && !e.target.closest('.tools-container')) {
        closeAllToolsMenus();
    }
});


function closeAllToolsMenus() {
    document.querySelectorAll('.tools-container').forEach(menu => {
        menu.classList.add('dn');
    });
}



// prompters 
function promptForLink(container = document.getElementById('boardItems')) {
  const row = document.createElement('div');
  row.className = 'board-item-row';
  container.appendChild(row);


  const prompt = (placeholder, btnText, next) => {
    row.innerHTML = `
      <div class="await">
        <input type="text" class="prompt-input" placeholder="${placeholder}">
        <button class="go">${btnText}</button>
      </div>`;
    const input = row.querySelector('.prompt-input');
    row.querySelector('.go').onclick = () => {
      const val = input.value.trim();
      if (!val) return alert('Please enter something.');
      next(val);
    };
    input.focus();
  };

  let link = '';
  prompt('Type or paste link...', 'Next', val => {
    link = val;
    prompt('Enter a name for the link...', 'Save', name => {
      const a = Object.assign(document.createElement('a'), {
        href: link,
        textContent: name,
        target: '_blank',
        className: 'board-link'
      });
      const linkRow = Object.assign(document.createElement('div'), {
        className: 'board-item-row'
      });
      linkRow.appendChild(a);
        linkRow.appendChild(floaty);
      container.appendChild(linkRow);
      row.remove();
    });
  });
}

