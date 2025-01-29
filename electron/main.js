const { app, BrowserWindow } = require('electron');
const path = require('path');
const express = require('express');
const serverApp = require('../server/index.js');

function createWindow() {
	const win = new BrowserWindow({
		width: 1200,
		height: 800,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false
		},
		icon: path.join(__dirname, '../build/icon.ico')
	});

	// Carrega o app na janela
	win.loadURL('http://localhost:5000');

	// Remove menu bar in production
	if (app.isPackaged) {
		win.removeMenu();
	}
}

app.whenReady().then(() => {
	createWindow();

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});