#requires -Version 5.1
<#
MealUp AI Office — NTFS-only private Windows host directory bootstrap.
Provision or verify directories; NEVER imports Constitution, executes AI, schedules work, or touches a repository.
No public GitHub runner should receive private canonical files.
#>
[CmdletBinding()]
param(
  [ValidateSet('Provision','Verify','VerifyFile')][string]$Action = 'Verify',
  [string]$Root = (Join-Path $env:LOCALAPPDATA 'MealUp\AI-Office-Private'),
  [string]$FilePath = ''
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
  throw 'BLOCKED_WINDOWS_REQUIRED'
}
if ([string]::IsNullOrWhiteSpace($env:LOCALAPPDATA)) {
  throw 'BLOCKED_MISSING_LOCALAPPDATA'
}
$base = [System.IO.Path]::GetFullPath($env:LOCALAPPDATA).TrimEnd('\')
$target = [System.IO.Path]::GetFullPath($Root).TrimEnd('\')
if (-not $target.StartsWith($base + '\',[StringComparison]::OrdinalIgnoreCase)) {
  throw 'BLOCKED_HOST_MUST_BE_IN_USER_LOCALAPPDATA'
}
# Private root can only be placed under the profile's local data; no network or mapped shares.
if ($target.StartsWith('\\')) { throw 'BLOCKED_NETWORK_HOST' }
$relative = $target.Substring($base.Length + 1)
if ($relative -match '(^|\\)(?i:Temp)(\\|$)') { throw 'BLOCKED_TEMPORARY_HOST_ROOT' }
$ownerSid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
$allowed = @(
  $ownerSid.Value,
  'S-1-5-18',         # LocalSystem
  'S-1-5-32-544'      # Local Administrators, non-localized SID
)
$flags = [System.Security.AccessControl.InheritanceFlags]::ContainerInherit -bor
         [System.Security.AccessControl.InheritanceFlags]::ObjectInherit
$aclType = [System.Security.AccessControl.AccessControlType]::Allow
function Assert-NoReparse([string]$p) {
  if (-not [IO.Directory]::Exists($p)) { throw 'BLOCKED_HOST_FOLDER_MISSING' }
  $attr = [IO.File]::GetAttributes($p)
  if (($attr -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
    throw 'BLOCKED_REPARSE_DIRECTORY'
  }
}
# Deny NTFS junction/reparse traversal from LocalAppData down to the chosen root.
$ancestor = $target
while ($ancestor.Length -gt $base.Length) {
  if ([IO.Directory]::Exists($ancestor)) { Assert-NoReparse $ancestor }
  elseif ([IO.File]::Exists($ancestor)) { throw 'BLOCKED_HOST_ANCESTOR_IS_FILE' }
  $ancestor = [IO.Path]::GetDirectoryName($ancestor)
}
function Set-StrictAcl([string]$p) {
  Assert-NoReparse $p
  $acl = Get-Acl -LiteralPath $p
  $acl.SetAccessRuleProtection($true,$false)
  # Remove all explicit rights, including all preexisting broad/deny entries.
  foreach ($existing in @($acl.GetAccessRules($true,$true,[System.Security.Principal.SecurityIdentifier]))) {
    $acl.RemoveAccessRuleSpecific($existing)
  }
  $acl.SetOwner($ownerSid)
  foreach ($sid in $allowed) {
    $identity = New-Object System.Security.Principal.SecurityIdentifier($sid)
    $rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
      $identity,
      [System.Security.AccessControl.FileSystemRights]::FullControl,
      $flags,
      [System.Security.AccessControl.PropagationFlags]::None,
      $aclType
    )
    $acl.AddAccessRule($rule)
  }
  Set-Acl -LiteralPath $p -AclObject $acl
}
function Assert-StrictAcl([string]$p) {
  Assert-NoReparse $p
  $acl = Get-Acl -LiteralPath $p
  if (-not $acl.AreAccessRulesProtected) { throw 'BLOCKED_INHERITED_OR_UNPROTECTED_ACL' }
  if ($acl.GetOwner([System.Security.Principal.SecurityIdentifier]).Value -ne $ownerSid.Value) {
    throw 'BLOCKED_UNEXPECTED_DIRECTORY_OWNER'
  }
  $foundUser = $false
  foreach ($entry in $acl.GetAccessRules($true,$true,[System.Security.Principal.SecurityIdentifier])) {
    if ($entry.IsInherited -or
        $entry.AccessControlType -ne $aclType -or
        $allowed -notcontains $entry.IdentityReference.Value) {
      throw 'BLOCKED_UNTRUSTED_ACL_PRINCIPAL'
    }
    if ($entry.IdentityReference.Value -eq $ownerSid.Value -and
        (($entry.FileSystemRights -band [System.Security.AccessControl.FileSystemRights]::FullControl) -eq
         [System.Security.AccessControl.FileSystemRights]::FullControl)) {
      $foundUser = $true
    }
  }
  if (-not $foundUser) { throw 'BLOCKED_OWNER_MISSING_FULL_CONTROL' }
}
$managed = @($target,(Join-Path $target 'state'),(Join-Path $target 'archive'),(Join-Path $target 'original'))
function Assert-StrictPrivateFile([string]$candidate) {
  if ([string]::IsNullOrWhiteSpace($candidate)) { throw 'BLOCKED_FILE_ARGUMENT_REQUIRED' }
  $absolute = [System.IO.Path]::GetFullPath($candidate)
  $parent = [IO.Path]::GetDirectoryName($absolute)
  # The file must sit directly in one of the protected managed directories.
  $validParents = @((Join-Path $target 'original'), (Join-Path $target 'state'), (Join-Path $target 'archive'))
  if ($validParents -notcontains $parent) { throw 'BLOCKED_FILE_OUTSIDE_PRIVATE_HOST' }
  if (-not [IO.File]::Exists($absolute)) { throw 'BLOCKED_PRIVATE_FILE_MISSING' }
  $attrs = [IO.File]::GetAttributes($absolute)
  if (($attrs -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
    throw 'BLOCKED_PRIVATE_FILE_REPARSE'
  }
  $acl = Get-Acl -LiteralPath $absolute
  if ($acl.GetOwner([System.Security.Principal.SecurityIdentifier]).Value -ne $ownerSid.Value) {
    throw 'BLOCKED_UNEXPECTED_FILE_OWNER'
  }
  $foundUser = $false
  foreach ($entry in $acl.GetAccessRules($true,$true,[System.Security.Principal.SecurityIdentifier])) {
    if ($entry.AccessControlType -ne $aclType -or
        $allowed -notcontains $entry.IdentityReference.Value) {
      throw 'BLOCKED_UNTRUSTED_FILE_ACL'
    }
    if ($entry.IdentityReference.Value -eq $ownerSid.Value -and
        (($entry.FileSystemRights -band [System.Security.AccessControl.FileSystemRights]::FullControl) -eq
         [System.Security.AccessControl.FileSystemRights]::FullControl)) {
      $foundUser = $true
    }
  }
  if (-not $foundUser) { throw 'BLOCKED_FILE_OWNER_MISSING_CONTROL' }
}
if ($Action -eq 'Provision') {
  if (-not [IO.Directory]::Exists($target)) {
    New-Item -ItemType Directory -Path $target -Force | Out-Null
  }
  Assert-NoReparse $target
  # Refuse to silently reconfigure a root that already contains data we do not control.
  $unknown = @(Get-ChildItem -LiteralPath $target -Force | Where-Object { $_.Name -notin @('state','archive','original') })
  if ($unknown.Count -gt 0) { throw 'BLOCKED_PREEXISTING_UNKNOWN_DATA' }
  foreach ($p in $managed) {
    if (-not [IO.Directory]::Exists($p)) { New-Item -ItemType Directory -Path $p -Force | Out-Null }
    Assert-NoReparse $p
    # Never replace a preexisting real-original document or checkpoint.
    if ($p -ne $target -and @(Get-ChildItem -LiteralPath $p -Force).Count -gt 0) {
      throw 'BLOCKED_PREEXISTING_PRIVATE_CONTENT'
    }
  }
  foreach ($p in $managed) { Set-StrictAcl $p }
}
foreach ($p in $managed) { Assert-StrictAcl $p }
if ($Action -eq 'VerifyFile') { Assert-StrictPrivateFile $FilePath }
[pscustomobject]@{
  schema = 'MEALUP_WINDOWS_PRIVATE_HOST_ACL_V1'
  status = 'ACL_VERIFIED'
  action = $Action
  verifiedDirectories = $managed.Count
  fileAclVerified = ($Action -eq 'VerifyFile')
  sourceDocumentImported = $false
  directorInstalled = $false
  backgroundServiceStarted = $false
  externalAIRequests = 0
  additionalCostEUR = 0
} | ConvertTo-Json -Compress
