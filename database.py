import os
from dotenv import load_dotenv
load_dotenv()
import psycopg2
import psycopg2.extras
import json

DATABASE_URL = os.environ.get("DATABASE_URL")

def get_db_connection():
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL environment variable is not set!")
    url = DATABASE_URL
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return psycopg2.connect(url)

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    # Create the table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS affiliates (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        website TEXT NOT NULL,
        affiliate_url TEXT NOT NULL,
        referral_code TEXT,
        teaser_affiliate TEXT,
        teaser_company TEXT,
        rating_ai REAL,
        cookie_days INTEGER,
        launch_year INTEGER,
        logo_url TEXT,
        categories TEXT,
        payment_methods TEXT,
        clicks INTEGER DEFAULT 0
    )
    """)
    conn.commit()
    
    # Seed data if empty
    cursor.execute("SELECT COUNT(*) FROM affiliates")
    count = cursor.fetchone()[0]
    if count == 0:
        print("Database is empty. Seeding data from scraped_data.json...")
        if os.path.exists("scraped_data.json"):
            with open("scraped_data.json", "r", encoding="utf-8") as f:
                programs = json.load(f)
                
            # Some sample referral codes
            sample_codes = {
                "veed": "VEED30",
                "nordvpn": "NORDVPN50",
                "notion": "NOTION20",
                "figma": "FIGMA15",
                "semrush": "SEMRUSHPRO",
                "namecheap": "NC50OFF",
                "adguard": "ADGUARD_LIFE",
                "invideo-ai": "INVIDEO25",
                "apollo": "APOLLO_PARTNER",
                "descript": "DESCRIPT15"
            }
            
            for prog in programs:
                slug = prog.get("slug")
                name = prog.get("name")
                website = prog.get("website", "")
                
                # Retrieve the original go link as default affiliate url
                affiliate_url = prog.get("go", f"https://affiliate.watch/go/{slug}")
                referral_code = sample_codes.get(slug, None) # Optional code
                
                teaser_affiliate = prog.get("teaser_affiliate", "")
                teaser_company = prog.get("teaser_company", "")
                
                # Rating_ai could be string, convert to float
                try:
                    rating_ai = float(prog.get("rating_ai", 0))
                except:
                    rating_ai = 0.0
                    
                cookie_days = prog.get("cookie_days")
                launch_year = prog.get("launch_year")
                
                # Get logo url
                logo_urls = prog.get("logoUrls", {})
                logo_url = logo_urls.get("thumb_md") or logo_urls.get("thumb_sm") or ""
                
                # Extract simple array of categories & payment methods
                cats = [c.get("name") for c in prog.get("categories", []) if c.get("name")]
                pay_methods = [pm.get("name") for pm in prog.get("all_payment_methods", []) if pm.get("name")]
                
                cursor.execute("""
                INSERT INTO affiliates (
                    name, slug, website, affiliate_url, referral_code,
                    teaser_affiliate, teaser_company, rating_ai, cookie_days,
                    launch_year, logo_url, categories, payment_methods
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    name, slug, website, affiliate_url, referral_code,
                    teaser_affiliate, teaser_company, rating_ai, cookie_days,
                    launch_year, logo_url, json.dumps(cats), json.dumps(pay_methods)
                ))
            conn.commit()
            print("Successfully seeded 20 programs.")
        else:
            print("scraped_data.json not found!")
    else:
        print(f"Database already contains {count} entries.")
        
    cursor.close()
    conn.close()

if __name__ == "__main__":
    init_db()
