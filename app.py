from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import sqlite3
import json
import os

app = FastAPI(title="Affiliate.Watch Clone API")

# Enable CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_FILE = os.environ.get("DB_FILE", "affiliates.db")

# Pydantic model for updating program
class ProgramUpdate(BaseModel):
    affiliate_url: str
    referral_code: Optional[str] = None

# Pydantic model for creating a program
class ProgramCreate(BaseModel):
    name: str
    website: str
    affiliate_url: str
    referral_code: Optional[str] = None
    teaser_affiliate: str
    teaser_company: str
    rating_ai: Optional[float] = 90.0
    cookie_days: Optional[int] = 30
    launch_year: Optional[int] = 2026
    logo_url: Optional[str] = None
    categories: list[str] = []
    payment_methods: list[str] = []

def make_slug(name: str) -> str:
    import re
    s = name.lower().strip()
    s = re.sub(r'[^a-z0-9\s-]', '', s)
    s = re.sub(r'[\s-]+', '-', s)
    return s

def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

@app.on_event("startup")
def startup_event():
    # Make sure database is initialized and seeded
    from database import init_db
    init_db()

# Serve Frontend
@app.get("/")
def read_root():
    return FileResponse("static/index.html")

# Get Categories, Networks, and Payment Methods for Filters
@app.get("/api/meta")
def get_meta():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT categories, payment_methods FROM affiliates")
    rows = cursor.fetchall()
    conn.close()
    
    categories = set()
    payment_methods = set()
    
    for row in rows:
        try:
            cats = json.loads(row["categories"])
            categories.update(cats)
        except:
            pass
        try:
            pms = json.loads(row["payment_methods"])
            payment_methods.update(pms)
        except:
            pass
            
    return {
        "categories": sorted(list(categories)),
        "payment_methods": sorted(list(payment_methods)),
        "total_programs": len(rows)
    }

# API to retrieve all programs
@app.get("/api/programs")
def get_programs(
    search: Optional[str] = None,
    category: Optional[str] = None,
    payment_method: Optional[str] = None,
    sort_by: Optional[str] = "rating_desc"  # rating_desc, name_asc, clicks_desc
):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM affiliates")
    rows = cursor.fetchall()
    conn.close()
    
    programs = []
    for row in rows:
        try:
            cats = json.loads(row["categories"])
        except:
            cats = []
        try:
            pms = json.loads(row["payment_methods"])
        except:
            pms = []
            
        programs.append({
            "id": row["id"],
            "name": row["name"],
            "slug": row["slug"],
            "website": row["website"],
            "affiliate_url": row["affiliate_url"],
            "referral_code": row["referral_code"],
            "teaser_affiliate": row["teaser_affiliate"],
            "teaser_company": row["teaser_company"],
            "rating_ai": row["rating_ai"],
            "cookie_days": row["cookie_days"],
            "launch_year": row["launch_year"],
            "logo_url": row["logo_url"],
            "categories": cats,
            "payment_methods": pms,
            "clicks": row["clicks"]
        })
        
    # Apply filtering in memory
    if search:
        search = search.lower().strip()
        programs = [
            p for p in programs
            if search in p["name"].lower()
            or search in p["teaser_company"].lower()
            or search in p["teaser_affiliate"].lower()
        ]
        
    if category:
        programs = [p for p in programs if category in p["categories"]]
        
    if payment_method:
        programs = [p for p in programs if payment_method in p["payment_methods"]]
        
    # Apply sorting
    if sort_by == "rating_desc":
        programs.sort(key=lambda x: x["rating_ai"], reverse=True)
    elif sort_by == "name_asc":
        programs.sort(key=lambda x: x["name"].lower())
    elif sort_by == "clicks_desc":
        programs.sort(key=lambda x: x["clicks"], reverse=True)
        
    return programs

# API to update affiliate URL & referral code
@app.put("/api/programs/{program_id}")
def update_program(program_id: int, payload: ProgramUpdate):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if exists
    cursor.execute("SELECT * FROM affiliates WHERE id = ?", (program_id,))
    program = cursor.fetchone()
    if not program:
        conn.close()
        raise HTTPException(status_code=404, detail="Program not found")
        
    # Update url and referral code
    cursor.execute(
        "UPDATE affiliates SET affiliate_url = ?, referral_code = ? WHERE id = ?",
        (payload.affiliate_url.strip(), payload.referral_code.strip() if payload.referral_code else None, program_id)
    )
    conn.commit()
    conn.close()
    
    return {"message": "Program updated successfully"}

# API to create a new program
@app.post("/api/programs")
def create_program(payload: ProgramCreate):
    # Generate unique slug
    base_slug = make_slug(payload.name)
    slug = base_slug
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check uniqueness and alter slug if needed
    counter = 1
    while True:
        cursor.execute("SELECT id FROM affiliates WHERE slug = ?", (slug,))
        if not cursor.fetchone():
            break
        slug = f"{base_slug}-{counter}"
        counter += 1
        
    logo_url = payload.logo_url.strip() if payload.logo_url else ""
    
    try:
        cursor.execute("""
        INSERT INTO affiliates (
            name, slug, website, affiliate_url, referral_code,
            teaser_affiliate, teaser_company, rating_ai, cookie_days,
            launch_year, logo_url, categories, payment_methods
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            payload.name.strip(),
            slug,
            payload.website.strip(),
            payload.affiliate_url.strip(),
            payload.referral_code.strip() if payload.referral_code else None,
            payload.teaser_affiliate.strip(),
            payload.teaser_company.strip(),
            payload.rating_ai,
            payload.cookie_days,
            payload.launch_year,
            logo_url,
            json.dumps(payload.categories),
            json.dumps(payload.payment_methods)
        ))
        conn.commit()
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=400, detail=f"Database insertion failed: {str(e)}")
        
    conn.close()
    return {"message": "Program added successfully", "slug": slug}

# Redirect Endpoint with Click Counting
@app.get("/go/{slug}")
def redirect_to_affiliate(slug: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM affiliates WHERE slug = ?", (slug,))
    row = cursor.fetchone()
    
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Affiliate program not found")
        
    # Increment click count
    cursor.execute("UPDATE affiliates SET clicks = clicks + 1 WHERE slug = ?", (slug,))
    conn.commit()
    conn.close()
    
    target_url = row["affiliate_url"]
    return RedirectResponse(url=target_url, status_code=302)

# Mount Static Directory
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")
