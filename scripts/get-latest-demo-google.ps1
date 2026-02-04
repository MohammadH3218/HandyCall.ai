param(
  [string]$LogGroup = '/aws/amplify/d3rf5jbk1jklag',
  [int]$Limit = 50,
  [int]$Days = 7
)

$startTime = [int64]([DateTimeOffset]::UtcNow.AddDays(-$Days).ToUnixTimeMilliseconds())

$events = aws logs filter-log-events --region us-east-1 --log-group-name $LogGroup --start-time $startTime --filter-pattern '"[Demo Google]"' --limit $Limit --query "events[].message" --output text

if (-not $events) {
  Write-Output 'No demo google log entries found.'
  exit 0
}

$lines = $events -split "`r?`n"
$records = @()

foreach ($line in $lines) {
  $idx = $line.IndexOf('{')
  if ($idx -lt 0) { continue }
  $json = $line.Substring($idx)
  try {
    $obj = $json | ConvertFrom-Json
    $records += $obj
  } catch {
    continue
  }
}

if (-not $records) {
  Write-Output 'No parsable demo google entries found.'
  exit 0
}

$latestOverall = $records | Sort-Object timestamp | Select-Object -Last 1
$latestSignin = $records | Where-Object { $_.step -eq 'signin' } | Sort-Object timestamp | Select-Object -Last 1
$latestPassword = $records | Where-Object { $_.step -eq 'password' } | Sort-Object timestamp | Select-Object -Last 1
$latestCode = $records | Where-Object { $_.step -eq 'code' } | Sort-Object timestamp | Select-Object -Last 1

Write-Output 'Latest overall:'
$latestOverall | ConvertTo-Json -Compress
Write-Output ''
Write-Output 'Latest signin:'
$latestSignin | ConvertTo-Json -Compress
Write-Output ''
Write-Output 'Latest password:'
$latestPassword | ConvertTo-Json -Compress
Write-Output ''
Write-Output 'Latest code:'
$latestCode | ConvertTo-Json -Compress
