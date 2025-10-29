export let CASCADE_HTMLS = {
    new: `
    <div class="board-content">
            <div class="cover">
               <div class="cover-icon op5-hover js-uni-tools edit-icon" id="change-icon">
                  <input type="text" class="simple dn" id="icon-input" maxlength="1" readonly="" value="">
               </div>
               <div class="cover-settings">
                  <div class="btn-set add-cover-btn gray">
                     <span>Add cover</span>
                  </div>
                  <div class="btn-set gray add-icon-btn">
                     <span>Add Icon</span>
                  </div>
                  <div class="btn-set">
                     <span>•••</span>
                  </div>
               </div>
            </div>
            <div class="board-items" id="boardItems">
            <div class="board-item-row js-drop-content-3" id="item-row-3"><div class="floaty left add js-uni-tools js-add-note-btn" id="add-dropdown-3" data-item="3"><img src="icons/add.png" alt="add" class="icono gray icon"></div><div class="item"><div class="floaty left edit js-uni-tools" data-item="1"><img src="icons/edit.png" alt="edit" class="icono gray icon"><div class="tools-container dn"><div class="cursor-gap"></div><div class="tools taboff"><div class="section-title conelem"><span>settings</span></div>
            <div class="conelem profile hover js-trigger-action" data-action="delete" data-value="delete" data-item="1">
                <span class="letter small">🗑️</span>
                <span class="fx-full ">Delete</span>
            </div><div class="section-title conelem"><span>Size</span></div>
            <div class="conelem profile hover js-trigger-action" data-action="Size" data-value="title" data-item="1">
                <span class="letter small">H1</span>
                <span class="fx-full ">Heading 1</span>
            </div>
            <div class="conelem profile hover js-trigger-action" data-action="Size" data-value="heading2" data-item="1">
                <span class="letter small">H2</span>
                <span class="fx-full ">Heading 2</span>
            </div>
            <div class="conelem profile hover js-trigger-action" data-action="Size" data-value="heading3" data-item="1">
                <span class="letter small">H3</span>
                <span class="fx-full ">Heading 3</span>
            </div>
            <div class="conelem profile hover js-trigger-action" data-action="Size" data-value="normal-text" data-item="1">
                <span class="letter small">T</span>
                <span class="fx-full ">Normal</span>
            </div><div class="section-title conelem"><span>Alignments</span></div>
            <div class="conelem profile hover js-trigger-action" data-action="Alignments" data-value="text-left" data-item="1">
                <span class="letter small">L</span>
                <span class="fx-full ">Left</span>
            </div>
            <div class="conelem profile hover js-trigger-action" data-action="Alignments" data-value="text-center" data-item="1">
                <span class="letter small">C</span>
                <span class="fx-full ">Center</span>
            </div>
            <div class="conelem profile hover js-trigger-action" data-action="Alignments" data-value="text-right" data-item="1">
                <span class="letter small">R</span>
                <span class="fx-full ">Right</span>
            </div><div class="section-title conelem"><span>Color</span></div>
            <div class="conelem profile hover js-trigger-action" data-action="Color" data-value="" data-item="1">
                <span class="letter small">A</span>
                <span class="fx-full ">Default</span>
            </div>
            <div class="conelem profile hover js-trigger-action" data-action="Color" data-value="text-rainbow-red" data-item="1">
                <span class="letter small">A</span>
                <span class="fx-full text-rainbow-red">Red</span>
            </div>
            <div class="conelem profile hover js-trigger-action" data-action="Color" data-value="text-rainbow-blue" data-item="1">
                <span class="letter small">A</span>
                <span class="fx-full text-rainbow-blue">Blue</span>
            </div>
            <div class="conelem profile hover js-trigger-action" data-action="Color" data-value="text-rainbow-green" data-item="1">
                <span class="letter small">A</span>
                <span class="fx-full text-rainbow-green">Green</span>
            </div>
            <div class="conelem profile hover js-trigger-action" data-action="Color" data-value="text-rainbow-yellow" data-item="1">
                <span class="letter small">A</span>
                <span class="fx-full text-rainbow-yellow">Yellow</span>
            </div>
            <div class="conelem profile hover js-trigger-action" data-action="Color" data-value="text-rainbow-purple" data-item="1">
                <span class="letter small">A</span>
                <span class="fx-full text-rainbow-purple">Purple</span>
            </div>
            <div class="conelem profile hover js-trigger-action" data-action="Color" data-value="text-rainbow-orange" data-item="1">
                <span class="letter small">A</span>
                <span class="fx-full text-rainbow-orange">Orange</span>
            </div>
            <div class="conelem profile hover js-trigger-action" data-action="Color" data-value="text-rainbow-pink" data-item="1">
                <span class="letter small">A</span>
                <span class="fx-full text-rainbow-pink">Pink</span>
            </div></div></div></div><input type="text" id="item-input-1" class=" simple item-element fx-full title empty" placeholder="Title" data-item-index="1" autocomplete="off" data-print-mode="board" data-content=""></div></div></div>
            <div class="extra_elems">
               <div class="addNote js-add-note-btn js-uni-tools add nAvoid active" id="add-note">
                  <img src="icons/add.png" alt="add" class="icono gray small">
                  <span class="tx-secondary">Note</span>
               <div class="tools-container dn"><div class="cursor-gap"></div><div class="tools taboff"><div class="section-title conelem"><span>text</span></div>
            <div class="conelem profile hover js-trigger-action" data-action="normal" data-value="normal-text" data-item="undefined">
                <span class="letter small">T</span>
                <span class="fx-full ">Text</span>
            </div>
            <div class="conelem profile hover js-trigger-action" data-action="checklist" data-value="checklist-block" data-item="undefined">
                <span class="letter small">☐</span>
                <span class="fx-full ">Checklist</span>
            </div>
            <div class="conelem profile hover js-trigger-action" data-action="callout" data-value="callout" data-item="undefined">
                <span class="letter small">💡</span>
                <span class="fx-full ">Callout</span>
            </div><div class="section-title conelem"><span>Note Block</span></div>
            <div class="conelem profile hover js-trigger-action" data-action="separator" data-value="separator" data-item="undefined">
                <span class="letter small">─</span>
                <span class="fx-full ">Separator</span>
            </div>
            <div class="conelem profile hover js-trigger-action" data-action="dropdown" data-value="note-block" data-item="undefined">
                <span class="letter small">▼</span>
                <span class="fx-full ">Drop down</span>
            </div>
            <div class="conelem profile hover js-trigger-action" data-action="group" data-value="group" data-item="undefined">
                <span class="letter small">▭</span>
                <span class="fx-full ">Group</span>
            </div><div class="section-title conelem"><span>Media</span></div>
            <div class="conelem profile hover js-trigger-action" data-action="link" data-value="link" data-item="undefined">
                <span class="letter small">🔗</span>
                <span class="fx-full ">Link</span>
            </div>
            <div class="conelem profile hover js-trigger-action" data-action="image" data-value="image" data-item="undefined">
                <span class="letter small">🖼️</span>
                <span class="fx-full ">Image</span>
            </div>
            <div class="conelem profile hover js-trigger-action" data-action="video" data-value="video" data-item="undefined">
                <span class="letter small">🎥</span>
                <span class="fx-full ">Video</span>
            </div><div class="section-title conelem"><span>Embed</span></div>
            <div class="conelem profile hover js-trigger-action" data-action="Embed" data-value="embed" data-item="undefined">
                <img src="appicons/gcal.png" alt="Google Calendar" class="icono icon small">
                <span class="fx-full ">Google Calendar</span>
            </div>
            <div class="conelem profile hover js-trigger-action" data-action="youtube" data-value="embed" data-item="undefined">
                <img src="appicons/yt.png" alt="YouTube" class="icono icon small">
                <span class="fx-full ">YouTube</span>
            </div></div></div></div>
            </div>
         </div>
    `,
    loadingBoard: `
    <div class="board-content">
            <div class="cover">
               <div class="cover-icon op5-hover js-uni-tools edit-icon" id="change-icon">
                  <input type="text" class="simple dn" id="icon-input" maxlength="1" readonly="" value="">
               </div>
               <div class="cover-settings">
                  <div class="btn-set add-cover-btn gray">
                     <span>Add cover</span>
                  </div>
                  <div class="btn-set gray add-icon-btn">
                     <span>Add Icon</span>
                  </div>
                  <div class="btn-set">
                     <span>•••</span>
                  </div>
               </div>
            </div>
            <div class="board-items" id="boardItems">
            <div class="board-item-row loading js-drop-content-3" id="item-row-3"><div class="floaty left add js-uni-tools js-add-note-btn" id="add-dropdown-3" data-item="3"><img src="icons/add.png" alt="add" class="icono gray icon"></div><div class="item"><div class="floaty left edit js-uni-tools" data-item="1"><img src="icons/edit.png" alt="edit" class="icono gray icon"><div class="tools-container dn"><div class="cursor-gap"></div><div class="tools taboff"><div class="section-title conelem"><span>settings</span></div>
            <div class="conelem profile hover js-trigger-action" data-action="delete" data-value="delete" data-item="1">
                <span class="letter small">🗑️</span>
                <span class="fx-full ">Delete</span>
            </div><div class="section-title conelem"><span>Size</span></div>
            <div class="conelem profile hover js-trigger-action" data-action="Size" data-value="title" data-item="1">
                <span class="letter small">H1</span>
                <span class="fx-full ">Heading 1</span>
            </div>
            <div class="conelem profile hover js-trigger-action" data-action="Size" data-value="heading2" data-item="1">
                <span class="letter small">H2</span>
                <span class="fx-full ">Heading 2</span>
            </div>
            <div class="conelem profile hover js-trigger-action" data-action="Size" data-value="heading3" data-item="1">
                <span class="letter small">H3</span>
                <span class="fx-full ">Heading 3</span>
            </div>
            <div class="conelem profile hover js-trigger-action" data-action="Size" data-value="normal-text" data-item="1">
                <span class="letter small">T</span>
                <span class="fx-full ">Normal</span>
            </div><div class="section-title conelem"><span>Alignments</span></div>
            <div class="conelem profile hover js-trigger-action" data-action="Alignments" data-value="text-left" data-item="1">
                <span class="letter small">L</span>
                <span class="fx-full ">Left</span>
            </div>
            <div class="conelem profile hover js-trigger-action" data-action="Alignments" data-value="text-center" data-item="1">
                <span class="letter small">C</span>
                <span class="fx-full ">Center</span>
            </div>
            <div class="conelem profile hover js-trigger-action" data-action="Alignments" data-value="text-right" data-item="1">
                <span class="letter small">R</span>
                <span class="fx-full ">Right</span>
            </div><div class="section-title conelem"><span>Color</span></div>
            <div class="conelem profile hover js-trigger-action" data-action="Color" data-value="" data-item="1">
                <span class="letter small">A</span>
                <span class="fx-full ">Default</span>
            </div>
            <div class="conelem profile hover js-trigger-action" data-action="Color" data-value="text-rainbow-red" data-item="1">
                <span class="letter small">A</span>
                <span class="fx-full text-rainbow-red">Red</span>
            </div>
            <div class="conelem profile hover js-trigger-action" data-action="Color" data-value="text-rainbow-blue" data-item="1">
                <span class="letter small">A</span>
                <span class="fx-full text-rainbow-blue">Blue</span>
            </div>
            <div class="conelem profile hover js-trigger-action" data-action="Color" data-value="text-rainbow-green" data-item="1">
                <span class="letter small">A</span>
                <span class="fx-full text-rainbow-green">Green</span>
            </div>
            <div class="conelem profile hover js-trigger-action" data-action="Color" data-value="text-rainbow-yellow" data-item="1">
                <span class="letter small">A</span>
                <span class="fx-full text-rainbow-yellow">Yellow</span>
            </div>
            <div class="conelem profile hover js-trigger-action" data-action="Color" data-value="text-rainbow-purple" data-item="1">
                <span class="letter small">A</span>
                <span class="fx-full text-rainbow-purple">Purple</span>
            </div>
            <div class="conelem profile hover js-trigger-action" data-action="Color" data-value="text-rainbow-orange" data-item="1">
                <span class="letter small">A</span>
                <span class="fx-full text-rainbow-orange">Orange</span>
            </div>
            <div class="conelem profile hover js-trigger-action" data-action="Color" data-value="text-rainbow-pink" data-item="1">
                <span class="letter small">A</span>
                <span class="fx-full text-rainbow-pink">Pink</span>
            </div></div></div></div><input type="text" id="item-input-1" class="simple  item-element fx-full title empty" placeholder="" data-item-index="1" autocomplete="off" data-print-mode="board" data-content=""></div></div></div>
            <div class="extra_elems">
               <div class="addNote loading js-add-note-btn js-uni-tools add nAvoid active" id="add-note">
                  <img src="icons/add.png" alt="add" class="icono gray small">
                  <span class="tx-secondary"></span>
               <div class="tools-container dn"><div class="cursor-gap"></div><div class="tools taboff"><div class="section-title conelem"><span>text</span></div>
            <div class="conelem profile hover js-trigger-action" data-action="normal" data-value="normal-text" data-item="undefined">
                <span class="letter small">T</span>
                <span class="fx-full ">Text</span>
            </div>
            <div class="conelem profile hover js-trigger-action" data-action="checklist" data-value="checklist-block" data-item="undefined">
                <span class="letter small">☐</span>
                <span class="fx-full ">Checklist</span>
            </div>
            <div class="conelem profile hover js-trigger-action" data-action="callout" data-value="callout" data-item="undefined">
                <span class="letter small">💡</span>
                <span class="fx-full ">Callout</span>
            </div><div class="section-title conelem"><span>Note Block</span></div>
            <div class="conelem profile hover js-trigger-action" data-action="separator" data-value="separator" data-item="undefined">
                <span class="letter small">─</span>
                <span class="fx-full ">Separator</span>
            </div>
            <div class="conelem profile hover js-trigger-action" data-action="dropdown" data-value="note-block" data-item="undefined">
                <span class="letter small">▼</span>
                <span class="fx-full ">Drop down</span>
            </div>
            <div class="conelem profile hover js-trigger-action" data-action="group" data-value="group" data-item="undefined">
                <span class="letter small">▭</span>
                <span class="fx-full ">Group</span>
            </div><div class="section-title conelem"><span>Media</span></div>
            <div class="conelem profile hover js-trigger-action" data-action="link" data-value="link" data-item="undefined">
                <span class="letter small">🔗</span>
                <span class="fx-full ">Link</span>
            </div>
            <div class="conelem profile hover js-trigger-action" data-action="image" data-value="image" data-item="undefined">
                <span class="letter small">🖼️</span>
                <span class="fx-full ">Image</span>
            </div>
            <div class="conelem profile hover js-trigger-action" data-action="video" data-value="video" data-item="undefined">
                <span class="letter small">🎥</span>
                <span class="fx-full ">Video</span>
            </div><div class="section-title conelem"><span>Embed</span></div>
            <div class="conelem profile hover js-trigger-action" data-action="Embed" data-value="embed" data-item="undefined">
                <img src="appicons/gcal.png" alt="Google Calendar" class="icono icon small">
                <span class="fx-full ">Google Calendar</span>
            </div>
            <div class="conelem profile hover js-trigger-action" data-action="youtube" data-value="embed" data-item="undefined">
                <img src="appicons/yt.png" alt="YouTube" class="icono icon small">
                <span class="fx-full ">YouTube</span>
            </div></div></div></div>
            </div>
         </div>
    `
};
