const data = {
    labels: ['HR', 'TRANSPORTAION', 'GAIN', 'EXPIRENCE', 'STRATEGY'],
      datasets: [{
        label: 'XP',
        data: [14, 23, 16, 15, 19],
        backgroundColor: [
            'rgb(255, 99, 132)',
            'rgb(54, 162, 235)',
            'rgb(255, 205, 86)',
            'rgb(75, 192, 192)',
            'rgb(153, 102, 255)'
        ]
      }]
    };

    const config = {
      type: 'polarArea',
      data: data,
      options: {}
    };

    // Connect the chart to the DOM
    const ctx = document.getElementById('myChart').getContext('2d');
    const myChart = new Chart(ctx, config);