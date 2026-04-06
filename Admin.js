const User = require("./User");

class Admin extends User {
    constructor(userID, name, email, passwordHash, active = true) {
        super(userID, name, email, passwordHash, "admin", active);
    }

    createUser(userData, authService) { return authService.addUser(userData); }
    deactivateUser(userID, authService) { return authService.deactivateUser(userID); }
    resetUserPassword(userID, newPass, authService) { return authService.resetPassword(userID, newPass); }
}

module.exports = Admin;
