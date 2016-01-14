const Menu = require('menu')
const electronLocalshortcut = require('electron-localshortcut')

module.exports = {
	/**
	* @param selectors: the selectors for the non-standard actions
	* @return the menu
	*/
	build : function(selectors) {
	  return Menu.buildFromTemplate([
	    {
	      label: "Application",
	      submenu: [
	        { label: "About", selector: "orderFrontStandardAboutPanel:" },
	        { type: "separator" },
	        { label: "Quit", accelerator: "Command+Q", click: selectors.fullQuit }
	      ]
	    },
	    {
	      label: "Edit",
	      submenu: [
	        { label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
	        { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
	        { type: "separator" },
	        { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
	        { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
	        { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
	        { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" }
	      ]
	    },
	    {
	      label: 'View',
	      submenu: [
	        { label: 'Toggle Full Screen', accelerator: 'Ctrl+Command+F', click: selectors.fullscreenToggle },
	        { type: "separator" },
	        { label: "Reload", accelerator: "CmdOrCtrl+R", click: selectors.reload },
	        { label: "Developer Tools", accelerator: "Alt+CmdOrCtrl+J", click: selectors.devTools }
	      ]
	    },
	    {
	      label: 'Window',
	      role: 'window',
	      submenu: [
	        { label: 'Minimize', accelerator: 'CmdOrCtrl+M', role: 'minimize' }
	      ]
	    },
	    {
	      label: 'Help',
	      role: 'help',
	      submenu: [
	        { label: 'Project Homepage', click: selectors.learnMore },
	        { label: 'Report a Bug', click: selectors.bugReport }
	      ]
	    },
	  ]);
	},

	/**
	* Binds the hidden shortcuts that don't appear in the menu to a window
	* @param window: the window to bind to
	*/
	bindHiddenShortcuts : function(window) {
		electronLocalshortcut.register(window, 'Cmd+H', () => {
	    window.hide()
	  });
	}
}