const workspace = document.getElementById('workspace');

function addBlock(type) {
  const block = document.createElement('div');
  block.className = 'block';

  const title = document.createElement('input');
  title.placeholder = 'Block title...';

  const urlInput = document.createElement('input');
  urlInput.placeholder = 'Embed link (Google Calendar / Drive / Website)';

  const iframe = document.createElement('iframe');
  iframe.src =
    type === 'calendar'
      ? 'https://calendar.google.com/calendar/embed?src=YOUR_CALENDAR_LINK'
      : type === 'drive'
      ? 'https://drive.google.com/embeddedfolderview?id=YOUR_FOLDER_ID#grid'
      : 'https://example.com';

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Delete';
  deleteBtn.className = 'delete-btn';
  deleteBtn.onclick = () => block.remove();

  urlInput.addEventListener('input', () => {
    iframe.src = urlInput.value;
  });

  block.append(title, urlInput, iframe, deleteBtn);
  workspace.append(block);
}
