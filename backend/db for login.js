const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

// Initialize the database
const db = new sqlite3.Database('./users.db', (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initializeUserDatabase(); // Initialize the user database
    }
});

// Function to initialize the user database
function initializeUserDatabase() {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('Error creating users table', err.message);
        } else {
            console.log('Users table created or already exists.');
            insertSampleUser(); // Insert a sample user after creating the table
        }
    });
}

// Function to insert sample users
function insertSampleUser() {
    const sampleUsers = [
        { username: 'Omar', password: 'citizen123', role: 'citizen' },
        { username: 'Yassin', password: 'worker123', role: 'case-worker' },
        { username: 'Ahmed', password: 'manager123', role: 'citizen-manager' },
        { username: 'Beta', password: 'beta123', role: 'Beta' }
    ];

    sampleUsers.forEach(user => {
        db.get(`SELECT * FROM users WHERE username = ?`, [user.username], (err, row) => {
            if (err) {
                console.error('Error checking for sample user:', user.username, err.message);
            } else if (!row) {
                bcrypt.hash(user.password, 10, (err, hash) => {
                    if (err) {
                        console.error('Error hashing password for user:', user.username, err.message);
                    } else {
                        db.run(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`, 
                            [user.username, hash, user.role], (err) => {
                                if (err) {
                                    console.error('Error inserting sample user:', user.username, err.message);
                                } else {
                                    console.log('Sample user inserted:', user.username);
                                }
                            });
                    }
                });
            } else {
                console.log('Sample user already exists:', user.username);
            }
        });
    });
}

// Function to authenticate a user (checks username, password, and role)
function authenticateUser(username, password, role, callback) {
    if (typeof callback !== 'function') {
        console.error('Callback is not a function');
        return;
    }

    console.log('Authenticating user:', username, role);
    db.get(`SELECT * FROM users WHERE username = ? AND role = ?`, [username, role], (err, row) => {
        if (err) {
            console.error('Database error:', err.message);
            callback(err, null);
        } else if (!row) {
            console.error('User not found or role mismatch');
            callback(new Error('User not found or role mismatch'), null);
        } else {
            bcrypt.compare(password, row.password, (err, result) => {
                if (err) {
                    console.error('Password comparison error:', err.message);
                    callback(err, null);
                } else if (result) {
                    console.log('User authenticated successfully:', row.username);
                    callback(null, { id: row.id, username: row.username, role: row.role });
                } else {
                    console.error('Invalid password');
                    callback(new Error('Invalid password'), null);
                }
            });
        }
    });
}

// Function to register a new user
function registerUser(username, password, role, callback) {
    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, row) => {
        if (err) {
            callback(err, null);
        } else if (row) {
            callback(new Error('Username already exists'), null);
        } else {
            bcrypt.hash(password, 10, (err, hash) => {
                if (err) {
                    callback(err, null);
                } else {
                    db.run(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`, 
                        [username, hash, role], function(err) {
                            if (err) {
                                callback(err, null);
                            } else {
                                callback(null, { id: this.lastID, username, role });
                            }
                        });
                }
            });
        }
    });
}

// Export the functions for use in other modules
module.exports = {
    initializeUserDatabase,
    insertSampleUser,
    authenticateUser,
    registerUser
};