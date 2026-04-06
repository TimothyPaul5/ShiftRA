const User = require("./User");

class RA extends User {
    constructor(userID, name, email, passwordHash, residenceHall, active = true) {
        super(userID, name, email, passwordHash, "ra", active);
        this.residenceHall = residenceHall;
        this.availability = [];
    }

    getResidenceHall() { return this.residenceHall; }
    setResidenceHall(r) { this.residenceHall = r; }
    submitAvailability(timeBlock) { this.availability.push(timeBlock); }
    getAvailability() { return this.availability; }

    toJSON() {
        return {
            userID: this.userID,
            name: this.name,
            email: this.email,
            passwordHash: this.passwordHash,
            role: this.role,
            active: this.active,
            residenceHall: this.residenceHall
        };
    }
}

module.exports = RA;
