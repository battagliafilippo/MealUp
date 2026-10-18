#requires -Version 5.1
# Only ephemeral synthetic test fixtures; never reads the actual Constitution.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$tool = Join-Path $PSScriptRoot 'windows-private-host.ps1'
$testRoot = Join-Path $env:LOCALAPPDATA ('MealUp-Windows-ACL-Test-' + [guid]::NewGuid().ToString('N'))
$root = Join-Path $testRoot 'AI-Office-Private'
$passed = 0
function Pass([string]$name) { $script:passed++; Write-Host ('PASS ' + $name) }
function Blocked([scriptblock]$block,[string]$pattern) {
  try { & $block | Out-Null } catch {
    if ($_.Exception.Message -match $pattern) { return }
    throw ('INCORRECT_DENIAL: ' + $_.Exception.Message)
  }
  throw 'MISSING_EXPECTED_DENIAL'
}
try {
  $result = (& $tool -Action Provision -Root $root | ConvertFrom-Json)
  if ($result.status -ne 'ACL_VERIFIED' -or $result.verifiedDirectories -ne 4 -or
      $result.directorInstalled -ne $false -or $result.sourceDocumentImported -ne $false) {
    throw 'MISSING_POSITIVE_NTFS_PROVISION'
  }
  Pass 'provisions four private directories, no execution or source copy'

  $again = (& $tool -Action Verify -Root $root | ConvertFrom-Json)
  if ($again.status -ne 'ACL_VERIFIED') { throw 'VERIFY_DID_NOT_SUCCEED' }
  Pass 'verifies existing root with explicit scoped ACL'

  $user = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
  foreach ($p in @($root,(Join-Path $root 'state'),(Join-Path $root 'archive'),(Join-Path $root 'original'))) {
    $a=Get-Acl -LiteralPath $p
    if (-not $a.AreAccessRulesProtected -or
        $a.GetOwner([System.Security.Principal.SecurityIdentifier]).Value -ne $user) {
      throw 'ACL_PROTECTION_OR_OWNER_BAD'
    }
  }
  Pass 'checks all four Windows owners and inheritance flags'

  $outside = Join-Path $env:USERPROFILE ('MealUpForbidden' + [guid]::NewGuid().ToString('N'))
  Blocked { & $tool -Action Provision -Root $outside } 'BLOCKED_HOST_MUST_BE_IN_USER_LOCALAPPDATA'
  if (Test-Path $outside) { throw 'UNSAFE_OUTSIDE_DIRECTORY_CREATED' }
  Pass 'cannot create under temp or outside user LocalAppData'
  $temporary = Join-Path (Join-Path $env:LOCALAPPDATA 'Temp') ('MealUpForbidden' + [guid]::NewGuid().ToString('N'))
  Blocked { & $tool -Action Provision -Root $temporary } 'BLOCKED_TEMPORARY_HOST_ROOT'
  if (Test-Path $temporary) { throw 'UNSAFE_TEMPORARY_DIRECTORY_CREATED' }
  Pass 'refuses storage under LocalAppData Temp despite user profile ownership'


  # Add synthetic Everyone SID access; verify must fail until re-provisioning.
  $state=Join-Path $root 'state'
  $a=Get-Acl -LiteralPath $state
  $every = New-Object System.Security.Principal.SecurityIdentifier('S-1-1-0')
  $rule = [System.Security.AccessControl.FileSystemAccessRule]::new(
    $every, [System.Security.AccessControl.FileSystemRights]::Read,
    [System.Security.AccessControl.InheritanceFlags]::ContainerInherit -bor
      [System.Security.AccessControl.InheritanceFlags]::ObjectInherit,
    [System.Security.AccessControl.PropagationFlags]::None,
    [System.Security.AccessControl.AccessControlType]::Allow
  )
  $a.AddAccessRule($rule)
  Set-Acl -LiteralPath $state -AclObject $a
  Blocked { & $tool -Action Verify -Root $root } 'BLOCKED_UNTRUSTED_ACL_PRINCIPAL'
  Pass 'rejects Everyone broad permissions'

  $repair=(& $tool -Action Provision -Root $root | ConvertFrom-Json)
  if ($repair.status -ne 'ACL_VERIFIED') { throw 'ACL_REPAIR_FAILED' }
  Pass 'repairs ACL on empty existing host only'

  $synthetic = Join-Path $root 'original\FAKE_TEST_ONLY.txt'
  Set-Content -LiteralPath $synthetic -Value 'not a Constitution' -NoNewline
  Blocked { & $tool -Action Provision -Root $root } 'BLOCKED_PREEXISTING_PRIVATE_CONTENT'
  $verify = (& $tool -Action Verify -Root $root | ConvertFrom-Json)
  if ($verify.status -ne 'ACL_VERIFIED') { throw 'VERIFICATION_CANNOT_READ_INITIALIZED_HOST' }
  Pass 'never overwrites content and still permits verification'

  $fileAcl = (& $tool -Action VerifyFile -Root $root -FilePath $synthetic | ConvertFrom-Json)
  if (-not $fileAcl.fileAclVerified) { throw 'EXPECTED_FILE_NTFS_VERIFY' }
  Pass 'validates NTFS inherited rights for one private synthetic file'

  $outsideFile = Join-Path $env:USERPROFILE ('fakeOutside-' + [guid]::NewGuid().ToString('N') + '.txt')
  Blocked { & $tool -Action VerifyFile -Root $root -FilePath $outsideFile } 'BLOCKED_FILE_OUTSIDE_PRIVATE_HOST'
  Pass 'rejects file paths outside any of the three managed directories'

  $fa = Get-Acl -LiteralPath $synthetic
  $tooBroad = [System.Security.AccessControl.FileSystemAccessRule]::new(
    [System.Security.Principal.SecurityIdentifier]::new('S-1-1-0'),
    [System.Security.AccessControl.FileSystemRights]::Read,
    [System.Security.AccessControl.AccessControlType]::Allow
  )
  $fa.AddAccessRule($tooBroad)
  Set-Acl -LiteralPath $synthetic -AclObject $fa
  Blocked { & $tool -Action VerifyFile -Root $root -FilePath $synthetic } 'BLOCKED_UNTRUSTED_FILE_ACL'
  Pass 'rejects Anyone/Everyone on private original/checkpoint file'

  if (Test-Path $tool -PathType Leaf) { Pass 'test runner uses script already in lab' }
  if ($passed -ne 12) { throw 'NOT_ALL_WINDOWS_TESTS_EXECUTED' }
  Write-Host ('WINDOWS_NTFS_PRIVATE_HOST_QA_PASS tests=' + $passed)
} finally {
  if (Test-Path $testRoot) { Remove-Item -LiteralPath $testRoot -Recurse -Force }
}
