export let CASCADE_HTMLS = {
    new: `
    
  <div class="board-content">

  <div class="board-controls g-10">
               <span>x</span>
               <div class="share-cont fl-c g-5">
                  <div class="btn-set gray js-colab-btn">
                     <span>Share</span>
                  </div>
                  <div class="people-share modal-box fl-c">
                     <span class="normal-text  secondary-text">Add Collaborators to "New Board"</span>
                     <div class="separator"></div>
                     <div class="people-adder">
                        <input type="text" class="simple highlighted fx-full normal-text rmdef" id="collab-input" placeholder="Enter email">
                        <div class="btn-set add-collab-btn gray btn-action-1">
                           <img src="icons/add.png" alt="add" class="icono gray small">
                        </div>
                        <div class="btn-set add-collab-btn gray btn-action-cancel">
                           <span>Done</span>
                        </div>
                     </div>
                     <div class="people-added">
                        <div class="person-added bg-notion-orange dn">
                           <div class="mini-pfp">
                              <img src="images/pfpex.png" alt="ydistsoybiglasuigtitdystickyabvidyst">
                           </div>
                           <span>joelmulonde81@gmail.com</span>
                           <div class="aswhat">
                              <select name="roles" id="role-selector">
                                 <option value="can-edit">View only</option>
                                 <option value="can-view">Can edit</option>
                                 <!-- <option value="can-comment">Can checkboxes</option> -->
                              </select>
                           </div>
                           <div class="delete-icon">
                              <img src="icons/delete.png" alt="delete" class="icono gray small">
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

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
      <div class="board-item-row js-drop-content-3" id="item-row-3">
         <div class="floaty left add js-uni-tools js-add-note-btn" id="add-dropdown-3" data-item="3"><img src="icons/add.png" alt="add" class="icono gray icon"></div>
         <div class="item">
            <div class="floaty left edit js-uni-tools" data-item="1">
               <img src="icons/edit.png" alt="edit" class="icono gray icon">
            </div>
            <input type="text" id="item-input-1" class=" simple item-element fx-full title empty" placeholder="Title" data-item-index="1" autocomplete="off" data-print-mode="board" data-content="">
         </div>
      </div>
   </div>
   <div class="extra_elems">
      <div class="addNote js-add-note-btn js-uni-tools add nAvoid active" id="add-note">
         <img src="icons/add.png" alt="add" class="icono gray small">
         <span class="tx-secondary">Note</span>
      </div>
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
      <div class="board-item-row loading js-drop-content-3" id="item-row-3">
         <div class="floaty left add js-uni-tools js-add-note-btn" id="add-dropdown-3" data-item="3"><img src="icons/add.png" alt="add" class="icono gray icon"></div>
         <div class="item">
            <div class="floaty left edit js-uni-tools" data-item="1">
               <img src="icons/edit.png" alt="edit" class="icono gray icon">
            </div>
            <input type="text" id="item-input-1" class="simple  item-element fx-full title empty" placeholder="" data-item-index="1" autocomplete="off" data-print-mode="board" data-content="">
         </div>
      </div>
   </div>
   <div class="extra_elems">
      <div class="addNote loading js-add-note-btn js-uni-tools add nAvoid active" id="add-note">
         <img src="icons/add.png" alt="add" class="icono gray small">
         <span class="tx-secondary"></span>
      </div>
   </div>
</div>
    `
};
