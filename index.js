// from https://www.electronjs.org/docs/tutorial/first-app
// TODO: get contents of term and info from file (so also first create file)


/*20200727 extra round 1:
  Reading local files from JavaScript is HARD!
  As alternative option, try Swing next time; 10 electron, 10 swing.
  I also REALLY need to order an Electron book.

  20200727 extra round 2:
  OK. Some people use a framework like VUE with Electron. Or a library like JQuery

  I would like to skip that for now
  Hmm... Would Electron basically be and work the same as a normal browser-based application? That electron is just a presenter on the Desktop?
  In that case, I would need to know how to make a regular JavaScript web application (likely loading some libraries in the HTML)
  1. Check how a regular JavaScript application loads js from HTML // with <script src="x/.js"></script>
  2. Make a test-JS-application with two input fields, and returns the product in an output field. // need to study onchange (and examples)
  3. Add an textarea, try to fill it with contents from a file
  4. Now check the steps in the SwingEncy

*/

const { app, BrowserWindow } = require('electron')

function createWindow () {
  // Create the browser window.
  const win = new BrowserWindow({
    width: 1600,
    height: 800,
    webPreferences: {
      nodeIntegration: true
    }
  })

  // and load the index.html of the app.
  win.loadFile('index.html')
}

app.whenReady().then(createWindow)
