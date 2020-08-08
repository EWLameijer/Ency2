'use strict'

const fs = require("fs");
const path = require("path");

let filenameOfDefaultFile = "default_ency.txt";
const sourcefilenameWithPath = fs.readFileSync(filenameOfDefaultFile).toString().trim();
const sourcefilename = path.basename(sourcefilenameWithPath)

const data = fs.readFileSync(sourcefilenameWithPath);
fs.copyFile(sourcefilename, `backup_${sourcefilename}`, (err) => {
    if (err) throw err;
});
const lines = data.toString().split("\n").filter(line => line !== "");
const entries = linesToEntries(lines)

const outputField = document.getElementById('output');
const enteredTerm = document.getElementById('termEntry');
const descriptionArea = document.getElementById('description');
const focusedTermLabel = document.getElementById("focusedTerm");
const debug = document.getElementById("debug")

const smaller = (a, b) => a < b;
const larger = (a, b) => a > b;
const startsWith = (a, b) => a.startsWith(b)

function caseInsensitive(f) {
    return (a, b) => f(a.toLocaleLowerCase(), b.toLocaleLowerCase());
}

const caseIndependentSort = (a, b) => a.toLowerCase().localeCompare(b.toLowerCase());

const sortedKeys = () => Object.keys(entries).sort(caseIndependentSort);

// adjusted from https://stackoverflow.com/questions/3369593/how-to-detect-escape-key-press-with-pure-js-or-jquery
document.onkeydown = function (evt) {
    evt = evt || window.event;
    var isEscape = false;
    if ("key" in evt) {
        isEscape = (evt.key === "Escape" || evt.key === "Esc");
    } else {
        isEscape = (evt.keyCode === 27);
    }
    if (isEscape) {
        showNewEntry("", true);
        enteredTerm.focus();
    }
};

// START THE ACTUAL WORK!

output.innerText = data.toString()


analyze(data.toString())

function analyze(str) {
    document.getElementById("numEntries").innerHTML = Object.keys(entries).length; // may want to update this, but saving is more important!
    const keys = Object.keys(entries);
    outputField.innerText = keys.join("\n");
    const firstTerm = sortedKeys()[0];
    showNewEntry(firstTerm, true);
}

function changeTerm() {
    var event = window.event ? window.event : e;
    const keyCode = event.keyCode;
    const KEYCODE_ENTER = 13;
    const termGivenByUser = enteredTerm.value;
    const selectedTerms = (termGivenByUser !== "") ? sortedKeys().filter(term => caseInsensitive(startsWith)(term, termGivenByUser)) : [];
    const term = (keyCode === KEYCODE_ENTER || selectedTerms.length === 0) ? termGivenByUser : selectedTerms[0];

    showNewEntry(term);
    if (keyCode === KEYCODE_ENTER) descriptionArea.focus();
}

function updateDescription() {
    if (focusedTermLabel.textContent == "") focusedTermLabel.textContent = enteredTerm.value;
    const term = focusedTermLabel.textContent;
    entries[term] = descriptionArea.value;
}

function linesToEntries(lines) {
    const result = {};
    let mostRecentTerm = "";
    for (const line of lines) {
        const colonPosition = line.indexOf(":");
        if (line.startsWith("\t") || colonPosition < 0) {
            result[mostRecentTerm] = `${result[mostRecentTerm]}\n${line}`;
        } else {
            const { term, description } = getTermAndDescription(line);
            result[term] = description;
            mostRecentTerm = term;
        }
    }
    return result;
}

function getTermAndDescription(line) {
    const colonPosition = line.indexOf(":");
    const term = line.slice(0, colonPosition);
    const description = line.substring(colonPosition + 1).trim();
    return { term, description };
}

function saveAll() {
    const sortedTerms = Object.keys(entries).sort(caseIndependentSort);
    let totalText = ""
    for (const term of sortedTerms) {
        totalText = totalText + `${term}: ${entries[term].trim()}\n\n`;
    }
    fs.writeFile(sourcefilenameWithPath, totalText, function (err) {
        if (err) alert(err);
    });
}

function considerScrolling() {
    var event = window.event ? window.event : e;
    const keyCode = event.keyCode;
    const KEYCODE_DOWN = 40;
    const KEYCODE_UP = 38;
    const selectedTerm = focusedTermLabel.textContent ?? "";
    if (keyCode === KEYCODE_DOWN) {
        const newTerm = sortedKeys().find(term => caseInsensitive(larger)(term, selectedTerm));
        if (newTerm) showNewEntry(newTerm, true);
    } else if (keyCode === KEYCODE_UP) {
        const newTerm = sortedKeys().reverse().find(term => caseInsensitive(smaller)(term, selectedTerm));
        if (newTerm) showNewEntry(newTerm, true);
    }
}

function showNewEntry(newTerm, updateTermbox = false) {
    if (updateTermbox) enteredTerm.value = newTerm;
    outputField.innerText = sortedKeys().filter(term => caseInsensitive(larger)(term, newTerm)).join("\n");
    const description = entries[newTerm] ?? "";
    focusedTermLabel.innerHTML = `<i>${newTerm}</i>`;
    descriptionArea.value = description;
}

