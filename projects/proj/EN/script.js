function generateUsers() {
    const div = document.querySelector('div');
    fetch('https://randomuser.me/api/?nat=us,fr,es,mx')
        .then(response => response.json())
        .then(data => {
            div.classList.add('load-ani');
            const users = data.results.map(user => ({
                name: `${user.name.first} ${user.name.last}`,
                email: user.email,
                gender: user.gender, // firt digit
                regDate: user.registered.date, // firt 10 digits
                dob: user.dob.date, // firt 10 digits
                address: user.location.street.number + ` ` + user.location.street.name,
                phone: user.phone,
                nat: user.nat,
                eeg1: user.id.value,
                egg2: user.id.value,
                post: user.location.postcode,
                state: user.location.state,
            }));
            generateHTML(users);
        })
        .catch(error => console.error('Error fetching user data:', error))
        .finally(() => {
            div.classList.remove('load-ani');
        });
}

function generateHTML(users) {
    const userBox = document.getElementById('js-output');
    userBox.innerHTML = '';
    users.forEach(user => {
        userBox.innerHTML = `
        <div id="all" class="row">
                            <div class="col">
                                <div class="header">
                                    Name
                                </div>
                                <div class="table-text" id="name">
                                    ${user.name}
                                </div>
                            </div>
                        </div>
                        <div id="all" class="row">
                            <div class="col">
                                <div class="header">
                                    sex
                                </div>
                                <div class="table-text">
                                    ${user.gender}
                                </div>
                            </div>
                            ${col('DOB', first(user.dob, 10))}
                            <div class="col">
                                <div class="header">
                                    SUD-class
                                </div>
                                <div class="table-text">
                                    ERG-MJO
                                </div>
                            </div>
                            <div class="col">
                                <div class="header">
                                    Address
                                </div>
                                <div class="table-text">
                                    ${user.address}
                                </div>
                            </div>
                        </div>
                        <div class="row">
                            ${col('EMAIL(EN)', replaceEmailDomain(user.email))}
                            ${col('Phone', user.phone)}
                            ${col('NAT', user.nat)}
                            ${col('ST', user.state)}
                            <div class="col">
                                <div class="header">
                                    POST
                                </div>
                                <div class="table-text">
                                    ${user.post}
                                </div>
                            </div>
                        </div>
                        <div class="row">
                        </div>

        `
    });
}

generateUsers();

function col(head, dis) {
    const edit = `
    <div class="col">
        <div class="header">
            ${head}
        </div>
        <div class="table-text">
            ${dis}
        </div>
    </div>
    `
    return edit
}

function first(text, num) {
    return text.slice(0, num);
}

function replaceEmailDomain(email) {
    const [username, domain] = email.split('@');
    const newEmail = `${username}@enfreen.org`;
    
    return newEmail;
}