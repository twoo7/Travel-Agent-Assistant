# AI Travel Agent - Project Requirements Document

## Project Overview

**Goal:** Build an intelligent travel agent application that helps plan trips by finding flight deals, hotels, and creating itineraries using AI/agentic reasoning.

**Phase 1 Focus:** Flight Deal Finder with agentic AI capabilities

**Tech Stack:**
- Backend: Python (FastAPI)
- Frontend: React/Next.js with TypeScript
- AI: Anthropic's Claude API
- External APIs: Amadeus (flights & hotels)

---

## Learning Objectives

1. Understand agentic AI vs simple scripts
2. Master API integration and service architecture
3. Learn state management and data modeling
4. Build production-ready Python project structure
5. Implement security best practices (API key management)
6. Create interview-worthy portfolio project

---

## Core Concepts

### Agent vs Tool
- **Tool:** A function with specific purpose requiring exact parameters
- **Agent:** AI system that uses tools through reasoning, interpreting vague inputs and making decisions

### Example Flow
```
User: "Find cheap flights to Tokyo next month, flexible on dates"
         ↓
Frontend → Backend Agent (Claude) → Analyzes request
         ↓
Agent decides: Search Feb 15-20, Feb 22-27, Mar 1-5
         ↓
Service Layer → Makes 3 Amadeus API calls
         ↓
Agent → Compares results, identifies best deals
         ↓
Frontend ← Structured data + AI summary
```

---

## Project Structure

```
travel-agent/
├── backend/
│   ├── src/
│   │   ├── agents/          # AI agent logic (Claude orchestration)
│   │   ├── services/        # API integrations (Amadeus wrapper)
│   │   ├── models/          # Pydantic data models/schemas
│   │   ├── utils/           # Helper functions
│   │   └── config.py        # Configuration management
│   ├── tests/               # Unit and integration tests
│   ├── requirements.txt     # Python dependencies
│   ├── .env                 # API keys (DO NOT COMMIT)
│   ├── .gitignore          
│   └── main.py             # FastAPI application entry point
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Next.js pages
│   │   └── services/        # API calls to backend
│   ├── package.json
│   └── .env.local          # Frontend environment variables
└── README.md
```

---

## Backend Setup

### Virtual Environment
```bash
cd travel-agent/backend
python -m venv venv

# Activate (Mac/Linux)
source venv/bin/activate

# Activate (Windows)
venv\Scripts\activate
```

**Why Virtual Environments?**
- Isolates project dependencies
- Prevents version conflicts between projects
- Each project gets its own package installations

### Dependencies (requirements.txt)
```
anthropic          # Claude API client
amadeus            # Amadeus flight/hotel API
python-dotenv      # Environment variable management
fastapi            # Web framework
uvicorn            # ASGI server
pydantic           # Data validation and serialization
```

### Environment Variables (.env)
```
AMADEUS_API_KEY=your_key_here
AMADEUS_API_SECRET=your_secret_here
ANTHROPIC_API_KEY=your_claude_key_here
```

### Git Ignore (.gitignore)
```
venv/
.env
__pycache__/
*.pyc
.DS_Store
```

---

## API Integration

### Amadeus API
- **Documentation:** https://developers.amadeus.com
- **Tier:** Free tier for development
- **Endpoints Used:**
  - Flight Offers Search
  - Hotel Offers (future phase)

### Why Backend Middleware?

**Security:**
- API keys stay on server (not exposed in frontend)
- Users can't steal credentials from browser dev tools

**Additional Benefits:**
- Data transformation (send only needed data to frontend)
- Caching (reduce API calls, save costs)
- Rate limiting (protect from abuse)
- Business logic (price tracking, deal scoring)

---

## Data Models

### Configuration Module (`config.py`)

```python
from dotenv import load_dotenv
import os

load_dotenv()

class Config:
    AMADEUS_API_KEY = os.getenv('AMADEUS_API_KEY')
    AMADEUS_API_SECRET = os.getenv('AMADEUS_API_SECRET')
    ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')
    
    @classmethod
    def validate(cls):
        """Validate that all required environment variables are set"""
        missing = []
        if not cls.AMADEUS_API_KEY:
            missing.append('AMADEUS_API_KEY')
        if not cls.AMADEUS_API_SECRET:
            missing.append('AMADEUS_API_SECRET')
        if not cls.ANTHROPIC_API_KEY:
            missing.append('ANTHROPIC_API_KEY')
        
        if missing:
            raise ValueError(f"Missing required environment variables: {', '.join(missing)}")
```

**Purpose:** Validates environment variables at startup, fails fast if configuration is incomplete.

### Flight Models (`models/flight.py`)

```python
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class FlightSearchRequest(BaseModel):
    """What the user provides"""
    origin: str = Field(..., description="Origin airport code (e.g., LAX)")
    destination: str = Field(..., description="Destination airport code (e.g., JFK)")
    departure_date: str = Field(..., description="Departure date (YYYY-MM-DD)")
    return_date: Optional[str] = Field(None, description="Return date for round trip")
    adults: int = Field(1, ge=1, le=9, description="Number of adult passengers")
    max_results: int = Field(10, ge=1, le=250)

class FlightSegment(BaseModel):
    """A single flight leg"""
    departure_airport: str
    arrival_airport: str
    departure_time: str
    arrival_time: str
    duration: str
    carrier_code: str
    flight_number: str

class FlightOffer(BaseModel):
    """A complete flight option"""
    id: str
    price: float
    currency: str
    segments: List[FlightSegment]
    total_duration: str
    number_of_stops: int
```

**Why Pydantic?**
- Automatic type conversion (`adults="2"` → `int(2)`)
- Runtime validation with clear error messages
- Built-in JSON serialization (`.dict()`, `.json()`)
- Auto-generates API documentation
- Type safety with IDE support

---

## Service Layer

### Amadeus Service (`services/amadeus_service.py`)

**Responsibilities:**
1. Wrap Amadeus API client
2. Handle authentication (SDK does this automatically)
3. Transform API responses into our data models
4. Handle errors gracefully
5. Log requests for debugging

**Implementation Template:**

```python
from amadeus import Client, ResponseError
from typing import List, Optional
import logging

from ..config import Config
from ..models.flight import FlightSearchRequest, FlightOffer, FlightSegment

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AmadeusService:
    def __init__(self):
        """Initialize the Amadeus client"""
        Config.validate()
        self.client = Client(
            client_id=Config.AMADEUS_API_KEY,
            client_secret=Config.AMADEUS_API_SECRET
        )
    
    def search_flights(self, search_request: FlightSearchRequest) -> List[FlightOffer]:
        """
        Search for flight offers based on search criteria
        
        Args:
            search_request: FlightSearchRequest object with search parameters
            
        Returns:
            List of FlightOffer objects
            
        Raises:
            ResponseError: If Amadeus API returns an error
        """
        try:
            # Call Amadeus API
            response = self.client.shopping.flight_offers_search.get(
                originLocationCode=search_request.origin,
                destinationLocationCode=search_request.destination,
                departureDate=search_request.departure_date,
                returnDate=search_request.return_date,
                adults=search_request.adults,
                max=search_request.max_results
            )
            
            # Transform response into our models
            offers = []
            for offer_data in response.data:
                # Parse and transform each offer
                # Extract segments, price, duration
                # Create FlightOffer objects
                pass  # TODO: Implement transformation
            
            logger.info(f"Found {len(offers)} flight offers")
            return offers
            
        except ResponseError as error:
            logger.error(f"Amadeus API error: {error}")
            raise
```

**Key Implementation Questions:**
1. How to handle 0 results? (Return empty list)
2. How to handle API errors? (Log and re-raise with context)
3. Should we log raw responses? (Yes, for debugging in dev mode)

---

## Agent Layer (Next Phase)

### Agent Architecture Pattern

```python
# ❌ Simple Script (No Intelligence)
def search_flights(origin, destination, date):
    return amadeus_api.call(origin, destination, date)

# ✅ Agentic System (Has Intelligence)
def search_flights_agent(user_request):
    # 1. Understand intent
    analysis = claude.analyze(user_request)
    
    # 2. Plan actions
    search_plan = claude.create_search_strategy(analysis)
    
    # 3. Execute with tools
    results = []
    for search in search_plan:
        results.append(amadeus_api.call(**search))
    
    # 4. Synthesize and decide
    recommendation = claude.analyze_and_recommend(results)
    
    return recommendation
```

**When to Use AI Agent:**

✅ **Use Agent:**
- "Cheapest way to Europe this spring, don't care which city"
- "Find flights to Tokyo next month, flexible on dates"
- Vague requests requiring interpretation and planning

❌ **Direct API Call:**
- "Flights from LAX to JFK on March 15, 2026"
- Explicit, unambiguous requests

---

## Implementation Roadmap

### Phase 1: Foundation (Current)
- [x] Project structure setup
- [x] Virtual environment configuration
- [x] Environment variables and config
- [x] Data models (Pydantic schemas)
- [ ] Amadeus service implementation
- [ ] Service testing with sample requests
- [ ] Error handling and logging

### Phase 2: Agent Layer
- [ ] Claude API integration
- [ ] Tool definition for flight search
- [ ] Agent reasoning logic
- [ ] Multi-step search strategies
- [ ] Result analysis and recommendations

### Phase 3: API Endpoints
- [ ] FastAPI application setup
- [ ] Flight search endpoint
- [ ] Request validation
- [ ] Response formatting
- [ ] CORS configuration

### Phase 4: Frontend
- [ ] Next.js project setup
- [ ] Search interface
- [ ] Results display
- [ ] API integration
- [ ] Loading states and error handling

### Phase 5: Enhancements
- [ ] Price tracking over time
- [ ] Deal scoring algorithm
- [ ] Hotel integration
- [ ] Itinerary building
- [ ] MCP server wrapper (optional)

---

## Testing Strategy

### Unit Tests
- Test data model validation
- Test Amadeus service methods
- Mock API responses

### Integration Tests
- Test full flow with real API calls (test mode)
- Validate error handling
- Check rate limiting

### Manual Testing Checklist
- [ ] Valid flight search returns results
- [ ] Invalid airport codes are handled
- [ ] Date validation works
- [ ] API errors are caught and logged
- [ ] Empty results handled gracefully

---

## Key Interview Talking Points

1. **Architecture Decision:** "I separated services from agents to maintain clear separation of concerns - services handle API communication while agents provide the reasoning layer."

2. **Agentic AI:** "The agent acts as an orchestration layer that bridges natural language user intent with structured API calls, making intelligent decisions about which tools to use and how to interpret results."

3. **Data Validation:** "Using Pydantic provides runtime type validation and serialization, catching errors early and ensuring data consistency across the application boundary."

4. **Security:** "API keys are stored server-side and never exposed to the frontend, preventing credential theft and unauthorized usage."

5. **Scalability:** "The modular architecture allows easy addition of new services (hotels, attractions) without modifying existing agent logic."

---

## Resources

### Documentation
- Amadeus API: https://developers.amadeus.com
- Anthropic Claude: https://docs.anthropic.com
- Pydantic: https://docs.pydantic.dev
- FastAPI: https://fastapi.tiangolo.com

### Learning Resources
- Understanding async/await in Python
- RESTful API design principles
- Tool use with Claude
- State management patterns

---

## Next Immediate Steps

1. **Complete Amadeus Service:**
   - Implement `search_flights()` method
   - Parse Amadeus response JSON
   - Transform to `FlightOffer` objects
   - Test with sample searches

2. **Create Test Script:**
   - Simple Python script to test service
   - Verify API connectivity
   - Validate data transformation

3. **Error Handling:**
   - Handle network errors
   - Handle invalid input
   - Log appropriately

4. **Move to Agent Layer:**
   - Integrate Claude API
   - Define tools for Claude to use
   - Implement reasoning logic

---

## Notes and Considerations

### State Management
- **Current:** In-memory (simple, no persistence)
- **Future:** Database for saved searches, price tracking

### "Good Deal" Definition
- **Current:** Lowest price
- **Future:** Consider duration, stops, airline quality, departure times

### MCP Server
- **Decision:** Build core functionality first, then wrap as MCP server
- **Rationale:** Learn fundamentals before adding abstraction layer

### API Rate Limits
- Amadeus free tier has limits
- Implement caching to reduce calls
- Consider rate limiting on our API

---

## File Checklist


```
backend/
├── src/
│   ├── __init__.py
│   ├── config.py                    
│   ├── models/
│   │   ├── __init__.py
│   │   └── flight.py                
│   ├── services/
│   │   ├── __init__.py
│   │   └── amadeus_service.py       
│   └── agents/
│       ├── __init__.py
│       └── flight_agent.py          
├── requirements.txt                 
├── .env                              
├── .gitignore                        
└── main.py                           
```

---

## Questions to Consider

1. How should we handle timezone differences in flight times?
2. What's the best way to compare flights with different numbers of stops?
3. Should we cache search results? For how long?
4. How do we handle currency conversion for international flights?
5. What's the user flow for flexible date searches?

