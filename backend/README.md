# Local Firebase backend handoff

Scope: only this `backend/` directory. No frontend files, project aliases,
real credentials, login, deployed project, or cloud resources were changed.
Do not deploy or run a real-project bootstrap without explicit owner approval.

## Contract

Two v2 authenticated callables, region `southamerica-east1`, Node.js 22:

Locked Functions dependencies are Firebase Admin 14.5.0 and
firebase-functions 7.4.0. Admin requires Node.js >=22; Functions explicitly
supports Admin 14 in its peer requirements. Current verification uses
Node.js 22.23.3. No transitive uuid override was added.

- `listMembersForAdministration({ pageSize?, pageToken? })`: master only;
  pageSize defaults to 25, integer range 1..50. Returns
  `{ members: [{ uid, name, email, role }], nextPageToken }`. Final cursor is
  `null`; otherwise pass the opaque Admin Auth cursor unchanged. Auth is the
  registered-user directory, including accounts without a profile. Names
  come from `users/{uid}.name`, falling back to Auth displayName, then `''`.
  E-mail comes from Auth, not a self-edited profile. No password hash, claims,
  address, phone, birth date, avatar, provider or token data is returned/logged.
- `setMemberRole({ uid, role: 'member' | 'admin' | 'master' })`: master only;
  returns `{ uid, role }`. Can promote another registered user to master.
  Disabled accounts cannot gain privileges. Self-demotion is allowed only
  while another master remains. No-op edits are audited and serialized too.

Unknown fields and malformed inputs fail with `invalid-argument`. Other
expected codes: `unauthenticated`, `permission-denied`, `not-found`,
`failed-precondition`. Unexpected SDK errors are sanitized to `internal`.
No e-mail/password special case exists; claims never grant authority.

## Canonical authority and invariants

`adminRoles/{uid}` contains `{ role: 'admin' | 'master', updatedAt, updatedBy }`.
Missing means member; demotion to member deletes the document. Invalid
registry values fail closed. Clients can get only their own role document,
including a missing one; no client can list or write this collection.

`adminMetadata/roles` holds `{ masterCount, updatedAt, updatedBy }`.
Every callable role edit rereads the requester and target inside the same
Firestore transaction, reads and writes this singleton, and creates an
`adminAudit/{autoId}` entry `{ actorUid, targetUid, before, after, at, bootstrap }`.
All reads precede writes. Shared singleton contention serializes edits;
retries reread authority. Audit failure rolls back the whole edit.
The singleton must have a positive safe-integer count or edits fail closed.
Listing rechecks requester authority transactionally after Admin Auth
pagination and before returning the minimized page. Authorization is valid
at transaction completion; no service can retract bytes already returned.

The count invariant assumes all privileged role writes use this code.
Direct console/Admin SDK writes, Auth user deletion, project IAM changes,
and disaster recovery are operational concerns, not granted to clients.
Do not delete a master account out of band. Reconcile registry/count under
maintenance with separate approval if legacy privileged data already exists.
Bootstrap refuses a nonempty registry without metadata instead of guessing.

## Rules and source compatibility

Read-only schema inspection covered Register, Profile, Home, Info, Rocket,
eventService and AuthContext. Supplied CBM handoff generation
`2026-10-09T17:47:04Z` had metadata changes; live source was used as authority,
with no reindex and no broad architecture reconstruction.

- `users/{uid}`: owner-only get/create/update/delete, no collection listing,
  even for admin/master. Field allowlist is `name`, `email`, `dateOfBirth`,
  `phone`, `phoneType`, `address`, `city`, `state`, `postalCode`, `avatarUrl`,
  `avatarPath`, `createdAt`. Optional avatarPath must be the exact nonempty
  `avatars/{uid}.jpg` owner path; URLs and other owners are rejected.
  Requires name/email/ISO-string createdAt; timestamp immutable
  on update. Bounds/types match current string-based profile writes. E-mail
  is profile text, not authorization; listing always uses the Auth e-mail.
  Birth-date validation bounds format, not calendar validity. Legacy profiles
  outside this schema need a reviewed migration before Rules publication.
  Profile setDoc/merge can recover a missing document when it supplies a new
  ISO createdAt. An existing legacy document without createdAt still needs
  a privileged, separately approved migration; owners cannot invent/change
  its original creation time.
- Public `events/{id}` and `news/{id}` reads. Canonical admin/master writes
  only, with exact source payload types/allowlists. Events use ISO date/time,
  category `eventos|cultos|escola`, type `special|fixed`, optional imageUrl;
  news use message, ISO publishDate, priority `normal|high`.
- Public get of `config/info` and `config/pix`, canonical admin/master writes.
  Info creation accepts a nonempty subset of the four known text fields;
  updates validate optional known fields and restrict diff affectedKeys to
  those four fields. Existing unknown fields can be preserved by merge,
  never added, changed or removed by clients. No broader config access.
- Role docs own-get only. Metadata/audit server-only. Unknown paths and
  nested collections default deny. No authority in `users.role` or claims.
- Storage `avatars/{uid}.jpg`: owner-only get/create/update/delete; no list;
  nonempty upload at most 5 MiB; JPEG/PNG/WebP MIME types only, no SVG.
  MIME checks are metadata checks, not content scanning.

Frontend owner follow-ups: use `getFunctions(app, 'southamerica-east1')`,
the exact callable names above, and an own-role snapshot for UI state.
Remove any e-mail/weak-password admin bypass independently; backend ignores
it but cannot repair frontend behavior from this bounded directory.
Set image MIME explicitly when native upload blobs do not provide it.
Legacy getDownloadURL values are bearer
URLs, and possession can bypass authenticated SDK read rules. For strict
avatar privacy, stop persisting/sharing download URLs, load bytes with
authenticated SDK reads, and revoke existing download tokens as a separately
approved migration. Parent owns the new-upload/authenticated-read frontend
changes; the backend permits avatarPath and retains legacy avatarUrl only
for compatibility/migration. Never render legacy URLs as a fallback for the
new private-avatar path. Removal of existing download tokens requires explicit
owner approval and was not performed. Rules alone do not revoke old URLs.

## Local verification (no credentials)

The dependency-free suite can run immediately, from this directory:

```powershell
npm.cmd test
```

Observed: 58 passed, 0 failed (37 pure-core, 14 I/O-boundary service tests,
7 bootstrap process guards), initially Node.js 24.18.0 and now independently
rerun successfully under Node.js 22.23.3. The coordination downloaded the
official Node 22 archive and verified its hash. Tests were written first and
observed red before the matching implementation. Deployment runtime is 22.
Service doubles do not prove actual
Firestore locking/Rules compilation, hence the separate emulator suite.

Emulator tests require locally installed dependencies and Emulator Suite
binaries. With explicit local-download authorization, dependencies and public
emulator binaries were installed only under backend; lockfiles are included.
This is NOT a deployment or production cloud access. To reproduce, use Node
22 and JDK 21 (runner uses `C:/Program Files/Android/openjdk/jdk-21.0.8`):

```powershell
npm.cmd ci --ignore-scripts --no-audit --no-fund --cache .cache/npm
npm.cmd --prefix functions ci --ignore-scripts --no-audit --no-fund --cache .cache/npm
npm.cmd run emulators:test
```

The runner uses the first `node.exe` on PATH. For the verified Node 22 build,
prepend its directory in a dedicated shell before running tests:

```powershell
$env:PATH = 'C:/Users/Alladdin/.cache/metodista-node22/node-v22.23.3-win-x64;' + $env:PATH
node.exe --version
```

This uses only the `demo-metodista-backend` project. No login or production
project selection is needed. The PowerShell runner isolates CLI home/config
under `.local/`, clears credential pointers without reading their values,
uses `.cache/` for emulator binaries and forces JDK 21. Ports are Firestore
18080, Auth 19099, Storage 19199, hub 14400, logging 14500 (8080 was unavailable).
Test guards require all three service hosts on `127.0.0.1` and fail BEFORE
loading SDKs if absent. Files run serially with cleared fixtures so services
use the same demo ID without contamination. No real-project fallback exists.

Historical emulator verification: 25/25 passed, 0 failed under Node.js
24.18.0 and JDK 21. This is prior evidence, not a fresh 25-test rerun after
the Admin 14.5.0/Functions 7.4.0 upgrade. Coverage: 21 security/schema
tests, 3 real Auth/Firestore transaction tests, 1 local bootstrap process test.
The concurrent test races two cross-demotions: exactly one succeeds, one is
rejected, one master remains, masterCount is 1, and only the successful edit
adds an audit. Runs use `--test-concurrency=1`, cleared fixtures and one demo
project, with no simultaneous fixture suites. Emulators were stopped after
the run with exit 0. Critic Pasteur independently passed the historical
25 Rules/transaction tests under Node 24. The 58 current Node 22 unit tests
and 4 strengthened transport tests bring the accumulated local evidence
to **87 backend/integration cases** (58 + 25 historical + 4, not duplicate
runtime runs or a fresh 87-case post-upgrade run).
These are separate suites, not a production certification. Initial failures
exposed the two partial-Info Rules cases and
an emulator-only credential-constructor incompatibility, both fixed. The suite
covers profile/role privacy, forged claims/e-mail, self-escalation, revocation,
public writes, field injection, default deny, avatar restrictions, actual
transactional audit/count and concurrent last-master protection. Rules
compiled and Admin Auth/Firestore SDK paths executed locally. Root frontend
package has no test script. The coordination additionally executed
`_apoio-local/gauntlet/test-transport.ps1` and `test-transport.cjs`: strengthened
**4/4 PASS** after the major dependency upgrade, recorded in
`_apoio-local/gauntlet/transport-hardened-node22.log`,
using actual client services and SDKs against local Functions HTTP/Auth,
Firestore and Storage emulators. Both callables loaded and served with Node
22 on port 5001. The first cold SDK discovery exceeded the default 10-second
timeout; the runner now explicitly sets `FUNCTIONS_DISCOVERY_TIMEOUT=30`,
after which both functions loaded and all four tests passed. Coverage:
unauthenticated callable denial, raw SDK callable response privacy (each
member exposes only uid/name/email/role), master listing and member-to-master
promotion, member -> master -> member observations for the same actor on
one continuously active role subscription followed by callable denial,
actual avatar upload/authenticated getBytes/data URI, direct SDK Storage
getBytes denial with `storage/unauthorized` after sign-out (not merely an
avatarService guard), and actual Register/Profile no-photo
payloads through SDK/Rules after test-realm normalization. Register/Profile
now omit the optional avatarPath when no photo exists; this schema scenario
is verified, not pending. The transport runner stopped all
emulators with exit 0. Its local fixture writes are not production Auth writes.
This is local transport verification, NOT visual master-UI testing or remote
homologation. Those remain pending. The 29 new local frontend tests are
separate from the accumulated 87 backend/integration cases. Fresh critic
Hilbert passed the backend scope/58 Node 22 tests and found no authorization
bypass; this is not remote approval. The Functions dependency audit
(`npm.cmd audit --omit=dev --json` from `backend/functions`) now reports
0 vulnerabilities, reduced from 8 moderate. Evidence is in
`_apoio-local/gauntlet/backend-hardening-audit-after.json`; npm ci succeeded
without changing the lockfile, followed by 58/58 Node 22 unit tests.
The root app audit is NOT clean: 0 critical, 22 high, 16 moderate, 0 low,
38 total (`_apoio-local/gauntlet/audit-app-hardening.json`). Functional tests
do not clear dependency vulnerabilities or imply a clean backend tooling audit.
Current Firestore policy is memoryLocalCache on all platforms, web and native.
This does not clean previously persisted browser caches, and logout is not
claimed to purge them. Remote Rules do not protect previously cached local
reads on shared devices. No legacy cache or download-token cleanup was
performed; either requires separate explicit approval.
Fresh all-platform bundle exports passed after the latest source changes;
this is neither an APK nor IPA build/homologation. Production remains
undeployed. Local transport fixture writes are emulator-only.
Current Functions installs emitted upstream glob/node-domexception deprecation
warnings; the declared Node 22/installed Node 24 engine warning belongs to
earlier installation evidence. No production credentials were read or
production calls made.

## Privileged first-master bootstrap

No fixed admin account or password is created. First create a normal account
in the local Auth emulator and take its UID. Start the Auth/Firestore
emulators using the demo project; then, from this directory:

```powershell
$env:FIRESTORE_EMULATOR_HOST = '127.0.0.1:18080'
$env:FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:19099'
node functions/scripts/bootstrap-master.js --uid LOCAL_AUTH_UID --project demo-metodista-backend
```

Both loopback hosts plus demo project are mandatory in local mode. A fake
emulator-only Auth token and insecure local Firestore client are used; ADC is
not initialized/read. Bootstrap
atomically creates the first role, masterCount=1 and audit. Same master UID
is idempotent; after initialization use the callable for additional masters.

For a REAL project, this script is privileged and performs CLOUD WRITES.
It is NOT approved or executed by this handoff. After separate explicit
approval, a trusted operator must configure Application Default Credentials
(ADC) through an approved workstation/workload identity, with least-privilege
Auth user-read and Firestore transaction permissions. Do not download,
commit, print or embed service-account keys. Ensure all emulator variables
are unset in that separate operator session, then use:

```powershell
node functions/scripts/bootstrap-master.js --uid APPROVED_AUTH_UID --project APPROVED_PROJECT_ID --allow-cloud
```

The command refuses cloud access without the explicit flag, validates UID
before SDK import, checks Auth account existence, and refuses legacy partial
registry initialization. The flag is a mechanical guard, not a substitute
for human approval. No real credential values were read during this work.

## Deployment approval boundary (remaining work)

NOT DEPLOYED. First review the locked dependencies, preserve the
target-runtime test evidence, confirm frontend
contract/private-avatar integration, and review legacy data compatibility.
App Check enforcement is not enabled here; consider it after client provider
setup. Configure runtime IAM without password-hash export privileges, review
billing/quota, and review any existing roles/count and project-wide Rules.
Rules deploy replaces the active ruleset, so merge any other authorized
application paths only after review. This config does not manage Hosting.

Only after explicit approval identifying the project, costs, Rules changes,
ADC bootstrap and deployment scope, an authorized operator may run from
`backend/` with an approved Firebase CLI session:

```powershell
npx.cmd firebase-tools deploy --project APPROVED_PROJECT_ID --config firebase.json --only functions:administration,firestore:rules,storage
```

Run the separately approved first-master bootstrap and verify authenticated
callable access, promotion and last-master protection in that project.
No deploy/login/cloud command above was executed here.

## Official references consulted

- [Callable authentication/protocol](https://firebase.google.com/docs/functions/callable)
- [Admin Auth user pagination](https://firebase.google.com/docs/auth/admin/manage-users)
- [Firestore atomic transactions](https://firebase.google.com/docs/firestore/manage-data/transactions)
- [Rules field allowlists and validation](https://firebase.google.com/docs/firestore/security/rules-fields)
- [Storage owner/type/size conditions](https://firebase.google.com/docs/storage/security/rules-conditions)
- [Rules emulator test environment](https://firebase.google.com/docs/rules/unit-tests)
- [Supported Functions runtimes](https://firebase.google.com/docs/functions/manage-functions)
- [Firestore emulator connections and transaction limitations](https://firebase.google.com/docs/emulator-suite/connect_firestore)

## Exact added paths (relative to project root)

```text
backend/.gitignore
backend/README.md
backend/firebase.json
backend/firestore.rules
backend/storage.rules
backend/package.json
backend/package-lock.json
backend/functions/package.json
backend/functions/package-lock.json
backend/functions/src/core.js
backend/functions/src/administration.js
backend/functions/src/firestore-store.js
backend/functions/src/index.js
backend/functions/scripts/bootstrap-master.js
backend/functions/test/core.test.js
backend/functions/test/service.test.js
backend/tests/bootstrap.test.js
backend/tests/emulator-env.js
backend/tests/emulator-rules.test.js
backend/tests/emulator-administration.test.js
backend/scripts/test-emulators.ps1
```
