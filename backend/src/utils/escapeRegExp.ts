// ReDoS (Regular Expression Denial of Service) не найден

export default function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
