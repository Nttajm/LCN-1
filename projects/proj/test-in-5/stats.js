document.addEventListener('DOMContentLoaded', () => {
    const investmentStatsElement = document.getElementById('investmentStats');
    const totalProfitsElement = document.getElementById('totalProfits');
    const totalVolumeElement = document.getElementById('totalVolume');
    const avgProfitPercentElement = document.getElementById('avgProfitPercent');
    const percentChangeHourElement = document.getElementById('percentChangeHour');
    const numInvestmentsElement = document.getElementById('numInvestments');
    
    // Store initial stock prices for hourly comparison
    const initialStockPrices = { ...stockPrices };
    let lastUpdateTime = Date.now();

    function calculateInvestmentStats() {
        let totalProfits = 0;
        let totalVolume = 0;
        let totalInvested = 0;
        let totalCurrentValue = 0;
        let totalProfitPercent = 0;
        let numInvestments = 0;

        for (const stock in stocks) {
            const stockData = stocks[stock];
            const currentPrice = stockPrices[stock];
            const totalBoughtPrice = stockData.purchases.reduce((total, purchase) => total + purchase.shares * purchase.price, 0);
            const averageBoughtPrice = totalBoughtPrice / stockData.shares;
            const stockCurrentValue = stockData.shares * currentPrice;
            const profit = stockCurrentValue - totalBoughtPrice;
            totalProfits += profit;
            totalVolume += stockData.shares;
            totalInvested += totalBoughtPrice;
            totalCurrentValue += stockCurrentValue;
            totalProfitPercent += ((currentPrice - averageBoughtPrice) / averageBoughtPrice) * 100;
            numInvestments += 1;
        }

        const avgProfitPercent = numInvestments > 0 ? totalProfitPercent / numInvestments : 0;
        const percentChangeHour = calculatePercentChangeOverHour();
        
        totalProfitsElement.textContent = totalProfits.toFixed(2);
        totalVolumeElement.textContent = totalVolume;
        avgProfitPercentElement.textContent = avgProfitPercent.toFixed(2) + '%';
        percentChangeHourElement.textContent = percentChangeHour.toFixed(2) + '%';
        numInvestmentsElement.textContent = numInvestments;
    }

    function calculatePercentChangeOverHour() {
        const now = Date.now();
        const hourInMilliseconds = 3600000;
        if (now - lastUpdateTime >= hourInMilliseconds) {
            let percentChange = 0;
            for (const stock in initialStockPrices) {
                if (stockPrices[stock]) {
                    const initialPrice = initialStockPrices[stock];
                    const currentPrice = stockPrices[stock];
                    percentChange += ((currentPrice - initialPrice) / initialPrice) * 100;
                }
            }
            return percentChange / Object.keys(initialStockPrices).length;
        }
        return 0;
    }

    function updateInvestmentStats() {
        calculateInvestmentStats();
    }

    // Call the function initially to populate stats
    updateInvestmentStats();
    
    // Set an interval to update statistics every 30 seconds
    setInterval(updateInvestmentStats, 30000);
});
