const fs = require("fs");
const path = require("path");
const ResidenceHall = require("./ResidenceHall");

class ResidenceHallService {
    constructor(filePath = path.join(__dirname, "data/residenceHalls.json")) { this.filePath = filePath; }

    load() {
        if (!fs.existsSync(this.filePath)) fs.writeFileSync(this.filePath, "[]");
        const d = JSON.parse(fs.readFileSync(this.filePath, "utf-8") || "[]");
        return d.map(h => new ResidenceHall(h.hallID, h.name, h.capacity, h.raIDs));
    }

    save(halls) {
        fs.writeFileSync(this.filePath, JSON.stringify(halls.map(h => h.toJSON()), null, 2));
    }

    getAllResidenceHalls() { return this.load(); }
}

module.exports = ResidenceHallService;
