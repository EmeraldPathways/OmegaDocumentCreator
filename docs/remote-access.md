# Remote Access Runbook

## Scope

This app remains local-first. Remote access should expose only:

- `https://omega.yourdomain.com` for the frontend
- `https://omega-api.yourdomain.com` for the API

PostgreSQL and `storage/` stay private on the host. OneDrive sync remains external to the app.

## Recommended stack

- Cloudflare Tunnel for ingress
- Cloudflare Access for outer identity gate
- Existing in-app auth and permissions for app-level access

Caddy is optional, not required. For this app, Cloudflare Tunnel is the cleaner first rollout because it avoids opening inbound office ports and matches the existing repo setup under `infra/cloudflared/`.

## Allowed remote users

Cloudflare Access should allow:

- `info@omegafinancial.ie`
- `john@omegafinancial.ie`
- `aideen@omegafinancial.ie`
- `andrew@omegafinancial.ie`
- `sophie@omegafinancial.ie`
- `declan@omegafinancial.ie`
- `tadhg@omegafinancial.ie`
- `aimee@omegafinancial.ie`
- `alison@omegafinancial.ie`

Cloudflare Access does not replace the app's own user login and permissions.

## Required environment

Set these values for remote mode:

```dotenv
APP_URL=https://omega.yourdomain.com
ENVIRONMENT=production
REMOTE_ACCESS_MODE=remote
CORS_ORIGINS=https://omega.yourdomain.com,https://omega-api.yourdomain.com
CSRF_TRUSTED_ORIGINS=https://omega.yourdomain.com,https://omega-api.yourdomain.com
COOKIE_SECURE=true
COOKIE_SAMESITE=lax
TRUSTED_PROXY_COUNT=1
```

Keep storage local:

```dotenv
FILE_STORAGE_PATH=storage/clients
BACKUP_PATH=storage/backups
```

## Tunnel setup

1. Install `cloudflared`.
2. Run `cloudflared tunnel login`.
3. Run `./infra/cloudflared/setup-tunnel.sh`.
4. Use:
   - frontend hostname: `omega.yourdomain.com`
   - API hostname: `omega-api.yourdomain.com`
5. Keep the generated credentials JSON out of git.

The config template in [infra/cloudflared/config.yaml.example](/D:/GOOGLE%20DRIVE/EMERALD%20PATHWAYS/WEB%20WORK/AI%20CODING/VS%20CODE/work/Omega%20Document%20Creator/infra/cloudflared/config.yaml.example) already matches this layout.

## Operator startup

Local-only startup stays:

```cmd
run-omega.cmd
```

Remote rollout should use Docker Compose plus Cloudflare Tunnel:

```bash
docker compose -f infra/docker/compose.yaml up -d
docker compose -f infra/docker/compose.yaml logs -f api
docker compose -f infra/docker/compose.yaml logs -f frontend
docker compose -f infra/docker/compose.yaml logs -f cloudflared
```

## Validation

Check these after rollout:

1. `https://omega.yourdomain.com` opens behind Cloudflare Access.
2. `info@omegafinancial.ie` can sign in.
3. `https://omega-api.yourdomain.com/health` returns healthy status.
4. `https://omega-api.yourdomain.com/ready` reports database and storage ready.
5. Session cookies are marked `Secure`.
6. File upload works.
7. Generated documents download.
8. Local storage still writes under `storage/clients/{Client}/{year}/{workflow}/{files|documents}`.

## Recovery and rollback

If remote rollout fails:

1. Stop the tunnel or remove the public DNS routes.
2. Leave the local stack running on `127.0.0.1:3007` and `127.0.0.1:8007`.
3. Keep PostgreSQL and `storage/` untouched.
4. Validate local login, file upload, and document generation before retrying remote exposure.
