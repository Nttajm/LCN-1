document.addEventListener('keydown', function(event) {
  if (event.key === 'Enter') {
    const currentActiveElement = document.activeElement; 

    
    if (currentActiveElement && currentActiveElement.id === 'collab-input') {
      event.preventDefault(); 
      const addBtn = document.querySelector(".btn-action-1");
      if (addBtn) {
        addBtn.click(); 
      } 
    }


  }
});