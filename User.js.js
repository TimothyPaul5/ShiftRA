class User {
    constructor(userID, name, email, passwordHash, role, active = true) {
        this.userID = userID;
        this.name = name;
        this.email = email;
        this.passwordHash = passwordHash;
        this.role = role;
        this.active = active;
    }

    getUserID() { return this.userID; }
    getName() { return this.name; }
    getEmail() { return this.email; }
    getPasswordHash() { return this.passwordHash; }
    getRole() { return this.role; }
    isActive() { return this.active; }

    setName(name) { this.name = name; }
    setEmail(email) { this.email = email; }
    setPasswordHash(ph) { this.passwordHash = ph; }
    setActive(active) { this.active = active; }

    toJSON() {
        return {
            userID: this.userID,
            name: this.name,
            email: this.email,
            passwordHash: this.passwordHash,
            role: this.role,
            active: this.active
        };
    }
}

module.exports = User;
