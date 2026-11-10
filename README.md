#MinWarranty

##Team Members
  Evan Champagne    40326134
  Yu Par Aung       40276673

##Tech Stack:

###Front end:
  HTML5, CSS, JavaScript
  
###Back end
  Node.js with Express

###Persistence:
  JSON Files

##Feature List:

**Public**
  - public landing page, usable without account
  - warranty tracking dashboard

**Accounts & Security**
  - Registration and login with hashed passwords
  - Session-based authentication with protected routes
  - Per-user data isolation: users can only access their own records
  - Server-side validation on every for submission
  - CSRF protection, rate-limited login, security headers

**Dashboard**
 - Create, read, update, and delete warranty information
 - Warranty tracking, upcoming warranty end date alerts, email notifiations
 - Live search, live filtering, drag and drop pictures of receipts

##Setup

**prerequisites:** Python 3.11+ and Git

1. Clone the repository
   
   git clone https://github.com/yofionayang/MinWarranty.git
   cd MinWarranty

2. Create and activate a virtual environment

  python -m venv venv
  source venv/bin/activate     #windows: venv/Scripts/activate

3. Install dependencies

   pip install -r requirements.txt

4. Configure environment variables
   
   cp .env.example .env       #windows: copy .env.example .env
   Then set SECRET_KEY in .env. Generate one with:

   python -c "import secrets; print(secrets.token.hex(32))"

##Run

**Development** (debug one, auto-reload)

  flask --app run --debug

**Production** (debug off):

  gunicorn "app:create_app()"

The app runs at http://127.0.0.1:5000 (Flask) or :8000 (Gunicorn).

## Tests

  pytests
  






   
