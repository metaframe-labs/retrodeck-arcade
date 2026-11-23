Add-Type -AssemblyName System.Drawing

function Resize-Image($srcPath, $destPath, $width, $height) {
    $src = [System.Drawing.Image]::FromFile($srcPath)
    $dest = New-Object System.Drawing.Bitmap($width, $height)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($src, 0, 0, $width, $height)
    
    $dir = [System.IO.Path]::GetDirectoryName($destPath)
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    
    $dest.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $dest.Dispose()
    $src.Dispose()
    Write-Output "Saved: $destPath ($width x $height)"
}

$iconSrc = "C:\Users\Melih\Documents\Projects\retrodeck-8\assets\icon.png"

# Adaptive icon for Expo
Resize-Image $iconSrc "C:\Users\Melih\Documents\Projects\retrodeck-8\assets\adaptive-icon.png" 1024 1024
Resize-Image $iconSrc "C:\Users\Melih\Documents\Projects\retrodeck-8\assets\favicon.png" 48 48

# Android mipmap targets
$resBase = "C:\Users\Melih\Documents\Projects\retrodeck-8\android\app\src\main\res"
$mipmaps = @{
    "mipmap-mdpi" = 48
    "mipmap-hdpi" = 72
    "mipmap-xhdpi" = 96
    "mipmap-xxhdpi" = 144
    "mipmap-xxxhdpi" = 192
}

foreach ($entry in $mipmaps.GetEnumerator()) {
    $folder = Join-Path $resBase $entry.Key
    $size = $entry.Value
    Resize-Image $iconSrc (Join-Path $folder "ic_launcher.png") $size $size
    Resize-Image $iconSrc (Join-Path $folder "ic_launcher_round.png") $size $size
}
