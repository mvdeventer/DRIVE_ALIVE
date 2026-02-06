# Fix corrupted emojis in UserManagementScreen.tsx using PowerShell
$filePath = "frontend\screens\admin\UserManagementScreen.tsx"

# Read the file as UTF-8
$content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)

# Define replacements (corrupted -> correct)
$replacements = @{
    # User emoji (admin tab) - Unicode: U+1F464
    [char]0xF0 + [char]0x9F + [char]0x91 + [char]0xA4 = [char]::ConvertFromUtf32(0x1F464)
    # Books emoji (student tab) - Unicode: U+1F4DA
    [char]0xF0 + [char]0x9F + [char]0x93 + [char]0x9A = [char]::ConvertFromUtf32(0x1F4DA)
    # Pencil emoji (edit) - Unicode: U+270F + U+FE0F
    [char]0x27 + [char]0x0F + [char]0xFE + [char]0x0F = [char]0x270F + [char]0xFE0F
    # Key emoji (reset password) - Unicode: U+1F511
    [char]0xF0 + [char]0x9F + [char ]0x94 + [char]0x91 = [char]::ConvertFromUtf32(0x1F511)
    # Wastebasket (delete) - Unicode: U+1F5D1 + U+FE0F
    [char]0xF0 + [char]0x9F + [char]0x97 + [char]0x91 + [char]0xFE + [char]0x0F = [char]::ConvertFromUtf32(0x1F5D1) + [char]0xFE0F
    # Calendar - Unicode: U+1F4C5
    [char]0xF0 + [char]0x9F + [char]0x93 + [char]0x85 = [char]::ConvertFromUtf32(0x1F4C5)
    # Cross mark - Unicode: U+274C
    [char]0x27 + [char]0x4C = [char]0x274C
    # Warning - Unicode: U+26A0 + U+FE0F
    [char]0x26 + [char]0xA0 + [char]0xFE + [char]0x0F = [char]0x26A0 + [char]0xFE0F
    # Reload - Unicode: U+1F504
    [char]0xF0 + [char]0x9F + [char]0x94 + [char]0x84 = [char]::ConvertFromUtf32(0x1F504)
    # Prohibited - Unicode: U+1F6AB
    [char]0xF0 + [char]0x9F + [char]0x9A + [char]0xAB = [char]::ConvertFromUtf32(0x1F6AB)
    # Telephone - Unicode: U+1F4DE
    [char]0xF0 + [char]0x9F + [char]0x93 + [char]0x9E = [char]::ConvertFromUtf32(0x1F4DE)
    # ID - Unicode: U+1F194
    [char]0xF0 + [char]0x9F + [char]0x86 + [char]0x94 = [char]::ConvertFromUtf32(0x1F194)
    # Eye - Unicode: U+1F441 + U+FE0F
    [char]0xF0 + [char]0x9F + [char]0x91 + [char]0x81 + [char]0xFE + [char]0x0F = [char]::ConvertFromUtf32(0x1F441) + [char]0xFE0F
}

$fixCount = 0
# Apply simple text replacements for visible corrupted text
$simpleReplaces = @(
    @{Pattern = 'ðŸ'¤'; Replace = '👤'},  # User
    @{Pattern = 'ðŸ"š'; Replace = '📚'},  # Books
    @{Pattern = 'âœï¸'; Replace = '✏️'},  # Pencil
    @{Pattern = 'ðŸ"''; Replace = '🔑'},  # Key
    @{Pattern = 'ðŸ—'ï¸'; Replace = '🗑️'},  # Wastebasket
    @{Pattern = 'ðŸ"…'; Replace = '📅'},  # Calendar
    @{Pattern = 'âŒ'; Replace = '❌'},  # Cross
    @{Pattern = 'âš ï¸'; Replace = '⚠️'},  # Warning
    @{Pattern = 'ðŸ"„'; Replace = '🔄'},  # Reload
    @{Pattern = 'ðŸš«'; Replace = '🚫'},  # Prohibited
    @{Pattern = 'ðŸ"ž'; Replace = '📞'},  # Telephone
    @{Pattern = 'ðŸ†"'; Replace = '🆔'},  # ID
    @{Pattern = 'ðŸ'ï¸'; Replace = '👁️'}   # Eye
)

foreach ($replace in $simpleReplaces) {
    $count = ($content | Select-String -Pattern ([regex]::Escape($replace.Pattern)) -AllMatches).Matches.Count
    if ($count -gt 0) {
        $content = $content.Replace($replace.Pattern, $replace.Replace)
        $fixCount += $count
        Write-Host "  Fixed $count x $($replace.Pattern) -> $($replace.Replace)"
    }
}

# Write back
[System.IO.File]::WriteAllText($filePath, $content, [System.Text.Encoding]::UTF8)

Write-Host "`n✅ Successfully fixed $fixCount emoji encodings in UserManagementScreen.tsx"
