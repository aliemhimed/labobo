# Parse MCQ_StudyGuide.txt -> _medart-questions.json
$ErrorActionPreference = 'Stop'

$mcqPath = 'C:\Users\AliEm\OneDrive\Documents\eu\year 1\Medicine and Art\MCQ_StudyGuide.txt'
$imgDir  = 'C:\Users\AliEm\OneDrive\Documents\labobo\images\medart'
$outPath = 'C:\Users\AliEm\OneDrive\Documents\labobo\_medart-questions.json'

$txt = Get-Content -Raw -Encoding UTF8 $mcqPath
$lines = $txt -split "(`r`n|`n)" | Where-Object { $_ -ne "`r`n" -and $_ -ne "`n" }

# Build file map
$files = Get-ChildItem -File $imgDir | ForEach-Object { $_.Name }
$fileLower = @{}
foreach ($f in $files) { $fileLower[$f.ToLower()] = $f }

function Resolve-Img($ref) {
    $candidates = @($ref)
    if ($ref -match '^(.+)\.([^.]+)$') {
        $base = $matches[1]
        foreach ($e in 'jpg','jpeg','png') {
            $candidates += "$base.$e"
        }
    }
    foreach ($c in $candidates) {
        $k = $c.ToLower()
        if ($fileLower.ContainsKey($k)) { return $fileLower[$k] }
    }
    return $null
}

$currentSection = 'Mock Test'
$questions = New-Object System.Collections.ArrayList
$missing = New-Object System.Collections.ArrayList
$i = 0

while ($i -lt $lines.Count) {
    $line = $lines[$i]

    # Section header (may wrap to a 2nd line of ALL CAPS title)
    if ($line -match '^SECTION [A-Z]:\s*(.+)$') {
        $currentSection = $matches[1].TrimEnd().TrimEnd(',').Trim()
        $i++
        # Look-ahead: while next line is all-caps and not a separator/question, treat as continuation
        while ($i -lt $lines.Count) {
            $nxt = $lines[$i].Trim()
            if (-not $nxt) { break }
            if ($nxt -match '^={6,}$' -or $nxt -match '^-{6,}$') { break }
            if ($nxt -match '^Q\d+\.') { break }
            if ($nxt -cne $nxt.ToUpper()) { break }
            # treat as continuation only if it's words+commas (no [IMAGE: etc.)
            if ($nxt -match '^[A-Z][A-Z ,&/\-\.]+$') {
                $currentSection = "$currentSection $($nxt.TrimEnd(',').Trim())"
                $i++
            } else { break }
        }
        # Normalize topic to a friendly name
        $currentSection = switch -Regex ($currentSection) {
            'ART AND ANATOMY'                          { 'Art & Anatomy'; break }
            'DIGITAL IMAGING'                          { 'Digital Imaging & Biotech'; break }
            'DOCTORS'                                  { 'Doctors in Art'; break }
            'HISTORY OF MEDICINE'                      { 'History of Medicine'; break }
            'MEDICAL PHOTOGRAPHY'                      { 'Medical Photography'; break }
            'ART AS HEALING|ART THERAPY'               { 'Art as Healing'; break }
            'AIDS PANDEMIC'                            { 'AIDS Pandemic & Art'; break }
            'CROSS-CUTTING|SYNTHESIS'                  { 'Synthesis & Cross-cutting'; break }
            'ADDITIONAL DEPTH'                         { 'Additional Depth'; break }
            default                                    { $currentSection }
        }
        continue
    }
    if ($line -match '^PART \d+:' -and $line.ToUpper() -match 'MOCK') {
        $currentSection = 'Mock Test'; $i++; continue
    }

    # Question
    if ($line -match '^Q(\d+)\.\s*(.*)$') {
        $qNum = [int]$matches[1]
        $qText = $matches[2].Trim()
        $images = New-Object System.Collections.ArrayList
        $options = New-Object System.Collections.ArrayList
        $answer = $null
        $i++

        # Question body continuation
        while ($i -lt $lines.Count) {
            $ln = $lines[$i]
            if ($ln -match '^\[IMAGE:' -or $ln -match '^\s*[A-E]\)' -or $ln -match '^Answer:' -or $ln -match '^-{6,}$' -or $ln -match '^={6,}$') { break }
            $c = $ln.Trim()
            if ($c) { $qText = "$qText $c" }
            $i++
        }

        # Images
        while ($i -lt $lines.Count -and $lines[$i] -match '^\[IMAGE:\s*(.+?)\s*\]\s*$') {
            [void]$images.Add($matches[1])
            $i++
        }

        # Options
        while ($i -lt $lines.Count -and $lines[$i] -match '^\s*([A-E])\)\s*(.*)$') {
            $letter = $matches[1]
            $optText = $matches[2].Trim()
            $i++
            while ($i -lt $lines.Count) {
                $ln = $lines[$i]
                if ($ln -match '^\s*[A-E]\)' -or $ln -match '^Answer:' -or $ln -match '^-{6,}$' -or $ln -match '^={6,}$' -or $ln -match '^Q\d+\.') { break }
                $c = $ln.Trim()
                if ($c) { $optText = "$optText $c" }
                $i++
            }
            [void]$options.Add([pscustomobject]@{ Letter = $letter; Text = $optText })
        }

        # Answer
        while ($i -lt $lines.Count -and $lines[$i] -notmatch '^Answer:') {
            if ($lines[$i] -match '^Q\d+\.') { break }
            $i++
        }
        if ($i -lt $lines.Count -and $lines[$i] -match '^Answer:\s*([A-E])') {
            $answer = $matches[1].ToUpper()
            $i++
        }

        if (-not $qText -or $options.Count -eq 0 -or -not $answer) {
            Write-Warning "Skipping malformed Q$qNum"
            continue
        }
        $letters = @($options | ForEach-Object { $_.Letter })
        $answerIdx = $letters.IndexOf($answer)
        if ($answerIdx -lt 0) {
            Write-Warning "Q$qNum`: answer $answer not in $($letters -join ',')"
            continue
        }

        $resolved = @()
        foreach ($ref in $images) {
            $actual = Resolve-Img $ref
            if (-not $actual) {
                [void]$missing.Add("Q$qNum`: $ref")
                $resolved += $ref
            } else {
                $resolved += $actual
            }
        }

        [void]$questions.Add([pscustomobject]@{
            n = $qNum
            subject = 'Medicine & Art'
            topic = $currentSection
            q = $qText.Trim()
            options = @($options | ForEach-Object { $_.Text })
            answer = $answerIdx
            explanation = ''
            images = $resolved
        })
        continue
    }
    $i++
}

# Use depth 6 to avoid object truncation
$json = ($questions | ConvertTo-Json -Depth 6)
Set-Content -Path $outPath -Value $json -Encoding UTF8

Write-Output "Wrote $($questions.Count) questions -> $outPath"
$grouped = $questions | Group-Object -Property topic | Sort-Object Count -Descending
Write-Output "Topics:"
foreach ($g in $grouped) { Write-Output ("  {0,4}  {1}" -f $g.Count, $g.Name) }
$withImg = ($questions | Where-Object { $_.images.Count -gt 0 }).Count
Write-Output "With images: $withImg"
if ($missing.Count -gt 0) {
    Write-Output ""
    Write-Output "Missing images ($($missing.Count)):"
    $missing | Select-Object -First 30 | ForEach-Object { Write-Output "  $_" }
}
