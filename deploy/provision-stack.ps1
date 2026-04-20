param(
    [string]$ProfileName = 'placeops',
    [string]$Region = 'ap-southeast-1'
)

$ErrorActionPreference = 'Stop'
$workspaceRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$deploymentStatePath = Join-Path $env:TEMP 'placeops-deployment-state.json'
$keyPath = Join-Path $env:TEMP 'placeops-deploy-key.pem'
$credDir = Join-Path $env:TEMP 'placeops-aws'
$credFile = Join-Path $credDir 'credentials'
$configFile = Join-Path $credDir 'config'

New-Item -ItemType Directory -Force -Path $credDir | Out-Null

if (-not (Test-Path $credFile)) {
    $accessKey = $env:AWS_ACCESS_KEY_ID
    $secretKey = $env:AWS_SECRET_ACCESS_KEY
    if ([string]::IsNullOrWhiteSpace($accessKey) -or [string]::IsNullOrWhiteSpace($secretKey)) {
        throw 'AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be set in the environment before running this script.'
    }

    @"
[$ProfileName]
aws_access_key_id = $accessKey
aws_secret_access_key = $secretKey
"@ | Set-Content -Path $credFile
}

@"
[profile $ProfileName]
region = $Region
output = json
"@ | Set-Content -Path $configFile

$env:AWS_SHARED_CREDENTIALS_FILE = $credFile
$env:AWS_CONFIG_FILE = $configFile
$env:AWS_DEFAULT_REGION = $Region

function Invoke-Aws {
    param([Parameter(Mandatory = $true)][string[]]$Args)
    & aws --no-cli-pager --profile $ProfileName @Args
    if ($LASTEXITCODE -ne 0) {
        throw "AWS CLI command failed: aws $($Args -join ' ')"
    }
}

$identity = Invoke-Aws -Args @('sts', 'get-caller-identity') | ConvertFrom-Json
Write-Host "Authenticated as $($identity.Arn) in account $($identity.Account)"

$currentIp = (Invoke-RestMethod 'https://checkip.amazonaws.com').Trim()
Write-Host "Current public IP: $currentIp"

$amiId = Invoke-Aws -Args @('ssm', 'get-parameter', '--name', '/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-6.1-x86_64', '--query', 'Parameter.Value', '--output', 'text')
Write-Host "Using AMI: $amiId"

$vpcId = Invoke-Aws -Args @('ec2', 'describe-vpcs', '--filters', 'Name=isDefault,Values=true', '--query', 'Vpcs[0].VpcId', '--output', 'text')
$subnetId = Invoke-Aws -Args @('ec2', 'describe-subnets', '--filters', "Name=vpc-id,Values=$vpcId", 'Name=map-public-ip-on-launch,Values=true', '--query', 'Subnets[0].SubnetId', '--output', 'text')

$backendSgId = Invoke-Aws -Args @('ec2', 'describe-security-groups', '--filters', 'Name=group-name,Values=placeops-ec2-sg', "Name=vpc-id,Values=$vpcId", '--query', 'SecurityGroups[0].GroupId', '--output', 'text')
if ([string]::IsNullOrWhiteSpace($backendSgId) -or $backendSgId -eq 'None') {
    throw 'Expected backend security group placeops-ec2-sg was not found.'
}

$frontendSgId = Invoke-Aws -Args @('ec2', 'describe-security-groups', '--filters', 'Name=group-name,Values=placeops-frontend-sg', "Name=vpc-id,Values=$vpcId", '--query', 'SecurityGroups[0].GroupId', '--output', 'text')
if ($frontendSgId -eq 'None' -or [string]::IsNullOrWhiteSpace($frontendSgId)) {
    $frontendSgId = Invoke-Aws -Args @('ec2', 'create-security-group', '--group-name', 'placeops-frontend-sg', '--description', 'PlaceOps frontend SG', '--vpc-id', $vpcId, '--query', 'GroupId', '--output', 'text')
    Write-Host "Created frontend security group: $frontendSgId"
}

function Ensure-SgRule {
    param(
        [string]$GroupId,
        [int]$FromPort,
        [int]$ToPort,
        [string]$CidrIp
    )

    Write-Host "Ensuring SG rule $GroupId tcp/$FromPort from $CidrIp"
    try {
        Invoke-Aws -Args @('ec2', 'authorize-security-group-ingress', '--group-id', $GroupId, '--ip-permissions', "IpProtocol=tcp,FromPort=$FromPort,ToPort=$ToPort,IpRanges=[{CidrIp=$CidrIp}]") | Out-Null
    }
    catch {
        Write-Host "Rule may already exist for $GroupId tcp/$FromPort from $CidrIp"
    }
}

Write-Host 'Ensuring security group rules...'
Ensure-SgRule -GroupId $backendSgId -FromPort 22 -ToPort 22 -CidrIp "$currentIp/32"
Ensure-SgRule -GroupId $backendSgId -FromPort 80 -ToPort 80 -CidrIp '0.0.0.0/0'
Ensure-SgRule -GroupId $backendSgId -FromPort 5000 -ToPort 5000 -CidrIp '0.0.0.0/0'
Ensure-SgRule -GroupId $frontendSgId -FromPort 22 -ToPort 22 -CidrIp "$currentIp/32"
Ensure-SgRule -GroupId $frontendSgId -FromPort 80 -ToPort 80 -CidrIp '0.0.0.0/0'

function Ensure-KeyPair {
    param([string]$KeyName, [string]$PrivateKeyPath)

    try {
        $existing = Invoke-Aws -Args @('ec2', 'describe-key-pairs', '--key-names', $KeyName, '--query', 'KeyPairs[0].KeyName', '--output', 'text')
    }
    catch {
        $existing = $null
    }

    if ($existing -eq 'None' -or [string]::IsNullOrWhiteSpace($existing)) {
        Write-Host "Creating key pair $KeyName..."
        $material = Invoke-Aws -Args @('ec2', 'create-key-pair', '--key-name', $KeyName, '--query', 'KeyMaterial', '--output', 'text')
        $material | Set-Content -NoNewline -Path $PrivateKeyPath
        Write-Host "Created key pair $KeyName and saved private key to $PrivateKeyPath"
    }
    elseif (-not (Test-Path $PrivateKeyPath)) {
        Write-Warning "Key pair $KeyName already exists in AWS, but local private key file is missing: $PrivateKeyPath"
    }
}

$keyName = 'placeops-deploy-key'
Write-Host 'Ensuring SSH key pair...'
Ensure-KeyPair -KeyName $keyName -PrivateKeyPath $keyPath

$backendUserData = @'
#!/bin/bash
set -euxo pipefail
dnf update -y
dnf install -y docker git awscli
yum install -y docker-compose-plugin || true
systemctl enable --now docker
usermod -aG docker ec2-user
curl -L "https://github.com/docker/compose/releases/download/v2.32.4/docker-compose-linux-x86_64" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
mkdir -p /opt/placeops
chown ec2-user:ec2-user /opt/placeops
'@

$frontendUserData = @'
#!/bin/bash
set -euxo pipefail
dnf update -y
dnf install -y docker git awscli
yum install -y docker-compose-plugin || true
systemctl enable --now docker
usermod -aG docker ec2-user
curl -L "https://github.com/docker/compose/releases/download/v2.32.4/docker-compose-linux-x86_64" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
mkdir -p /opt/placeops
chown ec2-user:ec2-user /opt/placeops
'@

function Ensure-Instance {
    param(
        [string]$Name,
        [string]$SecurityGroupId,
        [string]$UserData
    )

    $existing = Invoke-Aws -Args @('ec2', 'describe-instances', '--filters', "Name=tag:Name,Values=$Name", 'Name=instance-state-name,Values=pending,running,stopping,stopped', '--query', 'Reservations[0].Instances[0].InstanceId', '--output', 'text')
    if ($existing -and $existing -ne 'None') {
        Write-Host "Reusing existing instance for ${Name}: $existing"
        return $existing
    }

    Write-Host "Launching instance ${Name}..."
    $encodedUserData = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($UserData))
    $instanceId = Invoke-Aws -Args @(
        'ec2', 'run-instances',
        '--image-id', $amiId,
        '--instance-type', 't3.micro',
        '--key-name', $keyName,
        '--subnet-id', $subnetId,
        '--security-group-ids', $SecurityGroupId,
        '--associate-public-ip-address',
        '--user-data', $encodedUserData,
        '--tag-specifications', "ResourceType=instance,Tags=[{Key=Name,Value=$Name}]",
        '--query', 'Instances[0].InstanceId',
        '--output', 'text'
    )
    Write-Host "Created instance ${Name}: $instanceId"
    return $instanceId
}

Write-Host 'Launching backend and frontend instances...'
$backendInstanceId = Ensure-Instance -Name 'placeops-backend' -SecurityGroupId $backendSgId -UserData $backendUserData
$frontendInstanceId = Ensure-Instance -Name 'placeops-frontend' -SecurityGroupId $frontendSgId -UserData $frontendUserData

function Ensure-Eip {
    param([string]$InstanceId, [string]$TagName)

    Write-Host "Allocating EIP for $TagName..."
    $allocation = Invoke-Aws -Args @('ec2', 'allocate-address', '--domain', 'vpc', '--query', '{AllocationId:AllocationId,PublicIp:PublicIp}', '--output', 'json') | ConvertFrom-Json
    $assocId = Invoke-Aws -Args @('ec2', 'associate-address', '--instance-id', $InstanceId, '--allocation-id', $allocation.AllocationId, '--allow-reassociation', '--query', 'AssociationId', '--output', 'text')
    Write-Host "Associated $TagName to $($allocation.PublicIp)"
    return [pscustomobject]@{ AllocationId = $allocation.AllocationId; PublicIp = $allocation.PublicIp; AssociationId = $assocId }
}

Write-Host 'Associating Elastic IPs...'
$backendEip = Ensure-Eip -InstanceId $backendInstanceId -TagName 'backend'
$frontendEip = Ensure-Eip -InstanceId $frontendInstanceId -TagName 'frontend'

$state = [pscustomobject]@{
    ProfileName = $ProfileName
    Region = $Region
    KeyPath = $keyPath
    BackendInstanceId = $backendInstanceId
    FrontendInstanceId = $frontendInstanceId
    BackendPublicIp = $backendEip.PublicIp
    FrontendPublicIp = $frontendEip.PublicIp
    BackendSecurityGroupId = $backendSgId
    FrontendSecurityGroupId = $frontendSgId
    CurrentIp = $currentIp
} | ConvertTo-Json -Depth 5

$state | Set-Content -Path $deploymentStatePath
Write-Host "Saved deployment state to $deploymentStatePath"
Write-Host $state
