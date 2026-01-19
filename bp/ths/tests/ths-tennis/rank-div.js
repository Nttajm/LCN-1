/* window.onload = function() {
    const container = document.querySelector('.container');
    const rows = container.querySelectorAll('.row');

    rows.forEach((row, index) => {
      const rankDiv = row.querySelector('.rank');
      const rankNumber = parseInt(rankDiv.textContent.trim(), 10);

      if (!isNaN(rankNumber)) {
        row.setAttribute('data-rank', rankNumber);
      }
    });

    const sortedRows = Array.from(rows)
      .sort((a, b) => {
        const rankA = parseInt(a.getAttribute('data-rank'), 10);
        const rankB = parseInt(b.getAttribute('data-rank'), 10);

        if (!isNaN(rankA) && !isNaN(rankB)) {
          return rankA - rankB;
        } else {
          return 0;
        }
      });

    sortedRows.forEach(row => {
      container.appendChild(row);
    });
  }

  */