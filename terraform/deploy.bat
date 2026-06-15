@echo off
REM Terraform deployment helper script for Windows

setlocal enabledelayedexpansion

set BLUE=[94m
set GREEN=[92m
set YELLOW=[93m
set RED=[91m
set NC=[0m

echo.
echo %BLUE%Terraform Deployment Helper - DevOps Lab Platform%NC%
echo ===================================================
echo.

REM Check prerequisites
echo %YELLOW%Checking prerequisites...%NC%

where terraform >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo %RED%ERROR: Terraform not installed%NC%
    exit /b 1
)

where az >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo %RED%ERROR: Azure CLI not installed%NC%
    exit /b 1
)

REM Verify Azure authentication
az account show >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo %YELLOW%Authenticating with Azure...%NC%
    call az login
)

echo %GREEN%OK: Prerequisites verified%NC%

REM Initialize Terraform
if not exist ".terraform" (
    echo.
    echo %YELLOW%Initializing Terraform...%NC%
    call terraform init
)

:menu
echo.
echo %YELLOW%Select environment:%NC%
echo 1) Development
echo 2) Staging
echo 3) Production
echo 4) Exit
echo.
set /p choice="Enter choice [1-4]: "

if "%choice%"=="4" (
    echo %GREEN%Goodbye!%NC%
    exit /b 0
)

set env_file=
set env_name=

if "%choice%"=="1" (
    set env_file=terraform.tfvars.dev
    set env_name=Development
) else if "%choice%"=="2" (
    set env_file=terraform.tfvars.staging
    set env_name=Staging
) else if "%choice%"=="3" (
    set env_file=terraform.tfvars.prod
    set env_name=Production
) else (
    echo %RED%Invalid choice%NC%
    goto menu
)

if not exist "%env_file%" (
    echo %RED%ERROR: Environment file not found: %env_file%%NC%
    goto menu
)

echo.
echo %YELLOW%Selected: %env_name%%NC%
echo.
set /p action="What would you like to do? [plan/apply/destroy/refresh]: "

if "%action%"=="plan" (
    echo.
    echo %YELLOW%Running Terraform plan for %env_name%...%NC%
    call terraform plan -var-file="%env_file%" -out="%env_name%.tfplan"
    echo %GREEN%OK: Plan saved to %env_name%.tfplan%NC%
) else if "%action%"=="apply" (
    echo.
    echo %YELLOW%Applying Terraform configuration for %env_name%...%NC%
    if exist "%env_name%.tfplan" (
        call terraform apply "%env_name%.tfplan"
    ) else (
        call terraform apply -var-file="%env_file%" -auto-approve
    )
    echo.
    echo %GREEN%OK: Apply complete!%NC%
    echo %YELLOW%Outputs:%NC%
    call terraform output -var-file="%env_file%"
) else if "%action%"=="destroy" (
    echo.
    echo %RED%WARNING: This will destroy all resources in %env_name%%NC%
    set /p confirm="Type 'yes' to confirm: "
    if "!confirm!"=="yes" (
        call terraform destroy -var-file="%env_file%"
    ) else (
        echo %YELLOW%Cancelled%NC%
    )
) else if "%action%"=="refresh" (
    echo.
    echo %YELLOW%Refreshing state...%NC%
    call terraform refresh -var-file="%env_file%"
    echo %GREEN%OK: State refreshed%NC%
) else (
    echo %RED%Unknown action: %action%%NC%
)

goto menu
