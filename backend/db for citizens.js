const sqlite3 = require("sqlite3").verbose();
const path = require("path"); // Add this line
const fs = require("fs"); // Add this at the top of the file

// Connect to the database (or create it if it doesn't exist)
const db = new sqlite3.Database("./citizen_management.db", (err) => {
  if (err) {
    console.error("Error connecting to the database:", err.message);
  } else {
    console.log("Connected to the citizen management database.");
    initializeDatabase();
  }
});

// Initialize the database (create tables if they don't exist)
function initializeDatabase() {
  db.run(`
    CREATE TABLE IF NOT EXISTS citizens (
      id TEXT PRIMARY KEY,  -- ID is manually entered, so it's a TEXT field
      name TEXT NOT NULL,
      jobTitle TEXT NOT NULL,
      motherName TEXT NOT NULL,
      photo TEXT  -- URL or path to the citizen's photo
    )
  `, (err) => {
    if (err) {
      console.error("Error creating citizens table:", err.message);
    } else {
      console.log("Citizens table created or already exists.");
    }
  });
}

// Insert a new citizen
function insertCitizen(id, name, jobTitle, motherName, photo, callback) {
  const sql = `INSERT INTO citizens (id, name, jobTitle, motherName, photo) VALUES (?, ?, ?, ?, ?)`;
  db.run(sql, [id, name, jobTitle, motherName, photo], function (err) {
    if (err) {
      console.error("Error inserting citizen:", err.message);
      callback(err);
    } else {
      console.log(`Citizen inserted with ID: ${id}`);
      callback(null, id);
    }
  });
}

async function renameCitizenPhoto(oldId, newId, currentPhotoName) {
    if (!currentPhotoName || oldId === newId) return currentPhotoName;
    
    const oldPath = path.join(__dirname, "uploads", currentPhotoName);
    const fileExt = path.extname(currentPhotoName);
    const newPhotoName = `${newId}${fileExt}`;
    const newPath = path.join(__dirname, "uploads", newPhotoName);

    try {
        await fs.promises.rename(oldPath, newPath);
        return newPhotoName;
    } catch (error) {
        console.error("Error renaming photo:", error);
        throw error;
    }
}

async function cleanupOldFile(filename) {
    if (!filename) return;
    
    const filePath = path.join(__dirname, "uploads", filename);
    
    try {
        await fs.promises.access(filePath, fs.constants.F_OK);
        await fs.promises.unlink(filePath);
        console.log(`Cleaned up old file: ${filename}`);
    } catch (err) {
        if (err.code !== 'ENOENT') { // Ignore "file not found" errors
            console.error(`Error cleaning up ${filename}:`, err.message);
        }
    }
}

async function updateCitizen(oldId, newId, name, jobTitle, motherName, newPhotoFile, callback) {
    try {
        // Validate inputs
        if (!oldId || !newId || !name || !jobTitle || !motherName) {
            throw new Error('Missing required fields');
        }

        let finalPhotoName = null;
        
        // 1. Get current citizen data (with error handling)
        const citizen = await new Promise((resolve, reject) => {
            db.get("SELECT * FROM citizens WHERE id = ?", [oldId], (err, row) => {
                if (err) return reject(err);
                if (!row) return reject(new Error('Citizen not found'));
                resolve(row);
            });
        });

        // 2. Handle photo operations
        if (citizen.photo) {
            // Case 1: ID changed - rename existing photo
            if (oldId !== newId) {
                finalPhotoName = await renameCitizenPhoto(oldId, newId, citizen.photo);
            } 
            // Case 2: New photo uploaded - delete old one only if different
           else if (newPhotoFile) {
              if (citizen.photo !== newPhotoFile) {
                await cleanupOldFile(citizen.photo);
              }
              finalPhotoName = newPhotoFile;
            }
              
            // Case 3: No changes to photo
            else {
                finalPhotoName = citizen.photo;
            }
        }
        // Case 4: No existing photo, but new one uploaded
        else if (newPhotoFile) {
            finalPhotoName = newPhotoFile;
        }

        // 3. Update database in transaction
        await new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run("BEGIN TRANSACTION");
                
                // First delete old record
                db.run("DELETE FROM citizens WHERE id = ?", [oldId], function(err) {
                    if (err) {
                        db.run("ROLLBACK");
                        return reject(err);
                    }

                    // Then insert updated record
                    db.run(
                        "INSERT INTO citizens (id, name, jobTitle, motherName, photo) VALUES (?, ?, ?, ?, ?)",
                        [newId, name, jobTitle, motherName, finalPhotoName],
                        function(err) {
                            if (err) {
                                db.run("ROLLBACK");
                                return reject(err);
                            }
                            db.run("COMMIT");
                            resolve();
                        }
                    );
                });
            });
        });

        callback(null);
    } catch (error) {
        console.error('Update citizen error:', error);
        callback(error);
    }
}



// Revised deleteCitizen function
function deleteCitizen(id, callback) {
  // Step 1: Fetch the citizen's photo path from the database
  db.get("SELECT photo FROM citizens WHERE id = ?", [id], (err, row) => {
    if (err) {
      console.error("Error fetching citizen photo:", err.message);
      callback(err);
      return;
    }

    // Step 2: Delete the photo file if it exists
    if (row && row.photo) {
      const photoPath = path.join(__dirname, "uploads", row.photo); // Fixed path construction
      
      // Check if file exists before trying to delete
      fs.access(photoPath, fs.constants.F_OK, (err) => {
        if (!err) {
          fs.unlink(photoPath, (err) => {
            if (err) {
              console.error("Error deleting photo file:", err.message);
            } else {
              console.log(`Photo file deleted: ${photoPath}`);
            }
            // Continue with DB deletion regardless of file deletion success
            deleteFromDatabase();
          });
        } else {
          // File doesn't exist, just continue
          deleteFromDatabase();
        }
      });
    } else {
      // No photo to delete, just continue
      deleteFromDatabase();
    }

    function deleteFromDatabase() {
      // Step 3: Delete the citizen's record from the database
      const sql = `DELETE FROM citizens WHERE id = ?`;
      db.run(sql, [id], function (err) {
        if (err) {
          console.error("Error deleting citizen:", err.message);
          callback(err);
        } else {
          console.log(`Citizen with ID ${id} deleted.`);
          callback(null);
        }
      });
    }
  });
}

// Get all citizens
function getAllCitizens(callback) {
  const sql = `SELECT * FROM citizens`;
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("Error fetching citizens:", err.message);
      callback(err);
    } else {
      callback(null, rows);
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

// Export functions for use in other files
module.exports = {
  insertCitizen,
  updateCitizen,
  deleteCitizen,
  getAllCitizens,
  closeDatabase,
};