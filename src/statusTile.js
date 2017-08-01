'use babel';

const { Status } = require('./status');
const { disposeTooltip, setTooltip } = require('./tooltip');

const packageJSON = require('../package.json');

module.exports = {
    createStatusTile() {
        const element = document.createElement('a');
        const textNode = document.createTextNode('DeepScan');

        element.appendChild(textNode);
        element.classList.add('deepscan-status-tile');
        element.classList.add('inline-block');
        element.addEventListener('click', () => atom.workspace.open(`atom://config/packages/${packageJSON.name}`));

        return element;
    },

    updateStatusTile(disposable, element, status) {
        let message = '';

        if (status) {
            element.classList.remove(Status[Status.ok], Status[Status.warn], Status[Status.fail]);
            element.classList.add(Status[status]);

            switch (status) {
            case Status.ok:
                message = 'Issue-free!';
                break;
            case Status.warn:
                message = 'Issue(s) detected!';
                break;
            case Status.fail:
                message = 'Inspection failed!';
            }
        }

        disposeTooltip();

        let tooltip = atom.tooltips.add(element, {
            title: `${message}`
        });
        setTooltip(tooltip);
        disposable.add(tooltip);
    }
};
