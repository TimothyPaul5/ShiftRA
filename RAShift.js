const { ask } = require("readline/promises");
class RAShift {
    constructor(manager) { this.manager = manager; }
    async submitAvailability() { const name = await ask("Name:"); const t = await ask("Block:"); const ra = this.manager.getRAByName(name); if (ra) ra.submitAvailability(t); }
}
module.exports = RAShift;
