'use strict'

const fs = require("fs");
const path = require("path");

const emptyObject = {}

const NAME_OF_FILE_HOLDING_DEFAULT_ENCY = "default_ency.txt"; // should be default_ency.txt

function initializeEntries() {
    // case 1: the file containing the name of the default encyclopedia is not found. //alert(`check 1`);
    //alert(`check 1`);
    if (!fs.existsSync(NAME_OF_FILE_HOLDING_DEFAULT_ENCY)) return { undefined, emptyObject };

    const sourcefilenameWithPath = fs.readFileSync(NAME_OF_FILE_HOLDING_DEFAULT_ENCY).toString().trim();
    //alert(`check 2 '${sourcefilenameWithPath}'`);
    // case 2: the file containing the name of the default encyclopedia is found, but the file is empty
    if (!sourcefilenameWithPath) return { undefined, emptyObject };
    alert(`check 3 '${sourcefilenameWithPath}'`); // works until here 
    //let sourcefilename = "";

    // case 3: the filename found does not point to an existing file.
    if (!fs.existsSync(sourcefilenameWithPath)) return { undefined, emptyObject };
    alert(`check 4 '${sourcefilenameWithPath}''`);

    const sourcefilename = path.basename(sourcefilenameWithPath);
    alert(`check 4b '${sourcefilename}''`);

    const data = fs.readFileSync(sourcefilenameWithPath);
    alert(`check 5 '${sourcefilenameWithPath}'data='${data.toString()}'`);

    // case 4: the file is empty. 
    if (!data || data.toString().trim() === "") return { sourcefilenameWithPath, emptyObject };
    alert(`check 6 '${sourcefilenameWithPath}''${data.toString()}'`);
    fs.copyFile(sourcefilenameWithPath, `backup_${sourcefilename}`, (err) => {
        if (err) alert(`Error '${err} while making backup.`);
    });
    const lines = data.toString().split("\n").filter(line => line !== "");
    alert(`check 7, firstLine is '${lines[0]}'`);
    const entries = linesToEntries(lines);
    alert(`check 8, first entry is '${entries}'`);
    return { sourcefilenameWithPath, entries };
}

const { sourcefilenameWithPath, entries } = initializeEntries();
const fileNameToDisplay = (sourcefilenameWithPath) ? path.parse(sourcefilenameWithPath).name : "<new file>";
document.title = `Encyclopedizer 2.0 - ${fileNameToDisplay}`;


const outputField = document.getElementById('output');
const enteredTerm = document.getElementById('termEntry');
const descriptionArea = document.getElementById('description');
const focusedTermLabel = document.getElementById("focusedTerm");
// const debug = document.getElementById("debug")

const smaller = (a, b) => a < b;
const larger = (a, b) => a > b;
const startsWith = (a, b) => a.startsWith(b)

function caseInsensitive(f) {
    return (a, b) => f(a.toLocaleLowerCase(), b.toLocaleLowerCase());
}

const caseIndependentSort = (a, b) => a.toLowerCase().localeCompare(b.toLowerCase());

const sortedKeys = () => Object.keys(entries).sort(caseIndependentSort);

const KEYCODE_HOME = 36;

document.getElementById("removeEntry").onclick = function () {
    const response = confirm("Remove this entry?");
    if (response) {
        const termToRemove = focusedTermLabel.textContent;
        // try to get the term after it; if that fails (last entry) go to the previous term, else (only entry) clear the field 
        const replacementTerm = sortedKeys().find(term => caseInsensitive(larger)(term, termToRemove)) ??
            sortedKeys().reverse().find(term => caseInsensitive(smaller)(term, termToRemove)) ?? "";
        showNewEntry(replacementTerm, true);
        delete entries[termToRemove];
    }
}

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
    } else if (evt.keyCode === KEYCODE_HOME) {
        showNewEntry(sortedKeys()[0], true);
    }
};

// START THE ACTUAL WORK!


analyze();

function analyze() {
    document.getElementById("numEntries").innerHTML = Object.keys(entries).length; // may want to update this, but saving is more important!
    const keys = Object.keys(entries);
    outputField.innerText = keys.join("\n");
    const firstTerm = sortedKeys()[0] ?? "";
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


// from https://www.brainbell.com/javascript/show-save-dialog.html
const { remote } = require('electron'),
    dialog = remote.dialog,
    WIN = remote.getCurrentWindow();

let options = {
    //Placeholder 1
    title: "Save file - Electron example",

    //Placeholder 4
    buttonLabel: "Save Encyclopedia",

    //Placeholder 3
    filters: [
        { name: 'Text files', extensions: ['txt'] },
        { name: 'All Files', extensions: ['*'] }
    ]
}

function saveAll() {
    let filename = dialog.showSaveDialog(WIN, options)
    console.log(filename)
    const sortedTerms = Object.keys(entries).sort(caseIndependentSort);
    let totalText = ""
    for (const term of sortedTerms) {
        totalText = totalText + `${term}: ${entries[term].trim()}\n\n`;
    }
    fs.writeFile(sourceFile, totalText, function (err) {
        if (err) alert(err);
    });
    fs.writeFile(NAME_OF_FILE_HOLDING_DEFAULT_ENCY, sourceFile, function (err) {
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

