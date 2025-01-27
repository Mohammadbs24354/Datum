const yearSelect1 = document.getElementById("yearSelect1");
const yearSelect2 = document.getElementById("yearSelect2");
const months = document.querySelectorAll(".month");
const selectionTable = document.getElementById("selectionTable");
const selectedDate = document.getElementById("selectedDate");
let chosenYear = null;
let chosenMonth = null;

for (let year = 2025; year <= 2037; year++) {
    yearSelect1.innerHTML += `<option value="${year}">${year}</option>`;
}
for (let year = 2038; year <= 2050; year++) {
    yearSelect2.innerHTML += `<option value="${year}">${year}</option>`;
}

function updateYear() {
    chosenYear = yearSelect1.value ? yearSelect1.value : yearSelect2.value;
    checkSelection();
}


yearSelect1.addEventListener("change", updateYear);
yearSelect2.addEventListener("change", updateYear);

months.forEach(month => {
    month.addEventListener("click", function () {
        chosenMonth = month.textContent.padStart(2, '0');
        checkSelection();
    });
});

function checkSelection() {
    if (chosenYear && chosenMonth) {
        selectedDate.value = `${chosenMonth}.${chosenYear}`;
        selectionTable.style.display = "none";
        selectedDate.style.display = "block";
    }
}