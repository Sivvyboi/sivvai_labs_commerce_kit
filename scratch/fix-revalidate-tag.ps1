$file = "features\admin\actions\admin.actions.ts"
$content = Get-Content $file -Raw

# Fix missing semicolon after revalidateTag("catalog")
# Pattern: revalidateTag("catalog") followed by newline+whitespace+revalidateTag
$content = $content -replace 'revalidateTag\("catalog"\)(\r?\n)', 'revalidateTag("catalog");$1'

# Fix the remaining store_settings double-arg call
$content = $content.Replace(
  'revalidateTag("store_settings", "default");',
  "revalidateTag(`"store_settings`");`r`n    revalidateTag(`"default`");"
)

Set-Content $file $content -NoNewline
Write-Host "Done."
