var Status;
(function (Status) {
    Status[Status['none'] = 0] = 'none';
    Status[Status['ok'] = 1] = 'ok';
    Status[Status['warn'] = 2] = 'warn';
    Status[Status['fail'] = 3] = 'fail';
})(Status = {});

module.exports = {
    Status
};
