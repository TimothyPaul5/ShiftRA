class ResidenceHall {
    constructor(hallID, name, capacity, raIDs = []) {
        this.hallID = hallID;
        this.name = name;
        this.capacity = capacity;
        this.raIDs = raIDs;
    }

    getHallID() {
        return this.hallID;
    }

    getName() {
        return this.name;
    }

    getCapacity() {
        return this.capacity;
    }

    getRAIDs() {
        return this.raIDs;
    }

    setName(name) {
        this.name = name;
    }

    setCapacity(capacity) {
        this.capacity = capacity;
    }

    addRA(raID) {
        if (!this.raIDs.includes(raID) && this.raIDs.length < this.capacity) {
            this.raIDs.push(raID);
            return { success: true, message: "RA added to residence hall." };
        }

        if (this.raIDs.includes(raID)) {
            return { success: false, message: "RA is already assigned to this residence hall." };
        }

        return { success: false, message: "Residence hall is already at full RA capacity." };
    }

    removeRA(raID) {
        const index = this.raIDs.indexOf(raID);

        if (index === -1) {
            return { success: false, message: "RA not found in this residence hall." };
        }

        this.raIDs.splice(index, 1);
        return { success: true, message: "RA removed from residence hall." };
    }

    toJSON() {
        return {
            hallID: this.hallID,
            name: this.name,
            capacity: this.capacity,
            raIDs: this.raIDs
        };
    }
}

module.exports = ResidenceHall;
