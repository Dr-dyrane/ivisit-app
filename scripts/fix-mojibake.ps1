param(
    [string]$Root = ".",
    [switch]$CheckOnly
)

$ErrorActionPreference = "Stop"

function U([int[]]$Codes) {
    $builder = [System.Text.StringBuilder]::new()
    foreach ($code in $Codes) { [void]$builder.Append([char]$code) }
    return $builder.ToString()
}

function U32([int]$Code) {
    return [char]::ConvertFromUtf32($Code)
}

function Pair([int[]]$WrongCodes, [string]$Right) {
    return [pscustomobject]@{ Wrong = U $WrongCodes; Right = $Right }
}

$resolvedRoot = Resolve-Path $Root
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
$textExtensions = @(
    ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs",
    ".json", ".md", ".mdx", ".txt", ".yml", ".yaml",
    ".css", ".scss", ".html", ".sql", ".toml", ".env", ".example"
)
$excludedPathPattern = "[\\/](\.git|node_modules|dist|\.vercel|\.expo|coverage|build|ios|android)[\\/]"

$rootItem = Get-Item $resolvedRoot
if ($rootItem.PSIsContainer) {
    $files = Get-ChildItem $rootItem.FullName -Recurse -File |
        Where-Object {
            $_.FullName -notmatch $excludedPathPattern -and
            ($textExtensions -contains $_.Extension -or $_.Name -match "\.env(\..*)?$|\.gitignore$|\.vercelignore$")
        }
} else {
    $files = @($rootItem) |
        Where-Object {
            $_.FullName -notmatch $excludedPathPattern -and
            ($textExtensions -contains $_.Extension -or $_.Name -match "\.env(\..*)?$|\.gitignore$|\.vercelignore$")
        }
}

$pairs = @(
    Pair @(0x00E2,0x20AC,0x201D) ([string][char]0x2014)
    Pair @(0x00E2,0x20AC,0x201C) ([string][char]0x2013)
    Pair @(0x00E2,0x20AC,0x02DC) "'"
    Pair @(0x00E2,0x20AC,0x2122) "'"
    Pair @(0x00E2,0x20AC,0x0153) '"'
    Pair @(0x00E2,0x20AC,0x009D) '"'
    Pair @(0x00E2,0x20AC,0x00A6) ([string][char]0x2026)
    Pair @(0x00E2,0x20AC,0x00A2) ([string][char]0x2022)
    Pair @(0x00C2,0x00A0) " "
    Pair @(0x00C2,0x00A7) ([string][char]0x00A7)
    Pair @(0x00C2,0x00A9) ([string][char]0x00A9)
    Pair @(0x00C2,0x00AE) ([string][char]0x00AE)
    Pair @(0x00C2,0x00B0) ([string][char]0x00B0)
    Pair @(0x00C2,0x00B1) ([string][char]0x00B1)
    Pair @(0x00C3,0x0097) ([string][char]0x00D7)
    Pair @(0x00C3,0x00B7) ([string][char]0x00F7)
    Pair @(0x00C3,0x00A9) ([string][char]0x00E9)
    Pair @(0x00C3,0x00A8) ([string][char]0x00E8)
    Pair @(0x00C3,0x00A1) ([string][char]0x00E1)
    Pair @(0x00C3,0x00A0) ([string][char]0x00E0)
    Pair @(0x00C3,0x00AD) ([string][char]0x00ED)
    Pair @(0x00C3,0x00B3) ([string][char]0x00F3)
    Pair @(0x00C3,0x00BA) ([string][char]0x00FA)
    Pair @(0x00C3,0x00B1) ([string][char]0x00F1)
    Pair @(0x00C3,0x00BC) ([string][char]0x00FC)
    Pair @(0x00E2,0x2020,0x2019) ([string][char]0x2192)
    Pair @(0x00E2,0x2020,0x0090) ([string][char]0x2190)
    Pair @(0x00E2,0x2020,0x2018) ([string][char]0x2191)
    Pair @(0x00E2,0x2020,0x201C) ([string][char]0x2193)
    Pair @(0x00E2,0x20AC,0x00A1) ([string][char]0x21D2)
    Pair @(0x00E2,0x2030,0x00A5) ([string][char]0x2265)
    Pair @(0x00E2,0x2030,0x00A4) ([string][char]0x2264)
    Pair @(0x00E2,0x2030,0x00A0) ([string][char]0x2260)
    Pair @(0x00E2,0x2030,0x02C6) ([string][char]0x2248)
    Pair @(0x00E2,0x0153,0x201C) ([string][char]0x2713)
    Pair @(0x00E2,0x0153,0x201D) ([string][char]0x2714)
    Pair @(0x00E2,0x0153,0x2026) (U32 0x2705)
    Pair @(0x00E2,0x0153,0x2014) ([string][char]0x2717)
    Pair @(0x00E2,0x0153,0x2013) ([string][char]0x2716)
    Pair @(0x00E2,0x009D,0x0152) (U32 0x274C)
    Pair @(0x00E2,0x0161,0x00A0) (U32 0x26A0)
    Pair @(0x00E2,0x0161,0x00A0,0x00EF,0x00B8,0x008F) ((U32 0x26A0) + [char]0xFE0F)
    Pair @(0x00E2,0x0161,0x00A1) (U32 0x26A1)
    Pair @(0x00F0,0x0178,0x0178,0x00A1) (U32 0x1F7E1)
    Pair @(0x00F0,0x0178,0x201D,0x00B4) (U32 0x1F534)
    Pair @(0x00F0,0x0178,0x0178,0x00A2) (U32 0x1F7E2)
    Pair @(0x00F0,0x0178,0x0161,0x2018) (U32 0x1F691)
    Pair @(0x00F0,0x0178,0x008F,0x00A5) (U32 0x1F3E5)
    Pair @(0x00F0,0x0178,0x201C,0x008D) (U32 0x1F4CD)
    Pair @(0x00F0,0x0178,0x2019,0x00B3) (U32 0x1F4B3)
    Pair @(0x00F0,0x0178,0x00A7,0x00AD) (U32 0x1F9ED)
    Pair @(0x00E2,0x20AC,0x0161) ([string][char]0x2502)
    Pair @(0x00E2,0x20AC,0x0153) ([string][char]0x251C)
    Pair @(0x00E2,0x20AC,0x20AC) ([string][char]0x2500)
    Pair @(0x00E2,0x20AC,0x009D) ([string][char]0x2514)
    Pair @(0x00E2,0x20AC,0x009C) ([string][char]0x251C)
    Pair @(0x00E2,0x20AC,0x0094) ([string][char]0x2514)
    Pair @(0x00E2,0x2013,0x00BC) ([string][char]0x25BC)
)

$changed = 0
$totalReplacements = 0
foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    $original = $content
    $fileReplacements = 0

    foreach ($pair in $pairs) {
        $before = $content
        $content = $content.Replace($pair.Wrong, $pair.Right)
        if ($content -ne $before) {
            $fileReplacements += ([regex]::Matches($before, [regex]::Escape($pair.Wrong))).Count
        }
    }

    if ($content -ne $original) {
        $changed++
        $totalReplacements += $fileReplacements
        if (-not $CheckOnly) {
            [System.IO.File]::WriteAllText($file.FullName, $content, $utf8NoBom)
        }
        Write-Host "$($file.FullName) ($fileReplacements replacements)"
    }
}

Write-Host "Files scanned: $($files.Count)"
Write-Host "Files with fixes: $changed"
Write-Host "Replacements: $totalReplacements"
if ($CheckOnly -and $changed -gt 0) { exit 1 }
