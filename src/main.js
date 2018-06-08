'use babel';

import { CompositeDisposable, Emitter, Task } from 'atom';
import { generateRange } from 'atom-linter';
import cryptoRandomString from 'crypto-random-string';
import marked from 'marked';

const fs = require('fs');

const { createStatusTile, updateStatusTile } = require('./statusTile');
const packageJSON = require('../package.json');
const rules = require('../resources/deepscan-rules.json').rules;

module.exports = {
    loadPackageDeps() {
        require('atom-package-deps').install(packageJSON.name);
    },

    activate() {
        this.loadPackageDeps();

        this.emitter = new Emitter();
        this.subscriptions = new CompositeDisposable();
        this.worker = null;

        this.statusBarHandler = null;
        this.statusBarTile = null;
        this.tileElement = null;

        this.grammars = ['source.js', 'source.js.jsx', 'source.ts', 'source.tsx', 'text.html.vue'];
        this.deepscanServer = this.getDeepScanConfiguration().server;
        this.showDecorators = this.getDeepScanConfiguration().showDecorators;

        this.style = null;
        try {
            this.style = fs.readFileSync(`${__dirname}/style.css`, 'utf8');
        } catch (e) {
            console.error(e);
        }

        this.subscriptions.add(this.emitter);

        this.subscriptions.add(atom.config.observe(`${packageJSON.name}.server`, (value) => {
            let oldValue = this.deepscanServer;
            if (value === oldValue) {
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

        this.subscriptions.add(atom.config.observe(`${packageJSON.name}.showDecorators`, (value) => {
            let oldValue = this.showDecorators;
            if (value === oldValue) {
                return;
            }
            this.showDecorators = value;
            atom.workspace.getTextEditors().forEach((editor) => this.updateDecorations(editor));
        }));

        const initializeWorker = () => {
            this.worker = new Task(require.resolve('./worker.js'));
        }
        initializeWorker();

        this.checkSetting();

        this.subscriptions.add(atom.workspace.onDidChangeActiveTextEditor(this.updateStatusBar.bind(this)));

        this.decoratorMessagesId = 0;
        this.editorsMap = new Map();

        this.subscriptions.add(atom.workspace.observeTextEditors((editor) => {
            editor.onDidDestroy(() => {
                this.editorsMap.delete(editor.id);
            });
        }));
    },

    getEditorObject(editor) {
        let obj = this.editorsMap.get(editor.id);
        if (!obj) {
            const styleElement = document.createElement('style');
            styleElement.type = 'text/css';
            const parentElement = atom.views.getView(editor).component.rootElement ? atom.views.getView(editor).component.rootElement.parentNode.children[0] : document.head;
            parentElement.appendChild(styleElement);
    
            this.editorsMap.set(editor.id, {
                styleElement,
                markers: [],
                diagnostics: []
            });
        }
        return this.editorsMap.get(editor.id);
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

                if (!atom.workspace.isTextEditor(textEditor)) {
                    return null;
                }

                const filePath = textEditor.getPath();
                if (!filePath) {
                    return null;
                }

                const text = textEditor.getText();

                let response;
                try {
                    response = await this.sendJob(this.worker, {
                        type: 'inspect',
                        content: text,
                        filePath: textEditor.getPath(),
                        lineCount: textEditor.getLineCount(),
                        server: this.deepscanServer,
                        userAgent: `${packageJSON.name}/${packageJSON.version}`
                    });

                    if (textEditor.getText() !== text) {
                        return null;
                    }

                    const diagnostics = await this.publishDiagnostics(response, textEditor, this.worker);

                    textEditor.status = {
                        status: response.status,
                        message: response.message
                    };
                    this.updateStatusBar(textEditor);

                    const editorObj = this.getEditorObject(textEditor);
                    editorObj.diagnostics = [...diagnostics];
                    this.updateDecorations(textEditor);

                    // NOTE:
                    // It seems async result for lint() might be ignored when files are initially opened.
                    // So, linting result for such a file is not displayed.
                    return diagnostics;
                } catch (e) {
                    return [{
                        severity: 'error',
                        location: {
                            file: textEditor.getPath(),
                            position: generateRange(textEditor) // 1:1
                        },
                        excerpt: e.message
                    }];
                }
            }
        }
    },

    runLinter(editor) {
        let view = atom.views.getView(editor);
        console.log('runLinter', view);
        return atom.commands.dispatch(view, 'linter:lint');
    },

    updateStatusBar(editor) {
        if (atom.workspace.getActiveTextEditor() === editor) {
            updateStatusTile(this.subscriptions, this.tileElement, editor ? editor.status : null);
        }
    },

    updateDecorations(editor) {
        const isError = (severity) => severity === 'error';
        const compareSeverity = (obj1, obj2) => {
            const a = isError(obj1.severity) ? 0 : 1;
            const b = isError(obj2.severity) ? 0 : 1;
            return b - a;
        };

        const { styleElement, markers, diagnostics } = this.getEditorObject(editor);
        styleElement.innerHTML = '';

        if (!this.showDecorators) {
            markers.forEach((marker) => marker.destroy());
            markers.splice(0, markers.length);
            return;
        }

        let style = '';
        // 1. Sort by severity as desc because the first decoration is taken when there are decorations on the same line.
        let result = diagnostics.sort(compareSeverity);
        // 2. Display only 'error' (Medium/High impact)
        result = result.filter(({ severity }) => isError(severity));
        for (let diagnostic of result) {
            const {excerpt, location} = diagnostic;
            let startRow = 0;
            if (Array.isArray(location.position)) {
                startRow = location.position[0][0];
            } else { // Range
                startRow = location.position.start.row;
            }
            const element = document.createElement('div');
            const clazz = `deepscan-decorator-${++this.decoratorMessagesId}`;
            const text = `  ← ${excerpt}`;
            style += `.${clazz}::after { content: "${CSS.escape(text)}" }`;
            const marker = editor.markBufferPosition([startRow, 0], {invalidate: 'never'});
            editor.decorateMarker(marker, {type: 'line', position: 'after', item: element, class: `deepscan-marker ${clazz}`});
            markers.push(marker);
        }
        styleElement.innerHTML += style;
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
            return text.toString()
                       .toLowerCase()
                       .replace(/\s+/g, '-')     // Replace spaces with -
                       .replace(/[^\w\-]+/g, '') // Remove all non-word chars
                       .replace(/\_/g, '-')      // Replace _ with -
                       .replace(/\-\-+/g, '-')   // Replace multiple - with single -
                       .replace(/^-+/, '')       // Trim - from start of text
                       .replace(/-+$/, '');      // Trim - from end of text
        }

        const filePath = textEditor.getPath();
        const config = this.getDeepScanConfiguration();

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
                /*let linterFix = {
                    position: new Range(),
                    replaceWith: ''
                };*/
                let description = '', rule;
                if (rules && (rule = rules.find(rule => rule.key === code))) {
                    const tags = rule.tag.filter(tag => tag);
                    let content = `<ul class="deepscan-rule-detail">
                                    <li class="deepscan-rule-detail-property">`;
                        rule.severity.forEach(severity => {
                            content += `<span class="severity" data-severity="${severity}"><i class="circle"></i>${severity}</span>`;
                        });
                        content += `<li class="deepscan-rule-detail-property"><span class="icon icon-${rule.type === 'Error' ? 'error' : 'code-quality'}"></span> ${rule.type}
                                    <li class="deepscan-rule-detail-property"><span class="icon icon-tags"></span> ${tags.length > 0 ? tags.join(', ') : 'No tags'}
                                   </ul>
                                   <div class="deepscan-rule-description">
                                       <h4>${rule.name}</h4>
                                       <div>${marked(rule.description, { sanitize: true })}</div>
                                   </div>`;
                    description = `<style>${this.style}</style><div class="deepscan-rule">${content}</div>`;
                }
                let ret = {
                    severity,
                    location: {
                        file: filePath,
                        position: [[range.start.line, range.start.character], [range.end.line, range.end.character]]
                    },
                    url: `https://deepscan.io/docs/rules/${slugify(code)}`,
                    excerpt: `${message} (${code})`,
                    /*solutions: [linterFix] // 'Fix' button*/
                    description
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
            this.updateStatusBar(this.subscriptions, this.tileElement);
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
