# Installs the E-script CLI as a standalone binary (no Node/npm required).
#
#   irm https://raw.githubusercontent.com/venven1212/E-Script/main/install.ps1 | iex
#
# Override the install location with $env:ESCRIPT_INSTALL.

$ErrorActionPreference = 'Stop'

$Repo = 'venven1212/E-Script'
$InstallDir = if ($env:ESCRIPT_INSTALL) { $env:ESCRIPT_INSTALL } else { "$env:LOCALAPPDATA\escript" }
$BinDir = Join-Path $InstallDir 'bin'

$Arch = if ([Environment]::Is64BitOperatingSystem) {
  if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'arm64' } else { 'x64' }
} else {
  Write-Error "error: unsupported architecture"
}

$Asset = "escript-win32-$Arch.exe"
$Url = "https://github.com/$Repo/releases/latest/download/$Asset"

New-Item -ItemType Directory -Force -Path $BinDir | Out-Null
$Dest = Join-Path $BinDir 'escript.exe'

Write-Host "Downloading escript for win32-$Arch..."
Invoke-WebRequest -Uri $Url -OutFile $Dest

# Add to the user PATH if not already present.
$UserPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if ($UserPath -notlike "*$BinDir*") {
  [Environment]::SetEnvironmentVariable('Path', "$UserPath;$BinDir", 'User')
  $env:Path = "$env:Path;$BinDir"
  Write-Host "Added $BinDir to your user PATH (restart your terminal to pick it up)"
}

Write-Host "Installed escript to $Dest"
Write-Host "Try: escript run yourfile.es"
