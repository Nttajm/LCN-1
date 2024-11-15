export const stockManual = [ 
     {
         id: 'OUC',
         sub: 'OUCoin',
         name: 'Over Under',
         basedOn: 'over under in genral',
         data: [
             43, 53, 104, 121, 99, 87, 106, 122, 132, 145, 190, 150, 134, 166,
         ],
    }, 
     
    {
         id: 'TRR',
         sub: 'TorreCoin',
         name: 'Torre',
         basedOn: 'Test Scores and Moods',
         data: [
             30, 23, 2, 4, 5, 10, 15, 3, 34, 12, 2, 10, 13, 21, 46, 32, 40
         ],
     },
    {
        id: 'MYY',
        sub: 'myCoin',
        name: 'Mylander',
        basedOn: 'Taking phones',
        data: [
            60, 12, 19, 28, 34, 54, 67, 87, 125, 142, 176, 163, 189, 151, 121, 109, 96, 72, 66, 88
        ],
    },
    {
        id: 'WVR',
        sub: 'WeaverCoin',
        name: 'Weaver',
        basedOn: 'sarcasm',
        data: [
          1, 3, 2.3, 2, 3.5, 4.2, 4.6, 5.1, 7.5, 6, 9.5, 8, 7, 5, 8, 12, 6, 5.2, 4.8
        ],
    },
    {
        id: 'BRKS',
        sub: 'SuckerCoin',
        name: 'Burks',
        basedOn: 'Yapping',
        data: [
             8, 7, 5, 6, 8, 9, 10, 12, 14, 56, 70, 61, 85, 87, 93,96, 101, 85, 94, 99, 71, 88, 101,
        ],
    },
    {
        id: 'MTT',
        sub: 'matCoin',
        name: 'Matt Ortiz',
        basedOn: 'YELLING',
        data: [
            12, 14, 15, 16, 11, 8, 5, 7, 10, 11, 15, 27, 41, 48, 30,37, 31, 29, 60, 66,
        ],
    },
    {
        id: 'RPH',
        sub: 'RaphCoin',
        name: 'Raphael',
        basedOn: '3s made',
        data: [
            10, 15, 13, 24, 19, 12, 8,
        ],
    },
    {
        id: 'FRE',
        sub: 'FbCoin',
        name: 'FreeBairn',
        basedOn: 'Stories',
        data: [
            10, 11, 13, 9, 8, 21, 24, 27, 34, 52, 43, 62, 54, 68, 73,
        ],
    },
    {
        id: 'ZC',
        sub: 'ZCoin',
        name: 'Zwing Coin',
        basedOn: 'Stories + yapping',
        data: [
            9, 10, 6, 8, 9, 13, 7, 16, 24
        ],
    },
];

export const stockIndexes = [
    {
        id: 'MTMY',
        sub: 'MTMY',
        name: 'Mylander and Matt Ortiz',
        basedOn: ['Raphael', 'Weaver' ],
        data: [
            10, 15, 13,
        ],
    },

    {
        id: 'FRE',
        sub: 'FbCoin',
        name: 'FreeBairn',
        basedOn: 'Stories',
        data: [
            10, 11, 13, 9, 8, 21, 24, 60
        ],
    },
  ];
