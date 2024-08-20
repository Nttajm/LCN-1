export let bets = JSON.parse(localStorage.getItem('bets')) || [
    {
        sport: "soccer",
        details: [
            {
                typeBet: "Passes Attempted",
                against: "Celtic",
                time: "8-10-2024 00:00",
                idl: `1s`,
                bet: "20",
                cash: 5,
                betStatus: 'over',
                result: "under",
                status: "",
            },
            {
                typeBet: "Passes Attempted",
                against: "Celtic",
                time: "8-19-2024 22:00",
                idl: `2s`,
                bet: "20",
                cash: 15,
                betStatus: 'over',
                result: "under",
                status: "",
            },
        ]
    }
];
