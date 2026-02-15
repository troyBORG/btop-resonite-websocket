/** Plain text → Resonite text markup. Options: { emoji: boolean } */
export function plainTextToResmarkup(text, _options = {}) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>")
}

export default function htmlToResmarkup(original, _options = {}) {
  // Remove header and footer tags
  var result = original.substring(
    "<html><body><!--StartFragment--><pre><div style='color: #000000; background-color: #ffffff; font-family: courier-new, courier, monospace; font-size: 15px;'>"
      .length,
    original.length - "</pre><!--EndFragment--></body></html>".length,
  )

  // Trim structural tags
  result = result.replaceAll("<span></span>", "")
  result = result.replaceAll("<div>", "")
  result = result.replaceAll("</div>", "\n")

  // Simple formating
  result = result.replaceAll("<span style='font-weight: bold;'>", "<b>")
  result = result.replaceAll(
    "<span style='text-decoration: underline;'>",
    "<u>",
  )
  result = result.replaceAll(
    "<span style='text-decoration: line-through;'>",
    "<s>",
  )

  // Convert color codes
  result = result.replaceAll(
    /<span style='color: (#[0-9a-fA-F]{6}); background-color: (#[0-9a-fA-F]{6});(?: font-weight: (\w+);)?(?: text-decoration: ([a-z\-]+);)?'>/g,
    (match, color, background, weight, decoration) =>
      `<color ${color}><mark ${background}>${weight ? "<b>" : ""}${decoration ? decorationTag(decoration) : ""}`,
  )
  result = result.replaceAll(
    /<span style='color: (#[0-9a-fA-F]{6});(?: font-weight: (\w+);)?(?: text-decoration: ([a-z\-]+);)?'>/g,
    (match, color, weight, decoration) =>
      `<color ${color}>${weight ? "<b>" : ""}${decoration ? decorationTag(decoration) : ""}`,
  )
  result = result.replaceAll(
    /<span style='background-color: (#[0-9a-fA-F]{6});'>/g,
    (match, background) => `<mark ${background}>`,
  )

  result = result.replaceAll("</span>", "<i></closeall>") // Adding an <i> tag since </closeall> needs as lest something
  result = result.replaceAll("<span>", "")

  return result
}

function decorationTag(type) {
  switch (type) {
    default:
      return ""
    case "underline":
      return "<u>"
    case "overline":
      // No overline tag in Resonite
      return ""
    case "line-though":
      return "<s>"
  }
}
