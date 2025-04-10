const express = require("express");
const path = require("path");
const session = require("express-session");
const multer = require("multer")
const fs = require("fs");
const { spawn } = require('child_process'); // Add this at the top of the file

// Create the uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
};

// Import database modules (if needed)
const db = require("./db for citizens.js");
const casesDb = require("./db for Cases.js");
const db2 = require("./db for login.js");

const app = express();
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.json());

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const citizenId = req.body.id; // Use the citizen's ID as the filename
    const fileExtension = path.extname(file.originalname); // Extract the file extension
    cb(null, `${citizenId}${fileExtension}`); // Save the file as ID + extension
  },
});
const upload = multer({ storage: storage });

// Session middleware
app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },  // Make it true in production to enable secure cookies // false for development
  })
);

// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, "../frontend")));
// Serve the Laws directory as a static folder
app.use("/laws", express.static(path.join(__dirname, "LLM_Chat_bot", "Laws")));

// Middleware to check if the user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    console.log("User is authenticated:", req.session.user); // Log the user object
    next(); // Continue with the request
  } else {
    console.log("User is not authenticated"); // Log the error
    res.status(401).json({ error: "Unauthorized" });
  }
};


// ✅ Ensure only one FastAPI server is running
// 1. Declare the pythonProcess variable at the top of the file
// 2. Check if pythonProcess is already running before starting a new one
// 3. Reset pythonProcess to null when the process exits
let pythonProcess = null;  // ✅ Declare at the top to avoid reference errors

async function startPythonServer() {
  if (pythonProcess) {
    console.log("⚠️ FastAPI server is already running.");
    return;
  }

  return new Promise((resolve, reject) => {
    console.log("🚀 Starting FastAPI server...");

    const pythonPath = "D:\\Ambition\\2025\\Next Era\\GCMS\\backend\\LLM_Chat_bot\\LLM_CHATBOT\\Scripts\\python.exe";

    if (!fs.existsSync(pythonPath)) {
      console.error("❌ Python executable not found at:", pythonPath);
      reject(new Error("Python executable not found."));
      return;
    }

    pythonProcess = spawn(pythonPath, [
      "-m", "uvicorn",
      "Chatbot_LLM:app",
      "--host", "127.0.0.1",
      "--port", "8000"
    ], {
      cwd: "D:\\Ambition\\2025\\Next Era\\GCMS\\backend\\LLM_Chat_bot",
      stdio: ["pipe", "pipe", "pipe"]
    });

    pythonProcess.stdout.on("data", (data) => {
      console.log(`📢 FastAPI: ${data.toString()}`);
      if (data.toString().includes("Uvicorn running on")) {
        console.log("✅ FastAPI is running!");
        resolve();
      }
    });

    pythonProcess.stderr.on("data", (data) => {
      const errorMsg = data.toString().trim();
      if (!errorMsg.includes("INFO:") && !errorMsg.includes("✅")) { 
        console.error(`🚨 FastAPI Error: ${errorMsg}`);
      } else {
        console.log(`📢 FastAPI: ${errorMsg}`);
      }
    });
    

    pythonProcess.on("error", (err) => {
      console.error("❌ Python process error:", err);
      reject(err);
    });

    pythonProcess.on("close", (code) => {
      console.error(`⚠️ Python process exited with code ${code}. Check errors above!`);
      pythonProcess = null;  // Reset when process exits
    });
  });
}

// ✅ Ensure FastAPI starts only once
startPythonServer()
  .catch((err) => {
    console.error("❌ FastAPI failed to start:", err);
  });

// ✅ Graceful shutdown handling
process.on("SIGINT", () => {
  console.log("Shutting down Node.js server...");
  if (pythonProcess) {
    pythonProcess.kill();
  }
  process.exit();
});

// API: User login
app.post("/api/login", (req, res) => {
  const { username, password, role } = req.body;

  db2.authenticateUser(username, password, role, (err, user) => {
      if (err) {
          console.error("Error during authentication:", err.message);
          res.status(401).json({ error: err.message });
      } else if (user) {
          // Set user session upon successful login
          req.session.user = user;
          res.json({ success: true, message: "Login successful", user });
      } else {
          res.status(401).json({ error: "Invalid credentials" });
      }
  });
});

// API: User registration
app.post("/api/register", (req, res) => {
  const { username, password } = req.body;

  db2.registerUser(username, password, (err, user) => {
    if (err) {
      res.status(400).json({ error: err.message });
    } else {
      res.json({ success: true, message: "Registration successful", user });
    }
  });
});

// API: User logout
app.post("/api/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: "Could not log out, please try again" });
    } else {
      res.json({ success: true, message: "Logout successful" });
    }
  });
});

// API: Create a new citizen (with file upload)
app.post("/api/citizens", isAuthenticated, upload.single("photo"), (req, res) => {
  const { id, name, jobTitle, motherName } = req.body;
  const photo = req.file ? req.file.filename : null; // Corrected line

  if (photo) {
    const fileExtension = path.extname(req.file.originalname); // Extract the file extension
    db.insertCitizen(id, name, jobTitle, motherName, photo, (err, citizenId) => {
      if (err) {
        console.error("Error inserting citizen:", err.message);
        res.status(500).json({ error: "Failed to create citizen" });
      } else {
        res.json({ success: true, id: citizenId });
      }
    });
  } else {
    db.insertCitizen(id, name, jobTitle, motherName, null, (err, citizenId) => {
      if (err) {
        console.error("Error inserting citizen:", err.message);
        res.status(500).json({ error: "Failed to create citizen" });
      } else {
        res.json({ success: true, id: citizenId });
      }
    });
  }
});


// API: Get all citizens
app.get("/api/citizens", isAuthenticated, (req, res) => {
  db.getAllCitizens((err, citizens) => {
    if (err) {
      res.status(500).json({ error: "Failed to fetch citizens" });
    } else {
      res.json(citizens);
    }
  });
});

// API: Update a citizen
app.put("/api/citizens/:id", isAuthenticated, upload.single("photo"), (req, res) => {
  const oldId = req.params.id;
  const { id: newId, name, jobTitle, motherName } = req.body;
  const photo = req.file ? req.file.filename : null; // Corrected line

  db.updateCitizen(oldId, newId, name, jobTitle, motherName, photo, (err) => {
    if (err) {
      res.status(500).json({ error: "Failed to update citizen" });
    } else {
      res.json({ success: true });
    }
  });
});

// API: Delete a citizen
app.delete("/api/citizens/:id", isAuthenticated, (req, res) => {
  const id = req.params.id;

  db.deleteCitizen(id, (err) => {
    if (err) {
      res.status(500).json({ error: "Failed to delete citizen" });
    } else {
      res.json({ success: true });
    }
  });
});

// API: Get all cases
app.get("/api/cases", isAuthenticated, (req, res) => {
  casesDb.getAllCases((err, cases) => {
    if (err) {
      res.status(500).json({ error: "Failed to fetch cases" });
    } else {
      res.json(cases);
    }
  });
});

// API: Create a new case
app.post("/api/cases", isAuthenticated, (req, res) => {
  const { citizenId, caseTitle, status, caseDescription } = req.body; // Include caseDescription
  const dateCreated = new Date().toISOString().split("T")[0]; // Add dateCreated

  if (!citizenId || !caseTitle || !status) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  
  casesDb.insertCase(citizenId, caseTitle, status, dateCreated, caseDescription, (err, caseId) => {
    if (err) {
      res.status(500).json({ error: "Failed to create case" });
    } else {
      res.json({ success: true, id: caseId });
    }
  });
});

// API: Update a case
app.put("/api/cases/:id", isAuthenticated, (req, res) => {
  const id = req.params.id;
  const { citizenId, caseTitle, status, caseDescription } = req.body; // Include caseDescription

  casesDb.updateCase(id, citizenId, caseTitle, status, caseDescription, (err) => {
    if (err) {
      res.status(500).json({ error: "Failed to update case" });
    } else {
      res.json({ success: true });
    }
  });
});

// API: Delete a case
app.delete("/api/cases/:id", isAuthenticated, (req, res) => {
  const id = req.params.id;

  casesDb.deleteCase(id, (err) => {
    if (err) {
      res.status(500).json({ error: "Failed to delete case" });
    } else {
      res.json({ success: true });
    }
  });
});

// API: Get a specific case by ID
app.get("/api/cases/:id", isAuthenticated, (req, res) => {
  const caseId = req.params.id;
  casesDb.getCaseById(caseId, (err, caseData) => {
    if (err) {
      res.status(500).json({ error: "Failed to fetch case" });
    } else {
      res.json(caseData);
    }
  });
});


app.post("/ask", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const response = await axios.post("http://127.0.0.1:8000/query", req.body, { responseType: "stream" });

    response.data.on("data", (chunk) => {
      res.write(chunk);
    });

    response.data.on("end", () => {
      res.end();
    });

  } catch (error) {
    console.error("❌ Error communicating with FastAPI:", error.message);
    res.status(500).json({ error: "Failed to get response from LLM" });
  }
});


// Serve the landing page as the default route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/Landing.html"));
});

// Serve the login page
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/Login.html"));
});

// Serve the Citizen Management page
app.get("/citizen-management", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/Citizen Management.html"));
});

// Serve the assign cases page
app.get("/assign-cases", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/Case Management.html"));
});

// Serve the citizen dashboard page
app.get("/citizen-dashboard", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/citizen-dashboard.html"));
});

// Serve the case manager profile page
app.get("/Case-Profile for Case_Manager.html", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/Case-Profile for Case_Manager.html"));
});

// Serve the case profile page for citizens
app.get("/Case-Profile for Citizens.html", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/Case-Profile for Citizens.html"));
});

// Serve the Chatbot page for citizens
app.get("/Chatbot.html", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/Chatbot.html"));
});

// Start the server
app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
