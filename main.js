"use strict"

const fs = require("fs");
const path = require("path");

const emptyObject = {}

const NAME_OF_FILE_HOLDING_DEFAULT_ENCY = "default_ency.txt";

const g_ui = {
    termsField: document.getElementById('termsList'),
    enteredTerm: document.getElementById('termEntry'),
    descriptionArea: document.getElementById('description'),
    focusedTermLabel: document.getElementById("focusedTerm"),
    fileSelector: document.getElementById("fileList"),
    numEntriesLabel: document.getElementById("numEntries")
}

function caseIndependentSort(a, b) {
    const aLower = a.toLocaleLowerCase();
    const bLower = b.toLocaleLowerCase();
    if (aLower < bLower) return -1;
    else if (aLower == bLower) return 0;
    else return 1;
}

const g_data = {
    sourcefilenames: [],
    entries: {},
    sortedKeys: function () { return Object.keys(this.entries).sort(caseIndependentSort) },
    nameOfCurrentFile: function () { return this.sourcefilenames.length === 0 ? undefined : this.sourcefilenames[0]; }
}

function initialize() {
    g_data.sourcefilenames = [];
    g_data.entries = {};

    // case 1: the file containing the name of the default encyclopedia is not found. 
    if (!fs.existsSync(NAME_OF_FILE_HOLDING_DEFAULT_ENCY)) return;
    const sourcefilenames = fs.readFileSync(NAME_OF_FILE_HOLDING_DEFAULT_ENCY).toString().split("\n").map(str => str.trim());

    // case 2: the file containing the name of the default encyclopedia is found, but the file is empty
    if (sourcefilenames == "") return;

    let namesOfExistingFiles = [];
    for (const filename of sourcefilenames) {
        if (fs.existsSync(filename)) namesOfExistingFiles.push(filename)
    }
    // case 3: the filename found does not point to an existing file: loop over the names, trying to find one that works 
    if (namesOfExistingFiles.length == 0) return;
    g_data.sourcefilenames = namesOfExistingFiles;
    const firstFile = namesOfExistingFiles[0];
    loadFile(firstFile);
}

initialize();

function loadFile(fileNameWithPath) {
    const newlyPrioritizedFilenames = g_data.sourcefilenames.filter(filename => filename !== fileNameWithPath);
    newlyPrioritizedFilenames.unshift(fileNameWithPath);
    g_data.sourcefilenames = newlyPrioritizedFilenames;

    const sourcefilename = path.basename(fileNameWithPath);
    const data = fs.readFileSync(fileNameWithPath);
    if (!data || data.toString().trim() === "") return emptyObject;
    fs.copyFile(fileNameWithPath, `backup_${sourcefilename}`, (err) => {
        if (err) alert(`Error '${err} while making backup.`);
    });
    const lines = data.toString().split("\n").filter(line => line !== "");
    const fileNameToDisplay = (fileNameWithPath) ? path.parse(fileNameWithPath).name : "<new file>";
    document.title = `Encyclopedizer 2.0 - ${fileNameToDisplay}`;
    fillFileSelector();
    g_data.entries = linesToEntries(lines);
    analyze();
}

g_ui.fileSelector.onchange = function () {
    saveAll()
    const nameOfFileToLoad = this.value;
    if (nameOfFileToLoad) loadFile(nameOfFileToLoad);
}

function fillFileSelector() {
    g_ui.fileSelector.innerHTML = "";
    for (const filename of g_data.sourcefilenames) {
        const opt = document.createElement("option");
        opt.value = filename;
        opt.innerHTML = path.parse(filename).name;
        g_ui.fileSelector.appendChild(opt);
    }
}

const smaller = (a, b) => a < b;
const larger = (a, b) => a > b;
const startsWith = (a, b) => a.startsWith(b)

function caseInsensitive(f) {
    return (a, b) => f(a.toLocaleLowerCase(), b.toLocaleLowerCase());
}

const KEYCODE_HOME = 36;

document.getElementById("removeEntry").onclick = function () {
    const response = confirm("Remove this entry?");
    if (response) {
        const termToRemove = g_ui.focusedTermLabel.textContent;
        // try to get the term after it; if that fails (last entry) go to the previous term, else (only entry) clear the field 
        const replacementTerm = g_data.sortedKeys().find(term => caseInsensitive(larger)(term, termToRemove)) ??
            g_data.ssortedKeys().reverse().find(term => caseInsensitive(smaller)(term, termToRemove)) ?? "";
        showNewEntry(replacementTerm, true);
        delete g_data.entries[termToRemove];
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
        g_ui.enteredTerm.focus();
    } else if (evt.keyCode === KEYCODE_HOME) {
        showNewEntry(g_data.sortedKeys()[0], true);
    }
};

function analyze() {
    g_ui.numEntriesLabel.innerHTML = Object.keys(g_data.entries).length; // may want to update this, but saving is more important!
    const keys = g_data.sortedKeys();
    g_ui.termsField.innerText = keys.join("\n");
    const firstTerm = keys[0] ?? "";
    showNewEntry(firstTerm, true);
}

g_ui.enteredTerm.onkeyup = function () {
    var event = window.event 
    const keyCode = event.keyCode;
    const KEYCODE_ENTER = 13;
    const termGivenByUser = g_ui.enteredTerm.value;
    const selectedTerms = (termGivenByUser !== "") ? g_data.sortedKeys().filter(term => caseInsensitive(startsWith)(term, termGivenByUser)) : [];
    const term = (keyCode === KEYCODE_ENTER || selectedTerms.length === 0) ? termGivenByUser : selectedTerms[0];

    showNewEntry(term);
    if (keyCode === KEYCODE_ENTER) g_ui.descriptionArea.focus();
}

g_ui.descriptionArea.onkeyup = function () {
    if (g_ui.focusedTermLabel.textContent == "") g_ui.focusedTermLabel.textContent = g_ui.enteredTerm.value;
    const term = g_ui.focusedTermLabel.textContent;
    g_data.entries[term] = g_ui.descriptionArea.value;
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
    if (!g_data.nameOfCurrentFile()) {
        g_data.sourcefilenames.unshift(dialog.showSaveDialogSync(WIN, saveOptions)); // WORKS IF AI-FILE LOADED
        const fileNameToDisplay = (g_data.nameOfCurrentFile()) ? path.parse(g_data.nameOfCurrentFile()).name : "<new file>";
        document.title = `Encyclopedizer 2.0 - ${fileNameToDisplay}`;
    }
    let totalText = ""
    for (const term of g_data.sortedKeys()) {
        totalText = totalText + `${term}: ${g_data.entries[term].trim()}\n\n`;
    }
    fs.writeFile(g_data.nameOfCurrentFile(), totalText, function (err) {
        if (err) alert(err);
    });
    fs.writeFile(NAME_OF_FILE_HOLDING_DEFAULT_ENCY, g_data.sourcefilenames.join("\n"), function (err) {
        if (err) alert(err);
    });
}

g_ui.enteredTerm.onkeydown = function () {
    var event = window.event;
    const keyCode = event.keyCode;
    const KEYCODE_DOWN = 40;
    const KEYCODE_UP = 38;
    const selectedTerm = g_ui.focusedTermLabel.textContent ?? "";
    if (keyCode === KEYCODE_DOWN) {
        const newTerm = g_data.sortedKeys().find(term => caseInsensitive(larger)(term, selectedTerm));
        if (newTerm) showNewEntry(newTerm, true);
    } else if (keyCode === KEYCODE_UP) {
        const newTerm = g_data.sortedKeys().reverse().find(term => caseInsensitive(smaller)(term, selectedTerm));
        if (newTerm) showNewEntry(newTerm, true);
    }
}

function showNewEntry(newTerm, updateTermbox = false) {
    if (updateTermbox) g_ui.enteredTerm.value = newTerm;
    g_ui.termsField.innerText = g_data.sortedKeys().filter(term => term.toLocaleLowerCase() > newTerm.toLocaleLowerCase()).join("\n");
    g_ui.focusedTermLabel.innerHTML = `<i>${newTerm}</i>`;
    g_ui.descriptionArea.value = g_data.entries[newTerm] ?? "";
}

document.getElementById("loadEncy").onclick = function () {
    let newFilename = dialog.showOpenDialogSync(WIN, loadOptions);
    if (newFilename) loadFile(newFilename[0]);
}


