#!/usr/bin/env groovy

node('rhel8'){
	stage('Checkout repo') {
		deleteDir()
		git url: 'https://github.com/apupier/vscode-atlasmap', branch:'FUSETOOLS2-672-fixMasterOnJenkins-onjenkins'
	}

	stage('Install requirements') {
		def nodeHome = tool 'nodejs-10.9.0'
		env.PATH="${env.PATH}:${nodeHome}/bin"
		sh "npm install -g typescript vsce"
	}

	stage('Build') {
		env.JAVA_HOME="${tool 'openjdk-1.8'}"
		env.PATH="${env.JAVA_HOME}/bin:${env.PATH}"
		sh "java -version"
		
		sh "npm install"
		sh "npm run vscode:prepublish"
	}

	withEnv(['JUNIT_REPORT_PATH=report.xml']) {
        stage('Test') {
    		wrap([$class: 'Xvnc']) {
    			sh "npm test --silent"
    			junit 'report.xml'
    		}
        }
	}

	stage('Package') {
        def packageJson = readJSON file: 'package.json'
        sh "vsce package -o vscode-atlasmap-${packageJson.version}-${env.BUILD_NUMBER}.vsix"
        sh "npm pack && mv atlasmap-viewer-${packageJson.version}.tgz vscode-atlasmap-${packageJson.version}-${env.BUILD_NUMBER}.tgz"
	}
}
