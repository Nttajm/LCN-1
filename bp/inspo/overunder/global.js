const divLinkers = document.querySelectorAll('div[data-linker]');
divLinkers.forEach(div => {
    div.addEventListener('click', function() {
        window.location.href = this ? this.getAttribute('data-linker') : '';
    }
    );
}
);

export function formatDateTime(dateTimeStr) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    // Split the input date string into date and time
    let [datePart, timePart] = dateTimeStr.split(" ");
    
    // Split the date and time into components
    let [month, day] = datePart.split("-");
    let [hours, minutes] = timePart.split(":");
    
    // Convert to 12-hour format
    let period = "am";
    hours = parseInt(hours, 10);
    if (hours >= 12) {
        period = "pm";
        if (hours > 12) {
            hours -= 12;
        }
    } else if (hours === 0) {
        hours = 12;
    }
    
    // Handle the "th", "st", "nd", "rd" suffix for the day
    let daySuffix;
    if (day === "1" || day === "21" || day === "31") {
        daySuffix = "st";
    } else if (day === "2" || day === "22") {
        daySuffix = "nd";
    } else if (day === "3" || day === "23") {
        daySuffix = "rd";
    } else {
        daySuffix = "th";
    }
    
    // Format the final string
    let formattedDateTime = `${months[month - 1]} ${parseInt(day, 10)}${daySuffix} ${hours}:${minutes}${period}`;
    
    return formattedDateTime;
  }