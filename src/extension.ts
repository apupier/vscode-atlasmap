import * as child_process from 'child_process';
import * as vscode from 'vscode';
import { TextDecoder } from 'util';

export function activate(context: vscode.ExtensionContext) {

	var atlasmapServerOutputChannel = vscode.window.createOutputChannel("Atlasmap server");

	var path = require('path');
	var atlasmapExecutablePath = context.asAbsolutePath(path.join('jars','atlasmap-standalone.jar'));

	context.subscriptions.push(vscode.commands.registerCommand('atlasmap.open', () => {
		AtlasMapPanel.createOrShow(context.extensionPath);
	}));
	if (vscode.window.registerWebviewPanelSerializer) {
		// Make sure we register a serializer in activation event
		vscode.window.registerWebviewPanelSerializer(AtlasMapPanel.viewType, {
			async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
				console.log(`Got state: ${state}`);
				AtlasMapPanel.revive(webviewPanel, context.extensionPath);
			}
		});
	}

	context.subscriptions.push(vscode.commands.registerCommand('atlasmap.start', () => {
		var atlasmapProcess = child_process.spawn(
			'java', ['-jar', atlasmapExecutablePath]
		);
		atlasmapProcess.stdout.on('data', function(data){
			var dec = new TextDecoder("utf-8");
			atlasmapServerOutputChannel.append(dec.decode(data));
		});
	}));

}

/**
 * Manages atlas mapper webview panels
 */
class AtlasMapPanel {
	// the URL of the local atlasmap ui
	private static readonly ATLAS_MAP_URL = "http://127.0.0.1:8585";

	/**
     * Track the currently panel. Only allow a single panel to exist at a time.
     */
	public static currentPanel: AtlasMapPanel | undefined;
	public static readonly viewType = 'atlasmap';

	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionPath: string;
	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(extensionPath: string) {
		const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

		// If we already have a panel, show it.
		if (AtlasMapPanel.currentPanel) {
			AtlasMapPanel.currentPanel._panel.reveal(column);
			return;
		}

		// Otherwise, create a new panel.
		const panel = vscode.window.createWebviewPanel(AtlasMapPanel.viewType, "AtlasMap", column || vscode.ViewColumn.One, {
			enableScripts: true
		});

		AtlasMapPanel.currentPanel = new AtlasMapPanel(panel, extensionPath);
	}

	public static revive(panel: vscode.WebviewPanel, extensionPath: string) {
		AtlasMapPanel.currentPanel = new AtlasMapPanel(panel, extensionPath);
	}

	private constructor(panel: vscode.WebviewPanel, extensionPath: string) {
		this._panel = panel;
		this._extensionPath = extensionPath;

		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programatically
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// Update the content based on view changes
		this._panel.onDidChangeViewState(e => {
			if (this._panel.visible) {
				this._update();
			}
		}, null, this._disposables);

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(message => {
			if (message.command == 'alert') {
				vscode.window.showErrorMessage(message.text);
				return;
			}
		}, null, this._disposables);

		// Set the webview's initial html content 
		this._update();
	}

	public dispose() {
		AtlasMapPanel.currentPanel = undefined;

		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	private _update() {
		this._panel.title = "AtlasMap";
		this.loadWebContent();
	}

	private loadWebContent() {
		var fetchUrl = require("fetch").fetchUrl;
		fetchUrl(AtlasMapPanel.ATLAS_MAP_URL, function(error, meta, body) {
			try {
				//AtlasMapPanel.currentPanel._panel.webview.html = body.toString();

				var content = `
				<!doctype html>
				<html lang="en">
				
				<head>
				  <meta charset="utf-8">
				  <title>AtlasMap Data Mapper UI</title>
				  <base href="http://127.0.0.1:8585/">
				
				  <meta name="viewport" content="width=device-width, initial-scale=1">
				  <link rel="icon" type="image/x-icon" href="favicon.ico">
				</head>
				
				<body>
				  <div class='atlasmapNavbar'>
					<atlasmap-navbar></atlasmap-navbar>
				  </div>
				
				  <div class="atlasmap__root">
					<atlasmap-dev-root></atlasmap-dev-root> 
				  </div>
				<script type="text/javascript" src="runtime.js"></script><script type="text/javascript" src="polyfills.js"></script><script type="text/javascript" src="styles.js"></script><script type="text/javascript" src="scripts.js"></script><script type="text/javascript" src="vendor.js"></script><script type="text/javascript" src="main.js"></script></body>
				
				</html>
				`;
				content = body.toString().replace('href="/"', 'href="http://127.0.0.1:8585/"');
				AtlasMapPanel.currentPanel._panel.webview.html = content;
			} catch (err) {
				console.log(err.toString());
			}
		});
	}
}
