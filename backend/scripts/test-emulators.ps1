$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$node = (Get-Command node.exe -ErrorAction Stop).Source
$javaHome = 'C:/Program Files/Android/openjdk/jdk-21.0.8'
if (!(Test-Path -LiteralPath (Join-Path $javaHome 'bin/java.exe'))) { throw 'JDK 21 is required at the configured path.' }
$cli = Join-Path $root 'node_modules/firebase-tools/lib/bin/firebase.js'
if (!(Test-Path -LiteralPath $cli)) { throw 'Install backend test dependencies first.' }
$isolatedHome = Join-Path $root '.local/emulator-home'
New-Item -ItemType Directory -Force -Path $isolatedHome | Out-Null
$keys = @('HOME', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'XDG_CONFIG_HOME', 'JAVA_HOME', 'PATH', 'CI', 'FIREBASE_CLI_DISABLE_UPDATE_CHECK', 'FIREBASE_EMULATORS_PATH', 'GOOGLE_CLOUD_PROJECT', 'GCLOUD_PROJECT')
$saved = @{}
foreach ($key in $keys) { $saved[$key] = [Environment]::GetEnvironmentVariable($key, 'Process') }
try {
  # Isolate CLI config/token caches; never load the operator's real login profile.
  foreach ($key in @('HOME', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'XDG_CONFIG_HOME')) { [Environment]::SetEnvironmentVariable($key, $isolatedHome, 'Process') }
  foreach ($key in @('GOOGLE_APPLICATION_CREDENTIALS', 'FIREBASE_TOKEN')) { [Environment]::SetEnvironmentVariable($key, $null, 'Process') }
  $env:GOOGLE_CLOUD_PROJECT = 'demo-metodista-backend'
  $env:GCLOUD_PROJECT = 'demo-metodista-backend'
  $env:JAVA_HOME = $javaHome
  $env:PATH = (Join-Path $javaHome 'bin') + ';' + $env:PATH
  $env:CI = 'true'
  $env:FIREBASE_CLI_DISABLE_UPDATE_CHECK = 'true'
  $env:FIREBASE_EMULATORS_PATH = Join-Path $root '.cache/firebase/emulators'
  Push-Location $root
  try {
    & $node $cli emulators:exec --project demo-metodista-backend --config firebase.json --only auth,firestore,storage 'npm.cmd run test:emulator'
    $result = $LASTEXITCODE
  } finally { Pop-Location }
} finally {
  foreach ($key in $keys) { [Environment]::SetEnvironmentVariable($key, $saved[$key], 'Process') }
}
exit $result
