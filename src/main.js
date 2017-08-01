'use babel';

import { CompositeDisposable, Emitter, Task } from 'atom';
import cryptoRandomString from 'crypto-random-string';

const { createStatusTile, updateStatusTile } = require('./statusTile');
const packageJSON = require('../package.json');

module.exports = {
    activate() {
        this.emitter = new Emitter();
        this.subscriptions = new CompositeDisposable();
        this.worker = null;

        this.statusBarHandler = null;
        this.statusBarTile = null;
        this.tileElement = null;

        this.grammars = ['source.js', 'source.js.jsx'];
        this.deepscanServer = this.getDeepScanConfiguration().server;

        this.subscriptions.add(this.emitter);

        this.subscriptions.add(atom.config.observe(`${packageJSON.name}.server`, (value) => {
            let oldServer = this.deepscanServer;
            if (value === oldServer) {
                return;
            }
            this.deepscanServer = value;
            console.info(`Configuration changed: ${this.deepscanServer}`);
            // Reinspect any open text documents
            let documents = [];
            for (let editor of atom.workspace.getTextEditors()) {
                if (this.grammars.includes(editor.getGrammar().scopeName)) {
                    documents.push(editor);
                }
            }
            documents.forEach(this.runLinter);
        }));

        this.subscriptions.add(atom.workspace.observeTextEditors((editor) => {
            editor.onDidSave(async () => {
            });
        }));

        const initializeWorker = () => {
            this.worker = new Task(require.resolve('./worker.js'));
        }
        initializeWorker();

        this.checkSetting();
    },

    deactivate() {
        if (this.worker !== null) {
            this.worker.terminate();
            this.worker = null;
        }
        this.subscriptions.dispose();
        this.detachStatusTile();
    },

    provideLinter() {
        return {
            name: 'DeepScan',
            grammarScopes: this.grammars,
            scope: 'file',
            lintsOnChange: false,
            lint: async (textEditor) => {
                if (!this.getDeepScanConfiguration().enable)
                    return [];
                return this.inspect(textEditor);
            }
        }
    },

    runLinter(editor) {
        let view = atom.views.getView(editor);
        console.log('runLinter', view);
        return atom.commands.dispatch(view, 'linter:lint');
    },

    async inspect(textEditor) {
        const text = textEditor.getText();
        if (text.length === 0) {
            return [];
        }

        const response = await this.sendJob(this.worker, {
            type: 'inspect',
            content: text,
            server: this.deepscanServer,
            userAgent: `${packageJSON.name}/${packageJSON.version}`
        });
        let diagnostics = await this.publishDiagnostics(response, textEditor, this.worker);
        updateStatusTile(this.subscriptions, this.tileElement, response.status);
        return diagnostics;
    },

    async sendJob(worker, config) {
        const startWorker = (worker) => {
            if (worker.started) {
                return;
            }
            worker.start([]);
            worker.started = true;
        };
        // Ensure the worker is started
        startWorker(worker);
        // Expand the config with a unique ID to emit on
        // NOTE: Jobs _must_ have a unique ID as they are completely async and results
        // can arrive back in any order.
        config.emitKey = cryptoRandomString(10);

        return new Promise((resolve, reject) => {
            const responseSub = worker.on(config.emitKey, (data) => {
                responseSub.dispose();
                resolve(data);
            });
            // Send the job on to the worker
            try {
                worker.send(config);
            } catch (e) {
                console.error(e);
            }
        });
    },

    async publishDiagnostics(response, textEditor, worker) {
        function slugify(text) {
            return text.toString().toLowerCase()
                                  .replace(/\s+/g, '-')     // Replace spaces with -
                                  .replace(/[^\w\-]+/g, '') // Remove all non-word chars
                                  .replace(/\_/g, '-')      // Replace _ with -
                                  .replace(/\-\-+/g, '-')   // Replace multiple - with single -
                                  .replace(/^-+/, '')       // Trim - from start of text
                                  .replace(/-+$/, '');      // Trim - from end of text
        }

        const filePath = textEditor.getPath();
        let config = this.getDeepScanConfiguration();

        if (response.diagnostics.length === 0) {
            return new Promise(function (resolve) {
                resolve([]);
            });
        } else {
            return Promise.all(response.diagnostics.filter((diagnostic) => {
                if (Array.isArray(config.ignoreRules)) {
                    return !config.ignoreRules.includes(diagnostic.code);
                }
                return true;
            }).map(async ({
                message, severity, code, range
            }) => {
                let ret = {
                    severity,
                    location: {
                        file: filePath,
                        position: [[range.start.line, range.start.character], [range.end.line, range.end.character]]
                    },
                    url: `https://deepscan.io/docs/rules/${slugify(code)}`,
                    excerpt: `${message} (${code})`
                }

                return ret;
            }));
        }
    },

    attachStatusTile() {
        if (this.statusBarHandler) {
            this.tileElement = createStatusTile();
            this.statusBarTile = this.statusBarHandler.addLeftTile({
                item: this.tileElement,
                priority: 1000,
            });
            updateStatusTile(this.subscriptions, this.tileElement);
        }
    },

    detachStatusTile() {
        if (this.statusBarTile) {
            this.statusBarTile.destroy();
        }
    },

    consumeStatusBar(statusBar) {
        this.statusBarHandler = statusBar;

        this.attachStatusTile();
    },

    async checkSetting() {
        const config = this.getDeepScanConfiguration();
        const shouldIgnore = config.ignoreConfirmWarning === true;

        if (shouldIgnore) {
            return;
        }

        if (config.enable === true) {
            return;
        }

        let notification = atom.notifications.addWarning('Allow the DeepScan package to transfer your code to the DeepScan server for inspection.', {
            dismissable: true,
            buttons: [{
                text: "Confirm",
                onDidClick: function () {
                    atom.config.set(`${packageJSON.name}.enable`, true);
                    return notification.dismiss();
                }
            }, {
                text: "Don't show again",
                onDidClick: function () {
                    atom.config.set(`${packageJSON.name}.ignoreConfirmWarning`, true);
                    return notification.dismiss();
                }
            }]
        });
    },

    getDeepScanConfiguration() {
        return atom.config.get(packageJSON.name);
    }
};
