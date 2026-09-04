// Hi 
//I made this project because it was a burden to search up every professor's name on RMP. 


// Adding a rating link next to the professor's name
function addRating(cell, professor) {
    const link = document.createElement("a");

    link.textContent = professor.rating.toFixed(1);
    link.href = "https://www.ratemyprofessors.com/professor/" + professor.id;
    link.target = "_blank";
    link.title = professor.department + " - " + professor.reviews + " reviews";

    if (professor.rating >= 4) {
        link.className = "rmp-badge rmp-good"; //Green if rating is more than 4
    }
    else if (professor.rating >= 3 ) {
        link.className = "rmp-badge rmp-okay"; //Orange if rating is more than 3 and less than 4
    }
    else {
        link.className = "rmp-badge rmp-bad"; //Red if its less than 3
    }
    cell.appendChild(link)


    }

//Finds which column the instructor's names are
function findInstructorColumn(table) {
    const headers = table.querySelectorAll("th");

    for (let i = 0; i < headers.length; i++) {
        if (headers[i].textContent.toLowerCase().includes("instructor")) {
            return i;
        }
    }
    return -1;
}


async function run() {
    const table = document.querySelector("table");
    if (!table) //Error Catching
        return;

    const column = findInstructorColumn(table);
    if (column === -1)
        return;  //Error Catching

    const rows = table.querySelectorAll("tbody tr");
    if (rows.length === 0)
        return; //Error Catching

    //Downloads professor's list from background.js
    const reply = await chrome.runtime.sendMessage("getProfessors");
    if (!reply || reply.error) {
        console.log("Could not get Professor ", reply && reply.error);
        return;

    }

    const professors = reply.professors;
    for (const row of rows) {
        const cell = row.children[column];
        if (!cell) continue;
        if (cell.querySelector(".rmp-badge")) 
            continue;
    //Reduce to first word and last word so middle name is excluded
    const words = cell.textContent.trim().replace(/\s+/g, " ").toUpperCase().split(" ");
    const name = words[0] + " " + words[words.length - 1];

    //Sometimes De Anza has "Staff". This can't be searched on RMP so it skips names like STAFF
    const professor = professors[name];
    if (professor) addRating(cell, professor)

    }
}

//Runs multiple time because De Anza's table changes when reloaded
let timer;
new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(run, 500);
}).observe(document.body, { childList: true, subtree: true});
run();
