# Portal API Nginx route

`deploy/nginx/portal-api-location.conf` is the repository-owned canonical location for Portal APIs. It belongs inside the existing `server` block for `www.woori.today`. It routes only `/portal-api/` to `portal:3003`; retain the existing `/api/` MoneyBook upstream and all locale/service locations.

The production route was externally verified on 2026-10-22: the World Bank comparison endpoint returned valid JSON from the Portal, while `/api/data-compare` continued to return the separate MoneyBook authentication response. This confirms behavior, but does not make the host's Nginx configuration file part of the Git checkout. The host-side active configuration still needs an administrator-owned include or a controlled installation of this exact snippet. The regular Portal deployment must not overwrite the Nginx file.

Before installing or changing the location on a host:

1. Back up the active virtual-host configuration with its owner and mode preserved.
2. Confirm there is exactly one `/portal-api/` location and retain `/api/` unchanged.
3. Run `nginx -t`; reload only after it succeeds.
4. Check `/portal-api/world-bank/compare` and the pre-existing MoneyBook `/api/` route.
5. On failure, restore the backup, run `nginx -t`, and reload the restored configuration.

No production Nginx file was changed as part of this code change.
