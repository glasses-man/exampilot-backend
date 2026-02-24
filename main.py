from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import httpx
import os
import base64
import io
from PIL import Image
import pytesseract
import uuid
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="ExamPilot API", version="1.0.0")

# CORS for frontend - update with your deployed frontend URL
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "*",  # Allow all for now - update with specific domain later
        "https://h7tzncmw5z2bs.ok.kimi.link",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OpenAI API key
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "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")

# In-memory database (replace with Supabase/PostgreSQL in production)
users_db = {}
sessions_db = {}
questions_db = {}

# Badges definition
BADGES = {
    'first_question': {'name': 'First Steps', 'icon': '🎯', 'desc': 'Asked your first question'},
    'streak_3': {'name': 'On Fire', 'icon': '🔥', 'desc': '3-day streak'},
    'streak_7': {'name': 'Unstoppable', 'icon': '⚡', 'desc': '7-day streak'},
    'streak_30': {'name': 'Legend', 'icon': '👑', 'desc': '30-day streak'},
    'questions_10': {'name': 'Curious Mind', 'icon': '🧠', 'desc': 'Solved 10 questions'},
    'questions_50': {'name': 'Scholar', 'icon': '📚', 'desc': 'Solved 50 questions'},
    'questions_100': {'name': 'Master', 'icon': '🏆', 'desc': 'Solved 100 questions'},
    'premium': {'name': 'VIP', 'icon': '💎', 'desc': 'Upgraded to Premium'},
}

# Models
class User(BaseModel):
    id: str
    email: str
    name: str
    tier: str = "free"
    daily_questions: int = 0
    total_questions: int = 0
    streak: int = 0
    last_active: str = ""
    xp: int = 0
    level: int = 1
    badges: List[str] = []
    preferred_language: str = "en"

class QuestionRequest(BaseModel):
    text: str
    subject: str = "math"
    user_id: str
    language: str = "en"

class QuestionResponse(BaseModel):
    id: str
    question: str
    explanation: str
    steps: List[str]
    final_answer: str
    subject: str
    created_at: str

class LoginRequest(BaseModel):
    email: str
    password: str

class SignupRequest(BaseModel):
    email: str
    password: str
    name: str

# Helper functions
def get_igcse_prompt(subject: str, question: str, language: str = "en") -> str:
    """Generate IGCSE-style teaching prompt"""
    lang_instruction = " in Arabic" if language == "ar" else ""
    
    prompts = {
        "math": f"""You are an expert IGCSE Mathematics teacher. Explain this problem step-by-step as you would to a student{lang_instruction}:

Question: {question}

Provide:
1. A clear, step-by-step solution
2. Explain WHY each step is done (the reasoning)
3. Highlight any formulas or rules used
4. Give a final answer with units if applicable

Format your response as:
STEP 1: [explanation]
STEP 2: [explanation]
...
FINAL ANSWER: [answer]

Make it encouraging and clear.""",
        
        "physics": f"""You are an expert IGCSE Physics teacher. Explain this problem step-by-step as you would to a student{lang_instruction}:

Question: {question}

Provide:
1. Identify the physics concepts involved
2. State relevant formulas
3. Step-by-step solution with units
4. Explain the physics reasoning

Format your response as:
CONCEPT: [concept]
FORMULA: [formula]
STEP 1: [explanation]
...
FINAL ANSWER: [answer with units]

Make it encouraging and clear.""",
        
        "chemistry": f"""You are an expert IGCSE Chemistry teacher. Explain this problem step-by-step as you would to a student{lang_instruction}:

Question: {question}

Provide:
1. Identify the chemical concepts
2. Show any equations or calculations
3. Step-by-step reasoning
4. Final answer with proper units

Format your response as:
CONCEPT: [concept]
STEP 1: [explanation]
...
FINAL ANSWER: [answer]

Make it encouraging and clear."""
    }
    return prompts.get(subject, prompts["math"])

def parse_explanation(text: str) -> dict:
    """Parse AI response into structured format"""
    lines = text.strip().split('\n')
    steps = []
    final_answer = ""
    
    for line in lines:
        line = line.strip()
        if line.startswith('STEP'):
            steps.append(line.split(':', 1)[1].strip() if ':' in line else line)
        elif line.startswith('FINAL ANSWER:'):
            final_answer = line.replace('FINAL ANSWER:', '').strip()
    
    # Clean up steps
    cleaned_steps = []
    for step in steps:
        # Remove "STEP X:" prefix if still present
        if ':' in step:
            step = step.split(':', 1)[1].strip()
        cleaned_steps.append(step)
    
    return {
        "steps": cleaned_steps,
        "final_answer": final_answer
    }

def check_and_award_badges(user: dict) -> List[str]:
    """Check and award new badges based on user stats"""
    new_badges = []
    current_badges = user.get('badges', [])
    
    total = user.get('total_questions', 0)
    
    if total >= 1 and 'first_question' not in current_badges:
        new_badges.append('first_question')
    if total >= 10 and 'questions_10' not in current_badges:
        new_badges.append('questions_10')
    if total >= 50 and 'questions_50' not in current_badges:
        new_badges.append('questions_50')
    if total >= 100 and 'questions_100' not in current_badges:
        new_badges.append('questions_100')
    
    streak = user.get('streak', 0)
    if streak >= 3 and 'streak_3' not in current_badges:
        new_badges.append('streak_3')
    if streak >= 7 and 'streak_7' not in current_badges:
        new_badges.append('streak_7')
    if streak >= 30 and 'streak_30' not in current_badges:
        new_badges.append('streak_30')
    
    if user.get('tier') == 'premium' and 'premium' not in current_badges:
        new_badges.append('premium')
    
    return new_badges

def update_streak(user: dict):
    """Update user streak based on last active date"""
    last_active = user.get('last_active', '')
    if last_active:
        last_date = datetime.fromisoformat(last_active).date()
        today = datetime.now().date()
        yesterday = today - timedelta(days=1)
        
        if last_date == yesterday:
            # Continued streak
            user['streak'] = user.get('streak', 0) + 1
        elif last_date < yesterday:
            # Streak broken
            user['streak'] = 1
    else:
        user['streak'] = 1
    
    user['last_active'] = datetime.now().isoformat()

async def call_openai(subject: str, question: str, language: str = "en") -> str:
    """Call OpenAI API for explanation"""
    prompt = get_igcse_prompt(subject, question, language)
    
    system_msg = f"You are an expert IGCSE teacher who explains concepts clearly and encouragingly.{' Respond in Arabic.' if language == 'ar' else ''}"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "gpt-3.5-turbo",
                    "messages": [
                        {"role": "system", "content": system_msg},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.7,
                    "max_tokens": 1500
                },
                timeout=30.0
            )
            
            if response.status_code == 200:
                data = response.json()
                return data['choices'][0]['message']['content']
            else:
                print(f"OpenAI API error: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"Error calling OpenAI: {e}")
            return None

# Routes
@app.get("/")
def root():
    return {
        "message": "ExamPilot API - AI Exam Coach",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.post("/auth/signup")
async def signup(req: SignupRequest):
    user_id = str(uuid.uuid4())
    if req.email in [u.get("email") for u in users_db.values()]:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    user = {
        "id": user_id,
        "email": req.email,
        "name": req.name,
        "tier": "free",
        "daily_questions": 0,
        "total_questions": 0,
        "streak": 0,
        "last_active": datetime.now().isoformat(),
        "xp": 0,
        "level": 1,
        "badges": [],
        "preferred_language": "en"
    }
    users_db[user_id] = user
    
    # Create session
    session_token = str(uuid.uuid4())
    sessions_db[session_token] = {"user_id": user_id, "created_at": datetime.now().isoformat()}
    
    return {"user": user, "token": session_token}

@app.post("/auth/login")
async def login(req: LoginRequest):
    user = None
    for u in users_db.values():
        if u.get("email") == req.email:
            user = u
            break
    
    if not user:
        # Auto-create user for demo
        user_id = str(uuid.uuid4())
        user = {
            "id": user_id,
            "email": req.email,
            "name": req.email.split('@')[0],
            "tier": "free",
            "daily_questions": 0,
            "total_questions": 0,
            "streak": 0,
            "last_active": datetime.now().isoformat(),
            "xp": 0,
            "level": 1,
            "badges": [],
            "preferred_language": "en"
        }
        users_db[user_id] = user
    
    # Update streak
    update_streak(user)
    
    session_token = str(uuid.uuid4())
    sessions_db[session_token] = {"user_id": user["id"], "created_at": datetime.now().isoformat()}
    
    return {"user": user, "token": session_token}

@app.post("/auth/google")
async def google_auth(token: str = Form(...), email: str = Form(...), name: str = Form(...)):
    """Handle Google OAuth login/signup"""
    # Check if user exists
    user = None
    user_id = None
    for uid, u in users_db.items():
        if u.get("email") == email:
            user = u
            user_id = uid
            break
    
    if not user:
        # Create new user
        user_id = str(uuid.uuid4())
        user = {
            "id": user_id,
            "email": email,
            "name": name,
            "tier": "free",
            "daily_questions": 0,
            "total_questions": 0,
            "streak": 0,
            "last_active": datetime.now().isoformat(),
            "xp": 0,
            "level": 1,
            "badges": [],
            "preferred_language": "en"
        }
        users_db[user_id] = user
    
    # Update streak
    update_streak(user)
    
    session_token = str(uuid.uuid4())
    sessions_db[session_token] = {"user_id": user_id, "created_at": datetime.now().isoformat()}
    
    return {"user": user, "token": session_token}

@app.get("/user/me")
def get_user(token: str):
    session = sessions_db.get(token)
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = users_db.get(session["user_id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user

@app.post("/questions/ask")
async def ask_question(req: QuestionRequest):
    # Check user
    user = users_db.get(req.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check daily limit for free users
    if user.get("tier") == "free" and user.get("daily_questions", 0) >= 5:
        raise HTTPException(
            status_code=403, 
            detail="Daily limit reached. Upgrade to premium for unlimited questions!"
        )
    
    # Call OpenAI
    ai_response = await call_openai(req.subject, req.text, req.language)
    
    if not ai_response:
        # Fallback response
        ai_response = """STEP 1: Read the question carefully and understand what is being asked
STEP 2: Identify the key concepts and formulas needed
STEP 3: Apply the appropriate method step by step
STEP 4: Verify your answer makes sense

FINAL ANSWER: Solution completed! Check the steps above."""
    
    parsed = parse_explanation(ai_response)
    
    # Save question
    question_id = str(uuid.uuid4())
    question_data = {
        "id": question_id,
        "user_id": req.user_id,
        "question": req.text,
        "explanation": "",
        "steps": parsed["steps"],
        "final_answer": parsed["final_answer"],
        "subject": req.subject,
        "created_at": datetime.now().isoformat()
    }
    questions_db[question_id] = question_data
    
    # Update user stats
    user["daily_questions"] = user.get("daily_questions", 0) + 1
    user["total_questions"] = user.get("total_questions", 0) + 1
    user["xp"] = user.get("xp", 0) + 10
    user["level"] = (user["xp"] // 100) + 1
    
    # Check for new badges
    new_badges = check_and_award_badges(user)
    if new_badges:
        user["badges"] = user.get("badges", []) + new_badges
    
    return {
        "question": question_data,
        "new_badges": new_badges,
        "user": user
    }

@app.post("/questions/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    subject: str = Form("math"),
    language: str = Form("en")
):
    """Upload image and extract text using OCR"""
    user = users_db.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check daily limit
    if user.get("tier") == "free" and user.get("daily_questions", 0) >= 5:
        raise HTTPException(
            status_code=403, 
            detail="Daily limit reached. Upgrade to premium for unlimited questions!"
        )
    
    try:
        # Read image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        # Extract text using OCR
        extracted_text = pytesseract.image_to_string(image)
        
        if not extracted_text.strip():
            return {"error": "No text found in image. Please try a clearer image or type your question."}
        
        # Process as regular question
        req = QuestionRequest(
            text=extracted_text, 
            subject=subject, 
            user_id=user_id,
            language=language
        )
        return await ask_question(req)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/questions/history")
def get_history(user_id: str):
    """Get user's question history"""
    history = [q for q in questions_db.values() if q.get("user_id") == user_id]
    return sorted(history, key=lambda x: x.get("created_at", ""), reverse=True)

@app.post("/user/upgrade")
def upgrade_user(user_id: str):
    """Upgrade user to premium"""
    user = users_db.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user["tier"] = "premium"
    
    # Award premium badge
    if "premium" not in user.get("badges", []):
        user["badges"] = user.get("badges", []) + ["premium"]
    
    return {"message": "Upgraded to premium!", "user": user}

@app.post("/user/reset-daily")
def reset_daily(user_id: str):
    """Reset daily question count (call daily via cron)"""
    user = users_db.get(user_id)
    if user:
        user["daily_questions"] = 0
    return {"message": "Daily count reset"}

@app.get("/leaderboard")
def get_leaderboard():
    """Get leaderboard data"""
    # Sort users by XP
    sorted_users = sorted(
        users_db.values(),
        key=lambda x: x.get("xp", 0),
        reverse=True
    )[:10]
    
    leaderboard = []
    for i, u in enumerate(sorted_users, 1):
        leaderboard.append({
            "rank": i,
            "name": u.get("name", "Anonymous"),
            "xp": u.get("xp", 0),
            "level": u.get("level", 1),
            "streak": u.get("streak", 0)
        })
    
    return leaderboard

@app.get("/badges")
def get_badges():
    """Get all available badges"""
    return BADGES

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
