import { students } from "./names.js";

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
    },
    {
        name: 'World History 5th',
        teacher: 'Larry Mylander',
        id: 1002,
        points: 171,
        students: [
            { name: 'Johny Walker', id: 10501 },
            { name: 'Joel Mulonde', id: 31733 },

    { name: 'Helen Allen', id: 10114 },
    { name: 'William King', id: 10115 },
    { name: 'Barbara Scott', id: 10116 },
    { name: 'Charles Adams', id: 10117 },
    { name: 'Deborah Nelson', id: 10118 },
    { name: 'Joseph Carter', id: 10119 },
    { name: 'Nancy Mitchell', id: 10120 },
    { name: 'Gary Perez', id: 10121 },
    { name: 'Megan Roberts', id: 10122 },
    { name: 'Andrew Walker', id: 10123 },
    { name: 'Dorothy Hill', id: 10124 },
    { name: 'Kevin Green', id: 10125 },
    { name: 'Laura Baker', id: 10126 },
    { name: 'Steven Gonzalez', id: 10127 },
    { name: 'Michelle Martinez', id: 10128 },
    { name: 'Edward Harris', id: 10129 },
    { name: 'Kimberly Evans', id: 10130 },
    { name: 'George Thompson', id: 10131 },
    { name: 'Emma White', id: 10132 },
    { name: 'Brian Moore', id: 10133 },
    ],
    },
]

let selectedStudents = []

function renderClassses() {
    const classesSec = document.querySelector('.classes-sec')
    classesSec.innerHTML = ''

    classes.forEach(cl => {
        const classDiv = document.createElement('div')
        classDiv.classList.add('class')
        classDiv.id = cl.id + '-class'
        classDiv.innerHTML = `
            <span>${cl.name}</span>
            <span>${cl.teacher} - ${cl.points} points</span>
        `
        classesSec.appendChild(classDiv)
    })
}

renderClassses()

const allClasses = document.querySelectorAll('.class')
allClasses.forEach(cl => {
    cl.addEventListener('click', () => {
        const id = cl.id.split('-')[0]
        viewClass(id)
    })
})

function viewClass(id) {
    // const classDiv = document.getElementById(id + '-class')
    const viewerDiv = document.querySelector('.viewer')
    viewerDiv.classList.toggle('dn')

    const studentsDiv = document.getElementById('js-student-classes')
    const classStudents = classes.find(cl => cl.id === Number(id)).students

    studentsDiv.innerHTML = ''

    classStudents.forEach(student => {
        const studentDiv = document.createElement('div')
        studentDiv.classList.add('student')
        studentDiv.innerHTML = renderStudentHtml(student);
        studentsDiv.appendChild(studentDiv)
    })

}

const allStudentChecks = document.querySelectorAll('#js-student-checker')
allStudentChecks.forEach(checker => {
    checker.addEventListener('click', () => {
        showSelDiv();
        const name = checker.dataset.metaName
        const id = checker.dataset.metaId

        selectedStudents.push({
            name,
            id,
        })
    })
});

function showSelDiv() {
    const selectedNav = document.querySelector('.selected-info')
    selectedNav.classList.toggle('selecting')
    updateSels()
}


function updateSels() {
    const scrollsec = document.querySelector('.scroll-items')

    scrollsec.innerHTML = `
    `

    selectedStudents.forEach(student => {
        const firstName = student.name.split(' ')[0];
        scrollsec.innerHTML += `
             <div class="s-item">
                <img src="stewy.png" alt="pfp" class="mini-pfp">
                <span>${firstName}</span>
            </div>
        `

    })
    
}

// Listen for input events on the search field
// Listen for input events on the search field
searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase();
    resultsDiv.innerHTML = ''; // Clear previous results

    // Filter students by name or ID
    const filteredStudents = students.filter(student => {
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

    document.addEventListener("click", (event) => {
  // Check if the click was outside the results div
        if (!resultsDiv.contains(event.target)) {
            resultsDiv.classList.remove('open'); // Hide the div
        }
    });
});

function renderStudentHtml(student) {

    const isSelected = selectedStudents.some(
        selected => selected.id.toString() === student.id.toString()
    );
    return  `
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
                `
}



const selectedInfoDiv = document.querySelector('.selected-info'); // Ensure this selector exists and is correct

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

            if (selectedStudents.length > 0) {
                selectedInfoDiv.classList.add('selecting');
            } else {
                selectedInfoDiv.classList.remove('selecting');
            }
            updateSels();
        }
    });

const allTargets = document.querySelectorAll('[data-toggle]')

const closeDiv = document.getElementById('selecting-close')
closeDiv.addEventListener('click', () => {
    selectedStudents.length = []
})

allTargets.forEach(item => {
    item.addEventListener('click', () => {
        const classToC = item.dataset.togglecl; // 'selected'
        const divToC = document.querySelector(item.dataset.toggle); // Selects '.selected-info'
        
        // Ensure divToC is valid before trying to toggle class
        if (divToC) {
            divToC.classList.toggle(classToC); // Toggles 'selected' class on .selected-info
        }
    })
})

});
