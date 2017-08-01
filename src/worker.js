'use babel';

/* global emit */

import request from 'request';

const { Status } = require('./status');

function inspect({ emitKey, server, userAgent, content }) {
    const URL = server + '/api/demo';

    if (!content) {
        emit(emitKey, { status: Status.none, diagnostics: [] });
        return;
    }

    request.post({
        url: URL,
        headers : {
            'content-type': 'application/octet-stream',
            'user-agent': userAgent
        },
        body: content
    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            let diagnostics = getResult(JSON.parse(body).data);
            // Publish the diagnostics
            emit(emitKey, { status: diagnostics.length > 0 ? Status.warn : Status.ok, diagnostics });
        } else {
            console.error('Failed to inspect: ' + error.message);
            // Clear problems
            emit(emitKey, { status: Status.fail, diagnostics: [] });
        }
    });
}

function getResult(result) {
    let alarms = result.alarms;
    let diagnostics = [];
    alarms.forEach((alarm) => {
        let diagnostic = makeDiagnostic(alarm);
        diagnostics.push(diagnostic);
    });
    return diagnostics;
}

function makeDiagnostic(alarm) {
    let message = alarm.message;
    let l = parseLocation(alarm.location);
    let startLine = Math.max(0, l.startLine - 1);
    let startChar = Math.max(0, l.startCh - 1);
    let endLine = l.endLine != null ? Math.max(0, l.endLine - 1) : startLine;
    let endChar = l.endCh != null ? Math.max(0, l.endCh - 1) : startChar;
    return {
        message: message,
        severity: convertSeverity(alarm.impact),
        source: 'deepscan',
        range: {
            start: { line: startLine, character: startChar },
            end: { line: endLine, character: endChar }
        },
        code: alarm.name
    };
}

function parseLocation(location) {
    var startLocation = location.split('-')[0], endLocation = location.split('-')[1];
    var startLine = Number(startLocation.split(':')[0]), startCh = Number(startLocation.split(':')[1]);
    var endLine = Number(endLocation.split(':')[0]), endCh = Number(endLocation.split(':')[1]);
    return {
        startLine: startLine,
        startCh: startCh,
        endLine: endLine,
        endCh: endCh
    }
}

function convertSeverity(impact) {
    switch (impact) {
        case 'Low':
            return 'warning';
        case 'Medium':
        case 'High':
            return 'error';
        default:
            return '';
    }
}

module.exports = async function () {
    process.on('message', (jobConfig) => {
        const { server, userAgent, content, type, emitKey } = jobConfig;

        if (type === 'inspect') {
            inspect({ emitKey, server, userAgent, content });
        }
    });
};
