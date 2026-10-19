param(
  [Parameter(Mandatory=$true)][string]$Source380,
  [Parameter(Mandatory=$true)][string]$Source1600,
  [Parameter(Mandatory=$true)][string]$Source570,
  [Parameter(Mandatory=$true)][string]$ShellOutput,
  [Parameter(Mandatory=$true)][string]$NeedleOutput
)

Add-Type -AssemblyName System.Drawing
$images = @(@($Source380,$Source1600,$Source570) | ForEach-Object { [System.Drawing.Bitmap]::FromFile($_) })
try {
  foreach ($image in $images) {
    if ($image.Width -ne 1254 -or $image.Height -ne 1254) { throw 'SOURCE_GEOMETRY_MISMATCH' }
  }
  $crop = [System.Drawing.Rectangle]::new(700,60,510,420)
  $out = New-Object System.Drawing.Bitmap($crop.Width,$crop.Height,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  try {
    function Median3([int]$a,[int]$b,[int]$c) {
      return ($a+$b+$c-[Math]::Min($a,[Math]::Min($b,$c))-[Math]::Max($a,[Math]::Max($b,$c)))
    }
    for ($y=0; $y -lt $crop.Height; $y++) {
      for ($x=0; $x -lt $crop.Width; $x++) {
        $a=$images[0].GetPixel($crop.X+$x,$crop.Y+$y)
        $b=$images[1].GetPixel($crop.X+$x,$crop.Y+$y)
        $c=$images[2].GetPixel($crop.X+$x,$crop.Y+$y)
        $out.SetPixel($x,$y,[System.Drawing.Color]::FromArgb(255,(Median3 $a.R $b.R $c.R),(Median3 $a.G $b.G $c.G),(Median3 $a.B $b.B $c.B)))
      }
    }
    # Remove only neutral dark residuals inside the smooth center disk: the
    # three kcal strings and any one-frame needle edge. The colored pivot and
    # shell are outside the detector by chroma and remain byte-for-byte median.
    $mask = New-Object 'bool[,]' $crop.Width,$crop.Height
    for ($y=145; $y -le 365; $y++) {
      for ($x=175; $x -le 338; $x++) {
        $p=$out.GetPixel($x,$y)
        $max=[Math]::Max($p.R,[Math]::Max($p.G,$p.B));$min=[Math]::Min($p.R,[Math]::Min($p.G,$p.B))
        $luma=(0.2126*$p.R)+(0.7152*$p.G)+(0.0722*$p.B)
        if (($max-$min) -lt 42 -and $luma -lt 155) { $mask[$x,$y]=$true }
      }
    }
    $smooth=New-Object 'System.Collections.Generic.List[System.Drawing.Point]'
    for ($y=146; $y -lt 365; $y++) { for ($x=176; $x -lt 338; $x++) {
      if ($mask[$x,$y]) { $smooth.Add([System.Drawing.Point]::new($x,$y)) }
    }}
    $smoothUpdates=New-Object 'System.Drawing.Color[]' $smooth.Count
    for ($pass=0; $pass -lt 8; $pass++) {
      for ($i=0; $i -lt $smooth.Count; $i++) {
        $point=$smooth[$i];$sumR=0;$sumG=0;$sumB=0;$count=0
        for ($dy=-1;$dy -le 1;$dy++) { for ($dx=-1;$dx -le 1;$dx++) {
          $p=$out.GetPixel($point.X+$dx,$point.Y+$dy);$sumR+=$p.R;$sumG+=$p.G;$sumB+=$p.B;$count++
        }}
        $smoothUpdates[$i]=[System.Drawing.Color]::FromArgb(255,[int]($sumR/$count),[int]($sumG/$count),[int]($sumB/$count))
      }
      for ($i=0;$i -lt $smooth.Count;$i++) {$out.SetPixel($smooth[$i].X,$smooth[$i].Y,$smoothUpdates[$i])}
    }

    # The dial face is intentionally textureless in every approved reference.
    # Rebuild only its inner fill as one continuous soft gradient, preserving
    # the original circular rim and restoring the original orange pivot above.
    $pivotSnapshot=$out.Clone([System.Drawing.Rectangle]::new(210,182,88,88),[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $dialGraphics=[System.Drawing.Graphics]::FromImage($out)
    try {
      $dialGraphics.SmoothingMode=[System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
      $dialRect=[System.Drawing.Rectangle]::new(158,170,190,194)
      # Every source contains a different plate/food overlap below the dial.
      # Rebuild the dial as one continuous physical disk so no seam or source
      # food survives in the reusable component.
      $rimRect=[System.Drawing.Rectangle]::new(143,151,220,230)
      $rimBrush=New-Object System.Drawing.Drawing2D.LinearGradientBrush($rimRect,
        [System.Drawing.Color]::FromArgb(255,255,235,207),
        [System.Drawing.Color]::FromArgb(255,226,169,115),45)
      try { $dialGraphics.FillEllipse($rimBrush,$rimRect) } finally { $rimBrush.Dispose() }
      $faceBrush=New-Object System.Drawing.Drawing2D.LinearGradientBrush($dialRect,
        [System.Drawing.Color]::FromArgb(255,255,239,215),
        [System.Drawing.Color]::FromArgb(255,247,216,177),45)
      try { $dialGraphics.FillEllipse($faceBrush,$dialRect) } finally { $faceBrush.Dispose() }
      $pivotPath=New-Object System.Drawing.Drawing2D.GraphicsPath
      $pivotPath.AddEllipse(216,193,76,76);$dialGraphics.SetClip($pivotPath)
      $dialGraphics.DrawImageUnscaled($pivotSnapshot,210,182);$dialGraphics.ResetClip();$pivotPath.Dispose()
    } finally { $dialGraphics.Dispose();$pivotSnapshot.Dispose() }

    # Transparent cutout around the recovered physical housing. The path follows
    # the common silhouette visible across all three approved Food Portraits;
    # a 4x mask is downsampled for a clean antialiased edge.
    $maskLarge=New-Object System.Drawing.Bitmap(2040,1680,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $maskSmall=New-Object System.Drawing.Bitmap(510,420,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
      $mg=[System.Drawing.Graphics]::FromImage($maskLarge)
      try {
        $mg.SmoothingMode=[System.Drawing.Drawing2D.SmoothingMode]::AntiAlias;$mg.ScaleTransform(4,4)
        $path=New-Object System.Drawing.Drawing2D.GraphicsPath
        $path.StartFigure();$path.AddBezier(24,177,2,139,22,95,69,58)
        $path.AddBezier(69,58,128,12,205,0,286,9)
        $path.AddBezier(286,9,386,15,466,72,498,154)
        $path.AddBezier(498,154,526,229,509,326,462,383)
        $path.AddBezier(462,383,430,421,384,421,350,375)
        $path.AddBezier(350,375,300,390,210,400,163,355)
        $path.AddBezier(163,355,145,335,140,305,142,276)
        $path.AddBezier(142,276,144,233,135,206,119,196)
        $path.AddBezier(119,196,105,187,98,211,73,217)
        $path.AddBezier(73,217,47,224,29,207,24,177);$path.CloseFigure()
        $mg.FillPath([System.Drawing.Brushes]::White,$path);$path.Dispose()
      } finally { $mg.Dispose() }
      $sg=[System.Drawing.Graphics]::FromImage($maskSmall)
      try {
        $sg.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $sg.PixelOffsetMode=[System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $sg.DrawImage($maskLarge,[System.Drawing.Rectangle]::new(0,0,510,420))
      } finally { $sg.Dispose() }
      for($y=0;$y -lt 420;$y++){for($x=0;$x -lt 510;$x++){
        $p=$out.GetPixel($x,$y);$alpha=$maskSmall.GetPixel($x,$y).A
        $out.SetPixel($x,$y,[System.Drawing.Color]::FromArgb($alpha,$p.R,$p.G,$p.B))
      }}
    } finally {$maskLarge.Dispose();$maskSmall.Dispose()}
    $needle = New-Object System.Drawing.Bitmap($crop.Width,$crop.Height,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
      # Source 3 is the 570-kcal portrait whose shaft is vertical. The fixed
      # orange pivot remains in the shell; only the dark shaft is movable.
      for ($y=78; $y -le 230; $y++) { for ($x=220; $x -le 282; $x++) {
        $p=$images[2].GetPixel($crop.X+$x,$crop.Y+$y)
        $max=[Math]::Max($p.R,[Math]::Max($p.G,$p.B));$min=[Math]::Min($p.R,[Math]::Min($p.G,$p.B))
        $luma=(0.2126*$p.R)+(0.7152*$p.G)+(0.0722*$p.B)
        if (($max-$min) -lt 48 -and $luma -lt 150) {
          $alpha=[int][Math]::Min(255,[Math]::Max(0,(155-$luma)*4.2))
          $needle.SetPixel($x,$y,[System.Drawing.Color]::FromArgb($alpha,$p.R,$p.G,$p.B))
        }
      }}
      $out.Save($ShellOutput,[System.Drawing.Imaging.ImageFormat]::Png)
      $needle.Save($NeedleOutput,[System.Drawing.Imaging.ImageFormat]::Png)
    } finally { $needle.Dispose() }
  } finally { $out.Dispose() }
} finally { foreach ($image in $images) { $image.Dispose() } }
