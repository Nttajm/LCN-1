function replaceNameInserts() {
  const fullName = localStorage.getItem("applicantName") || "[Your Name]";
  const firstName = fullName.split(" ")[0] || "";
  const applicantClass = localStorage.getItem("applicantClass") || "[Year]";

  const inserts = document.querySelectorAll(".name-insert");
  const date = new Date();
  const formattedDate = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  inserts.forEach(el => {
    let html = el.innerHTML;

    html = html.replace(/\[Applicant Name\]/g, fullName);
    html = html.replace(/\[Applicant Name:first\]/g, firstName);
    html = html.replace(/\[Applicant Class\]/g, applicantClass);
    html = html.replace(/\[Formal Date\]/g, formattedDate);

    el.innerHTML = html;
  });
}

// Only set default values if no existing data
if (!localStorage.getItem("applicantName")) {
  localStorage.setItem("applicantName", "Joel Mulonde");
  localStorage.setItem("applicantClass", "2028");
}

replaceNameInserts();


