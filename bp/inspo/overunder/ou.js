const userData = JSON.parse(localStorage.getItem('userData')) || {};
const betatesters = ['joelm', 'lizzy', 'WildS', 'TKing', 'BetaTester27', 'BetaTester49'];
  
if (!(userData.username && betatesters.includes(userData.username))) {
     window.location.href = 'https://lcnjoel.com/ouths/info.html';
 }

