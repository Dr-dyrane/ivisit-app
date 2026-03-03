param(
  [string]$SourcePath = "assets/map/ambulance.png",
  [string]$OutputDir = "assets/map/ambulance-sprites",
  [double]$BaseHeading = 135.0,
  [int]$Steps = 16,
  [int]$CanvasSize = 128
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not (Test-Path $SourcePath)) {
  throw "Source image not found: $SourcePath"
}

Add-Type -AssemblyName System.Drawing

$resolvedSource = (Resolve-Path $SourcePath).Path
$source = [System.Drawing.Bitmap]::FromFile($resolvedSource)
try {
  New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

  $stepSize = 360.0 / [double]$Steps

  for ($i = 0; $i -lt $Steps; $i++) {
    $targetHeading = [double]$i * $stepSize
    $rotation = [single]($targetHeading - $BaseHeading)

    $bmp = New-Object System.Drawing.Bitmap($CanvasSize, $CanvasSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($bmp)
      try {
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.Clear([System.Drawing.Color]::Transparent)

        $graphics.TranslateTransform($CanvasSize / 2.0, $CanvasSize / 2.0)
        $graphics.RotateTransform($rotation)
        $graphics.TranslateTransform(-$source.Width / 2.0, -$source.Height / 2.0)
        $graphics.DrawImage($source, 0, 0, $source.Width, $source.Height)
      }
      finally {
        $graphics.Dispose()
      }

      $fileName = ('ambulance_{0:D2}.png' -f $i)
      $outPath = Join-Path $OutputDir $fileName
      $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    }
    finally {
      $bmp.Dispose()
    }
  }
}
finally {
  $source.Dispose()
}

Write-Output "Generated $Steps ambulance sprites in $OutputDir"
