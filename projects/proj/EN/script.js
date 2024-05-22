function generateUsers() {
    const div = document.querySelector('div');
    fetch('https://randomuser.me/api/?nat=us,fr,es,mx,au')
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
                egg1: user.id.value,
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

const text = 'hello'

function generateHTML(users) {
    const userBox = document.getElementById('js-output');
    userBox.innerHTML = '';
    users.forEach(user => {
        userBox.innerHTML = `
                <div class="id info-box">
                    <div class="header" id="h-m">
                        ID Data
                    </div>
                    <div class="data-table">
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
                            ${first(caplet(user.gender, 0), 1)}
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
                    ${col('EMAIL(EN)', replaceEmailDomain(user.email))}
                    ${col('Phone', user.phone)}
                    ${col('NAT', user.nat)}
                    ${col('ST', user.state)}
                </div>
                <div class="row">
                </div>

                <div class="meta info-box">
                    <div class="header" id="h-m">
                        META
                    </div>
                    <div class="data-table">
                        <div class="row">
                            <div class="col">
                                <div class="header">
                                    ISSUE DATE
                                </div>
                                <div class="table-text">
                                    ${first(user.regDate, 10)}
                                </div>
                            </div>
                            <div class="col">
                                <div class="header">
                                    ENT DATA
                                </div>
                                <div class="table-text">
                                    2021-1-12
                                </div>
                            </div>
                            <div class="col">
                                <div class="header">
                                    SHARP1-md5
                                </div>
                                <div class="table-text">
                                    ${user.egg1}
                                </div>
                            </div>
                            <div class="col">
                                <div class="header">
                                    salt
                                </div>
                                <div class="table-text">
                                    sld1yGtd
                                </div>
                            </div>
                        </div>
                        <div class="row">
                            ${col('AM-CHEACK', bais('CFC', 'LVQ', 0.4), 'cheack', bais('valid', 'mid', 0.7))}
                            ${col('REL', bais('valid', 'mid', 0.4), 'cheack', bais('valid', 'mid', 0.4))}

                        </div>
                        </div>
                    </div>
                </div>
        `
    });
}

generateUsers();

function col(head, dis, classes, ids) {
    if (!classes) {
        classes = ''
    }
    if (!ids) {
        ids = ''
    }
    const edit = `
    <div class="col ${classes}" id="${ids}">
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

    const rN = Math.random();
    let newEmail = ``;


    if (rN < 0.3) {
        newEmail = `${username}@enfreen.org`;
    } else if (rN > 0.7) {
        newEmail = `${username}@gmail.com`;
    } else {
        newEmail = `${username}@yahoo.com`;
    }
    
    return newEmail;
}

function caplet(str, num) {
    if (!str) return str; // Check if the string is empty or null
    return str.charAt(num).toUpperCase() + str.slice(1);
}

function bais(fair1, fair2, bais) {
    const b1 = Math.random();
    if (b1 < bais) {
        return fair1
    } else {
        return fair2
    }
}
