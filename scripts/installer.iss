; ============================================================================
; Drive Alive - Inno Setup Installer Script
; Creates a complete Windows installer with all components
; ============================================================================

#define MyAppName "Drive Alive"
#define MyAppPublisher "Drive Alive Team"
#define MyAppURL "https://drivealive.co.za"
#define MyAppExeName "drive-alive-api.exe"

; Version will be passed as command line parameter or read from file
#ifndef APP_VERSION
  #define APP_VERSION ReadIni(SourcePath + "\..\VERSION", "", "", "1.0.0")
#endif

[Setup]
; App information
AppId={{E8F9A7B2-3C4D-5E6F-7A8B-9C0D1E2F3A4B}
AppName={#MyAppName}
AppVersion={#APP_VERSION}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}

; Installation directories
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes

; Output
OutputDir=..\dist
OutputBaseFilename=DriveAlive-Setup-{#APP_VERSION}
SetupIconFile=..\image\logo.ico
Compression=lzma2/max
SolidCompression=yes

; Modern UI
WizardStyle=modern
WizardImageFile=compiler:WizModernImage-IS.bmp
WizardSmallImageFile=compiler:WizModernSmallImage-IS.bmp

; Privileges
PrivilegesRequired=admin
PrivilegesRequiredOverridesAllowed=dialog

; Architecture
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "startmenuicon"; Description: "Create Start Menu shortcut"; GroupDescription: "{cm:AdditionalIcons}"
Name: "autostart"; Description: "Start Drive Alive API automatically"; GroupDescription: "Startup Options:"; Flags: unchecked

[Files]
; Backend executable
Source: "..\backend\dist\drive-alive-api.exe"; DestDir: "{app}\backend"; Flags: ignoreversion

; Frontend web build
Source: "..\frontend\web-build\*"; DestDir: "{app}\frontend"; Flags: ignoreversion recursesubdirs createallsubdirs

; Configuration files
Source: "..\VERSION"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\version.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\README.md"; DestDir: "{app}"; Flags: ignoreversion isreadme
Source: "..\LICENSE"; DestDir: "{app}"; Flags: ignoreversion

; Documentation
Source: "..\QUICK_START.md"; DestDir: "{app}\docs"; Flags: ignoreversion
Source: "..\POPIA_COMPLIANCE.md"; DestDir: "{app}\docs"; Flags: ignoreversion
Source: "..\PCI_DSS_COMPLIANCE.md"; DestDir: "{app}\docs"; Flags: ignoreversion

; Scripts
Source: "..\scripts\*.bat"; DestDir: "{app}\scripts"; Flags: ignoreversion

[Dirs]
Name: "{app}\backend\database"; Permissions: users-full
Name: "{app}\backend\logs"; Permissions: users-full
Name: "{app}\frontend\static"; Permissions: users-full

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon
Name: "{commonstartmenu}\Programs\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: startmenuicon

[Run]
; Open README after installation
Filename: "{app}\README.md"; Description: "View README"; Flags: postinstall shellexec skipifsilent

; Optionally start the API server
Filename: "{app}\backend\{#MyAppExeName}"; Description: "Start Drive Alive API Server"; Flags: postinstall nowait skipifsilent

[Registry]
; Auto-start registry entry (optional)
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "DriveAliveAPI"; ValueData: """{app}\backend\{#MyAppExeName}"""; Flags: uninsdeletevalue; Tasks: autostart

[Code]
var
  DataDirPage: TInputDirWizardPage;

procedure InitializeWizard;
begin
  { Create a page for database directory selection }
  DataDirPage := CreateInputDirPage(wpSelectDir,
    'Select Database Location', 'Where should Drive Alive store its data?',
    'Select the folder in which Drive Alive should store its database and uploaded files, then click Next.',
    False, '');
  DataDirPage.Add('Database and files location:');
  DataDirPage.Values[0] := ExpandConstant('{commonappdata}\{#MyAppName}');
end;

function GetDataDir(Param: String): String;
begin
  Result := DataDirPage.Values[0];
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  EnvPath: String;
begin
  if CurStep = ssPostInstall then
  begin
    { Create data directory }
    if not DirExists(DataDirPage.Values[0]) then
      CreateDir(DataDirPage.Values[0]);

    { Set environment variable for data directory }
    RegWriteStringValue(HKEY_LOCAL_MACHINE, 'SYSTEM\CurrentControlSet\Control\Session Manager\Environment',
      'DRIVE_ALIVE_DATA', DataDirPage.Values[0]);

    { Notify system of environment change }
    EnvPath := 'Environment';
  end;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  DataDir: String;
  MsgResult: Integer;
begin
  if CurUninstallStep = usPostUninstall then
  begin
    { Ask if user wants to delete data }
    if RegQueryStringValue(HKEY_LOCAL_MACHINE, 'SYSTEM\CurrentControlSet\Control\Session Manager\Environment',
      'DRIVE_ALIVE_DATA', DataDir) then
    begin
      MsgResult := MsgBox('Do you want to delete all Drive Alive data (database, uploads, etc.)?' + #13#10 +
        'This cannot be undone!' + #13#10#13#10 +
        'Data location: ' + DataDir, mbConfirmation, MB_YESNO);

      if MsgResult = IDYES then
      begin
        DelTree(DataDir, True, True, True);
      end;
    end;

    { Remove environment variable }
    RegDeleteValue(HKEY_LOCAL_MACHINE, 'SYSTEM\CurrentControlSet\Control\Session Manager\Environment',
      'DRIVE_ALIVE_DATA');
  end;
end;
