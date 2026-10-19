$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$outputDirectory = Join-Path $projectRoot 'output'
New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
$zipPath = Join-Path $outputDirectory 'loja-segura-INE5680-final.zip'
if (Test-Path -LiteralPath $zipPath) {
  $filename = 'loja-segura-INE5680-final-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.zip'
  $zipPath = Join-Path $outputDirectory $filename
}
# Lista explícita: nenhum banco, segredo, binário, dependência ou anexo da professora.
$entries = @(
  'src', 'server', 'gateway', 'shared', 'scripts', 'data/README.md', 'README.md',
  'docs/relatorio.md', 'docs/arquitetura.md', 'docs/COMO_FUNCIONA.md', 'docs/validacao.md', 'docs/evidencias-http.json',
  'docs/evidencias-java.json', 'docs/evidencias-verificacao.json',
  'package.json', 'pnpm-lock.yaml', 'tsconfig.json', 'vite.config.ts',
  'index.html', '.gitignore', '.prettierrc.json', '.prettierignore'
)
$zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($entry in $entries) {
    $item = Get-Item -LiteralPath (Join-Path $projectRoot $entry)
    $files = if ($item.PSIsContainer) {
      Get-ChildItem -LiteralPath $item.FullName -File -Recurse
    } else {
      @($item)
    }
    foreach ($file in $files) {
      $absolute = [System.IO.Path]::GetFullPath($file.FullName)
      $insideProject = $absolute.StartsWith(
        $projectRoot + [System.IO.Path]::DirectorySeparatorChar,
        [StringComparison]::OrdinalIgnoreCase
      )
      if (-not $insideProject) { throw 'Arquivo fora do projeto.' }
      $relative = $absolute.Substring($projectRoot.Length + 1).Replace('\', '/')
      $forbiddenDirectory = '(^|/)(node_modules|\.git|\.data|\.tools|dist|cache|caches)(/|$)'
      $forbiddenBinary = '\.(BIN|sqlite(-wal|-shm)?|node|jar|class|log|tmp)$|(^|/)\.env($|\.)'
      if ($relative -match $forbiddenDirectory -or $relative -match $forbiddenBinary) {
        throw "Arquivo indevido no pacote: $relative"
      }
      [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
        $zip,
        $absolute,
        $relative,
        [System.IO.Compression.CompressionLevel]::Optimal
      ) | Out-Null
    }
  }
} finally { $zip.Dispose() }
Write-Output "ZIP criado: $zipPath"
