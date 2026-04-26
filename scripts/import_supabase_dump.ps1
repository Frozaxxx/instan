param(
    [string]$DumpPath = ".\render_dump.sql",
    [string]$ConnectionString,
    [string]$Password
)

$ErrorActionPreference = 'Stop'

if (-not $ConnectionString) {
    throw "ConnectionString is required."
}

if (-not $Password) {
    throw "Password is required."
}

$env:PGPASSWORD = $Password
$psql = "C:\Program Files\PostgreSQL\17\bin\psql.exe"

if (-not (Test-Path $psql)) {
    throw "psql.exe not found at $psql"
}

if (-not (Test-Path $DumpPath)) {
    throw "Dump file not found: $DumpPath"
}

function Invoke-PsqlBlock {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Sql,
        [Parameter(Mandatory = $true)]
        [string]$Label
    )

    Write-Host "Running: $Label"
    $tempFile = Join-Path ([System.IO.Path]::GetTempPath()) ("supabase_block_" + [guid]::NewGuid().ToString("N") + ".sql")
    $utf8 = New-Object System.Text.UTF8Encoding($false)

    try {
        [System.IO.File]::WriteAllText($tempFile, $Sql + "`n", $utf8)
        & $psql $ConnectionString -v ON_ERROR_STOP=1 -f $tempFile | Out-Host
        if ($LASTEXITCODE -ne 0) {
            throw "psql failed while running: $Label"
        }
    }
    finally {
        if (Test-Path $tempFile) {
            Remove-Item -LiteralPath $tempFile -Force
        }
    }
}

$cleanupStatements = @(
    "DROP TABLE IF EXISTS public.comment_likes CASCADE;",
    "DROP TABLE IF EXISTS public.comments CASCADE;",
    "DROP TABLE IF EXISTS public.follows CASCADE;",
    "DROP TABLE IF EXISTS public.likes CASCADE;",
    "DROP TABLE IF EXISTS public.post_likes CASCADE;",
    "DROP TABLE IF EXISTS public.posts CASCADE;",
    "DROP TABLE IF EXISTS public.subscriptions CASCADE;",
    "DROP TABLE IF EXISTS public.users CASCADE;",
    "DROP SEQUENCE IF EXISTS public.comment_likes_id_seq CASCADE;",
    "DROP SEQUENCE IF EXISTS public.comments_id_seq CASCADE;",
    "DROP SEQUENCE IF EXISTS public.follows_id_seq CASCADE;",
    "DROP SEQUENCE IF EXISTS public.likes_id_seq CASCADE;",
    "DROP SEQUENCE IF EXISTS public.post_likes_id_seq CASCADE;",
    "DROP SEQUENCE IF EXISTS public.posts_id_seq CASCADE;",
    "DROP SEQUENCE IF EXISTS public.subscriptions_id_seq CASCADE;",
    "DROP SEQUENCE IF EXISTS public.users_id_seq CASCADE;"
)

foreach ($cleanupStatement in $cleanupStatements) {
    Invoke-PsqlBlock -Sql $cleanupStatement -Label "cleanup $cleanupStatement"
}

$utf8 = New-Object System.Text.UTF8Encoding($false)
$lines = [System.IO.File]::ReadAllLines((Resolve-Path $DumpPath), $utf8)
$blocks = New-Object System.Collections.Generic.List[object]
$statement = New-Object System.Collections.Generic.List[string]
$copyBlock = New-Object System.Collections.Generic.List[string]
$inCopy = $false
$copyLabel = ""
$blockIndex = 0

foreach ($line in $lines) {
    if ($inCopy) {
        $copyBlock.Add($line)
        if ($line -eq '\.') {
            $blocks.Add([pscustomobject]@{
                Type  = 'copy'
                Label = $copyLabel
                Sql   = ($copyBlock -join "`n")
            })
            $copyBlock.Clear()
            $copyLabel = ""
            $inCopy = $false
        }
        continue
    }

    if ($line -match '^COPY public\.([a-z_]+) .* FROM stdin;$') {
        if ($statement.Count -gt 0) {
            $sqlText = ($statement -join "`n").Trim()
            if ($sqlText) {
                $blockIndex++
                $blocks.Add([pscustomobject]@{
                    Type  = 'sql'
                    Label = "statement $blockIndex"
                    Sql   = $sqlText
                })
            }
            $statement.Clear()
        }
        $copyLabel = "copy $($matches[1])"
        $copyBlock.Add($line)
        $inCopy = $true
        continue
    }

    if ($line -match '^\s*$' -or $line -match '^\s*--') {
        continue
    }

    if ($line -match '^(SET |SELECT pg_catalog\.set_config)') {
        continue
    }

    $statement.Add($line)
    if ($line.TrimEnd().EndsWith(';')) {
        $sqlText = ($statement -join "`n").Trim()
        if ($sqlText) {
            $blockIndex++
            $blocks.Add([pscustomobject]@{
                Type  = 'sql'
                Label = "statement $blockIndex"
                Sql   = $sqlText
            })
        }
        $statement.Clear()
    }
}

if ($statement.Count -gt 0) {
    $sqlText = ($statement -join "`n").Trim()
    if ($sqlText) {
        $blockIndex++
        $blocks.Add([pscustomobject]@{
            Type  = 'sql'
            Label = "statement $blockIndex"
            Sql   = $sqlText
        })
    }
}

foreach ($block in $blocks) {
    Invoke-PsqlBlock -Sql $block.Sql -Label $block.Label
}

Write-Host "Import completed."
