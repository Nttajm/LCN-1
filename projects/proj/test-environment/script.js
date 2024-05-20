document.getElementById('generateBtn').addEventListener('click', generateUsers);

const dataArray = [];
function generateUsers() {
    fetch('https://randomuser.me/api/?results=10')
        .then(response => response.json())
        .then(data => {
            const userList = document.getElementById('userList');
            userList.innerHTML = '';
            data.results.forEach(user => {
                dataArray.push(`${user.first} ${user.last}`, ${user.nat})
            });
        })
        .catch(error => console.error('Error fetching user data:', error));
}
