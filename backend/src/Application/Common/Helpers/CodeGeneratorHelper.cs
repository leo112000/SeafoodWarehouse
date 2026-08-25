using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace SeafoodWarehouseManagement.Application.Common.Helpers;

public static class CodeGeneratorHelper
{
    public static string GenerateCode(string name, string prefix = "")
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            var fallback = DateTime.UtcNow.ToString("yyMMddHHmmss");
            return string.IsNullOrEmpty(prefix) ? $"CODE-{fallback}" : $"{prefix}-{fallback}";
        }

        var normalizedString = name.Normalize(NormalizationForm.FormD);
        var stringBuilder = new StringBuilder();

        foreach (var c in normalizedString)
        {
            var unicodeCategory = CharUnicodeInfo.GetUnicodeCategory(c);
            if (unicodeCategory != UnicodeCategory.NonSpacingMark)
            {
                if (c == 'đ' || c == 'Đ')
                {
                    stringBuilder.Append('D');
                }
                else
                {
                    stringBuilder.Append(c);
                }
            }
        }

        var unaccented = stringBuilder.ToString().Normalize(NormalizationForm.FormC);
        var clean = Regex.Replace(unaccented, @"[^a-zA-Z0-9\s_-]", "");
        clean = Regex.Replace(clean.Trim(), @"\s+", "-").ToUpper();

        if (clean.Length > 25)
        {
            clean = clean.Substring(0, 25).TrimEnd('-');
        }

        if (string.IsNullOrEmpty(clean))
        {
            clean = DateTime.UtcNow.ToString("yyMMddHHmmss");
        }

        return string.IsNullOrEmpty(prefix) ? clean : $"{prefix}-{clean}";
    }
}
