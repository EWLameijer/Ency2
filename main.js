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
    initialize: function () { this.sourcefilenames = []; this.entries = {}; },
    sourcefilenames: [],
    entries: {},
    sortedKeys: function () { return Object.keys(this.entries).sort(caseIndependentSort) },
    nameOfCurrentFile: function () { return this.sourcefilenames.length === 0 ? undefined : this.sourcefilenames[0]; }
}

function initialize() {
    g_data.initialize();

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

function errorHandler(message) {
    return (err) => {
        if (err) alert(message);
    }
}

function loadFile(fileNameWithPath) {
    const newlyPrioritizedFilenames = g_data.sourcefilenames.filter(filename => filename !== fileNameWithPath);
    newlyPrioritizedFilenames.unshift(fileNameWithPath);
    g_data.sourcefilenames = newlyPrioritizedFilenames;

    const sourcefilename = path.basename(fileNameWithPath);
    const data = fs.readFileSync(fileNameWithPath);
    if (!data || data.toString().trim() === "") return emptyObject;
    fs.copyFile(fileNameWithPath, `backup_${sourcefilename}`, errorHandler("Cannot back up file!"));
    const lines = data.toString().split("\n").filter(line => line !== "");


    g_data.entries = linesToEntries(lines);
    updateUiOnFileLoad();
}

g_ui.fileSelector.onchange = function () {
    const nameOfFileToLoad = this.value;
    saveAll()
    if (nameOfFileToLoad) loadFile(nameOfFileToLoad);
}

function fillFileSelector() {
    g_ui.fileSelector.innerHTML = "";
    for (const filename of g_data.sourcefilenames) {
        const opt = document.createElement("option");
        if (filename) {
            opt.value = filename;
            opt.innerHTML = path.parse(filename).name;
        } else {
            opt.value = "new file";
            opt.innerHTML = "&lt;new file&gt;";
        }
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
            g_data.sortedKeys().reverse().find(term => caseInsensitive(smaller)(term, termToRemove)) ?? "";
        loadTerm(replacementTerm);
        delete g_data.entries[termToRemove];
    }
}

document.getElementById("newEncy").onclick = function () {
    saveAll();
    g_data.sourcefilenames.unshift(undefined);
    g_data.entries = {};
    updateUiOnFileLoad();
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
        loadTerm("");
        g_ui.enteredTerm.focus();
    } else if (evt.keyCode === KEYCODE_HOME && evt.ctrlKey) {
        loadTerm(g_data.sortedKeys()[0]);
    }
};

function showFileNameChange() {
    updateTitle();
    fillFileSelector();
}

function updateUiOnFileLoad() {
    showFileNameChange()
    g_ui.numEntriesLabel.innerHTML = Object.keys(g_data.entries).length; // may want to update this, but saving is more important!
    const keys = g_data.sortedKeys();
    g_ui.termsField.innerText = keys.join("\n");
    const firstTerm = keys[0] ?? "";
    loadTerm(firstTerm);
}

g_ui.enteredTerm.onkeyup = function () {
    const keyCode = window.event.keyCode;
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


let baseOptions = {
    defaultPath: "D:\\Google Drive\\Job\\work_documents",
    filters: [
        { name: 'Text Files', extensions: ['txt'] },
        { name: 'All Files', extensions: ['*'] }
    ]
}

let saveOptions = Object.assign({ title: "Save Encyclopedia", buttonLabel: "Save File" }, baseOptions);

let loadOptions = Object.assign({ title: "Load Encyclopedia", buttonLabel: "Load File" }, baseOptions);

//Synchronous

function saveAll() {
    if (!g_data.nameOfCurrentFile()) { // get rid of undefined start 
        g_data.sourcefilenames[0] = (dialog.showSaveDialogSync(WIN, saveOptions));
        showFileNameChange();
    }
    let totalText = ""
    for (const term of g_data.sortedKeys()) {
        totalText += `${term}: ${g_data.entries[term].trim()}\n\n`;
    }
    fs.writeFile(g_data.nameOfCurrentFile(), totalText, errorHandler("saveAll error: cannot write to output file"));
    fs.writeFile(NAME_OF_FILE_HOLDING_DEFAULT_ENCY, g_data.sourcefilenames.join("\n"), errorHandler("saveAll error: cannot write to configuration file"));
}

g_ui.enteredTerm.onkeydown = function () {
    const keyCode = window.event.keyCode;
    const KEYCODE_DOWN = 40;
    const KEYCODE_UP = 38;
    const selectedTerm = g_ui.focusedTermLabel.textContent ?? "";
    if (keyCode === KEYCODE_DOWN) {
        const newTerm = g_data.sortedKeys().find(term => caseInsensitive(larger)(term, selectedTerm));
        if (newTerm) loadTerm(newTerm);
    } else if (keyCode === KEYCODE_UP) {
        const newTerm = g_data.sortedKeys().reverse().find(term => caseInsensitive(smaller)(term, selectedTerm));
        if (newTerm) loadTerm(newTerm);
    }
}

function updateTitle() {
    const fileNameToDisplay = (g_data.nameOfCurrentFile()) ? path.parse(g_data.nameOfCurrentFile()).name : "<new file>";
    document.title = `Encyclopedizer 2.0 - ${fileNameToDisplay}`;
}

function loadTerm(newTerm) {
    g_ui.enteredTerm.value = newTerm;
    showNewEntry(newTerm);
}

function showNewEntry(newTerm) {
    g_ui.termsField.innerText = g_data.sortedKeys().filter(term => term.toLocaleLowerCase() > newTerm.toLocaleLowerCase()).join("\n");
    g_ui.focusedTermLabel.innerHTML = `<i>${newTerm}</i>`;
    g_ui.descriptionArea.value = g_data.entries[newTerm] ?? "";
}

document.getElementById("loadEncy").onclick = function () {
    let newFilename = dialog.showOpenDialogSync(WIN, loadOptions);
    if (newFilename) loadFile(newFilename[0]);
}


