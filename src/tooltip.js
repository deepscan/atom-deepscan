let tooltip;

module.exports = {
    disposeTooltip() {
        tooltip && tooltip.dispose();
    },

    setTooltip(newTooltip) {
        tooltip = newTooltip;
    }
};
