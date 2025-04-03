// Zorg ervoor dat adressen.js eerst wordt geladen in index.html voordat script.js wordt uitgevoerd

// Adressen uit adressen.js koppelen
document.addEventListener("DOMContentLoaded", function() {
    wijk1Data = JSON.parse(localStorage.getItem("wijk1Data")) || window.wijk1Data || [];
    wijk2Data = JSON.parse(localStorage.getItem("wijk2Data")) || window.wijk2Data || [];

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
                <td><button onclick="removeAddress('${wijk}', ${index})">🗑 Verwijderen</button></td>
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
    localStorage.removeItem(`${wijk}Data`);
}

document.getElementById("reset-button-wijk1").addEventListener("click", () => resetBezorgstatus("wijk1"));
document.getElementById("reset-button-wijk2").addEventListener("click", () => resetBezorgstatus("wijk2"));

// Nieuwe functie om een adres toe te voegen op een specifieke plek
function addAddress(wijk) {
    const name = document.getElementById(`name-${wijk}`).value;
    const address = document.getElementById(`address-${wijk}`).value;
    const comment = document.getElementById(`comment-${wijk}`).value;
    const position = parseInt(document.getElementById(`position-${wijk}`).value, 10);
    
    if (!name || !address) {
        alert("Naam en adres zijn verplicht!");
        return;
    }
    
    const newAddress = { name, address, comment, delivered: false };
    const data = wijk === "wijk1" ? wijk1Data : wijk2Data;
    
    if (isNaN(position) || position < 0 || position > data.length) {
        data.push(newAddress);
    } else {
        data.splice(position, 0, newAddress);
    }
    
    localStorage.setItem(`${wijk}Data`, JSON.stringify(data));
    displayAddresses(wijk);
}

// Nieuwe functie om een adres te verwijderen
function removeAddress(wijk, index) {
    const data = wijk === "wijk1" ? wijk1Data : wijk2Data;
    data.splice(index, 1);
    
    localStorage.setItem(`${wijk}Data`, JSON.stringify(data));
    displayAddresses(wijk);
}
