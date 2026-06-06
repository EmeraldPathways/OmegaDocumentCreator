Build a secure local office web application for Omega Financial Management.

This must be a production-ready internal office tool, not a demo.

The application will run on a Windows-based office server and will be accessed by office staff through a browser on the local network. Remote access may be added later through a secure method such as Cloudflare Tunnel, VPN, or another protected HTTPS setup.

The first module of the application must be called:

Income Protection

The system must allow staff to:

* Log in securely
* Create client records
* Complete client forms
* Save drafts
* Upload client files
* Store client data in a local database
* Reuse client information across multiple documents
* Generate Word DOCX files
* Generate PDF files
* Save generated documents into client folders
* Track all key actions through audit logs

Do not add AI in the first version. The system should be built so that local AI can be added later as a separate stage.

Recommended technology stack:

* Frontend: React with TypeScript
* Backend: Python FastAPI or Node.js with Express
* Database: PostgreSQL
* File storage: Local server file system
* Authentication: Secure username/password login with hashed passwords
* Document generation: DOCX templates with placeholders
* PDF export: Server-side DOCX-to-PDF or HTML-to-PDF generation
* Deployment: Docker Compose or direct Windows service setup

User roles:

1. Admin
2. Staff

Admin permissions:

* Create staff accounts
* Edit staff accounts
* Disable staff accounts
* Delete staff accounts
* View all clients
* Create client records
* Edit client records
* Archive client records
* Manage document templates
* Generate Word and PDF documents
* View audit logs
* Manage backup settings

Staff permissions:

* Log in securely
* Create and edit client records
* Complete Income Protection forms
* Upload client files
* Generate Word and PDF documents
* View client records and files they are permitted to access

Main app navigation:

* Dashboard
* Clients
* Income Protection
* Documents
* Files
* Admin
* Settings

Use a clean professional UI with Omega-style burgundy, grey and white branding.

Use:

* Left sidebar navigation
* Top search bar for clients
* Clear page headings
* Large action buttons
* Autosave on long forms
* Last saved timestamp
* Last edited by user
* Draft and final document status labels

Important buttons:

* Save Draft
* Generate DOCX
* Generate PDF
* Upload File
* View Client Folder
* Archive Client
* Download Document Pack

STAGE 1 — Project setup and local architecture

Create the base project with:

* Frontend app
* Backend API
* PostgreSQL database
* Local file storage folder
* Authentication system
* Admin/staff role-based access control
* Basic dashboard
* Client list page
* Client profile page

The system must run locally on the office server.

Expected local access example:
http://office-server.local

Create environment variables for:

* Database connection
* File storage path
* Session secret
* Backup path
* App URL
* Admin email

Add initial database migrations.

Create seed data for:

* One admin user
* One staff user
* Example client record for testing

STAGE 2 — Authentication, users and permissions

Build secure login.

Requirements:

* Username/email and password login
* Passwords must be hashed
* Session timeout
* Role-based access control
* Admin can create, edit and disable staff users
* Staff cannot access admin-only settings
* Every user action must be linked to the logged-in user

User table fields:

* id
* first_name
* last_name
* email
* password_hash
* role: admin / staff
* status: active / disabled
* created_at
* updated_at
* last_login_at

STAGE 3 — Client record system

Build the client record system.

Every client must have:

* Unique client ID
* Client status
* Created date
* Created by user
* Last edited date
* Last edited by user

Client record fields:

* Client first name
* Client surname
* Full client name, auto-generated
* Title
* Marital status
* Date of birth
* Home address line 1
* Home address line 2
* Town/city
* County
* Eircode
* Mobile number
* Work phone
* Email address
* Partner name
* Partner address
* Number of dependants
* Dependant details as repeatable fields
* General notes

Client status options:

* Draft
* Active
* Waiting for documents
* Ready for review
* Completed
* Archived

STAGE 4 — Income Protection module

Create the first main module called:

Income Protection

Inside the Income Protection module, use tabs:

1. Client Details
2. Fact Find
3. Terms of Business
4. Statement of Suitability
5. Files
6. Generated Documents

The module must reuse shared client information across the Fact Find, Terms of Business and Statement of Suitability documents.

Shared reusable fields:

* Client name
* Address
* Date of birth
* Email
* Phone
* Occupation
* Employment status
* Income
* Dependants
* Mortgage/rent details
* Provider
* Recommended cover
* Premium
* Deferred period
* Cover age
* Advisor name

STAGE 5 — Fact Find workflow

Create a digital Fact Find form based on the Omega Financial Health Check / Income Protection Fact Find structure.

The Fact Find workflow must include these sections:

1. Personal Details
2. Employment Details
3. Income Protection
4. Life Insurance & Serious Illness
5. Additional Relevant Information
6. Client Declarations
7. Data Protection & Marketing Preferences
8. PEP Confirmation
9. Business Source
10. Signatures
11. Request for Information

Fact Find fields:

Personal Details:

* Client name
* Marital status
* Home address
* Partner name
* Partner address
* Work address
* Date of birth
* Home/mobile
* Work phone
* Email
* Dependants
* Dependant date of birth
* Dependant notes

Employment Details:

* Occupation
* Employment status: Employed / Self-employed / Director / Other
* Income/salary
* Employer/company name
* Work address
* Sick pay entitlement
* Sick pay duration
* Employment notes

Income Protection:

* Has income protection: Yes / No
* Income protection with no deferred period: Yes / No
* No deferred period provider
* Current weekly cover
* Current annual cover
* Monthly premium
* Cover to age
* Income protection with deferred period: Yes / No
* Deferred period provider
* Deferred period: 13 weeks / 26 weeks / 52 weeks / Other
* Current weekly cover
* Monthly premium
* Cover to age
* Notes

Life Insurance & Serious Illness:

* Mortgage protection: Yes / No
* Personal insurance: Yes / No
* Keyman insurance: Yes / No
* Partnership insurance: Yes / No
* Self life insurance amount
* Self serious illness amount
* Partner life insurance amount
* Partner serious illness amount
* Notes

Additional Relevant Information:

* Personal circumstances
* Financial situation
* Needs and objectives

Client Declarations:

* Execution-only confirmation
* Terms of Business reviewed and copy received

Data Protection & Marketing Preferences:

* Client does not wish to be contacted
* Client agrees to be contacted for marketing information
* Contact by phone
* Contact by SMS
* Contact by email
* Contact by post

PEP:

* Client confirms they are not a Politically Exposed Person
* Client confirms they are not directly related to a PEP

Business Source:

* How did you hear about Omega?

Signatures:

* Client signature 1
* Client signature 1 date
* Client signature 2
* Client signature 2 date
* Financial advisor signature
* Financial advisor signature date

Request for Information:

* Client name(s), auto-filled from client record
* Address, auto-filled from client record
* Date of birth, auto-filled from client record
* Company/provider name
* Policies
* Request letter date
* Client signature

Fact Find behaviour:

* Allow draft saving even when fields are incomplete
* Autosave long forms
* Show missing required fields before final generation
* Allow staff to generate DOCX
* Allow staff to generate PDF
* Save generated files to the client folder

STAGE 6 — Terms of Business workflow

The Terms of Business document is mostly fixed text. Staff should not need to retype the full document.

Create a Terms of Business workflow that records:

* Terms of Business version
* Default version: January 2026
* Terms issued date
* Issued by staff member
* Client received Terms of Business
* Client reviewed Terms of Business
* Delivery method: In person / Email / Post / Client portal
* Notes

Actions:

* Generate Terms of Business PDF
* Save Terms of Business PDF to the client folder
* Mark Terms of Business as issued
* Record issued date and staff member
* Record client acknowledgement if available

STAGE 7 — Statement of Suitability workflow

Create a Statement of Suitability workflow for Income Protection recommendations.

The Statement of Suitability must generate a client-specific recommendation letter for either:

* Personal Income Protection
* Executive Income Protection

Statement of Suitability fields:

Letter header:

* Letter date
* Client full name
* Client address
* Private & Confidential toggle
* Statement type: Personal Income Protection / Executive Income Protection
* Provider name, e.g. Zurich Life
* Product type

Opening:

* Client first name
* Recent conversations wording
* Income Protection need discussed

Personal Circumstances:

* Occupation
* Employment status
* Employer/company name
* Director status
* Self-employed status
* Marital status
* Dependants
* Custom personal circumstances notes

Financial Situation:

* Estimated annual earnings
* Earnings importance statement
* Mortgage lender
* Monthly mortgage repayment
* Monthly rent
* Short-term loans
* Financial situation notes

Needs & Objectives:

* Need for income protection
* Recommended annual cover
* Event covered: accident or illness
* Desired standard of living wording
* Sick pay duration
* Market research completed
* Provider selected as competitive
* Guaranteed premium option
* Notes from meeting

Recommendation:

* Provider recommended
* Product recommended
* Deferred period
* Recommended annual cover
* Cover to age
* Revenue limit wording
* Gross monthly premium
* Discount applied
* Tax relief percentage
* Net monthly cost
* Paid by: Client / Company
* Affordability discussed
* Client happy to proceed

Recommendation reasons:
Create checklist options:

* Premium is guaranteed for a period as defined by policy conditions
* Premium is competitive in comparison to the market
* Monthly premium receives tax relief
* Monthly premium is paid by the company
* Provider offers rehabilitation nurse support
* Provider has a strong income protection claims record
* Provider is regulated by the Central Bank of Ireland
* Proportionate payment benefit included
* Waiver of premium included
* Custom recommendation reason

Advisor section:

* Advisor name
* Advisor signature image/upload
* Advisor job title if needed

Client declaration:

* Client declaration text
* Client name
* Client signature
* Client signature date

Important information:
Include a fixed important information section that states:

* It is vital to make full disclosure of relevant facts, including medical details or history and previous insurance claims.
* Failure to disclose all information may result in the policy being cancelled, claims not being paid, or difficulty purchasing insurance elsewhere.
* The client confirms that they have read the Customer Information Booklet.
* The client is aware of the benefits under the recommended policy.
* The client is aware of the general exclusions.
* The client understands the meaning of disability as defined in the recommended policy.
* The client is aware of reductions applied where disability payments are received from other sources.
* The client agrees with the recommendation and wishes to effect the transaction recommended.

Statement of Suitability document generation:

* Generate DOCX
* Generate PDF
* Save both files into the client’s folder
* Link generated files to the client record

File naming format:
ClientSurname_ClientFirstName_Statement_of_Suitability_YYYY-MM-DD.docx
ClientSurname_ClientFirstName_Statement_of_Suitability_YYYY-MM-DD.pdf

STAGE 8 — File storage and client folders

Create structured local file storage.

Each client should have a folder structure:

clients/
client-id-client-name/
fact-find/
terms-of-business/
statement-of-suitability/
request-for-information/
uploads/
generated-documents/
signed-documents/

Uploaded file metadata:

* File ID
* Client ID
* Original filename
* Stored filename
* File type
* Folder/category
* Uploaded by
* Upload date
* Status: Pending review / Approved / Rejected
* Notes

File categories:

* Direct Debit
* Proof of Age
* Address ID
* Policy Documents
* Signed Documents
* Generated Documents
* Other

The database should store file references and metadata. Files themselves should be stored in the local client folder structure.

STAGE 9 — Document generation

Use DOCX templates with placeholders.

Example placeholders:

* {{client_full_name}}
* {{client_address}}
* {{date_of_birth}}
* {{occupation}}
* {{annual_income}}
* {{provider_recommended}}
* {{recommended_cover}}
* {{deferred_period}}
* {{cover_to_age}}
* {{gross_monthly_premium}}
* {{net_monthly_cost}}
* {{advisor_name}}

Document generation requirements:

* Generate DOCX files from templates
* Generate PDF files
* Allow staff to download documents
* Allow staff to download a ZIP pack of all generated client documents
* Save generated documents automatically to the correct client folder
* Record generation in audit logs
* Show document generation history on the client page

Generated document types for version 1:

* Fact Find
* Request for Information
* Terms of Business
* Statement of Suitability

Future optional document types:

* Letter of Authority
* Client Review Summary
* Internal Compliance Checklist

STAGE 10 — Database structure

Create database tables for:

users:

* id
* first_name
* last_name
* email
* password_hash
* role
* status
* created_at
* updated_at
* last_login_at

clients:

* id
* client_reference
* first_name
* surname
* full_name
* title
* marital_status
* date_of_birth
* address fields
* contact fields
* partner fields
* status
* created_by
* updated_by
* created_at
* updated_at
* archived_at

dependants:

* id
* client_id
* name
* date_of_birth
* notes

employment_details:

* id
* client_id
* occupation
* employment_status
* employer_name
* income_salary
* work_address
* sick_pay_entitlement
* sick_pay_duration
* notes

protection_details:

* id
* client_id
* has_income_protection
* provider
* deferred_period
* current_weekly_cover
* current_annual_cover
* monthly_premium
* cover_to_age
* policy_owner
* notes

life_serious_illness_details:

* id
* client_id
* mortgage_protection
* personal_insurance
* keyman_insurance
* partnership_insurance
* self_life_cover
* self_serious_illness_cover
* partner_life_cover
* partner_serious_illness_cover
* notes

fact_find:

* id
* client_id
* personal_circumstances
* financial_situation
* needs_objectives
* execution_only_confirmation
* terms_reviewed_received
* marketing_consent
* contact_phone
* contact_sms
* contact_email
* contact_post
* pep_confirmation
* business_source
* recommendation_understood
* status
* created_at
* updated_at

terms_of_business:

* id
* client_id
* version
* issued_date
* issued_by
* received_by_client
* reviewed_by_client
* delivery_method
* notes
* generated_document_id
* created_at
* updated_at

statement_of_suitability:

* id
* client_id
* letter_date
* statement_type
* provider_name
* product_type
* personal_circumstances
* financial_situation
* needs_objectives
* recommendation_summary
* recommended_cover
* deferred_period
* cover_to_age
* gross_monthly_premium
* discount_applied
* tax_relief_percentage
* net_monthly_cost
* paid_by
* affordability_discussed
* client_happy_to_proceed
* recommendation_reasons
* advisor_name
* client_declaration_accepted
* client_signature_date
* status
* created_at
* updated_at

files:

* id
* client_id
* original_filename
* stored_filename
* file_path
* file_type
* category
* uploaded_by
* uploaded_at
* status
* notes

documents:

* id
* client_id
* document_type
* document_name
* docx_file_path
* pdf_file_path
* generated_by
* generated_at
* version
* status

audit_logs:

* id
* user_id
* client_id
* action
* entity_type
* entity_id
* details
* ip_address
* created_at

STAGE 11 — Validation and draft behaviour

Validation rules:

* Required fields should be clearly marked
* Drafts can be saved even if incomplete
* Final document generation should show a missing-field checklist
* Do not block draft saving
* Block final document generation only if essential fields are missing

Essential fields for Fact Find final generation:

* Client name
* Address
* Date of birth
* Occupation
* Income/salary
* Email or phone
* Advisor name

Essential fields for Statement of Suitability final generation:

* Client name
* Address
* Statement type
* Provider recommended
* Product recommended
* Recommended cover
* Deferred period
* Cover to age
* Gross monthly premium
* Advisor name
* Letter date

STAGE 12 — Audit logs

Track:

* User login
* User logout
* Client created
* Client edited
* Client archived
* Fact Find saved
* Terms of Business issued
* Statement of Suitability generated
* File uploaded
* File downloaded
* Document generated
* Document downloaded
* User role changed
* Staff account disabled
* Backup run

Audit logs should be visible to Admin users.

STAGE 13 — Backups

Add a simple backup system.

Requirements:

* Backup PostgreSQL database
* Backup local client files
* Backup generated documents
* Store backup in configured backup folder
* Allow admin to trigger manual backup
* Log backup result
* Show last successful backup date
* Prepare for daily scheduled backups

Backup folders:
backups/
database/
files/
documents/

STAGE 14 — Security

Security requirements:

* Passwords must be hashed
* Use role-based access control
* Add session timeout
* Do not expose uploaded files publicly
* Store files in client-specific folders
* Validate file uploads
* Restrict file types if needed
* Use HTTPS if accessed outside the office
* Do not expose the app directly to the public internet without authentication and HTTPS
* Add audit logs for compliance
* Add backup process
* Keep AI disabled in version 1

Remote access:

* The system should be accessible outside the office only through a secure method such as Cloudflare Tunnel, VPN, or another protected remote access setup.
* Do not open direct public ports to the app unless protected with HTTPS, authentication and access rules.

STAGE 15 — UI/UX requirements

Design style:

* Professional
* Clean
* Office-friendly
* Omega-style burgundy, grey and white
* Simple for non-technical staff

Income Protection page layout:

* Client search at top
* Client status badge
* Tabs:

  * Client Details
  * Fact Find
  * Terms of Business
  * Statement of Suitability
  * Files
  * Generated Documents

Form UX:

* Use grouped sections
* Use collapsible form sections
* Use progress indicators
* Show required fields
* Show missing-field checklist
* Autosave long forms
* Show last saved time
* Show who last edited the record
* Allow Save Draft at any time

Buttons:

* Save Draft
* Generate DOCX
* Generate PDF
* Upload File
* View Client Folder
* Download Document Pack

STAGE 16 — Optional future local AI stage

Do not build this in version 1. Prepare the codebase so it can be added later.

Future local AI features:

* Summarise client notes
* Check missing fields
* Draft Needs & Objectives wording
* Rewrite staff notes professionally
* Explain form fields to staff
* Search uploaded client documents locally

Future local AI setup:

* Local model runner: Ollama
* Models: Llama, Mistral, Qwen or similar
* Document search: local RAG
* Vector database: ChromaDB or PostgreSQL pgvector
* Embeddings: local embedding model

AI safety rules:

* AI must not automatically give financial advice
* AI output must be clearly labelled as draft assistance
* Staff/advisor must approve all AI-generated wording
* Client data should not be sent to external AI services unless a compliance process is approved
* Local-only AI is preferred for financial client data

STAGE 17 — Version 1 MVP deliverables

Build version 1 with:

* Admin/staff login
* Client record system
* Income Protection module
* Fact Find workflow
* Terms of Business workflow
* Statement of Suitability workflow
* Local PostgreSQL database
* Local file uploads
* Client folder structure
* DOCX export
* PDF export
* Generated document history
* Audit logs
* Basic backup process
* Clean professional UI
* No AI in version 1

Final instruction:
Build the project in stages. Complete each stage before moving to the next. Keep the system simple, secure, reliable, and easy for office staff to use.
