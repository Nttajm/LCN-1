
document.addEventListener("DOMContentLoaded", (event) => {
    const searchInput = document.getElementById('search');
    const resultsDiv = document.getElementById('results');

    let classes = [
        {
            name: 'World History 7th',
            teacher: 'Larry Mylander',
            id: 1001,
            points: 171,
            students: [
                { name: 'Joel Mulonde', id: 31733 },
                { name: 'Nicole Denson', id: 45371 },
            ],
        }
    ];

    let selectedStudents = [];

    function renderClasses() {
        const classesSec = document.querySelector('.classes-sec');
        classesSec.innerHTML = '';

        classes.forEach(cl => {
            const classDiv = document.createElement('div');
            classDiv.classList.add('class');
            classDiv.id = cl.id + '-class';
            classDiv.innerHTML = `
                <span>${cl.name}</span>
                <span>${cl.teacher} - ${cl.points} points</span>
            `;
            classesSec.appendChild(classDiv);
        });
    }

    renderClasses();

    const allClasses = document.querySelectorAll('.class');
    allClasses.forEach(cl => {
        cl.addEventListener('click', () => {
            const id = cl.id.split('-')[0];
            viewClass(id);
        });
    });

    function viewClass(id) {
        const viewerDiv = document.querySelector('.viewer');
        viewerDiv.classList.toggle('dn');

        const studentsDiv = document.getElementById('js-student-classes');
        const classStudents = classes.find(cl => cl.id === Number(id)).students;

        studentsDiv.innerHTML = '';

        classStudents.forEach(student => {
            const studentDiv = document.createElement('div');
            studentDiv.classList.add('student');
            studentDiv.innerHTML = renderStudentHtml(student);
            studentsDiv.appendChild(studentDiv);
        });
    }

    function showSelDiv() {
        const selectedNav = document.querySelector('.selected-info');
        if (selectedStudents.length > 0) {
            selectedNav.classList.add('selecting');
        } else {
            selectedNav.classList.remove('selecting');
        }
        updateSels();
    }

    function updateSels() {
        const scrollsec = document.querySelector('.scroll-items');
        scrollsec.innerHTML = '';

        selectedStudents.forEach(student => {
            const firstName = student.name.split(' ')[0];
            scrollsec.innerHTML += `
                <div class="s-item">
                    <img src="stewy.png" alt="pfp" class="mini-pfp">
                    <span>${firstName}</span>
                </div>
            `;
        });
    }

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase();
        resultsDiv.innerHTML = ''; // Clear previous results

        // Filter students from all classes
        const allStudents = classes.flatMap(cl => cl.students);
        const filteredStudents = allStudents.filter(student => {
            return (
                student.name.toLowerCase().includes(query) ||
                student.id.toString().includes(query)
            );
        });

        // Limit the results to the top 6 closest matches
        const topResults = filteredStudents.slice(0, 6);

        // Display results or clear the HTML when no match
        if (topResults.length > 0) {
            topResults.forEach(student => {
                const studentDiv = document.createElement('div');
                studentDiv.classList.add('student');
                studentDiv.innerHTML = renderStudentHtml(student);
                resultsDiv.appendChild(studentDiv);
            });
        } else {
            resultsDiv.textContent = 'No results found'; // Clear content if no match
        }

        // Clear results if search input is empty
        if (searchInput.value === '') {
            resultsDiv.textContent = '';
            resultsDiv.classList.remove('open');
        }

        // Show results if there is a query
        if (searchInput.value !== '') {
            resultsDiv.classList.add('open');
        }
    });

    document.addEventListener("click", (event) => {
        // Check if the click was outside the results div
        if (!resultsDiv.contains(event.target)) {
            resultsDiv.classList.remove('open'); // Hide the div
        }
    });

    function renderStudentHtml(student) {
        const isSelected = selectedStudents.some(
            selected => selected.id.toString() === student.id.toString()
        );
        return `
            <div class="blocket">
                <input 
                    type="checkbox" 
                    data-meta-name='${student.name}' 
                    data-meta-id='${student.id}' 
                    name="" 
                    id="js-student-checker" 
                    ${isSelected ? 'checked' : ''} 
                >
            </div>
            <div class="blocket">
                <img src="stewy.png" alt="pfp" class="base-pfp">
            </div>
            <div class="st-name blocket">
                <span>${student.name}</span>
                <span>${student.id}</span>
            </div>
            <button class="plus">
                +2
            </button>
            <button class="plus">
                -2
            </button>
            <div class="blocket">
                <img src="manage.png" alt="pfp" class="base-pfp st stand_er-invert">
            </div>
        `;
    }

    const selectedInfoDiv = document.querySelector('.selected-info');

    // Event delegation for dynamically added checkboxes
    document.addEventListener('click', (event) => {
        if (event.target.matches('input[type="checkbox"][data-meta-name]')) {
            const checker = event.target;
            const name = checker.dataset.metaName;
            const id = checker.dataset.metaId;

            if (checker.checked) {
                selectedStudents.push({ name, id });
            } else {
                const index = selectedStudents.findIndex(student => student.id === id);
                if (index !== -1) {
                    selectedStudents.splice(index, 1);
                }
            }

            showSelDiv();
            updateSels();
        }
    });

    const closeDiv = document.getElementById('selecting-close');
    closeDiv.addEventListener('click', () => {
        selectedStudents = [];
        showSelDiv();
        updateSels();
    });
});