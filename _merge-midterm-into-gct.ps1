# =============================================================================
# Merge midterm-questions.js (462 q) into gct.html questionData JSON (675 q)
# Maps each private (subject, topic) into the public GCT 1 structure.
# New topics are added under existing subjects where the public bank has gaps.
# =============================================================================
$ErrorActionPreference = 'Stop'

$privPath = 'C:\Users\AliEm\OneDrive\Documents\labobo\midterm-questions.js'
$pubPath  = 'C:\Users\AliEm\OneDrive\Documents\labobo\gct.html'

# ── Topic mapping: "private_subject::private_topic" -> "public_subject::public_topic"
$map = @{
    # Genetics — direct 7-week alignment with public MG weeks
    "Genetics::Week I: Mendel's Laws"             = "Medical Genetics::MG Wk 1: Mendel & Inheritance Basics"
    "Genetics::Week II: Codominance & ABO"        = "Medical Genetics::MG Wk 2: Dominance, Codominance & ABO"
    "Genetics::Week III: Gene Interactions"       = "Medical Genetics::MG Wk 3: Gene Interaction & X-Linkage"
    "Genetics::Week IV: Chromosome Mapping"       = "Medical Genetics::MG Wk 4: Chromosome Mapping & Linkage"
    "Genetics::Week V: Sex Determination"         = "Medical Genetics::MG Wk 5: Sex Determination"
    "Genetics::Week VI: X-Inactivation"           = "Medical Genetics::MG Wk 6: X-Inactivation & Barr Bodies"
    "Genetics::Week VII: Sex Chromosome Syndromes"= "Medical Genetics::MG Wk 7: Sex Chromosome Aneuploidies"

    # ── Biochemistry — fold into existing Wk 1-6, add new Wk 7-12 + Clinical Cases
    "Biochemistry::Body Fluids & Buffers"         = "Biochemistry::Biochem Wk 1: Water, pH & Buffers"
    "Biochemistry::Carbohydrates"                 = "Biochemistry::Biochem Wk 2: Major Biological Compounds"
    "Biochemistry::Macromolecules"                = "Biochemistry::Biochem Wk 2: Major Biological Compounds"
    "Biochemistry::Cell Chemistry & Structure"    = "Biochemistry::Biochem Wk 2: Major Biological Compounds"
    "Biochemistry::Amino Acids"                   = "Biochemistry::Biochem Wk 3: Amino Acids"
    "Biochemistry::Protein Structure"             = "Biochemistry::Biochem Wk 4: Protein Structure & Function"
    "Biochemistry::Lipids"                        = "Biochemistry::Biochem Wk 5: Phospholipids & Sphingolipids"
    "Biochemistry::Phospholipids & Membrane"      = "Biochemistry::Biochem Wk 5: Phospholipids & Sphingolipids"
    "Biochemistry::Lipoproteins & Cholesterol"    = "Biochemistry::Biochem Wk 5: Phospholipids & Sphingolipids"
    "Biochemistry::Lipid Metabolism"              = "Biochemistry::Biochem Wk 5: Phospholipids & Sphingolipids"
    "Biochemistry::Collagen"                      = "Biochemistry::Biochem Wk 6: ECM & Fibrous Proteins"

    # NEW Biochem weeks (private bank gap-fillers)
    "Biochemistry::Hemoglobin"                    = "Biochemistry::Biochem Wk 7: Hemoglobin & Oxygen Transport"
    "Biochemistry::Hemoglobin & O2 Transport"     = "Biochemistry::Biochem Wk 7: Hemoglobin & Oxygen Transport"
    "Biochemistry::Respiratory System"            = "Biochemistry::Biochem Wk 7: Hemoglobin & Oxygen Transport"
    "Biochemistry::Enzymes"                       = "Biochemistry::Biochem Wk 8: Enzymes & Kinetics"
    "Biochemistry::Enzyme Cofactors"              = "Biochemistry::Biochem Wk 8: Enzymes & Kinetics"
    "Biochemistry::Enzyme Inhibition"             = "Biochemistry::Biochem Wk 8: Enzymes & Kinetics"
    "Biochemistry::Enzyme Kinetics"               = "Biochemistry::Biochem Wk 8: Enzymes & Kinetics"
    "Biochemistry::LDH Isoenzymes"                = "Biochemistry::Biochem Wk 8: Enzymes & Kinetics"
    "Biochemistry::Carbohydrate Metabolism"       = "Biochemistry::Biochem Wk 9: Metabolism & Pathways"
    "Biochemistry::Metabolic Pathways"            = "Biochemistry::Biochem Wk 9: Metabolism & Pathways"
    "Biochemistry::Metabolic Regulation"          = "Biochemistry::Biochem Wk 9: Metabolism & Pathways"
    "Biochemistry::Biochemical Pathways"          = "Biochemistry::Biochem Wk 9: Metabolism & Pathways"
    "Biochemistry::Biochemical Cycles"            = "Biochemistry::Biochem Wk 9: Metabolism & Pathways"
    "Biochemistry::Metabolism & Energy"           = "Biochemistry::Biochem Wk 9: Metabolism & Pathways"
    "Biochemistry::Nucleotide Metabolism"         = "Biochemistry::Biochem Wk 9: Metabolism & Pathways"
    "Biochemistry::Photosynthesis"                = "Biochemistry::Biochem Wk 9: Metabolism & Pathways"
    "Biochemistry::Hormones"                      = "Biochemistry::Biochem Wk 10: Hormones & Signaling"
    "Biochemistry::Hormonal Control"              = "Biochemistry::Biochem Wk 10: Hormones & Signaling"
    "Biochemistry::Cell Signaling"                = "Biochemistry::Biochem Wk 10: Hormones & Signaling"
    "Biochemistry::Signal Transduction"           = "Biochemistry::Biochem Wk 10: Hormones & Signaling"
    "Biochemistry::Cell Cycle & Apoptosis"        = "Biochemistry::Biochem Wk 10: Hormones & Signaling"
    "Biochemistry::Vitamins & Coenzymes"          = "Biochemistry::Biochem Wk 11: Vitamins, Blood & Immunology"
    "Biochemistry::Immune System"                 = "Biochemistry::Biochem Wk 11: Vitamins, Blood & Immunology"
    "Biochemistry::Immunology & Vaccination"      = "Biochemistry::Biochem Wk 11: Vitamins, Blood & Immunology"
    "Biochemistry::Immunoglobulins"               = "Biochemistry::Biochem Wk 11: Vitamins, Blood & Immunology"
    "Biochemistry::Blood & Hematology"            = "Biochemistry::Biochem Wk 11: Vitamins, Blood & Immunology"
    "Biochemistry::Hematology"                    = "Biochemistry::Biochem Wk 11: Vitamins, Blood & Immunology"
    "Biochemistry::Hemostasis & Coagulation"      = "Biochemistry::Biochem Wk 11: Vitamins, Blood & Immunology"
    "Biochemistry::Nervous System Biochem"        = "Biochemistry::Biochem Wk 12: Nervous System & Muscle"
    "Biochemistry::Nerve Impulse Transmission"    = "Biochemistry::Biochem Wk 12: Nervous System & Muscle"
    "Biochemistry::Muscle & Movement"             = "Biochemistry::Biochem Wk 12: Nervous System & Muscle"
    "Biochemistry::Lysosomal Storage Disease Cases" = "Biochemistry::Biochem Clinical Cases"
    "Biochemistry::Metabolic Diseases"            = "Biochemistry::Biochem Clinical Cases"
    "Biochemistry::Metabolic Disorders"           = "Biochemistry::Biochem Clinical Cases"
    "Biochemistry::Genetic Disorders"             = "Biochemistry::Biochem Clinical Cases"
    "Biochemistry::Inherited Disorders"           = "Biochemistry::Biochem Clinical Cases"
    "Biochemistry::Cancer & Oncogenes"            = "Biochemistry::Biochem Clinical Cases"

    # Biochem-tagged questions that actually belong in other subjects
    "Biochemistry::Cellular Organelles"           = "Histology::Histo Lec 4: Ribosomes, ER & Golgi"
    "Biochemistry::Cellular Respiration"          = "Molecular Biology::MB Lec 5: Mitochondria & Cellular Respiration"
    "Biochemistry::Cell Function"                 = "Histology::Histo Lec 7: Cytoskeleton"
    "Biochemistry::DNA & Proteins"                = "Molecular Biology::MB Lec 3: Chemical Basis & Macromolecules"
    "Biochemistry::Nucleic Acids & Protein Synthesis" = "Molecular Biology::MB Lec 10: Transcription & Translation"
    "Biochemistry::Genetic Code"                  = "Molecular Biology::MB Lec 10: Transcription & Translation"
    "Biochemistry::Molecular Biology Basics"      = "Molecular Biology::MB Lec 10: Transcription & Translation"
    "Biochemistry::Molecular Genetics"            = "Molecular Biology::MB Lec 10: Transcription & Translation"
    "Biochemistry::Membrane Structure"            = "Molecular Biology::MB Lec 6: Plasma Membrane Structure"
    "Biochemistry::Membrane Transport"            = "Molecular Biology::MB Lec 6: Plasma Membrane Structure"
    "Biochemistry::Transport Mechanisms"          = "Molecular Biology::MB Lec 6: Plasma Membrane Structure"
    "Biochemistry::Genetic Engineering"           = "Molecular Biology::MB Lec 13: Biotechnology & Techniques"
    "Biochemistry::Genetic Techniques"            = "Molecular Biology::MB Lec 13: Biotechnology & Techniques"
    "Biochemistry::Biochemical Techniques"        = "Molecular Biology::MB Lec 13: Biotechnology & Techniques"
    "Biochemistry::Viruses"                       = "Molecular Biology::MB Lec 2: Cell Types, Viruses & Model Organisms"

    # ── Histology — fold into existing Lec 1-7, add new Lec 8-10 + Clinical
    "Histology::Histology Techniques"             = "Histology::Histo Lec 1: Methods of Study"
    "Histology::Cellular Inclusions"              = "Histology::Histo Lec 6: Mitochondria & Inclusions"
    "Histology::Cell Biology & Organelles"        = "Histology::Histo Lec 4: Ribosomes, ER & Golgi"
    "Histology::Cellular Organelles"              = "Histology::Histo Lec 4: Ribosomes, ER & Golgi"
    "Histology::Protein Trafficking"              = "Histology::Histo Lec 4: Ribosomes, ER & Golgi"
    "Histology::Peroxisomes & Metabolism"         = "Histology::Histo Lec 5: Lysosomes & Peroxisomes"
    "Histology::Membrane Structure"               = "Histology::Histo Lec 3: Plasma Membrane & Transport"
    "Histology::Membrane Transport"               = "Histology::Histo Lec 3: Plasma Membrane & Transport"
    "Histology::Cytoskeleton"                     = "Histology::Histo Lec 7: Cytoskeleton"
    "Histology::Cytoskeleton & Junctions"         = "Histology::Histo Lec 7: Cytoskeleton"
    "Histology::Cell Cycle"                       = "Medical Genetics::MG Wk 4: Chromosome Mapping & Linkage"

    # NEW Histology topics (private bank gap-fillers)
    "Histology::Basal Lamina"                     = "Histology::Histo Lec 8: Epithelium & ECM"
    "Histology::Epithelium"                       = "Histology::Histo Lec 8: Epithelium & ECM"
    "Histology::Glands"                           = "Histology::Histo Lec 9: Glands"
    "Histology::Nucleus"                          = "Histology::Histo Lec 10: Nucleus & Chromatin"
    "Histology::Histo Q - Set 1"                  = "Histology::Histo Clinical Cases"
    "Histology::Histo Q - Set 2"                  = "Histology::Histo Clinical Cases"
    "Histology::Histo Q - Set 3"                  = "Histology::Histo Clinical Cases"
    "Histology::Histo Q - Set 4 (Allergy & PWS)"  = "Histology::Histo Clinical Cases"
    "Histology::Clinical Cases"                   = "Histology::Histo Clinical Cases"

    # ── Molecular Biology — fold trafficking into Lec 7, add Lec 8-11 for new content
    "Molecular Biology::Endomembrane System"      = "Molecular Biology::MB Lec 7: Protein Sorting & Endomembrane"
    "Molecular Biology::Endoplasmic Reticulum"    = "Molecular Biology::MB Lec 7: Protein Sorting & Endomembrane"
    "Molecular Biology::RER Functions"            = "Molecular Biology::MB Lec 7: Protein Sorting & Endomembrane"
    "Molecular Biology::SER Functions"            = "Molecular Biology::MB Lec 7: Protein Sorting & Endomembrane"
    "Molecular Biology::Vesicle Trafficking"      = "Molecular Biology::MB Lec 7: Protein Sorting & Endomembrane"
    "Molecular Biology::Secretion"                = "Molecular Biology::MB Lec 7: Protein Sorting & Endomembrane"
    "Molecular Biology::Endocytosis"              = "Molecular Biology::MB Lec 7: Protein Sorting & Endomembrane"
    "Molecular Biology::Protein Trafficking"      = "Molecular Biology::MB Lec 7: Protein Sorting & Endomembrane"
    "Molecular Biology::Lysosomes"                = "Histology::Histo Lec 5: Lysosomes & Peroxisomes"
    "Molecular Biology::Peroxisomes"              = "Histology::Histo Lec 5: Lysosomes & Peroxisomes"

    # NEW MB lectures (private bank gap-fillers — DNA replication, repair, transcription, mRNA)
    "Molecular Biology::DNA Replication"          = "Molecular Biology::MB Lec 8: DNA Replication"
    "Molecular Biology::Telomeres"                = "Molecular Biology::MB Lec 8: DNA Replication"
    "Molecular Biology::DNA Damage & Repair"      = "Molecular Biology::MB Lec 9: DNA Damage & Repair"
    "Molecular Biology::Central Dogma"            = "Molecular Biology::MB Lec 10: Transcription & Translation"
    "Molecular Biology::Transcription"            = "Molecular Biology::MB Lec 10: Transcription & Translation"
    "Molecular Biology::Translation"              = "Molecular Biology::MB Lec 10: Transcription & Translation"
    "Molecular Biology::Gene Expression"          = "Molecular Biology::MB Lec 10: Transcription & Translation"
    "Molecular Biology::Eukaryotic mRNA"          = "Molecular Biology::MB Lec 11: RNA Processing & mRNA"
    "Molecular Biology::RNA Processing"           = "Molecular Biology::MB Lec 11: RNA Processing & mRNA"
}

# ── Read private file as raw text ────────────────────────────────────────────
$priv = [System.IO.File]::ReadAllText($privPath)

# Per-line question pattern: {s:"...",t:"...",q:"...",o:[...],a:N}
$rx = '(?m)^\{s:"([^"]*)",t:"((?:[^"\\]|\\.)*)",q:"((?:[^"\\]|\\.)*)",o:\[((?:"(?:[^"\\]|\\.)*",?)+)\],a:(\d+)\},?$'
$rxMatches = [regex]::Matches($priv, $rx)
Write-Host "Extracted $($rxMatches.Count) question records from private bank"

# ── Convert each record to GCT JSON shape ────────────────────────────────────
$unmapped = @{}
$records = New-Object System.Collections.ArrayList
foreach ($m in $rxMatches) {
    $privS = $m.Groups[1].Value
    # Topic field uses unicode em-dash in some entries; normalise to ASCII so the
    # mapping table keys match.
    $privT = ($m.Groups[2].Value -replace [char]0x2014, '-' -replace [char]0x2013, '-')
    $key = "$privS::$privT"
    if (-not $map.ContainsKey($key)) {
        if (-not $unmapped.ContainsKey($key)) { $unmapped[$key] = 0 }
        $unmapped[$key]++
        $newS = $privS; $newT = $privT
    } else {
        $parts = $map[$key] -split '::', 2
        $newS = $parts[0]; $newT = $parts[1]
    }
    $q = $m.Groups[3].Value
    $optsStr = $m.Groups[4].Value
    $ans = [int]$m.Groups[5].Value

    $optMatches = [regex]::Matches($optsStr, '"((?:[^"\\]|\\.)*)"')
    $optsJsonArr = @()
    foreach ($om in $optMatches) {
        $optsJsonArr += '"' + $om.Groups[1].Value + '"'
    }
    $optsJson = $optsJsonArr -join ', '

    $rec = "    ,`r`n    {`r`n        ""subject"":  ""$newS"",`r`n        ""topic"":  ""$newT"",`r`n        ""q"":  ""$q"",`r`n        ""options"":  [$optsJson],`r`n        ""answer"":  $ans,`r`n        ""explanation"":  """"`r`n    }"
    [void]$records.Add($rec)
}

if ($unmapped.Count -gt 0) {
    Write-Host ""
    Write-Host "Unmapped private topics (left as-is):"
    foreach ($k in ($unmapped.Keys | Sort-Object)) {
        Write-Host "  $k  ($($unmapped[$k]) q)"
    }
}

Write-Host ""
Write-Host "Built $($records.Count) JSON records ready to insert"

# ── Splice into gct.html ─────────────────────────────────────────────────────
$gct = [System.IO.File]::ReadAllText($pubPath)
$startMarker = 'id="questionData" type="application/json">'
$endScript   = '</script>'
$idxStart       = $gct.IndexOf($startMarker) + $startMarker.Length
$idxEndScript   = $gct.IndexOf($endScript, $idxStart)
$jsonBlock      = $gct.Substring($idxStart, $idxEndScript - $idxStart)
$idxLastBracket = $jsonBlock.LastIndexOf(']')
$beforeBracket  = $jsonBlock.Substring(0, $idxLastBracket).TrimEnd()
$afterBracket   = $jsonBlock.Substring($idxLastBracket)

$newJsonBlock = $beforeBracket + "`r`n" + ($records -join "`r`n") + "`r`n" + $afterBracket
$newGct = $gct.Substring(0, $idxStart) + $newJsonBlock + $gct.Substring($idxEndScript)

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($pubPath, $newGct, $utf8NoBom)

Write-Host ""
Write-Host "Wrote gct.html — appended $($records.Count) questions to the bank"
