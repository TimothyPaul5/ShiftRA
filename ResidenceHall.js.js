class ResidenceHall {
    constructor(hallID, name, capacity, raIDs = []) {
        this.hallID = hallID;
        this.name = name;
        this.capacity = capacity;
        this.raIDs = raIDs;
    }
    getHallID() { return this.hallID; }
    getName() { return this.name; }
    getCapacity() { return this.capacity; }
    getRAIDs() { return this.raIDs; }

    addRA(raID) {
        if (this.raIDs.includes(raID)) return { success: false, message: "Already added." };
        if (this.raIDs.length >= this.capacity) return { success: false, message: "Full." };
        this.raIDs.push(raID); return { success: true };
    }

    removeRA(id) {
        const i = this.raIDs.indexOf(id);
        if (i === -1) return { success: false };
        this.raIDs.splice(i, 1); return { success: true };
    }

    toJSON() { return { hallID: this.hallID, name: this.name, capacity: this.capacity, raIDs: this.raIDs }; }
}

module.exports = ResidenceHall;
