# Redeploy StipendVault (with the R1/R2 fix) to Base mainnet and recreate the demo stipend.
# Usage (PowerShell, from the repo root):
#   $env:PK = "<agent private key>"; powershell -ExecutionPolicy Bypass -File scripts\redeploy-demo.ps1
$ErrorActionPreference = "Stop"
$forge = "$HOME\.foundry\bin\forge.exe"
$cast  = "$HOME\.foundry\bin\cast.exe"
$R     = "https://mainnet.base.org"
$USDC  = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
$OLD   = "0x55aDDc886a6C14C1152345AB0d47Be7b0F694D70"
$OLDID = "0xe33a82028d9e056699ff46556454a9872d5ee0d1a30cf5ee6fddbe01a23d6538"
$GUARD = "0x40F7111cD52c7B34Bc443210eB9109bBaAF8Bd98"
if (-not $env:PK) { throw "Set `$env:PK first" }
$AGENT = & $cast wallet address $env:PK

function Send($to, $sig) {
  $out = & $cast send $to $sig @args -r $R --private-key $env:PK
  $hash = ($out | Select-String "^transactionHash").ToString().Split()[-1]
  Write-Host "  $sig -> $hash"
  Start-Sleep -Seconds 3
}

Write-Host "1/5 Refund the old demo stipend"
Send $OLD "revoke(bytes32)" $OLDID

Write-Host "2/5 Deploy the fixed vault"
Push-Location "$PSScriptRoot\..\contracts"
$dep = & $forge create src/StipendVault.sol:StipendVault --rpc-url $R --private-key $env:PK --broadcast
Pop-Location
$VAULT = ($dep | Select-String "Deployed to:").ToString().Split()[-1]
$DTX   = ($dep | Select-String "Transaction hash:").ToString().Split()[-1]
$BLOCK = ((& $cast receipt $DTX -r $R) | Select-String "^blockNumber").ToString().Split()[-1]
Start-Sleep -Seconds 3

$bal = (& $cast call $USDC "balanceOf(address)(uint256)" $AGENT -r $R).Split()[0]
Write-Host "3/5 Create demo stipend with $bal (6-dec) USDC"
$SALT = & $cast keccak "stipend-fintech-demo-2"
Send $USDC "approve(address,uint256)" $VAULT $bal
Send $VAULT "createStipend(address,address,uint256,uint256,uint256,bytes32,uint256)" $USDC $AGENT 50000 86400 $bal $SALT $bal
$ID = & $cast call $VAULT "computeId(address,address,bytes32)(bytes32)" $AGENT $AGENT $SALT -r $R

Write-Host "4/5 Approve agent for pay()"
Send $VAULT "approveAgent(bytes32,address,bool)" $ID $AGENT true

Write-Host "5/5 Rules: 0.06 per payment, allowlist on, guardian"
Send $VAULT "setRules(bytes32,uint256,uint64,uint32,uint256,address,bool)" $ID 60000 0 0 0 $GUARD true

Write-Host ""
Write-Host "VAULT=$VAULT"
Write-Host "DEPLOY_TX=$DTX"
Write-Host "BLOCK=$BLOCK"
Write-Host "DEMO_ID=$ID"
Write-Host "Paste these four lines back to Claude."
