"use strict"

const fs = require("fs");
const path = require("path");

const emptyObject = {}

const NAME_OF_FILE_HOLDING_DEFAULT_ENCY = "default_ency2.txt";

const outputField = document.getElementById('output');
const enteredTerm = document.getElementById('termEntry');
const descriptionArea = document.getElementById('description');
const focusedTermLabel = document.getElementById("focusedTerm");
const fileSelector = document.getElementById("fileList");

function initializeEntries() {
    const failedReading = { sourcefilenames: undefined, entries: emptyObject };

    // case 1: the file containing the name of the default encyclopedia is not found. 
    if (!fs.existsSync(NAME_OF_FILE_HOLDING_DEFAULT_ENCY)) return failedReading;
    const sourcefilenames = fs.readFileSync(NAME_OF_FILE_HOLDING_DEFAULT_ENCY).toString().split("\n").map(str => str.trim());

    // case 2: the file containing the name of the default encyclopedia is found, but the file is empty
    if (sourcefilenames == "") return failedReading;
    
    let namesOfExistingFiles = [];
    for (const filename of sourcefilenames) {
        if (fs.existsSync(filename)) namesOfExistingFiles.push(filename)
    }
    // case 3: the filename found does not point to an existing file: loop over the names, trying to find one that works 
    if (namesOfExistingFiles.length == 0) return failedReading;
    const firstFile = namesOfExistingFiles[0];
    const sourcefilename = path.basename(firstFile);
    const data = fs.readFileSync(firstFile);

    // case 4: the file is empty. 
    if (!data || data.toString().trim() === "") return { sourcefilenames, entries: emptyObject };
    fs.copyFile(firstFile, `backup_${sourcefilename}`, (err) => {
        if (err) alert(`Error '${err} while making backup.`);
    });
    const lines = data.toString().split("\n").filter(line => line !== "");
    const entries = linesToEntries(lines);

    // case 5: the file has contents, so a true encyclopedia can be loaded.
    return { sourcefilenames, entries };
}

let { sourcefilenames, entries } = initializeEntries();
let nameOfCurrentFile = sourcefilenames[0];
const fileNameToDisplay = (nameOfCurrentFile) ? path.parse(nameOfCurrentFile).name : "<new file>";
document.title = `Encyclopedizer 2.0 - ${fileNameToDisplay}`;
fillFileSelector();

function loadFile(fileNameWithPath) {
    const sourcefilename = path.basename(fileNameWithPath);
    const data = fs.readFileSync(fileNameWithPath);
    if (!data || data.toString().trim() === "") return emptyObject;
    fs.copyFile(fileNameWithPath, `backup_${sourcefilename}`, (err) => {
        if (err) alert(`Error '${err} while making backup.`);
    });
    const lines = data.toString().split("\n").filter(line => line !== "");
    const fileNameToDisplay = (fileNameWithPath) ? path.parse(fileNameWithPath).name : "<new file>";
    document.title = `Encyclopedizer 2.0 - ${fileNameToDisplay}`;
    return linesToEntries(lines);
}

fileSelector.onchange= function() {
    saveAll()
    entries = loadFile(fileSelector.value);
    nameOfCurrentFile = fileSelector.value;
    analyze();
}

function fillFileSelector() {
    for (const filename of sourcefilenames) {
        const opt = document.createElement("option");
        opt.value = filename;
        opt.innerHTML = path.parse(filename).name; 
        fileSelector.appendChild(opt);
    }
}

// const debug = document.getElementById("debug")

const smaller = (a, b) => a < b;
const larger = (a, b) => a > b;
const startsWith = (a, b) => a.startsWith(b)

function caseInsensitive(f) {
    return (a, b) => f(a.toLocaleLowerCase(), b.toLocaleLowerCase());
}

function caseIndependentSort(a, b) {
    const aLower = a.toLocaleLowerCase();
    const bLower = b.toLocaleLowerCase();
    if (aLower < bLower) return -1;
    else if (aLower == bLower) return 0;
    else return 1;
}

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
    const term = line.slice(0, colonPosition).trim();
    const description = line.substring(colonPosition + 1).trim();
    return { term, description };
}


// from https://www.brainbell.com/javascript/show-save-dialog.html
const { remote } = require('electron'),
    dialog = remote.dialog,
    WIN = remote.getCurrentWindow();

let saveOptions = {
    //Placeholder 1
    title: "Save Encyclopedia",

    //Placeholder 2
    defaultPath: "D:\\Google Drive\\Job\\work_documents",

    //Placeholder 4
    buttonLabel: "Save File",

    //Placeholder 3
    filters: [
        { name: 'Text Files', extensions: ['txt'] },
        { name: 'All Files', extensions: ['*'] }
    ]
}


let loadOptions = {
    //Placeholder 1
    title: "Load Encyclopedia",

    //Placeholder 2
    defaultPath: "D:\\Google Drive\\Job\\work_documents",

    //Placeholder 4
    buttonLabel: "Load File",

    //Placeholder 3
    filters: [
        { name: 'Text Files', extensions: ['txt'] },
        { name: 'All Files', extensions: ['*'] }
    ]
}

//Synchronous

function saveAll() {
    if (!nameOfCurrentFile) {
        nameOfCurrentFile = dialog.showSaveDialogSync(WIN, saveOptions); // WORKS IF AI-FILE LOADED
        const fileNameToDisplay = (nameOfCurrentFile) ? path.parse(nameOfCurrentFile).name : "<new file>";
        document.title = `Encyclopedizer 2.0 - ${fileNameToDisplay}`;
    }
    const sortedTerms = Object.keys(entries).sort(caseIndependentSort);
    let totalText = ""
    for (const term of sortedTerms) {
        totalText = totalText + `${term}: ${entries[term].trim()}\n\n`;
    }
    fs.writeFile(nameOfCurrentFile, totalText, function (err) {
        if (err) alert(err);
    });
    fs.writeFile(NAME_OF_FILE_HOLDING_DEFAULT_ENCY, sourcefilenames.join("\n"), function (err) {
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

document.getElementById("loadEncy").onclick = function () {
    let newFilename = dialog.showOpenDialogSync(WIN, loadOptions);
    if (newFilename) {
        nameOfCurrentFile = newFilename[0];
        entries = loadFile(nameOfCurrentFile);
        analyze();
    }
}


