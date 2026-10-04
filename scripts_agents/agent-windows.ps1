# ==========================================================
# AGENTE DE INVENTÁRIO GIASSI - WINDOWS (v2.0)
# Compatível com Windows 10, 11 e Windows Server (PowerShell 5.1+)
# ==========================================================

[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [string]$ServerURL = $(if ($env:GIASSI_SERVER_URL) { $env:GIASSI_SERVER_URL } else { "http://localhost:8000/api/v1/inventory/receive" }),
    
    [Parameter()]
    [switch]$Force
)

$ErrorActionPreference = "SilentlyContinue"

# ----------------------------------------------------------
# CONFIGURAÇÕES E DIRETÓRIOS
# ----------------------------------------------------------
$BaseDir = "C:\ProgramData\GiassiInventory"
$InventoryFile = Join-Path $BaseDir "inventory.json"
$LastInventoryFile = Join-Path $BaseDir "inventory.last.json"

if (-not (Test-Path $BaseDir)) {
    New-Item -ItemType Directory -Path $BaseDir -Force | Out-Null
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " AGENTE DE INVENTÁRIO GIASSI - WINDOWS " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "[*] Destino: $ServerURL"

# ----------------------------------------------------------
# HOSTNAME E IDENTIFICAÇÃO DE LOJA
# ----------------------------------------------------------
$Hostname = $env:COMPUTERNAME
$Loja = ""

if ($Hostname -match '^(LJ|L)([0-9]+)') {
    $Loja = $Matches[2]
}
elseif ($Hostname -match '^(CB|C)([0-9]+)') {
    $Loja = $Matches[2]
}
elseif ($Hostname -match '^AC-' -or $Hostname -eq "MATRIZ") {
    $Loja = "MATRIZ"
}

# ----------------------------------------------------------
# REDE: IP PRINCIPAL, IPs SECUNDÁRIOS E MAC
# ----------------------------------------------------------
$IPs = Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object {
        $_.IPAddress -notlike "127.*" -and
        $_.IPAddress -notlike "169.254.*"
    }

# Prioriza interface física Ethernet / Wi-Fi
$IPPrincipal = $IPs |
    Where-Object {
        $_.InterfaceAlias -match '^(Ethernet|Wi-Fi|WiFi)'
    } |
    Select-Object -First 1

# Fallback: interface não virtual/VPN
if (-not $IPPrincipal) {
    $IPPrincipal = $IPs |
        Where-Object {
            $_.InterfaceAlias -notmatch 'Loopback|Virtual|VPN|Topaz'
        } |
        Select-Object -First 1
}

$IP = if ($IPPrincipal) { $IPPrincipal.IPAddress } else { "" }

$IPSecundarios = $IPs |
    Where-Object {
        $_.IPAddress -ne $IP
    } |
    Select-Object -ExpandProperty IPAddress

$IPSecundario = if ($IPSecundarios) { $IPSecundarios -join ", " } else { "" }

$MAC = Get-NetAdapter |
    Where-Object Status -eq "Up" |
    Select-Object -First 1 -ExpandProperty MacAddress

# ----------------------------------------------------------
# SISTEMA OPERACIONAL / VERSÃO / BUILD / RELEASE (ex: 22H2, 23H2, 24H2)
# ----------------------------------------------------------
$OS = Get-CimInstance Win32_OperatingSystem

$Sistema = "Windows"
$Versao = $OS.Caption
$Build = $OS.BuildNumber
$Status = "OK"

$WindowsRelease = ""
try {
    $RegCurrentVersion = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion' -ErrorAction SilentlyContinue
    if ($RegCurrentVersion) {
        if ($RegCurrentVersion.DisplayVersion) {
            $WindowsRelease = [string]$RegCurrentVersion.DisplayVersion
        } elseif ($RegCurrentVersion.ReleaseId) {
            $WindowsRelease = [string]$RegCurrentVersion.ReleaseId
        }
    }
} catch {
    $WindowsRelease = ""
}

# ----------------------------------------------------------
# PROCESSADOR E MEMÓRIA
# ----------------------------------------------------------
$CPU = Get-CimInstance Win32_Processor |
    Select-Object -First 1 -ExpandProperty Name

$ComputerSystem = Get-CimInstance Win32_ComputerSystem
$RAMGB = [math]::Round($ComputerSystem.TotalPhysicalMemory / 1GB, 1)
$RAMTotal = "$RAMGB GB"

# Detecção do tipo e frequência da memória RAM (DDR3, DDR4, DDR5...)
$RAMTipo = ""
try {
    $Mem = Get-CimInstance Win32_PhysicalMemory -ErrorAction SilentlyContinue
    if ($Mem) {
        $smbiosMap = @{
            20 = 'DDR'
            21 = 'DDR2'
            22 = 'DDR2 FB-DIMM'
            24 = 'DDR3'
            26 = 'DDR4'
            27 = 'LPDDR'
            28 = 'LPDDR2'
            29 = 'LPDDR3'
            30 = 'LPDDR4'
            34 = 'DDR5'
            35 = 'LPDDR5'
        }
        $types = @()
        foreach ($m in $Mem) {
            $code = [int]$m.SMBIOSMemoryType
            if (-not $code -or $code -eq 0) {
                $code = [int]$m.MemoryType
            }
            if ($code -and $smbiosMap.ContainsKey($code)) {
                $typeName = $smbiosMap[$code]
                if ($types -notcontains $typeName) {
                    $types += $typeName
                }
            }
        }
        $maxSpeed = ($Mem | Measure-Object -Property Speed -Maximum).Maximum
        $typeStr = if ($types.Count -gt 0) { $types -join '/' } else { '' }
        if ($typeStr -and $maxSpeed -and $maxSpeed -gt 0) {
            $RAMTipo = "$typeStr ($maxSpeed MHz)"
        } elseif ($typeStr) {
            $RAMTipo = $typeStr
        } elseif ($maxSpeed -and $maxSpeed -gt 0) {
            $RAMTipo = "$maxSpeed MHz"
        }
    }
} catch {
    $RAMTipo = ""
}

# ----------------------------------------------------------
# DISCO PRINCIPAL (C:) E ANÁLISE DE VOLUMES
# ----------------------------------------------------------
$Disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"

$DiscoTotalGB = [math]::Round($Disk.Size / 1GB, 1)
$DiscoLivreGB = [math]::Round($Disk.FreeSpace / 1GB, 1)
$DiscoUsadoGB = [math]::Round(($Disk.Size - $Disk.FreeSpace) / 1GB, 1)
$DiscoPercentual = if ($Disk.Size -gt 0) { [math]::Round((($Disk.Size - $Disk.FreeSpace) / $Disk.Size) * 100, 0) } else { 0 }

$DiscoTotal = "$DiscoTotalGB GB"
$DiscoUsado = "$DiscoUsadoGB GB"
$DiscoLivre = "$DiscoLivreGB GB"
$DiscoPercentualStr = "$DiscoPercentual%"

# Análise de múltiplos discos fixos (DriveType=3)
$AnaliseDisco = @()
$AllDrives = Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3"
foreach ($d in $AllDrives) {
    if ($d.Size -gt 0) {
        $dTot = [math]::Round($d.Size / 1GB, 1)
        $dFree = [math]::Round($d.FreeSpace / 1GB, 1)
        $dUsed = [math]::Round(($d.Size - $d.FreeSpace) / 1GB, 1)
        $dPct = [math]::Round((($d.Size - $d.FreeSpace) / $d.Size) * 100, 0)
        $AnaliseDisco += [ordered]@{
            ponto_montagem = $d.DeviceID
            total          = "$dTot GB"
            usado          = "$dUsed GB"
            livre          = "$dFree GB"
            percentual     = "$dPct%"
        }
    }
}

# ----------------------------------------------------------
# RUSTDESK ID
# ----------------------------------------------------------
$RustDeskID = ""
$RustDeskPaths = @(
    "C:\Program Files\Rustdesk-Giassi-Cliente\Rustdesk-Giassi-Cliente.exe",
    "C:\Program Files\RustDesk\rustdesk.exe",
    "C:\Program Files (x86)\RustDesk\rustdesk.exe"
)

foreach ($exe in $RustDeskPaths) {
    if (Test-Path $exe) {
        $rawId = & $exe --get-id 2>$null | Out-String
        if ($rawId) {
            $RustDeskID = $rawId.Trim().Split("`n")[-1].Trim()
            if ($RustDeskID) { break }
        }
    }
}

# ----------------------------------------------------------
# FABRICANTE / MODELO / SERIAL (Fallback Inteligente para Placa-Mãe)
# ----------------------------------------------------------
$GenericRegex = '^(System Product Name|All Series|To be filled.*|Default string|None|Unknown|Generic|Standard PC.*)$'

$BaseBoard = Get-CimInstance Win32_BaseBoard -ErrorAction SilentlyContinue
$ComputerProduct = Get-CimInstance Win32_ComputerSystemProduct -ErrorAction SilentlyContinue

# Modelo: evita 'System Product Name' e 'All Series', busca modelo real da placa-mãe (ex.: TUF GAMING, H81M, B450M)
$Modelo = ""
if ($ComputerProduct -and $ComputerProduct.Name -and $ComputerProduct.Name.Trim() -notmatch $GenericRegex) {
    $Modelo = $ComputerProduct.Name.Trim()
}
if (-not $Modelo -and $ComputerSystem -and $ComputerSystem.Model -and $ComputerSystem.Model.Trim() -notmatch $GenericRegex) {
    $Modelo = $ComputerSystem.Model.Trim()
}
if (-not $Modelo -and $BaseBoard -and $BaseBoard.Product -and $BaseBoard.Product.Trim() -notmatch $GenericRegex) {
    $Modelo = $BaseBoard.Product.Trim()
}
if (-not $Modelo) {
    $Modelo = if ($BaseBoard -and $BaseBoard.Product) { $BaseBoard.Product.Trim() } elseif ($ComputerProduct) { $ComputerProduct.Name.Trim() } else { "" }
    if ($Modelo -match $GenericRegex) { $Modelo = "" }
}

# Fabricante:
$Fabricante = ""
if ($ComputerProduct -and $ComputerProduct.Vendor -and $ComputerProduct.Vendor.Trim() -notmatch '^(System manufacturer|To be filled.*|Default string|None)$') {
    $Fabricante = $ComputerProduct.Vendor.Trim()
}
if (-not $Fabricante -and $BaseBoard -and $BaseBoard.Manufacturer -and $BaseBoard.Manufacturer.Trim() -notmatch '^(System manufacturer|To be filled.*|Default string|None)$') {
    $Fabricante = $BaseBoard.Manufacturer.Trim()
}
if (-not $Fabricante -and $ComputerSystem -and $ComputerSystem.Manufacturer -and $ComputerSystem.Manufacturer.Trim() -notmatch '^(System manufacturer|To be filled.*|Default string|None)$') {
    $Fabricante = $ComputerSystem.Manufacturer.Trim()
}

# Serial:
$Serial = ""
if ($ComputerProduct -and $ComputerProduct.IdentifyingNumber -and $ComputerProduct.IdentifyingNumber.Trim() -notmatch '^(Default string|To be filled.*|None|Unknown|0123456789|System Serial Number)$') {
    $Serial = $ComputerProduct.IdentifyingNumber.Trim()
}
if (-not $Serial -and $BaseBoard -and $BaseBoard.SerialNumber -and $BaseBoard.SerialNumber.Trim() -notmatch '^(Default string|To be filled.*|None|Unknown|0123456789|System Serial Number)$') {
    $Serial = $BaseBoard.SerialNumber.Trim()
}

# ----------------------------------------------------------
# DOMÍNIO E USUÁRIO LOGADO
# ----------------------------------------------------------
$Dominio = $ComputerSystem.Domain
$Usuario = $ComputerSystem.UserName
if (-not $Usuario) {
    $Usuario = $env:USERNAME
}
# ----------------------------------------------------------
# IDENTIFICAÇÃO RUSTDESK ID (ACESSO REMOTO)
# ----------------------------------------------------------
$RustDeskID = ""
$rustdeskPaths = @(
    "C:\Windows\ServiceProfiles\LocalService\AppData\Roaming\RustDesk\config\RustDesk.toml",
    "C:\Windows\ServiceProfiles\LocalService\AppData\Roaming\RustDesk\config\RustDesk2.toml",
    "$env:APPDATA\RustDesk\config\RustDesk.toml",
    "$env:APPDATA\RustDesk\config\RustDesk2.toml",
    "C:\ProgramData\RustDesk\config\RustDesk.toml"
)

foreach ($cfgPath in $rustdeskPaths) {
    if (Test-Path $cfgPath) {
        $idMatch = Select-String -Path $cfgPath -Pattern "^\s*id\s*=\s*['""]?(\d+)['""]?" | Select-Object -First 1
        if ($idMatch -and $idMatch.Matches[0].Groups[1].Value) {
            $RustDeskID = $idMatch.Matches[0].Groups[1].Value
            break
        }
    }
}

if (-not $RustDeskID) {
    $rustdeskExe = @(
        "C:\Program Files\RustDesk\rustdesk.exe",
        "C:\Program Files (x86)\RustDesk\rustdesk.exe"
    ) | Where-Object { Test-Path $_ } | Select-Object -First 1

    if ($rustdeskExe) {
        try {
            $out = & $rustdeskExe --get-id 2>$null
            if ($out -match '^\d+$') {
                $RustDeskID = $out.Trim()
            }
        } catch {}
    }
}

$DataColeta = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# ==========================================================
# DESCOBERTA E CATEGORIZAÇÃO DE SOFTWARES INSTALADOS
# Lê chaves de registro (64-bit e 32-bit Wow6432Node)
# ==========================================================
$Aplicativos = @()
$Agentes = @()
$Runtimes = @()
$Ferramentas = @()

$UninstallPaths = @(
    "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*",
    "HKLM:\Software\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*"
)

$InstalledSoftware = Get-ItemProperty -Path $UninstallPaths |
    Where-Object {
        $_.DisplayName -and
        $_.SystemComponent -ne 1 -and
        -not $_.ParentKeyName -and
        $_.DisplayName -notmatch '^(Security Update|Update for|Hotfix for|KB[0-9]{6,})'
    }

$SeenSoftware = @{}

foreach ($item in $InstalledSoftware) {
    $rawName = $item.DisplayName.Trim()
    if ($SeenSoftware.ContainsKey($rawName)) {
        continue
    }
    $SeenSoftware[$rawName] = $true

    $version = if ($item.DisplayVersion) { $item.DisplayVersion.Trim() } else { "1.0" }
    $id = (($rawName -replace '[^a-zA-Z0-9]', '-').ToLower() -replace '-+', '-').Trim('-')

    $pkgObj = [ordered]@{
        id      = $id
        nome    = $rawName
        tipo    = "aplicativo"
        origem  = "registry"
        pacotes = @(
            [ordered]@{
                pacote = $rawName
                versao = $version
            }
        )
    }

    # Classificação inteligente de software por categoria:
    if ($rawName -match '(?i)zabbix|wazuh|rustdesk|openvpn|forticlient|anydesk|teamviewer|fusioninventory|glpi|crowdstrike|kaspersky|sophos|cisco|tailscale|wireguard|lansweeper|ivanti') {
        $pkgObj["tipo"] = "agente"
        $Agentes += $pkgObj
    }
    elseif ($rawName -match '(?i)java|openjdk|jre|jdk|\.net|dotnet|python|node\.js|visual c\+\+|webview2|powershell 7|microsoft visual c') {
        $pkgObj["tipo"] = "runtime"
        $Runtimes += $pkgObj
    }
    elseif ($rawName -match '(?i)7-zip|winrar|notepad\+\+|putty|git|vscode|visual studio code|wireshark|total commander|filezilla|winscp|dbeaver|postman|cpuid|hwmonitor|process explorer') {
        $pkgObj["tipo"] = "ferramenta"
        $Ferramentas += $pkgObj
    }
    else {
        $pkgObj["tipo"] = "aplicativo"
        $Aplicativos += $pkgObj
    }
}

# Ordena listas alfabeticamente
$Aplicativos = $Aplicativos | Sort-Object { $_.nome }
$Agentes = $Agentes | Sort-Object { $_.nome }
$Runtimes = $Runtimes | Sort-Object { $_.nome }
$Ferramentas = $Ferramentas | Sort-Object { $_.nome }

# ==========================================================
# MONTAGEM DO INVENTÁRIO
# ==========================================================
$Inventory = [ordered]@{
    hostname         = $Hostname
    loja             = $Loja
    ip               = $IP
    ip_secundario    = $IPSecundario
    mac              = $MAC
    sistema          = $Sistema
    versao           = $Versao
    build            = $Build
    windows_release  = $WindowsRelease
    status           = $Status
    processador      = $CPU
    ram_total        = $RAMTotal
    ram_tipo         = $RAMTipo
    disco_total      = $DiscoTotal
    disco_usado      = $DiscoUsado
    disco_livre      = $DiscoLivre
    disco_percentual = $DiscoPercentualStr
    analise_disco    = $AnaliseDisco
    rustdesk_id      = $RustDeskID
    fabricante       = $Fabricante
    modelo           = $Modelo
    serial           = $Serial
    dominio          = $Dominio
    usuario          = $Usuario
    aplicativos      = $Aplicativos
    agentes          = $Agentes
    runtimes         = $Runtimes
    ferramentas      = $Ferramentas
    data_coleta      = $DataColeta
}

$Json = $Inventory | ConvertTo-Json -Depth 6

# Salva arquivo atual
[System.IO.File]::WriteAllText($InventoryFile, $Json, [System.Text.Encoding]::UTF8)

# ----------------------------------------------------------
# DETECÇÃO DE MUDANÇAS (HASH COMPARISON)
# ----------------------------------------------------------
$Enviar = $true

if (-not $Force -and (Test-Path $LastInventoryFile)) {
    try {
        $Atual = Get-Content $InventoryFile -Raw -Encoding UTF8 | ConvertFrom-Json
        $Anterior = Get-Content $LastInventoryFile -Raw -Encoding UTF8 | ConvertFrom-Json

        $Atual.data_coleta = $null
        $Anterior.data_coleta = $null

        $AtualComparacao = $Atual | ConvertTo-Json -Depth 6
        $AnteriorComparacao = $Anterior | ConvertTo-Json -Depth 6

        if ($AtualComparacao -eq $AnteriorComparacao) {
            $Enviar = $false
        }
    }
    catch {
        $Enviar = $true
    }
}

# ----------------------------------------------------------
# ENVIO HTTP
# ----------------------------------------------------------
if ($Enviar) {
    try {
        Write-Host "[*] Enviando dados para o servidor..." -ForegroundColor Yellow

        # Garante suporte a TLS 1.2 e certificados corporativos / internos
        try {
            [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
            [System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
        } catch { }

        $Response = Invoke-RestMethod `
            -Uri $ServerURL `
            -Method Post `
            -ContentType "application/json; charset=utf-8" `
            -Headers @{ "Accept" = "application/json, text/plain" } `
            -Body ([System.Text.Encoding]::UTF8.GetBytes($Json)) `
            -TimeoutSec 30

        $RespStr = ($Response | Out-String).Trim()

        if ($RespStr -match "OK" -or $RespStr -match "ok" -or $Response.status -eq "ok" -or $Response.device_id) {
            Copy-Item -Path $InventoryFile -Destination $LastInventoryFile -Force
            Write-Host "[+] Inventário enviado com sucesso!" -ForegroundColor Green
        }
        else {
            Write-Host "[-] Servidor respondeu: $RespStr" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "[-] Erro ao enviar inventário:" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
    }
}
else {
    Write-Host "[i] Nenhuma alteração no inventário. Envio ignorado (use -Force para forçar)." -ForegroundColor Cyan
}

Write-Host ""
Write-Host "===== RESUMO DA MÁQUINA =====" -ForegroundColor Cyan
Write-Host "Hostname: $Hostname | Loja: $Loja | IP: $IP"
Write-Host "Hardware: $Fabricante $Modelo (S/N: $Serial)"
Write-Host "Softwares: $($Aplicativos.Count) apps, $($Agentes.Count) agentes, $($Runtimes.Count) runtimes, $($Ferramentas.Count) ferramentas."
Write-Host "=============================" -ForegroundColor Cyan