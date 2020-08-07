'use strict'

const fs = require("fs");

const data = fs.readFileSync("D:\\Development\\Electron\\Ency2\\AI2.txt");
const lines = data.toString().split("\n").filter(line => line !== "");
const entries = linesToEntries(lines)

const outputField = document.getElementById('output');
const enteredTerm = document.getElementById('termEntry');
const descriptionArea = document.getElementById('description');
const focusedTermLabel = document.getElementById("focusedTerm");
const debug = document.getElementById("debug")

output.innerText = data.toString()

analyze(data.toString())

function analyze(str) {
    document.getElementById("numEntries").innerHTML = Object.keys(entries).length; // may want to update this, but saving is more important!
    outputField.innerText = Object.keys(entries).join("\n");
}

function changeTerm() {
    const termGivenByUser = enteredTerm.value;
    const sortedKeys = Object.keys(entries).sort(caseIndependentSort);
    const selectedTerms = (termGivenByUser !== "") ? sortedKeys.filter(term => caseInsensitive(startsWith)(term, termGivenByUser)) : [];
    const firstTerm = (selectedTerms.length > 0) ? selectedTerms[0] : termGivenByUser;
    showNewEntry(firstTerm, sortedKeys);
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

function caseIndependentSort(a, b) {
    return a.toLowerCase().localeCompare(b.toLowerCase());
}

function caseInsensitive(f) {
    return (a, b) => f(a.toLocaleLowerCase(), b.toLocaleLowerCase());
}

const smaller = (a, b) => a < b;
const larger = (a, b) => a > b;
const startsWith = (a, b) => a.startsWith(b)

function saveAll() {
    const sortedTerms = Object.keys(entries).sort(caseIndependentSort);
    let totalText = ""
    for (const term of sortedTerms) {
        totalText = totalText + `${term}: ${entries[term]}\n\n`;
    }
    fs.writeFile("output.txt", totalText, function (err) {
        if (err) alert(err);
        alert('Saved file');
    });
}

function considerScrolling() {
    var event = window.event ? window.event : e;
    const keyCode = event.keyCode;
    const KEYCODE_DOWN = 40;
    const KEYCODE_UP = 38;
    const selectedTerm = focusedTermLabel.textContent ?? "";
    const sortedKeys = Object.keys(entries).sort(caseIndependentSort);
    if (keyCode === KEYCODE_DOWN) {
        const newTerm = sortedKeys.find(term => caseInsensitive(larger)(term, selectedTerm));
        if (newTerm) showNewEntry(newTerm, sortedKeys, true);
    } else if (keyCode === KEYCODE_UP) {
        const newTerm = sortedKeys.reverse().find(term => caseInsensitive(smaller)(term, selectedTerm));
        if (newTerm) showNewEntry(newTerm, sortedKeys, true);
    }
}

function showNewEntry(newTerm, sortedKeys, updateTermbox = false ) {
    if (updateTermbox) enteredTerm.value = newTerm;
    outputField.innerText = sortedKeys.filter(term => caseInsensitive(larger)(term, newTerm)).join("\n");
    const description = entries[newTerm] ?? "";
    focusedTermLabel.innerHTML = `<i>${newTerm}</i>`;
    descriptionArea.value = description;
}

