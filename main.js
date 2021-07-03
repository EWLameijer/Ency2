"use strict"

const fs = require("fs");
const path = require("path");

const emptyObject = {}

const NAME_OF_FILE_HOLDING_DEFAULT_ENCY = "default_ency.txt";
const NAME_OF_FILE_HOLDING_SETTINGS = "ency_settings.txt";

// main data: 
//  -g_ui
//  -g_data
// functions: 
//  -caseIndependentSort(firstString, secondString): number => for sorting alphabetically but ignoring case 
//  -initialize() => called on startup, loads defauly encyclopedia (if present)
//  -errorHandler(message) : (error) -> void => small utility function, returning error-handling function
//  -loadFile(filenameWithPath) => loads an encyclopedia
//  *g_ui.fileSelector.onchange => handles the using selecting another encyclopedia from the 'box'
//  -fillFileSelector() => fills the file selector element 
//  -caseInsensitive(func): (firstString, secondString) -> func(firstString.toLowerCase(), secondString.toLowerCase()) => utility function for comparison
//  *g_ui.removeEntryButton.onclick => handles an entry being removed.
//  -boolToVisibility(bool): string => boolean to visibility
//  -setExtraRenameFieldsVisibility(bool) => sets the extra rename fields 
//  *g_ui.toggleRenameButton.onclick => handles the renaming of a term
//  *g_ui.newEncyButton.onclick => handles the button that creates a new encyclopedia 
//  *document.onkeydown => handles generic key presses, like escape to clear 

const g_ui = {
    confirmRenameButton: document.querySelector("#confirmRenameEntry"),
    enteredTerm: document.querySelector('#termEntry'),
    descriptionArea: document.querySelector('#description'),
    focusedTermLabel: document.querySelector("#focusedTerm"),
    fileSelector: document.querySelector("#fileList"),
    loadButton: document.querySelector("#loadEncy"),
    newEncyButton: document.querySelector("#newEncy"),
    numEntriesLabel: document.querySelector("#numEntries"),
    removeEntryButton: document.querySelector("#removeEntry"),
    renamedTerm: document.querySelector("#renamedTermEntry"),
    saveButton: document.querySelector("#save"),
    searchTermField: document.querySelector("#soughtTermEntry"),
    termsField: document.querySelector('#termsList'),
    toggleRenameButton: document.querySelector("#renameEntry")
}

const g_data = {
    entries: {},
    initialize: function () { this.sourcefilenames = []; this.entries = {}; },
    nameOfCurrentFile: function () { return this.sourcefilenames.length === 0 ? undefined : this.sourcefilenames[0]; },
    originalEntries: {},
    sortedKeys: function () { return Object.keys(this.entries).sort(caseIndependentSort) },
    sourcefilenames: [],
    standardEncyDirectory: "",
}

function caseIndependentSort(a, b) {
    const aLower = a.toLocaleLowerCase();
    const bLower = b.toLocaleLowerCase();
    if (aLower < bLower) return -1;
    else if (aLower == bLower) return 0;
    else return 1;
}

function initialize() {
    g_data.initialize();
    setExtraRenameFieldsVisibility(false);

    if (fs.existsSync(NAME_OF_FILE_HOLDING_SETTINGS)) g_data.standardEncyDirectory = fs.readFileSync(NAME_OF_FILE_HOLDING_SETTINGS).toString();

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

class TermsList {
    constructor(dataSource, listOutputField) {
        this.dataSource = dataSource;
        this.listOutputField = listOutputField;
        this.reset();
    }

    reset() {
        this.currentTerm = "";
        this.termsList = this.getTermsList(); // ALL terms that can be selected, given the current filter
        this.showNextTermsList();
    }

    goToTerm(term) {
        this.currentTerm = term;
    }

    goDown() {
        const nextTerm = this.termsList.find(term => caseInsensitive(larger)(term, this.currentTerm));
        if (nextTerm != undefined) {
            this.currentTerm = nextTerm;
            this.showNextTermsList();
            loadTerm(nextTerm);
        }
    }

    goUp() {
        const previousTerm = this.termsList.reverse().find(term => caseInsensitive(smaller)(term, this.currentTerm));
        if (previousTerm != undefined) { // TODO DUPLICATE
            this.currentTerm = previousTerm;
            this.showNextTermsList();
            loadTerm(previousTerm);
        }
        
    }

    showNextTermsList() {
        this.listOutputField.innerText = this.termsList.filter(term => term.toLocaleLowerCase() > this.currentTerm.toLocaleLowerCase()).join("\n");
    }

    getTermsList() {
        const filter = g_ui.searchTermField.value;
        const lowercaseFilter = filter.toLowerCase()
        return this.dataSource.sortedKeys().filter(term => term.toLowerCase().includes(lowercaseFilter))
    }
}

const termsList = new TermsList(g_data, g_ui.termsField);

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
    g_data.originalEntries = {};
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
const contains = (a, b) => a.includes(b)

function caseInsensitive(f) {
    return (a, b) => f(a.toLocaleLowerCase(), b.toLocaleLowerCase());
}

const KEYCODE_HOME = 36;



function boolToVisibility(shouldBeVisible) {
    return shouldBeVisible ? "visible" : "hidden";
}

function setExtraRenameFieldsVisibility(shouldBeVisible) {
    const visibilityAsString = boolToVisibility(shouldBeVisible);
    g_ui.renamedTerm.style.visibility = visibilityAsString;
    g_ui.confirmRenameButton.style.visibility = visibilityAsString;
}

g_ui.toggleRenameButton.onclick = function () {
    if (g_ui.renamedTerm.style.visibility == "hidden") {
        setExtraRenameFieldsVisibility(true);
        g_ui.toggleRenameButton.innerHTML = "Cancel Rename";
    } else {
        renamingBackToNormalMode();
    }
}


g_ui.confirmRenameButton.onclick = function () {
    const newTerm = g_ui.renamedTerm.value;
    if (newTerm) {
        const oldTerm = g_ui.focusedTermLabel.textContent;
        g_data.entries[newTerm] = g_data.entries[oldTerm];
        delete g_data.entries[oldTerm];
        loadTerm(newTerm);
    }
    renamingBackToNormalMode();
}

g_ui.newEncyButton.onclick = function () {
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
    } else if (evt.key.toLowerCase() === "s" && evt.ctrlKey) {
        saveAll();
    }
};

function renamingBackToNormalMode() {
    setExtraRenameFieldsVisibility(false);
    g_ui.toggleRenameButton.innerHTML = "Rename Entry";
}

function showFileNameChange() {
    updateTitle();
    fillFileSelector();
}

function updateUiOnFileLoad() {
   
    showFileNameChange()
    g_ui.numEntriesLabel.innerHTML = Object.keys(g_data.entries).length + g_data.sortedKeys(); // may want to update this, but saving is more important!
    
     const keys = g_data.sortedKeys();
    // TODO works until here!
    termsList.reset();
    const firstTerm = keys[0] ?? "";
    loadTerm(firstTerm);
    //prompt("DONEupdatingUI")
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

g_ui.searchTermField.onkeyup = function () {
    // TODO
    const searchTerm = g_ui.searchTermField.value;
    const selectedTerms = g_data.sortedKeys().filter(term => caseInsensitive(contains)(term, searchTerm));
    confirm("ello + " + selectedTerms)
    const term = selectedTerms[0]
    confirm("ello + " + term)
    showNewEntry(term);
}

function quoted(text) {
    let result = '"'
    for (const ch of text) {
        if (ch === '"' || ch === '\\') result += '\\';
        result += ch;
    }
    return result + '"';
}

g_ui.descriptionArea.onkeyup = function () {
    if (g_ui.focusedTermLabel.textContent == "") g_ui.focusedTermLabel.textContent = g_ui.enteredTerm.value;
    const term = g_ui.focusedTermLabel.textContent;
    g_data.entries[term] = quoted(g_ui.descriptionArea.value);
    updateTitle(); // reflect that the contents are modified
}


/*
Okay. So there can be two kinds of inputs:
'normal' 
a : b
    c:d
    e 

or quoted 
a: "b 
c:d
e"

the second differs from the first in that a) the description is recognized to start with a '"'

*/
function linesToEntries(lines) {
    const result = {};
    let inQuotedDescription = false;
    let mostRecentTerm = "";
    for (const line of lines) {
        const colonPosition = line.indexOf(":");
        if (!inQuotedDescription) {
            if (line.startsWith("\t") || colonPosition < 0) {
                result[mostRecentTerm] = `${result[mostRecentTerm]}\n${line}`;
            } else {
                const { term, description } = getTermAndDescription(line);
                result[term] = description;
                if (opensUnclosedQuote(description)) inQuotedDescription = true;
                mostRecentTerm = term;
            }
        } else {
            result[mostRecentTerm] = `${result[mostRecentTerm]}\n${line}`;
            if (closesQuote(line)) inQuotedDescription = false;
        }
    }
    ensureAllAreQuoted(result);
    return result;
}

function opensUnclosedQuote(text) {
    return text[0] === '"' && !closesQuote(text);
}

function countBackslashesAtEnd(text) {
    let count = 0;
    for (let i = text.length - 1; i >= 0; i--) {
        if (text[i] !== '\\') break;
        else count++;
    }
    return count;
}

function closesQuote(text) {
    return text[text.length - 1] === '"' && countBackslashesAtEnd(text.substring(0, text.length - 1)) % 2 == 0
}

function ensureAllAreQuoted(ency) {
    for (const term in ency) {
        const description = ency[term];
        if (description[0] !== '"' || !closesQuote(description)) ency[term] = quoted(description)
    }
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
    defaultPath: g_data.standardEncyDirectory,
    filters: [
        { name: 'Text Files', extensions: ['txt'] },
        { name: 'All Files', extensions: ['*'] }
    ]
}

let saveOptions = { title: "Save Encyclopedia", buttonLabel: "Save File", ...baseOptions };

let loadOptions = { title: "Load Encyclopedia", buttonLabel: "Load File", ...baseOptions };

let deleteContentsOptions = {
    title: "Delete term?",
    buttons: ["Yes", "Cancel"],
    message: "Do you really want to delete this term?"
}



function saveAll() {
    if (!g_data.nameOfCurrentFile()) { // get rid of undefined start 
        g_data.sourcefilenames[0] = (dialog.showSaveDialogSync(WIN, saveOptions));
        fillFileSelector();
        updateStandardEncyDirectory();
    }
    let totalText = ""
    for (const term of g_data.sortedKeys()) {
        totalText += `${term}: ${g_data.entries[term].trim()}\n\n`;
    }
    fs.writeFile(g_data.nameOfCurrentFile(), totalText, errorHandler("saveAll error: cannot write to output file"));
    fs.writeFile(NAME_OF_FILE_HOLDING_DEFAULT_ENCY, g_data.sourcefilenames.join("\n"), errorHandler("saveAll error: cannot write to ency file glossary"));
    const currentTerm = g_ui.focusedTermLabel.textContent;
    g_data.originalEntries = { [currentTerm]: g_data.entries[currentTerm] };
    updateTitle();
}

g_ui.saveButton.onclick = saveAll

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
    const originalEntries = g_data.originalEntries;
    let modifiedSinceLastSave = false;
    for (const term in originalEntries) {
        if (originalEntries[term] !== g_data.entries[term]) modifiedSinceLastSave = true;
    }
    const modifiedPart = (modifiedSinceLastSave) ? "UNSAVED CHANGES" : "saved"
    document.title = `Encyclopedizer 2.1 - ${fileNameToDisplay} - ${modifiedPart}`;
}

function loadTerm(newTerm) {
    g_ui.enteredTerm.value = newTerm;
    showNewEntry(newTerm);
}


function showNewEntry(newTerm) {
    termsList.goToTerm(newTerm);
    g_ui.focusedTermLabel.innerText = newTerm;
    g_ui.descriptionArea.value = unquoted(g_data.entries[newTerm] ?? "");
    if (g_data.originalEntries[newTerm] === undefined) g_data.originalEntries[newTerm] = g_data.entries[newTerm];
}

function unquoted(text) {
    const rawContents = text.substring(1, text.length - 1);
    let result = "";
    let keepNextBackslash = false;
    for (const index in Object.keys(rawContents)) {
        if (isEscapingBackslash(parseInt(index), rawContents) && !keepNextBackslash) keepNextBackslash = true;
        else {
            result += rawContents[index];
            keepNextBackslash = false;
        }
    }
    return result;
}

function isEscapingBackslash(index, text) {
    return (index < text.length - 1) && (text[index] === '\\') && (text[index + 1] === '"' || text[index + 1] === '\\');
}

g_ui.loadButton.onclick = function () {
    let newFilename = dialog.showOpenDialogSync(WIN, loadOptions);
    if (newFilename) {
        loadFile(newFilename[0]);
        updateStandardEncyDirectory();
    }
}

function updateStandardEncyDirectory() {
    g_data.standardEncyDirectory = path.dirname(g_data.sourcefilenames[0]);
    fs.writeFile(NAME_OF_FILE_HOLDING_SETTINGS, g_data.standardEncyDirectory, errorHandler("saveAll error: cannot write to configuration file"));
}

g_ui.removeEntryButton.onclick = function () {
    dialog.showMessageBox(WIN, deleteContentsOptions).then(result => {
        if (result.response === 0) {
            const termToRemove = g_ui.focusedTermLabel.textContent;
            // try to get the term after it; if that fails (last entry) go to the previous term, else (only entry) clear the field 
            const replacementTerm = g_data.sortedKeys().find(term => caseInsensitive(larger)(term, termToRemove)) ??
                g_data.sortedKeys().reverse().find(term => caseInsensitive(smaller)(term, termToRemove)) ?? "";
            delete g_data.entries[termToRemove];
            loadTerm(replacementTerm);
        }
    }
    );
}

