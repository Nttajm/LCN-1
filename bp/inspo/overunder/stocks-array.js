import { mstock } from "../../../ouadmin/js/stocks.js";
export const stockManual = mstock;



  export const indexes = [
    {
        name: 'MTMY',
        data: combineStocksAverage('Matt Ortiz', 'Mylander'),
        sub: 'MATMYL',
        id: 'MTMY',
        basedOn: `Matt Ortiz and Mylander`,
    },
    {
        name: 'RPTR',
        data: combineStocksAverage('Raphael', 'Torre'),
        sub: 'RPTR',
        id: 'RPTR',
        basedOn: `Raphael and Torre`,
    },
    {
        name: 'FRZE',
        data: combineStocksAverage('FreeBairn', 'Zwing Coin'),
        sub: 'FRZE',
        id: 'FRZE',
        basedOn: `Story tellers`,
    },
    {
        name: 'BRZE',
        data: combineStocksAverage('Burks', 'Zwing Coin'),
        sub: 'BRZE',
        id: 'BRZE',
        basedOn: `Yapfest`,
    },

];

function combineStocksAverage(stock1, stock2) {
    const stock1Data = stockManual.find(stock => stock.name === stock1);
    const stock2Data = stockManual.find(stock => stock.name === stock2);
    if (stock1Data && stock2Data) {
        const combinedData = stock1Data.data.map((value, index) => {
            return (value + stock2Data.data[index]) / 2;
        });
        return combinedData;
    } else {
        throw new Error('One or both stocks not found');
    }
}


export const globalSto = 0.0000002