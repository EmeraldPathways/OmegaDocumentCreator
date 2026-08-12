# Omega Document Creator - Office PC Installation

Staff should use one address inside and outside the office:

`https://omega-app.omegafinancial.ie`

They first pass Cloudflare Access, then sign in to Omega using their individual Omega account.

## Important: do not install an unapproved branch as the live system

The office PC must run a tested tagged release, not `main` and not a feature branch.

Before this procedure is used with real client information, the approved release must include:

- secure creation of the first administrator
- enforced password changes and session revocation
- reliable client, dependant, quotation, and autosave persistence
- a production frontend build instead of Vite's development server
- safe offline backup restoration
- passing frontend, backend, and PostgreSQL integration checks

Do not install directly from a feature branch.

## 1. Prepare the office PC

Use a dedicated Windows 11 Pro computer with:

- at least 16 GB RAM
- at least a 500 GB SSD
- wired internet connection
- BitLocker enabled
- a UPS battery backup
- BIOS virtualization enabled
- Windows and antivirus updates installed
- sleep and hibernation disabled
- automatic restart after power failure enabled in the BIOS, if supported

Create a dedicated Windows account such as `OmegaServer`.

Only the server administrator should know this account's password. Staff should never work directly on this PC.

### Disable sleep

Open `Settings -> System -> Power & battery` and set sleep to `Never` while plugged in.

Do not enable automatic Windows sign-in unless the final operating model explicitly approves it. If the final runtime depends on an interactive login for Docker Desktop, that limitation must be treated as part of the supported operating model.

## 2. Install WSL2

Open PowerShell as Administrator and run:

```powershell
wsl --install
```

Restart the computer. Sign back into `OmegaServer`, reopen PowerShell as Administrator, and run:

```powershell
wsl --update
wsl --version
```

## 3. Install Git and Docker Desktop

Open PowerShell as Administrator:

```powershell
winget install --id Git.Git -e --source winget
winget install --id Docker.DockerDesktop -e --source winget
```

Restart Windows if requested.

Open Docker Desktop and enable:

- `Use the WSL 2 based engine`
- `Start Docker Desktop when you sign in`

Confirm the installation:

```powershell
git --version
docker version
docker compose version
```

Confirm that Omega meets Docker Desktop's business-use licensing conditions before deployment.

## 4. Create local storage folders

Do not use a OneDrive-synced working folder for live application storage.

Create explicit local folders:

```powershell
New-Item -ItemType Directory -Force "C:\OmegaData\Clients"
New-Item -ItemType Directory -Force "C:\OmegaData\Backups"
New-Item -ItemType Directory -Force "C:\OmegaApps"
```

Use these rules:

- `C:\OmegaData\Clients` is the live client file storage used by the app
- `C:\OmegaData\Backups` is the live backup location used by the app
- the Git repository lives under `C:\OmegaApps`
- PostgreSQL data and Docker volumes must remain outside OneDrive or SharePoint synced folders
- `.env`, Cloudflare credentials, and backup working files must remain outside OneDrive or SharePoint synced folders

If the business later wants SharePoint copies, treat that as a separate upload or archive procedure. Do not let SharePoint or OneDrive pull files back into the live app folders.

The primary staff workflow for adding PDFs and other documents is:

- staff open the client inside Omega
- staff upload the file through Omega's file-upload area
- Omega writes that file into the local live storage on the office PC

Do not rely on staff browsing to `C:\OmegaData\Clients` or dropping files into a synced Windows folder as the normal working process.

The intended storage layout under each client is:

- year-root artifacts such as Fact Find and Fact Find Update at:
  - `C:\OmegaData\Clients\{client}\{year}\files`
  - `C:\OmegaData\Clients\{client}\{year}\documents`
- income protection quote and statement artifacts at:
  - `C:\OmegaData\Clients\{client}\{year}\income-protection\files`
  - `C:\OmegaData\Clients\{client}\{year}\income-protection\documents`
- additional product folders provisioned for:
  - `pensions`
  - `savings`
  - `investments`

Each of those product folders should contain `files` and `documents` subfolders.

## 5. Download the approved GitHub release

The GitHub repository should be private.

Open ordinary PowerShell:

```powershell
Set-Location C:\OmegaApps
git clone https://github.com/EmeraldPathways/OmegaDocumentCreator.git
Set-Location .\OmegaDocumentCreator
git fetch --tags
git tag --list
```

When the approved tag exists, install that exact release:

```powershell
git switch --detach v1.0.0
git rev-parse --short HEAD
git status
```

Record the displayed commit number.

The office PC must never run directly from `main` or from a feature branch.

## 6. Create the production configuration

Copy the example:

```powershell
Copy-Item .env.example .env
notepad .env
```

Use the following structure, replacing every placeholder:

```dotenv
# Database
POSTGRES_DB=omega
POSTGRES_USER=omega
POSTGRES_PASSWORD=REPLACE_WITH_LONG_RANDOM_ALPHANUMERIC_PASSWORD
DATABASE_URL=postgresql+psycopg://omega:REPLACE_WITH_SAME_PASSWORD@postgres:5432/omega

# File storage
CLIENT_FILES_HOST_PATH=C:/OmegaData/Clients
BACKUPS_HOST_PATH=C:/OmegaData/Backups
FILE_STORAGE_PATH=/data/clients
BACKUP_PATH=/data/backups

# Security
SESSION_SECRET=REPLACE_WITH_AT_LEAST_64_RANDOM_CHARACTERS
SESSION_TIMEOUT_MINUTES=30
COOKIE_SECURE=true
COOKIE_SAMESITE=lax

# Public address
APP_URL=https://omega-app.omegafinancial.ie
ENVIRONMENT=production
REMOTE_ACCESS_MODE=remote
CORS_ORIGINS=https://omega-app.omegafinancial.ie
CSRF_TRUSTED_ORIGINS=https://omega-app.omegafinancial.ie
TRUSTED_PROXY_COUNT=1

# First administrator
ADMIN_EMAIL=YOUR_INDIVIDUAL_ADMIN_EMAIL
ADMIN_PASSWORD=REPLACE_WITH_UNIQUE_INITIAL_PASSWORD

# Backup schedule
BACKUP_SCHEDULE_ENABLED=false
BACKUP_SCHEDULE_INTERVAL_MINUTES=1440

# AI
AI_ENABLED=false
LOCAL_AI_ENABLED=false
```

Important:

- use the same database password in `POSTGRES_PASSWORD` and `DATABASE_URL`
- use an alphanumeric database password to avoid URL-encoding problems
- generate and store secrets in a password manager
- remove `TEST_DATABASE_URL` from the production `.env`
- do not email `.env`, upload it to SharePoint, upload it to OneDrive, or commit it to GitHub
- keep AI disabled until the intended provider and production key are configured

## 7. Validate and start Docker

From `C:\OmegaApps\OmegaDocumentCreator`:

```powershell
docker compose -f infra/docker/compose.yaml config
```

Read the output and confirm:

- the client-folder path is correct
- the backup-folder path is correct
- no example passwords remain
- PostgreSQL binds only to `127.0.0.1`
- the API binds only to `127.0.0.1`
- the frontend binds only to `127.0.0.1`

Start the application:

```powershell
docker compose -f infra/docker/compose.yaml up -d --build
docker compose -f infra/docker/compose.yaml ps
```

All services should eventually show running or healthy.

Check the backend:

```powershell
Invoke-WebRequest http://127.0.0.1:8000/ready
```

Inspect errors if needed:

```powershell
docker compose -f infra/docker/compose.yaml logs --tail 100 api
docker compose -f infra/docker/compose.yaml logs --tail 100 frontend
docker compose -f infra/docker/compose.yaml logs --tail 100 postgres
```

Do not continue if the API reports unsafe configuration, migration failures, or no administrator account.

## 8. Prepare the domain carefully

Cloudflare must control the DNS zone used for the application.

Before changing the domain's nameservers, have the current website or DNS administrator verify that Cloudflare contains all existing:

- website records
- MX email records
- SPF records
- DKIM records
- DMARC records
- any third-party verification records

Changing nameservers without copying these records could interrupt the website or email.

## 9. Create Cloudflare Access protection

Create the protection before allowing staff to use the application.

In Cloudflare:

1. Open `Zero Trust`.
2. Create a Free organization.
3. Go to `Access controls -> Applications`.
4. Select `Create application`.
5. Select `Self-hosted and private`.
6. Add `omega-app.omegafinancial.ie`.
7. Create an `Allow` policy.
8. Add the exact approved individual email addresses.
9. Select the email-code login method.
10. Set the Access session duration to seven days.
11. Ensure everyone not matching the policy is denied.

Do not allow:

- everyone
- any unrestricted `@omegafinancial.ie` rule
- shared addresses such as `info@`
- an unrestricted email-code rule

## 10. Install Cloudflare Tunnel

In the Cloudflare dashboard:

1. Go to `Networking -> Tunnels`.
2. Select `Create tunnel`.
3. Name it `omega-production`.
4. Select Windows as the connector environment.
5. Copy the command that contains the private tunnel token.
6. Run it in PowerShell as Administrator on the office server.

It will resemble:

```powershell
cloudflared.exe service install YOUR_PRIVATE_TUNNEL_TOKEN
```

Never put that token in GitHub, SharePoint, OneDrive, email, or documentation.

Configure one public hostname:

| Setting | Value |
| --- | --- |
| Hostname | `omega-app.omegafinancial.ie` |
| Service type | `HTTP` |
| Internal address | `http://localhost:3000` |

Do not create a public API hostname. Do not publish ports `8000` or `5432`.

## 11. First sign-in and staff accounts

Open:

`https://omega-app.omegafinancial.ie`

The correct sequence is:

1. Enter an authorized staff email.
2. Retrieve the Cloudflare email code.
3. Enter the code.
4. Reach the Omega login page.
5. Sign in using the first administrator account.
6. Change the initial administrator password immediately.
7. Create the remaining individual Omega accounts.
8. Assign the correct roles and client-access permissions.
9. Remove any test or default accounts.

If the first administrator does not exist, stop. Do not create a production administrator by manually editing PostgreSQL.

## 12. Complete the go-live test

Before using real client data, verify:

- an unapproved email cannot reach the Omega login screen
- approved emails can receive codes
- each employee has an individual Omega account
- login and logout work
- secure session cookies are used
- a client can be created, saved, reopened, and edited
- dependants remain saved after refreshing
- quotations remain saved after refreshing
- autosave does not duplicate clients
- file upload and download work
- document generation and export work
- staff can add PDFs and other documents through Omega upload
- Fact Find-style artifacts land at the client year root, while Quote and Statement of Suitability artifacts land under `income-protection`
- role restrictions work for each employee
- client files remain locally available without internet
- PostgreSQL and the API are unreachable from another computer
- no router port forwarding exists
- a complete backup can be restored on another computer

If SharePoint upload is part of the approved operating model, also verify:

- uploads reach the intended SharePoint location
- no remote files are pulled back into `C:\OmegaData\Clients`
- the live app continues to work if SharePoint is unavailable

Do not go live if any test fails.

## 13. Restart test

Restart the office PC.

After restarting:

1. Sign in to `OmegaServer`, if the chosen operating model still requires an interactive login.
2. Confirm Docker Desktop has started.
3. Run:

```powershell
Set-Location C:\OmegaApps\OmegaDocumentCreator
docker compose -f infra/docker/compose.yaml ps
Get-Service cloudflared
```

4. Confirm the Cloudflare tunnel is healthy.
5. Open the public application address from another computer.
6. Lock the server PC; do not sign out unless the final operating model explicitly supports recovery after sign-out.

## 14. Backups

The backup must contain a matching set of:

- PostgreSQL database dump
- uploaded client files
- generated documents
- production `.env`
- restoration instructions

Use:

- daily encrypted backup
- separate encrypted offsite copy
- periodic disconnected copy
- quarterly restoration test

SharePoint uploads are not the backup system for PostgreSQL or the application's complete working state.

Restore must follow the supported offline restore procedure.

## 15. SharePoint upload rule

If SharePoint is used, use it only as an upload or archive target for copies of finished or approved files.

Rules:

- do not point the live app storage to a SharePoint sync folder
- do not allow SharePoint or OneDrive to pull remote files into `C:\OmegaData\Clients`
- do not treat SharePoint upload as a substitute for backups
- if the SharePoint process is unavailable, the live app must still function locally
- staff should still add working documents through Omega upload, not through SharePoint sync

The exact upload method can be manual or automated later, but it must remain separate from the app's live filesystem contract.

## 16. Updating the live installation

Only deploy tagged GitHub releases.

Before every update:

1. Stop normal staff use.
2. Create and verify a complete backup.
3. Record the current tag and commit.
4. Fetch the new tag.
5. Switch to it.
6. Rebuild the containers.
7. Test the complete workflow.

Example:

```powershell
Set-Location C:\OmegaApps\OmegaDocumentCreator
git status
git fetch --tags
git switch --detach v1.1.0
docker compose -f infra/docker/compose.yaml up -d --build
docker compose -f infra/docker/compose.yaml ps
```

Never configure the office PC to deploy automatically from `main`.

Development should continue on a separate machine using feature branches and dummy data. GitHub must never contain client records, documents, databases, `.env`, backup archives, or Cloudflare credentials.
