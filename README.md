# roku-deploy-vscode README

This is a simple extension that deploys a Roku channel to a specified Roku device.


## Extension Settings

This extension contributes the following settings:

* `roku-deploy.rokuAddress`: ip address of target Roku device.
* `roku-deploy.rokuUserId`: user id for connecting in dev mode. Defaults to rokudev
* `roku-deploy.rokuPassword`: user password for connecting in dev mode. Defaults to 1111
* `roku-deploy.outputDirectory`: directory where the Roku package is emitted. Defaults to out
* `roku-deploy.excludedPaths`: directories that will not be included in the package. Degaults to out
* `roku-deploy.srcDirectory`: allows for setting a subfolder as the root source for the package. Defaults to src

## Known Issues

Attempting to redeploy the same package will result in a failed deploy. Still working on getting the result back and raising a message that the deployed package is identical to that already on the machine.

## Release Notes

First release

### 0.0.1
Initial release
### 0.0.2
Added default key binding ctrl+alt+shift+d

### 0.0.3
Added unit test running default binding ctrl+alt+shift+t