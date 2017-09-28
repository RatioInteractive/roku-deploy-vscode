'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as archiver from 'archiver';
import * as request from 'request';

class Settings {
    rokuAddress : boolean;
    rokuUserId : string;
    rokuPassword : string;
    outputDirectory : string;
    excludedPaths : string;
    srcDirectory : string;
    separator : string;
    proxyAddress : string;
    constructor() {
        this.rokuAddress = vscode.workspace.getConfiguration('roku-deploy').get('rokuAddress');
        this.rokuUserId = vscode.workspace.getConfiguration('roku-deploy').get('rokuUserId');
        this.rokuPassword = vscode.workspace.getConfiguration('roku-deploy').get('rokuPassword');
        this.outputDirectory = vscode.workspace.getConfiguration('roku-deploy').get('outputDirectory');
        this.excludedPaths = vscode.workspace.getConfiguration('roku-deploy').get('excludedPaths');
        this.srcDirectory = vscode.workspace.getConfiguration('roku-deploy').get('srcDirectory');
        this.proxyAddress = vscode.workspace.getConfiguration('roku-deploy').get('proxyAddress');
        this.separator = process.platform !== 'win32' ? '/' : '\\';
    }
    
}
let configurationChangedListener: vscode.Disposable;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    let configSettings = new Settings();
    configurationChangedListener = vscode.workspace.onDidChangeConfiguration(configurationChanged);

    let zip = null;
    
    function configurationChanged() {
        configSettings = new Settings();
    }

    function runUnitTest(){
        request.post('http://' + configSettings.rokuAddress + ':8060/launch/dev?RunTests=true');
    }

    function runProxyLaunch(){
      
      request.post('http://' + configSettings.rokuAddress + ':8060/launch/dev?proxy=' + encodeURIComponent(configSettings.proxyAddress));
    }

    function deployRoku() {
        return zipPackage();
    }

    function zipPackage() {
        console.log('zipPackage called.');
        return request.post('http://' + configSettings.rokuAddress + ':8060/keypress/Home').on('response', function(response) {
          if (response !== void 0) {
            console.log("Response returned");
            if (response !== void 0 && response.statusCode !== void 0 && response.statusCode === 200) {
              console.log("Response returned 200");
              return zipCore();
            } else {
                vscode.window.showErrorMessage('Sending Home command did not succeed. See console for details.');              
              if (response !== void 0) {
                return console.log(response.body);
              }
            }
          } else {
            return console.log("No response returned.");
          }
        });
      }

    
    
      function zipCore() {
        var bundlePath, dir, directoryRelativePath, directory, dirs, error, i, len, p, params, ref, splitExcludedPaths, stat, upperExcludedPaths, zipFile;        
        dirs = vscode.workspace.workspaceFolders;
        dir = vscode.Uri.file(dirs[0].uri.fsPath + configSettings.separator + configSettings.srcDirectory);
        // dir = dirs[0].getSubdirectory(configSettings.srcDirectory);
        if (dir !== void 0) {
          p = dir.fsPath;
          bundlePath = p + configSettings.separator + configSettings.outputDirectory + configSettings.separator;
          try {
            stat = fs.lstatSync(bundlePath);
          } catch (error1) {
            error = error1;
            console.log('out directory not found, creating.');
            fs.mkdirSync(bundlePath);
            stat = fs.lstatSync(bundlePath);
            if (!stat.isDirectory()) {
              console.log('failed to create out directory.');
              return;
            }
          }
          zipFile = fs.createWriteStream(bundlePath + 'bundle.zip');
          zip = archiver('zip');
          zipFile.on('close', zipComplete);
          zip.on('error', function(err) {
            throw err;
          });
          zip.pipe(zipFile);
          splitExcludedPaths = configSettings.excludedPaths.split(',');
          upperExcludedPaths = [];
          splitExcludedPaths.forEach(function(ep) {
            return upperExcludedPaths.push(ep.trim().toLocaleUpperCase());
          });
          ref = fs.readdirSync(dir.fsPath);
          for (i = 0, len = ref.length; i < len; i++) {
            directoryRelativePath = ref[i];
            var tempPath = p + configSettings.separator + directoryRelativePath + configSettings.separator;
            directory = fs.lstatSync(tempPath);
            if (directory != undefined && directory.isDirectory() && upperExcludedPaths.indexOf(directoryRelativePath.toLocaleUpperCase()) === -1 && !directoryRelativePath.startsWith('.')) {
                var directoryUri = vscode.Uri.file(tempPath);
                addToZip(directoryUri,directoryRelativePath);
            }
          }
          params = {
            expand: true,
            cwd: dir.fsPath,
            src: ['manifest'],
            dest: ''
          };
          zip.bulk(params);
        }
        return zip.finalize();
    }

    function addToZip(dir : vscode.Uri, baseName : string) {
        console.log(dir.fsPath);
        return zip.directory(dir.fsPath, baseName);
      }

    function zipComplete() {
        var addrs, bundlePath, dir, dirs, p, rokuOptions;
        console.log("Zipping complete");
        vscode.window.showInformationMessage("Bundling completed. Starting deploy . . .");        
        addrs = 'http://' + configSettings.rokuAddress + '/plugin_install';
        console.log(addrs);
        dirs = vscode.workspace.workspaceFolders;
        dir = vscode.Uri.file(dirs[0].uri.fsPath + configSettings.separator + configSettings.srcDirectory + configSettings.separator);
        p = dir.fsPath;
        bundlePath = p + configSettings.separator + configSettings.outputDirectory + configSettings.separator;
        rokuOptions = {
            url: addrs,
            formData: {
            mysubmit: 'Replace',
            archive: fs.createReadStream(bundlePath + 'bundle.zip')
            }
        };
        request.post(rokuOptions, this.requestCallback).auth(configSettings.rokuUserId, configSettings.rokuPassword, false);
        return console.log('Request started');
    }

    function requestCallback(error, response, body) {
        if (response !== void 0 && response.statusCode !== void 0 && response.statusCode === 200) {
            if (response.body.indexOf("Identical to previous version -- not replacing.") !== -1) {
            return vscode.window.showWarningMessage("Deploy cancelled by Roku: the package is identical to the package already on the Roku.");
            } else {
            console.log("Successfully deployed");
            return vscode.window.showInformationMessage('Deployed to ' + configSettings.rokuAddress);
            }
        } else {
            vscode.window.showErrorMessage("Failed to deploy to " + configSettings.rokuAddress + " see console output for details.");
            console.log(error);
            if (response !== void 0) {
            return console.log(response.body);
            }
        }
    }

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "roku-deploy-vscode" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand('roku-deploy.deploy', () => {
        // The code you place here will be executed every time your command is executed
        deployRoku();
    });
    let unitTest = vscode.commands.registerCommand('roku-deploy.unittest', () => {
        runUnitTest();
        vscode.window.showInformationMessage('Unit tests initiated.');
    });
    let proxyLaunch = vscode.commands.registerCommand('roku-deploy.proxyLaunch', () =>{
      runProxyLaunch();
      vscode.window.showInformationMessage('Roku launched with proxy address: ' + configSettings.proxyAddress);
    });

    context.subscriptions.push(disposable);
    context.subscriptions.push(unitTest);
    context.subscriptions.push(proxyLaunch);
}

// this method is called when your extension is deactivated
export function deactivate() {
}