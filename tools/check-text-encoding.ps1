param(
  [string[]]$Paths = @("."),
  [switch]$Quiet
)

$ErrorActionPreference = "Stop"
$OutputEncoding = [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()

$utf8Strict = [System.Text.UTF8Encoding]::new($false, $true)

$textExtensions = @(
  ".md", ".txt", ".json", ".jsonc", ".ts", ".tsx", ".js", ".jsx",
  ".css", ".scss", ".html", ".yml", ".yaml", ".ps1", ".env.example",
  ".sql"
)

$excludedDirs = @(
  ".git", "node_modules", "dist", "build", "coverage", ".next", ".turbo",
  ".vite", ".gradle", "android"
)

function New-TextFromCodePoints {
  param([int[]]$CodePoints)

  $chars = foreach ($codePoint in $CodePoints) {
    [string][char]$codePoint
  }

  return -join $chars
}

$mojibakeSamples = @(
  ([string][char]0xFFFD),
  (New-TextFromCodePoints @(0x0420, 0x045C)),
  (New-TextFromCodePoints @(0x0420, 0x00B0)),
  (New-TextFromCodePoints @(0x0420, 0x00B5)),
  (New-TextFromCodePoints @(0x0420, 0x0451)),
  (New-TextFromCodePoints @(0x0420, 0x0455)),
  (New-TextFromCodePoints @(0x0420, 0x045E)),
  (New-TextFromCodePoints @(0x0420, 0x045F)),
  (New-TextFromCodePoints @(0x0420, 0x0408)),
  (New-TextFromCodePoints @(0x0421, 0x0403)),
  (New-TextFromCodePoints @(0x0421, 0x201A)),
  (New-TextFromCodePoints @(0x0421, 0x040A)),
  (New-TextFromCodePoints @(0x0432, 0x0402)),
  ([string][char]0x00D0),
  ([string][char]0x00D1),
  (New-TextFromCodePoints @(0x0413, 0x2014))
)
$questionMarkRunPattern = [regex]::new("\?{4,}")
$failures = New-Object System.Collections.Generic.List[string]

function Test-ShouldSkipFile {
  param([System.IO.FileInfo]$File)

  foreach ($dir in $excludedDirs) {
    if ($File.FullName -match [regex]::Escape([System.IO.Path]::DirectorySeparatorChar + $dir + [System.IO.Path]::DirectorySeparatorChar)) {
      return $true
    }
  }

  if ($textExtensions -contains $File.Extension.ToLowerInvariant()) {
    return $false
  }

  if ($File.Name -like ".env*") {
    return $false
  }

  if (@(".editorconfig", ".gitattributes", ".gitignore") -contains $File.Name) {
    return $false
  }

  return $true
}

foreach ($path in $Paths) {
  $resolvedPaths = Resolve-Path -LiteralPath $path

  foreach ($resolvedPath in $resolvedPaths) {
    $item = Get-Item -LiteralPath $resolvedPath

    if ($item.PSIsContainer) {
      $files = Get-ChildItem -LiteralPath $item.FullName -Recurse -File
    } else {
      $files = @($item)
    }

    foreach ($file in $files) {
      if (Test-ShouldSkipFile -File $file) {
        continue
      }

      try {
        $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
        $text = $utf8Strict.GetString($bytes)
      } catch {
        $failures.Add("$($file.FullName): invalid UTF-8 bytes")
        continue
      }

      $lineNumber = 1
      foreach ($line in ($text -split "`r?`n")) {
        $foundSample = $null
        foreach ($sample in $mojibakeSamples) {
          if ($line.Contains($sample)) {
            $foundSample = $sample
            break
          }
        }

        if ($null -ne $foundSample) {
          $failures.Add("$($file.FullName):$lineNumber possible mojibake")
          break
        }

        if ($questionMarkRunPattern.IsMatch($line) -and -not $line.Contains("intentional broken-text fixture")) {
          $failures.Add("$($file.FullName):$lineNumber possible replacement question marks")
          break
        }

        $lineNumber++
      }
    }
  }
}

if ($failures.Count -gt 0) {
  foreach ($failure in $failures) {
    Write-Error $failure
  }
  exit 1
}

if (-not $Quiet) {
  Write-Host "Text encoding check passed."
}
