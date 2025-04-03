let wijk1Data = [];
let wijk2Data = [];

function openTab(tabName) {
    document.querySelectorAll(".tab-content").forEach(tab => tab.classList.remove("active"));
    document.querySelectorAll(".tabs button").forEach(btn => btn.classList.remove("active"));
    
    document.getElementById(tabName + "-tab").classList.add("active");
    document.getElementById("tab-" + tabName).classList.add("active");
}

function loadAddresses() {
    fetch('adressen.json')
        .then(response => response.json())
        .then(data => {
            wijk1Data = data.wijk1;
            wijk2Data = data.wijk2;
            
            displayAddresses('wijk1');
            displayAddresses('wijk2');
        })
        .catch(error => {
            console.error('Error loading the JSON file:', error);
        });
}

function displayAddresses(wijk) {
    const wijkList = document.getElementById(`address-list-${wijk}`);
    wijkList.innerHTML = ""; // Maak de lijst eerst leeg

    const data = wijk === 'wijk1' ? wijk1Data : wijk2Data;

    data.forEach((item, index) => {
        wijkList.innerHTML += `
            <tr data-index="${index}">
                <td>${item.name}</td>
                <td>${item.address}</td>
                <td>${item.comment || ''}</td> <!-- Alleen de opmerking weergeven (geen invoerveld) -->
                <td><input type="checkbox" onchange="handleCheckboxChange(event, '${wijk}', ${index})" ${item.delivered ? 'checked' : ''}></td>
            </tr>
        `;
    });
}

function saveCheckboxStatus(wijk, index, status) {
    localStorage.setItem(`checkbox-status-${wijk}-${index}`, status);
}

function getCheckboxStatus(wijk, index) {
    return JSON.parse(localStorage.getItem(`checkbox-status-${wijk}-${index}`)) || false;
}

function resetBezorgstatus(wijk) {
    const tableRows = document.querySelectorAll(`#address-list-${wijk} tr`);
    tableRows.forEach(row => {
        row.style.display = '';  // Zorg ervoor dat alle rijen zichtbaar zijn
        row.querySelector('input[type="checkbox"]').checked = false; // Zet de checkbox uit
    });
    const data = wijk === 'wijk1' ? wijk1Data : wijk2Data;
    data.forEach(item => item.delivered = false);
}

document.getElementById("reset-button-wijk1").addEventListener("click", () => resetBezorgstatus("wijk1"));
document.getElementById("reset-button-wijk2").addEventListener("click", () => resetBezorgstatus("wijk2"));

document.addEventListener("DOMContentLoaded", loadAddresses);
