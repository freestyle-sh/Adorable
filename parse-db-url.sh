#!/usr/bin/env bash
set -euo pipefail if [[ -z "${DATABASE_URL:-}" ]]; then
echo "ERROR: DATABASE_URL not set in this shell. Example:"
echo " export DATABASE_URL='postgresql://user:password@host:5432/dbname?sslmode=require'"
exit 1
fi
Trim surrounding quotes if any
DBURL="{DATABASE_URL%\"}" DBURL="{DBURL#"}"
DBURL="{DBURL%\'}" DBURL="{DBURL#'}"
Basic scheme check
proto="
(
p
r
i
n
t
f
′
(printf 
′
 DBURL" | sed -E 's#^([a-zA-Z0-9+.-]+)://.*#\1#')"
if [[ "proto" != "postgres" && "proto" != "postgresql" ]]; then
echo "WARNING: Protocol '$proto' not recognized as Postgres. Proceeding anyway."
fi
Extract username, password, host, port, db using awk/sed
Format: postgresql://user:pass@host:port/db?params
UPART="
(
p
r
i
n
t
f
′
(printf 
′
 DBURL" | sed -E 's#^[a-zA-Z0-9+.-]+://([^@]+)@.#\1#')"
HOSTPORTDB="
(
p
r
i
n
t
f
′
(printf 
′
 DBURL" | sed -E 's#^[a-zA-Z0-9+.-]+://[^@]+@([^/?]+).#\1#')" DBNAME="(printf '%s' "DBURL" | sed -E 's#^[a-zA-Z0-9+.-]+://[^@]+@[^/]+/([^?]+).*#\1#')"
SSL_MODE="
(
p
r
i
n
t
f
′
(printf 
′
 DBURL" | sed -n -E 's#.[?&]sslmode=([^&]+).#\1#p' | tr '[:upper:]' '[:lower:]')"
Username may contain URL-encoded chars
USER_ENC="
(
p
r
i
n
t
f
′
(printf 
′
 UPART" | sed -E 's#:.*$##')"
Decode percent-encoding in username
url_decode() { python3 - <<'PY' "1"; from urllib.parse import unquote; import sys; print(unquote(sys.argv[1])); PY; } PGUSER="(url_decode "
U
S
E
R
E
N
C
"
2
>
/
d
e
v
/
n
u
l
l
∣
∣
p
r
i
n
t
f
′
USER 
E
​
 NC"2>/dev/null∣∣printf 
′
 USER_ENC")"
Host and optional port
PGHOST="
(
p
r
i
n
t
f
′
(printf 
′
 HOSTPORTDB" | sed -E 's#:.*##')" PGPORT="(printf '%s' "HOSTPORTDB" | sed -n -E 's#.*:([0-9]+)#\1#p')"
if [[ -z "${PGPORT}" ]]; then PGPORT="5432"; fi
DB name may be URL-encoded too
PGDATABASE="
(
u
r
l
d
e
c
o
d
e
"
(url 
d
​
 ecode"DBNAME" 2>/dev/null || printf '%s' "$DBNAME")"
Export to current shell session
export PGHOST PGPORT PGDATABASE PGUSER echo "Exported:"
echo " PGHOST=
P
G
H
O
S
T
"
e
c
h
o
"
P
G
P
O
R
T
=
PGHOST"echo"PGPORT=PGPORT"
echo " PGDATABASE=
P
G
D
A
T
A
B
A
S
E
"
e
c
h
o
"
P
G
U
S
E
R
=
PGDATABASE"echo"PGUSER=PGUSER"
echo ""
echo "NOTE:"
echo "- PGPASSWORD is not exported by this script. Set it for the current session:"
echo " export PGPASSWORD='<your_password>'"
echo "- If sslmode is required (sslmode=${SSL_MODE:-unset}), enable SSL in SQLTools or keep using the connectionString."
echo "- To persist variables across sessions, add the export lines to your ~/.bashrc or run this script in each new shell."