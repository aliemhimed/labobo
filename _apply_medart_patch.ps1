# Replace clinical question data block in medicine-art.html with Medicine & Art data.
# Uses ASCII-only markers to avoid PS 5.1 encoding issues.
$ErrorActionPreference = 'Stop'

$page = 'C:\Users\AliEm\OneDrive\Documents\labobo\medicine-art.html'
$jsonPath = 'C:\Users\AliEm\OneDrive\Documents\labobo\_medart-questions.compact.json'

$html = [System.IO.File]::ReadAllText($page)
$json = [System.IO.File]::ReadAllText($jsonPath)

# Anchor by ASCII-only substrings inside the block.
$startAnchor = 'Clinical & Professional Skills 1 question data'
$endAnchor   = "image: q.image || ''"

$sIdx = $html.IndexOf($startAnchor)
if ($sIdx -lt 0) { throw "Start anchor not found" }
# Walk back to the start of that comment line: previous newline + 1
$bolIdx = $html.LastIndexOf("`n", $sIdx)
if ($bolIdx -lt 0) { throw "No newline before start anchor" }
$startIdx = $bolIdx + 1

$eIdx = $html.IndexOf($endAnchor, $startIdx)
if ($eIdx -lt 0) { throw "End anchor not found" }
# We want to keep through the closing "  }));" line after this anchor.
$closeIdx = $html.IndexOf('}));', $eIdx)
if ($closeIdx -lt 0) { throw "No }) found after end anchor" }
$endExclusive = $closeIdx + 4

$replacement = @"
/* -- Medicine & Art question data (parsed from MCQ_StudyGuide.txt) -- */
const _MEDART_RAW = $json;

/* ====== DATA ====== */
/* Each question already has a clean topic label, so the topic map is identity. */
const TOPIC_MAP = {};
_MEDART_RAW.forEach(q => { TOPIC_MAP[q.topic] = q.topic; });

const QUESTIONS = _MEDART_RAW.map(q => ({
    subject: 'Medicine & Art',
    topic: q.topic,
    q: q.q,
    options: q.options,
    answer: q.answer,
    explanation: q.explanation || '',
    images: (q.images || []).map(name => 'images/medart/' + name)
  }));
"@

$newHtml = $html.Substring(0, $startIdx) + $replacement + $html.Substring($endExclusive)

[System.IO.File]::WriteAllText($page, $newHtml, (New-Object System.Text.UTF8Encoding $false))
Write-Output "Patched. Bytes before -> after: $($html.Length) -> $($newHtml.Length)"
