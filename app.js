const readline = require("readline");
const AuthService = require("./AuthService");

const authService = new AuthService();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function ask(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim());
        });
    });
}

async function loginFlow() {
    console.log("\n--- Login ---");
    const email = await ask("Enter email: ");
    const password = await ask("Enter password: ");

    const result = authService.login(email, password);

    if (result.success) {
        console.log("\nLogin successful.");
        console.log("User Info:");
        console.log(result.user);
    } else {
        console.log(`\nLogin failed: ${result.message}`);
    }
}

async function createUserFlow() {
    console.log("\n--- Create New User ---");

    const role = (await ask("Enter role (admin/ra): ")).toLowerCase();

    if (role !== "admin" && role !== "ra") {
        console.log("\nInvalid role. Must be admin or ra.");
        return;
    }

    const userID = await ask("Enter user ID: ");
    const name = await ask("Enter full name: ");
    const email = await ask("Enter email: ");
    const password = await ask("Enter password: ");

    const userData = {
        userID,
        name,
        email,
        passwordHash: password,
        role
    };

    if (role === "ra") {
        const residenceHall = await ask("Enter residence hall: ");
        userData.residenceHall = residenceHall;
    }

    const result = authService.addUser(userData);

    if (result.success) {
        console.log("\nUser created successfully.");
    } else {
        console.log(`\nCould not create user: ${result.message}`);
    }
}

async function deactivateUserFlow() {
    console.log("\n--- Deactivate User ---");
    const userID = await ask("Enter user ID to deactivate: ");

    const result = authService.deactivateUser(userID);

    if (result.success) {
        console.log("\nUser deactivated successfully.");
    } else {
        console.log(`\nCould not deactivate user: ${result.message}`);
    }
}

async function resetPasswordFlow() {
    console.log("\n--- Reset Password ---");
    const userID = await ask("Enter user ID: ");
    const newPassword = await ask("Enter new password: ");

    const result = authService.resetPassword(userID, newPassword);

    if (result.success) {
        console.log("\nPassword reset successfully.");
    } else {
        console.log(`\nCould not reset password: ${result.message}`);
    }
}

async function mainMenu() {
    while (true) {
        console.log("\n=== Smart Shift Login System ===");
        console.log("1. Login");
        console.log("2. Create New User");
        console.log("3. Deactivate User");
        console.log("4. Reset Password");
        console.log("5. Exit");

        const choice = await ask("Choose an option: ");

        switch (choice) {
            case "1":
                await loginFlow();
                break;
            case "2":
                await createUserFlow();
                break;
            case "3":
                await deactivateUserFlow();
                break;
            case "4":
                await resetPasswordFlow();
                break;
            case "5":
                console.log("\nGoodbye.");
                rl.close();
                return;
            default:
                console.log("\nInvalid option. Please choose 1, 2, 3, 4, or 5.");
        }
    }
}

mainMenu();