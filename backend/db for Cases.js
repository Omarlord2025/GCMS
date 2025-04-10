const sqlite3 = require("sqlite3").verbose();

// Connect to the database (or create it if it doesn't exist)
const db = new sqlite3.Database("./government_case_management.db", (err) => {
  if (err) {
    console.error("Error connecting to the database:", err.message);
  } else {
    console.log("Connected to the government case management database.");
    initializeDatabase();
  }
});

// Initialize the database (create tables if they don't exist)
function initializeDatabase() {
  // Create cases table
  db.run(`
    CREATE TABLE IF NOT EXISTS cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    citizenId TEXT NOT NULL,
    caseTitle TEXT NOT NULL,
    caseDescription TEXT NOT NULL,  -- Ensure this field exists
    status TEXT NOT NULL,
    dateCreated TEXT NOT NULL
);
    )
  `, (err) => {
    if (err) {
      console.error("Error creating cases table:", err.message);
    } else {
      console.log("Cases table created or already exists.");
    }
  });
}

// Insert a new case
function insertCase(citizenId, caseTitle, status, dateCreated, caseDescription, callback) {
  const sql = `INSERT INTO cases (citizenId, caseTitle, status, dateCreated, caseDescription) VALUES (?, ?, ?, ?, ?)`; // Include caseDescription
  db.run(sql, [citizenId, caseTitle, status, dateCreated, caseDescription], function (err) {
    if (err) {
      console.error("Error inserting case:", err.message);
      if (callback) callback(err);
    } else {
      console.log(`Case inserted with ID: ${this.lastID}`);
      if (callback) callback(null, this.lastID);
    }
  });
}

// Update a case
function updateCase(id, citizenId, caseTitle, status, caseDescription, callback) {
  const sql = `UPDATE cases SET citizenId = ?, caseTitle = ?, status = ?, caseDescription = ? WHERE id = ?`; // Include caseDescription
  db.run(sql, [citizenId, caseTitle, status, caseDescription, id], function (err) {
    if (err) {
      console.error("Error updating case:", err.message);
      callback(err);
    } else {
      console.log(`Case with ID ${id} updated.`);
      callback(null);
    }
  });
}

// Delete a case
function deleteCase(id, callback) {
  const sql = `DELETE FROM cases WHERE id = ?`;
  db.run(sql, [id], function (err) {
    if (err) {
      console.error("Error deleting case:", err.message);
      callback(err);
    } else {
      console.log(`Case with ID ${id} deleted.`);
      callback(null);
    }
  });
}

// Get all cases
function getAllCases(callback) {
  const sql = `SELECT * FROM cases`;
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("Error fetching cases:", err.message);
      callback(err);
    } else {
      callback(null, rows);
    }
  });
}

// Get a specific case by ID
function getCaseById(id, callback) {
  const sql = `SELECT * FROM cases WHERE id = ?`;
  db.get(sql, [id], (err, row) => {
    if (err) {
      console.error("Error fetching case:", err.message);
      callback(err);
    } else {
      callback(null, row);
    }
  });
}




// Close the database connection
function closeDatabase() {
  db.close((err) => {
    if (err) {
      console.error("Error closing the database:", err.message);
    } else {
      console.log("Database connection closed.");
    }
  });
}

// Export the new function
module.exports = {
  insertCase,
  updateCase,
  deleteCase,
  getAllCases,
  getCaseById,
  closeDatabase,
};