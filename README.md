# GENAI-STACK

A visual, drag-and-drop platform for building intelligent AI workflows that enables users to create sophisticated document processing and chat systems without coding.

##  Overview

This full-stack application empowers users to visually create and interact with intelligent workflows using a drag-and-drop interface. Users can build flows that handle document processing, AI-powered question answering, web search integration, and interactive chat experiences.

##  Key Features

- **Visual Workflow Builder**: Drag-and-drop interface using React Flow
- **Intelligent Document Processing**: Upload, extract, and search through PDF documents
- **Multi-Provider AI Integration**: Support for OpenAI GPT and Google Gemini models
- **Real-time Chat Interface**: Interactive chat with built workflows
- **Web Search Integration**: Real-time web search capabilities
- **Vector Search**: Semantic search through uploaded documents using embeddings
- **User Authentication**: Secure user registration and login system
- **Workflow Persistence**: Save and load custom workflows

## Architecture

### Frontend (React + Vite)
- **Framework**: React 18 with Vite for fast development
- **UI Components**: Custom components with Tailwind CSS
- **Workflow Visualization**: React Flow for drag-and-drop workflow building
- **State Management**: React hooks and context for state management
- **Authentication**: JWT-based authentication with protected routes

### Backend (FastAPI)
- **Framework**: FastAPI for high-performance API development
- **Database**: PostgreSQL with Alembic for migrations
- **Authentication**: OAuth2 with JWT tokens
- **Document Processing**: PyMuPDF for PDF text extraction
- **Vector Store**: ChromaDB for embedding storage and semantic search
- **AI Integration**: OpenAI and Google Gemini API integrations
- **Containerization**: Docker and Docker Compose for development

##  Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 18, Vite, Tailwind CSS, React Flow |
| Backend | FastAPI, Python 3.11+ |
| Database | PostgreSQL |
| Vector Store | ChromaDB |
| Authentication | JWT, OAuth2 |
| AI Models | OpenAI GPT, Google Gemini |
| Embeddings | OpenAI Embeddings, Gemini Embeddings |
| Web Search | SerpAPI, Brave Search |
| Document Processing | PyMuPDF |
| Containerization | Docker, Docker Compose |
| Database Migrations | Alembic |

##  Quick Start

### Prerequisites

- Node.js 16+ and npm/yarn
- Python 3.11+
- Docker and Docker Compose
- PostgreSQL (or use Docker)

### Environment Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd no-code-workflow-builder
```

2. **Backend Setup**
```bash
cd backend
cp .env.example .env
# Edit .env with your API keys and configuration
docker-compose up -d  # Start PostgreSQL and ChromaDB
pip install -r requirements.txt
alembic upgrade head  # Run database migrations
uvicorn main:app --reload  # Start backend server
```

3. **Frontend Setup**
```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local with your configuration
npm run dev  # Start development server
```

### Environment Variables

#### Backend (.env)
```env
DATABASE_URL=postgresql://user:password@localhost:5432/workflow_db
SECRET_KEY=your-secret-key-here
```

#### Frontend (.env.local)
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_APP_NAME=GenAI Stack Builder
```

##  Core Components

### 1. User Query Component
- **Purpose**: Entry point for user queries
- **Features**: 
  - Query input with history
  - Saved queries functionality
  - Common query templates
  - Real-time character and word count
- **Connections**: Outputs to Knowledge Base or LLM Engine

### 2. Knowledge Base Component
- **Purpose**: Document upload and semantic search
- **Features**:
  - PDF document upload and processing
  - Text extraction using PyMuPDF
  - Embedding generation and storage
  - Semantic search with similarity scoring
  - Document management interface
- **Connections**: Receives from User Query, outputs to LLM Engine

### 3. LLM Engine Component
- **Purpose**: AI-powered text generation and reasoning
- **Features**:
  - Multi-provider support (OpenAI, Gemini)
  - Custom prompt templates
  - Web search integration
  - Context-aware responses
  - Configurable model parameters
- **Connections**: Receives from User Query/Knowledge Base, outputs to Output

### 4. Web Search Component
- **Purpose**: Real-time web information retrieval
- **Features**:
  - SerpAPI and Brave Search integration
  - Configurable search parameters
  - Result filtering and ranking
  - Search history and caching
- **Connections**: Can connect to LLM Engine for enhanced responses

### 5. Output Component
- **Purpose**: Display workflow results and enable testing
- **Features**:
  - Real-time workflow execution
  - Quick chat functionality
  - Output formatting and export
  - Execution history and logs
  - Copy and download capabilities
- **Connections**: Receives from LLM Engine (terminal component)

##  Workflow Execution Flow

```
User Query → [Knowledge Base] → LLM Engine → Output
              ↑                    ↑
         [Web Search] ←──────────────┘
```

1. **User Input**: Query enters through User Query component
2. **Document Processing** (Optional): Knowledge Base retrieves relevant context
3. **Web Search** (Optional): Web Search component gathers real-time information
4. **AI Processing**: LLM Engine processes query with context and generates response
5. **Output Display**: Results shown in Output component with chat interface

## Project Structure

```
GenAI-Stack/
├── frontend/                           # React frontend application
│   ├── src/
│   │   ├── components/                 # React components
│   │   │   ├── pages/                  # Page components
│   │   │   ├── nodes/                  # Workflow node components
│   │   │   ├── modals/                 # Modal components
│   │   │   └── layout/                 # Layout components
│   │   ├── hooks/                      # Custom React hooks
│   │   ├── services/                   # API/service layer
│   │   ├── styles/                     # CSS and styling
│   │   └── App.jsx                     # Root React component
│   ├── public/                         # Static assets (favicon, index.html, etc.)
│   ├── package.json
│   └── vite.config.js

├── backend/                            # FastAPI backend application
│   ├── main.py                         # Entry point FastAPI app
│   ├── config.py                       # Configuration/settings
│   ├── database.py                     # DB connection logic
│   ├── models.py                       # SQLAlchemy models
│   ├── schemas.py                      # Pydantic schemas
│   ├── routers/                        # FastAPI route handlers
│   ├── services/                       # Business logic layer
│   ├── alembic/                        # Database migrations
│   ├── requirements.txt                # Python dependencies
│   ├── Dockerfile                      # Container config for backend
│   ├── docker-compose.yml             # Compose file for full-stack app                       
├── README.md                           # Root README for the entire GenAI-Stack
└── .gitignore                          # Git ignored files

```

##  Authentication & Security

- **JWT-based Authentication**: Secure token-based user authentication
- **Protected Routes**: Frontend route protection for authenticated users
- **API Security**: All workflow operations require valid authentication
- **Input Validation**: Comprehensive request validation using Pydantic
- **CORS Configuration**: Proper cross-origin resource sharing setup

##  API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get user profile

### Workflows
- `GET /api/workflows/` - List user workflows
- `POST /api/workflows/` - Create new workflow
- `GET /api/workflows/{id}` - Get specific workflow
- `PUT /api/workflows/{id}` - Update workflow
- `DELETE /api/workflows/{id}` - Delete workflow
- `POST /api/workflows/{id}/execute` - Execute workflow
- `POST /api/workflows/{id}/validate` - Validate workflow

### Documents
- `POST /api/documents/upload` - Upload document
- `GET /api/documents/` - List documents
- `GET /api/documents/{id}` - Get document details
- `DELETE /api/documents/{id}` - Delete document

### Chat
- `POST /api/chat/sessions` - Create chat session
- `GET /api/chat/sessions` - List chat sessions
- `POST /api/chat/sessions/{id}/messages` - Send message
- `GET /api/chat/sessions/{id}/messages` - Get chat history
- `POST /api/chat/quick-chat` - Quick chat without session

### Embeddings
- `POST /api/embeddings/search` - Search embeddings
- `POST /api/embeddings/documents/{id}/generate` - Generate embeddings
- `GET /api/embeddings/stats` - Get embedding statistics

##  Development

### Running Tests
```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

### Database Migrations
```bash
cd backend
alembic revision --autogenerate -m "Description of changes"
alembic upgrade head
```

### Docker Development
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

##  Deployment

### Production Build
```bash
# Frontend
cd frontend
npm run build

# Backend
cd backend
docker build -t workflow-backend .
```


##  Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request



##  Troubleshooting

### Common Issues

**Frontend won't start**
- Check Node.js version (16+ required)
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Verify environment variables in `.env.local`

**Backend connection errors**
- Ensure PostgreSQL is running
- Check database connection string in `.env`
- Run database migrations: `alembic upgrade head`

**Document upload fails**
- Check file permissions in upload directory
- Verify PyMuPDF installation
- Check file size limits in configuration

**Embeddings not working**
- Verify ChromaDB is running on correct port
- Check OpenAI API key configuration
- Ensure documents are properly processed

##  License

This project is licensed under the MIT License - see the LICENSE file for details.


