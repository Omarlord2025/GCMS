# Government Case Management System (GCMS)

**Full-stack system for citizen management, case tracking, and AI legal assistance**

## Features

### Frontend
- Citizen/case manager dashboards
- Case filing/management interfaces
- AI Chatbot interface
- Authentication system (Login/Registration)
- Landing page with service overview
- Responsive design with dark/light themes
- Citizen profile management

### Backend
- REST API for citizen/case operations
- Session-based authentication
- File upload handling (citizen photos)
- SQLite databases (Citizens, Cases, Users)
- AI Legal Assistant (FastAPI/Python)
- Multi-language support (Arabic/English)

## Technologies

**Frontend**  
- HTML5/CSS3/JavaScript
- Chart.js (Data visualization)
- Font Awesome Icons
- Google Fonts

**Backend**  
- Node.js/Express.js
- SQLite (Database)
- Multer (File uploads)
- bcrypt (Password hashing)

**AI Components**  
- Python/FastAPI
- Groq API (LLM Inference)
- LangChain (Document processing)
- Hugging Face (Embeddings)
- Google Translator API

## Installation

1. **Clone Repository**
   ```bash
   git clone https://github.com/[your-username]/GCMS.git
   cd GCMS
   ```

2. **Backend Setup**
   ```bash
   # Install Node.js dependencies
   cd backend
   npm install express sqlite3 bcrypt multer axios dotenv

   # Install Python requirements
   cd LLM_Chat_bot
   python -m venv venv
   source venv/bin/activate  # Linux/Mac
   venv\Scripts\activate     # Windows
   pip install -r requirements.txt
   ```

3. **Frontend Setup**  
   (Static files - no build required)


## Running the System

1. **Start Node.js Backend**
   ```bash
   cd backend
   node server.js
   ```
## File Structure

```
GCMS/
├── frontend/
│   ├── Citizen Management.html
│   ├── citizen-dashboard.html
│   ├── Landing.html
│   ├── Login.html
│   ├── Case Management.html
│   ├── Chatbot.html
│   │── ## other Pages
├── backend/
│   ├── server.js            # Main Express server
│   ├── db for citizens.js   # Citizen database
│   ├── db for Cases.js      # Case database
│   ├── db for login.js      # Authentication database
│   ├── uploads/             # Citizen photos
│   └── LLM_Chat_bot/
│       ├── Chatbot_LLM.py   # AI Chatbot core
│       ├── Laws/            # Legal PDF documents
│       └── chroma_db/       # Vector database
```

## Key Pages

| Page                      | Path                          | Description                     |
|---------------------------|-------------------------------|---------------------------------|
| Landing Page              | `/`                           | System introduction & services |
| Login                     | `/login`                      | Authentication portal          |
| Citizen Management        | `/citizen-management`         | CRUD operations for citizens   |
| Case Management           | `/assign-cases`               | Create/assign legal cases      |
| Citizen Dashboard         | `/citizen-dashboard`          | Personal case tracking         |
| AI Chatbot                | `/Chatbot.html`               | Legal assistance interface     |

## Configuration

1. **Legal Documents**  
   Place PDF laws in `backend/Laws/` directory

2. **Sample Users** (Auto-created):
   - Citizen: `Omar/citizen123`
   - Case Worker: `Yassin/worker123`
   - Manager: `Ahmed/manager123`

3. **Environment Variables**  
   Required in `LLM_Chat_bot/.env`:
   ```env
   GROQ_API_KEY=your_groq_key
   GROQ_API_KEY2=your_backup_groq_key
   HF_TOKEN=your_huggingface_token
   ```

## API Endpoints

| Endpoint                | Method | Description                     |
|-------------------------|--------|---------------------------------|
| `/api/login`            | POST   | User authentication            |
| `/api/citizens`         | POST   | Create citizen with photo      |
| `/api/cases`            | GET    | List all cases                 |
| `/ask`                  | POST   | Legal chatbot endpoint         |

## Troubleshooting

1. **AI Service Not Starting**
   - Verify Python virtual environment
   - Check GROQ_API_KEYs in .env
   - Ensure legal PDFs are in `Laws/`

2. **Photo Upload Issues**
   - Ensure `uploads/` directory exists
   - Check file permissions (write access)

3. **Database Errors**
   - Delete .db files to reset databases
   - Verify table schemas match code

4. **Frontend Not Loading**
   - Ensure Node.js server is running
   - Check browser console for errors
