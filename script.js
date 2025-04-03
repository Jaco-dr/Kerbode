// Zorg ervoor dat adressen.js eerst wordt geladen in index.html voordat script.js wordt uitgevoerd

// Adressen uit adressen.js koppelen
document.addEventListener("DOMContentLoaded", function() {
    wijk1Data = window.wijk1Data || [];
    wijk2Data = window.wijk2Data || [];

    displayAddresses("wijk1");
    displayAddresses("wijk2");
});

function displayAddresses(wijk) {
    const wijkList = document.getElementById(`address-list-${wijk}`);
    wijkList.innerHTML = ""; 

    const data = wijk === "wijk1" ? wijk1Data : wijk2Data;

    data.forEach((item, index) => {
        let checked = getCheckboxStatus(wijk, index) ? "checked" : "";
        wijkList.innerHTML += `
            <tr data-index="${index}">
                <td>${item.name}</td>
                <td>${item.address}</td>
                <td>${item.comment || ""}</td>
                <td><input type="checkbox" onchange="handleCheckboxChange(event, '${wijk}', ${index})" ${checked}></td>
            </tr>
        `;
    });
}

function handleCheckboxChange(event, wijk, index) {
    let status = event.target.checked;
    saveCheckboxStatus(wijk, index, status);
}

function saveCheckboxStatus(wijk, index, status) {
    localStorage.setItem(`checkbox-status-${wijk}-${index}`, JSON.stringify(status));
}

function getCheckboxStatus(wijk, index) {
    return JSON.parse(localStorage.getItem(`checkbox-status-${wijk}-${index}`)) || false;
}

function resetBezorgstatus(wijk) {
    const tableRows = document.querySelectorAll(`#address-list-${wijk} tr`);
    tableRows.forEach((row, index) => {
        row.querySelector('input[type="checkbox"]').checked = false;
        localStorage.removeItem(`checkbox-status-${wijk}-${index}`);
    });
}

document.getElementById("reset-button-wijk1").addEventListener("click", () => resetBezorgstatus("wijk1"));
document.getElementById("reset-button-wijk2").addEventListener("click", () => resetBezorgstatus("wijk2"));
