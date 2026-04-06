const fs = require("fs");
const path = require("path");
const User = require("./User");
const Admin = require("./Admin");
const RA = require("./RA");
class AuthService {
    constructor(filePath = path.join(__dirname, "data/users.json")) {
        this.filePath = filePath;
    }
    loadUsers() {
        if (!fs.existsSync(this.filePath)) fs.writeFileSync(this.filePath, "[]");
        const raw = fs.readFileSync(this.filePath, "utf-8");
        if (!raw.trim()) return [];
        const parsed = JSON.parse(raw);
        return parsed.map(u => {
            if (u.role === "admin") return new Admin(u.userID, u.name, u.email, u.passwordHash, u.active);
            if (u.role === "ra") return new RA(u.userID, u.name, u.email, u.passwordHash, u.residenceHall, u.active);
            return new User(u.userID, u.name, u.email, u.passwordHash, u.role, u.active);
        });
    }
    saveUsers(users) {
        fs.writeFileSync(this.filePath, JSON.stringify(users.map(u => u.toJSON()), null, 2));
    }
    login(email, pass) {
        const list = this.loadUsers();
        const u = list.find(x => x.getEmail() === email && x.getPasswordHash() === pass);
        if (!u) return { success: false, message: "Invalid credentials." };
        if (!u.isActive()) return { success: false, message: "Account deactivated." };
        return { success: true, user: u.toJSON() };
    }
    addUser(uData) {
        const list = this.loadUsers();
        if (list.find(u => u.getEmail() === uData.email))
            return { success: false, message: "Email already exists." };
        if (list.find(u => u.getUserID() === uData.userID))
            return { success: false, message: "User ID already exists." };
        let nu;
        if (uData.role === "admin")
            nu = new Admin(uData.userID, uData.name, uData.email, uData.passwordHash, true);
        else
            nu = new RA(uData.userID, uData.name, uData.email, uData.passwordHash, uData.residenceHall, true);
        list.push(nu);
        this.saveUsers(list);
        return { success: true };
    }
    deactivateUser(id) {
        const list = this.loadUsers();
        const u = list.find(x => x.getUserID() === id);
        if (!u) return { success: false, message: "User not found." };
        u.setActive(false);
        this.saveUsers(list);
        return { success: true };
    }
    resetPassword(id, np) {
        const list = this.loadUsers();
        const u = list.find(x => x.getUserID() === id);
        if (!u) return { success: false, message: "User not found." };
        u.setPasswordHash(np);
        this.saveUsers(list);
        return { success: true };
    }
    getAllUsers() {
        return this.loadUsers();
    }
}
module.exports = AuthService;