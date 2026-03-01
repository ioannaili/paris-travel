# Paris Trip Planner – Agents Specification

Project type:
Private group trip planner for Paris (March 19–23)

Users:

- Eva
- Ioanna
- Marilena
- Katerina
- Charoula

This is a private application.

Expected users: 5

System must remain lightweight and fully free to host.



--------------------------------------------------

CORE PRINCIPLE

The app is a planner.

NOT a scraper.

NOT a crawler.

NOT a discovery engine.

All scraping and discovery happens externally through Codex.

The app only reads from the database.



--------------------------------------------------

TECH STACK

Frontend:

Next.js App Router
TypeScript
Mobile-first UI

Backend:

Supabase
Auth
Postgres

Hosting:

Netlify or Vercel free tier.



--------------------------------------------------

ARCHITECTURE

Layers:

UI Pages

API Routes

Database

External Scrapers



--------------------------------------------------

SCRAPING RULE

Scraping NEVER happens inside the app.

Forbidden inside app:

Reddit scraping
TikTok scraping
Google scraping

All scraping is done manually via Codex.

Codex scripts insert into Supabase.

The app only reads activities.



--------------------------------------------------

AUTHENTICATION

Login required.

Simple login:

Email + Password

Users are pre-created.

No signup flow required.



--------------------------------------------------

DATABASE TABLES

users

activities

votes

programs



--------------------------------------------------

ACTIVITIES TABLE

Stores activity ideas.


Fields:

name

description

area

type

duration

price

google_maps_link

booking_link

latitude

longitude

source_type

created_by_user_id

notes

popularity

created_at

last_updated



Allowed source_type:

manual
reddit
google
ai
tiktok



--------------------------------------------------

VOTES TABLE

One vote per user per activity.


Values:

yes
maybe
no



Vote scoring:

yes = 2

maybe = 1

no = 0



Popularity updates automatically via triggers.



--------------------------------------------------

PROGRAMS TABLE

Stores generated programs.


Fields:

program_type

program_json

created_at



program_type:

general

user_based



Programs are snapshots.

Programs are generated on demand.



--------------------------------------------------

PROGRAM GENERATION

Programs are generated ONLY when user presses:

Create Program


Endpoint:

POST /api/generate-program



Never auto-generate.



--------------------------------------------------

PROGRAM RULES


Trip dates:

March 19–23


Time slots:

morning

lunch

afternoon

dinner

evening



Max:

5 activities per day



Eligibility:

YES votes >= 2



Sorted by:

popularity DESC



Distribution:

Round-robin across days.



--------------------------------------------------

PROGRAM USERS

Each activity shows users attending.


YES:

attending

MAYBE:

optional

NO:

not attending



Users sorted:

YES first

MAYBE second

Alphabetical last.



--------------------------------------------------

GOOGLE MAPS

All activities must include:

google_maps_link


Program screen must support:

Open in Google Maps.



--------------------------------------------------

ACTIVITIES SCREEN

Primary workspace.


Displays:

Activity cards

Votes

Users who voted

Booking links

Google maps links



Actions:

Vote YES/MAYBE/NO

Add Activity

Generate Program



Sorting:

Popularity-based.



--------------------------------------------------

PROGRAM SCREEN

Displays:

Days

Time slots

Activities

Users attending



Program is read-only.

Generated programs only.



Program is stored in DB.

Program screen loads latest program.



--------------------------------------------------

PROFILE SCREEN

Displays:

User name

Email


Settings:

Free Time preference.


Stored locally.



--------------------------------------------------

MOBILE FIRST

UI must be optimized for mobile.

Single column layout.

Large tap targets.

Bottom navigation required.



--------------------------------------------------

UI STYLES

UI must follow Styles folder.


Folder:

/Styles


Contains:

Color palettes

UI layouts

Moodboards



UI agent must read Styles folder before designing.



--------------------------------------------------

IMAGES

Activity images come from:


/Images


Image selection must be deterministic based on activity id.



--------------------------------------------------

API ROUTES

Existing:


GET /api/user

GET /api/activities

GET /api/activities-screen

POST /api/activity

GET /api/activity/[id]

POST /api/vote

GET /api/votes

GET /api/search-activities

GET /api/program

POST /api/program

GET /api/program/[id]

GET /api/program-screen

POST /api/generate-program



Agents must reuse existing routes when possible.



Never duplicate routes.



--------------------------------------------------

DEDUPLICATION

Activities must be deduplicated.


Similar names must be rejected.



Example:

Cafe de Flore

Café de Flore


Should be detected as duplicate.



--------------------------------------------------

PERFORMANCE RULES

App must remain lightweight.


Expected users:

5


Expected activities:

< 200



No heavy queries.



No background jobs.



No cron.



--------------------------------------------------

LOCAL DEVELOPMENT

App must run locally.


Command:


npm run dev


Default port:

3007



Local and production behavior must match.



--------------------------------------------------

DEPLOYMENT RULES


Must work on free hosting.


No paid services allowed.



Allowed:

Supabase free

Netlify free

Vercel free



--------------------------------------------------

FUTURE FEATURES (NOT IMPLEMENTED YET)

Distance optimization

Area clustering

Smart routing

Budget optimization

Discovery ranking

TikTok ranking

Reddit ranking



Agents must NOT implement these unless requested.



--------------------------------------------------

AGENT TYPES


Backend Agent

Implements:

API routes

Database logic

Program generation



UI Agent

Implements:

Pages

Components

Mobile UX



Scraper Agent

Runs externally.

Never inside app.

Inserts activities.



--------------------------------------------------

IMPORTANT RULES

Never rewrite working code.

Never change database schema without migration.

Never break API contracts.

Never auto-generate programs.



--------------------------------------------------

SOURCE OF TRUTH

This AGENTS.md matches the real implementation snapshot.

Changes must remain compatible.